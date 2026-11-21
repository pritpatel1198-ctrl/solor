const { supabase, isDemo, DEMO_USER_ID, isNetworkOrServerError, reportSupabaseError } = require('../config/supabase');

/**
 * Require a valid Supabase access token.
 * Demo mode (no Supabase configured, local development only) maps every request to the demo user.
 */
async function authenticateUser(req, res, next) {
  if (isDemo || !supabase) {
    req.user = { id: DEMO_USER_ID, email: 'Prit@solar.com' };
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    const user = data && data.user;

    if (user && !error) {
      req.user = { id: user.id, email: user.email };
      return next();
    }

    if (error && isNetworkOrServerError(error)) {
      reportSupabaseError(error);
      return res.status(503).json({ success: false, error: 'Authentication service is temporarily unavailable. Please try again.' });
    }

    return res.status(401).json({ success: false, error: 'Your session has expired. Please sign in again.' });
  } catch (err) {
    reportSupabaseError(err);
    return res.status(503).json({ success: false, error: 'Authentication service is temporarily unavailable. Please try again.' });
  }
}

module.exports = { authenticateUser };
