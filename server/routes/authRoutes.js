const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

router.post('/auth/signup', authController.signUp);
router.post('/auth/login', authController.signIn);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authenticateUser, authController.signOut);
router.get('/auth/me', authenticateUser, authController.getMe);

module.exports = router;
