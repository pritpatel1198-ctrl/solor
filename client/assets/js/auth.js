/**
 * Authentication Management Module
 */
const DEMO_USER_ID = '42d532a5-8e20-4bed-9122-6ee8381384c4';

const Auth = {
  supabaseClient: null,

  init() {
    if (window.supabase && CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('demo-solar')) {
      try {
        this.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      } catch (e) {
        console.warn('Supabase client failed to initialize, using demo mode.');
      }
    }
  },

  async signUp(email, password) {
    if (this.supabaseClient) {
      const { data, error } = await this.supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        appState.setState({ user: data.user, token: data.session.access_token });
      }
      return data;
    }

    // Demo Mode Sign Up
    const demoUser = { id: DEMO_USER_ID, email };
    appState.setState({ user: demoUser, token: 'demo-token' });
    return { user: demoUser };
  },

  async signIn(email, password) {
    if (this.supabaseClient) {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      appState.setState({ user: data.user, token: data.session.access_token });
      return data;
    }

    // Demo Mode Sign In
    const demoUser = { id: DEMO_USER_ID, email: email || 'Prit@solar.com' };
    appState.setState({ user: demoUser, token: 'demo-token' });
    return { user: demoUser };
  },

  async signOut() {
    if (this.supabaseClient) {
      await this.supabaseClient.auth.signOut();
    }
    appState.setState({ user: null, token: null });
    Router.navigate('auth');
  },

  async checkSession() {
    const token = appState.getState().token;
    if (!token) return false;

    if (token === 'demo-token') {
      appState.setState({ user: { id: DEMO_USER_ID, email: 'Prit@solar.com' } });
      return true;
    }

    if (this.supabaseClient) {
      const { data: { user }, error } = await this.supabaseClient.auth.getUser(token);
      if (error || !user) {
        appState.setState({ user: null, token: null });
        return false;
      }
      appState.setState({ user });
      return true;
    }

    // Default fallback
    appState.setState({ user: { id: DEMO_USER_ID, email: 'Prit@solar.com' } });
    return true;
  }
};
