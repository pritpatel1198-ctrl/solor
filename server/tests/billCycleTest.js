const assert = require('assert');
const { buildBillLedger, moneyFor, nextDay } = require('../utils/billCycles');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

const rates = { buyingRate: 2.25, sellingRate: 7 };
const day = (entry_date, generated_units, consumed_units) => ({ entry_date, generated_units, consumed_units });
const bill = (id, bill_date, adjusted_units, extra = {}) => ({ id, bill_date, adjusted_units, bill_amount: null, buying_rate: 2.25, selling_rate: 7, ...extra });

const entries = [
  day('2026-01-01', 300, 200), // +100
  day('2026-02-28', 200, 200), // 0: bill day counts in the closing cycle
  day('2026-03-01', 20, 5),    // +15: first day of the next cycle
  day('2026-04-30', 5, 30)     // -25
];

test('nextDay crosses month and year', () => {
  assert.strictEqual(nextDay('2026-02-28'), '2026-03-01');
  assert.strictEqual(nextDay('2026-12-31'), '2027-01-01');
});

test('moneyFor uses buying rate for credit and selling rate for payable', () => {
  assert.deepStrictEqual(moneyFor(40, 2.25, 7), { type: 'credit', amount: 90 });
  assert.deepStrictEqual(moneyFor(-10, 2.25, 7), { type: 'payable', amount: 70 });
  assert.deepStrictEqual(moneyFor(0, 2.25, 7), { type: 'balanced', amount: 0 });
});

test('no bills: balance is all export minus import', () => {
  const r = buildBillLedger(entries, [], rates);
  assert.strictEqual(r.current.balance_units, 90);
  assert.strictEqual(r.current.opening_units, 0);
  assert.strictEqual(r.bills.length, 0);
});

test('bill subtracts adjusted units from everything up to and including its date', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 60)], rates);
  const b = r.bills[0];
  assert.strictEqual(b.balance_before_units, 100);
  assert.strictEqual(b.remaining_units, 40);
  assert.deepStrictEqual(b.remaining_money, { type: 'credit', amount: 90 });
});

test('remaining units carry into the cycle starting the next day', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 60)], rates);
  assert.strictEqual(r.current.period_start, '2026-03-01');
  assert.strictEqual(r.current.opening_units, 40);
  assert.strictEqual(r.current.net_units, -10);
  assert.strictEqual(r.current.balance_units, 30);
  assert.deepStrictEqual(r.current.money, { type: 'credit', amount: 67.5 });
});

test('multiple bills chain and are returned newest first', () => {
  const r = buildBillLedger(entries, [bill('b2', '2026-04-30', 20), bill('b1', '2026-02-28', 60)], rates);
  assert.deepStrictEqual(r.bills.map(b => b.id), ['b2', 'b1']);
  assert.strictEqual(r.bills[0].opening_units, 40);
  assert.strictEqual(r.bills[0].balance_before_units, 30);
  assert.strictEqual(r.bills[0].remaining_units, 10);
  assert.strictEqual(r.current.balance_units, 10);
  assert.strictEqual(r.current.period_end, null); // no readings after the last bill yet
});

test('bill larger than the balance leaves a payable', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 110)], rates);
  assert.strictEqual(r.bills[0].remaining_units, -10);
  assert.deepStrictEqual(r.bills[0].remaining_money, { type: 'payable', amount: 70 });
});

test('a saved bill keeps its own rates when Settings change', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 60)], { buyingRate: 5, sellingRate: 9 });
  assert.strictEqual(r.bills[0].remaining_money.amount, 90);
  assert.strictEqual(r.current.money.amount, 150);
});

test('editing an old reading flows through later cycles', () => {
  const edited = [day('2026-01-01', 310, 200), ...entries.slice(1)];
  const r = buildBillLedger(edited, [bill('b1', '2026-02-28', 60)], rates);
  assert.strictEqual(r.bills[0].remaining_units, 50);
  assert.strictEqual(r.current.balance_units, 40);
});

test('missing days in a cycle are counted', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 60)], rates);
  assert.strictEqual(r.bills[0].days, 59);
  assert.strictEqual(r.bills[0].days_with_entries, 2);
  assert.strictEqual(r.bills[0].missing_days, 57);
});

test('decimals do not drift', () => {
  const r = buildBillLedger([day('2026-01-01', 0.1, 0), day('2026-01-02', 0.2, 0)], [bill('b1', '2026-01-02', 0.1)], rates);
  assert.strictEqual(r.bills[0].balance_before_units, 0.3);
  assert.strictEqual(r.bills[0].remaining_units, 0.2);
});

test('no entries and no bills is an empty zero balance', () => {
  const r = buildBillLedger([], [], rates);
  assert.strictEqual(r.current.balance_units, 0);
  assert.strictEqual(r.current.money.type, 'balanced');
});

console.log(`\nBILL CYCLE TESTS: ${passed} PASSED, ${failed} FAILED`);
if (failed > 0) process.exit(1);
