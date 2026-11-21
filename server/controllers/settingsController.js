const settingsService = require('../services/settingsService');

async function getSettings(req, res) {
  try {
    const settings = await settingsService.getSettings(req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

async function updateSettings(req, res) {
  try {
    const updated = await settingsService.updateSettings(req.user.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

async function exportBackup(req, res) {
  try {
    const backupData = await settingsService.exportUserData(req.user.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=solar_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backupData);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

async function importBackup(req, res) {
  try {
    const result = await settingsService.importUserData(req.user.id, req.body);
    res.json({ success: true, message: `Successfully restored ${result.importedCount} records.` });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  exportBackup,
  importBackup
};
