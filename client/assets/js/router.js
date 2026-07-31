/**
 * Single Page Application Router
 */
const Router = {
  routes: {
    auth: AuthView,
    dashboard: DashboardView,
    entry: EntryView,
    history: HistoryView,
    reports: ReportsView,
    analytics: AnalyticsView,
    calendar: CalendarView,
    settings: SettingsView
  },

  init() {
    window.onpopstate = () => this.handleLocation();
    this.bindSidebarNav();
  },

  bindSidebarNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        if (route) {
          this.navigate(route);
          // Close mobile sidebar if open
          document.querySelector('.sidebar')?.classList.remove('mobile-open');
        }
      };
    });
  },

  async navigate(route, params = {}) {
    const isLoggedIn = await Auth.checkSession();

    if (!isLoggedIn && route !== 'auth') {
      route = 'auth';
    }

    if (isLoggedIn && route === 'auth') {
      route = 'dashboard';
    }

    history.pushState({ route, params }, '', `#${route}`);
    await this.renderRoute(route, params);
  },

  async handleLocation() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const isLoggedIn = await Auth.checkSession();

    let route = hash;
    if (!isLoggedIn) route = 'auth';

    await this.renderRoute(route);
  },

  async renderRoute(route, params = {}) {
    const view = this.routes[route] || DashboardView;
    const contentArea = document.getElementById('content-area');
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('top-header');

    appState.setState({ currentView: route });

    // Show/Hide Layout Chrome for Auth page vs Application pages
    if (route === 'auth') {
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      contentArea.style.padding = '0';
    } else {
      if (sidebar) sidebar.style.display = 'flex';
      if (header) header.style.display = 'flex';
      contentArea.style.padding = '';
    }

    // Update Header Title
    const titleMap = {
      dashboard: 'Dashboard',
      entry: 'Daily Entry',
      history: 'History',
      reports: 'Reports',
      analytics: 'Analytics',
      calendar: 'Calendar',
      settings: 'Settings'
    };
    const titleEl = document.getElementById('header-view-title');
    if (titleEl) titleEl.textContent = titleMap[route] || 'Dashboard';

    // Update Active Navigation Item
    document.querySelectorAll('.nav-item').forEach(nav => {
      if (nav.getAttribute('data-route') === route) {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    });

    // Render View Content
    await view.render(contentArea, params);
  }
};
