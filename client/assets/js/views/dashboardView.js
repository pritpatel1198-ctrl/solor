/**
 * Dashboard View Component
 * Answers, in order: how much money is left, is today's reading done,
 * how this month looks, what the last bills were, and the latest readings.
 */
const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-3 lg:gap-5">
        <div id="dashboard-balance" class="min-w-0 lg:col-span-2 lg:row-start-1">
          <div class="hero h-80" aria-hidden="true"></div>
        </div>

        <div id="dashboard-reading-status" class="min-w-0 empty:hidden lg:col-span-2 lg:row-start-2"></div>

        <section id="dashboard-kpi-grid" class="card min-w-0 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:h-full" aria-label="This month and meter readings">
          <div class="card-body flex flex-col gap-3" aria-hidden="true">
            <div class="skeleton h-4 w-24"></div>
            <div class="skeleton h-8 w-full"></div>
            <div class="skeleton h-8 w-full"></div>
          </div>
        </section>

        <section class="card min-w-0 lg:col-start-3 lg:row-start-3" aria-labelledby="bills-title">
          <div class="flex items-center justify-between gap-3 px-4 pt-3 pb-2 md:px-5">
            <h2 id="bills-title" class="card-title">Electricity bills</h2>
          </div>
          <div id="dashboard-bills" class="divide-y divide-line border-t border-line">${Skeleton.renderListRows(1)}</div>
        </section>

        <section class="card min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-3" aria-labelledby="recent-title">
          <div class="flex items-center justify-between gap-2 py-1 pr-2 pl-4 md:pl-5">
            <h2 id="recent-title" class="card-title">Recent readings</h2>
            <div class="flex items-center">
              <button id="view-calendar-btn" class="btn btn-ghost btn-icon sm:w-auto sm:px-3" aria-label="Open calendar">${UI.icon('calendar')}<span class="hidden sm:inline">Calendar</span></button>
              <button id="view-all-history-btn" class="btn btn-ghost px-3">View all</button>
            </div>
          </div>
          <div id="recent-entries-list" class="divide-y divide-line border-t border-line">
            ${Skeleton.renderListRows(3)}
          </div>
        </section>
      </div>
    `;

    UI.refreshIcons();
    document.getElementById('view-all-history-btn').onclick = () => Router.navigate('history');
    document.getElementById('view-calendar-btn').onclick = () => Router.navigate('calendar');
    BillPanel.mount(document.getElementById('dashboard-balance'), document.getElementById('dashboard-bills'));
    await Promise.all([BillPanel.load(), this.loadDashboardData()]);
  },

  async loadDashboardData() {
    const snapshot = document.getElementById('dashboard-kpi-grid');
    const list = document.getElementById('recent-entries-list');

    try {
      const res = await API.getDashboard();
      if (!document.contains(snapshot)) return; // user already left this screen
      const data = res.data;
      this.renderReadingStatus(data);
      this.renderSnapshot(snapshot, data);
      this.renderRecent(list, data.recentEntries || []);
      UI.refreshIcons();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (!document.contains(snapshot)) return;
      UI.loadError(snapshot, () => this.render(document.getElementById('content-area')));
      list.innerHTML = '';
    }
  },

  renderReadingStatus(data) {
    const el = document.getElementById('dashboard-reading-status');
    const last = data.latest && data.latest.reading_date;
    const today = localDateStr();

    if (last === today) {
      el.innerHTML = `
        <div class="flex min-h-12 items-center gap-2.5 rounded-card bg-good-soft px-4 py-2.5 text-sm font-medium text-good" role="status">
          ${UI.icon('circle-check')}<span>Today's reading is saved</span>
        </div>
      `;
      return;
    }

    let detail = 'Add your first meter reading';
    if (last) {
      const toUtc = (d) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
      const days = Math.round((toUtc(today) - toUtc(last)) / 86400000);
      detail = `Last: ${UI.date(last)} · ${days} day${days === 1 ? '' : 's'} ago`;
    }
    el.innerHTML = `
      <button type="button" id="dashboard-reading-cta" class="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5 text-left shadow-card transition-colors duration-150 hover:bg-subtle active:bg-subtle">
        <span class="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">${UI.icon('gauge', 'size-4!')}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">Today's reading is pending</span>
          <span class="block truncate text-xs text-ink-3">${detail}</span>
        </span>
        <span class="text-ink-3">${UI.icon('chevron-right')}</span>
      </button>
    `;
    document.getElementById('dashboard-reading-cta').onclick = () => Router.navigate('entry');
  },

  renderSnapshot(el, data) {
    const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const monthNet = parseFloat((data.month.generated - data.month.consumed).toFixed(2));
    const latestDate = data.latest && data.latest.reading_date ? UI.date(data.latest.reading_date) : '';
    const metric = (label, value, tone = 'text-ink') => `
      <div class="min-w-0">
        <div class="truncate text-xs text-ink-3">${label}</div>
        <div class="mt-0.5 truncate text-lg font-semibold tracking-tight tabular-nums ${tone}">${value}</div>
      </div>
    `;

    el.innerHTML = `
      <div class="flex h-full flex-col divide-y divide-line">
        <div class="flex flex-1 flex-col justify-center px-4 py-3 md:px-5 lg:py-4">
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="card-title">This month</h2>
            <span class="text-xs text-ink-3">${escapeHtml(month)}</span>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-3">
            ${metric('Export', data.month.generated, 'text-good')}
            ${metric('Import', data.month.consumed, 'text-bad')}
            ${metric('Net kWh', UI.signed(monthNet), UI.tone(monthNet))}
          </div>
        </div>
        <div class="flex flex-1 flex-col justify-center px-4 py-3 md:px-5 lg:py-4">
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="card-title">Meter readings</h2>
            <span class="text-xs text-ink-3">${latestDate ? `Read ${latestDate}` : 'No reading yet'}</span>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-3">
            ${metric('Export meter', data.latest ? UI.meter(data.latest.export_meter) : '-')}
            ${metric('Import meter', data.latest ? UI.meter(data.latest.import_meter) : '-')}
          </div>
        </div>
      </div>
    `;
  },

  renderRecent(list, entries) {
    if (entries.length === 0) {
      list.innerHTML = UI.empty({ title: 'No readings yet', body: 'Add today\'s meter reading to get started.' });
      return;
    }

    list.innerHTML = entries.map(e => {
      const net = parseFloat(e.net_units) || 0;
      const label = net > 0 ? 'Surplus' : (net < 0 ? 'Deficit' : 'Balanced');
      const [y, m, d] = e.entry_date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return `
        <button type="button" class="recent-entry-row flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-subtle active:bg-subtle md:px-5" data-id="${escapeHtml(e.id || '')}" aria-label="Edit reading of ${UI.dateLong(e.entry_date)}">
          <span class="flex size-11 shrink-0 flex-col items-center justify-center rounded-control bg-subtle">
            <span class="text-[0.9375rem] leading-none font-semibold tabular-nums">${String(d).padStart(2, '0')}</span>
            <span class="mt-0.5 text-[0.625rem] leading-none font-semibold text-ink-3 uppercase">${date.toLocaleDateString('en-IN', { month: 'short' })}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">${date.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
            <span class="block truncate text-xs text-ink-3 tabular-nums">Export ${e.generated_units} · Import ${e.consumed_units}</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block text-[0.9375rem] font-semibold tabular-nums ${UI.tone(net)}">${UI.signed(net)}</span>
            <span class="block text-[0.6875rem] text-ink-3">${label}</span>
          </span>
        </button>
      `;
    }).join('');

    list.querySelectorAll('.recent-entry-row').forEach(row => {
      row.onclick = () => {
        const id = row.getAttribute('data-id');
        Router.navigate('entry', id ? { id } : {});
      };
    });
  }
};
