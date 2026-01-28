const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  name: { type: String },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  org: { type: Schema.Types.ObjectId, ref: 'Organization' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
