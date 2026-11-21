/**
 * 'YYYY-MM-DD' for a Date in the device's local timezone.
 * (toISOString() is UTC and gives the previous day in IST before 05:30.)
 */
export const localDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
