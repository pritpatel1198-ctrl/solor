/**
 * Comprehensive Cross-Platform Verification Test Suite
 * Validates Financial Reports and Monthly Settlement Calculation across Web and Mobile.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING CROSS-PLATFORM (WEB & MOBILE) REPORT & SETTLEMENT TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Backend Service Verification
  const pdfTemplateService = require('../services/pdfTemplateService');
  const analyticsService = require('../services/analyticsService');
  const settlementService = require('../services/settlementService');

  test('Template Service: generateFinancialReportHtml returns full valid HTML', () => {
    const html = pdfTemplateService.generateFinancialReportHtml({
      summary: { total_generated: 100, total_consumed: 80, net_profit: 50, total_revenue: 100, total_expense: 50 },
      grouped: [{ period_label: 'Aug 2026', solar_generated: 100, grid_consumed: 80, net_profit: 50 }],
      entries: [{ entry_date: '2026-08-01', generated_units: 10, consumed_units: 8, revenue: 10, payable: 5 }]
    }, 'test@solar.com', '₹');
    assert(html.includes('SOLAR REVENUE TRACKER'), 'Must contain company header');
    assert(html.includes('EXECUTIVE FINANCIAL & PERFORMANCE AUDIT STATEMENT'), 'Must contain audit title');
    assert(html.includes('100.00 kWh'), 'Must contain formatted total generation');
    assert(html.includes('PERIOD-BY-PERIOD FINANCIAL BREAKDOWN'), 'Must contain grouped table');
  });

  test('Template Service: generateSettlementReportHtml returns full valid HTML', () => {
    const html = pdfTemplateService.generateSettlementReportHtml({
      summary: { month_closing_balance: 20, final_settlement_amount_rs: 45, final_status: 'Govt Credit', total_days: 8 },
      history: [{ date: '2026-08-01', daily_import_units: 5, daily_export_units: 10, gross_difference: 5, closing_settlement_balance: 5, settlement_amount_rs: 11.25, settlement_status: 'Govt Credit' }]
    }, 'test@solar.com', '₹', 'August', 2026);
    assert(html.includes('OFFICIAL MONTHLY NET METERING SETTLEMENT STATEMENT'), 'Must contain settlement title');
    assert(html.includes('GOVERNING REGULATORY RULES & METHODOLOGY'), 'Must contain GERC rules note');
    assert(html.includes('IMPORT METER (kWh)'), 'Must contain import meter header');
    assert(html.includes('EXPORT METER (kWh)'), 'Must contain export meter header');
  });

  // 2. HTTP Endpoint Verification
  await testAsync('API Endpoint: GET /api/reports/html returns valid HTML and filename', async () => {
    const res = await fetch((process.env.API_BASE || 'http://localhost:3000') + '/api/reports/html?period=monthly');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.data.html.length > 1000, 'HTML payload must be non-empty');
    assert(json.data.filename.endsWith('.pdf'), 'Filename must end with .pdf');
  });

  await testAsync('API Endpoint: GET /api/settlement/html returns valid HTML and filename', async () => {
    const res = await fetch((process.env.API_BASE || 'http://localhost:3000') + '/api/settlement/html?month=8&year=2026');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.data.html.length > 1000, 'HTML payload must be non-empty');
    assert(json.data.filename.includes('2026-08'), 'Filename must include year and month');
  });

  // 3. Mobile Code & Architecture Verification
  test('Mobile Client: client.ts has getReports with filters, getReportHtml, and getSettlementHtml', () => {
    const clientCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/api/client.ts'), 'utf8');
    assert(clientCode.includes('getReports(params?:'), 'getReports must accept parameters');
    assert(clientCode.includes('getReportHtml(params?: any)'), 'client must have getReportHtml');
    assert(clientCode.includes('getSettlementHtml(params?: any)'), 'client must have getSettlementHtml');
  });

  test('Mobile Utilities: reportPdf.ts and settlementPdf.ts use unified backend endpoints', () => {
    const reportPdfCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/utils/reportPdf.ts'), 'utf8');
    const settlePdfCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/utils/settlementPdf.ts'), 'utf8');
    assert(reportPdfCode.includes('api.getReportHtml'), 'reportPdf must call api.getReportHtml');
    assert(settlePdfCode.includes('api.getSettlementHtml'), 'settlementPdf must call api.getSettlementHtml');
    assert(reportPdfCode.includes('expo-print'), 'reportPdf must use expo-print');
    assert(settlePdfCode.includes('expo-sharing'), 'settlementPdf must use expo-sharing');
  });

  test('Mobile Screens: ReportsScreen.tsx includes Period, Status filters, and PDF export', () => {
    const reportsCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/screens/ReportsScreen.tsx'), 'utf8');
    assert(reportsCode.includes('REPORT_PERIODS'), 'Must have REPORT_PERIODS');
    assert(reportsCode.includes('STATUS_FILTERS'), 'Must have STATUS_FILTERS');
    assert(reportsCode.includes('generateAndShareFinancialReportPdf'), 'Must call financial PDF exporter');
    assert(reportsCode.includes('Export PDF'), 'Must have Export PDF button');
  });

  test('Mobile Screens: SettlementScreen.tsx includes Month/Year selector and PDF export', () => {
    const settleCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/screens/SettlementScreen.tsx'), 'utf8');
    assert(settleCode.includes('generateAndShareSettlementPdf'), 'Must call settlement PDF exporter');
    assert(settleCode.includes('handleExportPDF'), 'Must have handleExportPDF');
    assert(settleCode.includes('selectedMonth'), 'Must have selectedMonth state');
    assert(settleCode.includes('selectedYear'), 'Must have selectedYear state');
  });

  // 4. Web Code Verification
  test('Web App: reportsView.js and settlementView.js include PDF exporters and filter controls', () => {
    const webReports = fs.readFileSync(path.join(__dirname, '../../client/assets/js/views/reportsView.js'), 'utf8');
    const webSettle = fs.readFileSync(path.join(__dirname, '../../client/assets/js/views/settlementView.js'), 'utf8');
    assert(webReports.includes('export-cr-pdf-btn'), 'Web reports must have export PDF button');
    assert(webReports.includes('report-preset-pills'), 'Web reports must have period filter pills');
    assert(webSettle.includes('settlement-download-pdf'), 'Web settlement must have download PDF button');
    assert(webSettle.includes('settlement-month-select'), 'Web settlement must have month filter');
  });

  console.log('\n================================================================');
  console.log(`CROSS-PLATFORM TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
