const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const entryRoutes = require('./routes/entryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const billRoutes = require('./routes/billRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend client files
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Public endpoints (registered before routers that require authentication)
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

const { isSupabaseAvailable } = require('./config/supabase');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Solar Revenue Tracker API',
    database: isSupabaseAvailable() ? 'supabase_cloud' : 'local_storage',
    timestamp: new Date().toISOString()
  });
});

// API Routes
// Path-specific routers first: the '/api' routers below apply authentication to every
// request passing through them, so mounting these after them verified the token 3 times.
app.use('/api', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/bills', billRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', settingsRoutes);

// Single Page Application route fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Global Server Error:', err);
  res.status(status).json({
    success: false,
    // Don't leak internal error details for unexpected failures
    error: status >= 500 ? 'Internal Server Error' : (err.message || 'Bad Request')
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
