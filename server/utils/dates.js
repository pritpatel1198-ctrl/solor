/**
 * Calendar-day helpers. Entry dates are plain 'YYYY-MM-DD' strings in the user's local timezone,
 * while servers (e.g. Vercel) run in UTC, so "today" must be computed in the app's timezone.
 */
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

function todayInAppTz(date = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * A Date at local midnight whose calendar fields (getFullYear/getMonth/getDate/getDay)
 * equal today's date in the app timezone.
 */
function nowInAppTz() {
  const [y, m, d] = todayInAppTz().split('-').map(Number);
  return new Date(y, m - 1, d);
}

module.exports = { APP_TIMEZONE, todayInAppTz, nowInAppTz };
