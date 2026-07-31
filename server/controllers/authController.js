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
    res.status(400).json({
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
    res.status(401).json({
      success: false,
      error: err.message
    });
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
  getMe
};
