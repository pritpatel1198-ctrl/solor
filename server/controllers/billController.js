const billService = require('../services/billService');
const { todayInAppTz } = require('../utils/dates');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return NaN;
  return Number(value);
}

function validateNewBill(body) {
  if (!isValidDate(body.bill_date)) return 'Bill date is required (YYYY-MM-DD)';
  if (body.bill_date > todayInAppTz()) return 'Bill date cannot be in the future';
  const amount = toNumber(body.bill_amount);
  if (!Number.isFinite(amount)) return 'Bill amount is required';
  if (amount === 0) return 'Bill amount cannot be 0';
  return null;
}

function sendError(res, err) {
  res.status(err.status || 500).json({ success: false, error: err.message });
}

// GET /api/bills: running balance and bill history
async function listBills(req, res) {
  try {
    res.json({ success: true, data: await billService.getLedger(req.user.id) });
  } catch (err) {
    sendError(res, err);
  }
}

// POST /api/bills: { bill_date, bill_amount } (+ adds to the balance, - subtracts)
async function createBill(req, res) {
  try {
    const validationError = validateNewBill(req.body || {});
    if (validationError) return res.status(400).json({ success: false, error: validationError });
    const { bill_date, bill_amount } = req.body;
    const data = await billService.createBill(req.user.id, { bill_date, bill_amount });
    res.status(201).json({ success: true, data });
  } catch (err) {
    sendError(res, err);
  }
}

// DELETE /api/bills/:id
async function deleteBill(req, res) {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ success: false, error: 'Bill not found' });
    res.json({ success: true, data: await billService.deleteBill(req.user.id, req.params.id) });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = { listBills, createBill, deleteBill };
