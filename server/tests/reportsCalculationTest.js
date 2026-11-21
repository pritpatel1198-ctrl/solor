const { getReports } = require('../services/analyticsService');
const { DEMO_USER_ID, inMemoryStore } = require('../config/supabase');

console.log('================================================================');
console.log('RUNNING FINANCIAL & PERFORMANCE REPORTS VERIFICATION TESTS');
console.log('================================================================\n');

let failedTests = 0;

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

function assertTrue(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failedTests++;
  }
}

async function runTests() {
  try {
    // -------------------------------------------------------------
    // Test 1: Empty Date Range - Strict Empty Handling (No Fallback)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Empty Period Handling ---');
    const emptyReport = await getReports(DEMO_USER_ID, {
      period: 'custom',
      startDate: '2020-01-01',
      endDate: '2020-01-31'
    });

    assertEqual(emptyReport.summary.total_generated, 0, 'Test 1: Empty period total_generated must be 0');
    assertEqual(emptyReport.summary.total_consumed, 0, 'Test 1: Empty period total_consumed must be 0');
    assertEqual(emptyReport.summary.total_revenue, 0, 'Test 1: Empty period total_revenue must be 0');
    assertEqual(emptyReport.summary.total_expense, 0, 'Test 1: Empty period total_expense must be 0');
    assertEqual(emptyReport.summary.net_profit, 0, 'Test 1: Empty period net_profit must be 0');
    assertEqual(emptyReport.summary.entry_count, 0, 'Test 1: Empty period entry_count must be 0');
    assertEqual(emptyReport.entries.length, 0, 'Test 1: Empty period entries array must be empty');
    assertEqual(emptyReport.grouped.length, 0, 'Test 1: Empty period grouped array must be empty');

    // -------------------------------------------------------------
    // Test 2: Custom Date Range with Existing Data
    // Local store has August 2026 entries (2026-08-04 to 2026-08-08)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Filtered Date Range with August 2026 Data ---');
    const augReport = await getReports(DEMO_USER_ID, {
      period: 'custom',
      startDate: '2026-08-04',
      endDate: '2026-08-08'
    });

    assertTrue(augReport.summary.entry_count > 0, 'Test 2: Must return entries for August 2026');
    assertTrue(augReport.summary.total_generated > 0, 'Test 2: Total generation must be positive');
    assertTrue(augReport.summary.total_consumed > 0, 'Test 2: Total consumption must be positive');
    assertEqual(
      augReport.summary.net_profit,
      parseFloat((augReport.summary.total_revenue - augReport.summary.total_expense).toFixed(2)),
      'Test 2: Net profit must strictly equal total_revenue - total_expense'
    );
    assertEqual(
      augReport.entries.length,
      augReport.summary.entry_count,
      'Test 2: Detailed entries array length must equal summary.entry_count'
    );

    // -------------------------------------------------------------
    // Test 3: Status Filtering ('profit' only)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Status Filter (profit only) ---');
    const profitReport = await getReports(DEMO_USER_ID, {
      period: 'custom',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'profit'
    });

    profitReport.entries.forEach(e => {
      assertEqual(e.status, 'profit', `Test 3: Entry ${e.entry_date} status must be profit`);
      assertTrue(e.net_units > 0, `Test 3: Entry ${e.entry_date} net_units must be positive`);
      assertTrue(e.revenue > 0, `Test 3: Entry ${e.entry_date} revenue must be positive`);
      assertEqual(e.expense, 0, `Test 3: Entry ${e.entry_date} expense must be 0 for profit entry`);
    });

    // -------------------------------------------------------------
    // Test 4: Status Filtering ('loss' only)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Status Filter (loss only) ---');
    const lossReport = await getReports(DEMO_USER_ID, {
      period: 'custom',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'loss'
    });

    lossReport.entries.forEach(e => {
      assertEqual(e.status, 'loss', `Test 4: Entry ${e.entry_date} status must be loss`);
      assertTrue(e.net_units < 0, `Test 4: Entry ${e.entry_date} net_units must be negative`);
      assertEqual(e.revenue, 0, `Test 4: Entry ${e.entry_date} revenue must be 0 for loss entry`);
      assertTrue(e.expense > 0, `Test 4: Entry ${e.entry_date} expense must be positive for loss entry`);
    });

    // -------------------------------------------------------------
    // Test 5: Mathematical Integrity & Aggregates
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Mathematical Integrity & Precision ---');
    const allReport = await getReports(DEMO_USER_ID, { period: 'lifetime' });

    let manualGen = 0;
    let manualCon = 0;
    let manualRev = 0;
    let manualExp = 0;
    let manualExport = 0;
    let manualImport = 0;

    allReport.entries.forEach(e => {
      manualGen += e.generated_units;
      manualCon += e.consumed_units;
      manualRev += e.revenue;
      manualExp += e.expense;
      manualExport += e.export_units;
      manualImport += e.import_units;
    });

    assertEqual(allReport.summary.total_generated, parseFloat(manualGen.toFixed(2)), 'Test 5: Summary total_generated matches entries sum');
    assertEqual(allReport.summary.total_consumed, parseFloat(manualCon.toFixed(2)), 'Test 5: Summary total_consumed matches entries sum');
    assertEqual(allReport.summary.total_revenue, parseFloat(manualRev.toFixed(2)), 'Test 5: Summary total_revenue matches entries sum');
    assertEqual(allReport.summary.total_expense, parseFloat(manualExp.toFixed(2)), 'Test 5: Summary total_expense matches entries sum');
    assertEqual(allReport.summary.total_export_units, parseFloat(manualExport.toFixed(2)), 'Test 5: Summary total_export_units matches entries sum');
    assertEqual(allReport.summary.total_import_units, parseFloat(manualImport.toFixed(2)), 'Test 5: Summary total_import_units matches entries sum');

    // -------------------------------------------------------------
    // Test 6: Performance Ratios Calculation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Performance Ratios ---');
    const expectedCoverage = allReport.summary.total_consumed > 0
      ? parseFloat(((allReport.summary.total_generated / allReport.summary.total_consumed) * 100).toFixed(2))
      : 100;
    assertEqual(allReport.summary.solar_coverage_ratio, expectedCoverage, 'Test 6: Solar coverage ratio calculated correctly');

    const expectedExportRatio = allReport.summary.total_generated > 0
      ? parseFloat(((allReport.summary.total_export_units / allReport.summary.total_generated) * 100).toFixed(2))
      : 0;
    assertEqual(allReport.summary.solar_export_ratio, expectedExportRatio, 'Test 6: Solar export ratio calculated correctly');

    // Summary results
    console.log('\n================================================================');
    if (failedTests === 0) {
      console.log('ALL FINANCIAL & PERFORMANCE REPORT TESTS PASSED! (0 Failures)');
    } else {
      console.error(`TESTS FAILED: ${failedTests} failure(s) detected.`);
      process.exit(1);
    }
    console.log('================================================================');
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runTests();
