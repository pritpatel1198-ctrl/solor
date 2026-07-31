const { dbClient, isDemo, inMemoryStore } = require('../config/supabase');
const { calculateEntryMetrics } = require('../utils/calculations');

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
    notes: data.notes || '',
    updated_at: new Date().toISOString()
  };

  if (isDemo || !dbClient) {
    const existingIndex = inMemoryStore.entries.findIndex(
      e => e.user_id === userId && e.entry_date === data.entry_date
    );
    if (existingIndex >= 0) {
      throw new Error(`An entry already exists for date ${data.entry_date}`);
    }
    const newEntry = {
      id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      created_at: new Date().toISOString(),
      ...entryRecord
    };
    inMemoryStore.entries.unshift(newEntry);
    return newEntry;
  }

  const { data: inserted, error } = await dbClient
    .from('daily_entries')
    .insert([entryRecord])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`An entry already exists for date ${data.entry_date}`);
    }
    throw new Error(error.message);
  }

  return inserted;
}

async function getEntries(userId, query = {}) {
  const {
    startDate,
    endDate,
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'entry_date',
    sortOrder = 'desc'
  } = query;

  if (isDemo || !dbClient) {
    let list = inMemoryStore.entries.filter(e => e.user_id === userId);

    if (startDate) {
      list = list.filter(e => e.entry_date >= startDate);
    }
    if (endDate) {
      list = list.filter(e => e.entry_date <= endDate);
    }
    if (status && status !== 'all') {
      list = list.filter(e => e.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => 
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        e.entry_date.includes(q) ||
        e.generated_units.toString().includes(q) ||
        e.consumed_units.toString().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const total = list.length;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = list.slice(startIndex, startIndex + limitNum);

    return {
      entries: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  let dbQuery = dbClient
    .from('daily_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (startDate) dbQuery = dbQuery.gte('entry_date', startDate);
  if (endDate) dbQuery = dbQuery.lte('entry_date', endDate);
  if (status && status !== 'all') dbQuery = dbQuery.eq('status', status);
  if (search) dbQuery = dbQuery.ilike('notes', `%${search}%`);

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data: entries, count, error } = await dbQuery;

  if (error) {
    throw new Error(error.message);
  }

  return {
    entries: entries || [],
    pagination: {
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum) || 1
    }
  };
}

async function getEntryById(userId, id) {
  if (isDemo || !dbClient) {
    const entry = inMemoryStore.entries.find(e => e.user_id === userId && e.id === id);
    if (!entry) throw new Error('Entry not found');
    return entry;
  }

  const { data, error } = await dbClient
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Entry not found');
  return data;
}

async function updateEntry(userId, id, data) {
  const metrics = calculateEntryMetrics({
    generatedUnits: data.generated_units,
    consumedUnits: data.consumed_units,
    buyingRate: data.buying_rate,
    sellingRate: data.selling_rate
  });

  const updateData = {
    entry_date: data.entry_date,
    ...metrics,
    notes: data.notes || '',
    updated_at: new Date().toISOString()
  };

  if (isDemo || !dbClient) {
    const idx = inMemoryStore.entries.findIndex(e => e.user_id === userId && e.id === id);
    if (idx === -1) throw new Error('Entry not found');
    
    const conflict = inMemoryStore.entries.find(
      e => e.user_id === userId && e.entry_date === data.entry_date && e.id !== id
    );
    if (conflict) {
      throw new Error(`An entry already exists for date ${data.entry_date}`);
    }

    inMemoryStore.entries[idx] = {
      ...inMemoryStore.entries[idx],
      ...updateData
    };
    return inMemoryStore.entries[idx];
  }

  const { data: updated, error } = await dbClient
    .from('daily_entries')
    .update(updateData)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`An entry already exists for date ${data.entry_date}`);
    }
    throw new Error(error.message);
  }

  return updated;
}

async function deleteEntry(userId, id) {
  if (isDemo || !dbClient) {
    const idx = inMemoryStore.entries.findIndex(e => e.user_id === userId && e.id === id);
    if (idx === -1) throw new Error('Entry not found');
    inMemoryStore.entries.splice(idx, 1);
    return true;
  }

  const { error } = await dbClient
    .from('daily_entries')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

async function bulkDeleteEntries(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('No entry IDs provided for bulk deletion');
  }

  if (isDemo || !dbClient) {
    inMemoryStore.entries = inMemoryStore.entries.filter(
      e => !(e.user_id === userId && ids.includes(e.id))
    );
    return true;
  }

  const { error } = await dbClient
    .from('daily_entries')
    .delete()
    .eq('user_id', userId)
    .in('id', ids);

  if (error) throw new Error(error.message);
  return true;
}

module.exports = {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries
};
