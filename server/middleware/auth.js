const { supabase, isDemo, DEMO_USER_ID } = require('../config/supabase');

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (token === 'demo-token') {
      req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
      return next();
    }

    if (isDemo || !supabase) {
      req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
      return next();
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Fallback to demo user if token is invalid or expired
      req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
      return next();
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    console.error('Authentication Error:', err);
    req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
    next();
  }
}

module.exports = { authenticateUser };
