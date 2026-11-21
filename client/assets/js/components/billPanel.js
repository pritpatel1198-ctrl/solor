/**
 * Balance & bills, shown on the Dashboard:
 * the running balance, the "add bill" sheet and the bill history.
 */
const BillPanel = {
  ledger: null,
  showAll: false,
  heroEl: null,
  listEl: null,
  VISIBLE_BILLS: 3,

  mount(heroEl, listEl) {
    this.heroEl = heroEl;
    this.listEl = listEl;
    this.showAll = false;
  },

  async load() {
    try {
      const res = await API.getBills({ silentError: true });
      this.ledger = res.data;
      this.render();
    } catch (err) {
      console.error('Failed to load bill balance:', err);
      if (/one-time database setup/i.test(err.message)) {
        this.renderSetupNeeded();
      } else {
        UI.loadError(this.heroEl, () => this.load());
        this.listEl.innerHTML = '';
      }
    }
  },

  format() {
    const cur = escapeHtml(appState.getState().settings.currency || '₹');
    const num = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return {
      cur,
      num,
      units: (v) => `${v > 0 ? '+' : (v < 0 ? '-' : '')}${num(Math.abs(v))}`,
      money: (m) => `${cur}${num(m.amount)}`,
      label: (m) => (m.type === 'credit' ? 'Credit' : (m.type === 'payable' ? 'Payable' : 'Balanced')),
      tone: (m) => (m.type === 'credit' ? 'text-good' : (m.type === 'payable' ? 'text-bad' : 'text-ink')),
      badge: (m) => (m.type === 'credit' ? 'badge-profit' : (m.type === 'payable' ? 'badge-loss' : 'badge-balanced')),
      heroPill: (m) => (m.type === 'credit' ? 'hero-pill-good' : (m.type === 'payable' ? 'hero-pill-bad' : 'hero-pill'))
    };
  },

  render() {
    this.renderHero();
    this.renderList();
    UI.refreshIcons();
  },

  renderHero() {
    const f = this.format();
    const c = this.ledger.current;
    const hasBill = Boolean(c.last_bill_date);
    const total = c.export_units + c.import_units;
    const exportPct = total > 0 ? (c.export_units / total) * 100 : 0;

    this.heroEl.innerHTML = `
      <section class="hero" aria-label="Current balance">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.8125rem] font-medium text-on-hero-2">Balance now</span>
          <span class="hero-pill ${f.heroPill(c.money)}">${f.label(c.money)}</span>
        </div>

        <p class="mt-2 truncate text-5xl leading-none font-semibold tracking-tight tabular-nums lg:text-6xl">${f.money(c.money)}</p>
        <p class="mt-2 truncate text-sm text-on-hero-2 tabular-nums">
          ${f.units(c.balance_units)} units${hasBill ? ` · ${f.units(c.opening_units)} carried from ${UI.date(c.last_bill_date)}` : ''}
        </p>

        <div class="mt-5">
          <div class="flex h-2 gap-0.5 overflow-hidden rounded-full bg-hero-line" role="img" aria-label="${hasBill ? 'Since last bill: ' : ''}export ${f.num(c.export_units)} units, import ${f.num(c.import_units)} units">
            ${total > 0 ? `<div class="bg-hero-good" style="width:${exportPct}%"></div><div class="flex-1 bg-hero-bad"></div>` : ''}
          </div>
          <div class="mt-2 flex items-center justify-between gap-3 text-sm tabular-nums">
            <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-hero-good" aria-hidden="true"></span><span class="text-on-hero-2">Export</span> <b class="font-semibold">${f.num(c.export_units)}</b></span>
            <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-hero-bad" aria-hidden="true"></span><span class="text-on-hero-2">Import</span> <b class="font-semibold">${f.num(c.import_units)}</b></span>
          </div>
        </div>
        ${c.missing_days > 0 ? `<p class="mt-2 text-xs text-on-hero-2">${c.missing_days} day(s) have no reading, so this may be incomplete.</p>` : ''}

        <div class="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" id="dashboard-add-bill" class="btn hero-cta min-h-12">${UI.icon('receipt')}<span>Add Bill</span></button>
          <button type="button" id="dashboard-add-reading" class="btn hero-secondary min-h-12">${UI.icon('plus')}<span>Add Reading</span></button>
        </div>
      </section>
    `;
    document.getElementById('dashboard-add-bill').onclick = () => this.openAddSheet();
    document.getElementById('dashboard-add-reading').onclick = () => Router.navigate('entry');
  },

  renderList() {
    const f = this.format();
    const bills = this.ledger.bills;

    if (bills.length === 0) {
      this.listEl.innerHTML = `
        <div class="flex items-center gap-3 px-4 py-3 md:px-5">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-ink-3">${UI.icon('receipt', 'size-4!')}</span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold">No bills yet</span>
            <span class="block text-xs text-ink-3">Add your 2-month bill when it arrives.</span>
          </span>
        </div>
      `;
      return;
    }

    const visible = this.showAll ? bills : bills.slice(0, this.VISIBLE_BILLS);
    this.listEl.innerHTML = visible.map(b => `
      <details class="group/row">
        <summary class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">${UI.dateLong(b.bill_date)}</span>
            <span class="block text-xs text-ink-3 tabular-nums">${f.num(b.adjusted_units)} units · ${f.units(b.remaining_units)} left</span>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <span class="text-right">
              <span class="block text-sm font-semibold tabular-nums ${f.tone(b.remaining_money)}">${f.money(b.remaining_money)}</span>
              <span class="block text-[0.6875rem] text-ink-3">${f.label(b.remaining_money)}</span>
            </span>
            <span class="text-ink-3 transition-transform duration-150 group-open/row:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </span>
        </summary>
        <div class="border-t border-line bg-subtle/40 px-4 pt-1 pb-3">
          <div class="divide-y divide-line">
            ${UI.kv('Period', `${UI.date(b.period_start)} to ${UI.date(b.period_end)}`)}
            ${UI.kv('Carried in', f.units(b.opening_units))}
            ${UI.kv('Export', f.num(b.export_units), 'text-good')}
            ${UI.kv('Import', f.num(b.import_units), 'text-bad')}
            ${UI.kv('Balance before bill', f.units(b.balance_before_units))}
            ${UI.kv('Bill units', `-${f.num(b.adjusted_units)}`)}
            ${UI.kv('Remaining', `${f.units(b.remaining_units)} units`, f.tone(b.remaining_money))}
            ${b.bill_amount !== null ? UI.kv('Bill amount', `${b.bill_amount < 0 ? '-' : ''}${f.cur}${f.num(Math.abs(b.bill_amount))}`) : ''}
          </div>
          ${b.missing_days > 0 ? `<p class="mt-2 text-xs text-ink-3">${b.missing_days} day(s) had no reading in this cycle.</p>` : ''}
          <button type="button" class="btn btn-danger btn-block bill-delete-btn mt-2" data-id="${escapeHtml(b.id)}" data-date="${escapeHtml(b.bill_date)}">${UI.icon('trash-2')}<span>Delete this bill</span></button>
        </div>
      </details>
    `).join('') + (bills.length > this.VISIBLE_BILLS ? `
      <button type="button" id="bills-show-all" class="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-ink-2 hover:bg-subtle">
        ${this.showAll ? 'Show less' : `Show all ${bills.length} bills`}
      </button>
    ` : '');

    this.listEl.querySelectorAll('.bill-delete-btn').forEach(btn => {
      btn.onclick = () => this.removeBill(btn.getAttribute('data-id'), btn.getAttribute('data-date'));
    });
    const toggle = document.getElementById('bills-show-all');
    if (toggle) {
      toggle.onclick = () => {
        this.showAll = !this.showAll;
        this.renderList();
        UI.refreshIcons();
      };
    }
  },

  renderSetupNeeded() {
    this.listEl.innerHTML = '';
    this.heroEl.innerHTML = `
      <section class="card card-body">
        <div class="flex items-start gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">${UI.icon('database')}</span>
          <div class="min-w-0">
            <h2 class="text-sm font-semibold">One-time database setup needed</h2>
            <p class="mt-1 text-sm leading-relaxed text-ink-2">Open the Supabase SQL Editor and run <code class="font-semibold break-all">supabase/add_electricity_bills.sql</code>. It adds one new table and doesn't change your existing data.</p>
            <button type="button" id="bill-setup-retry" class="btn btn-outline mt-3">${UI.icon('rotate-ccw')}<span>Check again</span></button>
          </div>
        </div>
      </section>
    `;
    document.getElementById('bill-setup-retry').onclick = () => this.load();
    UI.refreshIcons();
  },

  openAddSheet() {
    const f = this.format();
    const today = localDateStr();
    Modal.open({
      title: 'Add electricity bill',
      bodyHTML: `
        <form id="bill-cycle-form" class="flex flex-col gap-3" novalidate>
          <div class="flex items-center justify-between rounded-control bg-subtle px-3 py-2.5 text-sm">
            <span class="text-ink-2">Balance now</span>
            <span class="font-semibold tabular-nums">${f.units(this.ledger.current.balance_units)} units</span>
          </div>
          <div class="field">
            <label class="label" for="bill-cycle-date">Bill date</label>
            <input type="date" id="bill-cycle-date" class="input" value="${today}" max="${today}" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label" for="bill-cycle-units">Bill units</label>
              <input type="number" id="bill-cycle-units" class="input" min="0" step="0.01" inputmode="decimal" placeholder="e.g. 60" required />
            </div>
            <div class="field">
              <label class="label" for="bill-cycle-amount">Bill amount (${f.cur})</label>
              <input type="number" id="bill-cycle-amount" class="input" step="0.01" inputmode="decimal" placeholder="e.g. 185.50" required />
            </div>
          </div>
          <p class="hint">Units are subtracted from your balance up to and including the bill date. The amount is saved with the bill for your record.</p>
          <div id="bill-cycle-error" role="alert" class="hidden rounded-control bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad"></div>
        </form>
      `,
      footerHTML: `<button type="submit" form="bill-cycle-form" id="bill-cycle-save" class="btn btn-primary min-h-12">${UI.icon('check')}<span>Save Bill &amp; Calculate</span></button>`
    });
    document.getElementById('bill-cycle-form').onsubmit = (e) => {
      e.preventDefault();
      this.saveBill();
    };
    document.getElementById('bill-cycle-units').focus();
  },

  showSavedResult(b) {
    const f = this.format();
    const [y, m, d] = b.bill_date.split('-').map(Number);
    const next = localDateStr(new Date(y, m - 1, d + 1));
    Modal.open({
      title: `Bill of ${UI.dateLong(b.bill_date)}`,
      bodyHTML: `
        <div id="bill-saved-result">
          <div class="text-center">
            <p class="text-[0.8125rem] font-medium text-ink-3">Money remaining</p>
            <p class="mt-1 text-4xl font-semibold tracking-tight tabular-nums ${f.tone(b.remaining_money)}">${f.money(b.remaining_money)}</p>
            <span class="badge mt-2 ${f.badge(b.remaining_money)}">${f.label(b.remaining_money)}</span>
          </div>
          <div class="mt-3 divide-y divide-line border-t border-line">
            ${UI.kv('Balance before bill', `${f.units(b.balance_before_units)} units`)}
            ${UI.kv('Bill units', `-${f.num(b.adjusted_units)} units`)}
            ${UI.kv('<span class="font-semibold text-ink">Remaining</span>', `${f.units(b.remaining_units)} units`, 'font-semibold')}
          </div>
          <p class="mt-2 text-xs text-ink-3">New cycle starts ${UI.date(next)} with ${f.units(b.remaining_units)} units carried forward.</p>
        </div>
      `,
      footerHTML: '<button type="button" id="bill-saved-done" class="btn btn-primary min-h-12">Done</button>'
    });
    document.getElementById('bill-saved-done').onclick = () => Modal.close();
  },

  async saveBill() {
    const bill = {
      bill_date: document.getElementById('bill-cycle-date').value,
      adjusted_units: document.getElementById('bill-cycle-units').value,
      bill_amount: document.getElementById('bill-cycle-amount').value
    };
    const errorEl = document.getElementById('bill-cycle-error');
    const units = Number(bill.adjusted_units);
    let error = null;
    if (!bill.bill_date) error = 'Please enter the bill date.';
    else if (bill.bill_date > localDateStr()) error = 'Bill date cannot be in the future.';
    else if (bill.adjusted_units === '' || !Number.isFinite(units) || units < 0) error = 'Bill units must be a number of 0 or more.';
    else if (bill.bill_amount === '' || !Number.isFinite(Number(bill.bill_amount))) error = 'Please enter the bill amount.';
    if (error) {
      errorEl.textContent = error;
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';

    const btn = document.getElementById('bill-cycle-save');
    btn.disabled = true;
    try {
      const res = await API.createBill(bill);
      this.ledger = res.data;
      this.render();
      this.showSavedResult(res.data.saved);
      Toast.success('Bill saved.');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      btn.disabled = false;
    }
  },

  async removeBill(id, date) {
    if (!confirm(`Delete the bill of ${date}? Balances after it will be recalculated.`)) return;
    try {
      const res = await API.deleteBill(id);
      this.ledger = res.data;
      this.render();
      Toast.success('Bill deleted.');
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  }
};
