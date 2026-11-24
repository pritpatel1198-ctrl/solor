const crypto = require('crypto');
const {
  dbClient,
  isDemo,
  inMemoryStore,
  saveLocalStore,
  assertWritableDb,
  isNetworkOrServerError,
  HttpError
} = require('../config/supabase');
const settingsService = require('./settingsService');
const { buildBillLedger } = require('../utils/billCycles');

const SETUP_MESSAGE = 'Bill history needs a one-time database setup. Run supabase/add_electricity_bills.sql in the Supabase SQL Editor.';
const PAGE_SIZE = 1000;

// Queries here deliberately skip safeDbQuery: it treats a missing table as an outage,
// which would switch the whole app to offline mode until the SQL setup has been run.
function toHttpError(error, action) {
  if (error.code === 'PGRST205' || error.code === '42P01') return new HttpError(503, SETUP_MESSAGE);
  if (isNetworkOrServerError(error)) return new HttpError(503, 'Database is temporarily unavailable. Please try again.');
  return new HttpError(500, `${action}: ${error.message}`);
}

async function fetchAllPages(buildQuery, action) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw toHttpError(error, action);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

async function loadEntries(userId) {
  if (isDemo) return inMemoryStore.entries.filter(e => e.user_id === userId);
  return fetchAllPages(
    () => dbClient
      .from('daily_entries')
      .select('entry_date, generated_units, consumed_units')
      .eq('user_id', userId)
      .order('entry_date', { ascending: true }),
    'Failed to load entries'
  );
}

async function loadBills(userId) {
  if (isDemo) return (inMemoryStore.bills || []).filter(b => b.user_id === userId);
  return fetchAllPages(
    () => dbClient
      .from('electricity_bills')
      .select('id, bill_date, bill_amount')
      .eq('user_id', userId)
      .order('bill_date', { ascending: true }),
    'Failed to load bills'
  );
}

async function currentRates(userId) {
  const settings = await settingsService.getSettings(userId);
  return {
    buyingRate: parseFloat(settings?.default_buying_rate) || 2.25,
    sellingRate: parseFloat(settings?.default_selling_rate) || 2.25
  };
}

async function getLedger(userId) {
  const [entries, bills, rates] = await Promise.all([loadEntries(userId), loadBills(userId), currentRates(userId)]);
  return buildBillLedger(entries, bills, rates);
}

async function createBill(userId, { bill_date, bill_amount }) {
  assertWritableDb();
  const rates = await currentRates(userId);
  const record = {
    user_id: userId,
    bill_date,
    adjusted_units: 0, // bills are entered as a signed amount; the units column is kept for old rows
    bill_amount: Number(bill_amount),
    buying_rate: rates.buyingRate,
    selling_rate: rates.sellingRate
  };

  let id;
  if (isDemo) {
    inMemoryStore.bills = inMemoryStore.bills || [];
    if (inMemoryStore.bills.some(b => b.user_id === userId && b.bill_date === bill_date)) {
      throw new HttpError(409, `A bill for ${bill_date} already exists. Delete it first to change it.`);
    }
    id = crypto.randomUUID();
    inMemoryStore.bills.push({ id, ...record });
    saveLocalStore();
  } else {
    const { data, error } = await dbClient.from('electricity_bills').insert([record]).select('id').single();
    if (error?.code === '23505') {
      throw new HttpError(409, `A bill for ${bill_date} already exists. Delete it first to change it.`);
    }
    if (error) throw toHttpError(error, 'Failed to save bill');
    id = data.id;
  }

  const ledger = await getLedger(userId);
  return { saved: ledger.bills.find(b => b.id === id), ...ledger };
}

async function deleteBill(userId, id) {
  assertWritableDb();
  if (isDemo) {
    const bills = inMemoryStore.bills || [];
    const idx = bills.findIndex(b => b.user_id === userId && b.id === id);
    if (idx === -1) throw new HttpError(404, 'Bill not found');
    bills.splice(idx, 1);
    saveLocalStore();
  } else {
    const { data, error } = await dbClient
      .from('electricity_bills')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .select('id');
    if (error) throw toHttpError(error, 'Failed to delete bill');
    if (!data || data.length === 0) throw new HttpError(404, 'Bill not found');
  }
  return getLedger(userId);
}

module.exports = { getLedger, createBill, deleteBill };
