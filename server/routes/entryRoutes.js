const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.post('/', entryController.createEntry);
router.get('/', entryController.getEntries);
router.post('/bulk-delete', entryController.bulkDeleteEntries);
router.get('/:id', entryController.getEntryById);
router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);

module.exports = router;
