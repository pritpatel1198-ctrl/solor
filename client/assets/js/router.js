/**
 * Single Page Application Router
 */
const Router = {
  routes: {
    auth: AuthView,
    dashboard: DashboardView,
    entry: EntryView,
    records: RecordsView,
    reports: ReportsView,
    calendar: CalendarView,
    settings: SettingsView
  },

  // History and Settlement are the two tabs of the Records module
  resolve(route, params = {}) {
    if (route === 'history' || route === 'settlement') return ['records', { ...params, tab: route }];
    return [this.routes[route] ? route : 'dashboard', params];
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
        }
      };
    });
  },

  async navigate(route, params = {}) {
    [route, params] = this.resolve(route, params);
    const isLoggedIn = await Auth.checkSession();

    if (!isLoggedIn && route !== 'auth') {
      route = 'auth';
    }

    if (isLoggedIn && route === 'auth') {
      route = 'dashboard';
    }

    const hash = route === 'records' ? (params.tab || RecordsView.activeTab) : route;
    history.pushState({ route, params }, '', `#${hash}`);
    await this.renderRoute(route, params);
  },

  async handleLocation() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const isLoggedIn = await Auth.checkSession();

    let [route, params] = this.resolve(hash);
    if (!isLoggedIn) {
      route = 'auth';
      params = {};
    }

    await this.renderRoute(route, params);
  },

  async renderRoute(route, params = {}) {
    const view = this.routes[route] || DashboardView;
    const contentArea = document.getElementById('content-area');
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('top-header');

    appState.setState({ currentView: route });
    window.scrollTo(0, 0);

    const bottomNav = document.getElementById('mobile-bottom-nav');

    // Show/Hide Layout Chrome for Auth page vs Application pages
    if (route === 'auth') {
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
      contentArea.className = 'w-full flex-1';
    } else {
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = 'flex';
      if (bottomNav) bottomNav.style.display = '';
      contentArea.className = 'mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-tabbar md:px-6 md:pt-6 lg:px-8 lg:pb-10';
    }

    // Update Header Title
    const titleMap = {
      dashboard: 'Dashboard',
      entry: 'Daily Entry',
      records: 'Records',
      reports: 'Reports',
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
      if (nav.getAttribute('data-route') === route) nav.setAttribute('aria-current', 'page');
      else nav.removeAttribute('aria-current');
    });


    // Render View Content
    await view.render(contentArea, params);
  }
};
