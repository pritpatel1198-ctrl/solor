const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let rawUrl = process.env.SUPABASE_URL || 'https://demo-solar.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const isDemo = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('demo-solar');
const DEMO_USER_ID = '42d532a5-8e20-4bed-9122-6ee8381384c4';

let supabase;
let supabaseAdmin;

if (!isDemo) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  } catch (err) {
    console.warn('Supabase initialization failed, running in fallback mode:', err.message);
  }
}

// Server-side backend database client (bypasses RLS when serviceRoleKey is provided)
const dbClient = supabaseAdmin || supabase;

// In-Memory fallback store
const inMemoryStore = {
  entries: [],
  settings: {
    [DEMO_USER_ID]: {
      user_id: DEMO_USER_ID,
      default_buying_rate: 2.0,
      default_selling_rate: 7.0,
      currency: '₹',
      theme: 'light',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  dbClient,
  isDemo,
  DEMO_USER_ID,
  inMemoryStore
};
