/**
 * Authentication Management Module
 */
const Auth = {
  supabaseClient: null,

  async init() {
    try {
      const res = await API.getConfig();
      if (res && res.data && res.data.SUPABASE_URL) {
        CONFIG.SUPABASE_URL = res.data.SUPABASE_URL;
        CONFIG.SUPABASE_ANON_KEY = res.data.SUPABASE_ANON_KEY;
        if (window.supabase && CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('demo-solar')) {
          this.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        }
      }
    } catch (e) {
      console.warn('Config fetch failed, running standard auth.');
    }
  },

  async signUp(email, password) {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      const res = await API.signUp(email, password);
      const token = res.data.session?.access_token;
      // No session means Supabase requires email confirmation before the first sign-in
      if (!token) return { ...res.data, needsConfirmation: true };

      appState.setSession(res.data.session);
      appState.setState({ user: res.data.user });
      await this.loadSettings();
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  async signIn(email, password) {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      const res = await API.login(email, password);
      const token = res.data.session?.access_token;
      if (!token) throw new Error('Sign in failed: no session was returned.');

      appState.setSession(res.data.session);
      appState.setState({ user: res.data.user });
      await this.loadSettings();
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Load the signed-in user's settings (rates, currency) into app state.
   */
  async loadSettings() {
    try {
      const res = await API.getSettings();
      if (res && res.data) appState.setState({ settings: res.data });
    } catch (err) {
      console.warn('Could not load user settings:', err.message);
    }
  },

  async signOut() {
    try {
      await API.logout();
    } catch (err) {
      // Still sign out on this device if the server can't be reached
      console.warn('Could not revoke session on the server:', err.message);
    }
    appState.setState({
      user: null,
      token: null,
      settings: { default_buying_rate: 2.25, default_selling_rate: 2.25, currency: '₹', theme: appState.getState().theme }
    });
    Router.navigate('auth');
  },

  async checkSession() {
    const token = appState.getState().token;
    if (!token) return false;

    try {
      const res = await API.getMe();
      if (res && res.success && res.data) {
        appState.setState({ user: res.data });
        return true;
      } else {
        appState.setState({ user: null, token: null });
        return false;
      }
    } catch (err) {
      // Only a rejected login ends the session; a network or server hiccup must not
      if (err.status === 401) {
        appState.setState({ user: null, token: null });
        return false;
      }
      return Boolean(appState.getState().token);
    }
  }
};
