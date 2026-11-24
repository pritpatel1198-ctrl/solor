const {
  supabase,
  createAuthClient,
  dbClient,
  isDemo,
  DEMO_USER_ID,
  HttpError,
  isNetworkOrServerError,
  reportSupabaseError
} = require('../config/supabase');

function validateCredentials(email, password) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters long.');
  }
}

// Demo mode only (no Supabase configured): local development login.
function demoSession(email) {
  return {
    user: { id: DEMO_USER_ID, email },
    session: { access_token: 'demo-token-' + Date.now() }
  };
}

function authServiceUnavailable(err) {
  reportSupabaseError(err);
  return new HttpError(503, 'Authentication service is temporarily unavailable. Please try again.');
}

async function signIn(email, password) {
  validateCredentials(email, password);
  if (isDemo || !supabase) return demoSession(email);

  let result;
  try {
    result = await createAuthClient().auth.signInWithPassword({ email, password });
  } catch (err) {
    throw authServiceUnavailable(err);
  }

  const { data, error } = result;
  if (error) {
    if (isNetworkOrServerError(error)) throw authServiceUnavailable(error);
    throw new HttpError(401, error.message || 'Authentication failed.');
  }
  return data;
}

/**
 * Exchange a refresh token for a new session. Supabase rotates refresh tokens,
 * so the caller must store the new one from the response.
 */
async function refreshSession(refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new HttpError(400, 'Refresh token is required.');
  }
  if (isDemo || !supabase) throw new HttpError(400, 'Session refresh is not available in demo mode.');

  let result;
  try {
    result = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken });
  } catch (err) {
    throw authServiceUnavailable(err);
  }

  const { data, error } = result;
  if (error) {
    // A temporary outage must not look like an expired login
    if (isNetworkOrServerError(error) || !error.status || error.status >= 500) throw authServiceUnavailable(error);
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  if (!data || !data.session) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  return { user: data.user, session: data.session };
}

// Revoke this device's session so its refresh token can't be used after sign-out
async function signOut(accessToken) {
  if (isDemo || !dbClient || !accessToken) return;
  const { error } = await dbClient.auth.admin.signOut(accessToken, 'local');
  if (error) console.warn('[Auth] Could not revoke session:', error.message);
}

module.exports = {
  signIn,
  refreshSession,
  signOut
};
