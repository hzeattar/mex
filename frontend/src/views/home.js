// Home View
import { get } from '../state/store.js';
import { money, pct, price, timeAgo, esc, escAttr } from '../utils/format.js';
import { navigate } from '../router.js';
import { api } from '../services/api.js';
import { icons } from '../components/common/Icons.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';

export function render() {
  const brand = get('brand') || {};
  const wallet = activeWallet();
  const mode = get('mode');
  const level = get('level') || {};
  const currentLevel = level.current || {};

  return `
    <div class="space-y-6 animate-fade-in">
      <!-- Hero -->
      <section class="card feature-hero relative overflow-hidden">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] lg:items-end">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge-accent">${esc(brand.name)}</span>
              <span class="status-chip ${mode === 'real' ? 'status-chip-live' : 'status-chip-delayed'}">${mode === 'real' ? 'Real workspace' : 'Demo workspace'}</span>
              ${levelBadge(currentLevel)}
            </div>
            <div class="space-y-2">
              <h1 class="text-2xl lg:text-4xl font-bold leading-tight">${mode === 'real' ? 'Trading desk' : 'Practice trading desk'}</h1>
              <p class="text-muted text-sm lg:text-base max-w-2xl">${esc(brand.tagline || 'Professional multi-market trading platform')} with curated markets, copy desk signals, level-linked contracts, and internal execution controls.</p>
            </div>
            <div class="feature-hero__stats">
              <div class="hero-stat">
                <span>Account level</span>
                <strong>${esc(currentLevel.name || currentLevel.name_en || currentLevel.level_code || 'Starter')}</strong>
                <small>Contracts and copy permissions</small>
              </div>
              <div class="hero-stat">
                <span>Execution mode</span>
                <strong>${mode === 'real' ? 'Real' : 'Demo'}</strong>
                <small>${mode === 'real' ? 'Internal live review' : 'Practice flow enabled'}</small>
              </div>
              <div class="hero-stat">
                <span>Market coverage</span>
                <strong>6 desks</strong>
                <small>Crypto, FX, stocks, metals, futures, Arab</small>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <a href="#/trade" class="btn-primary">Open trade</a>
              <a href="#/deposit" class="btn-ghost">Deposit</a>
              <a href="#/invest" class="btn-ghost">Copy & contracts</a>
            </div>
          </div>
          <div class="grid gap-3">
            <div class="hero-balance-card">
              <span>${mode === 'real' ? 'Live balance' : 'Practice balance'}</span>
              <strong>${money(wallet.balance)}</strong>
              <small>${esc(wallet.currency)}</small>
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${walletCard('Available', money(wallet.available), wallet.currency)}
              ${walletCard('Holds', money(wallet.holds || 0), 'Locked margin')}
              ${walletCard('Workspace', mode === 'real' ? 'Live' : 'Demo', mode === 'real' ? 'Review enabled' : 'Practice')}
              ${walletCard('Markets', 'Curated', 'Fast watch')}
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <span class="badge-green mb-1">Workspace</span>
            <h2 class="text-base font-semibold">Quick Actions</h2>
          </div>
          <p class="text-xs text-muted hidden lg:block">Funding, verification, support, and client services from one desk.</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 home-action-grid">
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

      <section class="home-support-strip">
        ${supportStripCard('News room', 'Desk briefings, catalysts, and curated client headlines.', '#/news', 'badge-accent')}
        ${supportStripCard('Support desk', 'Funding review, KYC follow-up, payout status, and account help.', '#/support', 'badge-green')}
      </section>
    </div>`;
}

export function mount(container) {
  loadHomeData(container);
}

async function loadHomeData(container) {
  try {
    const mode = get('mode');
    const [markets, portfolio, signals] = await Promise.all([
      api('/markets.php?scope=home&supported=1&lite=1&with_quotes=1', { timeout: 7000 }),
      api('/trade/portfolio.php', { timeout: 7000 }),
      mode === 'real' ? api('/signals.php?bot=1&home=1&lang=en', { timeout: 7000 }).catch(() => null) : Promise.resolve(null),
    ]);
    if (markets && markets.items) {
      const visible = markets.items.slice(0, 12);
      renderMarkets(container, visible);
      const missingVisible = visible.filter((item) => Number(item.price || item.q_price || 0) <= 0);
      if (missingVisible.length) hydrateMarketQuotes(container, missingVisible);
    }
    if (portfolio && portfolio.positions) {
      renderPositions(container, portfolio.positions.slice(0, 5));
    }
    // Render copy signals
    if (mode === 'real' && signals && signals.items && signals.items.length) {
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
        <div><span class="text-muted">Entry</span><div class="font-mono">${signalLevel(sig.entry || sig.entry_price, sig.type)}</div></div>
        <div><span class="text-muted">TP</span><div class="font-mono text-buy">${signalLevel(sig.tp1 || sig.take_profit_1 || sig.take_profit, sig.type)}</div></div>
        <div><span class="text-muted">SL</span><div class="font-mono text-sell">${signalLevel(sig.sl || sig.stop_loss, sig.type)}</div></div>
      </div>
      ${signalLevelsMissing(sig) ? `<p class="text-[10px] text-muted mt-2">Awaiting desk levels</p>` : signalLevelsSource(sig)}
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
        <div class="flex items-center gap-2">
          <div class="font-semibold text-sm truncate">${esc(m.symbol)}</div>
          ${quoteStateChip(m)}
        </div>
        <div class="text-[11px] text-muted truncate">${esc(m.name || m.symbol)}</div>
        <div class="mini-spark" aria-hidden="true">${miniSpark(m.symbol)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono font-semibold" data-home-price>${formatMarketPrice(m.price || m.q_price, m.type)}</div>
        <div class="text-[11px] ${Number(m.change_pct || m.q_change || 0) >= 0 ? 'text-green' : 'text-red'}" data-home-change>${pct(m.change_pct || m.q_change || 0)}</div>
        <div class="text-[9px] text-muted uppercase mt-1" data-home-source>${quoteStateText(m)}</div>
      </div>
    </button>
  `).join('');
  grid.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('trade', { symbol: btn.dataset.symbol, type: btn.dataset.type }));
  });
}

async function hydrateMarketQuotes(container, items) {
  const groups = new Map();
  items.forEach((item) => {
    const symbol = String(item.symbol || '').toUpperCase();
    const type = item.type || 'crypto';
    if (!symbol) return;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(symbol);
  });

  const missing = [];
  await Promise.all([...groups.entries()].map(async ([type, symbols]) => {
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(symbols.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist`, { timeout: 6500 }).catch(() => null);
    const seen = new Set();
    if (data?.items?.length) {
      data.items.forEach((q) => {
        seen.add(String(q.symbol || '').toUpperCase());
        applyQuoteToMarketCard(container, q, type);
      });
    }
    symbols.forEach((symbol) => {
      const card = findMarketCard(container, symbol);
      const hasPrice = card && card.querySelector('[data-home-price]')?.textContent !== '--';
      if (!seen.has(symbol) || !hasPrice) missing.push({ symbol, type });
    });
  }));
  warmMissingHomeQuotes(container, missing);
}

async function warmMissingHomeQuotes(container, missing) {
  const byType = new Map();
  missing.forEach((item) => {
    if (!item.symbol || !item.type) return;
    if (!byType.has(item.type)) byType.set(item.type, []);
    byType.get(item.type).push(item.symbol);
  });
  for (const [type, symbols] of byType.entries()) {
    const chunkSize = type === 'crypto' ? 12 : 2;
    const limit = type === 'crypto' ? 12 : 4;
    const unique = [...new Set(symbols)].slice(0, limit);
    const unresolved = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&cache_only=1&purpose=watchlist`, { timeout: 3500 }).catch(() => null);
      if (data?.items?.length) data.items.forEach((q) => applyQuoteToMarketCard(container, q, type));
      chunk.forEach((symbol) => {
        const card = findMarketCard(container, symbol);
        const hasPrice = card && card.querySelector('[data-home-price]')?.textContent !== '--';
        if (!hasPrice) unresolved.push(symbol);
      });
    }
    const rescueChunkSize = type === 'crypto' ? 6 : 2;
    const rescueList = [...new Set(unresolved)].slice(0, type === 'crypto' ? 6 : 2);
    for (let i = 0; i < rescueList.length; i += rescueChunkSize) {
      const chunk = rescueList.slice(i, i + rescueChunkSize);
      const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&purpose=focus`, { timeout: 4200 }).catch(() => null);
      if (data?.items?.length) data.items.forEach((q) => applyQuoteToMarketCard(container, q, type));
    }
  }
}

function applyQuoteToMarketCard(container, q, fallbackType) {
  const symbol = String(q.symbol || '').toUpperCase();
  const card = findMarketCard(container, symbol);
  if (!card) return;
  const type = card.dataset.type || q.type || fallbackType;
  const p = Number(q.price || q.q_price || 0);
  const chg = Number(q.change_pct || q.q_change || 0);
  const priceEl = card.querySelector('[data-home-price]');
  const changeEl = card.querySelector('[data-home-change]');
  const sourceEl = card.querySelector('[data-home-source]');
  if (priceEl && p > 0) priceEl.textContent = price(p, type);
  if (changeEl) {
    changeEl.textContent = pct(chg);
    changeEl.className = `text-[11px] ${chg >= 0 ? 'text-green' : 'text-red'}`;
  }
  if (sourceEl && p > 0) sourceEl.textContent = quoteStateText(q);
  const chip = card.querySelector('[data-quote-chip]');
  if (chip && p > 0) {
    chip.className = `status-chip ${quoteStateClass(q)}`;
    chip.textContent = quoteStateText(q);
  }
}

function findMarketCard(container, symbol) {
  return [...container.querySelectorAll('[data-symbol]')]
    .find((node) => String(node.dataset.symbol || '').toUpperCase() === String(symbol || '').toUpperCase());
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
  el.innerHTML = `<div class="grid gap-2 lg:grid-cols-2">${positions.map(positionRow).join('')}</div>`;
}

function positionRow(p) {
  const pnl = Number(p.pnl || p.unrealized_pnl || 0);
  const symbol = String(p.symbol || '').replace('@R@', '');
  const type = p.asset_type || p.type || 'crypto';
  const mark = Number(p.mark_price || p.current_price || p.price || 0);
  return `<div class="position-card">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        ${marketLogo({ symbol, type }, 'market-logo !h-8 !w-8')}
        <div class="min-w-0">
          <strong class="text-sm truncate block">${esc(symbol)}</strong>
          <span class="text-[10px] text-muted">${esc(p.market_type || p.order_type || 'spot')} / ${esc(positionSide(p))}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-mono ${pnl >= 0 ? 'text-green' : 'text-red'}">${money(pnl)}</div>
        <div class="text-[10px] text-muted">PnL</div>
      </div>
    </div>
    <div class="position-metrics mt-3">
      ${positionMetric('Entry', price(p.entry_price || p.open_price, type))}
      ${positionMetric('Mark', mark > 0 ? price(mark, type) : '--')}
      ${positionMetric('Size', money(p.qty || p.amount || p.size || p.units || 0))}
      ${positionMetric('Lev', `${p.leverage || 1}x`)}
      ${positionMetric('Margin', money(p.margin_initial || p.margin || 0))}
      ${positionMetric('ROE', pct(p.roe_pct || p.roe || 0))}
      ${positionMetric('Opened', positionAge(p))}
    </div>
  </div>`;
}

function positionMetric(label, value) {
  return `<span><small>${label}</small><strong>${value}</strong></span>`;
}

function positionSide(position) {
  const side = String(position.side || 'buy').toUpperCase();
  return side === 'SELL' ? 'SELL' : 'BUY';
}

function positionAge(position) {
  const raw = position.created_at || position.opened_at || position.open_time || '';
  if (!raw) return '--';
  const ts = typeof raw === 'number'
    ? raw
    : (/^\d+$/.test(String(raw)) ? Number(raw) : Math.floor(Date.parse(raw) / 1000));
  return Number.isFinite(ts) && ts > 0 ? timeAgo(ts) : '--';
}

function walletCard(label, value, sub) {
  return `<div class="hero-metric-card">
    <div class="text-[10px] uppercase text-muted tracking-wide">${label}</div>
    <div class="text-base font-bold mt-1">${value}</div>
    <div class="text-[10px] text-muted">${sub || ''}</div>
  </div>`;
}

function quickAction(label, icon, href) {
  return `<a href="${href}" class="home-action-card">
    <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-green/10 grid place-items-center text-accent">${icons[icon] || ''}</span>
    <span class="text-xs font-medium">${label}</span>
  </a>`;
}

function supportStripCard(title, text, href, badgeClass) {
  return `<article class="card home-support-card">
    <span class="${badgeClass}">${esc(title)}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(text)}</small>
    <a href="${href}" class="btn-ghost btn-sm mt-3">Open</a>
  </article>`;
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

function formatMarketPrice(value, type) {
  const n = Number(value || 0);
  return n > 0 ? price(n, type) : '--';
}

function quoteStateText(m) {
  const source = String(m.source || m.provider || '').toLowerCase();
  const timing = String(m.timing_class || '').toLowerCase();
  if (Number(m.price || m.q_price || 0) <= 0) return 'Unavailable';
  if (timing === 'stale' || m.is_stale) return 'Stale';
  if (m.delayed || source.includes('yahoo')) return 'Delayed';
  if (source.includes('binance') || source.includes('stream') || timing === 'live') return 'Live';
  return source ? source.replace(/_/g, ' ') : 'Cached';
}

function quoteStateClass(m) {
  const text = quoteStateText(m).toLowerCase();
  if (text === 'live') return 'status-chip-live';
  if (text === 'unavailable') return 'status-chip-locked';
  return 'status-chip-delayed';
}

function quoteStateChip(m) {
  return `<span data-quote-chip class="status-chip ${quoteStateClass(m)}">${quoteStateText(m)}</span>`;
}

function levelBadge(level) {
  const code = String(level?.level_code || level?.name_en || 'starter').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = level?.name || level?.name_en || level?.level_code || 'Starter';
  return `<span class="level-badge level-badge--${escAttr(code)}">${esc(label)}</span>`;
}

function miniSpark(symbol) {
  const seed = String(symbol || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return Array.from({ length: 12 }, (_, i) => {
    const h = 18 + ((seed + i * 13) % 26);
    return `<i style="height:${h}px"></i>`;
  }).join('');
}

function signalLevel(value, type) {
  const n = Number(value || 0);
  return n > 0 ? price(n, type) : '--';
}

function signalLevelsMissing(sig) {
  return !(Number(sig.entry || sig.entry_price || 0) > 0) || !(Number(sig.tp1 || sig.take_profit_1 || sig.take_profit || 0) > 0) || !(Number(sig.sl || sig.stop_loss || 0) > 0);
}

function signalLevelsSource(sig) {
  return sig.levels_source === 'live_derived'
    ? `<p class="text-[10px] text-spread mt-2">Live-derived desk levels</p>`
    : '';
}
