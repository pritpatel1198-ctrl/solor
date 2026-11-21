/**
 * ====================================================================================
 * ELECTRICITY BILL CYCLES (bill arrives every ~2 months)
 * ====================================================================================
 *
 * Each bill closes a cycle:
 *   balance before bill = carried-in units + (export - import) since the previous bill,
 *                         up to and including the bill date
 *   remaining units     = balance before bill - units adjusted on the bill
 *   remaining money     = remaining units x rate
 *                         (positive: credit at buying rate, negative: payable at selling rate)
 *
 * The remaining units carry into the next cycle, which starts the day after the bill.
 * Everything is derived from entries + bills, so editing an old reading stays consistent.
 * Rates saved on a bill keep its statement stable if Settings change later.
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

function moneyFor(units, buyingRate, sellingRate) {
  if (units > 0) return { type: 'credit', amount: round2(units * buyingRate) };
  if (units < 0) return { type: 'payable', amount: round2(Math.abs(units) * sellingRate) };
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
 * @param {Array} bills saved bills (id, bill_date, adjusted_units, bill_amount, buying_rate, selling_rate)
 * @param {object} rates current { buyingRate, sellingRate }, used for the open cycle
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
    const balanceBefore = round2(opening + period.net_units);
    const adjusted = round2(parseFloat(bill.adjusted_units));
    const remaining = round2(balanceBefore - adjusted);
    const billBuy = parseFloat(bill.buying_rate);
    const billSell = parseFloat(bill.selling_rate);

    closed.push({
      id: bill.id,
      bill_date: bill.bill_date,
      period_start: start,
      period_end: bill.bill_date,
      opening_units: opening,
      ...period,
      balance_before_units: balanceBefore,
      adjusted_units: adjusted,
      remaining_units: remaining,
      remaining_money: moneyFor(remaining, billBuy, billSell),
      bill_amount: bill.bill_amount === null || bill.bill_amount === undefined ? null : parseFloat(bill.bill_amount),
      buying_rate: billBuy,
      selling_rate: billSell
    });

    opening = remaining;
    cycleStart = nextDay(bill.bill_date);
  }

  const lastEntryDate = sortedEntries.length ? sortedEntries[sortedEntries.length - 1].entry_date : null;
  const hasOpenReadings = Boolean(lastEntryDate && cycleStart && lastEntryDate >= cycleStart);
  const openPeriod = hasOpenReadings
    ? summarizePeriod(sortedEntries, cycleStart, lastEntryDate)
    : { export_units: 0, import_units: 0, net_units: 0, days: 0, days_with_entries: 0, missing_days: 0 };
  const balance = round2(opening + openPeriod.net_units);

  return {
    current: {
      period_start: cycleStart,
      period_end: hasOpenReadings ? lastEntryDate : null,
      opening_units: opening,
      ...openPeriod,
      balance_units: balance,
      money: moneyFor(balance, buyingRate, sellingRate),
      buying_rate: buyingRate,
      selling_rate: sellingRate,
      last_bill_date: sortedBills.length ? sortedBills[sortedBills.length - 1].bill_date : null
    },
    bills: closed.reverse()
  };
}

module.exports = { buildBillLedger, moneyFor, nextDay };
