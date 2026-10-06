const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

const mobileOrigins = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile native apps, server-to-server curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Always allow mobile app WebViews (Capacitor Android https://localhost, iOS capacitor://, etc.)
    if (
      mobileOrigins.includes(normalizedOrigin) || 
      origin.startsWith('capacitor://') || 
      origin.startsWith('ionic://')
    ) {
      return callback(null, true);
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // In development, allow localhost, 127.0.0.1, or local LAN IP addresses (for phone testing over Wi-Fi)
      const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (!allowedOrigins.length || allowedOrigins.includes('*') || isLocalNetwork) {
        return callback(null, true);
      }
    }

    // In production, strictly match declared production origins
    if (allowedOrigins.length > 0 && (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} not allowed by production policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (photos, documents, and social media) served on both /uploads and /api/uploads (for Passenger)
const uploadsPath = path.join(__dirname, '../uploads');
const photosUploadPath = path.join(__dirname, '../uploads/photos');
const socialUploadPath = path.join(__dirname, '../uploads/social');
const documentsUploadPath = path.join(__dirname, '../uploads/documents');

// Ensure all upload directories exist
[uploadsPath, photosUploadPath, socialUploadPath, documentsUploadPath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Static Files] Could not create upload directory:', dir, e.message);
    }
  }
});

app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));
app.use('/uploads/photos', express.static(photosUploadPath));
app.use('/uploads/social', express.static(socialUploadPath));
app.use('/uploads/documents', express.static(documentsUploadPath));
app.use('/api/uploads/photos', express.static(photosUploadPath));
app.use('/api/uploads/social', express.static(socialUploadPath));
app.use('/api/uploads/documents', express.static(documentsUploadPath));

// Explicit fallback handlers to guarantee file serving across reverse proxy configurations
app.get(['/uploads/social/:filename', '/api/uploads/social/:filename'], (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const targetPath = path.join(socialUploadPath, safeFilename);
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).send('Social image not found');
});

app.get(['/uploads/photos/:filename', '/api/uploads/photos/:filename'], (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const targetPath = path.join(photosUploadPath, safeFilename);
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).send('Photo not found');
});

app.get(['/uploads/documents/:filename', '/api/uploads/documents/:filename'], (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const targetPath = path.join(documentsUploadPath, safeFilename);
  if (fs.existsSync(targetPath)) {
    if (req.query.download === '1' || req.query.download === 'true') {
      return res.download(targetPath, safeFilename);
    }
    return res.sendFile(targetPath);
  }
  return res.status(404).send('Document not found');
});

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

// Clean test data endpoint — DEVELOPMENT/TEST only, requires SUPER_ADMIN authentication
const cleanTestDataHandler = async (req, res) => {
  // Strictly disallow in production
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production') {
    return res.status(403).json({ success: false, message: 'This endpoint is disabled in production.' });
  }

  // Require Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required to run test data cleanup.' });
  }

  // Verify token and require SUPER_ADMIN role
  try {
    const { verifyAccessToken } = require('./utils/tokenUtils');
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    const [roles] = await db.execute(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
      [decoded.id]
    );
    const roleNames = roles.map(r => r.name);
    if (!roleNames.includes('SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'SUPER_ADMIN role required for this operation.' });
    }
  } catch (authErr) {
    return res.status(401).json({ success: false, message: 'Token verification failed.' });
  }

  try {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DELETE FROM employee_experiences');
    await db.query('DELETE FROM employee_education');
    await db.query('DELETE FROM employee_onboarding_tasks');
    await db.query('DELETE FROM employee_onboarding');
    await db.query('DELETE FROM employee_status_history');
    await db.query('DELETE FROM employee_salaries');
    await db.query('DELETE FROM employee_managers');
    await db.query('DELETE FROM employee_incentives');
    await db.query('DELETE FROM work_schedules');
    await db.query('DELETE FROM rosters');
    await db.query('DELETE FROM asset_assignments');
    await db.query('DELETE FROM expense_approval_history');
    await db.query('DELETE FROM expenses');
    await db.query('DELETE FROM task_assignments');
    await db.query('DELETE FROM document_access');
    await db.query('DELETE FROM documents');
    await db.query('DELETE FROM account_activations');
    await db.query('DELETE FROM attendance_records');
    await db.query('DELETE FROM attendance_logs');
    await db.query('DELETE FROM attendance_regularization');
    await db.query('DELETE FROM leave_requests');
    await db.query('DELETE FROM leave_balances');
    await db.query('DELETE FROM leave_approval_history');
    await db.query('DELETE FROM payslips');
    await db.query('DELETE FROM payroll_records');
    await db.query('DELETE FROM employees');
    await db.query('ALTER TABLE employees AUTO_INCREMENT = 1');
    await db.query('ALTER TABLE account_activations AUTO_INCREMENT = 1');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    return res.status(200).json({
      success: true,
      message: 'All test employees and records have been completely erased. Employee count is now 0.'
    });
  } catch (err) {
    try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/clean-test-data', cleanTestDataHandler);
app.get('/api/clean-test-data', cleanTestDataHandler);

// App Version & Update Info Endpoint for mobile & web update prompts
const appVersionHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    latestVersion: '1.0.3',
    latestVersionCode: 3,
    apkUrl: 'https://hrms.jattamkommerce.com/jmk-hrms.apk',
    downloadUrl: 'https://hrms.jattamkommerce.com/download',
    forceUpdate: false,
    releaseNotes: 'Includes updated app launcher icon, enhanced social media feed, and speed improvements.'
  });
};

app.get('/app-version', appVersionHandler);
app.get('/api/app-version', appVersionHandler);

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
      req.path.startsWith('/employee') ||
      req.path.startsWith('/clean-test-data') ||
      req.path.startsWith('/app-version')
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
