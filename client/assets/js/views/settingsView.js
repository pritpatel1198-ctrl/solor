/**
 * Settings View Component
 */
const SettingsView = {
  async render(container) {
    const settings = appState.getState().settings;
    const user = appState.getState().user;
    const currentTheme = appState.getState().theme;

    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Settings & Preferences</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Configure solar electricity buying/selling rates, currency symbol, display theme, and data backups.</p>
      </div>

      <div class="settings-grid">
        <!-- Tariff & Preferences Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Default Tariff Rates & Currency</h3>
          </div>
          <div class="card-body">
            <form id="settings-form">
              <div class="form-group">
                <label class="form-label" for="setting-buying-rate">Default Govt Buying Rate (Revenue/Unit)</label>
                <input type="number" step="0.01" min="0" id="setting-buying-rate" class="form-control" value="${settings.default_buying_rate}" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="setting-selling-rate">Default Govt Selling Rate (Payable/Unit)</label>
                <input type="number" step="0.01" min="0" id="setting-selling-rate" class="form-control" value="${settings.default_selling_rate}" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="setting-currency">Currency Symbol</label>
                <select id="setting-currency" class="form-select">
                  <option value="₹" ${settings.currency === '₹' ? 'selected' : ''}>₹ (INR - Indian Rupee)</option>
                  <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ (USD - US Dollar)</option>
                  <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ (EUR - Euro)</option>
                  <option value="£" ${settings.currency === '£' ? 'selected' : ''}>£ (GBP - British Pound)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="setting-theme">Color Theme</label>
                <select id="setting-theme" class="form-select">
                  <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Mode</option>
                  <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                </select>
              </div>

              <button type="submit" id="settings-save-btn" class="btn btn-primary" style="margin-top: 10px;">
                <i data-lucide="save"></i>
                <span>Save Preferences</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Account Profile & Data Backup / Restore Card -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- User Profile -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">User Account Profile</h3>
            </div>
            <div class="card-body">
              <div style="display: flex; align-items: center; gap: 16px;">
                <div class="user-avatar" style="width: 48px; height: 48px; font-size: 1.2rem;">
                  ${user && user.email ? user.email.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">${user ? user.email : 'Prit@solar.com'}</div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">User ID: ${user ? user.id : 'demo-user-id'}</div>
                </div>
              </div>
              <button id="settings-logout-btn" class="btn btn-outline btn-sm" style="margin-top: 20px; color: var(--danger-600);">
                <i data-lucide="log-out"></i>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <!-- Data Backup & Restore -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Data Backup & Restore</h3>
            </div>
            <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
              <p style="font-size: 0.88rem; color: var(--text-secondary);">Export your complete solar dataset to JSON or restore from a previous backup file.</p>
              
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button id="backup-export-btn" class="btn btn-secondary">
                  <i data-lucide="download"></i>
                  <span>Export Backup (JSON)</span>
                </button>

                <label class="btn btn-outline" style="cursor: pointer;">
                  <i data-lucide="upload"></i>
                  <span>Restore from JSON</span>
                  <input type="file" id="backup-import-file" accept=".json" style="display: none;" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadSettingsData();
  },

  bindEvents() {
    const form = document.getElementById('settings-form');
    const themeSelect = document.getElementById('setting-theme');
    const logoutBtn = document.getElementById('settings-logout-btn');
    const exportBtn = document.getElementById('backup-export-btn');
    const importFileInput = document.getElementById('backup-import-file');

    themeSelect.onchange = (e) => {
      appState.setState({ theme: e.target.value });
    };

    logoutBtn.onclick = () => Auth.signOut();

    exportBtn.onclick = async () => {
      try {
        const backupData = await API.exportBackup();
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solar_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Backup file exported successfully!');
      } catch (err) {
        Toast.error('Failed to export backup data.');
      }
    };

    importFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const res = await API.importBackup(json);
          Toast.success(res.message || 'Data restored successfully!');
          await this.loadSettingsData();
        } catch (err) {
          Toast.error('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('settings-save-btn');
      saveBtn.disabled = true;

      const payload = {
        default_buying_rate: parseFloat(document.getElementById('setting-buying-rate').value) || 2.00,
        default_selling_rate: parseFloat(document.getElementById('setting-selling-rate').value) || 7.00,
        currency: document.getElementById('setting-currency').value,
        theme: document.getElementById('setting-theme').value
      };

      try {
        const res = await API.updateSettings(payload);
        appState.setState({ settings: res.data, theme: res.data.theme });
        Toast.success('Settings updated successfully!');
      } catch (err) {
        Toast.error('Failed to update settings');
      } finally {
        saveBtn.disabled = false;
      }
    };
  },

  async loadSettingsData() {
    try {
      const res = await API.getSettings();
      appState.setState({ settings: res.data });

      document.getElementById('setting-buying-rate').value = res.data.default_buying_rate;
      document.getElementById('setting-selling-rate').value = res.data.default_selling_rate;
      document.getElementById('setting-currency').value = res.data.currency;
      document.getElementById('setting-theme').value = res.data.theme;
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  }
};
