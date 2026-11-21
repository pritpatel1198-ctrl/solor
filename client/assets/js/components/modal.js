/**
 * Reusable Modal Component: a bottom sheet on phones, a centered dialog on larger screens.
 */
const Modal = {
  backdrop: null,
  contentEl: null,
  lastFocused: null,

  init() {
    let backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'fixed inset-0 z-60 hidden items-end justify-center bg-scrim sm:items-center sm:p-4 [&.active]:flex';
      backdrop.innerHTML = `
        <div class="pb-safe flex max-h-[85dvh] w-full flex-col rounded-t-sheet bg-surface shadow-float sm:max-w-md sm:rounded-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="flex items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-4">
            <h3 id="modal-title" class="min-w-0 truncate text-base font-semibold">Modal Title</h3>
            <button id="modal-close-btn" type="button" class="btn btn-ghost btn-icon" aria-label="Close">
              <i data-lucide="x" aria-hidden="true"></i>
            </button>
          </div>
          <div id="modal-body" class="overflow-y-auto px-4 py-3 text-sm"></div>
          <div id="modal-footer" class="flex gap-2 border-t border-line p-3 empty:hidden [&>.btn]:flex-1"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    this.backdrop = backdrop;

    document.getElementById('modal-close-btn').onclick = () => this.close();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) this.close();
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('active')) this.close();
    });
  },

  open({ title, bodyHTML, footerHTML }) {
    if (!this.backdrop) this.init();

    this.lastFocused = document.activeElement;
    document.getElementById('modal-title').textContent = title || 'Details';
    document.getElementById('modal-body').innerHTML = bodyHTML || '';
    document.getElementById('modal-footer').innerHTML = footerHTML || '';

    this.backdrop.classList.add('active');
    if (window.lucide) lucide.createIcons();
    document.getElementById('modal-close-btn').focus();
  },

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
      if (this.lastFocused && document.contains(this.lastFocused)) this.lastFocused.focus();
    }
  }
};
