const analyticsService = require('../services/analyticsService');

async function getDashboard(req, res) {
  try {
    const summary = await analyticsService.getDashboardSummary(req.user.id);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getReports(req, res) {
  try {
    const period = req.query.period || 'monthly';
    const reportData = await analyticsService.getReports(req.user.id, period);
    res.json({ success: true, data: reportData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getAnalytics(req, res) {
  try {
    const analytics = await analyticsService.getAnalyticsData(req.user.id);
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDashboard,
  getReports,
  getAnalytics
};
