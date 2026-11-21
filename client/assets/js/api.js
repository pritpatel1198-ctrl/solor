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
      let response;
      try {
        response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
      } catch (networkErr) {
        throw new Error('Network error: unable to reach the server. Check your connection and try again.');
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Server error (HTTP ${response.status}). Please try again.`);
      }

      // Session missing/expired: clear it and return to the login screen
      if (response.status === 401 && token && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/signup')) {
        const errorMsg = data.error || 'Your session has expired. Please sign in again.';
        // Several requests can fail together; only the first one (token still set) notifies and redirects
        if (appState.getState().token) {
          appState.setState({ user: null, token: null });
          Toast.error(errorMsg);
          if (typeof Router !== 'undefined') Router.navigate('auth');
        }
        throw new Error(errorMsg);
      }

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
  getEntries(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/entries${queryString ? "?" + queryString : ""}`, options);
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

  // Dashboard & Reports
  getDashboard() {
    return this.request('/dashboard');
  },

  getReports(params = 'monthly') {
    if (typeof params === 'string') {
      return this.request(`/reports?period=${encodeURIComponent(params)}`);
    }
    const cleanParams = {};
    Object.keys(params || {}).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const queryString = new URLSearchParams(cleanParams).toString();
    return this.request(`/reports${queryString ? '?' + queryString : ''}`);
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
  },

  // Electricity bill cycles (running balance, bill history)
  getBills(options = {}) {
    return this.request('/bills', options);
  },

  createBill(bill) {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify(bill)
    });
  },

  deleteBill(id) {
    return this.request(`/bills/${id}`, {
      method: 'DELETE'
    });
  },

  // Settlement API
  getSettlement(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/settlement${queryString ? '?' + queryString : ''}`);
  },

  calculateSettlement(readings, rate = 2.50) {
    return this.request('/settlement/calculate', {
      method: 'POST',
      body: JSON.stringify({ readings, rate })
    });
  }
};
