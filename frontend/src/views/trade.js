import { get, set } from '../state/store.js';
import { money, qty, pct, price, esc, escAttr } from '../utils/format.js';
import { $, $$, delegate } from '../utils/dom.js';
import { api } from '../services/api.js';
import { connectSSE, disconnect } from '../services/sse.js';
import { icons } from '../components/common/Icons.js';
import { navigate } from '../router.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';
import { t } from '../utils/i18n.js';

let chart = null;
let candleSeries = null;
let volumeSeries = null;
let ma7Series = null;
let ma25Series = null;
let sseClean = null;
let activeQuoteTimer = null;
let activeQuoteController = null;
let activityRefreshTimer = null;
let resizeObserver = null;
let chartLibPromise = null;
let lastCandle = null;
let tradeRunId = 0;
const marketListCache = new Map();
const closingPositions = new Set();

const TYPES = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'forex', label: 'Forex' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'futures', label: 'Futures' },
  { key: 'arab', label: 'Arab' },
];

const TFS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export function render(params) {
  if (params.symbol) set('symbol', params.symbol.toUpperCase());
  if (params.type) set('type', params.type);
  if (params.tf) set('tf', params.tf);

  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');

  return `<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">Markets</div>
          <strong class="text-sm">Select instrument</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${icons.close}</button>
      </div>
      <div class="p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="Search symbol..." id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${icons.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${TYPES.map(t => `<button class="btn-xs ${t.key === type ? 'bg-accent/20 text-accent border-accent/40' : 'text-muted border-line'} border rounded-md whitespace-nowrap" data-type-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${icons.menu}</button>
          ${marketLogo(symbol, type, 'w-7 h-7 rounded-md shrink-0')}
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${esc(symbol)}</strong>
              <span class="w-2 h-2 rounded-full bg-muted shrink-0" id="conn-dot" title="Connecting"></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold" id="live-price">--</span>
              <span class="text-[10px]" id="live-change">+0.00%</span>
              <span class="status-chip status-chip-locked !text-[8px] !px-1.5 !py-0.5" id="quote-state">Loading</span>
            </div>
          </div>
        </div>
        <div class="flex gap-0.5 overflow-x-auto max-w-[46vw] lg:max-w-none" id="tf-bar">
          ${TFS.map(t => `<button class="px-1.5 py-1 text-[10px] rounded shrink-0 ${t === tf ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'}" data-tf="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <div class="flex-1 relative min-h-[260px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading live chart...</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">SELL</button>
        <button class="btn-buy py-3" data-open-order="BUY">BUY</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[320px] lg:max-h-[220px] overflow-auto shrink-0 trade-activity-panel" id="positions-section">
        <div class="trade-activity-head">
          <div class="trade-activity-title">
            <span class="text-[10px] font-semibold text-muted uppercase">Trading activity</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">Loading...</span>
          </div>
          <div class="trade-activity-actions">
            <div class="activity-tabs" role="tablist">
              <button class="active" data-activity-tab="active">Active trades <b id="active-count">0</b></button>
              <button data-activity-tab="closed">Closed trades <b id="closed-count">0</b></button>
            </div>
            <button class="activity-expand-btn" data-toggle-activity-expand title="Expand trading activity" aria-label="Expand trading activity">${icons.fullscreen || icons.expand || '⛶'}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted">${esc(symbol)} - ${esc(type.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${renderOrderPanel()}
      </div>
    </aside>

    ${renderMobileOrderSheet(symbol, type)}
  </div>`;
}

function renderOrderPanel() {
  const ot = get('orderType') || 'MARKET';
  const amt = Number(get('amount') || 100);
  const lev = Number(get('leverage') || 10);
  const market = get('market') || 'spot';
  const q = get('activeQuote') || {};
  const p = Number(q.price || 0);

  return `<div class="space-y-3 order-ticket-panel" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Trading type</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${market === 'spot' ? 'selected' : ''}>Spot</option>
          <option value="perp" ${market === 'perp' ? 'selected' : ''}>Perpetual / Futures</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">Order type</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${ot === 'MARKET' ? 'selected' : ''}>Market</option>
          <option value="LIMIT" ${ot === 'LIMIT' ? 'selected' : ''}>Limit</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell trade-price-button" data-side="SELL"><small>Sell</small><span data-sell-price>${p > 0 ? price(p, get('type')) : '--'}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>Buy</small><span data-buy-price>${p > 0 ? price(p * 1.0001, get('type')) : '--'}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
      <div class="mobile-order-summary">
        <span><small>Mode</small><strong>${esc(get('mode') === 'real' ? 'Real' : 'Demo')}</strong></span>
        <span><small>Symbol</small><strong>${esc(get('symbol') || '--')}</strong></span>
        <span><small>Asset</small><strong>${esc(get('type') || '--')}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>Available</small><strong data-avail-bal>--</strong></span>
        <span><small>Est. Units</small><strong data-est-units>--</strong></span>
        <span><small>Notional</small><strong data-est-notional>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${escAttr(String(amt))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25, 50, 100, 250].map(v => `<button type="button" data-quick-amount="${v}">$${v}</button>`).join('')}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">Limit price</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${p > 0 ? price(p, get('type')) : 'Required for limit'}" data-limit-price />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${lev}x</strong></span>
      <input type="range" min="1" max="100" value="${escAttr(String(lev))}" class="w-full mt-1 accent-accent" data-leverage />
    </label>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">Take Profit</span>
        <input type="number" step="any" class="input mt-1" placeholder="Optional" data-tp />
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">Stop Loss</span>
        <input type="number" step="any" class="input mt-1" placeholder="Optional" data-sl />
      </label>
    </div>
    <p class="order-form-status is-info" data-order-status hidden></p>
    <p class="order-ticket-note">Orders execute internally on MEX Group at the current platform quote. Use TP/SL to document target risk for review.</p>
  </div>`;
}

function renderMobileOrderSheet(symbol, type) {
  return `<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          ${marketLogo(symbol, type, 'w-8 h-8 rounded-lg shrink-0')}
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">Order</div>
            <strong class="text-sm truncate">${esc(symbol)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${icons.close}</button>
      </div>
      <div class="p-4">
        ${renderOrderPanel()}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
        </div>
      </div>
    </div>
  </div>`;
}

export function mount(container) {
  // Attach logo fallback handlers (not inline onerror)
  container.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && e.target.dataset.fallback === 'initial') {
      e.target.style.display = 'none';
      const fallback = e.target.nextElementSibling;
      if (fallback) fallback.style.display = 'grid';
    }
  }, true);
  setup(container);
}

export function cleanup() {
  tradeRunId += 1;
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) {
    chart.remove();
    chart = null;
    candleSeries = null;
    volumeSeries = null;
    lastCandle = null;
  }
  if (sseClean) {
    sseClean();
    sseClean = null;
  }
  stopActiveQuote();
  stopActivityRefresh();
  disconnect();
  document.body.classList.remove('trade-modal-open');
}

async function setup(container) {
  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');
  const runId = ++tradeRunId;
  set('activeQuote', null);
  const chartReady = loadChartLib();

  bindEvents(container);
  updateOrderInfo(container);
  startActiveQuote(container, symbol, type, runId);

  loadMarketItems(type, runId)
    .then(mkts => {
      if (!isCurrentRun(runId, symbol, type)) return;
      if (mkts?.items) {
        container.__marketItems = mkts.items;
        renderSymbolList(container, mkts.items);
        hydrateActiveFromMarketList(container, mkts.items, runId);
        warmVisibleQuotes(container, mkts.items, runId).finally(() => {
          if (isCurrentRun(runId, symbol, type)) setTimeout(() => startLiveQuotes(container, mkts.items, runId), 1200);
        });
      }
    })
    .catch(() => {
      if (!isCurrentRun(runId, symbol, type)) return;
      const list = $('#symbol-list', container);
      if (list) list.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>';
    });

  loadTradeActivity(container, runId);
  activityRefreshTimer = setInterval(() => loadTradeActivity(container, runId, true), 20000);

  loadChartData(container, symbol, type, tf, runId, chartReady);
}

function isCurrentRun(runId, symbol = get('symbol'), type = get('type')) {
  if (runId !== tradeRunId) return false;
  if (symbol && String(symbol).toUpperCase() !== String(get('symbol') || '').toUpperCase()) return false;
  if (type && normalizeType(type) !== normalizeType(get('type'))) return false;
  return true;
}

function normalizeType(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'commodity') return 'commodities';
  if (value === 'stock') return 'stocks';
  if (value === 'future') return 'futures';
  return value;
}

function startLiveQuotes(container, marketItems, runId = tradeRunId) {
  if (sseClean) {
    sseClean();
    sseClean = null;
  }

  const type = get('type');
  const active = get('symbol');
  const max = type === 'crypto' ? 36 : 18;
  const symbols = [...new Set(marketItems
    .slice(0, max)
    .map(m => String(m.symbol || '').toUpperCase())
    .filter(Boolean)
    .filter(symbol => symbol !== String(active || '').toUpperCase()))];

  if (!symbols.length) return;

  sseClean = connectSSE(symbols, type, (items) => {
    if (!isCurrentRun(runId, active, type)) return;
    updateSymbolListPrices(container, items);
    const dot = $('#conn-dot', container);
    if (dot) {
      dot.classList.remove('bg-muted', 'bg-sell');
      dot.classList.add('bg-buy');
      dot.title = 'Live';
    }
  }, null, { interval: type === 'crypto' ? 12000 : 18000, initialDelay: 1800, fallbackAfter: 3500, maxSymbols: max });
}

function startActiveQuote(container, symbol, type, runId = tradeRunId) {
  stopActiveQuote();
  const interval = type === 'crypto' ? 4500 : 7000;
  const poll = async () => {
    if (!isCurrentRun(runId, symbol, type)) return;
    activeQuoteController = new AbortController();
    try {
      const url = `/quotes.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&purpose=focus&_=${Date.now()}`;
      const data = await api(url, { timeout: type === 'crypto' ? 2400 : 2600, signal: activeQuoteController.signal, cacheTtl: 0, cache: 'no-store' });
      if (!isCurrentRun(runId, symbol, type)) return;
      if (data?.items?.[0]) updatePrice(container, data.items[0], runId);
    } catch (_e) {
      if (isCurrentRun(runId, symbol, type)) markDisconnected(container);
    } finally {
      if (isCurrentRun(runId, symbol, type)) activeQuoteTimer = setTimeout(poll, interval);
    }
  };
  poll();
}

function stopActiveQuote() {
  if (activeQuoteTimer) {
    clearTimeout(activeQuoteTimer);
    activeQuoteTimer = null;
  }
  if (activeQuoteController) {
    activeQuoteController.abort();
    activeQuoteController = null;
  }
}

function stopActivityRefresh() {
  if (activityRefreshTimer) {
    clearInterval(activityRefreshTimer);
    activityRefreshTimer = null;
  }
}

function markDisconnected(container) {
  const dot = $('#conn-dot', container);
  if (!dot) return;
  dot.classList.remove('bg-muted', 'bg-buy');
  dot.classList.add('bg-sell');
  dot.title = 'Disconnected';
}
function updatePrice(container, q, runId = tradeRunId) {
  if (!isCurrentRun(runId, String(q?.symbol || get('symbol')).toUpperCase(), q?.type || get('type'))) return;
  const p = Number(q.price || q.q_price || 0);
  const chg = Number(q.change_pct || q.q_change || 0);
  const t = get('type');
  set('activeQuote', { ...q, price: p, change_pct: chg });
  updateSymbolListPrices(container, [{ ...q, price: p, change_pct: chg }]);

  const livePrice = $('#live-price', container);
  const liveChange = $('#live-change', container);
  if (livePrice) livePrice.textContent = p > 0 ? price(p, t) : '--';
  if (liveChange) {
    liveChange.textContent = pct(chg);
    liveChange.className = `text-[10px] ${chg >= 0 ? 'text-buy' : 'text-sell'}`;
  }
  const quoteState = $('#quote-state', container);
  if (quoteState) {
    const state = quoteStateLabel(q);
    quoteState.textContent = state;
    quoteState.className = `status-chip ${quoteStateClass(state)} !text-[8px] !px-1.5 !py-0.5`;
  }

  $$('[data-sell-price]', container).forEach(el => { el.textContent = p > 0 ? price(p, t) : '--'; });
  $$('[data-buy-price]', container).forEach(el => { el.textContent = p > 0 ? price(p * 1.0001, t) : '--'; });
  $$('[data-spread-val]', container).forEach(el => { el.textContent = p > 0 ? `Spread: ${price(p * 0.0001, t)}` : 'Spread: --'; });
  updateOrderInfo(container);
  updateLiveCandle(p, runId);
}

function updateOrderInfo(container) {
  const q = get('activeQuote') || {};
  const p = Number(q.price || 0);
  const w = get('wallet') || {};
  const wallet = get('mode') === 'real' ? (w.real || {}) : (w.demo || {});

  $$('[data-order-form]', container).forEach(form => {
    const amt = Number($('[data-amount]', form)?.value || get('amount') || 0);
    const lev = Number($('[data-leverage]', form)?.value || get('leverage') || 1);
    const marketType = $('[data-market-type]', form)?.value || get('market') || 'spot';
    const effectiveLev = marketType === 'perp' ? lev : 1;
    const units = p > 0 ? ((amt * effectiveLev) / p) : 0;
    const notional = amt * effectiveLev;
    const levLabel = $('[data-lev-val]', form);
    if (levLabel) levLabel.textContent = `${lev}x`;
    const unitsEl = $('[data-est-units]', form);
    if (unitsEl) unitsEl.textContent = units > 0 ? units.toFixed(units >= 10 ? 3 : 6) : '--';
    const notionalEl = $('[data-est-notional]', form);
    if (notionalEl) notionalEl.textContent = amt > 0 ? `${money(notional)} USDT` : '--';
    const balanceEl = $('[data-avail-bal]', form);
    if (balanceEl) balanceEl.textContent = `${money(wallet.available || 0)} ${wallet.currency || ''}`;
  });
}

function renderSymbolList(container, items) {
  const list = $('#symbol-list', container);
  if (!list) return;

  const active = get('symbol');
  const visible = items.slice(0, 120);
  list.innerHTML = visible.map(m => {
    const symbol = String(m.symbol || '').toUpperCase();
    const type = m.type || get('type');
    const p = Number(m.price || m.q_price || 0);
    const chg = Number(m.change_pct || m.q_change || 0);
    const unavailable = !(p > 0);
    return `<div class="symbol-row ${symbol === active ? 'active' : ''}" data-sym="${escAttr(symbol)}" data-stype="${escAttr(type)}">
      ${marketLogo(symbol, type, 'w-7 h-7 rounded-md shrink-0')}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${esc(symbol)}</div>
          <span class="status-dot ${unavailable ? 'bg-sell' : quoteClass(m)}"></span>
        </div>
        <div class="text-[9px] text-muted truncate">${esc(m.name || type)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono" data-price-cell>${p > 0 ? price(p, type) : '--'}</div>
        <div class="text-[9px] ${chg >= 0 ? 'text-buy' : 'text-sell'}" data-change-cell>${unavailable ? 'Unavailable' : pct(chg)}</div>
      </div>
    </div>`;
  }).join('');
}

async function warmVisibleQuotes(container, items, runId = tradeRunId) {
  const type = get('type');
  const missing = items
    .slice(0, type === 'crypto' ? 18 : 10)
    .filter((item) => !(Number(item.price || item.q_price || 0) > 0))
    .map((item) => String(item.symbol || '').toUpperCase())
    .filter(Boolean);
  if (!missing.length) return;

  const chunkSize = type === 'crypto' ? 12 : 2;
  const limit = type === 'crypto' ? 18 : 6;
  const unique = [...new Set(missing)].slice(0, limit);
  const unresolved = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 2600 : 3400,
      cacheTtl: 0,
      cache: 'no-store',
    }).catch(() => null);
    if (!isCurrentRun(runId)) return;
    if (data?.items?.length) updateSymbolListPrices(container, data.items);
    chunk.forEach((symbol) => {
      const row = $$('.symbol-row', container).find((el) => el.dataset.sym === symbol);
      const hasPrice = row && $('[data-price-cell]', row)?.textContent !== '--';
      if (!hasPrice) unresolved.push(symbol);
    });
  }
  const rescueChunkSize = type === 'crypto' ? 6 : 2;
  const rescueList = [...new Set(unresolved)].slice(0, type === 'crypto' ? 8 : 3);
  for (let i = 0; i < rescueList.length; i += rescueChunkSize) {
    const chunk = rescueList.slice(i, i + rescueChunkSize);
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 2600 : 3400,
      cacheTtl: 0,
      cache: 'no-store',
    }).catch(() => null);
    if (!isCurrentRun(runId)) return;
    if (data?.items?.length) updateSymbolListPrices(container, data.items);
  }
}

function updateSymbolListPrices(container, items) {
  if (!items?.length) return;
  items.forEach(q => {
    const symbol = String(q.symbol || '').toUpperCase();
    if (!symbol) return;
    const row = $$('.symbol-row', container).find(el => el.dataset.sym === symbol);
    if (!row) return;
    const type = row.dataset.stype || get('type');
    const p = Number(q.price || q.q_price || 0);
    const chg = Number(q.change_pct || q.q_change || 0);
    const priceCell = $('[data-price-cell]', row);
    const changeCell = $('[data-change-cell]', row);
    if (priceCell && p > 0) priceCell.textContent = price(p, type);
    if (changeCell) {
      changeCell.textContent = pct(chg);
      changeCell.className = `text-[9px] ${chg >= 0 ? 'text-buy' : 'text-sell'}`;
    }
  });
}

async function loadTradeActivity(container, runId = tradeRunId, silent = false) {
  if (!isCurrentRun(runId)) return;
  if (container.__tradeActivityLoading) return;
  container.__tradeActivityLoading = true;
  const body = $('#activity-body', container);
  if (body && !silent && !container.__tradeActivityLoaded) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>';
  }

  try {
    const mode = get('mode');
    const [portfolioRes, ordersRes] = await Promise.allSettled([
      api(`/trade/portfolio.php?fast=1&mode=${mode}`, { timeout: 12000, retry: 1, cacheTtl: 4000 }),
      api(`/trade/orders.php?limit=90&mode=${mode}`, { timeout: 12000, retry: 1, cacheTtl: 4000 }),
    ]);
    if (!isCurrentRun(runId)) return;

    const portfolio = portfolioRes.status === 'fulfilled' ? portfolioRes.value : null;
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : null;
    if (portfolio?.positions) {
      container.__tradePositions = portfolio.positions;
      set('portfolio', portfolio);
    }
    if (orders?.items || orders?.orders) container.__tradeOrders = orders.items || orders.orders || [];
    if (!portfolio && !orders && !container.__tradeActivityLoaded) {
      if (body) body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Trading activity is reconnecting...</p>';
      return;
    }
    container.__tradeActivityLoaded = true;
    renderActivity(container);
  } finally {
    container.__tradeActivityLoading = false;
  }
}

function renderActivity(container) {
  const positions = (container.__tradePositions || []).filter(item => !isCopyTradeItem(item));
  const orders = (container.__tradeOrders || []).filter(item => !isCopyTradeItem(item));
  const openOrders = orders.filter(isPendingOrder);
  const history = orders.filter(isHistoryOrder);
  let tab = container.__tradeActivityTab || 'active';
  if (tab === 'positions' || tab === 'orders') tab = 'active';
  if (tab === 'history') tab = 'closed';
  container.__tradeActivityTab = tab;

  const activeCount = $('#active-count', container);
  const closedCount = $('#closed-count', container);
  const summary = $('#activity-summary', container);
  if (activeCount) activeCount.textContent = String(positions.length + openOrders.length);
  if (closedCount) closedCount.textContent = String(history.length);
  if (summary) summary.textContent = `${positions.length} open / ${openOrders.length} pending / ${history.length} closed`;

  $$('[data-activity-tab]', container).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.activityTab === tab);
  });

  if (tab === 'closed') return renderHistoryActivity(container, history);
  return renderActiveActivity(container, positions, openOrders);
}

function renderActiveActivity(container, positions, orders) {
  const body = $('#activity-body', container);
  if (!body) return;
  if (!positions.length && !orders.length) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">No active trades yet</p>';
    return;
  }

  body.innerHTML = `
    ${positions.length ? renderPositionsMarkup(positions) : '<p class="text-muted text-[11px] text-center py-3">No open positions</p>'}
    ${orders.length ? `<div class="trade-pending-block">
      <div class="trade-subhead"><span>Pending orders</span><b>${orders.length}</b></div>
      ${renderOrdersMarkup(orders)}
    </div>` : ''}`;
}

function renderPositions(container, positions) {
  const body = $('#activity-body', container);
  if (!body) return;

  if (!positions.length) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-3">No open positions</p>';
    return;
  }

  body.innerHTML = renderPositionsMarkup(positions);
}

function renderPositionsMarkup(positions) {
  return `
    <div class="trade-position-cards lg:hidden">
      ${positions.slice(0, 12).map(tradePositionCard).join('')}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${positions.slice(0, 12).map(tradePositionRow).join('')}</tbody>
    </table></div>`;
}

function renderOrdersActivity(container, orders) {
  const body = $('#activity-body', container);
  if (!body) return;
  if (!orders.length) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">No pending or armed orders</p>';
    return;
  }

  body.innerHTML = renderOrdersMarkup(orders);
}

function renderOrdersMarkup(orders) {
  return `
    <div class="trade-position-cards lg:hidden">
      ${orders.slice(0, 16).map(tradeOrderCard).join('')}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">Amount</th><th class="text-right py-1">Lev</th><th class="text-right py-1">Status</th><th class="text-right px-3 py-1">Actions</th>
      </tr></thead>
      <tbody>${orders.slice(0, 16).map(tradeOrderRow).join('')}</tbody>
    </table></div>`;
}

function renderHistoryActivity(container, history) {
  const body = $('#activity-body', container);
  if (!body) return;
  if (!history.length) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">No closed trades yet</p>';
    return;
  }

  body.innerHTML = `
    <div class="trade-position-cards lg:hidden">
      ${history.slice(0, 18).map(tradeHistoryCard).join('')}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Exit</th><th class="text-right py-1">Used</th><th class="text-right py-1">Fee</th><th class="text-right py-1">PnL</th><th class="text-right py-1">Opened</th><th class="text-right px-3 py-1">Closed</th>
      </tr></thead>
      <tbody>${history.slice(0, 18).map(tradeHistoryRow).join('')}</tbody>
    </table></div>`;
}

function tradePositionInfo(pos) {
  const pnl = Number(pos.pnl || pos.unrealized_pnl || 0);
  const cleanSymbol = String(pos.symbol || '').replace('@R@', '');
  const posType = pos.asset_type || get('type');
  const mark = Number(pos.mark_price || pos.current_price || pos.price || 0);
  const id = pos.position_id || pos.id || '';
  const side = String(pos.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  return { pnl, cleanSymbol, posType, mark, id, side };
}

function tradePositionRow(pos) {
  const { pnl, cleanSymbol, posType, mark, id, side } = tradePositionInfo(pos);
  return `<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${esc(cleanSymbol)}</td>
    <td>${sideBadge(side)}</td>
    <td class="text-muted">${esc(pos.market_type || 'spot')}</td>
    <td class="text-right font-mono">${price(pos.entry_price || pos.open_price, posType)}</td>
    <td class="text-right font-mono">${mark > 0 ? price(mark, posType) : '--'}</td>
    <td class="text-right font-mono">${qty(pos.qty || pos.amount || pos.size || pos.units || 0)}</td>
    <td class="text-right font-mono">${esc(String(pos.leverage || 1))}x</td>
    <td class="text-right font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</td>
    <td class="text-right px-3">${id ? `<button class="btn-xs btn-ghost text-sell" data-close="${escAttr(id)}">Close</button>` : ''}</td>
  </tr>`;
}

function tradePositionCard(pos) {
  const { pnl, cleanSymbol, posType, mark, id, side } = tradePositionInfo(pos);
  return `<article class="trade-position-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${esc(cleanSymbol)}</strong>
        <small>${esc(pos.market_type || 'spot')} - ${esc(pos.created_at || pos.opened_at || '')}</small>
      </div>
      ${sideBadge(side)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${price(pos.entry_price || pos.open_price, posType)}</strong></span>
      <span><small>Mark</small><strong>${mark > 0 ? price(mark, posType) : '--'}</strong></span>
      <span><small>Size</small><strong>${qty(pos.qty || pos.amount || pos.size || pos.units || 0)}</strong></span>
      <span><small>PnL</small><strong class="${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</strong></span>
      <span><small>Margin</small><strong>${money(pos.margin_initial || pos.margin || 0)}</strong></span>
      <span><small>Leverage</small><strong>${esc(String(pos.leverage || 1))}x</strong></span>
    </div>
    ${id ? `<button class="btn-xs btn-ghost text-sell w-full" data-close="${escAttr(id)}">Close position</button>` : ''}
  </article>`;
}

function isHistoryOrder(o) {
  const status = String(o.status || '').toLowerCase();
  return status === 'closed' || status === 'canceled' || status === 'cancelled' || status === 'rejected' || Number(o.closed_at || 0) > 0 || Number(o.exit_price || 0) > 0;
}

function isPendingOrder(o = {}) {
  if (o.is_pending === true || o.is_pending === 1 || o.is_pending === '1') return !isHistoryOrder(o);
  if (isHistoryOrder(o)) return false;
  const status = String(o.raw_status || o.order_status || o.status || '').toLowerCase();
  const pendingStatus = ['open', 'pending', 'armed', 'submitted', 'new'].includes(status);
  const hasFill = Number(o.fill_price || o.entry_price || 0) > 0;
  const hasPosition = Number(o.position_id || 0) > 0 && !(o.can_cancel || o.can_edit);
  return pendingStatus && !hasFill && !hasPosition;
}

function isCopyTradeItem(item = {}) {
  const directKeys = [
    'copy_subscription_id',
    'copy_signal_id',
    'copy_trade_id',
    'copy_id',
    'trading_bot_subscription_id',
    'bot_subscription_id',
    'avalon_subscription_id',
  ];
  if (directKeys.some(key => item[key] !== undefined && item[key] !== null && String(item[key]) !== '' && String(item[key]) !== '0')) {
    return true;
  }
  const sourceText = [
    item.source,
    item.origin,
    item.order_source,
    item.position_source,
    item.product_kind,
    item.strategy_kind,
    item.category,
    item.group,
  ].map(v => String(v || '').toLowerCase()).join(' ');
  return /\b(copy|copied|copy-trading|trading_bot|bot|avalon)\b/.test(sourceText);
}

function orderSymbol(o) {
  return String(o.symbol || '').replace('@R@', '').replace('@D@', '');
}

function orderSide(o) {
  return String(o.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : String(o.side || 'BUY').toUpperCase() === 'CLOSE' ? 'CLOSE' : 'BUY';
}

function orderAssetType(o) {
  return o.asset_type || o.type || get('type');
}

function orderId(o) {
  return String(o.order_id || o.id || '');
}

function orderDate(value) {
  const n = Number(value || 0);
  if (!n) return '--';
  try {
    return new Date(n * 1000).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return String(value);
  }
}

function tradeOrderRow(o) {
  const side = orderSide(o);
  const type = orderAssetType(o);
  const id = orderId(o);
  return `<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${esc(orderSymbol(o))}</td>
    <td>${sideBadge(side)}</td>
    <td class="text-muted">${esc(o.order_type || o.market_type || 'market')}</td>
    <td class="text-right font-mono">${price(o.entry_price || o.fill_price || o.limit_price, type)}</td>
    <td class="text-right font-mono"><span class="text-buy">${o.tp_price ? price(o.tp_price, type) : '--'}</span> / <span class="text-sell">${o.sl_price ? price(o.sl_price, type) : '--'}</span></td>
    <td class="text-right font-mono">${money(o.used_usdt || o.usd_amount || o.amount || 0)}</td>
    <td class="text-right font-mono">${esc(String(o.leverage || 1))}x</td>
    <td class="text-right"><span class="status-chip status-chip-derived">${esc(o.status || 'open')}</span></td>
    <td class="text-right px-3">${pendingOrderActions(id, o)}</td>
  </tr>`;
}

function tradeOrderCard(o) {
  const side = orderSide(o);
  const type = orderAssetType(o);
  const id = orderId(o);
  return `<article class="trade-position-card trade-activity-card">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${esc(orderSymbol(o))}</strong>
        <small>${esc(o.order_type || 'market')} - ${esc(orderDate(o.created_at))}</small>
      </div>
      ${sideBadge(side)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Entry</small><strong>${price(o.entry_price || o.fill_price || o.limit_price, type)}</strong></span>
      <span><small>Take profit</small><strong class="text-buy">${o.tp_price ? price(o.tp_price, type) : '--'}</strong></span>
      <span><small>Stop loss</small><strong class="text-sell">${o.sl_price ? price(o.sl_price, type) : '--'}</strong></span>
      <span><small>Amount</small><strong>${money(o.used_usdt || o.usd_amount || o.amount || 0)}</strong></span>
      <span><small>Lev</small><strong>${esc(String(o.leverage || 1))}x</strong></span>
      <span><small>Status</small><strong>${esc(o.status || 'open')}</strong></span>
      <span><small>Mode</small><strong>${esc(o.mode || get('mode') || 'demo')}</strong></span>
      <span><small>Symbol</small><strong>${esc(orderSymbol(o))}</strong></span>
    </div>
    ${pendingOrderActions(id, o, true)}
  </article>`;
}

function pendingOrderActions(id, order, block = false) {
  if (!id || !isPendingOrder(order)) return '<span class="text-muted text-[10px]">--</span>';
  const cls = block ? 'trade-pending-actions is-card' : 'trade-pending-actions';
  return `<div class="${cls}">
    <button class="btn-xs btn-ghost" data-edit-order="${escAttr(id)}">Edit</button>
    <button class="btn-xs btn-danger" data-cancel-order="${escAttr(id)}">Cancel</button>
  </div>`;
}

function tradeHistoryRow(o) {
  const side = orderSide(o);
  const type = orderAssetType(o);
  const pnl = Number(o.pnl_usd || o.pnl || 0);
  return `<tr class="border-t border-line/50 hover:bg-panel/50">
    <td class="px-3 py-1.5 font-semibold">${esc(orderSymbol(o))}</td>
    <td>${sideBadge(side)}</td>
    <td class="text-muted">${esc(o.market_type || o.order_type || 'spot')}</td>
    <td class="text-right font-mono">${price(o.exit_price || o.limit_price, type)}</td>
    <td class="text-right font-mono">${money(o.used_usdt || o.usd_amount || 0)}</td>
    <td class="text-right font-mono">${money(o.fee_paid || 0)}</td>
    <td class="text-right font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</td>
    <td class="text-right text-muted">${esc(orderDate(o.created_at))}</td>
    <td class="text-right px-3 text-muted">${esc(orderDate(o.closed_at || o.created_at))}</td>
  </tr>`;
}

function tradeHistoryCard(o) {
  const side = orderSide(o);
  const type = orderAssetType(o);
  const pnl = Number(o.pnl_usd || o.pnl || 0);
  return `<article class="trade-position-card trade-activity-card is-history">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${esc(orderSymbol(o))}</strong>
        <small>${esc(o.close_reason || o.status || 'closed')} - ${esc(orderDate(o.closed_at || o.created_at))}</small>
      </div>
      ${sideBadge(side)}
    </div>
    <div class="trade-position-metrics">
      <span><small>Exit</small><strong>${price(o.exit_price || o.limit_price, type)}</strong></span>
      <span><small>Opened</small><strong>${esc(orderDate(o.created_at))}</strong></span>
      <span><small>Closed</small><strong>${esc(orderDate(o.closed_at || o.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</strong></span>
      <span><small>Used</small><strong>${money(o.used_usdt || o.usd_amount || 0)}</strong></span>
      <span><small>Fee</small><strong>${money(o.fee_paid || 0)}</strong></span>
    </div>
  </article>`;
}

function sideBadge(side) {
  const normalized = String(side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  return `<span class="trade-side-chip is-${normalized.toLowerCase()}">${esc(normalized)}</span>`;
}

async function initChart(container, candles, runId = tradeRunId) {
  if (!isCurrentRun(runId)) return;
  const el = $('#chart-box', container);
  if (!el) return;

  const { createChart } = await loadChartLib();
  if (!isCurrentRun(runId)) return;
  el.innerHTML = '';

  chart = createChart(el, {
    layout: { background: { color: '#060A14' }, textColor: '#8ba1cf', fontSize: 11 },
    grid: { vertLines: { color: 'rgba(129,160,220,0.04)' }, horzLines: { color: 'rgba(129,160,220,0.04)' } },
    crosshair: { mode: 0, vertLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff' }, horzLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff' } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(129,160,220,0.08)', rightOffset: 4 },
    rightPriceScale: { borderColor: 'rgba(129,160,220,0.08)' },
    watermark: { visible: true, text: 'MEX Group', color: 'rgba(93,124,255,0.08)', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
    width: Math.max(320, el.clientWidth),
    height: Math.max(260, el.clientHeight),
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#00c087',
    downColor: '#f6465d',
    borderUpColor: '#00c087',
    borderDownColor: '#f6465d',
    wickUpColor: '#00c087',
    wickDownColor: '#f6465d',
  });
  volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

  // Moving Averages
  ma7Series = chart.addLineSeries({ color: 'rgba(255,193,7,0.55)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  ma25Series = chart.addLineSeries({ color: 'rgba(93,124,255,0.55)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

  const data = candles
    .map(c => ({
      time: Number(c.time || c.t),
      open: Number(c.open || c.o),
      high: Number(c.high || c.h),
      low: Number(c.low || c.l),
      close: Number(c.close || c.c),
      volume: Number(c.volume || c.v || 0),
    }))
    .filter(c => c.time > 0 && c.open > 0)
    .sort((a, b) => a.time - b.time);

  candleSeries.setData(data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  volumeSeries.setData(data.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(0,192,135,0.25)' : 'rgba(246,70,93,0.2)' })));

  // Calculate and set MA lines
  const closes = data.map(d => ({ time: d.time, close: d.close }));
  ma7Series.setData(calcMA(closes, 7));
  ma25Series.setData(calcMA(closes, 25));

  lastCandle = data.length ? { ...data[data.length - 1] } : null;
  chart.timeScale().fitContent();

  resizeObserver = new ResizeObserver(() => {
    if (!chart || !el) return;
    chart.applyOptions({ width: Math.max(320, el.clientWidth), height: Math.max(260, el.clientHeight) });
  });
  resizeObserver.observe(el);
}

function bindEvents(container) {
  $('#mob-mkt-btn', container)?.addEventListener('click', () => openMarketDrawer(container));
  $('#close-mob-drawer', container)?.addEventListener('click', () => closeMarketDrawer(container));

  delegate(container, '[data-sym]', 'click', (e, el) => {
    closeMarketDrawer(container);
    localStorage.setItem('vp_symbol', el.dataset.sym);
    localStorage.setItem('vp_type', el.dataset.stype || get('type'));
    navigate('trade', { symbol: el.dataset.sym, type: el.dataset.stype || get('type'), tf: get('tf') });
  });

  delegate(container, '[data-tf]', 'click', (e, el) => {
    set('tf', el.dataset.tf);
    localStorage.setItem('vp_tf', el.dataset.tf);
    navigate('trade', { symbol: get('symbol'), type: get('type'), tf: el.dataset.tf });
  });

  delegate(container, '[data-type-tab]', 'click', async (e, el) => {
    set('type', el.dataset.typeTab);
    localStorage.setItem('vp_type', el.dataset.typeTab);
    const data = await loadMarketItems(el.dataset.typeTab, tradeRunId, true).catch(() => null);
    if (data?.items) {
      const first = data.items.find((item) => item?.symbol);
      if (first?.symbol && normalizeType(el.dataset.typeTab) !== 'favorites') {
        const nextSymbol = String(first.symbol).toUpperCase();
        localStorage.setItem('vp_symbol', nextSymbol);
        navigate('trade', { symbol: nextSymbol, type: el.dataset.typeTab, tf: get('tf') });
        return;
      }
      renderSymbolList(container, data.items);
      warmVisibleQuotes(container, data.items, tradeRunId);
      startLiveQuotes(container, data.items, tradeRunId);
    }
    $$('[data-type-tab]', container).forEach(btn => {
      const active = btn === el;
      btn.classList.toggle('bg-accent/20', active);
      btn.classList.toggle('text-accent', active);
      btn.classList.toggle('border-accent/40', active);
    });
  });

  delegate(container, '[data-open-order]', 'click', (e, el) => openOrderSheet(container, el.dataset.openOrder));
  delegate(container, '[data-close-order-sheet]', 'click', () => closeOrderSheet(container));
  delegate(container, '[data-submit-order]', 'click', (e, el) => placeOrder(el.dataset.submitOrder, container, $('#mobile-order-sheet [data-order-form]', container)));
  delegate(container, '[data-side]', 'click', (e, el) => {
    const sheet = el.closest('#mobile-order-sheet');
    const form = el.closest('[data-order-form]');
    if (sheet) {
      setMobileSubmitSide(container, el.dataset.side);
      return;
    }
    placeOrder(el.dataset.side, container, form);
  });

  delegate(container, '[data-order-type]', 'change', (e, el) => set('orderType', el.value));
  delegate(container, '[data-market-type]', 'change', (e, el) => {
    set('market', el.value);
    localStorage.setItem('vp_market', el.value);
    updateOrderInfo(container);
  });
  delegate(container, '[data-leverage]', 'input', (e, el) => {
    set('leverage', Number(el.value));
    syncOrderField(container, 'leverage', el.value);
    updateOrderInfo(container);
    // Risk color gradient: green (low) → yellow (mid) → red (high)
    const val = Number(el.value);
    const max = Number(el.max) || 100;
    const pct = val / max;
    const color = pct < 0.3 ? '#00c087' : pct < 0.6 ? '#fcd535' : '#f6465d';
    el.style.accentColor = color;
    const label = container.querySelector('#leverage-label');
    if (label) { label.textContent = val + 'x'; label.style.color = color; }
  });
  delegate(container, '[data-amount]', 'input', (e, el) => {
    set('amount', Number(el.value));
    syncOrderField(container, 'amount', el.value);
    updateOrderInfo(container);
  });
  delegate(container, '[data-close]', 'click', async (e, el) => {
    await closePosition(container, el);
  });
  delegate(container, '[data-cancel-order]', 'click', async (e, el) => {
    await cancelPendingOrder(container, el);
  });
  delegate(container, '[data-edit-order]', 'click', (e, el) => {
    openEditOrderModal(container, el.dataset.editOrder);
  });
  delegate(container, '[data-toggle-activity-expand]', 'click', () => toggleActivityExpand(container));
  delegate(container, '[data-retry-chart]', 'click', () => {
    loadChartData(container, get('symbol'), get('type'), get('tf'), tradeRunId, loadChartLib());
  });
  delegate(container, '[data-activity-tab]', 'click', (_e, el) => {
    container.__tradeActivityTab = el.dataset.activityTab || 'positions';
    renderActivity(container);
  });
  delegate(container, '[data-quick-amount]', 'click', (_e, el) => {
    const value = Number(el.dataset.quickAmount || 0);
    if (!(value > 0)) return;
    set('amount', value);
    syncOrderField(container, 'amount', value);
    updateOrderInfo(container);
  });

  $('#sym-search', container)?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    $$('.symbol-row', container).forEach(row => {
      row.style.display = row.dataset.sym.toLowerCase().includes(term) ? '' : 'none';
    });
  });
}


async function loadChartData(container, symbol, type, tf, runId = tradeRunId, chartReady = loadChartLib()) {
  const chartBox = $('#chart-box', container);
  if (chartBox) chartBox.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>';
  try {
    const candles = await api(`/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&tf=${encodeURIComponent(tf)}&limit=220&fast=1`, { timeout: 3500, cacheTtl: 3000 });
    await chartReady;
    if (!isCurrentRun(runId, symbol, type)) return;
    if (candles?.items?.length) await initChart(container, candles.items, runId);
    else renderChartFallback(container, 'Chart data is still loading from the market provider.');
  } catch (e) {
    if (!isCurrentRun(runId, symbol, type)) return;
    console.error('Chart:', e);
    renderChartFallback(container, 'Chart stream is delayed. Live price and order ticket remain active.');
  }
}

function renderChartFallback(container, message) {
  const box = $('#chart-box', container);
  if (!box) return;
  box.innerHTML = `<div class="chart-fallback-state">
    <div class="chart-fallback-card">
      <strong>Chart loading</strong>
      <span>${esc(message || 'Chart provider is delayed.')}</span>
      <button class="btn-ghost btn-sm" data-retry-chart>Retry chart</button>
    </div>
  </div>`;
}

function toggleActivityExpand(container) {
  const panel = $('#positions-section', container);
  if (!panel) return;
  const open = !panel.classList.contains('is-expanded');
  panel.classList.toggle('is-expanded', open);
  document.body.classList.toggle('trade-activity-expanded-open', open);
  const btn = $('[data-toggle-activity-expand]', container);
  if (btn) {
    btn.setAttribute('aria-label', open ? 'Close trading activity' : 'Expand trading activity');
    btn.setAttribute('title', open ? 'Close trading activity' : 'Expand trading activity');
    btn.innerHTML = open ? icons.close : (icons.fullscreen || icons.expand || '⛶');
  }
  if (chart && !open) setTimeout(() => chart.timeScale?.().fitContent?.(), 80);
}

async function closePosition(container, trigger) {
  const id = String(trigger?.dataset?.close || '');
  if (!id || closingPositions.has(id)) return;
  const confirmed = await showCloseConfirmation(id);
  if (!confirmed) return;

  closingPositions.add(id);
  const related = $$(`[data-close="${escapeCssValue(id)}"]`, container);
  related.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('opacity-60');
    btn.dataset.prevText = btn.textContent;
    btn.textContent = 'Closing...';
  });
  try {
    const res = await api('/trade/close_position.php', { method: 'POST', body: { id, position_id: id, mode: get('mode') }, timeout: 14000 });
    if (res && res.ok === false) throw new Error(res.error || 'Close failed');
    await Promise.allSettled([
      loadTradeActivity(container, tradeRunId),
      api('/wallet/summary.php', { timeout: 0, retry: 1, cacheTtl: 0 }).then((w) => { if (w?.real || w?.demo) set('wallet', { real: w.real || {}, demo: w.demo || {} }); }).catch(() => null),
    ]);
    showTradeToast('Position closed successfully', 'success');
  } catch (e) {
    showTradeToast(e.message || 'Could not close this position now.', 'error');
    related.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
      btn.textContent = btn.dataset.prevText || 'Close';
    });
  } finally {
    closingPositions.delete(id);
  }
}

function findTradeOrder(container, id) {
  const target = String(id || '');
  return (container.__tradeOrders || []).find((order) => orderId(order) === target) || null;
}

async function cancelPendingOrder(container, trigger) {
  const id = String(trigger?.dataset?.cancelOrder || '');
  if (!id) return;
  const confirmed = await showCancelOrderConfirmation(id);
  if (!confirmed) return;

  const related = $$(`[data-cancel-order="${escapeCssValue(id)}"]`, container);
  related.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('opacity-60');
    btn.dataset.prevText = btn.textContent;
    btn.textContent = 'Canceling...';
  });

  try {
    const res = await api('/trade/cancel.php', {
      method: 'POST',
      body: { order_id: id, id, mode: get('mode') },
      timeout: 10000,
    });
    if (res && res.ok === false) throw new Error(res.error || 'Cancel failed');
    await loadTradeActivity(container, tradeRunId);
    showTradeToast('Pending order canceled', 'success');
  } catch (e) {
    showTradeToast(e.message || 'Could not cancel this order.', 'error');
    related.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
      btn.textContent = btn.dataset.prevText || 'Cancel';
    });
  }
}

function showCancelOrderConfirmation(id) {
  return new Promise((resolve) => {
    const existing = document.getElementById('cancel-order-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'cancel-order-modal';
    modal.className = 'fixed inset-0 z-[320] flex items-end sm:items-center justify-center';
    modal.innerHTML = `<div class="absolute inset-0 bg-black/70" data-cancel-order-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">Cancel pending order</h3>
          <p class="mt-1 text-xs text-muted">This only cancels orders that have not executed yet. Open positions must be closed from the position card.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>Keep order</button>
          <button class="btn-danger" data-cancel-order-yes>Cancel order</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const done = (value) => { modal.remove(); resolve(value); };
    modal.querySelector('[data-cancel-order-backdrop]').addEventListener('click', () => done(false));
    modal.querySelector('[data-cancel-order-no]').addEventListener('click', () => done(false));
    modal.querySelector('[data-cancel-order-yes]').addEventListener('click', () => done(true));
  });
}

function openEditOrderModal(container, id) {
  const order = findTradeOrder(container, id);
  if (!order || !isPendingOrder(order)) {
    showTradeToast('This order is no longer pending.', 'error');
    loadTradeActivity(container, tradeRunId, true);
    return;
  }
  const type = orderAssetType(order);
  const existing = document.getElementById('edit-order-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'edit-order-modal';
  modal.className = 'fixed inset-0 z-[320] flex items-end sm:items-center justify-center';
  modal.innerHTML = `<div class="absolute inset-0 bg-black/70" data-edit-order-backdrop></div>
    <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-line">
        <h3 class="text-base font-black">Edit pending order</h3>
        <p class="mt-1 text-xs text-muted">${esc(orderSymbol(order))} ${esc(orderSide(order))} - changes apply before execution only.</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
          <span class="text-[10px] uppercase font-black text-muted">Entry price</span>
          <input class="input" name="entry" inputmode="decimal" value="${escAttr(Number(order.limit_price || order.entry_price || 0) || '')}" placeholder="${escAttr(price(order.limit_price || order.entry_price || 0, type))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">Take profit</span>
            <input class="input" name="tp" inputmode="decimal" value="${escAttr(Number(order.tp_price || 0) || '')}" placeholder="Optional">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">Stop loss</span>
            <input class="input" name="sl" inputmode="decimal" value="${escAttr(Number(order.sl_price || 0) || '')}" placeholder="Optional">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>Cancel</button>
          <button type="submit" class="btn-primary" data-edit-order-save>Save changes</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('[data-edit-order-backdrop]').addEventListener('click', close);
  modal.querySelector('[data-edit-order-close]').addEventListener('click', close);
  modal.querySelector('[data-edit-order-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $('[data-edit-order-status]', form);
    const save = $('[data-edit-order-save]', form);
    const entry = Number(form.entry.value || 0);
    const tp = form.tp.value === '' ? null : Number(form.tp.value || 0);
    const sl = form.sl.value === '' ? null : Number(form.sl.value || 0);
    if (!(entry > 0)) {
      if (status) {
        status.textContent = 'Entry price is required.';
        status.hidden = false;
        status.className = 'order-form-status is-warning';
      }
      return;
    }
    try {
      if (save) {
        save.disabled = true;
        save.textContent = 'Saving...';
      }
      if (status) {
        status.textContent = 'Saving order changes...';
        status.hidden = false;
        status.className = 'order-form-status is-info';
      }
      const res = await api('/trade/update_order.php', {
        method: 'POST',
        body: { order_id: id, limit_price: entry, tp_price: tp, sl_price: sl, mode: get('mode') },
        timeout: 10000,
      });
      if (res && res.ok === false) throw new Error(res.error || 'Update failed');
      close();
      await loadTradeActivity(container, tradeRunId);
      showTradeToast('Pending order updated', 'success');
    } catch (e) {
      if (status) {
        status.textContent = e.message || 'Could not update this order.';
        status.hidden = false;
        status.className = 'order-form-status is-error';
      }
      if (save) {
        save.disabled = false;
        save.textContent = 'Save changes';
      }
    }
  });
}

function escapeCssValue(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function showCloseConfirmation(id) {
  return new Promise((resolve) => {
    const existing = document.getElementById('close-position-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'close-position-modal';
    modal.className = 'fixed inset-0 z-[320] flex items-end sm:items-center justify-center';
    modal.innerHTML = `<div class="absolute inset-0 bg-black/70" data-close-modal-backdrop></div>
      <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line">
          <h3 class="text-base font-black">Close position</h3>
          <p class="mt-1 text-xs text-muted">The position will be closed at the current market price.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>Cancel</button>
          <button class="btn-danger" data-close-confirm>Close now</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const done = (value) => { modal.remove(); resolve(value); };
    modal.querySelector('[data-close-modal-backdrop]').addEventListener('click', () => done(false));
    modal.querySelector('[data-close-cancel]').addEventListener('click', () => done(false));
    modal.querySelector('[data-close-confirm]').addEventListener('click', () => done(true));
  });
}

function showTradeToast(message, type = 'success') {
  let toast = document.getElementById('trade-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'trade-toast';
    toast.className = 'trade-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `trade-toast is-${type}`;
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => toast.classList.remove('is-success', 'is-error'), 2500);
}

async function placeOrder(side, container, formRoot) {
  const root = formRoot || $('[data-order-form]', container) || container;
  showOrderStatus(root, '', 'info');

  const q = get('activeQuote') || {};
  const currentPrice = Number(q.price || 0);
  if (!currentPrice) {
    showOrderStatus(root, 'No live price available yet. Please wait for the quote to load.', 'warning');
    return;
  }

  const amount = Number($('[data-amount]', root)?.value || get('amount') || 0);
  const leverage = Number($('[data-leverage]', root)?.value || get('leverage') || 1);
  const tp = Number($('[data-tp]', root)?.value || 0);
  const sl = Number($('[data-sl]', root)?.value || 0);
  const marketType = $('[data-market-type]', root)?.value || get('market') || 'spot';
  const orderType = $('[data-order-type]', root)?.value || get('orderType') || 'MARKET';
  const limitInput = Number($('[data-limit-price]', root)?.value || 0);

  if (amount <= 0) {
    showOrderStatus(root, 'Enter a valid amount first.', 'warning');
    return;
  }

  if (side === 'BUY' && sl > 0 && sl >= currentPrice) {
    showOrderStatus(root, 'For BUY orders, Stop Loss should be below the current price.', 'warning');
    return;
  }
  if (side === 'SELL' && sl > 0 && sl <= currentPrice) {
    showOrderStatus(root, 'For SELL orders, Stop Loss should be above the current price.', 'warning');
    return;
  }

  // Show confirmation dialog before executing
  const confirmed = await showOrderConfirmation({
    side, symbol: get('symbol'), type: get('type'), amount, leverage,
    tp, sl, marketType, orderType, currentPrice, limitInput, mode: get('mode')
  });
  if (!confirmed) return;

  try {
    setOrderBusy(root, true);
    showOrderStatus(root, `Sending ${side === 'BUY' ? 'buy' : 'sell'} order...`, 'info');
    const res = await api('/trade/place_order.php', {
      method: 'POST',
      body: {
        symbol: get('symbol'),
        asset_type: get('type'),
        market_type: marketType,
        side,
        order_type: orderType,
        usd: amount,
        leverage,
        tp: tp || undefined,
        sl: sl || undefined,
        price: orderType === 'LIMIT' ? (limitInput || currentPrice) : currentPrice,
        mode: get('mode'),
      },
      timeout: 15000,
      retry: 1,
    });
    if (res && res.ok === false) {
      showOrderStatus(root, res.error || 'Order failed', 'error');
      return;
    }
    showOrderStatus(root, `${side === 'BUY' ? 'Buy' : 'Sell'} order opened successfully.`, 'success');
    await loadTradeActivity(container, tradeRunId);
    // Refresh wallet balance immediately after opening trade
    api('/wallet/summary.php', { timeout: 0, retry: 1, cacheTtl: 0 })
      .then((w) => { if (w?.real || w?.demo) set('wallet', { real: w.real || {}, demo: w.demo || {} }); })
      .catch(() => null);
    setTimeout(() => {
      if (root.closest?.('#mobile-order-sheet')) closeOrderSheet(container);
      else showOrderStatus(root, '', 'info');
    }, 900);
  } catch (e) {
    console.error('Order failed:', e);
    showOrderStatus(root, e.message || 'Order failed', 'error');
  } finally {
    setOrderBusy(root, false);
  }
}

/* ── Order Confirmation Dialog ── */
function showOrderConfirmation({ side, symbol, type, amount, leverage, tp, sl, marketType, orderType, currentPrice, limitInput, mode }) {
  return new Promise(resolve => {
    const existing = document.getElementById('order-confirm-modal');
    if (existing) existing.remove();

    const isBuy = side === 'BUY';
    const execPrice = orderType === 'LIMIT' ? (limitInput || currentPrice) : currentPrice;
    const notional = amount * leverage;
    const pnl = tp > 0 ? Math.abs(tp - execPrice) * (notional / execPrice) : null;
    const loss = sl > 0 ? Math.abs(sl - execPrice) * (notional / execPrice) : null;

    const modal = document.createElement('div');
    modal.id = 'order-confirm-modal';
    modal.className = 'fixed inset-0 z-[300] flex items-end sm:items-center justify-center';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/70" id="confirm-backdrop"></div>
      <div class="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-line text-center">
          <h3 class="text-lg font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}">${isBuy ? t('trade.side.buy', 'Buy') : t('trade.side.sell', 'Sell')} ${t('trade.order', 'Order')}</h3>
          <p class="text-xs text-muted mt-1">${t('trade.review_confirm', 'Review and confirm your order')}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.symbol', 'Symbol')}</span><strong>${esc(symbol)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.type', 'Type')}</span><strong>${esc(orderType)} / ${esc(marketType)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.side', 'Side')}</span><strong class="${isBuy ? 'text-green-400' : 'text-red-400'}">${side}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.amount', 'Amount')}</span><strong>$${amount.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.leverage', 'Leverage')}</span><strong>${leverage}x</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.notional', 'Notional')}</span><strong>$${notional.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.price', 'Price')}</span><strong class="font-mono">${parseFloat(execPrice).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>
          ${tp > 0 ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('trade.take_profit', 'Take Profit')}</span><strong class="font-mono text-green-400">${parseFloat(tp).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>` : ''}
          ${sl > 0 ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('trade.stop_loss', 'Stop Loss')}</span><strong class="font-mono text-red-400">${parseFloat(sl).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>` : ''}
          ${pnl !== null ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('trade.est_profit', 'Est. Profit')}</span><strong class="text-green-400">$${pnl.toFixed(2)}</strong></div>` : ''}
          ${loss !== null ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('trade.est_loss', 'Est. Loss')}</span><strong class="text-red-400">$${loss.toFixed(2)}</strong></div>` : ''}
          <div class="flex justify-between text-sm"><span class="text-muted">${t('trade.mode', 'Mode')}</span><strong>${mode === 'real' ? t('mode.real', 'Real') : t('mode.demo', 'Demo')}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${t('common.cancel', 'Cancel')}</button>
          <button class="${isBuy ? 'btn-buy' : 'btn-sell'} py-2.5 text-white font-bold" id="confirm-execute">${t('trade.confirm', 'Confirm')} ${side}</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = (result) => {
      modal.remove();
      document.body.style.overflow = '';
      resolve(result);
    };

    modal.querySelector('#confirm-backdrop').addEventListener('click', () => close(false));
    modal.querySelector('#confirm-cancel').addEventListener('click', () => close(false));
    modal.querySelector('#confirm-execute').addEventListener('click', () => close(true));
    modal.querySelector('#confirm-execute').focus();
  });
}

function showOrderStatus(root, message, type = 'info') {
  const status = $('[data-order-status]', root);
  if (!status) return;
  status.textContent = message || '';
  status.hidden = !message;
  status.className = `order-form-status is-${type}`;
}

function setOrderBusy(root, busy) {
  const scopes = [root, root.closest?.('#mobile-order-sheet')].filter(Boolean);
  const buttons = new Set(scopes.flatMap(scope => $$('[data-side], [data-submit-order]', scope)));
  buttons.forEach(btn => {
    btn.disabled = Boolean(busy);
    btn.classList.toggle('opacity-60', Boolean(busy));
  });
  root.classList.toggle('is-submitting', Boolean(busy));
}

function openMarketDrawer(container) {
  const drawer = $('#market-drawer', container);
  if (!drawer) return;
  drawer.classList.add('mobile-market-open');
  drawer.classList.remove('hidden');
  document.body.classList.add('trade-modal-open');
  const list = $('#symbol-list', container);
  if (list && !list.querySelector('.symbol-row') && !container.__marketDrawerLoading) {
    container.__marketDrawerLoading = true;
    loadMarketItems(get('type'), tradeRunId)
      .then((mkts) => {
        if (mkts?.items) {
          container.__marketItems = mkts.items;
          renderSymbolList(container, mkts.items);
          hydrateActiveFromMarketList(container, mkts.items, tradeRunId);
          warmVisibleQuotes(container, mkts.items, tradeRunId);
        }
      })
      .catch(() => { if (list) list.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>'; })
      .finally(() => { container.__marketDrawerLoading = false; });
  }
}

function closeMarketDrawer(container) {
  const drawer = $('#market-drawer', container);
  if (!drawer) return;
  drawer.classList.remove('mobile-market-open');
  if (window.innerWidth < 1024) drawer.classList.add('hidden');
  document.body.classList.remove('trade-modal-open');
}

function openOrderSheet(container, side) {
  const sheet = $('#mobile-order-sheet', container);
  if (!sheet) return;
  setMobileSubmitSide(container, side);
  sheet.classList.remove('hidden');
  document.body.classList.add('trade-modal-open');
  updateOrderInfo(container);
}

function closeOrderSheet(container) {
  const sheet = $('#mobile-order-sheet', container);
  if (sheet) sheet.classList.add('hidden');
  document.body.classList.remove('trade-modal-open');
}

function setMobileSubmitSide(container, side) {
  const btn = $('#mobile-submit-order', container);
  const label = $('#mobile-order-side-label', container);
  if (btn) {
    btn.dataset.submitOrder = side;
    btn.textContent = `Review & ${side === 'BUY' ? 'Buy' : 'Sell'}`;
    btn.className = `${side === 'BUY' ? 'btn-buy' : 'btn-sell'} w-full py-3`;
  }
  if (label) label.textContent = `${side} order`;
}

function syncOrderField(container, field, value) {
  $$(`[data-${field}]`, container).forEach(input => {
    if (String(input.value) !== String(value)) input.value = value;
  });
}

function updateLiveCandle(priceValue, runId = tradeRunId) {
  if (!isCurrentRun(runId) || !candleSeries || !lastCandle || !(priceValue > 0)) return;
  const bucket = currentBucketTime();
  if (bucket <= lastCandle.time) {
    lastCandle.close = priceValue;
    lastCandle.high = Math.max(lastCandle.high, priceValue);
    lastCandle.low = Math.min(lastCandle.low, priceValue);
  } else {
    lastCandle = { time: bucket, open: lastCandle.close, high: Math.max(lastCandle.close, priceValue), low: Math.min(lastCandle.close, priceValue), close: priceValue, volume: 0 };
  }
  candleSeries.update({ time: lastCandle.time, open: lastCandle.open, high: lastCandle.high, low: lastCandle.low, close: lastCandle.close });
}

function currentBucketTime() {
  const seconds = tfSeconds(get('tf'));
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / seconds) * seconds;
}

function tfSeconds(tf) {
  return ({ '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400 })[tf] || 60;
}

function loadChartLib() {
  if (!chartLibPromise) chartLibPromise = import('lightweight-charts');
  return chartLibPromise;
}

function calcMA(closes, period) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += closes[i - j].close;
    result.push({ time: closes[i].time, value: sum / period });
  }
  return result;
}

function marketListUrl(type) {
  const resolved = normalizeType(type || 'crypto');
  const actual = resolved === 'favorites' ? 'crypto' : resolved;
  return `/markets.php?type=${encodeURIComponent(actual)}&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=36`;
}

async function loadMarketItems(type, runId = tradeRunId, force = false) {
  const resolved = normalizeType(type || 'crypto');
  const key = resolved || 'crypto';
  const cached = marketListCache.get(key);
  const now = Date.now();
  if (!force && cached && cached.expires > now) return cached.data;
  const data = await api(marketListUrl(resolved), { timeout: 12000, cacheTtl: 15000 });
  if (!isCurrentRun(runId)) return data;
  if (data?.items) marketListCache.set(key, { data, expires: Date.now() + 15000 });
  return data;
}

function hydrateActiveFromMarketList(container, items, runId = tradeRunId) {
  const active = String(get('symbol') || '').toUpperCase();
  const item = (items || []).find((m) => String(m.symbol || '').toUpperCase() === active);
  if (!item) return;
  const p = Number(item.price || item.q_price || 0);
  if (p > 0) updatePrice(container, item, runId);
}

function quoteClass(market) {
  const source = String(market?.source || '').toLowerCase();
  const timing = String(market?.timing_class || '').toLowerCase();
  if (timing === 'stale' || timing === 'seed' || market?.is_stale || source.includes('yahoo') || source.includes('seed')) return 'bg-spread';
  return 'bg-buy';
}

function quoteStateLabel(q) {
  const timing = String(q?.timing_class || '').toLowerCase();
  const source = String(q?.source || '').toLowerCase();
  if (Number(q?.price || 0) <= 0) return 'Unavailable';
  if (timing === 'seed' || source.includes('seed')) return 'Reference';
  if (timing === 'stale' || q?.is_stale) return 'Stale';
  if (timing === 'delayed' || source.includes('yahoo') || ['stocks', 'arab'].includes(normalizeType(q?.type || get('type')))) return 'Delayed';
  if (timing === 'candle_fallback') return 'Chart quote';
  return 'Live';
}

function quoteStateClass(label) {
  const value = String(label || '').toLowerCase();
  if (value === 'live') return 'status-chip-live';
  if (value === 'unavailable') return 'status-chip-locked';
  return 'status-chip-delayed';
}

function marketLogo(symbol, type, className) {
  return `<span class="${className} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${escAttr(marketIconPath({ symbol, type }, type))}" class="h-full w-full object-cover" alt="${escAttr(symbol)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${esc(marketInitial(symbol))}</b>
  </span>`;
}
