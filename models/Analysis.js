const mongoose = require('mongoose');

const refactorTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'Extract Method',
      'Inline Method', 
      'Rename Symbol',
      'Move/Modularize',
      'Service Extraction',
      'Layering',
      'Event-driven',
      'Cloud Migration',
      'Error Handling',
      'Logging/Observability',
      'Testing',
      'Containerization',
      'Infrastructure as Code',
      'Database Migration'
    ]
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
  evidence: [String],
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  }
});

const fileChangeSchema = new mongoose.Schema({
  filePath: String,
  changes: {
    textDiff: String,
    astDiffSummary: String,
    impactScore: Number,
    linesAdded: Number,
    linesRemoved: Number,
    linesModified: Number
  },
  refactorTypes: [refactorTypeSchema]
});

const riskFlagSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['security', 'license', 'compatibility', 'performance', 'maintainability']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  description: String,
  suggestion: String
});

const analysisSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  language: {
    type: String,
    required: true,
    enum: ['java', 'javascript', 'python', 'c', 'cpp', 'csharp', 'cobol', 'pli']
  },
  legacy: {
    type: {
      type: String,
      enum: ['paste', 'file', 'repo']
    },
    content: String, // For paste
    url: String,     // For repo
    ref: String,     // Branch/tag for repo
    files: [String]  // For file uploads
  },
  refactored: {
    type: {
      type: String,
      enum: ['paste', 'file', 'repo']
    },
    content: String,
    url: String,
    ref: String,
    files: [String]
  },
  options: {
    mapHints: mongoose.Schema.Types.Mixed,
    analyzeTests: { type: Boolean, default: true },
    runStaticChecks: { type: Boolean, default: false },
    includeSecurityScan: { type: Boolean, default: true }
  },
  results: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    level: {
      type: Number,
      min: 0,
      max: 4
    },
    summary: String,
    refactorTypes: [refactorTypeSchema],
    files: [fileChangeSchema],
    riskFlags: [riskFlagSchema],
    suggestedNextSteps: [String],
    metrics: {
      totalLinesChanged: Number,
      filesModified: Number,
      newDependencies: [String],
      removedDependencies: [String],
      cyclomaticComplexityDelta: Number,
      testCoverageDelta: Number
    }
  },
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  processingTimeMs: Number
});

// Indexes for better query performance
analysisSchema.index({ id: 1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ language: 1 });
analysisSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
