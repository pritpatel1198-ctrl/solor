/**
 * Global Frontend Configuration Constants
 */
const CONFIG = {
  API_BASE_URL: '/api',
  SUPABASE_URL: window.env?.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: window.env?.SUPABASE_ANON_KEY || '',
  DEFAULT_CURRENCY: '₹',
  DEFAULT_BUYING_RATE: 2.00,
  DEFAULT_SELLING_RATE: 2.25
};

/**
 * Escape a value for safe interpolation into innerHTML template strings.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 'YYYY-MM-DD' for a Date in the browser's local timezone.
 * (toISOString() is UTC and gives the previous day in IST before 05:30.)
 */
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
