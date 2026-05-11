// Trade View - Chart + Order Ticket + Watchlist
import { get, set, subscribe } from '../state/store.js';
import { money, pct, price, esc, escAttr } from '../utils/format.js';
import { $, delegate } from '../utils/dom.js';
import { api } from '../services/api.js';
import { connectSSE, disconnect } from '../services/sse.js';
import { icons } from '../components/common/Icons.js';

let chartInstance = null;
let sseCleanup = null;

export function render(params) {
  if (params.symbol) set('symbol', params.symbol.toUpperCase());
  if (params.type) set('type', params.type);
  if (params.tf) set('tf', params.tf);

  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');
  const isMobile = window.innerWidth < 768;

  if (isMobile) return renderMobileTrade(symbol, type, tf);
  return renderDesktopTrade(symbol, type, tf);
}

function renderDesktopTrade(symbol, type, tf) {
  return `
    <div class="grid grid-cols-[280px_1fr_320px] gap-4 h-[calc(100vh-120px)] animate-fade-in">
      <!-- Watchlist -->
      <aside class="card overflow-hidden flex flex-col">
        <div class="p-3 border-b border-line space-y-2">
          <div class="flex gap-1 overflow-x-auto pb-1" id="market-tabs"></div>
          <div class="relative">
            <input type="search" class="input text-xs pl-8" placeholder="Search symbols" id="market-search" />
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${icons.search}</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1" id="watchlist"></div>
      </aside>

      <!-- Chart -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-3 border-b border-line">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[10px] font-black" id="chart-logo">${esc(symbol.slice(0, 3))}</div>
            <div>
              <strong class="text-sm" id="chart-symbol">${esc(symbol)}</strong>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-base font-mono font-bold" id="chart-price">--</span>
                <span class="text-xs" id="chart-change">+0.00%</span>
              </div>
            </div>
          </div>
          <div class="flex gap-1" id="tf-buttons">
            ${['1m','5m','15m','30m','1h'].map((t) => `<button class="px-2 py-1 text-[11px] rounded-md border ${t === tf ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-text'}" data-tf="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="flex-1 relative min-h-[300px]" id="chart-container">
          <div class="absolute inset-0 grid place-items-center"><div class="skeleton w-full h-full rounded"></div></div>
        </div>
      </div>

      <!-- Order Ticket -->
      <aside class="card overflow-hidden flex flex-col">
        <div class="p-3 border-b border-line">
          <h3 class="font-semibold text-sm">Order Ticket</h3>
          <p class="text-[11px] text-muted">${esc(symbol)} - ${esc(type.toUpperCase())}</p>
        </div>
        <div class="flex-1 p-3 space-y-3" id="order-panel">
          ${orderTicketHTML()}
        </div>
      </aside>
    </div>`;
}

function renderMobileTrade(symbol, type, tf) {
  return `
    <div class="space-y-3 animate-fade-in -mx-4 -mt-4">
      <!-- Price Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-panel border-b border-line">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-green/20 grid place-items-center text-[10px] font-black">${esc(symbol.slice(0, 3))}</div>
          <div>
            <strong class="text-sm" id="chart-symbol">${esc(symbol)}</strong>
            <div class="flex items-center gap-2"><span class="text-sm font-mono font-bold" id="chart-price">--</span><span class="text-[11px]" id="chart-change">+0.00%</span></div>
          </div>
        </div>
        <div class="flex gap-1 overflow-x-auto" id="tf-buttons">
          ${['1m','5m','15m','1h'].map((t) => `<button class="px-2 py-1 text-[10px] rounded border ${t === tf ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}" data-tf="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <!-- Chart -->
      <div class="relative h-[55vh] bg-panel" id="chart-container">
        <div class="absolute inset-0 grid place-items-center"><div class="skeleton w-full h-full"></div></div>
      </div>

      <!-- Buy/Sell -->
      <div class="grid grid-cols-2 gap-3 px-4">
        <button class="btn bg-red text-white font-bold py-3 rounded-lg" data-side="SELL">Sell ${esc(symbol)}</button>
        <button class="btn bg-green text-white font-bold py-3 rounded-lg" data-side="BUY">Buy ${esc(symbol)}</button>
      </div>

      <!-- Positions -->
      <div class="px-4 pb-24" id="trade-positions">
        <p class="text-muted text-xs text-center py-4">Loading positions...</p>
      </div>
    </div>`;
}

function orderTicketHTML() {
  const orderType = get('orderType');
  const amount = get('amount');
  const leverage = get('leverage');
  return `
    <div class="flex rounded-lg overflow-hidden border border-line">
      <button class="flex-1 py-2 text-xs font-semibold ${orderType === 'MARKET' ? 'bg-accent-soft text-accent' : 'text-muted'}" data-order-type="MARKET">Market</button>
      <button class="flex-1 py-2 text-xs font-semibold ${orderType === 'LIMIT' ? 'bg-accent-soft text-accent' : 'text-muted'}" data-order-type="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <button class="btn bg-red/90 text-white font-bold py-3" data-side="SELL">SELL</button>
      <button class="btn bg-green/90 text-white font-bold py-3" data-side="BUY">BUY</button>
    </div>
    <label class="block"><span class="text-[11px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${amount}" id="order-amount" /></label>
    <label class="block"><span class="text-[11px] text-muted">Leverage</span><input type="range" min="1" max="100" value="${leverage}" class="w-full mt-1" id="order-leverage" /><span class="text-xs text-accent" id="lev-label">${leverage}x</span></label>
    <div class="pt-2 border-t border-line text-[11px] text-muted space-y-1">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="wallet-avail">--</span></div>
    </div>`;
}

export function mount(container, params) {
  setupTrade(container);
}

export function cleanup() {
  if (chartInstance) { chartInstance.remove(); chartInstance = null; }
  if (sseCleanup) { sseCleanup(); sseCleanup = null; }
  disconnect();
}

async function setupTrade(container) {
  const symbol = get('symbol');
  const type = get('type');

  // Load markets, quotes, candles in parallel
  const [marketsData, quoteData, candlesData] = await Promise.all([
    api(`/markets.php?type=${type}&lite=1&with_quotes=1`, { timeout: 8000 }).catch(() => null),
    api(`/quotes.php?symbol=${symbol}&type=${type}&purpose=focus`, { timeout: 5000 }).catch(() => null),
    api(`/trade/candles.php?symbol=${symbol}&type=${type}&tf=${get('tf')}&limit=180`, { timeout: 10000 }).catch(() => null),
  ]);

  // Update quote UI
  if (quoteData && quoteData.items && quoteData.items[0]) {
    updateQuoteUI(container, quoteData.items[0]);
  }

  // Render watchlist
  if (marketsData && marketsData.items) {
    renderWatchlist(container, marketsData.items);
  }

  // Init chart
  if (candlesData && candlesData.items) {
    initChart(container, candlesData.items);
  }

  // Connect SSE for live prices
  const symbols = [symbol];
  sseCleanup = connectSSE(symbols, type, (quotes) => {
    const q = quotes.find((item) => item.symbol === symbol);
    if (q) updateQuoteUI(container, q);
  });

  // Bind events
  bindTradeEvents(container);
}

function updateQuoteUI(container, q) {
  const priceEl = container.querySelector('#chart-price');
  const changeEl = container.querySelector('#chart-change');
  if (priceEl) priceEl.textContent = price(q.price, q.type || get('type'));
  if (changeEl) {
    const chg = Number(q.change_pct || 0);
    changeEl.textContent = pct(chg);
    changeEl.className = `text-xs ${chg >= 0 ? 'text-green' : 'text-red'}`;
  }
  set('activeQuote', q);
}

function renderWatchlist(container, items) {
  const list = container.querySelector('#watchlist');
  if (!list) return;
  list.innerHTML = items.slice(0, 30).map((m) => {
    const active = m.symbol === get('symbol');
    return `<button class="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${active ? 'bg-accent-soft border border-accent/40' : 'hover:bg-panel-2 border border-transparent'}" data-watch="${escAttr(m.symbol)}" data-type="${escAttr(m.type || get('type'))}">
      <div class="w-7 h-7 rounded-lg bg-panel-2 grid place-items-center text-[9px] font-black">${esc((m.symbol || '').slice(0, 3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold truncate">${esc(m.symbol)}</div><div class="text-[10px] text-muted truncate">${esc(m.name || '')}</div></div>
      <div class="text-right"><div class="font-mono">${price(m.price || m.q_price || 0, m.type)}</div><div class="${Number(m.change_pct || m.q_change || 0) >= 0 ? 'text-green' : 'text-red'}">${pct(m.change_pct || m.q_change || 0)}</div></div>
    </button>`;
  }).join('');
}

async function initChart(container, candles) {
  const el = container.querySelector('#chart-container');
  if (!el) return;
  const { createChart, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');
  el.innerHTML = '';
  const chart = createChart(el, {
    layout: { background: { color: '#071126' }, textColor: '#8ba1cf' },
    grid: { vertLines: { color: 'rgba(129,160,220,0.05)' }, horzLines: { color: 'rgba(129,160,220,0.05)' } },
    crosshair: { mode: 0, vertLine: { color: 'rgba(93,124,255,0.4)' }, horzLine: { color: 'rgba(93,124,255,0.4)' } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(129,160,220,0.1)' },
    rightPriceScale: { borderColor: 'rgba(129,160,220,0.1)' },
    width: el.clientWidth,
    height: el.clientHeight,
  });

  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#24d28d', downColor: '#ff5c7c',
    borderUpColor: '#24d28d', borderDownColor: '#ff5c7c',
    wickUpColor: '#24d28d', wickDownColor: '#ff5c7c',
  });

  const volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'vol',
  });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

  const formatted = candles.map((c) => ({
    time: Number(c.time || c.t),
    open: Number(c.open || c.o),
    high: Number(c.high || c.h),
    low: Number(c.low || c.l),
    close: Number(c.close || c.c),
  })).filter((c) => c.time > 0 && c.open > 0);

  candleSeries.setData(formatted);
  volumeSeries.setData(formatted.map((c) => ({
    time: c.time,
    value: Number(candles.find((x) => (x.time || x.t) == c.time)?.volume || candles.find((x) => (x.time || x.t) == c.time)?.v || 0),
    color: c.close >= c.open ? 'rgba(36,210,141,0.3)' : 'rgba(255,92,124,0.25)',
  })));

  chart.timeScale().fitContent();
  chartInstance = chart;

  // Responsive resize
  const ro = new ResizeObserver(() => { chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }); });
  ro.observe(el);
}

function bindTradeEvents(container) {
  delegate(container, '[data-watch]', 'click', (e, el) => {
    const { navigate } = import('../router.js');
    navigate('trade', { symbol: el.dataset.watch, type: el.dataset.type || get('type') });
  });
  delegate(container, '[data-tf]', 'click', (e, el) => {
    set('tf', el.dataset.tf);
    localStorage.setItem('vp_tf', el.dataset.tf);
    // reload candles
    setupTrade(container);
  });
  delegate(container, '[data-side]', 'click', (e, el) => {
    // TODO: Place order
    console.log('Order:', el.dataset.side, get('symbol'));
  });
}
