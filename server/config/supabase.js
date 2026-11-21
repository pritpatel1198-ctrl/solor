const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, '../data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'local_store.json');

const DEMO_USER_ID = '42d532a5-8e20-4bed-9122-6ee8381384c4';

// In-Memory store (populated dynamically from database / local_store.json)
const inMemoryStore = {
  entries: [],
  bills: [], // demo mode only; with Supabase, bills live in electricity_bills
  settings: {
    [DEMO_USER_ID]: {
      user_id: DEMO_USER_ID,
      default_buying_rate: 2.25,
      default_selling_rate: 2.25,
      currency: '₹',
      theme: 'light',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
};

function loadLocalStoreFromFile() {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) {
        inMemoryStore.entries = parsed.entries;
      }
      if (Array.isArray(parsed.bills)) {
        inMemoryStore.bills = parsed.bills;
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        inMemoryStore.settings = { ...inMemoryStore.settings, ...parsed.settings };
      }
    }
  } catch (err) {
    console.warn('[Database] Failed to read local_store.json:', err.message);
  }
}

function saveLocalStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Database] Failed to save local_store.json:', err.message);
  }
}

function syncLocalCache(entries, settings) {
  if (Array.isArray(entries) && entries.length > 0) {
    inMemoryStore.entries = entries;
  }
  if (settings && typeof settings === 'object') {
    if (settings.user_id) {
      inMemoryStore.settings[settings.user_id] = settings;
    } else {
      inMemoryStore.settings = { ...inMemoryStore.settings, ...settings };
    }
  }
  saveLocalStore();
}

// Initial load
loadLocalStoreFromFile();

// Supabase setup
let rawUrl = process.env.SUPABASE_URL || 'https://demo-solar.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const isDemo = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('demo-solar');

let supabase = null;
let supabaseAdmin = null;

if (!isDemo) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.warn('[Database] Supabase initialization failed:', err.message);
  }
}

const dbClient = supabaseAdmin || supabase;

// Circuit Breaker & Connection State
let isSupabaseOnline = !isDemo && Boolean(dbClient);
let isCircuitTripped = false;
let nextProbeAllowedAt = 0;

function isNetworkOrServerError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toString();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('503') ||
    msg.includes('521') ||
    msg.includes('schema cache') ||
    code === 'PGRST002' ||
    code === 'PGRST205'
  );
}

function reportSupabaseError(error) {
  if (isNetworkOrServerError(error)) {
    if (isSupabaseOnline) {
      isSupabaseOnline = false;
      isCircuitTripped = true;
      nextProbeAllowedAt = Date.now() + 45000; // backoff for 45 seconds
      console.warn(`[Database] Supabase query failure (${error?.message || 'fetch failed'}). Serving seamlessly from local persistent storage.`);
    }
  }
}

async function probeSupabaseHealth() {
  if (isDemo || !dbClient) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/daily_entries?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey || supabaseKey,
        Authorization: `Bearer ${serviceRoleKey || supabaseKey}`
      },
      signal: AbortSignal.timeout(2500)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Background recovery probe every 30 seconds if offline
setInterval(async () => {
  if (!isDemo && dbClient && (!isSupabaseOnline || isCircuitTripped)) {
    if (Date.now() < nextProbeAllowedAt) return;
    const ok = await probeSupabaseHealth();
    if (ok) {
      isSupabaseOnline = true;
      isCircuitTripped = false;
      console.log('[Database] Supabase cloud connection restored. Active synchronization resumed.');
    } else {
      nextProbeAllowedAt = Date.now() + 45000;
    }
  }
}, 30000).unref();

// Run initial probe on server startup non-blocking
if (!isDemo && dbClient) {
  probeSupabaseHealth().then(ok => {
    isSupabaseOnline = ok;
    if (ok) {
      console.log('[Database] Supabase cloud PostgreSQL connected and operational.');
    } else {
      console.log('[Database] Supabase cloud instance is currently unreachable. Operating in local persistent store mode.');
    }
  }).catch(() => {
    isSupabaseOnline = false;
  });
}

function isSupabaseAvailable() {
  if (isDemo || !dbClient) return false;
  return isSupabaseOnline;
}

/**
 * Execute a database query with automatic 1-shot retry for transient network glitches
 */
async function safeDbQuery(queryFn) {
  if (!isSupabaseAvailable()) {
    return { data: null, error: { message: 'Supabase offline' }, isOffline: true };
  }

  try {
    const result = await queryFn();
    if (result && result.error && isNetworkOrServerError(result.error)) {
      // 1 quick retry after 350ms in case of cold-start or temporary socket disconnect
      await new Promise(r => setTimeout(r, 350));
      const retryResult = await queryFn();
      if (retryResult && retryResult.error && isNetworkOrServerError(retryResult.error)) {
        reportSupabaseError(retryResult.error);
        return { data: null, error: retryResult.error, isOffline: true };
      }
      return retryResult;
    }
    return result;
  } catch (err) {
    if (isNetworkOrServerError(err)) {
      // 1 quick retry
      try {
        await new Promise(r => setTimeout(r, 350));
        const retryResult = await queryFn();
        return retryResult;
      } catch (retryErr) {
        reportSupabaseError(retryErr);
        return { data: null, error: retryErr, isOffline: true };
      }
    }
    throw err;
  }
}

/**
 * Error carrying an HTTP status for controllers to forward.
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function dbUnavailableError() {
  return new HttpError(503, 'Database is temporarily unavailable. Your change was NOT saved, please try again.');
}

/**
 * Throw if a write cannot be persisted to Supabase.
 * In demo mode (no Supabase configured) the local store is the database, so writes are allowed.
 */
function assertWritableDb() {
  if (!isDemo && !isSupabaseAvailable()) throw dbUnavailableError();
}

/**
 * Turn a Supabase write result into a value or a thrown error (never silently ignored).
 */
function unwrapWriteResult(res, fallbackMessage) {
  if (!res || res.isOffline) throw dbUnavailableError();
  if (res.error) {
    if (res.error.code === 'PGRST116') throw new HttpError(404, 'Entry not found');
    throw new HttpError(500, `${fallbackMessage}: ${res.error.message}`);
  }
  return res.data;
}

module.exports = {
  HttpError,
  dbUnavailableError,
  assertWritableDb,
  unwrapWriteResult,
  isNetworkOrServerError,
  supabase,
  supabaseAdmin,
  dbClient,
  isDemo,
  DEMO_USER_ID,
  inMemoryStore,
  saveLocalStore,
  syncLocalCache,
  isSupabaseAvailable,
  reportSupabaseError,
  safeDbQuery,
  probeSupabaseHealth
};
