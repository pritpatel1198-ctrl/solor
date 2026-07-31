/**
 * Daily Entry View Component
 */
const EntryView = {
  currentEntryId: null,

  async render(container, params = {}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const settings = appState.getState().settings;
    const currency = settings.currency || '₹';

    this.currentEntryId = params.id || null;

    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${this.currentEntryId ? 'Edit Solar Entry' : 'Daily Solar Meter Entry'}</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Record daily solar meter readings to automatically calculate financial revenue & loss.</p>
      </div>

      <div class="card" style="max-width: 720px; margin: 0 auto;">
        <div class="card-header">
          <h3 class="card-title">${this.currentEntryId ? 'Update Entry Details' : 'New Meter Reading'}</h3>
          <span id="entry-status-badge" class="badge badge-balanced">BALANCED</span>
        </div>
        <div class="card-body">
          <form id="daily-entry-form">
            <div class="entry-form-grid">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label" for="entry-date">Reading Date</label>
                <input type="date" id="entry-date" class="form-control" value="${todayStr}" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="entry-generated">Solar Generated Units (kWh)</label>
                <input type="number" step="0.01" min="0" id="entry-generated" class="form-control" placeholder="e.g. 7.00" value="" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="entry-consumed">Grid Consumed Units (kWh)</label>
                <input type="number" step="0.01" min="0" id="entry-consumed" class="form-control" placeholder="e.g. 5.00" value="" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="entry-buying-rate">Govt Buying Rate (${currency}/Unit)</label>
                <input type="number" step="0.01" min="0" id="entry-buying-rate" class="form-control" value="${settings.default_buying_rate || 2.00}" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="entry-selling-rate">Govt Selling Rate (${currency}/Unit)</label>
                <input type="number" step="0.01" min="0" id="entry-selling-rate" class="form-control" value="${settings.default_selling_rate || 7.00}" required />
              </div>

              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label" for="entry-notes">Notes / Observations (Optional)</label>
                <textarea id="entry-notes" class="form-control" rows="2" placeholder="e.g. Sunny day, minor cloud cover..."></textarea>
              </div>
            </div>

            <!-- Auto-Calculate Live Preview Box -->
            <div class="calculation-preview-box">
              <div class="preview-grid">
                <div>
                  <div class="preview-item-title">Net Units</div>
                  <div id="preview-net" class="preview-item-value">0.00 kWh</div>
                </div>
                <div>
                  <div class="preview-item-title">Revenue (Earned)</div>
                  <div id="preview-revenue" class="preview-item-value" style="color: var(--success-600);">${currency}0.00</div>
                </div>
                <div>
                  <div class="preview-item-title">Payable (Owed)</div>
                  <div id="preview-payable" class="preview-item-value" style="color: var(--danger-600);">${currency}0.00</div>
                </div>
                <div>
                  <div class="preview-item-title">Status</div>
                  <div id="preview-status" class="preview-item-value">Balanced</div>
                </div>
              </div>
            </div>

            <!-- Form Action Buttons -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 24px;">
              <button type="button" id="entry-reset-btn" class="btn btn-outline">
                <i data-lucide="rotate-ccw"></i>
                <span>Reset</span>
              </button>
              ${this.currentEntryId ? `
                <button type="button" id="entry-delete-btn" class="btn btn-danger">
                  <i data-lucide="trash-2"></i>
                  <span>Delete</span>
                </button>
              ` : ''}
              <button type="submit" id="entry-save-btn" class="btn btn-primary">
                <i data-lucide="check"></i>
                <span>${this.currentEntryId ? 'Update Entry' : 'Save Entry'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();

    if (this.currentEntryId) {
      await this.loadEntryForEditing(this.currentEntryId);
    } else {
      this.updateLivePreview();
    }
  },

  bindEvents() {
    const form = document.getElementById('daily-entry-form');
    const resetBtn = document.getElementById('entry-reset-btn');
    const deleteBtn = document.getElementById('entry-delete-btn');

    ['entry-generated', 'entry-consumed', 'entry-buying-rate', 'entry-selling-rate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updateLivePreview());
      }
    });

    resetBtn.onclick = () => {
      form.reset();
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
      const saveBtn = document.getElementById('entry-save-btn');
      saveBtn.disabled = true;

      const payload = {
        entry_date: document.getElementById('entry-date').value,
        generated_units: parseFloat(document.getElementById('entry-generated').value) || 0,
        consumed_units: parseFloat(document.getElementById('entry-consumed').value) || 0,
        buying_rate: parseFloat(document.getElementById('entry-buying-rate').value) || 0,
        selling_rate: parseFloat(document.getElementById('entry-selling-rate').value) || 0,
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
      statusEl.style.color = 'var(--success-600)';
    } else if (status === 'Loss') {
      badgeEl.classList.add('badge-loss');
      statusEl.style.color = 'var(--danger-600)';
    } else {
      badgeEl.classList.add('badge-balanced');
      statusEl.style.color = 'var(--text-primary)';
    }
  },

  async loadEntryForEditing(id) {
    try {
      const res = await API.getEntryById(id);
      const data = res.data;

      document.getElementById('entry-date').value = data.entry_date;
      document.getElementById('entry-generated').value = data.generated_units;
      document.getElementById('entry-consumed').value = data.consumed_units;
      document.getElementById('entry-buying-rate').value = data.buying_rate;
      document.getElementById('entry-selling-rate').value = data.selling_rate;
      document.getElementById('entry-notes').value = data.notes || '';

      this.updateLivePreview();
    } catch (err) {
      Toast.error('Could not load entry details');
    }
  }
};
