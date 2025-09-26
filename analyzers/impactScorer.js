class ImpactScorer {
  constructor() {
    this.weights = {
      linesChanged: 0.30,
      astNodesChanged: 0.25,
      newInfrastructure: 0.20,
      testCoverage: 0.15,
      complexityDelta: 0.10
    };

    this.levelThresholds = {
      0: 0,      // None/trivial
      1: 20,     // Minor
      2: 40,     // Moderate  
      3: 60,     // Significant
      4: 80      // Architectural
    };
  }

  async calculate(astDiffs, refactorTypes, language) {
    const metrics = await this.calculateMetrics(astDiffs, refactorTypes, language);
    const overallScore = this.calculateOverallScore(metrics);
    const level = this.determineLevel(overallScore);

    return {
      overallScore,
      level,
      detailed: metrics
    };
  }

  async calculateMetrics(astDiffs, refactorTypes, language) {
    const metrics = {
      totalLinesChanged: 0,
      filesModified: 0,
      newDependencies: [],
      removedDependencies: [],
      cyclomaticComplexityDelta: 0,
      testCoverageDelta: 0,
      astNodesChanged: 0,
      newInfrastructureComponents: 0,
      architecturalChanges: 0
    };

    // Calculate line changes
    if (astDiffs.overall) {
      metrics.totalLinesChanged = 
        (astDiffs.overall.linesAdded || 0) + 
        (astDiffs.overall.linesRemoved || 0) + 
        (astDiffs.overall.linesModified || 0);
      
      metrics.astNodesChanged = 
        (astDiffs.overall.nodesAdded || 0) + 
        (astDiffs.overall.nodesRemoved || 0) + 
        (astDiffs.overall.nodesModified || 0);
    }

    // Count files modified
    if (astDiffs.files) {
      metrics.filesModified = astDiffs.files.length;
    }

    // Analyze refactor types for infrastructure and architectural changes
    refactorTypes.forEach(refactor => {
      // Count architectural changes
      if (refactor.level >= 4) {
        metrics.architecturalChanges++;
      }

      // Count infrastructure components
      const infrastructureTypes = [
        'Service Extraction',
        'Cloud Migration', 
        'Containerization',
        'Infrastructure as Code',
        'Event-driven'
      ];

      if (infrastructureTypes.includes(refactor.type)) {
        metrics.newInfrastructureComponents++;
      }

      // Extract dependencies from evidence
      refactor.evidence.forEach(evidence => {
        const deps = this.extractDependencies(evidence);
        metrics.newDependencies.push(...deps);
      });
    });

    // Calculate complexity delta (simplified)
    metrics.cyclomaticComplexityDelta = this.calculateComplexityDelta(astDiffs, refactorTypes);

    // Calculate test coverage delta (simplified)
    metrics.testCoverageDelta = this.calculateTestCoverageDelta(refactorTypes);

    // Remove duplicates from dependencies
    metrics.newDependencies = [...new Set(metrics.newDependencies)];

    return metrics;
  }

  calculateOverallScore(metrics) {
    // Normalize metrics to 0-100 scale
    const normalizedMetrics = {
      linesChanged: this.normalizeLinesChanged(metrics.totalLinesChanged),
      astNodesChanged: this.normalizeASTNodes(metrics.astNodesChanged),
      newInfrastructure: this.normalizeInfrastructure(metrics.newInfrastructureComponents),
      testCoverage: this.normalizeTestCoverage(metrics.testCoverageDelta),
      complexityDelta: this.normalizeComplexity(metrics.cyclomaticComplexityDelta)
    };

    // Calculate weighted score
    const score = 
      (normalizedMetrics.linesChanged * this.weights.linesChanged) +
      (normalizedMetrics.astNodesChanged * this.weights.astNodesChanged) +
      (normalizedMetrics.newInfrastructure * this.weights.newInfrastructure) +
      (normalizedMetrics.testCoverage * this.weights.testCoverage) +
      (normalizedMetrics.complexityDelta * this.weights.complexityDelta);

    return Math.round(Math.min(Math.max(score, 0), 100));
  }

  determineLevel(score) {
    if (score >= this.levelThresholds[4]) return 4;
    if (score >= this.levelThresholds[3]) return 3;
    if (score >= this.levelThresholds[2]) return 2;
    if (score >= this.levelThresholds[1]) return 1;
    return 0;
  }

  normalizeLinesChanged(lines) {
    // Sigmoid normalization: 0-1000 lines maps to 0-100
    if (lines === 0) return 0;
    
    const normalized = 100 / (1 + Math.exp(-(lines - 200) / 100));
    return Math.min(normalized, 100);
  }

  normalizeASTNodes(nodes) {
    // Similar to lines but with different scaling
    if (nodes === 0) return 0;
    
    const normalized = 100 / (1 + Math.exp(-(nodes - 50) / 25));
    return Math.min(normalized, 100);
  }

  normalizeInfrastructure(components) {
    // Linear scaling for infrastructure components
    return Math.min(components * 20, 100);
  }

  normalizeTestCoverage(delta) {
    // Test coverage changes (positive is good, negative is bad)
    // Scale from -50 to +50 to 0-100
    return Math.min(Math.max((delta + 50) * 2, 0), 100);
  }

  normalizeComplexity(delta) {
    // Complexity changes (negative is good, positive is bad)
    // Scale from -10 to +10 to 0-100 (inverted)
    return Math.min(Math.max((10 - delta) * 5, 0), 100);
  }

  extractDependencies(evidence) {
    const dependencies = [];
    
    // Common dependency patterns
    const dependencyPatterns = [
      /import\s+([a-zA-Z0-9.-]+)/g,
      /require\(['"]([^'"]+)['"]\)/g,
      /from\s+['"]([^'"]+)['"]/g,
      /using\s+([a-zA-Z0-9.]+);/g,
      /#include\s+<([^>]+)>/g,
      /#include\s+"([^"]+)"/g
    ];

    dependencyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(evidence)) !== null) {
        dependencies.push(match[1]);
      }
    });

    return dependencies;
  }

  calculateComplexityDelta(astDiffs, refactorTypes) {
    // Simplified complexity calculation
    let delta = 0;

    // Add complexity for new infrastructure components
    const complexTypes = [
      'Service Extraction',
      'Cloud Migration',
      'Event-driven',
      'Infrastructure as Code'
    ];

    refactorTypes.forEach(refactor => {
      if (complexTypes.includes(refactor.type)) {
        delta += refactor.level * 2;
      } else {
        delta += refactor.level;
      }
    });

    // Subtract complexity for simplifications
    const simplifyingTypes = [
      'Extract Method',
      'Inline Method',
      'Rename Symbol'
    ];

    refactorTypes.forEach(refactor => {
      if (simplifyingTypes.includes(refactor.type)) {
        delta -= refactor.level;
      }
    });

    return Math.max(delta, -10); // Cap at -10
  }

  calculateTestCoverageDelta(refactorTypes) {
    // Simplified test coverage calculation
    let delta = 0;

    refactorTypes.forEach(refactor => {
      if (refactor.type === 'Testing') {
        delta += refactor.level * 10; // Positive impact
      } else if (refactor.level >= 3) {
        // High-impact changes might reduce test coverage temporarily
        delta -= 5;
      }
    });

    return Math.max(Math.min(delta, 50), -50); // Cap between -50 and +50
  }

  // Language-specific scoring adjustments
  adjustForLanguage(metrics, language) {
    const adjustments = {
      java: {
        complexityMultiplier: 1.1, // Java tends to be more complex
        infrastructureWeight: 1.2  // Enterprise patterns
      },
      javascript: {
        complexityMultiplier: 0.9, // JavaScript is generally simpler
        infrastructureWeight: 1.0
      },
      python: {
        complexityMultiplier: 0.95,
        infrastructureWeight: 1.0
      },
      c: {
        complexityMultiplier: 1.3, // C is more complex due to manual memory management
        infrastructureWeight: 0.8
      },
      cpp: {
        complexityMultiplier: 1.2,
        infrastructureWeight: 0.9
      },
      csharp: {
        complexityMultiplier: 1.05,
        infrastructureWeight: 1.1
      }
    };

    const adjustment = adjustments[language] || { complexityMultiplier: 1.0, infrastructureWeight: 1.0 };
    
    metrics.cyclomaticComplexityDelta *= adjustment.complexityMultiplier;
    metrics.newInfrastructureComponents *= adjustment.infrastructureWeight;

    return metrics;
  }

  // Generate impact description
  generateImpactDescription(level, metrics) {
    const descriptions = {
      0: 'No significant changes detected',
      1: 'Minor code improvements and refactoring',
      2: 'Moderate restructuring with some architectural changes',
      3: 'Significant modernization with new patterns and infrastructure',
      4: 'Major architectural transformation with cloud-native adoption'
    };

    let description = descriptions[level] || descriptions[0];

    // Add specific details based on metrics
    if (metrics.newInfrastructureComponents > 0) {
      description += ` (${metrics.newInfrastructureComponents} new infrastructure components)`;
    }

    if (metrics.architecturalChanges > 0) {
      description += ` (${metrics.architecturalChanges} architectural changes)`;
    }

    return description;
  }
}

module.exports = { ImpactScorer };
