/**
 * Skeleton Loader UI Helper
 */
const Skeleton = {
  renderKpiCards(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="stat" aria-hidden="true">
          <div class="skeleton h-3 w-20"></div>
          <div class="skeleton mt-1 h-7 w-24"></div>
          <div class="skeleton mt-1 h-3 w-16"></div>
        </div>
      `;
    }
    return html;
  },

  renderTableRows(rows = 5, cols = 6) {
    let html = '';
    for (let r = 0; r < rows; r++) {
      html += '<tr aria-hidden="true">';
      for (let c = 0; c < cols; c++) {
        html += '<td><div class="skeleton h-4 w-16"></div></td>';
      }
      html += '</tr>';
    }
    return html;
  },

  renderListRows(rows = 4) {
    let html = '';
    for (let r = 0; r < rows; r++) {
      html += `
        <div class="flex items-center justify-between gap-3 p-4" aria-hidden="true">
          <div class="flex flex-col gap-2"><div class="skeleton h-4 w-28"></div><div class="skeleton h-3 w-40"></div></div>
          <div class="skeleton h-5 w-16 rounded-full"></div>
        </div>
      `;
    }
    return html;
  },

  renderCalendarCells(count = 35) {
    return Array.from({ length: count }, () => '<div class="skeleton aspect-square rounded-control md:aspect-auto md:h-24" aria-hidden="true"></div>').join('');
  }
};
