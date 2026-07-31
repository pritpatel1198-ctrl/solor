/**
 * Reusable Modal Component
 */
const Modal = {
  backdrop: null,
  contentEl: null,

  init() {
    let backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title" class="card-title">Modal Title</h3>
            <button id="modal-close-btn" class="btn btn-outline btn-sm btn-icon">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div id="modal-body" class="modal-body"></div>
          <div id="modal-footer" class="modal-footer"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    this.backdrop = backdrop;

    document.getElementById('modal-close-btn').onclick = () => this.close();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) this.close();
    };
  },

  open({ title, bodyHTML, footerHTML }) {
    if (!this.backdrop) this.init();

    document.getElementById('modal-title').textContent = title || 'Details';
    document.getElementById('modal-body').innerHTML = bodyHTML || '';
    document.getElementById('modal-footer').innerHTML = footerHTML || '';

    this.backdrop.classList.add('active');
    if (window.lucide) lucide.createIcons();
  },

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
    }
  }
};
