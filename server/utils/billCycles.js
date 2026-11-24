/**
 * ====================================================================================
 * ELECTRICITY BILL CYCLES (bill arrives every ~2 months), in rupees
 * ====================================================================================
 *
 * Balance (₹) = carried amount from the last bill
 *             + value of the units since then (export - import, period-netted):
 *                 surplus units x buying rate  (adds)
 *                 deficit units x selling rate (subtracts)
 *
 * Adding a bill: its signed amount is added to the balance on the bill date.
 *   +500 adds ₹500, -500 subtracts ₹500. The result carries into the next cycle,
 *   which starts the day after the bill.
 *
 * Everything is derived from entries + bills + the current Settings rates,
 * so a rate change or an edited reading is reflected everywhere.
 */

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function daysInclusive(startDate, endDate) {
  const toUtc = (d) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
  return Math.round((toUtc(endDate) - toUtc(startDate)) / 86400000) + 1;
}

function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// Signed rupee value of net units: surplus is credited, deficit is payable
function energyValue(netUnits, buyingRate, sellingRate) {
  if (netUnits > 0) return round2(netUnits * buyingRate);
  if (netUnits < 0) return round2(-Math.abs(netUnits) * sellingRate);
  return 0;
}

// Display form of a signed amount
function moneyFor(amount) {
  if (amount > 0) return { type: 'credit', amount: round2(amount) };
  if (amount < 0) return { type: 'payable', amount: round2(Math.abs(amount)) };
  return { type: 'balanced', amount: 0 };
}

function summarizePeriod(entries, start, end) {
  const inPeriod = entries.filter(e => (!start || e.entry_date >= start) && e.entry_date <= end);
  const exportUnits = round2(inPeriod.reduce((sum, e) => sum + (parseFloat(e.generated_units) || 0), 0));
  const importUnits = round2(inPeriod.reduce((sum, e) => sum + (parseFloat(e.consumed_units) || 0), 0));
  const daysWithEntries = new Set(inPeriod.map(e => e.entry_date)).size;
  const days = start && start <= end ? daysInclusive(start, end) : daysWithEntries;
  return {
    export_units: exportUnits,
    import_units: importUnits,
    net_units: round2(exportUnits - importUnits),
    days,
    days_with_entries: daysWithEntries,
    missing_days: Math.max(0, days - daysWithEntries)
  };
}

/**
 * @param {Array} entries daily entries (entry_date, generated_units, consumed_units)
 * @param {Array} bills saved bills (id, bill_date, bill_amount)
 * @param {object} rates current Settings { buyingRate, sellingRate }
 * @returns {{ current: object, bills: Array }} bills are newest first
 */
function buildBillLedger(entries = [], bills = [], { buyingRate = 2.25, sellingRate = 2.25 } = {}) {
  const sortedEntries = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const sortedBills = [...bills].sort((a, b) => a.bill_date.localeCompare(b.bill_date));
  const firstEntryDate = sortedEntries.length ? sortedEntries[0].entry_date : null;

  let opening = 0;
  let cycleStart = firstEntryDate;
  const closed = [];

  for (const bill of sortedBills) {
    const start = cycleStart && cycleStart <= bill.bill_date ? cycleStart : bill.bill_date;
    const period = summarizePeriod(sortedEntries, start, bill.bill_date);
    const periodAmount = energyValue(period.net_units, buyingRate, sellingRate);
    const before = round2(opening + periodAmount);
    const billAmount = round2(parseFloat(bill.bill_amount) || 0);
    const remaining = round2(before + billAmount);

    closed.push({
      id: bill.id,
      bill_date: bill.bill_date,
      period_start: start,
      period_end: bill.bill_date,
      opening_amount: opening,
      ...period,
      period_amount: periodAmount,
      balance_before_amount: before,
      bill_amount: billAmount,
      remaining_amount: remaining,
      remaining_money: moneyFor(remaining)
    });

    opening = remaining;
    cycleStart = nextDay(bill.bill_date);
  }

  const lastEntryDate = sortedEntries.length ? sortedEntries[sortedEntries.length - 1].entry_date : null;
  const hasOpenReadings = Boolean(lastEntryDate && cycleStart && lastEntryDate >= cycleStart);
  const openPeriod = hasOpenReadings
    ? summarizePeriod(sortedEntries, cycleStart, lastEntryDate)
    : { export_units: 0, import_units: 0, net_units: 0, days: 0, days_with_entries: 0, missing_days: 0 };
  const periodAmount = energyValue(openPeriod.net_units, buyingRate, sellingRate);
  const balance = round2(opening + periodAmount);

  return {
    current: {
      period_start: cycleStart,
      period_end: hasOpenReadings ? lastEntryDate : null,
      opening_amount: opening,
      ...openPeriod,
      period_amount: periodAmount,
      balance_amount: balance,
      money: moneyFor(balance),
      buying_rate: buyingRate,
      selling_rate: sellingRate,
      last_bill_date: sortedBills.length ? sortedBills[sortedBills.length - 1].bill_date : null
    },
    bills: closed.reverse()
  };
}

module.exports = { buildBillLedger, energyValue, moneyFor, nextDay };
