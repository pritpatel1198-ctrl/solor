/**
 * Professional Monthly Settlement Calculation PDF Generator
 * Designed to Crystal Reports and Financial Accounting Standards.
 * Handles multi-page pagination, clean tabular alignment, and accurate calculations.
 */

const SettlementReportPdf = {
  generateReferenceId(year, month) {
    const monthPadded = String(month).padStart(2, '0');
    const rand = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `DISCOM-SETTLE-${year}${monthPadded}-${rand}`;
  },

  formatNumber(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  },

  buildReportHtml(settlementData, userEmail, currency = '₹', monthName = 'Month', year = 2026) {
    userEmail = escapeHtml(userEmail || '');
    const summary = settlementData.summary || {};
    const history = settlementData.history || [];
    const monthPadded = String(summary.month || new Date().getMonth() + 1).padStart(2, '0');
    const refId = this.generateReferenceId(year, summary.month || monthPadded);
    const generatedTimestamp = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const isCredit = summary.month_closing_balance >= 0;
    const isBalanced = summary.month_closing_balance === 0;
    const finalStatus = summary.final_status || (isCredit ? 'Govt Credit' : 'Govt Payable');
    const bannerThemeClass = isCredit ? (isBalanced ? 'ms-banner-balanced' : 'ms-banner-credit') : 'ms-banner-payable';
    const finalAmountStr = this.formatNumber(summary.final_settlement_amount_rs);

    // Detailed table rows
    const tableRowsHtml = history.map((row, idx) => {
      const isRowCredit = row.closing_settlement_balance > 0;
      const isRowPayable = row.closing_settlement_balance < 0;
      const statusBadgeClass = isRowCredit ? 'ms-badge-credit' : (isRowPayable ? 'ms-badge-payable' : 'ms-badge-balanced');

      return `
        <tr class="${idx % 2 === 1 ? 'ms-row-alt' : ''}">
          <td style="font-weight: 700;">${this.formatDisplayDate(row.date)}</td>
          <td class="num">${row.opening_import_meter !== null ? this.formatNumber(row.opening_import_meter, 0) : '-'}</td>
          <td class="num">${row.closing_import_meter !== null ? this.formatNumber(row.closing_import_meter, 0) : '-'}</td>
          <td class="num font-bold text-red">${this.formatNumber(row.daily_import_units, 1)}</td>
          <td class="num">${row.opening_export_meter !== null ? this.formatNumber(row.opening_export_meter, 0) : '-'}</td>
          <td class="num">${row.closing_export_meter !== null ? this.formatNumber(row.closing_export_meter, 0) : '-'}</td>
          <td class="num font-bold text-green">${this.formatNumber(row.daily_export_units, 1)}</td>
          <td class="num font-bold ${row.gross_difference >= 0 ? 'text-green' : 'text-red'}">
            ${row.gross_difference >= 0 ? '+' : ''}${this.formatNumber(row.gross_difference, 1)}
          </td>
          <td class="num">${row.opening_settlement_balance >= 0 ? '+' : ''}${this.formatNumber(row.opening_settlement_balance, 1)}</td>
          <td class="num text-green">${row.govt_credit_generated > 0 ? '+' + this.formatNumber(row.govt_credit_generated, 1) : '-'}</td>
          <td class="num text-amber">${row.govt_credit_used > 0 ? '-' + this.formatNumber(row.govt_credit_used, 1) : '-'}</td>
          <td class="num text-red">${row.govt_payable > 0 ? this.formatNumber(row.govt_payable, 1) : '-'}</td>
          <td class="num font-bold ${row.closing_settlement_balance >= 0 ? 'text-green' : 'text-red'}">
            ${row.closing_settlement_balance >= 0 ? '+' : ''}${this.formatNumber(row.closing_settlement_balance, 1)}
          </td>
          <td class="num">${currency}${this.formatNumber(row.settlement_rate, 2)}</td>
          <td class="num font-bold">${currency}${this.formatNumber(row.settlement_amount_rs, 2)}</td>
          <td style="text-align: center;"><span class="ms-badge ${statusBadgeClass}">${row.settlement_status.toUpperCase()}</span></td>
        </tr>
      `;
    }).join('');

    const emptyRowHtml = `
      <tr>
        <td colspan="16" style="text-align: center; padding: 28px; color: #64748b; font-style: italic;">
          No meter reading entries registered for the selected billing month (${monthName} ${year}).
        </td>
      </tr>
    `;

    return `
      <div id="settlement-pdf-root" class="settlement-report-root">
        <div class="ms-page">
          <!-- Corporate Header -->
          <div class="ms-header-bar">
            <div class="ms-brand-box">
              <div class="ms-logo-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                  <circle cx="12" cy="12" r="4"></circle>
                </svg>
              </div>
              <div>
                <h1 class="ms-company-name">SOLAR REVENUE TRACKER</h1>
                <p class="ms-system-desc">OFFICIAL MONTHLY NET METERING SETTLEMENT STATEMENT</p>
              </div>
            </div>

            <div class="ms-meta-box">
              <div class="ms-meta-pill">OFFICIAL AUDIT STATEMENT</div>
              <div class="ms-meta-row"><strong>STATEMENT REF:</strong> ${refId}</div>
              <div class="ms-meta-row"><strong>GENERATED:</strong> ${generatedTimestamp}</div>
            </div>
          </div>

          <div class="ms-divider-strong"></div>

          <!-- Statement Scope Grid -->
          <div class="ms-scope-card">
            <div class="ms-scope-item">
              <span class="ms-scope-lbl">BILLING CYCLE</span>
              <span class="ms-scope-val">${monthName} ${year}</span>
            </div>
            <div class="ms-scope-item">
              <span class="ms-scope-lbl">CONSUMER ACCOUNT</span>
              <span class="ms-scope-val">${userEmail || 'Account Holder'}</span>
            </div>
            <div class="ms-scope-item">
              <span class="ms-scope-lbl">SETTLEMENT POLICY</span>
              <span class="ms-scope-val">Gujarat Solar Net Metering (GERC)</span>
            </div>
            <div class="ms-scope-item">
              <span class="ms-scope-lbl">AUDITED LOGS</span>
              <span class="ms-scope-val">${summary.total_days || history.length} Days Recorded</span>
            </div>
          </div>

          <!-- Executive Settlement Result Banner -->
          <div class="ms-result-banner ${bannerThemeClass}">
            <div class="ms-result-left">
              <div class="ms-result-tag">
                ${isCredit ? '★ CONSOLIDATED STATUS: NET GOVT CREDIT (CARRY FORWARD)' : '▲ CONSOLIDATED STATUS: NET GOVT PAYABLE (DEFICIT)'}
              </div>
              <div class="ms-result-balance">
                Month Closing Carry-Forward Balance:
                <strong>${summary.month_closing_balance >= 0 ? '+' : ''}${this.formatNumber(summary.month_closing_balance, 2)} kWh Units</strong>
              </div>
            </div>
            <div class="ms-result-right">
              <div class="ms-result-amount-lbl">NET SETTLEMENT VALUE</div>
              <div class="ms-result-amount">${currency}${finalAmountStr}</div>
              <div class="ms-result-rate-sub">Applied Tariff @ ${currency}${this.formatNumber(summary.settlement_rate, 2)}/Unit</div>
            </div>
          </div>

          <!-- Executive KPI Grid (6 metrics) -->
          <div class="ms-kpi-grid">
            <div class="ms-kpi-card">
              <span class="ms-kpi-title">TOTAL SOLAR EXPORT</span>
              <span class="ms-kpi-val text-green">+${this.formatNumber(summary.total_export_units, 2)} kWh</span>
              <span class="ms-kpi-sub">Closing Meter: ${summary.month_closing_export_meter ?? '-'}</span>
            </div>

            <div class="ms-kpi-card">
              <span class="ms-kpi-title">TOTAL GRID IMPORT</span>
              <span class="ms-kpi-val text-red">${this.formatNumber(summary.total_import_units, 2)} kWh</span>
              <span class="ms-kpi-sub">Closing Meter: ${summary.month_closing_import_meter ?? '-'}</span>
            </div>

            <div class="ms-kpi-card">
              <span class="ms-kpi-title">NET ENERGY BALANCE</span>
              <span class="ms-kpi-val ${summary.net_gross_difference >= 0 ? 'text-green' : 'text-red'}">
                ${summary.net_gross_difference >= 0 ? '+' : ''}${this.formatNumber(summary.net_gross_difference, 2)} kWh
              </span>
              <span class="ms-kpi-sub">Export vs Import Gross</span>
            </div>

            <div class="ms-kpi-card">
              <span class="ms-kpi-title">GOVT CREDIT GENERATED</span>
              <span class="ms-kpi-val text-green">+${this.formatNumber(summary.total_credit_generated, 2)} Units</span>
              <span class="ms-kpi-sub">Excess Solar Banking</span>
            </div>

            <div class="ms-kpi-card">
              <span class="ms-kpi-title">GOVT CREDIT OFFSET</span>
              <span class="ms-kpi-val text-amber">${this.formatNumber(summary.total_credit_used, 2)} Units</span>
              <span class="ms-kpi-sub">Deficit Offset Utilized</span>
            </div>

            <div class="ms-kpi-card">
              <span class="ms-kpi-title">NET FINANCIAL VALUATION</span>
              <span class="ms-kpi-val ${isCredit ? 'text-green' : 'text-red'}">
                ${isCredit ? '+' : ''}${currency}${finalAmountStr}
              </span>
              <span class="ms-kpi-sub">${finalStatus} Result</span>
            </div>
          </div>

          <!-- Detailed Daily Ledger Section -->
          <div class="ms-table-section">
            <div class="ms-table-header-title">
              <h3>DAILY RUNNING SETTLEMENT & METER READING AUDIT TRAIL</h3>
              <span class="ms-table-subtitle">Itemized chronological running account balance with two-tier meter counters</span>
            </div>

            <table class="ms-data-table">
              <thead>
                <tr class="ms-thead-top">
                  <th rowspan="2" style="width: 8%;">DATE</th>
                  <th colspan="3" class="group-imp">IMPORT METER (kWh)</th>
                  <th colspan="3" class="group-exp">EXPORT METER (kWh)</th>
                  <th rowspan="2" style="width: 7%;">GROSS<br/>DIFF</th>
                  <th colspan="5" class="group-bal">RUNNING SETTLEMENT ACCOUNT (UNITS)</th>
                  <th colspan="2" class="group-mon">SETTLEMENT</th>
                  <th rowspan="2" style="width: 8%;">STATUS</th>
                </tr>
                <tr class="ms-thead-sub">
                  <th style="width: 6%;">OPEN</th>
                  <th style="width: 6%;">CLOSE</th>
                  <th style="width: 5%;">UNITS</th>
                  <th style="width: 6%;">OPEN</th>
                  <th style="width: 6%;">CLOSE</th>
                  <th style="width: 5%;">UNITS</th>
                  <th style="width: 6%;">OPEN</th>
                  <th style="width: 6%;">CREDIT+</th>
                  <th style="width: 6%;">USED-</th>
                  <th style="width: 6%;">PAYABLE</th>
                  <th style="width: 6%;">CLOSE</th>
                  <th style="width: 6%;">RATE</th>
                  <th style="width: 8%;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${history.length > 0 ? tableRowsHtml : emptyRowHtml}
              </tbody>
              <tfoot>
                <tr class="ms-totals-row">
                  <td style="font-weight: 800;">TOTALS:</td>
                  <td class="num">${summary.month_opening_import_meter !== null ? this.formatNumber(summary.month_opening_import_meter, 0) : '-'}</td>
                  <td class="num">${summary.month_closing_import_meter !== null ? this.formatNumber(summary.month_closing_import_meter, 0) : '-'}</td>
                  <td class="num font-bold text-red">${this.formatNumber(summary.total_import_units, 2)}</td>
                  <td class="num">${summary.month_opening_export_meter !== null ? this.formatNumber(summary.month_opening_export_meter, 0) : '-'}</td>
                  <td class="num">${summary.month_closing_export_meter !== null ? this.formatNumber(summary.month_closing_export_meter, 0) : '-'}</td>
                  <td class="num font-bold text-green">${this.formatNumber(summary.total_export_units, 2)}</td>
                  <td class="num font-bold ${summary.net_gross_difference >= 0 ? 'text-green' : 'text-red'}">
                    ${summary.net_gross_difference >= 0 ? '+' : ''}${this.formatNumber(summary.net_gross_difference, 2)}
                  </td>
                  <td class="num font-bold">${this.formatNumber(summary.month_opening_balance, 2)}</td>
                  <td class="num font-bold text-green">+${this.formatNumber(summary.total_credit_generated, 2)}</td>
                  <td class="num font-bold text-amber">-${this.formatNumber(summary.total_credit_used, 2)}</td>
                  <td class="num font-bold text-red">${this.formatNumber(summary.total_payable_generated, 2)}</td>
                  <td class="num font-bold ${summary.month_closing_balance >= 0 ? 'text-green' : 'text-red'}">
                    ${summary.month_closing_balance >= 0 ? '+' : ''}${this.formatNumber(summary.month_closing_balance, 2)}
                  </td>
                  <td class="num">-</td>
                  <td class="num font-bold">${currency}${finalAmountStr}</td>
                  <td style="text-align: center; font-weight: 800;">${finalStatus}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Regulatory & Business Rules Note -->
          <div class="ms-notes-box">
            <div class="ms-notes-title">GOVERNING REGULATORY RULES & METHODOLOGY (GERC NET METERING)</div>
            <div class="ms-notes-grid">
              <div class="ms-note-point">
                <strong>1. Energy Exchange:</strong> Daily Gross Difference = Export Units - Import Units. Positive differences represent energy exported to the utility grid; negative values represent energy drawn from the grid.
              </div>
              <div class="ms-note-point">
                <strong>2. Credit Banking & Carry-Forward:</strong> Surplus export credits are banked in the running settlement balance and carried forward from day to day throughout the monthly billing cycle.
              </div>
              <div class="ms-note-point">
                <strong>3. Deficit Offset Precedence:</strong> When grid consumption exceeds solar generation, banked export credits are applied first to offset the deficit before any cash payable charges accrue.
              </div>
              <div class="ms-note-point">
                <strong>4. Month-End Settlement Valuation:</strong> At the close of each billing cycle, the net closing balance is valued at the statutory Feed-in Tariff (${currency}${this.formatNumber(summary.settlement_rate, 2)}/Unit).
              </div>
            </div>
          </div>

          <!-- Document Footer -->
          <div class="ms-footer-bar">
            <span>Official Computer-Generated Rooftop Solar Settlement Certificate &bull; Ref: ${refId}</span>
            <span>Issued by Solar Revenue Tracker Enterprise Core</span>
          </div>
        </div>
      </div>
    `;
  },

  async exportPdf(settlementData, userEmail, currency = '₹', monthName = 'Month', year = 2026) {
    if (!window.html2pdf) {
      throw new Error('html2pdf library is not available. Please use Print Preview.');
    }

    const summary = settlementData.summary || {};
    const monthPadded = String(summary.month || new Date().getMonth() + 1).padStart(2, '0');
    const filename = `Monthly_Settlement_${year}-${monthPadded}.pdf`;

    const container = document.createElement('div');
    container.id = 'settlement-render-temp-container';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '297mm'; // Landscape A4
    container.style.background = '#ffffff';
    container.innerHTML = this.buildReportHtml(settlementData, userEmail, currency, monthName, year);
    document.body.appendChild(container);

    const element = container.querySelector('#settlement-pdf-root');

    const opt = {
      margin: [6, 6, 6, 6],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      },
      pagebreak: {
        mode: ['css', 'legacy']
      }
    };

    try {
      await window.html2pdf().from(element).set(opt).save();
      return true;
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  },

  openPrintPreview(settlementData, userEmail, currency = '₹', monthName = 'Month', year = 2026) {
    const htmlContent = this.buildReportHtml(settlementData, userEmail, currency, monthName, year);
    const printWin = window.open('', '_blank');

    if (!printWin) {
      throw new Error('Pop-up was blocked. Please allow popups or use the direct Download PDF button.');
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Settlement Statement - ${monthName} ${year}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/assets/css/report-document.css">
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { margin: 0; padding: 20px; background: #525659; font-family: 'Inter', sans-serif; }
          .settlement-report-root { max-width: 297mm; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
          .ms-page { padding: 20px 24px; background: #ffffff; min-height: 210mm; box-sizing: border-box; }
          @media print {
            body { background: transparent; padding: 0; }
            .settlement-report-root { box-shadow: none; max-width: 100%; margin: 0; }
            .ms-page { padding: 8mm; min-height: auto; }
            .no-print-bar { display: none !important; }
          }
          .no-print-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
          .no-print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; }
          .no-print-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <span style="font-weight: 700; font-size: 14px;">☀️ DISCOM Solar Net Metering Settlement Statement &bull; ${monthName} ${year}</span>
          <div>
            <button class="no-print-btn" onclick="window.print()">🖨️ Print / Save Vector PDF</button>
            <button class="no-print-btn" style="background: #475569; margin-left: 8px;" onclick="window.close()">Close</button>
          </div>
        </div>
        <div style="height: 54px;"></div>
        ${htmlContent}
      </body>
      </html>
    `);

    printWin.document.close();
  }
};

window.SettlementReportPdf = SettlementReportPdf;
