/**
 * ====================================================================================
 * GUJARAT SOLAR NET METERING BILL CALCULATION ENGINE
 * DISCOM Policy Compatibility: MGVCL / UGVCL / DGVCL / PGVCL (GERC Guidelines)
 * ====================================================================================
 * 
 * Business Logic Overview:
 * 1. Calculates Import Units and Export Units from meter readings.
 * 2. Computes Self Consumption (if Solar Generation is provided).
 * 3. Applies Gujarat Net Metering Settlement Rules:
 *    - If Import Units > Export Units:
 *        Net Units = Import Units - Export Units
 *        Energy Charge = Net Units * Tariff Rate
 *    - If Export Units > Import Units:
 *        Surplus Export Units = Export Units - Import Units
 *        Net Units = 0
 *        Energy Charge = ₹0
 *        (Surplus Units are carried forward as Export Credit as per Gujarat Net Metering Policy)
 *    - If Import Units == Export Units:
 *        Net Units = 0, Surplus Units = 0, Energy Charge = ₹0
 * 4. Applies Final Bill Formula:
 *    Final Bill = Energy Charge + Fixed Charges + Fuel Adjustment Charges (FPPPA)
 *               + Electricity Duty + Meter Charges + Other Charges - Subsidy
 * 5. Complete edge case handling: negative readings, meter rollover/reset,
 *    missing values, decimal precision, zero consumption/export.
 */

/**
 * Utility helper to round numbers to 2 decimal places to avoid floating point precision issues.
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
function round2Decimals(num) {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validates and converts input value to a safe float.
 * @param {any} value - The input value to sanitize
 * @param {string} fieldName - Name of the field for descriptive error messaging
 * @param {boolean} isRequired - Whether the field must be provided and valid
 * @param {number} defaultValue - Default fallback value if optional field is omitted
 * @returns {number} Sanitized float number
 */
function sanitizeFloat(value, fieldName, isRequired = false, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    if (isRequired) {
      throw new Error(`Invalid Input: '${fieldName}' is mandatory and cannot be empty.`);
    }
    return defaultValue;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    throw new Error(`Invalid Input: '${fieldName}' must be a valid numeric value. Received: ${value}`);
  }

  return parsed;
}

/**
 * Main Calculation Logic for Gujarat Solar Net Metering Bill
 * 
 * @param {Object} inputs - Input parameters object
 * @param {number} inputs.previousImportReading - Previous Import Meter Reading (kWh)
 * @param {number} inputs.currentImportReading  - Current Import Meter Reading (kWh)
 * @param {number} inputs.previousExportReading - Previous Export Meter Reading (kWh)
 * @param {number} inputs.currentExportReading  - Current Export Meter Reading (kWh)
 * @param {number} inputs.tariffRate            - Tariff Rate per unit (₹/Unit)
 * @param {number} [inputs.fixedCharges=0]       - Fixed Charges (₹)
 * @param {number} [inputs.fuelAdjustmentCharges=0] - Fuel Adjustment Charges / FPPPA (₹)
 * @param {number} [inputs.electricityDuty=0]    - Electricity Duty (₹)
 * @param {number} [inputs.meterCharges=0]        - Meter Rent / Charges (₹)
 * @param {number} [inputs.otherCharges=0]        - Other miscellaneous charges (₹)
 * @param {number} [inputs.subsidy=0]             - Government / DISCOM Subsidy (₹)
 * @param {number} [inputs.solarGeneration]      - Total Solar Generation Units (kWh, optional)
 * @param {boolean} [inputs.isMeterReset=false]  - Flag indicating physical meter replacement/reset
 * @param {number} [inputs.maxMeterReading]      - Meter rollover threshold (e.g., 99999 or 999999)
 * 
 * @returns {Object} Structured net metering bill calculation result
 */
function calculateNetMeteringBill(inputs = {}) {
  // ====================================================================================
  // STEP 1: INPUT SANITIZATION & EDGE CASE VALIDATION
  // ====================================================================================

  // 1.1 Parse mandatory meter readings and tariff rate
  const previousImportReading = sanitizeFloat(inputs.previousImportReading, 'Previous Import Reading', true);
  const currentImportReading = sanitizeFloat(inputs.currentImportReading, 'Current Import Reading', true);
  const previousExportReading = sanitizeFloat(inputs.previousExportReading, 'Previous Export Reading', true);
  const currentExportReading = sanitizeFloat(inputs.currentExportReading, 'Current Export Reading', true);
  const tariffRate = sanitizeFloat(inputs.tariffRate, 'Tariff Rate', true);

  // 1.2 Parse optional financial charges and solar generation
  const fixedCharges = sanitizeFloat(inputs.fixedCharges, 'Fixed Charges', false, 0);
  const fuelAdjustmentCharges = sanitizeFloat(inputs.fuelAdjustmentCharges, 'Fuel Adjustment Charges (FPPPA)', false, 0);
  const electricityDuty = sanitizeFloat(inputs.electricityDuty, 'Electricity Duty', false, 0);
  const meterCharges = sanitizeFloat(inputs.meterCharges, 'Meter Charges', false, 0);
  const otherCharges = sanitizeFloat(inputs.otherCharges, 'Other Charges', false, 0);
  const subsidy = sanitizeFloat(inputs.subsidy, 'Subsidy', false, 0);

  const hasSolarGen = inputs.solarGeneration !== undefined && inputs.solarGeneration !== null && inputs.solarGeneration !== '';
  const solarGeneration = hasSolarGen ? sanitizeFloat(inputs.solarGeneration, 'Solar Generation', false, 0) : null;

  // 1.3 Validate non-negative numbers for readings and rates
  if (previousImportReading < 0 || currentImportReading < 0) {
    throw new Error('Edge Case Error: Import meter readings cannot be negative.');
  }
  if (previousExportReading < 0 || currentExportReading < 0) {
    throw new Error('Edge Case Error: Export meter readings cannot be negative.');
  }
  if (tariffRate < 0) {
    throw new Error('Edge Case Error: Tariff rate cannot be negative.');
  }
  if (fixedCharges < 0 || fuelAdjustmentCharges < 0 || electricityDuty < 0 || meterCharges < 0 || otherCharges < 0 || subsidy < 0) {
    throw new Error('Edge Case Error: Billing charges and subsidy cannot be negative.');
  }
  if (solarGeneration !== null && solarGeneration < 0) {
    throw new Error('Edge Case Error: Solar generation units cannot be negative.');
  }

  // ====================================================================================
  // STEP 2: CALCULATE IMPORT & EXPORT UNITS (WITH METER RESET / ROLLOVER HANDLING)
  // ====================================================================================

  let importUnits = 0;
  let exportUnits = 0;

  // 2.1 Calculate Import Units
  if (currentImportReading >= previousImportReading) {
    // Normal scenario: Current reading is greater than or equal to previous reading
    importUnits = currentImportReading - previousImportReading;
  } else {
    // Edge Case: Current reading is smaller than previous reading (Meter rollover or reset)
    if (inputs.isMeterReset) {
      // Physical meter reset to 0
      importUnits = currentImportReading;
    } else if (inputs.maxMeterReading && inputs.maxMeterReading > previousImportReading) {
      // Meter rollover (e.g. from 99999 to 00005)
      importUnits = (inputs.maxMeterReading - previousImportReading) + currentImportReading + 1;
    } else {
      throw new Error(
        `Invalid Readings: Current Import Reading (${currentImportReading}) is smaller than Previous Import Reading (${previousImportReading}). ` +
        `If the meter was reset or rolled over, set 'isMeterReset: true' or specify 'maxMeterReading'.`
      );
    }
  }

  // 2.2 Calculate Export Units
  if (currentExportReading >= previousExportReading) {
    // Normal scenario
    exportUnits = currentExportReading - previousExportReading;
  } else {
    // Edge Case: Export meter reset or rollover
    if (inputs.isMeterReset) {
      exportUnits = currentExportReading;
    } else if (inputs.maxMeterReading && inputs.maxMeterReading > previousExportReading) {
      exportUnits = (inputs.maxMeterReading - previousExportReading) + currentExportReading + 1;
    } else {
      throw new Error(
        `Invalid Readings: Current Export Reading (${currentExportReading}) is smaller than Previous Export Reading (${previousExportReading}). ` +
        `If the meter was reset or rolled over, set 'isMeterReset: true' or specify 'maxMeterReading'.`
      );
    }
  }

  // Round unit calculations to 2 decimal places to guarantee accuracy
  importUnits = round2Decimals(importUnits);
  exportUnits = round2Decimals(exportUnits);

  // 2.3 Calculate Self Consumption (if Solar Generation is available)
  // Self Consumption = Solar Generation - Export Units
  let selfConsumption = null;
  if (solarGeneration !== null) {
    // Self consumption cannot be negative (if solarGen < exportUnits due to sensor discrepancy, clamp to 0)
    selfConsumption = round2Decimals(Math.max(0, solarGeneration - exportUnits));
  }

  // ====================================================================================
  // STEP 3: GUJARAT NET METERING SETTLEMENT LOGIC (MGVCL/UGVCL/DGVCL/PGVCL)
  // ====================================================================================

  let netUnits = 0;
  let surplusExportUnits = 0;
  let energyCharge = 0;

  if (importUnits > exportUnits) {
    // Scenario 1: DISCOM Import is greater than Solar Export
    // Consumer consumed more power from grid than exported. Pay for net units.
    netUnits = round2Decimals(importUnits - exportUnits);
    surplusExportUnits = 0;
    energyCharge = round2Decimals(netUnits * tariffRate);
  } else if (exportUnits > importUnits) {
    // Scenario 2: Solar Export is greater than DISCOM Import
    // Consumer exported excess solar energy to grid. Energy charge is zero.
    // Surplus units are banked / stored as Export Credit per Gujarat Net Metering Policy.
    netUnits = 0;
    surplusExportUnits = round2Decimals(exportUnits - importUnits);
    energyCharge = 0;
  } else {
    // Scenario 3: Equal Import and Export (or zero consumption & zero export)
    netUnits = 0;
    surplusExportUnits = 0;
    energyCharge = 0;
  }

  // ====================================================================================
  // STEP 4: FINAL BILL AMOUNT CALCULATION
  // ====================================================================================

  // Final Bill = Energy Charge + Fixed Charges + Fuel Adjustment Charges (FPPPA)
  //              + Electricity Duty + Meter Charges + Other Charges - Subsidy
  const totalSubtotal = energyCharge + fixedCharges + fuelAdjustmentCharges + electricityDuty + meterCharges + otherCharges;
  const rawTotalBill = totalSubtotal - subsidy;

  // Clamp total bill amount to minimum 0 (prevent negative bill unless credit balances are formatted)
  const totalBillAmount = round2Decimals(Math.max(0, rawTotalBill));

  // ====================================================================================
  // STEP 5: RETURN DETAILED STRUCTURED OUTPUT
  // ====================================================================================

  return {
    importUnits,
    exportUnits,
    netUnits,
    surplusExportUnits,
    selfConsumption,
    energyCharge: round2Decimals(energyCharge),
    fixedCharges: round2Decimals(fixedCharges),
    fuelAdjustmentCharges: round2Decimals(fuelAdjustmentCharges),
    electricityDuty: round2Decimals(electricityDuty),
    meterCharges: round2Decimals(meterCharges),
    otherCharges: round2Decimals(otherCharges),
    subsidy: round2Decimals(subsidy),
    totalBillAmount
  };
}

module.exports = {
  calculateNetMeteringBill,
  round2Decimals
};
