import { get, set } from '../state/store.js';
import { money, qty, pct, price, esc, escAttr } from '../utils/format.js';
import { $, $$, delegate } from '../utils/dom.js';
import { api, clearCacheFor } from '../services/api.js';
import { connectSSE, disconnect } from '../services/sse.js';
import { icons } from '../components/common/Icons.js';
import { navigate } from '../router.js';
import { marketIconPath, marketInitial } from '../utils/marketIcon.js';
import { t } from '../utils/i18n.js';
import { trySwitchToReal } from '../utils/gates.js';

let chart = null;
let candleSeries = null;
let volumeSeries = null;
let ma7Series = null;
let ma25Series = null;
let lineSeries = null;
let areaSeries = null;
let ema20Series = null;
let bollUpperSeries = null;
let bollMidSeries = null;
let bollLowerSeries = null;
let rsiSeries = null;
let rsiRefLine30 = null;
let rsiRefLine70 = null;
let macdSeries = null;
let macdSignalSeries = null;
let macdHistSeries = null;
let stochKSeries = null;
let stochDSeries = null;
let chartLegendEl = null;
let chartSeriesKey = '';          // `${SYMBOL}|${TYPE}|${MARKET}|${tf}` the rendered series belongs to
let allCandles = [];              // full merged dataset for the current key (oldest -> newest)
let chartHistory = { loading: false, done: false, nextAt: 0 };
let chartType = (() => { try { return localStorage.getItem('vp_chart_type') || 'candles'; } catch (_e) { return 'candles'; } })();
let chartIndicators = (() => {
  try { return Object.assign({ ma: true, ema: false, boll: false, rsi: false, macd: false, stoch: false }, JSON.parse(localStorage.getItem('vp_chart_ind') || '{}')); }
  catch (_e) { return { ma: true, ema: false, boll: false, rsi: false, macd: false, stoch: false }; }
})();
let lastFlashPrice = 0;
let sseClean = null;
let activeQuoteTimer = null;
let activeQuoteController = null;
let activityRefreshTimer = null;
let chartRefreshTimer = null;
let resizeObserver = null;
let binanceWs = null;
let binanceKlineWs = null;
let chartLibPromise = null;
let lastCandle = null;
let liveCandleFrame = 0;
let pendingLiveCandle = null;
let chartDataController = null;
let chartDataRequestSeq = 0;
let chartReconcileTimer = 0;
let orderInfoFrame = 0;
let lastPriceFlashAt = 0;
let tradeRunId = 0;
const marketListCache = new Map();
const chartCandleCache = new Map();
let chartPriceLines = { live: null, series: null };
const closingPositions = new Set();

function safeChartOp(fn) {
  try { return fn(); } catch (_e) { return null; }
}

// Listeners bound to the persistent #view container must be disposed on cleanup,
// otherwise they accumulate on every navigation back to the trade page.
let eventDisposers = [];
// Snapshot of the active run so polling/SSE can be paused/resumed on tab visibility.
let currentSetup = null;
function bindDelegate(container, selector, event, handler) {
  eventDisposers.push(delegate(container, selector, event, handler));
}

function getTypes() {
  return [
    { key: 'favorites', label: t('market.type.favorites', 'Ø§Ù„Ù…ÙØ¶Ù„Ø©') },
    { key: 'crypto', label: t('markets.crypto', 'Ø§Ù„ÙƒØ±ÙŠØ¨ØªÙˆ') },
    { key: 'forex', label: t('markets.fx', 'Ø§Ù„ÙÙˆØ±ÙƒØ³') },
    { key: 'stocks', label: t('markets.stocks', 'Ø§Ù„Ø£Ø³Ù‡Ù…') },
    { key: 'commodities', label: t('markets.commodities', 'Ø§Ù„Ø³Ù„Ø¹') },
    { key: 'futures', label: t('market.type.futures', 'Ø§Ù„Ø¹Ù‚ÙˆØ¯ Ø§Ù„Ø¢Ø¬Ù„Ø©') },
    { key: 'arab', label: t('markets.arab_stocks', 'Ø§Ù„Ø£Ø³Ù‡Ù… Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©') },
  ];
}


const FALLBACK_MARKETS = {
  crypto: [
    ['BTCUSDT', 'Bitcoin / Tether'], ['ETHUSDT', 'Ethereum / Tether'], ['BNBUSDT', 'BNB / Tether'],
    ['SOLUSDT', 'Solana / Tether'], ['XRPUSDT', 'XRP / Tether'], ['ADAUSDT', 'Cardano / Tether'],
    ['DOGEUSDT', 'Dogecoin / Tether'], ['AVAXUSDT', 'Avalanche / Tether'], ['TRXUSDT', 'TRON / Tether'], ['LINKUSDT', 'Chainlink / Tether'],
  ],
  forex: [
    ['EURUSD', 'Euro / US Dollar'], ['GBPUSD', 'British Pound / US Dollar'], ['USDJPY', 'US Dollar / Japanese Yen'],
    ['USDCHF', 'US Dollar / Swiss Franc'], ['AUDUSD', 'Australian Dollar / US Dollar'], ['USDCAD', 'US Dollar / Canadian Dollar'],
    ['NZDUSD', 'New Zealand Dollar / US Dollar'], ['EURGBP', 'Euro / British Pound'], ['EURJPY', 'Euro / Japanese Yen'], ['GBPJPY', 'British Pound / Japanese Yen'],
  ],
  stocks: [
    ['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft Corp.'], ['NVDA', 'NVIDIA Corp.'], ['TSLA', 'Tesla Inc.'],
    ['AMZN', 'Amazon.com Inc.'], ['GOOGL', 'Alphabet Inc.'], ['META', 'Meta Platforms'], ['NFLX', 'Netflix Inc.'],
  ],
  commodities: [
    ['XAUUSD', 'Gold Spot / US Dollar'], ['XAGUSD', 'Silver Spot / US Dollar'], ['USOIL', 'US Oil'], ['UKOIL', 'Brent Oil'],
    ['XPTUSD', 'Platinum Spot / US Dollar'], ['XPDUSD', 'Palladium Spot / US Dollar'], ['GAUUSD', 'Gold Gram / US Dollar'], ['GAUIDR', 'Gold Gram / Indonesian Rupiah'],
    ['XAUEUR', 'Gold Spot / Euro'], ['XAUGBP', 'Gold Spot / Pound'], ['XAUJPY', 'Gold Spot / Yen'], ['XAUAUD', 'Gold Spot / Australian Dollar'],
    ['XAUXAG', 'Gold / Silver Ratio'], ['XAGEUR', 'Silver Spot / Euro'], ['XAGGBP', 'Silver Spot / Pound'], ['XAGGUSD', 'Silver Gram / US Dollar'], ['URALS', 'Urals Crude Oil'],
  ],
  futures: [],
  arab: [
    ['2222', 'Saudi Aramco'], ['1120', 'Al Rajhi Bank'], ['2010', 'SABIC'], ['7010', 'stc'], ['1211', 'Maaden'], ['1150', 'Alinma Bank'],
  ],
};

const TFS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '12h', '1d', '1w'];
const CHART_HISTORY_DAYS = 31;
const CHART_MIN_INITIAL_LIMIT = 300;
const CHART_MAX_INITIAL_LIMIT = 5000;
const CHART_MAX_PAGE_LIMIT = 5000;
const CHART_MONTH_PREFETCH_MAX_PAGES = 10;
const CHART_MONTH_PREFETCH_DELAY = 750;
const CHART_PROVIDER_FRESH_TFS = ['1m', '3m', '5m', '15m'];
const CHART_NONCRYPTO_FRESH_LIMIT = 600;
const CHART_NONCRYPTO_FAST_PAGE_LIMIT = 1200;
const CHART_FAST_INITIAL_TFS = ['1m', '3m', '5m', '15m'];
const CHART_CRYPTO_FAST_INITIAL_LIMIT = 300;
const CHART_CANDLE_CACHE_MAX = 36;

function chartTargetBars(tf) {
  return Math.max(CHART_MIN_INITIAL_LIMIT, Math.ceil((CHART_HISTORY_DAYS * 86400) / Math.max(60, tfSeconds(tf))));
}

function chartInitialLimit(tf) {
  return Math.max(CHART_MIN_INITIAL_LIMIT, Math.min(CHART_MAX_INITIAL_LIMIT, chartTargetBars(tf)));
}

function chartPageLimit(tf) {
  return Math.max(CHART_MIN_INITIAL_LIMIT, Math.min(CHART_MAX_PAGE_LIMIT, chartTargetBars(tf)));
}

function chartPageLimitFor(type, tf) {
  if (usesFreshProviderWindow(type, tf)) return Math.min(CHART_NONCRYPTO_FAST_PAGE_LIMIT, chartPageLimit(tf));
  return chartPageLimit(tf);
}

function usesFreshProviderWindow(type, tf) {
  return normalizeType(type || 'crypto') !== 'crypto' && CHART_PROVIDER_FRESH_TFS.includes(String(tf || '').toLowerCase());
}

function chartInitialLimitFor(type, tf) {
  if (usesFreshProviderWindow(type, tf)) return CHART_NONCRYPTO_FRESH_LIMIT;
  if (normalizeType(type || 'crypto') === 'crypto' && CHART_FAST_INITIAL_TFS.includes(String(tf || '').toLowerCase())) {
    return CHART_CRYPTO_FAST_INITIAL_LIMIT;
  }
  return chartInitialLimit(tf);
}

function defaultMarketForType(type) {
  return normalizeType(type) === 'futures' ? 'perp' : 'spot';
}

function normalizeMarketForType(type, market) {
  const normalizedType = normalizeType(type || 'crypto');
  const requested = String(market || '').toLowerCase();
  if (normalizedType === 'futures') return 'perp';
  if (!['crypto', 'futures'].includes(normalizedType)) return 'spot';
  return requested === 'perp' ? 'perp' : 'spot';
}

function persistTradeSelection(symbol, type, market = null) {
  const sym = String(symbol || '').toUpperCase();
  const normalizedType = normalizeType(type || 'crypto');
  const normalizedMarket = normalizeMarketForType(normalizedType, market || get('market') || defaultMarketForType(normalizedType));
  if (sym) set('symbol', sym);
  if (normalizedType) set('type', normalizedType);
  set('market', normalizedMarket);
  try {
    if (sym) localStorage.setItem('vp_symbol', sym);
    if (normalizedType) localStorage.setItem('vp_type', normalizedType);
    localStorage.setItem('vp_market', normalizedMarket);
  } catch (_e) {}
}

export function render(params) {
  if (params.symbol || params.type || params.market) {
    persistTradeSelection(
      params.symbol || get('symbol'),
      params.type || get('type'),
      params.market || get('market') || defaultMarketForType(params.type || get('type')),
    );
  } else {
    const normalizedMarket = normalizeMarketForType(get('type'), get('market'));
    if (normalizedMarket !== get('market')) persistTradeSelection(get('symbol'), get('type'), normalizedMarket);
  }
  if (params.tf) set('tf', params.tf);

  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');
  const gate = tradeGate();

  return `<div class="trade-terminal flex flex-col lg:flex-row h-full mobile-pad">
    <aside id="market-drawer" class="hidden lg:flex flex-col w-[250px] border-r border-line bg-surface shrink-0 overflow-hidden">
      <div class="lg:hidden flex items-center justify-between h-12 px-3 border-b border-line bg-panel">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted">${t('common.markets','Markets')}</div>
          <strong class="text-sm">${t('trade.select_instrument','Select instrument')}</strong>
        </div>
        <button class="icon-btn icon-btn-sm" id="close-mob-drawer" aria-label="Close markets">${icons.close}</button>
      </div>
      <div class="hidden lg:block p-2 border-b border-line">
        <div class="relative">
          <input type="search" class="input pl-7" placeholder="${escAttr(t('trade.search_symbol','Search symbol...'))}" id="sym-search" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted">${icons.search}</span>
        </div>
      </div>
      <div class="flex gap-1 p-2 overflow-x-auto border-b border-line" id="type-tabs">
        ${getTypes().map(tp => `<button class="btn-xs ${tp.key === type ? 'bg-accent/20 text-accent border-accent/40' : 'text-muted border-line'} border rounded-md whitespace-nowrap" data-type-tab="${tp.key}">${tp.label}</button>`).join('')}
      </div>
      <div class="flex-1 overflow-auto p-1" id="symbol-list">${symbolListSkeleton()}</div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div class="flex items-center justify-between px-2 lg:px-4 h-11 border-b border-line bg-surface shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button class="lg:hidden w-8 h-8 grid place-items-center rounded border border-line text-muted shrink-0" id="mob-mkt-btn" aria-label="Open markets">${icons.menu}</button>
          <span id="sym-logo-slot">${marketLogo(symbol, type, 'w-7 h-7 rounded-md shrink-0')}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="text-sm truncate" id="sym-name">${esc(symbol)}</strong>
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
        <div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">${t('trade.loading_chart', 'Loading live chart...')}</p></div></div>
      </div>

      <div class="lg:hidden grid grid-cols-2 gap-2 p-2 border-t border-line bg-surface shrink-0">
        <button class="btn-sell py-3" data-open-order="SELL">${t('trade.sell', 'SELL')}</button>
        <button class="btn-buy py-3" data-open-order="BUY">${t('trade.buy', 'BUY')}</button>
      </div>

      <div class="border-t border-line bg-surface max-h-[320px] lg:max-h-[220px] overflow-auto shrink-0 trade-activity-panel" id="positions-section">
        <div class="trade-activity-head">
          <div class="trade-activity-title">
            <span class="text-[10px] font-semibold text-muted uppercase">${t('trade.activity', 'Trading activity')}</span>
            <span class="text-[10px] text-muted ml-2" id="activity-summary">${t('common.loading', 'Loading...')}</span>
          </div>
          <div class="trade-activity-actions">
            <div class="activity-tabs" role="tablist">
              <button class="active" data-activity-tab="active">${t('trade.active_trades', 'Active trades')} <b id="active-count">0</b></button>
              <button data-activity-tab="closed">${t('trade.closed_trades', 'Closed trades')} <b id="closed-count">0</b></button>
            </div>
            <button class="activity-expand-btn" data-toggle-activity-expand title="${escAttr(t('trade.expand_activity', 'Expand trading activity'))}" aria-label="${escAttr(t('trade.expand_activity', 'Expand trading activity'))}">${icons.fullscreen || icons.expand || 'â›¶'}</button>
          </div>
        </div>
        <div id="activity-body"><p class="text-muted text-[11px] text-center py-4">${t('common.loading', 'Loading...')}</p></div>
      </div>
    </div>

    <aside class="hidden lg:flex flex-col w-[300px] border-l border-line bg-surface shrink-0 overflow-auto">
      <div class="p-3 border-b border-line">
        <div class="text-xs font-semibold">Order Ticket</div>
        <div class="text-[10px] text-muted" id="ticket-instrument">${esc(symbol)} - ${esc(type.toUpperCase())}</div>
      </div>
      <div class="p-3 space-y-3" id="order-body">
        ${renderOrderGate(renderOrderPanel(), gate)}
      </div>
    </aside>

    ${renderMobileOrderSheet(symbol, type, gate)}
  </div>`;
}

function renderOrderGate(content, gate = tradeGate()) {
  if (!gate) return content;
  return `<div class="gate-wrap trade-order-gate">
    <div class="gate-blur">${content}</div>
    <div class="gate-overlay">
      <button type="button" class="gate-card trade-gate-card" data-trade-gate>
        <span class="gate-icon">${icons.lock}</span>
        <strong>${esc(gate.title)}</strong>
        <p>${esc(gate.body)}</p>
        <span class="btn-primary btn-sm">${esc(gate.action)}</span>
      </button>
    </div>
  </div>`;
}

function renderOrderPanel() {
  const ot = get('orderType') || 'MARKET';
  const amt = Number(get('amount') || 100);
  const lev = Number(get('leverage') || 10);
  const market = get('market') || 'spot';
  const isPerp = market === 'perp';
  const q = get('activeQuote') || {};
  const p = Number(q.price || 0);

  return `<div class="space-y-3 order-ticket-panel" data-order-form>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${t('trade.trading_type','Trading type')}</span>
        <select class="input mt-1" data-market-type>
          <option value="spot" ${market === 'spot' ? 'selected' : ''}>${t('trade.spot','Spot')}</option>
          <option value="perp" ${market === 'perp' ? 'selected' : ''}>${t('trade.perp_futures','Perpetual / Futures')}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${t('trade.order_type_label','Order type')}</span>
        <select class="input mt-1" data-order-type>
          <option value="MARKET" ${ot === 'MARKET' ? 'selected' : ''}>${t('trade.market','Market')}</option>
          <option value="LIMIT" ${ot === 'LIMIT' ? 'selected' : ''}>${t('trade.limit','Limit')}</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn-sell trade-price-button" data-side="SELL"><small>${t('trade.sell','Sell')}</small><span data-sell-price>${p > 0 ? price(p, get('type')) : '--'}</span></button>
      <button class="btn-buy trade-price-button" data-side="BUY"><small>${t('trade.buy','Buy')}</small><span data-buy-price>${p > 0 ? price(p * 1.0001, get('type')) : '--'}</span></button>
      </div>
      <div class="text-center"><span class="spread-display" data-spread-val>${t('trade.spread','Spread')}: --</span></div>
      <div class="mobile-order-summary">
        <span><small>${t('trade.mode','Mode')}</small><strong>${esc(get('mode') === 'real' ? t('trade.real','Real') : t('trade.demo','Demo'))}</strong></span>
        <span><small>${t('trade.symbol','Symbol')}</small><strong data-order-symbol>${esc(get('symbol') || '--')}</strong></span>
        <span><small>${t('trade.type','Type')}</small><strong>${isPerp ? t('trade.perp_futures','Perp/Futures') : t('trade.spot','Spot')}</strong></span>
      </div>
      <div class="order-summary-box">
        <span><small>${t('trade.available','Available')}</small><strong data-avail-bal>--</strong></span>
        <span><small>${t('trade.est_units','Est. Units')}</small><strong data-est-units>--</strong></span>
        <span><small>${t('trade.notional','Notional')}</small><strong data-est-notional>--</strong></span>
        <span><small>${isPerp ? t('trade.margin_req','Margin Req.') : t('trade.margin_spot','Amount')}</small><strong data-margin-req>--</strong></span>
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${t('trade.margin_amount','Margin / Amount (USDT)')}</span>
      <input type="number" min="1" step="any" class="input mt-1" value="${escAttr(String(amt))}" data-amount />
    </label>
    <div class="quick-amount-grid" aria-label="Quick order amounts">
      ${[25, 50, 100, 250].map(v => `<button type="button" data-quick-amount="${v}">$${v}</button>`).join('')}
    </div>
    <label class="block">
      <span class="text-[10px] text-muted">${t('trade.limit_price','Limit price')}</span>
      <input type="number" min="0" step="any" class="input mt-1" placeholder="${p > 0 ? price(p, get('type')) : t('trade.required_for_limit','Required for limit')}" data-limit-price />
    </label>
    ${isPerp ? `
    <label class="block order-leverage-row" id="leverage-row">
      <span class="text-[10px] text-muted">${t('trade.leverage','Leverage')}: <strong data-lev-val id="leverage-label">${lev}x</strong></span>
      <input type="range" min="1" max="100" value="${escAttr(String(lev))}" class="w-full mt-1 accent-accent" data-leverage />
    </label>` : `
    <div class="order-spot-note" id="leverage-row">
      <span class="text-[10px] text-muted">${t('trade.spot_no_leverage','Spot order â€” no leverage')}</span>
    </div>`}
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] text-muted">${t('trade.take_profit','Take Profit')}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${t('trade.optional','Optional')}" data-tp />
      </label>
      <label class="block">
        <span class="text-[10px] text-muted">${t('trade.stop_loss','Stop Loss')}</span>
        <input type="number" step="any" class="input mt-1" placeholder="${t('trade.optional','Optional')}" data-sl />
      </label>
    </div>
    <p class="order-form-status is-info" data-order-status hidden></p>
    <p class="order-ticket-note">${t('trade.order_note','Orders execute internally on MEX Group at the current platform quote. Use TP/SL to document target risk for review.')}</p>
  </div>`;
}

function renderMobileOrderSheet(symbol, type, gate = tradeGate()) {
  return `<div class="fixed inset-0 z-[230] hidden lg:hidden" id="mobile-order-sheet">
    <div class="absolute inset-0 bg-black/65" data-close-order-sheet></div>
    <div class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <span id="mobile-order-logo-slot">${marketLogo(symbol, type, 'w-8 h-8 rounded-lg shrink-0')}</span>
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider text-muted" id="mobile-order-side-label">${t('trade.order','Order')}</div>
            <strong class="text-sm truncate" id="mobile-order-symbol">${esc(symbol)}</strong>
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-close-order-sheet aria-label="Close order">${icons.close}</button>
      </div>
      <div class="p-4">
        ${renderOrderGate(renderOrderPanel(), gate)}
        <div class="order-action-sticky">
          <button class="btn-primary w-full py-3" id="mobile-submit-order" data-submit-order="BUY">${t('trade.review_place','Review & Place Order')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function tradeGate() {
  if (get('mode') === 'real' && !kycApproved()) {
    return {
      kind: 'kyc',
      title: t('earn.kyc_required', 'KYC approval required'),
      body: t('trade.kyc_required_copy', 'Verify your account before opening or closing live trades.'),
      action: t('earn.open_kyc', 'Open KYC'),
    };
  }
  return null;
}

function kycApproved() {
  const status = String(get('kyc')?.status || '').toLowerCase();
  return ['approved', 'accepted', 'verified'].includes(status);
}

function showTradeGateDialog(gate = tradeGate()) {
  if (!gate) return;
  closeTradeGateDialog();
  const wrap = document.createElement('div');
  wrap.className = 'dialog-backdrop';
  wrap.setAttribute('data-trade-gate-dialog', '1');
  wrap.innerHTML = `<div class="dialog-card">
    <button class="dialog-close" aria-label="${escAttr(t('common.close', 'Close'))}" data-trade-gate-close>${icons.close}</button>
    <div class="text-center space-y-3">
      <span class="gate-icon mx-auto">${icons.lock}</span>
      <h2 class="text-lg font-bold">${esc(gate.title)}</h2>
      <p class="text-sm text-muted">${esc(gate.body)}</p>
      <button class="btn-primary btn-sm" data-trade-gate-action="${escAttr(gate.kind)}">${esc(gate.action)}</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (event) => {
    if (event.target === wrap || event.target.closest('[data-trade-gate-close]')) closeTradeGateDialog();
    const action = event.target.closest('[data-trade-gate-action]');
    if (action) {
      event.preventDefault();
      applyTradeGateAction(action.dataset.tradeGateAction || gate.kind);
    }
  });
}

function closeTradeGateDialog() {
  document.querySelector('[data-trade-gate-dialog]')?.remove();
}

function applyTradeGateAction(kind) {
  closeTradeGateDialog();
  if (kind === 'real') {
    trySwitchToReal('trading');
    return;
  }
  location.hash = '#/kyc';
}

export function mount(container) {
  // Attach logo fallback handlers (not inline onerror)
  const onImgError = (e) => {
    if (e.target.tagName === 'IMG' && e.target.dataset.fallback === 'initial') {
      e.target.style.display = 'none';
      const fallback = e.target.nextElementSibling;
      if (fallback) fallback.style.display = 'grid';
    }
  };
  container.addEventListener('error', onImgError, true);
  eventDisposers.push(() => container.removeEventListener('error', onImgError, true));
  setup(container);
}

export function cleanup() {
  tradeRunId += 1;
  if (currentSetup?.container) cancelMonthHistoryPrefetch(currentSetup.container);
  if (currentSetup?.container) cancelChartPrefetch(currentSetup.container);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  clearChartPriceLines();
  if (chart) {
    try { chart.remove(); } catch (_e) {}
    chart = null;
    candleSeries = null;
    volumeSeries = null;
    ma7Series = null;
    ma25Series = null;
    lineSeries = null;
    areaSeries = null;
    ema20Series = null;
    bollUpperSeries = null;
    bollMidSeries = null;
    bollLowerSeries = null;
    chartLegendEl = null;
    lastCandle = null;
  }
  chartSeriesKey = '';
  allCandles = [];
  chartHistory = { loading: false, done: false, nextAt: 0 };
  lastFlashPrice = 0;
  lastPriceFlashAt = 0;
  cancelLiveCandleFrame();
  cancelOrderInfoFrame();
  document.body.classList.remove('chart-fullscreen-open');
  if (sseClean) {
    sseClean();
    sseClean = null;
  }
  stopActiveQuote();
  stopActivityRefresh();
  stopChartRefresh();
  if (chartReconcileTimer) {
    clearTimeout(chartReconcileTimer);
    chartReconcileTimer = 0;
  }
  cancelLiveCandleFrame();
  cancelOrderInfoFrame();
  disconnect();
  eventDisposers.forEach((d) => { try { d(); } catch (_e) {} });
  eventDisposers = [];
  currentSetup = null;
  document.body.classList.remove('trade-modal-open');
}

function resetChartInstance() {
  clearChartPriceLines();
  if (chart) {
    try { chart.remove(); } catch (_e) {}
  }
  chart = null;
  candleSeries = null;
  volumeSeries = null;
  ma7Series = null;
  ma25Series = null;
  lineSeries = null;
  areaSeries = null;
  ema20Series = null;
  bollUpperSeries = null;
  bollMidSeries = null;
  bollLowerSeries = null;
  chartLegendEl = null;
  lastCandle = null;
  allCandles = [];
  chartSeriesKey = '';
  pendingLiveCandle = null;
  chartPriceLines = { live: null, series: null };
  cancelLiveCandleFrame();
}

async function setup(container) {
  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');
  const runId = ++tradeRunId;
  set('activeQuote', null);
  const chartReady = loadChartLib();

  currentSetup = { container, symbol, type, tf, runId };
  bindEvents(container);
  bindVisibilityPause();
  updateOrderInfo(container);
  startActiveQuote(container, symbol, type, runId);

  loadMarketItems(type, runId)
    .then(mkts => {
      if (!isCurrentRun(runId, symbol, type)) return;
      if (mkts?.items) {
        container.__marketItems = mkts.items;
        renderSymbolList(container, mkts.items);
        hydrateActiveFromMarketList(container, mkts.items, runId);
        // Start SSE immediately (no delay) for instant price updates
        if (isCurrentRun(runId, symbol, type)) startLiveQuotes(container, mkts.items, runId, type);
        warmVisibleQuotes(container, mkts.items, runId, type).catch(() => {});
        scheduleChartPrefetch(container, mkts.items, runId, type);
      }
    })
    .catch(() => {
      if (!isCurrentRun(runId, symbol, type)) return;
      const fallback = fallbackMarketItems(type);
      container.__marketItems = fallback;
      renderSymbolList(container, fallback);
    });

  loadTradeActivity(container, runId);
  activityRefreshTimer = setInterval(() => loadTradeActivity(container, runId, true), 20000);

  loadChartData(container, symbol, type, tf, runId, chartReady);
  startChartRefresh(container, symbol, type, tf, runId, chartReady);
}

// Pause price polling / SSE while the tab is hidden, resume when it becomes visible again.
// Saves CPU and network when the user is not looking at the trade page.
function bindVisibilityPause() {
  const onVisibility = () => {
    if (document.hidden) {
      stopActiveQuote();
      stopActivityRefresh();
      stopChartRefresh();
      if (sseClean) { sseClean(); sseClean = null; }
      return;
    }
    const s = currentSetup;
    if (!s || s.runId !== tradeRunId) return;
    startActiveQuote(s.container, s.symbol, s.type, s.runId);
    if (!activityRefreshTimer) {
      loadTradeActivity(s.container, s.runId, true);
      activityRefreshTimer = setInterval(() => loadTradeActivity(s.container, s.runId, true), 20000);
    }
    if (!sseClean && Array.isArray(s.container.__marketItems)) {
      startLiveQuotes(s.container, s.container.__marketItems, s.runId);
    }
    if (!chartRefreshTimer) {
      startChartRefresh(s.container, s.symbol, s.type, s.tf || get('tf'), s.runId, loadChartLib());
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  eventDisposers.push(() => document.removeEventListener('visibilitychange', onVisibility));
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

function startLiveQuotes(container, marketItems, runId = tradeRunId, listType = null) {
  if (sseClean) {
    sseClean();
    sseClean = null;
  }

  const type = normalizeType(listType || get('type'));
  const quoteType = type === 'favorites' ? 'crypto' : type;
  const active = get('symbol');
  const isCrypto = quoteType === 'crypto';
  const max = isCrypto ? 42 : 30;
  const symbols = [...new Set(marketItems
    .slice(0, max)
    .map(m => String(m.symbol || '').toUpperCase())
    .filter(Boolean)
    .filter(symbol => symbol !== String(active || '').toUpperCase()))];

  if (!symbols.length) return;

  sseClean = connectSSE(symbols, quoteType, (items) => {
    if (!isCurrentRun(runId, active, get('type'))) return;
    updateSymbolListPrices(container, items);
  }, null, {
    interval: isCrypto ? 4000 : 1500,
    initialDelay: 0,
    fallbackAfter: 1200,
    maxSymbols: max,
    timeout: isCrypto ? 9000 : 7000,
    forcePolling: false,
  });
}

function startActiveQuote(container, symbol, type, runId = tradeRunId) {
  stopActiveQuote();
  const quoteType = normalizeType(type) === 'favorites' ? 'crypto' : normalizeType(type);
  // Use Binance WebSocket for real-time crypto prices (instant trades, TradingView parity)
  if (quoteType === 'crypto') startBinanceWs(container, symbol, quoteType, runId);
  // Non-crypto: server-side aggregator feeds the central cache via WS;
  // polling /quote_focus.php (1s nginx micro-cached) gives near-real-time prices.
  // Finnhub/Tiingo/TwelveData WS removed from client â€” API keys unsafe + wastes credits.
  // Fast path: /quote_focus.php reads only the central cache (worker-fed) and
  // sits behind a 1s nginx micro-cache shared by all users, so polling can be
  // aggressive without load concerns. No cache-buster: shared cache key.
  const interval = quoteType === 'crypto' ? 3000 : 1000;
  const focusUrl = `/quote_focus.php?symbols=${encodeURIComponent(symbol)}&type=${encodeURIComponent(quoteType)}`;
  let pollCount = 0;
  const preferDirectLive = ['forex', 'commodities'].includes(quoteType);
  const directCadence = preferDirectLive ? 1 : (['stocks', 'arab'].includes(quoteType) ? 6 : 4);
  const staleFocusAge = quoteType === 'forex' ? 4 : (quoteType === 'commodities' ? 4 : (quoteType === 'futures' ? 8 : 900));
  const fetchDirectQuote = () => {
    const fbUrl = `/quotes.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(quoteType)}&purpose=focus&direct=1&fresh=1&_=${Date.now()}`;
    return api(fbUrl, {
      timeout: preferDirectLive ? 3200 : (quoteType === 'crypto' ? 1800 : 3800),
      retry: 0,
      signal: activeQuoteController.signal,
      cacheTtl: 0,
      cache: 'no-store',
    });
  };
  const hasUsablePrice = (item) => Number(item?.price || item?.q_price || 0) > 0;
  const poll = async () => {
    if (!isCurrentRun(runId, symbol, type)) return;
    activeQuoteController = new AbortController();
    try {
      pollCount += 1;
      let data = null;
      let item = null;
      if (preferDirectLive && pollCount % directCadence === 0) {
        data = await fetchDirectQuote().catch(() => null);
        item = data?.items?.[0];
      }
      if (!hasUsablePrice(item)) {
        data = await api(focusUrl, { timeout: 1800, retry: 0, signal: activeQuoteController.signal, cacheTtl: 0, cache: 'no-store' });
        item = data?.items?.[0];
      }
      const ageSec = Number(item?.age_sec ?? 999999);
      const needsFresh = quoteType !== 'crypto'
        && (!hasUsablePrice(item) || ageSec > staleFocusAge || pollCount % directCadence === 0);
      if (!preferDirectLive && (needsFresh || !hasUsablePrice(item))) {
        data = await fetchDirectQuote();
        item = data?.items?.[0];
      }
      if (!isCurrentRun(runId, symbol, type)) return;
      if (item) updatePrice(container, item, runId);
    } catch (_e) {
      // Abort/timeout errors are normal during cleanup â€” don't surface to UI.
      if (isCurrentRun(runId, symbol, type)) markDisconnected(container);
    } finally {
      if (isCurrentRun(runId, symbol, type)) activeQuoteTimer = setTimeout(poll, interval);
    }
  };
  poll();
}

function stopActiveQuote() {
  stopBinanceWs();
  stopBinanceKlineWs();
  if (activeQuoteTimer) {
    clearTimeout(activeQuoteTimer);
    activeQuoteTimer = null;
  }
  if (activeQuoteController) {
    activeQuoteController.abort();
    activeQuoteController = null;
  }
}

function startBinanceWs(container, symbol, quoteType, runId) {
  stopBinanceWs();
  const wsSymbol = symbol.toUpperCase();
  let ws;
  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol.toLowerCase()}@miniTicker`);
  } catch (_e) { return; }
  binanceWs = ws;
  ws.addEventListener('message', (evt) => {
    if (!isCurrentRun(runId, wsSymbol, quoteType)) { try { ws.close(); } catch (_e) {} return; }
    try {
      const d = JSON.parse(evt.data);
      if (!d || !d.c) return;
      const p = parseFloat(d.c);
      const o = parseFloat(d.o);
      if (!(p > 0)) return;
      const change_pct = o > 0 ? ((p - o) / o) * 100 : 0;
      updatePrice(container, {
        symbol: wsSymbol, type: quoteType, price: p, change_pct,
        source: 'binance_ws',
        provider_updated_at: d.E ? Math.floor(d.E / 1000) : Math.floor(Date.now() / 1000),
      }, runId);
    } catch (_e) {}
  });
  ws.addEventListener('error', () => { if (binanceWs === ws) binanceWs = null; });
  ws.addEventListener('close', () => { if (binanceWs === ws) binanceWs = null; });
}

function stopBinanceWs() {
  if (binanceWs) {
    try { binanceWs.close(); } catch (_e) {}
    binanceWs = null;
  }
}

/* â”€â”€ Binance Kline WebSocket for real-time chart candles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function startBinanceKlineWs(symbol, tf, runId) {
  stopBinanceKlineWs();
  const wsSymbol = symbol.toLowerCase();
  const intervalMap = { '1m':'1m', '3m':'3m', '5m':'5m', '15m':'15m', '30m':'30m', '1h':'1h', '2h':'2h', '4h':'4h', '6h':'6h', '8h':'8h', '12h':'12h', '1d':'1d', '3d':'3d', '1w':'1w' };
  const binanceInterval = intervalMap[tf] || '1m';
  let ws;
  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_${binanceInterval}`);
  } catch (_e) { return; }
  binanceKlineWs = ws;
  ws.addEventListener('message', (evt) => {
    if (!isCurrentRun(runId)) { try { ws.close(); } catch (_e) {} return; }
    try {
      const d = JSON.parse(evt.data);
      if (!d || !d.k) return;
      const k = d.k;
      const p = parseFloat(k.c);
      if (!(p > 0)) return;
      // Feed the live candle directly for instant chart update
      const candleTime = Math.floor(k.t / 1000);
      const candleData = {
        time: candleTime,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: p,
        volume: parseFloat(k.v),
      };
      if (candleSeries && chartSeriesKey === currentChartKey()) {
        // Update the live candle in the chart
        if (lastCandle && lastCandle.time === candleTime) {
          lastCandle = { ...candleData };
        } else if (lastCandle && candleTime > lastCandle.time) {
          lastCandle = { ...candleData };
        }
        const updated = safeChartOp(() => {
          candleSeries.update(candleData);
          if (volumeSeries) volumeSeries.update({ time: candleTime, value: candleData.volume, color: candleData.close >= candleData.open ? 'rgba(0,192,135,0.25)' : 'rgba(246,70,93,0.2)' });
          if (lineSeries) lineSeries.update({ time: candleTime, value: p });
          if (areaSeries) areaSeries.update({ time: candleTime, value: p });
          return true;
        });
        if (!updated) return;
        // Also update allCandles array
        if (allCandles.length) {
          const tail = allCandles[allCandles.length - 1];
          if (tail.time === candleTime) allCandles[allCandles.length - 1] = { ...candleData };
          else if (candleTime > tail.time) allCandles.push({ ...candleData });
        }
        updateChartLegend(null);
      }
      // Also feed the price for the live quote display
      const o = parseFloat(k.o);
      const change_pct = o > 0 ? ((p - o) / o) * 100 : 0;
      updatePrice(document.getElementById('view') || document.body, {
        symbol: symbol.toUpperCase(), type: 'crypto', price: p, change_pct,
        source: 'binance_kline_ws',
        provider_updated_at: Math.floor(Date.now() / 1000),
      }, runId);
    } catch (_e) {}
  });
  ws.addEventListener('error', () => { if (binanceKlineWs === ws) binanceKlineWs = null; });
  ws.addEventListener('close', () => { if (binanceKlineWs === ws) binanceKlineWs = null; });
}

function stopBinanceKlineWs() {
  if (binanceKlineWs) {
    try { binanceKlineWs.close(); } catch (_e) {}
    binanceKlineWs = null;
  }
}

/* â”€â”€ Client-side Finnhub/Tiingo/TwelveData WS removed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  Server-side aggregator (api/ws/aggregator.php) now handles all
 *  WS connections. Non-crypto prices via /quote_focus.php polling
 *  which reads from the aggregator-fed central cache.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


function stopActivityRefresh() {
  if (activityRefreshTimer) {
    clearInterval(activityRefreshTimer);
    activityRefreshTimer = null;
  }
}

function markDisconnected(container) {
  // Header connection dots were removed by design. Keep the last trusted price
  // visible when a transient polling request times out.
}

function trendClass(container, symbol, currentPrice, fallbackChange = 0) {
  const p = Number(currentPrice || 0);
  const chg = Number(fallbackChange || 0);
  if (!container.__lastQuotePrices) container.__lastQuotePrices = new Map();
  const key = String(symbol || get('symbol') || '').toUpperCase();
  const prev = key ? Number(container.__lastQuotePrices.get(key) || 0) : 0;
  let cls = chg > 0 ? 'text-buy' : (chg < 0 ? 'text-sell' : 'text-text');
  if (prev > 0 && p > 0 && Math.abs(p - prev) > 1e-12) cls = p > prev ? 'text-buy' : 'text-sell';
  if (key && p > 0) container.__lastQuotePrices.set(key, p);
  return cls;
}

function quoteSourceRank(source) {
  const src = String(source || '').toLowerCase();
  if (src.includes('binance')) return 100;
  if (src.includes('eodhd')) return 94;
  if (src.includes('provider_live')) return 90;
  if (src.includes('yahoo_chart_live')) return 76;
  if (src === 'yahoo' || src.includes('yahoo')) return 68;
  if (src.includes('frankfurter') || src.includes('stooq') || src.includes('fallback')) return 30;
  if (src.includes('cache') || src.includes('seed') || src.includes('reference') || src.includes('unavailable')) return 5;
  return src ? 45 : 0;
}

function normalizedQuoteTs(value) {
  const n = Number(value || 0);
  if (!(n > 0)) return 0;
  return n > 1000000000000 ? Math.floor(n / 1000) : Math.floor(n);
}

function quoteQuality(q) {
  const providerTs = Math.max(
    normalizedQuoteTs(q?.provider_updated_at),
    normalizedQuoteTs(q?.provider_ts),
    normalizedQuoteTs(q?.as_of),
    normalizedQuoteTs(q?.updated_at),
  );
  const cacheTs = Math.max(
    normalizedQuoteTs(q?.received_at),
    normalizedQuoteTs(q?.ingested_at),
    normalizedQuoteTs(q?.cache_updated_at),
  );
  return {
    rank: quoteSourceRank(q?.source || q?.provider),
    providerTs,
    cacheTs,
    effectiveTs: Math.max(providerTs, cacheTs),
  };
}

function deriveChangePct(q) {
  const chg = Number(q?.change_pct || q?.q_change || 0);
  if (Math.abs(chg) > 0.000001) return chg;
  const p = Number(q?.price || 0);
  const open = Number(q?.open || q?.prev_close || q?.previous_close || q?.q_open || 0);
  if (p > 0 && open > 0 && p !== open) return ((p - open) / open) * 100;
  return 0;
}

function shouldAcceptQuote(container, q, symbol) {
  const p = Number(q?.price || q?.q_price || 0);
  if (!(p > 0)) return false;
  if (!container.__quoteQuality) container.__quoteQuality = new Map();
  const key = String(symbol || q?.symbol || '').toUpperCase();
  if (!key) return true;
  const next = quoteQuality(q);
  const prev = container.__quoteQuality.get(key);
  if (prev) {
    if (next.providerTs > 0 && prev.providerTs > 0 && next.providerTs + 30 < prev.providerTs) return false;
    if (next.effectiveTs > 0 && prev.effectiveTs > 0 && next.effectiveTs + 2 < prev.effectiveTs && next.rank <= prev.rank) return false;
    if (next.rank + 20 < prev.rank && next.effectiveTs <= prev.effectiveTs + 60) return false;
  }
  container.__quoteQuality.set(key, next);
  return true;
}

function flashPriceNode(el, direction) {
  if (!el || !direction) return;
  const cls = direction === 'down' ? 'animate-price-down' : 'animate-price-up';
  el.classList.remove('animate-price-up', 'animate-price-down');
  void el.offsetWidth;
  requestAnimationFrame(() => el.classList.add(cls));
}

function updatePrice(container, q, runId = tradeRunId) {
  if (!isCurrentRun(runId, String(q?.symbol || get('symbol')).toUpperCase(), q?.type || get('type'))) return;
  const p = Number(q.price || q.q_price || 0);
  if (!shouldAcceptQuote(container, { ...q, price: p }, q.symbol || get('symbol'))) return;
  const chg = Number(q.change_pct || q.q_change || 0) || deriveChangePct(q);
  const assetType = get('type');
  set('activeQuote', { ...q, price: p, change_pct: chg });
  const liveTrend = trendClass(container, q.symbol || get('symbol'), p, chg);
  updateSymbolListPrices(container, [{ ...q, price: p, change_pct: chg }]);

  const livePrice = $('#live-price', container);
  const liveChange = $('#live-change', container);
  if (livePrice) {
    livePrice.textContent = p > 0 ? price(p, assetType) : '--';
    livePrice.className = `text-xs font-mono font-bold ${liveTrend}`;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (p > 0 && lastFlashPrice > 0 && p !== lastFlashPrice && now - lastPriceFlashAt > 550) {
      const direction = p > lastFlashPrice ? 'up' : 'down';
      const dir = direction === 'up' ? 'price-flash-up' : 'price-flash-down';
      livePrice.classList.remove('price-flash-up', 'price-flash-down');
      requestAnimationFrame(() => livePrice.classList.add(dir));
      flashPriceNode(livePrice, direction);
      lastPriceFlashAt = now;
    }
    if (p > 0) lastFlashPrice = p;
  }
  if (liveChange) {
    liveChange.textContent = pct(chg);
    liveChange.className = `text-[10px] ${chg >= 0 ? 'text-buy' : 'text-sell'}`;
  }
  $$('[data-sell-price]', container).forEach(el => { el.textContent = p > 0 ? price(p, assetType) : '--'; });
  $$('[data-buy-price]', container).forEach(el => { el.textContent = p > 0 ? price(p * 1.0001, assetType) : '--'; });
  $$('[data-spread-val]', container).forEach(el => { el.textContent = p > 0 ? `${t('trade.spread','Spread')}: ${price(p * 0.0001, assetType)}` : `${t('trade.spread','Spread')}: --`; });
  scheduleOrderInfoUpdate(container);
  updateLiveCandle(p, runId, Number(q.provider_updated_at || q.updated_at || q.cache_updated_at || 0), normalizeType(q.type || assetType));
  scheduleChartQuoteReconcile(container, p, runId, normalizeType(q.type || assetType));
  updateChartPriceLines({ ...q, price: p, change_pct: chg });
  updateLivePnL(container, String(q.symbol || get('symbol')).toUpperCase(), p);
}

function scheduleOrderInfoUpdate(container) {
  if (orderInfoFrame) return;
  orderInfoFrame = requestAnimationFrame(() => {
    orderInfoFrame = 0;
    if (container?.isConnected) updateOrderInfo(container);
  });
}

function cancelOrderInfoFrame() {
  if (orderInfoFrame) {
    cancelAnimationFrame(orderInfoFrame);
    orderInfoFrame = 0;
  }
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
    const marginReqEl = $('[data-margin-req]', form);
    if (marginReqEl) {
      const marginReq = amt > 0 ? (marketType === 'perp' ? (amt / effectiveLev) : amt) : 0;
      marginReqEl.textContent = amt > 0 ? `${money(marginReq)} USDT` : '--';
    }
  });
}

function walletStateFromPortfolio(portfolio) {
  const raw = portfolio?.wallet || {};
  const real = raw.USDT || raw.usdt || {};
  const demo = raw.USDT_DEMO || raw.usdt_demo || {};
  return {
    real: { ...real, currency: real.currency || 'USDT' },
    demo: { ...demo, currency: demo.currency || 'USDT_DEMO' },
  };
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
    const chg = Number(m.change_pct || m.q_change || 0) || deriveChangePct(m);
    const unavailable = !(p > 0);
    return `<div class="symbol-row ${symbol === active ? 'active' : ''}" data-sym="${escAttr(symbol)}" data-stype="${escAttr(type)}">
      ${marketLogo(symbol, type, 'w-7 h-7 rounded-md shrink-0')}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <div class="font-semibold text-[11px] truncate">${esc(symbol)}</div>
        </div>
        <div class="text-[9px] text-muted truncate">${esc(m.name || type)}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] font-mono text-text" data-price-cell data-raw-price="${p > 0 ? String(p) : ''}">${p > 0 ? price(p, type) : '--'}</div>
        <div class="text-[9px] ${unavailable ? 'text-muted' : (chg >= 0 ? 'text-buy' : 'text-sell')}" data-change-cell>${unavailable ? '--' : pct(chg)}</div>
      </div>
    </div>`;
  }).join('');
}

async function warmVisibleQuotes(container, items, runId = tradeRunId, listType = null) {
  const type = normalizeType(listType || get('type') || 'crypto');
  const inspectLimit = type === 'crypto' ? 80 : 24;
  const missing = items
    .slice(0, inspectLimit)
    .filter((item) => !(Number(item.price || item.q_price || 0) > 0))
    .map((item) => String(item.symbol || '').toUpperCase())
    .filter(Boolean);
  if (!missing.length) return;

  const chunkSize   = type === 'crypto' ? 24 : 3;
  const limit       = type === 'crypto' ? 80 : 24;
  const warmTimeout = type === 'crypto' ? 4500 : 9000;
  const unique = [...new Set(missing)].slice(0, limit);
  const unresolved = [];
  const fetchChunk = async (chunk) => {
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 2600 : Math.min(warmTimeout, 5000),
      cacheTtl: 500,
      cache: 'no-store',
    }).catch(() => null);
    if (!isCurrentRun(runId)) return;
    if (data?.items?.length) updateSymbolListPrices(container, data.items);
    chunk.forEach((symbol) => {
      const row = $$('.symbol-row', container).find((el) => el.dataset.sym === symbol);
      const hasPrice = row && $('[data-price-cell]', row)?.textContent !== '--';
      if (!hasPrice) unresolved.push(symbol);
    });
  };
  const chunks = [];
  for (let i = 0; i < unique.length; i += chunkSize) chunks.push(unique.slice(i, i + chunkSize));
  const concurrency = type === 'crypto' ? 1 : 2;
  for (let i = 0; i < chunks.length; i += concurrency) {
    await Promise.allSettled(chunks.slice(i, i + concurrency).map(fetchChunk));
    if (!isCurrentRun(runId)) return;
  }
  const rescueChunkSize = type === 'crypto' ? 12 : 3;
  const rescueList = [...new Set(unresolved)].slice(0, type === 'crypto' ? 24 : 24);
  for (let i = 0; i < rescueList.length; i += rescueChunkSize) {
    const chunk = rescueList.slice(i, i + rescueChunkSize);
    const data = await api(`/quotes.php?symbols=${encodeURIComponent(chunk.join(','))}&type=${encodeURIComponent(type)}&visible=1&purpose=watchlist&_=${Date.now()}`, {
      timeout: type === 'crypto' ? 2600 : Math.min(warmTimeout, 5000),
      cacheTtl: 500,
      cache: 'no-store',
    }).catch(() => null);
    if (!isCurrentRun(runId)) return;
    if (data?.items?.length) updateSymbolListPrices(container, data.items);
  }
}

function updateSymbolListPrices(container, items) {
  if (!items?.length) return;
  // Build the symbolâ†’row lookup once per batch instead of re-scanning the DOM per quote (was O(rowsÃ—quotes)).
  const rows = $$('.symbol-row', container);
  if (!rows.length) return;
  const rowMap = new Map();
  rows.forEach(el => rowMap.set(el.dataset.sym, el));
  items.forEach(q => {
    const symbol = String(q.symbol || '').toUpperCase();
    if (!symbol) return;
    const row = rowMap.get(symbol);
    if (!row) return;
    const type = row.dataset.stype || get('type');
    const p = Number(q.price || q.q_price || 0);
    if (!(p > 0)) return;
    if (!shouldAcceptQuote(container, { ...q, price: p }, symbol)) return;
    const chg = Number(q.change_pct || q.q_change || 0) || deriveChangePct(q);
    const priceCell = $('[data-price-cell]', row);
    const changeCell = $('[data-change-cell]', row);
    if (priceCell) {
      const nextPrice = price(p, type);
      const previous = Number(priceCell.dataset.rawPrice || 0);
      if (priceCell.textContent !== nextPrice) priceCell.textContent = nextPrice;
      priceCell.dataset.rawPrice = String(p);
      priceCell.className = 'text-[11px] font-mono text-text';
      if (previous > 0 && previous !== p) flashPriceNode(priceCell, p > previous ? 'up' : 'down');
    }
    if (changeCell) {
      const nextChange = pct(chg);
      const nextClass = `text-[9px] ${chg >= 0 ? 'text-buy' : 'text-sell'}`;
      if (changeCell.textContent !== nextChange) changeCell.textContent = nextChange;
      if (changeCell.className !== nextClass) changeCell.className = nextClass;
    }
  });
}

async function loadTradeActivity(container, runId = tradeRunId, silent = false, bypassCache = false) {
  if (!isCurrentRun(runId)) return;
  if (container.__tradeActivityLoading) return;
  container.__tradeActivityLoading = true;
  const body = $('#activity-body', container);
  if (body && !silent && !container.__tradeActivityLoaded) {
    body.innerHTML = '<p class="text-muted text-[11px] text-center py-4">Loading trading activity...</p>';
  }

  // After placing/closing an order, bypass the 4-second cache so the
  // new/closed position appears immediately without waiting.
  const cacheTtl = bypassCache ? 0 : 4000;
  const cacheOpt = bypassCache ? 'no-store' : 'default';
  const ts = bypassCache ? `&_=${Date.now()}` : '';

  try {
    const mode = get('mode');
    const [portfolioRes, ordersRes] = await Promise.allSettled([
      api(`/trade/portfolio.php?fast=1&mode=${mode}${ts}`, { timeout: 12000, retry: 1, cacheTtl, cache: cacheOpt }),
      api(`/trade/orders.php?limit=90&mode=${mode}${ts}`, { timeout: 12000, retry: 1, cacheTtl, cache: cacheOpt }),
    ]);
    if (!isCurrentRun(runId)) return;

    const portfolio = portfolioRes.status === 'fulfilled' ? portfolioRes.value : null;
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : null;
    if (portfolio?.positions) {
      container.__tradePositions = portfolio.positions;
      set('portfolio', portfolio);
      if (portfolio.wallet) {
        set('wallet', walletStateFromPortfolio(portfolio));
        updateOrderInfo(container);
      }
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
  if (summary) summary.textContent = `${positions.length} ${t('trade.open', 'open')} / ${openOrders.length} ${t('trade.pending', 'pending')} / ${history.length} ${t('trade.closed', 'closed')}`;

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
    body.innerHTML = `<p class="text-muted text-[11px] text-center py-4">${t('trade.no_active_trades', 'No active trades yet')}</p>`;
    return;
  }

  body.innerHTML = `
    ${positions.length ? renderPositionsMarkup(positions) : `<p class="text-muted text-[11px] text-center py-3">${t('trade.no_open_positions', 'No open positions')}</p>`}
    ${orders.length ? `<div class="trade-pending-block">
      <div class="trade-subhead"><span>${t('trade.pending_orders', 'Pending orders')}</span><b>${orders.length}</b></div>
      ${renderOrdersMarkup(orders)}
    </div>` : ''}`;
}

function renderPositions(container, positions) {
  const body = $('#activity-body', container);
  if (!body) return;

  if (!positions.length) {
    body.innerHTML = `<p class="text-muted text-[11px] text-center py-3">${t('trade.no_open_positions', 'No open positions')}</p>`;
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
        <th class="text-left px-3 py-1">${t('trade.symbol', 'Symbol')}</th><th class="text-left py-1">${t('trade.side', 'Side')}</th><th class="text-left py-1">${t('trade.type', 'Type')}</th><th class="text-right py-1">${t('trade.entry', 'Entry')}</th><th class="text-right py-1">${t('trade.mark', 'Mark')}</th><th class="text-right py-1">${t('trade.size', 'Size')}</th><th class="text-right py-1">${t('trade.lev', 'Lev')}</th><th class="text-right py-1">PnL</th><th class="text-right px-3 py-1"></th>
      </tr></thead>
      <tbody>${positions.slice(0, 12).map(tradePositionRow).join('')}</tbody>
    </table></div>`;
}

function renderOrdersActivity(container, orders) {
  const body = $('#activity-body', container);
  if (!body) return;
  if (!orders.length) {
    body.innerHTML = `<p class="text-muted text-[11px] text-center py-4">${t('trade.no_pending_orders', 'No pending or armed orders')}</p>`;
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
        <th class="text-left px-3 py-1">${t('trade.symbol', 'Symbol')}</th><th class="text-left py-1">${t('trade.side', 'Side')}</th><th class="text-left py-1">${t('trade.type', 'Type')}</th><th class="text-right py-1">${t('trade.entry', 'Entry')}</th><th class="text-right py-1">TP / SL</th><th class="text-right py-1">${t('deposit.amount', 'Amount')}</th><th class="text-right py-1">${t('trade.lev', 'Lev')}</th><th class="text-right py-1">${t('kyc.status', 'Status')}</th><th class="text-right px-3 py-1">${t('common.actions', 'Actions')}</th>
      </tr></thead>
      <tbody>${orders.slice(0, 16).map(tradeOrderRow).join('')}</tbody>
    </table></div>`;
}

function renderHistoryActivity(container, history) {
  const body = $('#activity-body', container);
  if (!body) return;

  // History filter state
  if (!container.__histFilter) container.__histFilter = { symbol: '', side: '', period: 'all' };
  const hf = container.__histFilter;

  // Apply filters
  let filtered = history;
  if (hf.symbol) filtered = filtered.filter(o => orderSymbol(o).toUpperCase().includes(hf.symbol.toUpperCase()));
  if (hf.side) filtered = filtered.filter(o => (String(o.side || 'buy').toUpperCase()) === hf.side);
  const now = Math.floor(Date.now() / 1000);
  if (hf.period === 'today') filtered = filtered.filter(o => Number(o.closed_at || o.created_at || 0) >= now - 86400);
  else if (hf.period === '7d') filtered = filtered.filter(o => Number(o.closed_at || o.created_at || 0) >= now - 7 * 86400);
  else if (hf.period === '30d') filtered = filtered.filter(o => Number(o.closed_at || o.created_at || 0) >= now - 30 * 86400);

  // Summary stats
  const totalPnl = filtered.reduce((s, o) => s + Number(o.pnl_usd || o.pnl || 0), 0);
  const wins = filtered.filter(o => Number(o.pnl_usd || o.pnl || 0) > 0).length;
  const losses = filtered.filter(o => Number(o.pnl_usd || o.pnl || 0) < 0).length;
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : '0.0';
  const totalFees = filtered.reduce((s, o) => s + Number(o.fee_paid || 0), 0);

  if (!filtered.length && !history.length) {
    body.innerHTML = `<p class="text-muted text-[11px] text-center py-4">${t('trade.no_closed_trades', 'No closed trades yet')}</p>`;
    return;
  }

  const periodOpts = [
    ['all', t('trade.all_time', 'All')], ['today', t('trade.today', 'Today')],
    ['7d', '7D'], ['30d', '30D']
  ];

  body.innerHTML = `
    <div class="trade-hist-filters flex items-center gap-2 px-2 py-1.5 border-b border-line/40 text-[10px] flex-wrap">
      <input type="text" class="input text-[10px] py-0.5 px-1.5 w-[72px]" placeholder="Symbol" data-hist-filter-symbol value="${escAttr(hf.symbol)}">
      <select class="input text-[10px] py-0.5 px-1" data-hist-filter-side>
        <option value="">${t('trade.all_sides', 'All sides')}</option>
        <option value="BUY" ${hf.side === 'BUY' ? 'selected' : ''}>BUY</option>
        <option value="SELL" ${hf.side === 'SELL' ? 'selected' : ''}>SELL</option>
      </select>
      <select class="input text-[10px] py-0.5 px-1" data-hist-filter-period>
        ${periodOpts.map(([v, l]) => `<option value="${v}" ${hf.period === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="btn-ghost btn-xs text-[9px]" data-hist-export-csv>CSV</button>
      <span class="ml-auto text-muted">${filtered.length} ${t('trade.trades', 'trades')}</span>
    </div>
    <div class="trade-hist-summary flex items-center gap-3 px-2 py-1 text-[10px] border-b border-line/30">
      <span>PnL <b class="${totalPnl >= 0 ? 'text-buy' : 'text-sell'}">${money(totalPnl)}</b></span>
      <span>W/L <b class="text-buy">${wins}</b>/<b class="text-sell">${losses}</b></span>
      <span>${t('trade.win_rate', 'Win%')} <b>${winRate}%</b></span>
      <span>${t('trade.fees', 'Fees')} <b class="text-muted">${money(totalFees)}</b></span>
    </div>
    <div class="trade-position-cards lg:hidden">
      ${filtered.slice(0, 30).map(tradeHistoryCard).join('')}
    </div>
    <div class="hidden lg:block overflow-x-auto"><table class="min-w-[820px] lg:min-w-0 w-full text-[11px]">
      <thead class="text-[9px] text-muted uppercase"><tr>
        <th class="text-left px-3 py-1">${t('trade.symbol','Symbol')}</th><th class="text-left py-1">${t('trade.side','Side')}</th><th class="text-left py-1">${t('trade.type','Type')}</th><th class="text-right py-1">${t('trade.entry','Entry')}</th><th class="text-right py-1">${t('trade.exit','Exit')}</th><th class="text-right py-1">${t('trade.used','Used')}</th><th class="text-right py-1">${t('trade.fee','Fee')}</th><th class="text-right py-1">${t('trade.pnl','PnL')}</th><th class="text-right py-1">${t('trade.opened','Opened')}</th><th class="text-right px-3 py-1">${t('trade.closed','Closed')}</th>
      </tr></thead>
      <tbody>${filtered.slice(0, 30).map(tradeHistoryRow).join('')}</tbody>
    </table></div>`;

  // Bind filter events
  const symInput = body.querySelector('[data-hist-filter-symbol]');
  const sideSel = body.querySelector('[data-hist-filter-side]');
  const periodSel = body.querySelector('[data-hist-filter-period]');
  const csvBtn = body.querySelector('[data-hist-export-csv]');

  if (symInput) symInput.addEventListener('input', () => { hf.symbol = symInput.value.trim(); renderHistoryActivity(container, history); });
  if (sideSel) sideSel.addEventListener('change', () => { hf.side = sideSel.value; renderHistoryActivity(container, history); });
  if (periodSel) periodSel.addEventListener('change', () => { hf.period = periodSel.value; renderHistoryActivity(container, history); });
  if (csvBtn) csvBtn.addEventListener('click', () => exportHistoryCSV(filtered));
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

// Calculate live unrealized P&L from current market price
function calcLivePnL(pos, currentPrice) {
  const entry = Number(pos.entry_price || pos.open_price || 0);
  if (!entry || !currentPrice) return Number(pos.pnl || pos.unrealized_pnl || 0);
  const side = String(pos.side || 'buy').toUpperCase() === 'SELL' ? -1 : 1;
  const isPerp = String(pos.market_type || '').toLowerCase() === 'perp';
  const margin = Number(pos.margin_initial || pos.margin || 0);
  const leverage = Number(pos.leverage || 1);
  const unitsQty = Number(pos.qty || pos.amount || pos.size || pos.units || 0);
  if (isPerp && margin > 0) {
    return side * leverage * margin * (currentPrice - entry) / entry;
  } else if (unitsQty > 0) {
    return side * unitsQty * (currentPrice - entry);
  }
  return Number(pos.pnl || pos.unrealized_pnl || 0);
}

// Update live P&L cells in the activity panel for positions matching symbol
function updateLivePnL(container, symbol, currentPrice) {
  if (!container.__tradePositions?.length || !(currentPrice > 0)) return;
  const cleanSym = String(symbol || '').replace('@R@', '').replace('@D@', '').toUpperCase();
  const body = $('#activity-body', container);
  let anyUpdated = false;
  container.__tradePositions.forEach(pos => {
    const posSymbol = String(pos.symbol || '').replace('@R@', '').replace('@D@', '').toUpperCase();
    if (posSymbol !== cleanSym) return;
    const id = String(pos.position_id || pos.id || '');
    if (!id) return;
    const livePnl = calcLivePnL(pos, currentPrice);
    pos.pnl = livePnl;
    pos.mark_price = currentPrice;
    anyUpdated = true;
    if (!body) return;
    const cssId = window.CSS?.escape ? window.CSS.escape(id) : id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    // Update mobile card
    const card = body.querySelector(`[data-pos-card="${cssId}"]`);
    if (card) {
      const pnlCell = card.querySelector('[data-pos-pnl-cell]');
      if (pnlCell) { pnlCell.textContent = money(livePnl); pnlCell.className = livePnl >= 0 ? 'text-buy' : 'text-sell'; }
      const markCell = card.querySelector('[data-pos-mark-cell]');
      if (markCell) markCell.textContent = price(currentPrice, pos.asset_type || get('type'));
    }
    // Update desktop table row
    const row = body.querySelector(`[data-pos-row="${cssId}"]`);
    if (row) {
      const pnlCell = row.querySelector('[data-pos-pnl-cell]');
      if (pnlCell) { pnlCell.textContent = money(livePnl); pnlCell.className = livePnl >= 0 ? 'text-buy' : 'text-sell'; }
      const markCell = row.querySelector('[data-pos-mark-cell]');
      if (markCell) markCell.textContent = price(currentPrice, pos.asset_type || get('type'));
    }
  });
  // Update mobile balance strip: recalculate total live PnL
  if (anyUpdated) {
    let totalLivePnl = 0;
    (container.__tradePositions || []).forEach(p => { totalLivePnl += Number(p.pnl || p.unrealized_pnl || 0); });
    const pnl24El = document.getElementById('trade-mob-pnl24');
    const pnlTotalEl = document.getElementById('trade-mob-pnltotal');
    if (pnl24El) { pnl24El.textContent = money(totalLivePnl); pnl24El.className = totalLivePnl >= 0 ? 'text-buy' : 'text-sell'; }
    if (pnlTotalEl) { pnlTotalEl.textContent = money(totalLivePnl); pnlTotalEl.className = totalLivePnl >= 0 ? 'text-buy' : 'text-sell'; }
  }
}

function tradePositionRow(pos) {
  const { pnl, cleanSymbol, posType, mark, id, side } = tradePositionInfo(pos);
  const isPerp = String(pos.market_type || '').toLowerCase() === 'perp';
  return `<tr class="border-t border-line/50 hover:bg-panel/50" data-pos-row="${escAttr(id)}">
    <td class="px-3 py-1.5 font-semibold">${esc(cleanSymbol)}</td>
    <td>${sideBadge(side)}</td>
    <td class="text-muted">${isPerp ? t('trade.perp', 'Perp') : t('trade.spot', 'Spot')}</td>
    <td class="text-right font-mono">${price(pos.entry_price || pos.open_price, posType)}</td>
    <td class="text-right font-mono"><span data-pos-mark-cell>${mark > 0 ? price(mark, posType) : '--'}</span></td>
    <td class="text-right font-mono">${qty(pos.qty || pos.amount || pos.size || pos.units || 0)}</td>
    <td class="text-right font-mono">${isPerp ? `${esc(String(pos.leverage || 1))}x` : '<span class="text-muted text-[9px]">â€”</span>'}</td>
    <td class="text-right font-mono"><span class="${pnl >= 0 ? 'text-buy' : 'text-sell'}" data-pos-pnl-cell>${money(pnl)}</span></td>
    <td class="text-right px-3">${id ? `<button class="btn-xs btn-ghost text-sell" data-close="${escAttr(id)}">${t('common.close', 'Close')}</button>` : ''}</td>
  </tr>`;
}

function tradePositionCard(pos) {
  const { pnl, cleanSymbol, posType, mark, id, side } = tradePositionInfo(pos);
  const isPerp = String(pos.market_type || '').toLowerCase() === 'perp';
  return `<article class="trade-position-card" data-pos-card="${escAttr(id)}">
    <div class="flex items-start justify-between gap-2">
      <div>
        <strong>${esc(cleanSymbol)}</strong>
        <small>${esc(isPerp ? t('trade.perp_futures', 'Perp/Futures') : t('trade.spot', 'Spot'))} - ${esc(pos.created_at || pos.opened_at || '')}</small>
      </div>
      ${sideBadge(side)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${t('trade.entry', 'Entry')}</small><strong>${price(pos.entry_price || pos.open_price, posType)}</strong></span>
      <span><small>${t('trade.mark', 'Mark')}</small><strong data-pos-mark-cell>${mark > 0 ? price(mark, posType) : '--'}</strong></span>
      <span><small>${t('trade.size', 'Size')}</small><strong>${qty(pos.qty || pos.amount || pos.size || pos.units || 0)}</strong></span>
      <span><small>PnL</small><strong class="${pnl >= 0 ? 'text-buy' : 'text-sell'}" data-pos-pnl-cell>${money(pnl)}</strong></span>
      <span><small>${t('trade.margin', 'Margin')}</small><strong>${money(pos.margin_initial || pos.margin || 0)}</strong></span>
      ${isPerp ? `<span><small>${t('trade.leverage', 'Leverage')}</small><strong>${esc(String(pos.leverage || 1))}x</strong></span>` : ''}
      ${isPerp && pos.liquidation_price ? `<span><small>${t('trade.liq_price', 'Liq. Price')}</small><strong class="text-sell">${price(pos.liquidation_price, posType)}</strong></span>` : ''}
    </div>
    ${id ? `<button class="btn-xs btn-ghost text-sell w-full" data-close="${escAttr(id)}">${t('trade.close_position', 'Close position')}</button>` : ''}
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
      <span><small>${t('trade.entry', 'Entry')}</small><strong>${price(o.entry_price || o.fill_price || o.limit_price, type)}</strong></span>
      <span><small>${t('trade.take_profit', 'Take profit')}</small><strong class="text-buy">${o.tp_price ? price(o.tp_price, type) : '--'}</strong></span>
      <span><small>${t('trade.stop_loss', 'Stop loss')}</small><strong class="text-sell">${o.sl_price ? price(o.sl_price, type) : '--'}</strong></span>
      <span><small>${t('deposit.amount', 'Amount')}</small><strong>${money(o.used_usdt || o.usd_amount || o.amount || 0)}</strong></span>
      <span><small>${t('trade.lev', 'Lev')}</small><strong>${esc(String(o.leverage || 1))}x</strong></span>
      <span><small>${t('kyc.status', 'Status')}</small><strong>${esc(o.status || t('trade.open', 'open'))}</strong></span>
      <span><small>${t('funding.mode', 'Mode')}</small><strong>${esc(o.mode || get('mode') || t('mode.demo', 'demo'))}</strong></span>
      <span><small>${t('trade.symbol', 'Symbol')}</small><strong>${esc(orderSymbol(o))}</strong></span>
    </div>
    ${pendingOrderActions(id, o, true)}
  </article>`;
}

function pendingOrderActions(id, order, block = false) {
  if (!id || !isPendingOrder(order)) return '<span class="text-muted text-[10px]">--</span>';
  const cls = block ? 'trade-pending-actions is-card' : 'trade-pending-actions';
  return `<div class="${cls}">
    <button class="btn-xs btn-ghost" data-edit-order="${escAttr(id)}">${t('common.edit', 'Edit')}</button>
    <button class="btn-xs btn-danger" data-cancel-order="${escAttr(id)}">${t('common.cancel', 'Cancel')}</button>
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
    <td class="text-right font-mono">${price(o.fill_price || o.entry_price, type)}</td>
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
        <small>${esc(o.close_reason || o.status || t('trade.closed', 'closed'))} - ${esc(orderDate(o.closed_at || o.created_at))}</small>
      </div>
      ${sideBadge(side)}
    </div>
    <div class="trade-position-metrics">
      <span><small>${t('trade.entry', 'Entry')}</small><strong>${price(o.fill_price || o.entry_price, type)}</strong></span>
      <span><small>${t('trade.exit', 'Exit')}</small><strong>${price(o.exit_price || o.limit_price, type)}</strong></span>
      <span><small>${t('trade.opened', 'Opened')}</small><strong>${esc(orderDate(o.created_at))}</strong></span>
      <span><small>${t('trade.closed', 'Closed')}</small><strong>${esc(orderDate(o.closed_at || o.created_at))}</strong></span>
      <span><small>PnL</small><strong class="${pnl >= 0 ? 'text-buy' : 'text-sell'}">${money(pnl)}</strong></span>
      <span><small>${t('trade.used', 'Used')}</small><strong>${money(o.used_usdt || o.usd_amount || 0)}</strong></span>
      <span><small>${t('trade.fee', 'Fee')}</small><strong>${money(o.fee_paid || 0)}</strong></span>
    </div>
  </article>`;
}

function exportHistoryCSV(orders) {
  const header = 'Symbol,Side,Type,Entry,Exit,Used,Fee,PnL,Opened,Closed,Close Reason';
  const rows = orders.map(o => [
    orderSymbol(o),
    orderSide(o),
    o.market_type || o.order_type || 'spot',
    o.fill_price || o.entry_price || '',
    o.exit_price || o.limit_price || '',
    o.used_usdt || o.usd_amount || 0,
    o.fee_paid || 0,
    o.pnl_usd || o.pnl || 0,
    o.created_at || '',
    o.closed_at || '',
    o.close_reason || ''
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trade_history_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function sideBadge(side) {
  const normalized = String(side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  return `<span class="trade-side-chip is-${normalized.toLowerCase()}">${esc(sideLabel(normalized))}</span>`;
}

function sideLabel(side) {
  return String(side || '').toUpperCase() === 'SELL' ? t('trade.sell', 'SELL') : t('trade.buy', 'BUY');
}


function normalizeCandleRows(candles, options = {}) {
  const data = (candles || [])
    .map(c => ({
      time: Number(c.time || c.t),
      open: Number(c.open || c.o),
      high: Number(c.high || c.h),
      low: Number(c.low || c.l),
      close: Number(c.close || c.c),
      volume: Number(c.volume || c.v || 0),
    }))
    .filter(c => c.time > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
    .sort((a, b) => a.time - b.time);
  if (options.fillGaps) {
    return fillVisualCandleGaps(data, options.type || get('type'), options.tf || get('tf'));
  }
  return data;
}

function visualGapFillLimit(type, tf) {
  const value = normalizeType(type || 'crypto');
  const frame = String(tf || '1m').toLowerCase();
  if (['1d', '1w'].includes(frame)) return 0;
  if (value === 'crypto') return 2;
  if (['forex', 'commodities'].includes(value)) {
    if (['1m', '3m'].includes(frame)) return 12;
    if (['5m', '15m'].includes(frame)) return 8;
    return 4;
  }
  if (['stocks', 'arab'].includes(value)) {
    if (['1m', '3m', '5m'].includes(frame)) return 5;
    return 3;
  }
  return 0;
}

function fillVisualCandleGaps(candles, type = get('type'), tf = get('tf')) {
  if (!Array.isArray(candles) || candles.length < 2) return candles || [];
  const step = tfSeconds(tf);
  const maxFill = visualGapFillLimit(type, tf);
  if (!(step > 0) || maxFill <= 0) return candles;
  const out = [];
  for (let i = 0; i < candles.length; i += 1) {
    const cur = candles[i];
    out.push(cur);
    const next = candles[i + 1];
    if (!next) continue;
    const missing = Math.round((Number(next.time) - Number(cur.time)) / step) - 1;
    if (missing <= 0 || missing > maxFill) continue;
    const anchor = Number(cur.close || cur.open || 0);
    if (!(anchor > 0)) continue;
    for (let m = 1; m <= missing; m += 1) {
      out.push({
        time: Number(cur.time) + (m * step),
        open: anchor,
        high: anchor,
        low: anchor,
        close: anchor,
        volume: 0,
        visualGap: true,
      });
    }
  }
  return out;
}

function syntheticCandlesFromPrice(symbol, type, tf, priceValue, rows = 120) {
  return [];
  const base = Number(priceValue || 0);
  if (!(base > 0)) return [];
  const step = tfSeconds(tf);
  const now = Math.floor(Date.now() / 1000 / step) * step;
  const seed = String(symbol || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const volatility = normalizeType(type) === 'crypto' ? 0.0035 : 0.0016;
  let prev = base * (1 - volatility * 2);
  const candles = [];
  for (let i = rows - 1; i >= 0; i--) {
    const time = now - (i * step);
    const phase = (seed + i * 7) % 31;
    const wave = Math.sin((phase / 31) * Math.PI * 2) * volatility;
    const drift = ((rows - i) / rows) * volatility * 1.25;
    const close = i === 0 ? base : base * (1 - volatility + drift + wave);
    const open = prev;
    const spread = Math.max(base * volatility * (0.35 + ((phase % 5) / 12)), base * 0.0002);
    const high = Math.max(open, close) + spread;
    const low = Math.max(0.0000001, Math.min(open, close) - spread);
    candles.push({ time, open, high, low, close, volume: 0 });
    prev = close;
  }
  return candles;
}

function chartFallbackPrice(container, symbol = get('symbol')) {
  const active = get('activeQuote') || {};
  if (String(active.symbol || symbol || '').toUpperCase() === String(symbol || '').toUpperCase()) {
    const p = Number(active.price || active.q_price || 0);
    if (p > 0) return p;
  }
  const item = (container.__marketItems || []).find(m => String(m.symbol || '').toUpperCase() === String(symbol || '').toUpperCase());
  const itemPrice = Number(item?.price || item?.q_price || 0);
  if (itemPrice > 0) return itemPrice;
  const visibleText = String($('#live-price', container)?.textContent || '').replace(/[^\d.\-]/g, '');
  const visiblePrice = Number(visibleText || 0);
  return visiblePrice > 0 ? visiblePrice : 0;
}

function scheduleSyntheticChartFallback(container, symbol, type, runId) {
  return;
  if (get('mode') === 'real') return;
  [900, 1800, 3200].forEach((delay) => {
    setTimeout(() => {
      if (!isCurrentRun(runId, symbol, type) || chart || candleSeries) return;
      const fallbackPrice = chartFallbackPrice(container, symbol);
      if (fallbackPrice > 0) bootstrapSyntheticChart(container, fallbackPrice, runId);
    }, delay);
  });
}

function bootstrapSyntheticChart(container, priceValue, runId = tradeRunId) {
  return;
  if (get('mode') === 'real') return;
  if (chart || candleSeries || container.__syntheticChartBooting || !(Number(priceValue) > 0)) return;
  const box = $('#chart-box', container);
  if (!box) return;
  const text = String(box.textContent || '').toLowerCase();
  if (!text.includes('loading') && !text.includes('chart data')) return;
  const symbol = get('symbol');
  const type = get('type');
  const tf = get('tf');
  const candles = syntheticCandlesFromPrice(symbol, type, tf, priceValue);
  if (!candles.length) return;
  container.__syntheticChartBooting = true;
  loadChartLib()
    .then(() => {
      if (!isCurrentRun(runId, symbol, type) || chart || candleSeries) return;
      return initChart(container, candles, runId);
    })
    .finally(() => { container.__syntheticChartBooting = false; });
}

function symbolListSkeleton(rows = 9) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += `<div class="symbol-skeleton-row">
      <div class="skeleton-block w-7 h-7 rounded-full shrink-0"></div>
      <div class="flex-1 min-w-0">
        <div class="skeleton-block h-2.5 w-16 rounded mb-1.5"></div>
        <div class="skeleton-block h-2 w-10 rounded"></div>
      </div>
      <div class="skeleton-block h-2.5 w-12 rounded"></div>
    </div>`;
  }
  return html;
}

function chartKeyFor(symbol = get('symbol'), type = get('type'), market = get('market'), tf = get('tf')) {
  return [
    String(symbol || '').toUpperCase(),
    normalizeType(type || 'crypto'),
    normalizeMarketForType(type || get('type') || 'crypto', market || get('market')),
    String(tf || '1m').toLowerCase(),
  ].join('|');
}

function currentChartKey() {
  return chartKeyFor();
}

function cancelActiveChartRequest() {
  chartDataRequestSeq++;
  if (chartDataController) {
    try { chartDataController.abort(); } catch (_e) {}
    chartDataController = null;
  }
}

function isActiveChartRequest(requestId, runId, symbol, type, key) {
  return requestId === chartDataRequestSeq
    && isCurrentRun(runId, symbol, type)
    && key === currentChartKey();
}

function mergeCandleSets(base, incoming) {
  const by = new Map();
  (base || []).forEach(c => by.set(c.time, c));
  (incoming || []).forEach(c => by.set(c.time, c));
  return Array.from(by.values()).sort((a, b) => a.time - b.time);
}

function rememberChartCandles(key = currentChartKey(), candles = allCandles) {
  const data = normalizeCandleRows(candles);
  if (!key || !data.length) return;
  chartCandleCache.delete(key);
  chartCandleCache.set(key, data.slice(-CHART_MAX_INITIAL_LIMIT));
  while (chartCandleCache.size > CHART_CANDLE_CACHE_MAX) {
    const oldest = chartCandleCache.keys().next().value;
    chartCandleCache.delete(oldest);
  }
}

function cachedChartCandles(key = currentChartKey()) {
  const data = chartCandleCache.get(key);
  return Array.isArray(data) && data.length ? data.map(c => ({ ...c })) : [];
}

function cancelChartPrefetch(container) {
  if (!container) return;
  if (container.__chartPrefetchTimer) {
    clearTimeout(container.__chartPrefetchTimer);
    container.__chartPrefetchTimer = null;
  }
  container.__chartPrefetchToken = (Number(container.__chartPrefetchToken || 0) + 1);
}

function scheduleChartPrefetch(container, items, runId = tradeRunId, listType = null) {
  if (!container || !Array.isArray(items) || !items.length || document.hidden) return;
  cancelChartPrefetch(container);
  const token = container.__chartPrefetchToken;
  const activeSymbol = String(get('symbol') || '').toUpperCase();
  const tf = get('tf') || '15m';
  const baseType = normalizeType(listType || get('type') || 'crypto');
  const max = baseType === 'crypto' ? 8 : 10;
  const queue = items
    .slice(0, 40)
    .map(item => {
      const symbol = String(item.symbol || '').toUpperCase();
      const type = normalizeType(item.type || baseType);
      const market = normalizeMarketForType(type, item.market || item.market_type || get('market') || defaultMarketForType(type));
      return { symbol, type, market };
    })
    .filter(item => item.symbol && item.symbol !== activeSymbol)
    .filter(item => !cachedChartCandles(chartKeyFor(item.symbol, item.type, item.market, tf)).length)
    .slice(0, max);
  if (!queue.length) return;

  let index = 0;
  const runNext = async () => {
    if (container.__chartPrefetchToken !== token || !isCurrentRun(runId)) return;
    const item = queue[index++];
    if (!item) return;
    const key = chartKeyFor(item.symbol, item.type, item.market, tf);
    const limit = item.type === 'crypto' ? 120 : 90;
    try {
      const data = await api(`/trade/candles.php?symbol=${encodeURIComponent(item.symbol)}&type=${encodeURIComponent(item.type)}&market=${encodeURIComponent(item.market)}&tf=${encodeURIComponent(tf)}&limit=${limit}&fast=1`, {
        timeout: item.type === 'crypto' ? 5000 : 6500,
        retry: 0,
        cacheTtl: 30000,
      });
      if (data?.items?.length) rememberChartCandles(key, data.items);
    } catch (_e) {
      // Background prefetch must never affect the active chart.
    }
    if (container.__chartPrefetchToken !== token || !isCurrentRun(runId)) return;
    container.__chartPrefetchTimer = setTimeout(runNext, item.type === 'crypto' ? 350 : 650);
  };
  container.__chartPrefetchTimer = setTimeout(runNext, 350);
}

function applyChartData(candles, { fit = false, key = currentChartKey(), preserveRange = false, skipUnchanged = false } = {}) {
  if (!candleSeries || !volumeSeries) return false;
  const data = normalizeCandleRows(candles, { fillGaps: true, type: get('type'), tf: get('tf') });
  if (!data.length) return false;
  if (skipUnchanged && chartSeriesKey === key && !hasCandleDelta(data)) return true;
  if (chartSeriesKey === key && allCandles.length) {
    // Incoming is the latest window; merge it with retained older history.
    allCandles = mergeCandleSets(allCandles, data);
  } else {
    allCandles = data;
    chartHistory = { loading: false, done: false, nextAt: 0 };
  }
  chartSeriesKey = key;
  rememberChartCandles(key, allCandles);
  renderChartSeries({ fit, preserveRange });
  return true;
}

function hasCandleDelta(data) {
  if (!allCandles.length) return true;
  const sample = data.slice(-12);
  for (const next of sample) {
    const prev = findCandleByTime(next.time);
    if (!prev || !sameCandle(prev, next)) return true;
  }
  return false;
}

function findCandleByTime(time) {
  for (let i = allCandles.length - 1; i >= 0; i--) {
    if (allCandles[i].time === time) return allCandles[i];
    if (allCandles[i].time < time) break;
  }
  return null;
}

function sameCandle(a, b) {
  return closeEnough(a.open, b.open)
    && closeEnough(a.high, b.high)
    && closeEnough(a.low, b.low)
    && closeEnough(a.close, b.close)
    && closeEnough(a.volume || 0, b.volume || 0);
}

function closeEnough(a, b) {
  const left = Number(a || 0);
  const right = Number(b || 0);
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= scale * 1e-8;
}

function renderChartSeries({ fit = false, preserveRange = false } = {}) {
  if (!chart || !candleSeries || !volumeSeries) return;
  const data = allCandles;
  if (!data.length) return;
  let savedRange = null;
  if (preserveRange) { try { savedRange = chart.timeScale().getVisibleRange(); } catch (_e) {} }
  try {
    applyChartPriceOptions(get('type'), get('symbol'));
    candleSeries.setData(data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    const lineData = data.map(c => ({ time: c.time, value: c.close }));
    if (lineSeries) lineSeries.setData(lineData);
    if (areaSeries) areaSeries.setData(lineData);
    volumeSeries.setData(data.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(0,192,135,0.25)' : 'rgba(246,70,93,0.2)' })));
    const closes = data.map(d => ({ time: d.time, close: d.close }));
    if (ma7Series) ma7Series.setData(chartIndicators.ma ? calcMA(closes, 7) : []);
    if (ma25Series) ma25Series.setData(chartIndicators.ma ? calcMA(closes, 25) : []);
    if (ema20Series) ema20Series.setData(chartIndicators.ema ? calcEMA(closes, 20) : []);
    if (bollUpperSeries && bollMidSeries && bollLowerSeries) {
      const bands = chartIndicators.boll ? calcBoll(closes, 20, 2) : { upper: [], mid: [], lower: [] };
      bollUpperSeries.setData(bands.upper);
      bollMidSeries.setData(bands.mid);
      bollLowerSeries.setData(bands.lower);
    }
    if (rsiSeries) {
      const rsiData = chartIndicators.rsi ? calcRSI(closes, 14) : [];
      rsiSeries.setData(rsiData);
      // RSI reference lines at 30 and 70
      if (rsiRefLine30 && rsiRefLine70 && rsiData.length) {
        const ref30 = rsiData.map(p => ({ time: p.time, value: 30 }));
        const ref70 = rsiData.map(p => ({ time: p.time, value: 70 }));
        rsiRefLine30.setData(chartIndicators.rsi ? ref30 : []);
        rsiRefLine70.setData(chartIndicators.rsi ? ref70 : []);
      }
      try { chart.priceScale('rsi').applyOptions({ visible: chartIndicators.rsi }); } catch (_e) {}
    }
    if (macdSeries && macdSignalSeries && macdHistSeries) {
      const m = chartIndicators.macd ? calcMACD(closes, 12, 26, 9) : { macd: [], signal: [], hist: [] };
      macdSeries.setData(m.macd);
      macdSignalSeries.setData(m.signal);
      macdHistSeries.setData(m.hist);
      try { chart.priceScale('macd').applyOptions({ visible: chartIndicators.macd }); } catch (_e) {}
    }
    if (stochKSeries && stochDSeries) {
      const s = chartIndicators.stoch ? calcStochastic(closes, 14, 3, 3) : { k: [], d: [] };
      stochKSeries.setData(s.k);
      stochDSeries.setData(s.d);
      try { chart.priceScale('stoch').applyOptions({ visible: chartIndicators.stoch }); } catch (_e) {}
    }
    lastCandle = { ...data[data.length - 1] };
    if (savedRange) { try { chart.timeScale().setVisibleRange(savedRange); } catch (_e) {} }
    else if (fit) chart.timeScale().fitContent();
    updateChartLegend(null);
    updateChartPriceLines();
  } catch (_e) {}
}

function clearChartForSwitch(container) {
  cancelActiveChartRequest();
  cancelMonthHistoryPrefetch(container);
  cancelLiveCandleFrame();
  stopBinanceKlineWs();
  chartSeriesKey = '';
  lastCandle = null;
  allCandles = [];
  chartHistory = { loading: false, done: false, nextAt: 0 };
  lastPriceFlashAt = 0;
  clearChartPriceLines();
  try {
    if (candleSeries) candleSeries.setData([]);
    if (volumeSeries) volumeSeries.setData([]);
    if (ma7Series) ma7Series.setData([]);
    if (ma25Series) ma25Series.setData([]);
    if (lineSeries) lineSeries.setData([]);
    if (areaSeries) areaSeries.setData([]);
    if (ema20Series) ema20Series.setData([]);
    if (bollUpperSeries) bollUpperSeries.setData([]);
    if (bollMidSeries) bollMidSeries.setData([]);
    if (bollLowerSeries) bollLowerSeries.setData([]);
    if (rsiSeries) rsiSeries.setData([]);
    if (rsiRefLine30) rsiRefLine30.setData([]);
    if (rsiRefLine70) rsiRefLine70.setData([]);
    if (macdSeries) macdSeries.setData([]);
    if (macdSignalSeries) macdSignalSeries.setData([]);
    if (macdHistSeries) macdHistSeries.setData([]);
    if (stochKSeries) stochKSeries.setData([]);
    if (stochDSeries) stochDSeries.setData([]);
  } catch (_e) {}
  updateChartLegend(null);
  if (chart) showChartOverlay(container);
  else {
    const box = $('#chart-box', container);
    if (box) {
      box.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>';
    }
  }
}

function showChartOverlay(container) {
  const box = $('#chart-box', container);
  if (!box) return;
  let ov = box.querySelector('.chart-loading-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'chart-loading-overlay';
    ov.innerHTML = '<div class="loading-spinner"></div>';
    box.appendChild(ov);
  }
  ov.classList.add('is-visible');
}

function hideChartOverlay(container) {
  const box = $('#chart-box', container);
  const ov = box ? box.querySelector('.chart-loading-overlay') : null;
  if (ov) ov.classList.remove('is-visible');
}

function updateChartLegend(candle) {
  if (!chartLegendEl) return;
  const c = candle || lastCandle;
  if (!c || !(c.open > 0)) { chartLegendEl.innerHTML = ''; return; }
  const type = get('type');
  const chg = c.open > 0 ? ((c.close - c.open) / c.open) * 100 : 0;
  const cls = c.close >= c.open ? 'is-up' : 'is-down';
  chartLegendEl.innerHTML =
    `<span>O <b>${price(c.open, type)}</b></span>` +
    `<span>H <b>${price(c.high, type)}</b></span>` +
    `<span>L <b>${price(c.low, type)}</b></span>` +
    `<span>C <b class="${cls}">${price(c.close, type)}</b></span>` +
    `<span class="${cls}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>`;
}

function chartPrecisionFor(type = get('type'), symbol = get('symbol')) {
  const value = normalizeType(type || 'crypto');
  const sym = String(symbol || '').toUpperCase();
  if (value === 'forex') return sym.includes('JPY') ? 3 : 5;
  if (value === 'crypto') {
    const ref = Number(get('activeQuote')?.price || lastCandle?.close || 0);
    if (ref >= 1000) return 2;
    if (ref >= 1) return 4;
    return 6;
  }
  if (['commodities', 'futures'].includes(value)) return 2;
  return 2;
}

function chartPriceFormatFor(type = get('type'), symbol = get('symbol')) {
  const precision = chartPrecisionFor(type, symbol);
  return { type: 'price', precision, minMove: Math.pow(10, -precision) };
}

function applyChartPriceOptions(type = get('type'), symbol = get('symbol')) {
  const priceFormat = chartPriceFormatFor(type, symbol);
  try { candleSeries?.applyOptions({ priceFormat, lastValueVisible: false, priceLineVisible: false }); } catch (_e) {}
  try { lineSeries?.applyOptions({ priceFormat, lastValueVisible: false, priceLineVisible: false }); } catch (_e) {}
  try { areaSeries?.applyOptions({ priceFormat, lastValueVisible: false, priceLineVisible: false }); } catch (_e) {}
  try {
    chart?.applyOptions({
      rightPriceScale: {
        visible: true,
        borderVisible: true,
        borderColor: 'rgba(129,160,220,0.16)',
        entireTextOnly: false,
        alignLabels: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });
  } catch (_e) {}
}

function chartLivePriceSeries() {
  if (chartType === 'line' && lineSeries) return lineSeries;
  if (chartType === 'area' && areaSeries) return areaSeries;
  return candleSeries;
}

function clearChartPriceLines() {
  if (chartPriceLines.live && chartPriceLines.series) {
    try { chartPriceLines.series.removePriceLine(chartPriceLines.live); } catch (_e) {}
  }
  chartPriceLines = { live: null, series: null };
}

function addChartPriceLine(kind, priceValue, options) {
  const series = chartLivePriceSeries();
  if (!series || !(Number(priceValue) > 0)) return null;
  try {
    const line = series.createPriceLine({
      price: Number(priceValue),
      axisLabelVisible: true,
      lineVisible: true,
      lineWidth: 1,
      lineStyle: 2,
      ...options,
    });
    chartPriceLines.series = series;
    return line;
  } catch (_e) {
    return null;
  }
}

function setChartPriceLine(kind, priceValue, options) {
  const series = chartLivePriceSeries();
  if (!series || !(Number(priceValue) > 0)) return null;
  const lineOptions = {
    price: Number(priceValue),
    axisLabelVisible: true,
    lineVisible: true,
    lineWidth: 1,
    lineStyle: 2,
    ...options,
  };
  const existing = chartPriceLines.live;
  if (existing && chartPriceLines.series !== series) {
    try { chartPriceLines.series?.removePriceLine(existing); } catch (_e) {}
    chartPriceLines.live = null;
    chartPriceLines.series = null;
  }
  if (chartPriceLines.live && typeof chartPriceLines.live.applyOptions === 'function') {
    try {
      chartPriceLines.live.applyOptions(lineOptions);
      return chartPriceLines.live;
    } catch (_e) {
      try { series.removePriceLine(chartPriceLines.live); } catch (__e) {}
      chartPriceLines.live = null;
      chartPriceLines.series = null;
    }
  }
  return addChartPriceLine(kind, priceValue, options);
}

function updateChartPriceLines(q = get('activeQuote') || {}) {
  if (!chart || !candleSeries || !chartSeriesKey || chartSeriesKey !== currentChartKey()) return;
  const p = Number(q.price || q.q_price || lastCandle?.close || 0);
  if (!(p > 0)) return;
  chartPriceLines.live = setChartPriceLine('live', p, {
    color: '#00e5ff',
    title: 'LIVE',
    lineStyle: 0,
    lineWidth: 2,
  });
}

function setChartType(type) {
  if (!['candles', 'line', 'area'].includes(type)) return;
  chartType = type;
  try { localStorage.setItem('vp_chart_type', type); } catch (_e) {}
  safeChartOp(() => {
    if (candleSeries) candleSeries.applyOptions({ visible: type === 'candles' });
    if (lineSeries) lineSeries.applyOptions({ visible: type === 'line' });
    if (areaSeries) areaSeries.applyOptions({ visible: type === 'area' });
  });
  clearChartPriceLines();
  updateChartPriceLines();
  syncChartToolbar();
}

function toggleChartIndicator(name) {
  if (!(name in chartIndicators)) return;
  chartIndicators[name] = !chartIndicators[name];
  try { localStorage.setItem('vp_chart_ind', JSON.stringify(chartIndicators)); } catch (_e) {}
  renderChartSeries({ preserveRange: true });
  syncChartToolbar();
}

function syncChartToolbar() {
  const bar = chart && chartLegendEl ? chartLegendEl.parentElement?.querySelector('.chart-toolbar') : null;
  if (!bar) return;
  bar.querySelectorAll('[data-chart-type]').forEach(b => b.classList.toggle('active', b.dataset.chartType === chartType));
  bar.querySelectorAll('[data-chart-ind]').forEach(b => b.classList.toggle('active', !!chartIndicators[b.dataset.chartInd]));
}

function toggleChartFullscreen(container) {
  const box = $('#chart-box', container);
  if (!box) return;
  const on = !box.classList.contains('chart-fullscreen');
  box.classList.toggle('chart-fullscreen', on);
  document.body.classList.toggle('chart-fullscreen-open', on);
  setTimeout(() => {
    if (chart && box) safeChartOp(() => chart.applyOptions({ width: Math.max(320, box.clientWidth), height: Math.max(260, box.clientHeight) }));
  }, 60);
}

function monthHistoryStartTime() {
  return Math.floor(Date.now() / 1000) - (CHART_HISTORY_DAYS * 86400);
}

function hasMonthHistoryLoaded() {
  return allCandles.length > 0 && Number(allCandles[0]?.time || 0) <= monthHistoryStartTime();
}

function cancelMonthHistoryPrefetch(container) {
  if (container?.__monthHistoryTimer) {
    clearTimeout(container.__monthHistoryTimer);
    container.__monthHistoryTimer = null;
  }
  if (container) container.__monthHistoryPrefetchKey = '';
}

function scheduleMonthHistoryPrefetch(container, runId = tradeRunId) {
  if (!container || hasMonthHistoryLoaded()) return;
  cancelMonthHistoryPrefetch(container);
  const key = currentChartKey();
  let pages = 0;
  const tick = async () => {
    if (!isCurrentRun(runId) || currentChartKey() !== key || chartSeriesKey !== key) return;
    if (hasMonthHistoryLoaded() || chartHistory.done) return;
    if (pages >= CHART_MONTH_PREFETCH_MAX_PAGES) return;
    pages += 1;
    await loadOlderCandles(container, { force: true }).catch(() => false);
    if (!isCurrentRun(runId) || currentChartKey() !== key || chartSeriesKey !== key) return;
    if (hasMonthHistoryLoaded() || chartHistory.done) return;
    container.__monthHistoryTimer = setTimeout(tick, CHART_MONTH_PREFETCH_DELAY);
  };
  container.__monthHistoryPrefetchKey = key;
  container.__monthHistoryTimer = setTimeout(tick, CHART_MONTH_PREFETCH_DELAY);
}

async function loadOlderCandles(container, options = {}) {
  if (!chart || chartHistory.loading || chartHistory.done) return;
  if (!allCandles.length || allCandles.length < 50) return;
  const now = Date.now();
  if (!options.force && now < chartHistory.nextAt) return;
  const key = currentChartKey();
  if (chartSeriesKey !== key) return;
  chartHistory.loading = true;
  try {
    const symbol = get('symbol');
    const type = get('type');
    const tf = get('tf');
    const oldest = allCandles[0].time;
    const pageLimit = chartPageLimitFor(type, tf);
    const market = get('market') || defaultMarketForType(type);
    const data = await api(
      `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&tf=${encodeURIComponent(tf)}&limit=${pageLimit}&end=${oldest - 1}`,
      { timeout: 12000, retry: 0, cacheTtl: 0 }
    );
    if (chartSeriesKey !== key || currentChartKey() !== key) return;
    const older = normalizeCandleRows(data?.items || []).filter(c => c.time < oldest);
    if (!older.length) { chartHistory.done = true; return; }
    allCandles = mergeCandleSets(older, allCandles);
    renderChartSeries({ preserveRange: true });
    if (data?.has_more === false || older.length < 20) chartHistory.done = true;
  } catch (_e) {
    // transient failure: retry later via cooldown
  } finally {
    chartHistory.loading = false;
    chartHistory.nextAt = Date.now() + 1500;
  }
}

const CHART_TYPE_ICONS = {
  candles: '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4.5 1h1v2H7v8H5.5v3h-1v-3H3V3h1.5V1zM4 4v6h2V4H4zm6.5-1h1v3H13v5h-1.5v4h-1v-4H9V6h1.5V3zM10 7v3h2V7h-2z"/></svg>',
  line: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12l4-5 3 3 6-7"/></svg>',
  area: '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M1 13l4-6 3 3 6-7v10H1z" opacity="0.5"/><path d="M1 12l4-5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
};

function buildChartToolbar(container) {
  const bar = document.createElement('div');
  bar.className = 'chart-toolbar';
  bar.innerHTML =
    ['candles', 'line', 'area'].map(tp =>
      `<button type="button" data-chart-type="${tp}" title="${tp}">${CHART_TYPE_ICONS[tp]}</button>`
    ).join('') +
    '<span class="chart-toolbar-sep"></span>' +
    '<button type="button" data-chart-ind="ma" title="MA 7/25">MA</button>' +
    '<button type="button" data-chart-ind="ema" title="EMA 20">EMA</button>' +
    '<button type="button" data-chart-ind="boll" title="Bollinger Bands">BOLL</button>' +
    '<button type="button" data-chart-ind="rsi" title="RSI 14">RSI</button>' +
    '<button type="button" data-chart-ind="macd" title="MACD 12/26/9">MACD</button>' +
    '<button type="button" data-chart-ind="stoch" title="Stochastic 14/3/3">STOCH</button>' +
    '<span class="chart-toolbar-sep"></span>' +
    '<button type="button" data-chart-fullscreen="1" title="Fullscreen">â›¶</button>';
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.chartType) setChartType(btn.dataset.chartType);
    else if (btn.dataset.chartInd) toggleChartIndicator(btn.dataset.chartInd);
    else if (btn.dataset.chartFullscreen) toggleChartFullscreen(container);
  });
  return bar;
}

async function initChart(container, candles, runId = tradeRunId) {
  if (!isCurrentRun(runId)) return;
  const el = $('#chart-box', container);
  if (!el) return;

  const { createChart } = await loadChartLib();
  if (!isCurrentRun(runId)) return;
  el.innerHTML = '';
  const activeType = get('type');
  const activeSymbol = get('symbol');
  const mainPriceFormat = chartPriceFormatFor(activeType, activeSymbol);

  chart = createChart(el, {
    layout: { background: { color: '#060A14' }, textColor: '#8ba1cf', fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif" },
    grid: { vertLines: { color: 'rgba(129,160,220,0.04)' }, horzLines: { color: 'rgba(129,160,220,0.04)' } },
    crosshair: { mode: 0, vertLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff', width: 1, style: 2, visible: true, labelVisible: true }, horzLine: { color: 'rgba(93,124,255,0.3)', labelBackgroundColor: '#5d7cff', width: 1, style: 2, visible: true, labelVisible: true } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(129,160,220,0.08)', rightOffset: 8, barSpacing: 8, minBarSpacing: 2, fixLeftEdge: false, fixRightEdge: false },
    rightPriceScale: { visible: true, borderVisible: true, borderColor: 'rgba(129,160,220,0.16)', scaleMargins: { top: 0.1, bottom: 0.2 }, autoScale: true, alignLabels: true, entireTextOnly: false },
    watermark: { visible: true, text: 'MEX Group', color: 'rgba(93,124,255,0.06)', fontSize: 48, horzAlign: 'center', vertAlign: 'center' },
    width: Math.max(320, el.clientWidth),
    height: Math.max(260, el.clientHeight),
    handleScroll: { vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    animation: true,
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#00c087',
    downColor: '#f6465d',
    borderUpColor: '#00c087',
    borderDownColor: '#f6465d',
    wickUpColor: '#00c08780',
    wickDownColor: '#f6465d80',
    wickVisible: true,
    borderVisible: true,
    visible: chartType === 'candles',
    lastValueVisible: false,
    priceLineVisible: false,
    priceLineWidth: 1,
    priceLineStyle: 2,
    priceLineColor: '#5d7cff80',
    priceFormat: mainPriceFormat,
  });
  lineSeries = chart.addLineSeries({
    color: '#5d7cff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
    crosshairMarkerVisible: true, visible: chartType === 'line',
    priceFormat: mainPriceFormat,
  });
  areaSeries = chart.addAreaSeries({
    lineColor: '#5d7cff', lineWidth: 2,
    topColor: 'rgba(93,124,255,0.30)', bottomColor: 'rgba(93,124,255,0.02)',
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true, visible: chartType === 'area',
    priceFormat: mainPriceFormat,
  });
  volumeSeries = chart.addHistogramSeries({ 
    priceFormat: { type: 'volume' }, 
    priceScaleId: 'vol',
    color: 'rgba(93,124,255,0.3)',
  });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

  // Indicators
  ma7Series = chart.addLineSeries({ color: 'rgba(255,193,7,0.55)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  ma25Series = chart.addLineSeries({ color: 'rgba(93,124,255,0.55)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  ema20Series = chart.addLineSeries({ color: 'rgba(0,229,255,0.55)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  bollUpperSeries = chart.addLineSeries({ color: 'rgba(186,104,200,0.45)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  bollMidSeries = chart.addLineSeries({ color: 'rgba(186,104,200,0.30)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  bollLowerSeries = chart.addLineSeries({ color: 'rgba(186,104,200,0.45)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

  // RSI (separate price scale)
  rsiSeries = chart.addLineSeries({ color: '#e040fb', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, priceScaleId: 'rsi', visible: false });
  rsiRefLine30 = chart.addLineSeries({ color: 'rgba(0,192,135,0.25)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'rsi', visible: false });
  rsiRefLine70 = chart.addLineSeries({ color: 'rgba(246,70,93,0.25)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'rsi', visible: false });
  chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.76, bottom: 0.02 }, visible: false });

  // MACD (separate price scale)
  macdSeries = chart.addLineSeries({ color: '#5d7cff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'macd', visible: false });
  macdSignalSeries = chart.addLineSeries({ color: '#ff6d00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'macd', visible: false });
  macdHistSeries = chart.addHistogramSeries({ priceFormat: { type: 'price', precision: 4 }, priceScaleId: 'macd', visible: false });
  chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.76, bottom: 0.02 }, visible: false });

  // Stochastic (separate price scale)
  stochKSeries = chart.addLineSeries({ color: '#00bcd4', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, priceScaleId: 'stoch', visible: false });
  stochDSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'stoch', visible: false });
  chart.priceScale('stoch').applyOptions({ scaleMargins: { top: 0.76, bottom: 0.02 }, visible: false });

  // Overlay UI: OHLC legend (top-left) + toolbar (top-right)
  chartLegendEl = document.createElement('div');
  chartLegendEl.className = 'chart-legend';
  el.appendChild(chartLegendEl);
  el.appendChild(buildChartToolbar(container));
  syncChartToolbar();

  chart.subscribeCrosshairMove((param) => {
    if (!param || !param.time) { updateChartLegend(null); return; }
    let c = null;
    try {
      const sd = param.seriesData && param.seriesData.get(candleSeries);
      if (sd && sd.open !== undefined) c = sd;
    } catch (_e) {}
    if (!c) c = allCandles.find(x => x.time === param.time) || null;
    updateChartLegend(c);
  });

  // Infinite history: pull older pages when user scrolls near the left edge.
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!range || range.from > 12) return;
    loadOlderCandles(container).catch(() => {});
  });

  applyChartData(candles, { fit: true });
  hideChartOverlay(container);

  resizeObserver = new ResizeObserver(() => {
    if (!chart || !el) return;
    safeChartOp(() => chart.applyOptions({ width: Math.max(320, el.clientWidth), height: Math.max(260, el.clientHeight) }));
  });
  resizeObserver.observe(el);
  // Force correct size on first paint â€” el.clientWidth may be 0 before layout settles
  requestAnimationFrame(() => {
    if (!chart || !el) return;
    const w = Math.max(320, el.clientWidth);
    const h = Math.max(260, el.clientHeight);
    safeChartOp(() => {
      chart.applyOptions({ width: w, height: h });
      chart.timeScale().fitContent();
    });
  });
}


// In-place symbol/timeframe switching (no navigate -> no full re-render, no market refetch).
function syncTradeUrl(symbol, type, tf) {
  try {
    const qs = new URLSearchParams({ symbol, type, market: get('market') || defaultMarketForType(type), tf }).toString();
    history.replaceState(null, '', `#/trade?${qs}`);
  } catch (_e) {}
}

function markActiveSymbolRow(container, symbol) {
  const target = String(symbol || '').toUpperCase();
  $$('.symbol-row', container).forEach(row => {
    row.classList.toggle('active', String(row.dataset.sym || '').toUpperCase() === target);
  });
}

function markActiveTf(container, tf) {
  $$('[data-tf]', container).forEach(btn => {
    const active = btn.dataset.tf === tf;
    btn.classList.toggle('bg-accent/20', active);
    btn.classList.toggle('text-accent', active);
    btn.classList.toggle('text-muted', !active);
  });
}

function updateInstrumentHeader(container, symbol, type) {
  const sym = String(symbol || '').toUpperCase();
  const typeLabel = String(type || '').toUpperCase();
  const logo = $('#sym-logo-slot', container);
  if (logo) logo.innerHTML = marketLogo(sym, type, 'w-7 h-7 rounded-md shrink-0');
  const name = $('#sym-name', container);
  if (name) name.textContent = sym;
  const ticket = $('#ticket-instrument', container);
  if (ticket) ticket.textContent = `${sym} - ${typeLabel}`;
  const mLogo = $('#mobile-order-logo-slot', container);
  if (mLogo) mLogo.innerHTML = marketLogo(sym, type, 'w-8 h-8 rounded-lg shrink-0');
  const mName = $('#mobile-order-symbol', container);
  if (mName) mName.textContent = sym;
  $$('[data-order-symbol]', container).forEach(el => { el.textContent = sym || '--'; });
}

function switchSymbol(container, symbol, type) {
  const sym = String(symbol || '').toUpperCase();
  if (!sym) return;
  const prevType = normalizeType(get('type'));
  const nextTypeRaw = type || get('type');
  const nextType = normalizeType(nextTypeRaw);
  const typeChanged = nextType !== prevType;
  const tf = get('tf');
  stopActiveQuote();
  stopChartRefresh();
  clearChartForSwitch(container);
  lastFlashPrice = 0;
  persistTradeSelection(sym, nextType, get('market'));
  set('activeQuote', null);
  const runId = tradeRunId;
  currentSetup = { container, symbol: sym, type: nextType, tf, runId };
  syncTradeUrl(sym, nextType, tf);
  updateInstrumentHeader(container, sym, nextType);
  markActiveSymbolRow(container, sym);
  updateOrderInfo(container);
  hydrateActiveFromMarketList(container, container.__marketItems || [], runId);
  const chartReady = loadChartLib();
  startActiveQuote(container, sym, nextType, runId);
  loadChartData(container, sym, nextType, tf, runId, chartReady);
  startChartRefresh(container, sym, nextType, tf, runId, chartReady);
  if (typeChanged) {
    loadMarketItems(nextType, runId, true)
      .then(mkts => {
        if (!isCurrentRun(runId, sym, nextType)) return;
        if (mkts && mkts.items) {
          container.__marketItems = mkts.items;
          renderSymbolList(container, mkts.items);
          markActiveSymbolRow(container, sym);
          warmVisibleQuotes(container, mkts.items, runId, nextType).catch(() => {});
          startLiveQuotes(container, mkts.items, runId, nextType);
          scheduleChartPrefetch(container, mkts.items, runId, nextType);
        }
      })
      .catch(() => {});
  }
}

function switchTimeframe(container, tf) {
  if (!tf) return;
  set('tf', tf);
  markActiveTf(container, tf);
  const runId = tradeRunId;
  const symbol = get('symbol');
  const type = get('type');
  if (currentSetup && currentSetup.runId === runId) currentSetup = { ...currentSetup, symbol, type, tf };
  syncTradeUrl(symbol, type, tf);
  stopChartRefresh();
  clearChartForSwitch(container);
  const chartReady = loadChartLib();
  loadChartData(container, symbol, type, tf, runId, chartReady);
  startChartRefresh(container, symbol, type, tf, runId, chartReady);
}

function bindEvents(container) {
  $('#mob-mkt-btn', container)?.addEventListener('click', () => openMarketDrawer(container));
  $('#close-mob-drawer', container)?.addEventListener('click', () => closeMarketDrawer(container));

  bindDelegate(container,'[data-sym]', 'click', (e, el) => {
    closeMarketDrawer(container);
    switchSymbol(container, el.dataset.sym, el.dataset.stype || get('type'));
  });

  bindDelegate(container,'[data-tf]', 'click', (e, el) => {
    localStorage.setItem('vp_tf', el.dataset.tf);
    switchTimeframe(container, el.dataset.tf);
  });

  bindDelegate(container,'[data-type-tab]', 'click', async (e, el) => {
    const drawerType = normalizeType(el.dataset.typeTab || get('type') || 'crypto');
    container.__marketDrawerType = drawerType;
    const data = await loadMarketItems(drawerType, tradeRunId, true).catch(() => null);
    if (data?.items) {
      container.__marketItems = data.items;
      renderSymbolList(container, data.items);
      warmVisibleQuotes(container, data.items, tradeRunId, drawerType);
      startLiveQuotes(container, data.items, tradeRunId, drawerType);
      scheduleChartPrefetch(container, data.items, tradeRunId, drawerType);
    }
    $$('[data-type-tab]', container).forEach(btn => {
      const active = btn === el;
      btn.classList.toggle('bg-accent/20', active);
      btn.classList.toggle('text-accent', active);
      btn.classList.toggle('border-accent/40', active);
    });
  });

  bindDelegate(container,'[data-trade-gate]', 'click', (e) => {
    e.preventDefault();
    showTradeGateDialog();
  });
  bindDelegate(container,'[data-open-order]', 'click', (e, el) => openOrderSheet(container, el.dataset.openOrder));
  bindDelegate(container,'[data-close-order-sheet]', 'click', () => closeOrderSheet(container));
  bindDelegate(container,'[data-submit-order]', 'click', (e, el) => placeOrder(el.dataset.submitOrder, container, $('#mobile-order-sheet [data-order-form]', container)));
  bindDelegate(container,'[data-side]', 'click', (e, el) => {
    const sheet = el.closest('#mobile-order-sheet');
    const form = el.closest('[data-order-form]');
    if (sheet) {
      setMobileSubmitSide(container, el.dataset.side);
      return;
    }
    placeOrder(el.dataset.side, container, form);
  });

  bindDelegate(container,'[data-order-type]', 'change', (e, el) => set('orderType', el.value));
  bindDelegate(container,'[data-market-type]', 'change', (e, el) => {
    const nextMarket = normalizeMarketForType(get('type'), el.value);
    set('market', nextMarket);
    localStorage.setItem('vp_market', nextMarket);
    $$('[data-market-type]', container).forEach(select => { select.value = nextMarket; });
    // Re-render leverage row based on market type (spot = hidden, perp = visible)
    $$('[data-order-form]', container).forEach(form => {
      const levRow = $('#leverage-row', form);
      if (!levRow) return;
      const isPerp = nextMarket === 'perp';
      const lev = Number(get('leverage') || 10);
      if (isPerp) {
        levRow.outerHTML = `<label class="block order-leverage-row" id="leverage-row">
          <span class="text-[10px] text-muted">Leverage: <strong data-lev-val id="leverage-label">${lev}x</strong></span>
          <input type="range" min="1" max="100" value="${lev}" class="w-full mt-1 accent-accent" data-leverage />
        </label>`;
      } else {
        levRow.outerHTML = `<div class="order-spot-note" id="leverage-row">
          <span class="text-[10px] text-muted">Spot order â€” no leverage</span>
        </div>`;
      }
    });
    updateOrderInfo(container);
  });
  bindDelegate(container,'[data-leverage]', 'input', (e, el) => {
    set('leverage', Number(el.value));
    syncOrderField(container, 'leverage', el.value);
    updateOrderInfo(container);
    // Risk color gradient: green (low) â†’ yellow (mid) â†’ red (high)
    const val = Number(el.value);
    const max = Number(el.max) || 100;
    const pct = val / max;
    const color = pct < 0.3 ? '#00c087' : pct < 0.6 ? '#fcd535' : '#f6465d';
    el.style.accentColor = color;
    const label = container.querySelector('#leverage-label');
    if (label) { label.textContent = val + 'x'; label.style.color = color; }
  });
  bindDelegate(container,'[data-amount]', 'input', (e, el) => {
    set('amount', Number(el.value));
    syncOrderField(container, 'amount', el.value);
    updateOrderInfo(container);
  });
  bindDelegate(container,'[data-close]', 'click', async (e, el) => {
    await closePosition(container, el);
  });
  bindDelegate(container,'[data-cancel-order]', 'click', async (e, el) => {
    await cancelPendingOrder(container, el);
  });
  bindDelegate(container,'[data-edit-order]', 'click', (e, el) => {
    openEditOrderModal(container, el.dataset.editOrder);
  });
  bindDelegate(container,'[data-toggle-activity-expand]', 'click', () => toggleActivityExpand(container));
  bindDelegate(container,'[data-retry-chart]', 'click', () => {
    loadChartData(container, get('symbol'), get('type'), get('tf'), tradeRunId, loadChartLib());
  });
  bindDelegate(container,'[data-activity-tab]', 'click', (_e, el) => {
    container.__tradeActivityTab = el.dataset.activityTab || 'positions';
    renderActivity(container);
  });
  bindDelegate(container,'[data-quick-amount]', 'click', (_e, el) => {
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



function stopChartRefresh() {
  if (chartRefreshTimer) {
    clearInterval(chartRefreshTimer);
    chartRefreshTimer = null;
  }
}

function startChartRefresh(container, symbol, type, tf, runId = tradeRunId, chartReady = loadChartLib()) {
  stopChartRefresh();
  const quoteType = normalizeType(type || 'crypto');
  const interval = quoteType === 'crypto' ? 90000 : 60000;
  chartRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (!isCurrentRun(runId, symbol, type)) return;
    loadChartData(container, symbol, type, tf, runId, chartReady, { silent: true, refresh: true }).catch(() => null);
  }, interval);
}

function chartQuoteTolerance(type) {
  const value = normalizeType(type || 'crypto');
  if (value === 'forex') return 0.0008;
  if (['commodities', 'futures'].includes(value)) return 0.0015;
  if (['stocks', 'arab'].includes(value)) return 0.03;
  return 0.01;
}

function latestCandleQuoteDeviation(items, quotePrice) {
  const data = normalizeCandleRows(items || []);
  const p = Number(quotePrice || 0);
  const last = data[data.length - 1];
  if (!last || !(p > 0) || !(Number(last.close) > 0)) return 0;
  return Math.abs(Number(last.close) - p) / Math.max(p, Number(last.close), 1);
}

function liveTailTolerance(type) {
  const value = normalizeType(type || 'crypto');
  if (value === 'forex') return 0.001;
  if (['commodities', 'futures'].includes(value)) return 0.002;
  if (['stocks', 'arab'].includes(value)) return 0.02;
  return 0.01;
}

function scheduleChartQuoteReconcile(container, priceValue, runId = tradeRunId, assetType = get('type')) {
  const type = normalizeType(assetType || get('type'));
  if (type === 'crypto' || !(Number(priceValue) > 0) || !chart || !candleSeries || !lastCandle) return;
  const key = currentChartKey();
  if (!chartSeriesKey || chartSeriesKey !== key) return;
  const close = Number(lastCandle.close || 0);
  if (!(close > 0)) return;
  const deviation = Math.abs(close - Number(priceValue)) / Math.max(close, Number(priceValue), 1);
  if (deviation <= chartQuoteTolerance(type)) return;
  const now = Date.now();
  if (!container.__chartReconcileAt) container.__chartReconcileAt = new Map();
  const lastRun = Number(container.__chartReconcileAt.get(key) || 0);
  if (now - lastRun < 30000) return;
  container.__chartReconcileAt.set(key, now);
  if (chartReconcileTimer) clearTimeout(chartReconcileTimer);
  chartReconcileTimer = setTimeout(() => {
    chartReconcileTimer = 0;
    if (!isCurrentRun(runId) || currentChartKey() !== key) return;
    chartCandleCache.delete(key);
    loadChartData(container, get('symbol'), get('type'), get('tf'), runId, loadChartLib(), {
      silent: true,
      refresh: true,
    }).catch(() => null);
  }, 250);
}

async function loadChartData(container, symbol, type, tf, runId = tradeRunId, chartReady = loadChartLib(), options = {}) {
  const chartBox = $('#chart-box', container);
  const hasChart = Boolean(chart && candleSeries);
  const market = get('market') || defaultMarketForType(type);
  const reqKey = chartKeyFor(symbol, type, market, tf);
  let requestId = chartDataRequestSeq;
  let requestController = null;
  if (!options.silent) {
    cancelActiveChartRequest();
    requestId = ++chartDataRequestSeq;
    requestController = new AbortController();
    chartDataController = requestController;
  }
  if (chartBox && !options.silent && !hasChart) {
    chartBox.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="loading-spinner mx-auto"></div><p class="text-[10px] text-muted mt-2">Loading chart...</p></div></div>';
  } else if (hasChart && !options.silent) {
    showChartOverlay(container);
  }
  let paintedFromCache = false;
  if (!options.silent && !options.refresh) {
    const cached = cachedChartCandles(reqKey);
    if (cached.length) {
      await chartReady;
      if (!isActiveChartRequest(requestId, runId, symbol, type, reqKey)) return;
      if (chart && candleSeries) {
        applyChartData(cached, { fit: false, key: reqKey, preserveRange: false });
        hideChartOverlay(container);
      } else {
        await initChart(container, cached, runId);
      }
      paintedFromCache = true;
      showChartOverlay(container);
    }
  }
  try {
    const freshProviderWindow = usesFreshProviderWindow(type, tf);
    const refreshParam = options.refresh ? '&refresh=1' : '';
    const initialLimit = chartInitialLimitFor(type, tf);
    // No cache-buster param: lets the nginx micro-cache share identical candle
    // responses across users (the request itself is already no-store client-side).
    const url = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&tf=${encodeURIComponent(tf)}&limit=${initialLimit}&fast=1${refreshParam}`;
    const candles = await api(url, {
      timeout: options.silent ? 8000 : 9000,
      retry: options.silent ? 0 : 0,
      cacheTtl: 0,
      cache: 'no-store',
      signal: requestController?.signal,
    });
    await chartReady;
    if (!isActiveChartRequest(requestId, runId, symbol, type, reqKey)) return;
    const chartUnsupported = candles?.source === 'unsupported'
      || candles?.soft_error === 'futures_provider_unavailable'
      || candles?.soft_error === 'unsupported_symbol';
    if (chartUnsupported && !options.silent && !options.refresh) {
      chartCandleCache.delete(reqKey);
      resetChartInstance();
      renderChartFallback(container, 'Chart data is unavailable for this instrument.');
      return;
    }
    let chartPainted = false;
    let chartItems = candles?.items || [];
    if (options.refresh && chartItems.length) {
      const activeBucket = currentBucketTime(0, type);
      chartItems = normalizeCandleRows(chartItems).filter(c => c.time < activeBucket);
    }
    if (freshProviderWindow && chartItems.length) {
      const deviation = latestCandleQuoteDeviation(chartItems, get('activeQuote')?.price);
      if (deviation > chartQuoteTolerance(type)) {
        const freshUrl = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&tf=${encodeURIComponent(tf)}&limit=100&refresh=1`;
        const fresh = await api(freshUrl, {
          timeout: 7000,
          retry: 0,
          cacheTtl: 0,
          cache: 'no-store',
          signal: requestController?.signal,
        }).catch(() => null);
        if (!isActiveChartRequest(requestId, runId, symbol, type, reqKey)) return;
        if (fresh?.items?.length) chartItems = fresh.items;
      }
    } else if (freshProviderWindow && !chartItems.length && !options.refresh) {
      const freshUrl = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&tf=${encodeURIComponent(tf)}&limit=100&refresh=1`;
      const fresh = await api(freshUrl, {
        timeout: 7000,
        retry: 0,
        cacheTtl: 0,
        cache: 'no-store',
        signal: requestController?.signal,
      }).catch(() => null);
      if (!isActiveChartRequest(requestId, runId, symbol, type, reqKey)) return;
      if (fresh?.items?.length) chartItems = fresh.items;
    }
    if (chartItems.length) {
      if (chart && candleSeries) {
        applyChartData(chartItems, {
          fit: !options.silent && !options.refresh,
          key: reqKey,
          preserveRange: !!(options.silent || options.refresh),
          skipUnchanged: !!(options.silent || options.refresh),
        });
        hideChartOverlay(container);
      } else {
        await initChart(container, chartItems, runId);
      }
      chartPainted = true;
    } else {
      if (options.silent || options.refresh) return;
      if (!hasChart && !paintedFromCache && !options.silent) {
        renderChartFallback(container, 'Chart data is still loading from the market provider.');
      } else if (hasChart && !options.silent) {
        hideChartOverlay(container);
      }
    }
    if (chartPainted && !options.silent && !options.refresh) scheduleMonthHistoryPrefetch(container, runId);
    // Start Binance kline WebSocket for crypto: real-time candle updates without polling
    if (chartPainted && normalizeType(type) === 'crypto' && !options.refresh) {
      startBinanceKlineWs(symbol, tf, runId);
    }
  } catch (e) {
    if (!isActiveChartRequest(requestId, runId, symbol, type, reqKey)) return;
    if (e?.code === 'aborted' || e?.name === 'RequestAbortError') return;
    console.error('Chart:', e);
    if (!hasChart && !options.silent) renderChartFallback(container, 'Chart stream is delayed. Live price and order ticket remain active.');
    else if (hasChart && !options.silent) hideChartOverlay(container);
  } finally {
    if (chartDataController === requestController) chartDataController = null;
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
    btn.setAttribute('aria-label', open ? t('trade.close_activity', 'Close trading activity') : t('trade.expand_activity', 'Expand trading activity'));
    btn.setAttribute('title', open ? t('trade.close_activity', 'Close trading activity') : t('trade.expand_activity', 'Expand trading activity'));
    btn.innerHTML = open ? icons.close : (icons.fullscreen || icons.expand || 'â›¶');
  }
  if (chart && !open) setTimeout(() => chart.timeScale?.().fitContent?.(), 80);
}

async function closePosition(container, trigger) {
  const gate = tradeGate();
  if (gate) {
    showTradeGateDialog(gate);
    return;
  }
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
    btn.textContent = t('trade.closing', 'Closing...');
  });
  // Attempt close â€” up to 2 tries (auto-retry once on price_not_executable after 1.5s)
  const attempt = async (retry = false) => {
    const clientPrice = Number(get('activeQuote')?.price || 0);
    return api('/trade/close_position.php', {
      method: 'POST',
      body: { id, position_id: id, mode: get('mode'), client_price: clientPrice },
      timeout: 14000,
    }).then((res) => {
      if (res && res.ok === false) {
        const err = new Error(res.error || t('trade.close_failed', 'Close failed'));
        err.code = res.code || '';
        err.payload = res;
        throw err;
      }
      return res;
    });
  };
  try {
    let res;
    try {
      res = await attempt();
    } catch (e) {
      const code = String(e?.code || e?.payload?.code || '').toLowerCase();
      if ((code === 'price_not_executable' || code === 'price_unavailable') && !e._retried) {
        e._retried = true;
        // Wait 1.5s for price to refresh, then retry once
        await new Promise((ok) => setTimeout(ok, 1500));
        res = await attempt(true);
      } else {
        throw e;
      }
    }
    if (res && res.ok === false) throw new Error(res.error || t('trade.close_failed', 'Close failed'));
    clearCacheFor('/trade/portfolio.php', '/trade/orders.php');
    await Promise.allSettled([
      loadTradeActivity(container, tradeRunId, false, true),
      api('/wallet/summary.php', { timeout: 0, retry: 1, cacheTtl: 0 }).then((w) => { if (w?.real || w?.demo) set('wallet', { real: w.real || {}, demo: w.demo || {} }); }).catch(() => null),
    ]);
    showTradeToast(t('trade.position_closed_success', 'Position closed successfully'), 'success');
  } catch (e) {
    showTradeToast(closePositionErrorMessage(e), 'error');
    related.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
      btn.textContent = btn.dataset.prevText || t('common.close', 'Close');
    });
  } finally {
    closingPositions.delete(id);
  }
}

function closePositionErrorMessage(error) {
  const code = String(error?.code || error?.payload?.code || '').toLowerCase();
  if (code === 'price_not_executable' || code === 'price_unavailable') {
    return t('trade.close_price_stale', 'Price is updating â€” retried automatically. If this persists, reload the page.');
  }
  return error?.message || t('trade.could_not_close', 'Could not close this position now.');
}

function findTradeOrder(container, id) {
  const target = String(id || '');
  return (container.__tradeOrders || []).find((order) => orderId(order) === target) || null;
}

async function cancelPendingOrder(container, trigger) {
  const gate = tradeGate();
  if (gate) {
    showTradeGateDialog(gate);
    return;
  }
  const id = String(trigger?.dataset?.cancelOrder || '');
  if (!id) return;
  const confirmed = await showCancelOrderConfirmation(id);
  if (!confirmed) return;

  const related = $$(`[data-cancel-order="${escapeCssValue(id)}"]`, container);
  related.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('opacity-60');
    btn.dataset.prevText = btn.textContent;
    btn.textContent = t('trade.canceling', 'Canceling...');
  });

  try {
    const res = await api('/trade/cancel.php', {
      method: 'POST',
      body: { order_id: id, id, mode: get('mode') },
      timeout: 10000,
    });
    if (res && res.ok === false) throw new Error(res.error || t('trade.cancel_failed', 'Cancel failed'));
    clearCacheFor('/trade/portfolio.php', '/trade/orders.php');
    await loadTradeActivity(container, tradeRunId, false, true);
    showTradeToast(t('trade.pending_order_canceled', 'Pending order canceled'), 'success');
  } catch (e) {
    showTradeToast(e.message || t('trade.could_not_cancel_order', 'Could not cancel this order.'), 'error');
    related.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
      btn.textContent = btn.dataset.prevText || t('common.cancel', 'Cancel');
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
          <h3 class="text-base font-black">${t('trade.cancel_pending_order', 'Cancel pending order')}</h3>
          <p class="mt-1 text-xs text-muted">${t('trade.cancel_pending_order_copy', 'This only cancels orders that have not executed yet. Open positions must be closed from the position card.')}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-cancel-order-no>${t('trade.keep_order', 'Keep order')}</button>
          <button class="btn-danger" data-cancel-order-yes>${t('trade.cancel_order', 'Cancel order')}</button>
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
  const gate = tradeGate();
  if (gate) {
    showTradeGateDialog(gate);
    return;
  }
  const order = findTradeOrder(container, id);
  if (!order || !isPendingOrder(order)) {
    showTradeToast(t('trade.order_no_longer_pending', 'This order is no longer pending.'), 'error');
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
        <h3 class="text-base font-black">${t('trade.edit_pending_order', 'Edit pending order')}</h3>
        <p class="mt-1 text-xs text-muted">${esc(orderSymbol(order))} ${esc(sideLabel(orderSide(order)))} - ${t('trade.edit_pending_copy', 'changes apply before execution only.')}</p>
      </div>
      <form class="grid gap-3 px-5 py-4" data-edit-order-form>
        <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${t('trade.entry_price', 'Entry price')}</span>
          <input class="input" name="entry" inputmode="decimal" value="${escAttr(Number(order.limit_price || order.entry_price || 0) || '')}" placeholder="${escAttr(price(order.limit_price || order.entry_price || 0, type))}">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${t('trade.take_profit', 'Take profit')}</span>
            <input class="input" name="tp" inputmode="decimal" value="${escAttr(Number(order.tp_price || 0) || '')}" placeholder="${escAttr(t('funding.optional', 'Optional'))}">
          </label>
          <label class="grid gap-1">
            <span class="text-[10px] uppercase font-black text-muted">${t('trade.stop_loss', 'Stop loss')}</span>
            <input class="input" name="sl" inputmode="decimal" value="${escAttr(Number(order.sl_price || 0) || '')}" placeholder="${escAttr(t('funding.optional', 'Optional'))}">
          </label>
        </div>
        <p class="order-form-status is-info" data-edit-order-status hidden></p>
        <div class="grid grid-cols-2 gap-3 pt-1">
          <button type="button" class="btn-ghost" data-edit-order-close>${t('common.cancel', 'Cancel')}</button>
          <button type="submit" class="btn-primary" data-edit-order-save>${t('common.save_changes', 'Save changes')}</button>
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
        status.textContent = t('trade.entry_price_required', 'Entry price is required.');
        status.hidden = false;
        status.className = 'order-form-status is-warning';
      }
      return;
    }
    try {
      if (save) {
        save.disabled = true;
        save.textContent = t('common.saving', 'Saving...');
      }
      if (status) {
        status.textContent = t('trade.saving_order_changes', 'Saving order changes...');
        status.hidden = false;
        status.className = 'order-form-status is-info';
      }
      const res = await api('/trade/update_order.php', {
        method: 'POST',
        body: { order_id: id, limit_price: entry, tp_price: tp, sl_price: sl, mode: get('mode') },
        timeout: 10000,
      });
      if (res && res.ok === false) throw new Error(res.error || t('trade.update_failed', 'Update failed'));
      close();
      await loadTradeActivity(container, tradeRunId);
      showTradeToast(t('trade.pending_order_updated', 'Pending order updated'), 'success');
    } catch (e) {
      if (status) {
        status.textContent = e.message || t('trade.could_not_update_order', 'Could not update this order.');
        status.hidden = false;
        status.className = 'order-form-status is-error';
      }
      if (save) {
        save.disabled = false;
        save.textContent = t('common.save_changes', 'Save changes');
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
          <h3 class="text-base font-black">${t('trade.close_position', 'Close position')}</h3>
          <p class="mt-1 text-xs text-muted">${t('trade.close_position_copy', 'The position will be closed at the current market price.')}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4">
          <button class="btn-ghost" data-close-cancel>${t('common.cancel', 'Cancel')}</button>
          <button class="btn-danger" data-close-confirm>${t('trade.close_now', 'Close now')}</button>
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

  const gate = tradeGate();
  if (gate) {
    showTradeGateDialog(gate);
    return;
  }

  const q = get('activeQuote') || {};
  const currentPrice = Number(q.price || 0);
  if (!currentPrice) {
    showOrderStatus(root, 'No live price available yet. Please wait for the quote to load.', 'warning');
    return;
  }
  if (!isExecutableQuote(q)) {
    showOrderStatus(root, 'This quote is not fresh enough for execution yet. Please wait for a live or delayed market quote.', 'warning');
    return;
  }

  const amount = Number($('[data-amount]', root)?.value || get('amount') || 0);
  // Spot orders carry no leverage (notional = amount); only perpetuals use the slider.
  const leverage = (($('[data-market-type]', root)?.value || get('market') || 'spot') === 'perp')
    ? Number($('[data-leverage]', root)?.value || get('leverage') || 1)
    : 1;
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
    showOrderStatus(root, side === 'BUY' ? t('trade.order.sending_buy', 'Sending buy order...') : t('trade.order.sending_sell', 'Sending sell order...'), 'info');
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
    showOrderStatus(root, `${side === 'BUY' ? t('trade.buy', 'Ø´Ø±Ø§Ø¡') : t('trade.sell', 'Ø¨ÙŠØ¹')} â€” ${t('trade.order_success', 'ØªÙ… ÙØªØ­ Ø§Ù„ØµÙÙ‚Ø© Ø¨Ù†Ø¬Ø§Ø­')}`, 'success');
    // Bust cache so the new position appears immediately (no waiting for the 4s TTL)
    clearCacheFor('/trade/portfolio.php', '/trade/orders.php');
    await loadTradeActivity(container, tradeRunId, false, true);
    // Refresh wallet balance immediately
    api('/wallet/summary.php', { timeout: 0, retry: 1, cacheTtl: 0 })
      .then((w) => { if (w?.real || w?.demo) set('wallet', { real: w.real || {}, demo: w.demo || {} }); })
      .catch(() => null);
    setTimeout(() => {
      if (root.closest?.('#mobile-order-sheet')) closeOrderSheet(container);
      else showOrderStatus(root, '', 'info');
    }, 900);
  } catch (e) {
    console.error('Order failed:', e);
    // Translate raw browser abort messages into clear, actionable text
    const isAbortLike =
      e?.code === 'aborted' || e?.name === 'AbortError' || e?.name === 'RequestAbortError' ||
      String(e?.message || '').toLowerCase().includes('aborted') ||
      String(e?.message || '').toLowerCase().includes('cancelled');
    const msg = e?.code === 'timeout'
      ? 'Request timed out â€” please wait for the live price to refresh and try again.'
      : isAbortLike
        ? 'Order was interrupted. Check Open Positions â€” if the trade is not listed, place the order again.'
        : (e.message || 'Order failed. Please try again.');
    showOrderStatus(root, msg, 'error');
  } finally {
    setOrderBusy(root, false);
  }
}

/* â”€â”€ Order Confirmation Dialog â”€â”€ */
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
          <h3 class="text-lg font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}">${isBuy ? t('trade.buy', 'Ø´Ø±Ø§Ø¡') : t('trade.sell', 'Ø¨ÙŠØ¹')} â€” ${t('trade.order', 'Ø§Ù„Ø£Ù…Ø±')}</h3>
          <p class="text-xs text-muted mt-1">${t('trade.review_confirm', 'Ø±Ø§Ø¬Ø¹ ÙˆØ£ÙƒØ¯ Ø§Ù„Ø£Ù…Ø±')}</p>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Symbol')}</span><strong>${esc(symbol)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Type')}</span><strong>${esc(orderType)} / ${esc(marketType)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Side')}</span><strong class="${isBuy ? 'text-green-400' : 'text-red-400'}">${t(side)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Amount')}</span><strong>$${amount.toFixed(2)}</strong></div>
          ${marketType === 'perp' ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('Leverage')}</span><strong>${leverage}x</strong></div>` : ''}
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Notional')}</span><strong>$${notional.toFixed(2)}</strong></div>
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Price')}</span><strong class="font-mono">${parseFloat(execPrice).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>
          ${tp > 0 ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('Take Profit')}</span><strong class="font-mono text-green-400">${parseFloat(tp).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>` : ''}
          ${sl > 0 ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('Stop Loss')}</span><strong class="font-mono text-red-400">${parseFloat(sl).toFixed(type === 'crypto' ? 2 : 4)}</strong></div>` : ''}
          ${pnl !== null ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('Est. Profit')}</span><strong class="text-green-400">$${pnl.toFixed(2)}</strong></div>` : ''}
          ${loss !== null ? `<div class="flex justify-between text-sm"><span class="text-muted">${t('Est. Loss')}</span><strong class="text-red-400">$${loss.toFixed(2)}</strong></div>` : ''}
          <div class="flex justify-between text-sm"><span class="text-muted">${t('Mode')}</span><strong>${mode === 'real' ? t('Real') : t('Demo')}</strong></div>
        </div>
        <div class="grid grid-cols-2 gap-3 px-5 py-4 border-t border-line">
          <button class="btn-ghost py-2.5" id="confirm-cancel">${t('Cancel')}</button>
          <button class="${isBuy ? 'btn-buy' : 'btn-sell'} py-2.5 text-white font-bold" id="confirm-execute">${t('Confirm')} ${t(side)}</button>
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
    const drawerType = normalizeType(container.__marketDrawerType || get('type') || 'crypto');
    container.__marketDrawerType = drawerType;
    loadMarketItems(drawerType, tradeRunId)
      .then((mkts) => {
        if (mkts?.items) {
          container.__marketItems = mkts.items;
          renderSymbolList(container, mkts.items);
          hydrateActiveFromMarketList(container, mkts.items, tradeRunId);
          warmVisibleQuotes(container, mkts.items, tradeRunId, drawerType);
          scheduleChartPrefetch(container, mkts.items, tradeRunId, drawerType);
        }
      })
      .catch(() => {
        const fallback = fallbackMarketItems(get('type'));
        container.__marketItems = fallback;
        renderSymbolList(container, fallback);
      })
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
  const gate = tradeGate();
  if (gate) {
    showTradeGateDialog(gate);
    return;
  }
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
    btn.textContent = side === 'BUY' ? t('trade.order.buy_now', 'Ø´Ø±Ø§Ø¡ Ø§Ù„Ø¢Ù†') : t('trade.order.sell_now', 'Ø¨ÙŠØ¹ Ø§Ù„Ø¢Ù†');
    btn.className = `${side === 'BUY' ? 'btn-buy' : 'btn-sell'} w-full py-3`;
  }
  if (label) label.textContent = side === 'BUY' ? t('trade.order.buy_order', 'BUY order') : t('trade.order.sell_order', 'SELL order');
}

function syncOrderField(container, field, value) {
  $$(`[data-${field}]`, container).forEach(input => {
    if (String(input.value) !== String(value)) input.value = value;
  });
}

function updateLiveCandle(priceValue, runId = tradeRunId, sourceTime = 0, assetType = get('type')) {
  if (!isCurrentRun(runId) || !candleSeries || !lastCandle || !(priceValue > 0)) return;
  if (!chartSeriesKey || chartSeriesKey !== currentChartKey()) return;
  const type = normalizeType(assetType);
  const tf = get('tf') || '1m';
  const guardedNonCryptoTail = type !== 'crypto' && ['1m','3m','5m','15m'].includes(tf);
  const bucket = currentBucketTime(sourceTime, assetType);
  const base = pendingLiveCandle?.candle || lastCandle;
  if (guardedNonCryptoTail) {
    const anchor = Number(base.close || base.open || 0);
    const deviation = anchor > 0 ? Math.abs(priceValue - anchor) / Math.max(anchor, priceValue, 1) : 0;
    if (deviation > liveTailTolerance(type)) return;
  }
  let next;
  if (bucket <= base.time) {
    const high = guardedNonCryptoTail ? Math.max(base.high, priceValue) : Math.max(base.high, priceValue);
    const low = guardedNonCryptoTail ? Math.min(base.low, priceValue) : Math.min(base.low, priceValue);
    next = { ...base, close: priceValue, high, low };
  } else {
    next = { time: bucket, open: base.close, high: Math.max(base.close, priceValue), low: Math.min(base.close, priceValue), close: priceValue, volume: 0 };
  }
  if (lastCandle.time === next.time && sameCandle(lastCandle, next)) return;
  pendingLiveCandle = { key: currentChartKey(), runId, candle: next };
  if (!liveCandleFrame) {
    liveCandleFrame = requestAnimationFrame(flushLiveCandleFrame);
  }
}

function flushLiveCandleFrame() {
  liveCandleFrame = 0;
  const pending = pendingLiveCandle;
  pendingLiveCandle = null;
  if (!pending || pending.runId !== tradeRunId || pending.key !== currentChartKey() || !candleSeries) return;
  lastCandle = { ...pending.candle };
  const updated = safeChartOp(() => {
    candleSeries.update({ time: lastCandle.time, open: lastCandle.open, high: lastCandle.high, low: lastCandle.low, close: lastCandle.close });
    if (volumeSeries) volumeSeries.update({ time: lastCandle.time, value: lastCandle.volume || 0, color: lastCandle.close >= lastCandle.open ? 'rgba(0,192,135,0.25)' : 'rgba(246,70,93,0.2)' });
    if (lineSeries) lineSeries.update({ time: lastCandle.time, value: lastCandle.close });
    if (areaSeries) areaSeries.update({ time: lastCandle.time, value: lastCandle.close });
    return true;
  });
  if (!updated) return;
  if (allCandles.length) {
    const tail = allCandles[allCandles.length - 1];
    if (tail.time === lastCandle.time) allCandles[allCandles.length - 1] = { ...lastCandle };
    else if (lastCandle.time > tail.time) allCandles.push({ ...lastCandle });
    rememberChartCandles(currentChartKey(), allCandles);
  }
  updateChartLegend(null);
  updateChartPriceLines();
  try { chart?.timeScale?.().scrollToRealTime?.(); } catch (_e) {}
}

function cancelLiveCandleFrame() {
  if (liveCandleFrame) {
    cancelAnimationFrame(liveCandleFrame);
    liveCandleFrame = 0;
  }
  pendingLiveCandle = null;
}

function currentBucketTime(sourceTime = 0, assetType = get('type')) {
  const seconds = tfSeconds(get('tf'));
  const type = normalizeType(assetType);
  const quoteTime = Number(sourceTime || 0);
  const now = quoteTime > 0 && type !== 'crypto' ? Math.floor(quoteTime) : Math.floor(Date.now() / 1000);
  return Math.floor(now / seconds) * seconds;
}

function tfSeconds(tf) {
  return ({
    '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
    '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600, '8h': 28800, '12h': 43200,
    '1d': 86400, '3d': 259200, '1w': 604800,
  })[tf] || 60;
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

function calcEMA(closes, period) {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i].close;
  ema /= period;
  const out = [{ time: closes[period - 1].time, value: ema }];
  for (let i = period; i < closes.length; i++) {
    ema = closes[i].close * k + ema * (1 - k);
    out.push({ time: closes[i].time, value: ema });
  }
  return out;
}

function calcBoll(closes, period = 20, mult = 2) {
  const upper = [], mid = [], lower = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += closes[i - j].close;
    const avg = sum / period;
    let varSum = 0;
    for (let j = 0; j < period; j++) {
      const d = closes[i - j].close - avg;
      varSum += d * d;
    }
    const sd = Math.sqrt(varSum / period);
    const t = closes[i].time;
    mid.push({ time: t, value: avg });
    upper.push({ time: t, value: avg + mult * sd });
    lower.push({ time: t, value: avg - mult * sd });
  }
  return { upper, mid, lower };
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];
  const result = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i].close - closes[i - 1].close;
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  result.push({ time: closes[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i].close - closes[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    result.push({ time: closes[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return result;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return { macd: [], signal: [], hist: [] };
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine = [];
  const minLen = Math.min(emaFast.length, emaSlow.length);
  let fi = emaFast.length - minLen, si = emaSlow.length - minLen;
  for (let k = 0; k < minLen; k++) {
    macdLine.push({ time: emaFast[fi + k].time, value: emaFast[fi + k].value - emaSlow[si + k].value });
  }
  const signalLine = [];
  const k2 = 2 / (signal + 1);
  let sema = 0;
  for (let i = 0; i < signal && i < macdLine.length; i++) sema += macdLine[i].value;
  sema /= Math.min(signal, macdLine.length);
  if (macdLine.length > 0) signalLine.push({ time: macdLine[Math.min(signal - 1, macdLine.length - 1)].time, value: sema });
  for (let i = signal; i < macdLine.length; i++) {
    sema = macdLine[i].value * k2 + sema * (1 - k2);
    signalLine.push({ time: macdLine[i].time, value: sema });
  }
  const hist = [];
  const minH = Math.min(macdLine.length, signalLine.length);
  for (let i = 0; i < minH; i++) {
    if (macdLine[macdLine.length - minH + i].time === signalLine[signalLine.length - minH + i].time) {
      hist.push({ time: macdLine[macdLine.length - minH + i].time, value: macdLine[macdLine.length - minH + i].value - signalLine[signalLine.length - minH + i].value, color: macdLine[macdLine.length - minH + i].value - signalLine[signalLine.length - minH + i].value >= 0 ? 'rgba(0,192,135,0.6)' : 'rgba(246,70,93,0.6)' });
    }
  }
  return { macd: macdLine, signal: signalLine, hist };
}

function calcStochastic(candles, kPeriod = 14, kSmooth = 3, dSmooth = 3) {
  if (candles.length < kPeriod) return { k: [], d: [] };
  const rawK = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity, lowest = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      const h = candles[i - j].high;
      const l = candles[i - j].low;
      if (h > highest) highest = h;
      if (l < lowest) lowest = l;
    }
    const range = highest - lowest;
    const kVal = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100;
    rawK.push({ time: candles[i].time, value: kVal });
  }
  // Smooth %K
  const smoothK = [];
  if (rawK.length < kSmooth) return { k: rawK, d: [] };
  let sum = 0;
  for (let i = 0; i < kSmooth; i++) sum += rawK[i].value;
  smoothK.push({ time: rawK[kSmooth - 1].time, value: sum / kSmooth });
  for (let i = kSmooth; i < rawK.length; i++) {
    sum += rawK[i].value - rawK[i - kSmooth].value;
    smoothK.push({ time: rawK[i].time, value: sum / kSmooth });
  }
  // %D = SMA of smoothK
  const dLine = [];
  if (smoothK.length < dSmooth) return { k: smoothK, d: [] };
  let dSum = 0;
  for (let i = 0; i < dSmooth; i++) dSum += smoothK[i].value;
  dLine.push({ time: smoothK[dSmooth - 1].time, value: dSum / dSmooth });
  for (let i = dSmooth; i < smoothK.length; i++) {
    dSum += smoothK[i].value - smoothK[i - dSmooth].value;
    dLine.push({ time: smoothK[i].time, value: dSum / dSmooth });
  }
  return { k: smoothK, d: dLine };
}


function fallbackMarketItems(type) {
  const resolved = normalizeType(type || 'crypto');
  const actual = resolved === 'favorites' ? 'crypto' : (resolved || 'crypto');
  const rows = FALLBACK_MARKETS[actual] || FALLBACK_MARKETS.crypto;
  return rows.map(([symbol, name], index) => ({
    id: 990000 + index,
    symbol,
    name,
    type: actual,
    status: 'active',
    sort_order: index + 1,
    price: 0,
    change_pct: 0,
    source: 'client_symbol_fallback',
    timing_class: 'warming',
  }));
}

function normalizeMarketListPayload(data, type) {
  const raw = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.markets) ? data.markets : (Array.isArray(data) ? data : []));
  const items = raw.filter((item) => item && item.symbol);
  if (items.length) return { ...(data || {}), ok: data?.ok !== false, items };
  return { ok: true, items: fallbackMarketItems(type), fallback: 'client_symbol_fallback' };
}

function marketListUrl(type) {
  const resolved = normalizeType(type || 'crypto');
  const actual = resolved === 'favorites' ? 'crypto' : resolved;
  const limitByType = {
    crypto: 50,
    forex: 30,
    stocks: 20,
    commodities: 30,
    arab: 30,
    futures: 20,
  };
  const limit = limitByType[actual] || 20;
  const rescueParam = ['commodities', 'arab'].includes(actual)
    ? 'rescue=1&rescue_noncrypto=1'
    : 'no_rescue=1';
  return `/markets.php?type=${encodeURIComponent(actual)}&scope=trade&supported=1&lite=1&with_quotes=1&${rescueParam}&limit=${limit}`;
}

async function loadMarketItems(type, runId = tradeRunId, force = false) {
  const resolved = normalizeType(type || 'crypto');
  const key = resolved || 'crypto';
  const cached = marketListCache.get(key);
  const now = Date.now();
  if (!force && cached && cached.expires > now) return cached.data;

  let data = null;
  try {
    data = await api(marketListUrl(resolved), { timeout: 8000, retry: 1, cacheTtl: 6000, cache: 'no-store' });
  } catch (_e) {
    if (cached?.data?.items?.length) return cached.data;
    data = null;
  }
  const normalized = normalizeMarketListPayload(data, resolved);
  if (!isCurrentRun(runId)) return normalized;
  marketListCache.set(key, { data: normalized, expires: Date.now() + 6000 });
  return normalized;
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

function quoteStateKey(q) {
  const timing = String(q?.timing_class || '').toLowerCase();
  const source = String(q?.source || '').toLowerCase();
  const type = normalizeType(q?.type || get('type'));
  const age = quoteAgeSeconds(q);
  const freshWindow = quoteFreshWindow(type);
  const staleWindow = freshWindow * 3;
  if (Number(q?.price || 0) <= 0) return 'unavailable';
  if (timing === 'seed' || source.includes('seed')) return 'reference';
  if (timing === 'market_closed') return 'cached'; // closed hours are executable for demo/order execution
  if (age === null || age <= freshWindow) return 'live';
  if (timing === 'stale' || q?.is_stale) return age <= staleWindow ? 'cached' : 'stale';
  if (timing === 'delayed' || source.includes('yahoo') || ['stocks', 'arab'].includes(type)) return 'cached';
  if (timing === 'candle_fallback') return age <= staleWindow ? 'cached' : 'chart_quote';
  return age <= staleWindow ? 'cached' : 'stale';
}

function quoteAgeSeconds(q) {
  const ts = Math.max(
    normalizedQuoteTs(q?.provider_updated_at),
    normalizedQuoteTs(q?.provider_ts),
    normalizedQuoteTs(q?.as_of),
    normalizedQuoteTs(q?.updated_at),
    normalizedQuoteTs(q?.cache_updated_at),
    normalizedQuoteTs(q?.received_at),
    normalizedQuoteTs(q?.ingested_at),
  );
  return ts > 0 ? Math.max(0, Math.floor(Date.now() / 1000) - ts) : null;
}

function quoteFreshWindow(type) {
  const value = normalizeType(type || 'crypto');
  if (value === 'crypto') return 90;
  if (['forex', 'commodities', 'futures'].includes(value)) return 180;
  if (['stocks', 'arab'].includes(value)) return 15 * 60;
  return 300;
}

function quoteStateLabel(q) {
  const key = quoteStateKey(q);
  const labels = {
    live:        t('quote.live', 'Live'),
    delayed:     t('quote.delayed', 'Delayed'),
    stale:       t('quote.stale', 'Stale'),
    closed:      t('quote.closed', 'Closed'),
    unavailable: t('quote.unavailable', 'Unavailable'),
    reference:   t('quote.reference', 'Reference'),
    chart_quote: t('quote.chart', 'Chart quote'),
    cached:      t('quote.cached', 'Cached'),
  };
  return labels[key] || key;
}

function isExecutableQuote(q) {
  const key = quoteStateKey(q);
  return !['reference', 'stale', 'unavailable', 'chart_quote'].includes(key);
}

function quoteStateClass(label) {
  const value = String(label || '').toLowerCase();
  if (value === t('quote.live', 'Live').toLowerCase() || value === 'live') return 'status-chip-live';
  if (value === t('quote.unavailable', 'Unavailable').toLowerCase() || value === 'unavailable') return 'status-chip-locked';
  if (['cached', 'closed', t('quote.cached', 'Cached').toLowerCase(), t('quote.closed', 'Closed').toLowerCase()].includes(value)) return 'status-chip-derived';
  return 'status-chip-delayed';
}

function marketLogo(symbol, type, className) {
  return `<span class="${className} grid place-items-center overflow-hidden border border-line bg-surface">
    <img src="${escAttr(marketIconPath({ symbol, type }, type))}" class="h-full w-full object-cover" alt="${escAttr(symbol)}" loading="lazy" data-fallback="initial" />
    <b class="hidden h-full w-full place-items-center bg-accent/20 text-[9px] font-black">${esc(marketInitial(symbol))}</b>
  </span>`;
}
