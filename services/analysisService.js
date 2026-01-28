const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { sendEmail } = require('../utils/mail');
const { ASTAnalyzer } = require('../analyzers/astAnalyzer');
const { RefactorClassifier } = require('../analyzers/refactorClassifier');
const { ImpactScorer } = require('../analyzers/impactScorer');
const { SecurityScanner } = require('../analyzers/securityScanner');
const logger = require('../utils/logger');
const { analyzeWithAI } = require('./aiService');

class AnalysisService {
  constructor() {
    this.astAnalyzer = new ASTAnalyzer();
    this.refactorClassifier = new RefactorClassifier();
    this.impactScorer = new ImpactScorer();
    this.securityScanner = new SecurityScanner();
  }

  async analyzeCodePair(analysisId, request) {
    const startTime = Date.now();
    const { normalizeScores, weightedScore, kpiRankings, kpiAverages, KPIS } = require('../models/KPIFramework');
    try {
      //status update to processing
      await Analysis.findOneAndUpdate(
        { id: analysisId },
        { status: 'processing' }
      );

      logger.info(`Starting analysis ${analysisId}`);

      // Step 1: Parsing and normalize code
      const legacyAST = await this.astAnalyzer.parseCode(
        request.legacy,
        request.language
      );

      const refactoredAST = await this.astAnalyzer.parseCode(
        request.refactored,
        request.language
      );

      // Step 2: Map corresponding elements
      const mappings = await this.astAnalyzer.mapElements(
        legacyAST,
        refactoredAST,
        request.options?.mapHints || {}
      );

      // Step 3:AST differences
      const astDiffs = await this.astAnalyzer.computeDiffs(
        legacyAST,
        refactoredAST,
        mappings
      );

      // Step 4.5: AI-ML powered code clustering (Python)
      let aiLabels = [];
      try {
        const codeSnippets = astDiffs.files?.map(f => f.content).filter(Boolean) || [];
        if (codeSnippets.length > 0) {
          const aiResult = await analyzeWithAI(codeSnippets);
          aiLabels = aiResult.labels;
        }
      } catch (err) {
        logger.warn('AI-ML code analysis failed:', err.message);
      }

      // Step 4: Classify refactoring types
      const refactorTypes = await this.refactorClassifier.classify(
        astDiffs,
        request.language
      );

      // Step 5: Calculate impact scores
      const impactMetrics = await this.impactScorer.calculate(
        astDiffs,
        refactorTypes,
        request.language
      );

      // Step 6: Security and risk scanning
      const riskFlags = await this.securityScanner.scan(
        request.refactored,
        request.language,
        request.options?.includeSecurityScan !== false
      );

      // Step 7: Generate suggestions
      const suggestions = this.generateSuggestions(refactorTypes, riskFlags);

      // Step 8: KPI-driven analysis (example: compare tools, original vs refactored)
      // For demonstration, assume request.tools = [{ tool: 'Original', scores: {...} }, { tool: 'Refactored', scores: {...} }, ...]
      let kpiResults = null;
      if (request.tools && Array.isArray(request.tools) && request.tools.length > 0) {
        // If org provided, try to fetch org-specific KPI weights
        let orgWeights = null;
        if (request.org) {
          try {
            const OrgSettings = require('../models/OrgSettings');
            const settings = await OrgSettings.findOne({ org: request.org });
            if (settings && settings.kpiWeights) {
              orgWeights = Object.fromEntries(settings.kpiWeights);
            }
          } catch (e) {
            logger.warn('Failed to load org settings for KPI weights:', e.message);
          }
        }

        const normalized = normalizeScores(request.tools);
        const weighted = weightedScore(normalized, orgWeights || undefined);
        const rankings = kpiRankings(normalized);
        const averages = kpiAverages(request.tools);
        kpiResults = {
          rawScores: request.tools,
          normalizedScores: normalized,
          weightedScores: weighted,
          kpiRankings: rankings,
          kpiAverages: averages,
          kpiList: KPIS
        };
      }

      // Compile results
      const results = {
        overallScore: impactMetrics.overallScore,
        aiLabels, // AI-ML clustering results
        level: impactMetrics.level,
        summary: this.generateSummary(refactorTypes, impactMetrics),
        refactorTypes,
        files: astDiffs.files,
        riskFlags,
        suggestedNextSteps: suggestions,
        metrics: impactMetrics.detailed,
        kpiAnalysis: kpiResults
      };

      // Update analysis with results
      const updatedAnalysis = await Analysis.findOneAndUpdate(
        { id: analysisId },
        {
          status: 'completed',
          results,
          completedAt: new Date(),
          processingTimeMs: Date.now() - startTime
        },
        { new: true }
      );

      // Send completion email if user is present
      if (updatedAnalysis.user) {
        try {
          const user = await User.findById(updatedAnalysis.user);
          if (user && user.email) {
            await sendEmail({
              to: user.email,
              subject: `Analysis Complete: ${analysisId}`,
              text: `Hi ${user.name || 'there'},\n\nYour code analysis (${analysisId}) is complete. You can view the results in the RefactorLens dashboard.\n\nSummary: ${results.summary}\nOverall Score: ${results.overallScore}\n\nBest regards,\nThe RefactorLens Team`,
              html: `<h1>Analysis Complete</h1><p>Hi ${user.name || 'there'},</p><p>Your code analysis (<strong>${analysisId}</strong>) is complete. You can view the results in the RefactorLens dashboard.</p><p><strong>Summary:</strong> ${results.summary}<br><strong>Overall Score:</strong> ${results.overallScore}</p><p>Best regards,<br>The RefactorLens Team</p>`
            });
          }
        } catch (e) {
          logger.error(`Failed to send analysis completion email for ${analysisId}:`, e);
        }
      }

      logger.info(`Analysis ${analysisId} completed in ${Date.now() - startTime}ms`);

    } catch (error) {
      logger.error(`Analysis ${analysisId} failed:`, error);

      await Analysis.findOneAndUpdate(
        { id: analysisId },
        {
          status: 'failed',
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date()
          },
          processingTimeMs: Date.now() - startTime
        }
      );
    }
  }

  generateSummary(refactorTypes, impactMetrics) {
    const topRefactors = refactorTypes
      .sort((a, b) => b.level - a.level)
      .slice(0, 3);

    const levelDescriptions = {
      0: 'trivial',
      1: 'minor', 
      2: 'moderate',
      3: 'significant',
      4: 'architectural'
    };

    if (topRefactors.length === 0) {
      return 'No significant refactoring detected';
    }

    const primaryRefactor = topRefactors[0];
    const level = levelDescriptions[primaryRefactor.level] || 'unknown';
    
    let summary = `Major ${level} changes: ${primaryRefactor.type.toLowerCase()}`;
    
    if (topRefactors.length > 1) {
      const additional = topRefactors.slice(1)
        .map(r => r.type.toLowerCase())
        .join(', ');
      summary += `, ${additional}`;
    }

    return summary;
  }

  generateSuggestions(refactorTypes, riskFlags) {
    const suggestions = [];
    refactorTypes.forEach(refactor => {
      switch (refactor.type) {
        case 'Service Extraction':
          suggestions.push('Run integration tests for the new service endpoints');
          suggestions.push('Update API documentation and client SDKs');
          break;
        case 'Cloud Migration':
          suggestions.push('Test with cloud emulators in development environment');
          suggestions.push('Implement proper retry/backoff for cloud API calls');
          break;
        case 'Database Migration':
          suggestions.push('Run database migration scripts in staging environment');
          suggestions.push('Validate data integrity after migration');
          break;
        case 'Containerization':
          suggestions.push('Test container builds and deployment pipeline');
          suggestions.push('Update CI/CD configurations for containerized deployment');
          break;
      }
    });

    riskFlags.forEach(flag => {
      if (flag.type === 'security' && flag.severity === 'high') {
        suggestions.push('Review and address security vulnerabilities before deployment');
      }
      if (flag.type === 'license') {
        suggestions.push('Review new dependency licenses for compliance');
      }
    });

    return [...new Set(suggestions)];
  }
}

// singleton instance
const analysisService = new AnalysisService();

module.exports = {
  analyzeCodePair: (analysisId, request) => analysisService.analyzeCodePair(analysisId, request),
  AnalysisService
};
