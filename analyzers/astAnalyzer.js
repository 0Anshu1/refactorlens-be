const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const Java = require('tree-sitter-java');
const Python = require('tree-sitter-python');
const C = require('tree-sitter-c');
const CPP = require('tree-sitter-cpp');
const diff = require('diff');

class ASTAnalyzer {
  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  initializeParsers() {
    const parserConfigs = [
      { language: 'javascript', parser: JavaScript },
      { language: 'java', parser: Java },
      { language: 'python', parser: Python },
      { language: 'c', parser: C },
      { language: 'cpp', parser: CPP }
    ];

    parserConfigs.forEach(({ language, parser }) => {
      const p = new Parser();
      p.setLanguage(parser);
      this.parsers.set(language, p);
    });
  }

  async parseCode(source, language) {
    const parser = this.parsers.get(language);
    
    if (!parser) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      const tree = parser.parse(source);
      return this.normalizeAST(tree.rootNode, source, language);
    } catch (error) {
      throw new Error(`Failed to parse ${language} code: ${error.message}`);
    }
  }

  normalizeAST(node, source, language) {
    const normalized = {
      type: node.type,
      text: node.text,
      startPosition: { row: node.startPosition.row, column: node.startPosition.column },
      endPosition: { row: node.endPosition.row, column: node.endPosition.column },
      children: [],
      language,
      metadata: this.extractMetadata(node, source, language)
    };

    // Recursively process children
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        normalized.children.push(this.normalizeAST(child, source, language));
      }
    }

    return normalized;
  }

  extractMetadata(node, source, language) {
    const metadata = {
      name: null,
      parameters: [],
      returnType: null,
      modifiers: [],
      annotations: [],
      imports: [],
      dependencies: []
    };

    switch (language) {
      case 'javascript':
        return this.extractJavaScriptMetadata(node, metadata);
      case 'java':
        return this.extractJavaMetadata(node, metadata);
      case 'python':
        return this.extractPythonMetadata(node, metadata);
      case 'c':
      case 'cpp':
        return this.extractCMetadata(node, metadata);
      // case 'csharp':
      //   return this.extractCSharpMetadata(node, metadata);
      default:
        return metadata;
    }
  }

  extractJavaScriptMetadata(node, metadata) {
    // Extract function names, parameters, imports
    if (node.type === 'function_declaration' || node.type === 'function') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) metadata.name = nameNode.text;
      
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        metadata.parameters = this.extractParameters(paramsNode);
      }
    }

    if (node.type === 'import_statement') {
      metadata.imports.push(node.text);
    }

    return metadata;
  }

  extractJavaMetadata(node, metadata) {
    // Extract class names, method signatures, imports
    if (node.type === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) metadata.name = nameNode.text;
    }

    if (node.type === 'method_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) metadata.name = nameNode.text;
      
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        metadata.parameters = this.extractParameters(paramsNode);
      }
    }

    if (node.type === 'import_declaration') {
      metadata.imports.push(node.text);
    }

    return metadata;
  }

  extractPythonMetadata(node, metadata) {
    // Extract function names, parameters, imports
    if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) metadata.name = nameNode.text;
      
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        metadata.parameters = this.extractParameters(paramsNode);
      }
    }

    if (node.type === 'import_statement' || node.type === 'import_from_statement') {
      metadata.imports.push(node.text);
    }

    return metadata;
  }

  extractCMetadata(node, metadata) {
    // Extract function names, parameters, includes
    if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('declarator');
      if (nameNode) metadata.name = nameNode.text;
      
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        metadata.parameters = this.extractParameters(paramsNode);
      }
    }

    if (node.type === 'preproc_include') {
      metadata.imports.push(node.text);
    }

    return metadata;
  }

  // extractCSharpMetadata(node, metadata) {
  //   // Extract class names, method signatures, using statements
  //   if (node.type === 'class_declaration') {
  //     const nameNode = node.childForFieldName('name');
  //     if (nameNode) metadata.name = nameNode.text;
  //   }
  //
  //   if (node.type === 'method_declaration') {
  //     const nameNode = node.childForFieldName('name');
  //     if (nameNode) metadata.name = nameNode.text;
  //     
  //     const paramsNode = node.childForFieldName('parameters');
  //     if (paramsNode) {
  //       metadata.parameters = this.extractParameters(paramsNode);
  //     }
  //   }
  //
  //   if (node.type === 'using_directive') {
  //     metadata.imports.push(node.text);
  //   }
  //
  //   return metadata;
  // }

  extractParameters(paramsNode) {
    const parameters = [];
    
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      if (child && child.type.includes('parameter')) {
        parameters.push(child.text);
      }
    }
    
    return parameters;
  }

  async mapElements(legacyAST, refactoredAST, mapHints = {}) {
    const mappings = new Map();

    // First, try explicit mapping hints
    Object.entries(mapHints).forEach(([legacyName, refactoredName]) => {
      const legacyNode = this.findNodeByName(legacyAST, legacyName);
      const refactoredNode = this.findNodeByName(refactoredAST, refactoredName);
      
      if (legacyNode && refactoredNode) {
        mappings.set(legacyNode, refactoredNode);
      }
    });

    // Then, try automatic mapping based on name similarity
    const legacyNodes = this.collectNamedNodes(legacyAST);
    const refactoredNodes = this.collectNamedNodes(refactoredAST);

    legacyNodes.forEach(legacyNode => {
      if (!mappings.has(legacyNode)) {
        const bestMatch = this.findBestMatch(legacyNode, refactoredNodes);
        if (bestMatch && bestMatch.similarity > 0.7) {
          mappings.set(legacyNode, bestMatch.node);
        }
      }
    });

    return mappings;
  }

  findNodeByName(ast, name) {
    if (ast.metadata?.name === name) {
      return ast;
    }

    for (const child of ast.children) {
      const found = this.findNodeByName(child, name);
      if (found) return found;
    }

    return null;
  }

  collectNamedNodes(ast) {
    const nodes = [];
    
    if (ast.metadata?.name) {
      nodes.push(ast);
    }

    for (const child of ast.children) {
      nodes.push(...this.collectNamedNodes(child));
    }

    return nodes;
  }

  findBestMatch(targetNode, candidates) {
    let bestMatch = null;
    let bestSimilarity = 0;

    candidates.forEach(candidate => {
      const similarity = this.calculateSimilarity(targetNode, candidate);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { node: candidate, similarity };
      }
    });

    return bestMatch;
  }

  calculateSimilarity(node1, node2) {
    // Name similarity
    const name1 = node1.metadata?.name || '';
    const name2 = node2.metadata?.name || '';
    
    if (name1 === name2) return 1.0;
    
    // Levenshtein distance for partial matches
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    const nameSimilarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;

    // Type similarity
    const typeSimilarity = node1.type === node2.type ? 1.0 : 0.5;

    // Parameter similarity
    const params1 = node1.metadata?.parameters || [];
    const params2 = node2.metadata?.parameters || [];
    const paramSimilarity = this.calculateArraySimilarity(params1, params2);

    // Weighted combination
    return (nameSimilarity * 0.5) + (typeSimilarity * 0.3) + (paramSimilarity * 0.2);
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  calculateArraySimilarity(arr1, arr2) {
    if (arr1.length === 0 && arr2.length === 0) return 1.0;
    if (arr1.length === 0 || arr2.length === 0) return 0.0;

    const intersection = arr1.filter(item => arr2.includes(item));
    return intersection.length / Math.max(arr1.length, arr2.length);
  }

  async computeDiffs(legacyAST, refactoredAST, mappings) {
    const textDiffs = diff.diffLines(
      this.astToText(legacyAST),
      this.astToText(refactoredAST)
    );

    const astDiffs = {
      files: [],
      overall: {
        nodesAdded: 0,
        nodesRemoved: 0,
        nodesModified: 0,
        linesAdded: 0,
        linesRemoved: 0
      }
    };

    // Process text diffs for file-level changes
    let currentFile = null;
    textDiffs.forEach(change => {
      if (change.added) {
        astDiffs.overall.linesAdded += change.count;
      } else if (change.removed) {
        astDiffs.overall.linesRemoved += change.count;
      }
    });

    // Compute AST-level differences
    const astChanges = this.computeASTChanges(legacyAST, refactoredAST, mappings);
    astDiffs.overall.nodesAdded = astChanges.added.length;
    astDiffs.overall.nodesRemoved = astChanges.removed.length;
    astDiffs.overall.nodesModified = astChanges.modified.length;

    // Create file-level summaries
    astDiffs.files.push({
      filePath: 'main',
      changes: {
        textDiff: diff.createPatch('main', this.astToText(legacyAST), this.astToText(refactoredAST)),
        astDiffSummary: this.generateASTSummary(astChanges),
        impactScore: this.calculateImpactScore(astChanges),
        linesAdded: astDiffs.overall.linesAdded,
        linesRemoved: astDiffs.overall.linesRemoved,
        linesModified: astDiffs.overall.nodesModified
      }
    });

    return astDiffs;
  }

  astToText(ast) {
    return ast.text;
  }

  computeASTChanges(legacyAST, refactoredAST, mappings) {
    const changes = {
      added: [],
      removed: [],
      modified: []
    };

    // Find nodes that exist in refactored but not in legacy (added)
    this.findAddedNodes(legacyAST, refactoredAST, mappings, changes.added);

    // Find nodes that exist in legacy but not in refactored (removed)
    this.findRemovedNodes(legacyAST, refactoredAST, mappings, changes.removed);

    // Find nodes that exist in both but are modified
    this.findModifiedNodes(legacyAST, refactoredAST, mappings, changes.modified);

    return changes;
  }

  findAddedNodes(legacyAST, refactoredAST, mappings, added) {
    const legacyNodes = this.collectAllNodes(legacyAST);
    const refactoredNodes = this.collectAllNodes(refactoredAST);

    refactoredNodes.forEach(refactoredNode => {
      const isMapped = Array.from(mappings.values()).includes(refactoredNode);
      const hasEquivalent = legacyNodes.some(legacyNode => 
        this.areNodesEquivalent(legacyNode, refactoredNode)
      );

      if (!isMapped && !hasEquivalent) {
        added.push(refactoredNode);
      }
    });
  }

  findRemovedNodes(legacyAST, refactoredAST, mappings, removed) {
    const legacyNodes = this.collectAllNodes(legacyAST);
    const refactoredNodes = this.collectAllNodes(refactoredAST);

    legacyNodes.forEach(legacyNode => {
      const isMapped = mappings.has(legacyNode);
      const hasEquivalent = refactoredNodes.some(refactoredNode => 
        this.areNodesEquivalent(legacyNode, refactoredNode)
      );

      if (!isMapped && !hasEquivalent) {
        removed.push(legacyNode);
      }
    });
  }

  findModifiedNodes(legacyAST, refactoredAST, mappings, modified) {
    mappings.forEach((refactoredNode, legacyNode) => {
      if (!this.areNodesEquivalent(legacyNode, refactoredNode)) {
        modified.push({
          legacy: legacyNode,
          refactored: refactoredNode,
          changes: this.getNodeChanges(legacyNode, refactoredNode)
        });
      }
    });
  }

  collectAllNodes(ast) {
    const nodes = [ast];
    
    for (const child of ast.children) {
      nodes.push(...this.collectAllNodes(child));
    }

    return nodes;
  }

  areNodesEquivalent(node1, node2) {
    return node1.type === node2.type && 
           node1.text === node2.text &&
           JSON.stringify(node1.metadata) === JSON.stringify(node2.metadata);
  }

  getNodeChanges(node1, node2) {
    const changes = [];
    
    if (node1.type !== node2.type) {
      changes.push(`Type changed: ${node1.type} -> ${node2.type}`);
    }
    
    if (node1.text !== node2.text) {
      changes.push('Content modified');
    }

    const metadata1 = node1.metadata || {};
    const metadata2 = node2.metadata || {};
    
    if (JSON.stringify(metadata1) !== JSON.stringify(metadata2)) {
      changes.push('Metadata changed');
    }

    return changes;
  }

  generateASTSummary(changes) {
    const summary = [];
    
    if (changes.added.length > 0) {
      summary.push(`${changes.added.length} nodes added`);
    }
    
    if (changes.removed.length > 0) {
      summary.push(`${changes.removed.length} nodes removed`);
    }
    
    if (changes.modified.length > 0) {
      summary.push(`${changes.modified.length} nodes modified`);
    }

    return summary.join(', ');
  }

  calculateImpactScore(changes) {
    const weights = {
      added: 2,
      removed: 3,
      modified: 1
    };

    const score = (changes.added.length * weights.added) +
                  (changes.removed.length * weights.removed) +
                  (changes.modified.length * weights.modified);

    return Math.min(score, 100); // Cap at 100
  }
}

module.exports = { ASTAnalyzer };
