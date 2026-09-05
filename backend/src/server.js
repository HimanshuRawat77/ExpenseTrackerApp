const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CLIENT_URL === '*' ? '*' : config.CLIENT_URL.split(','),
  credentials: true,
}));
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' })); // 10mb for receipt images
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Expense Tracker API is running',
    data: {
      status: 'ok',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(config.PORT, () => {
      console.log(`\n🚀 Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
      console.log(`📍 Health check: http://localhost:${config.PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
