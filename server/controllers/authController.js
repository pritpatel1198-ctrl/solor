const authService = require('../services/authService');

async function signUp(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.signUp(email, password);
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: result
    });
  } catch (err) {
    res.status(err.status || 400).json({
      success: false,
      error: err.message
    });
  }
}

async function signIn(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.signIn(email, password);
    res.json({
      success: true,
      message: 'Sign in successful.',
      data: result
    });
  } catch (err) {
    res.status(err.status || 401).json({
      success: false,
      error: err.message
    });
  }
}

async function refresh(req, res) {
  try {
    const result = await authService.refreshSession(req.body && req.body.refresh_token);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 401).json({ success: false, error: err.message });
  }
}

async function signOut(req, res) {
  try {
    const header = req.headers.authorization || '';
    await authService.signOut(header.startsWith('Bearer ') ? header.slice(7).trim() : '');
    res.json({ success: true, message: 'Signed out.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: 'Could not sign out on the server.' });
  }
}

async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signUp,
  signIn,
  refresh,
  signOut,
  getMe
};
