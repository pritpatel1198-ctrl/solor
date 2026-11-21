const {
  dbClient,
  inMemoryStore,
  isSupabaseAvailable,
  reportSupabaseError,
  safeDbQuery,
  saveLocalStore
} = require('../config/supabase');
const { todayInAppTz, nowInAppTz } = require('../utils/dates');

async function getAllUserEntries(userId) {
  const getFromLocal = () => {
    return inMemoryStore.entries
      .filter(e => e.user_id === userId)
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
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
        .order('entry_date', { ascending: false });
    });

    if (res.isOffline || res.error || !res.data) {
      return getFromLocal();
    }

    // Cache to local store
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

async function getDashboardSummary(userId) {
  const entries = await getAllUserEntries(userId);

  const todayStr = todayInAppTz();
  const currentMonthPrefix = todayStr.substring(0, 7);
  const currentYearPrefix = todayStr.substring(0, 4);

  let todayGen = 0;
  let todayCon = 0;
  let todayRev = 0;
  let todayPayable = 0;

  let monthRev = 0;
  let monthExpense = 0;
  let monthGen = 0;
  let monthCon = 0;

  let yearRev = 0;
  let yearExpense = 0;
  let yearGen = 0;
  let yearCon = 0;

  let lifetimeRev = 0;
  let lifetimeExpense = 0;
  let lifetimeGen = 0;
  let lifetimeCon = 0;

  entries.forEach(e => {
    const gen = parseFloat(e.generated_units) || 0;
    const con = parseFloat(e.consumed_units) || 0;
    const rev = parseFloat(e.revenue) || 0;
    const pay = parseFloat(e.payable) || 0;

    if (e.entry_date === todayStr) {
      todayGen += gen;
      todayCon += con;
      todayRev += rev;
      todayPayable += pay;
    }

    if (e.entry_date.startsWith(currentMonthPrefix)) {
      monthRev += rev;
      monthExpense += pay;
      monthGen += gen;
      monthCon += con;
    }

    if (e.entry_date.startsWith(currentYearPrefix)) {
      yearRev += rev;
      yearExpense += pay;
      yearGen += gen;
      yearCon += con;
    }

    lifetimeRev += rev;
    lifetimeExpense += pay;
    lifetimeGen += gen;
    lifetimeCon += con;
  });

  const monthProfit = parseFloat((monthRev - monthExpense).toFixed(2));
  const yearProfit = parseFloat((yearRev - yearExpense).toFixed(2));
  const lifetimeNetProfit = parseFloat((lifetimeRev - lifetimeExpense).toFixed(2));

  let latestClosingImportMeter = null;
  let latestClosingExportMeter = null;
  let latestReadingDate = null;

  if (entries.length > 0) {
    for (const e of entries) {
      if (latestClosingImportMeter === null) {
        if (e.closing_import_meter !== null && e.closing_import_meter !== undefined) {
          latestClosingImportMeter = parseFloat(e.closing_import_meter);
          latestReadingDate = e.entry_date;
        } else if (e.opening_import_meter !== null && e.opening_import_meter !== undefined && e.consumed_units !== undefined) {
          latestClosingImportMeter = parseFloat((parseFloat(e.opening_import_meter) + parseFloat(e.consumed_units)).toFixed(2));
          latestReadingDate = e.entry_date;
        }
      }

      if (latestClosingExportMeter === null) {
        if (e.closing_export_meter !== null && e.closing_export_meter !== undefined) {
          latestClosingExportMeter = parseFloat(e.closing_export_meter);
          if (!latestReadingDate) latestReadingDate = e.entry_date;
        } else if (e.opening_export_meter !== null && e.opening_export_meter !== undefined && e.generated_units !== undefined) {
          latestClosingExportMeter = parseFloat((parseFloat(e.opening_export_meter) + parseFloat(e.generated_units)).toFixed(2));
          if (!latestReadingDate) latestReadingDate = e.entry_date;
        }
      }

      if (latestClosingImportMeter !== null && latestClosingExportMeter !== null) break;
    }
  }

  const recentEntries = entries.slice(0, 5);

  return {
    latest: {
      import_meter: latestClosingImportMeter,
      export_meter: latestClosingExportMeter,
      reading_date: latestReadingDate
    },
    today: {
      generated: parseFloat(todayGen.toFixed(2)),
      consumed: parseFloat(todayCon.toFixed(2)),
      revenue: parseFloat(todayRev.toFixed(2)),
      payable: parseFloat(todayPayable.toFixed(2))
    },
    month: {
      generated: parseFloat(monthGen.toFixed(2)),
      consumed: parseFloat(monthCon.toFixed(2)),
      revenue: parseFloat(monthRev.toFixed(2)),
      expense: parseFloat(monthExpense.toFixed(2)),
      net_profit: monthProfit
    },
    year: {
      generated: parseFloat(yearGen.toFixed(2)),
      consumed: parseFloat(yearCon.toFixed(2)),
      revenue: parseFloat(yearRev.toFixed(2)),
      expense: parseFloat(yearExpense.toFixed(2)),
      net_profit: yearProfit
    },
    lifetime: {
      generated: parseFloat(lifetimeGen.toFixed(2)),
      consumed: parseFloat(lifetimeCon.toFixed(2)),
      revenue: parseFloat(lifetimeRev.toFixed(2)),
      expense: parseFloat(lifetimeExpense.toFixed(2)),
      net_profit: lifetimeNetProfit
    },
    recentEntries
  };
}

function getISODateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveReportDateBounds(options = {}) {
  const { period = 'monthly', startDate, endDate, financialYear } = options;
  const now = nowInAppTz();
  const todayStr = getISODateString(now);

  if (startDate && endDate) {
    const s = startDate <= endDate ? startDate : endDate;
    const e = startDate <= endDate ? endDate : startDate;
    return {
      periodType: 'custom',
      startDate: s,
      endDate: e,
      label: `${s} to ${e}`
    };
  }

  if (financialYear) {
    let fyStartYear = parseInt(String(financialYear).split('-')[0], 10);
    if (isNaN(fyStartYear)) {
      fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    }
    const s = `${fyStartYear}-04-01`;
    const e = `${fyStartYear + 1}-03-31`;
    return {
      periodType: 'financial_year',
      startDate: s,
      endDate: e,
      label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`
    };
  }

  const normalized = (period || 'monthly').toLowerCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'today':
    case 'daily': {
      return {
        periodType: 'daily',
        startDate: todayStr,
        endDate: todayStr,
        label: `Today (${todayStr})`
      };
    }
    case 'this_week':
    case 'weekly': {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.getFullYear(), now.getMonth(), diffToMon);
      const sun = new Date(now.getFullYear(), now.getMonth(), diffToMon + 6);
      const s = getISODateString(mon);
      const e = getISODateString(sun);
      return {
        periodType: 'weekly',
        startDate: s,
        endDate: e,
        label: `This Week (${s} to ${e})`
      };
    }
    case 'this_month':
    case 'monthly': {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const s = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const e = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        periodType: 'monthly',
        startDate: s,
        endDate: e,
        label: `This Month (${year}-${String(month + 1).padStart(2, '0')})`
      };
    }
    case 'previous_month':
    case 'last_month': {
      const year = now.getFullYear();
      const month = now.getMonth();
      const prevDate = new Date(year, month - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const s = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
      const e = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        periodType: 'previous_month',
        startDate: s,
        endDate: e,
        label: `Previous Month (${prevYear}-${String(prevMonth + 1).padStart(2, '0')})`
      };
    }
    case 'this_quarter':
    case 'quarterly': {
      const year = now.getFullYear();
      const month = now.getMonth();
      const qIndex = Math.floor(month / 3);
      const startMonth = qIndex * 3;
      const endMonth = startMonth + 2;
      const lastDay = new Date(year, endMonth + 1, 0).getDate();
      const s = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
      const e = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        periodType: 'quarterly',
        startDate: s,
        endDate: e,
        label: `Q${qIndex + 1} ${year} (${s} to ${e})`
      };
    }
    case 'this_financial_year':
    case 'this_fy':
    case 'financial_year': {
      const year = now.getFullYear();
      const month = now.getMonth();
      const startYear = month >= 3 ? year : year - 1;
      const s = `${startYear}-04-01`;
      const e = `${startYear + 1}-03-31`;
      return {
        periodType: 'this_financial_year',
        startDate: s,
        endDate: e,
        label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`
      };
    }
    case 'previous_financial_year':
    case 'previous_fy': {
      const year = now.getFullYear();
      const month = now.getMonth();
      const startYear = (month >= 3 ? year : year - 1) - 1;
      const s = `${startYear}-04-01`;
      const e = `${startYear + 1}-03-31`;
      return {
        periodType: 'previous_financial_year',
        startDate: s,
        endDate: e,
        label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`
      };
    }
    case 'yearly':
    case 'this_year': {
      const year = now.getFullYear();
      const s = `${year}-01-01`;
      const e = `${year}-12-31`;
      return {
        periodType: 'yearly',
        startDate: s,
        endDate: e,
        label: `Year ${year}`
      };
    }
    case 'lifetime':
    case 'all': {
      return {
        periodType: 'lifetime',
        startDate: null,
        endDate: null,
        label: 'Lifetime (All Time)'
      };
    }
    default: {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const s = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const e = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        periodType: 'monthly',
        startDate: s,
        endDate: e,
        label: `This Month (${year}-${String(month + 1).padStart(2, '0')})`
      };
    }
  }
}

async function getReports(userId, options = 'monthly') {
  const filterParams = typeof options === 'string' ? { period: options } : (options || {});
  const { period = 'monthly', startDate, endDate, status = 'all', financialYear, search = '', groupBy } = filterParams;

  const entries = await getAllUserEntries(userId);
  const bounds = resolveReportDateBounds({ period, startDate, endDate, financialYear });

  // 1. Filter entries strictly based on date boundaries, status, and search
  const filteredEntries = entries.filter(e => {
    if (bounds.startDate && e.entry_date < bounds.startDate) return false;
    if (bounds.endDate && e.entry_date > bounds.endDate) return false;

    if (status && status !== 'all') {
      if ((e.status || '').toLowerCase() !== status.toLowerCase()) return false;
    }

    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      const matchNotes = (e.notes || '').toLowerCase().includes(term);
      const matchDate = (e.entry_date || '').includes(term);
      if (!matchNotes && !matchDate) return false;
    }

    return true;
  });

  // Sort filtered entries chronologically (oldest to newest for analysis/reports)
  const chronologicalEntries = [...filteredEntries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  // 2. Handle Empty Result - NEVER fall back to all entries
  if (chronologicalEntries.length === 0) {
    return {
      period: bounds.periodType,
      label: bounds.label,
      date_bounds: {
        start_date: bounds.startDate,
        end_date: bounds.endDate
      },
      filters: {
        period,
        status,
        search
      },
      summary: {
        total_generated: 0,
        total_consumed: 0,
        total_net_units: 0,
        total_export_units: 0,
        total_import_units: 0,
        total_revenue: 0,
        total_expense: 0,
        net_profit: 0,
        entry_count: 0,
        average_daily_generated: 0,
        average_daily_consumed: 0,
        average_daily_revenue: 0,
        average_daily_expense: 0,
        average_daily_profit: 0,
        solar_coverage_ratio: 0,
        solar_export_ratio: 0,
        self_consumption_units: 0,
        self_consumption_ratio: 0,
        profit_margin: 0,
        highest_day: null,
        lowest_day: null,
        peak_revenue_day: null,
        peak_expense_day: null
      },
      variance: {
        prior_period: null,
        generation_diff: 0,
        generation_growth_pct: 0,
        revenue_diff: 0,
        revenue_growth_pct: 0,
        profit_diff: 0
      },
      grouped: [],
      entries: []
    };
  }

  // 3. Compute Filtered Aggregates
  let totalGen = 0;
  let totalCon = 0;
  let totalNet = 0;
  let totalExport = 0;
  let totalImport = 0;
  let totalRev = 0;
  let totalExp = 0;

  let highestDay = chronologicalEntries[0];
  let lowestDay = chronologicalEntries[0];
  let peakRevDay = chronologicalEntries[0];
  let peakExpDay = chronologicalEntries[0];

  chronologicalEntries.forEach(e => {
    const gen = parseFloat(e.generated_units) || 0;
    const con = parseFloat(e.consumed_units) || 0;
    const net = parseFloat(e.net_units) || 0;
    const rev = parseFloat(e.revenue) || 0;
    const exp = parseFloat(e.payable) || 0;

    totalGen += gen;
    totalCon += con;
    totalNet += net;
    totalRev += rev;
    totalExp += exp;

    if (net > 0) totalExport += net;
    if (net < 0) totalImport += Math.abs(net);

    const highestGen = parseFloat(highestDay.generated_units) || 0;
    const lowestGen = parseFloat(lowestDay.generated_units) || 0;
    const maxRev = parseFloat(peakRevDay.revenue) || 0;
    const maxExp = parseFloat(peakExpDay.payable) || 0;

    if (gen > highestGen) highestDay = e;
    if (gen < lowestGen) lowestDay = e;
    if (rev > maxRev) peakRevDay = e;
    if (exp > maxExp) peakExpDay = e;
  });

  const entryCount = chronologicalEntries.length;
  const netProfit = parseFloat((totalRev - totalExp).toFixed(2));
  const avgGen = parseFloat((totalGen / entryCount).toFixed(2));
  const avgCon = parseFloat((totalCon / entryCount).toFixed(2));
  const avgRev = parseFloat((totalRev / entryCount).toFixed(2));
  const avgExp = parseFloat((totalExp / entryCount).toFixed(2));
  const avgProfit = parseFloat((netProfit / entryCount).toFixed(2));

  const solarCoverageRatio = totalCon > 0
    ? parseFloat(((totalGen / totalCon) * 100).toFixed(2))
    : (totalGen > 0 ? 100 : 0);

  const solarExportRatio = totalGen > 0
    ? parseFloat(((totalExport / totalGen) * 100).toFixed(2))
    : 0;

  const selfConsumptionUnits = parseFloat(Math.max(0, totalGen - totalExport).toFixed(2));
  const selfConsumptionRatio = totalGen > 0
    ? parseFloat(((selfConsumptionUnits / totalGen) * 100).toFixed(2))
    : 0;

  const profitMargin = totalRev > 0
    ? parseFloat(((netProfit / totalRev) * 100).toFixed(2))
    : (totalExp > 0 ? -100 : 0);

  // 4. Compute Prior-Period Variance (for comparative analysis)
  let variance = {
    prior_period: null,
    generation_diff: 0,
    generation_growth_pct: 0,
    revenue_diff: 0,
    revenue_growth_pct: 0,
    profit_diff: 0
  };

  if (bounds.startDate && bounds.endDate) {
    const startMs = new Date(bounds.startDate).getTime();
    const endMs = new Date(bounds.endDate).getTime();
    const durationDays = Math.max(1, Math.round((endMs - startMs) / (86400000)) + 1);

    const priorEndMs = startMs - 86400000;
    const priorStartMs = priorEndMs - (durationDays - 1) * 86400000;

    const priorStartStr = getISODateString(new Date(priorStartMs));
    const priorEndStr = getISODateString(new Date(priorEndMs));

    const priorEntries = entries.filter(e => {
      return e.entry_date >= priorStartStr && e.entry_date <= priorEndStr;
    });

    if (priorEntries.length > 0) {
      let priorGen = 0;
      let priorCon = 0;
      let priorRev = 0;
      let priorExp = 0;

      priorEntries.forEach(e => {
        priorGen += parseFloat(e.generated_units) || 0;
        priorCon += parseFloat(e.consumed_units) || 0;
        priorRev += parseFloat(e.revenue) || 0;
        priorExp += parseFloat(e.payable) || 0;
      });

      const priorProfit = parseFloat((priorRev - priorExp).toFixed(2));
      const genDiff = parseFloat((totalGen - priorGen).toFixed(2));
      const genGrowthPct = priorGen > 0
        ? parseFloat(((genDiff / priorGen) * 100).toFixed(2))
        : (totalGen > 0 ? 100 : 0);

      const revDiff = parseFloat((totalRev - priorRev).toFixed(2));
      const revGrowthPct = priorRev > 0
        ? parseFloat(((revDiff / priorRev) * 100).toFixed(2))
        : (totalRev > 0 ? 100 : 0);

      const profitDiff = parseFloat((netProfit - priorProfit).toFixed(2));

      variance = {
        prior_period: {
          start_date: priorStartStr,
          end_date: priorEndStr,
          total_generated: parseFloat(priorGen.toFixed(2)),
          total_consumed: parseFloat(priorCon.toFixed(2)),
          total_revenue: parseFloat(priorRev.toFixed(2)),
          total_expense: parseFloat(priorExp.toFixed(2)),
          net_profit: priorProfit
        },
        generation_diff: genDiff,
        generation_growth_pct: genGrowthPct,
        revenue_diff: revDiff,
        revenue_growth_pct: revGrowthPct,
        profit_diff: profitDiff
      };
    }
  }

  // 5. Group Filtered Entries for Periodic Breakdown Table
  // Decide grouping resolution based on duration or override
  let groupingResolution = groupBy;
  if (!groupingResolution) {
    if (bounds.periodType === 'daily' || chronologicalEntries.length <= 31) {
      groupingResolution = 'daily';
    } else if (bounds.periodType === 'weekly' || chronologicalEntries.length <= 120) {
      groupingResolution = 'weekly';
    } else if (bounds.periodType === 'quarterly' || bounds.periodType === 'this_quarter') {
      groupingResolution = 'monthly';
    } else if (bounds.periodType === 'yearly' || bounds.periodType === 'financial_year') {
      groupingResolution = 'monthly';
    } else {
      groupingResolution = 'monthly';
    }
  }

  const groupsMap = {};

  chronologicalEntries.forEach(e => {
    let key;
    const dateObj = new Date(e.entry_date);

    if (groupingResolution === 'daily') {
      key = e.entry_date;
    } else if (groupingResolution === 'weekly') {
      const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      key = `${dateObj.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
    } else if (groupingResolution === 'monthly') {
      key = e.entry_date.substring(0, 7);
    } else if (groupingResolution === 'quarterly') {
      const m = dateObj.getMonth() + 1;
      const q = Math.ceil(m / 3);
      key = `${dateObj.getFullYear()}-Q${q}`;
    } else if (groupingResolution === 'yearly') {
      key = e.entry_date.substring(0, 4);
    } else {
      key = e.entry_date.substring(0, 7);
    }

    if (!groupsMap[key]) {
      groupsMap[key] = {
        group_key: key,
        solar_generated: 0,
        grid_consumption: 0,
        export_units: 0,
        import_units: 0,
        revenue: 0,
        expense: 0,
        count: 0
      };
    }

    const gen = parseFloat(e.generated_units) || 0;
    const con = parseFloat(e.consumed_units) || 0;
    const net = parseFloat(e.net_units) || 0;
    const rev = parseFloat(e.revenue) || 0;
    const exp = parseFloat(e.payable) || 0;

    groupsMap[key].solar_generated += gen;
    groupsMap[key].grid_consumption += con;
    if (net > 0) groupsMap[key].export_units += net;
    if (net < 0) groupsMap[key].import_units += Math.abs(net);
    groupsMap[key].revenue += rev;
    groupsMap[key].expense += exp;
    groupsMap[key].count += 1;
  });

  const grouped = Object.values(groupsMap).map(g => {
    const netP = parseFloat((g.revenue - g.expense).toFixed(2));
    const avg = parseFloat((g.solar_generated / (g.count || 1)).toFixed(2));
    const coverage = g.grid_consumption > 0
      ? parseFloat(((g.solar_generated / g.grid_consumption) * 100).toFixed(2))
      : (g.solar_generated > 0 ? 100 : 0);

    return {
      group_key: g.group_key,
      solar_generated: parseFloat(g.solar_generated.toFixed(2)),
      grid_consumption: parseFloat(g.grid_consumption.toFixed(2)),
      export_units: parseFloat(g.export_units.toFixed(2)),
      import_units: parseFloat(g.import_units.toFixed(2)),
      revenue: parseFloat(g.revenue.toFixed(2)),
      expense: parseFloat(g.expense.toFixed(2)),
      net_profit: netP,
      average_units: avg,
      coverage_ratio: coverage,
      entry_count: g.count
    };
  });

  // 6. Detailed Entry Transactions (sorted descending by date for ledger preview)
  const entriesList = [...chronologicalEntries].reverse().map(e => {
    const gen = parseFloat(e.generated_units) || 0;
    const con = parseFloat(e.consumed_units) || 0;
    const net = parseFloat(e.net_units) || 0;
    const rev = parseFloat(e.revenue) || 0;
    const exp = parseFloat(e.payable) || 0;
    const buyR = parseFloat(e.buying_rate) || 0;
    const sellR = parseFloat(e.selling_rate) || 0;

    return {
      id: e.id,
      entry_date: e.entry_date,
      generated_units: gen,
      consumed_units: con,
      net_units: net,
      export_units: net > 0 ? net : 0,
      import_units: net < 0 ? Math.abs(net) : 0,
      buying_rate: buyR,
      selling_rate: sellR,
      revenue: rev,
      expense: exp,
      net_profit: parseFloat((rev - exp).toFixed(2)),
      status: e.status,
      opening_import_meter: e.opening_import_meter,
      closing_import_meter: e.closing_import_meter,
      opening_export_meter: e.opening_export_meter,
      closing_export_meter: e.closing_export_meter,
      notes: e.notes || ''
    };
  });

  return {
    period: bounds.periodType,
    label: bounds.label,
    date_bounds: {
      start_date: bounds.startDate,
      end_date: bounds.endDate
    },
    filters: {
      period,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      status,
      search,
      financialYear
    },
    summary: {
      total_generated: parseFloat(totalGen.toFixed(2)),
      total_consumed: parseFloat(totalCon.toFixed(2)),
      total_net_units: parseFloat(totalNet.toFixed(2)),
      total_export_units: parseFloat(totalExport.toFixed(2)),
      total_import_units: parseFloat(totalImport.toFixed(2)),
      total_revenue: parseFloat(totalRev.toFixed(2)),
      total_expense: parseFloat(totalExp.toFixed(2)),
      net_profit: netProfit,
      entry_count: entryCount,
      average_daily_generated: avgGen,
      average_daily_consumed: avgCon,
      average_daily_revenue: avgRev,
      average_daily_expense: avgExp,
      average_daily_profit: avgProfit,
      solar_coverage_ratio: solarCoverageRatio,
      solar_export_ratio: solarExportRatio,
      self_consumption_units: selfConsumptionUnits,
      self_consumption_ratio: selfConsumptionRatio,
      profit_margin: profitMargin,
      highest_day: highestDay ? { date: highestDay.entry_date, generated: parseFloat(highestDay.generated_units) } : null,
      lowest_day: lowestDay ? { date: lowestDay.entry_date, generated: parseFloat(lowestDay.generated_units) } : null,
      peak_revenue_day: peakRevDay ? { date: peakRevDay.entry_date, revenue: parseFloat(peakRevDay.revenue) } : null,
      peak_expense_day: peakExpDay ? { date: peakExpDay.entry_date, payable: parseFloat(peakExpDay.payable) } : null
    },
    variance,
    grouped,
    entries: entriesList
  };
}

module.exports = {
  getDashboardSummary,
  getReports
};
