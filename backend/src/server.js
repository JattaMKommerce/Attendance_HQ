const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const app = require('./app');
const db = require('./config/db');
const insightScheduler = require('./services/ai/insightScheduler');

const PORT = process.env.PORT || 5001;

let server = null;
let isShuttingDown = false;

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  // 1. Stop proactive scheduler if running
  try {
    insightScheduler.stopScheduler();
    console.log('[Server] Proactive insight scheduler stopped.');
  } catch (schedErr) {
    console.error('[Server] Error stopping scheduler:', schedErr.message);
  }

  // 2. Stop accepting new connections and finish in-flight HTTP requests
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP connections drained and server closed.');

      // 3. Close database connection pool
      try {
        await db.end();
        console.log('[Server] MySQL connection pool closed cleanly.');
      } catch (dbErr) {
        console.error('[Server] Error closing MySQL pool:', dbErr.message);
      }

      console.log('[Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });
  } else {
    try {
      await db.end();
    } catch (e) {}
    process.exit(0);
  }

  // Force shutdown if cleanup hangs past 10 seconds
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out (10s limit). Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

// Process-level exception & rejection handling
process.on('uncaughtException', (err) => {
  console.error('[Process] UNCAUGHT EXCEPTION:', err?.stack || err?.message || err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] UNHANDLED PROMISE REJECTION at:', promise, 'reason:', reason);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Test DB connection before starting the server
db.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
    
    server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

      // Start proactive HR intelligence insight scheduler
      if (process.env.NODE_ENV !== 'test') {
        insightScheduler.startScheduler();
      }
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

