const {
  dbClient,
  isDemo,
  inMemoryStore,
  isSupabaseAvailable,
  reportSupabaseError,
  saveLocalStore,
  safeDbQuery,
  HttpError,
  assertWritableDb,
  unwrapWriteResult
} = require('../config/supabase');
const { calculateEntryMetrics } = require('../utils/calculations');

/**
 * Propagate a day's closing meter readings to the immediate next chronological entry's opening meter readings.
 * Ensures strict chronological dependency: Day 1 Closing -> Day 2 Opening.
 * Does not overwrite manually entered closing values of subsequent days.
 */
async function syncDependentNextChronologicalEntry(userId, entryDate, closingImportMeter, closingExportMeter) {
  if (!entryDate) return null;
  if (closingImportMeter === null || closingImportMeter === undefined || isNaN(closingImportMeter)) return null;

  const numCloseImp = parseFloat(closingImportMeter);
  const numCloseExp = (closingExportMeter !== null && closingExportMeter !== undefined && !isNaN(closingExportMeter))
    ? parseFloat(closingExportMeter)
    : null;

  // 1. Find the next chronological entry for this user (earliest entry after entryDate)
  let nextEntry = null;

  if (isSupabaseAvailable()) {
    try {
      const res = await safeDbQuery(async () => {
        return dbClient
          .from('daily_entries')
          .select('*')
          .eq('user_id', userId)
          .gt('entry_date', entryDate)
          .order('entry_date', { ascending: true })
          .limit(1)
          .maybeSingle();
      });
      if (res && res.data) {
        nextEntry = res.data;
      }
    } catch (err) {
      reportSupabaseError(err);
    }
  }

  // In demo mode the local store is the database. With Supabase configured the local cache
  // may hold stale/deleted rows, so it must not be used to pick the entry to modify.
  if (!nextEntry && isDemo) {
    const sortedLocal = inMemoryStore.entries
      .filter(e => e.user_id === userId && e.entry_date > entryDate)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    nextEntry = sortedLocal[0] || null;
  }

  if (!nextEntry) {
    // No next chronological entry exists
    return null;
  }

  const nextId = nextEntry.id;

  // 2. Prepare payload for nextEntry (update opening meters while preserving closing meters)
  const nextUpdate = {
    opening_import_meter: numCloseImp,
    updated_at: new Date().toISOString()
  };

  if (numCloseExp !== null) {
    nextUpdate.opening_export_meter = numCloseExp;
  }

  // Recalculate consumed units if closing import meter is present and closing >= new opening
  let nextCon = parseFloat(nextEntry.consumed_units) || 0;
  let nextGen = parseFloat(nextEntry.generated_units) || 0;

  if (nextEntry.closing_import_meter !== null && nextEntry.closing_import_meter !== undefined) {
    const nextCloseImp = parseFloat(nextEntry.closing_import_meter);
    if (!isNaN(nextCloseImp) && nextCloseImp >= numCloseImp) {
      nextCon = parseFloat((nextCloseImp - numCloseImp).toFixed(2));
      nextUpdate.consumed_units = nextCon;
    }
  }

  // Recalculate generated units if closing export meter is present and closing >= new opening
  if (numCloseExp !== null && nextEntry.closing_export_meter !== null && nextEntry.closing_export_meter !== undefined) {
    const nextCloseExp = parseFloat(nextEntry.closing_export_meter);
    if (!isNaN(nextCloseExp) && nextCloseExp >= numCloseExp) {
      nextGen = parseFloat((nextCloseExp - numCloseExp).toFixed(2));
      nextUpdate.generated_units = nextGen;
    }
  }

  // Recalculate financial metrics for nextEntry
  const nextMetrics = calculateEntryMetrics({
    generatedUnits: nextUpdate.generated_units !== undefined ? nextUpdate.generated_units : nextGen,
    consumedUnits: nextUpdate.consumed_units !== undefined ? nextUpdate.consumed_units : nextCon,
    buyingRate: nextEntry.buying_rate,
    sellingRate: nextEntry.selling_rate
  });
  Object.assign(nextUpdate, nextMetrics);

  // 3. Persist to Supabase if online
  // The primary save already succeeded; a failure here is logged (not thrown) so the
  // user isn't told their save failed. The next entry keeps its previous opening meters.
  if (!isDemo) {
    try {
      const res = await safeDbQuery(async () => {
        return dbClient
          .from('daily_entries')
          .update(nextUpdate)
          .eq('user_id', userId)
          .eq('id', nextId);
      });
      if (res.isOffline || res.error) {
        console.error(`[Entries] Failed to propagate meters to next entry ${nextId}:`, res.error?.message);
        return null;
      }
    } catch (err) {
      reportSupabaseError(err);
      console.error(`[Entries] Failed to propagate meters to next entry ${nextId}:`, err.message);
      return null;
    }
  }

  // 4. Persist to local in-memory store and file
  const localIdx = inMemoryStore.entries.findIndex(e => e.id === nextId);
  if (localIdx >= 0) {
    inMemoryStore.entries[localIdx] = {
      ...inMemoryStore.entries[localIdx],
      ...nextUpdate
    };
  } else {
    inMemoryStore.entries.push({
      ...nextEntry,
      ...nextUpdate
    });
  }
  saveLocalStore();

  return inMemoryStore.entries.find(e => e.id === nextId) || nextEntry;
}

/**
 * Align all entries chronologically across the entire dataset to ensure complete consistency.
 */
function alignAllChronologicalMeterDependencies(userId) {
  const userEntries = inMemoryStore.entries
    .filter(e => e.user_id === userId)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  let modified = false;
  for (let i = 0; i < userEntries.length - 1; i++) {
    const current = userEntries[i];
    const next = userEntries[i + 1];

    if (current.closing_import_meter !== null && current.closing_import_meter !== undefined) {
      const closeImp = parseFloat(current.closing_import_meter);
      if (!isNaN(closeImp) && next.opening_import_meter !== closeImp) {
        next.opening_import_meter = closeImp;
        modified = true;
      }
    }
    if (current.closing_export_meter !== null && current.closing_export_meter !== undefined) {
      const closeExp = parseFloat(current.closing_export_meter);
      if (!isNaN(closeExp) && next.opening_export_meter !== closeExp) {
        next.opening_export_meter = closeExp;
        modified = true;
      }
    }
  }

  if (modified) {
    saveLocalStore();
  }
}

function saveEntryLocally(userId, entryRecord) {
  const existingIndex = inMemoryStore.entries.findIndex(
    e => e.user_id === userId && e.entry_date === entryRecord.entry_date
  );
  if (existingIndex >= 0) {
    inMemoryStore.entries[existingIndex] = {
      ...inMemoryStore.entries[existingIndex],
      ...entryRecord,
      updated_at: new Date().toISOString()
    };
    saveLocalStore();
    return inMemoryStore.entries[existingIndex];
  }
  const newEntry = {
    id: entryRecord.id || (Math.random().toString(36).substring(2) + Date.now().toString(36)),
    created_at: new Date().toISOString(),
    ...entryRecord
  };
  inMemoryStore.entries.unshift(newEntry);
  saveLocalStore();
  return newEntry;
}

async function createEntry(userId, data) {
  const metrics = calculateEntryMetrics({
    generatedUnits: data.generated_units,
    consumedUnits: data.consumed_units,
    buyingRate: data.buying_rate,
    sellingRate: data.selling_rate
  });

  const entryRecord = {
    user_id: userId,
    entry_date: data.entry_date,
    ...metrics,
    opening_import_meter: data.opening_import_meter ?? null,
    closing_import_meter: data.closing_import_meter ?? null,
    opening_export_meter: data.opening_export_meter ?? null,
    closing_export_meter: data.closing_export_meter ?? null,
    notes: data.notes || '',
    updated_at: new Date().toISOString()
  };

  let savedEntry = null;

  if (isDemo) {
    savedEntry = saveEntryLocally(userId, entryRecord);
  } else {
    assertWritableDb();
    let res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .insert([entryRecord])
        .select()
        .single();
    });

    // An entry already exists for this date: update it (existing upsert-by-date behaviour)
    if (res.error?.code === '23505') {
      res = await safeDbQuery(async () => {
        return dbClient
          .from('daily_entries')
          .update(entryRecord)
          .eq('user_id', userId)
          .eq('entry_date', data.entry_date)
          .select()
          .single();
      });
    }

    savedEntry = unwrapWriteResult(res, 'Failed to save entry');
    saveEntryLocally(userId, savedEntry);
  }

  // Update dependent next chronological entry
  if (entryRecord.closing_import_meter !== null && entryRecord.closing_import_meter !== undefined) {
    await syncDependentNextChronologicalEntry(
      userId,
      entryRecord.entry_date,
      entryRecord.closing_import_meter,
      entryRecord.closing_export_meter
    );
  }

  return savedEntry;
}

async function getEntries(userId, query = {}) {
  const { startDate, endDate, status, search } = query;
  const SORTABLE = ['entry_date', 'generated_units', 'consumed_units', 'net_units', 'revenue', 'payable', 'status', 'created_at'];
  const sortBy = SORTABLE.includes(query.sortBy) ? query.sortBy : 'entry_date';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit, 10) || 20));

  const getInMemory = () => {
    let list = inMemoryStore.entries.filter(e => e.user_id === userId);

    list = list.map(e => {
      if (parseFloat(e.buying_rate) > parseFloat(e.selling_rate) && parseFloat(e.selling_rate) > 0) {
        const recalculated = calculateEntryMetrics({
          generatedUnits: e.generated_units,
          consumedUnits: e.consumed_units,
          buyingRate: e.selling_rate,
          sellingRate: e.buying_rate
        });
        return { ...e, ...recalculated };
      }
      return e;
    });

    if (startDate) list = list.filter(e => e.entry_date >= startDate);
    if (endDate) list = list.filter(e => e.entry_date <= endDate);
    if (status && status !== 'all') list = list.filter(e => e.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        e.entry_date.includes(q) ||
        String(e.generated_units ?? '').includes(q) ||
        String(e.consumed_units ?? '').includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (['generated_units', 'consumed_units', 'net_units', 'revenue', 'payable', 'net_profit'].includes(sortBy)) {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const total = list.length;
    const from = (pageNum - 1) * limitNum;
    const paginated = list.slice(from, from + limitNum);

    return {
      entries: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  };

  if (!isSupabaseAvailable()) {
    return getInMemory();
  }

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const dbQueryFn = async () => {
      let q = dbClient
        .from('daily_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (startDate) q = q.gte('entry_date', startDate);
      if (endDate) q = q.lte('entry_date', endDate);
      if (status && status !== 'all') q = q.eq('status', status);
      if (search) q = q.ilike('notes', `%${search}%`);

      return q.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);
    };

    const res = await safeDbQuery(dbQueryFn);

    if (res.isOffline) {
      return getInMemory();
    }
    if (res.error) {
      throw new HttpError(400, `Failed to load entries: ${res.error.message}`);
    }

    const { data: entries, count } = res;

    // Cache to local store
    if (entries && entries.length > 0) {
      entries.forEach(e => {
        const idx = inMemoryStore.entries.findIndex(x => x.id === e.id);
        if (idx >= 0) inMemoryStore.entries[idx] = e;
        else inMemoryStore.entries.push(e);
      });
      saveLocalStore();
    }

    const formattedEntries = (entries || []).map(e => {
      if (parseFloat(e.buying_rate) > parseFloat(e.selling_rate) && parseFloat(e.selling_rate) > 0) {
        const recalculated = calculateEntryMetrics({
          generatedUnits: e.generated_units,
          consumedUnits: e.consumed_units,
          buyingRate: e.selling_rate,
          sellingRate: e.buying_rate
        });
        return { ...e, ...recalculated };
      }
      return e;
    });

    return {
      entries: formattedEntries,
      pagination: {
        total: count !== null && count !== undefined ? count : formattedEntries.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count || formattedEntries.length) / limitNum) || 1
      }
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    reportSupabaseError(err);
    return getInMemory();
  }
}

/**
 * Latest entry strictly before `beforeDate` (optionally excluding one id).
 * Uses Supabase when configured; the local store in demo mode or if Supabase is unreachable.
 */
async function findPreviousEntry(userId, beforeDate, excludeId = null) {
  const fromLocal = () => inMemoryStore.entries
    .filter(e => e.user_id === userId && e.entry_date < beforeDate && e.id !== excludeId)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0] || null;

  if (isDemo || !isSupabaseAvailable()) return fromLocal();

  const res = await safeDbQuery(async () => {
    let q = dbClient
      .from('daily_entries')
      .select('*')
      .eq('user_id', userId)
      .lt('entry_date', beforeDate);
    if (excludeId) q = q.neq('id', excludeId);
    return q.order('entry_date', { ascending: false }).limit(1).maybeSingle();
  });
  if (res.isOffline) return fromLocal();
  if (res.error) throw new HttpError(500, `Failed to load previous entry: ${res.error.message}`);
  return res.data || null;
}

async function relinkAfter(userId, prevEntry) {
  if (prevEntry && prevEntry.closing_import_meter !== null && prevEntry.closing_import_meter !== undefined) {
    await syncDependentNextChronologicalEntry(
      userId,
      prevEntry.entry_date,
      prevEntry.closing_import_meter,
      prevEntry.closing_export_meter
    );
  }
}

async function fetchOwnEntry(userId, id) {
  const fromLocal = () => inMemoryStore.entries.find(e => e.user_id === userId && e.id === id) || null;
  if (isDemo || !isSupabaseAvailable()) return fromLocal();

  const res = await safeDbQuery(async () => {
    return dbClient
      .from('daily_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
  });
  if (res.isOffline) return fromLocal();
  if (res.error) throw new HttpError(500, `Failed to load entry: ${res.error.message}`);
  return res.data || null;
}

async function getEntryById(userId, id) {
  const entry = await fetchOwnEntry(userId, id);
  if (!entry) throw new HttpError(404, 'Entry not found');

  // Verify and align opening meters with previous chronological closing meter if available
  const prevEntry = await findPreviousEntry(userId, entry.entry_date, entry.id);

  if (prevEntry) {
    if (prevEntry.closing_import_meter !== null && prevEntry.closing_import_meter !== undefined) {
      const prevCloseImp = parseFloat(prevEntry.closing_import_meter);
      if (!isNaN(prevCloseImp) && entry.opening_import_meter !== prevCloseImp) {
        entry.opening_import_meter = prevCloseImp;
      }
    }
    if (prevEntry.closing_export_meter !== null && prevEntry.closing_export_meter !== undefined) {
      const prevCloseExp = parseFloat(prevEntry.closing_export_meter);
      if (!isNaN(prevCloseExp) && entry.opening_export_meter !== prevCloseExp) {
        entry.opening_export_meter = prevCloseExp;
      }
    }
  }

  return entry;
}

async function updateEntry(userId, id, data) {
  assertWritableDb();

  // 1. Identify existing entry to detect date changes
  const existingEntry = await fetchOwnEntry(userId, id);
  if (!existingEntry) throw new HttpError(404, 'Entry not found');

  const oldDate = existingEntry.entry_date;
  const newDate = data.entry_date || oldDate;

  // 2. Calculate metrics for updated entry
  const metrics = calculateEntryMetrics({
    generatedUnits: data.generated_units,
    consumedUnits: data.consumed_units,
    buyingRate: data.buying_rate,
    sellingRate: data.selling_rate
  });

  const updateData = {
    entry_date: newDate,
    ...metrics,
    opening_import_meter: data.opening_import_meter ?? (existingEntry.opening_import_meter ?? null),
    closing_import_meter: data.closing_import_meter ?? null,
    opening_export_meter: data.opening_export_meter ?? (existingEntry.opening_export_meter ?? null),
    closing_export_meter: data.closing_export_meter ?? null,
    notes: data.notes || '',
    updated_at: new Date().toISOString()
  };

  let updatedRecord = null;

  if (isDemo) {
    const idx = inMemoryStore.entries.findIndex(e => e.user_id === userId && e.id === id);
    inMemoryStore.entries[idx] = { ...inMemoryStore.entries[idx], ...updateData };
    saveLocalStore();
    updatedRecord = inMemoryStore.entries[idx];
  } else {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .update(updateData)
        .eq('user_id', userId)
        .eq('id', id)
        .select()
        .single();
    });
    if (res.error?.code === '23505') {
      throw new HttpError(409, `Another entry already exists for ${newDate}. Edit that entry instead.`);
    }
    updatedRecord = unwrapWriteResult(res, 'Failed to update entry');

    const idx = inMemoryStore.entries.findIndex(e => e.user_id === userId && e.id === id);
    if (idx !== -1) inMemoryStore.entries[idx] = updatedRecord;
    else inMemoryStore.entries.push(updatedRecord);
    saveLocalStore();
  }

  // 3. Immediately propagate Closing Import & Export meters to the NEXT chronological meter entry
  if (updateData.closing_import_meter !== null && updateData.closing_import_meter !== undefined) {
    await syncDependentNextChronologicalEntry(
      userId,
      newDate,
      updateData.closing_import_meter,
      updateData.closing_export_meter
    );
  }

  // If entry_date changed, re-link previous entry for the old date
  if (oldDate !== newDate) {
    await relinkAfter(userId, await findPreviousEntry(userId, oldDate, id));
  }

  return updatedRecord;
}

async function deleteEntry(userId, id) {
  assertWritableDb();

  let deletedDate = null;

  if (isDemo) {
    const localIdx = inMemoryStore.entries.findIndex(e => e.user_id === userId && e.id === id);
    if (localIdx === -1) throw new HttpError(404, 'Entry not found');
    deletedDate = inMemoryStore.entries[localIdx].entry_date;
    inMemoryStore.entries.splice(localIdx, 1);
    saveLocalStore();
  } else {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
        .select();
    });
    const deletedRows = unwrapWriteResult(res, 'Failed to delete entry');
    if (!deletedRows || deletedRows.length === 0) throw new HttpError(404, 'Entry not found');
    deletedDate = deletedRows[0].entry_date;

    inMemoryStore.entries = inMemoryStore.entries.filter(e => !(e.user_id === userId && e.id === id));
    saveLocalStore();
  }

  // Re-link previous entry to the next entry upon deletion
  await relinkAfter(userId, await findPreviousEntry(userId, deletedDate));

  return true;
}

async function bulkDeleteEntries(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, 'No entry IDs provided for bulk deletion');
  }
  assertWritableDb();

  if (!isDemo) {
    const res = await safeDbQuery(async () => {
      return dbClient
        .from('daily_entries')
        .delete()
        .eq('user_id', userId)
        .in('id', ids);
    });
    unwrapWriteResult(res, 'Failed to delete entries');
  }

  inMemoryStore.entries = inMemoryStore.entries.filter(
    e => !(e.user_id === userId && ids.includes(e.id))
  );
  saveLocalStore();
  return true;
}

// Initial alignment pass on module load (demo/local store only)
if (isDemo) {
  try {
    alignAllChronologicalMeterDependencies('42d532a5-8e20-4bed-9122-6ee8381384c4');
  } catch (err) {
    console.warn('[Entries] Local meter alignment failed:', err.message);
  }
}


module.exports = {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries,
  syncDependentNextChronologicalEntry,
  alignAllChronologicalMeterDependencies
};
