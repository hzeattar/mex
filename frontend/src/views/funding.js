// Funding View - Deposit & Withdraw
import { get } from '../state/store.js';
import { money, esc } from '../utils/format.js';
import { $, delegate } from '../utils/dom.js';
import { api, formApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render(params) {
  const kind = (params._path || 'deposit').includes('withdraw') ? 'withdraw' : 'deposit';
  const isDeposit = kind === 'deposit';
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div>
          <span class="badge-accent">${isDeposit ? 'Deposit' : 'Withdrawal'}</span>
          <h1 class="text-xl font-bold mt-1">${isDeposit ? 'Deposit Funds' : 'Withdraw Funds'}</h1>
          <p class="text-muted text-sm">${isDeposit ? 'Create a funding request. Follow payment instructions and upload proof.' : 'Submit a payout request. KYC and real balance required.'}</p>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Form -->
        <section class="card">
          <h2 class="font-semibold mb-4">New ${isDeposit ? 'Deposit' : 'Withdrawal'} Request</h2>
          <form class="space-y-4" id="funding-form" data-kind="${kind}">
            <label class="block">
              <span class="text-xs text-muted">Amount (USDT)</span>
              <input type="number" name="amount" class="input mt-1" value="100" min="10" step="1" required />
            </label>
            <label class="block">
              <span class="text-xs text-muted">Payment Method</span>
              <select name="method" class="input mt-1" id="method-select">
                <option value="">Loading methods...</option>
              </select>
            </label>
            ${isDeposit ? `<label class="block">
              <span class="text-xs text-muted">Proof (optional)</span>
              <input type="file" name="proof" accept="image/*,.pdf" class="input mt-1 py-1.5" />
            </label>` : ''}
            <label class="block">
              <span class="text-xs text-muted">Notes</span>
              <textarea name="notes" class="input mt-1" rows="3" placeholder="Optional notes for the operations desk..."></textarea>
            </label>
            <button type="submit" class="btn-primary w-full">Submit ${isDeposit ? 'Deposit' : 'Withdrawal'} Request</button>
            <p class="text-xs text-center" id="form-status"></p>
          </form>
        </section>

        <!-- History -->
        <section class="card">
          <h2 class="font-semibold mb-4">Recent ${isDeposit ? 'Deposits' : 'Withdrawals'}</h2>
          <div id="funding-history">
            <p class="text-muted text-sm text-center py-8">Loading...</p>
          </div>
        </section>
      </div>
    </div>`;
}

export function mount(container, params) {
  const kind = container.querySelector('#funding-form')?.dataset.kind || 'deposit';
  loadMethods(container, kind);
  loadHistory(container, kind);
  container.querySelector('#funding-form')?.addEventListener('submit', (e) => handleSubmit(e, container, kind));
}

async function loadMethods(container, kind) {
  try {
    const data = await api('/payment_methods/list.php?kind=' + kind, { timeout: 6000 });
    const select = container.querySelector('#method-select');
    if (!select || !data || !data.items) return;
    select.innerHTML = (data.items || []).map((m) => `<option value="${esc(m.id || m.code || '')}">${esc(m.name || m.label || 'Method')}</option>`).join('') || '<option value="">No methods available</option>';
  } catch (e) { /* silent */ }
}

async function loadHistory(container, kind) {
  try {
    const endpoint = kind === 'deposit' ? '/deposits/list.php' : '/withdrawals/list.php';
    const data = await api(endpoint, { timeout: 6000 });
    const el = container.querySelector('#funding-history');
    if (!el || !data) return;
    const items = data.items || [];
    if (!items.length) { el.innerHTML = `<p class="text-muted text-sm text-center py-4">No ${kind} history.</p>`; return; }
    el.innerHTML = `<div class="space-y-2">${items.slice(0, 10).map((item) => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line/50">
        <div>
          <div class="text-sm font-semibold">${money(item.amount)} ${esc(item.currency || 'USDT')}</div>
          <div class="text-[11px] text-muted">${esc(item.method_label || item.method || '--')} - ${esc(item.created_at || '')}</div>
        </div>
        <span class="badge ${statusBadge(item.status)}">${esc(item.status || 'pending')}</span>
      </div>`).join('')}</div>`;
  } catch (e) { /* silent */ }
}

async function handleSubmit(e, container, kind) {
  e.preventDefault();
  const form = e.target;
  const status = container.querySelector('#form-status');
  const fd = new FormData(form);
  fd.append('kind', kind);
  try {
    if (status) status.textContent = 'Submitting...';
    const endpoint = kind === 'deposit' ? '/deposits/create.php' : '/withdrawals/create.php';
    const res = await formApi(endpoint, fd, { timeout: 12000 });
    if (res && res.ok !== false) {
      if (status) { status.textContent = 'Request submitted!'; status.className = 'text-xs text-center text-green'; }
      loadHistory(container, kind);
    } else {
      if (status) { status.textContent = res?.error || 'Failed'; status.className = 'text-xs text-center text-red'; }
    }
  } catch (err) {
    if (status) { status.textContent = err.message; status.className = 'text-xs text-center text-red'; }
  }
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['approved','confirmed','completed','paid'].includes(s)) return 'badge-green';
  if (['pending','requested','processing','review'].includes(s)) return 'badge-accent';
  return 'badge-red';
}

