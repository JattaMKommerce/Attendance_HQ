const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');

const app = express();

// Configure Express reverse proxy handling for cPanel/Apache/Nginx/Cloudflare
app.set('trust proxy', process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : 1);

// Security Headers (configured to allow cross-origin static photo loading)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const defaultOrigins = [
  'https://hrms.jattamkommerce.com',
  'http://hrms.jattamkommerce.com',
  'https://admin.jattamkommerce.com',
  'http://admin.jattamkommerce.com'
];
if (process.env.APP_URL) {
  try {
    const parsed = new URL(process.env.APP_URL).origin;
    if (!defaultOrigins.includes(parsed)) defaultOrigins.push(parsed);
  } catch (e) {}
}

const envOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile native apps, server-to-server curl)
    if (!origin) return callback(null, true);

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // In development, allow localhost, 127.0.0.1, capacitor, or permissive fallback
      if (!allowedOrigins.length || allowedOrigins.includes('*') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('capacitor://')) {
        return callback(null, true);
      }
    }

    // In production, strictly match declared production origins or native mobile container
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.length > 0 && (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin))) {
      return callback(null, true);
    }

    if (origin.startsWith('capacitor://')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} not allowed by production policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
// Static files (photos and social media are public)
app.use('/uploads/photos', express.static(path.join(__dirname, '../uploads/photos')));
app.use('/uploads/social', express.static(path.join(__dirname, '../uploads/social')));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (compatible with both direct access /api/health and cPanel Base URI /health)
const healthCheckHandler = async (req, res) => {
  try {
    await db.query('SELECT 1 as ping');
    return res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const documentRoutes = require('./routes/documentRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const employeePortalRoutes = require('./routes/employeePortalRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const aiRoutes = require('./routes/aiRoutes');
const socialRoutes = require('./routes/socialRoutes');

const routeList = [
  ['/auth', authRoutes],
  ['/employees', employeeRoutes],
  ['/attendance', attendanceRoutes],
  ['/roster', rosterRoutes],
  ['/leaves', leaveRoutes],
  ['/documents', documentRoutes],
  ['/payroll', payrollRoutes],
  ['/employee', employeePortalRoutes],
  ['/announcements', announcementRoutes],
  ['/ai', aiRoutes],
  ['/social', socialRoutes]
];

// Mount on both /<path> and /api/<path> to support cPanel Passenger Base URL (/api) and standard reverse proxies
routeList.forEach(([prefix, router]) => {
  app.use(prefix, router);
  app.use(`/api${prefix}`, router);
});

// Static SPA serving for unified deployment (cPanel Node.js App or local production)
const potentialDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, '../public')
];
const fs = require('fs');
const distPath = potentialDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    // Pass API and static upload routes to next handlers
    if (
      req.path.startsWith('/api') || 
      req.path.startsWith('/uploads') || 
      req.path.startsWith('/health') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/employees') ||
      req.path.startsWith('/attendance') ||
      req.path.startsWith('/leaves') ||
      req.path.startsWith('/payroll') ||
      req.path.startsWith('/employee')
    ) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Fallback for API-only deployment
  const rootHandler = (req, res) => {
    res.json({ success: true, message: 'HRMS SaaS API is running' });
  };
  app.get('/', rootHandler);
  app.get('/api', rootHandler);
}

// Error handling middleware
app.use(errorHandler);

module.exports = app;
