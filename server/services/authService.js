const {
  supabase,
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

async function signUp(email, password) {
  validateCredentials(email, password);
  if (isDemo || !supabase) return demoSession(email);

  let result;
  try {
    result = await supabase.auth.signUp({ email, password });
  } catch (err) {
    throw authServiceUnavailable(err);
  }

  const { data, error } = result;
  if (error) {
    if (isNetworkOrServerError(error)) throw authServiceUnavailable(error);
    throw new HttpError(400, error.message);
  }

  if (data.user) {
    const { error: settingsError } = await dbClient.from('user_settings').upsert({
      user_id: data.user.id,
      default_buying_rate: 2.25,
      default_selling_rate: 2.25,
      currency: '₹',
      theme: 'light'
    });
    // Not fatal: settings are created on first GET /settings as well.
    if (settingsError) console.warn('[Auth] Could not create default settings:', settingsError.message);
  }
  return data;
}

async function signIn(email, password) {
  validateCredentials(email, password);
  if (isDemo || !supabase) return demoSession(email);

  let result;
  try {
    result = await supabase.auth.signInWithPassword({ email, password });
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

module.exports = {
  signUp,
  signIn
};
