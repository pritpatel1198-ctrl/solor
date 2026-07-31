const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const entryRoutes = require('./routes/entryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend client files
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// API Routes
app.use('/api', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', settingsRoutes);

// Config endpoint exposing public Supabase config to client
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Solar Revenue Tracker API',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application route fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Solar Revenue Tracker Server running on port ${PORT}`);
  console.log(`Access Web App: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use by another process.`);
    console.error(`👉 Solution: Change PORT in your .env file (e.g. PORT=3001) or close the application running on port ${PORT}.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
