const { calculateDailySettlementStep, calculateMonthlySettlementSeries } = require('../utils/settlementCalculator');

console.log('================================================================');
console.log('RUNNING SOLAR SETTLEMENT ENGINE VERIFICATION TESTS');
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

// -----------------------------------------------------------------
// Test 1: Daily Meter Reading Difference (Prompt Section 1)
// 28/07/2026: Import = 5408, Export = 15128
// 01/08/2026: Import = 5449, Export = 15173
// Import Diff = 41, Export Diff = 45 => Gross Surplus = +4
// -----------------------------------------------------------------
const test1 = calculateDailySettlementStep({
  date: '01/08/2026',
  openingImportMeter: 5408,
  closingImportMeter: 5449,
  openingExportMeter: 15128,
  closingExportMeter: 15173,
  openingBalance: 0,
  rate: 2.50
});

assertEqual(test1.daily_import_units, 41, 'Test 1: Daily Import Units should be 41');
assertEqual(test1.daily_export_units, 45, 'Test 1: Daily Export Units should be 45');
assertEqual(test1.gross_difference, 4, 'Test 1: Gross Difference should be +4');
assertEqual(test1.closing_settlement_balance, 4, 'Test 1: Closing Settlement Balance should be +4');
assertEqual(test1.settlement_status, 'Govt Credit', 'Test 1: Settlement Status should be Govt Credit');
assertEqual(test1.settlement_amount_rs, 10.00, 'Test 1: Monetary Settlement Amount should be 10.00 (4 * 2.50)');

// -----------------------------------------------------------------
// Test 2: Import Excess with Existing Credit Adjustment (Prompt Section 4)
// Previous Govt Credit = 4 Units
// Current Day: Import = 10, Export = 5 => Gross Diff = -5
// Expected: Previous Credit Used = 4, Current Import Excess = 5, Remaining Govt Payable = 1 (Closing Balance = -1)
// -----------------------------------------------------------------
const test2 = calculateDailySettlementStep({
  date: '03/08/2026',
  dailyImportUnits: 10,
  dailyExportUnits: 5,
  openingBalance: 4,
  rate: 2.50
});

assertEqual(test2.opening_settlement_balance, 4, 'Test 2: Opening Balance should be +4');
assertEqual(test2.govt_credit_used, 4, 'Test 2: Govt Credit Used should be 4');
assertEqual(test2.govt_payable, 1, 'Test 2: Govt Payable should be 1');
assertEqual(test2.closing_settlement_balance, -1, 'Test 2: Closing Settlement Balance should be -1');
assertEqual(test2.settlement_status, 'Govt Payable', 'Test 2: Status should be Govt Payable');
assertEqual(test2.settlement_amount_rs, 2.50, 'Test 2: Amount should be ₹2.50 (1 * 2.50)');

// -----------------------------------------------------------------
// -----------------------------------------------------------------
// Test 3: Series Settlement Carry-Forward
// Date 01/08/26: Import 41, Export 45, Opening 0 => Gross +4 => Closing +4
// Date 02/08/26: Import 10, Export 15, Opening +4 => Gross +5 => Closing +9
// Date 03/08/26: Import 12, Export 8, Opening +9 => Gross -4 => Credit Used 4 => Closing +5
// Date 04/08/26: Import 5, Export 10, Opening +5 => Gross +5 => Closing +10
// -----------------------------------------------------------------
const sampleSeries = [
  { date: '01/08/2026', daily_import_units: 41, daily_export_units: 45 },
  { date: '02/08/2026', daily_import_units: 10, daily_export_units: 15 },
  { date: '03/08/2026', daily_import_units: 12, daily_export_units: 8 },
  { date: '04/08/2026', daily_import_units: 5, daily_export_units: 10 }
];

const seriesResult = calculateMonthlySettlementSeries(sampleSeries, { initialOpeningBalance: 0, rate: 2.50 });

console.log('\n--- Settlement Series Calculation Output ---');
seriesResult.history.forEach(h => {
  console.log(`Date: ${h.date} | Import: ${h.daily_import_units} | Export: ${h.daily_export_units} | Open: ${h.opening_settlement_balance} | Gross: ${h.gross_difference} | PrevAdj: ${h.previous_balance_adjusted} | Close: ${h.closing_settlement_balance} | ${h.result_summary}`);
});

assertEqual(seriesResult.history[0].closing_settlement_balance, 4, 'Series Row 1: Closing balance should be +4');
assertEqual(seriesResult.history[1].closing_settlement_balance, 9, 'Series Row 2: Closing balance should be +9');
assertEqual(seriesResult.history[2].govt_credit_used, 4, 'Series Row 3: Govt Credit Used should be 4 units');
assertEqual(seriesResult.history[2].closing_settlement_balance, 5, 'Series Row 3: Closing balance should be +5');
assertEqual(seriesResult.history[3].closing_settlement_balance, 10, 'Series Row 4: Closing balance should be +10');
assertEqual(seriesResult.history[3].settlement_status, 'Govt Credit', 'Series Row 4: Status should be Govt Credit');
assertEqual(seriesResult.history[3].settlement_amount_rs, 25.00, 'Series Row 4: Amount should be ₹25.00 (10 * 2.50)');

// -----------------------------------------------------------------
// Test 4: User Bug Scenario (28/07/2026 to 31/07/2026)
// Prev Adj on 28/07 = +2, 29/07 Open Bal = +2, Gross Diff = +2
// Prev Adj on 29/07 should be +2 (positive adjustment/carried forward), NOT -2!
// Closing Bal on 29/07 = +4, 30/07 = +6, 31/07 = +8
// -----------------------------------------------------------------
const userBugSeries = [
  { date: '28/07/2026', daily_import_units: 7, daily_export_units: 9 }, // Gross +2, Open 0 => Close +2
  { date: '29/07/2026', daily_import_units: 7, daily_export_units: 9 }, // Gross +2, Open +2 => Close +4
  { date: '30/07/2026', daily_import_units: 7, daily_export_units: 9 }, // Gross +2, Open +4 => Close +6
  { date: '31/07/2026', daily_import_units: 8, daily_export_units: 10 } // Gross +2, Open +6 => Close +8
];

const userResult = calculateMonthlySettlementSeries(userBugSeries, { initialOpeningBalance: 0, rate: 2.50 });
assertEqual(userResult.history[0].previous_balance_adjusted, 2, 'User Test Row 1 (28/07): Prev Adj should be +2');
assertEqual(userResult.history[0].closing_settlement_balance, 2, 'User Test Row 1 (28/07): Closing Bal should be +2');

assertEqual(userResult.history[1].opening_settlement_balance, 2, 'User Test Row 2 (29/07): Open Bal should be +2');
assertEqual(userResult.history[1].previous_balance_adjusted, 2, 'User Test Row 2 (29/07): Prev Adj should be +2 (NOT -2!)');
assertEqual(userResult.history[1].closing_settlement_balance, 4, 'User Test Row 2 (29/07): Closing Bal should be +4');

assertEqual(userResult.history[2].opening_settlement_balance, 4, 'User Test Row 3 (30/07): Open Bal should be +4');
assertEqual(userResult.history[2].closing_settlement_balance, 6, 'User Test Row 3 (30/07): Closing Bal should be +6');

assertEqual(userResult.history[3].opening_settlement_balance, 6, 'User Test Row 4 (31/07): Open Bal should be +6');
assertEqual(userResult.history[3].closing_settlement_balance, 8, 'User Test Row 4 (31/07): Closing Bal should be +8');

console.log('\n================================================================');
if (failedTests === 0) {
  console.log('ALL SETTLEMENT TESTS PASSED SUCCESSFULLY! (0 Failures)');
} else {
  console.error(`SETTLEMENT TESTS FAILED WITH ${failedTests} FAILURE(S)`);
  process.exit(1);
}
console.log('================================================================\n');
