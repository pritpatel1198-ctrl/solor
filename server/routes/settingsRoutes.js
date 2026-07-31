const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);
router.get('/backup/export', settingsController.exportBackup);
router.post('/backup/import', settingsController.importBackup);

module.exports = router;
