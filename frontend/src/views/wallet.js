// Wallet / Assets View
import { money, esc } from '../utils/format.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { get } from '../state/store.js';

export function render() {
  const level = get('level') || {};
  const current = level.current || {};
  const next = level.next || {};
  const kyc = get('kyc') || {};
  return `
    <div class="space-y-5 animate-fade-in wallet-page">
      <section class="wallet-hero">
        <div>
          <span class="badge-accent">Assets desk</span>
          <h1>Wallet & ledger</h1>
          <p>Track live funds, demo balance, ledger movements, deposits, withdrawals, and admin review state.</p>
        </div>
        <div class="wallet-actions">
          <a href="#/deposit" class="btn-primary btn-sm">${icons.deposit} Deposit</a>
          <a href="#/withdraw" class="btn-ghost btn-sm">${icons.withdraw} Withdraw</a>
        </div>
      </section>

      <section class="wallet-summary-strip">
        ${walletSummaryTile('Customer level', current.name || current.name_en || 'Starter', next?.name ? `Next: ${next.name}` : 'Top tier active')}
        ${walletSummaryTile('Funding status', kyc.status === 'approved' ? 'Approved' : 'Review needed', kyc.status === 'approved' ? 'Deposits and withdrawals are enabled' : 'Complete KYC for live funding')}
        ${walletSummaryTile('Execution mode', get('mode') === 'real' ? 'Real' : 'Demo', get('mode') === 'real' ? 'Manual review active' : 'Practice wallet preview')}
      </section>

      <div class="wallet-balance-grid">
        <section class="wallet-balance-card is-real" id="real-wallet">
          <div class="skeleton h-32 rounded-lg"></div>
        </section>
        <section class="wallet-balance-card is-demo" id="demo-wallet">
          <div class="skeleton h-32 rounded-lg"></div>
        </section>
      </div>

      <section class="card">
        <div class="panel-headline">
          <span class="badge-green">Funding controls</span>
          <h2>Manual requests</h2>
        </div>
        <div class="wallet-control-grid">
          ${controlCard('#/deposit', icons.deposit, 'New deposit', 'Submit proof and wait for admin confirmation.')}
          ${controlCard('#/withdraw', icons.withdraw, 'New withdrawal', 'Request payout review from your real wallet.')}
          ${controlCard('#/kyc', icons.kyc, 'KYC status', 'Verification unlocks real funding workflows.')}
          ${controlCard('#/invest', icons.earn, 'Level contracts', 'Use confirmed deposits to unlock customer tiers.')}
        </div>
      </section>

      <section class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="panel-headline !mb-0">
            <span class="badge-accent">Ledger</span>
            <h2>Latest transactions</h2>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-wallet">${icons.refresh} Refresh</button>
        </div>
        <div id="ledger-table">
          <p class="text-muted text-sm text-center py-8">Loading transactions...</p>
        </div>
      </section>
    </div>`;
}

export function mount(container) {
  loadWallet(container);
  container.querySelector('#refresh-wallet')?.addEventListener('click', () => loadWallet(container));
}

async function loadWallet(container) {
  try {
    const data = await api('/wallet/summary.php', { timeout: 8000 });
    if (!data) return;
    const real = data.real || {};
    const demo = data.demo || {};
    container.querySelector('#real-wallet').innerHTML = walletBlock(real, 'real');
    container.querySelector('#demo-wallet').innerHTML = walletBlock(demo, 'demo');

    const ledger = await api('/wallet/ledger.php?limit=30', { timeout: 7000 }).catch(() => null);
    if (ledger && ledger.items) renderLedger(container, ledger.items);
    else container.querySelector('#ledger-table').innerHTML = `<div class="empty-state !m-0">No transactions yet.</div>`;
  } catch (_e) {
    const el = container.querySelector('#ledger-table');
    if (el) el.innerHTML = `<p class="text-red text-sm text-center py-4">Wallet data unavailable.</p>`;
  }
}

function walletBlock(w, type) {
  const real = type === 'real';
  return `
    <div class="wallet-balance-head">
      <div>
        <span>${real ? 'Real wallet' : 'Demo wallet'}</span>
        <strong>${money(w.balance || 0)}</strong>
        <small>${esc(w.currency || (real ? 'USDT' : 'USDT_DEMO'))}</small>
      </div>
      <div class="wallet-icon">${icons.wallet}</div>
    </div>
    <div class="wallet-balance-metrics">
      <span><small>Available</small><strong>${money(w.available || 0)}</strong></span>
      <span><small>Holds</small><strong>${money(w.holds || 0)}</strong></span>
      <span><small>Status</small><strong>${real ? 'Manual review' : 'Practice funds'}</strong></span>
    </div>`;
}

function renderLedger(container, items) {
  const el = container.querySelector('#ledger-table');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div class="empty-state !m-0">No ledger entries yet.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="ledger-mobile-list md:hidden">
      ${items.slice(0, 20).map(ledgerCard).join('')}
    </div>
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] text-muted uppercase border-b border-line">
          <th class="text-left py-2">Type</th><th class="text-right py-2">Amount</th><th class="text-right py-2">Balance</th><th class="text-right py-2">Date</th>
        </tr></thead>
        <tbody>${items.slice(0, 20).map((t) => `<tr class="border-b border-line/50">
          <td class="py-2">${esc(t.type || t.description || '--')}</td>
          <td class="py-2 text-right font-mono ${Number(t.amount) >= 0 ? 'text-green' : 'text-red'}">${money(t.amount)}</td>
          <td class="py-2 text-right font-mono text-muted">${money(t.balance_after || 0)}</td>
          <td class="py-2 text-right text-xs text-muted">${esc(t.created_at || '--')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function ledgerCard(t) {
  const amount = Number(t.amount || 0);
  return `<article class="ledger-card">
    <div>
      <strong>${esc(t.type || t.description || '--')}</strong>
      <small>${esc(t.created_at || '--')}</small>
    </div>
    <div class="text-right">
      <b class="${amount >= 0 ? 'text-green' : 'text-red'}">${money(amount)}</b>
      <span>${money(t.balance_after || 0)}</span>
    </div>
  </article>`;
}

function controlCard(href, icon, title, text) {
  return `<a href="${href}" class="wallet-control-card">
    <span>${icon}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(text)}</small>
  </a>`;
}

function walletSummaryTile(label, value, sub) {
  return `<article class="wallet-summary-tile">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <small>${esc(sub)}</small>
  </article>`;
}
