// KPIFramework.js
// Defines KPI structure, weights, and scoring logic for tool evaluation

const KPIS = [
  { key: 'K1', name: 'Language Compatibility', description: 'Ability to handle legacy and modern languages', defaultWeight: 0.1 },
  { key: 'K2', name: 'IDE/CI-CD Integration', description: 'Support for modern development pipelines', defaultWeight: 0.1 },
  { key: 'K3', name: 'Safe Refactoring & Auto Testing', description: 'Confidence in maintaining logic and auto testing', defaultWeight: 0.2 },
  { key: 'K4', name: 'Security & Compliance', description: 'Suitability for regulated environments', defaultWeight: 0.2 },
  { key: 'K5', name: 'Scalability', description: 'Performance in large-scale or distributed systems', defaultWeight: 0.15 },
  { key: 'K6', name: 'Cost & Documentation', description: 'Licensing, time, training costs, documentation', defaultWeight: 0.1 },
  { key: 'K7', name: 'AI Automation & Debugging', description: 'Level of intelligent transformation and debugging', defaultWeight: 0.15 }
];

function normalizeScores(rawScores) {
  // rawScores: [{ tool: 'ToolA', scores: { K1: 7, K2: 8, ... } }, ...]
  const normalized = [];
  KPIS.forEach(kpi => {
    const values = rawScores.map(t => t.scores[kpi.key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    rawScores.forEach((tool, idx) => {
      if (!normalized[idx]) normalized[idx] = { tool: tool.tool, scores: {} };
      normalized[idx].scores[kpi.key] = max === min ? 1 : (tool.scores[kpi.key] - min) / (max - min);
    });
  });
  return normalized;
}

function weightedScore(normalizedScores, weights = {}) {
  // weights: { K1: 0.1, K2: 0.2, ... } (optional)
  return normalizedScores.map(tool => {
    let score = 0;
    KPIS.forEach(kpi => {
      const w = weights[kpi.key] !== undefined ? weights[kpi.key] : kpi.defaultWeight;
      score += w * tool.scores[kpi.key];
    });
    return { tool: tool.tool, score: +(score * 10).toFixed(2), kpiBreakdown: tool.scores };
  });
}

function kpiRankings(normalizedScores) {
  // Returns per-KPI rankings (highest to lowest) for each KPI
  const rankings = {};
  KPIS.forEach(kpi => {
    rankings[kpi.key] = [...normalizedScores]
      .sort((a, b) => b.scores[kpi.key] - a.scores[kpi.key])
      .map(tool => ({ tool: tool.tool, score: tool.scores[kpi.key] }));
  });
  return rankings;
}

function kpiAverages(rawScores) {
  // Returns average raw score for each KPI
  const averages = {};
  KPIS.forEach(kpi => {
    const values = rawScores.map(t => t.scores[kpi.key]);
    averages[kpi.key] = values.reduce((a, b) => a + b, 0) / values.length;
  });
  return averages;
}

module.exports = {
  KPIS,
  normalizeScores,
  weightedScore,
  kpiRankings,
  kpiAverages
};
