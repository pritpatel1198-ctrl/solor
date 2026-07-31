/**
 * Reactive State Store
 */
class StateStore {
  constructor() {
    this.state = {
      user: null,
      token: localStorage.getItem('solar_auth_token') || null,
      settings: {
        default_buying_rate: 2.00,
        default_selling_rate: 7.00,
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
      }
    }
    if (newState.theme !== undefined) {
      localStorage.setItem('solar_theme', newState.theme);
      document.documentElement.setAttribute('data-theme', newState.theme);
    }
    this.notify();
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
