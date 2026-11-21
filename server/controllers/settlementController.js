const settlementService = require('../services/settlementService');
const pdfTemplateService = require('../services/pdfTemplateService');
const { nowInAppTz } = require('../utils/dates');

async function getSettlementReport(req, res) {
  try {
    const report = await settlementService.getMonthlySettlementReport(req.user.id, req.query);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getSettlementHtml(req, res) {
  try {
    const report = await settlementService.getMonthlySettlementReport(req.user.id, req.query);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = nowInAppTz();
    const month = parseInt(req.query.month || now.getMonth() + 1, 10);
    const year = parseInt(req.query.year || now.getFullYear(), 10);
    const monthName = monthNames[month - 1] || 'Month';
    const currency = req.query.currency || '₹';

    const html = pdfTemplateService.generateSettlementReportHtml(
      report,
      req.user?.email || 'consumer@solar.com',
      currency,
      monthName,
      year
    );

    const monthPadded = String(month).padStart(2, '0');
    const filename = `Monthly_Settlement_${year}-${monthPadded}.pdf`;

    res.json({
      success: true,
      data: {
        html,
        filename,
        summary: report.summary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function calculateCustomSeries(req, res) {
  try {
    const { readings, rate } = req.body;
    if (!Array.isArray(readings)) {
      return res.status(400).json({ success: false, error: 'Readings array is required' });
    }
    const report = settlementService.calculateCustomSettlementSeries(readings, rate || 2.50);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getSettlementReport,
  getSettlementHtml,
  calculateCustomSeries
};
