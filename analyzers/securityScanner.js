class SecurityScanner {
  constructor() {
    this.securityPatterns = this.initializeSecurityPatterns();
    this.licensePatterns = this.initializeLicensePatterns();
    this.compatibilityPatterns = this.initializeCompatibilityPatterns();
  }

  initializeSecurityPatterns() {
    return {
      secrets: {
        patterns: [
          /password\s*=\s*["'][^"']+["']/gi,
          /api[_-]?key\s*=\s*["'][^"']+["']/gi,
          /secret\s*=\s*["'][^"']+["']/gi,
          /token\s*=\s*["'][^"']+["']/gi,
          /access[_-]?key\s*=\s*["'][^"']+["']/gi,
          /private[_-]?key\s*=\s*["'][^"']+["']/gi,
          /aws[_-]?access[_-]?key/gi,
          /aws[_-]?secret[_-]?key/gi,
          /github[_-]?token/gi,
          /database[_-]?password/gi
        ],
        severity: 'high',
        type: 'security'
      },
      
      deprecatedCrypto: {
        patterns: [
          /md5\s*\(/gi,
          /sha1\s*\(/gi,
          /des\s*\(/gi,
          /rc4\s*\(/gi,
          /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
          /crypto\.createHash\s*\(\s*['"]sha1['"]/gi,
          /MessageDigest\.getInstance\s*\(\s*['"]MD5['"]/gi,
          /MessageDigest\.getInstance\s*\(\s*['"]SHA1['"]/gi
        ],
        severity: 'medium',
        type: 'security'
      },

      sqlInjection: {
        patterns: [
          /executeQuery\s*\(\s*["'][^"']*\+/gi,
          /query\s*\(\s*["'][^"']*\+/gi,
          /Statement\.execute\s*\(\s*["'][^"']*\+/gi,
          /cursor\.execute\s*\(\s*["'][^"']*\+/gi
        ],
        severity: 'high',
        type: 'security'
      },

      xss: {
        patterns: [
          /innerHTML\s*=\s*[^;]+$/gm,
          /document\.write\s*\(/gi,
          /eval\s*\(/gi,
          /Function\s*\(/gi,
          /setTimeout\s*\([^,]+,\s*0\)/gi
        ],
        severity: 'medium',
        type: 'security'
      },

      pathTraversal: {
        patterns: [
          /\.\.\/\.\.\//g,
          /\.\.\\\.\.\\/g,
          /\.\.%2f\.\.%2f/gi,
          /\.\.%5c\.\.%5c/gi,
          /readFile\s*\(\s*[^)]*\.\./gi,
          /open\s*\(\s*[^)]*\.\./gi
        ],
        severity: 'high',
        type: 'security'
      }
    };
  }

  initializeLicensePatterns() {
    return {
      gpl: {
        patterns: [/gpl[_-]?v?[0-9]?/gi, /gnu[_-]?general[_-]?public[_-]?license/gi],
        type: 'license',
        severity: 'high',
        description: 'GPL license may require source code disclosure'
      },
      
      agpl: {
        patterns: [/agpl[_-]?v?[0-9]?/gi, /gnu[_-]?affero[_-]?general[_-]?public[_-]?license/gi],
        type: 'license',
        severity: 'critical',
        description: 'AGPL license requires source code disclosure for network services'
      },
      
      copyleft: {
        patterns: [/copyleft/gi, /copyleft[_-]?left/gi],
        type: 'license',
        severity: 'high',
        description: 'Copyleft license may impose restrictions'
      },
      
      proprietary: {
        patterns: [/proprietary/gi, /commercial[_-]?license/gi, /closed[_-]?source/gi],
        type: 'license',
        severity: 'medium',
        description: 'Proprietary license may require commercial agreement'
      }
    };
  }

  initializeCompatibilityPatterns() {
    return {
      deprecatedAPIs: {
        patterns: [
          /new\s+Date\s*\([^)]*\)/g, // Deprecated Date constructor usage
          /\.call\s*\(\s*null\s*,/g, // Null context calls
          /arguments\.callee/g, // Deprecated arguments.callee
          /with\s*\(/g, // Deprecated with statement
          /eval\s*\(/g // Deprecated eval usage
        ],
        severity: 'medium',
        type: 'compatibility'
      },

      browserCompatibility: {
        patterns: [
          /document\.all/g, // IE-specific
          /window\.event/g, // IE-specific
          /attachEvent/g, // IE-specific
          /detachEvent/g, // IE-specific
          /createStyleSheet/g // IE-specific
        ],
        severity: 'low',
        type: 'compatibility'
      },

      nodeVersion: {
        patterns: [
          /process\.version/g,
          /node[_-]?version/g,
          /v8[_-]?version/g
        ],
        severity: 'low',
        type: 'compatibility'
      }
    };
  }

  async scan(source, language, includeSecurityScan = true) {
    const riskFlags = [];

    if (includeSecurityScan) {
      // Security scanning
      riskFlags.push(...this.scanSecurity(source));
      
      // License scanning
      riskFlags.push(...this.scanLicenses(source));
      
      // Compatibility scanning
      riskFlags.push(...this.scanCompatibility(source));
    }

    return this.deduplicateFlags(riskFlags);
  }

  scanSecurity(source) {
    const flags = [];
    const sourceText = typeof source === 'string' ? source : source.text || '';

    Object.entries(this.securityPatterns).forEach(([category, config]) => {
      config.patterns.forEach(pattern => {
        const matches = sourceText.match(pattern);
        if (matches) {
          flags.push({
            type: 'security',
            severity: config.severity,
            description: this.generateSecurityDescription(category, matches.length),
            suggestion: this.generateSecuritySuggestion(category)
          });
        }
      });
    });

    return flags;
  }

  scanLicenses(source) {
    const flags = [];
    const sourceText = typeof source === 'string' ? source : source.text || '';

    Object.entries(this.licensePatterns).forEach(([license, config]) => {
      config.patterns.forEach(pattern => {
        const matches = sourceText.match(pattern);
        if (matches) {
          flags.push({
            type: 'license',
            severity: config.severity,
            description: config.description,
            suggestion: 'Review license compatibility with your project requirements'
          });
        }
      });
    });

    return flags;
  }

  scanCompatibility(source) {
    const flags = [];
    const sourceText = typeof source === 'string' ? source : source.text || '';

    Object.entries(this.compatibilityPatterns).forEach(([category, config]) => {
      config.patterns.forEach(pattern => {
        const matches = sourceText.match(pattern);
        if (matches) {
          flags.push({
            type: 'compatibility',
            severity: config.severity,
            description: this.generateCompatibilityDescription(category, matches.length),
            suggestion: this.generateCompatibilitySuggestion(category)
          });
        }
      });
    });

    return flags;
  }

  generateSecurityDescription(category, matchCount) {
    const descriptions = {
      secrets: `Potential secret exposure detected (${matchCount} occurrences)`,
      deprecatedCrypto: `Deprecated cryptographic functions found (${matchCount} occurrences)`,
      sqlInjection: `Potential SQL injection vulnerability (${matchCount} occurrences)`,
      xss: `Potential XSS vulnerability (${matchCount} occurrences)`,
      pathTraversal: `Potential path traversal vulnerability (${matchCount} occurrences)`
    };

    return descriptions[category] || `Security issue detected (${matchCount} occurrences)`;
  }

  generateSecuritySuggestion(category) {
    const suggestions = {
      secrets: 'Use environment variables or secure configuration management for secrets',
      deprecatedCrypto: 'Replace with modern cryptographic functions (SHA-256, AES-256)',
      sqlInjection: 'Use parameterized queries or prepared statements',
      xss: 'Sanitize user input and use Content Security Policy',
      pathTraversal: 'Validate and sanitize file paths, use path.join() or equivalent'
    };

    return suggestions[category] || 'Review security best practices for this code';
  }

  generateCompatibilityDescription(category, matchCount) {
    const descriptions = {
      deprecatedAPIs: `Deprecated API usage found (${matchCount} occurrences)`,
      browserCompatibility: `Browser compatibility issues (${matchCount} occurrences)`,
      nodeVersion: `Node.js version dependencies (${matchCount} occurrences)`
    };

    return descriptions[category] || `Compatibility issue detected (${matchCount} occurrences)`;
  }

  generateCompatibilitySuggestion(category) {
    const suggestions = {
      deprecatedAPIs: 'Update to modern APIs and remove deprecated usage',
      browserCompatibility: 'Test across target browsers and update polyfills',
      nodeVersion: 'Specify minimum Node.js version in package.json'
    };

    return suggestions[category] || 'Review compatibility requirements';
  }

  deduplicateFlags(flags) {
    const seen = new Set();
    return flags.filter(flag => {
      const key = `${flag.type}-${flag.severity}-${flag.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Scan for new dependencies and their licenses
  async scanDependencies(dependencies) {
    const flags = [];
    
    // This would typically integrate with package managers
    // For now, we'll do basic pattern matching
    dependencies.forEach(dep => {
      // Check for common problematic licenses in dependency names
      if (dep.includes('gpl') || dep.includes('copyleft')) {
        flags.push({
          type: 'license',
          severity: 'high',
          description: `Dependency ${dep} may have restrictive license`,
          suggestion: 'Review dependency license before including in production'
        });
      }
    });

    return flags;
  }

  // Performance-related risk flags
  scanPerformance(source) {
    const flags = [];
    const sourceText = typeof source === 'string' ? source : source.text || '';

    const performancePatterns = [
      {
        pattern: /for\s*\(\s*var\s+\w+\s*=\s*0;\s*\w+\s*<\s*\.length\s*;\s*\w+\+\+\)/g,
        description: 'Inefficient loop with repeated .length access',
        suggestion: 'Cache array length before loop'
      },
      {
        pattern: /document\.getElementById\s*\(/g,
        description: 'Multiple DOM queries without caching',
        suggestion: 'Cache DOM elements for reuse'
      },
      {
        pattern: /new\s+RegExp\s*\(/g,
        description: 'Dynamic regex creation in loops',
        suggestion: 'Create regex patterns outside loops'
      }
    ];

    performancePatterns.forEach(({ pattern, description, suggestion }) => {
      const matches = sourceText.match(pattern);
      if (matches && matches.length > 3) {
        flags.push({
          type: 'performance',
          severity: 'medium',
          description: `${description} (${matches.length} occurrences)`,
          suggestion
        });
      }
    });

    return flags;
  }

  // Maintainability-related risk flags
  scanMaintainability(source) {
    const flags = [];
    const sourceText = typeof source === 'string' ? source : source.text || '';

    const maintainabilityPatterns = [
      {
        pattern: /function\s+\w+\s*\([^)]{50,}\)/g,
        description: 'Functions with many parameters',
        suggestion: 'Consider using parameter objects or builder pattern'
      },
      {
        pattern: /\{[^}]{200,}\}/g,
        description: 'Very long functions or blocks',
        suggestion: 'Break down into smaller, focused functions'
      },
      {
        pattern: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/g,
        description: 'Code with TODO/FIXME/HACK comments',
        suggestion: 'Address technical debt before production deployment'
      }
    ];

    maintainabilityPatterns.forEach(({ pattern, description, suggestion }) => {
      const matches = sourceText.match(pattern);
      if (matches) {
        flags.push({
          type: 'maintainability',
          severity: 'low',
          description: `${description} (${matches.length} occurrences)`,
          suggestion
        });
      }
    });

    return flags;
  }
}

module.exports = { SecurityScanner };
