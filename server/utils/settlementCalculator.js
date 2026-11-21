/**
 * ====================================================================================
 * SOLAR IMPORT/EXPORT MONTHLY SETTLEMENT CALCULATOR
 * Day-by-Day Running Settlement System
 * ====================================================================================
 * 
 * Rules matching Section 1, 2, 3, 4, 5, 6, 7 & 8:
 * 1. Daily Import = Closing Import Meter - Opening Import Meter
 * 2. Daily Export = Closing Export Meter - Opening Export Meter
 * 3. Daily Gross Difference = Daily Export Units - Daily Import Units
 * 4. Running Balance & Adjustment:
 *    - Row 1 (01/08): Open 0, Gross +4 => Adjustment +4, Closing +4 (Govt Credit 4)
 *    - Row 2 (02/08): Open +4, Gross +5 => Previous 4 Credit Settled/Adjusted (-4), Closing +1 (1 New Credit)
 *    - Row 3 (03/08): Open +1, Gross -4 => Previous 1 Credit Used (-1), Closing -3 (3 Units Govt Payable)
 *    - Row 4 (04/08): Open -3, Gross +5 => Previous 3 Payable Cleared (+3), Closing +2 (2 Units Govt Credit)
 * 5. Rate Calculation: Settlement Amount (₹) = |Closing Balance| * Rate (Default ₹2.50/unit)
 */

function round2Decimals(num) {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates settlement step for a single day given opening settlement balance.
 */
function calculateDailySettlementStep({
  id = null,
  date,
  openingImportMeter = null,
  closingImportMeter = null,
  dailyImportUnits = null,
  openingExportMeter = null,
  closingExportMeter = null,
  dailyExportUnits = null,
  openingBalance = 0,
  rate = null,
  buyingRate = undefined,
  sellingRate = undefined
} = {}) {
  const buyRateVal = parseFloat(buyingRate !== undefined && buyingRate !== null ? buyingRate : (rate !== undefined && rate !== null && sellingRate === undefined ? rate : 2.25)) || 2.25;
  const sellRateVal = parseFloat(sellingRate !== undefined && sellingRate !== null ? sellingRate : (rate !== undefined && rate !== null && buyingRate === undefined ? rate : 2.25)) || 2.25;
  // Determine daily import units
  let importUnits = 0;
  if (dailyImportUnits !== null && dailyImportUnits !== undefined) {
    importUnits = parseFloat(dailyImportUnits) || 0;
  } else if (closingImportMeter !== null && openingImportMeter !== null) {
    importUnits = parseFloat(closingImportMeter) - parseFloat(openingImportMeter);
  }
  importUnits = round2Decimals(Math.max(0, importUnits));

  // Determine daily export units
  let exportUnits = 0;
  if (dailyExportUnits !== null && dailyExportUnits !== undefined) {
    exportUnits = parseFloat(dailyExportUnits) || 0;
  } else if (closingExportMeter !== null && openingExportMeter !== null) {
    exportUnits = parseFloat(closingExportMeter) - parseFloat(openingExportMeter);
  }
  exportUnits = round2Decimals(Math.max(0, exportUnits));

  const grossDifference = round2Decimals(exportUnits - importUnits);
  const openBal = round2Decimals(parseFloat(openingBalance) || 0);
  const rateVal = parseFloat(rate) || 2.50;

  let previousBalanceAdjusted = 0;
  let govtCreditGenerated = 0;
  let govtCreditUsed = 0;
  let govtPayable = 0;
  let closingBalance = 0;
  let settlementStatus = 'Balanced';
  let resultSummary = '';

  if (openBal === 0) {
    // Initial / Zero Opening Balance
    if (grossDifference >= 0) {
      previousBalanceAdjusted = grossDifference;
      govtCreditGenerated = grossDifference;
      govtCreditUsed = 0;
      govtPayable = 0;
      closingBalance = grossDifference;
      settlementStatus = closingBalance > 0 ? 'Govt Credit' : 'Balanced';
      resultSummary = closingBalance > 0 ? `Govt Credit ${closingBalance}` : 'Balanced';
    } else {
      previousBalanceAdjusted = 0;
      govtCreditGenerated = 0;
      govtCreditUsed = 0;
      govtPayable = Math.abs(grossDifference);
      closingBalance = -govtPayable;
      settlementStatus = 'Govt Payable';
      resultSummary = `${govtPayable} Units Govt Payable`;
    }
  } else if (openBal > 0) {
    // Opening Balance is Positive (Previous Govt Credit)
    if (grossDifference >= 0) {
      // Current Export Surplus adds to previous credit
      previousBalanceAdjusted = openBal;
      govtCreditGenerated = grossDifference;
      govtCreditUsed = 0;
      govtPayable = 0;
      closingBalance = round2Decimals(openBal + grossDifference);
      settlementStatus = closingBalance > 0 ? 'Govt Credit' : 'Balanced';
      resultSummary = `Previous ${openBal} Carried Forward, ${closingBalance} Total Credit`;
    } else {
      // Current Import Excess (grossDifference < 0) uses up previous credit
      const importExcess = Math.abs(grossDifference);
      const creditUsed = round2Decimals(Math.min(openBal, importExcess));
      previousBalanceAdjusted = -creditUsed;
      govtCreditUsed = creditUsed;
      govtCreditGenerated = 0;
      closingBalance = round2Decimals(openBal + grossDifference);

      if (closingBalance < 0) {
        govtPayable = Math.abs(closingBalance);
        settlementStatus = 'Govt Payable';
        resultSummary = `Previous ${creditUsed} Credit Used, ${govtPayable} Units Govt Payable`;
      } else {
        govtPayable = 0;
        settlementStatus = closingBalance > 0 ? 'Govt Credit' : 'Balanced';
        resultSummary = closingBalance > 0 ? `Previous ${creditUsed} Credit Used, ${closingBalance} Govt Credit` : 'Balanced (Credit Exhausted)';
      }
    }
  } else {
    // Opening Balance is Negative (Previous Govt Payable, openBal < 0)
    const prevPayable = Math.abs(openBal);

    if (grossDifference >= 0) {
      // Current Export Surplus clears previous payable!
      const exportSurplus = grossDifference;
      const payableCleared = round2Decimals(Math.min(prevPayable, exportSurplus));
      previousBalanceAdjusted = +payableCleared;
      govtCreditUsed = 0;
      closingBalance = round2Decimals(openBal + grossDifference);

      if (closingBalance > 0) {
        govtCreditGenerated = closingBalance;
        govtPayable = 0;
        settlementStatus = 'Govt Credit';
        resultSummary = `Previous ${payableCleared} Payable Cleared, ${govtCreditGenerated} New Credit`;
      } else {
        govtCreditGenerated = 0;
        govtPayable = Math.abs(closingBalance);
        settlementStatus = closingBalance < 0 ? 'Govt Payable' : 'Balanced';
        resultSummary = closingBalance < 0 ? `${govtPayable} Units Govt Payable` : 'Balanced (Payable Cleared)';
      }
    } else {
      // Current Import Excess adds to previous payable
      const importExcess = Math.abs(grossDifference);
      previousBalanceAdjusted = 0;
      govtCreditUsed = 0;
      govtCreditGenerated = 0;
      closingBalance = round2Decimals(openBal + grossDifference);
      govtPayable = Math.abs(closingBalance);
      settlementStatus = 'Govt Payable';
      resultSummary = `${govtPayable} Units Govt Payable`;
    }
  }

  const activeRate = closingBalance >= 0 ? buyRateVal : sellRateVal;
  const settlementAmountRs = round2Decimals(Math.abs(closingBalance) * activeRate);

  return {
    id: id || null,
    date: date || '',
    opening_import_meter: openingImportMeter !== null ? parseFloat(openingImportMeter) : null,
    closing_import_meter: closingImportMeter !== null ? parseFloat(closingImportMeter) : null,
    daily_import_units: importUnits,
    opening_export_meter: openingExportMeter !== null ? parseFloat(openingExportMeter) : null,
    closing_export_meter: closingExportMeter !== null ? parseFloat(closingExportMeter) : null,
    daily_export_units: exportUnits,
    gross_difference: grossDifference,
    opening_settlement_balance: openBal,
    previous_balance_adjusted: previousBalanceAdjusted,
    govt_credit_generated: govtCreditGenerated,
    govt_credit_used: govtCreditUsed,
    govt_payable: govtPayable,
    closing_settlement_balance: closingBalance,
    settlement_status: settlementStatus,
    settlement_rate: activeRate,
    settlement_amount_rs: settlementAmountRs,
    result_summary: `${resultSummary} (₹${settlementAmountRs.toFixed(2)})`
  };
}

/**
 * Calculates running monthly settlement series across a list of daily readings/entries.
 * 
 * @param {Array} dailyList Array of daily objects sorted chronologically by date
 * @param {Object} options Options object containing rate, initialOpeningBalance
 */
function calculateMonthlySettlementSeries(dailyList = [], options = {}) {
  const buyingRateVal = parseFloat(options.buyingRate ?? options.buying_rate ?? (options.rate !== undefined && options.sellingRate === undefined ? options.rate : 2.25)) || 2.25;
  const sellingRateVal = parseFloat(options.sellingRate ?? options.selling_rate ?? (options.rate !== undefined && options.buyingRate === undefined ? options.rate : 2.25)) || 2.25;
  let runningBalance = parseFloat(options.initialOpeningBalance) || 0;

  const history = [];
  let totalImport = 0;
  let totalExport = 0;
  let totalCreditGenerated = 0;
  let totalCreditUsed = 0;
  let totalPayableGenerated = 0;

  let lastClosingImportMeter = null;
  let lastClosingExportMeter = null;

  dailyList.forEach(item => {
    let openImp = item.opening_import_meter ?? item.previous_import_meter ?? lastClosingImportMeter;
    let openExp = item.opening_export_meter ?? item.previous_export_meter ?? lastClosingExportMeter;

    const stepResult = calculateDailySettlementStep({
      id: item.id || null,
      date: item.date || item.entry_date,
      openingImportMeter: openImp,
      closingImportMeter: item.closing_import_meter ?? item.import_meter ?? (openImp !== null && item.consumed_units !== undefined ? openImp + parseFloat(item.consumed_units) : item.consumed_units ?? null),
      dailyImportUnits: item.daily_import_units ?? item.import_units ?? item.consumed_units ?? null,
      openingExportMeter: openExp,
      closingExportMeter: item.closing_export_meter ?? item.export_meter ?? (openExp !== null && item.generated_units !== undefined ? openExp + parseFloat(item.generated_units) : item.generated_units ?? null),
      dailyExportUnits: item.daily_export_units ?? item.export_units ?? item.generated_units ?? null,
      openingBalance: runningBalance,
      buyingRate: buyingRateVal,
      sellingRate: sellingRateVal
    });

    if (stepResult.closing_import_meter !== null) {
      lastClosingImportMeter = stepResult.closing_import_meter;
    }
    if (stepResult.closing_export_meter !== null) {
      lastClosingExportMeter = stepResult.closing_export_meter;
    }

    history.push(stepResult);

    totalImport += stepResult.daily_import_units;
    totalExport += stepResult.daily_export_units;
    totalCreditGenerated += stepResult.govt_credit_generated;
    totalCreditUsed += stepResult.govt_credit_used;
    if (stepResult.gross_difference < 0) {
      totalPayableGenerated += Math.abs(stepResult.gross_difference);
    }

    // Update running balance for next day
    runningBalance = stepResult.closing_settlement_balance;
  });

  const monthOpeningBalance = dailyList.length > 0 ? history[0].opening_settlement_balance : 0;
  const monthClosingBalance = runningBalance;
  const finalActiveRate = monthClosingBalance >= 0 ? buyingRateVal : sellingRateVal;
  const finalSettlementAmountRs = round2Decimals(Math.abs(monthClosingBalance) * finalActiveRate);
  const finalStatus = monthClosingBalance > 0 ? 'Govt Credit' : (monthClosingBalance < 0 ? 'Govt Payable' : 'Balanced');

  const monthOpenImp = history.length > 0 ? history[0].opening_import_meter : null;
  const monthCloseImp = history.length > 0 ? history[history.length - 1].closing_import_meter : null;
  const monthOpenExp = history.length > 0 ? history[0].opening_export_meter : null;
  const monthCloseExp = history.length > 0 ? history[history.length - 1].closing_export_meter : null;

  return {
    summary: {
      total_days: history.length,
      month_opening_import_meter: monthOpenImp,
      month_closing_import_meter: monthCloseImp,
      month_opening_export_meter: monthOpenExp,
      month_closing_export_meter: monthCloseExp,
      total_import_units: round2Decimals(totalImport),
      total_export_units: round2Decimals(totalExport),
      net_gross_difference: round2Decimals(totalExport - totalImport),
      month_opening_balance: round2Decimals(monthOpeningBalance),
      month_closing_balance: round2Decimals(monthClosingBalance),
      total_credit_generated: round2Decimals(totalCreditGenerated),
      total_credit_used: round2Decimals(totalCreditUsed),
      total_payable_generated: round2Decimals(totalPayableGenerated),
      settlement_rate: finalActiveRate,
      final_settlement_amount_rs: finalSettlementAmountRs,
      final_status: finalStatus
    },
    history
  };
}

module.exports = {
  round2Decimals,
  calculateDailySettlementStep,
  calculateMonthlySettlementSeries
};
