// Funding View - Deposit & Withdraw
import { get, set } from '../state/store.js';
import { money, esc, escAttr } from '../utils/format.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render(params) {
  const kind = (params._path || 'deposit').includes('withdraw') ? 'withdraw' : 'deposit';
  const isDeposit = kind === 'deposit';
  const wallet = get('wallet') || {};
  const kyc = get('kyc') || {};
  const level = get('level') || {};
  const real = wallet.real || {};
  const demo = wallet.demo || {};
  const mode = get('mode') === 'real' ? 'real' : 'demo';
  const currentLevel = level.current || {};

  return `
    <div class="space-y-5 animate-fade-in funding-page">
      <section class="funding-hero">
        <div>
          <span class="${isDeposit ? 'badge-green' : 'badge-accent'}">${isDeposit ? 'Deposit desk' : 'Withdrawal desk'}</span>
          <h1>${isDeposit ? 'Fund your live account' : 'Request a manual payout'}</h1>
          <p>${isDeposit ? 'Choose an approved payment rail, follow the instructions, and submit proof for admin review.' : 'Withdrawals are reviewed manually with ledger holds, KYC checks, and admin approval.'}</p>
        </div>
        <div class="funding-balance-card">
          <span>${mode === 'real' ? 'Live available' : 'Demo balance'}</span>
          <strong>${money(mode === 'real' ? (real.available || 0) : (demo.available || 0))}</strong>
          <small>${esc(mode === 'real' ? (real.currency || 'USDT') : (demo.currency || 'USDT_DEMO'))}</small>
        </div>
      </section>

      ${mode !== 'real' ? `<section class="funding-mode-warning">
        <span class="gate-icon">${icons.lock}</span>
        <div>
          <strong>Real account required for live funding</strong>
          <small>Demo mode keeps this page visible for preview only. Switch to Real before submitting deposits or withdrawals for admin review.</small>
        </div>
        <button type="button" class="btn-primary btn-sm" data-switch-real>Switch to Real</button>
      </section>` : ''}

      <section class="funding-steps">
        ${stepCard('1', isDeposit ? 'Pick a method' : 'Choose payout rail', isDeposit ? 'Use only active methods shown by admin.' : 'Select where the funds should be sent.')}
        ${stepCard('2', isDeposit ? 'Send funds' : 'Submit review', isDeposit ? 'Use the exact amount and reference when available.' : 'The amount is held while the desk checks it.')}
        ${stepCard('3', isDeposit ? 'Upload proof' : 'Admin approval', isDeposit ? 'Receipts help the desk confirm faster.' : 'Approved payouts are recorded in the ledger.')}
      </section>

      <section class="funding-summary-grid">
        ${summaryTile('Account mode', mode === 'real' ? 'Real' : 'Demo', mode === 'real' ? 'Live funding enabled' : 'Preview only')}
        ${summaryTile('KYC', titleCase(kyc.status || 'not submitted'), kyc.status === 'approved' ? 'Funding unlocked' : 'Approval required for live review')}
        ${summaryTile('Customer level', currentLevel.name || currentLevel.name_en || 'Starter', 'Contracts and limits depend on tier')}
        ${summaryTile(isDeposit ? 'Deposit rail' : 'Payout rail', isDeposit ? 'Manual intake' : 'Manual payout', 'Handled by operations desk')}
      </section>

      <div class="funding-layout">
        <section class="card funding-form-card">
          <div class="panel-headline">
            <span class="badge-accent">${isDeposit ? 'New deposit' : 'New withdrawal'}</span>
            <h2>${isDeposit ? 'Create funding request' : 'Create payout request'}</h2>
          </div>
          <form class="space-y-4" id="funding-form" data-kind="${kind}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="field-label">Amount (USDT)</span>
                <input type="number" name="amount" class="input mt-1" value="${isDeposit ? '100' : '50'}" min="10" step="1" required />
              </label>
              <label class="block">
                <span class="field-label">Payment method</span>
                <select name="method" class="input mt-1" id="method-select">
                  <option value="">Loading methods...</option>
                </select>
              </label>
            </div>
            <div id="method-cards" class="method-grid">
              ${Array.from({ length: 3 }).map(() => '<div class="skeleton h-20 rounded-lg"></div>').join('')}
            </div>
            <div id="method-details" class="method-details">
              <p class="text-muted text-sm">Select a method to see address, limits, and desk instructions.</p>
            </div>
            ${isDeposit ? `<label class="block">
              <span class="field-label">Receipt / proof</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>` : ''}
            <label class="block">
              <span class="field-label">${isDeposit ? 'Reference / notes' : 'Payout address and notes'}</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="${isDeposit ? 'Transaction hash, sender name, or any desk note...' : 'Wallet address, bank reference, and payout notes...'}"></textarea>
            </label>
            <button type="submit" class="${isDeposit ? 'btn-primary' : 'btn-sell'} w-full py-3">${isDeposit ? 'Submit deposit for review' : 'Submit withdrawal request'}</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <div class="space-y-4">
          <section class="card funding-sidebar-card">
            <div class="panel-headline">
              <span class="badge-green">${isDeposit ? 'Review flow' : 'Payout flow'}</span>
              <h2>${isDeposit ? 'Deposit checklist' : 'Withdrawal checklist'}</h2>
            </div>
            <div class="funding-checklist">
              ${checkItem('Use active method only', true)}
              ${checkItem(isDeposit ? 'Upload a clear receipt or proof' : 'Use a valid payout destination', true)}
              ${checkItem('Real mode required', mode === 'real')}
              ${checkItem('KYC approval recommended', kyc.status === 'approved')}
            </div>
          </section>

          <section class="card funding-history-panel">
            <div class="panel-headline">
              <span class="badge-green">Ledger trail</span>
              <h2>Recent ${isDeposit ? 'deposits' : 'withdrawals'}</h2>
            </div>
            <div id="funding-history" class="funding-history-list">
              <p class="text-muted text-sm text-center py-8">Loading...</p>
            </div>
          </section>
        </div>
      </div>
    </div>`;
}

export function mount(container, params) {
  const kind = container.querySelector('#funding-form')?.dataset.kind || 'deposit';
  loadMethods(container, kind);
  loadHistory(container, kind);
  container.querySelector('#funding-form')?.addEventListener('submit', (e) => handleSubmit(e, container, kind));
  container.querySelector('#method-select')?.addEventListener('change', () => updateSelectedMethod(container));
  container.querySelector('[data-switch-real]')?.addEventListener('click', () => {
    localStorage.setItem('vp_mode', 'real');
    set('mode', 'real');
    location.reload();
  });
}

async function loadMethods(container, kind) {
  try {
    const data = await api('/payment_methods/list.php?kind=' + kind, { timeout: 7000 });
    const items = data?.items || [];
    const select = container.querySelector('#method-select');
    if (select) {
      select.innerHTML = items.map((m) => `<option value="${escAttr(methodId(m))}">${esc(m.title || m.name || m.code || 'Method')}</option>`).join('') || '<option value="">No methods available</option>';
    }
    container.__fundingMethods = items;
    renderMethodCards(container, items);
    updateSelectedMethod(container);
  } catch (_e) {
    const cards = container.querySelector('#method-cards');
    if (cards) cards.innerHTML = '<p class="text-muted text-sm">Payment methods are temporarily unavailable.</p>';
  }
}

function renderMethodCards(container, items) {
  const el = container.querySelector('#method-cards');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state !m-0">No active methods are configured by admin yet.</div>';
    return;
  }
  el.innerHTML = items.slice(0, 8).map((m, idx) => `
    <button type="button" class="method-card ${idx === 0 ? 'active' : ''}" data-method="${escAttr(methodId(m))}">
      <span class="method-icon">${methodIcon(m)}</span>
      <strong>${esc(m.title || m.name || m.code || 'Method')}</strong>
      <small>${esc([m.provider, m.currency].filter(Boolean).join(' - ') || 'Manual desk')}</small>
      <em>${money(m.min_amount || 0)}${m.max_amount ? ` - ${money(m.max_amount)}` : '+'}</em>
    </button>
  `).join('');
  el.querySelectorAll('[data-method]').forEach(btn => {
    btn.addEventListener('click', () => {
      const select = container.querySelector('#method-select');
      if (select) select.value = btn.dataset.method || '';
      updateSelectedMethod(container);
    });
  });
}

function updateSelectedMethod(container) {
  const select = container.querySelector('#method-select');
  const value = select?.value || '';
  const items = container.__fundingMethods || [];
  const selected = items.find(m => methodId(m) === value) || items[0] || null;
  if (select && selected && !select.value) select.value = methodId(selected);
  container.querySelectorAll('.method-card').forEach(card => card.classList.toggle('active', card.dataset.method === methodId(selected || {})));
  const details = container.querySelector('#method-details');
  if (!details) return;
  if (!selected) {
    details.innerHTML = '<p class="text-muted text-sm">No method selected.</p>';
    return;
  }
  details.innerHTML = `
    <div class="method-details-head">
      <span>${methodIcon(selected)}</span>
      <div>
        <strong>${esc(selected.title || selected.name || selected.code || 'Payment method')}</strong>
        <small>${esc(selected.description || 'Manual operations desk review')}</small>
      </div>
    </div>
    <div class="method-detail-grid">
      ${detailPill('Currency', selected.currency || 'USDT')}
      ${detailPill('Minimum', money(selected.min_amount || 0))}
      ${detailPill('Maximum', selected.max_amount ? money(selected.max_amount) : 'Desk limit')}
      ${detailPill('Proof', selected.proof_required ? 'Required' : 'Optional')}
    </div>
    ${selected.payment_address ? `<div class="copy-address"><span>${esc(selected.payment_address)}</span><button type="button" data-copy-address="${escAttr(selected.payment_address)}">Copy</button></div>` : ''}
    ${selected.instructions ? `<p class="method-instructions">${esc(selected.instructions)}</p>` : ''}
  `;
  details.querySelector('[data-copy-address]')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(e.currentTarget.dataset.copyAddress || '');
      e.currentTarget.textContent = 'Copied';
      setTimeout(() => { e.currentTarget.textContent = 'Copy'; }, 1200);
    } catch (_e) {}
  });
}

async function loadHistory(container, kind) {
  try {
    const endpoint = kind === 'deposit' ? '/deposits/list.php' : '/withdrawals/list.php';
    const data = await api(endpoint, { timeout: 7000 });
    const el = container.querySelector('#funding-history');
    if (!el || !data) return;
    const items = data.items || [];
    if (!items.length) {
      el.innerHTML = `<div class="empty-state !m-0">No ${kind} requests yet.</div>`;
      return;
    }
    el.innerHTML = items.slice(0, 12).map((item) => historyCard(item, kind)).join('');
  } catch (_e) {
    const el = container.querySelector('#funding-history');
    if (el) el.innerHTML = '<p class="text-red text-sm text-center py-4">History unavailable.</p>';
  }
}

async function handleSubmit(e, container, kind) {
  e.preventDefault();
  const form = e.target;
  const status = container.querySelector('#form-status');
  const fd = new FormData(form);
  fd.append('kind', kind);
  try {
    if (get('mode') !== 'real') {
      if (status) {
        status.textContent = 'Switch to Real before submitting live funding requests.';
        status.className = 'text-xs text-center text-spread';
      }
      return;
    }
    if (status) {
      status.textContent = 'Submitting request to operations desk...';
      status.className = 'text-xs text-center text-muted';
    }
    const endpoint = kind === 'deposit' ? '/deposits/create.php' : '/withdrawals/create.php';
    const res = await formApi(endpoint, fd, { timeout: 14000 });
    if (res && res.ok !== false) {
      if (status) {
        status.textContent = 'Request submitted. Admin review is now pending.';
        status.className = 'text-xs text-center text-buy';
      }
      loadHistory(container, kind);
    } else if (status) {
      status.textContent = res?.error || 'Request failed';
      status.className = 'text-xs text-center text-sell';
    }
  } catch (err) {
    if (status) {
      status.textContent = err.message || 'Request failed';
      status.className = 'text-xs text-center text-sell';
    }
  }
}

function stepCard(num, title, text) {
  return `<div class="funding-step">
    <span>${esc(num)}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(text)}</small>
  </div>`;
}

function methodId(m) {
  return String(m?.id ?? m?.code ?? '');
}

function methodIcon(m) {
  const label = String(m?.method_group || m?.provider || m?.code || 'USDT').toUpperCase();
  if (String(m?.image_url || '').trim()) return `<img src="${escAttr(m.image_url)}" alt="" />`;
  if (label.includes('BANK')) return icons.wallet;
  if (label.includes('TRC') || label.includes('USDT') || label.includes('CRYPTO')) return icons.deposit;
  return icons.wallet;
}

function detailPill(label, value) {
  return `<span><small>${esc(label)}</small><strong>${esc(value)}</strong></span>`;
}

function historyCard(item, kind) {
  const status = String(item.status || 'pending').toLowerCase();
  const method = item.method_label || item.provider || item.method_code || item.method || '--';
  return `<article class="funding-history-card">
    <div class="funding-history-main">
      <span class="history-kind ${kind === 'deposit' ? 'is-deposit' : 'is-withdraw'}">${kind === 'deposit' ? icons.deposit : icons.withdraw}</span>
      <div>
        <strong>${money(item.amount)} ${esc(item.currency || 'USDT')}</strong>
        <small>${esc(method)} - ${esc(item.created_at || '')}</small>
      </div>
    </div>
    <div class="status-flow">
      <i class="done"></i><i class="${isMidStatus(status) ? 'done' : ''}"></i><i class="${isDoneStatus(status) ? 'done' : ''}"></i>
    </div>
    <span class="badge ${statusBadge(status)}">${esc(status)}</span>
  </article>`;
}

function isMidStatus(status) {
  return ['pending','requested','processing','review','approved','confirmed','completed','paid'].includes(status);
}

function isDoneStatus(status) {
  return ['approved','confirmed','completed','paid'].includes(status);
}

function statusBadge(status) {
  if (isDoneStatus(status)) return 'badge-green';
  if (isMidStatus(status)) return 'badge-accent';
  return 'badge-red';
}

function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function summaryTile(label, value, sub) {
  return `<article class="funding-summary-tile">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <small>${esc(sub)}</small>
  </article>`;
}

function checkItem(label, done) {
  return `<div class="funding-check-item ${done ? 'is-done' : 'is-pending'}">
    <i>${done ? icons.check : icons.lock}</i>
    <div>
      <strong>${esc(label)}</strong>
      <small>${done ? 'Ready' : 'Action required'}</small>
    </div>
  </div>`;
}
