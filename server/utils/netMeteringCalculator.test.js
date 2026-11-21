/**
 * ====================================================================================
 * UNIT TEST SUITE FOR GUJARAT SOLAR NET METERING BILL CALCULATOR
 * ====================================================================================
 */

const assert = require('assert');
const { calculateNetMeteringBill, round2Decimals } = require('./netMeteringCalculator');

let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`\x1b[31m✖ FAIL:\x1b[0m ${description}`);
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

console.log('\n===============================================================');
console.log(' RUNNING GUJARAT SOLAR NET METERING BILL CALCULATOR TEST SUITE ');
console.log('===============================================================\n');

// 1. Normal Billing Scenario: Import > Export
test('Import > Export scenario calculates Net Units, Energy Charge, and Total Bill correctly', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 1000,
    currentImportReading: 1500,  // Import = 500 units
    previousExportReading: 2000,
    currentExportReading: 2300,  // Export = 300 units
    tariffRate: 5.25,            // ₹5.25 / unit
    fixedCharges: 150,           // ₹150
    fuelAdjustmentCharges: 100,  // FPPPA = ₹100
    electricityDuty: 50,         // ₹50
    meterCharges: 25,            // ₹25
    otherCharges: 10,            // ₹10
    subsidy: 35,                 // ₹35
    solarGeneration: 450         // Solar Gen = 450 units
  });

  // Import = 500, Export = 300
  assert.strictEqual(result.importUnits, 500);
  assert.strictEqual(result.exportUnits, 300);
  assert.strictEqual(result.netUnits, 200); // 500 - 300 = 200
  assert.strictEqual(result.surplusExportUnits, 0);

  // Self Consumption = Solar Generation (450) - Export Units (300) = 150
  assert.strictEqual(result.selfConsumption, 150);

  // Energy Charge = 200 * 5.25 = 1050
  assert.strictEqual(result.energyCharge, 1050);

  // Subtotal = 1050 + 150 + 100 + 50 + 25 + 10 = 1385
  // Final Bill = 1385 - 35 = 1350
  assert.strictEqual(result.totalBillAmount, 1350);
});

// 2. Surplus Export Scenario: Export > Import
test('Export > Import scenario stores Surplus Units as Export Credit & sets Energy Charge to ₹0', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 1000,
    currentImportReading: 1200,  // Import = 200 units
    previousExportReading: 2000,
    currentExportReading: 2600,  // Export = 600 units
    tariffRate: 4.50,
    fixedCharges: 100,
    fuelAdjustmentCharges: 40,
    electricityDuty: 15,
    meterCharges: 20,
    otherCharges: 0,
    subsidy: 0,
    solarGeneration: 750
  });

  assert.strictEqual(result.importUnits, 200);
  assert.strictEqual(result.exportUnits, 600);
  assert.strictEqual(result.netUnits, 0);
  assert.strictEqual(result.surplusExportUnits, 400); // 600 - 200 = 400 credit units
  assert.strictEqual(result.energyCharge, 0);

  // Self Consumption = 750 - 600 = 150
  assert.strictEqual(result.selfConsumption, 150);

  // Total Bill = 0 (Energy Charge) + 100 + 40 + 15 + 20 + 0 - 0 = 175
  assert.strictEqual(result.totalBillAmount, 175);
});

// 3. Equal Import and Export Scenario
test('Equal Import and Export yields 0 Net Units and 0 Surplus Export Units', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 500,
    currentImportReading: 800,   // Import = 300
    previousExportReading: 100,
    currentExportReading: 400,   // Export = 300
    tariffRate: 5.0,
    fixedCharges: 50
  });

  assert.strictEqual(result.importUnits, 300);
  assert.strictEqual(result.exportUnits, 300);
  assert.strictEqual(result.netUnits, 0);
  assert.strictEqual(result.surplusExportUnits, 0);
  assert.strictEqual(result.energyCharge, 0);
  assert.strictEqual(result.totalBillAmount, 50);
});

// 4. Zero Consumption & Zero Export
test('Zero consumption and zero export handled cleanly', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 1200,
    currentImportReading: 1200,  // Import = 0
    previousExportReading: 500,
    currentExportReading: 500,   // Export = 0
    tariffRate: 6.0,
    fixedCharges: 75
  });

  assert.strictEqual(result.importUnits, 0);
  assert.strictEqual(result.exportUnits, 0);
  assert.strictEqual(result.netUnits, 0);
  assert.strictEqual(result.surplusExportUnits, 0);
  assert.strictEqual(result.energyCharge, 0);
  assert.strictEqual(result.totalBillAmount, 75);
});

// 5. Decimal Meter Readings and Floating Point Precision
test('Decimal meter readings rounded precisely without IEEE 754 float artifacts', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 100.15,
    currentImportReading: 250.45,  // Import = 150.30
    previousExportReading: 50.10,
    currentExportReading: 120.25,  // Export = 70.15
    tariffRate: 4.33
  });

  assert.strictEqual(result.importUnits, 150.3);
  assert.strictEqual(result.exportUnits, 70.15);
  assert.strictEqual(result.netUnits, 80.15); // 150.3 - 70.15 = 80.15
  assert.strictEqual(result.energyCharge, 347.05); // 80.15 * 4.33 = 347.0495 -> 347.05
  assert.strictEqual(result.totalBillAmount, 347.05);
});

// 6. Meter Reset / Rollover Case Handling
test('Meter rollover handling calculates correct delta when current reading is smaller than previous', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 99950,
    currentImportReading: 30,    // Rollover past 99999 threshold -> (99999 - 99950) + 30 + 1 = 80 units
    previousExportReading: 100,
    currentExportReading: 120,   // Export = 20 units
    tariffRate: 5.0,
    maxMeterReading: 99999
  });

  assert.strictEqual(result.importUnits, 80);
  assert.strictEqual(result.exportUnits, 20);
  assert.strictEqual(result.netUnits, 60);
  assert.strictEqual(result.energyCharge, 300);
});

test('Physical meter reset handling when isMeterReset flag is true', () => {
  const result = calculateNetMeteringBill({
    previousImportReading: 4500,
    currentImportReading: 120,   // New import meter installed starting from 0 -> 120 units
    previousExportReading: 3200,
    currentExportReading: 250,   // New export meter installed starting from 0 -> 250 units
    tariffRate: 5.0,
    isMeterReset: true
  });

  assert.strictEqual(result.importUnits, 120);
  assert.strictEqual(result.exportUnits, 250);
  assert.strictEqual(result.surplusExportUnits, 130);
});


// 7. Edge Cases: Invalid & Missing Inputs Validation
test('Throws descriptive error on negative readings or rates', () => {
  assert.throws(() => {
    calculateNetMeteringBill({
      previousImportReading: -10,
      currentImportReading: 100,
      previousExportReading: 0,
      currentExportReading: 50,
      tariffRate: 5.0
    });
  }, /Import meter readings cannot be negative/);
});

test('Throws error when mandatory field is missing', () => {
  assert.throws(() => {
    calculateNetMeteringBill({
      previousImportReading: 100,
      currentImportReading: 200,
      previousExportReading: 50
      // missing currentExportReading & tariffRate
    });
  }, /'Current Export Reading' is mandatory/);
});

test('Throws error on non-numeric strings or NaN inputs', () => {
  assert.throws(() => {
    calculateNetMeteringBill({
      previousImportReading: 'abc',
      currentImportReading: 200,
      previousExportReading: 50,
      currentExportReading: 100,
      tariffRate: 5.0
    });
  }, /must be a valid numeric value/);
});

test('Throws error when current reading is smaller than previous without reset flag', () => {
  assert.throws(() => {
    calculateNetMeteringBill({
      previousImportReading: 500,
      currentImportReading: 200, // Invalid sequence
      previousExportReading: 100,
      currentExportReading: 150,
      tariffRate: 5.0
    });
  }, /Current Import Reading \(200\) is smaller than Previous Import Reading \(500\)/);
});

// Summary
console.log('\n---------------------------------------------------------------');
console.log(`TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('---------------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
