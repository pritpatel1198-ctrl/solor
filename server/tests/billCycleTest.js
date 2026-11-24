const assert = require('assert');
const { buildBillLedger, energyValue, moneyFor, nextDay } = require('../utils/billCycles');

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
const bill = (id, bill_date, bill_amount) => ({ id, bill_date, bill_amount });

const entries = [
  day('2026-01-01', 300, 200), // +100 units = +₹225
  day('2026-02-28', 200, 200), // 0: bill day counts in the closing cycle
  day('2026-03-01', 20, 5),    // +15
  day('2026-04-30', 5, 30)     // -25
];

test('nextDay crosses month and year', () => {
  assert.strictEqual(nextDay('2026-02-28'), '2026-03-01');
  assert.strictEqual(nextDay('2026-12-31'), '2027-01-01');
});

test('energyValue: surplus at buying rate adds, deficit at selling rate subtracts', () => {
  assert.strictEqual(energyValue(40, 2.25, 7), 90);
  assert.strictEqual(energyValue(-10, 2.25, 7), -70);
  assert.strictEqual(energyValue(0, 2.25, 7), 0);
});

test('moneyFor labels a signed amount', () => {
  assert.deepStrictEqual(moneyFor(90), { type: 'credit', amount: 90 });
  assert.deepStrictEqual(moneyFor(-70), { type: 'payable', amount: 70 });
  assert.deepStrictEqual(moneyFor(0), { type: 'balanced', amount: 0 });
});

test('no bills: balance is the value of all units', () => {
  const r = buildBillLedger(entries, [], rates);
  // +100 then +15 and -25: net +90 units = ₹202.50
  assert.strictEqual(r.current.balance_amount, 202.5);
  assert.strictEqual(r.current.opening_amount, 0);
  assert.strictEqual(r.bills.length, 0);
});

test('a + bill amount is added to the balance', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 500)], rates);
  const b = r.bills[0];
  assert.strictEqual(b.balance_before_amount, 225);
  assert.strictEqual(b.bill_amount, 500);
  assert.strictEqual(b.remaining_amount, 725);
  assert.deepStrictEqual(b.remaining_money, { type: 'credit', amount: 725 });
});

test('a - bill amount is subtracted from the balance', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', -300)], rates);
  assert.strictEqual(r.bills[0].remaining_amount, -75);
  assert.deepStrictEqual(r.bills[0].remaining_money, { type: 'payable', amount: 75 });
});

test('balance after a bill carries into the cycle starting the next day', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', -100)], rates);
  assert.strictEqual(r.current.period_start, '2026-03-01');
  assert.strictEqual(r.current.opening_amount, 125);
  // after the bill: +15 and -25 units = net -10 units = -₹70
  assert.strictEqual(r.current.period_amount, -70);
  assert.strictEqual(r.current.balance_amount, 55);
});

test('multiple bills chain and are returned newest first', () => {
  const r = buildBillLedger(entries, [bill('b2', '2026-04-30', 20), bill('b1', '2026-02-28', -100)], rates);
  assert.deepStrictEqual(r.bills.map(b => b.id), ['b2', 'b1']);
  assert.strictEqual(r.bills[0].opening_amount, 125);
  assert.strictEqual(r.bills[0].balance_before_amount, 55);
  assert.strictEqual(r.bills[0].remaining_amount, 75);
  assert.strictEqual(r.current.balance_amount, 75);
  assert.strictEqual(r.current.period_end, null); // no readings after the last bill yet
});

test('changing the Settings rates changes every balance', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 0)], { buyingRate: 3, sellingRate: 9 });
  assert.strictEqual(r.bills[0].balance_before_amount, 300);
  assert.strictEqual(r.current.balance_amount, 300 - 90);
});

test('editing an old reading flows through later cycles', () => {
  const edited = [day('2026-01-01', 310, 200), ...entries.slice(1)];
  const r = buildBillLedger(edited, [bill('b1', '2026-02-28', -100)], rates);
  assert.strictEqual(r.bills[0].remaining_amount, 147.5);
  assert.strictEqual(r.current.balance_amount, 77.5);
});

test('missing days in a cycle are counted', () => {
  const r = buildBillLedger(entries, [bill('b1', '2026-02-28', 0)], rates);
  assert.strictEqual(r.bills[0].days, 59);
  assert.strictEqual(r.bills[0].days_with_entries, 2);
  assert.strictEqual(r.bills[0].missing_days, 57);
});

test('decimals do not drift', () => {
  const r = buildBillLedger([day('2026-01-01', 0.1, 0), day('2026-01-02', 0.2, 0)], [bill('b1', '2026-01-02', -0.1)], { buyingRate: 1, sellingRate: 1 });
  assert.strictEqual(r.bills[0].balance_before_amount, 0.3);
  assert.strictEqual(r.bills[0].remaining_amount, 0.2);
});

test('no entries and no bills is an empty zero balance', () => {
  const r = buildBillLedger([], [], rates);
  assert.strictEqual(r.current.balance_amount, 0);
  assert.strictEqual(r.current.money.type, 'balanced');
});

console.log(`\nBILL CYCLE TESTS: ${passed} PASSED, ${failed} FAILED`);
if (failed > 0) process.exit(1);
