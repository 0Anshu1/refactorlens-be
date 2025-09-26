const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const Analysis = require('../models/Analysis');
const { analyzeCodePair } = require('../services/analysisService');
const { enqueueAnalysis } = require('../queue/queue');
const { validateRequest } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: parseInt(process.env.MAX_FILES) || 10
  },
  fileFilter: (req, file, cb) => {
    // Accept common source code files
    const allowedExtensions = /\.(java|js|ts|py|c|cpp|cs|cob|pli|jcl)$/i;
    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only source code files are allowed.'), false);
    }
  }
});

// Validation schemas
const analysisRequestSchema = Joi.object({
  language: Joi.string().valid('java', 'javascript', 'python', 'c', 'cpp', 'csharp', 'cobol', 'pli').required(),
  legacy: Joi.object({
    type: Joi.string().valid('paste', 'file', 'repo').required(),
    content: Joi.when('type', {
      is: 'paste',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('')
    }),
    url: Joi.when('type', {
      is: 'repo',
      then: Joi.string().uri().required(),
      otherwise: Joi.string().allow('')
    }),
    ref: Joi.string().allow(''),
    files: Joi.array().items(Joi.string()).allow(null)
  }).required(),
  refactored: Joi.object({
    type: Joi.string().valid('paste', 'file', 'repo').required(),
    content: Joi.when('type', {
      is: 'paste',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('')
    }),
    url: Joi.when('type', {
      is: 'repo',
      then: Joi.string().uri().required(),
      otherwise: Joi.string().allow('')
    }),
    ref: Joi.string().allow(''),
    files: Joi.array().items(Joi.string()).allow(null)
  }).required(),
  options: Joi.object({
    mapHints: Joi.object().allow(null),
    analyzeTests: Joi.boolean().default(true),
    runStaticChecks: Joi.boolean().default(false),
    includeSecurityScan: Joi.boolean().default(true)
  }).default({})
});

// POST /api/v1/analyze - Start new analysis
router.post('/analyze', upload.array('files'), validateRequest(analysisRequestSchema), async (req, res) => {
  try {
    const analysisId = uuidv4();
    
    // Create analysis record
    const analysis = new Analysis({
      id: analysisId,
      ...req.body,
      status: 'pending'
    });

    await analysis.save();
    
    logger.info(`Created analysis ${analysisId} for language ${req.body.language}`);

    // Start analysis via queue (falls back to in-process if queue disabled)
    await enqueueAnalysis(analysisId, req.body);

    res.status(202).json({
      id: analysisId,
      status: 'pending',
      message: 'Analysis started'
    });

  } catch (error) {
    logger.error('Error creating analysis:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error.message
    });
  }
});

// GET /api/v1/analyze/:id - Get analysis status and results
router.get('/analyze/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ id: req.params.id });
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found'
      });
    }

    const response = {
      id: analysis.id,
      status: analysis.status,
      language: analysis.language,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      processingTimeMs: analysis.processingTimeMs
    };

    // Include results if completed
    if (analysis.status === 'completed') {
      response.results = analysis.results;
    } else if (analysis.status === 'failed') {
      response.error = analysis.error;
    }

    res.json(response);

  } catch (error) {
    logger.error('Error fetching analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch analysis',
      message: error.message
    });
  }
});

// GET /api/v1/analyze - List all analyses with pagination
router.get('/analyze', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const analyses = await Analysis.find()
      .select('id status language createdAt completedAt results.overallScore results.level')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Analysis.countDocuments();

    res.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching analyses:', error);
    res.status(500).json({
      error: 'Failed to fetch analyses',
      message: error.message
    });
  }
});

// DELETE /api/v1/analyze/:id - Delete analysis
router.delete('/analyze/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ id: req.params.id });
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found'
      });
    }

    res.json({
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting analysis:', error);
    res.status(500).json({
      error: 'Failed to delete analysis',
      message: error.message
    });
  }
});

module.exports = router;
