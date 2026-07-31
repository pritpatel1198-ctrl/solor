const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/reports', analyticsController.getReports);
router.get('/analytics', analyticsController.getAnalytics);

module.exports = router;
