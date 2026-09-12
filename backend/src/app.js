const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');

const app = express();

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
    // Allow requests with no origin (mobile native webview, curl, postman)
    if (!origin) return callback(null, true);

    // Development or permissive fallback
    if (process.env.NODE_ENV !== 'production' || !allowedOrigins || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || origin.startsWith('capacitor://') || origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} not allowed by policy`));
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

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/employee', employeePortalRoutes);
app.use('/api/announcements', announcementRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HRMS SaaS API is running' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
