const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateUser } = require('../middleware/auth');

router.get('/', authenticateUser, billController.listBills);
router.post('/', authenticateUser, billController.createBill);
router.delete('/:id', authenticateUser, billController.deleteBill);

module.exports = router;
