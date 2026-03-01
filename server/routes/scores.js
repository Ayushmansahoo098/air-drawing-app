const express = require('express');
const Score = require('../models/Score');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { username, score, mode } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username is required' });
    }
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return res.status(400).json({ error: 'score must be a number' });
    }
    if (!mode || typeof mode !== 'string') {
      return res.status(400).json({ error: 'mode is required' });
    }

    const saved = await Score.create({
      username: username.trim(),
      score,
      mode,
      date: new Date(),
    });

    const best = await Score.findOne({ mode }).sort({ score: -1 }).select('score username mode date');

    return res.status(201).json({
      success: true,
      score: saved,
      highScore: best?.score ?? score,
      highScorer: best?.username ?? saved.username,
    });
  } catch (error) {
    console.error('Failed to save score:', error);
    return res.status(500).json({ error: 'Failed to save score' });
  }
});

module.exports = router;
