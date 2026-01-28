const { initQueue } = require('./queue');
const logger = require('../utils/logger');

logger.info('Starting analysis worker...');
initQueue();
