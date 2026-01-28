const mongoose = require('mongoose');
const { Schema } = mongoose;
const { KPIS } = require('./KPIFramework');

// Build default weights map from KPIS
const defaultWeights = KPIS.reduce((acc, k) => {
  acc[k.key] = k.defaultWeight;
  return acc;
}, {});

const OrgSettingsSchema = new Schema({
  org: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  kpiWeights: { type: Map, of: Number, default: defaultWeights },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OrgSettings', OrgSettingsSchema);
