const mongoose = require('mongoose');

/**
 * Drawing Schema
 * Stores air-drawn artwork as base64 PNG data alongside metadata.
 */
const drawingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Drawing',
      trim: true,
      maxlength: 100,
    },
    imageData: {
      type: String,  // base64-encoded PNG
      required: [true, 'Image data is required'],
    },
    color: {
      type: String,
      default: '#ffffff',
    },
    thickness: {
      type: Number,
      default: 4,
      min:1,
      max:50,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // we manage createdAt manually for explicit control
);

module.exports = mongoose.model('Drawing', drawingSchema);
