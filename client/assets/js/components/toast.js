/**
 * Toast Notification Component
 */
const Toast = {
  container: null,

  init() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-70 flex flex-col items-center gap-2 sm:right-4 sm:left-auto sm:w-96 sm:items-end print:hidden';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    this.container = el;
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const tone = { success: 'text-good', error: 'text-bad', info: 'text-ink-2' }[type] || 'text-ink-2';
    const icon = { success: 'check-circle', error: 'alert-triangle', info: 'info' }[type] || 'info';

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex w-full items-start gap-2.5 rounded-control border border-line bg-surface px-3.5 py-3 text-sm font-medium text-ink shadow-float transition-opacity duration-200';
    if (type === 'error') toast.setAttribute('role', 'alert');

    toast.innerHTML = `
      <span class="${tone}"><i data-lucide="${icon}" aria-hidden="true"></i></span>
      <span class="min-w-0 break-words">${escapeHtml(message)}</span>
    `;

    this.container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); }
};
