const { verifyToken } = require('../utils/auth');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing authorization header' });
  const token = auth.replace(/^Bearer\s+/i, '');
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).populate('org');
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    req.org = user.org;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', detail: err.message });
  }
}

module.exports = { requireAuth };
