import { get, set } from '../state/store.js';
import { money, pct, price, esc, escAttr } from '../utils/format.js';
import { $, $$, delegate } from '../utils/dom.js';
import { api } from '../services/api.js';
import { connectSSE, disconnect } from '../services/sse.js';
import { icons } from '../components/common/Icons.js';
import { navigate } from '../router.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';

let chart = null;
let candleSeries = null;
let volumeSeries = null;
let sseClean = null;
let activeQuoteTimer = null;
let activeQuoteController = null;
let resizeObserver = null;
let chartLibPromise = null;
let lastCandle = null;
let tradeRunId = 0;

const TYPES = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'forex', label: 'Forex' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'commodities', label: 'Metals' },
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

      <div class="border-t border-line bg-surface max-h-[185px] lg:max-h-[180px] overflow-auto shrink-0" id="positions-section">
        <div class="flex items-center gap-3 px-3 h-8 border-b border-line sticky top-0 bg-surface z-10">
          <span class="text-[10px] font-semibold text-muted uppercase">Open Positions</span>
          <span class="text-[10px] text-muted" id="pos-count">(0)</span>
        </div>
        <div id="positions-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
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

  return `<div class="space-y-3" data-order-form>
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
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span data-sell-price>${p > 0 ? price(p, get('type')) : '--'}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span data-buy-price>${p > 0 ? price(p * 1.0001, get('type')) : '--'}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" data-spread-val>Spread: --</span></div>
    <label class="block">
      <span class="text-[10px] text-muted">Margin / Amount (USDT)</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${escAttr(String(amt))}" data-amount />
    </label>
    <label class="block">
      <span class="text-[10px] text-muted">Leverage: <strong data-lev-val>${lev}x</strong></span>
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
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span data-est-units>--</span></div>
      <div class="flex justify-between"><span>Est. Notional</span><span data-est-notional>--</span></div>
      <div class="flex justify-between"><span>Available</span><span data-avail-bal>--</span></div>
    </div>
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
        <button class="btn-primary w-full mt-4 py-3" id="mobile-submit-order" data-submit-order="BUY">Review & Place Order</button>
      </div>
    </div>
  </div>`;
}

export function mount(container) {
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

  api(marketListUrl(type), { timeout: 6500 })
    .then(mkts => {
      if (!isCurrentRun(runId, symbol, type)) return;
      if (mkts?.items) {
        renderSymbolList(container, mkts.items);
        warmVisibleQuotes(container, mkts.items, runId);
        startLiveQuotes(container, mkts.items, runId);
      }
    })
    .catch(() => {
      if (!isCurrentRun(runId, symbol, type)) return;
      const list = $('#symbol-list', container);
      if (list) list.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Markets unavailable</p>';
    });

  api('/trade/portfolio.php', { timeout: 5500 })
    .then(portfolio => {
      if (!isCurrentRun(runId, symbol, type)) return;
      if (portfolio?.positions) renderPositions(container, portfolio.positions);
    })
    .catch(() => {
      if (!isCurrentRun(runId, symbol, type)) return;
      const body = $('#positions-body', container);
      if (body) body.innerHTML = '<p class="text-muted text-[11px] text-center py-3">Positions unavailable</p>';
    });

  api(`/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&tf=${encodeURIComponent(tf)}&limit=220`, { timeout: 10000 })
    .then(async candles => {
      await chartReady;
      if (!isCurrentRun(runId, symbol, type)) return;
      if (candles?.items?.length) await initChart(container, candles.items, runId);
      else $('#chart-box', container).innerHTML = '<p class="text-muted text-center p-8 text-xs">Chart data unavailable</p>';
    })
    .catch(e => {
      if (!isCurrentRun(runId, symbol, type)) return;
      console.error('Chart:', e);
      $('#chart-box', container).innerHTML = '<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>';
    });
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
  const max = type === 'crypto' ? 24 : 12;
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
  }, null, { interval: type === 'crypto' ? 5200 : 7200, maxSymbols: max });
}

function startActiveQuote(container, symbol, type, runId = tradeRunId) {
  stopActiveQuote();
  const interval = type === 'crypto' ? 2200 : 3000;
  const poll = async () => {
    if (!isCurrentRun(runId, symbol, type)) return;
    activeQuoteController = new AbortController();
    try {
      const url = `/quotes.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&purpose=focus`;
      const data = await api(url, { timeout: 4500, signal: activeQuoteController.signal });
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
  const visible = items.slice(0, 60);
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
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&fresh=1&purpose=warm`, { timeout: 6500 }).catch(() => null);
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

function renderPositions(container, positions) {
  const body = $('#positions-body', container);
  const count = $('#pos-count', container);
  if (count) count.textContent = `(${positions.length})`;
  if (!body) return;

  if (!positions.length) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-3">No open positions</p>';
    return;
  }

  body.innerHTML = `<div class="overflow-x-auto"><table class="min-w-[620px] lg:min-w-0 w-full text-[11px]">
    <thead class="text-[9px] text-muted uppercase"><tr>
      <th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-left py-1">Type</th><th class="text-right py-1">Entry</th><th class="text-right py-1">Mark</th><th class="text-right py-1">Size</th><th class="text-right py-1">Lev</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
    </tr></thead>
    <tbody>${positions.slice(0, 12).map(pos => {
      const pnl = Number(pos.pnl || pos.unrealized_pnl || 0);
      const cleanSymbol = String(pos.symbol || '').replace('@R@', '');
      const posType = pos.asset_type || get('type');
      const mark = Number(pos.mark_price || pos.current_price || pos.price || 0);
      const id = pos.position_id || pos.id || '';
      return `<tr class="border-t border-line/50 hover:bg-panel/50">
        <td class="px-3 py-1.5 font-semibold">${esc(cleanSymbol)}</td>
        <td><span class="badge-${pos.side === 'BUY' ? 'buy' : 'sell'}">${esc(pos.side)}</span></td>
        <td class="text-muted">${esc(pos.market_type || 'spot')}</td>
        <td class="text-right font-mono">${price(pos.entry_price || pos.open_price, posType)}</td>
        <td class="text-right font-mono">${mark > 0 ? price(mark, posType) : '--'}</td>
        <td class="text-right font-mono">${money(pos.amount || pos.size || pos.units || 0)}</td>
        <td class="text-right font-mono">${esc(String(pos.leverage || 1))}x</td>
        <td class="text-right font-mono ${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</td>
        <td class="text-right px-3">${id ? `<button class="btn-xs btn-ghost text-sell" data-close="${escAttr(id)}">Close</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
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
    const data = await api(marketListUrl(el.dataset.typeTab), { timeout: 6000 }).catch(() => null);
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
  });
  delegate(container, '[data-amount]', 'input', (e, el) => {
    set('amount', Number(el.value));
    syncOrderField(container, 'amount', el.value);
    updateOrderInfo(container);
  });
  delegate(container, '[data-close]', 'click', async (e, el) => {
    await api('/trade/close_position.php', { method: 'POST', body: { position_id: el.dataset.close }, timeout: 8000 }).catch(() => null);
    const data = await api('/trade/portfolio.php', { timeout: 5000 }).catch(() => null);
    if (data?.positions) renderPositions(container, data.positions);
  });

  $('#sym-search', container)?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    $$('.symbol-row', container).forEach(row => {
      row.style.display = row.dataset.sym.toLowerCase().includes(term) ? '' : 'none';
    });
  });
}

async function placeOrder(side, container, formRoot) {
  const q = get('activeQuote') || {};
  const currentPrice = Number(q.price || 0);
  if (!currentPrice) {
    alert('No live price available yet. Please wait for the quote to load.');
    return;
  }

  const root = formRoot || $('[data-order-form]', container) || container;
  const amount = Number($('[data-amount]', root)?.value || get('amount') || 0);
  const leverage = Number($('[data-leverage]', root)?.value || get('leverage') || 1);
  const tp = Number($('[data-tp]', root)?.value || 0);
  const sl = Number($('[data-sl]', root)?.value || 0);
  const marketType = $('[data-market-type]', root)?.value || get('market') || 'spot';
  const orderType = $('[data-order-type]', root)?.value || get('orderType') || 'MARKET';

  if (amount <= 0) {
    alert('Enter a valid amount first.');
    return;
  }

  if (side === 'BUY' && sl > 0 && sl >= currentPrice) {
    alert('For BUY orders, Stop Loss should be below the current price.');
    return;
  }
  if (side === 'SELL' && sl > 0 && sl <= currentPrice) {
    alert('For SELL orders, Stop Loss should be above the current price.');
    return;
  }

  try {
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
        price: currentPrice,
        mode: get('mode'),
      },
      timeout: 10000,
    });
    if (res && res.ok === false) {
      alert(res.error || 'Order failed');
      return;
    }
    closeOrderSheet(container);
    const data = await api('/trade/portfolio.php', { timeout: 5000 }).catch(() => null);
    if (data?.positions) renderPositions(container, data.positions);
  } catch (e) {
    console.error('Order failed:', e);
    alert(e.message || 'Order failed');
  }
}

function openMarketDrawer(container) {
  const drawer = $('#market-drawer', container);
  if (!drawer) return;
  drawer.classList.add('mobile-market-open');
  drawer.classList.remove('hidden');
  document.body.classList.add('trade-modal-open');
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
    btn.className = `${side === 'BUY' ? 'btn-buy' : 'btn-sell'} w-full mt-4 py-3`;
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

function marketListUrl(type) {
  const resolved = normalizeType(type || 'crypto');
  const actual = resolved === 'favorites' ? 'crypto' : resolved;
  return `/markets.php?type=${encodeURIComponent(actual)}&scope=trade&supported=1&lite=1&with_quotes=1`;
}

function quoteClass(market) {
  const source = String(market?.source || '').toLowerCase();
  const timing = String(market?.timing_class || '').toLowerCase();
  if (timing === 'stale' || market?.is_stale || source.includes('yahoo')) return 'bg-spread';
  return 'bg-buy';
}

function marketLogo(symbol, type, className) {
  return `<span class="${className} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${escAttr(marketIconPath({ symbol, type }, type))}" class="h-full w-full object-cover" alt="${escAttr(symbol)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${esc(marketInitial(symbol))}</b>
  </span>`;
}

