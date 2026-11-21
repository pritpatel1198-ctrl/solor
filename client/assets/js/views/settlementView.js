/**
 * Solar Import/Export Monthly Settlement View Component
 * Clean Read-Only Monthly Settlement Dashboard & Table
 */
const SettlementView = {
  buyingRate: 2.25,
  sellingRate: 2.25,
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  settlementData: null,

  async render(container) {
    const settings = appState.getState().settings;
    const curr = escapeHtml(settings?.currency || '₹');
    if (settings) {
      this.buyingRate = settings.default_buying_rate || 2.25;
      this.sellingRate = settings.default_selling_rate || 2.25;
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    container.innerHTML = `
      <div class="flex flex-col">
      <div class="order-last mt-3 flex gap-2 lg:order-first lg:mt-0 lg:mb-4 lg:justify-end print:hidden">
        <button id="settlement-export-csv" class="btn btn-outline flex-1 lg:flex-none">${UI.icon('file-spreadsheet')}<span>CSV</span></button>
        <button id="settlement-print-pdf" class="btn btn-outline flex-1 lg:flex-none">${UI.icon('printer')}<span>Print</span></button>
        <button id="settlement-download-pdf" class="btn btn-primary flex-1 lg:flex-none">${UI.icon('file-down')}<span>PDF</span></button>
      </div>

      <!-- Month & rates -->
      <section class="card card-body mb-3 md:mb-4" aria-label="Settlement period and rates">
        <div class="grid grid-cols-2 gap-3">
          <div class="field">
            <label class="label" for="settlement-month-select">Month</label>
            <select id="settlement-month-select" class="input">
              ${months.map((m, idx) => `<option value="${idx + 1}" ${idx + 1 === this.currentMonth ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="label" for="settlement-year-select">Year</label>
            <select id="settlement-year-select" class="input">
              ${[2024, 2025, 2026, 2027, 2028].map(y => `<option value="${y}" ${y === this.currentYear ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>
        <details id="settlement-rates" class="group mt-2" ${window.innerWidth >= 1024 ? 'open' : ''}>
          <summary class="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-ink-2">
            <span>Rates</span>
            <span class="text-ink-3 transition-transform duration-150 group-open:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </summary>
          <div class="grid grid-cols-2 gap-3 pt-1">
          <div class="field">
            <label class="label" for="settlement-buying-rate-input">Credit rate (${curr}/unit)</label>
            <input type="number" inputmode="decimal" step="0.01" min="0" id="settlement-buying-rate-input" class="input" value="${this.buyingRate.toFixed(2)}" />
          </div>
          <div class="field">
            <label class="label" for="settlement-selling-rate-input">Payable rate (${curr}/unit)</label>
            <input type="number" inputmode="decimal" step="0.01" min="0" id="settlement-selling-rate-input" class="input" value="${this.sellingRate.toFixed(2)}" />
          </div>
          </div>
        </details>
      </section>

      <!-- Month result: the answer people open this screen for -->
      <div id="settlement-status-banner-box" class="mb-3 md:mb-4"></div>

      <div id="settlement-kpi-grid" class="mb-4 grid grid-cols-2 gap-3 md:mb-6 lg:grid-cols-4 lg:gap-4">
        ${Skeleton.renderKpiCards(4)}
      </div>

      <section class="card" aria-labelledby="settlement-table-title">
        <div class="card-header">
          <h2 id="settlement-table-title" class="card-title">Daily running record</h2>
          <span id="settlement-status-tag" class="badge badge-balanced">Monthly</span>
        </div>

        <div class="table-wrap hidden max-h-[36rem] overflow-y-auto lg:block">
          <table class="data-table" id="settlement-table">
            <thead class="sticky top-0">
              <tr>
                <th>Date</th>
                <th class="num">Open Imp</th>
                <th class="num">Close Imp</th>
                <th class="num">Imp Units</th>
                <th class="num">Open Exp</th>
                <th class="num">Close Exp</th>
                <th class="num">Exp Units</th>
                <th class="num">Gross Diff</th>
                <th class="num">Open Bal</th>
                <th class="num">Prev Adj</th>
                <th class="num">Credit Gen</th>
                <th class="num">Credit Used</th>
                <th class="num">Payable</th>
                <th class="num">Close Bal</th>
                <th>Result</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="settlement-tbody">
              ${Skeleton.renderTableRows(5, 16)}
            </tbody>
          </table>
        </div>

        <div id="settlement-cards" class="divide-y divide-line lg:hidden">${Skeleton.renderListRows(4)}</div>
      </section>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    await this.loadSettlementData();
  },

  bindEvents() {
    const monthSelect = document.getElementById('settlement-month-select');
    const yearSelect = document.getElementById('settlement-year-select');
    const buyingRateInput = document.getElementById('settlement-buying-rate-input');
    const sellingRateInput = document.getElementById('settlement-selling-rate-input');
    const exportBtn = document.getElementById('settlement-export-csv');

    const updateHandler = () => {
      this.currentMonth = parseInt(monthSelect.value, 10);
      this.currentYear = parseInt(yearSelect.value, 10);
      this.buyingRate = parseFloat(buyingRateInput.value) || 2.25;
      this.sellingRate = parseFloat(sellingRateInput.value) || 2.25;
      this.loadSettlementData();
    };

    if (monthSelect) monthSelect.onchange = updateHandler;
    if (yearSelect) yearSelect.onchange = updateHandler;
    if (buyingRateInput) buyingRateInput.oninput = updateHandler;
    if (sellingRateInput) sellingRateInput.oninput = updateHandler;

    if (exportBtn) {
      exportBtn.onclick = () => this.exportCSV();
    }

    const printPdfBtn = document.getElementById('settlement-print-pdf');
    if (printPdfBtn) {
      printPdfBtn.onclick = () => this.printPDF();
    }

    const downloadPdfBtn = document.getElementById('settlement-download-pdf');
    if (downloadPdfBtn) {
      downloadPdfBtn.onclick = () => this.downloadPDF();
    }
  },

  async loadSettlementData() {
    try {
      const res = await API.getSettlement({
        month: this.currentMonth,
        year: this.currentYear,
        buyingRate: this.buyingRate,
        sellingRate: this.sellingRate
      });

      if (!document.getElementById('settlement-kpi-grid')) return; // user already switched away
      this.settlementData = res.data;
      this.renderReport();
    } catch (err) {
      console.error('Failed to load settlement data:', err);
      const cards = document.getElementById('settlement-cards');
      if (cards) UI.loadError(cards, () => this.loadSettlementData());
    }
  },

  renderReport() {
    if (!this.settlementData) return;
    const { summary, history } = this.settlementData;
    const curr = escapeHtml(appState.getState().settings.currency || '₹');

    // KPI tiles
    const kpiGrid = document.getElementById('settlement-kpi-grid');
    kpiGrid.innerHTML = `
      ${UI.stat({ label: 'Export this month', icon: 'arrow-up-right', value: UI.signed(summary.total_export_units), foot: `Meter ${UI.meter(summary.month_closing_export_meter)}`, tone: 'text-good' })}
      ${UI.stat({ label: 'Import this month', icon: 'arrow-down-left', value: `${summary.total_import_units}`, foot: `Meter ${UI.meter(summary.month_closing_import_meter)}`, tone: 'text-bad' })}
      ${UI.stat({ label: 'Credit gen / used', icon: 'repeat', value: `+${summary.total_credit_generated} / ${summary.total_credit_used}`, foot: 'Carry-forward units' })}
      ${UI.stat({ label: 'Payable generated', icon: 'minus-circle', value: `${summary.total_payable_generated}`, foot: 'Units of grid deficit', tone: 'text-bad' })}
    `;

    const tag = document.getElementById('settlement-status-tag');
    if (tag) {
      const bal = summary.month_closing_balance;
      tag.className = `badge ${bal > 0 ? 'badge-profit' : (bal < 0 ? 'badge-loss' : 'badge-balanced')}`;
      tag.textContent = `${history ? history.length : 0} days`;
    }

    // Month result
    const bannerBox = document.getElementById('settlement-status-banner-box');
    const closeBal = summary.month_closing_balance;
    const amountVal = summary.final_settlement_amount_rs.toFixed(2);
    const isPositive = closeBal > 0;
    const isNegative = closeBal < 0;
    const rate = (summary.settlement_rate || (isNegative ? this.sellingRate : this.buyingRate)).toFixed(2);
    const heroTone = isPositive ? 'text-good' : (isNegative ? 'text-bad' : 'text-ink');
    const heroIcon = isPositive ? 'shield-check' : (isNegative ? 'alert-triangle' : 'scale');
    const heroSoft = isPositive ? 'bg-good-soft text-good' : (isNegative ? 'bg-bad-soft text-bad' : 'bg-subtle text-ink-2');
    const heroLabel = isPositive ? 'Govt credit (positive)' : (isNegative ? 'Govt payable (negative)' : 'Balanced');
    const heroText = isPositive
      ? `Iss mahine aapka Total Export (${summary.total_export_units} kWh) aapke Total Import (${summary.total_import_units} kWh) se <b class="font-semibold">${summary.net_gross_difference} kWh zyada</b> hai. Carry-forward ke baad mahine ke end par final balance <b class="font-semibold">+${closeBal} Units</b> (Govt Credit) hai.`
      : isNegative
        ? `Iss mahine aapka Total Import (${summary.total_import_units} kWh) aapke Total Export (${summary.total_export_units} kWh) se zyada hai. Carry-forward ke baad mahine ke end par final balance <b class="font-semibold">${closeBal} Units</b> (Govt Payable) hai.`
        : 'Aapka solar export aur grid import units perfectly balanced hain. Koi credit ya payable pending nahi hai.';

    bannerBox.innerHTML = `
      <section class="card card-body" aria-label="Month result">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[0.8125rem] font-medium text-ink-3">Month-end balance</div>
            <p class="mt-1 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl ${heroTone}">
              ${closeBal > 0 ? '+' : ''}${closeBal}<span class="ml-1.5 text-base font-medium text-ink-3">units</span>
            </p>
          </div>
          <span class="grid size-11 shrink-0 place-items-center rounded-xl ${heroSoft}">${UI.icon(heroIcon)}</span>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-lg font-semibold tabular-nums ${heroTone}">${curr}${amountVal}</span>
          <span class="badge ${isPositive ? 'badge-profit' : (isNegative ? 'badge-loss' : 'badge-balanced')}">${heroLabel}</span>
          ${closeBal !== 0 ? `<span class="text-xs text-ink-3">@ ${curr}${rate}/unit</span>` : ''}
        </div>
        <p class="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-2">${heroText}</p>
      </section>
    `;

    // Daily records
    const tbody = document.getElementById('settlement-tbody');
    const cards = document.getElementById('settlement-cards');
    if (!history || history.length === 0) {
      const empty = UI.empty({
        icon: 'calendar-x',
        title: 'No readings this month',
        body: 'Add a daily reading to start this month\'s settlement.',
        action: `<a href="#entry" class="btn btn-primary" onclick="event.preventDefault(); Router.navigate('entry')">${UI.icon('plus')}<span>Add Reading</span></a>`
      });
      tbody.innerHTML = `<tr><td colspan="16">${empty}</td></tr>`;
      cards.innerHTML = empty;
      UI.refreshIcons();
      return;
    }

    const plus = (n) => `${n >= 0 ? '+' : ''}${n}`;

    tbody.innerHTML = history.map(row => {
      const closeBadgeClass = row.closing_settlement_balance > 0 ? 'badge-profit' : (row.closing_settlement_balance < 0 ? 'badge-loss' : 'badge-balanced');
      return `
        <tr>
          <td class="font-semibold">${UI.date(row.date)}</td>
          <td class="num">${UI.meter(row.opening_import_meter)}</td>
          <td class="num">${UI.meter(row.closing_import_meter)}</td>
          <td class="num font-medium text-bad">${row.daily_import_units}</td>
          <td class="num">${UI.meter(row.opening_export_meter)}</td>
          <td class="num">${UI.meter(row.closing_export_meter)}</td>
          <td class="num font-medium text-good">${row.daily_export_units}</td>
          <td class="num font-semibold ${row.gross_difference >= 0 ? 'text-good' : 'text-bad'}">${UI.signed(row.gross_difference)}</td>
          <td class="num font-medium">${plus(row.opening_settlement_balance)}</td>
          <td class="num font-medium ${row.previous_balance_adjusted >= 0 ? 'text-good' : 'text-bad'}">${plus(row.previous_balance_adjusted)}</td>
          <td class="num text-good">${row.govt_credit_generated}</td>
          <td class="num">${row.govt_credit_used ?? 0}</td>
          <td class="num text-bad">${row.govt_payable}</td>
          <td class="num font-bold ${row.closing_settlement_balance >= 0 ? 'text-good' : 'text-bad'}">${plus(row.closing_settlement_balance)}</td>
          <td><span class="badge normal-case ${closeBadgeClass}">${escapeHtml(row.result_summary)}</span></td>
          <td>
            <button type="button" class="btn btn-ghost btn-icon settlement-edit-btn" data-id="${escapeHtml(row.id || '')}" data-date="${escapeHtml(row.date)}" aria-label="Edit reading ${UI.date(row.date)}">
              ${UI.icon('pencil')}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    cards.innerHTML = history.map(row => {
      const close = row.closing_settlement_balance;
      return `
        <details class="group/row">
          <summary class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">${UI.dateLong(row.date)}</span>
              <span class="block text-xs text-ink-3 tabular-nums">Exp ${row.daily_export_units} · Imp ${row.daily_import_units} · Diff ${UI.signed(row.gross_difference)}</span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="text-right">
                <span class="block text-sm font-semibold tabular-nums ${close >= 0 ? 'text-good' : 'text-bad'}">${plus(close)}</span>
                <span class="block text-[0.6875rem] text-ink-3">closing</span>
              </span>
              <span class="text-ink-3 transition-transform duration-150 group-open/row:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
            </span>
          </summary>
          <div class="border-t border-line bg-subtle/40 px-4 pt-1 pb-3">
            <div class="divide-y divide-line">
              ${UI.kv('Import meter', `${UI.meter(row.opening_import_meter)} → ${UI.meter(row.closing_import_meter)}`)}
              ${UI.kv('Export meter', `${UI.meter(row.opening_export_meter)} → ${UI.meter(row.closing_export_meter)}`)}
              ${UI.kv('Opening balance', plus(row.opening_settlement_balance))}
              ${UI.kv('Previous adjusted', plus(row.previous_balance_adjusted), row.previous_balance_adjusted >= 0 ? 'text-good' : 'text-bad')}
              ${UI.kv('Credit generated', row.govt_credit_generated, 'text-good')}
              ${UI.kv('Credit used', row.govt_credit_used ?? 0)}
              ${UI.kv('Payable', row.govt_payable, 'text-bad')}
            </div>
            <p class="mt-2 text-xs text-ink-2">${escapeHtml(row.result_summary)}</p>
            <button type="button" class="btn btn-outline btn-block settlement-edit-btn mt-2" data-id="${escapeHtml(row.id || '')}" data-date="${escapeHtml(row.date)}">
              ${UI.icon('pencil')}<span>Edit reading</span>
            </button>
          </div>
        </details>
      `;
    }).join('');

    // Bind click listeners on Edit buttons
    document.querySelectorAll('.settlement-edit-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          Router.navigate('entry', { id });
        } else {
          Router.navigate('entry', { date: btn.getAttribute('data-date') });
        }
      };
    });

    UI.refreshIcons();
  },

  exportCSV() {
    if (!this.settlementData || !this.settlementData.history || this.settlementData.history.length === 0) {
      Toast.error('No settlement data available to export.');
      return;
    }

    const headers = [
      'Date', 'Opening Import Meter', 'Closing Import Meter', 'Daily Import Units',
      'Opening Export Meter', 'Closing Export Meter', 'Daily Export Units',
      'Gross Difference', 'Opening Settlement Balance', 'Previous Balance Adjusted',
      'Govt Credit Generated', 'Govt Credit Used', 'Govt Payable',
      'Closing Settlement Balance', 'Settlement Status', 'Settlement Rate (₹)', 'Settlement Amount (₹)'
    ];

    const rows = this.settlementData.history.map(row => [
      row.date,
      row.opening_import_meter ?? '',
      row.closing_import_meter ?? '',
      row.daily_import_units,
      row.opening_export_meter ?? '',
      row.closing_export_meter ?? '',
      row.daily_export_units,
      row.gross_difference,
      row.opening_settlement_balance,
      row.previous_balance_adjusted,
      row.govt_credit_generated,
      row.govt_credit_used,
      row.govt_payable,
      row.closing_settlement_balance,
      `"${row.settlement_status}"`,
      row.settlement_rate,
      row.settlement_amount_rs
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solar_settlement_report_${this.currentYear}_${this.currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.success('Settlement CSV exported successfully!');
  },

  async downloadPDF() {
    if (!this.settlementData || !this.settlementData.history || this.settlementData.history.length === 0) {
      Toast.error('No settlement records available for the selected month to generate PDF.');
      return;
    }

    const downloadBtn = document.getElementById('settlement-download-pdf');
    const origHtml = downloadBtn ? downloadBtn.innerHTML : '';
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = `${UI.spinner()}<span>Generating...</span>`;
    }

    try {
      const user = appState.getState().user;
      const settings = appState.getState().settings || {};
      const curr = escapeHtml(settings.currency || '₹');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[this.currentMonth - 1] || 'Current Month';

      await SettlementReportPdf.exportPdf(
        this.settlementData,
        user ? user.email : '',
        curr,
        monthName,
        this.currentYear
      );
      Toast.success('Monthly Settlement PDF downloaded successfully.');
    } catch (err) {
      console.error('Settlement PDF export failed:', err);
      Toast.error('PDF export error: ' + (err.message || 'Render failed'));
    } finally {
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  printPDF() {
    if (!this.settlementData || !this.settlementData.history || this.settlementData.history.length === 0) {
      Toast.error('No settlement records available for print preview.');
      return;
    }

    const user = appState.getState().user;
    const settings = appState.getState().settings || {};
    const curr = escapeHtml(settings.currency || '₹');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[this.currentMonth - 1] || 'Current Month';

    try {
      SettlementReportPdf.openPrintPreview(
        this.settlementData,
        user ? user.email : '',
        curr,
        monthName,
        this.currentYear
      );
      Toast.success('Opened official settlement print statement preview.');
    } catch (err) {
      Toast.error('Print preview error: ' + err.message);
    }
  }
};
