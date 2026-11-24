/**
 * Balance & bills, shown on the Dashboard:
 * the running balance (₹), the "add bill" sheet and the bill history.
 * A bill is a signed amount: + adds to the balance, - subtracts from it.
 */
const BillPanel = {
  ledger: null,
  showAll: false,
  heroEl: null,
  listEl: null,
  billSign: 1,
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
    const num = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return {
      cur,
      num,
      // ₹56.25 / −₹12 / ₹0
      amount: (v) => `${v < 0 ? '−' : ''}${cur}${num(Math.abs(v))}`,
      // +₹50 / −₹12 / ₹0
      signed: (v) => `${v > 0 ? '+' : (v < 0 ? '−' : '')}${cur}${num(Math.abs(v))}`,
      units: (v) => `${v > 0 ? '+' : (v < 0 ? '−' : '')}${num(Math.abs(v))}`,
      label: (m) => (m.type === 'credit' ? 'Credit' : (m.type === 'payable' ? 'Payable' : 'Balanced')),
      tone: (v) => (v > 0 ? 'text-good' : (v < 0 ? 'text-bad' : 'text-ink')),
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
    const detail = hasBill
      ? `${f.amount(c.opening_amount)} from bill of ${UI.date(c.last_bill_date)}${c.period_amount ? ` · ${f.signed(c.period_amount)} since` : ''}`
      : `${f.units(c.net_units)} kWh net at ${f.cur}${f.num(c.buying_rate)} / ${f.cur}${f.num(c.selling_rate)} per unit`;

    this.heroEl.innerHTML = `
      <section class="hero" aria-label="Current balance">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.8125rem] font-medium text-on-hero-2">Balance now</span>
          <span class="hero-pill ${f.heroPill(c.money)}">${f.label(c.money)}</span>
        </div>

        <p class="mt-2 truncate text-5xl leading-none font-semibold tracking-tight tabular-nums lg:text-6xl">${f.amount(c.balance_amount)}</p>
        <p class="mt-2 text-sm text-on-hero-2 tabular-nums">${detail}</p>

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
        <summary class="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 md:px-5">
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">${UI.dateLong(b.bill_date)}</span>
            <span class="block truncate text-xs text-ink-3 tabular-nums">Bill <b class="font-semibold ${f.tone(b.bill_amount)}">${f.signed(b.bill_amount)}</b> · before ${f.amount(b.balance_before_amount)}</span>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <span class="text-right">
              <span class="block text-sm font-semibold tabular-nums ${f.tone(b.remaining_amount)}">${f.amount(b.remaining_amount)}</span>
              <span class="block text-[0.6875rem] text-ink-3">after bill</span>
            </span>
            <span class="text-ink-3 transition-transform duration-150 group-open/row:rotate-180">${UI.icon('chevron-down', 'size-4')}</span>
          </span>
        </summary>
        <div class="border-t border-line bg-subtle/40 px-4 pt-1 pb-3 md:px-5">
          <div class="divide-y divide-line">
            ${UI.kv('Period', `${UI.date(b.period_start)} to ${UI.date(b.period_end)}`)}
            ${UI.kv('Carried in', f.signed(b.opening_amount))}
            ${UI.kv('Export / Import', `${f.num(b.export_units)} / ${f.num(b.import_units)} kWh`)}
            ${UI.kv('Value of units', f.signed(b.period_amount), f.tone(b.period_amount))}
            ${UI.kv('Balance before bill', f.amount(b.balance_before_amount))}
            ${UI.kv('Bill amount', f.signed(b.bill_amount), f.tone(b.bill_amount))}
            ${UI.kv('Balance after bill', f.amount(b.remaining_amount), `font-semibold ${f.tone(b.remaining_amount)}`)}
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

  // "+500", "-500", "−500" or "500" (sign from the +/− buttons). Returns NaN if not a number.
  parseAmount(text) {
    const match = String(text).trim().replace(/,/g, '').match(/^([+\-−])?\s*(\d+(?:\.\d+)?)$/);
    if (!match) return NaN;
    if (match[1]) this.setSign(match[1] === '+' ? 1 : -1);
    return this.billSign * Number(match[2]);
  },

  setSign(sign) {
    this.billSign = sign;
    document.querySelectorAll('.bill-sign').forEach(btn => {
      const active = Number(btn.getAttribute('data-sign')) === sign;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    });
  },

  updatePreview() {
    const f = this.format();
    const c = this.ledger.current;
    const preview = document.getElementById('bill-cycle-preview');
    const date = document.getElementById('bill-cycle-date').value;
    const amount = this.parseAmount(document.getElementById('bill-cycle-amount').value);
    // Only exact when no reading falls after the bill date
    const exact = !c.period_end || !date || date >= c.period_end;
    if (!Number.isFinite(amount) || amount === 0 || !exact) {
      preview.classList.add('hidden');
      return;
    }
    const after = Math.round((c.balance_amount + amount) * 100) / 100;
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="flex items-center justify-between rounded-control border border-line px-3 py-2.5 text-sm">
        <span class="text-ink-2">Balance after this bill</span>
        <span class="font-semibold tabular-nums ${f.tone(after)}">${f.amount(after)}</span>
      </div>
    `;
  },

  openAddSheet() {
    const f = this.format();
    const today = localDateStr();
    this.billSign = 1;
    Modal.open({
      title: 'Add electricity bill',
      bodyHTML: `
        <form id="bill-cycle-form" class="flex flex-col gap-3" novalidate>
          <div class="flex items-center justify-between rounded-control bg-subtle px-3 py-2.5 text-sm">
            <span class="text-ink-2">Balance now</span>
            <span class="font-semibold tabular-nums ${f.tone(this.ledger.current.balance_amount)}">${f.amount(this.ledger.current.balance_amount)}</span>
          </div>
          <div class="field">
            <label class="label" for="bill-cycle-date">Bill date</label>
            <input type="date" id="bill-cycle-date" class="input" value="${today}" max="${today}" required />
          </div>
          <div class="field">
            <span class="label" id="bill-sign-label">Bill amount (${f.cur})</span>
            <div class="segmented" role="radiogroup" aria-labelledby="bill-sign-label">
              <button type="button" role="radio" class="bill-sign segment active" data-sign="1" aria-checked="true">${UI.icon('plus')}<span>Add to balance</span></button>
              <button type="button" role="radio" class="bill-sign segment" data-sign="-1" aria-checked="false">${UI.icon('minus')}<span>Subtract</span></button>
            </div>
            <label class="sr-only" for="bill-cycle-amount">Bill amount</label>
            <input type="text" id="bill-cycle-amount" class="input mt-1 text-lg! font-semibold" inputmode="decimal" autocomplete="off" placeholder="e.g. 500 or -500" required aria-describedby="bill-cycle-hint" />
            <span id="bill-cycle-hint" class="hint">Type + or − before the amount, or choose above.</span>
          </div>
          <div id="bill-cycle-preview" class="hidden" aria-live="polite"></div>
          <div id="bill-cycle-error" role="alert" class="hidden rounded-control bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad"></div>
        </form>
      `,
      footerHTML: `<button type="submit" form="bill-cycle-form" id="bill-cycle-save" class="btn btn-primary min-h-12">${UI.icon('check')}<span>Save Bill</span></button>`
    });

    document.querySelectorAll('.bill-sign').forEach(btn => {
      btn.onclick = () => {
        this.setSign(Number(btn.getAttribute('data-sign')));
        // A typed sign would override the buttons, so drop it when the user picks one
        const input = document.getElementById('bill-cycle-amount');
        input.value = input.value.replace(/^\s*[+\-−]\s*/, '');
        this.updatePreview();
      };
    });
    document.getElementById('bill-cycle-amount').oninput = () => this.updatePreview();
    document.getElementById('bill-cycle-date').onchange = () => this.updatePreview();
    document.getElementById('bill-cycle-form').onsubmit = (e) => {
      e.preventDefault();
      this.saveBill();
    };
    document.getElementById('bill-cycle-amount').focus();
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
            <p class="text-[0.8125rem] font-medium text-ink-3">Balance after bill</p>
            <p class="mt-1 text-4xl font-semibold tracking-tight tabular-nums ${f.tone(b.remaining_amount)}">${f.amount(b.remaining_amount)}</p>
            <span class="badge mt-2 ${f.badge(b.remaining_money)}">${f.label(b.remaining_money)}</span>
          </div>
          <div class="mt-3 divide-y divide-line border-t border-line">
            ${UI.kv('Balance before bill', f.amount(b.balance_before_amount))}
            ${UI.kv('Bill amount', f.signed(b.bill_amount), f.tone(b.bill_amount))}
            ${UI.kv('<span class="font-semibold text-ink">Balance after bill</span>', f.amount(b.remaining_amount), 'font-semibold')}
          </div>
          <p class="mt-2 text-xs text-ink-3">New cycle starts ${UI.date(next)} with ${f.amount(b.remaining_amount)} carried forward.</p>
        </div>
      `,
      footerHTML: '<button type="button" id="bill-saved-done" class="btn btn-primary min-h-12">Done</button>'
    });
    document.getElementById('bill-saved-done').onclick = () => Modal.close();
  },

  async saveBill() {
    const date = document.getElementById('bill-cycle-date').value;
    const amount = this.parseAmount(document.getElementById('bill-cycle-amount').value);
    const errorEl = document.getElementById('bill-cycle-error');
    let error = null;
    if (!date) error = 'Please enter the bill date.';
    else if (date > localDateStr()) error = 'Bill date cannot be in the future.';
    else if (!Number.isFinite(amount)) error = 'Please enter the bill amount, e.g. 500 or -500.';
    else if (amount === 0) error = 'Bill amount cannot be 0.';
    if (error) {
      errorEl.textContent = error;
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';

    const btn = document.getElementById('bill-cycle-save');
    btn.disabled = true;
    try {
      const res = await API.createBill({ bill_date: date, bill_amount: amount });
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
