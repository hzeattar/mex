// Wallet / Assets View
import { get } from '../state/store.js';
import { money, esc } from '../utils/format.js';
import { $, delegate } from '../utils/dom.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  const mode = get('mode');
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-accent">Assets</span>
            <h1 class="text-xl font-bold mt-1">Wallet & Balances</h1>
            <p class="text-muted text-sm">View balances, transaction history, and manage funds.</p>
          </div>
          <div class="flex gap-2">
            <a href="#/deposit" class="btn-primary btn-sm">${icons.deposit} Deposit</a>
            <a href="#/withdraw" class="btn-ghost btn-sm">${icons.withdraw} Withdraw</a>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <h3 class="text-sm font-semibold text-muted mb-3">Real Account</h3>
          <div class="space-y-2" id="real-wallet">
            <div class="skeleton h-16 rounded-lg"></div>
          </div>
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-muted mb-3">Demo Account</h3>
          <div class="space-y-2" id="demo-wallet">
            <div class="skeleton h-16 rounded-lg"></div>
          </div>
        </div>
      </div>

      <section class="card">
        <h2 class="font-semibold mb-3">Transaction History</h2>
        <div class="overflow-x-auto" id="ledger-table">
          <p class="text-muted text-sm text-center py-8">Loading transactions...</p>
        </div>
      </section>
    </div>`;
}

export function mount(container) {
  loadWallet(container);
}

async function loadWallet(container) {
  try {
    const data = await api('/wallet/summary.php', { timeout: 8000 });
    if (!data) return;
    const real = data.real || {};
    const demo = data.demo || {};

    container.querySelector('#real-wallet').innerHTML = walletBlock(real, 'real');
    container.querySelector('#demo-wallet').innerHTML = walletBlock(demo, 'demo');

    // Load ledger
    const ledger = await api('/wallet/ledger.php?limit=20', { timeout: 6000 }).catch(() => null);
    if (ledger && ledger.items) renderLedger(container, ledger.items);
    else container.querySelector('#ledger-table').innerHTML = `<p class="text-muted text-sm text-center py-4">No transactions yet.</p>`;
  } catch (e) { /* silent */ }
}

function walletBlock(w, type) {
  return `
    <div class="p-4 rounded-lg bg-panel-2/60 border border-line/50">
      <div class="flex justify-between items-start">
        <div>
          <div class="text-[10px] uppercase text-muted">${type === 'real' ? 'Real' : 'Demo'} Balance</div>
          <div class="text-2xl font-bold mt-1">${money(w.balance || 0)}</div>
          <div class="text-xs text-muted">${esc(w.currency || 'USDT')}</div>
        </div>
        <div class="w-10 h-10 rounded-xl grid place-items-center ${type === 'real' ? 'bg-green-soft text-green' : 'bg-accent-soft text-accent'}">
          ${icons.wallet}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-line/50">
        <div><div class="text-[10px] text-muted">Available</div><div class="text-sm font-semibold">${money(w.available || 0)}</div></div>
        <div><div class="text-[10px] text-muted">Holds</div><div class="text-sm font-semibold">${money(w.holds || 0)}</div></div>
      </div>
    </div>`;
}

function renderLedger(container, items) {
  const el = container.querySelector('#ledger-table');
  if (!el || !items.length) return;
  el.innerHTML = `<table class="w-full text-sm">
    <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
      <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
    </tr></thead>
    <tbody>${items.slice(0, 15).map((t) => `<tr class="border-b border-line/50">
      <td class="py-2">${esc(t.type || t.description || '--')}</td>
      <td class="py-2 text-right font-mono ${Number(t.amount) >= 0 ? 'text-green' : 'text-red'}">${money(t.amount)}</td>
      <td class="py-2 text-right font-mono text-muted">${money(t.balance_after || 0)}</td>
      <td class="py-2 text-right text-xs text-muted">${t.created_at || '--'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}
