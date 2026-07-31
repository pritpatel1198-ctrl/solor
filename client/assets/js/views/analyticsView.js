/**
 * Analytics View Component (Chart.js Integration)
 */
const AnalyticsView = {
  charts: {},

  async render(container) {
    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Visual Analytics & Charts</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Interactive Chart.js visualizations for trend analysis and revenue comparison.</p>
      </div>

      <div class="analytics-grid">
        <!-- 1. Daily Generation vs Consumption -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <h3 class="card-title">Daily Generation vs Consumption (kWh)</h3>
          </div>
          <div class="card-body">
            <div class="chart-card-body">
              <canvas id="daily-gen-con-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- 2. Monthly Financials Bar Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Monthly Revenue, Expense & Profit</h3>
          </div>
          <div class="card-body">
            <div class="chart-card-body">
              <canvas id="monthly-financials-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- 3. Revenue vs Expense Pie Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Revenue vs Expense Share</h3>
          </div>
          <div class="card-body">
            <div class="chart-card-body">
              <canvas id="revenue-expense-pie-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- 4. Yearly Totals Chart -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <h3 class="card-title">Yearly Financial Growth</h3>
          </div>
          <div class="card-body">
            <div class="chart-card-body">
              <canvas id="yearly-financials-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadAnalyticsData();
  },

  async loadAnalyticsData() {
    try {
      const res = await API.getAnalytics();
      const data = res.data;

      this.destroyCharts();

      // Chart.js Theme Colors
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? '#26334d' : '#e2e8f0';

      // 1. Daily Chart
      const dailyCtx = document.getElementById('daily-gen-con-chart').getContext('2d');
      this.charts.daily = new Chart(dailyCtx, {
        type: 'line',
        data: {
          labels: data.daily.labels,
          datasets: [
            {
              label: 'Solar Generated (kWh)',
              data: data.daily.generation,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.3
            },
            {
              label: 'Grid Consumed (kWh)',
              data: data.daily.consumption,
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });

      // 2. Monthly Financials Chart
      const monthlyCtx = document.getElementById('monthly-financials-chart').getContext('2d');
      this.charts.monthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
          labels: data.monthly.labels,
          datasets: [
            { label: 'Revenue', data: data.monthly.revenue, backgroundColor: '#10b981' },
            { label: 'Expense', data: data.monthly.expense, backgroundColor: '#ef4444' },
            { label: 'Profit', data: data.monthly.profit, backgroundColor: '#3b82f6' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });

      // 3. Pie Chart
      const pieCtx = document.getElementById('revenue-expense-pie-chart').getContext('2d');
      this.charts.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: data.pie.labels,
          datasets: [{
            data: data.pie.values,
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor } }
          }
        }
      });

      // 4. Yearly Chart
      const yearlyCtx = document.getElementById('yearly-financials-chart').getContext('2d');
      this.charts.yearly = new Chart(yearlyCtx, {
        type: 'bar',
        data: {
          labels: data.yearly.labels,
          datasets: [
            { label: 'Yearly Revenue', data: data.yearly.revenue, backgroundColor: '#10b981' },
            { label: 'Yearly Expense', data: data.yearly.expense, backgroundColor: '#ef4444' },
            { label: 'Yearly Net Profit', data: data.yearly.profit, backgroundColor: '#8b5cf6' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });

    } catch (err) {
      console.error('Failed to load analytics charts:', err);
    }
  },

  destroyCharts() {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].destroy();
      }
    });
    this.charts = {};
  }
};
