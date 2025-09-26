const Bull = require('bull');
const logger = require('../utils/logger');
const { analyzeCodePair } = require('../services/analysisService');

let analysisQueue = null;

function initQueue() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info('REDIS_URL not set. Queue disabled; analyses will run in-process.');
    return null;
  }

  analysisQueue = new Bull('analysis', redisUrl, {
    defaultJobOptions: { attempts: 1, removeOnComplete: true, removeOnFail: true }
  });

  analysisQueue.process(async (job) => {
    const { analysisId, request } = job.data;
    await analyzeCodePair(analysisId, request);
  });

  analysisQueue.on('error', (err) => {
    logger.error('Analysis queue error:', err);
  });

  logger.info('Analysis queue initialized');
  return analysisQueue;
}

async function enqueueAnalysis(analysisId, request) {
  if (!analysisQueue) {
    // Fallback: run in-process asynchronously
    setImmediate(() => {
      analyzeCodePair(analysisId, request).catch((e) => logger.error('In-process analysis failed:', e));
    });
    return { queued: false };
  }
  await analysisQueue.add({ analysisId, request });
  return { queued: true };
}

module.exports = { initQueue, enqueueAnalysis };


