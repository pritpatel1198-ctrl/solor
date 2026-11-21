/**
 * Settings View Component
 */
const SettingsView = {
  async render(container) {
    const settings = appState.getState().settings;
    const user = appState.getState().user;
    const currentTheme = appState.getState().theme;

    container.innerHTML = `
      ${UI.pageHead({ description: 'Tariff rates, currency, theme, account and data backups.' })}

      <div class="mx-auto grid max-w-4xl grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
        <!-- Account -->
        <section class="card card-body md:col-start-2" aria-label="Account">
          <div class="flex items-center gap-3">
            <span class="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-on-primary" aria-hidden="true">
              ${user && user.email ? escapeHtml(user.email.charAt(0).toUpperCase()) : 'S'}
            </span>
            <div class="min-w-0">
              <div class="truncate text-[0.9375rem] font-semibold">${escapeHtml(user ? user.email : '')}</div>
              <div class="truncate text-xs text-ink-3">ID ${escapeHtml(user ? user.id : '')}</div>
            </div>
          </div>
          <button id="settings-logout-btn" class="btn btn-danger btn-block mt-4">
            ${UI.icon('log-out')}<span>Sign Out</span>
          </button>
        </section>

        <!-- Tariffs -->
        <section class="card md:col-start-1 md:row-span-2 md:row-start-1" aria-labelledby="settings-tariff-title">
          <div class="card-header"><h2 id="settings-tariff-title" class="card-title">Rates &amp; preferences</h2></div>
          <div class="card-body">
            <form id="settings-form" class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="field">
                  <label class="label" for="setting-buying-rate">Buying rate (per unit)</label>
                  <input type="number" inputmode="decimal" step="0.01" min="0" id="setting-buying-rate" class="input" value="${settings.default_buying_rate}" required />
                </div>
                <div class="field">
                  <label class="label" for="setting-selling-rate">Selling rate (per unit)</label>
                  <input type="number" inputmode="decimal" step="0.01" min="0" id="setting-selling-rate" class="input" value="${settings.default_selling_rate}" required />
                </div>
              </div>
              <p class="hint -mt-2">Buying: what the govt credits you for surplus. Selling: what you pay for grid units.</p>

              <div class="field">
                <label class="label" for="setting-currency">Currency</label>
                <select id="setting-currency" class="input">
                  <option value="₹" ${settings.currency === '₹' ? 'selected' : ''}>₹ Indian Rupee</option>
                  <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ US Dollar</option>
                  <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ Euro</option>
                  <option value="£" ${settings.currency === '£' ? 'selected' : ''}>£ British Pound</option>
                </select>
              </div>

              <div class="field">
                <label class="label" for="setting-theme">Theme</label>
                <select id="setting-theme" class="input">
                  <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
                  <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                </select>
              </div>

              <button type="submit" id="settings-save-btn" class="btn btn-primary btn-block">
                ${UI.icon('save')}<span>Save Preferences</span>
              </button>
            </form>
          </div>
        </section>

        <!-- Backup -->
        <section class="card md:col-start-2" aria-labelledby="settings-backup-title">
          <div class="card-header"><h2 id="settings-backup-title" class="card-title">Backup &amp; restore</h2></div>
          <div class="card-body flex flex-col gap-3">
            <p class="text-sm text-ink-3">Download all your data as a JSON file, or restore from an earlier backup.</p>
            <div class="grid grid-cols-2 gap-2">
              <button id="backup-export-btn" class="btn btn-outline">${UI.icon('download')}<span>Export</span></button>
              <label class="btn btn-outline cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
                ${UI.icon('upload')}<span>Restore</span>
                <input type="file" id="backup-import-file" accept=".json" class="sr-only" />
              </label>
            </div>
          </div>
        </section>
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
        a.download = `solar_tracker_backup_${localDateStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Backup file exported successfully!');
      } catch (err) {
        Toast.error('Failed to export backup data.');
      }
    };

    importFileInput.onchange = (e) => {
      const file = e.target.files[0];
      // Allow choosing the same file again later
      e.target.value = '';
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
        default_selling_rate: parseFloat(document.getElementById('setting-selling-rate').value) || 2.25,
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
