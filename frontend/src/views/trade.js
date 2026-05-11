// Trade View - Professional MultiBank-inspired layout
import { get, set } from '../state/store.js';
import { money, pct, price, esc, escAttr } from '../utils/format.js';
import { $, $$, delegate } from '../utils/dom.js';
import { api } from '../services/api.js';
import { connectSSE, disconnect } from '../services/sse.js';
import { icons } from '../components/common/Icons.js';
import { navigate } from '../router.js';

let chart = null, candleSeries = null, volumeSeries = null, sseClean = null;

const TYPES = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'forex', label: 'Forex' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'commodities', label: 'Metals' },
  { key: 'futures', label: 'Futures' },
  { key: 'arab', label: 'Arab' },
];
const TFS = ['1m','5m','15m','30m','1h','4h','1d'];

export function render(params) {
  if (params.symbol) set('symbol', params.symbol.toUpperCase());
  if (params.type) set('type', params.type);
  if (params.tf) set('tf', params.tf);
  const symbol = get('symbol'), type = get('type'), tf = get('tf');

  return `<div class="flex flex-col lg:flex-row h-full mobile-pad">
    <!-- Symbol Sidebar (desktop) -->
    <aside class="hidden lg:flex flex-col w-[240px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="p-2 border-b border-line">
        <div class="relative"><input type="search" class="input pl-7" placeholder="Search..." id="sym-search" /><span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${icons.search}</span></div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${TYPES.map(t => `<button class="btn-xs ${t.key === type ? 'bg-accent/20 text-accent border-accent/40' : 'text-muted border-line'} border rounded-md whitespace-nowrap" data-type-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div class="flex-1 overflow-auto" id="symbol-list"><div class="p-4"><div class="loading-spinner mx-auto"></div></div></div>
    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Symbol Header -->
      <div class="flex items-center justify-between px-3 lg:px-4 h-10 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2">
          <button class="lg:hidden w-7 h-7 grid place-items-center rounded border border-line text-muted" id="mob-mkt-btn">${icons.menu}</button>
          <div class="w-6 h-6 rounded-md bg-accent/20 grid place-items-center text-[9px] font-black text-accent">${esc(symbol.slice(0,3))}</div>
          <strong class="text-sm" id="sym-name">${esc(symbol)}</strong>
          <span class="text-sm font-mono font-bold" id="live-price">--</span>
          <span class="text-xs" id="live-change">+0.00%</span>
          <span class="w-2 h-2 rounded-full bg-muted" id="conn-dot" title="Disconnected"></span>
        </div>
        <div class="flex gap-0.5" id="tf-bar">
          ${TFS.map(t => `<button class="px-1.5 py-0.5 text-[10px] rounded ${t === tf ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'}" data-tf="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <!-- Chart -->
      <div class="flex-1 relative min-h-[200px] bg-bg" id="chart-box">
        <div class="absolute inset-0 flex items-center justify-center"><div class="loading-spinner"></div></div>
      </div>

      <!-- Mobile Buy/Sell -->
      <div class="lg:hidden flex gap-2 p-2 border-t border-line bg-surface">
        <button class="btn-sell flex-1 py-2.5" data-side="SELL">SELL</button>
        <button class="btn-buy flex-1 py-2.5" data-side="BUY">BUY</button>
      </div>

      <!-- Positions (below chart on desktop) -->
      <div class="hidden lg:block border-t border-line bg-surface max-h-[180px] overflow-auto" id="positions-section">
        <div class="flex items-center gap-3 px-3 h-8 border-b border-line">
          <span class="text-[10px] font-semibold text-muted uppercase">Open Positions</span>
          <span class="text-[10px] text-muted" id="pos-count">(0)</span>
        </div>
        <div id="positions-body"><p class="text-muted text-[11px] text-center py-4">Loading...</p></div>
      </div>
    </div>

    <!-- Order Panel (desktop) -->
    <aside class="hidden lg:flex flex-col w-[280px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order</div>
        <div class="text-[10px] text-muted">${esc(symbol)} - ${esc(type.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${renderOrderPanel()}
      </div>
    </aside>
  </div>`;
}

function renderOrderPanel() {
  const ot = get('orderType'), amt = get('amount'), lev = get('leverage');
  const q = get('activeQuote') || {};
  const p = Number(q.price || 0);
  return `
    <div class="flex rounded overflow-hidden border border-line">
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${ot==='MARKET'?'bg-accent/15 text-accent':'text-muted'}" data-otype="MARKET">Market</button>
      <button class="flex-1 py-1.5 text-[11px] font-semibold ${ot==='LIMIT'?'bg-accent/15 text-accent':'text-muted'}" data-otype="LIMIT">Limit</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell py-3 text-sm font-bold" data-side="SELL"><small class="block text-[9px] opacity-70">Sell</small><span id="sell-price">${p>0?price(p,get('type')):'--'}</span></button>
      <button class="btn-buy py-3 text-sm font-bold" data-side="BUY"><small class="block text-[9px] opacity-70">Buy</small><span id="buy-price">${p>0?price(p,get('type')):'--'}</span></button>
    </div>
    <div class="text-center"><span class="spread-display" id="spread-val">Spread: --</span></div>
    <label class="block"><span class="text-[10px] text-muted">Amount (USDT)</span><input type="number" class="input mt-1" value="${amt}" id="inp-amount" /></label>
    <label class="block"><span class="text-[10px] text-muted">Leverage: <strong id="lev-val">${lev}x</strong></span><input type="range" min="1" max="100" value="${lev}" class="w-full mt-1 accent-accent" id="inp-lev" /></label>
    <div class="space-y-1 text-[10px] text-muted pt-2 border-t border-line">
      <div class="flex justify-between"><span>Est. Units</span><span id="est-units">--</span></div>
      <div class="flex justify-between"><span>Available</span><span id="avail-bal">--</span></div>
    </div>`;
}

export function mount(container) { setup(container); }
export function cleanup() {
  if (chart) { chart.remove(); chart = null; candleSeries = null; volumeSeries = null; }
  if (sseClean) { sseClean(); sseClean = null; }
  disconnect();
}

async function setup(container) {
  const symbol = get('symbol'), type = get('type'), tf = get('tf');

  const [mkts, quote, candles, portfolio] = await Promise.all([
    api(`/markets.php?type=${type}&lite=1&with_quotes=1`, {timeout:8000}).catch(()=>null),
    api(`/quotes.php?symbol=${symbol}&type=${type}&purpose=focus`, {timeout:5000}).catch(()=>null),
    api(`/trade/candles.php?symbol=${symbol}&type=${type}&tf=${tf}&limit=200`, {timeout:10000}).catch(()=>null),
    api('/trade/portfolio.php', {timeout:6000}).catch(()=>null),
  ]);

  if (quote?.items?.[0]) updatePrice(container, quote.items[0]);
  if (mkts?.items) renderSymbolList(container, mkts.items);
  if (portfolio?.positions) renderPositions(container, portfolio.positions);
  updateOrderInfo(container);

  try { if (candles?.items?.length) await initChart(container, candles.items); }
  catch(e) { console.error('Chart:', e); $('#chart-box', container).innerHTML = '<p class="text-muted text-center p-8 text-xs">Chart unavailable</p>'; }

  // Live price stream
  sseClean = connectSSE([symbol], type, (items) => {
    const q = items.find(i => i.symbol === symbol);
    if (q) updatePrice(container, q);
    $('#conn-dot', container)?.classList.replace('bg-muted', 'bg-buy');
  });

  bindEvents(container);
}

function updatePrice(container, q) {
  const p = Number(q.price || 0), chg = Number(q.change_pct || 0);
  const t = get('type');
  set('activeQuote', q);
  const lp = $('#live-price', container), lc = $('#live-change', container);
  if (lp) lp.textContent = p > 0 ? price(p, t) : '--';
  if (lc) { lc.textContent = pct(chg); lc.className = `text-xs ${chg >= 0 ? 'text-buy' : 'text-sell'}`; }
  $('#sell-price', container) && ($('#sell-price', container).textContent = price(p, t));
  $('#buy-price', container) && ($('#buy-price', container).textContent = price(p * 1.0001, t));
  updateOrderInfo(container);
}

function updateOrderInfo(container) {
  const q = get('activeQuote') || {}, p = Number(q.price || 0);
  const amt = Number($('#inp-amount', container)?.value || get('amount'));
  const lev = Number($('#inp-lev', container)?.value || get('leverage'));
  const w = get('wallet') || {};
  const wallet = get('mode') === 'real' ? (w.real || {}) : (w.demo || {});
  const units = p > 0 ? ((amt * lev) / p) : 0;
  const el = $('#est-units', container); if (el) el.textContent = units > 0 ? units.toFixed(4) : '--';
  const ab = $('#avail-bal', container); if (ab) ab.textContent = `${money(wallet.available || 0)} ${wallet.currency || ''}`;
}

function renderSymbolList(container, items) {
  const list = $('#symbol-list', container);
  if (!list) return;
  const active = get('symbol');
  list.innerHTML = items.slice(0, 40).map(m => {
    const p = Number(m.price || m.q_price || 0), chg = Number(m.change_pct || m.q_change || 0);
    return `<div class="symbol-row ${m.symbol === active ? 'active' : ''}" data-sym="${escAttr(m.symbol)}" data-stype="${escAttr(m.type||get('type'))}">
      <div class="w-6 h-6 rounded bg-panel grid place-items-center text-[8px] font-black">${esc(m.symbol.slice(0,3))}</div>
      <div class="flex-1 min-w-0"><div class="font-semibold text-[11px] truncate">${esc(m.symbol)}</div><div class="text-[9px] text-muted truncate">${esc(m.name||'')}</div></div>
      <div class="text-right shrink-0"><div class="text-[11px] font-mono">${p>0?price(p,m.type):'--'}</div><div class="text-[9px] ${chg>=0?'text-buy':'text-sell'}">${pct(chg)}</div></div>
    </div>`;
  }).join('');
}

function renderPositions(container, positions) {
  const body = $('#positions-body', container), cnt = $('#pos-count', container);
  if (cnt) cnt.textContent = `(${positions.length})`;
  if (!body) return;
  if (!positions.length) { body.innerHTML = '<p class="text-muted text-[11px] text-center py-3">No open positions</p>'; return; }
  body.innerHTML = `<table class="w-full text-[11px]"><thead class="text-[9px] text-muted uppercase"><tr><th class="text-left px-3 py-1">Symbol</th><th class="text-left py-1">Side</th><th class="text-right py-1">Entry</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th></tr></thead><tbody>${positions.slice(0,10).map(p => {
    const pnl = Number(p.pnl||p.unrealized_pnl||0);
    return `<tr class="border-t border-line/50 hover:bg-panel/50"><td class="px-3 py-1.5 font-semibold">${esc(p.symbol)}</td><td><span class="badge-${p.side==='BUY'?'buy':'sell'}">${p.side}</span></td><td class="text-right font-mono">${price(p.entry_price||p.open_price)}</td><td class="text-right font-mono ${pnl>=0?'text-buy':'text-sell'}">${money(pnl)}</td><td class="text-right px-3"><button class="btn-xs btn-ghost text-sell" data-close="${p.id}">Close</button></td></tr>`;
  }).join('')}</tbody></table>`;
}

async function initChart(container, candles) {
  const el = $('#chart-box', container);
  if (!el) return;
  const { createChart } = await import('lightweight-charts');
  el.innerHTML = '';
  chart = createChart(el, {
    layout: { background: { color: '#060A14' }, textColor: '#8ba1cf', fontSize: 11 },
    grid: { vertLines: { color: 'rgba(129,160,220,0.04)' }, horzLines: { color: 'rgba(129,160,220,0.04)' } },
    crosshair: { mode: 0, vertLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff' }, horzLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff' } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(129,160,220,0.08)' },
    rightPriceScale: { borderColor: 'rgba(129,160,220,0.08)' },
    width: el.clientWidth, height: el.clientHeight,
  });
  candleSeries = chart.addCandlestickSeries({ upColor: '#00c087', downColor: '#f6465d', borderUpColor: '#00c087', borderDownColor: '#f6465d', wickUpColor: '#00c087', wickDownColor: '#f6465d' });
  volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

  const data = candles.map(c => ({ time: Number(c.time||c.t), open: Number(c.open||c.o), high: Number(c.high||c.h), low: Number(c.low||c.l), close: Number(c.close||c.c) })).filter(c => c.time > 0 && c.open > 0);
  candleSeries.setData(data);
  volumeSeries.setData(data.map(c => ({ time: c.time, value: Number(candles.find(x=>(x.time||x.t)==c.time)?.volume||candles.find(x=>(x.time||x.t)==c.time)?.v||0), color: c.close >= c.open ? 'rgba(0,192,135,0.25)' : 'rgba(246,70,93,0.2)' })));
  chart.timeScale().fitContent();
  new ResizeObserver(() => chart?.applyOptions({ width: el.clientWidth, height: el.clientHeight })).observe(el);
}

function bindEvents(container) {
  var mobBtn = container.querySelector('#mob-mkt-btn');
  if (mobBtn) mobBtn.addEventListener('click', function() {
    var aside = container.querySelector('aside');
    if (!aside) return;
    if (aside.classList.contains('hidden')) { aside.classList.remove('hidden'); aside.style.cssText = 'position:fixed;inset:0;z-index:200;width:100%;background:#0b1426;display:flex;flex-direction:column;'; }
    else { aside.classList.add('hidden'); aside.style.cssText = ''; }
  });
  delegate(container, '[data-sym]', 'click', (e, el) => { navigate('trade', { symbol: el.dataset.sym, type: el.dataset.stype || get('type') }); });
  delegate(container, '[data-tf]', 'click', (e, el) => { set('tf', el.dataset.tf); localStorage.setItem('vp_tf', el.dataset.tf); navigate('trade', { symbol: get('symbol'), type: get('type'), tf: el.dataset.tf }); });
  delegate(container, '[data-type-tab]', 'click', async (e, el) => {
    set('type', el.dataset.typeTab); localStorage.setItem('vp_type', el.dataset.typeTab);
    const data = await api(`/markets.php?type=${el.dataset.typeTab}&lite=1&with_quotes=1`, {timeout:6000}).catch(()=>null);
    if (data?.items) renderSymbolList(container, data.items);
    $$('[data-type-tab]', container).forEach(b => b.classList.toggle('bg-accent/20', b===el));
    $$('[data-type-tab]', container).forEach(b => b.classList.toggle('text-accent', b===el));
  });
  delegate(container, '[data-side]', 'click', (e, el) => placeOrder(el.dataset.side, container));
  delegate(container, '[data-otype]', 'click', (e, el) => { set('orderType', el.dataset.otype); $$('[data-otype]', container).forEach(b => { b.classList.toggle('bg-accent/15', b===el); b.classList.toggle('text-accent', b===el); }); });
  delegate(container, '[data-close]', 'click', async (e, el) => { await api('/trade/close_position.php', { method:'POST', body:{position_id:el.dataset.close}, timeout:8000 }).catch(()=>null); setup(container); });
  $('#inp-lev', container)?.addEventListener('input', e => { const v = e.target.value; set('leverage', Number(v)); $('#lev-val', container).textContent = v + 'x'; updateOrderInfo(container); });
  $('#inp-amount', container)?.addEventListener('input', e => { set('amount', Number(e.target.value)); updateOrderInfo(container); });
  $('#sym-search', container)?.addEventListener('input', e => { const term = e.target.value.toLowerCase(); $$('.symbol-row', container).forEach(r => r.style.display = r.dataset.sym.toLowerCase().includes(term)?'':'none'); });
}

async function placeOrder(side, container) {
  const q = get('activeQuote') || {};
  if (!q.price) return;
  try {
    await api('/trade/place_order.php', { method: 'POST', body: { symbol: get('symbol'), type: get('type'), market: get('market'), side, order_type: get('orderType'), amount: get('amount'), leverage: get('leverage'), price: q.price }, timeout: 10000 });
    // Refresh positions
    const data = await api('/trade/portfolio.php', {timeout:5000}).catch(()=>null);
    if (data?.positions) renderPositions(container, data.positions);
  } catch(e) { console.error('Order failed:', e); }
}
