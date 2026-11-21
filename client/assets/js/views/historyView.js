/**
 * History View Component
 */
const HistoryView = {
  queryParams: {
    page: 1,
    limit: 10,
    search: '',
    status: 'all',
    startDate: '',
    endDate: '',
    sortBy: 'entry_date',
    sortOrder: 'desc'
  },
  selectedIds: new Set(),
  currentEntries: [],

  async render(container) {
    const q = this.queryParams;
    const hasFilters = q.status !== 'all' || q.startDate || q.endDate;

    container.innerHTML = `
      <!-- Search & filters -->
      <div class="mb-3 flex flex-col gap-2 md:mb-4 print:hidden">
        <div class="flex gap-2">
          <div class="relative min-w-0 flex-1">
            <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">${UI.icon('search', 'size-4')}</span>
            <label class="sr-only" for="history-search-input">Search readings</label>
            <input type="search" id="history-search-input" class="input pl-9" placeholder="Search readings" value="${escapeHtml(q.search)}" />
          </div>
          <button id="history-select-toggle" class="btn btn-outline shrink-0 px-3 aria-pressed:border-primary lg:hidden" aria-pressed="false">${UI.icon('check-square')}<span>Select</span></button>
        </div>

        <details class="card group" ${hasFilters || window.innerWidth >= 1024 ? 'open' : ''}>
          <summary class="flex min-h-11 items-center justify-between gap-3 px-3.5 text-sm font-medium text-ink-2">
            <span class="flex items-center gap-2">${UI.icon('sliders-horizontal', 'size-4')}Filters, sort &amp; export</span>
            <span class="text-ink-3 transition-transform duration-150 group-open:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </summary>
          <div class="grid grid-cols-2 gap-3 px-3.5 pb-3.5 lg:grid-cols-4">
            <div class="field">
              <label class="label" for="history-status-filter">Status</label>
              <select id="history-status-filter" class="input">
                <option value="all" ${q.status === 'all' ? 'selected' : ''}>All</option>
                <option value="profit" ${q.status === 'profit' ? 'selected' : ''}>Profit</option>
                <option value="loss" ${q.status === 'loss' ? 'selected' : ''}>Loss</option>
                <option value="balanced" ${q.status === 'balanced' ? 'selected' : ''}>Balanced</option>
              </select>
            </div>
            <div class="field lg:hidden">
              <label class="label" for="history-sort-select">Sort by</label>
              <select id="history-sort-select" class="input">
                <option value="entry_date:desc">Newest first</option>
                <option value="entry_date:asc">Oldest first</option>
                <option value="generated_units:desc">Most export</option>
                <option value="consumed_units:desc">Most import</option>
                <option value="net_units:desc">Highest net</option>
                <option value="net_units:asc">Lowest net</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="history-start-date">From</label>
              <input type="date" id="history-start-date" class="input" value="${escapeHtml(q.startDate)}" />
            </div>
            <div class="field">
              <label class="label" for="history-end-date">To</label>
              <input type="date" id="history-end-date" class="input" value="${escapeHtml(q.endDate)}" />
            </div>
            <div class="col-span-2 flex gap-2 lg:col-span-4 lg:justify-end">
              <button id="export-csv-btn" class="btn btn-outline flex-1 lg:flex-none">${UI.icon('file-spreadsheet')}<span>Export CSV</span></button>
              <button id="export-pdf-btn" class="btn btn-outline flex-1 lg:flex-none">${UI.icon('printer')}<span>Print / PDF</span></button>
            </div>
          </div>
        </details>
      </div>

      <button id="bulk-delete-btn" class="btn btn-danger bottom-tabbar fixed inset-x-4 z-30 mb-2 hidden shadow-float lg:static lg:mb-3 lg:shadow-none print:hidden">
        ${UI.icon('trash-2')}
        <span id="bulk-delete-count">Delete Selected (0)</span>
      </button>

      <section class="card" aria-label="Reading history">
        <!-- Desktop table -->
        <div class="table-wrap hidden lg:block print:block">
          <table class="data-table">
            <thead>
              <tr>
                <th class="w-10 text-center print:hidden">
                  <input type="checkbox" id="select-all-checkbox" class="check" aria-label="Select all readings on this page" />
                </th>
                <th class="sortable-th" data-sort="entry_date">Date ${UI.icon('chevrons-up-down')}</th>
                <th class="sortable-th" data-sort="generated_units">Export ${UI.icon('chevrons-up-down')}</th>
                <th class="sortable-th" data-sort="consumed_units">Import ${UI.icon('chevrons-up-down')}</th>
                <th class="sortable-th" data-sort="net_units">Net ${UI.icon('chevrons-up-down')}</th>
                <th>Buy / Sell</th>
                <th class="sortable-th" data-sort="revenue">Amount ${UI.icon('chevrons-up-down')}</th>
                <th>Status</th>
                <th>Notes</th>
                <th class="text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody id="history-tbody">
              ${Skeleton.renderTableRows(5, 10)}
            </tbody>
          </table>
        </div>

        <!-- Phone / tablet cards -->
        <div id="history-cards" class="group/list divide-y divide-line lg:hidden print:hidden">
          ${Skeleton.renderListRows(5)}
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5 md:px-5 print:hidden">
          <button id="prev-page-btn" class="btn btn-outline btn-icon md:w-auto md:px-4" aria-label="Previous page" disabled>${UI.icon('chevron-left')}<span class="hidden md:inline">Previous</span></button>
          <div class="min-w-0 text-center">
            <div id="page-num-display" class="text-sm font-semibold">Page 1</div>
            <div id="pagination-info" class="truncate text-xs text-ink-3">Showing 0-0 of 0 entries</div>
          </div>
          <button id="next-page-btn" class="btn btn-outline btn-icon md:w-auto md:px-4" aria-label="Next page" disabled><span class="hidden md:inline">Next</span>${UI.icon('chevron-right')}</button>
        </div>
      </section>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadHistoryData();
  },

  bindEvents() {
    const searchInput = document.getElementById('history-search-input');
    const statusSelect = document.getElementById('history-status-filter');
    const startDateInput = document.getElementById('history-start-date');
    const endDateInput = document.getElementById('history-end-date');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    let debounceTimer;
    searchInput.oninput = (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.queryParams.search = e.target.value;
        this.queryParams.page = 1;
        this.loadHistoryData();
      }, 300);
    };

    statusSelect.onchange = (e) => {
      this.queryParams.status = e.target.value;
      this.queryParams.page = 1;
      this.loadHistoryData();
    };

    startDateInput.onchange = (e) => {
      this.queryParams.startDate = e.target.value;
      this.queryParams.page = 1;
      this.loadHistoryData();
    };

    endDateInput.onchange = (e) => {
      this.queryParams.endDate = e.target.value;
      this.queryParams.page = 1;
      this.loadHistoryData();
    };

    // Column Sorting
    document.querySelectorAll('.sortable-th').forEach(th => {
      th.onclick = () => {
        const field = th.getAttribute('data-sort');
        if (this.queryParams.sortBy === field) {
          this.queryParams.sortOrder = this.queryParams.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.queryParams.sortBy = field;
          this.queryParams.sortOrder = 'desc';
        }
        this.loadHistoryData();
      };
    });

    selectAllCheckbox.onchange = (e) => {
      const isChecked = e.target.checked;
      this.currentEntries.forEach(entry => {
        if (isChecked) {
          this.selectedIds.add(entry.id);
        } else {
          this.selectedIds.delete(entry.id);
        }
      });
      document.querySelectorAll('.entry-row-checkbox').forEach(cb => { cb.checked = isChecked; });
      this.updateSelectionUI();
    };

    bulkDeleteBtn.onclick = async () => {
      const idsArr = Array.from(this.selectedIds);
      if (idsArr.length === 0) return;

      if (confirm(`Are you sure you want to delete ${idsArr.length} selected entries?`)) {
        try {
          await API.bulkDeleteEntries(idsArr);
          Toast.success(`Deleted ${idsArr.length} entries successfully.`);
          this.selectedIds.clear();
          this.loadHistoryData();
        } catch (err) {
          Toast.error('Bulk deletion failed.');
        }
      }
    };

    // Phone/tablet sort (the desktop table sorts from its column headers)
    const sortSelect = document.getElementById('history-sort-select');
    const sortValue = `${this.queryParams.sortBy}:${this.queryParams.sortOrder}`;
    if ([...sortSelect.options].some(o => o.value === sortValue)) sortSelect.value = sortValue;
    sortSelect.onchange = (e) => {
      const [field, order] = e.target.value.split(':');
      this.queryParams.sortBy = field;
      this.queryParams.sortOrder = order;
      this.queryParams.page = 1;
      this.loadHistoryData();
    };

    // Phone/tablet selection mode: checkboxes only appear when asked for
    const selectToggle = document.getElementById('history-select-toggle');
    selectToggle.onclick = () => {
      const list = document.getElementById('history-cards');
      const selecting = !list.hasAttribute('data-selecting');
      list.toggleAttribute('data-selecting', selecting);
      selectToggle.setAttribute('aria-pressed', String(selecting));
      selectToggle.querySelector('span').textContent = selecting ? 'Done' : 'Select';
      if (!selecting) {
        this.selectedIds.clear();
        document.querySelectorAll('.entry-row-checkbox').forEach(cb => { cb.checked = false; });
        this.updateSelectionUI();
      }
    };

    exportCsvBtn.onclick = () => this.exportCSV();
    exportPdfBtn.onclick = () => this.exportPDF();

    document.getElementById('prev-page-btn').onclick = () => {
      if (this.queryParams.page > 1) {
        this.queryParams.page--;
        this.loadHistoryData();
      }
    };

    document.getElementById('next-page-btn').onclick = () => {
      this.queryParams.page++;
      this.loadHistoryData();
    };
  },

  async loadHistoryData() {
    const tbody = document.getElementById('history-tbody');
    const cards = document.getElementById('history-cards');
    try {
      const res = await API.getEntries(this.queryParams);
      if (!document.contains(tbody)) return; // user already switched away
      const { entries, pagination } = res;
      this.currentEntries = entries;

      const currency = escapeHtml(appState.getState().settings.currency || '₹');

      if (entries.length === 0) {
        const empty = UI.empty({ icon: 'search-x', title: 'No readings found', body: 'Try changing your search or filters.' });
        tbody.innerHTML = `<tr><td colspan="10">${empty}</td></tr>`;
        cards.innerHTML = empty;
        UI.refreshIcons();
        this.updatePaginationUI(pagination);
        this.updateSelectionUI();
        return;
      }

      const amountOf = (e) => e.status === 'profit'
        ? `<span class="font-semibold text-good">+${currency}${e.revenue}</span>`
        : (e.status === 'loss'
          ? `<span class="font-semibold text-bad">-${currency}${e.payable}</span>`
          : `<span class="text-ink-2">${currency}0.00</span>`);

      tbody.innerHTML = entries.map(e => {
        const isChecked = this.selectedIds.has(e.id);
        return `
          <tr>
            <td class="text-center print:hidden">
              <input type="checkbox" class="entry-row-checkbox check" data-id="${escapeHtml(e.id)}" ${isChecked ? 'checked' : ''} aria-label="Select reading ${escapeHtml(e.entry_date)}" />
            </td>
            <td class="font-semibold">${escapeHtml(e.entry_date)}</td>
            <td class="font-medium text-good">${e.generated_units}</td>
            <td class="font-medium text-bad">${e.consumed_units}</td>
            <td class="font-semibold ${UI.tone(e.net_units)}">${UI.signed(e.net_units)}</td>
            <td class="text-xs text-ink-2">${currency}${e.buying_rate} / ${currency}${e.selling_rate}</td>
            <td>${amountOf(e)}</td>
            <td>${UI.statusBadge(e.status)}</td>
            <td class="max-w-40 truncate text-xs text-ink-2">${escapeHtml(e.notes || '-')}</td>
            <td class="text-right print:hidden">
              <button class="btn btn-ghost btn-icon edit-entry-btn" data-id="${escapeHtml(e.id)}" aria-label="Edit reading ${escapeHtml(e.entry_date)}">${UI.icon('pencil')}</button>
              <button class="btn btn-ghost btn-icon delete-entry-btn text-bad!" data-id="${escapeHtml(e.id)}" aria-label="Delete reading ${escapeHtml(e.entry_date)}">${UI.icon('trash-2')}</button>
            </td>
          </tr>
        `;
      }).join('');

      cards.innerHTML = entries.map(e => {
        const isChecked = this.selectedIds.has(e.id);
        return `
          <article class="flex items-start gap-3 px-4 pt-1 pb-3">
            <input type="checkbox" class="entry-row-checkbox check mt-3 hidden group-data-selecting/list:block" data-id="${escapeHtml(e.id)}" ${isChecked ? 'checked' : ''} aria-label="Select reading ${escapeHtml(e.entry_date)}" />
            <div class="min-w-0 flex-1">
              <div class="flex min-h-11 items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <h3 class="truncate text-sm font-semibold">${UI.dateLong(e.entry_date)}</h3>
                  ${UI.statusBadge(e.status)}
                </div>
                <div class="-mr-2 flex shrink-0 group-data-selecting/list:hidden">
                  <button class="btn btn-ghost btn-icon edit-entry-btn" data-id="${escapeHtml(e.id)}" aria-label="Edit reading ${escapeHtml(e.entry_date)}">${UI.icon('pencil')}</button>
                  <button class="btn btn-ghost btn-icon delete-entry-btn text-bad!" data-id="${escapeHtml(e.id)}" aria-label="Delete reading ${escapeHtml(e.entry_date)}">${UI.icon('trash-2')}</button>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2 text-sm tabular-nums">
                <div class="min-w-0"><div class="text-xs text-ink-3">Export</div><div class="truncate font-medium text-good">${e.generated_units}</div></div>
                <div class="min-w-0"><div class="text-xs text-ink-3">Import</div><div class="truncate font-medium text-bad">${e.consumed_units}</div></div>
                <div class="min-w-0"><div class="text-xs text-ink-3">Net</div><div class="truncate font-semibold ${UI.tone(e.net_units)}">${UI.signed(e.net_units)}</div></div>
                <div class="min-w-0 text-right"><div class="text-xs text-ink-3">Amount</div><div class="truncate">${amountOf(e)}</div></div>
              </div>
              ${e.notes ? `<p class="mt-1.5 truncate text-xs text-ink-3">${escapeHtml(e.notes)}</p>` : ''}
            </div>
          </article>
        `;
      }).join('');

      UI.refreshIcons();

      // Row Checkboxes & Action handlers (table and card versions stay in sync)
      document.querySelectorAll('.entry-row-checkbox').forEach(cb => {
        cb.onchange = (e) => {
          const id = cb.getAttribute('data-id');
          if (e.target.checked) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
          document.querySelectorAll('.entry-row-checkbox').forEach(other => {
            if (other.getAttribute('data-id') === id) other.checked = e.target.checked;
          });
          this.updateSelectionUI();
        };
      });

      document.querySelectorAll('.edit-entry-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          Router.navigate('entry', { id });
        };
      });

      document.querySelectorAll('.delete-entry-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this entry?')) {
            try {
              await API.deleteEntry(id);
              Toast.success('Entry deleted successfully.');
              this.selectedIds.delete(id);
              // Don't stay on a page that no longer has rows
              if (this.currentEntries.length === 1 && this.queryParams.page > 1) this.queryParams.page--;
              this.loadHistoryData();
            } catch (err) {
              Toast.error('Failed to delete entry');
            }
          }
        };
      });

      this.updatePaginationUI(pagination);
      this.updateSelectionUI();
    } catch (err) {
      console.error('Failed to load history data:', err);
      if (!document.contains(tbody)) return;
      tbody.innerHTML = '<tr><td colspan="10" id="history-table-error"></td></tr>';
      UI.loadError(document.getElementById('history-table-error'), () => this.loadHistoryData());
      UI.loadError(cards, () => this.loadHistoryData());
    }
  },

  updateSelectionUI() {
    const bulkBtn = document.getElementById('bulk-delete-btn');
    const bulkCountSpan = document.getElementById('bulk-delete-count');
    const count = this.selectedIds.size;

    if (count > 0) {
      bulkBtn.style.display = 'inline-flex';
      bulkCountSpan.textContent = `Delete Selected (${count})`;
    } else {
      bulkBtn.style.display = 'none';
    }

    const selectAll = document.getElementById('select-all-checkbox');
    if (selectAll) {
      selectAll.checked = this.currentEntries.length > 0 && this.currentEntries.every(e => this.selectedIds.has(e.id));
    }
  },

  updatePaginationUI(pagination) {
    const { total, page, totalPages, limit } = pagination;
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    document.getElementById('pagination-info').textContent = `Showing ${from}-${to} of ${total} entries`;
    document.getElementById('page-num-display').textContent = `Page ${page} of ${totalPages || 1}`;

    document.getElementById('prev-page-btn').disabled = page <= 1;
    document.getElementById('next-page-btn').disabled = page >= totalPages;
  },

  async exportCSV() {
    // Export every row matching the current filters, not just the visible page
    let entries;
    try {
      const params = { ...this.queryParams, page: 1, limit: 1000 };
      Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === null) delete params[k]; });
      const res = await API.getEntries(params);
      entries = res.entries || [];
    } catch (err) {
      return; // API.request already showed the error
    }

    if (entries.length === 0) {
      Toast.error('No data available to export.');
      return;
    }

    // Quote every cell; prefix values Excel would treat as formulas (CSV injection)
    const cell = (value) => {
      let text = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(text) && isNaN(Number(text))) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = ['Date', 'Generated Units (kWh)', 'Consumed Units (kWh)', 'Net Units (kWh)', 'Buying Rate', 'Selling Rate', 'Revenue', 'Payable', 'Status', 'Notes'];
    const rows = entries.map(e => [
      e.entry_date,
      e.generated_units,
      e.consumed_units,
      e.net_units,
      e.buying_rate,
      e.selling_rate,
      e.revenue,
      e.payable,
      e.status,
      e.notes || ''
    ].map(cell));

    const csvContent = [headers.map(cell).join(','), ...rows.map(r => r.join(','))].join('\n');
    // Blob URL instead of a data: URI (a '#' in a note would truncate a data: URI)
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `solar_history_${localDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    Toast.success(`Exported ${entries.length} entries to CSV.`);
  },

  exportPDF() {
    window.print();
  }
};
