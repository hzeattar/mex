// Invest / Earn View - Copy Trading + Contracts
import { get, set } from '../state/store.js';
import { money, pct, esc } from '../utils/format.js';
import { $, delegate } from '../utils/dom.js';
import { api, postApi } from '../services/api.js';
import { icons } from '../components/common/Icons.js';

export function render() {
  const mode = get('mode');
  const tab = get('invest.tab') || 'copy';
  return `
    <div class="space-y-6 animate-fade-in">
      <section class="card">
        <div class="flex items-center justify-between">
          <div>
            <span class="badge-green">Earn</span>
            <h1 class="text-xl font-bold mt-1">Copy Trading & Contracts</h1>
            <p class="text-muted text-sm">Follow trading signals or subscribe to premium contracts.</p>
          </div>
          <button class="btn-ghost btn-sm" id="refresh-invest">${icons.refresh} Refresh</button>
        </div>
      </section>

      <!-- Tabs -->
      <div class="flex gap-2 p-1 rounded-lg bg-panel-2 border border-line w-fit">
        <button class="px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'copy' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text'}" data-earn-tab="copy">Copy Trading</button>
        <button class="px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'contracts' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text'}" data-earn-tab="contracts">Contracts</button>
      </div>

      ${mode !== 'real' ? demoGate() : ''}

      <!-- Content -->
      <div id="invest-content">
        <div class="grid gap-4">
          <div class="skeleton h-40 rounded-lg"></div>
          <div class="skeleton h-40 rounded-lg"></div>
        </div>
      </div>
    </div>`;
}

export function mount(container) {
  loadInvest(container);
  delegate(container, '[data-earn-tab]', 'click', (e, el) => {
    set('invest.tab', el.dataset.earnTab);
    localStorage.setItem('vp_earn_tab', el.dataset.earnTab);
    renderContent(container);
  });
  container.querySelector('#refresh-invest')?.addEventListener('click', () => loadInvest(container));
}

async function loadInvest(container) {
  try {
    const [signals, contracts, copies] = await Promise.all([
      api('/signals.php?bot=1&home=1&lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
      api('/invest/contracts.php?lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
      api('/trading_bot/my.php?lang=en', { timeout: 8000 }).catch(() => ({ items: [] })),
    ]);
    set('invest.signals', signals.items || []);
    set('invest.contracts', contracts.items || []);
    set('invest.copies', copies.items || []);
    renderContent(container);
  } catch (e) { /* silent */ }
}

function renderContent(container) {
  const el = container.querySelector('#invest-content');
  if (!el) return;
  const tab = get('invest.tab') || 'copy';
  const mode = get('mode');
  const locked = mode !== 'real';

  if (tab === 'copy') {
    const signals = get('invest.signals') || [];
    el.innerHTML = locked ? blurWrap(signalGrid(signals)) : signalGrid(signals);
  } else {
    const contracts = get('invest.contracts') || [];
    el.innerHTML = locked ? blurWrap(contractGrid(contracts)) : contractGrid(contracts);
  }
  if (locked) bindGateActions(el);
  delegate(el, '[data-copy-signal]', 'click', (e, btn) => copySignal(btn.dataset.copySignal, container));
}

function signalGrid(signals) {
  if (!signals.length) return `<p class="text-muted text-sm text-center py-12">No trading signals available yet.</p>`;
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${signals.map(signalCard).join('')}</div>`;
}

function signalCard(sig) {
  const dir = (sig.direction || 'BUY').toUpperCase();
  return `<div class="card hover:border-accent/30 transition-colors">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[11px] font-black">${esc((sig.market_symbol || '').slice(0, 3))}</div>
      <div class="flex-1">
        <strong class="text-sm">${esc(sig.market_symbol || sig.symbol || '--')}</strong>
        <div class="text-[11px] text-muted">${esc(sig.bot_name_en || sig.timeframe || '')}</div>
      </div>
      <span class="badge ${dir === 'BUY' ? 'badge-green' : 'badge-red'}">${dir}</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-[11px] mb-3">
      <div><span class="text-muted">Entry</span><div class="font-mono font-semibold">${sig.entry_price || '--'}</div></div>
      <div><span class="text-muted">TP</span><div class="font-mono text-green">${sig.take_profit_1 || '--'}</div></div>
      <div><span class="text-muted">SL</span><div class="font-mono text-red">${sig.stop_loss || '--'}</div></div>
    </div>
    <button class="btn-primary w-full btn-sm" data-copy-signal="${sig.id || ''}">Copy Signal</button>
  </div>`;
}

function contractGrid(contracts) {
  if (!contracts.length) return `<p class="text-muted text-sm text-center py-12">No contracts available.</p>`;
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${contracts.map(contractCard).join('')}</div>`;
}

function contractCard(c) {
  return `<div class="card hover:border-accent/30 transition-colors">
    <div class="flex items-center justify-between mb-3">
      <strong class="text-sm">${esc(c.name_en || c.name || 'Contract')}</strong>
      <span class="badge-accent">${esc(c.duration_label || c.duration_days + 'd' || '--')}</span>
    </div>
    <p class="text-xs text-muted mb-3">${esc(c.description_en || c.description || '')}</p>
    <div class="grid grid-cols-2 gap-2 text-[11px] mb-3">
      <div><span class="text-muted">Return</span><div class="font-semibold text-green">${c.return_pct || c.expected_return || '--'}%</div></div>
      <div><span class="text-muted">Min</span><div class="font-semibold">${money(c.min_amount || 0)}</div></div>
    </div>
    <button class="btn-ghost w-full btn-sm">Subscribe</button>
  </div>`;
}

function demoGate() {
  return `<div class="card border-gold/30 bg-gold/5">
    <div class="flex items-center gap-3">
      <span class="w-8 h-8 rounded-lg bg-gold/20 grid place-items-center text-gold">${icons.lock}</span>
      <div>
        <strong class="text-sm">Real Account Required</strong>
        <p class="text-xs text-muted">Copy trading and contracts are only available in Real mode with KYC verification.</p>
      </div>
    </div>
  </div>`;
}

function blurWrap(content) {
  return `<div class="relative min-h-[200px]">
    <div class="blur-[5px] saturate-75 opacity-40 pointer-events-none select-none">${content}</div>
    <div class="absolute inset-4 grid place-items-center z-10">
      <div class="card-glass text-center p-6 max-w-sm">
        <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3 text-white">${icons.lock}</span>
        <strong class="block text-sm">Switch to Real</strong>
        <p class="text-muted text-xs mt-1">Verify KYC to access copy trading and contracts.</p>
        <button class="btn-primary btn-sm mt-3" data-switch-real>Switch to Real</button>
      </div>
    </div>
  </div>`;
}

function bindGateActions(el) {
  el.querySelectorAll('[data-switch-real]').forEach((btn) => {
    btn.addEventListener('click', () => { set('mode', 'real'); localStorage.setItem('vp_mode', 'real'); location.reload(); });
  });
}

async function copySignal(id, container) {
  if (!id) return;
  try {
    await postApi('/trading_bot/copy.php', { signal_id: id });
    loadInvest(container);
  } catch (e) { /* toast error */ }
}
