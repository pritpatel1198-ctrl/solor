/**
 * Skeleton Loader UI Helper
 */
const Skeleton = {
  renderKpiCards(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card kpi-card">
          <div class="kpi-header">
            <div class="skeleton" style="width: 100px; height: 16px;"></div>
            <div class="skeleton" style="width: 36px; height: 36px; border-radius: 8px;"></div>
          </div>
          <div class="skeleton" style="width: 140px; height: 32px; margin-top: 10px;"></div>
          <div class="skeleton" style="width: 80px; height: 14px; margin-top: 6px;"></div>
        </div>
      `;
    }
    return html;
  },

  renderTableRows(rows = 5, cols = 6) {
    let html = '';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td><div class="skeleton" style="height: 18px; width: ${60 + Math.random() * 30}%;"></div></td>`;
      }
      html += '</tr>';
    }
    return html;
  }
};
