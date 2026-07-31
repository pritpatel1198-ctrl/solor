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
      const token = res.data.session?.access_token || 'demo-token-' + Date.now();
      const user = res.data.user;

      appState.setState({ user, token });
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
      const token = res.data.session?.access_token || 'demo-token-' + Date.now();
      const user = res.data.user;

      appState.setState({ user, token });
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  async signOut() {
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.auth.signOut();
      } catch (e) {}
    }
    appState.setState({ user: null, token: null });
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
      appState.setState({ user: null, token: null });
      return false;
    }
  }
};
