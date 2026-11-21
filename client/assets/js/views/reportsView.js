/**
 * Enterprise Financial & Performance Reports View Component
 * Inspired by Crystal Reports and modern BI software architectures.
 */

const ReportsView = {
  // Active Filter State
  currentFilters: {
    period: 'monthly',
    startDate: '',
    endDate: '',
    status: 'all',
    search: '',
    financialYear: ''
  },

  activeTab: 'grouped', // 'grouped' | 'ledger'
  currentReportData: null,
  chartInstance: null,

  async render(container) {
    // Initialize date defaults if empty
    this.initDefaultDates();

    const f = this.currentFilters;
    const presets = [
      ['today', 'Today'], ['this_week', 'This Week'], ['this_month', 'This Month'],
      ['previous_month', 'Last Month'], ['this_quarter', 'This Quarter'],
      ['this_financial_year', `FY ${this.financialYearLabel()}`], ['yearly', 'This Year'],
      ['lifetime', 'Lifetime'], ['custom', 'Custom']
    ];
    const hasFilters = f.period === 'custom' || f.status !== 'all' || f.search;

    container.innerHTML = `
      ${UI.pageHead({
        description: 'Energy and money for any period, with PDF statements.',
        actions: `
          <button id="print-report-btn" class="btn btn-outline flex-1 md:flex-none">${UI.icon('printer')}<span>Print</span></button>
          <button id="export-cr-pdf-btn" class="btn btn-primary flex-1 md:flex-none">${UI.icon('file-down')}<span>Download PDF</span></button>
        `
      })}

      <!-- Period -->
      <div class="report-preset-pills chip-row mb-3" role="group" aria-label="Report period">
        ${presets.map(([id, label]) => `
          <button type="button" class="report-preset-pill chip ${f.period === id ? 'active' : ''}" data-period="${id}">${escapeHtml(label)}</button>
        `).join('')}
      </div>

      <!-- Filters -->
      <details id="report-filters" class="card group mb-3 md:mb-4" ${hasFilters ? 'open' : ''}>
        <summary class="flex min-h-11 items-center justify-between gap-3 px-3.5 text-sm font-medium text-ink-2">
          <span class="flex items-center gap-2">${UI.icon('sliders-horizontal', 'size-4')}Dates &amp; filters</span>
          <span class="text-ink-3 transition-transform duration-150 group-open:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
        </summary>
        <div class="grid grid-cols-2 gap-3 px-3.5 pb-3.5 lg:grid-cols-4">
          <div class="field">
            <label class="label" for="report-start-date">From</label>
            <input type="date" id="report-start-date" class="input" value="${escapeHtml(f.startDate)}" />
          </div>
          <div class="field">
            <label class="label" for="report-end-date">To</label>
            <input type="date" id="report-end-date" class="input" value="${escapeHtml(f.endDate)}" />
          </div>
          <div class="field">
            <label class="label" for="report-status-filter">Status</label>
            <select id="report-status-filter" class="input">
              <option value="all" ${f.status === 'all' ? 'selected' : ''}>All</option>
              <option value="profit" ${f.status === 'profit' ? 'selected' : ''}>Profit / surplus</option>
              <option value="loss" ${f.status === 'loss' ? 'selected' : ''}>Loss / deficit</option>
              <option value="balanced" ${f.status === 'balanced' ? 'selected' : ''}>Balanced</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="report-search-input">Search</label>
            <input type="search" id="report-search-input" class="input" placeholder="Notes or dates" value="${escapeHtml(f.search)}" />
          </div>
          <div class="col-span-2 flex gap-2 lg:col-span-4 lg:justify-end">
            <button type="button" id="report-reset-filters-btn" class="btn btn-outline flex-1 lg:flex-none">${UI.icon('rotate-ccw')}<span>Reset</span></button>
            <button type="button" id="report-apply-filters-btn" class="btn btn-primary flex-1 lg:flex-none">${UI.icon('filter')}<span>Apply</span></button>
          </div>
        </div>
      </details>

      <!-- Active period summary -->
      <div id="report-active-filters-bar" class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] md:mb-4">
        <span class="font-semibold text-ink" id="active-period-label">Loading...</span>
        <span class="text-ink-3" id="active-status-chip">Status: All</span>
        <span class="text-ink-3" id="active-count-chip">Records: 0</span>
        <span class="text-ink-3 md:ml-auto" id="active-timestamp"></span>
      </div>

      <div id="report-variance-container" class="mb-3 hidden md:mb-4"></div>

      <div id="reports-summary-grid" class="mb-4 grid grid-cols-2 gap-3 md:mb-6 lg:grid-cols-3 lg:gap-4">
        ${Skeleton.renderKpiCards(6)}
      </div>

      <section class="card mb-4 md:mb-6" aria-labelledby="report-chart-title">
        <div class="card-header"><h2 id="report-chart-title" class="card-title">Energy &amp; profit trend</h2></div>
        <div class="card-body">
          <div class="relative h-64 md:h-72">
            <canvas id="reportChart" role="img" aria-label="Bar chart of export and import units with a net profit line"></canvas>
          </div>
        </div>
      </section>

      <!-- Breakdown vs daily ledger -->
      <div class="segmented mb-3" role="tablist" aria-label="Report detail">
        <button type="button" role="tab" class="report-preview-tab segment ${this.activeTab === 'grouped' ? 'active' : ''}" data-tab="grouped">${UI.icon('table')}<span>Breakdown</span></button>
        <button type="button" role="tab" class="report-preview-tab segment ${this.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger">${UI.icon('list')}<span>Daily ledger</span></button>
      </div>

      <section id="report-tab-grouped-content" class="card ${this.activeTab === 'grouped' ? '' : 'hidden'}" aria-label="Period breakdown">
        <div class="table-wrap hidden lg:block">
          <table class="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th class="num">Solar Gen</th>
                <th class="num">Grid Con</th>
                <th class="num">Export</th>
                <th class="num">Import</th>
                <th class="num">Revenue</th>
                <th class="num">Expense</th>
                <th class="num">Net Profit</th>
                <th class="num">Avg / Day</th>
                <th class="num">Coverage</th>
              </tr>
            </thead>
            <tbody id="reports-grouped-tbody">
              ${Skeleton.renderTableRows(4, 10)}
            </tbody>
          </table>
        </div>
        <div id="reports-grouped-cards" class="divide-y divide-line lg:hidden">${Skeleton.renderListRows(3)}</div>
      </section>

      <section id="report-tab-ledger-content" class="card ${this.activeTab === 'ledger' ? '' : 'hidden'}" aria-label="Daily ledger">
        <div class="table-wrap hidden lg:block">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th class="num">Solar Gen</th>
                <th class="num">Grid Con</th>
                <th class="num">Net</th>
                <th class="num">Credit Rate</th>
                <th class="num">Grid Rate</th>
                <th class="num">Revenue</th>
                <th class="num">Expense</th>
                <th class="num">Net Profit</th>
                <th class="text-center">Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody id="reports-ledger-tbody">
              ${Skeleton.renderTableRows(5, 11)}
            </tbody>
          </table>
        </div>
        <div id="reports-ledger-cards" class="divide-y divide-line lg:hidden">${Skeleton.renderListRows(3)}</div>
      </section>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadReportData();
  },

  // Indian financial year (April-March), e.g. '2026-27'
  financialYearLabel() {
    const now = new Date();
    const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  },

  initDefaultDates() {
    // Explicit dates override the period on the server, so only default them for the
    // initial 'monthly' view; a chosen preset (e.g. Lifetime) clears them on purpose.
    if (this.currentFilters.period !== 'monthly' && this.currentFilters.period !== 'custom') return;
    if (!this.currentFilters.startDate || !this.currentFilters.endDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      this.currentFilters.startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      this.currentFilters.endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  },

  bindEvents() {
    // Preset Pill Clicks
    document.querySelectorAll('.report-preset-pill').forEach(pill => {
      pill.onclick = () => {
        const period = pill.getAttribute('data-period');
        document.querySelectorAll('.report-preset-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        this.currentFilters.period = period;
        if (period === 'custom') document.getElementById('report-filters').open = true;

        // If not custom, clear manual date range overrides to let backend calculate bounds accurately
        if (period !== 'custom') {
          this.currentFilters.startDate = '';
          this.currentFilters.endDate = '';
          const sInput = document.getElementById('report-start-date');
          const eInput = document.getElementById('report-end-date');
          if (sInput) sInput.value = '';
          if (eInput) eInput.value = '';
        }

        this.loadReportData();
      };
    });

    // Apply Filters button
    const applyBtn = document.getElementById('report-apply-filters-btn');
    if (applyBtn) {
      applyBtn.onclick = () => {
        const s = document.getElementById('report-start-date').value;
        const e = document.getElementById('report-end-date').value;
        const status = document.getElementById('report-status-filter').value;
        const search = document.getElementById('report-search-input').value;

        if (s && e && s > e) {
          Toast.error('Validation Error: Start Date cannot be later than End Date.');
          return;
        }

        this.currentFilters.startDate = s;
        this.currentFilters.endDate = e;
        this.currentFilters.status = status;
        this.currentFilters.search = search;

        if (s && e) {
          this.currentFilters.period = 'custom';
          document.querySelectorAll('.report-preset-pill').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-period') === 'custom');
          });
        }

        this.loadReportData();
      };
    }

    // Reset Filters button
    const resetBtn = document.getElementById('report-reset-filters-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.currentFilters = {
          period: 'this_month',
          startDate: '',
          endDate: '',
          status: 'all',
          search: '',
          financialYear: ''
        };

        const sInput = document.getElementById('report-start-date');
        const eInput = document.getElementById('report-end-date');
        const statusSel = document.getElementById('report-status-filter');
        const searchInput = document.getElementById('report-search-input');

        if (sInput) sInput.value = '';
        if (eInput) eInput.value = '';
        if (statusSel) statusSel.value = 'all';
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('.report-preset-pill').forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-period') === 'this_month');
        });

        this.loadReportData();
      };
    }

    // Search enter key
    const searchInput = document.getElementById('report-search-input');
    if (searchInput) {
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          if (applyBtn) applyBtn.click();
        }
      };
    }

    // Preview Tab Switching
    document.querySelectorAll('.report-preview-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.report-preview-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.getAttribute('data-tab');

        const groupedContent = document.getElementById('report-tab-grouped-content');
        const ledgerContent = document.getElementById('report-tab-ledger-content');

        if (this.activeTab === 'grouped') {
          if (groupedContent) groupedContent.classList.remove('hidden');
          if (ledgerContent) ledgerContent.classList.add('hidden');
        } else {
          if (groupedContent) groupedContent.classList.add('hidden');
          if (ledgerContent) ledgerContent.classList.remove('hidden');
        }
      };
    });

    // PDF Export Action
    const exportPdfBtn = document.getElementById('export-cr-pdf-btn');
    if (exportPdfBtn) {
      exportPdfBtn.onclick = async () => {
        if (!this.currentReportData) {
          Toast.error('Report dataset is still loading. Please wait.');
          return;
        }

        const origHtml = exportPdfBtn.innerHTML;
        exportPdfBtn.disabled = true;
        exportPdfBtn.innerHTML = `${UI.spinner()}<span>Generating...</span>`;

        try {
          const user = appState.getState().user;
          const curr = escapeHtml(appState.getState().settings.currency || '₹');
          await CrystalReportPdf.exportPdf(this.currentReportData, user ? user.email : '', curr);
          Toast.success('Report PDF downloaded.');
        } catch (err) {
          console.error('PDF export failed:', err);
          Toast.error('PDF generation error: ' + (err.message || 'Rendering failed'));
        } finally {
          exportPdfBtn.disabled = false;
          exportPdfBtn.innerHTML = origHtml;
          if (window.lucide) lucide.createIcons();
        }
      };
    }

    // Print Preview Action
    const printBtn = document.getElementById('print-report-btn');
    if (printBtn) {
      printBtn.onclick = () => {
        if (!this.currentReportData) {
          Toast.error('Report dataset is still loading. Please wait.');
          return;
        }
        const user = appState.getState().user;
        const curr = escapeHtml(appState.getState().settings.currency || '₹');
        try {
          CrystalReportPdf.openPrintPreview(this.currentReportData, user ? user.email : '', curr);
        } catch (err) {
          Toast.error('Print preview error: ' + err.message);
        }
      };
    }
  },

  async loadReportData() {
    try {
      const res = await API.getReports(this.currentFilters);
      this.currentReportData = res.data;

      const { summary, grouped, entries, variance, label, date_bounds, filters } = res.data;
      const curr = escapeHtml(appState.getState().settings.currency || '₹');

      // Update date picker inputs if backend resolved them
      if (date_bounds && date_bounds.start_date && date_bounds.end_date) {
        const sInput = document.getElementById('report-start-date');
        const eInput = document.getElementById('report-end-date');
        if (sInput && !sInput.value) sInput.value = date_bounds.start_date;
        if (eInput && !eInput.value) eInput.value = date_bounds.end_date;
      }

      // Update Active Filter Bar
      const periodLabelEl = document.getElementById('active-period-label');
      const statusChipEl = document.getElementById('active-status-chip');
      const countChipEl = document.getElementById('active-count-chip');
      const timestampEl = document.getElementById('active-timestamp');

      if (periodLabelEl) periodLabelEl.textContent = label || 'Custom';
      if (statusChipEl) statusChipEl.textContent = `Status: ${filters.status || 'all'}`;
      if (countChipEl) countChipEl.textContent = `Records: ${summary.entry_count || 0}`;
      if (timestampEl) timestampEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;

      // Render Period Variance Banner
      this.renderVarianceBanner(variance, curr);

      // Render Summary KPI Cards
      this.renderSummaryKpis(summary, curr);

      // Render Chart
      this.renderChart(grouped, curr);

      // Render Grouped Table
      this.renderGroupedTable(grouped, curr);

      // Render Ledger Table
      this.renderLedgerTable(entries, curr);

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Failed to load reports data:', err);
      UI.loadError(document.getElementById('reports-grouped-cards'), () => this.loadReportData());
      UI.refreshIcons();
    }
  },

  renderVarianceBanner(variance, curr) {
    const container = document.getElementById('report-variance-container');
    if (!container) return;

    if (!variance || !variance.prior_period) {
      container.style.display = 'none';
      return;
    }

    const prior = variance.prior_period;
    const genDiff = variance.generation_diff;
    const genPct = variance.generation_growth_pct;
    const revDiff = variance.revenue_diff;
    const revPct = variance.revenue_growth_pct;
    const profitDiff = variance.profit_diff;

    const pill = (value, text) => `
      <span class="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold tabular-nums ${value >= 0 ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}">${text}</span>
    `;

    container.style.display = 'block';
    container.innerHTML = `
      <div class="card card-body flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="card-title">${UI.icon('trending-up', 'size-4 text-accent')}<span>Compared with previous period</span></div>
          <div class="mt-0.5 text-xs text-ink-3">${escapeHtml(prior.start_date)} to ${escapeHtml(prior.end_date)}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${pill(genDiff, `Generation ${genDiff >= 0 ? '+' : ''}${genDiff} kWh (${genPct >= 0 ? '+' : ''}${genPct}%)`)}
          ${pill(revDiff, `Revenue ${UI.money(curr, revDiff)} (${revPct >= 0 ? '+' : ''}${revPct}%)`)}
          ${pill(profitDiff, `Net ${UI.money(curr, profitDiff)}`)}
        </div>
      </div>
    `;
  },

  renderSummaryKpis(summary, curr) {
    const summaryGrid = document.getElementById('reports-summary-grid');
    if (!summaryGrid) return;

    summaryGrid.innerHTML = `
      ${UI.stat({
        label: 'Net profit', icon: 'wallet',
        value: UI.money(curr, summary.net_profit),
        foot: `Margin ${summary.profit_margin}% · Net ${summary.total_net_units >= 0 ? '+' : ''}${summary.total_net_units} units`,
        tone: summary.net_profit >= 0 ? 'text-good' : 'text-bad',
        cls: 'col-span-2 lg:col-span-1'
      })}
      ${UI.stat({ label: 'Revenue', icon: 'arrow-up-right', value: `${curr}${summary.total_revenue}`, foot: `Avg ${curr}${summary.average_daily_revenue}/day`, tone: 'text-good' })}
      ${UI.stat({ label: 'Expense', icon: 'arrow-down-right', value: `${curr}${summary.total_expense}`, foot: `Avg ${curr}${summary.average_daily_expense}/day`, tone: 'text-bad' })}
      ${UI.stat({ label: 'Generation', icon: 'sun', value: `${summary.total_generated}`, foot: `kWh · Avg ${summary.average_daily_generated}/day · Export ${summary.solar_export_ratio}%` })}
      ${UI.stat({ label: 'Consumption', icon: 'zap', value: `${summary.total_consumed}`, foot: `kWh · Avg ${summary.average_daily_consumed}/day · Import ${summary.total_import_units}` })}
      ${UI.stat({
        label: 'Solar coverage', icon: 'pie-chart', value: `${summary.solar_coverage_ratio}%`,
        foot: `Peak ${summary.highest_day ? summary.highest_day.generated + ' kWh' : '-'} · Self-use ${summary.self_consumption_ratio}%`,
        cls: 'col-span-2 lg:col-span-1'
      })}
    `;
  },

  renderChart(grouped, curr) {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    if (!grouped || grouped.length === 0) return;

    const labels = grouped.map(g => g.group_key);
    const genData = grouped.map(g => g.solar_generated);
    const conData = grouped.map(g => g.grid_consumption);
    const profitData = grouped.map(g => g.net_profit);

    const t = UI.chartTheme();

    this.chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Solar (kWh)',
            data: genData,
            backgroundColor: t.good,
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            label: 'Grid (kWh)',
            data: conData,
            backgroundColor: t.bad,
            borderRadius: 3,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: `Net Profit (${curr})`,
            data: profitData,
            borderColor: t.accent,
            backgroundColor: t.accent,
            borderWidth: 2,
            pointBackgroundColor: t.accent,
            pointRadius: t.isPhone ? 2 : 3,
            tension: 0.25,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: t.legend,
          tooltip: {
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: t.text, font: t.font, maxRotation: 0, autoSkip: true, maxTicksLimit: t.isPhone ? 5 : 12 }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: t.grid },
            ticks: { color: t.text, font: t.font, maxTicksLimit: 6 },
            title: { display: !t.isPhone, text: 'Energy (kWh)', color: t.text, font: t.font }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: t.text, font: t.font, maxTicksLimit: 6 },
            title: { display: !t.isPhone, text: `Profit (${curr})`, color: t.text, font: t.font }
          }
        }
      }
    });
  },

  renderGroupedTable(grouped, curr) {
    const tbody = document.getElementById('reports-grouped-tbody');
    const cards = document.getElementById('reports-grouped-cards');
    if (!tbody) return;

    if (!grouped || grouped.length === 0) {
      const empty = UI.empty({ icon: 'bar-chart-3', title: 'No data for this period', body: 'Choose another period or clear the filters.' });
      tbody.innerHTML = `<tr><td colspan="10">${empty}</td></tr>`;
      cards.innerHTML = empty;
      return;
    }

    tbody.innerHTML = grouped.map(g => `
      <tr>
        <td class="font-semibold">${escapeHtml(g.group_key)}</td>
        <td class="num font-medium text-good">${g.solar_generated}</td>
        <td class="num text-ink-2">${g.grid_consumption}</td>
        <td class="num">${g.export_units}</td>
        <td class="num">${g.import_units}</td>
        <td class="num font-medium text-good">${curr}${g.revenue}</td>
        <td class="num font-medium text-bad">${curr}${g.expense}</td>
        <td class="num font-semibold ${g.net_profit >= 0 ? 'text-good' : 'text-bad'}">${UI.money(curr, g.net_profit)}</td>
        <td class="num">${g.average_units}</td>
        <td class="num font-medium">${g.coverage_ratio}%</td>
      </tr>
    `).join('');

    cards.innerHTML = grouped.map(g => `
      <details class="group/row">
        <summary class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">${escapeHtml(g.group_key)}</span>
            <span class="block text-xs text-ink-3 tabular-nums">Exp ${g.export_units} · Imp ${g.import_units} kWh</span>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <span class="text-sm font-semibold tabular-nums ${g.net_profit >= 0 ? 'text-good' : 'text-bad'}">${UI.money(curr, g.net_profit)}</span>
            <span class="text-ink-3 transition-transform duration-150 group-open/row:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </span>
        </summary>
        <div class="divide-y divide-line border-t border-line bg-subtle/40 px-4 py-1">
          ${UI.kv('Solar generated', `${g.solar_generated} kWh`)}
          ${UI.kv('Grid consumed', `${g.grid_consumption} kWh`)}
          ${UI.kv('Revenue', `${curr}${g.revenue}`, 'text-good')}
          ${UI.kv('Expense', `${curr}${g.expense}`, 'text-bad')}
          ${UI.kv('Avg per day', `${g.average_units} kWh`)}
          ${UI.kv('Coverage', `${g.coverage_ratio}%`)}
        </div>
      </details>
    `).join('');
  },

  renderLedgerTable(entries, curr) {
    const tbody = document.getElementById('reports-ledger-tbody');
    const cards = document.getElementById('reports-ledger-cards');
    if (!tbody) return;

    if (!entries || entries.length === 0) {
      const empty = UI.empty({ icon: 'list', title: 'No readings for this period', body: 'Choose another period or clear the filters.' });
      tbody.innerHTML = `<tr><td colspan="11">${empty}</td></tr>`;
      cards.innerHTML = empty;
      return;
    }

    tbody.innerHTML = entries.map(e => `
      <tr>
        <td class="font-semibold">${escapeHtml(e.entry_date)}</td>
        <td class="num font-medium text-good">${e.generated_units}</td>
        <td class="num text-ink-2">${e.consumed_units}</td>
        <td class="num font-semibold ${UI.tone(e.net_units)}">${UI.signed(e.net_units)}</td>
        <td class="num">${curr}${e.buying_rate}</td>
        <td class="num">${curr}${e.selling_rate}</td>
        <td class="num font-medium text-good">${curr}${e.revenue}</td>
        <td class="num font-medium text-bad">${curr}${e.expense}</td>
        <td class="num font-semibold ${e.net_profit >= 0 ? 'text-good' : 'text-bad'}">${UI.money(curr, e.net_profit)}</td>
        <td class="text-center">${UI.statusBadge(e.status)}</td>
        <td class="max-w-40 truncate text-ink-2">${escapeHtml(e.notes || '-')}</td>
      </tr>
    `).join('');

    cards.innerHTML = entries.map(e => `
      <details class="group/row">
        <summary class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">${UI.dateLong(e.entry_date)}</span>
            <span class="block text-xs text-ink-3 tabular-nums">Exp ${e.generated_units} · Imp ${e.consumed_units} · Net ${UI.signed(e.net_units)}</span>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <span class="text-sm font-semibold tabular-nums ${e.net_profit >= 0 ? 'text-good' : 'text-bad'}">${UI.money(curr, e.net_profit)}</span>
            <span class="text-ink-3 transition-transform duration-150 group-open/row:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </span>
        </summary>
        <div class="divide-y divide-line border-t border-line bg-subtle/40 px-4 py-1">
          ${UI.kv('Status', UI.statusBadge(e.status))}
          ${UI.kv('Credit rate', `${curr}${e.buying_rate}`)}
          ${UI.kv('Grid rate', `${curr}${e.selling_rate}`)}
          ${UI.kv('Revenue', `${curr}${e.revenue}`, 'text-good')}
          ${UI.kv('Expense', `${curr}${e.expense}`, 'text-bad')}
          ${e.notes ? UI.kv('Notes', escapeHtml(e.notes), 'break-words') : ''}
        </div>
      </details>
    `).join('');
  }
};
