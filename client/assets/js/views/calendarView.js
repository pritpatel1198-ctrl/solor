/**
 * Calendar View Component
 */
const CalendarView = {
  currentDate: new Date(),
  entriesMap: {},

  async render(container) {
    const monthYearStr = this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Calendar View</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Interactive day-by-day solar generation and financial tracking calendar.</p>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="cal-prev-month" class="btn btn-outline btn-sm btn-icon"><i data-lucide="chevron-left"></i></button>
          <span id="cal-month-title" class="calendar-month-title">${monthYearStr}</span>
          <button id="cal-next-month" class="btn btn-outline btn-sm btn-icon"><i data-lucide="chevron-right"></i></button>
          <button id="cal-today-btn" class="btn btn-secondary btn-sm">Today</button>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
          </div>
          <div id="calendar-days-container" class="calendar-grid" style="margin-top: 8px;">
            ${Skeleton.renderKpiCards(28)}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadMonthData();
  },

  bindEvents() {
    document.getElementById('cal-prev-month').onclick = () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render(document.getElementById('content-area'));
    };
    document.getElementById('cal-next-month').onclick = () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render(document.getElementById('content-area'));
    };
    document.getElementById('cal-today-btn').onclick = () => {
      this.currentDate = new Date();
      this.render(document.getElementById('content-area'));
    };
  },

  async loadMonthData() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDateStr = new Date(year, month, 1 - firstDay.getDay()).toISOString().split('T')[0];
    const endDateStr = new Date(year, month + 1, 6 - lastDay.getDay()).toISOString().split('T')[0];

    try {
      const res = await API.getEntries({ startDate: startDateStr, endDate: endDateStr, limit: 100 });
      this.entriesMap = {};
      res.entries.forEach(e => {
        this.entriesMap[e.entry_date] = e;
      });

      this.renderCalendarGrid(year, month, firstDay, lastDay);
    } catch (err) {
      console.error('Failed to load calendar month data:', err);
    }
  },

  renderCalendarGrid(year, month, firstDay, lastDay) {
    const currency = appState.getState().settings.currency || '₹';
    const container = document.getElementById('calendar-days-container');
    const todayStr = new Date().toISOString().split('T')[0];

    let html = '';
    const totalCells = 35; // 5 weeks grid

    const startGridDate = new Date(year, month, 1 - firstDay.getDay());

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startGridDate);
      cellDate.setDate(startGridDate.getDate() + i);

      const dateStr = cellDate.toISOString().split('T')[0];
      const isOtherMonth = cellDate.getMonth() !== month;
      const isToday = dateStr === todayStr;

      const entry = this.entriesMap[dateStr];

      html += `
        <div class="calendar-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="cell-date-num">${cellDate.getDate()}</div>
          <div class="cell-metrics">
            ${entry ? `
              <div class="cell-gen">⚡ Gen: ${entry.generated_units}</div>
              <div class="cell-con">🔌 Con: ${entry.consumed_units}</div>
              ${entry.revenue > 0 ? `<div class="cell-rev">+$${entry.revenue}</div>`.replace('$', currency) : ''}
              ${entry.payable > 0 ? `<div class="cell-exp">-$${entry.payable}</div>`.replace('$', currency) : ''}
            ` : `<div style="color: var(--text-muted); font-size: 0.72rem;">No Entry</div>`}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Cell Click Details Handler
    document.querySelectorAll('.calendar-cell').forEach(cell => {
      cell.onclick = () => {
        const dateStr = cell.getAttribute('data-date');
        const entry = this.entriesMap[dateStr];

        if (entry) {
          Modal.open({
            title: `Solar Reading Details (${dateStr})`,
            bodyHTML: `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between;"><strong>Generated:</strong> <span>${entry.generated_units} kWh</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Consumed:</strong> <span>${entry.consumed_units} kWh</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Net Units:</strong> <span>${entry.net_units} kWh</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Tariffs:</strong> <span>${currency}${entry.buying_rate} buy / ${currency}${entry.selling_rate} sell</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Revenue:</strong> <span style="color: var(--success-600); font-weight:700;">${currency}${entry.revenue}</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Payable:</strong> <span style="color: var(--danger-600); font-weight:700;">${currency}${entry.payable}</span></div>
                <div style="display: flex; justify-content: space-between;"><strong>Status:</strong> <span class="badge badge-${entry.status}">${entry.status}</span></div>
                <div><strong>Notes:</strong> <p style="color: var(--text-secondary); margin-top: 4px;">${entry.notes || 'None'}</p></div>
              </div>
            `,
            footerHTML: `
              <button id="modal-edit-entry-btn" class="btn btn-primary btn-sm">Edit Entry</button>
            `
          });

          document.getElementById('modal-edit-entry-btn').onclick = () => {
            Modal.close();
            Router.navigate('entry', { id: entry.id });
          };
        } else {
          Modal.open({
            title: `No Entry Found (${dateStr})`,
            bodyHTML: `<p>There is no meter reading logged for ${dateStr}. Would you like to record an entry?</p>`,
            footerHTML: `<button id="modal-add-entry-btn" class="btn btn-primary btn-sm">Add Entry for ${dateStr}</button>`
          });

          document.getElementById('modal-add-entry-btn').onclick = () => {
            Modal.close();
            Router.navigate('entry');
            setTimeout(() => {
              const dateInput = document.getElementById('entry-date');
              if (dateInput) {
                dateInput.value = dateStr;
                dateInput.dispatchEvent(new Event('input'));
              }
            }, 100);
          };
        }
      };
    });
  }
};
