const { supabase, dbClient, isDemo, DEMO_USER_ID } = require('../config/supabase');

async function signUp(email, password) {
  if (!email || !email.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (supabase && !isDemo) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    
    // Ensure default settings record exists in PostgreSQL
    if (data.user) {
      try {
        await dbClient.from('user_settings').upsert({
          user_id: data.user.id,
          default_buying_rate: 2.00,
          default_selling_rate: 7.00,
          currency: '₹',
          theme: 'light'
        });
      } catch (err) {
        console.warn('Failed to auto-create settings record:', err.message);
      }
    }
    return data;
  }

  // Demo / Fallback Authentication
  return {
    user: { id: DEMO_USER_ID, email },
    session: { access_token: 'demo-token-' + Date.now() }
  };
}

async function signIn(email, password) {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (supabase && !isDemo) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || 'Invalid email or password. Please check your credentials.');
    }
    return data;
  }

  // Demo / Fallback Authentication Validation
  return {
    user: { id: DEMO_USER_ID, email },
    session: { access_token: 'demo-token-' + Date.now() }
  };
}

async function verifyToken(token) {
  if (!token) return null;
  if (token.startsWith('demo-token')) {
    return { id: DEMO_USER_ID, email: 'Prit@solar.com' };
  }

  if (supabase && !isDemo) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  }

  return { id: DEMO_USER_ID, email: 'Prit@solar.com' };
}

module.exports = {
  signUp,
  signIn,
  verifyToken
};
