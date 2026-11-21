/**
 * Records: daily readings (History) and monthly Settlement in one module.
 * Each tab has its own URL (#history, #settlement) so reload and Back keep the tab.
 */
const RecordsView = {
  activeTab: 'history',

  async render(container, params = {}) {
    if (params.tab) this.activeTab = params.tab;

    const tabs = [['history', 'history', 'Daily log'], ['settlement', 'scale', 'Settlement']];
    container.innerHTML = `
      <div class="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 -mt-4 mb-3 bg-canvas px-4 py-2 md:-mx-6 md:-mt-6 md:mb-4 md:px-6 md:py-3 lg:top-16 lg:-mx-8 lg:px-8 print:hidden">
        <div class="segmented mx-auto max-w-md lg:mx-0" role="tablist" aria-label="Records">
          ${tabs.map(([id, icon, label]) => `
            <button type="button" role="tab" class="records-tab segment ${this.activeTab === id ? 'active' : ''}" data-tab="${id}" aria-selected="${this.activeTab === id}">
              ${UI.icon(icon)}<span>${label}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div id="records-panel"></div>
    `;

    container.querySelectorAll('.records-tab').forEach(tab => {
      tab.onclick = () => this.switchTab(tab.getAttribute('data-tab'));
    });
    UI.refreshIcons();
    await this.renderPanel();
  },

  async switchTab(tabId) {
    if (tabId === this.activeTab) return;
    this.activeTab = tabId;
    document.querySelectorAll('.records-tab').forEach(t => {
      const active = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    history.replaceState({ route: 'records', params: { tab: tabId } }, '', `#${tabId}`);
    window.scrollTo(0, 0);
    await this.renderPanel();
  },

  async renderPanel() {
    const panel = document.getElementById('records-panel');
    const view = this.activeTab === 'settlement' ? SettlementView : HistoryView;
    await view.render(panel);
  }
};
