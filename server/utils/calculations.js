const { calculateNetMeteringBill, round2Decimals } = require('./netMeteringCalculator');

/**
 * Core Financial & Unit Business Logic Engine
 * Requirements according to PRD.md:
 * 
 * Formula:
 * Net Units = Generated - Consumed
 * 
 * If Net Units > 0:
 *   Revenue = Net Units * Buying Rate
 *   Payable = 0
 *   Status = 'profit'
 * 
 * If Net Units < 0:
 *   Revenue = 0
 *   Payable = |Net Units| * Selling Rate
 *   Status = 'loss'
 * 
 * If Net Units = 0:
 *   Revenue = 0
 *   Payable = 0
 *   Status = 'balanced'
 */

function calculateEntryMetrics({ generatedUnits, consumedUnits, buyingRate, sellingRate }) {
  const gen = parseFloat(generatedUnits) || 0;
  const con = parseFloat(consumedUnits) || 0;
  let buyRate = parseFloat(buyingRate) || 2.25;
  let sellRate = parseFloat(sellingRate) || 2.25;

  // Auto-correct if rates were passed inverted (Buying rate is Govt Credit ~2.25, Selling rate is Grid Purchase ~2.25)
  if (buyRate > sellRate && sellRate > 0) {
    const temp = buyRate;
    buyRate = sellRate;
    sellRate = temp;
  }

  const netUnits = parseFloat((gen - con).toFixed(2));
  let revenue = 0;
  let payable = 0;
  let status = 'balanced';

  if (netUnits > 0) {
    // Solar Surplus: Credit earned at Govt Buying Rate (₹2.25/unit)
    revenue = parseFloat((netUnits * buyRate).toFixed(2));
    payable = 0;
    status = 'profit';
  } else if (netUnits < 0) {
    // Grid Deficit: Payment owed at Govt Selling Rate (₹2.25/unit)
    revenue = 0;
    payable = parseFloat((Math.abs(netUnits) * sellRate).toFixed(2));
    status = 'loss';
  } else {
    revenue = 0;
    payable = 0;
    status = 'balanced';
  }

  return {
    generated_units: gen,
    consumed_units: con,
    net_units: netUnits,
    buying_rate: buyRate,
    selling_rate: sellRate,
    revenue,
    payable,
    status
  };
}

module.exports = {
  calculateEntryMetrics,
  calculateNetMeteringBill,
  round2Decimals
};

