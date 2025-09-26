class RefactorClassifier {
  constructor() {
    this.patterns = this.initializePatterns();
  }

  initializePatterns() {
    return {
      // Structural refactoring patterns
      extractMethod: {
        type: 'Extract Method',
        patterns: [
          { type: 'function_declaration', condition: 'isNew' },
          { type: 'method_declaration', condition: 'isNew' },
          { type: 'function_definition', condition: 'isNew' }
        ],
        level: 2
      },

      inlineMethod: {
        type: 'Inline Method',
        patterns: [
          { type: 'function_declaration', condition: 'removed' },
          { type: 'method_declaration', condition: 'removed' },
          { type: 'function_definition', condition: 'removed' }
        ],
        level: 2
      },

      renameSymbol: {
        type: 'Rename Symbol',
        patterns: [
          { condition: 'nameChanged' }
        ],
        level: 1
      },

      moveModularize: {
        type: 'Move/Modularize',
        patterns: [
          { type: 'import_statement', condition: 'isNew' },
          { type: 'import_declaration', condition: 'isNew' },
          { type: 'using_directive', condition: 'isNew' }
        ],
        level: 2
      },

      // Architectural refactoring patterns
      serviceExtraction: {
        type: 'Service Extraction',
        patterns: [
          { text: 'restcontroller', condition: 'isNew' },
          { text: 'controller', condition: 'isNew' },
          { text: 'service', condition: 'isNew' },
          { text: '@restcontroller', condition: 'isNew' },
          { text: '@controller', condition: 'isNew' },
          { text: '@service', condition: 'isNew' },
          { text: 'express', condition: 'isNew' },
          { text: 'fastify', condition: 'isNew' },
          { text: 'flask', condition: 'isNew' },
          { text: 'django', condition: 'isNew' }
        ],
        level: 4
      },

      layering: {
        type: 'Layering',
        patterns: [
          { text: 'repository', condition: 'isNew' },
          { text: 'dao', condition: 'isNew' },
          { text: 'datalayer', condition: 'isNew' },
          { text: 'repository', condition: 'isNew' },
          { text: '@repository', condition: 'isNew' },
          { text: '@dao', condition: 'isNew' }
        ],
        level: 3
      },

      eventDriven: {
        type: 'Event-driven',
        patterns: [
          { text: 'kafka', condition: 'isNew' },
          { text: 'rabbitmq', condition: 'isNew' },
          { text: 'sqs', condition: 'isNew' },
          { text: 'eventbus', condition: 'isNew' },
          { text: 'pubsub', condition: 'isNew' },
          { text: 'messaging', condition: 'isNew' }
        ],
        level: 4
      },

      cloudMigration: {
        type: 'Cloud Migration',
        patterns: [
          // AWS patterns
          { text: 'aws-sdk', condition: 'isNew' },
          { text: 's3', condition: 'isNew' },
          { text: 'dynamodb', condition: 'isNew' },
          { text: 'lambda', condition: 'isNew' },
          { text: 'ec2', condition: 'isNew' },
          { text: 'rds', condition: 'isNew' },
          { text: 'sns', condition: 'isNew' },
          { text: 'sqs', condition: 'isNew' },
          
          // Azure patterns
          { text: 'azure', condition: 'isNew' },
          { text: 'blob', condition: 'isNew' },
          { text: 'cosmosdb', condition: 'isNew' },
          { text: 'functions', condition: 'isNew' },
          
          // GCP patterns
          { text: 'google-cloud', condition: 'isNew' },
          { text: 'gcs', condition: 'isNew' },
          { text: 'firestore', condition: 'isNew' },
          { text: 'cloud-functions', condition: 'isNew' }
        ],
        level: 3
      },

      // Code quality patterns
      errorHandling: {
        type: 'Error Handling',
        patterns: [
          { text: 'try', condition: 'isNew' },
          { text: 'catch', condition: 'isNew' },
          { text: 'exception', condition: 'isNew' },
          { text: 'error', condition: 'isNew' },
          { text: 'retry', condition: 'isNew' },
          { text: 'fallback', condition: 'isNew' }
        ],
        level: 2
      },

      loggingObservability: {
        type: 'Logging/Observability',
        patterns: [
          { text: 'log4j', condition: 'isNew' },
          { text: 'slf4j', condition: 'isNew' },
          { text: 'winston', condition: 'isNew' },
          { text: 'bunyan', condition: 'isNew' },
          { text: 'logging', condition: 'isNew' },
          { text: 'logger', condition: 'isNew' },
          { text: 'metrics', condition: 'isNew' },
          { text: 'monitoring', condition: 'isNew' },
          { text: 'tracing', condition: 'isNew' }
        ],
        level: 2
      },

      // Testing patterns
      testing: {
        type: 'Testing',
        patterns: [
          { text: 'junit', condition: 'isNew' },
          { text: 'testng', condition: 'isNew' },
          { text: 'jest', condition: 'isNew' },
          { text: 'mocha', condition: 'isNew' },
          { text: 'pytest', condition: 'isNew' },
          { text: 'unittest', condition: 'isNew' },
          { text: 'mockito', condition: 'isNew' },
          { text: 'sinon', condition: 'isNew' },
          { text: '@test', condition: 'isNew' },
          { text: 'describe', condition: 'isNew' },
          { text: 'it(', condition: 'isNew' },
          { text: 'test(', condition: 'isNew' }
        ],
        level: 2
      },

      // Containerization patterns
      containerization: {
        type: 'Containerization',
        patterns: [
          { text: 'dockerfile', condition: 'isNew' },
          { text: 'docker-compose', condition: 'isNew' },
          { text: 'kubernetes', condition: 'isNew' },
          { text: 'k8s', condition: 'isNew' },
          { text: 'helm', condition: 'isNew' },
          { text: 'container', condition: 'isNew' }
        ],
        level: 4
      },

      // Infrastructure as Code patterns
      infrastructureAsCode: {
        type: 'Infrastructure as Code',
        patterns: [
          { text: 'terraform', condition: 'isNew' },
          { text: 'cloudformation', condition: 'isNew' },
          { text: 'arm', condition: 'isNew' },
          { text: 'pulumi', condition: 'isNew' },
          { text: 'cdk', condition: 'isNew' },
          { text: 'serverless', condition: 'isNew' }
        ],
        level: 4
      },

      // Database migration patterns
      databaseMigration: {
        type: 'Database Migration',
        patterns: [
          { text: 'jpa', condition: 'isNew' },
          { text: 'hibernate', condition: 'isNew' },
          { text: 'mybatis', condition: 'isNew' },
          { text: 'sequelize', condition: 'isNew' },
          { text: 'typeorm', condition: 'isNew' },
          { text: 'sqlalchemy', condition: 'isNew' },
          { text: 'mongoose', condition: 'isNew' },
          { text: 'prisma', condition: 'isNew' },
          { text: 'migration', condition: 'isNew' },
          { text: 'schema', condition: 'isNew' }
        ],
        level: 3
      }
    };
  }

  async classify(astDiffs, language) {
    const refactorTypes = [];

    // Analyze added nodes for new patterns
    astDiffs.overall?.addedNodes?.forEach(node => {
      const detected = this.detectPatterns(node, 'added');
      refactorTypes.push(...detected);
    });

    // Analyze removed nodes for inline patterns
    astDiffs.overall?.removedNodes?.forEach(node => {
      const detected = this.detectPatterns(node, 'removed');
      refactorTypes.push(...detected);
    });

    // Analyze modified nodes for rename patterns
    astDiffs.overall?.modifiedNodes?.forEach(change => {
      const detected = this.detectPatterns(change, 'modified');
      refactorTypes.push(...detected);
    });

    // Analyze file-level changes
    if (astDiffs.files) {
      astDiffs.files.forEach(file => {
        const detected = this.analyzeFileChanges(file);
        refactorTypes.push(...detected);
      });
    }

    // Deduplicate and merge similar refactor types
    return this.mergeRefactorTypes(refactorTypes);
  }

  detectPatterns(node, condition) {
    const detected = [];

    Object.entries(this.patterns).forEach(([key, pattern]) => {
      pattern.patterns.forEach(rule => {
        if (this.matchesPattern(node, rule, condition)) {
          detected.push({
            type: pattern.type,
            level: pattern.level,
            evidence: [this.generateEvidence(node, rule)],
            confidence: this.calculateConfidence(node, rule)
          });
        }
      });
    });

    return detected;
  }

  matchesPattern(node, rule, condition) {
    // Check type-based patterns
    if (rule.type && rule.type !== node.type) {
      return false;
    }

    // Check text-based patterns
    if (rule.text) {
      const nodeText = node.text?.toLowerCase() || '';
      const ruleText = rule.text.toLowerCase();
      
      if (!nodeText.includes(ruleText)) {
        return false;
      }
    }

    // Check condition-based patterns
    if (rule.condition) {
      switch (rule.condition) {
        case 'isNew':
          return condition === 'added';
        case 'removed':
          return condition === 'removed';
        case 'nameChanged':
          return condition === 'modified' && this.hasNameChange(node);
        default:
          return true;
      }
    }

    return true;
  }

  hasNameChange(node) {
    // Check if this is a name change by comparing metadata
    if (node.changes && Array.isArray(node.changes)) {
      return node.changes.some(change => 
        change.toLowerCase().includes('name') || 
        change.toLowerCase().includes('identifier')
      );
    }
    return false;
  }

  generateEvidence(node, rule) {
    const evidence = [];

    if (rule.text) {
      evidence.push(`Found ${rule.text} usage`);
    }

    if (node.metadata?.name) {
      evidence.push(`in ${node.metadata.name}`);
    }

    if (node.type) {
      evidence.push(`(${node.type})`);
    }

    return evidence.join(' ');
  }

  calculateConfidence(node, rule) {
    let confidence = 0.5; // Base confidence

    // Increase confidence for exact matches
    if (rule.text && node.text?.toLowerCase().includes(rule.text.toLowerCase())) {
      confidence += 0.3;
    }

    // Increase confidence for type matches
    if (rule.type && rule.type === node.type) {
      confidence += 0.2;
    }

    // Increase confidence for metadata matches
    if (node.metadata) {
      if (node.metadata.name) confidence += 0.1;
      if (node.metadata.imports?.length > 0) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  analyzeFileChanges(file) {
    const detected = [];

    // Analyze text diff for patterns
    if (file.changes?.textDiff) {
      const diffContent = file.changes.textDiff.toLowerCase();
      
      Object.entries(this.patterns).forEach(([key, pattern]) => {
        pattern.patterns.forEach(rule => {
          if (rule.text && diffContent.includes(rule.text.toLowerCase())) {
            detected.push({
              type: pattern.type,
              level: pattern.level,
              evidence: [`Found ${rule.text} in file changes`],
              confidence: 0.8
            });
          }
        });
      });
    }

    // Analyze AST diff summary
    if (file.changes?.astDiffSummary) {
      const summary = file.changes.astDiffSummary.toLowerCase();
      
      if (summary.includes('import') || summary.includes('dependency')) {
        detected.push({
          type: 'Move/Modularize',
          level: 2,
          evidence: ['Import/dependency changes detected'],
          confidence: 0.7
        });
      }
    }

    return detected;
  }

  mergeRefactorTypes(refactorTypes) {
    const merged = new Map();

    refactorTypes.forEach(refactor => {
      const key = refactor.type;
      
      if (merged.has(key)) {
        const existing = merged.get(key);
        
        // Keep the higher level
        existing.level = Math.max(existing.level, refactor.level);
        
        // Merge evidence
        existing.evidence = [...new Set([...existing.evidence, ...refactor.evidence])];
        
        // Update confidence (average)
        existing.confidence = (existing.confidence + refactor.confidence) / 2;
      } else {
        merged.set(key, { ...refactor });
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.level - a.level);
  }

  // Language-specific classification helpers
  classifyJavaScript(astDiffs) {
    // JavaScript-specific patterns
    return [];
  }

  classifyJava(astDiffs) {
    // Java-specific patterns
    return [];
  }

  classifyPython(astDiffs) {
    // Python-specific patterns
    return [];
  }

  classifyC(astDiffs) {
    // C-specific patterns
    return [];
  }

  classifyCSharp(astDiffs) {
    // C#-specific patterns
    return [];
  }
}

module.exports = { RefactorClassifier };
