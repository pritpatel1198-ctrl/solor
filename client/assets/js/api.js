/**
 * Centralized API Client
 */
const API = {
  async request(endpoint, options = {}) {
    const token = appState.getState().token;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        const errorMsg = data.error || `HTTP Error ${response.status}`;
        if (!options.silentError) {
          Toast.error(errorMsg);
        }
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth & Config
  getConfig() {
    return this.request('/config', { silentError: true });
  },

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  signUp(email, password) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Entries
  getEntries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/entries${queryString ? '?' + queryString : ''}`);
  },

  getEntryById(id) {
    return this.request(`/entries/${id}`);
  },

  createEntry(payload) {
    return this.request('/entries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateEntry(id, payload) {
    return this.request(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteEntry(id) {
    return this.request(`/entries/${id}`, {
      method: 'DELETE'
    });
  },

  bulkDeleteEntries(ids) {
    return this.request('/entries/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  },

  // Analytics & Dashboard
  getDashboard() {
    return this.request('/dashboard');
  },

  getReports(period = 'monthly') {
    return this.request(`/reports?period=${period}`);
  },

  getAnalytics() {
    return this.request('/analytics');
  },

  // Settings & Backup
  getSettings() {
    return this.request('/settings');
  },

  updateSettings(payload) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  exportBackup() {
    return this.request('/backup/export');
  },

  importBackup(backupData) {
    return this.request('/backup/import', {
      method: 'POST',
      body: JSON.stringify(backupData)
    });
  }
};
