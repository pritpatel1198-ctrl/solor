/**
 * Daily Entry View Component
 * Standard Meter Readings Entry Form
 */
const EntryView = {
  currentEntryId: null,

  async render(container, params = {}) {
    const todayStr = localDateStr();
    const settings = appState.getState().settings;
    const currency = escapeHtml(settings.currency || '₹');

    this.currentEntryId = params.id || null;
    const initialDate = params.date || todayStr;

    const meterField = (id, label, placeholder) => `
      <div class="field">
        <label class="label" for="${id}">${label}</label>
        <input type="number" inputmode="decimal" step="0.01" min="0" id="${id}" class="input" placeholder="${placeholder}" value="" />
      </div>
    `;

    container.innerHTML = `
      <form id="daily-entry-form" class="mx-auto flex max-w-3xl flex-col gap-3 md:gap-4" novalidate>
        ${this.currentEntryId ? `
          <button type="button" id="entry-back-to-new-btn" class="btn btn-ghost -ml-2 self-start px-2">
            ${UI.icon('arrow-left')}<span>New reading instead</span>
          </button>
        ` : ''}

        <!-- Date -->
        <section class="card card-body">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="card-title">${this.currentEntryId ? 'Edit reading' : 'New Daily Reading'}</h2>
            <span id="entry-status-badge" class="badge badge-balanced">BALANCED</span>
          </div>
          <div class="field">
            <label class="label" for="entry-date">Reading date</label>
            <input type="date" id="entry-date" class="input" value="${escapeHtml(initialDate)}" required />
          </div>
          <div id="entry-date-notice" role="status" class="mt-2.5 hidden rounded-control bg-accent-soft px-3 py-2 text-[0.8125rem] text-ink"></div>
        </section>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <!-- Import meter -->
          <section class="card card-body" aria-labelledby="import-heading">
            <h2 id="import-heading" class="card-title mb-3"><span class="text-bad">${UI.icon('arrow-down-left')}</span>Import meter <span class="font-normal text-ink-3">(from grid)</span></h2>
            <div class="grid grid-cols-2 gap-3">
              ${meterField('entry-open-import', 'Opening', 'e.g. 5408')}
              ${meterField('entry-close-import', 'Closing', 'e.g. 5449')}
            </div>
            <div class="field mt-3">
              <label class="label" for="entry-consumed">Import units (kWh)</label>
              <input type="number" inputmode="decimal" step="0.01" min="0" id="entry-consumed" class="input" placeholder="Closing − Opening" value="" required />
              <small id="consumed-calc-hint" class="hint">Fills in automatically from the meter readings</small>
            </div>
          </section>

          <!-- Export meter -->
          <section class="card card-body" aria-labelledby="export-heading">
            <h2 id="export-heading" class="card-title mb-3"><span class="text-good">${UI.icon('arrow-up-right')}</span>Export meter <span class="font-normal text-ink-3">(solar)</span></h2>
            <div class="grid grid-cols-2 gap-3">
              ${meterField('entry-open-export', 'Opening', 'e.g. 15128')}
              ${meterField('entry-close-export', 'Closing', 'e.g. 15173')}
            </div>
            <div class="field mt-3">
              <label class="label" for="entry-generated">Export units (kWh)</label>
              <input type="number" inputmode="decimal" step="0.01" min="0" id="entry-generated" class="input" placeholder="Closing − Opening" value="" required />
              <small id="generated-calc-hint" class="hint">Fills in automatically from the meter readings</small>
            </div>
          </section>
        </div>

        <!-- Rates & notes: rarely changed, so collapsed on phones -->
        <details class="card group" ${window.innerWidth >= 768 ? 'open' : ''}>
          <summary class="flex min-h-12 items-center justify-between gap-3 px-4 md:px-5">
            <span class="card-title">Rates &amp; notes</span>
            <span class="text-ink-3 transition-transform duration-150 group-open:rotate-180">${UI.icon('chevron-down')}</span>
          </summary>
          <div class="grid grid-cols-2 gap-3 px-4 pb-4 md:px-5 md:pb-5">
            <div class="field">
              <label class="label" for="entry-buying-rate">Govt buying rate (${currency}/unit)</label>
              <input type="number" inputmode="decimal" step="0.01" min="0" id="entry-buying-rate" class="input" value="${settings.default_buying_rate !== undefined ? settings.default_buying_rate : 2.25}" required />
            </div>
            <div class="field">
              <label class="label" for="entry-selling-rate">Govt selling rate (${currency}/unit)</label>
              <input type="number" inputmode="decimal" step="0.01" min="0" id="entry-selling-rate" class="input" value="${settings.default_selling_rate !== undefined ? settings.default_selling_rate : 2.25}" required />
            </div>
            <div class="field col-span-2">
              <label class="label" for="entry-notes">Notes (optional)</label>
              <textarea id="entry-notes" class="input" rows="2" placeholder="e.g. Sunny day, readings verified"></textarea>
            </div>
          </div>
        </details>

        <!-- Live result + actions: pinned above the tab bar on phones -->
        <div class="sticky bottom-tabbar z-20 -mx-4 border-t border-line bg-surface px-4 py-2.5 md:static md:mx-0 md:rounded-card md:border md:p-4 md:shadow-card">
          <dl class="grid grid-cols-4 gap-2 tabular-nums">
            <div class="min-w-0">
              <dt class="truncate text-[0.6875rem] text-ink-3 md:text-xs">Net</dt>
              <dd id="preview-net" class="truncate text-[0.8125rem] font-semibold md:text-base">0.00 kWh</dd>
            </div>
            <div class="min-w-0">
              <dt class="truncate text-[0.6875rem] text-ink-3 md:text-xs">Earned</dt>
              <dd id="preview-revenue" class="truncate text-[0.8125rem] font-semibold text-good md:text-base">${currency}0.00</dd>
            </div>
            <div class="min-w-0">
              <dt class="truncate text-[0.6875rem] text-ink-3 md:text-xs">Payable</dt>
              <dd id="preview-payable" class="truncate text-[0.8125rem] font-semibold text-bad md:text-base">${currency}0.00</dd>
            </div>
            <div class="min-w-0">
              <dt class="truncate text-[0.6875rem] text-ink-3 md:text-xs">Status</dt>
              <dd id="preview-status" class="truncate text-[0.8125rem] font-semibold md:text-base">Balanced</dd>
            </div>
          </dl>

          <div class="mt-2.5 flex items-center gap-2 md:mt-3 md:justify-end">
            <button type="button" id="entry-reset-btn" class="btn btn-outline btn-icon md:w-auto md:px-4" aria-label="Reset form">
              ${UI.icon('rotate-ccw')}<span class="hidden md:inline">Reset</span>
            </button>
            ${this.currentEntryId ? `
              <button type="button" id="entry-delete-btn" class="btn btn-danger btn-icon md:w-auto md:px-4" aria-label="Delete entry">
                ${UI.icon('trash-2')}<span class="hidden md:inline">Delete</span>
              </button>
            ` : ''}
            <button type="submit" id="entry-save-btn" class="btn btn-primary flex-1 md:flex-none">
              ${UI.icon('check')}
              <span>${this.currentEntryId ? 'Update Entry' : 'Save Daily Entry'}</span>
            </button>
          </div>
        </div>
      </form>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();

    if (this.currentEntryId) {
      await this.loadEntryForEditing(this.currentEntryId);
    } else {
      await this.autoPreFillPreviousMeterReadings(initialDate);
      this.updateLivePreview();
    }
  },

  bindEvents() {
    const form = document.getElementById('daily-entry-form');
    const resetBtn = document.getElementById('entry-reset-btn');
    const deleteBtn = document.getElementById('entry-delete-btn');

    const handleBackToNew = (e) => {
      e.preventDefault();
      Router.navigate('entry');
    };

    ['entry-back-to-new-btn', 'entry-back-card-btn', 'entry-back-bottom-btn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = handleBackToNew;
    });

    // Auto-calculate daily units when meter readings are entered
    const calcMeterUnits = () => {
      const openImp = parseFloat(document.getElementById('entry-open-import').value);
      const closeImp = parseFloat(document.getElementById('entry-close-import').value);
      const openExp = parseFloat(document.getElementById('entry-open-export').value);
      const closeExp = parseFloat(document.getElementById('entry-close-export').value);

      if (!isNaN(openImp) && !isNaN(closeImp) && closeImp >= openImp) {
        document.getElementById('entry-consumed').value = (closeImp - openImp).toFixed(2);
      }

      if (!isNaN(openExp) && !isNaN(closeExp) && closeExp >= openExp) {
        document.getElementById('entry-generated').value = (closeExp - openExp).toFixed(2);
      }

      this.updateLivePreview();
    };

    const dateEl = document.getElementById('entry-date');
    if (dateEl) {
      dateEl.addEventListener('change', async (e) => {
        if (!this.currentEntryId) {
          await this.autoPreFillPreviousMeterReadings(e.target.value);
        }
      });
    }

    // Prevent minus sign '-' or 'e' keypress on number input fields
    const numberInputIds = [
      'entry-open-import', 'entry-close-import', 'entry-open-export', 'entry-close-export',
      'entry-generated', 'entry-consumed', 'entry-buying-rate', 'entry-selling-rate'
    ];

    numberInputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === '-' || e.key === 'e' || e.key === 'E') {
            e.preventDefault();
          }
        });
        el.addEventListener('wheel', (e) => {
          e.preventDefault();
          el.blur();
        });
        el.addEventListener('input', () => {
          if (parseFloat(el.value) < 0) {
            el.value = 0;
          }
        });
      }
    });

    ['entry-open-import', 'entry-close-import', 'entry-open-export', 'entry-close-export'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', calcMeterUnits);
      }
    });

    ['entry-generated', 'entry-consumed', 'entry-buying-rate', 'entry-selling-rate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updateLivePreview());
      }
    });

    resetBtn.onclick = async () => {
      form.reset();
      const todayStr = localDateStr();
      if (!this.currentEntryId) {
        const dateVal = document.getElementById('entry-date').value || todayStr;
        await this.autoPreFillPreviousMeterReadings(dateVal);
      } else {
        await this.loadEntryForEditing(this.currentEntryId);
      }
      this.updateLivePreview();
      Toast.info('Form reset to default values.');
    };

    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm('Are you sure you want to delete this entry?')) {
          try {
            await API.deleteEntry(this.currentEntryId);
            Toast.success('Entry deleted successfully.');
            Router.navigate('history');
          } catch (err) {
            Toast.error('Failed to delete entry');
          }
        }
      };
    }

    form.onsubmit = async (e) => {
      e.preventDefault();

      const openImp = parseFloat(document.getElementById('entry-open-import').value);
      const closeImp = parseFloat(document.getElementById('entry-close-import').value);
      const openExp = parseFloat(document.getElementById('entry-open-export').value);
      const closeExp = parseFloat(document.getElementById('entry-close-export').value);
      const genUnits = parseFloat(document.getElementById('entry-generated').value);
      const conUnits = parseFloat(document.getElementById('entry-consumed').value);
      const buyRate = parseFloat(document.getElementById('entry-buying-rate').value);
      const sellRate = parseFloat(document.getElementById('entry-selling-rate').value);

      // Validation 1: Negative Values Check
      if ([openImp, closeImp, openExp, closeExp, genUnits, conUnits, buyRate, sellRate].some(v => !isNaN(v) && v < 0)) {
        Toast.error('Negative values are not allowed. Please enter positive meter readings.');
        return;
      }

      // Validation 2: Meter Reading Logical Check
      if (!isNaN(openImp) && !isNaN(closeImp) && closeImp < openImp) {
        Toast.error('Closing import meter reading cannot be less than opening import meter reading.');
        return;
      }

      if (!isNaN(openExp) && !isNaN(closeExp) && closeExp < openExp) {
        Toast.error('Closing export meter reading cannot be less than opening export meter reading.');
        return;
      }

      const saveBtn = document.getElementById('entry-save-btn');
      saveBtn.disabled = true;

      const payload = {
        entry_date: document.getElementById('entry-date').value,
        opening_import_meter: !isNaN(openImp) ? openImp : null,
        closing_import_meter: !isNaN(closeImp) ? closeImp : null,
        opening_export_meter: !isNaN(openExp) ? openExp : null,
        closing_export_meter: !isNaN(closeExp) ? closeExp : null,
        generated_units: !isNaN(genUnits) ? genUnits : 0,
        consumed_units: !isNaN(conUnits) ? conUnits : 0,
        buying_rate: !isNaN(buyRate) ? buyRate : 0,
        selling_rate: !isNaN(sellRate) ? sellRate : 0,
        notes: document.getElementById('entry-notes').value
      };

      try {
        if (this.currentEntryId) {
          await API.updateEntry(this.currentEntryId, payload);
          Toast.success('Entry updated successfully!');
        } else {
          await API.createEntry(payload);
          Toast.success('Daily entry saved successfully!');
        }
        Router.navigate('history');
      } catch (err) {
        Toast.error(err.message || 'Failed to save entry');
      } finally {
        saveBtn.disabled = false;
      }
    };
  },

  updateLivePreview() {
    const currency = appState.getState().settings.currency || '₹';
    const gen = parseFloat(document.getElementById('entry-generated').value) || 0;
    const con = parseFloat(document.getElementById('entry-consumed').value) || 0;
    const buyRate = parseFloat(document.getElementById('entry-buying-rate').value) || 0;
    const sellRate = parseFloat(document.getElementById('entry-selling-rate').value) || 0;

    const netUnits = parseFloat((gen - con).toFixed(2));
    let revenue = 0;
    let payable = 0;
    let status = 'Balanced';

    if (netUnits > 0) {
      revenue = parseFloat((netUnits * buyRate).toFixed(2));
      status = 'Profit';
    } else if (netUnits < 0) {
      payable = parseFloat((Math.abs(netUnits) * sellRate).toFixed(2));
      status = 'Loss';
    }

    document.getElementById('preview-net').textContent = `${netUnits > 0 ? '+' : ''}${netUnits} kWh`;
    document.getElementById('preview-revenue').textContent = `${currency}${revenue.toFixed(2)}`;
    document.getElementById('preview-payable').textContent = `${currency}${payable.toFixed(2)}`;

    const statusEl = document.getElementById('preview-status');
    const badgeEl = document.getElementById('entry-status-badge');

    statusEl.textContent = status;
    badgeEl.textContent = status.toUpperCase();

    badgeEl.className = 'badge';
    if (status === 'Profit') {
      badgeEl.classList.add('badge-profit');
      statusEl.style.color = 'var(--good)';
    } else if (status === 'Loss') {
      badgeEl.classList.add('badge-loss');
      statusEl.style.color = 'var(--bad)';
    } else {
      badgeEl.classList.add('badge-balanced');
      statusEl.style.color = 'var(--ink)';
    }
  },

  async loadEntryForEditing(id) {
    try {
      const res = await API.getEntryById(id);
      const data = res.data;

      document.getElementById('entry-date').value = data.entry_date;
      document.getElementById('entry-open-import').value = data.opening_import_meter ?? '';
      document.getElementById('entry-close-import').value = data.closing_import_meter ?? '';
      document.getElementById('entry-open-export').value = data.opening_export_meter ?? '';
      document.getElementById('entry-close-export').value = data.closing_export_meter ?? '';
      document.getElementById('entry-generated').value = data.generated_units;
      document.getElementById('entry-consumed').value = data.consumed_units;
      document.getElementById('entry-buying-rate').value = data.buying_rate;
      document.getElementById('entry-selling-rate').value = data.selling_rate;
      document.getElementById('entry-notes').value = data.notes || '';

      this.updateLivePreview();
    } catch (err) {
      Toast.error('Could not load entry details');
    }
  },

  async autoPreFillPreviousMeterReadings(selectedDate) {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate || '')) return;
      // The two latest entries up to and including the selected date: the selected date's own
      // entry (if any) and the previous chronological entry, regardless of how many entries exist.
      const res = await API.getEntries({
        endDate: selectedDate,
        limit: 2,
        sortBy: 'entry_date',
        sortOrder: 'desc'
      }, { silentError: true });

      if (res && res.entries && res.entries.length > 0) {
        // Ensure form remains in New Entry mode when not explicitly editing
        this.currentEntryId = null;
        const saveBtn = document.getElementById('entry-save-btn');
        const titleEl = document.querySelector('.card-title');
        if (saveBtn) saveBtn.querySelector('span').textContent = 'Save Daily Entry';
        if (titleEl) titleEl.textContent = 'New Daily Reading';

        // Check if an entry already exists for selectedDate to display a subtle notice
        const exactMatch = res.entries.find(e => e.entry_date === selectedDate);
        const noticeEl = document.getElementById('entry-date-notice');
        if (exactMatch && noticeEl) {
          noticeEl.innerHTML = `Note: An entry for <strong>${escapeHtml(selectedDate)}</strong> already exists. Submitting will update this entry. <a href="#" id="edit-existing-entry-btn" class="font-semibold underline underline-offset-2">Load and edit it</a>`;
          noticeEl.style.display = 'block';

          const editBtn = document.getElementById('edit-existing-entry-btn');
          if (editBtn) {
            editBtn.onclick = (e) => {
              e.preventDefault();
              Router.navigate('entry', { id: exactMatch.id });
            };
          }
        } else if (noticeEl) {
          noticeEl.style.display = 'none';
        }

        const sorted = [...res.entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
        const prevList = sorted.filter(e => e.entry_date < selectedDate);
        // No earlier entry: don't prefill (a later entry's readings are not this day's opening)
        const prev = prevList.length > 0 ? prevList[prevList.length - 1] : null;

        if (prev) {
          const openImpEl = document.getElementById('entry-open-import');
          const openExpEl = document.getElementById('entry-open-export');

          // Calculate prev closing import meter
          let prevCloseImp = prev.closing_import_meter;
          if ((prevCloseImp === undefined || prevCloseImp === null) && prev.opening_import_meter !== null && prev.opening_import_meter !== undefined && prev.consumed_units !== undefined) {
            prevCloseImp = parseFloat(prev.opening_import_meter) + parseFloat(prev.consumed_units);
          }

          // Calculate prev closing export meter
          let prevCloseExp = prev.closing_export_meter;
          if ((prevCloseExp === undefined || prevCloseExp === null) && prev.opening_export_meter !== null && prev.opening_export_meter !== undefined && prev.generated_units !== undefined) {
            prevCloseExp = parseFloat(prev.opening_export_meter) + parseFloat(prev.generated_units);
          }

          if (openImpEl && prevCloseImp !== undefined && prevCloseImp !== null && !isNaN(prevCloseImp)) {
            openImpEl.value = prevCloseImp;
          }

          if (openExpEl && prevCloseExp !== undefined && prevCloseExp !== null && !isNaN(prevCloseExp)) {
            openExpEl.value = prevCloseExp;
          }

          // Clear closing meters & generated/consumed values for the new entry
          const closeImpEl = document.getElementById('entry-close-import');
          const closeExpEl = document.getElementById('entry-close-export');
          const genEl = document.getElementById('entry-generated');
          const conEl = document.getElementById('entry-consumed');
          const notesEl = document.getElementById('entry-notes');

          if (closeImpEl) closeImpEl.value = '';
          if (closeExpEl) closeExpEl.value = '';
          if (genEl) genEl.value = '';
          if (conEl) conEl.value = '';
          if (notesEl) notesEl.value = '';

          this.updateLivePreview();
        }
      }
    } catch (err) {
      console.error('Could not auto-fill previous meter readings:', err);
    }
  }
};
