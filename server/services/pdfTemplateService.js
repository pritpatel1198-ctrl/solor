/**
 * Central Authoritative PDF Template Service
 * Generates enterprise-grade, financial audit HTML statements for BOTH Web and Mobile.
 * Ensures 100% design parity, identical styling, and consistent calculations.
 */

const { APP_TIMEZONE } = require('../utils/dates');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function generateAuditReferenceId(prefix = 'SRT') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `${prefix}-AUDIT-${timestamp}-${rand}`;
}

/**
 * 1. Financial & Performance Reports (Crystal Reports standard - A4 Portrait)
 */
function generateFinancialReportHtml(reportData = {}, userEmail = 'consumer@solar.com', currency = '₹') {
  // Values below come from query params / account data and are interpolated into HTML
  userEmail = escapeHtml(userEmail);
  currency = escapeHtml(currency);
  const summary = reportData.summary || {};
  const variance = reportData.variance || {};
  const entries = reportData.entries || [];
  const grouped = reportData.grouped || [];
  const label = escapeHtml(reportData.label || 'Financial & Performance Report');
  const refId = generateAuditReferenceId('SRT-FIN');
  const generatedTimestamp = new Date().toLocaleString('en-IN', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  const totalGen = summary.total_generated || 0;
  const totalCon = summary.total_consumed || 0;
  const netProfit = summary.net_profit || 0;
  const totalRev = summary.total_revenue || 0;
  const totalExp = summary.total_expense || 0;
  const totalExport = summary.total_export_units || 0;
  const totalImport = summary.total_import_units || 0;
  const count = summary.entry_count || entries.length;
  const coverage = summary.solar_coverage_ratio ?? (totalCon > 0 ? ((totalGen / totalCon) * 100).toFixed(1) : '0.0');
  const exportRatio = summary.solar_export_ratio ?? (totalGen > 0 ? ((totalExport / totalGen) * 100).toFixed(1) : '0.0');
  const profitMargin = summary.profit_margin ?? (totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0');
  const isProfit = netProfit >= 0;

  // Executive narrative
  let narrative = `This official financial and performance audit document details solar electricity production, grid exchange, and fiscal balances recorded for <strong>${userEmail || 'Account Holder'}</strong>. `;
  if (count > 0) {
    narrative += `Over the selected auditing period (${label}), the system logged <strong>${count} daily readings</strong>, producing a cumulative <strong>${formatNumber(totalGen)} kWh</strong> of solar power against a facility consumption requirement of <strong>${formatNumber(totalCon)} kWh</strong> (Solar Coverage Ratio: <strong>${coverage}%</strong>). `;
    narrative += `Excess solar energy exported to the electricity utility totaled <strong>${formatNumber(totalExport)} kWh</strong> earning <strong>${currency}${formatNumber(totalRev)}</strong> in feed-in tariff credits. Deficit grid imports totaled <strong>${formatNumber(totalImport)} kWh</strong> resulting in <strong>${currency}${formatNumber(totalExp)}</strong> in utility charges. `;
    narrative += `The net consolidated financial result is a <strong>${isProfit ? 'Net Operating Profit' : 'Net Operating Expense'} of ${currency}${formatNumber(Math.abs(netProfit))}</strong>, with an operating profit margin of <strong>${profitMargin}%</strong>.`;
  } else {
    narrative += `No transaction entries were recorded for the specified filtering criteria (${label}). All aggregates represent a baseline zero balance.`;
  }

  // Grouped rows
  const groupedRowsHtml = grouped.map((g, idx) => {
    const rowProfit = (g.net_profit || 0) >= 0;
    return `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 5px 6px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${g.period_label || g.group_key}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${formatNumber(g.solar_generated, 1)}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${formatNumber(g.grid_consumed, 1)}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; color: #16a34a; border-bottom: 1px solid #e2e8f0;">${formatNumber(g.export_units, 1)}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; color: #dc2626; border-bottom: 1px solid #e2e8f0;">${formatNumber(g.import_units, 1)}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${currency}${formatNumber(g.revenue, 2)}</td>
        <td style="text-align: right; padding: 5px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${currency}${formatNumber(g.expense, 2)}</td>
        <td style="text-align: right; padding: 5px 6px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${rowProfit ? '#16a34a' : '#dc2626'}; border-bottom: 1px solid #e2e8f0;">
          ${rowProfit ? '+' : ''}${currency}${formatNumber(g.net_profit, 2)}
        </td>
      </tr>
    `;
  }).join('');

  // Daily entries (top 31 entries to fit cleanly)
  const displayEntries = entries.slice(0, 31);
  const entryRowsHtml = displayEntries.map((e, idx) => {
    const isEProfit = (e.net_profit ?? (parseFloat(e.revenue) - parseFloat(e.payable))) >= 0;
    return `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 4px 6px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${formatDisplayDate(e.entry_date)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${formatNumber(e.generated_units, 1)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${formatNumber(e.consumed_units, 1)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; color: #16a34a; border-bottom: 1px solid #e2e8f0;">${formatNumber(e.export_units ?? (parseFloat(e.generated_units) - parseFloat(e.consumed_units) > 0 ? parseFloat(e.generated_units) - parseFloat(e.consumed_units) : 0), 1)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; color: #dc2626; border-bottom: 1px solid #e2e8f0;">${formatNumber(e.import_units ?? (parseFloat(e.consumed_units) - parseFloat(e.generated_units) > 0 ? parseFloat(e.consumed_units) - parseFloat(e.generated_units) : 0), 1)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${currency}${formatNumber(e.revenue, 2)}</td>
        <td style="text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e2e8f0;">${currency}${formatNumber(e.payable ?? e.expense, 2)}</td>
        <td style="text-align: right; padding: 4px 6px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${isEProfit ? '#16a34a' : '#dc2626'}; border-bottom: 1px solid #e2e8f0;">
          ${isEProfit ? '+' : ''}${currency}${formatNumber(e.net_profit ?? (parseFloat(e.revenue) - parseFloat(e.payable)), 2)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Financial & Performance Report - ${label}</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 8.5pt; line-height: 1.4; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        table { width: 100%; border-collapse: collapse; font-size: 7.2pt; border: 1px solid #cbd5e1; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th { background: #0f172a; color: #ffffff; padding: 5px 6px; font-weight: 700; border: 1px solid #334155; }
        .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #ffffff; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ☀️
          </div>
          <div>
            <h1 style="font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.1;">SOLAR REVENUE TRACKER</h1>
            <p style="font-size: 7.2pt; font-weight: 700; letter-spacing: 0.08em; color: #475569; margin: 2px 0 0 0; text-transform: uppercase;">
              EXECUTIVE FINANCIAL & PERFORMANCE AUDIT STATEMENT
            </p>
          </div>
        </div>

        <div style="text-align: right; font-size: 7.2pt; color: #334155;">
          <div style="display: inline-block; background: #1e293b; color: #ffffff; padding: 2px 6px; font-weight: 700; font-size: 6.5pt; border-radius: 3px; margin-bottom: 3px;">
            OFFICIAL FINANCIAL AUDIT
          </div>
          <div style="font-family: monospace;"><strong>REF:</strong> ${refId}</div>
          <div style="font-family: monospace;"><strong>DATE:</strong> ${generatedTimestamp}</div>
        </div>
      </div>

      <div style="height: 2.5px; background: #1e293b; margin: 6px 0 10px 0;"></div>

      <!-- Scope Metadata -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">AUDIT PERIOD</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${label}</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">ACCOUNT HOLDER</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${userEmail}</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">CONSOLIDATED STATUS</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: ${isProfit ? '#15803d' : '#b91c1c'};">${isProfit ? 'Net Operating Profit' : 'Net Operating Expense'}</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">RECORDED READINGS</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${count} Days Audited</div>
        </div>
      </div>

      <!-- Narrative -->
      <div style="background: #f8fafc; border-left: 3px solid #2563eb; padding: 8px 12px; margin-bottom: 12px; font-size: 7.5pt; color: #334155; line-height: 1.45;">
        ${narrative}
      </div>

      <!-- 6-Metric KPI Scorecard -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">TOTAL SOLAR GENERATION</div>
          <div style="font-size: 13pt; font-weight: 800; color: #16a34a; margin: 2px 0;">+${formatNumber(totalGen)} kWh</div>
          <div style="font-size: 6.8pt; color: #64748b;">Daily Avg: ${summary.average_units ? formatNumber(summary.average_units, 1) + ' kWh/d' : '-'}</div>
        </div>

        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">TOTAL GRID CONSUMPTION</div>
          <div style="font-size: 13pt; font-weight: 800; color: #b91c1c; margin: 2px 0;">${formatNumber(totalCon)} kWh</div>
          <div style="font-size: 6.8pt; color: #64748b;">Solar Coverage: ${coverage}%</div>
        </div>

        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">NET OPERATING BALANCE</div>
          <div style="font-size: 13pt; font-weight: 800; color: ${isProfit ? '#16a34a' : '#b91c1c'}; margin: 2px 0;">
            ${isProfit ? '+' : ''}${currency}${formatNumber(netProfit)}
          </div>
          <div style="font-size: 6.8pt; color: #64748b;">Profit Margin: ${profitMargin}%</div>
        </div>

        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">GROSS EXPORT REVENUE</div>
          <div style="font-size: 11pt; font-weight: 700; color: #16a34a;">+${currency}${formatNumber(totalRev)}</div>
          <div style="font-size: 6.8pt; color: #64748b;">Export Units: ${formatNumber(totalExport, 1)} kWh</div>
        </div>

        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">GROSS UTILITY EXPENSE</div>
          <div style="font-size: 11pt; font-weight: 700; color: #b91c1c;">-${currency}${formatNumber(totalExp)}</div>
          <div style="font-size: 6.8pt; color: #64748b;">Import Units: ${formatNumber(totalImport, 1)} kWh</div>
        </div>

        <div class="kpi-card">
          <div style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">SOLAR EXPORT RATIO</div>
          <div style="font-size: 11pt; font-weight: 700; color: #0284c7;">${exportRatio}%</div>
          <div style="font-size: 6.8pt; color: #64748b;">Surplus Sent to Grid</div>
        </div>
      </div>

      <!-- Grouped Breakdown Table -->
      ${grouped.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; color: #0f172a;">
            PERIOD-BY-PERIOD FINANCIAL BREAKDOWN
          </h3>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">PERIOD</th>
                <th style="text-align: right;">SOLAR GEN (kWh)</th>
                <th style="text-align: right;">GRID CON (kWh)</th>
                <th style="text-align: right;">EXPORT (kWh)</th>
                <th style="text-align: right;">IMPORT (kWh)</th>
                <th style="text-align: right;">REVENUE</th>
                <th style="text-align: right;">EXPENSE</th>
                <th style="text-align: right;">NET PROFIT</th>
              </tr>
            </thead>
            <tbody>
              ${groupedRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 800;">
                <td style="padding: 5px 6px;">TOTALS:</td>
                <td class="num" style="padding: 5px 6px;">${formatNumber(totalGen, 1)}</td>
                <td class="num" style="padding: 5px 6px;">${formatNumber(totalCon, 1)}</td>
                <td class="num" style="padding: 5px 6px; color: #16a34a;">${formatNumber(totalExport, 1)}</td>
                <td class="num" style="padding: 5px 6px; color: #dc2626;">${formatNumber(totalImport, 1)}</td>
                <td class="num" style="padding: 5px 6px;">${currency}${formatNumber(totalRev, 2)}</td>
                <td class="num" style="padding: 5px 6px;">${currency}${formatNumber(totalExp, 2)}</td>
                <td class="num" style="padding: 5px 6px; color: ${isProfit ? '#16a34a' : '#dc2626'};">
                  ${isProfit ? '+' : ''}${currency}${formatNumber(netProfit, 2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ` : ''}

      <!-- Detailed Daily Entries (if available) -->
      ${displayEntries.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; color: #0f172a;">
            DAILY REVENUE & CONSUMPTION AUDIT TRAIL
          </h3>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">DATE</th>
                <th style="text-align: right;">GENERATED (kWh)</th>
                <th style="text-align: right;">CONSUMED (kWh)</th>
                <th style="text-align: right;">EXPORT (kWh)</th>
                <th style="text-align: right;">IMPORT (kWh)</th>
                <th style="text-align: right;">REVENUE</th>
                <th style="text-align: right;">EXPENSE</th>
                <th style="text-align: right;">NET PROFIT</th>
              </tr>
            </thead>
            <tbody>
              ${entryRowsHtml}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 14px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 6.8pt; color: #94a3b8;">
        <span>Official Computer-Generated Financial Statement &bull; Ref: ${refId}</span>
        <span>Issued by Solar Revenue Tracker Enterprise Core</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * 2. Monthly Settlement Calculation Statement (GERC Net Metering - A4 Landscape)
 */
function generateSettlementReportHtml(settlementData = {}, userEmail = 'consumer@solar.com', currency = '₹', monthName = 'Month', year = 2026) {
  userEmail = escapeHtml(userEmail);
  currency = escapeHtml(currency);
  monthName = escapeHtml(monthName);
  year = escapeHtml(year);
  const summary = settlementData.summary || {};
  const history = settlementData.history || settlementData.rows || [];
  const monthPadded = String(summary.month || new Date().getMonth() + 1).padStart(2, '0');
  const refId = `DISCOM-SETTLE-${year}${monthPadded}-${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}`;
  const generatedTimestamp = new Date().toLocaleString('en-IN', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  const isCredit = (summary.month_closing_balance ?? 0) >= 0;
  const isBalanced = (summary.month_closing_balance ?? 0) === 0;
  const finalStatus = summary.final_status || (isCredit ? 'Govt Credit' : 'Govt Payable');
  const bannerBg = isCredit ? (isBalanced ? '#f8fafc' : '#f0fdf4') : '#fef2f2';
  const bannerBorder = isCredit ? (isBalanced ? '#cbd5e1' : '#86efac') : '#fca5a5';
  const bannerTextColor = isCredit ? (isBalanced ? '#1e293b' : '#166534') : '#991b1b';
  const finalAmountStr = formatNumber(summary.final_settlement_amount_rs);

  const tableRowsHtml = history.map((row, idx) => {
    const isRowCredit = (row.closing_settlement_balance ?? 0) > 0;
    const isRowPayable = (row.closing_settlement_balance ?? 0) < 0;
    const badgeBg = isRowCredit ? '#dcfce7' : isRowPayable ? '#fee2e2' : '#f1f5f9';
    const badgeColor = isRowCredit ? '#166534' : isRowPayable ? '#991b1b' : '#334155';
    const badgeBorder = isRowCredit ? '#bbf7d0' : isRowPayable ? '#fecaca' : '#cbd5e1';

    return `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="font-weight: 700; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${formatDisplayDate(row.date)}</td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.opening_import_meter !== null && row.opening_import_meter !== undefined ? formatNumber(row.opening_import_meter, 0) : '-'}</td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.closing_import_meter !== null && row.closing_import_meter !== undefined ? formatNumber(row.closing_import_meter, 0) : '-'}</td>
        <td style="text-align: right; font-weight: 700; color: #b91c1c; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${formatNumber(row.daily_import_units, 1)}</td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.opening_export_meter !== null && row.opening_export_meter !== undefined ? formatNumber(row.opening_export_meter, 0) : '-'}</td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.closing_export_meter !== null && row.closing_export_meter !== undefined ? formatNumber(row.closing_export_meter, 0) : '-'}</td>
        <td style="text-align: right; font-weight: 700; color: #15803d; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${formatNumber(row.daily_export_units, 1)}</td>
        <td style="text-align: right; font-weight: 700; color: ${row.gross_difference >= 0 ? '#15803d' : '#b91c1c'}; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">
          ${row.gross_difference >= 0 ? '+' : ''}${formatNumber(row.gross_difference, 1)}
        </td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.opening_settlement_balance >= 0 ? '+' : ''}${formatNumber(row.opening_settlement_balance, 1)}</td>
        <td style="text-align: right; color: #15803d; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.govt_credit_generated > 0 ? '+' + formatNumber(row.govt_credit_generated, 1) : '-'}</td>
        <td style="text-align: right; color: #b45309; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.govt_credit_used > 0 ? '-' + formatNumber(row.govt_credit_used, 1) : '-'}</td>
        <td style="text-align: right; color: #b91c1c; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${row.govt_payable > 0 ? formatNumber(row.govt_payable, 1) : '-'}</td>
        <td style="text-align: right; font-weight: 700; color: ${row.closing_settlement_balance >= 0 ? '#15803d' : '#b91c1c'}; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">
          ${row.closing_settlement_balance >= 0 ? '+' : ''}${formatNumber(row.closing_settlement_balance, 1)}
        </td>
        <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${currency}${formatNumber(row.settlement_rate, 2)}</td>
        <td style="text-align: right; font-weight: 700; padding: 4px 5px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9;">${currency}${formatNumber(row.settlement_amount_rs, 2)}</td>
        <td style="text-align: center; padding: 4px 5px; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-size: 6pt; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; white-space: nowrap;">
            ${(row.settlement_status || '').toUpperCase()}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Monthly Settlement Statement - ${monthName} ${year}</title>
      <style>
        @page { size: A4 landscape; margin: 6mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 8pt; line-height: 1.35; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        table { width: 100%; border-collapse: collapse; font-size: 7.2pt; border: 1px solid #cbd5e1; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th { border: 1px solid #334155; text-align: center; padding: 4px 3px; }
        .th-main { background: #0f172a; color: #ffffff; font-weight: 700; font-size: 6.6pt; letter-spacing: 0.03em; }
        .th-imp { background: #1e293b; color: #fca5a5; }
        .th-exp { background: #1e293b; color: #86efac; }
        .th-bal { background: #1e293b; color: #93c5fd; }
        .th-mon { background: #1e293b; color: #fde047; }
        .th-sub { background: #1e293b; color: #e2e8f0; font-size: 6.2pt; font-weight: 600; }
        .kpi-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; background: #ffffff; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 6px; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            ☀️
          </div>
          <div>
            <h1 style="font-size: 14pt; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.1;">SOLAR REVENUE TRACKER</h1>
            <p style="font-size: 7pt; font-weight: 700; letter-spacing: 0.06em; color: #475569; margin: 2px 0 0 0; text-transform: uppercase;">
              OFFICIAL MONTHLY NET METERING SETTLEMENT STATEMENT
            </p>
          </div>
        </div>

        <div style="text-align: right; font-size: 7.2pt; color: #334155;">
          <div style="display: inline-block; background: #1e293b; color: #ffffff; padding: 2px 6px; font-weight: 700; font-size: 6.5pt; border-radius: 3px; margin-bottom: 3px;">
            OFFICIAL AUDIT STATEMENT
          </div>
          <div style="font-family: monospace;"><strong>REF:</strong> ${refId}</div>
          <div style="font-family: monospace;"><strong>DATE:</strong> ${generatedTimestamp}</div>
        </div>
      </div>

      <div style="height: 2.5px; background: #1e293b; margin: 6px 0 10px 0;"></div>

      <!-- Scope Metadata -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">BILLING CYCLE</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${monthName} ${year}</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">CONSUMER ACCOUNT</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${userEmail}</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">SETTLEMENT POLICY</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">Gujarat Solar Net Metering (GERC)</div>
        </div>
        <div>
          <span style="font-size: 6.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">AUDITED LOGS</span>
          <div style="font-size: 8.5pt; font-weight: 700; color: #0f172a;">${summary.total_days || history.length} Days Recorded</div>
        </div>
      </div>

      <!-- Result Banner -->
      <div style="border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1.5px solid ${bannerBorder}; background: ${bannerBg}; color: ${bannerTextColor};">
        <div>
          <div style="font-size: 8pt; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase;">
            ${isCredit ? '★ CONSOLIDATED STATUS: NET GOVT CREDIT (CARRY FORWARD)' : '▲ CONSOLIDATED STATUS: NET GOVT PAYABLE (DEFICIT)'}
          </div>
          <div style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
            Month Closing Carry-Forward Balance:
            <strong>${(summary.month_closing_balance ?? 0) >= 0 ? '+' : ''}${formatNumber(summary.month_closing_balance, 2)} kWh Units</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 6.5pt; font-weight: 700; text-transform: uppercase; opacity: 0.85;">NET SETTLEMENT VALUE</div>
          <div style="font-size: 13pt; font-weight: 900; line-height: 1.1; font-variant-numeric: tabular-nums;">${currency}${finalAmountStr}</div>
          <div style="font-size: 6.8pt; font-weight: 600; opacity: 0.9;">Applied Tariff @ ${currency}${formatNumber(summary.settlement_rate, 2)}/Unit</div>
        </div>
      </div>

      <!-- 6-Metric KPI Grid -->
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px;">
        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">TOTAL SOLAR EXPORT</div>
          <div style="font-size: 10pt; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums;">+${formatNumber(summary.total_export_units, 2)} kWh</div>
          <div style="font-size: 6.2pt; color: #64748b;">Closing: ${summary.month_closing_export_meter ?? '-'}</div>
        </div>

        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">TOTAL GRID IMPORT</div>
          <div style="font-size: 10pt; font-weight: 800; color: #b91c1c; font-variant-numeric: tabular-nums;">${formatNumber(summary.total_import_units, 2)} kWh</div>
          <div style="font-size: 6.2pt; color: #64748b;">Closing: ${summary.month_closing_import_meter ?? '-'}</div>
        </div>

        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">NET ENERGY BALANCE</div>
          <div style="font-size: 10pt; font-weight: 800; color: ${(summary.net_gross_difference ?? 0) >= 0 ? '#15803d' : '#b91c1c'}; font-variant-numeric: tabular-nums;">
            ${(summary.net_gross_difference ?? 0) >= 0 ? '+' : ''}${formatNumber(summary.net_gross_difference, 2)} kWh
          </div>
          <div style="font-size: 6.2pt; color: #64748b;">Gross Gen vs Imp</div>
        </div>

        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">CREDIT GENERATED</div>
          <div style="font-size: 10pt; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums;">+${formatNumber(summary.total_credit_generated, 2)} Units</div>
          <div style="font-size: 6.2pt; color: #64748b;">Surplus Banked</div>
        </div>

        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">CREDIT OFFSET</div>
          <div style="font-size: 10pt; font-weight: 800; color: #b45309; font-variant-numeric: tabular-nums;">${formatNumber(summary.total_credit_used, 2)} Units</div>
          <div style="font-size: 6.2pt; color: #64748b;">Deficit Absorbed</div>
        </div>

        <div class="kpi-box">
          <div style="font-size: 6pt; font-weight: 700; color: #64748b; text-transform: uppercase;">FINANCIAL VALUATION</div>
          <div style="font-size: 10pt; font-weight: 800; color: ${isCredit ? '#15803d' : '#b91c1c'}; font-variant-numeric: tabular-nums;">
            ${isCredit ? '+' : ''}${currency}${finalAmountStr}
          </div>
          <div style="font-size: 6.2pt; color: #64748b;">${finalStatus}</div>
        </div>
      </div>

      <!-- Table Section -->
      <div style="margin-bottom: 10px;">
        <table>
          <thead>
            <tr>
              <th rowspan="2" class="th-main" style="width: 8%;">DATE</th>
              <th colspan="3" class="th-main th-imp">IMPORT METER (kWh)</th>
              <th colspan="3" class="th-main th-exp">EXPORT METER (kWh)</th>
              <th rowspan="2" class="th-main" style="width: 7%;">GROSS<br/>DIFF</th>
              <th colspan="5" class="th-main th-bal">RUNNING SETTLEMENT ACCOUNT (UNITS)</th>
              <th colspan="2" class="th-main th-mon">SETTLEMENT</th>
              <th rowspan="2" class="th-main" style="width: 8%;">STATUS</th>
            </tr>
            <tr>
              <th class="th-sub" style="width: 6%;">OPEN</th>
              <th class="th-sub" style="width: 6%;">CLOSE</th>
              <th class="th-sub" style="width: 5%;">UNITS</th>
              <th class="th-sub" style="width: 6%;">OPEN</th>
              <th class="th-sub" style="width: 6%;">CLOSE</th>
              <th class="th-sub" style="width: 5%;">UNITS</th>
              <th class="th-sub" style="width: 6%;">OPEN</th>
              <th class="th-sub" style="width: 6%;">CREDIT+</th>
              <th class="th-sub" style="width: 6%;">USED-</th>
              <th class="th-sub" style="width: 6%;">PAYABLE</th>
              <th class="th-sub" style="width: 6%;">CLOSE</th>
              <th class="th-sub" style="width: 6%;">RATE</th>
              <th class="th-sub" style="width: 8%;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 800;">
              <td style="padding: 5px; font-size: 7.2pt;">TOTALS:</td>
              <td class="num" style="padding: 5px;">${summary.month_opening_import_meter !== null && summary.month_opening_import_meter !== undefined ? formatNumber(summary.month_opening_import_meter, 0) : '-'}</td>
              <td class="num" style="padding: 5px;">${summary.month_closing_import_meter !== null && summary.month_closing_import_meter !== undefined ? formatNumber(summary.month_closing_import_meter, 0) : '-'}</td>
              <td class="num" style="padding: 5px; color: #b91c1c;">${formatNumber(summary.total_import_units, 2)}</td>
              <td class="num" style="padding: 5px;">${summary.month_opening_export_meter !== null && summary.month_opening_export_meter !== undefined ? formatNumber(summary.month_opening_export_meter, 0) : '-'}</td>
              <td class="num" style="padding: 5px;">${summary.month_closing_export_meter !== null && summary.month_closing_export_meter !== undefined ? formatNumber(summary.month_closing_export_meter, 0) : '-'}</td>
              <td class="num" style="padding: 5px; color: #15803d;">${formatNumber(summary.total_export_units, 2)}</td>
              <td class="num" style="padding: 5px; color: ${(summary.net_gross_difference ?? 0) >= 0 ? '#15803d' : '#b91c1c'};">
                ${(summary.net_gross_difference ?? 0) >= 0 ? '+' : ''}${formatNumber(summary.net_gross_difference, 2)}
              </td>
              <td class="num" style="padding: 5px;">${formatNumber(summary.month_opening_balance, 2)}</td>
              <td class="num" style="padding: 5px; color: #15803d;">+${formatNumber(summary.total_credit_generated, 2)}</td>
              <td class="num" style="padding: 5px; color: #b45309;">-${formatNumber(summary.total_credit_used, 2)}</td>
              <td class="num" style="padding: 5px; color: #b91c1c;">${formatNumber(summary.total_payable_generated, 2)}</td>
              <td class="num" style="padding: 5px; color: ${(summary.month_closing_balance ?? 0) >= 0 ? '#15803d' : '#b91c1c'};">
                ${(summary.month_closing_balance ?? 0) >= 0 ? '+' : ''}${formatNumber(summary.month_closing_balance, 2)}
              </td>
              <td class="num" style="padding: 5px;">-</td>
              <td class="num" style="padding: 5px;">${currency}${finalAmountStr}</td>
              <td style="text-align: center; padding: 5px;">${finalStatus}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Regulatory Rules Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="font-size: 6.5pt; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; margin-bottom: 3px;">
          GOVERNING REGULATORY RULES & METHODOLOGY (GERC NET METERING)
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 6.2pt; color: #475569; line-height: 1.3;">
          <div><strong>1. Energy Exchange:</strong> Daily Gross Difference = Export Units - Import Units. Positive values denote net export to grid; negative values denote net drawal.</div>
          <div><strong>2. Credit Banking:</strong> Surplus export credits bank in the running account balance and carry forward daily through the monthly cycle.</div>
          <div><strong>3. Deficit Offset:</strong> When consumption exceeds generation, banked credits offset deficit before cash payable charges accrue.</div>
          <div><strong>4. Month-End Settlement:</strong> Net closing balance valued at statutory Feed-in Tariff (${currency}${formatNumber(summary.settlement_rate, 2)}/Unit).</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding-top: 4px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 6.2pt; color: #94a3b8;">
        <span>Official Computer-Generated Rooftop Solar Settlement Certificate &bull; Ref: ${refId}</span>
        <span>Issued by Solar Revenue Tracker Enterprise Core</span>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  generateFinancialReportHtml,
  generateSettlementReportHtml
};
