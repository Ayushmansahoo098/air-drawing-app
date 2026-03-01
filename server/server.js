require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;
const SHUTDOWN_GRACE_MS = 500;
let httpServer = null;
const allowedOrigins = (
  process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173']
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));

// Increase JSON body limit to handle base64 image data (up to 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/drawings', require('./routes/drawings'));
app.use('/api/scores', require('./routes/scores'));

// Local-only shutdown endpoint used by inactivity automation in the client.
app.post('/api/control/shutdown', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Disabled in production' });
  }

  const localIps = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const requesterIp = req.ip || req.socket?.remoteAddress;
  if (!localIps.has(requesterIp)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ success: true, message: 'Server shutdown scheduled' });
  setTimeout(async () => {
    try {
      if (httpServer) {
        await new Promise((resolve) => httpServer.close(resolve));
      }
      await mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      console.error('Shutdown failure:', err);
      process.exit(1);
    }
  }, SHUTDOWN_GRACE_MS);
});

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const payload = { error: 'Internal server error' };
  if (process.env.NODE_ENV !== 'production') {
    payload.message = err.message;
  }
  res.status(500).json(payload);
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/air-drawing';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    httpServer = app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
