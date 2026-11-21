const {
  dbClient,
  inMemoryStore,
  isSupabaseAvailable,
  reportSupabaseError,
  safeDbQuery,
  saveLocalStore
} = require('../config/supabase');
const { calculateMonthlySettlementSeries } = require('../utils/settlementCalculator');

async function getAllUserEntriesChronological(userId) {
  const getFromLocal = () => {
    return inMemoryStore.entries
      .filter(e => e.user_id === userId)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  };

  if (!isSupabaseAvailable()) {
    return getFromLocal();
  }

  try {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });
    });

    if (res.isOffline || res.error || !res.data) {
      return getFromLocal();
    }

    if (res.data && res.data.length > 0) {
      res.data.forEach(e => {
        const idx = inMemoryStore.entries.findIndex(x => x.id === e.id);
        if (idx >= 0) inMemoryStore.entries[idx] = e;
        else inMemoryStore.entries.push(e);
      });
      saveLocalStore();
    }

    return res.data;
  } catch (err) {
    reportSupabaseError(err);
    return getFromLocal();
  }
}

async function getMonthlySettlementReport(userId, query = {}) {
  const { month, year, rate, buyingRate, sellingRate } = query;
  const entries = await getAllUserEntriesChronological(userId);

  const buyRateParam = buyingRate ?? query.buying_rate;
  const sellRateParam = sellingRate ?? query.selling_rate;

  const parsedBuyRate = buyRateParam !== undefined && buyRateParam !== null && buyRateParam !== '' ? parseFloat(buyRateParam) : undefined;
  const parsedSellRate = sellRateParam !== undefined && sellRateParam !== null && sellRateParam !== '' ? parseFloat(sellRateParam) : undefined;

  let filtered = entries;
  if (year) {
    const yearStr = year.toString();
    if (month) {
      const monthPadded = month.toString().padStart(2, '0');
      const prefix = `${yearStr}-${monthPadded}`;
      filtered = entries.filter(e => e.entry_date.startsWith(prefix));
    } else {
      filtered = entries.filter(e => e.entry_date.startsWith(yearStr));
    }
  }

  const userSettings = inMemoryStore.settings[userId];
  const defaultBuy = parsedBuyRate ?? userSettings?.default_buying_rate ?? 2.25;
  const defaultSell = parsedSellRate ?? userSettings?.default_selling_rate ?? 2.25;

  // Calculate series running settlement
  const report = calculateMonthlySettlementSeries(filtered, {
    buyingRate: defaultBuy,
    sellingRate: defaultSell,
    initialOpeningBalance: 0
  });

  return report;
}

function calculateCustomSettlementSeries(readings = [], rate = 2.50) {
  const sorted = [...readings].sort((a, b) => (a.date || a.entry_date || '').localeCompare(b.date || b.entry_date || ''));
  return calculateMonthlySettlementSeries(sorted, { rate: parseFloat(rate) || 2.50 });
}

module.exports = {
  getMonthlySettlementReport,
  calculateCustomSettlementSeries
};
