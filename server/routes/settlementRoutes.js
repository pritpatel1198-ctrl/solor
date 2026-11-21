const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const { authenticateUser } = require('../middleware/auth');

router.get('/', authenticateUser, settlementController.getSettlementReport);
router.get('/html', authenticateUser, settlementController.getSettlementHtml);
router.post('/calculate', authenticateUser, settlementController.calculateCustomSeries);

module.exports = router;
