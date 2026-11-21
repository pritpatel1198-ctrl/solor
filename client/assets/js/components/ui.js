/**
 * Shared UI helpers: small template functions so every screen uses the same components.
 * Callers pass already-escaped strings for values that come from users.
 */
const UI = {
  icon(name, cls = '') {
    return `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
  },

  refreshIcons() {
    if (window.lucide) lucide.createIcons();
  },

  spinner() {
    return '<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>';
  },

  // The screen title lives in the app bar; this adds the description and actions below it
  pageHead({ description = '', actions = '' } = {}) {
    if (!description && !actions) return '';
    return `
      <div class="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between print:hidden">
        ${description ? `<p class="hidden max-w-2xl text-sm text-ink-3 md:block">${description}</p>` : ''}
        ${actions ? `<div class="flex flex-wrap items-center gap-2 md:ml-auto md:shrink-0">${actions}</div>` : ''}
      </div>
    `;
  },

  stat({ label, icon, value, foot = '', tone = 'text-ink', cls = '' }) {
    return `
      <div class="stat ${cls}">
        <span class="stat-label">${icon ? this.icon(icon) : ''}<span class="truncate">${label}</span></span>
        <span class="stat-value ${tone}">${value}</span>
        ${foot ? `<span class="stat-foot">${foot}</span>` : ''}
      </div>
    `;
  },

  kv(label, value, valueCls = '') {
    return `<div class="kv"><span>${label}</span><span class="${valueCls}">${value}</span></div>`;
  },

  tone(n) {
    return n > 0 ? 'text-good' : (n < 0 ? 'text-bad' : 'text-ink');
  },

  signed(n) {
    return `${n > 0 ? '+' : ''}${n}`;
  },

  // +₹12.50 / -₹7 / ₹0 (callers pass an already-escaped currency symbol)
  money(curr, n, showPlus = true) {
    const v = Number(n) || 0;
    return `${v < 0 ? '-' : (showPlus && v > 0 ? '+' : '')}${curr}${Math.abs(v)}`;
  },

  meter(v) {
    return v !== null && v !== undefined ? v : '-';
  },

  // YYYY-MM-DD -> DD/MM/YYYY
  date(dStr) {
    if (!dStr) return '-';
    if (dStr.includes('/')) return escapeHtml(dStr);
    const p = dStr.split('-');
    return escapeHtml(p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr);
  },

  // YYYY-MM-DD -> "Sat, 21 Nov 2026" (built from parts so the day never shifts by timezone)
  dateLong(dStr) {
    const p = (dStr || '').split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return escapeHtml(dStr || '-');
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,(\s*\d{4})$/, '$1');
  },

  statusBadge(status) {
    const cls = status === 'profit' ? 'badge-profit' : (status === 'loss' ? 'badge-loss' : 'badge-balanced');
    return `<span class="badge ${cls}">${escapeHtml(status || 'balanced')}</span>`;
  },

  empty({ icon = 'inbox', title, body = '', action = '' }) {
    return `
      <div class="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span class="grid size-11 place-items-center rounded-full bg-subtle text-ink-3">${this.icon(icon)}</span>
        <p class="text-sm font-semibold text-ink">${title}</p>
        ${body ? `<p class="max-w-sm text-sm text-ink-3">${body}</p>` : ''}
        ${action ? `<div class="mt-2">${action}</div>` : ''}
      </div>
    `;
  },

  // Replaces a stuck loading state with a message and a retry button
  loadError(el, retry) {
    if (!el) return;
    el.innerHTML = this.empty({
      icon: 'cloud-off',
      title: 'Could not load this data',
      body: 'Check your connection and try again.',
      action: '<button type="button" class="btn btn-outline" data-retry>Try again</button>'
    });
    const btn = el.querySelector('[data-retry]');
    if (btn) btn.onclick = retry;
    this.refreshIcons();
  },

  // Chart.js colors and sizing that follow the theme and the screen width
  chartTheme() {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    const isPhone = window.innerWidth < 768;
    return {
      isPhone,
      text: v('--ink-3'),
      grid: v('--line'),
      good: v('--good'),
      bad: v('--bad'),
      accent: v('--accent'),
      ink: v('--ink-2'),
      font: { family: "'Inter', sans-serif", size: isPhone ? 11 : 12 },
      legend: {
        position: 'bottom',
        labels: {
          color: v('--ink-2'),
          boxWidth: 12,
          boxHeight: 12,
          padding: isPhone ? 10 : 16,
          font: { family: "'Inter', sans-serif", size: isPhone ? 11 : 12 }
        }
      }
    };
  }
};
