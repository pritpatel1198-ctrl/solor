/**
 * Enterprise Crystal Reports PDF Generator for Solar Revenue Tracker
 * Produces audit-grade, multi-page financial statements matching Crystal Reports / BI standards.
 */

const CrystalReportPdf = {
  /**
   * Generates a unique audit reference number for the report
   */
  generateReferenceId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `SRT-AUDIT-${timestamp}-${randomHex}`;
  },

  /**
   * Formats a number with 2 decimal places and commas
   */
  formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * Formats a date string (YYYY-MM-DD) into business format (DD MMM YYYY)
   */
  formatDisplayDate(dateStr) {
    if (!dateStr) return 'N/A';
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

  /**
   * Builds the complete Crystal Reports HTML structure
   */
  buildReportHtml(reportData, userEmail, currency = '₹') {
    // Rates as currently set in Settings
    const rates = (typeof appState !== 'undefined' && appState.getState().settings) || {};
    userEmail = escapeHtml(userEmail || '');
    const summary = reportData.summary || {};
    const variance = reportData.variance || {};
    const filters = reportData.filters || {};
    const entries = reportData.entries || [];
    const dateBounds = reportData.date_bounds || {};
    const label = escapeHtml(reportData.label || 'Financial & Performance Report');
    const refId = this.generateReferenceId();
    const generatedTimestamp = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    // Synthesize Executive Narrative
    const totalGen = summary.total_generated || 0;
    const totalCon = summary.total_consumed || 0;
    const netProfit = summary.net_profit || 0;
    const totalRev = summary.total_revenue || 0;
    const totalExp = summary.total_expense || 0;
    const totalExport = summary.total_export_units || 0;
    const totalImport = summary.total_import_units || 0;
    const count = summary.entry_count || 0;
    const coverage = summary.solar_coverage_ratio || 0;
    const profitMargin = summary.profit_margin || 0;

    let narrative = `This official financial and performance audit document details solar electricity production, grid exchange, and fiscal balances recorded for <strong>${userEmail || 'Account Holder'}</strong>. `;
    if (count > 0) {
      narrative += `Over the selected auditing period (${label}), the system logged <strong>${count} daily readings</strong>, producing a cumulative <strong>${this.formatNumber(totalGen)} kWh</strong> of solar power against a facility consumption requirement of <strong>${this.formatNumber(totalCon)} kWh</strong> (Solar Coverage Ratio: <strong>${coverage}%</strong>). `;
      narrative += `Excess solar energy exported to the electricity utility totaled <strong>${this.formatNumber(totalExport)} kWh</strong> earning <strong>${currency}${this.formatNumber(totalRev)}</strong> in feed-in tariff credits. Deficit grid imports totaled <strong>${this.formatNumber(totalImport)} kWh</strong> resulting in <strong>${currency}${this.formatNumber(totalExp)}</strong> in utility charges. `;
      narrative += `The net consolidated financial result is a <strong>${netProfit >= 0 ? 'Net Operating Profit' : 'Net Operating Expense'} of ${currency}${this.formatNumber(Math.abs(netProfit))}</strong>, with an operating profit margin of <strong>${profitMargin}%</strong>.`;
    } else {
      narrative += `No transaction entries were recorded for the specified filtering criteria (${label}). All aggregates represent a baseline zero balance.`;
    }

    // Variance Narrative if prior period exists
    let varianceBlockHtml = '';
    if (variance && variance.prior_period) {
      const prior = variance.prior_period;
      const genDiff = variance.generation_diff;
      const genPct = variance.generation_growth_pct;
      const revDiff = variance.revenue_diff;
      const profitDiff = variance.profit_diff;

      varianceBlockHtml = `
        <div class="cr-section cr-variance-box">
          <div class="cr-section-header">
            <h4>PERIOD-OVER-PERIOD COMPARATIVE VARIANCE ANALYSIS</h4>
            <span class="cr-subtext">Baseline Prior Period: ${this.formatDisplayDate(prior.start_date)} to ${this.formatDisplayDate(prior.end_date)}</span>
          </div>
          <table class="cr-variance-table">
            <thead>
              <tr>
                <th>KPI Metric</th>
                <th style="text-align: right;">Prior Period</th>
                <th style="text-align: right;">Current Period</th>
                <th style="text-align: right;">Variance (&Delta;)</th>
                <th style="text-align: right;">Change (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Solar Generation (kWh)</td>
                <td style="text-align: right;">${this.formatNumber(prior.total_generated)}</td>
                <td style="text-align: right;">${this.formatNumber(totalGen)}</td>
                <td style="text-align: right; color: ${genDiff >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">
                  ${genDiff >= 0 ? '+' : ''}${this.formatNumber(genDiff)}
                </td>
                <td style="text-align: right; color: ${genPct >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">
                  ${genPct >= 0 ? '+' : ''}${this.formatNumber(genPct)}%
                </td>
              </tr>
              <tr>
                <td>Facility Consumption (kWh)</td>
                <td style="text-align: right;">${this.formatNumber(prior.total_consumed)}</td>
                <td style="text-align: right;">${this.formatNumber(totalCon)}</td>
                <td style="text-align: right;">${this.formatNumber(totalCon - prior.total_consumed)}</td>
                <td style="text-align: right;">${prior.total_consumed > 0 ? this.formatNumber(((totalCon - prior.total_consumed) / prior.total_consumed) * 100) + '%' : 'N/A'}</td>
              </tr>
              <tr>
                <td>Gross Revenue Earned (${currency})</td>
                <td style="text-align: right;">${currency}${this.formatNumber(prior.total_revenue)}</td>
                <td style="text-align: right;">${currency}${this.formatNumber(totalRev)}</td>
                <td style="text-align: right; color: ${revDiff >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">
                  ${revDiff >= 0 ? '+' : ''}${currency}${this.formatNumber(revDiff)}
                </td>
                <td style="text-align: right; color: ${variance.revenue_growth_pct >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">
                  ${variance.revenue_growth_pct >= 0 ? '+' : ''}${this.formatNumber(variance.revenue_growth_pct)}%
                </td>
              </tr>
              <tr>
                <td>Net Operating Margin (${currency})</td>
                <td style="text-align: right;">${currency}${this.formatNumber(prior.net_profit)}</td>
                <td style="text-align: right;">${currency}${this.formatNumber(netProfit)}</td>
                <td style="text-align: right; color: ${profitDiff >= 0 ? '#15803d' : '#b91c1c'}; font-weight: 700;">
                  ${profitDiff >= 0 ? '+' : ''}${currency}${this.formatNumber(profitDiff)}
                </td>
                <td style="text-align: right; font-weight: 700;">
                  ${prior.net_profit !== 0 ? this.formatNumber(((profitDiff / Math.abs(prior.net_profit)) * 100)) + '%' : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Detailed Table Rows
    const tableRowsHtml = entries.map((e, index) => {
      const isProfit = e.status === 'profit';
      const isLoss = e.status === 'loss';
      const statusClass = isProfit ? 'cr-badge-profit' : (isLoss ? 'cr-badge-loss' : 'cr-badge-neutral');
      const statusText = isProfit ? 'PROFIT' : (isLoss ? 'LOSS' : 'BALANCED');

      return `
        <tr class="${index % 2 === 1 ? 'cr-row-alt' : ''}">
          <td style="font-weight: 600;">${this.formatDisplayDate(e.entry_date)}</td>
          <td style="text-align: right;">${this.formatNumber(e.generated_units)}</td>
          <td style="text-align: right;">${this.formatNumber(e.consumed_units)}</td>
          <td style="text-align: right; font-weight: 600; color: ${e.net_units > 0 ? '#15803d' : (e.net_units < 0 ? '#b91c1c' : '#475569')};">
            ${e.net_units > 0 ? '+' : ''}${this.formatNumber(e.net_units)}
          </td>
          <td style="text-align: right;">${currency}${this.formatNumber(e.buying_rate)}</td>
          <td style="text-align: right;">${currency}${this.formatNumber(e.selling_rate)}</td>
          <td style="text-align: right; color: #15803d; font-weight: 600;">${currency}${this.formatNumber(e.revenue)}</td>
          <td style="text-align: right; color: #b91c1c; font-weight: 600;">${currency}${this.formatNumber(e.expense)}</td>
          <td style="text-align: right; font-weight: 700; color: ${e.net_profit >= 0 ? '#15803d' : '#b91c1c'};">
            ${e.net_profit >= 0 ? '+' : ''}${currency}${this.formatNumber(e.net_profit)}
          </td>
          <td style="text-align: center;"><span class="cr-badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    }).join('');

    const emptyTableRow = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
          No transactions registered for the selected filter parameters.
        </td>
      </tr>
    `;

    return `
      <div id="crystal-report-document" class="crystal-report-root">
        <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
        <div class="cr-page cr-page-cover">
          <!-- Top Corporate Header -->
          <div class="cr-header-band">
            <div class="cr-brand-left">
              <div class="cr-brand-logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
              </div>
              <div class="cr-brand-text">
                <h1 class="cr-company-title">SOLAR REVENUE TRACKER</h1>
                <p class="cr-system-subtitle">ENTERPRISE ENERGY ACCOUNTING & FINANCIAL MANAGEMENT SYSTEM</p>
              </div>
            </div>
            <div class="cr-meta-right">
              <div class="cr-meta-badge">CONFIDENTIAL AUDIT REPORT</div>
              <div class="cr-meta-line"><strong>REF:</strong> ${refId}</div>
              <div class="cr-meta-line"><strong>DATE:</strong> ${generatedTimestamp}</div>
            </div>
          </div>

          <div class="cr-divider-thick"></div>

          <!-- Document Title & Scope Banner -->
          <div class="cr-title-box">
            <h2 class="cr-report-heading">FINANCIAL & PERFORMANCE AUDIT STATEMENT</h2>
            <div class="cr-audit-scope-grid">
              <div class="cr-scope-item">
                <span class="cr-label">REPORTING PERIOD</span>
                <span class="cr-val">${label}</span>
              </div>
              <div class="cr-scope-item">
                <span class="cr-label">ACCOUNT / OWNER</span>
                <span class="cr-val">${userEmail || 'Account Holder'}</span>
              </div>
              <div class="cr-scope-item">
                <span class="cr-label">STATUS FILTER</span>
                <span class="cr-val">${(filters.status || 'All').toUpperCase()}</span>
              </div>
              <div class="cr-scope-item">
                <span class="cr-label">RECORDS AUDITED</span>
                <span class="cr-val">${count} Daily Entries</span>
              </div>
            </div>
          </div>

          <!-- Executive Narrative Summary -->
          <div class="cr-section cr-narrative-box">
            <h3 class="cr-section-title">1. EXECUTIVE SUMMARY & PERFORMANCE COMMENTARY</h3>
            <p class="cr-narrative-text">${narrative}</p>
          </div>

          <!-- Key Financial & Operational KPI Cards -->
          <div class="cr-section">
            <h3 class="cr-section-title">2. CONSOLIDATED FINANCIAL & ENERGY AGGREGATES</h3>
            <div class="cr-kpi-grid">
              <div class="cr-kpi-card">
                <span class="cr-kpi-lbl">TOTAL SOLAR GENERATION</span>
                <span class="cr-kpi-num cr-blue">${this.formatNumber(totalGen)} kWh</span>
                <span class="cr-kpi-sub">Daily Average: ${this.formatNumber(summary.average_daily_generated)} kWh</span>
              </div>

              <div class="cr-kpi-card">
                <span class="cr-kpi-lbl">FACILITY CONSUMPTION</span>
                <span class="cr-kpi-num cr-slate">${this.formatNumber(totalCon)} kWh</span>
                <span class="cr-kpi-sub">Daily Average: ${this.formatNumber(summary.average_daily_consumed)} kWh</span>
              </div>

              <div class="cr-kpi-card">
                <span class="cr-kpi-lbl">NET GRID EXCHANGE</span>
                <span class="cr-kpi-num ${summary.total_net_units >= 0 ? 'cr-green' : 'cr-red'}">
                  ${summary.total_net_units >= 0 ? '+' : ''}${this.formatNumber(summary.total_net_units)} kWh
                </span>
                <span class="cr-kpi-sub">Exp: ${this.formatNumber(totalExport)} | Imp: ${this.formatNumber(totalImport)}</span>
              </div>

              <div class="cr-kpi-card">
                <span class="cr-kpi-lbl">GROSS EARNED REVENUE</span>
                <span class="cr-kpi-num cr-green">${currency}${this.formatNumber(totalRev)}</span>
                <span class="cr-kpi-sub">Govt Credit Rate Accrual</span>
              </div>

              <div class="cr-kpi-card">
                <span class="cr-kpi-lbl">GROSS PAYABLE EXPENSE</span>
                <span class="cr-kpi-num cr-red">${currency}${this.formatNumber(totalExp)}</span>
                <span class="cr-kpi-sub">Grid Deficit Electricity Cost</span>
              </div>

              <div class="cr-kpi-card ${netProfit >= 0 ? 'cr-card-highlight-green' : 'cr-card-highlight-red'}">
                <span class="cr-kpi-lbl">NET OPERATING PROFIT</span>
                <span class="cr-kpi-num ${netProfit >= 0 ? 'cr-green' : 'cr-red'}">
                  ${netProfit >= 0 ? '+' : ''}${currency}${this.formatNumber(netProfit)}
                </span>
                <span class="cr-kpi-sub">Margin: ${profitMargin}% | Coverage: ${coverage}%</span>
              </div>
            </div>
          </div>

          <!-- Benchmarks & Operational Extremes -->
          <div class="cr-section cr-benchmarks-row">
            <div class="cr-benchmark-col">
              <span class="cr-bench-title">OPERATIONAL BENCHMARKS</span>
              <ul class="cr-bench-list">
                <li><span>Solar Self-Consumption:</span> <strong>${this.formatNumber(summary.self_consumption_units)} kWh (${summary.self_consumption_ratio}%)</strong></li>
                <li><span>Solar Grid Export Ratio:</span> <strong>${summary.solar_export_ratio}% of total generation</strong></li>
                <li><span>Solar Coverage Factor:</span> <strong>${coverage}% of total facility load</strong></li>
              </ul>
            </div>
            <div class="cr-benchmark-col">
              <span class="cr-bench-title">RECORD EXTREMES</span>
              <ul class="cr-bench-list">
                <li><span>Peak Generation Day:</span> <strong>${summary.highest_day ? summary.highest_day.generated + ' kWh (' + this.formatDisplayDate(summary.highest_day.date) + ')' : 'None'}</strong></li>
                <li><span>Lowest Generation Day:</span> <strong>${summary.lowest_day ? summary.lowest_day.generated + ' kWh (' + this.formatDisplayDate(summary.lowest_day.date) + ')' : 'None'}</strong></li>
                <li><span>Peak Revenue Day:</span> <strong>${summary.peak_revenue_day ? currency + this.formatNumber(summary.peak_revenue_day.revenue) + ' (' + this.formatDisplayDate(summary.peak_revenue_day.date) + ')' : 'None'}</strong></li>
              </ul>
            </div>
          </div>

          ${varianceBlockHtml}

          <!-- Page 1 Footer -->
          <div class="cr-page-footer">
            <span>Solar Revenue Tracker Enterprise Statement &bull; Reference: ${refId}</span>
            <span>Page 1</span>
          </div>
        </div>

        <!-- PAGE BREAK -->
        <div class="html2pdf__page-break"></div>

        <!-- PAGE 2+: DETAILED AUDIT TABLE & METHODOLOGY -->
        <div class="cr-page">
          <div class="cr-sub-header">
            <div class="cr-sub-brand">
              <span class="cr-sub-title">SOLAR REVENUE TRACKER &bull; AUDIT LEDGER</span>
              <span class="cr-sub-meta">Period: ${label} | Ref: ${refId}</span>
            </div>
            <div class="cr-sub-badge">OFFICIAL BUSINESS REPORT</div>
          </div>
          <div class="cr-divider"></div>

          <div class="cr-section">
            <h3 class="cr-section-title">3. COMPREHENSIVE DAILY TRANSACTION & METER AUDIT LEDGER</h3>
            <table class="cr-data-table">
              <thead>
                <tr>
                  <th style="width: 13%;">DATE</th>
                  <th style="text-align: right; width: 10%;">GEN (kWh)</th>
                  <th style="text-align: right; width: 10%;">CON (kWh)</th>
                  <th style="text-align: right; width: 10%;">NET (kWh)</th>
                  <th style="text-align: right; width: 9%;">BUY (${currency})</th>
                  <th style="text-align: right; width: 9%;">SELL (${currency})</th>
                  <th style="text-align: right; width: 11%;">REVENUE</th>
                  <th style="text-align: right; width: 11%;">PAYABLE</th>
                  <th style="text-align: right; width: 11%;">NET PROFIT</th>
                  <th style="text-align: center; width: 6%;">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${entries.length > 0 ? tableRowsHtml : emptyTableRow}
              </tbody>
              <tfoot>
                <tr class="cr-totals-row">
                  <td style="font-weight: 800;">AUDIT TOTALS:</td>
                  <td style="text-align: right; font-weight: 800; color: #2563eb;">${this.formatNumber(totalGen)}</td>
                  <td style="text-align: right; font-weight: 800;">${this.formatNumber(totalCon)}</td>
                  <td style="text-align: right; font-weight: 800; color: ${summary.total_net_units >= 0 ? '#15803d' : '#b91c1c'};">
                    ${summary.total_net_units >= 0 ? '+' : ''}${this.formatNumber(summary.total_net_units)}
                  </td>
                  <td style="text-align: right;">-</td>
                  <td style="text-align: right;">-</td>
                  <td style="text-align: right; font-weight: 800; color: #15803d;">${currency}${this.formatNumber(totalRev)}</td>
                  <td style="text-align: right; font-weight: 800; color: #b91c1c;">${currency}${this.formatNumber(totalExp)}</td>
                  <td style="text-align: right; font-weight: 800; color: ${netProfit >= 0 ? '#15803d' : '#b91c1c'};">
                    ${netProfit >= 0 ? '+' : ''}${currency}${this.formatNumber(netProfit)}
                  </td>
                  <td style="text-align: center; font-weight: 800;">${count} LOGS</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Section 4: Accounting Methodologies & Definitions -->
          <div class="cr-section cr-notes-box">
            <h3 class="cr-section-title">4. REGULATORY & ACCOUNTING METHODOLOGY NOTES</h3>
            <ol class="cr-notes-list">
              <li><strong>Net Energy Computation:</strong> Daily Net Units are determined by <code>Generated Units - Consumed Units</code>. Net positive units denote grid export surplus; negative units denote grid import deficit.</li>
              <li><strong>Feed-in Tariff Crediting:</strong> Energy surplus exported to the power distribution company is credited at the Buying Rate (${currency}${this.formatNumber(rates.default_buying_rate)}/kWh). Payable deficit is calculated at the Grid Selling Tariff (${currency}${this.formatNumber(rates.default_selling_rate)}/kWh).</li>
              <li><strong>Precision Standard:</strong> All financial amounts and energy quantities are rounded to 2 decimal places with banker's rounding to eliminate cumulative rounding drift.</li>
              <li><strong>Meter Authenticity:</strong> All metrics derive from validated meter reading submissions with verified chronological dependency tracking.</li>
            </ol>
          </div>

          <!-- Page 2 Footer -->
          <div class="cr-page-footer">
            <span>Solar Revenue Tracker Enterprise Statement &bull; Reference: ${refId}</span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generates and downloads the PDF statement
   */
  async exportPdf(reportData, userEmail, currency = '₹') {
    if (!window.html2pdf) {
      throw new Error('html2pdf library is not loaded. Please ensure internet connectivity or use print preview.');
    }

    const bounds = reportData.date_bounds || {};
    const startDate = bounds.start_date || 'All';
    const endDate = bounds.end_date || 'Time';
    const filename = `Financial_Report_${startDate}_to_${endDate}.pdf`;

    // Render HTML in an off-screen container
    const container = document.createElement('div');
    container.id = 'pdf-render-temp-container';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.background = '#ffffff';
    container.innerHTML = this.buildReportHtml(reportData, userEmail, currency);
    document.body.appendChild(container);

    const element = container.querySelector('#crystal-report-document');

    const opt = {
      margin: [8, 8, 8, 8],
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
        orientation: 'portrait'
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

  /**
   * Opens high-resolution Print Preview in a dedicated clean window
   */
  openPrintPreview(reportData, userEmail, currency = '₹') {
    const htmlContent = this.buildReportHtml(reportData, userEmail, currency);
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      throw new Error('Popup blocker prevented opening print window. Please allow popups or use PDF download.');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report Preview - Solar Revenue Tracker</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/assets/css/report-document.css">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; padding: 20px; background: #525659; font-family: 'Inter', sans-serif; }
          .crystal-report-root { max-width: 210mm; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
          .cr-page { padding: 24px 32px; background: #ffffff; min-height: 297mm; box-sizing: border-box; position: relative; }
          @media print {
            body { background: transparent; padding: 0; }
            .crystal-report-root { box-shadow: none; margin: 0; max-width: 100%; }
            .cr-page { padding: 15mm 15mm; min-height: auto; page-break-after: always; }
            .no-print { display: none !important; }
          }
          .no-print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1e293b; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
          .no-print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }
          .no-print-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="no-print no-print-bar">
          <span style="font-weight: 600; font-size: 15px;">Solar Revenue Tracker &bull; Official Business Report Preview</span>
          <div>
            <button class="no-print-btn" onclick="window.print()">Print Document / Save PDF</button>
            <button class="no-print-btn" style="background: #475569; margin-left: 8px;" onclick="window.close()">Close</button>
          </div>
        </div>
        <div style="height: 60px;" class="no-print"></div>
        ${htmlContent}
      </body>
      </html>
    `);

    printWindow.document.close();
  }
};

window.CrystalReportPdf = CrystalReportPdf;
