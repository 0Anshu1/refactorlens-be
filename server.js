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
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app');

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
    version = require(packagePath).version;
  }

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', analysisRoutes);
app.use('/api/v1/chatbot', require('./routes/chatbot'));
app.use('/api/v1/org', require('./routes/org'));

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
    serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
  };

  try {
    logger.info(`Connecting to MongoDB at ${mongoURI.split('@').pop()}...`);
    await mongoose.connect(mongoURI, mongoOptions);
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exiting process due to database connection failure in production');
      process.exit(1);
    } else {
      logger.warn('Continuing in development mode without MongoDB. Some features will be unavailable.');
    }
  }
};

mongoose.connection.on('error', err => {
  logger.error('Mongoose connection error after initial connection:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected. Attempting to reconnect...');
});

connectDB();

// Start server
app.listen(PORT, () => {
  logger.info(`RefactorLens server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  // Initialize queue after server starts
  try { initQueue(); } catch (e) { logger.error('Queue init failed', e); }
});

module.exports = app;
