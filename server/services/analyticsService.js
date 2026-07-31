const { dbClient, isDemo, inMemoryStore } = require('../config/supabase');

async function getAllUserEntries(userId) {
  if (isDemo || !dbClient) {
    return inMemoryStore.entries
      .filter(e => e.user_id === userId)
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }

  const { data, error } = await dbClient
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function getDashboardSummary(userId) {
  const entries = await getAllUserEntries(userId);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);
  const currentYearPrefix = todayStr.substring(0, 4);

  let todayGen = 0;
  let todayCon = 0;
  let todayRev = 0;
  let todayPayable = 0;

  let monthRev = 0;
  let monthExpense = 0;

  let yearRev = 0;
  let yearExpense = 0;

  let lifetimeRev = 0;
  let lifetimeExpense = 0;

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
    }

    if (e.entry_date.startsWith(currentYearPrefix)) {
      yearRev += rev;
      yearExpense += pay;
    }

    lifetimeRev += rev;
    lifetimeExpense += pay;
  });

  const monthProfit = parseFloat((monthRev - monthExpense).toFixed(2));
  const yearProfit = parseFloat((yearRev - yearExpense).toFixed(2));
  const lifetimeNetProfit = parseFloat((lifetimeRev - lifetimeExpense).toFixed(2));

  const recentEntries = entries.slice(0, 5);

  return {
    today: {
      generated: parseFloat(todayGen.toFixed(2)),
      consumed: parseFloat(todayCon.toFixed(2)),
      revenue: parseFloat(todayRev.toFixed(2)),
      payable: parseFloat(todayPayable.toFixed(2))
    },
    month: {
      revenue: parseFloat(monthRev.toFixed(2)),
      expense: parseFloat(monthExpense.toFixed(2)),
      net_profit: monthProfit
    },
    year: {
      revenue: parseFloat(yearRev.toFixed(2)),
      expense: parseFloat(yearExpense.toFixed(2)),
      net_profit: yearProfit
    },
    lifetime: {
      revenue: parseFloat(lifetimeRev.toFixed(2)),
      expense: parseFloat(lifetimeExpense.toFixed(2)),
      net_profit: lifetimeNetProfit
    },
    recentEntries
  };
}

async function getReports(userId, period = 'monthly') {
  const entries = await getAllUserEntries(userId);

  if (entries.length === 0) {
    return {
      period,
      summary: {
        total_generated: 0,
        total_consumed: 0,
        total_export_units: 0,
        total_import_units: 0,
        total_revenue: 0,
        total_expense: 0,
        net_profit: 0,
        average_units: 0,
        highest_day: null,
        lowest_day: null
      },
      grouped: []
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date();
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  // Filter entries for Summary Cards based on period
  let periodEntries = [];

  if (period === 'daily') {
    periodEntries = entries.filter(e => e.entry_date === todayStr);
  } else if (period === 'weekly') {
    const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    periodEntries = entries.filter(e => e.entry_date >= sevenDaysAgo && e.entry_date <= todayStr);
  } else if (period === 'monthly') {
    periodEntries = entries.filter(e => e.entry_date.startsWith(currentMonthStr));
  } else if (period === 'quarterly') {
    const currentMonth = todayDate.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    periodEntries = entries.filter(e => {
      const d = new Date(e.entry_date);
      const m = d.getMonth() + 1;
      const q = Math.ceil(m / 3);
      return d.getFullYear().toString() === currentYearStr && q === currentQuarter;
    });
  } else if (period === 'yearly') {
    periodEntries = entries.filter(e => e.entry_date.startsWith(currentYearStr));
  } else {
    periodEntries = [...entries];
  }

  // Fallback to all entries if period has no entries recorded yet
  if (periodEntries.length === 0) {
    periodEntries = [...entries];
  }

  // Calculate Period Summary Metrics
  let totalGen = 0;
  let totalCon = 0;
  let totalExport = 0;
  let totalImport = 0;
  let totalRev = 0;
  let totalExp = 0;

  let highestDay = periodEntries[0];
  let lowestDay = periodEntries[0];

  periodEntries.forEach(e => {
    const gen = parseFloat(e.generated_units) || 0;
    const con = parseFloat(e.consumed_units) || 0;
    const net = parseFloat(e.net_units) || 0;
    const rev = parseFloat(e.revenue) || 0;
    const exp = parseFloat(e.payable) || 0;

    totalGen += gen;
    totalCon += con;
    totalRev += rev;
    totalExp += exp;

    if (net > 0) totalExport += net;
    if (net < 0) totalImport += Math.abs(net);

    if (gen > (parseFloat(highestDay.generated_units) || 0)) {
      highestDay = e;
    }
    if (gen < (parseFloat(lowestDay.generated_units) || 0)) {
      lowestDay = e;
    }
  });

  const avgUnits = parseFloat((totalGen / (periodEntries.length || 1)).toFixed(2));
  const netProfit = parseFloat((totalRev - totalExp).toFixed(2));

  // Group entries by period for Table Breakdown
  const groupsMap = {};

  entries.forEach(e => {
    let key;
    const dateObj = new Date(e.entry_date);

    if (period === 'daily') {
      key = e.entry_date;
    } else if (period === 'weekly') {
      const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      key = `${dateObj.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
    } else if (period === 'monthly') {
      key = e.entry_date.substring(0, 7);
    } else if (period === 'quarterly') {
      const month = dateObj.getMonth() + 1;
      const quarter = Math.ceil(month / 3);
      key = `${dateObj.getFullYear()}-Q${quarter}`;
    } else if (period === 'yearly') {
      key = e.entry_date.substring(0, 4);
    } else {
      key = 'Lifetime Total';
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
    const avg = parseFloat((g.solar_generated / g.count).toFixed(2));
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
      entry_count: g.count
    };
  });

  return {
    period,
    summary: {
      total_generated: parseFloat(totalGen.toFixed(2)),
      total_consumed: parseFloat(totalCon.toFixed(2)),
      total_export_units: parseFloat(totalExport.toFixed(2)),
      total_import_units: parseFloat(totalImport.toFixed(2)),
      total_revenue: parseFloat(totalRev.toFixed(2)),
      total_expense: parseFloat(totalExp.toFixed(2)),
      net_profit: netProfit,
      average_units: avgUnits,
      highest_day: highestDay ? { date: highestDay.entry_date, generated: highestDay.generated_units } : null,
      lowest_day: lowestDay ? { date: lowestDay.entry_date, generated: lowestDay.generated_units } : null
    },
    grouped
  };
}

async function getAnalyticsData(userId) {
  const entries = await getAllUserEntries(userId);

  const chronological = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const dailyLabels = chronological.map(e => e.entry_date);
  const dailyGeneration = chronological.map(e => parseFloat(e.generated_units));
  const dailyConsumption = chronological.map(e => parseFloat(e.consumed_units));

  const monthlyMap = {};
  chronological.forEach(e => {
    const month = e.entry_date.substring(0, 7);
    if (!monthlyMap[month]) {
      monthlyMap[month] = { revenue: 0, expense: 0 };
    }
    monthlyMap[month].revenue += parseFloat(e.revenue) || 0;
    monthlyMap[month].expense += parseFloat(e.payable) || 0;
  });

  const monthlyLabels = Object.keys(monthlyMap).sort();
  const monthlyRevenue = monthlyLabels.map(m => parseFloat(monthlyMap[m].revenue.toFixed(2)));
  const monthlyExpense = monthlyLabels.map(m => parseFloat(monthlyMap[m].expense.toFixed(2)));
  const monthlyProfit = monthlyLabels.map(m => parseFloat((monthlyMap[m].revenue - monthlyMap[m].expense).toFixed(2)));

  const yearlyMap = {};
  chronological.forEach(e => {
    const year = e.entry_date.substring(0, 4);
    if (!yearlyMap[year]) {
      yearlyMap[year] = { revenue: 0, expense: 0 };
    }
    yearlyMap[year].revenue += parseFloat(e.revenue) || 0;
    yearlyMap[year].expense += parseFloat(e.payable) || 0;
  });

  const yearlyLabels = Object.keys(yearlyMap).sort();
  const yearlyRevenue = yearlyLabels.map(y => parseFloat(yearlyMap[y].revenue.toFixed(2)));
  const yearlyExpense = yearlyLabels.map(y => parseFloat(yearlyMap[y].expense.toFixed(2)));
  const yearlyProfit = yearlyLabels.map(y => parseFloat((yearlyMap[y].revenue - yearlyMap[y].expense).toFixed(2)));

  const totalRev = monthlyRevenue.reduce((acc, curr) => acc + curr, 0);
  const totalExp = monthlyExpense.reduce((acc, curr) => acc + curr, 0);

  return {
    daily: {
      labels: dailyLabels,
      generation: dailyGeneration,
      consumption: dailyConsumption
    },
    monthly: {
      labels: monthlyLabels,
      revenue: monthlyRevenue,
      expense: monthlyExpense,
      profit: monthlyProfit
    },
    yearly: {
      labels: yearlyLabels,
      revenue: yearlyRevenue,
      expense: yearlyExpense,
      profit: yearlyProfit
    },
    pie: {
      labels: ['Revenue', 'Expense'],
      values: [parseFloat(totalRev.toFixed(2)), parseFloat(totalExp.toFixed(2))]
    }
  };
}

module.exports = {
  getDashboardSummary,
  getReports,
  getAnalyticsData
};
