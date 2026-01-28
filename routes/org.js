const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const OrgSettings = require('../models/OrgSettings');

// GET /api/v1/org/settings - get settings for current org
router.get('/settings', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.org?._id;
    if (!orgId) return res.status(400).json({ error: 'No org in context' });
    const settings = await OrgSettings.findOne({ org: orgId });
    res.json({ kpiWeights: settings ? Object.fromEntries(settings.kpiWeights) : {} });
  } catch (e) { next(e); }
});

// POST /api/v1/org/settings - update settings for current org
router.post('/settings', requireAuth, async (req, res, next) => {
  try {
    const orgId = req.org?._id;
    if (!orgId) return res.status(400).json({ error: 'No org in context' });
    const { kpiWeights } = req.body;
    let settings = await OrgSettings.findOne({ org: orgId });
    if (!settings) {
      settings = new OrgSettings({ org: orgId, kpiWeights });
    } else {
      settings.kpiWeights = kpiWeights;
    }
    await settings.save();
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
