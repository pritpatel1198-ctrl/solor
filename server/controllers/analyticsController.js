const analyticsService = require('../services/analyticsService');
const pdfTemplateService = require('../services/pdfTemplateService');

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
    const {
      period = 'monthly',
      startDate,
      endDate,
      status = 'all',
      financialYear,
      search = '',
      groupBy
    } = req.query;

    const reportData = await analyticsService.getReports(req.user.id, {
      period,
      startDate,
      endDate,
      status,
      financialYear,
      search,
      groupBy
    });

    res.json({ success: true, data: reportData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getReportHtml(req, res) {
  try {
    const {
      period = 'monthly',
      startDate,
      endDate,
      status = 'all',
      financialYear,
      search = '',
      groupBy,
      currency = '₹'
    } = req.query;

    const reportData = await analyticsService.getReports(req.user.id, {
      period,
      startDate,
      endDate,
      status,
      financialYear,
      search,
      groupBy
    });

    const html = pdfTemplateService.generateFinancialReportHtml(
      reportData,
      req.user?.email || 'consumer@solar.com',
      currency
    );

    const safeLabel = (reportData.label || 'Financial_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Financial_Report_${safeLabel}.pdf`;

    res.json({
      success: true,
      data: {
        html,
        filename,
        summary: reportData.summary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDashboard,
  getReports,
  getReportHtml
};
