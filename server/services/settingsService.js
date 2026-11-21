const {
  dbClient,
  inMemoryStore,
  isSupabaseAvailable,
  reportSupabaseError,
  safeDbQuery,
  saveLocalStore,
  isDemo,
  assertWritableDb,
  unwrapWriteResult
} = require('../config/supabase');
const { calculateEntryMetrics } = require('../utils/calculations');

async function getSettings(userId) {
  const getLocalSettings = () => {
    if (!inMemoryStore.settings[userId]) {
      inMemoryStore.settings[userId] = {
        user_id: userId,
        default_buying_rate: 2.25,
        default_selling_rate: 2.25,
        currency: '₹',
        theme: 'light',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveLocalStore();
    }
    return inMemoryStore.settings[userId];
  };

  if (!isSupabaseAvailable()) {
    return getLocalSettings();
  }

  try {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    });

    if (res.isOffline || res.error) {
      if (res.error?.code === 'PGRST116') {
        const defaultSettings = {
          user_id: userId,
          default_buying_rate: 2.25,
          default_selling_rate: 2.25,
          currency: '₹',
          theme: 'light'
        };

        const createRes = await safeDbQuery(async () => {
          return dbClient
            .from('user_settings')
            .insert([defaultSettings])
            .select()
            .single();
        });

        if (createRes.data) {
          inMemoryStore.settings[userId] = createRes.data;
          saveLocalStore();
          return createRes.data;
        }
      }
      return getLocalSettings();
    }

    if (res.data) {
      inMemoryStore.settings[userId] = res.data;
      saveLocalStore();
      return res.data;
    }

    return getLocalSettings();
  } catch (err) {
    reportSupabaseError(err);
    return getLocalSettings();
  }
}

async function updateSettings(userId, data) {
  const buy = parseFloat(data.default_buying_rate);
  const sell = parseFloat(data.default_selling_rate);
  const updatePayload = {
    default_buying_rate: Number.isFinite(buy) && buy >= 0 ? buy : 2.25,
    default_selling_rate: Number.isFinite(sell) && sell >= 0 ? sell : 2.25,
    // Matches the VARCHAR(10) column; the value is rendered in the UI
    currency: typeof data.currency === 'string' && data.currency.trim() ? data.currency.trim().slice(0, 10) : '₹',
    theme: data.theme === 'dark' ? 'dark' : 'light',
    updated_at: new Date().toISOString()
  };

  assertWritableDb();

  if (!isDemo) {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('user_settings')
        .upsert({ user_id: userId, ...updatePayload })
        .select()
        .single();
    });
    const saved = unwrapWriteResult(res, 'Failed to save settings');
    inMemoryStore.settings[userId] = saved;
    saveLocalStore();
    return saved;
  }

  inMemoryStore.settings[userId] = {
    user_id: userId,
    ...(inMemoryStore.settings[userId] || {}),
    ...updatePayload
  };
  saveLocalStore();
  return inMemoryStore.settings[userId];
}

async function exportUserData(userId) {
  const settings = await getSettings(userId);

  let entries = [];
  if (!isSupabaseAvailable()) {
    entries = inMemoryStore.entries.filter(e => e.user_id === userId);
  } else {
    try {
      const res = await safeDbQuery(async () => {
        return dbClient
          .from('daily_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: false });
      });

      if (res.data) {
        entries = res.data;
      } else {
        entries = inMemoryStore.entries.filter(e => e.user_id === userId);
      }
    } catch {
      entries = inMemoryStore.entries.filter(e => e.user_id === userId);
    }
  }

  return {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    user_id: userId,
    settings,
    entries
  };
}

async function importUserData(userId, backupData) {
  if (!backupData || !Array.isArray(backupData.entries)) {
    throw new Error('Invalid backup file format');
  }
  assertWritableDb();

  const meterOrNull = v => (v === null || v === undefined || v === '' || isNaN(parseFloat(v)) ? null : parseFloat(v));

  // Last record per date wins, so one batch never contains the same (user_id, entry_date) twice
  const recordsByDate = new Map();
  for (const item of backupData.entries) {
    if (!item || typeof item.entry_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.entry_date)) continue;

    const metrics = calculateEntryMetrics({
      generatedUnits: item.generated_units,
      consumedUnits: item.consumed_units,
      buyingRate: item.buying_rate || backupData.settings?.default_buying_rate || 2.00,
      sellingRate: item.selling_rate || backupData.settings?.default_selling_rate || 2.25
    });

    recordsByDate.set(item.entry_date, {
      user_id: userId,
      entry_date: item.entry_date,
      ...metrics,
      opening_import_meter: meterOrNull(item.opening_import_meter),
      closing_import_meter: meterOrNull(item.closing_import_meter),
      opening_export_meter: meterOrNull(item.opening_export_meter),
      closing_export_meter: meterOrNull(item.closing_export_meter),
      notes: typeof item.notes === 'string' ? item.notes : '',
      updated_at: new Date().toISOString()
    });
  }
  const records = [...recordsByDate.values()];

  if (backupData.settings) {
    await updateSettings(userId, backupData.settings);
  }

  let savedRecords = records;
  if (!isDemo && records.length > 0) {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .upsert(records, { onConflict: 'user_id,entry_date' })
        .select();
    });
    savedRecords = unwrapWriteResult(res, 'Failed to restore entries') || records;
  }

  for (const record of savedRecords) {
    const idx = inMemoryStore.entries.findIndex(
      e => e.user_id === userId && e.entry_date === record.entry_date
    );
    if (idx >= 0) {
      inMemoryStore.entries[idx] = { ...inMemoryStore.entries[idx], ...record };
    } else {
      inMemoryStore.entries.push({
        id: record.id || (Math.random().toString(36).substring(2) + Date.now().toString(36)),
        created_at: new Date().toISOString(),
        ...record
      });
    }
  }

  saveLocalStore();
  return { importedCount: records.length };
}

module.exports = {
  getSettings,
  updateSettings,
  exportUserData,
  importUserData
};
