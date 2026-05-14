// Home View
import { get } from '../state/store.js';
import { money, pct, price, esc, escAttr } from '../utils/format.js';
import { navigate } from '../router.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';

export function render() {
  const brand = get('brand') || {};
  const wallet = activeWallet();
  const mode = get('mode');

  return `
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card bg-gradient-to-br from-panel-2 to-panel relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#5d7cff,transparent_50%)]"></div>
        <div class="relative space-y-3">
          <span class="badge-accent">${esc(brand.name)}</span>
          <h1 class="text-xl lg:text-2xl font-bold">${mode === 'real' ? 'Real Trading Workspace' : 'Demo Trading Workspace'}</h1>
          <p class="text-muted text-sm max-w-lg">${esc(brand.tagline || 'Professional multi-market trading platform')}</p>
        </div>
        <div class="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${walletCard('Available', money(wallet.available), wallet.currency)}
          ${walletCard('Balance', money(wallet.balance), wallet.currency)}
          ${walletCard('Mode', mode === 'real' ? 'Real' : 'Demo', mode === 'real' ? 'Live' : 'Practice')}
          ${walletCard('Markets', '6', 'Active types')}
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card">
        <h2 class="text-base font-semibold mb-3">Quick Actions</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${quickAction('Deposit', 'deposit', '#/deposit')}
          ${quickAction('Withdraw', 'withdraw', '#/withdraw')}
          ${quickAction('KYC', 'kyc', '#/kyc')}
          ${quickAction('Earn', 'earn', '#/invest')}
          ${quickAction('Support', 'support', '#/support')}
          ${quickAction('News', 'news', '#/news')}
        </div>
      </section>

      <!-- Copy Trading -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="badge-green mb-1">Copy Desk</span>
            <h2 class="text-base font-semibold">Copy Trading</h2>
          </div>
          <a href="#/invest" class="btn-ghost btn-sm">View all</a>
        </div>
        <div class="relative" id="home-copy-section">
          ${copyScrollerPlaceholder(mode)}
        </div>
      </section>

      <!-- Featured Markets -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Markets</h2>
          <a href="#/trade" class="btn-ghost btn-sm">Trade</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="home-markets">
          ${Array(4).fill(0).map(() => `<div class="skeleton h-16 rounded-lg"></div>`).join('')}
        </div>
      </section>

      <!-- Positions -->
      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Open Positions</h2>
          <a href="#/portfolio" class="btn-ghost btn-sm">Portfolio</a>
        </div>
        <div id="home-positions">
          <p class="text-muted text-sm text-center py-6">Loading positions...</p>
        </div>
      </section>
    </div>`;
}

export function mount(container) {
  loadHomeData(container);
}

async function loadHomeData(container) {
  try {
    const [markets, portfolio, signals] = await Promise.all([
      api('/markets.php?type=crypto&lite=1&with_quotes=1', { timeout: 7000 }),
      api('/trade/portfolio.php', { timeout: 7000 }),
      api('/signals.php?bot=1&home=1&lang=en', { timeout: 7000 }).catch(() => null),
    ]);
    if (markets && markets.items) {
      renderMarkets(container, markets.items.slice(0, 8));
    }
    if (portfolio && portfolio.positions) {
      renderPositions(container, portfolio.positions.slice(0, 5));
    }
    // Render copy signals
    if (signals && signals.items && signals.items.length) {
      renderCopySignals(container, signals.items);
    }
  } catch (e) { /* silent */ }
}

function renderCopySignals(container, items) {
  const section = container.querySelector('#home-copy-section');
  if (!section) return;
  section.innerHTML = `<div class="flex gap-3 overflow-x-auto pb-2 snap-x">${items.slice(0, 6).map(sig => {
    const dir = (sig.direction || 'BUY').toUpperCase();
    const symbol = sig.symbol || sig.market_symbol || '--';
    return `<div class="shrink-0 w-[280px] copy-card snap-start">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          ${marketLogo({ symbol, type: sig.type || sig.market_type }, 'market-logo')}
          <div class="min-w-0">
            <strong class="text-xs truncate block">${esc(symbol)}</strong>
            <span class="text-[10px] text-muted truncate block">${esc(sig.bot_name || sig.bot_name_en || sig.timeframe || 'Copy signal')}</span>
          </div>
        </div>
        <span class="badge-${dir === 'BUY' ? 'buy' : 'sell'}">${dir}</span>
      </div>
      <div class="copy-card__quote py-2">
        <span class="status-chip ${Number(sig.live_price || 0) > 0 ? 'status-chip-live' : 'status-chip-locked'}">${Number(sig.live_price || 0) > 0 ? 'LIVE' : 'READY'}</span>
        <strong>${Number(sig.live_price || 0) > 0 ? '$' + money(sig.live_price, sig.type === 'forex' ? 5 : 2) : '--'}</strong>
        <span class="${Number(sig.live_change_pct || 0) >= 0 ? 'text-buy' : 'text-sell'}">${pct(sig.live_change_pct || 0)}</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] mt-2">
        <div><span class="text-muted">Entry</span><div class="font-mono">${sig.entry || sig.entry_price || '--'}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${sig.tp1 || sig.take_profit_1 || '--'}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${sig.sl || sig.stop_loss || '--'}</div></div>
      </div>
      <a href="#/invest" class="btn-primary btn-sm w-full mt-3">Open copy desk</a>
    </div>`;
  }).join('')}</div>`;
}

function renderMarkets(container, items) {
  const grid = container.querySelector('#home-markets');
  if (!grid) return;
  grid.innerHTML = items.map((m) => `
    <button class="home-market-card" data-symbol="${escAttr(m.symbol)}" data-type="${escAttr(m.type || 'crypto')}">
      ${marketLogo(m, 'home-market-icon')}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${esc(m.symbol)}</div>
        <div class="text-[11px] text-muted truncate">${esc(m.name || m.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold">${price(m.price || m.q_price, m.type)}</div>
        <div class="text-[11px] ${Number(m.change_pct || m.q_change || 0) >= 0 ? 'text-green' : 'text-red'}">${pct(m.change_pct || m.q_change || 0)}</div>
      </div>
    </button>
  `).join('');
  grid.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('trade', { symbol: btn.dataset.symbol, type: btn.dataset.type }));
  });
}

function marketLogo(market, className) {
  const symbol = market.symbol || '--';
  return `<span class="${className}">
    <img src="${escAttr(marketIconPath(market, market.type || 'crypto'))}" alt="${escAttr(symbol)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b>${esc(marketInitial(symbol))}</b>
  </span>`;
}

function renderPositions(container, positions) {
  const el = container.querySelector('#home-positions');
  if (!el) return;
  if (!positions.length) {
    el.innerHTML = `<p class="text-muted text-sm text-center py-6">No open positions</p>`;
    return;
  }
  el.innerHTML = `<div class="space-y-2">${positions.map(positionRow).join('')}</div>`;
}

function positionRow(p) {
  const pnl = Number(p.pnl || p.unrealized_pnl || 0);
  return `<div class="flex items-center justify-between p-3 rounded-lg bg-panel-2/50 border border-line">
    <div><strong class="text-sm">${esc(p.symbol)}</strong><span class="text-[11px] text-muted ml-2">${esc(p.side || 'BUY')}</span></div>
    <div class="text-right"><div class="text-sm font-mono ${pnl >= 0 ? 'text-green' : 'text-red'}">${money(pnl)}</div></div>
  </div>`;
}

function walletCard(label, value, sub) {
  return `<div class="p-3 rounded-lg bg-panel-2/60 border border-line/50">
    <div class="text-[10px] uppercase text-muted tracking-wide">${label}</div>
    <div class="text-base font-bold mt-1">${value}</div>
    <div class="text-[10px] text-muted">${sub || ''}</div>
  </div>`;
}

function quickAction(label, icon, href) {
  return `<a href="${href}" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-line hover:border-accent/40 bg-panel-2/30 transition-colors">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${icons[icon] || ''}</span>
    <span class="text-xs font-medium">${label}</span>
  </a>`;
}

function copyScrollerPlaceholder(mode) {
  if (mode !== 'real') {
    return `<div class="relative min-h-[180px]">
      <div class="flex gap-4 overflow-x-auto pb-3 blur-[4px] opacity-50 pointer-events-none">
        ${Array(4).fill(0).map(() => `<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>`).join('')}
      </div>
      <div class="absolute inset-0 grid place-items-center">
        <div class="card-glass text-center p-6 max-w-sm">
          <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-green grid place-items-center mx-auto mb-3">${icons.lock}</span>
          <strong class="block">Real Account Only</strong>
          <p class="text-muted text-sm mt-1">Switch to Real and verify KYC to copy live signals.</p>
        </div>
      </div>
    </div>`;
  }
  return `<div class="flex gap-4 overflow-x-auto pb-3 snap-x" id="copy-scroller">
    ${Array(3).fill(0).map(() => `<div class="skeleton w-[280px] h-[140px] rounded-lg flex-shrink-0"></div>`).join('')}
  </div>`;
}

function activeWallet() {
  const w = get('wallet') || {};
  const mode = get('mode');
  return mode === 'real' ? (w.real || { balance: 0, available: 0, currency: 'USDT' }) : (w.demo || { balance: 10000, available: 10000, currency: 'USDT_DEMO' });
}
