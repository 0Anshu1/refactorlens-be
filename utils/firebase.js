const admin = require('firebase-admin');
const logger = require('./logger');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'refactorlens'
    });
    logger.info('Firebase Admin initialized');
  }
} catch (error) {
  logger.error('Firebase Admin initialization error:', error);
}

module.exports = admin;
