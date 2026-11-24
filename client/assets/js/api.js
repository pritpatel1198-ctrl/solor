/**
 * Centralized API Client
 */
const API = {
  refreshPromise: null,

  tokenExpiresSoon() {
    const expiresAt = Number(localStorage.getItem('solar_token_expires_at'));
    return Boolean(expiresAt && localStorage.getItem('solar_refresh_token') && expiresAt - Date.now() / 1000 < 60);
  },

  // Requests that fail together share one renewal: refresh tokens are single-use
  refreshSession() {
    if (!this.refreshPromise) {
      const run = () => this.renewSession();
      const renewal = navigator.locks ? navigator.locks.request('solar-auth-refresh', run) : run();
      this.refreshPromise = renewal.finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  },

  // Resolves to 'ok', 'expired' (must sign in again) or 'unavailable' (temporary; keep the session)
  async renewSession() {
    // Another browser tab may have renewed the session already
    const storedToken = localStorage.getItem('solar_auth_token');
    if (storedToken && storedToken !== appState.getState().token) {
      appState.setState({ token: storedToken });
      return 'ok';
    }

    const refreshToken = localStorage.getItem('solar_refresh_token');
    if (!refreshToken) return 'expired';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (response.status === 400 || response.status === 401) {
        // localStorage reaches other tabs with a small delay: this token may have just been
        // rotated by another tab, which is not an expired login
        await new Promise(resolve => setTimeout(resolve, 300));
        const latestRefresh = localStorage.getItem('solar_refresh_token');
        const latestToken = localStorage.getItem('solar_auth_token');
        if (latestRefresh && latestRefresh !== refreshToken && latestToken) {
          appState.setState({ token: latestToken });
          return 'ok';
        }
        return 'expired';
      }
      if (!response.ok) return 'unavailable';
      const data = await response.json();
      if (!data.data || !data.data.session) return 'unavailable';
      appState.setSession(data.data.session);
      // Hold the cross-tab lock briefly so other tabs see the new token before they check
      await new Promise(resolve => setTimeout(resolve, 150));
      return 'ok';
    } catch (err) {
      return 'unavailable';
    }
  },

  endSession(message) {
    // Several requests can fail together; only the first one notifies and redirects
    if (appState.getState().token) {
      appState.setState({ user: null, token: null });
      Toast.error(message);
      if (typeof Router !== 'undefined') Router.navigate('auth');
    }
  },

  async request(endpoint, options = {}, isRetry = false) {
    const isPublic = ['/config', '/auth/login', '/auth/signup', '/auth/refresh'].some(p => endpoint.startsWith(p));
    const isLogout = endpoint.startsWith('/auth/logout');
    const expiredMessage = 'Your session has expired. Please sign in again.';
    const fail = (message, status) => Object.assign(new Error(message), { status });

    try {
      if (!isPublic && appState.getState().token && this.tokenExpiresSoon()) {
        const renewal = await this.refreshSession();
        if (renewal === 'expired') {
          if (!isLogout) this.endSession(expiredMessage);
          throw fail(expiredMessage, 401);
        }
      }

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

      let response;
      try {
        response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
      } catch (networkErr) {
        throw fail('Network error: unable to reach the server. Check your connection and try again.', 0);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw fail(`Server error (HTTP ${response.status}). Please try again.`, response.status);
      }

      // Access token rejected: renew it once and repeat the request
      if (response.status === 401 && token && !isPublic && !isLogout) {
        if (!isRetry) {
          // Another request may have renewed the token while this one was in flight
          const renewal = appState.getState().token !== token ? 'ok' : await this.refreshSession();
          if (renewal === 'ok') return await this.request(endpoint, options, true);
          if (renewal === 'unavailable') {
            const message = 'Could not reach the login service. Please try again.';
            if (!options.silentError) Toast.error(message);
            throw fail(message, 503);
          }
        }
        this.endSession(data.error || expiredMessage);
        throw fail(data.error || expiredMessage, 401);
      }

      if (!response.ok || data.success === false) {
        const errorMsg = data.error || `HTTP Error ${response.status}`;
        if (!options.silentError) {
          Toast.error(errorMsg);
        }
        throw fail(errorMsg, response.status);
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

  logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      silentError: true,
      signal: AbortSignal.timeout(4000)
    });
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
