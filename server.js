const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const passport = require('./utils/passport');
require('dotenv').config();

const analysisRoutes = require('./routes/analysis');
const authRoutes = require('./routes/auth');
const { initQueue } = require('./queue/queue');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for production environments (e.g., Railway, Vercel, Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier development, enable and configure for production
}));

// Compression for better performance
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://refactorlens-fe.vercel.app',
      'http://localhost:3000'
    ].filter(Boolean);

    // Check if origin is allowed or if it's a Vercel preview URL
    const isAllowed = !origin || 
                      allowedOrigins.includes(origin) || 
                      (origin && origin.endsWith('.vercel.app'));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  const fs = require('fs');
  const packagePath = path.resolve(__dirname, 'package.json');
  let version = '1.0.0';
  
  if (fs.existsSync(packagePath)) {
    try {
      version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
    } catch (e) {}
  }

  const dbStatus = {
    connected: mongoose.connection.readyState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };

  res.json({ 
    status: dbStatus.connected ? 'healthy' : 'degraded', 
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version,
    env: process.env.NODE_ENV || 'development'
  });
});

// Middleware to check DB connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database connection not ready',
      message: 'The server is currently unable to connect to the database. Please try again in a few moments.'
    });
  }
  next();
};

// API routes
app.use('/api/v1/auth', checkDBConnection, authRoutes);
app.use('/api/v1', checkDBConnection, analysisRoutes);
app.use('/api/v1/chatbot', checkDBConnection, require('./routes/chatbot'));
app.use('/api/v1/org', checkDBConnection, require('./routes/org'));

// Serve static assets in production (if build folder exists)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');
  const fs = require('fs');
  
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.resolve(buildPath, 'index.html'));
      }
    });
  } else {
    logger.info('Production mode: client/build folder not found. API-only mode.');
  }
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Database connection
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/refactorlens';
  const mongoOptions = {
    serverSelectionTimeoutMS: 30000, // Increase to 30 seconds for cloud deployments
    socketTimeoutMS: 45000,
    family: 4,
    heartbeatFrequencyMS: 10000 // Check connection every 10s
  };

  try {
    logger.info(`Connecting to MongoDB... (Target: ${mongoURI.split('@').pop().split('/')[0]})`);
    await mongoose.connect(mongoURI, mongoOptions);
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    logger.warn('Server will continue to run, but database-dependent features will fail.');
    // Do NOT process.exit(1) as it causes 502s in production during transient failures
  }
};

mongoose.connection.on('error', err => {
  logger.error('Mongoose connection error after initial connection:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected. Attempting to reconnect...');
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`RefactorLens server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Connect to database after server starts to avoid 502s during slow connection
  connectDB().then(() => {
    // Initialize queue after DB is ready
    try { 
      initQueue(); 
    } catch (e) { 
      logger.error('Queue init failed', e); 
    }
  });
});

module.exports = app;
