/**
 * Reports View Component
 */
const ReportsView = {
  currentPeriod: 'monthly',

  async render(container) {
    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Financial & Performance Reports</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Comprehensive breakdown of generation totals, grid exchange, revenues, and expenses.</p>
      </div>

      <!-- Period Selection Tabs -->
      <div class="period-tab-bar">
        <div class="period-tab ${this.currentPeriod === 'daily' ? 'active' : ''}" data-period="daily">Daily</div>
        <div class="period-tab ${this.currentPeriod === 'weekly' ? 'active' : ''}" data-period="weekly">Weekly</div>
        <div class="period-tab ${this.currentPeriod === 'monthly' ? 'active' : ''}" data-period="monthly">Monthly</div>
        <div class="period-tab ${this.currentPeriod === 'quarterly' ? 'active' : ''}" data-period="quarterly">Quarterly</div>
        <div class="period-tab ${this.currentPeriod === 'yearly' ? 'active' : ''}" data-period="yearly">Yearly</div>
        <div class="period-tab ${this.currentPeriod === 'lifetime' ? 'active' : ''}" data-period="lifetime">Lifetime</div>
      </div>

      <!-- Summary Metrics Grid -->
      <div id="reports-summary-grid" class="dashboard-grid">
        ${Skeleton.renderKpiCards(6)}
      </div>

      <!-- Grouped Breakdown Data Table Card -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-header">
          <h3 class="card-title">Detailed Period Breakdown</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Solar Generated</th>
                  <th>Grid Consumed</th>
                  <th>Export Units</th>
                  <th>Import Units</th>
                  <th>Revenue</th>
                  <th>Expense</th>
                  <th>Net Profit</th>
                  <th>Avg Units / Day</th>
                </tr>
              </thead>
              <tbody id="reports-tbody">
                ${Skeleton.renderTableRows(4, 9)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadReportData();
  },

  bindEvents() {
    document.querySelectorAll('.period-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentPeriod = tab.getAttribute('data-period');
        this.loadReportData();
      };
    });
  },

  async loadReportData() {
    try {
      const res = await API.getReports(this.currentPeriod);
      const { summary, grouped } = res.data;
      const curr = appState.getState().settings.currency || '₹';

      // Summary KPI Grid
      const summaryGrid = document.getElementById('reports-summary-grid');
      summaryGrid.innerHTML = `
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Solar Generated</span>
            <div class="kpi-icon-wrapper" style="background: rgba(59, 130, 246, 0.1); color: var(--primary-600);"><i data-lucide="sun"></i></div>
          </div>
          <div class="kpi-value">${summary.total_generated} kWh</div>
          <div class="kpi-footer">Avg: ${summary.average_units} kWh/day</div>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Grid Consumption</span>
            <div class="kpi-icon-wrapper" style="background: rgba(148, 163, 184, 0.1); color: var(--text-secondary);"><i data-lucide="zap"></i></div>
          </div>
          <div class="kpi-value">${summary.total_consumed} kWh</div>
          <div class="kpi-footer">Export: ${summary.total_export_units} | Import: ${summary.total_import_units}</div>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Total Revenue</span>
            <div class="kpi-icon-wrapper" style="background: var(--success-50); color: var(--success-600);"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value" style="color: var(--success-600);">${curr}${summary.total_revenue}</div>
          <div class="kpi-footer">Gross grid earnings</div>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Total Expense</span>
            <div class="kpi-icon-wrapper" style="background: var(--danger-50); color: var(--danger-600);"><i data-lucide="trending-down"></i></div>
          </div>
          <div class="kpi-value" style="color: var(--danger-600);">${curr}${summary.total_expense}</div>
          <div class="kpi-footer">Gross grid payments</div>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Net Profit</span>
            <div class="kpi-icon-wrapper" style="background: rgba(16, 185, 129, 0.1); color: var(--success-600);"><i data-lucide="dollar-sign"></i></div>
          </div>
          <div class="kpi-value" style="color: ${summary.net_profit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${curr}${summary.net_profit}</div>
          <div class="kpi-footer">Revenue minus Expense</div>
        </div>

        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Peak & Lowest Day</span>
            <div class="kpi-icon-wrapper" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;"><i data-lucide="bar-chart-2"></i></div>
          </div>
          <div class="kpi-value" style="font-size: 1.1rem; line-height: 1.4;">
            <div>High: ${summary.highest_day ? summary.highest_day.generated + ' kWh (' + summary.highest_day.date + ')' : '-'}</div>
            <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">Low: ${summary.lowest_day ? summary.lowest_day.generated + ' kWh (' + summary.lowest_day.date + ')' : '-'}</div>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();

      // Table Breakdown
      const tbody = document.getElementById('reports-tbody');
      if (grouped.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No entries available for report calculation.</td></tr>`;
        return;
      }

      tbody.innerHTML = grouped.map(g => `
        <tr>
          <td style="font-weight: 700;">${g.group_key}</td>
          <td style="color: var(--primary-600); font-weight: 600;">${g.solar_generated} kWh</td>
          <td style="color: var(--text-secondary);">${g.grid_consumption} kWh</td>
          <td>${g.export_units} kWh</td>
          <td>${g.import_units} kWh</td>
          <td style="color: var(--success-600); font-weight: 600;">${curr}${g.revenue}</td>
          <td style="color: var(--danger-600); font-weight: 600;">${curr}${g.expense}</td>
          <td style="font-weight: 700; color: ${g.net_profit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${curr}${g.net_profit}</td>
          <td>${g.average_units} kWh</td>
        </tr>
      `).join('');

    } catch (err) {
      console.error('Failed to load reports data:', err);
    }
  }
};
