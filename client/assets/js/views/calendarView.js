/**
 * Calendar View Component
 */
const CalendarView = {
  currentDate: new Date(),
  entriesMap: {},

  async render(container) {
    const monthYearStr = this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const weekdays = [['S', 'Sun'], ['M', 'Mon'], ['T', 'Tue'], ['W', 'Wed'], ['T', 'Thu'], ['F', 'Fri'], ['S', 'Sat']];

    container.innerHTML = `
      ${UI.pageHead({ description: 'Day-by-day solar export, grid import and money. Tap a day for details.' })}

      <section class="card card-body mx-auto max-w-5xl" aria-label="Calendar">
        <div class="mb-3 flex items-center justify-between gap-2">
          <button id="cal-prev-month" class="btn btn-outline btn-icon" aria-label="Previous month">${UI.icon('chevron-left')}</button>
          <h2 id="cal-month-title" class="min-w-0 flex-1 truncate text-center text-base font-semibold md:text-lg" aria-live="polite">${escapeHtml(monthYearStr)}</h2>
          <button id="cal-today-btn" class="btn btn-ghost px-2.5 text-accent!">Today</button>
          <button id="cal-next-month" class="btn btn-outline btn-icon" aria-label="Next month">${UI.icon('chevron-right')}</button>
        </div>

        <div class="calendar-grid mb-1" aria-hidden="true">
          ${weekdays.map(([short, long]) => `
            <div class="py-1 text-center text-xs font-semibold text-ink-3"><span class="md:hidden">${short}</span><span class="hidden md:inline">${long}</span></div>
          `).join('')}
        </div>
        <div id="calendar-days-container" class="calendar-grid">
          ${Skeleton.renderCalendarCells(35)}
        </div>

        <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3 md:hidden">
          <span>Number under each day = net kWh</span>
          <span><b class="font-semibold text-good">+</b> surplus</span>
          <span><b class="font-semibold text-bad">−</b> deficit</span>
        </p>
      </section>
    `;

    UI.refreshIcons();
    this.bindEvents();
    await this.loadMonthData();
  },

  bindEvents() {
    document.getElementById('cal-prev-month').onclick = () => {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
      this.render(document.getElementById('content-area'));
    };
    document.getElementById('cal-next-month').onclick = () => {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
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

    const startDateStr = localDateStr(new Date(year, month, 1 - firstDay.getDay()));
    const endDateStr = localDateStr(new Date(year, month + 1, 6 - lastDay.getDay()));

    try {
      const res = await API.getEntries({ startDate: startDateStr, endDate: endDateStr, limit: 100 });
      this.entriesMap = {};
      res.entries.forEach(e => {
        this.entriesMap[e.entry_date] = e;
      });

      this.renderCalendarGrid(year, month, firstDay, lastDay);
    } catch (err) {
      console.error('Failed to load calendar month data:', err);
      const grid = document.getElementById('calendar-days-container');
      grid.innerHTML = '<div id="calendar-load-error" class="col-span-7"></div>';
      UI.loadError(document.getElementById('calendar-load-error'), () => this.render(document.getElementById('content-area')));
    }
  },

  renderCalendarGrid(year, month, firstDay, lastDay) {
    const currency = escapeHtml(appState.getState().settings.currency || '₹');
    const container = document.getElementById('calendar-days-container');
    const todayStr = localDateStr();

    let html = '';
    const totalCells = Math.ceil((firstDay.getDay() + lastDay.getDate()) / 7) * 7; // 5 or 6 week rows

    const startGridDate = new Date(year, month, 1 - firstDay.getDay());

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startGridDate);
      cellDate.setDate(startGridDate.getDate() + i);

      const dateStr = localDateStr(cellDate);
      const isOtherMonth = cellDate.getMonth() !== month;
      const isToday = dateStr === todayStr;
      const entry = this.entriesMap[dateStr];
      const net = entry ? parseFloat(entry.net_units) || 0 : 0;
      const label = `${UI.dateLong(dateStr)}: ${entry ? `net ${UI.signed(net)} kWh` : 'no reading'}`;

      html += `
        <button type="button" class="calendar-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}" aria-label="${label}" ${isToday ? 'aria-current="date"' : ''}>
          <span class="text-[0.8125rem] leading-none font-semibold md:text-sm ${isToday ? 'text-accent' : ''}">${cellDate.getDate()}</span>
          ${entry ? `
            <span class="max-w-full truncate text-[0.625rem] leading-none font-semibold tabular-nums md:hidden ${UI.tone(net)}">${UI.signed(net)}</span>
            <span class="hidden flex-col gap-0.5 text-left text-xs tabular-nums md:flex">
              <span class="truncate text-good">Exp ${entry.generated_units}</span>
              <span class="truncate text-bad">Imp ${entry.consumed_units}</span>
              ${entry.revenue > 0 ? `<span class="truncate font-semibold text-good">+${currency}${entry.revenue}</span>` : ''}
              ${entry.payable > 0 ? `<span class="truncate font-semibold text-bad">-${currency}${entry.payable}</span>` : ''}
            </span>
          ` : ''}
        </button>
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
            title: UI.dateLong(dateStr),
            bodyHTML: `
              <div class="divide-y divide-line">
                ${UI.kv('Export', `${entry.generated_units} kWh`, 'text-good')}
                ${UI.kv('Import', `${entry.consumed_units} kWh`, 'text-bad')}
                ${UI.kv('Net units', `${UI.signed(entry.net_units)} kWh`, UI.tone(entry.net_units))}
                ${UI.kv('Credit rate', `${currency}${entry.buying_rate}`)}
                ${UI.kv('Grid rate', `${currency}${entry.selling_rate}`)}
                ${UI.kv('Revenue', `${currency}${entry.revenue}`, 'text-good')}
                ${UI.kv('Payable', `${currency}${entry.payable}`, 'text-bad')}
                ${UI.kv('Status', UI.statusBadge(entry.status))}
              </div>
              <div class="pt-2">
                <div class="text-ink-3">Notes</div>
                <p class="mt-1 break-words text-ink">${escapeHtml(entry.notes || 'None')}</p>
              </div>
            `,
            footerHTML: `<button id="modal-edit-entry-btn" class="btn btn-primary">${UI.icon('pencil')}<span>Edit Entry</span></button>`
          });

          document.getElementById('modal-edit-entry-btn').onclick = () => {
            Modal.close();
            Router.navigate('entry', { id: entry.id });
          };
        } else {
          Modal.open({
            title: UI.dateLong(dateStr),
            bodyHTML: '<p class="py-1 text-ink-2">No meter reading is logged for this day.</p>',
            footerHTML: `<button id="modal-add-entry-btn" class="btn btn-primary">${UI.icon('plus')}<span>Add Entry</span></button>`
          });

          document.getElementById('modal-add-entry-btn').onclick = () => {
            Modal.close();
            Router.navigate('entry', { date: dateStr });
          };
        }
      };
    });

    UI.refreshIcons();
  }
};
