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
    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Meter Reading History</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">View, search, filter, export, and manage your complete historical solar log.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="export-csv-btn" class="btn btn-outline">
            <i data-lucide="file-spreadsheet"></i>
            <span>Export CSV</span>
          </button>
          <button id="export-pdf-btn" class="btn btn-outline">
            <i data-lucide="file-text"></i>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <!-- History Search & Filter Toolbar -->
      <div class="history-toolbar">
        <div class="history-search-group">
          <input type="text" id="history-search-input" class="form-control" placeholder="Search by date, notes, units..." value="${this.queryParams.search}" />
          
          <select id="history-status-filter" class="form-select" style="max-width: 150px;">
            <option value="all" ${this.queryParams.status === 'all' ? 'selected' : ''}>All Status</option>
            <option value="profit" ${this.queryParams.status === 'profit' ? 'selected' : ''}>Profit Only</option>
            <option value="loss" ${this.queryParams.status === 'loss' ? 'selected' : ''}>Loss Only</option>
            <option value="balanced" ${this.queryParams.status === 'balanced' ? 'selected' : ''}>Balanced</option>
          </select>
        </div>

        <div class="history-actions-group">
          <input type="date" id="history-start-date" class="form-control" value="${this.queryParams.startDate}" style="max-width: 150px;" />
          <span style="color: var(--text-muted);">to</span>
          <input type="date" id="history-end-date" class="form-control" value="${this.queryParams.endDate}" style="max-width: 150px;" />

          <button id="bulk-delete-btn" class="btn btn-danger btn-sm" style="display: none;">
            <i data-lucide="trash-2"></i>
            <span id="bulk-delete-count">Delete Selected (0)</span>
          </button>
        </div>
      </div>

      <!-- History Data Table Card -->
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" id="select-all-checkbox" />
                  </th>
                  <th class="sortable-th" data-sort="entry_date">Date <i data-lucide="chevrons-up-down"></i></th>
                  <th class="sortable-th" data-sort="generated_units">Generated <i data-lucide="chevrons-up-down"></i></th>
                  <th class="sortable-th" data-sort="consumed_units">Consumed <i data-lucide="chevrons-up-down"></i></th>
                  <th class="sortable-th" data-sort="net_units">Net Units <i data-lucide="chevrons-up-down"></i></th>
                  <th>Buying / Selling Rate</th>
                  <th class="sortable-th" data-sort="revenue">Revenue / Payable <i data-lucide="chevrons-up-down"></i></th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="history-tbody">
                ${Skeleton.renderTableRows(5, 10)}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div style="padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div id="pagination-info" style="font-size: 0.88rem; color: var(--text-secondary);">
              Showing 0-0 of 0 entries
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="prev-page-btn" class="btn btn-outline btn-sm" disabled>Previous</button>
              <span id="page-num-display" style="font-size: 0.88rem; font-weight: 600; padding: 0 8px;">Page 1</span>
              <button id="next-page-btn" class="btn btn-outline btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
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
    try {
      const res = await API.getEntries(this.queryParams);
      const { entries, pagination } = res;
      this.currentEntries = entries;

      const currency = appState.getState().settings.currency || '₹';
      const tbody = document.getElementById('history-tbody');

      if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">No historical records match your search criteria.</td></tr>`;
        this.updatePaginationUI(pagination);
        return;
      }

      tbody.innerHTML = entries.map(e => {
        const isChecked = this.selectedIds.has(e.id);
        let badgeClass = 'badge-balanced';
        if (e.status === 'profit') badgeClass = 'badge-profit';
        if (e.status === 'loss') badgeClass = 'badge-loss';

        const financialStr = e.status === 'profit' 
          ? `<span style="color: var(--success-600); font-weight: 700;">+${currency}${e.revenue}</span>`
          : (e.status === 'loss' 
            ? `<span style="color: var(--danger-600); font-weight: 700;">-${currency}${e.payable}</span>` 
            : `<span>${currency}0.00</span>`);

        return `
          <tr>
            <td style="text-align: center;">
              <input type="checkbox" class="entry-row-checkbox" data-id="${e.id}" ${isChecked ? 'checked' : ''} />
            </td>
            <td style="font-weight: 600;">${e.entry_date}</td>
            <td style="color: var(--primary-600); font-weight: 600;">${e.generated_units} kWh</td>
            <td style="color: var(--text-secondary);">${e.consumed_units} kWh</td>
            <td style="font-weight: 600;">${e.net_units > 0 ? '+' : ''}${e.net_units} kWh</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${currency}${e.buying_rate} / ${currency}${e.selling_rate}</td>
            <td>${financialStr}</td>
            <td><span class="badge ${badgeClass}">${e.status}</span></td>
            <td style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; color: var(--text-secondary);">${e.notes || '-'}</td>
            <td style="text-align: right;">
              <button class="btn btn-outline btn-sm edit-entry-btn" data-id="${e.id}" title="Edit">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn btn-outline btn-sm delete-entry-btn" data-id="${e.id}" title="Delete" style="color: var(--danger-600);">
                <i data-lucide="trash-2"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();

      // Row Checkboxes & Action handlers
      document.querySelectorAll('.entry-row-checkbox').forEach(cb => {
        cb.onchange = (e) => {
          const id = cb.getAttribute('data-id');
          if (e.target.checked) {
            this.selectedIds.add(id);
          } else {
            this.selectedIds.delete(id);
          }
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

  exportCSV() {
    if (this.currentEntries.length === 0) {
      Toast.error('No data available to export.');
      return;
    }

    const headers = ['Date', 'Generated Units (kWh)', 'Consumed Units (kWh)', 'Net Units (kWh)', 'Buying Rate', 'Selling Rate', 'Revenue', 'Payable', 'Status', 'Notes'];
    const rows = this.currentEntries.map(e => [
      e.entry_date,
      e.generated_units,
      e.consumed_units,
      e.net_units,
      e.buying_rate,
      e.selling_rate,
      e.revenue,
      e.payable,
      e.status,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solar_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    Toast.success('CSV exported successfully!');
  },

  exportPDF() {
    window.print();
  }
};
