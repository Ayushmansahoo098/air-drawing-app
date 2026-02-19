const express = require('express');
const router = express.Router();
const Drawing = require('../models/Drawing');

// ─── POST /api/drawings ───────────────────────────────────────────────────────
// Save a new drawing (base64 canvas image)
router.post('/', async (req, res) => {
  try {
    const { title, imageData, color, thickness } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'imageData is required' });
    }

    const drawing = new Drawing({ title, imageData, color, thickness });
    const saved = await drawing.save();

    res.status(201).json({ success: true, drawing: saved });
  } catch (err) {
    console.error('Error saving drawing:', err);
    res.status(500).json({ error: 'Failed to save drawing', message: err.message });
  }
});

// ─── GET /api/drawings ────────────────────────────────────────────────────────
// Retrieve all drawings (newest first, strip imageData for listing)
router.get('/', async (req, res) => {
  try {
    const drawings = await Drawing.find()
      .sort({ createdAt: -1 })
      .select('title color thickness createdAt imageData');

    res.json({ success: true, count: drawings.length, drawings });
  } catch (err) {
    console.error('Error fetching drawings:', err);
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

// ─── GET /api/drawings/:id ────────────────────────────────────────────────────
// Get single drawing by ID
router.get('/:id', async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });
    res.json({ success: true, drawing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drawing' });
  }
});

// ─── DELETE /api/drawings/:id ─────────────────────────────────────────────────
// Delete a drawing by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Drawing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Drawing not found' });
    res.json({ success: true, message: 'Drawing deleted' });
  } catch (err) {
    console.error('Error deleting drawing:', err);
    res.status(500).json({ error: 'Failed to delete drawing' });
  }
});

module.exports = router;
