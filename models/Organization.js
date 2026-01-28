const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['finance', 'defense', 'startup', 'govt', 'other'], default: 'other' },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Organization', OrganizationSchema);
