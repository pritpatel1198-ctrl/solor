/**
 * Dashboard View Component
 */
const DashboardView = {
  async render(container) {
    const currency = appState.getState().settings.currency || '₹';

    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Dashboard</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Overview of your solar generation, grid consumption, and net earnings.</p>
        </div>
        <button id="quick-add-entry-btn" class="btn btn-primary">
          <i data-lucide="plus"></i>
          <span>Add Daily Entry</span>
        </button>
      </div>

      <!-- KPI Cards Grid -->
      <div id="dashboard-kpi-grid" class="dashboard-grid">
        ${Skeleton.renderKpiCards(8)}
      </div>

      <!-- Quick Entry & Recent Entries Row -->
      <div class="dashboard-row">
        <!-- Recent Entries Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Meter Entries</h3>
            <button id="view-all-history-btn" class="btn btn-outline btn-sm">View All</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Generated</th>
                    <th>Consumed</th>
                    <th>Net Units</th>
                    <th>Revenue / Payable</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="recent-entries-tbody">
                  ${Skeleton.renderTableRows(4, 6)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Quick Summary Widget Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Quick Solar Insight</h3>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="padding: 16px; background: var(--bg-subtle); border-radius: var(--radius-md); border-left: 4px solid var(--primary-600);">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Solar Tariff Rates</div>
              <div style="display: flex; justify-content: space-between; margin-top: 8px; font-weight: 600; font-size: 0.92rem;">
                <span>Buying Rate (Grid Purchase):</span>
                <span style="color: var(--success-600);">${currency}${appState.getState().settings.default_buying_rate}/unit</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: 600; font-size: 0.92rem;">
                <span>Selling Rate (Grid Consumption):</span>
                <span style="color: var(--danger-600);">${currency}${appState.getState().settings.default_selling_rate}/unit</span>
              </div>
            </div>

            <div style="padding: 16px; background: var(--primary-50); border-radius: var(--radius-md); color: var(--primary-700); font-size: 0.88rem;">
              <strong>💡 Smart Tip:</strong> When generated solar units exceed grid consumption, you earn revenue at ${currency}${appState.getState().settings.default_buying_rate}/unit!
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadDashboardData();
  },

  bindEvents() {
    const addBtn = document.getElementById('quick-add-entry-btn');
    if (addBtn) {
      addBtn.onclick = () => Router.navigate('entry');
    }
    const viewAllBtn = document.getElementById('view-all-history-btn');
    if (viewAllBtn) {
      viewAllBtn.onclick = () => Router.navigate('history');
    }
  },

  async loadDashboardData() {
    try {
      const res = await API.getDashboard();
      const data = res.data;
      const curr = appState.getState().settings.currency || '₹';

      // Render 9 PRD specified KPI cards
      const kpiGrid = document.getElementById('dashboard-kpi-grid');
      kpiGrid.innerHTML = `
        <!-- 1. Today's Generation -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Generated Today</span>
            <div class="kpi-icon-wrapper" style="background: rgba(59, 130, 246, 0.1); color: var(--primary-600);">
              <i data-lucide="sun"></i>
            </div>
          </div>
          <div class="kpi-value"><span class="counter" data-target="${data.today.generated}">${data.today.generated}</span> <span style="font-size: 1.1rem; font-weight: 600; color: var(--text-muted);">kWh</span></div>
          <div class="kpi-footer">Today's total solar generation</div>
        </div>

        <!-- 2. Today's Consumption -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Consumed Today</span>
            <div class="kpi-icon-wrapper" style="background: rgba(148, 163, 184, 0.1); color: var(--text-secondary);">
              <i data-lucide="zap"></i>
            </div>
          </div>
          <div class="kpi-value"><span class="counter" data-target="${data.today.consumed}">${data.today.consumed}</span> <span style="font-size: 1.1rem; font-weight: 600; color: var(--text-muted);">kWh</span></div>
          <div class="kpi-footer">Grid electricity consumed today</div>
        </div>

        <!-- 3. Today's Revenue -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Earned Today</span>
            <div class="kpi-icon-wrapper" style="background: var(--success-50); color: var(--success-600);">
              <i data-lucide="trending-up"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--success-600);">${curr}<span class="counter" data-target="${data.today.revenue}">${data.today.revenue}</span></div>
          <div class="kpi-footer"><span class="trend-badge trend-up">Profit</span> Net export revenue</div>
        </div>

        <!-- 4. Today's Amount Payable -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Owed Today</span>
            <div class="kpi-icon-wrapper" style="background: var(--danger-50); color: var(--danger-600);">
              <i data-lucide="trending-down"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: ${data.today.payable > 0 ? 'var(--danger-600)' : 'var(--text-primary)'};">${curr}<span class="counter" data-target="${data.today.payable}">${data.today.payable}</span></div>
          <div class="kpi-footer"><span class="trend-badge ${data.today.payable > 0 ? 'trend-down' : 'trend-up'}">${data.today.payable > 0 ? 'Payable' : 'Clear'}</span> Net import expense</div>
        </div>

        <!-- 5. Month Profit -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Month Net Profit</span>
            <div class="kpi-icon-wrapper" style="background: rgba(37, 99, 235, 0.1); color: var(--primary-600);">
              <i data-lucide="calendar"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: ${data.month.net_profit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${curr}<span class="counter" data-target="${data.month.net_profit}">${data.month.net_profit}</span></div>
          <div class="kpi-footer">Current month net balance</div>
        </div>

        <!-- 6. Year Profit -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Year Net Profit</span>
            <div class="kpi-icon-wrapper" style="background: rgba(16, 185, 129, 0.1); color: var(--success-600);">
              <i data-lucide="award"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: ${data.year.net_profit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${curr}<span class="counter" data-target="${data.year.net_profit}">${data.year.net_profit}</span></div>
          <div class="kpi-footer">Current year net balance</div>
        </div>

        <!-- 7. Lifetime Revenue -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Lifetime Revenue</span>
            <div class="kpi-icon-wrapper" style="background: var(--success-50); color: var(--success-600);">
              <i data-lucide="dollar-sign"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--success-600);">${curr}<span class="counter" data-target="${data.lifetime.revenue}">${data.lifetime.revenue}</span></div>
          <div class="kpi-footer">Total accumulated earnings</div>
        </div>

        <!-- 8. Lifetime Expense -->
        <div class="card kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Lifetime Expense</span>
            <div class="kpi-icon-wrapper" style="background: var(--danger-50); color: var(--danger-600);">
              <i data-lucide="credit-card"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--danger-600);">${curr}<span class="counter" data-target="${data.lifetime.expense}">${data.lifetime.expense}</span></div>
          <div class="kpi-footer">Total accumulated payments</div>
        </div>

        <!-- 9. Lifetime Net Profit -->
        <div class="card kpi-card" style="grid-column: span 1 / -1;">
          <div class="kpi-header">
            <span class="kpi-title">Lifetime Net Profit</span>
            <div class="kpi-icon-wrapper" style="background: linear-gradient(135deg, var(--primary-600), #8b5cf6); color: white;">
              <i data-lucide="pie-chart"></i>
            </div>
          </div>
          <div class="kpi-value" style="font-size: 2.2rem; color: ${data.lifetime.net_profit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${curr}<span class="counter" data-target="${data.lifetime.net_profit}">${data.lifetime.net_profit}</span></div>
          <div class="kpi-footer">All time financial yield from solar installation</div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
      this.animateCounters();

      // Render Recent Entries Table
      const tbody = document.getElementById('recent-entries-tbody');
      if (data.recentEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No daily entries recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.recentEntries.map(e => {
        let badgeClass = 'badge-balanced';
        if (e.status === 'profit') badgeClass = 'badge-profit';
        if (e.status === 'loss') badgeClass = 'badge-loss';

        const amountStr = e.status === 'profit' ? `+${curr}${e.revenue}` : (e.status === 'loss' ? `-${curr}${e.payable}` : `${curr}0.00`);

        return `
          <tr>
            <td style="font-weight: 600;">${e.entry_date}</td>
            <td style="color: var(--primary-600); font-weight: 600;">${e.generated_units} kWh</td>
            <td style="color: var(--text-secondary);">${e.consumed_units} kWh</td>
            <td style="font-weight: 600;">${e.net_units > 0 ? '+' : ''}${e.net_units} kWh</td>
            <td style="font-weight: 700; color: ${e.status === 'profit' ? 'var(--success-600)' : (e.status === 'loss' ? 'var(--danger-600)' : 'var(--text-primary)')};">${amountStr}</td>
            <td><span class="badge ${badgeClass}">${e.status}</span></td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  },

  animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(c => {
      const target = parseFloat(c.getAttribute('data-target')) || 0;
      let start = 0;
      const duration = 800;
      const stepTime = 20;
      const steps = duration / stepTime;
      const increment = target / steps;

      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if ((increment >= 0 && current >= target) || (increment < 0 && current <= target)) {
          c.textContent = target.toFixed(2);
          clearInterval(timer);
        } else {
          c.textContent = current.toFixed(2);
        }
      }, stepTime);
    });
  }
};
