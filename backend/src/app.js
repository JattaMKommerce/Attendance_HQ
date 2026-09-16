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
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile native apps, server-to-server curl)
    if (!origin) return callback(null, true);

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // In development, allow localhost, 127.0.0.1, capacitor, or permissive fallback
      if (!allowedOrigins || allowedOrigins.includes('*') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('capacitor://')) {
        return callback(null, true);
      }
    }

    // In production, strictly match declared production origins or native mobile container
    if (allowedOrigins && allowedOrigins.includes(origin)) {
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
// Static files (only photos are public)
app.use('/uploads/photos', express.static(path.join(__dirname, '../uploads/photos')));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (for Cloud Load Balancers, Kubernetes, AWS ECS)
app.get('/api/health', async (req, res) => {
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
});


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

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/employee', employeePortalRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/ai', aiRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HRMS SaaS API is running' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
