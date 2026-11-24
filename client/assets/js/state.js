/**
 * Reactive State Store
 */
class StateStore {
  constructor() {
    this.state = {
      user: null,
      token: localStorage.getItem('solar_auth_token') || null,
      settings: {
        default_buying_rate: 2.25,
        default_selling_rate: 2.25,
        currency: '₹',
        theme: 'light'
      },
      currentView: 'auth',
      theme: localStorage.getItem('solar_theme') || 'light'
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (newState.token !== undefined) {
      if (newState.token) {
        localStorage.setItem('solar_auth_token', newState.token);
      } else {
        localStorage.removeItem('solar_auth_token');
        localStorage.removeItem('solar_refresh_token');
        localStorage.removeItem('solar_token_expires_at');
      }
    }
    if (newState.theme !== undefined) {
      localStorage.setItem('solar_theme', newState.theme);
      document.documentElement.setAttribute('data-theme', newState.theme);
    }
    this.notify();
  }

  // Store a Supabase session: the short-lived access token plus what's needed to renew it
  setSession(session) {
    // Access token first: another tab that sees a new refresh token can rely on it being there too
    this.setState({ token: session.access_token });
    if (session.refresh_token) localStorage.setItem('solar_refresh_token', session.refresh_token);
    else localStorage.removeItem('solar_refresh_token');
    if (session.expires_at) localStorage.setItem('solar_token_expires_at', String(session.expires_at));
    else localStorage.removeItem('solar_token_expires_at');
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }
}

const appState = new StateStore();
