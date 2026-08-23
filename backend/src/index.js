// =============================================================
// SHIVBAEMPIRE — Express App Entry Point
// =============================================================
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const donorRoutes = require('./routes/donor.routes');
const collectionRoutes = require('./routes/collection.routes');
const receiptRoutes = require('./routes/receipt.routes');
const expenseRoutes = require('./routes/expense.routes');
const collectorRoutes = require('./routes/collector.routes');
const eventRoutes = require('./routes/event.routes');
const reportRoutes = require('./routes/report.routes');
const activityRoutes = require('./routes/activity.routes');
const settingsRoutes = require('./routes/settings.routes');
const villageRoutes = require('./routes/village.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Security ----
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend
  crossOriginEmbedderPolicy: false,
}));

// ---- CORS ----
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Collector-Id'],
}));

// ---- Body parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ---- Request logging ----
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/api/health',
}));

// ---- Rate limiting ----
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 10000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ---- Health check ----
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    await pool.execute('SELECT 1');
    res.json({
      status: 'ok',
      app: 'SHIVBAEMPIRE',
      organization: 'Shivba Tarun Mitra Mandal',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/collectors', collectorRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/villages', villageRoutes);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ---- Centralized Error Handler ----
app.use(errorHandler);

// ---- Start Server ----
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    logger.info(`🚀 SHIVBAEMPIRE API running on port ${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  });
};

startServer();

module.exports = app; // For testing
