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
  const buyRate = parseFloat(buyingRate) || 0;
  const sellRate = parseFloat(sellingRate) || 0;

  const netUnits = parseFloat((gen - con).toFixed(2));
  let revenue = 0;
  let payable = 0;
  let status = 'balanced';

  if (netUnits > 0) {
    revenue = parseFloat((netUnits * buyRate).toFixed(2));
    payable = 0;
    status = 'profit';
  } else if (netUnits < 0) {
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
  calculateEntryMetrics
};
