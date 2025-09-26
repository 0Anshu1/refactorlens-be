const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const fetch = require('node-fetch');

// Knowledge base about RefactorLens
const platformInfo = `RefactorLens is an AI/ML-powered code refactoring analysis tool. It analyzes legacy and modern code, detects refactoring patterns, scores impact, and flags risks. It supports multiple languages and integrates Python ML for advanced analysis.`;

router.post('/', async (req, res) => {
  const userMessage = req.body.message;
  try {
    // Compose prompt for Gemini
    const prompt = `${platformInfo}\nUser: ${userMessage}\nAI:`;
    // Gemini API call (example endpoint, update as needed)
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not answer that.';
    res.json({ reply });
  } catch (err) {
    res.json({ reply: 'Sorry, there was an error connecting to Gemini.' });
  }
});

module.exports = router;
