const { dbClient, isDemo, inMemoryStore } = require('../config/supabase');
const { calculateEntryMetrics } = require('../utils/calculations');

async function getSettings(userId) {
  if (isDemo || !dbClient) {
    if (!inMemoryStore.settings[userId]) {
      inMemoryStore.settings[userId] = {
        user_id: userId,
        default_buying_rate: 2.00,
        default_selling_rate: 7.00,
        currency: '₹',
        theme: 'light',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    return inMemoryStore.settings[userId];
  }

  const { data, error } = await dbClient
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Record does not exist, insert default settings for this user UUID
    const defaultSettings = {
      user_id: userId,
      default_buying_rate: 2.00,
      default_selling_rate: 7.00,
      currency: '₹',
      theme: 'light'
    };

    const { data: created, error: createError } = await dbClient
      .from('user_settings')
      .insert([defaultSettings])
      .select()
      .single();

    if (createError) throw new Error(createError.message);
    return created;
  }

  if (error) throw new Error(error.message);
  return data;
}

async function updateSettings(userId, data) {
  const updatePayload = {
    default_buying_rate: parseFloat(data.default_buying_rate) || 2.00,
    default_selling_rate: parseFloat(data.default_selling_rate) || 7.00,
    currency: data.currency || '₹',
    theme: data.theme || 'light',
    updated_at: new Date().toISOString()
  };

  if (isDemo || !dbClient) {
    inMemoryStore.settings[userId] = {
      user_id: userId,
      ...inMemoryStore.settings[userId],
      ...updatePayload
    };
    return inMemoryStore.settings[userId];
  }

  const { data: updated, error } = await dbClient
    .from('user_settings')
    .upsert({ user_id: userId, ...updatePayload })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

async function exportUserData(userId) {
  const settings = await getSettings(userId);

  let entries = [];
  if (isDemo || !dbClient) {
    entries = inMemoryStore.entries.filter(e => e.user_id === userId);
  } else {
    const { data, error } = await dbClient
      .from('daily_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (error) throw new Error(error.message);
    entries = data || [];
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

  if (backupData.settings) {
    await updateSettings(userId, backupData.settings);
  }

  let importedCount = 0;
  for (const item of backupData.entries) {
    if (!item.entry_date) continue;

    const metrics = calculateEntryMetrics({
      generatedUnits: item.generated_units,
      consumedUnits: item.consumed_units,
      buyingRate: item.buying_rate || backupData.settings?.default_buying_rate || 2.00,
      sellingRate: item.selling_rate || backupData.settings?.default_selling_rate || 7.00
    });

    const entryRecord = {
      user_id: userId,
      entry_date: item.entry_date,
      ...metrics,
      notes: item.notes || '',
      updated_at: new Date().toISOString()
    };

    if (isDemo || !dbClient) {
      const idx = inMemoryStore.entries.findIndex(
        e => e.user_id === userId && e.entry_date === item.entry_date
      );
      if (idx >= 0) {
        inMemoryStore.entries[idx] = { ...inMemoryStore.entries[idx], ...entryRecord };
      } else {
        inMemoryStore.entries.push({
          id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
          created_at: new Date().toISOString(),
          ...entryRecord
        });
      }
      importedCount++;
    } else {
      const { error } = await dbClient
        .from('daily_entries')
        .upsert(entryRecord, { onConflict: 'user_id, entry_date' });

      if (!error) importedCount++;
    }
  }

  return { importedCount };
}

module.exports = {
  getSettings,
  updateSettings,
  exportUserData,
  importUserData
};
