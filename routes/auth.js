const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrgSettings = require('../models/OrgSettings');
const { hashPassword, comparePassword, signToken } = require('../utils/auth');
const { sendEmail } = require('../utils/mail');

// POST /api/v1/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, orgName, orgType } = req.body;
    if (!email || !password || !orgName) return res.status(400).json({ error: 'email, password and orgName are required' });

    // If organization exists, attach user to it; otherwise create organization and settings
    let org = await Organization.findOne({ name: orgName });
    if (!org) {
      org = new Organization({ name: orgName, type: orgType || 'other' });
      await org.save();
      // create default OrgSettings
      const settings = new OrgSettings({ org: org._id });
      await settings.save();
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const passwordHash = await hashPassword(password);
    const user = new User({ email, passwordHash, name, role: 'admin', org: org._id });
    await user.save();

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to RefactorLens!',
        text: `Hi ${name || 'there'},\n\nWelcome to RefactorLens! Your account has been successfully created.\n\nBest regards,\nThe RefactorLens Team`,
        html: `<h1>Welcome to RefactorLens!</h1><p>Hi ${name || 'there'},</p><p>Welcome to RefactorLens! Your account has been successfully created.</p><p>Best regards,<br>The RefactorLens Team</p>`
      });
    } catch (e) {
      console.error('Failed to send welcome email:', e);
    }

    const token = signToken({ sub: user._id, org: org._id, role: user.role });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, org: org._id } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ sub: user._id, org: user.org, role: user.role });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, org: user.org } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
