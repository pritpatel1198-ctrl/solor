/**
 * Global Frontend Configuration Constants
 */
const CONFIG = {
  API_BASE_URL: '/api',
  SUPABASE_URL: window.env?.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: window.env?.SUPABASE_ANON_KEY || '',
  DEFAULT_CURRENCY: '₹',
  DEFAULT_BUYING_RATE: 2.00,
  DEFAULT_SELLING_RATE: 7.00
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
