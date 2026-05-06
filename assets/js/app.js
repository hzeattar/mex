/* VertexPluse Trading Platform — Web-first build (Trading + Invest + Funding)
   - Works as Telegram Mini App (WebApp)
   - Backend: /api
*/

// Use an absolute API base.
// The app can be served under routes like /m/ (Telegram), and relative paths would become /m/api/... (404).
const API_BASE = window.__API_BASE || '/api';

// LightweightCharts helper (loaded via index.html). Some webviews may race.
let __lw_promise = null;
function ensureLightweightCharts(){
  if (window.LightweightCharts) return Promise.resolve(true);
  if (__lw_promise) return __lw_promise;
  __lw_promise = new Promise((resolve)=>{
    try{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js';
      s.onload = ()=>resolve(!!window.LightweightCharts);
      s.onerror = ()=>resolve(false);
      document.head.appendChild(s);
    }catch(e){ resolve(false); }
  });
  return __lw_promise;
}

// Telegram haptics wrapper (safe in normal browsers)
function haptic(type = 'impact', style = 'light') {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    const hf = tg && tg.HapticFeedback;
    if (!hf) return;
    if (type === 'impact') hf.impactOccurred(style);
    else if (type === 'notification') hf.notificationOccurred(style);
    else if (type === 'selection') hf.selectionChanged();
  } catch (e) { /* noop */ }
}
window.haptic = window.haptic || haptic;

// Allow passing language from the bot via query string, e.g. /?lang=ar#/home
try {
  const qsLang = new URLSearchParams(window.location.search).get('lang');
  if (qsLang && ['en','ar','ru','hi'].includes(qsLang)) {
    localStorage.setItem('lang', qsLang);
  }
} catch (e) { /* ignore */ }

const BRAND_NAME = String(window.__BRAND_NAME || 'VertexPluse');
const BRAND_TAGLINE = String(window.__BRAND_TAGLINE || 'Professional trading & investment platform');
const BRAND_LOGO_URL = String(window.__BRAND_LOGO_URL || '').trim();

const state = {
  lang: localStorage.getItem('lang') || 'en',
  dir: 'ltr',
  t: (k)=>k,
  dict: {},
  country: (localStorage.getItem('tp_country') || '').toUpperCase(),
  me: null,
  token: '',
  walletSummary: null,
  portfolio: null,
  // Keep a separate REAL snapshot available, but do not force dashboard/trade warmers to hit it when the user is working on demo.
  realPortfolio: null,
  markets: null,
  tradeMode: localStorage.getItem('trade_mode') || 'demo', // demo | real (real trading is feature-flagged)
  // Safe: dark is the only supported theme (no light mode UI)
  theme: 'dark',
  ledger: null,
  depositsList: null,
  withdrawalsList: null,
  onboardingStatus: null,
  pnlStats: null,
  realPnlStats: null,
  newsFeed: null,
  newsConfig: null,
  supportTickets: null,
  supportCurrent: null,
  ledgerPage: 1,
  selectedSymbol: localStorage.getItem('marketSymbol') || 'BTCUSDT',
  selectedMarketType: localStorage.getItem('marketType') || 'crypto',
  selectedAssetType: 'crypto',
frames: ['1m','3m','5m','15m','30m','1h','4h','1d'],
frame: '15m',
  __routeWarmAt: {},
  __routeWarmTimer: null,
  __notificationsPrimed: false
};

function routeNameFromHash(hash=''){
  const v = String(hash || '#/home');
  if(v.startsWith('#/trade')) return 'trade';
  if(v.startsWith('#/markets')) return 'trade';
  if(v.startsWith('#/portfolio')) return 'portfolio';
  if(v.startsWith('#/wallet')) return 'wallet';
  if(v.startsWith('#/support')) return 'support';
  if(v.startsWith('#/notifications')) return 'notifications';
  if(v.startsWith('#/news')) return 'news';
  if(v.startsWith('#/account')) return 'account';
  if(v.startsWith('#/kyc')) return 'kyc';
  if(v.startsWith('#/invest')) return 'invest';
  return 'home';
}

function routeBackTarget(fallback='#/home'){
  const prev = String(state.__vpPrevHash || '').trim();
  if(!prev || prev === location.hash) return fallback;
  if(prev.startsWith('#/support') || prev.startsWith('#/notifications')) return fallback;
  return prev;
}

function getTradeRouteSnapshot(){
  try{
    if(window.VPTradeRouteStore && typeof window.VPTradeRouteStore.get === 'function'){
      const route = window.VPTradeRouteStore.get();
      if(route && route.symbol) return route;
    }
  }catch(e){}
  try{
    if(typeof window.vpReadTradeRouteState === 'function'){
      const route = window.vpReadTradeRouteState();
      if(route && route.symbol) return route;
    }
  }catch(e){}
  const symbol = String(state.selectedSymbol || localStorage.getItem('tradeSymbol') || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
  const type = String(state.selectedAssetType || localStorage.getItem('marketType') || 'crypto').toLowerCase().trim() || 'crypto';
  const market = String(localStorage.getItem('tradeMarket') || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase().trim() || 'spot';
  return { symbol, type, market, watch:'', ticket:'positions', search:'' };
}

function syncTradeRouteIntoState(route){
  const next = route || getTradeRouteSnapshot();
  if(!next || !next.symbol) return getTradeRouteSnapshot();
  try{
    state.selectedSymbol = String(next.symbol || 'BTCUSDT').toUpperCase().trim() || 'BTCUSDT';
    state.selectedAssetType = String(next.type || 'crypto').toLowerCase().trim() || 'crypto';
    state.selectedMarketType = state.selectedAssetType;
    state.tradeMarket = String(next.market || ((state.selectedAssetType === 'crypto' || state.selectedAssetType === 'futures') ? 'perp' : 'spot')).toLowerCase().trim() || 'spot';
    state.currentTradeMarket = state.tradeMarket;
    state.selectedMarket = state.tradeMarket;
    state.__vpTradeWatchTab = String(next.watch || '').toLowerCase().trim();
    state.__vpTradeTicketTab = String(next.ticket || 'positions').toLowerCase().trim() || 'positions';
    state.__vpTradeWatchSearch = String(next.search || '').trim();
  }catch(e){}
  return next;
}

function readActiveTradeBootstrapQuote(route){
  const active = route || getTradeRouteSnapshot();
  const symbol = String(active?.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase().trim();
  const type = String(active?.type || state.selectedAssetType || 'crypto').toLowerCase().trim();
  const market = String(active?.market || state.tradeMarket || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase().trim();
  const out = { symbol, type, market, price:0, change_pct:0, updated_at:0, source:'' };
  const normType = normalizeLiveAssetType(type || 'crypto');
  const strictSeedAge = normType === 'crypto' ? 8 : 2;
  try{
    const live = (typeof QuoteCache !== 'undefined' && QuoteCache && typeof QuoteCache.get === 'function') ? QuoteCache.get() : null;
    const liveSym = String(live?.symbol || '').toUpperCase().trim();
    const livePx = safeNum(resolveQuoteLivePrice(live, market, type), 0);
    const liveTs = vpTradeQuoteTsSec(live?.updated_at || live?.ts || 0);
    const liveAge = liveTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - liveTs) : 999999;
    const liveSrc = String(live?.source || live?.provider || 'quote_cache').toLowerCase();
    const liveTrusted = normType === 'crypto'
      ? (livePx > 0)
      : (livePx > 0 && liveAge <= strictSeedAge && isTrustedUiLiveSource(liveSrc, symbol, normType));
    if(live && liveSym === symbol && liveTrusted){
      return Object.assign(out, live, {
        symbol,
        type,
        market,
        price: livePx,
        change_pct: safeNum(live?.change_pct ?? live?.changePct ?? 0, 0),
        updated_at: liveTs || Math.floor(Date.now()/1000),
        source: liveSrc
      });
    }
  }catch(e){}
  try{
    const seed = state.__tradeSeedQuote;
    const seedTs = vpTradeQuoteTsSec(seed?.updated_at || seed?.ts || 0);
    const seedAge = seedTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - seedTs) : 999999;
    const seedSrc = String(seed?.source || 'selection_seed').toLowerCase();
    const seedTrusted = normType === 'crypto'
      ? (safeNum(seed?.price, 0) > 0 && seedAge <= 8)
      : (safeNum(seed?.price, 0) > 0 && seedAge <= strictSeedAge && isTrustedUiLiveSource(seedSrc, symbol, normType));
    if(seed && String(seed.symbol || '').toUpperCase().trim() === symbol && String(seed.type || '').toLowerCase().trim() === type && seedTrusted){
      return Object.assign(out, seed, {
        symbol,
        type,
        market,
        price: safeNum(seed.price, 0),
        change_pct: safeNum(seed.change_pct, 0),
        updated_at: seedTs || 0,
        source: seedSrc
      });
    }
  }catch(e){}
  return out;
}

function vpEsc(v){ return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function buildBrandLogoSvg(name, tagline){
  const safeName = vpEsc(name || 'VertexPluse');
  const safeTag = vpEsc((tagline || 'TRADING PLATFORM').toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" fill="none">
  <defs>
    <linearGradient id="vpGrad" x1="0" y1="0" x2="320" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E3B44A"/>
      <stop offset="1" stop-color="#4DA3FF"/>
    </linearGradient>
  </defs>
  <rect x="2" y="6" width="52" height="52" rx="16" fill="url(#vpGrad)" fill-opacity="0.12" stroke="url(#vpGrad)"/>
  <path d="M14 42L24 22l8 15 8-10 8 15" stroke="url(#vpGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="72" y="31" fill="#F5F7FB" font-size="24" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="800">${safeName}</text>
  <text x="72" y="49" fill="#8FA7C6" font-size="11" font-family="Inter,Segoe UI,Arial,sans-serif" letter-spacing="1.6">${safeTag}</text>
</svg>`;
}
function languageChoices(){
  return [
    ['en','English','us'],
    ['ar','العربية','ae'],
    ['ru','Русский','ru'],
    ['hi','हिन्दी','in']
  ];
}
function languageOptionNodes(selected){
  return languageChoices().map(([value,label,flag])=>h('option',{value, selected: selected===value}, `${flag.toUpperCase()} • ${label}`));
}

function languageLabel(value){
  const found = languageChoices().find(([v])=>v===value);
  return found ? found[1] : languageChoices()[0][1];
}
function languageFlag(value){
  const found = languageChoices().find(([v])=>v===value);
  return found ? found[2] : 'us';
}
function flagNode(code, cls=''){
  return h('span',{class:`vp-flag ${code||'us'} ${cls}`.trim(),'aria-hidden':'true'});
}
function languageMenuNode(selected, cls=''){
  const currentValue = selected || state.lang || 'en';
  const currentName = languageLabel(currentValue);
  const currentFlag = languageFlag(currentValue);
  const menu = h('details',{class:'vp-lang-menu ' + (cls || '')});
  const summary = h('summary',{class:'vp-lang-trigger', role:'button'},
    flagNode(currentFlag,'vp-lang-flag'),
    h('span',{class:'vp-lang-name'}, currentName),
    h('span',{class:'vp-lang-caret','aria-hidden':'true'}, '▾')
  );
  const panel = h('div',{class:'vp-lang-pop'});
  languageChoices().forEach(([value,label,flag])=>{
    panel.appendChild(
      h('button',{
        class:'vp-lang-opt ' + (currentValue===value ? 'active' : ''),
        type:'button',
        onclick:(e)=>{
          e.preventDefault();
          state.lang = value;
          localStorage.setItem('lang', state.lang);
          try{ menu.open = false; }catch(_e){}
          boot();
        }
      },
        flagNode(flag,'vp-lang-opt-flag'),
        h('span',{class:'vp-lang-opt-label'}, label)
      )
    );
  });
  menu.append(summary, panel);
  return menu;
}
window.__vpLanguageMenuNode = languageMenuNode;
window.__vpLanguageChoices = languageChoices;

function mountLogo(elId){
  try{
    const el=document.getElementById(elId); if(!el) return; if(el.dataset.mounted==='1') return;
    el.innerHTML='';
    if(BRAND_LOGO_URL && el.dataset.logoFailed !== '1'){
      const img = document.createElement('img');
      img.src = BRAND_LOGO_URL;
      img.alt = BRAND_NAME;
      img.className = 'vp-brand-image';
      img.referrerPolicy = 'no-referrer';
      img.loading = 'eager';
      img.decoding = 'async';
      img.onerror = ()=>{
        try{ el.dataset.logoFailed='1'; img.remove(); }catch(_e){}
        el.dataset.mounted='';
        const wrap=document.createElement('div');
        wrap.innerHTML=buildBrandLogoSvg(BRAND_NAME, BRAND_TAGLINE).trim();
        const svg=wrap.firstElementChild;
        if(svg){ svg.classList.add('vp-brand-svg'); el.appendChild(svg); }
        el.dataset.mounted='1';
      };
      el.appendChild(img);
      el.dataset.mounted='1';
      return;
    }
    const wrap=document.createElement('div');
    wrap.innerHTML=buildBrandLogoSvg(BRAND_NAME, BRAND_TAGLINE).trim();
    const svg=wrap.firstElementChild;
    if(svg){ svg.classList.add('vp-brand-svg'); el.appendChild(svg); }
    el.dataset.mounted='1';
  }catch(e){}
}

function createTradeChartStub(){
  return {
    opts:{crosshair:false, ma:false, ema:false},
    candles:[],
    setOptions(next={}){ this.opts = {...this.opts, ...(next||{})}; },
    resetView(){},
    zoom(step=0){},
    setCandles(items){ this.candles = Array.isArray(items) ? items.slice() : []; },
    prependCandles(items){ if(Array.isArray(items) && items.length) this.candles = items.concat(this.candles || []); },
    upsertCandle(c){
      if(!c || typeof c !== 'object') return;
      const list = Array.isArray(this.candles) ? this.candles : (this.candles = []);
      const t = Number(c.time || 0);
      if(!t){ list.push(c); return; }
      const last = list.length ? list[list.length-1] : null;
      if(last && Number(last.time||0) === t) list[list.length-1] = {...last, ...c};
      else list.push(c);
    },
    setLastPrice(){},
    destroy(){},
    _drawBatched(){},
    applyOptions(){},
  };
}

// ===== Perf helpers (shared-hosting + Telegram WebView friendly) =====
const __tpCache = new Map(); // key -> {ts,data,promise}
function apiGetCached(path, ttlMs=1200, apiOpts=null){
  const key = `GET:${path}`;
  const now = Date.now();
  const hit = __tpCache.get(key);
  if(hit && hit.data && (now - hit.ts) < ttlMs) return Promise.resolve(hit.data);
  if(hit && hit.promise) return hit.promise;
  const p = api(path, apiOpts || {}).then(d=>{
    __tpCache.set(key, {ts: Date.now(), data: d});
    return d;
  }).finally(()=>{
    const cur = __tpCache.get(key);
    if(cur && cur.promise) __tpCache.set(key, {ts: cur.ts || Date.now(), data: cur.data});
  });
  __tpCache.set(key, {ts: now, data: hit?.data, promise: p});
  return p;
}

function apiGetCachedStale(path, ttlMs=1200, apiOpts=null){
  const key = `GET:${path}`;
  const now = Date.now();
  const hit = __tpCache.get(key);
  if(hit && hit.data && (now - hit.ts) < ttlMs) return Promise.resolve(hit.data);
  if(hit && hit.promise) return hit.promise;
  const p = api(path, apiOpts || {}).then(d=>{
    __tpCache.set(key, {ts: Date.now(), data: d});
    return d;
  }).catch(err=>{
    const cur = __tpCache.get(key);
    if(cur && cur.data) return cur.data;
    throw err;
  }).finally(()=>{
    const cur = __tpCache.get(key);
    if(cur && cur.promise) __tpCache.set(key, {ts: cur.ts || Date.now(), data: cur.data});
  });
  __tpCache.set(key, {ts: now, data: hit?.data, promise: p});
  return p;
}

function vpCanonicalizeLiveApiPath(path=''){
  try{
    const raw = String(path || '').trim();
    if(!raw) return raw;
    const [basePath, query=''] = raw.split('?');
    if(!query) return raw;
    const params = new URLSearchParams(query);
    try{ params.delete('_'); }catch(e){}
    const normalizeCsv = (field)=>{
      if(!params.has(field)) return;
      const values = String(params.get(field) || '').split(',').map(v=>String(v||'').toUpperCase().trim()).filter(Boolean);
      if(values.length) params.set(field, [...new Set(values)].sort().join(','));
    };
    if(basePath.indexOf('/quotes.php') !== -1 || basePath.indexOf('/trade/stream.php') !== -1 || basePath.indexOf('/trade/candles.php') !== -1 || basePath.indexOf('/markets.php') !== -1 || basePath.indexOf('/market_snapshot.php') !== -1){
      normalizeCsv('symbols');
      normalizeCsv('types');
      if(params.has('symbol')) params.set('symbol', String(params.get('symbol') || '').toUpperCase().trim());
      if(params.has('type')) params.set('type', String(params.get('type') || '').toLowerCase().trim());
      if(params.has('market')) params.set('market', String(params.get('market') || '').toLowerCase().trim());
      if(params.has('tf')) params.set('tf', String(params.get('tf') || '').toLowerCase().trim());
    }
    const ordered = [...new Set([...params.keys()].sort())].map((key)=>`${encodeURIComponent(key)}=${encodeURIComponent(params.get(key) ?? '')}`).join('&');
    return ordered ? `${basePath}?${ordered}` : basePath;
  }catch(e){ return path; }
}

function apiLiveQuotes(path, type, timeoutMs=4500){
  const norm = normalizeLiveAssetType(type||'crypto');
  const canonical = vpCanonicalizeLiveApiPath(path);
  if(norm === 'crypto') return apiGetCached(canonical, 250);
  let isDirect = false;
  let isVisible = false;
  let symbolCount = 0;
  try{
    const raw = String(canonical || '');
    const [, query=''] = raw.split('?');
    const params = new URLSearchParams(query);
    isDirect = String(params.get('direct') || '0') === '1';
    isVisible = String(params.get('visible') || '0') === '1';
    const field = params.has('symbols') ? 'symbols' : (params.has('symbol') ? 'symbol' : '');
    if(field){
      symbolCount = String(params.get(field) || '').split(',').map(v=>String(v||'').trim()).filter(Boolean).length;
    }
  }catch(e){}
  const effectiveTimeout = Number(timeoutMs || 0) > 0 ? Number(timeoutMs) : (norm === 'forex' ? 12000 : (['futures','stocks','arab'].includes(norm) ? 14000 : (norm === 'commodities' ? 7000 : 6500)));
  let staleTtl = Math.max(norm === 'forex' ? 1800 : 1200, Math.min(norm === 'forex' ? 7200 : 5400, Math.round(effectiveTimeout * 0.56)));
  if(vpIsDelayedQuoteType(norm)){
    staleTtl = isDirect ? 8000 : (isVisible ? 10000 : 12000);
  }else if(isDirect && symbolCount <= 2){
    staleTtl = norm === 'commodities' ? 220 : (norm === 'forex' ? 280 : 420);
  }else if(isVisible && symbolCount > 0 && symbolCount <= 12){
    staleTtl = norm === 'commodities' ? 320 : (norm === 'forex' ? 420 : 620);
  }
  return apiGetCachedStale(canonical, staleTtl, { timeoutMs: effectiveTimeout });
}

function scheduleIdleTask(fn, timeout=1200){
  if(typeof fn !== 'function') return;
  try{
    if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
      window.requestIdleCallback(()=>{ try{ fn(); }catch(e){} }, { timeout });
      return;
    }
  }catch(e){}
  try{ setTimeout(()=>{ try{ fn(); }catch(e){} }, Math.min(260, Math.max(24, Math.round(timeout * 0.12)))); }catch(e){}
}

function getCanonicalQuoteMap(symbols, type, market='spot', opts={}){
  const out = new Map();
  try{
    const list = Array.isArray(symbols) ? symbols : [];
    const maxAgeSec = Number(opts.maxAgeSec || 0) > 0 ? Number(opts.maxAgeSec) : (normalizeLiveAssetType(type || 'crypto') === 'crypto' ? 6 : 12);
    list.forEach(symRaw=>{
      const sym = String(symRaw || '').toUpperCase().trim();
      if(!sym) return;
      const q = (typeof vpCanonicalQuoteForUi === 'function') ? vpCanonicalQuoteForUi(sym, type || 'crypto', market || 'spot', { maxAgeSec }) : null;
      if(q && resolveQuoteLivePrice(q, market || 'spot', type || q?.type || 'crypto') > 0){
        out.set(sym, q);
      }
    });
  }catch(e){}
  return out;
}





// ---- QuoteCache: single price stream poller (shared hosting friendly) ----

// ===== Live Sync Bus (instant balances/portfolio after mutations) =====
function __tpCacheDrop(matchFn){
  try{
    for(const k of __tpCache.keys()){
      if(matchFn(k)) __tpCache.delete(k);
    }
  }catch(e){}
}

const tpSync = (() => {
  let timer = null;
  let inflight = false;
  let lastReason = '';
  let queued = false;

  // bust caches + allow refresh* to run immediately
  function invalidate(reason=''){
    lastReason = reason || lastReason;

    // drop cached GETs that affect balances/positions/pnl
    __tpCacheDrop(k =>
      k.startsWith('GET:/wallet/summary.php') ||
      k.startsWith('GET:/trade/portfolio.php') ||
      k.startsWith('GET:/trade/pnl.php') ||
      k.startsWith('GET:/invest/') ||
      k.startsWith('GET:/wallet/ledger.php')
    );

    // force next refresh to not be blocked by "last fetched" timers
    try{ __walletAt = 0; }catch(e){}
    try{ __portfolioAt = 0; }catch(e){}
    try{ __realPortfolioAt = 0; }catch(e){}

    // don't spam: debounce burst mutations (open+close+fees…)
    queue(lastReason, 180);
  }

  async function syncNow(reason='syncNow'){
    if(inflight) { queued = true; lastReason = reason; return; }
    inflight = true;
    queued = false;
    lastReason = reason;

    // tiny delay helps avoid "stale read" right after sqlite write
    await new Promise(r=>setTimeout(r, 120));

    try{
      await Promise.allSettled([
        refreshWalletSummary(true),
        refreshPortfolio(true),
        refreshRealPortfolio(true),
        refreshPnlStats(),
        refreshRealPnlStats(),
      ]);

      // Tell any page (home/trade/wallet) to update its DOM immediately
      try{
        window.dispatchEvent(new CustomEvent('tp:sync', {detail:{reason}}));
      }catch(e){}
    } finally {
      inflight = false;
      if(queued){
        queued = false;
        queue(lastReason || 'queued', 140);
      }
    }
  }

  function queue(reason='queue', delay=180){
    lastReason = reason;
    if(timer) { try{ clearTimeout(timer); }catch(e){} }
    timer = setTimeout(()=>{ timer=null; syncNow(lastReason); }, delay);
  }

  // Decide whether a request is a "mutation" that should trigger instant sync
  function shouldSyncAfter(path, opts){
    const method = String(opts?.method || 'GET').toUpperCase();
    if(method === 'GET' || method === 'HEAD') return false;

    // Only sync for endpoints that actually affect balances/positions/etc.
    // (وسع اللستة دي لو عندك endpoints تانية بتأثر)
    const p = String(path||'');
    return (
      p.includes('/trade/place_order.php') ||
      p.includes('/trade/close_position.php') ||
      p.includes('/trade/cancel_order.php') ||
      p.includes('/trade/update_position.php') ||
      p.includes('/wallet/transfer.php') ||
      p.includes('/wallet/withdraw_request.php') ||
      p.includes('/wallet/deposit_request.php') ||
      p.includes('/wallet/admin_adjust.php') ||
      p.includes('/invest/subscribe.php') ||
      p.includes('/invest/cancel.php')
    );
  }

  function afterApi(path, opts, json){
    if(!json || json.ok === false) return;
    if(shouldSyncAfter(path, opts)){
      invalidate(`${String(opts?.method||'POST').toUpperCase()} ${path}`);
    }
  }

  return { invalidate, syncNow, queue, afterApi };
})();
window.tpSync = tpSync;

// ---- QuoteCache: single price stream poller (shared hosting friendly) ----
// Faster + adaptive interval + jitter protection + visibility aware
const QuoteCache = (() => {
  let active = { symbol:null, type:null, market:null };
  let last = null;
  let lastAt = 0;
  let inflight = false;
  let timer = null;
  const subs = new Set();

  const nonCryptoFreshGate = new Map();
  function canIssueNonCryptoFresh(key, gapMs=12000){
    const now = Date.now();
    const prev = Number(nonCryptoFreshGate.get(key) || 0) || 0;
    if(prev > 0 && (now - prev) < gapMs) return false;
    nonCryptoFreshGate.set(key, now);
    return true;
  }

  function vpIsDelayedQuoteType(type=''){
    const norm = normalizeLiveAssetType(type || '');
    return norm === 'stocks' || norm === 'arab';
  }

  function vpDelayedBadgeText(type='', syncing=false){
    return vpIsDelayedQuoteType(type)
      ? (syncing ? tr('Syncing delayed','جارٍ تحديث المتأخر','Синхр. задержки') : tr('Delayed','متأخر','Задержка'))
      : (syncing ? tr('Syncing','جارٍ التحديث','Синхр.') : tr('Live','مباشر','Лайв'));
  }

  function preferredQuotePollMs(type='crypto', market='spot', hidden=false){
    const norm = normalizeLiveAssetType(type || 'crypto');
    if(hidden){
      if(norm === 'crypto') return 4200;
      if(norm === 'commodities') return 5200;
      if(norm === 'futures') return 6400;
      if(norm === 'forex') return 4800;
      if(norm === 'stocks' || norm === 'arab') return 26000;
      return 18000;
    }
    if(norm === 'crypto') return 900;
    if(norm === 'commodities') return 2600;
    if(norm === 'futures') return 3200;
    if(norm === 'forex') return 2200;
    if(norm === 'stocks' || norm === 'arab') return 12000;
    return 10000;
  }

  function vpLiveQuoteThresholds(type='crypto', refPrice=0){
    const norm = normalizeLiveAssetType(type || 'crypto');
    const price = Math.max(0, Math.abs(Number(refPrice || 0)));
    if(norm === 'forex'){
      return {
        dedupeRel: 0.000002,
        dedupeAbs: 0.000005,
        emitRel: 0.0000025,
        emitAbs: 0.00001,
        changeDrift: 0.001
      };
    }
    if(norm === 'commodities'){
      return {
        dedupeRel: 0.000003,
        dedupeAbs: price >= 100 ? 0.01 : 0.001,
        emitRel: 0.000005,
        emitAbs: price >= 100 ? 0.02 : 0.002,
        changeDrift: 0.003
      };
    }
    if(norm === 'futures'){
      return {
        dedupeRel: 0.000003,
        dedupeAbs: price >= 1000 ? 0.25 : 0.01,
        emitRel: 0.000006,
        emitAbs: price >= 1000 ? 0.25 : 0.02,
        changeDrift: 0.003
      };
    }
    if(norm === 'stocks' || norm === 'arab'){
      return {
        dedupeRel: 0.00001,
        dedupeAbs: price >= 1 ? 0.01 : 0.001,
        emitRel: 0.00003,
        emitAbs: price >= 1 ? 0.01 : 0.001,
        changeDrift: 0.01
      };
    }
    return {
      dedupeRel: 0.00008,
      dedupeAbs: Math.max(0.0000005, price * 0.00002),
      emitRel: 0.00005,
      emitAbs: Math.max(0.000001, price * 0.00003),
      changeDrift: 0.005
    };
  }

  // speed profile
  let intervalMs = 1400;
  const slowMs = 9000;
  const fastMs = 900;
  let lastTickAt = 0;
  let activeSeq = 0;
  let visibilityBound = false;
  let visibilityHandler = null;

  function notify(){
    for(const fn of subs){
      try{ fn(last); }catch(e){}
    }
  }

  function setSpeed(ms){
    ms = Math.max(300, Math.min(30000, Number(ms)||650));
    if(ms === intervalMs) return;
    intervalMs = ms;
    if(timer){
      try{ clearInterval(timer); }catch(e){}
      timer = setInterval(tick, intervalMs);
    }
  }

  async function tick(){
    // avoid over-ticking
    const now = Date.now();
    if(now - lastTickAt < intervalMs*0.75) return;
    lastTickAt = now;

    const snap = { ...active };
    const tickSeq = activeSeq;
    if(!snap.symbol) return;
    if(inflight) return;

    const hash = String(location.hash||'');
    if(!hash.startsWith('#/trade')) return;

    // If tab hidden, slow down (but don't stop completely, Telegram webview sometimes lies)
    if (document.hidden) {
      setSpeed(preferredQuotePollMs(snap.type, snap.market, true));
    } else {
      setSpeed(preferredQuotePollMs(snap.type, snap.market, false));
    }

    inflight = true;
    try{
      let q = null;
      const liveType = normalizeLiveAssetType(snap.type||'crypto');
      const streamPath = `/trade/stream.php?lite=1&symbol=${encodeURIComponent(snap.symbol)}&type=${encodeURIComponent(snap.type||'crypto')}&market=${encodeURIComponent(snap.market||'spot')}&_=${Date.now()}`;
      const freshQuotesPath = `/quotes.php?fresh=1&symbol=${encodeURIComponent(snap.symbol)}&type=${encodeURIComponent(snap.type||'crypto')}`;
      const quotesFirst = preferBulkQuotes(snap.type, snap.market, snap.symbol);
      const bootstrapBusyUntil = Number((typeof window !== 'undefined' && window.__vpTradeBootstrapBusyUntil) || 0) || 0;
      if(liveType !== 'crypto' && bootstrapBusyUntil > Date.now()) return;
      if(quotesFirst){
        try{
          if(liveType === 'crypto'){
            const qr = await apiLiveQuotes(freshQuotesPath, snap.type||'crypto', 4500);
            q = (qr?.items && qr.items[0]) ? qr.items[0] : q;
          }else{
            q = await vpFetchNonCryptoFocusQuote(snap.symbol, liveType, snap.market || 'spot', {
              allowDirect: false,
              maxAgeSec: vpFocusQuoteFreshnessSec(liveType),
              backgroundGapMs: vpFocusQuoteRefreshGapMs(liveType),
              timeoutMs: vpFocusQuoteReadTimeoutMs(liveType)
            });
          }
        }catch(e){ q = q || null; }
      }
      if(!(resolveQuoteLivePrice(q, snap.market, snap.type) > 0) && liveType === 'crypto') {
        try{
          const r = await api(streamPath);
          q = r?.quote || (r?.quotes && r.quotes[snap.symbol]) || r?.item || r || q;
        }catch(e){ q = q || null; }
      }
      const qTs = vpTradeQuoteTsSec(q?.updated_at || q?.ts || q?.time || 0);
      const qAge = qTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - qTs) : 999999;
      const activePrice = resolveQuoteLivePrice(q, snap.market, snap.type);
      const nonCryptoFreshAge = liveType === 'forex'
        ? 6
        : (vpIsDelayedQuoteType(liveType) ? 1800 : (liveType === 'commodities' ? 5 : (liveType === 'futures' ? 7 : 12)));
      const nonCryptoFreshGap = liveType === 'forex'
        ? 4000
        : (vpIsDelayedQuoteType(liveType) ? 30000 : (liveType === 'commodities' ? 3000 : (liveType === 'futures' ? 4500 : 8000)));
      if(liveType !== 'crypto' && !vpIsDelayedQuoteType(liveType) && activePrice > 0 && qAge > nonCryptoFreshAge && canIssueNonCryptoFresh(`${String(snap.symbol||'').toUpperCase()}:${liveType}:${String(snap.market||'spot').toLowerCase()}`, nonCryptoFreshGap)){
        try{ vpBackgroundFreshQuote(snap.symbol, liveType, snap.market || 'spot', nonCryptoFreshGap); }catch(e){}
      }
      if(!(resolveQuoteLivePrice(q, snap.market, snap.type) > 0)) {
        try{
          if(liveType !== 'crypto') {
            if(canIssueNonCryptoFresh(`${String(snap.symbol||'').toUpperCase()}:${liveType}:${String(snap.market||'spot').toLowerCase()}:fallback`, Math.max(nonCryptoFreshGap, 3200))){
              try{
                q = await vpFetchNonCryptoFocusQuote(snap.symbol, liveType, snap.market || 'spot', {
                  allowDirect: true,
                  requireFresh: true,
                  skipBackground: true,
                  maxAgeSec: nonCryptoFreshAge,
                  backgroundGapMs: nonCryptoFreshGap,
                  timeoutMs: vpFocusQuoteReadTimeoutMs(liveType),
                  directTimeoutMs: vpFocusQuoteDirectTimeoutMs(liveType),
                  directGapMs: Math.max(nonCryptoFreshGap, 3200)
                });
              }catch(_directErr){}
            }
            const remembered = vpResolveFreshQuoteCacheQuote(snap.symbol, liveType, snap.market || 'spot');
            const remPx = safeNum(resolveQuoteLivePrice(remembered, snap.market, snap.type), 0);
            if(!(resolveQuoteLivePrice(q, snap.market, snap.type) > 0) && remembered && remPx > 0) q = remembered;
          } else if(String(snap.market||'spot').toLowerCase()==='perp' && liveType === 'crypto'){
            const pq = await api(`/perp/quote.php?symbol=${encodeURIComponent(snap.symbol)}&asset_type=crypto&_=${Date.now()}`);
            q = (pq && typeof pq === 'object') ? Object.assign({}, q || {}, pq, {symbol: snap.symbol, type: snap.type || 'crypto'}) : q;
          } else if(!quotesFirst) {
            const qr = await api(freshQuotesPath);
            q = (qr?.items && qr.items[0]) ? qr.items[0] : q;
          }
        }catch(e){}
      }

      if(q && typeof q === 'object'){
        if(!q.symbol) q.symbol = snap.symbol;
        const activeNorm = normalizeLiveAssetType(snap.type || 'crypto');
        const quoteNorm = normalizeLiveAssetType(q.type || snap.type || 'crypto');
        if(!q.type || quoteNorm === activeNorm) q.type = snap.type;
        if(!q.market) q.market = snap.market;
      }

      if(tickSeq !== activeSeq || active.symbol !== snap.symbol || active.type !== snap.type || active.market !== snap.market) return;
      last = q || null;
      lastAt = Date.now();
      try{ if(last) updateMarketCachesFromLiveQuote(last); }catch(e){}
      notify();
    }catch(e){
      // ignore (no hard fail)
    }finally{
      inflight = false;
    }
  }

  function ensure(){
    if(timer) return;
    timer = setInterval(tick, intervalMs);
    onCleanup(()=>{ try{ clearInterval(timer); }catch{} timer=null; });
    // also tick when returning to foreground
    if(!visibilityBound){
      visibilityHandler = ()=>{ try{ tick(); }catch(e){} };
      document.addEventListener('visibilitychange', visibilityHandler, {passive:true});
      visibilityBound = true;
      onCleanup(()=>{
        try{ if(visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler, {passive:true}); }catch(e){}
        visibilityBound = false;
        visibilityHandler = null;
      });
    }
  }

  return {
    setActive(symbol, type, market){
      const next = { symbol:String(symbol||'').toUpperCase(), type:type||'crypto', market:market||'spot' };
      const unchanged = active.symbol===next.symbol && active.type===next.type && active.market===next.market;
      active = next;
      ensure();
      try{ setSpeed(preferredQuotePollMs(next.type, next.market, !!document.hidden)); }catch(e){}
      if(unchanged && last){ try{ notify(); }catch(e){} }
      if(!unchanged){ activeSeq += 1; lastTickAt = 0; }
      tick();
    },
    get(){ return last; },
    subscribe(fn){
      subs.add(fn);
      try{ if(last) fn(last); }catch(e){}
      return ()=> subs.delete(fn);
    },
    start(){ ensure(); tick(); },
    stop(){ try{ if(timer) clearInterval(timer); }catch(e){} timer=null; },
    lastAt(){ return lastAt; },
    setSpeed
  };
})();

const VPTradeLiveQuoteStore = (() => {
  let activeKey = '';
  const records = new Map();
  const subs = new Set();
  const hardReject = new Set(['cache','stale_cache','seed','seed_price','seed_fallback','chart_seed','seed_candle','yahoo_chart','aggs','synthetic']);
  function sourceRank(source, type){
    const src = String(source || '').trim().toLowerCase();
    const kind = normalizeLiveAssetType(type || 'crypto');
    if(kind === 'crypto'){
      if(['trade_stream','stream','binance','provider_live'].includes(src)) return 5;
      if(['quotes','provider_fallback','massive','polygon'].includes(src)) return 4;
      if(['yahoo','yahoo_chart_live'].includes(src)) return 3;
      if(hardReject.has(src)) return 1;
      return src ? 2 : 0;
    }
    if(['provider_live','massive','polygon','trade_stream','stream'].includes(src)) return 5;
    if(['provider_fallback','yahoo','yahoo_chart_live','fx_fallback','frankfurter','stooq'].includes(src)) return 4;
    if(hardReject.has(src)) return 1;
    return src ? 2 : 0;
  }
  function ctxKey(ctx){
    const symbol = String(ctx?.symbol || '').toUpperCase().trim();
    const type = normalizeLiveAssetType(ctx?.type || 'crypto');
    const market = String(ctx?.market || (type === 'crypto' || type === 'futures' ? 'perp' : 'spot')).toLowerCase().trim() || 'spot';
    return `${symbol}|${type}|${market}`;
  }
  function normalizeQuote(input, ctx){
    if(!input || typeof input !== 'object') return null;
    const symbol = String(ctx?.symbol || input?.symbol || '').toUpperCase().trim();
    const type = normalizeLiveAssetType(ctx?.type || input?.type || 'crypto');
    const market = String(ctx?.market || input?.market || (type === 'crypto' || type === 'futures' ? 'perp' : 'spot')).toLowerCase().trim() || 'spot';
    const price = safeNum(resolveQuoteLivePrice(input, market, type), safeNum(input?.price || input?.last || input?.mark_price, 0));
    if(!(price > 0)) return null;
    const updated_at = vpTradeQuoteTsSec(input?.updated_at || input?.ts || input?.time || Date.now());
    const source = String(input?.source || input?.provider || '').trim().toLowerCase();
    return Object.assign({}, input, { symbol, type, market, price, updated_at, source });
  }
  function shouldAccept(prev, next){
    if(!next) return false;
    if(!prev) return true;
    const prevPrice = Number(prev.price || 0);
    const nextPrice = Number(next.price || 0);
    const diffAbs = Math.abs(nextPrice - prevPrice);
    const drift = diffAbs / Math.max(1, Math.abs(prevPrice));
    const prevTs = Number(prev.updated_at || 0);
    const nextTs = Number(next.updated_at || 0);
    const prevRank = sourceRank(prev.source, prev.type);
    const nextRank = sourceRank(next.source, next.type);
    const kind = normalizeLiveAssetType(next.type || prev.type || 'crypto');
    const sameSource = String(next.source || '').trim().toLowerCase() === String(prev.source || '').trim().toLowerCase();
    const thresholds = vpLiveQuoteThresholds(kind, Math.max(Math.abs(prevPrice), Math.abs(nextPrice)));
    if(nextTs <= prevTs && diffAbs < thresholds.dedupeAbs && drift < thresholds.dedupeRel && sameSource) return false;
    if(nextTs <= (prevTs + 1) && diffAbs < thresholds.dedupeAbs && drift < thresholds.dedupeRel && nextRank <= prevRank && sameSource) return false;
    if(nextTs + 1 < prevTs) return false;
    if(nextTs <= prevTs){
      if(drift > 0.045) return false;
      if(prevRank > nextRank && drift > 0.0025) return false;
    }
    if(kind === 'crypto'){
      if(nextTs <= prevTs + 1 && drift > 0.025) return false;
    }else{
      if(nextRank <= 1 && drift > 0.004) return false;
      if(prevRank >= 4 && nextRank < prevRank && drift > 0.0025) return false;
    }
    return true;
  }
  function shouldEmitUiChange(prev, next){
    if(!next) return false;
    if(!prev) return true;
    const kind = normalizeLiveAssetType(next.type || prev.type || 'crypto');
    const prevPrice = Number(prev.price || 0);
    const nextPrice = Number(next.price || 0);
    const diffAbs = Math.abs(nextPrice - prevPrice);
    const drift = diffAbs / Math.max(1, Math.abs(prevPrice));
    const prevTs = Number(prev.updated_at || 0);
    const nextTs = Number(next.updated_at || 0);
    const prevChange = Number(prev.change_pct ?? prev.changePct ?? 0) || 0;
    const nextChange = Number(next.change_pct ?? next.changePct ?? 0) || 0;
    const changeDrift = Math.abs(nextChange - prevChange);
    const sameSource = String(next.source || '').trim().toLowerCase() === String(prev.source || '').trim().toLowerCase();
    const thresholds = vpLiveQuoteThresholds(kind, Math.max(Math.abs(prevPrice), Math.abs(nextPrice)));
    if(nextTs > prevTs + 2) return true;
    return diffAbs >= thresholds.emitAbs || drift >= thresholds.emitRel || changeDrift >= thresholds.changeDrift || !sameSource;
  }
  function emit(record, meta){
    const snap = record ? Object.assign({}, record) : null;
    subs.forEach(fn=>{ try{ fn(snap, meta || {}); }catch(e){} });
    return snap;
  }
  function setContext(ctx){
    const key = ctxKey(ctx);
    if(key) activeKey = key;
    const current = key ? records.get(key) : null;
    if(current) emit(current, { source:'context' });
    return current ? Object.assign({}, current) : null;
  }
  function ingest(input, ctx){
    const key = ctxKey(ctx);
    const next = normalizeQuote(input, ctx);
    if(!next) return null;
    const prev = records.get(key) || null;
    if(!shouldAccept(prev, next)) return null;
    records.set(key, next);
    if(key === activeKey || !activeKey){
      activeKey = key;
      if(shouldEmitUiChange(prev, next)) emit(next, { source: 'ingest' });
    }
    return Object.assign({}, next);
  }
  function get(ctx){
    const key = ctx ? ctxKey(ctx) : activeKey;
    const current = key ? records.get(key) : null;
    return current ? Object.assign({}, current) : null;
  }
  function subscribe(fn){
    if(typeof fn !== 'function') return ()=>{};
    subs.add(fn);
    try{
      const current = activeKey ? records.get(activeKey) : null;
      if(current) fn(Object.assign({}, current), { source: 'subscribe' });
    }catch(e){}
    return ()=>{ try{ subs.delete(fn); }catch(e){} };
  }
  return { setContext, ingest, get, subscribe, key:()=>activeKey };
})();
try{ window.VPTradeLiveQuoteStore = VPTradeLiveQuoteStore; }catch(e){}

function normalizeLiveAssetType(type){
  const t = String(type || '').toLowerCase();
  if(t === 'fx' || t === 'indices') return 'forex';
  if(t === 'perpetual' || t === 'perp') return 'futures';
  if(t === 'crypto' || t === 'forex' || t === 'stocks' || t === 'commodities' || t === 'futures' || t === 'arab') return t;
  return t || 'crypto';
}

function vpIsDelayedQuoteType(type=''){
  const norm = normalizeLiveAssetType(type || '');
  return norm === 'stocks' || norm === 'arab';
}
try{ window.vpIsDelayedQuoteType = vpIsDelayedQuoteType; }catch(e){}

function vpDelayedBadgeText(type='', syncing=false){
  return vpIsDelayedQuoteType(type)
    ? (syncing ? tr('Syncing delayed','جارٍ تحديث المتأخر','Синхр. задержки') : tr('Delayed','متأخر','Задержка'))
    : (syncing ? tr('Syncing','جارٍ التحديث','Синхр.') : tr('Live','مباشر','Лайв'));
}
try{ window.vpDelayedBadgeText = vpDelayedBadgeText; }catch(e){}

function resolveQuoteLivePrice(q, market='spot', assetType='crypto'){
  const mk = String(market || '').toLowerCase();
  const tp = normalizeLiveAssetType(assetType || q?.type || 'crypto');
  if(!q || typeof q !== 'object') return 0;
  const preferMark = mk === 'perp' || tp === 'futures';
  const primary = preferMark ? Number(q?.mark_price ?? q?.price ?? q?.last ?? 0) : Number(q?.price ?? q?.last ?? q?.mark_price ?? 0);
  return Number.isFinite(primary) && primary > 0 ? primary : 0;
}

function syntheticSpreadBps(type='crypto', market='spot', symbol=''){
  const tp = normalizeLiveAssetType(type || 'crypto');
  const mk = String(market || 'spot').toLowerCase();
  const sym = String(symbol || '').toUpperCase();
  if(tp === 'forex') return 1.5;
  if(tp === 'commodities') return sym === 'XAUUSD' ? 6 : 10;
  if(tp === 'stocks' || tp === 'arab') return 8;
  if(tp === 'futures') return 5;
  if(tp === 'crypto') return mk === 'perp' ? 3.5 : 5;
  return 6;
}

function resolveQuoteBidAsk(q, market='spot', assetType='crypto', fallbackPrice=0){
  const base = safeNum(resolveQuoteLivePrice(q, market, assetType), safeNum(fallbackPrice, 0));
  let bid = 0;
  let ask = 0;
  const pull = (obj, keys=[])=>{
    for(const key of keys){
      const val = Number(obj?.[key]);
      if(Number.isFinite(val) && val > 0) return val;
    }
    return 0;
  };
  if(q && typeof q === 'object'){
    bid = pull(q, ['bid_price','bid','best_bid','bp']);
    ask = pull(q, ['ask_price','ask','best_ask','ap']);
    if(!(bid > 0) && Array.isArray(q?.bids) && q.bids[0] && Number(q.bids[0][0]) > 0) bid = Number(q.bids[0][0]);
    if(!(ask > 0) && Array.isArray(q?.asks) && q.asks[0] && Number(q.asks[0][0]) > 0) ask = Number(q.asks[0][0]);
  }
  if(!(bid > 0) && !(ask > 0) && base > 0){
    const spreadBps = syntheticSpreadBps(assetType || q?.type || 'crypto', market || q?.market || 'spot', q?.symbol || '');
    const half = base * (spreadBps / 20000);
    bid = base - half;
    ask = base + half;
  }else if(base > 0){
    if(!(bid > 0) && ask > 0){
      const spreadBps = syntheticSpreadBps(assetType || q?.type || 'crypto', market || q?.market || 'spot', q?.symbol || '');
      bid = Math.max(0, ask - (base * (spreadBps / 10000)));
    }
    if(!(ask > 0) && bid > 0){
      const spreadBps = syntheticSpreadBps(assetType || q?.type || 'crypto', market || q?.market || 'spot', q?.symbol || '');
      ask = bid + (base * (spreadBps / 10000));
    }
  }
  const mid = (bid > 0 && ask > 0) ? ((bid + ask) / 2) : base;
  const spread = (bid > 0 && ask > 0) ? Math.max(0, ask - bid) : 0;
  return { bid, ask, mid, spread };
}

function preferBulkQuotes(type, market='spot', symbol=''){
  const tp = normalizeLiveAssetType(type || 'crypto');
  const mk = String(market || 'spot').toLowerCase();
  const sym = String(symbol || '').toUpperCase();
  if(tp === 'crypto') return mk !== 'perp' || !isCryptoPerpSymbol(sym, tp, mk) ? false : false;
  if(tp === 'futures') return !isCryptoPerpSymbol(sym, tp, mk);
  return ['commodities','stocks','forex','arab'].includes(tp);
}

function wantsDirectLiveQuote(type, market='spot', symbol=''){
  const tp = normalizeLiveAssetType(type || 'crypto');
  if(tp === 'stocks' || tp === 'arab' || tp === 'forex') return true;
  if(tp === 'futures') return !isCryptoPerpSymbol(symbol, tp, market);
  return false;
}

function isTrustedUiLiveSource(source, symbol='', type=''){
  const src = String(source || '').trim().toLowerCase();
  const sym = String(symbol || '').trim().toUpperCase();
  const kind = normalizeLiveAssetType(type || 'crypto');
  const hardReject = ['seed','seed_fallback','seed_price','cache','stale_cache','chart_seed','seed_candle','yahoo_chart','aggs','synthetic'];
  if(!src) return false;
  if(hardReject.includes(src)) return false;
  if(kind === 'crypto') return ['binance','binance_spot','binance_futures','binance_spot_klines','binance_futures_klines','trade_stream','stream','provider_live'].includes(src);
  if((kind === 'commodities' || kind === 'futures') && /^X(?:AU|AG|PT|PD)USD$/.test(sym)) {
    return ['provider_live','provider_fallback','massive','polygon','trade_stream','stream','eodhd','eodhd_rest','eodhd_intraday'].includes(src);
  }
  return ['provider_live','provider_fallback','massive','polygon','yahoo','yahoo_chart_live','trade_stream','stream','binance','fx_fallback','frankfurter','stooq','eodhd','eodhd_rest','eodhd_intraday'].includes(src);
}

let __renderQueued = false;
let __renderForced = false;
let __renderLastAt = 0;
let __renderDelayTimer = null;
let __renderPendingVisible = false;
let __renderVisibilityBound = false;
let __lastUserScrollAt = 0;
let __renderDeferredForScroll = false;
try{
  const __vpMarkUserScroll = ()=>{ __lastUserScrollAt = Date.now(); };
  window.addEventListener('scroll', __vpMarkUserScroll, {passive:true});
  window.addEventListener('touchmove', __vpMarkUserScroll, {passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('scroll', __vpMarkUserScroll, {passive:true});
  }
}catch(e){}
function requestRender(force=false){
  const hash = String(location.hash || '#/home');
  const now = Date.now();
  const isTrade = hash.indexOf('#/trade') === 0;
  const isHidden = !!(document && document.hidden);
  const minGap = isTrade ? (force ? 980 : 1200) : (force ? 320 : 750);
  const root = document.getElementById('app');
  const sameRoute = !!(root && root.dataset && root.dataset.renderHash === hash);
  const scrollingAgo = now - Number(__lastUserScrollAt || 0);
  if(!force && sameRoute && scrollingAgo < 820){
    if(__renderDeferredForScroll) return;
    __renderDeferredForScroll = true;
    setTimeout(()=>{
      __renderDeferredForScroll = false;
      requestRender(false);
    }, Math.max(120, 860 - scrollingAgo));
    return;
  }
  __renderForced = __renderForced || !!force;
  if(isHidden && !force){
    __renderPendingVisible = true;
    if(!__renderVisibilityBound){
      __renderVisibilityBound = true;
      try{
        document.addEventListener('visibilitychange', ()=>{
          try{
            if(document.hidden || !__renderPendingVisible) return;
            __renderPendingVisible = false;
            requestRender(__renderForced);
          }catch(e){}
        }, {passive:true});
      }catch(e){}
    }
    return;
  }
  if(__renderQueued) return;
  const since = now - __renderLastAt;
  if(since < minGap){
    if(__renderDelayTimer) return;
    __renderDelayTimer = setTimeout(()=>{
      __renderDelayTimer = null;
      requestRender(__renderForced);
    }, Math.max(20, minGap - since + 12));
    return;
  }
  __renderQueued = true;
  const cb = ()=>{
    const shouldForce = !!__renderForced;
    __renderForced = false;
    __renderQueued = false;
    __renderLastAt = Date.now();
    render(shouldForce);
  };
  try{ requestAnimationFrame(cb); }catch(e){ setTimeout(cb, 0); }
}

// Live UI bindings for open positions (PnL/ROE/Mark) updated by price stream.
// Cleared and rebuilt on each trade positions render.
const __posLive = new Map();

// Route-scoped cleanup (intervals / timeouts / observers). Prevents background polling after navigation.
const __cleanup = [];
function onCleanup(fn){
  if(typeof fn === 'function') __cleanup.push(fn);
}

// Safe haptic helper (some environments/versions don't support it)


state.flags = null;

// Normalize old stored values
if (state.selectedMarketType === 'fx') state.selectedMarketType = 'forex';
if (state.selectedAssetType === 'fx') state.selectedAssetType = 'forex';


async function refreshFeatureFlags(){
  try{
    const r = await api('/feature_flags.php');
    state.flags = r.flags || {};
  } catch(e){
    state.flags = state.flags || {};
  }
}

function tg(){ return window.Telegram?.WebApp; }
function isTg(){ return !!tg(); }

// Open Support (two-step):
//  1) Ask user which support language they want
//  2) Open Support Entry (router bot) with /start payload lang_XX
// The router bot then shows suggested questions and redirects to the language-specific agent.
function openSupportBot(){
  location.hash = '#/support';
}

// Telegram WebView sometimes reports document.hidden=true even when visible.
function isEffectivelyHidden(){
  try{ if(isTg()) return false; }catch(e){}
  return !!document.hidden;
}

function inferAutoTheme(){
  return 'dark';
}

function applyTheme(){
  const theme = (state.theme === 'light' || state.theme === 'dark') ? state.theme : inferAutoTheme();
  document.documentElement.dataset.theme = theme;
  // update meta theme-color
  try{
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta){ meta.setAttribute('content', theme==='light' ? '#f7fafc' : '#060A14'); }
  }catch(e){}

  // Telegram chrome colors (best-effort)
  try{
    const w = tg();
    if(w && w.setHeaderColor){ w.setHeaderColor(theme==='light' ? '#ffffff' : '#0B1323'); }
    if(w && w.setBackgroundColor){ w.setBackgroundColor(theme==='light' ? '#f7fafc' : '#060A14'); }
  }catch(e){}

  // Let embedded components (charts, etc.) react to theme variable changes
  try{ window.dispatchEvent(new CustomEvent('themechange', {detail:{theme}})); }catch(e){}
}

function setTheme(next){
  // Force dark only
  state.theme = 'dark';
  localStorage.setItem('theme', 'dark');
  applyTheme();
}

function toggleTheme(){
  // Light mode removed intentionally.
  setTheme('dark');
}

async function loadI18n(){
  let dict = null;
  try{
    const res = await fetch(`./assets/i18n/${state.lang}.json`, {cache:'no-store'});
    if(res.ok) dict = await res.json();
  }catch(e){}
  if(!dict){
    const res = await fetch(`./assets/i18n/en.json`, {cache:'no-store'});
    dict = await res.json();
  }
  // Optional overrides from Admin (settings table)
  try{
    const o = await fetch(`${API_BASE}/i18n_overrides.php?lang=${encodeURIComponent(state.lang)}`, {cache:'no-store'});
    const j = await o.json();
    if(j && j.ok && j.dict && typeof j.dict === 'object'){
      Object.assign(dict, j.dict);
    }
  }catch(e){}
  state.dict = state.dict || {};
  state.dict[state.lang] = dict;
  state.t = (k)=> dict[k] ?? k;
  state.dir = 'ltr'; // RTL disabled by request
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.dir;
}


function setLang(lang){
  lang = ['en','ar','ru','hi'].includes(lang) ? lang : 'en';
  state.lang = lang;
  localStorage.setItem('lang', lang);
  loadI18n().then(render).catch(()=>render());
}

function themeToggleBtn(opts={}){
  // Light mode removed (safe default: dark). Hide the toggle button.
  return null;
}

function h(tag, attrs={}, ...children){
  const svgTags = new Set(['svg','path','circle','rect','line','polyline','polygon','g','defs','linearGradient','stop','text']);
  const isSvg = svgTags.has(String(tag).toLowerCase());
  const el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  for(const [k,v] of Object.entries(attrs||{})){
    if(v === undefined || v === null || v === false) continue;
    if(k==='class') el.className = v;
    else if(k==='style' && typeof v === 'object'){
      for(const [sk,sv] of Object.entries(v)) el.style[sk] = sv;
    }
    else if(k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
    else if(v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }

  for(const ch of children.flat()){
    if(ch==null) continue;
    if(typeof ch==='string' || typeof ch==='number') el.appendChild(document.createTextNode(String(ch)));
    else el.appendChild(ch);
  }
  return el;
}


function fmt(n, d=2){
  if(n==null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
}

function tr(en, ar, ru, hi){
  return state.lang==='ar' ? ar : (state.lang==='ru' ? ru : (state.lang==='hi' ? (hi ?? en) : en));
}

function pageHero({eyebrow='', title='', subtitle='', actions=[], aside=null, className=''}){
  return h('div',{class:`card section-hero ${className||''}`.trim()},
    h('div',{class:'section-hero-main'},
      eyebrow ? h('div',{class:'section-eyebrow'}, eyebrow) : null,
      title ? h('div',{class:'section-hero-title'}, title) : null,
      subtitle ? h('div',{class:'section-hero-sub'}, subtitle) : null,
      (Array.isArray(actions) && actions.length)
        ? h('div',{class:'section-hero-actions'}, ...actions)
        : null
    ),
    aside ? h('div',{class:'section-hero-side'}, aside) : null
  );
}

function miniStatCard(label, value, hint='', tone=''){
  return h('div',{class:`mini-stat-card ${tone||''}`.trim()},
    h('span',{class:'k'}, label),
    h('strong',{class:'v'}, value),
    hint ? h('small',{}, hint) : null
  );
}


function compactOpsHero({title='', subtitle='', tabs=[], stats=[], actions=[], className=''}){
  return h('div',{class:`card compact-ops-hero ${className||''}`.trim()},
    h('div',{class:'compact-ops-top'},
      h('div',{class:'compact-ops-copy'},
        title ? h('div',{class:'compact-ops-title'}, title) : null,
        subtitle ? h('div',{class:'compact-ops-sub'}, subtitle) : null
      ),
      (Array.isArray(actions) && actions.length)
        ? h('div',{class:'compact-ops-actions'}, ...actions)
        : null
    ),
    (Array.isArray(tabs) && tabs.length)
      ? h('div',{class:'compact-ops-tabs'}, ...tabs)
      : null,
    (Array.isArray(stats) && stats.length)
      ? h('div',{class:'compact-ops-stats'}, ...stats)
      : null
  );
}

function statusPill(status){
  const s = String(status||'').toLowerCase();
  const tone = (['approved','completed','done','success'].includes(s)) ? 'good'
    : (['rejected','failed','cancelled','canceled'].includes(s)) ? 'bad'
    : (['pending','processing','review'].includes(s)) ? 'warn'
    : 'neutral';
  const label = (['approved','completed','done','success'].includes(s))
    ? tr('Approved','معتمد','Подтверждено')
    : (['rejected','failed','cancelled','canceled'].includes(s))
      ? tr('Rejected','مرفوض','Отклонено')
      : (['pending','processing','review'].includes(s))
        ? tr('Pending','قيد المراجعة','В обработке')
        : String(status || tr('New','جديد','Новая'));
  return h('span',{class:`status-pill ${tone}`.trim()}, label);
}

function fundingSteps(kind='deposit'){
  const steps = kind==='withdraw'
    ? [
        {title: tr('Choose method','اختر الطريقة','Выберите метод'), sub: tr('Select the payout route approved by admin.','اختر مسار الاستلام المعتمد من الإدارة.','Выберите маршрут получения, одобренный администратором.')},
        {title: tr('Enter payout details','أدخل بيانات الاستلام','Введите реквизиты'), sub: tr('Add the destination exactly as required.','أدخل جهة الاستلام بدقة كما هو مطلوب.','Укажите реквизиты точно в требуемом формате.')},
        {title: tr('Submit for review','أرسل الطلب للمراجعة','Отправьте заявку'), sub: tr('The request stays pending until admin approval.','يبقى الطلب قيد المراجعة حتى اعتماد الإدارة.','Заявка будет ожидать проверки администратора.')}
      ]
    : [
        {title: tr('Choose method','اختر الطريقة','Выберите метод'), sub: tr('Select the funding method configured in admin.','اختر وسيلة الإيداع المضبوطة في لوحة الإدارة.','Выберите метод пополнения, настроенный в админке.')},
        {title: tr('Enter amount','أدخل المبلغ','Введите сумму'), sub: tr('Use the amount accepted by the selected method.','أدخل المبلغ ضمن حدود الوسيلة المختارة.','Укажите сумму в пределах выбранного метода.')},
        {title: tr('Submit request','أرسل الطلب','Отправьте заявку'), sub: tr('After submission, follow the shown method instructions.','بعد الإرسال اتبع التعليمات التي ستظهر لك.','После отправки следуйте показанным инструкциям метода.')}
      ];
  return h('div',{class:'flow-steps'}, ...steps.map((step, idx)=>
    h('div',{class:'flow-step'+(idx===steps.length-1?' accent':'')},
      h('span',{class:'n'}, String(idx+1)),
      h('span',{class:'l'},
        h('span',{class:'t'}, step.title),
        h('span',{class:'s'}, step.sub)
      )
    )
  ));
}

function fundingChecklist(kind='deposit'){
  const lines = kind==='withdraw'
    ? [
        tr('Withdrawals are sent from the live account only.','السحب يتم من الحساب الحقيقي فقط.','Вывод выполняется только с реального счёта.'),
        tr('Destination details must match the chosen method exactly.','يجب أن تطابق بيانات الاستلام الوسيلة المختارة بدقة.','Реквизиты должны точно соответствовать выбранному методу.'),
        tr('Status updates appear later inside the funding center.','تظهر تحديثات الحالة لاحقًا داخل مركز التمويل.','Обновления статуса позже появятся в центре финансирования.')
      ]
    : [
        tr('Deposits are credited to the live account after review.','يتم إضافة الإيداع إلى الحساب الحقيقي بعد المراجعة.','Пополнения зачисляются на реальный счёт после проверки.'),
        tr('Method instructions may require an extra reference or proof.','قد تتطلب تعليمات الوسيلة مرجعًا إضافيًا أو إثباتًا.','Инструкции метода могут потребовать ссылку или подтверждение.'),
        tr('Track the request status later from the funding center.','يمكن متابعة حالة الطلب لاحقًا من مركز التمويل.','Отслеживайте статус заявки позже через центр финансирования.')
      ];
  return h('div',{class:'funding-checklist'}, ...lines.map(line=>
    h('div',{class:'funding-check'},
      h('span',{class:'dot'}, '•'),
      h('span',{class:'txt'}, line)
    )
  ));
}

function buildFundingPreview(kind, amountInput, getActiveMethod, getControls){
  const methodVal = h('strong',{class:'v'}, '—');
  const amountVal = h('strong',{class:'v'}, '—');
  const detailVal = h('strong',{class:'v'}, '—');
  const hintVal = h('small',{});
  const wrap = h('div',{class:'card funding-preview-card'},
    h('div',{class:'section-card-head'},
      h('div',{},
        h('div',{class:'h2'}, tr('Request summary','ملخص الطلب','Сводка заявки')),
        h('div',{class:'muted small'}, kind==='withdraw'
          ? tr('Review the payout route before sending the request.','راجع جهة الاستلام قبل إرسال الطلب.','Проверьте маршрут получения перед отправкой заявки.')
          : tr('Review the funding route before sending the request.','راجع مسار الإيداع قبل إرسال الطلب.','Проверьте маршрут пополнения перед отправкой заявки.'))
      )
    ),
    h('div',{class:'mini-stat-grid'},
      miniStatCard(tr('Method','الوسيلة','Метод'), methodVal),
      miniStatCard(tr('Amount','المبلغ','Сумма'), amountVal),
      miniStatCard(tr('Required details','البيانات المطلوبة','Обязательные данные'), detailVal),
      miniStatCard(tr('Processing','المعالجة','Проверка'), hintVal)
    )
  );
  const update = ()=>{
    const activeMethod = getActiveMethod?.() || {};
    const amt = Number(amountInput?.value || 0);
    const controls = Array.isArray(getControls?.()) ? getControls() : [];
    const detailCount = controls.filter(ctrl=>{
      try{ return String(ctrl?.getValue?.() || '').trim() !== ''; }catch(e){ return false; }
    }).length;
    const totalFields = controls.length;
    methodVal.textContent = String(activeMethod.title || activeMethod.code || '—');
    amountVal.textContent = amt > 0 ? `${fmt(amt,2)} ${String(activeMethod.currency || 'USDT').toUpperCase()}` : tr('Not entered yet','لم يتم إدخاله بعد','Пока не указана');
    detailVal.textContent = totalFields ? `${detailCount}/${totalFields}` : tr('No extra fields','لا توجد حقول إضافية','Без доп. полей');
    hintVal.textContent = kind==='withdraw'
      ? tr('Manual admin review before release.','مراجعة يدوية من الإدارة قبل التنفيذ.','Ручная проверка администратором перед выполнением.')
      : tr('Admin review before balance credit.','مراجعة الإدارة قبل إضافة الرصيد.','Проверка администратором перед зачислением баланса.');
  };
  update();
  return {wrap, update};
}


function currentKycGateStatus(){
  try{
    return String(state.onboardingStatus?.kyc?.status || state.kycStatus?.status || state.kycStatus || 'none').toLowerCase();
  }catch(e){ return 'none'; }
}

function currentTradeModeKey(){
  return String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
}
function isApprovedKycStatus(status){
  return String(status || '').toLowerCase() === 'approved';
}
function currentAccountModeData(mode){
  const resolved = String(mode || currentTradeModeKey()).toLowerCase() === 'real' ? 'real' : 'demo';
  const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  const pf = resolved === 'real' ? (state.realPortfolio || {}) : (state.portfolio || {});
  const node = resolved === 'real' ? (ws?.real || {}) : (ws?.demo || {});
  const fallbackCur = resolved === 'real' ? 'USDT' : 'USDT_DEMO';
  const cur = String(node?.currency || fallbackCur).toUpperCase();
  const wallet = (pf && pf.wallet) ? (pf.wallet[cur] || pf.wallet.USDT || pf.wallet.USDT_DEMO || {}) : {};
  const balance = safeNum(node?.balance, safeNum(wallet?.balance, 0));
  const available = safeNum(node?.available, safeNum(wallet?.available, balance));
  const holds = safeNum(node?.holds, Math.max(0, balance - available));
  const unreal = safeNum(pf?.unrealized_pnl, 0);
  const realized = safeNum(pf?.realized_pnl, 0);
  const positions = Array.isArray(pf?.positions) ? pf.positions : [];
  const openPositions = positions.filter(pos=>String(pos?.status || 'open').toLowerCase() === 'open').length;
  return { mode: resolved, currency: cur, balance, available, holds, unreal, realized, equity: Math.max(0, available + holds + unreal), openPositions, pf, wsNode: node };
}
function buildRealWorkflowNotice(actionKey='real', opts={}){
  const mode = currentTradeModeKey();
  const kycStatus = currentKycGateStatus();
  const allowed = mode === 'real' && isApprovedKycStatus(kycStatus);
  if(allowed && !opts.force) return null;
  const actionMap = {
    funding: tr('Funding actions','إجراءات التمويل','Финансовые действия'),
    deposit: tr('Deposit','الإيداع','Пополнение'),
    withdraw: tr('Withdrawal','السحب','Вывод'),
    copy: tr('Copy trading','نسخ الصفقات','Копитрейдинг'),
    contract: tr('Contracts','العقود','Контракты'),
    invest: tr('Investments','الاستثمارات','Инвестиции'),
    trade: tr('Real trading','التداول الحقيقي','Реальная торговля')
  };
  const actionLabel = actionMap[String(actionKey || '').toLowerCase()] || tr('Real account actions','إجراءات الحساب الحقيقي','Действия реального счёта');
  const needsMode = mode !== 'real';
  const body = needsMode
    ? tr(`${actionLabel} stay locked while you are using Demo mode. Switch the platform to Real first, then complete KYC if the live account is not verified yet.`,`يبقى ${actionLabel} مقفولًا أثناء استخدام وضع الديمو. حوّل المنصة إلى الحقيقي أولاً ثم أكمل KYC إذا لم يتم اعتماد الحساب الحقيقي بعد.`,`${actionLabel} остаются заблокированными, пока вы используете режим Demo. Сначала переключите платформу в Real, а затем завершите KYC, если реальный счёт ещё не подтверждён.`)
    : tr(`${actionLabel} stay locked until your KYC review is approved. Open verification to track the review and unlock live actions.`,`يبقى ${actionLabel} مقفولًا حتى تتم الموافقة على مراجعة KYC. افتح صفحة التحقق لمتابعة المراجعة وفتح الإجراءات الحقيقية.`,`${actionLabel} остаются заблокированными до одобрения KYC. Откройте верификацию, чтобы отслеживать проверку и разблокировать live-действия.`);
  const buttons = [];
  if(needsMode){ buttons.push(h('button',{class:'btn primary', type:'button', onclick:async()=>{ const ok = await requestTradeModeSwitch('real'); if(ok) render(true); }}, tr('Switch to Real','حوّل إلى الحقيقي','Переключить в Real'))); }
  buttons.push(h('button',{class:'btn outline', type:'button', onclick:()=>{ openKycFlow().catch(()=>{}); }}, state.t('kyc.title') || tr('Verification','التحقق','Верификация')));
  return h('div',{class:'card vp-mode-lock-card'}, h('div',{class:'notice'}, body), h('div',{class:'row wrap mt-2', style:'gap:10px; align-items:center;'}, h('span',{class:'pill ' + (needsMode ? 'warn' : 'ghost')}, `${tr('Mode','الوضع','Режим')}: ${mode === 'real' ? state.t('trade.mode_real') : state.t('trade.mode_demo')}`), h('span',{class:'pill ghost'}, `${tr('KYC','التحقق','KYC')}: ${String(kycStatus || 'none').toUpperCase()}`), ...buttons));
}
async function ensureModePrerequisites(force=false){
  try{
    if((force || !state.onboardingStatus) && typeof refreshOnboardingStatus === 'function') await refreshOnboardingStatus();
  }catch(e){}
  try{
    if((force || !state.kycStatusLoaded) && typeof loadKycStatus === 'function') await loadKycStatus(force);
  }catch(e){}
  return currentKycGateStatus();
}
function gateKycStatusLabel(status){
  const v = String(status || 'none').toLowerCase();
  if(v === 'approved' || v === 'active') return tr('Approved','معتمد','Подтверждено');
  if(v === 'pending' || v === 'under_review') return tr('Pending review','قيد المراجعة','На проверке');
  if(v === 'rejected') return tr('Rejected','مرفوض','Отклонено');
  return tr('Not submitted','غير مُرسل','Не отправлено');
}
function buildGateDialogBody(opts={}){
  const badge = String(opts.badge || tr('Protected access','وصول محمي','Защищенный доступ'));
  const title = String(opts.title || tr('Access is limited right now','الوصول محدود حالياً','Доступ сейчас ограничен'));
  const text = String(opts.text || '');
  const eyebrow = String(opts.eyebrow || tr('Account gate','بوابة الحساب','Шлюз аккаунта'));
  const summary = String(opts.summary || tr('Switch to the required account flow to continue safely.','حوّل إلى مسار الحساب المطلوب للمتابعة بشكل آمن.','Переключитесь в нужный режим счёта, чтобы продолжить безопасно.'));
  const tone = String(opts.tone || 'real');
  const visualIcon = String(opts.visualIcon || (tone === 'kyc' ? '✓' : '✦'));
  const visualLabel = String(opts.visualLabel || (tone === 'kyc' ? tr('KYC review','مراجعة KYC','Проверка KYC') : tr('Live access','الوصول الحقيقي','Доступ Live')));
  const visualValue = String(opts.visualValue || (tone === 'kyc' ? gateKycStatusLabel(currentKycGateStatus()) : tr('Real account','الحساب الحقيقي','Реальный счёт')));
  const features = Array.isArray(opts.features) ? opts.features.filter(Boolean) : [];
  const statusPills = Array.isArray(opts.statusPills) ? opts.statusPills.filter(Boolean) : [];
  return h('div',{class:`vp-gate-shell vp-gate-shell--${tone}`},
    h('div',{class:'vp-gate-hero'},
      h('div',{class:'vp-gate-copy'},
        h('div',{class:'vp-gate-copy-badge'}, badge),
        h('div',{class:'vp-gate-copy-kicker'}, eyebrow),
        h('div',{class:'vp-gate-copy-title'}, title),
        h('div',{class:'vp-gate-copy-text'}, text),
        h('div',{class:'vp-gate-copy-summary'}, summary)
      ),
      h('div',{class:'vp-gate-visual'},
        h('div',{class:'vp-gate-visual-orbit'}),
        h('div',{class:'vp-gate-visual-core'},
          h('span',{class:'vp-gate-visual-icon'}, visualIcon),
          h('span',{class:'vp-gate-visual-label'}, visualLabel),
          h('strong',{class:'vp-gate-visual-value'}, visualValue)
        )
      )
    ),
    features.length ? h('div',{class:'vp-gate-feature-grid'}, ...features.map(item=>h('div',{class:'vp-gate-feature'},
      h('span',{class:'vp-gate-feature-icon'}, String(item.icon || '•')),
      h('div',{class:'vp-gate-feature-copy'},
        h('strong',{}, String(item.title || '')),
        h('small',{}, String(item.text || ''))
      )
    ))) : null,
    statusPills.length ? h('div',{class:'vp-gate-copy-status'}, ...statusPills.map(label=>h('span',{class:'pill ghost'}, String(label)))) : null
  );
}
function openKycRequiredDialog(opts={}){
  const context = String(opts.context || 'real_mode').toLowerCase();
  const kycStatus = currentKycGateStatus();
  const actionLabel = String(opts.actionLabel || (context === 'real_mode'
    ? tr('Real mode','الوضع الحقيقي','Режим real')
    : tr('Live account action','إجراء الحساب الحقيقي','Действие реального счёта')));
  const bodyText = String(opts.message || (context === 'real_mode'
    ? tr('You need an approved KYC review before switching the platform to Real mode. Open verification to continue or close this window for now.','تحتاج إلى موافقة KYC قبل تحويل المنصة إلى الوضع الحقيقي. افتح التوثيق للمتابعة أو أغلق هذه النافذة الآن.','Перед переключением платформы в режим Real требуется одобренный KYC. Откройте верификацию для продолжения или закройте это окно.')
    : tr('This live-account action stays locked until KYC is approved. Open verification to continue or close this window for now.','هذا الإجراء الخاص بالحساب الحقيقي يظل مقفولاً حتى تتم الموافقة على KYC. افتح التوثيق للمتابعة أو أغلق هذه النافذة الآن.','Это действие реального счёта остаётся заблокированным до одобрения KYC. Откройте верификацию для продолжения или закройте это окно.')));
  const body = buildGateDialogBody({
    tone:'kyc',
    badge: tr('Verification required','يلزم التحقق','Требуется верификация'),
    eyebrow: context === 'real_mode' ? tr('Unlock the live account','فتح الحساب الحقيقي','Откройте live-счёт') : tr('Unlock this live action','فتح هذا الإجراء الحقيقي','Откройте это live-действие'),
    title: context === 'real_mode'
      ? tr('Real mode is locked right now','الوضع الحقيقي مقفول حالياً','Режим Real сейчас заблокирован')
      : tr('Live action is locked right now','الإجراء الحقيقي مقفول حالياً','Live-действие сейчас заблокировано'),
    text: bodyText,
    summary: tr('Verification is the last required step before the platform can open protected live actions.','التوثيق هو آخر خطوة مطلوبة قبل فتح الإجراءات الحقيقية المحمية على المنصة.','Верификация — последний обязательный шаг перед открытием защищённых live-действий.'),
    visualIcon:'✓',
    visualLabel: tr('Current KYC','حالة KYC الحالية','Текущий KYC'),
    visualValue: gateKycStatusLabel(kycStatus),
    features:[
      {icon:'01', title: tr('Open verification','افتح التوثيق','Откройте верификацию'), text: tr('Review the requested identity fields and upload the required proof.','راجع حقول الهوية المطلوبة وارفع الإثباتات اللازمة.','Проверьте поля и загрузите нужные подтверждения.')},
      {icon:'02', title: tr('Track the review','تابع المراجعة','Следите за проверкой'), text: tr('The status here will update after approval and unlock the real flow automatically.','سيتم تحديث الحالة هنا بعد الموافقة وفتح المسار الحقيقي تلقائياً.','После одобрения статус обновится и откроет реальный режим автоматически.')},
      {icon:'03', title: tr('Return anytime','ارجع في أي وقت','Вернитесь в любой момент'), text: tr('You can close this window now and complete KYC later from the account area.','يمكنك إغلاق هذه النافذة الآن وإكمال KYC لاحقاً من صفحة الحساب.','Вы можете закрыть окно сейчас и завершить KYC позже из аккаунта.')}
    ],
    statusPills:[
      `${tr('Requested action','الإجراء المطلوب','Запрошенное действие')}: ${actionLabel}`,
      `${tr('Current KYC','حالة KYC الحالية','Текущий KYC')}: ${gateKycStatusLabel(kycStatus)}`
    ]
  });
  return openDialog({
    title: tr('Verification required','يلزم التحقق','Требуется верификация'),
    body,
    dialogClass:'vp-gate-dialog vp-gate-dialog--kyc',
    actionsClass:'vp-gate-actions',
    actions:[
      {label: tr('Go to verification','الذهاب للتوثيق','Перейти к верификации'), class:'btn primary', onClick:()=>{ closeDialog(); return openKycFlow(); }},
      {label: tr('Close window','إغلاق النافذة','Закрыть окно'), class:'btn outline', onClick:()=>{ closeDialog(); }}
    ]
  });
}
function openRealAccountOnlyDialog(opts={}){
  const pageLabel = String(opts.pageLabel || tr('This section','هذا القسم','Этот раздел'));
  const actionLabel = String(opts.actionLabel || pageLabel);
  const title = String(opts.title || tr('Real account only','الحساب الحقيقي فقط','Только реальный счёт'));
  const badge = String(opts.badge || tr('Real account only','الحساب الحقيقي فقط','Только реальный счёт'));
  const headline = String(opts.headline || tr('This page is locked while you are in Demo mode','هذه الصفحة مقفولة أثناء استخدام وضع الديمو','Эта страница заблокирована, пока вы находитесь в режиме Demo'));
  const bodyText = String(opts.body || `${pageLabel} ${tr('is available only from the real account. Switch the platform to Real to continue, and if the live account still needs approval you will see the KYC step next.','متاح فقط من خلال الحساب الحقيقي. حوّل المنصة إلى الحقيقي للمتابعة، وإذا كان الحساب الحقيقي يحتاج موافقة فستظهر لك خطوة التوثيق بعد ذلك.','доступен только из реального счёта. Переключите платформу в Real, чтобы продолжить, а если реальный счёт ещё ждёт одобрения, следующим шагом вы увидите KYC.')}`);
  const mode = currentTradeModeKey();
  const kycStatus = currentKycGateStatus();
  const modeLabel = mode === 'real' ? state.t('trade.mode_real') : state.t('trade.mode_demo');
  const body = buildGateDialogBody({
    tone: String(opts.tone || 'real'),
    badge,
    eyebrow: String(opts.eyebrow || tr('Protected live workflow','مسار حي محمي','Защищённый live-поток')),
    title: headline,
    text: bodyText,
    summary: String(opts.summary || tr('The platform keeps these actions isolated from Demo mode so balances, funding requests, and live subscriptions never mix.','المنصة تعزل هذه الإجراءات عن وضع الديمو حتى لا تختلط الأرصدة أو طلبات التمويل أو الاشتراكات الحقيقية.','Платформа изолирует эти действия от Demo, чтобы балансы, заявки на пополнение и live-подписки никогда не смешивались.')),
    visualIcon: String(opts.visualIcon || '✦'),
    visualLabel: String(opts.visualLabel || tr('Required mode','الوضع المطلوب','Требуемый режим')),
    visualValue: String(opts.visualValue || tr('Real account','الحساب الحقيقي','Реальный счёт')),
    features: Array.isArray(opts.features) ? opts.features : [
      {icon:'01', title: tr('Switch safely','حوّل بأمان','Переключитесь безопасно'), text: tr('The platform checks the correct account flow before opening any protected live page.','المنصة تتحقق من مسار الحساب الصحيح قبل فتح أي صفحة حقيقية محمية.','Платформа проверяет нужный поток счёта перед открытием live-страниц.')},
      {icon:'02', title: tr('Keep balances isolated','اعزل الأرصدة','Изолируйте балансы'), text: tr('Demo funds, real funds, and request history remain separated to avoid confusion.','أموال الديمو والحقيقي وسجل الطلبات تظل منفصلة لتجنب أي خلط.','Демо-средства, real-средства и история заявок остаются разделёнными.')},
      {icon:'03', title: tr('KYC-aware switch','تحويل واعٍ بالتوثيق','Переключение с учётом KYC'), text: tr('If verification is still pending, the next step opens the verification popup instead of redirecting abruptly.','إذا كان التوثيق ما زال معلقًا فستظهر نافذة التوثيق بدل التحويل المفاجئ.','Если верификация ещё ожидает одобрения, следующим шагом откроется окно KYC вместо резкого редиректа.')}
    ],
    statusPills:[
      `${tr('Requested area','القسم المطلوب','Запрошенный раздел')}: ${pageLabel}`,
      `${tr('Requested action','الإجراء المطلوب','Запрошенное действие')}: ${actionLabel}`,
      `${tr('Mode','الوضع','Режим')}: ${modeLabel}`,
      `${tr('Current KYC','حالة KYC الحالية','Текущий KYC')}: ${gateKycStatusLabel(kycStatus)}`
    ]
  });
  return openDialog({
    title,
    body,
    dialogClass:`vp-gate-dialog vp-gate-dialog--${String(opts.tone || 'real')}` ,
    actionsClass:'vp-gate-actions',
    actions:[
      {label: tr('Switch to Real','حوّل إلى الحقيقي','Переключить в Real'), class:'btn primary', onClick:async()=>{ closeDialog(); const ok = await requestTradeModeSwitch('real'); if(ok){ try{ render(true); }catch(e){} } }},
      {label: tr('Close window','إغلاق النافذة','Закрыть окно'), class:'btn outline', onClick:()=>{ closeDialog(); }}
    ]
  });
}
function openInvestRealOnlyDialog(){
  return openRealAccountOnlyDialog({
    tone:'earn',
    pageLabel: tr('Earn desk','صفحة الربح','Раздел Earn'),
    actionLabel: tr('Open Earn','فتح صفحة الربح','Открыть Earn'),
    eyebrow: tr('Copy trading • contracts','نسخ الصفقات • العقود','Копитрейдинг • контракты'),
    headline: tr('Earn opens from the real account only','صفحة الربح تعمل من الحساب الحقيقي فقط','Раздел Earn работает только с реального счёта'),
    body: tr('Switch the platform to Real to access copy trading and contracts. While you stay on Demo, this page remains only a locked preview.','حوّل المنصة إلى الحقيقي لفتح نسخ الصفقات والعقود. وأثناء بقائك على الديمو ستظل الصفحة مجرد معاينة مقفولة.','Переключите платформу в Real, чтобы открыть копитрейдинг и контракты. Пока вы остаетесь в Demo, эта страница остаётся только заблокированным предпросмотром.'),
    summary: tr('Signals, contracts, and live wallet allocation open only after switching to the protected real workflow.','الإشارات والعقود وتخصيص المحفظة الحقيقية تُفتح فقط بعد التحويل إلى المسار الحقيقي المحمي.','Сигналы, контракты и распределение real-кошелька открываются только после перехода в защищённый real-поток.'),
    visualIcon:'✦',
    visualLabel: tr('Earn access','وصول صفحة الربح','Доступ Earn'),
    visualValue: tr('Real wallet required','يتطلب المحفظة الحقيقية','Требуется real-кошелёк'),
    features:[
      {icon:'01', title: tr('Copy real signals','انسخ إشارات حقيقية','Копируйте реальные сигналы'), text: tr('Live signal subscriptions stay tied to the protected real wallet only.','اشتراكات الإشارات الحية ترتبط بالمحفظة الحقيقية المحمية فقط.','Подписки на сигналы привязаны только к защищённому real-кошельку.')},
      {icon:'02', title: tr('Open contracts by level','افتح العقود حسب المستوى','Открывайте контракты по уровню'), text: tr('Contracts and level-based products remain hidden from Demo previews to keep access clean.','العقود والمنتجات المرتبطة بالمستوى تظل مخفية عن معاينات الديمو للحفاظ على وضوح الوصول.','Контракты и продукты по уровню скрыты в Demo, чтобы доступ оставался чистым.')},
      {icon:'03', title: tr('Move to real smoothly','انتقل للحقيقي بسلاسة','Перейдите в real плавно'), text: tr('The next step checks KYC first and then unlocks the earn desk without a forced redirect.','الخطوة التالية تتحقق من KYC أولاً ثم تفتح صفحة الربح بدون تحويل إجباري.','Следующий шаг сначала проверит KYC, а затем откроет Earn без жёсткого редиректа.')}
    ]
  });
}
function openWalletRealOnlyDialog(){
  return openRealAccountOnlyDialog({
    tone:'wallet',
    pageLabel: tr('Assets and funding center','الأصول ومركز التمويل','Активы и центр финансирования'),
    actionLabel: tr('Open assets, deposits, and withdrawals','فتح الأصول والإيداعات والسحوبات','Открыть активы, пополнения и выводы'),
    eyebrow: tr('Assets • deposits • withdrawals','الأصول • الإيداعات • السحوبات','Активы • пополнения • выводы'),
    headline: tr('Assets, deposits, and withdrawals open from the real account only','الأصول والإيداعات والسحوبات تعمل من الحساب الحقيقي فقط','Активы, пополнения и выводы доступны только с реального счёта'),
    body: tr('This page is locked while the platform is on Demo. Switch to the real account to manage deposits, withdrawals, and request tracking.','هذه الصفحة تكون مقفولة طالما المنصة على وضع الديمو. حوّل إلى الحساب الحقيقي لإدارة الإيداعات والسحوبات ومتابعة الطلبات.','Эта страница заблокирована, пока платформа находится в Demo. Переключитесь на реальный счёт, чтобы управлять пополнениями, выводами и отслеживанием заявок.'),
    summary: tr('Funding routes, request history, and live balance operations stay available only inside the real account workspace.','مسارات التمويل وسجل الطلبات وعمليات الرصيد الحقيقي تظل متاحة فقط داخل مساحة الحساب الحقيقي.','Маршруты пополнения, история заявок и операции с real-балансом доступны только в рабочем пространстве реального счёта.'),
    visualIcon:'◈',
    visualLabel: tr('Funding workspace','مساحة التمويل','Пространство пополнения'),
    visualValue: tr('Live account only','الحساب الحقيقي فقط','Только live-счёт'),
    features:[
      {icon:'01', title: tr('Manage deposits','إدارة الإيداعات','Управляйте пополнениями'), text: tr('Open approved payment routes, upload proof, and track review from one protected place.','افتح وسائل الدفع المعتمدة وارفع الإثباتات وتابع المراجعة من مكان محمي واحد.','Открывайте маршруты пополнения, загружайте подтверждения и отслеживайте проверку в одном защищённом месте.')},
      {icon:'02', title: tr('Handle withdrawals','إدارة السحوبات','Управляйте выводами'), text: tr('Withdrawal requests and payout details stay isolated from Demo balances by design.','طلبات السحب وبيانات الاستلام تظل معزولة عن أرصدة الديمو بحكم التصميم.','Заявки на вывод и реквизиты по дизайну изолированы от Demo-балансов.')},
      {icon:'03', title: tr('Track request history','متابعة السجل','Отслеживайте историю'), text: tr('You can return later to the same real workspace and monitor statuses without losing context.','يمكنك الرجوع لاحقاً لنفس مساحة الحساب الحقيقي ومتابعة الحالات بدون فقدان السياق.','Вы можете вернуться позже в тот же real-раздел и отслеживать статусы без потери контекста.')}
    ]
  });
}
function openPortfolioRealOnlyDialog(){
  return openRealAccountOnlyDialog({
    tone:'wallet',
    pageLabel: tr('Portfolio center','مركز المحفظة','Центр портфеля'),
    actionLabel: tr('Open portfolio, positions, and history','فتح المحفظة والمراكز والسجل','Открыть портфель, позиции и историю'),
    eyebrow: tr('Portfolio • positions • history','المحفظة • المراكز • السجل','Портфель • позиции • история'),
    headline: tr('Portfolio opens from the real account only','المحفظة تعمل من الحساب الحقيقي فقط','Портфель доступен только с реального счёта'),
    body: tr('This page stays locked while the platform is on Demo. Switch to the real account to review positions, pending orders, and trade history from the protected live workspace.','تظل هذه الصفحة مقفولة طالما المنصة على وضع الديمو. حوّل إلى الحساب الحقيقي لمراجعة المراكز والأوامر المعلقة وسجل التداول من مساحة الحساب الحقيقي المحمية.','Эта страница остаётся заблокированной, пока платформа находится в Demo. Переключитесь на реальный счёт, чтобы просматривать позиции, отложенные ордера и историю сделок из защищённого live-пространства.'),
    summary: tr('The portfolio page is isolated from Demo mode so live positions, pending orders, and closed-trade history never mix with practice activity.','صفحة المحفظة معزولة عن وضع الديمو حتى لا تختلط المراكز الحية أو الأوامر المعلقة أو سجل الصفقات المغلقة مع نشاط التجربة.','Страница портфеля изолирована от Demo, чтобы live-позиции, отложенные ордера и история закрытых сделок никогда не смешивались с тренировочной активностью.'),
    visualIcon:'◎',
    visualLabel: tr('Portfolio access','وصول المحفظة','Доступ к портфелю'),
    visualValue: tr('Real account only','الحساب الحقيقي فقط','Только реальный счёт'),
    features:[
      {icon:'01', title: tr('Review live positions','راجع المراكز الحية','Просматривайте live-позиции'), text: tr('Open positions remain attached to the protected real workspace only.','المراكز المفتوحة تظل مرتبطة فقط بمساحة الحساب الحقيقي المحمية.','Открытые позиции остаются привязаны только к защищённому real-пространству.')},
      {icon:'02', title: tr('Track pending orders','تابع الأوامر المعلقة','Следите за ордерами'), text: tr('Pending orders and execution flow stay separated from Demo practice activity.','الأوامر المعلقة ومسار التنفيذ يظلان منفصلين عن نشاط الديمو التجريبي.','Отложенные ордера и исполнение отделены от Demo-активности.')},
      {icon:'03', title: tr('Keep history clean','حافظ على السجل نظيفًا','Сохраняйте историю чистой'), text: tr('Closed-trade history and portfolio metrics stay tied to the real account only.','سجل الصفقات المغلقة ومؤشرات المحفظة تظل مرتبطة فقط بالحساب الحقيقي.','История закрытых сделок и метрики портфеля привязаны только к реальному счёту.')}
    ]
  });
}
async function requestTradeModeSwitch(mode, opts={}){
  const nextMode = String(mode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
  if(nextMode === 'real'){
    const kycStatus = await ensureModePrerequisites(false);
    if(kycStatus !== 'approved'){
      try{ openKycRequiredDialog({ context:'real_mode', actionLabel: tr('Switch to Real','التحويل إلى الحقيقي','Переключение в Real') }); }catch(e){ try{ toast(tr('Real mode requires an approved KYC review.','الوضع الحقيقي يحتاج موافقة KYC أولاً.','Режим real требует одобренного KYC.')); }catch(_e){} }
      return false;
    }
  }
  setTradeMode(nextMode);
  return true;
}
function requireRealWorkflowAccess(actionKey){
  const mode = currentTradeModeKey();
  const actionMap = {
    deposit: tr('Deposit','الإيداع','Пополнение'),
    withdraw: tr('Withdrawal','السحب','Вывод'),
    copy: tr('Copy trading','نسخ الصفقات','Копитрейдинг'),
    contract: tr('Contracts','العقود','Контракты'),
    invest: tr('Investments','الاستثمارات','Инвестиции'),
    trade: tr('Real trading','التداول الحقيقي','Реальная торговля')
  };
  const actionLabel = actionMap[String(actionKey || '').toLowerCase()] || tr('This action','هذا الإجراء','Это действие');
  if(mode !== 'real'){
    try{
      openRealAccountOnlyDialog({
        pageLabel: tr('Real account workflow','مسار الحساب الحقيقي','Поток реального счёта'),
        actionLabel,
        headline: tr('This action is available on the real account only','هذا الإجراء متاح على الحساب الحقيقي فقط','Это действие доступно только на реальном счёте'),
        body: `${actionLabel} ${tr('stays locked while the platform is in Demo mode. Switch to the real account to continue, and KYC will be requested next only if the live account still needs approval.','يظل مقفولاً طالما المنصة في وضع الديمو. حوّل إلى الحساب الحقيقي للمتابعة، وسيتم طلب KYC بعد ذلك فقط إذا كان الحساب الحقيقي ما زال يحتاج موافقة.','остаётся заблокированным, пока платформа находится в режиме Demo. Переключитесь на реальный счёт, чтобы продолжить, а KYC будет запрошен следующим шагом только если live-счёт ещё требует одобрения.')}`
      });
    }catch(e){
      try{ toast(`${actionLabel} ${tr('is locked in Demo mode. Switch the platform to Real first.','مقفول في وضع الديمو. حوّل المنصة إلى الحقيقي أولاً.','заблокировано в режиме Demo. Сначала переключите платформу в Real.')}`); }catch(_e){}
    }
    return false;
  }
  const kycStatus = currentKycGateStatus();
  if(!isApprovedKycStatus(kycStatus)){
    try{ openKycRequiredDialog({
      context:'live_action',
      actionLabel,
      message: `${actionLabel} ${tr('stays locked until KYC is approved. Open verification to continue or close this window for now.','يظل مقفولاً حتى تتم الموافقة على KYC. افتح التوثيق للمتابعة أو أغلق هذه النافذة الآن.','остаётся заблокированным до одобрения KYC. Откройте верификацию для продолжения или закройте это окно.')}`
    }); }catch(e){ try{ toast(`${actionLabel} ${tr('stays locked until KYC is approved.','يظل مقفولاً حتى تتم الموافقة على KYC.','остаётся заблокированным до одобрения KYC.')}`); }catch(_e){} }
    return false;
  }
  return true;
}
function setTradeMode(mode){
  mode = (mode === 'real') ? 'real' : 'demo';
  state.tradeMode = mode;
  localStorage.setItem('trade_mode', mode);
  try { haptic(); } catch{}
}

function tradeModeToggle(){
  const wrap = h('div',{class:'seg-toggle seg-toggle-pro', role:'tablist', 'aria-label':state.t('trade.mode')});
  const makeBtn = (mode, label, sub)=>h('button',{
    class:(state.tradeMode===mode?'active':'') + ' seg-toggle-btn',
    'data-mode':mode,
    onclick:async()=>{
      const nextMode = (mode === 'real') ? 'real' : 'demo';
      const switched = await requestTradeModeSwitch(nextMode);
      if(!switched) return;
      try{
        state.__vpHistoryByMode = state.__vpHistoryByMode || {};
        delete state.__vpHistoryByMode[nextMode];
      }catch(e){}
      render();
      Promise.allSettled([
        refreshWalletSummary(true),
        nextMode === 'real' ? refreshRealPortfolio(true) : refreshPortfolio(true),
        nextMode === 'real' ? refreshRealPnlStats() : refreshPnlStats(),
        tradeFetchOrders({limit:120, mode: nextMode}).then(items=>{ state.orders = items||[]; }),
      ]).then(()=>render());
    }
  },
    h('span',{class:'seg-toggle-btn-label'}, label),
    h('span',{class:'seg-toggle-btn-sub'}, sub)
  );
  wrap.appendChild(makeBtn('demo', state.t('trade.mode_demo'), tr('Practice mode','وضع تجريبي','Демо режим')));
  wrap.appendChild(makeBtn('real', state.t('trade.mode_real'), tr('Live balance','الرصيد الحقيقي','Реальный баланс')));
  return wrap;
}


function tgTheme(){
  try { return (window.Telegram && Telegram.WebApp && Telegram.WebApp.colorScheme) ? Telegram.WebApp.colorScheme : 'dark'; }
  catch(e){ return 'dark'; }
}



// -------- Native candlestick chart (Lightweight Charts) --------
function lcChartBox(symbol, type, market){
  const box = h('div',{class:'tvbox'});
  box.appendChild(h('div',{class:'tvhead'},
    h('div',{style:'font-weight:900'}, state.t('trade.chart')),
    h('div',{class:'muted small'}, `${symbol} • ${market.toUpperCase()} • ${type.toUpperCase()}`)
  ));

  const body = h('div',{class:'tvbody', style:'min-height:520px;'});
  // toolbar
  const toolbar = h('div',{class:'row', style:'gap:8px;flex-wrap:wrap;padding:10px;border-bottom:1px solid rgba(255,255,255,.06);align-items:center;'},
    h('span',{class:'pill'}, state.t('trade.timeframe'))
  );

  const tfSel = h('select',{class:'input', style:'max-width:140px;'},
    ...['1m','5m','15m','1h','4h','1d'].map(x=>h('option',{value:x}, x))
  );
  tfSel.value = (localStorage.getItem('chartTF')||'15m');

  const indSel = h('select',{class:'input', style:'max-width:200px;'},
    h('option',{value:'none'}, state.t('chart.indicators')),
    h('option',{value:'sma'}, state.t('chart.sma')),
    h('option',{value:'ema'}, state.t('chart.ema')),
    h('option',{value:'bb'}, state.t('chart.bb')),
    h('option',{value:'rsi'}, state.t('chart.rsi')),
    h('option',{value:'macd'}, state.t('chart.macd')),
    h('option',{value:'sma+rsi'}, state.t('chart.sma')+' + '+state.t('chart.rsi')),
    h('option',{value:'ema+rsi'}, state.t('chart.ema')+' + '+state.t('chart.rsi')),
    h('option',{value:'bb+rsi'}, state.t('chart.bb')+' + '+state.t('chart.rsi')),
    h('option',{value:'sma+macd'}, state.t('chart.sma')+' + '+state.t('chart.macd')),
    h('option',{value:'ema+macd'}, state.t('chart.ema')+' + '+state.t('chart.macd')),
    h('option',{value:'bb+macd'}, state.t('chart.bb')+' + '+state.t('chart.macd'))
  );
  if(!localStorage.getItem('chartIND_default_v2')){
    localStorage.setItem('chartIND', 'none');
    localStorage.setItem('chartIND_default_v2', '1');
  }
  indSel.value = (localStorage.getItem('chartIND')||'none');

  const toolSel = h('select',{class:'input', style:'max-width:200px;'},
    h('option',{value:'none'}, '✋ '+state.t('chart.tool_cursor')),
    h('option',{value:'trend'}, '／ '+state.t('chart.tool_trend')),
    h('option',{value:'hline'}, '— '+state.t('chart.tool_hline')),
    h('option',{value:'vline'}, '│ '+state.t('chart.tool_vline'))
  );
  toolSel.value = (localStorage.getItem('chartTOOL')||'none');

  let selectedIdx = null;
  let locked = (localStorage.getItem('chartLOCK')||'0')==='1';

  const btnSettings = h('button',{class:'btn secondary', onclick:()=>{ openChartSettings(); }}, state.t('chart.settings'));
  const btnLock = h('button',{class:'btn secondary', onclick:()=>{
    locked = !locked;
    localStorage.setItem('chartLOCK', locked?'1':'0');
    btnLock.textContent = locked ? '🔒 '+state.t('chart.locked') : '🔓 '+state.t('chart.unlocked');
    haptic();
  }}, (locked ? '🔒 '+state.t('chart.locked') : '🔓 '+state.t('chart.unlocked')));

  
  let snap = (localStorage.getItem('chartSNAP')||'1')==='1';
  const btnSnap = h('button',{class:'btn secondary', onclick:()=>{
    snap = !snap;
    localStorage.setItem('chartSNAP', snap?'1':'0');
    btnSnap.textContent = (snap ? '🧲 ' + state.t('chart.snap_on') : '🧲 ' + state.t('chart.snap_off'));
    haptic();
  }}, (snap ? '🧲 ' + state.t('chart.snap_on') : '🧲 ' + state.t('chart.snap_off')));

  const btnAlerts = h('button',{class:'btn secondary', onclick:()=>{ openAlerts(); }}, '⏰ '+state.t('chart.alerts'));
const btnDelete = h('button',{class:'btn secondary', onclick:()=>{
    if (selectedIdx==null) { toast(state.t('chart.no_selection')); return; }
    drawings.splice(selectedIdx,1);
    selectedIdx = null;
    persistDrawings();
    redrawOverlay();
    haptic();
  }}, state.t('chart.delete_selected'));

  const btnClear = h('button',{class:'btn secondary', onclick:()=>{
    drawings = [];
    selectedIdx = null;
    persistDrawings();
    redrawOverlay();
    haptic();
  }}, state.t('chart.clear_drawings'));

  const btnReset = h('button',{class:'btn', onclick:()=>{
    localStorage.setItem('chartTF','15m');
    localStorage.setItem('chartIND','none');
    localStorage.setItem('chartTOOL','none');
    render();
  }}, state.t('chart.reset'));

  // Keep the chart clean: minimal controls visible, advanced tools behind a toggle.
  const moreBtn = h('button',{class:'btn secondary small', onclick:()=>{
    advTools.classList.toggle('open');
    moreBtn.textContent = (advTools.classList.contains('open') ? '▲ ' : '▼ ') + state.t('chart.more');
    haptic();
  }}, '▼ '+state.t('chart.more'));

  const primaryTools = h('div',{class:'row', style:'gap:8px;flex-wrap:wrap;align-items:center;'}, tfSel, indSel, toolSel, moreBtn);
  const advTools = h('div',{class:'chart-tools-adv'}, btnSnap, btnAlerts, btnSettings, btnLock, btnDelete, btnClear, btnReset);
  toolbar.appendChild(primaryTools);
  toolbar.appendChild(advTools);
  body.appendChild(toolbar);

  // host (main chart + overlay)
  const host = h('div',{style:'min-height:520px;position:relative;'});
  body.appendChild(host);
  box.appendChild(body);

  // If the library isn't loaded yet, try to load it and re-render.
  if (!window.LightweightCharts) {
    const msg = h('div',{class:'muted small', style:'padding:12px;'}, state.t('trade.chart_loading_lib'));
    host.appendChild(msg);
    ensureLightweightCharts().then((ok)=>{
      if (!ok) {
        msg.textContent = state.t('trade.chart_offline');
        return;
      }
      // re-render the page after the lib becomes available
      try{ requestRender(); }catch(e){}
    });
    return box;
  }

  let chart, candleSeries, maSeries, emaSeries, bbMidSeries, bbUpSeries, bbDnSeries, rsiChart, rsiSeries, macdChart, macdSeries, macdSignalSeries, macdHistSeries;
  let destroyed = false;
  let loadSeq = 0;
  let livePriceGuard = 0;
  try{ if (window.__tp_chart_cleanup) window.__tp_chart_cleanup(); }catch(e){}

  // --- Helpers
  const tfToBinance = (tf)=>{
    if (tf==='1d') return '1d';
    if (tf==='4h') return '4h';
    if (tf==='1h') return '1h';
    if (tf==='30m') return '30m';
    if (tf==='15m') return '15m';
    if (tf==='5m') return '5m';
    if (tf==='3m') return '3m';
    if (tf==='1m') return '1m';
    return '15m';
  };
  const tfToSeconds = (tf)=>{
    if (tf==='1m') return 60;
    if (tf==='3m') return 180;
    if (tf==='5m') return 300;
    if (tf==='15m') return 900;
    if (tf==='30m') return 1800;
    if (tf==='1h') return 3600;
    if (tf==='4h') return 14400;
    if (tf==='1d') return 86400;
    return 900;
  };
  const bucketStart = (unixSec, tf)=>{
    const step = tfToSeconds(tf);
    const n = Number(unixSec||0);
    if(!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n / step) * step;
  };
  const normalizeCandles = (items)=>{
    if(!Array.isArray(items)) return [];
    const byTime = new Map();
    for(const raw of items){
      if(!raw || typeof raw !== 'object') continue;
      const time = Math.floor(Number(raw.time ?? raw.t ?? 0));
      const open = Number(raw.open ?? raw.o ?? raw.close ?? raw.c ?? 0);
      const high = Number(raw.high ?? raw.h ?? open);
      const low = Number(raw.low ?? raw.l ?? open);
      const close = Number(raw.close ?? raw.c ?? open);
      const volume = Number(raw.volume ?? raw.v ?? 0);
      if(!(time > 0) || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) continue;
      byTime.set(time, {
        time,
        open,
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume: Number.isFinite(volume) ? volume : 0,
      });
    }
    return Array.from(byTime.values()).sort((a,b)=>a.time-b.time);
  };

  const fillCandleGaps = (candles, stepSec, maxGapBars=8)=>{
    if(!Array.isArray(candles) || !candles.length || !(stepSec>0)) return Array.isArray(candles) ? candles : [];
    const out=[];
    for(let i=0;i<candles.length;i++){
      const cur=candles[i];
      out.push(cur);
      const next=candles[i+1];
      if(!next) continue;
      const gap = Number(next.time||0) - Number(cur.time||0);
      if(!(gap > stepSec)) continue;
      const missing = Math.floor(gap/stepSec) - 1;
      if(!(missing>0) || missing>maxGapBars) continue;
      const anchor = Number(cur.close ?? cur.open ?? 0);
      if(!(anchor>0)) continue;
      for(let j=1;j<=missing;j++){
        out.push({
          time: Number(cur.time) + (j*stepSec),
          open: anchor,
          high: anchor,
          low: anchor,
          close: anchor,
          volume: 0,
        });
      }
    }
    return out.sort((a,b)=>Number(a.time||0)-Number(b.time||0));
  };
  const isChartMobileViewport = ()=>{
    try{ return !!window.matchMedia && window.matchMedia('(max-width: 980px)').matches; }catch(e){}
    try{ return (window.innerWidth || 0) <= 980; }catch(e){}
    return false;
  };
  const chartAssetType = normalizeLiveAssetType(type || 'crypto');
  const chartCacheStore = (()=>{
    try{
      if(!window.__vpTradeCandleCache || !(window.__vpTradeCandleCache instanceof Map)) window.__vpTradeCandleCache = new Map();
      return window.__vpTradeCandleCache;
    }catch(e){ return new Map(); }
  })();
  const candleCacheKey = (tfUi)=>`${symbol}|${chartAssetType}|${market}|${tfUi}`;
  const candleCacheGet = (tfUi)=>{
    try{
      const hit = chartCacheStore.get(candleCacheKey(tfUi));
      if(!hit || !Array.isArray(hit.items) || !hit.items.length) return null;
      const maxAgeMs = chartAssetType === 'crypto' ? 14000 : ((chartAssetType === 'stocks' || chartAssetType === 'arab') ? 60000 : 45000);
      if((Date.now() - Number(hit.ts || 0)) > maxAgeMs) return null;
      return hit.items.slice();
    }catch(e){ return null; }
  };
  const candleCacheSet = (tfUi, candles)=>{
    try{
      if(Array.isArray(candles) && candles.length){
        chartCacheStore.set(candleCacheKey(tfUi), { ts: Date.now(), items: candles.slice(-500) });
      }
    }catch(e){}
  };
  const candleRequestLimit = (tfUi)=>{
    const mobile = isChartMobileViewport();
    if(chartAssetType === 'crypto') return mobile ? 220 : 280;
    if(chartAssetType === 'forex') return mobile ? 150 : 210;
    if(chartAssetType === 'stocks' || chartAssetType === 'arab') return mobile ? 120 : 170;
    return mobile ? 140 : 190;
  };
  const candleSeriesSignature = (items)=>{
    if(!Array.isArray(items) || !items.length) return '0';
    const first = items[0] || {};
    const last = items[items.length - 1] || {};
    return [items.length, Number(first.time||0), Number(last.time||0), Number(last.open||0), Number(last.close||0), Number(last.high||0), Number(last.low||0)].join('|');
  };

  const calcSMA = (candles, n=20)=>{
    const out=[];
    let sum=0;
    for (let i=0;i<candles.length;i++){
      sum += candles[i].close;
      if (i>=n) sum -= candles[i-n].close;
      if (i>=n-1) out.push({ time: candles[i].time, value: sum/n });
    }
    return out;
  };

  const calcEMA = (candles, n=20)=>{
    const out=[];
    if (!candles.length) return out;
    const k = 2/(n+1);
    let ema = candles[0].close;
    for (let i=0;i<candles.length;i++){
      ema = (candles[i].close * k) + (ema * (1-k));
      if (i>=n-1) out.push({ time: candles[i].time, value: ema });
    }
    return out;
  };

  const calcRSI = (candles, period=14)=>{
    const out=[];
    if (candles.length < period+1) return out;
    let gain=0, loss=0;
    for (let i=1;i<=period;i++){
      const ch = candles[i].close - candles[i-1].close;
      if (ch>=0) gain += ch;
      else loss -= ch;
    }
    let avgGain = gain/period;
    let avgLoss = loss/period;
    const rsiAt = (time)=>{
      const rs = avgLoss===0 ? 100 : (avgGain/avgLoss);
      const rsi = avgLoss===0 ? 100 : (100 - (100/(1+rs)));
      out.push({ time, value: rsi });
    };
    rsiAt(candles[period].time);
    for (let i=period+1;i<candles.length;i++){
      const ch = candles[i].close - candles[i-1].close;
      const g = ch>0 ? ch : 0;
      const l = ch<0 ? -ch : 0;
      avgGain = ((avgGain*(period-1)) + g)/period;
      avgLoss = ((avgLoss*(period-1)) + l)/period;
      rsiAt(candles[i].time);
    }
    return out;
  };


  const getChartSettings = ()=>{
    // persisted settings (global, simple)
    const s = {
      sma: parseInt(localStorage.getItem('chartSMA')||'20',10),
      ema: parseInt(localStorage.getItem('chartEMA')||'20',10),
      rsi: parseInt(localStorage.getItem('chartRSI')||'14',10),
      bbPeriod: parseInt(localStorage.getItem('chartBBP')||'20',10),
      bbDev: parseFloat(localStorage.getItem('chartBBD')||'2'),
      macdFast: parseInt(localStorage.getItem('chartMACDF')||'12',10),
      macdSlow: parseInt(localStorage.getItem('chartMACDS')||'26',10),
      macdSignal: parseInt(localStorage.getItem('chartMACDsig')||'9',10),
    };
    // clamp
    s.sma = Math.max(2, Math.min(200, s.sma||20));
    s.ema = Math.max(2, Math.min(200, s.ema||20));
    s.rsi = Math.max(2, Math.min(200, s.rsi||14));
    s.bbPeriod = Math.max(2, Math.min(200, s.bbPeriod||20));
    s.bbDev = Math.max(0.5, Math.min(5, isFinite(s.bbDev)?s.bbDev:2));
    s.macdFast = Math.max(2, Math.min(100, s.macdFast||12));
    s.macdSlow = Math.max(3, Math.min(200, s.macdSlow||26));
    if (s.macdSlow <= s.macdFast) s.macdSlow = s.macdFast + 1;
    s.macdSignal = Math.max(2, Math.min(100, s.macdSignal||9));
    return s;
  };

  const calcBB = (candles, period=20, dev=2)=>{
    const outMid=[], outUp=[], outDn=[];
    if (!candles.length) return {mid:outMid, up:outUp, dn:outDn};
    let win=[];
    for (let i=0;i<candles.length;i++){
      win.push(candles[i].close);
      if (win.length>period) win.shift();
      if (win.length===period){
        const mean = win.reduce((a,b)=>a+b,0)/period;
        const variance = win.reduce((a,b)=>a+Math.pow(b-mean,2),0)/period;
        const sd = Math.sqrt(variance);
        const t = candles[i].time;
        outMid.push({time:t, value: mean});
        outUp.push({time:t, value: mean + dev*sd});
        outDn.push({time:t, value: mean - dev*sd});
      }
    }
    return {mid:outMid, up:outUp, dn:outDn};
  };

  const calcMACD = (candles, fast=12, slow=26, signal=9)=>{
    // MACD line = EMA(fast)-EMA(slow), Signal=EMA(MACD,signal), Hist=MACD-Signal
    const outMacd=[], outSig=[], outHist=[];
    if (!candles.length) return {macd:outMacd, signal:outSig, hist:outHist};
    const emaArr = (n)=>{
      const k=2/(n+1);
      let ema=candles[0].close;
      const out=[];
      for (let i=0;i<candles.length;i++){
        ema = (candles[i].close*k) + (ema*(1-k));
        out.push(ema);
      }
      return out;
    };
    const ef=emaArr(fast), es=emaArr(slow);
    const macdVals = ef.map((v,i)=>v-es[i]);
    // signal EMA on macdVals
    const k=2/(signal+1);
    let se=macdVals[0];
    const sigVals=[];
    for (let i=0;i<macdVals.length;i++){
      se = (macdVals[i]*k) + (se*(1-k));
      sigVals.push(se);
    }
    for (let i=0;i<candles.length;i++){
      const t=candles[i].time;
      outMacd.push({time:t, value: macdVals[i]});
      outSig.push({time:t, value: sigVals[i]});
      outHist.push({time:t, value: macdVals[i]-sigVals[i]});
    }
    return {macd:outMacd, signal:outSig, hist:outHist};
  };


  // --- Alerts (client-side) with optional Telegram popups
  const alertsKey = ()=>`alerts:${market}:${type}:${symbol}`;
  let alerts = [];
  try{ alerts = JSON.parse(localStorage.getItem(alertsKey())||'[]')||[]; }catch(e){ alerts=[]; }

  const saveAlerts = ()=>{
    try{ localStorage.setItem(alertsKey(), JSON.stringify(alerts.slice(0,200))); }catch(e){}
  };

  const notifyAlert = (msg)=>{
    try{ haptic(); }catch{}
    try{
      if (isTg() && tg().showPopup){
        tg().showPopup({title: state.t('chart.alerts'), message: msg, buttons:[{type:'ok'}]});
      } else {
        toast(msg);
      }
    } catch(e){ toast(msg); }
  };

  const mkId = ()=> Math.random().toString(36).slice(2)+Date.now().toString(36);

  const openAlerts = ()=>{
    const wrap = h('div',{class:'dialog-backdrop'});
    const card = h('div',{class:'dialog', style:'max-width:560px;'});
    card.appendChild(h('div',{style:'font-weight:900;font-size:16px;margin-bottom:10px;'}, state.t('chart.alerts')));

    const list = h('div',{style:'display:flex;flex-direction:column;gap:8px;margin-bottom:12px;'});
    const renderList = ()=>{
      list.innerHTML='';
      if (!alerts.length){
        list.appendChild(h('div',{class:'muted small'}, state.t('alerts.none')));
        return;
      }
      alerts.forEach(a=>{
        const label = describeAlert(a);
        const st = a.fired ? '✅ ' + state.t('alerts.fired') : '⏳ ' + state.t('alerts.active');
        const row = h('div',{class:'card', style:'padding:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;'}, 
          h('div',{}, h('div',{style:'font-weight:800;'}, label), h('div',{class:'muted small'}, st)),
          h('div',{class:'row', style:'gap:8px;'},
            h('button',{class:'btn secondary', onclick:()=>{ a.fired=false; saveAlerts(); renderList(); }}, state.t('alerts.reset')),
            h('button',{class:'btn danger', onclick:()=>{ alerts = alerts.filter(x=>x.id!==a.id); saveAlerts(); renderList(); }}, state.t('alerts.delete'))
          )
        );
        list.appendChild(row);
      });
    };

    const sectionTitle = (t)=>h('div',{style:'font-weight:800;margin:10px 0 6px;'}, t);
    const mkSelect = (opts, val)=>{
      const s = h('select',{class:'input', style:'max-width:220px;'});
      opts.forEach(o=>s.appendChild(h('option',{value:o.value}, o.label)));
      s.value = val;
      return s;
    };
    const mkNum = (val, step='0.01')=>{
      const i = h('input',{class:'input', type:'number', step:step, value:String(val ?? ''), style:'max-width:220px;'});
      return i;
    };

    // Price alert
    card.appendChild(sectionTitle(state.t('alerts.price_title')));
    const priceDir = mkSelect([{value:'above',label:state.t('alerts.above')},{value:'below',label:state.t('alerts.below')}],'above');
    const lastClose = (lastCandles && lastCandles.length) ? lastCandles[lastCandles.length-1].close : '';
    const priceVal = mkNum(lastClose || '', '0.01');
    const addPrice = h('button',{class:'btn', onclick:()=>{
      const v = parseFloat(priceVal.value);
      if (!Number.isFinite(v)) return toast(state.t('alerts.invalid'));
      alerts.unshift({id:mkId(), kind:'price', dir:priceDir.value, value:v, fired:false, createdAt:Date.now()});
      saveAlerts(); renderList(); toast(state.t('alerts.added'));
    }}, state.t('alerts.add'));
    card.appendChild(h('div',{class:'row', style:'gap:10px;flex-wrap:wrap;align-items:center;'}, priceDir, priceVal, addPrice));

    // RSI alert
    card.appendChild(sectionTitle(state.t('alerts.rsi_title')));
    const rsiDir = mkSelect([{value:'above',label:state.t('alerts.above')},{value:'below',label:state.t('alerts.below')}],'above');
    const rsiLevel = mkNum(70, '1');
    const addRSI = h('button',{class:'btn', onclick:()=>{
      const v = parseFloat(rsiLevel.value);
      if (!Number.isFinite(v)) return toast(state.t('alerts.invalid'));
      alerts.unshift({id:mkId(), kind:'rsi', dir:rsiDir.value, value:v, fired:false, createdAt:Date.now()});
      saveAlerts(); renderList(); toast(state.t('alerts.added'));
    }}, state.t('alerts.add'));
    card.appendChild(h('div',{class:'row', style:'gap:10px;flex-wrap:wrap;align-items:center;'}, rsiDir, rsiLevel, addRSI));

    // Cross alerts
    card.appendChild(sectionTitle(state.t('alerts.cross_title')));
    const crossKind = mkSelect([
      {value:'ma', label: state.t('alerts.cross_ma')},
      {value:'macd', label: state.t('alerts.cross_macd')},
    ], 'ma');
    const crossDir = mkSelect([
      {value:'bull', label: state.t('alerts.cross_bull')},
      {value:'bear', label: state.t('alerts.cross_bear')},
    ], 'bull');
    const addCross = h('button',{class:'btn', onclick:()=>{
      const k = crossKind.value;
      alerts.unshift({id:mkId(), kind:(k==='macd'?'macd_cross':'ma_cross'), dir:crossDir.value, fired:false, createdAt:Date.now()});
      saveAlerts(); renderList(); toast(state.t('alerts.added'));
    }}, state.t('alerts.add'));
    card.appendChild(h('div',{class:'row', style:'gap:10px;flex-wrap:wrap;align-items:center;'}, crossKind, crossDir, addCross));

    card.appendChild(sectionTitle(state.t('alerts.list_title')));
    card.appendChild(list);
    renderList();

    const close = h('button',{class:'btn secondary', onclick:()=>wrap.remove()}, state.t('close'));
    card.appendChild(h('div',{class:'row', style:'justify-content:flex-end;gap:8px;margin-top:10px;'}, close));
    wrap.appendChild(card);
    wrap.addEventListener('click',(e)=>{ if (e.target===wrap) wrap.remove();});
    document.body.appendChild(wrap);
  };

  const describeAlert = (a)=>{
    if (a.kind==='price') return `${state.t('alerts.price')}: ${state.t('alerts.'+a.dir)} ${fmt(a.value,2)}`;
    if (a.kind==='rsi') return `RSI: ${state.t('alerts.'+a.dir)} ${fmt(a.value,0)}`;
    if (a.kind==='ma_cross') return `${state.t('alerts.cross_ma')}: ${a.dir==='bull'?state.t('alerts.cross_bull'):state.t('alerts.cross_bear')}`;
    if (a.kind==='macd_cross') return `${state.t('alerts.cross_macd')}: ${a.dir==='bull'?state.t('alerts.cross_bull'):state.t('alerts.cross_bear')}`;
    return a.kind;
  };

  const checkCross = (a,b)=>{
    // returns {bull,bear} cross between a and b using last two values
    if (!a || !b || a.length<2 || b.length<2) return {bull:false,bear:false};
    const a0=a[a.length-2].value, a1=a[a.length-1].value;
    const b0=b[b.length-2].value, b1=b[b.length-1].value;
    return {
      bull: (a0<=b0 && a1>b1),
      bear: (a0>=b0 && a1<b1)
    };
  };

  let alertsTimer = null;
  const startAlertsTimer = ()=>{
    if (alertsTimer) return;
    alertsTimer = setInterval(()=>{
      try{
        if (!lastCandles || lastCandles.length<30) return;
        if (!alerts || !alerts.length) return;
        const close = lastCandles[lastCandles.length-1].close;
        const s = getChartSettings();
        // compute RSI
        const rsi = calcRSI(lastCandles, s.rsi);
        const rsiVal = rsi.length ? rsi[rsi.length-1].value : null;
        const sma = calcSMA(lastCandles, s.sma);
        const ema = calcEMA(lastCandles, s.ema);
        const mac = calcMACD(lastCandles, s.macdFast, s.macdSlow, s.macdSignal);
        const macd = mac.macd;
        const sig = mac.signal;

        let firedAny=false;
        alerts.forEach(al=>{
          if (al.fired) return;
          if (al.kind==='price'){
            if (al.dir==='above' && close>=al.value) { al.fired=true; firedAny=true; notifyAlert(`${state.t('alerts.price')} ${state.t('alerts.above')} ${fmt(al.value,2)}`); }
            if (al.dir==='below' && close<=al.value) { al.fired=true; firedAny=true; notifyAlert(`${state.t('alerts.price')} ${state.t('alerts.below')} ${fmt(al.value,2)}`); }
          }
          if (al.kind==='rsi' && rsiVal!=null){
            if (al.dir==='above' && rsiVal>=al.value) { al.fired=true; firedAny=true; notifyAlert(`RSI ${state.t('alerts.above')} ${fmt(al.value,0)}`); }
            if (al.dir==='below' && rsiVal<=al.value) { al.fired=true; firedAny=true; notifyAlert(`RSI ${state.t('alerts.below')} ${fmt(al.value,0)}`); }
          }
          if (al.kind==='ma_cross'){
            const cr = checkCross(ema,sma);
            if (al.dir==='bull' && cr.bull){ al.fired=true; firedAny=true; notifyAlert(state.t('alerts.cross_ma')+' — '+state.t('alerts.cross_bull')); }
            if (al.dir==='bear' && cr.bear){ al.fired=true; firedAny=true; notifyAlert(state.t('alerts.cross_ma')+' — '+state.t('alerts.cross_bear')); }
          }
          if (al.kind==='macd_cross'){
            const cr = checkCross(macd,sig);
            if (al.dir==='bull' && cr.bull){ al.fired=true; firedAny=true; notifyAlert(state.t('alerts.cross_macd')+' — '+state.t('alerts.cross_bull')); }
            if (al.dir==='bear' && cr.bear){ al.fired=true; firedAny=true; notifyAlert(state.t('alerts.cross_macd')+' — '+state.t('alerts.cross_bear')); }
          }
        });
        if (firedAny){ saveAlerts(); }
      }catch(e){}
    }, 2500);
  };

  const openChartSettings = ()=>{
    const s = getChartSettings();
    const wrap = h('div',{class:'dialog-backdrop'});
    const card = h('div',{class:'dialog', style:'max-width:520px;'});
    card.appendChild(h('div',{style:'font-weight:900;font-size:16px;margin-bottom:10px;'}, state.t('chart.settings')));
    const row = (label, input)=>h('div',{class:'row', style:'justify-content:space-between;gap:10px;margin:8px 0;align-items:center;'}, h('div',{class:'muted small'}, label), input);

    const mkNum = (v, step='1', min='1', max='200')=>{
      const inp = h('input',{class:'input', type:'number', value:String(v), step, min, max, style:'max-width:140px;'});
      return inp;
    };

    const smaI = mkNum(s.sma,'1','2','200');
    const emaI = mkNum(s.ema,'1','2','200');
    const rsiI = mkNum(s.rsi,'1','2','200');
    const bbP = mkNum(s.bbPeriod,'1','2','200');
    const bbD = mkNum(s.bbDev,'0.1','0.5','5');
    const mF = mkNum(s.macdFast,'1','2','100');
    const mS = mkNum(s.macdSlow,'1','3','200');
    const mSig = mkNum(s.macdSignal,'1','2','100');

    card.appendChild(row(state.t('chart.sma_period'), smaI));
    card.appendChild(row(state.t('chart.ema_period'), emaI));
    card.appendChild(row(state.t('chart.rsi_period'), rsiI));
    card.appendChild(h('div',{class:'muted small', style:'margin-top:10px;font-weight:800;'}, state.t('chart.bb')));
    card.appendChild(row(state.t('chart.bb_period'), bbP));
    card.appendChild(row(state.t('chart.bb_dev'), bbD));
    card.appendChild(h('div',{class:'muted small', style:'margin-top:10px;font-weight:800;'}, state.t('chart.macd')));
    card.appendChild(row(state.t('chart.macd_fast'), mF));
    card.appendChild(row(state.t('chart.macd_slow'), mS));
    card.appendChild(row(state.t('chart.macd_signal'), mSig));

    const actions = h('div',{class:'row', style:'justify-content:flex-end;gap:10px;margin-top:14px;'},
      h('button',{class:'btn secondary', onclick:()=>{ document.body.removeChild(wrap); }}, state.t('common.cancel')),
      h('button',{class:'btn', onclick:()=>{
        localStorage.setItem('chartSMA', smaI.value);
        localStorage.setItem('chartEMA', emaI.value);
        localStorage.setItem('chartRSI', rsiI.value);
        localStorage.setItem('chartBBP', bbP.value);
        localStorage.setItem('chartBBD', bbD.value);
        localStorage.setItem('chartMACDF', mF.value);
        localStorage.setItem('chartMACDS', mS.value);
        localStorage.setItem('chartMACDsig', mSig.value);
        document.body.removeChild(wrap);
        // refresh chart
        try{ applyIndicators(lastCandles); }catch(e){}
        haptic();
      }}, state.t('common.save'))
    );
    card.appendChild(actions);
    wrap.appendChild(card);
    wrap.addEventListener('click',(e)=>{ if (e.target===wrap) document.body.removeChild(wrap); });
    document.body.appendChild(wrap);
  };
  // --- Theme (use CSS variables; fall back to Telegram theme if available)
  const isLight = (document.documentElement.getAttribute('data-theme') === 'light') || (tgTheme()==='light');
  const baseText = cssVar('--chart-text', isLight ? '#0f172a' : '#e2e8f0');
  // On Telegram WebView in light mode, transparent chart backgrounds look broken.
  // Use solid white for light theme, keep transparent for dark.
  const baseBg = cssVar('--chart-bg', isLight ? '#ffffff' : 'transparent');

  // --- Layout: split chart area + RSI panel (optional)
  const mainEl = h('div',{style:'height:380px;position:relative;'});
  const rsiEl = h('div',{style:`height:140px;position:relative;display:none;border-top:1px solid ${cssVar('--line','rgba(255,255,255,.06)')};`});
  const macdEl = h('div',{style:`height:140px;position:relative;display:none;border-top:1px solid ${cssVar('--line','rgba(255,255,255,.06)')};`});
  host.appendChild(mainEl);
  host.appendChild(rsiEl);
  host.appendChild(macdEl);

  chart = window.LightweightCharts.createChart(mainEl, {
    layout: { background: { type: window.LightweightCharts.ColorType.Solid, color: baseBg }, textColor: baseText },
    grid: {
      vertLines: { visible: true, color: isLight ? 'rgba(2,6,23,.06)' : 'rgba(255,255,255,.06)' },
      horzLines: { visible: true, color: isLight ? 'rgba(2,6,23,.06)' : 'rgba(255,255,255,.06)' },
    },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 7, minBarSpacing: 3, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true },
    crosshair: { mode: window.LightweightCharts.CrosshairMode.Magnet },
    handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    height: 380,
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#22c55e', downColor: '#ef4444',
    borderUpColor: '#22c55e', borderDownColor: '#ef4444',
    wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    priceLineVisible: true,
    lastValueVisible: true,
  });
  let livePriceLine = null;
  let lastVisiblePrice = 0;
  const updateVisiblePriceIndicator = (rawPrice, source='')=>{
    const price = Number(rawPrice || 0);
    if(!(price > 0)) return;
    const drift = Math.abs(price - Number(lastVisiblePrice || 0)) / Math.max(1, Math.abs(Number(lastVisiblePrice || 0) || price));
    if(lastVisiblePrice > 0 && drift < (chartAssetType === 'crypto' ? 0.00001 : 0.00005)) return;
    lastVisiblePrice = price;
    const color = cssVar('--primary','#60a5fa');
    const title = chartAssetType === 'forex' ? 'FX' : (vpIsDelayedQuoteType(chartAssetType) ? 'DLY' : (chartAssetType === 'arab' ? 'AR' : 'LIVE'));
    try{
      const opts = { price, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, lineVisible: true, title };
      if(!livePriceLine && typeof candleSeries.createPriceLine === 'function'){
        livePriceLine = candleSeries.createPriceLine(opts);
      }else if(livePriceLine && typeof livePriceLine.applyOptions === 'function'){
        livePriceLine.applyOptions(opts);
      }
    }catch(e){}
  };

  // RSI chart (created lazily when enabled)
  const ensureRSI = ()=>{
    if (rsiChart) return;
    rsiEl.style.display = 'block';
    rsiChart = window.LightweightCharts.createChart(rsiEl, {
      layout: { background: { type: window.LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: baseText },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false, autoScale: false, scaleMargins: { top: 0.2, bottom: 0.2 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 7, minBarSpacing: 3, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: window.LightweightCharts.CrosshairMode.Magnet },
      height: 140,
    });
    rsiSeries = rsiChart.addLineSeries({ lineWidth: 2 });
    // Sync time scale
    chart.timeScale().subscribeVisibleTimeRangeChange((range)=>{
      try{ rsiChart.timeScale().setVisibleRange(range); }catch{}
    });
    rsiChart.timeScale().subscribeVisibleTimeRangeChange((range)=>{
      try{ chart.timeScale().setVisibleRange(range); }catch{}
    });
  };

  

  // MACD panel (created lazily when enabled)
  const ensureMACD = ()=>{
    if (macdChart) return;
    macdEl.style.display = 'block';
    macdChart = window.LightweightCharts.createChart(macdEl, {
      layout: { background: { type: window.LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: baseText },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false, autoScale: true, scaleMargins: { top: 0.2, bottom: 0.2 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 7, minBarSpacing: 3, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: window.LightweightCharts.CrosshairMode.Magnet },
      height: 140,
    });
    macdSeries = macdChart.addLineSeries({ lineWidth: 2 });
    macdSignalSeries = macdChart.addLineSeries({ lineWidth: 2 });
    macdHistSeries = macdChart.addHistogramSeries({ priceFormat: { type: 'price', precision: 6, minMove: 0.000001 } });

    // Sync time scale with main chart
    chart.timeScale().subscribeVisibleTimeRangeChange((range)=>{
      try{ macdChart.timeScale().setVisibleRange(range); }catch{}
    });
    macdChart.timeScale().subscribeVisibleTimeRangeChange((range)=>{
      try{ chart.timeScale().setVisibleRange(range); }catch{}
    });
  };
// --- Overlay drawing canvas
  const overlay = document.createElement('canvas');
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  // Allow native chart panning/zoom when no drawing tool is active.
  // Our overlay is only needed when drawing/annotating.
  overlay.style.pointerEvents = 'none';
  overlay.style.touchAction = 'none'; // allow drawing on mobile
  mainEl.appendChild(overlay);
  const octx = overlay.getContext('2d');

  const drawingKey = ()=>`drawings:${market}:${type}:${symbol}`;
  let drawings = [];
  try{ drawings = JSON.parse(localStorage.getItem(drawingKey())||'[]')||[]; }catch(e){ drawings=[]; }
  const persistDrawings = ()=>{
    try{ localStorage.setItem(drawingKey(), JSON.stringify(drawings.slice(0,200))); }catch(e){}
  };

  let tool = toolSel.value || 'none';
  let temp = null; // {tool, p1?, p2?}
  let lastCandles = [];

  const resizeOverlay = ()=>{
    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.floor(mainEl.clientWidth * dpr);
    overlay.height = Math.floor(mainEl.clientHeight * dpr);
    octx.setTransform(dpr,0,0,dpr,0,0);
    redrawOverlay();
  };

  const timeToX = (t)=>chart.timeScale().timeToCoordinate(t);
  const xToTime = (x)=>chart.timeScale().coordinateToTime(x);
  const priceToY = (p)=>candleSeries.priceToCoordinate(p);
  const yToPrice = (y)=>candleSeries.coordinateToPrice(y);


  const nearestCandle = (t)=>{
    if (!lastCandles || lastCandles.length===0) return null;
    // binary search by time (candles sorted)
    let lo=0, hi=lastCandles.length-1;
    while (lo<=hi){
      const mid=(lo+hi)>>1;
      const mt=lastCandles[mid].time;
      if (mt===t) return lastCandles[mid];
      if (mt < t) lo=mid+1; else hi=mid-1;
    }
    const c1=lastCandles[Math.max(0,hi)];
    const c2=lastCandles[Math.min(lastCandles.length-1,lo)];
    if (!c1) return c2;
    if (!c2) return c1;
    return (Math.abs(c1.time - t) <= Math.abs(c2.time - t)) ? c1 : c2;
  };

  const snapPoint = (t,p, mode='both')=>{
    if (!snap) return {time:t, price:p};
    const c = nearestCandle(t);
    if (!c) return {time:t, price:p};
    const out = {time:t, price:p};
    if (mode==='both' || mode==='time') out.time = c.time;
    if (mode==='both' || mode==='price'){
      const prices = [c.open, c.high, c.low, c.close].filter(v=>typeof v==='number');
      let best=p, bestD=Infinity;
      for(const v of prices){
        const d=Math.abs(v - p);
        if (d<bestD){ bestD=d; best=v; }
      }
      out.price = best;
    }
    return out;
  };

  const drawLine = (x1,y1,x2,y2, w=2)=>{
    octx.lineWidth = w;
    octx.beginPath(); octx.moveTo(x1,y1); octx.lineTo(x2,y2); octx.stroke();
  };

  const redrawOverlay = ()=>{
    if (destroyed) return;
    octx.clearRect(0,0,mainEl.clientWidth,mainEl.clientHeight);
    // colors derived from theme (no hardcoded palette outside neutral)
    octx.strokeStyle = isLight ? 'rgba(15,23,42,0.9)' : 'rgba(226,232,240,0.9)';
    octx.fillStyle   = isLight ? 'rgba(15,23,42,0.9)' : 'rgba(226,232,240,0.9)';

    const renderObj = (obj, isTemp=false)=>{
      if (!obj) return;
      if (obj.tool==='trend' && obj.p1 && obj.p2){
        const x1=timeToX(obj.p1.time), y1=priceToY(obj.p1.price);
        const x2=timeToX(obj.p2.time), y2=priceToY(obj.p2.price);
        if (x1==null || x2==null || y1==null || y2==null) return;
        octx.globalAlpha = isTemp ? 0.6 : 1;
        drawLine(x1,y1,x2,y2,2);
        octx.globalAlpha = 1;
      }
      if (obj.tool==='hline' && obj.p1){
        const y=priceToY(obj.p1.price);
        if (y==null) return;
        octx.globalAlpha = isTemp ? 0.6 : 1;
        drawLine(0,y,mainEl.clientWidth,y,2);
        octx.globalAlpha = 1;
      }
      if (obj.tool==='vline' && obj.p1){
        const x=timeToX(obj.p1.time);
        if (x==null) return;
        octx.globalAlpha = isTemp ? 0.6 : 1;
        drawLine(x,0,x,mainEl.clientHeight,2);
        octx.globalAlpha = 1;
      }
    };

    drawings.forEach(d=>renderObj(d,false));
    renderObj(temp,true);

    // Selection overlay (Pro tools)
    if (selectedIdx!=null && drawings[selectedIdx]){
      const obj = drawings[selectedIdx];
      octx.save();
      octx.strokeStyle = isLight ? 'rgba(15,23,42,0.55)' : 'rgba(226,232,240,0.55)';
      octx.fillStyle   = isLight ? 'rgba(15,23,42,0.85)' : 'rgba(226,232,240,0.85)';
      const drawHandle = (x,y)=>{
        octx.beginPath(); octx.arc(x,y,5,0,Math.PI*2); octx.fill();
      };
      if (obj.tool==='trend' && obj.p1 && obj.p2){
        const x1=timeToX(obj.p1.time), y1=priceToY(obj.p1.price);
        const x2=timeToX(obj.p2.time), y2=priceToY(obj.p2.price);
        if (x1!=null && x2!=null && y1!=null && y2!=null){
          octx.setLineDash([6,6]);
          drawLine(x1,y1,x2,y2,2);
          octx.setLineDash([]);
          drawHandle(x1,y1); drawHandle(x2,y2);
        }
      }
      if (obj.tool==='hline' && obj.p1){
        const y=priceToY(obj.p1.price);
        if (y!=null){
          octx.setLineDash([6,6]);
          drawLine(0,y,mainEl.clientWidth,y,2);
          octx.setLineDash([]);
          drawHandle(mainEl.clientWidth-18,y);
        }
      }
      if (obj.tool==='vline' && obj.p1){
        const x=timeToX(obj.p1.time);
        if (x!=null){
          octx.setLineDash([6,6]);
          drawLine(x,0,x,mainEl.clientHeight,2);
          octx.setLineDash([]);
          drawHandle(x,18);
        }
      }
      octx.restore();
    }

  };

  const pointerPos = (ev)=>{
    const rect = overlay.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    return {x,y};
  };


  const distToSeg = (px,py,x1,y1,x2,y2)=>{
    const dx = x2-x1, dy=y2-y1;
    if (dx===0 && dy===0) return Math.hypot(px-x1, py-y1);
    const t = ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy);
    const tt = Math.max(0, Math.min(1, t));
    const cx = x1 + tt*dx;
    const cy = y1 + tt*dy;
    return Math.hypot(px-cx, py-cy);
  };

  const hitTest = (x,y)=>{
    // returns {idx, part} part can be 'p1','p2','line'
    const thresh = 10;
    for (let i=drawings.length-1;i>=0;i--){
      const obj = drawings[i];
      if (obj.tool==='trend' && obj.p1 && obj.p2){
        const x1=timeToX(obj.p1.time), y1=priceToY(obj.p1.price);
        const x2=timeToX(obj.p2.time), y2=priceToY(obj.p2.price);
        if (x1==null||x2==null||y1==null||y2==null) continue;
        if (Math.hypot(x-x1,y-y1) < thresh) return {idx:i, part:'p1'};
        if (Math.hypot(x-x2,y-y2) < thresh) return {idx:i, part:'p2'};
        if (distToSeg(x,y,x1,y1,x2,y2) < thresh) return {idx:i, part:'line'};
      }
      if (obj.tool==='hline' && obj.p1){
        const yy=priceToY(obj.p1.price);
        if (yy==null) continue;
        if (Math.abs(y-yy) < thresh) return {idx:i, part:'line'};
      }
      if (obj.tool==='vline' && obj.p1){
        const xx=timeToX(obj.p1.time);
        if (xx==null) continue;
        if (Math.abs(x-xx) < thresh) return {idx:i, part:'line'};
      }
    }
    return null;
  };

  let drag = null; // {idx, part, startX, startY, startTime, startPrice}

  const commitTemp = ()=>{
    if (!temp) return;
    // Only commit when complete
    if (temp.tool==='trend' && temp.p1 && temp.p2) { drawings.push({tool:'trend', p1:temp.p1, p2:temp.p2}); }
    if (temp.tool==='hline' && temp.p1) { drawings.push({tool:'hline', p1:temp.p1}); }
    if (temp.tool==='vline' && temp.p1) { drawings.push({tool:'vline', p1:temp.p1}); }
    temp = null;
    persistDrawings();
    redrawOverlay();
  };

  const setTool = (v)=>{
    tool = v;
    localStorage.setItem('chartTOOL', v);
    temp = null;
    // When no tool is active, allow the chart itself to receive pan/zoom gestures.
    // Otherwise the overlay will swallow drags and feels "reversed".
    overlay.style.pointerEvents = (tool && tool !== 'none') ? 'auto' : 'none';
    redrawOverlay();
  };

  toolSel.addEventListener('change', ()=>{ setTool(toolSel.value); });

  overlay.addEventListener('pointerdown', (ev)=>{
    try{ overlay.setPointerCapture(ev.pointerId); }catch{}
    const {x,y} = pointerPos(ev);

    // Selection / drag when cursor mode
    if (tool==='none'){
      const hit = hitTest(x,y);
      if (!hit){
        selectedIdx = null;
        redrawOverlay();
        return;
      }
      selectedIdx = hit.idx;
      redrawOverlay();
      if (locked) return;
      // start drag
      const t = xToTime(x);
      const p = yToPrice(y);
      if (t==null || p==null) return;
      drag = { idx: hit.idx, part: hit.part, startX:x, startY:y, startTime:t, startPrice:p };
      haptic();
      return;
    }

    let t = xToTime(x);
    let p = yToPrice(y);
    if (t==null || p==null) return;
    const sp = snapPoint(t,p,'both');
    t = sp.time; p = sp.price;

    if (tool==='trend'){
      if (!temp) temp = { tool:'trend', p1:{time:t, price:p} };
      else if (temp && temp.p1 && !temp.p2) { temp.p2 = {time:t, price:p}; commitTemp(); haptic(); }
    }
    if (tool==='hline'){
      temp = { tool:'hline', p1:{time:t, price:p} };
      commitTemp(); haptic();
    }
    if (tool==='vline'){
      temp = { tool:'vline', p1:{time:t, price:p} };
      commitTemp(); haptic();
    }
  });

  overlay.addEventListener('pointermove', (ev)=>{
    const {x,y} = pointerPos(ev);

    // Drag selected
    if (drag && !locked && tool==='none'){
      let t = xToTime(x);
      let p = yToPrice(y);
      if (t==null || p==null) return;
      const obj = drawings[drag.idx];
      if (!obj) return;
      // Snap while dragging (if enabled)
      if (snap){
        if (obj.tool==='hline'){
          p = snapPoint(t,p,'price').price;
        } else if (obj.tool==='vline'){
          t = snapPoint(t,p,'time').time;
        } else {
          const sp = snapPoint(t,p,'both');
          t = sp.time; p = sp.price;
        }
      }
      if (!obj) return;

      const dt = (typeof t==='number' && typeof drag.startTime==='number') ? (t - drag.startTime) : 0;
      const dp = (typeof p==='number' && typeof drag.startPrice==='number') ? (p - drag.startPrice) : 0;

      if (obj.tool==='trend' && obj.p1 && obj.p2){
        if (drag.part==='p1'){ obj.p1 = {time:t, price:p}; }
        else if (drag.part==='p2'){ obj.p2 = {time:t, price:p}; }
        else {
          if (dt!==0){ obj.p1.time += dt; obj.p2.time += dt; }
          if (dp!==0){ obj.p1.price += dp; obj.p2.price += dp; }
        }
      }
      // Snap whole object to candles (optional)
      if (snap && drag.part==='line'){
        const s1 = snapPoint(obj.p1.time, obj.p1.price, 'both');
        const s2 = snapPoint(obj.p2.time, obj.p2.price, 'both');
        obj.p1 = s1; obj.p2 = s2;
      }
      if (obj.tool==='hline' && obj.p1){
        obj.p1.price = p;
      }
      if (obj.tool==='vline' && obj.p1){
        if (typeof t==='number') obj.p1.time = t;
      }
      persistDrawings();
      redrawOverlay();
      return;
    }

    // Preview drawing
    if (tool==='none') return;
    if (!temp) return;
    let t = xToTime(x);
    let p = yToPrice(y);
    if (t==null || p==null) return;
    const sp = snapPoint(t,p,'both');
    t = sp.time; p = sp.price;
    if (tool==='trend' && temp.p1 && !temp.p2){
      temp.p2 = {time:t, price:p};
      redrawOverlay();
      // keep p2 as preview only
      temp.p2 = null;
    }
  });

  overlay.addEventListener('pointerup', (ev)=>{
    if (drag){
      drag = null;
      haptic();
    }
  });

  overlay.addEventListener('pointercancel', ()=>{ drag=null; });

  // allow delete key on desktop
  window.addEventListener('keydown', (e)=>{
    if (e.key==='Delete' || e.key==='Backspace'){
      if (selectedIdx!=null){
        drawings.splice(selectedIdx,1);
        selectedIdx=null;
        persistDrawings();
        redrawOverlay();
      }
    }
  });

// OHLC + Price label
  const ohlc = h('div',{class:'muted small', style:'position:absolute;left:10px;bottom:10px;background:rgba(0,0,0,.22);backdrop-filter:blur(8px);padding:6px 8px;border-radius:10px;'});
  mainEl.appendChild(ohlc);
  chart.subscribeCrosshairMove((param)=>{
    try{
      if (!param || !param.time) return;
      const c = param.seriesData.get(candleSeries);
      if (!c) return;
      const t = typeof param.time === 'number' ? new Date(param.time*1000) : null;
      const ts = t ? t.toISOString().slice(0,16).replace('T',' ') : '';
      ohlc.textContent = `${ts}  O:${fmt(c.open,2)}  H:${fmt(c.high,2)}  L:${fmt(c.low,2)}  C:${fmt(c.close,2)}`;
    }catch(e){}
  });

  // --- Indicators selection
  const applyIndicators = (candlesOverride=null)=>{
    // remove old series
    const rm = (s)=>{ if (s){ try{ chart.removeSeries(s);}catch{} } return null; };
    maSeries = rm(maSeries);
    emaSeries = rm(emaSeries);
    bbMidSeries = rm(bbMidSeries);
    bbUpSeries = rm(bbUpSeries);
    bbDnSeries = rm(bbDnSeries);

    // hide sub-panels by default
    if (rsiEl) rsiEl.style.display='none';
    if (macdEl) macdEl.style.display='none';

    const v = indSel.value || 'none';
    localStorage.setItem('chartIND', v);
    const s = getChartSettings();

    const needSMA = v.includes('sma');
    const needEMA = v.includes('ema');
    const needBB  = v.includes('bb');
    const needRSI = v.includes('rsi');
    const needMACD = v.includes('macd');

    if (needSMA) maSeries = chart.addLineSeries({ lineWidth: 2 });
    if (needEMA) emaSeries = chart.addLineSeries({ lineWidth: 2 });
    if (needBB){
      bbMidSeries = chart.addLineSeries({ lineWidth: 1 });
      bbUpSeries  = chart.addLineSeries({ lineWidth: 1 });
      bbDnSeries  = chart.addLineSeries({ lineWidth: 1 });
    }

    if (needRSI){ ensureRSI(); if (rsiEl) rsiEl.style.display='block'; }
    if (needMACD){ ensureMACD(); if (macdEl) macdEl.style.display='block'; }

    const candles = candlesOverride || lastCandles;
    if (candles && candles.length){
      if (maSeries) maSeries.setData(calcSMA(candles, s.sma));
      if (emaSeries) emaSeries.setData(calcEMA(candles, s.ema));
      if (needBB){
        const bb = calcBB(candles, s.bbPeriod, s.bbDev);
        bbMidSeries.setData(bb.mid);
        bbUpSeries.setData(bb.up);
        bbDnSeries.setData(bb.dn);
      }
      if (needRSI && rsiSeries) rsiSeries.setData(calcRSI(candles, s.rsi));
      if (needMACD && macdSeries && macdSignalSeries && macdHistSeries){
        const m = calcMACD(candles, s.macdFast, s.macdSlow, s.macdSignal);
        macdSeries.setData(m.macd);
        macdSignalSeries.setData(m.signal);
        macdHistSeries.setData(m.hist);
      }
    }
    resizeOverlay();
  };
  indSel.addEventListener('change', ()=>{ applyIndicators(); });
  applyIndicators();

  // --- Data loading
  let lastAppliedCandleSig = '';
  const applyChartCandles = (candles, opts={})=>{
    const normalized = Array.isArray(candles) ? candles : [];
    if(!normalized.length) return;
    const sig = candleSeriesSignature(normalized);
    const fromCache = !!opts.fromCache;
    lastCandles = normalized;
    if(sig !== lastAppliedCandleSig){
      lastAppliedCandleSig = sig;
      try{ candleSeries.setData(normalized); }catch(e){}
      try{ applyIndicators(normalized); }catch(e){}
      try{ chart.applyOptions({ timeScale: { barSpacing: Math.max(4, Math.min(10, Math.floor((mainEl.clientWidth || 900) / Math.max(70, normalized.length / (fromCache ? 1.25 : 1.5))))) } }); }catch(e){}
      try{ chart.timeScale().fitContent(); }catch(e){}
      try{ redrawOverlay(); }catch(e){}
    }
    try{
      const last = normalized[normalized.length - 1] || null;
      const px = Number(last?.close || last?.open || 0);
      if(px > 0) updateVisiblePriceIndicator(px, 'chart');
    }catch(e){}
  };
  const load = async()=>{
    const seq = ++loadSeq;
    const tfUi = tfSel.value;
    const tf = tfToBinance(tfUi);
    const stepSec = tfToSeconds(tfUi);
    const limit = candleRequestLimit(tfUi);
    localStorage.setItem('chartTF', tfUi);
    const cached = candleCacheGet(tfUi);
    if(cached && cached.length){
      livePriceGuard = Date.now();
      applyChartCandles(cached, { fromCache:true });
    }
    try{
      const path = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&market=${encodeURIComponent(market)}&tf=${encodeURIComponent(tf)}&limit=${encodeURIComponent(limit)}`;
      const fetcher = chartAssetType === 'crypto'
        ? apiGetCached(path, 500, { timeoutMs: market === 'perp' ? 8500 : 6500 })
        : apiGetCachedStale(path, (chartAssetType === 'stocks' || chartAssetType === 'arab' || chartAssetType === 'futures') ? 3600 : 2400, { timeoutMs: (chartAssetType === 'stocks' || chartAssetType === 'arab' || chartAssetType === 'futures') ? 11000 : (chartAssetType === 'commodities' ? 9500 : 8000) });
      const r = await fetcher;
      if (destroyed || seq !== loadSeq) return;
      let candles = normalizeCandles(r.items || []);
      candles = fillCandleGaps(candles, stepSec, chartAssetType === 'crypto' ? 4 : (chartAssetType === 'forex' ? 5 : 8));

      // fallback: keep chart alive even if upstream returns empty
      if(!candles.length){
        const q = (typeof vpCanonicalQuoteForUi === 'function') ? vpCanonicalQuoteForUi(symbol, chartAssetType, market, { maxAgeSec: chartAssetType === 'crypto' ? 10 : 20 }) : ((typeof QuoteCache!=='undefined' && QuoteCache.get) ? QuoteCache.get() : null);
        const base = safeNum(q?.price ?? q?.mark_price, 0) || safeNum(window.__lastPrice, 0) || 0;
        if(base>0){
          const nowSec = Math.floor(Date.now()/1000);
          const endBucket = bucketStart(nowSec, tfUi);
          const arr=[];
          const fallbackBars = Math.min(limit, 60);
          for(let i=fallbackBars-1;i>=0;i--){
            const t = endBucket - (i * stepSec);
            arr.push({time:t, open:base, high:base, low:base, close:base, volume:0});
          }
          candles = arr;
        }
      }
      if (destroyed || seq !== loadSeq) return;
      livePriceGuard = Date.now();
      candleCacheSet(tfUi, candles);
      applyChartCandles(candles, { fromCache:false });
    } catch(e) {
      if (destroyed || seq !== loadSeq) return;
      if(!(cached && cached.length)) host.appendChild(h('div',{class:'muted small', style:'padding:12px;'}, '❌ '+e.message));
    }
  };

  tfSel.addEventListener('change', ()=>{ load(); });

  load();
  startAlertsTimer();
  
    // --- Live update (smooth candles)
  let lastLiveChartUpdateAt = 0;
  const updateLastCandleWithPrice = (price)=>{
    if (!lastCandles || !lastCandles.length) return;
    if (!Number.isFinite(price) || !(price>0)) return;
    const nowMs = Date.now();
    const minGapMs = chartAssetType === 'crypto' ? 260 : ((chartAssetType === 'forex') ? 520 : 900);
    if ((nowMs - lastLiveChartUpdateAt) < minGapMs) {
      updateVisiblePriceIndicator(price, 'live');
      return;
    }
    lastLiveChartUpdateAt = nowMs;

    const tfUi = tfSel.value || '15m';
    const nowSec = Math.floor(nowMs/1000);
    const currentBucket = bucketStart(nowSec, tfUi);
    if (!(currentBucket > 0)) return;

    const last = lastCandles[lastCandles.length - 1];
    if (!last || !Number.isFinite(last.time)) return;

    // بعد تغيير الفريم نمنع أي tick قديم من تشويه أول رندر
    if ((Date.now() - livePriceGuard) < 350) return;

    let updated;
    if (currentBucket > Number(last.time || 0)) {
      updated = {
        time: currentBucket,
        open: Number(last.close ?? price),
        high: Math.max(Number(last.close ?? price), price),
        low: Math.min(Number(last.close ?? price), price),
        close: price,
        volume: 0,
      };
      lastCandles.push(updated);
      if (lastCandles.length > 400) lastCandles = lastCandles.slice(-400);
    } else if (currentBucket === Number(last.time || 0)) {
      updated = {
        time: last.time,
        open: Number(last.open ?? price),
        high: Math.max(Number(last.high ?? price), price),
        low:  Math.min(Number(last.low ?? price),  price),
        close: price,
        volume: Number(last.volume ?? 0),
      };
      lastCandles[lastCandles.length - 1] = updated;
    } else {
      return;
    }

    try { candleSeries.update(updated); } catch(e) {}
    try { applyIndicators(lastCandles); } catch(e) {}
    try { updateVisiblePriceIndicator(price, 'live'); } catch(e) {}
  };

  // Live price updates via QuoteCache (single poller for the whole app)
  let lastOverlayRedrawAt = 0;
  QuoteCache.setActive(symbol, type, market);
  const unsubQuote = QuoteCache.subscribe((q)=>{
    const px = Number(q?.mark_price ?? q?.price ?? q?.last ?? 0);
    if(px>0){
      updateVisiblePriceIndicator(px, q?.source || 'live');
      updateLastCandleWithPrice(px);
      try{ const now = Date.now(); if((now - lastOverlayRedrawAt) >= 180){ lastOverlayRedrawAt = now; redrawOverlay(); } }catch(e){}
      try{ if(typeof window.vpSyncTradeDrawerActiveRow === 'function') window.vpSyncTradeDrawerActiveRow(Object.assign({}, q || {}, { symbol, type, market })); }catch(e){}
    }
  });
  onCleanup(()=>{ try{ unsubQuote(); }catch(e){} });

// Resize
  let chartResizeTimer = null;
  const lastGoodChartSize = { width: 0, height: 380, rsiWidth: 0, macdWidth: 0 };
  const applyChartSize = (force=false)=>{
    try{
      const width = Math.floor(mainEl.clientWidth || 0);
      const height = Math.max(300, Math.floor(mainEl.clientHeight || 380));
      const safeWidth = width >= 180 ? width : (force ? Math.max(180, lastGoodChartSize.width || 0) : 0);
      const safeHeight = height >= 220 ? height : (force ? Math.max(300, lastGoodChartSize.height || 380) : 0);
      if(safeWidth >= 180 && safeHeight >= 220){
        lastGoodChartSize.width = safeWidth;
        lastGoodChartSize.height = safeHeight;
        chart.applyOptions({ width: safeWidth, height: safeHeight });
      }
      const rsiWidth = Math.floor(rsiEl.clientWidth || safeWidth || 0);
      if (rsiChart && rsiWidth >= 160) {
        lastGoodChartSize.rsiWidth = rsiWidth;
        rsiChart.applyOptions({ width: rsiWidth, height: 140 });
      } else if (rsiChart && force && lastGoodChartSize.rsiWidth >= 160) {
        rsiChart.applyOptions({ width: lastGoodChartSize.rsiWidth, height: 140 });
      }
      const macdWidth = Math.floor(macdEl.clientWidth || safeWidth || 0);
      if (macdChart && macdWidth >= 160) {
        lastGoodChartSize.macdWidth = macdWidth;
        macdChart.applyOptions({ width: macdWidth, height: 140 });
      } else if (macdChart && force && lastGoodChartSize.macdWidth >= 160) {
        macdChart.applyOptions({ width: lastGoodChartSize.macdWidth, height: 140 });
      }
      if((safeWidth >= 180 && safeHeight >= 220) || force){ resizeOverlay(); }
    }catch(e){}
  };
  const scheduleChartResize = (force=false, delay=0)=>{
    try{ if(chartResizeTimer) clearTimeout(chartResizeTimer); }catch(e){}
    chartResizeTimer = setTimeout(()=>{ chartResizeTimer = null; applyChartSize(force); }, Math.max(0, Number(delay||0)));
  };
  const ro = new ResizeObserver(()=>{ scheduleChartResize(false, 24); });
  ro.observe(mainEl);
  ro.observe(host);

  // Telegram/iOS WebView sometimes renders this route while hidden (width=0),
  // or resizes while browser chrome is moving. Keep last good size and restore smoothly.
  const kickResize = (force=true)=>{ applyChartSize(force); };
  const viewportResizeHandler = ()=>scheduleChartResize(true, 36);
  const viewportScrollHandler = ()=>scheduleChartResize(true, 48);
  const orientationResizeHandler = ()=>scheduleChartResize(true, 80);
  try{ window.addEventListener('resize', viewportResizeHandler, {passive:true}); }catch(e){}
  try{ window.addEventListener('orientationchange', orientationResizeHandler, {passive:true}); }catch(e){}
  try{ if(window.visualViewport){ window.visualViewport.addEventListener('resize', viewportResizeHandler, {passive:true}); } }catch(e){}
  const chartVisibleHandler = ()=>{ if(!document.hidden) scheduleChartResize(true, 40); };
  try{ document.addEventListener('visibilitychange', chartVisibleHandler, {passive:true}); }catch(e){}
  try{ requestAnimationFrame(()=>kickResize(true)); }catch(e){ kickResize(true); }
  try{ setTimeout(()=>kickResize(true), 60); }catch(e){}
  try{ setTimeout(()=>kickResize(true), 220); }catch(e){}
  try{ setTimeout(()=>kickResize(true), 600); }catch(e){}
  try{ setTimeout(()=>kickResize(true), 1100); }catch(e){}

  // initial overlay size
  setTimeout(()=>resizeOverlay(), 0);

  // Cleanup hook (prevents duplicate timers/observers)
window.__tp_chart_cleanup = ()=>{
  try{ destroyed = true; }catch(e){}
  try{ if (alertsTimer) clearInterval(alertsTimer); }catch(e){}
  try{ alertsTimer = null; }catch(e){}
  try{ if (liveTimer) clearInterval(liveTimer); }catch(e){}
  try{ liveTimer = null; }catch(e){}
  try{ if(chartResizeTimer) clearTimeout(chartResizeTimer); }catch(e){}
  try{ ro.disconnect(); }catch(e){}
  try{ window.removeEventListener('resize', viewportResizeHandler); }catch(e){}
  try{ window.removeEventListener('orientationchange', orientationResizeHandler); }catch(e){}
  try{ if(window.visualViewport){ window.visualViewport.removeEventListener('resize', viewportResizeHandler); } }catch(e){}
  try{ document.removeEventListener('visibilitychange', chartVisibleHandler); }catch(e){}
};

  // Ensure cleanup runs on route change too
  onCleanup(()=>{ try{ window.__tp_chart_cleanup && window.__tp_chart_cleanup(); }catch(e){} });

  return box;
}


function perpInfoBox(symbol){
  const box = h('div',{class:'card'});
  box.appendChild(h('div',{class:'h2 mb-2'}, state.t('trade.perp_metrics')));
  const row = h('div',{class:'row', style:'gap:10px;flex-wrap:wrap'},
    h('span',{class:'pill'}, `${state.t('trade.mark')}: —`),
    h('span',{class:'pill'}, `${state.t('trade.index')}: —`),
    h('span',{class:'pill'}, `${state.t('trade.funding')}: —`)
  );
  box.appendChild(row);
  const foot = h('div',{class:'muted small mt-2'}, state.t('trade.perp_metrics_hint'));
  box.appendChild(foot);

  (async()=>{
    try{
      const r = await api(`/perp/quote.php?symbol=${encodeURIComponent(symbol)}`);
      const m = r.item || r;
      const mark = (m.mark_price!=null) ? m.mark_price : null;
      const idx  = (m.index_price!=null) ? m.index_price : null;
      const fr   = (m.funding_rate!=null) ? (Number(m.funding_rate)*100) : null;
      row.innerHTML='';
      row.appendChild(h('span',{class:'pill'}, `${state.t('trade.mark')}: ${mark?('$'+fmt(mark, (mark<1?6:2))):'—'}`));
      row.appendChild(h('span',{class:'pill'}, `${state.t('trade.index')}: ${idx?('$'+fmt(idx, (idx<1?6:2))):'—'}`));
      row.appendChild(h('span',{class:'pill'}, `${state.t('trade.funding')}: ${fr!=null?fmt(fr,4)+'%':'—'}`));
    } catch(e){}
  })();
  return box;
}

function orderbookMiniBox(symbol){
  const box = h('div',{class:'card'});
  box.appendChild(h('div',{class:'h2 mb-2'}, state.t('trade.orderbook')));
  const wrap = h('div',{class:'grid', style:'grid-template-columns:1fr 1fr;gap:10px;'});
  const bids = h('div',{}, h('div',{class:'muted small mb-1'}, state.t('trade.bids')));
  const asks = h('div',{}, h('div',{class:'muted small mb-1'}, state.t('trade.asks')));
  const bidTbl = h('table',{class:'table'});
  const askTbl = h('table',{class:'table'});
  bids.appendChild(bidTbl);
  asks.appendChild(askTbl);
  wrap.appendChild(bids);
  wrap.appendChild(asks);
  const spreadPill = h('span',{class:'pill'}, state.t('trade.spread')+': —');
  box.appendChild(h('div',{class:'row', style:'justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;'}, spreadPill,
    h('button',{class:'btn secondary', onclick:async()=>{ await load(); }}, state.t('trade.refresh'))
  ));
  box.appendChild(wrap);

  async function load(){
    try{
      const r = await api(`/perp/depth.php?symbol=${encodeURIComponent(symbol)}&limit=25`);
      const it = r.item || r;
      const b = (it.bids||[]).slice(0,10);
      const a = (it.asks||[]).slice(0,10);
      bidTbl.innerHTML=''; askTbl.innerHTML='';
      const bestBid = b[0] ? Number(b[0][0]) : null;
      const bestAsk = a[0] ? Number(a[0][0]) : null;
      if (bestBid!=null && bestAsk!=null) {
        const sp = bestAsk - bestBid;
        spreadPill.textContent = `${state.t('trade.spread')}: $${fmt(sp, sp<1?6:2)}`;
      }
      b.forEach(row=>{
        bidTbl.appendChild(h('tr',{}, h('td',{}, fmt(Number(row[0]), Number(row[0])<1?6:2)), h('td',{}, fmt(Number(row[1]), 4))));
      });
      a.forEach(row=>{
        askTbl.appendChild(h('tr',{}, h('td',{}, fmt(Number(row[0]), Number(row[0])<1?6:2)), h('td',{}, fmt(Number(row[1]), 4))));
      });
    }catch(e){
      spreadPill.textContent = state.t('trade.spread')+': —';
    }
  }
  load();
  const obInt = setInterval(load, 5000);
  onCleanup(()=>clearInterval(obInt));
  return box;
}


function isPreferredSignalLiveSource(source, symbol='', type=''){
  const src = String(source || '').trim().toLowerCase();
  const sym = String(symbol || '').trim().toUpperCase();
  const kind = String(type || '').trim().toLowerCase();
  if(!src) return false;
  const hardReject = ['seed','seed_fallback','chart_seed','seed_candle','yahoo_chart','aggs'];
  if(hardReject.includes(src)) return false;
  if((kind === 'commodities' || kind === 'futures') && /^X(?:AU|AG|PT|PD)USD$/.test(sym)){
    return ['provider_live','provider_fallback','massive','polygon','trade_stream','stream','eodhd','eodhd_rest','eodhd_intraday'].includes(src);
  }
  if(src === 'stale_cache') return !(kind === 'commodities' || kind === 'futures');
  return true;
}

async function enrichSignalsLiveQuotes(items, opts={}){
  const list = Array.isArray(items) ? items.map(item => (item && typeof item === 'object') ? {...item} : item) : [];
  if(!list.length) return list;
  const groups = new Map();
  list.forEach((sig, idx)=>{
    if(!sig || typeof sig !== 'object') return;
    const symbol = String(sig.symbol || sig.market_symbol || '').toUpperCase().trim();
    const type = normalizeSignalType(sig);
    if(!symbol) return;
    if(Number(sig.live_price || 0) > 0 && isPreferredSignalLiveSource(sig.live_source || sig.source || '', symbol, type)) return;
    if(!groups.has(type)) groups.set(type, []);
    groups.get(type).push({idx, symbol});
  });
  for(const [type, refs] of groups.entries()){
    const symbols = [...new Set(refs.map(ref => ref.symbol).filter(Boolean))];
    if(!symbols.length) continue;
    let quoteItems = [];
    try{
      const resp = await apiLiveQuotes((normalizeLiveAssetType(type)==='crypto' ? `/quotes.php?fresh=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(symbols.join(','))}` : `/quotes.php?type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(symbols.join(','))}`), type, normalizeLiveAssetType(type)==='crypto' ? 4500 : 4200);
      quoteItems = Array.isArray(resp?.items) ? resp.items : [];
    }catch(e){ quoteItems = []; }
    let quoteMap = new Map(quoteItems.map(item => [String(item?.symbol || '').toUpperCase(), item]));
    const missing = symbols.filter(symbol => {
      const live = quoteMap.get(symbol);
      return !(Number(live?.price || 0) > 0 && isPreferredSignalLiveSource(live?.source || live?.provider || '', symbol, type));
    });
    if(missing.length && type === 'crypto'){
      try{
        const fallback = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(missing.join(','))}&market=spot&_=${Date.now()}`, { timeoutMs: 4500 });
        const quotes = fallback?.quotes && typeof fallback.quotes === 'object' ? Object.values(fallback.quotes) : [];
        (Array.isArray(quotes) ? quotes : []).forEach(item=>{
          const sym = String(item?.symbol || '').toUpperCase();
          if(sym) quoteMap.set(sym, item);
        });
      }catch(e){}
    }
    refs.forEach(({idx, symbol})=>{
      const live = quoteMap.get(symbol);
      if(!(Number(live?.price || 0) > 0)) return;
      const source = String(live?.source || live?.provider || '').trim();
      if(!isPreferredSignalLiveSource(source, symbol, type)) return;
      list[idx].live_price = Number(live?.price || 0) || 0;
      list[idx].live_change_pct = Number(live?.change_pct ?? live?.changePct ?? 0) || 0;
      list[idx].live_source = source;
    });
  }
  return list;
}

async function fetchSignals(symbol, type, force=false){
  if(normalizeLiveAssetType(type || 'crypto') !== 'crypto') return [];
  const cacheKey = signalsCacheKey(symbol, type);
  const now = Date.now();
  const cached = __signalsResponseCache.get(cacheKey);
  if(!force && cached && Array.isArray(cached.items) && (now - Number(cached.at || 0)) < 20000){
    return cached.items;
  }
  try{
    const qs = new URLSearchParams();
    if (symbol) qs.set('symbol', String(symbol || '').toUpperCase());
    if (type) qs.set('type', String(type || '').toLowerCase());
    qs.set('lang', state.lang);
    const r = await api(`/signals.php?${qs.toString()}`, { timeoutMs: 5500 });
    const enriched = await enrichSignalsLiveQuotes(r.items || [], { timeoutMs: 4200 });
    __signalsResponseCache.set(cacheKey, { at: now, items: Array.isArray(enriched) ? enriched : [] });
    return Array.isArray(enriched) ? enriched : [];
  }catch(e){
    return cached && Array.isArray(cached.items) ? cached.items : [];
  }
}

try{ window.enrichSignalsLiveQuotes = enrichSignalsLiveQuotes; }catch(e){}
try{ window.isPreferredSignalLiveSource = isPreferredSignalLiveSource; }catch(e){}
try{ window.isTrustedUiLiveSource = isTrustedUiLiveSource; }catch(e){}
try{ window.getCanonicalQuoteMap = getCanonicalQuoteMap; }catch(e){}
try{ window.scheduleIdleTask = scheduleIdleTask; }catch(e){}

function isCryptoPerpSymbol(symbol, type, market='spot'){
  const sym = String(symbol || '').toUpperCase().trim();
  const raw = String(type || '').toLowerCase().trim();
  const mk = String(market || 'spot').toLowerCase().trim();
  if(!sym) return false;
  if(/(_F|1!)$/.test(sym)) return false;
  const looksBinance = /(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/.test(sym);
  if(raw === 'crypto') return looksBinance && mk === 'perp';
  if(raw === 'futures' || raw === 'perpetual' || raw === 'perp') return looksBinance;
  return false;
}

function resolveLiveMarketForSymbol(symbol, type, market='spot'){
  return isCryptoPerpSymbol(symbol, type, market) ? 'perp' : 'spot';
}

const __fetchQuoteInflight = new Map();
function __fetchQuoteCacheKey(symbol, type, market='spot'){
  return `${String(symbol || '').toUpperCase()}|${normalizeLiveAssetType(type || 'crypto')}|${String(market || 'spot').toLowerCase()}`;
}

const __fetchQuoteBgRefresh = new Map();
function vpBackgroundFreshQuote(symbol, type, market='spot', gapMs){
  const safeType = normalizeLiveAssetType(type || 'crypto');
  if(safeType === 'crypto' || vpIsDelayedQuoteType(safeType)) return;
  const safeMarket = resolveLiveMarketForSymbol(symbol, safeType, market || 'spot');
  const key = __fetchQuoteCacheKey(symbol, safeType, safeMarket) + '|bg';
  const now = Date.now();
  const minGap = Number(gapMs || (safeType === 'forex' ? 12000 : ((safeType === 'stocks' || safeType === 'arab') ? 12000 : (safeType === 'futures' ? 9000 : 8000)))) || 12000;
  const prev = __fetchQuoteBgRefresh.get(key);
  if(prev && (now - Number(prev.at || 0)) < minGap) return prev.promise || null;
  const freshPath = `/quotes.php?fresh=1&symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(safeType)}`;
  const timeoutMs = safeType === 'forex' ? 7000 : (['stocks','arab'].includes(safeType) ? 4200 : (safeType === 'futures' ? 5500 : (safeType === 'commodities' ? 5500 : 8000)));
  const promise = apiLiveQuotes(freshPath, safeType, timeoutMs).then(resp=>{
    const one = Array.isArray(resp?.items) ? resp.items[0] : null;
    if(one && resolveQuoteLivePrice(one, safeMarket, safeType) > 0){
      try{ vpRememberLiveQuote(one); }catch(e){}
      try{ if(window.VPTradeLiveQuoteStore && typeof window.VPTradeLiveQuoteStore.ingest === 'function'){ window.VPTradeLiveQuoteStore.ingest(one, {symbol, type:safeType, market:safeMarket}); } }catch(e){}
      return one;
    }
    return null;
  }).catch(()=>null).finally(()=>{
    const cur = __fetchQuoteBgRefresh.get(key);
    if(cur && cur.promise === promise) __fetchQuoteBgRefresh.set(key, {at: Date.now(), value: cur.value || null});
  });
  __fetchQuoteBgRefresh.set(key, {at: now, promise, value: prev?.value || null});
  return promise;
}

function vpExtractQuoteItem(resp, symbol=''){
  const items = Array.isArray(resp?.items) ? resp.items : [];
  if(!items.length) return null;
  const target = String(symbol || '').toUpperCase().trim();
  if(!target) return items[0] || null;
  return items.find(item=>String(item?.symbol || '').toUpperCase() === target) || items[0] || null;
}

function vpFocusQuoteFreshnessSec(type='crypto'){
  const norm = normalizeLiveAssetType(type || 'crypto');
  if(vpIsDelayedQuoteType(norm)) return 1800;
  if(norm === 'forex') return 6;
  if(norm === 'commodities') return 5;
  if(norm === 'futures') return 7;
  return 12;
}

function vpFocusQuoteRefreshGapMs(type='crypto'){
  const norm = normalizeLiveAssetType(type || 'crypto');
  if(vpIsDelayedQuoteType(norm)) return 30000;
  if(norm === 'forex') return 4200;
  if(norm === 'commodities') return 5200;
  if(norm === 'futures') return 6200;
  return 8000;
}

function vpFocusQuoteReadTimeoutMs(type='crypto'){
  const norm = normalizeLiveAssetType(type || 'crypto');
  if(vpIsDelayedQuoteType(norm)) return 3200;
  if(norm === 'forex') return 2400;
  if(norm === 'commodities') return 2800;
  if(norm === 'futures') return 3200;
  return 2600;
}

function vpFocusQuoteDirectTimeoutMs(type='crypto'){
  const norm = normalizeLiveAssetType(type || 'crypto');
  if(vpIsDelayedQuoteType(norm)) return 7200;
  if(norm === 'forex') return 5200;
  if(norm === 'commodities') return 6200;
  if(norm === 'futures') return 6500;
  return 5800;
}

async function vpFetchNonCryptoFocusQuote(symbol, type, market='spot', opts={}){
  const liveType = normalizeLiveAssetType(type || 'crypto');
  if(liveType === 'crypto') return null;
  const safeSymbol = String(symbol || '').toUpperCase().trim();
  const safeMarket = resolveLiveMarketForSymbol(safeSymbol, liveType, market || 'spot');
  const cachedQuotePath = `/quotes.php?symbol=${encodeURIComponent(safeSymbol)}&type=${encodeURIComponent(liveType)}`;
  const directQuotePath = vpIsDelayedQuoteType(liveType)
    ? cachedQuotePath
    : `/quotes.php?direct=1&strict_live=1&symbol=${encodeURIComponent(safeSymbol)}&type=${encodeURIComponent(liveType)}`;
  const maxAgeSec = Number(opts.maxAgeSec || vpFocusQuoteFreshnessSec(liveType));
  const backgroundGapMs = Number(opts.backgroundGapMs || vpFocusQuoteRefreshGapMs(liveType));
  const readTimeoutMs = Number(opts.timeoutMs || vpFocusQuoteReadTimeoutMs(liveType));
  const directTimeoutMs = Number(opts.directTimeoutMs || vpFocusQuoteDirectTimeoutMs(liveType));
  let cachedCandidate = null;
  let remembered = null;

  try{
    remembered = vpResolveFreshQuoteCacheQuote(safeSymbol, liveType, safeMarket);
    if(remembered && resolveQuoteLivePrice(remembered, safeMarket, liveType) > 0){
      const rememberedSrc = String(remembered?.source || remembered?.provider || '').trim().toLowerCase();
      const rememberedTs = vpTradeQuoteTsSec(remembered?.updated_at || remembered?.ts || remembered?.time || 0);
      const rememberedAge = rememberedTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - rememberedTs) : 999999;
      if(isTrustedUiLiveSource(rememberedSrc, safeSymbol, liveType) && (vpIsDelayedQuoteType(liveType) || rememberedAge <= maxAgeSec)){
        return remembered;
      }
    }
  }catch(e){}

  try{
    const cachedResp = await apiLiveQuotes(cachedQuotePath, liveType, readTimeoutMs);
    const cachedOne = vpExtractQuoteItem(cachedResp, safeSymbol);
    const cachedPx = safeNum(resolveQuoteLivePrice(cachedOne, safeMarket, liveType), 0);
    const cachedSrc = String(cachedOne?.source || cachedOne?.provider || '').trim().toLowerCase();
    const cachedTs = vpTradeQuoteTsSec(cachedOne?.updated_at || cachedOne?.ts || cachedOne?.time || 0);
    const cachedAge = cachedTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - cachedTs) : 999999;
    if(cachedOne && cachedPx > 0 && isTrustedUiLiveSource(cachedSrc, safeSymbol, liveType)){
      cachedCandidate = cachedOne;
      if(!vpIsDelayedQuoteType(liveType) && cachedAge > maxAgeSec && !opts.skipBackground){
        try{
          if(vpCanIssueFetchQuoteFresh(`${safeSymbol}:${liveType}:${safeMarket}:focus-bg`, backgroundGapMs)){
            vpBackgroundFreshQuote(safeSymbol, liveType, safeMarket, backgroundGapMs);
          }
        }catch(e){}
      }
      if(!opts.requireFresh || vpIsDelayedQuoteType(liveType) || cachedAge <= maxAgeSec){
        return cachedOne;
      }
    }
  }catch(e){}

  if(remembered && resolveQuoteLivePrice(remembered, safeMarket, liveType) > 0){
    return remembered;
  }
  if(opts.allowDirect === false) return cachedCandidate || null;

  const directGateMs = Number(opts.directGapMs || Math.max(2200, Math.floor(backgroundGapMs * 0.8)));
  if(!vpCanIssueFetchQuoteFresh(`${safeSymbol}:${liveType}:${safeMarket}:focus-direct`, directGateMs)){
    return cachedCandidate || remembered || null;
  }

  try{
    const directResp = await apiLiveQuotes(directQuotePath, liveType, directTimeoutMs);
    const directOne = vpExtractQuoteItem(directResp, safeSymbol);
    const directPx = safeNum(resolveQuoteLivePrice(directOne, safeMarket, liveType), 0);
    const directSrc = String(directOne?.source || directOne?.provider || '').trim().toLowerCase();
    const directTs = vpTradeQuoteTsSec(directOne?.updated_at || directOne?.ts || directOne?.time || 0);
    const directAge = directTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - directTs) : 999999;
    if(directOne && directPx > 0 && isTrustedUiLiveSource(directSrc, safeSymbol, liveType) && (vpIsDelayedQuoteType(liveType) || directAge <= maxAgeSec)){
      return directOne;
    }
  }catch(e){}

  return cachedCandidate || remembered || null;
}

async function fetchQuote(symbol, type, market='spot'){
  const safeType = String(type || '').toLowerCase();
  const safeMarket = String(market || 'spot').toLowerCase();
  const resolvedMarket = resolveLiveMarketForSymbol(symbol, safeType, safeMarket === 'perp' ? 'perp' : safeMarket);
  const inflightKey = __fetchQuoteCacheKey(symbol, safeType || type || 'crypto', resolvedMarket);
  const inflightNow = Date.now();
  const inflightHit = __fetchQuoteInflight.get(inflightKey);
  if(inflightHit?.value && (inflightNow - safeNum(inflightHit.ts, 0)) < (normalizeLiveAssetType(safeType || type || 'crypto') === 'crypto' ? 500 : 900)) return inflightHit.value;
  if(inflightHit?.promise && (inflightNow - safeNum(inflightHit.ts, 0)) < (normalizeLiveAssetType(safeType || type || 'crypto') === 'crypto' ? 900 : 1800)) return inflightHit.promise;
  try{
    const canonicalType = normalizeLiveAssetType(safeType || type || 'crypto');
    const canonicalDirect = wantsDirectLiveQuote(canonicalType, resolvedMarket, symbol);
    const canonical = (typeof vpCanonicalQuoteForUi === 'function')
      ? vpCanonicalQuoteForUi(symbol, safeType || type || 'crypto', resolvedMarket, { maxAgeSec: canonicalType === 'crypto' ? 6 : (vpIsDelayedQuoteType(canonicalType) ? 1800 : 28) })
      : null;
    if(!canonicalDirect && canonical && resolveQuoteLivePrice(canonical, resolvedMarket, safeType || type || canonical.type || 'crypto') > 0 && isTrustedUiLiveSource(canonical.source || canonical.provider || '', symbol, safeType || type || canonical.type || 'crypto')){
      const canonicalType = normalizeLiveAssetType(safeType || type || canonical.type || 'crypto');
      const canonicalTs = vpTradeQuoteTsSec(canonical.updated_at || canonical.ts || canonical.time || 0);
      const canonicalAge = Math.max(0, Math.floor(Date.now()/1000) - canonicalTs);
      if(canonicalType === 'crypto' || canonicalAge <= (vpIsDelayedQuoteType(canonicalType) ? 1800 : 8)){
        __fetchQuoteInflight.set(inflightKey, { ts: inflightNow, value: canonical });
        return canonical;
      }
    }
  }catch(e){}
  const run = (async()=>{
    const wantPerp = resolvedMarket === 'perp';
    const liveType = normalizeLiveAssetType(type||safeType||'crypto');
    const cachedQuotePath = `/quotes.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type||'')}`;
    const freshQuotePath = `/quotes.php?fresh=1&symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type||'')}`;
    if(liveType !== 'crypto'){
      try{
        const focusQuote = await vpFetchNonCryptoFocusQuote(symbol, liveType, resolvedMarket, {
          allowDirect: true,
          maxAgeSec: vpFocusQuoteFreshnessSec(liveType),
          backgroundGapMs: vpFocusQuoteRefreshGapMs(liveType)
        });
        if(focusQuote && resolveQuoteLivePrice(focusQuote, resolvedMarket, type || focusQuote?.type || liveType) > 0) return focusQuote;
      }catch(e){}
      try{
        const remembered = vpResolveFreshQuoteCacheQuote(symbol, liveType, resolvedMarket);
        const remPx = safeNum(resolveQuoteLivePrice(remembered, resolvedMarket, liveType), 0);
        if(remembered && remPx > 0) return remembered;
      }catch(e){}
      return null;
    }
  if(normalizeLiveAssetType(type||'crypto') === 'crypto'){
    try{
      const r = await api(`/trade/stream.php?lite=1&symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type||'')}&market=${encodeURIComponent(resolvedMarket)}&_=${Date.now()}`);
      const q = r?.quote || (r?.quotes && r.quotes[symbol]) || null;
      if(q && resolveQuoteLivePrice(q, resolvedMarket, type || q?.type || 'crypto') > 0) return q;
    }catch(e){}
  }
  if(wantPerp && (safeType === 'crypto' || safeType === 'futures' || safeType === 'perpetual' || safeType === 'perp')){
    try{
      const q = await api(`/perp/quote.php?symbol=${encodeURIComponent(symbol)}&asset_type=crypto&_=${Date.now()}`);
      if(q && resolveQuoteLivePrice(q, 'perp', type || q?.type || 'crypto') > 0) return Object.assign({}, q, {symbol: String(q.symbol || symbol).toUpperCase(), type: (safeType === 'futures' || safeType === 'perpetual' || safeType === 'perp') ? 'futures' : (q.type || type || 'crypto')});
    }catch(e){}
  }
    return null;
  })();
  const storedPromise = run.then(result=>{
    __fetchQuoteInflight.set(inflightKey, { ts: Date.now(), value: result || null });
    return result || null;
  }).finally(()=>{
    const cur = __fetchQuoteInflight.get(inflightKey);
    if(cur && cur.promise === storedPromise) __fetchQuoteInflight.delete(inflightKey);
  });
  __fetchQuoteInflight.set(inflightKey, { ts: inflightNow, value: inflightHit?.value || null, promise: storedPromise });
  return storedPromise;
}

const __fetchQuoteFreshGate = new Map();
function vpCanIssueFetchQuoteFresh(key, gapMs=30000){
  const now = Date.now();
  const prev = Number(__fetchQuoteFreshGate.get(key) || 0) || 0;
  if(prev > 0 && (now - prev) < gapMs) return false;
  __fetchQuoteFreshGate.set(key, now);
  return true;
}

const __signalLiveQuoteCache = new Map();
const __signalsResponseCache = new Map();

function signalsCacheKey(symbol, type){
  return `${String(state.lang||'en')}:${String(type||'').toLowerCase()}:${String(symbol||'').toUpperCase()}`;
}

function normalizeSignalType(sig){
  const raw = String(sig?.type || sig?.market_type || '').toLowerCase().trim();
  const symbol = String(sig?.symbol || sig?.market_symbol || '').toUpperCase().trim();
  if(symbol){
    if(/(_F|1!)$/.test(symbol)) return 'futures';
    if(/^(XAU|XAG|XPT|XPD|USOIL|UKOIL|BRENT|WTI|NGAS|COPPER)/.test(symbol)) return 'commodities';
    if(/(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/.test(symbol)) return 'crypto';
    if(/^[A-Z]{6}$/.test(symbol) && !/(USDT|USDC|BUSD|FDUSD)$/.test(symbol)) return 'forex';
    if(/^\d{4}$/.test(symbol) || /^(TADAWUL|DFM|ADX)/.test(symbol)) return 'arab';
  }
  if(raw === 'fx') return 'forex';
  if(['crypto','forex','stocks','commodities','indices','futures','arab'].includes(raw)) return raw;
  if(/^[A-Z]{1,5}(?:\.[A-Z])?$/.test(symbol)) return 'stocks';
  return 'crypto';
}

function tradingViewSymbolForSignal(sig){
  const symbol = String(sig?.symbol || sig?.market_symbol || '').toUpperCase().replace(/[^A-Z0-9_!:.\/-]/g, '');
  const type = normalizeSignalType(sig);
  const map = {
    'XAUUSD':'TVC:GOLD',
    'XAGUSD':'TVC:SILVER',
    'USOIL':'TVC:USOIL',
    'UKOIL':'TVC:UKOIL',
    'SPX500':'FOREXCOM:SPXUSD',
    'NAS100':'FOREXCOM:NSXUSD',
    'US30':'FOREXCOM:DJI',
    'GER40':'FOREXCOM:DE40',
    'BTCUSD':'BITSTAMP:BTCUSD',
    'ETHUSD':'BITSTAMP:ETHUSD',
    'YM_F':'CBOT_MINI:YM1!',
    'NQ_F':'CME_MINI:NQ1!',
    'ES_F':'CME_MINI:ES1!',
    'CL_F':'NYMEX:CL1!',
    'GC_F':'COMEX:GC1!'
  };
  if(map[symbol]) return map[symbol];
  if(type === 'crypto' || /(USDT|USDC|BUSD|BTC|ETH)$/i.test(symbol)) return `BINANCE:${symbol.replace(/\//g,'')}`;
  if(type === 'forex') return `FX_IDC:${symbol.replace(/\//g,'')}`;
  if(type === 'stocks') return (/^[A-Z]+$/.test(symbol.replace(/\//g,'')) ? `NASDAQ:${symbol.replace(/\//g,'')}` : `NYSE:${symbol.replace(/\//g,'')}`);
  if(type === 'commodities') return map[symbol] || `TVC:${symbol.replace(/\//g,'')}`;
  if(type === 'indices') return map[symbol] || `FOREXCOM:${symbol.replace(/\//g,'')}`;
  if(type === 'futures') return map[symbol] || symbol;
  return symbol || 'BINANCE:BTCUSDT';
}

async function fetchSignalLiveQuote(sig, force=false){
  const symbol = String(sig?.symbol || sig?.market_symbol || '').toUpperCase().trim();
  const type = normalizeSignalType(sig);
  const key = `${type}:${symbol}`;
  const cached = __signalLiveQuoteCache.get(key);
  const now = Date.now();
  const cacheTtl = normalizeLiveAssetType(type) === 'crypto' ? 1400 : 2200;
  if(!force && cached && (now - cached.at) < cacheTtl) return cached.data;
  const marketMode = String(sig?.market || sig?.market_type_mode || 'spot').toLowerCase();
  let price = 0;
  let changePct = 0;
  let source = '';
  let updatedAt = 0;
  try{
    const canonical = (typeof vpCanonicalQuoteForUi === 'function')
      ? vpCanonicalQuoteForUi(symbol, type, resolveLiveMarketForSymbol(symbol, type, marketMode || 'spot'), { maxAgeSec: type === 'crypto' ? 6 : 10 })
      : null;
    if(canonical && Number(canonical?.price || canonical?.last || canonical?.mark_price || 0) > 0){
      price = Number(canonical?.price || canonical?.last || canonical?.mark_price || 0) || 0;
      changePct = Number(canonical?.change_pct ?? canonical?.changePct ?? 0) || 0;
      source = String(canonical?.source || canonical?.provider || '').trim();
      updatedAt = Number(canonical?.updated_at || canonical?.ts || canonical?.time || 0) || 0;
    }
  }catch(e){}
  try{
    if(!(price > 0)){
      const resp = await apiLiveQuotes((normalizeLiveAssetType(type) === 'crypto'
        ? `/quotes.php?fresh=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(symbol)}`
        : `/quotes.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}`), type, ['arab'].includes(normalizeLiveAssetType(type)) ? 4200 : (normalizeLiveAssetType(type) === 'commodities' ? 3600 : 3600));
      const one = Array.isArray(resp?.items) ? resp.items.find(item => String(item?.symbol || '').toUpperCase() === symbol) : null;
      if(one && Number(one?.price || 0) > 0 && (type === 'crypto' || isPreferredSignalLiveSource(one?.source || one?.provider || '', symbol, type))){
        price = Number(one?.price || 0) || 0;
        changePct = Number(one?.change_pct || one?.changePct || 0) || 0;
        source = String(one?.source || one?.provider || '').trim();
        updatedAt = Number(one?.updated_at || one?.ts || one?.time || 0) || 0;
      }
    }
  }catch(e){}
  if(!(price > 0) && type === 'crypto'){
    try{
      const resolvedMarket = resolveLiveMarketForSymbol(symbol, type, marketMode || 'spot');
      const fallback = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(symbol)}&market=${encodeURIComponent(resolvedMarket)}&_=${Date.now()}`, { timeoutMs: 4500 });
      const quotes = fallback?.quotes && typeof fallback.quotes === 'object' ? Object.values(fallback.quotes) : [];
      const one = Array.isArray(quotes) ? quotes.find(item => String(item?.symbol || '').toUpperCase() === symbol) : null;
      if(one && Number(one?.price || 0) > 0 && (type === 'crypto' || isPreferredSignalLiveSource(one?.source || one?.provider || '', symbol, type))){
        price = Number(one?.price || 0) || 0;
        changePct = Number(one?.change_pct || one?.changePct || 0) || 0;
        source = String(one?.source || one?.provider || '').trim();
        updatedAt = Number(one?.updated_at || one?.ts || one?.time || 0) || 0;
      }
    }catch(e){}
  }
  if(!(price > 0)){
    let q = null;
    try{ q = await fetchQuote(symbol, type, marketMode); }catch(e){ q = null; }
    const qPrice = Number(q?.price ?? q?.last ?? q?.mark ?? 0) || 0;
    const qSource = String(q?.source || q?.provider || '').trim();
    if(qPrice > 0 && (type === 'crypto' || isPreferredSignalLiveSource(qSource, symbol, type) || !qSource)){
      price = qPrice;
      changePct = Number(q?.change_pct ?? q?.changePercent ?? q?.change ?? 0) || changePct;
      source = qSource || source;
      updatedAt = Number(q?.updated_at || q?.ts || q?.time || 0) || updatedAt;
    }
  }
  if(!(price > 0)) {
    const seededLive = Number(sig?.live_price || 0) || 0;
    const seededSource = String(sig?.live_source || sig?.source || '').trim();
    if(seededLive > 0 && (type === 'crypto' || isPreferredSignalLiveSource(seededSource, symbol, type) || !seededSource)) {
      price = seededLive;
      source = seededSource;
      updatedAt = Number(sig?.live_updated_at || sig?.updated_at || 0) || updatedAt;
    }
  }
  if(!Number.isFinite(changePct)) changePct = 0;
  if(!source && Number(price || 0) > 0) source = String(sig?.live_source || sig?.source || '').trim();
  const data = { price, changePct, source, updatedAt };
  __signalLiveQuoteCache.set(key, {at: now, data});
  return data;
}

function mountSignalTradingViewWidget(host, sig){
  if(!host) return;
  const symbol = tradingViewSymbolForSignal(sig);
  host.innerHTML = '';
  host.classList.add('signal-tv-card');
  const shell = document.createElement('div');
  shell.className = 'tradingview-widget-container';
  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';
  shell.appendChild(widget);
  const config = {
    symbol,
    width: '100%',
    height: 228,
    locale: state.lang === 'ar' ? 'ar_AE' : (state.lang === 'ru' ? 'ru' : 'en'),
    dateRange: '1D',
    colorTheme: 'dark',
    isTransparent: true,
    autosize: true,
    largeChartUrl: '',
    chartOnly: false,
    noTimeScale: false,
  };
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
  script.text = JSON.stringify(config);
  shell.appendChild(script);
  host.appendChild(shell);
}

function buildSignalLivePanel(sig){
  const shell = h('div',{class:'signal-live-panel signal-live-panel-compact'});
  const widgetHost = h('div',{class:'signal-inline-widget-shell premium quote-only compact'});
  shell.appendChild(widgetHost);
  setTimeout(()=>{
    try{
      if(window.vpMountSignalMiniWidget) window.vpMountSignalMiniWidget(widgetHost, sig, {compact:false, dash:false});
      if(window.vpAttachSignalLiveCard) window.vpAttachSignalLiveCard(widgetHost, sig);
    }catch(e){}
  }, 30);
  return shell;
}

function signalFeedbackKey(sig){ return `vp_signal_feedback_${Number(sig?.id||0)}`; }
function signalFeedbackLoad(sig){
  try{
    const raw = localStorage.getItem(signalFeedbackKey(sig));
    const data = raw ? JSON.parse(raw) : null;
    if(data && Array.isArray(data.comments)) return data;
  }catch(e){}
  return {recommended:false,recommendCount:0,comments:[]};
}
function signalFeedbackSave(sig, data){
  try{ localStorage.setItem(signalFeedbackKey(sig), JSON.stringify(data)); }catch(e){}
}
function signalFeedbackTotals(sig){
  const baseRecommend = Math.max(0, Number(sig?.recommend_count || sig?.recommendCount || 0));
  const baseComments = Math.max(0, Number(sig?.comments_count || sig?.commentsCount || 0));
  const local = signalFeedbackLoad(sig);
  return {
    data: local,
    recommendCount: Math.max(0, baseRecommend + Number(local.recommended ? 1 : 0)),
    commentsCount: Math.max(0, baseComments + (Array.isArray(local.comments) ? local.comments.length : 0)),
  };
}
try{ window.signalFeedbackTotals = signalFeedbackTotals; }catch(e){}
function buildSignalCommunityPanel(sig){
  const seed = signalFeedbackTotals(sig);
  const data = seed.data;
  const commentsList = h('div',{class:'signal-community-comments'});
  const input = h('input',{class:'input', placeholder: tr('Add a quick comment','أضف تعليقًا سريعًا','Добавьте комментарий')});
  const recommendBtn = h('button',{class:'btn outline small', type:'button'}, '👍 ' + tr('Recommend','توصية','Рекомендовать'));
  const addBtn = h('button',{class:'btn outline small', type:'button'}, tr('Post','إرسال','Отправить'));
  const meta = h('div',{class:'signal-community-meta'});
  const render = ()=>{
    meta.innerHTML = '';
    const totals = signalFeedbackTotals(sig);
    meta.append(
      h('span',{class:'pill ghost'}, `${tr('Recommended','التوصيات','Рекомендации')}: ${Number(totals.recommendCount || 0)}`),
      h('span',{class:'pill ghost'}, `${tr('Comments','التعليقات','Комментарии')}: ${Number(totals.commentsCount || 0)}`)
    );
    recommendBtn.classList.toggle('is-active', !!data.recommended);
    commentsList.innerHTML = '';
    if(!data.comments.length){
      commentsList.appendChild(h('div',{class:'muted small'}, tr('No comments yet','لا توجد تعليقات بعد','Комментариев пока нет')));
      return;
    }
    data.comments.slice(-3).reverse().forEach(item=>{
      commentsList.appendChild(h('div',{class:'signal-community-item'},
        h('div',{class:'signal-community-text'}, String(item.text || '')),
        h('div',{class:'signal-community-time'}, String(item.ts || ''))
      ));
    });
  };
  recommendBtn.onclick = ()=>{
    data.recommended = !data.recommended;
    signalFeedbackSave(sig, data);
    render();
  };
  addBtn.onclick = ()=>{
    const txt = String(input.value || '').trim();
    if(!txt) return;
    data.comments.push({text:txt, ts:new Date().toLocaleString(state.lang === 'ar' ? 'ar-EG' : (state.lang === 'ru' ? 'ru-RU' : 'en-US'))});
    input.value='';
    signalFeedbackSave(sig, data);
    render();
  };
  render();
  return h('div',{class:'signal-community-box'},
    h('div',{class:'signal-community-head'}, h('div',{class:'signal-community-title'}, tr('Recommend & comments','التوصيات والتعليقات','Рекомендации и комментарии')), meta),
    h('div',{class:'signal-community-actions'}, recommendBtn),
    commentsList,
    h('div',{class:'signal-community-compose'}, input, addBtn)
  );
}

function tradingBotDetailBody(sig, opts={}){
  const showLive = opts.showLive !== false;
  const fmtExpiry = (ts)=>{
    const n = Number(ts || 0);
    if(!(n > 0)) return tr('No expiry','بدون انتهاء','Без срока');
    try{ return new Date(n * 1000).toLocaleString(state.lang === 'ar' ? 'ar-EG' : (state.lang === 'ru' ? 'ru-RU' : 'en-US')); }catch(e){ return String(n); }
  };
  const fmtPx = (v)=> Number.isFinite(Number(v)) ? `$${fmt(Number(v), Number(v) < 1 ? 6 : 4)}` : '—';
  const direction = String(sig?.direction || 'BUY').toUpperCase();
  const directionTone = direction === 'SELL' ? 'bad' : 'ok';
  const noteText = String(sig?.bot_brief || sig?.note || '').trim();
  return h('div',{class:'trade-signal-detail signal-detail-shell'},
    showLive ? buildSignalLivePanel(sig) : null,
    h('div',{class:'signal-pill-row'},
      h('span',{class:`pill ${directionTone}`}, direction),
      h('span',{class:'pill'}, `${tr('Min','الحد الأدنى','Минимум')}: $${fmt(Number(sig.copy_min_amount || 0), 2)}`),
      h('span',{class:'pill ghost'}, `${tr('Share','نسبة المشاركة','Доля')}: ${fmt(Number(sig.copy_profit_share_pct || 0), 2)}%`),
      h('span',{class:'pill ghost'}, `${tr('Lock','مدة الحجز','Срок блокировки')}: ${Math.max(0, Number(sig.copy_lock_days || 0))}d`)
    ),
    h('div',{class:'trade-signal-grid signal-stat-grid'},
      h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, state.t('trade.entry')), h('span',{class:'v'}, fmtPx(sig.entry))),
      h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'SL'), h('span',{class:'v'}, fmtPx(sig.sl))),
      h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'TP1'), h('span',{class:'v'}, fmtPx(sig.tp1))),
      h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'TP2'), h('span',{class:'v'}, fmtPx(sig.tp2)))
    ),
    noteText ? h('div',{class:'trade-signal-note signal-note-box'}, noteText) : null,
    buildSignalCommunityPanel(sig),
    h('div',{class:'signal-validity muted small'}, `${tr('Same admin entry will be used when you copy this trade.','سيتم استخدام نفس نقطة دخول الإدارة عند نسخ هذه الصفقة.','При копировании будет использована та же точка входа администратора.')} ${tr('Valid until','صالح حتى','Действителен до')}: ${fmtExpiry(sig.valid_until)}`)
  );
}

function openTradingBotDetails(sig){
  openDialog({
    title: String(sig.bot_name || sig.symbol || tr('Trading bot','روبوت التداول','Trading bot')),
    dialogClass:'dialog signal-dialog signal-dialog-details',
    bodyClass:'dialog-body signal-dialog-body',
    actionsClass:'dialog-actions signal-dialog-actions',
    body: tradingBotDetailBody(sig, {showLive:false}),
    actions:[
      {label: tr('Close','إغلاق','Закрыть'), class:'btn outline', onClick:()=>closeDialog()},
      {label: tr('Copy trade','نسخ الصفقة','Копировать сделку'), class:'btn primary', onClick:()=>{ closeDialog(); openTradingBotCopyDialog(sig); }}
    ]
  });
}


function openTradingBotCopyDialog(sig){
  if(!requireRealWorkflowAccess('copy')) return;
  const minAmount = Math.max(1, Number(sig.copy_min_amount || 0) || 100);
  const amountInput = h('input',{class:'input', type:'number', min:String(minAmount), step:'0.01', value:String(Math.max(minAmount, 100))});
  const walletBadge = h('div',{class:'signal-copy-wallet-lock'},
    h('span',{class:'pill'}, tr('Wallet','المحفظة','Кошелёк')),
    h('span',{class:'pill ghost'}, tr('Real / Live account only','الحساب الحقيقي فقط','Только real / live счёт'))
  );
  const heroNote = h('div',{class:'signal-copy-lead muted small'}, tr('This flow copies the admin trade into your real account. Your amount is reserved first, then the platform opens the real position using the admin entry / SL / TP profile.','هذا المسار ينسخ صفقة الأدمن إلى حسابك الحقيقي. يتم حجز المبلغ أولًا ثم تفتح المنصة الصفقة الحقيقية باستخدام نفس الدخول ووقف الخسارة والأهداف المحددة من الإدارة.','Этот сценарий копирует сделку администратора на ваш реальный счёт. Сумма сначала резервируется, затем платформа открывает реальную позицию с тем же входом / SL / TP от администратора.'));
  const copyForm = h('div',{class:'signal-copy-form-card'},
    h('div',{class:'signal-copy-form-head'},
      h('div',{class:'signal-copy-form-title'}, tr('Copy this trade','انسخ هذه الصفقة','Скопировать эту сделку')),
      h('div',{class:'signal-copy-form-sub'}, tr('Choose the real amount, then confirm the copy flow.','اختر مبلغ النسخ الحقيقي ثم أكد العملية.','Выберите реальную сумму и подтвердите копирование.'))
    ),
    h('div',{class:'signal-copy-grid signal-copy-grid-single'},
      h('div',{class:'signal-copy-field'}, h('label',{}, tr('Amount','المبلغ','Сумма')), amountInput),
      h('div',{class:'signal-copy-field signal-copy-wallet-field'}, h('label',{}, tr('Destination','الوجهة','Назначение')), walletBadge)
    ),
    h('div',{class:'signal-pill-row compact'},
      h('span',{class:'pill'}, `${tr('Min','الحد الأدنى','Минимум')}: $${fmt(minAmount, 2)}`),
      h('span',{class:'pill ghost'}, `${tr('Share','نسبة المشاركة','Доля')}: ${fmt(Number(sig.copy_profit_share_pct || 0), 2)}%`),
      h('span',{class:'pill ghost'}, `${tr('Lock','مدة الحجز','Срок блокировки')}: ${Math.max(0, Number(sig.copy_lock_days || 0))}d`)
    )
  );
  const body = h('div',{class:'signal-copy-sheet'},
    heroNote,
    copyForm,
    tradingBotDetailBody(sig, {showLive:false})
  );
  openDialog({
    title: String(sig.bot_name || sig.symbol || tr('Trading bot','روبوت التداول','Trading bot')),
    dialogClass:'dialog signal-dialog signal-dialog-copy mobile-sheet',
    bodyClass:'dialog-body signal-dialog-body',
    actionsClass:'dialog-actions signal-dialog-actions',
    body,
    onOpen:()=>{
      if((window.innerWidth || 0) > 768){
        try{ amountInput.focus(); amountInput.select && amountInput.select(); }catch(e){}
      }
    },
    actions:[
      {label: tr('Cancel','إلغاء','Отмена'), class:'btn outline', onClick:()=>closeDialog()},
      {label: tr('Copy to real account','نسخ إلى الحقيقي','Копировать в real'), class:'btn primary', onClick:async()=>{
        const amount = Number(amountInput.value || 0);
        const mode = 'real';
        if(!(amount > 0)) return toast(tr('Enter a valid amount','أدخل مبلغًا صحيحًا','Введите корректную сумму'));
        try{
          const resp = await api('/trading_bot/copy.php', {method:'POST', body:{signal_id: Number(sig.id||0), amount, mode}});
          await Promise.allSettled([refreshPortfolio(true), refreshRealPortfolio(true), refreshWalletSummary(true)]);
          closeDialog();
          toast('✅ ' + (resp && resp.armed ? tr('Signal armed successfully in your real account','تم تجهيز الإشارة بنجاح على الحساب الحقيقي','Сигнал успешно вооружен на real счёте') : tr('Real trade copied successfully','تم نسخ الصفقة على الحساب الحقيقي بنجاح','Сделка успешно скопирована на real счёт')));
          try{ render(true); }catch(e){}
        }catch(err){
          toast(`❌ ${err.message || 'copy_failed'}`);
        }
      }}
    ]
  });
}


async function openMarketPicker(onPick){
  const backdrop = h('div',{class:'modal-backdrop'});
  const modal = h('div',{class:'modal'});
  const head = h('div',{class:'modal-header'},
    h('div',{class:'modal-title'}, state.t('trade.open_market_list')),
    h('button',{class:'btn', onclick:()=>backdrop.remove()}, '✕')
  );
  const search = h('input',{class:'input', placeholder: state.t('trade.search_market')});
  const tabRow = h('div',{class:'row mt-2'});
  const types = [
    ['crypto', state.t('markets.crypto')],
    ['forex', state.t('markets.fx')],
    ['stocks', state.t('markets.stocks')],
    ['commodities', state.t('markets.commodities')],
  ];
  let active = 'crypto';

  let all = null;
  async function loadAll(){
    // with_quotes=1 => best-effort live refresh (server-side guarded + cached)
    const r = await apiGetCached('/markets.php?type=all&grouped=1', 3500);
    all = r.groups || r; // server returns {groups:{...}}
  }

  const body = h('div',{class:'modal-body'});
  function renderList(){
    body.innerHTML='';
    const term = (search.value||'').trim().toUpperCase();
    const list = (all && (all[active] || all.groups?.[active] || [])) || [];
    const filtered = list.filter(x=>!term || x.symbol.includes(term) || (x.name||'').toUpperCase().includes(term));
    if(!filtered.length){
      body.appendChild(h('div',{class:'muted small'}, state.t('common.no_results')));
      return;
    }
    filtered.slice(0,120).forEach(x=>{
      const ch = Number(x.change_pct||0);
      const chCls = ch>0?'up':(ch<0?'down':'');
      body.appendChild(h('div',{class:'market-row', onclick:()=>{ onPick(x); backdrop.remove(); }},
        h('div',{class:'market-meta'},
          h('div',{class:'row', style:'gap:8px;align-items:center;'},
            h('div',{class:'market-sym'}, x.symbol),
            (x.signal_count>0 ? h('span',{class:'pill ok', style:'font-size:11px;padding:2px 8px;'}, `${x.signal_count} ${state.t('trade.signals')}`) : null)
          ),
          h('div',{class:'market-name'}, x.name||'')
        ),
        h('div',{style:'text-align:end'},
          h('div',{class:'market-price'}, x.price? `$${fmt(x.price, x.price<1?6:2)}` : '—'),
          h('div',{class:`market-change ${chCls}`}, (x.change_pct!=null ? `${ch>0?'+':''}${fmt(ch,2)}%` : ''))
        )
      ));
    });
  }

  types.forEach(([k,label])=>{
    const b = h('button',{class:'btn'+(active===k?' primary':''), onclick:()=>{ active=k; [...tabRow.children].forEach(c=>c.classList.remove('primary')); b.classList.add('primary'); renderList(); }}, label);
    tabRow.appendChild(b);
  });

  search.addEventListener('input', ()=>renderList());

  modal.appendChild(head);
  modal.appendChild(h('div',{style:'padding:0 14px 10px'}, tabRow, h('div',{class:'mt-2'}, search)));
  modal.appendChild(body);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  await loadAll();
  renderList();
}

function uuid(){
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'id_' + Math.random().toString(16).slice(2) + Date.now();
}

// Normalize common backend English error strings into stable error codes
// so they can be translated via i18n (err.* keys).
function normalizeApiErrCode(input){
  const s = String(input||'').trim();
  if(!s) return '';
  if(/^[a-z0-9_]+$/i.test(s)) return s;
  const x0 = s.toLowerCase();

  // Prefix patterns
  if(x0.startsWith('price unavailable')) return 'price_unavailable';
  if(x0.startsWith('invalid amount')) return 'invalid_amount';

  // Normalize spaces/punctuation
  const x = x0.replace(/\s+/g,' ').replace(/[.]+$/g,'').trim();

  const map = {
    'unauthorized': 'unauthorized',
    'forbidden': 'forbidden',
    'method not allowed': 'method_not_allowed',
    'missing': 'missing',
    'bad signature': 'bad_signature',
    'replay detected': 'replay_detected',
    'stale initdata': 'stale_initdata',

    'invalid request': 'invalid_request',
    'invalid order': 'invalid_order',
    'invalid side': 'invalid_side',
    'invalid type': 'invalid_type',

    'payment method required': 'payment_method_required',
    'payment method not available': 'payment_method_not_available',
    'currency not supported for this method': 'currency_not_supported',

    'amount below minimum': 'amount_below_minimum',
    'amount above maximum': 'amount_above_maximum',

    'missing address': 'missing_address',
    'missing fields': 'missing_fields',
    'missing initdata': 'missing_initdata',

    'limit price required': 'limit_price_required',
    'limit not reached (demo rule)': 'limit_not_reached',

    'trading disabled': 'trade_disabled',
    'kyc required': 'kyc_required',
    'payment_scope_locked': 'payment_scope_locked',
    'demo_mode_locked': 'demo_mode_locked',
    'user not found': 'user_not_found',
    'plan not found': 'plan_not_found',
  };

  return map[x] || '';
}

const __apiInflight = new Map();
async function api(path, opts={}){
  const isForm = !!opts.isFormData;
  const method = String(opts.method||'GET').toUpperCase();
  const headers = Object.assign(isForm ? {} : {'Content-Type':'application/json'}, opts.headers||{});
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const body = opts.body ? (isForm ? opts.body : JSON.stringify(opts.body)) : undefined;
  const canonicalPath = vpCanonicalizeLiveApiPath(path);
  const dedupeEligible = method === 'GET' && !body && !isForm && (/\/quotes\.php(\?|$)|\/trade\/candles\.php(\?|$)|\/markets\.php(\?|$)|\/market_snapshot\.php(\?|$)|\/trade\/stream\.php\?lite=1/.test(canonicalPath));
  const inflightKey = dedupeEligible ? `${method}:${canonicalPath}` : '';
  if(dedupeEligible){
    const hit = __apiInflight.get(inflightKey);
    if(hit && hit.promise && (Date.now() - Number(hit.ts || 0)) < 300) return hit.promise;
  }

  const controller = new AbortController();
  const t = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, opts.timeoutMs || 15000);

  const runner = (async()=>{
    let res, text;
    try{
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal,
        cache: 'no-store',
      });
      text = await res.text();
    }catch(e){
      clearTimeout(t);
      throw new Error(e?.name==='AbortError' ? state.t('common.request_timeout') : (e?.message || state.t('common.network_error')));
    }finally{
      clearTimeout(t);
    }

  let json;
  try{ json = JSON.parse(text); }
  catch{
    json = {ok:false, error: text || `HTTP ${res.status}`};
  }

  if(!res.ok || json.ok===false){
    // Show status + backend msg (helps you debug 500)
	  const msg = json.error || json.message || text || `HTTP ${res.status}`;
	  // Localize common backend error codes (deposit_disabled, withdraw_disabled, etc.)
	  let friendly = `${msg}`;
	  try{
	    let code = String(json.error || '').trim() || String(msg || '').trim();
	    const norm = (/^[a-z0-9_]+$/i.test(code)) ? code : normalizeApiErrCode(code);
	    if(norm && /^[a-z0-9_]+$/i.test(norm) && typeof state?.t === 'function'){
	      const key = 'err.' + norm;
	      const tr = state.t(key);
	      if(tr && tr !== key) friendly = tr;
	    }
	  }catch(e){}
	  throw new Error(friendly.slice(0, 600));
  }

  // Auto-sync balances/portfolio after successful mutations
  try{ window.tpSync?.afterApi?.(path, opts, json); }catch(e){}

  return json;
  })();

  if(dedupeEligible) __apiInflight.set(inflightKey, { ts: Date.now(), promise: runner });
  try{
    return await runner;
  }finally{
    if(dedupeEligible){
      const cur = __apiInflight.get(inflightKey);
      if(cur && cur.promise === runner) __apiInflight.delete(inflightKey);
    }
  }
}



// Stable device id (stored in localStorage). Helps server prevent multi-account referral abuse on the same phone.
function tpDeviceId(){
  try{
    let id = localStorage.getItem('tp_device_id') || '';
    if(!id){
      const c = (window.crypto || window.msCrypto);
      if(c && c.getRandomValues){
        const a = new Uint8Array(16);
        c.getRandomValues(a);
        id = Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
      }else{
        id = String(Date.now()) + '_' + Math.random().toString(16).slice(2);
      }
      localStorage.setItem('tp_device_id', id);
    }
    // keep it compact
    return String(id).slice(0,64);
  }catch(e){
    return '';
  }
}

async function ensureAuth(){
  // Web-first auth: session-based account login.
  try{
    const me = await api('/auth/me.php');
    state.me = me.user;
    state.token = '';
    try{ localStorage.removeItem('tp_token'); }catch(e){}
    if (me.token) {
      state.token = me.token;
      localStorage.setItem('tp_token', me.token);
    }
    return;
  }catch(e){
    state.me = null;
  }

  // Backward compatibility: if opened inside Telegram and the server still allows it,
  // fall back to the original verification flow.
  if (isTg()) {
    const initData = tg()?.initData || '';
    const sp = (tg()?.initDataUnsafe && tg().initDataUnsafe.start_param)
      ? String(tg().initDataUnsafe.start_param || '')
      : '';
    const payload = { initData, lang: state.lang, start_param: sp, device_id: tpDeviceId() };
    const r = await api('/verify.php', {method:'POST', body: payload});
    state.me = r.user;
    state.leverageCaps = r.leverage || state.leverageCaps || {max_global:100, max_user:0, max_effective:100};
    if (r.token) {
      state.token = r.token;
      localStorage.setItem('tp_token', r.token);
    }
    return;
  }

  const next = encodeURIComponent(window.location.pathname + (window.location.hash || '#/home'));
  window.location.replace('/login.php?next=' + next);
  throw new Error('Authentication required');
}

function closeDialog(){
  document.querySelectorAll('.dialog-backdrop').forEach(el=>el.remove());
  try{ document.body.classList.remove('vp-dialog-open'); document.documentElement.classList.remove('vp-dialog-open'); }catch(e){}
}

function dialogCloseGlyph(){
  return h('svg', {viewBox:'0 0 24 24', width:'18', height:'18', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true'},
    h('path',{d:'M6 6l12 12'}),
    h('path',{d:'M18 6L6 18'})
  );
}

function openDialog({title, body, actions, dialogClass='', bodyClass='', actionsClass='', onOpen}){
  closeDialog();
  const dialogClassName = String(dialogClass || '').trim();
  const backdropClasses = ['dialog-backdrop'];
  if(dialogClassName.includes('vp-gate-dialog')) backdropClasses.push('vp-dialog-backdrop--centered');
  const bd = h('div', {class:backdropClasses.join(' '), onclick:(e)=>{ if(e.target===bd) closeDialog(); }});
  const dialog = h('div', {class:`dialog ${dialogClassName}`.trim()});
  const closeBtn = h('button', {class:'dialog-close-btn', type:'button', onclick:closeDialog, 'aria-label': tr('Close dialog','إغلاق النافذة','Закрыть окно')});
  closeBtn.appendChild(dialogCloseGlyph());
  const head = h('div', {class:'dialog-head'},
    h('div', {class:'dialog-title'}, title || ''),
    closeBtn
  );
  const b = h('div', {class:`dialog-body ${bodyClass || ''}`.trim()});
  if (Array.isArray(body)) body.forEach(x=>b.appendChild(x));
  else if (body) b.appendChild(body);
  const acts = h('div', {class:`dialog-actions ${actionsClass || ''}`.trim()});
  (actions||[]).forEach(a=>acts.appendChild(h('button', {class:a.class||'btn', type:'button', onclick:async()=>{ try{ await a.onClick?.(); } catch(e){ toast('❌ '+e.message);} }}, a.label)));
  dialog.appendChild(head);
  dialog.appendChild(b);
  if ((actions||[]).length) dialog.appendChild(acts);
  bd.appendChild(dialog);
  document.body.appendChild(bd);
  try{ document.body.classList.add('vp-dialog-open'); document.documentElement.classList.add('vp-dialog-open'); }catch(e){}
  try{ onOpen && onOpen({dialog, body:b, backdrop:bd}); }catch(e){}
  return {close: closeDialog, body: b, dialog, backdrop: bd};
}

let __portfolioInflight = null;
let __portfolioAt = 0;
function __resolveRefreshArgs(forceOrOptions=false, modeMaybe='demo'){
  let force = false;
  let mode = 'demo';
  if(forceOrOptions && typeof forceOrOptions === 'object'){
    force = !!forceOrOptions.force;
    mode = String(forceOrOptions.mode || modeMaybe || 'demo').toLowerCase();
  }else{
    force = !!forceOrOptions;
    mode = String(modeMaybe || 'demo').toLowerCase();
  }
  mode = (mode === 'real') ? 'real' : 'demo';
  return { force, mode };
}
async function refreshPortfolio(forceOrOptions=false, modeMaybe='demo'){
  const { force, mode } = __resolveRefreshArgs(forceOrOptions, modeMaybe);
  if(mode === 'real') return refreshRealPortfolio(force);
  const now = Date.now();
  if(!force && state.portfolio && (now-__portfolioAt) < 3500) return state.portfolio;
  if(__portfolioInflight) return __portfolioInflight;
  __portfolioInflight = apiGetCached(`/trade/portfolio.php?mode=demo`, 1200)
    .then(r=>{
      state.portfolio = r;
      // attach account_mode to nested arrays so UI can filter correctly
      if (r && r.mode) {
        if (Array.isArray(r.positions)) r.positions = r.positions.map(p => ({ ...p, account_mode: r.mode }));
        if (Array.isArray(r.orders))   r.orders   = r.orders.map(o => ({ ...o, account_mode: r.mode }));
      }
      __portfolioAt = Date.now();
      return r;
    })
    .finally(()=>{ __portfolioInflight = null; });
  return __portfolioInflight;
}

// REAL portfolio for dashboard (never tied to state.tradeMode)
let __realPortfolioInflight = null;
let __realPortfolioAt = 0;
async function refreshRealPortfolio(force=false){
  const now = Date.now();
  if(!force && state.realPortfolio && (now-__realPortfolioAt) < 3500) return state.realPortfolio;
  if(__realPortfolioInflight) return __realPortfolioInflight;
  __realPortfolioInflight = apiGetCachedStale(`/trade/portfolio.php?mode=real`, force ? 1200 : 10000, { timeoutMs: 4200 })
    .then(r=>{
      state.realPortfolio = r;
      if (r && r.mode) {
        if (Array.isArray(r.positions)) r.positions = r.positions.map(p => ({ ...p, account_mode: r.mode }));
        if (Array.isArray(r.orders))   r.orders   = r.orders.map(o => ({ ...o, account_mode: r.mode }));
      }
      __realPortfolioAt = Date.now();
      return r;
    })
    .finally(()=>{ __realPortfolioInflight = null; });
  return __realPortfolioInflight;
}

let __pnlInflight = null;
let __pnlAt = 0;
let __realPnlInflight = null;
let __realPnlAt = 0;
async function refreshPnlStats(forceOrOptions=false, modeMaybe='demo'){
  const { force, mode } = __resolveRefreshArgs(forceOrOptions, modeMaybe);
  if(mode === 'real') return refreshRealPnlStats(force);
  const now = Date.now();
  if(!force && state.pnlStats && (now-__pnlAt) < 9000) return state.pnlStats;
  if(__pnlInflight) return __pnlInflight;
  try{
    __pnlInflight = apiGetCachedStale(`/trade/pnl.php?mode=demo`, force ? 1200 : 9000, { timeoutMs: 3800 })
      .then(r=>{
        state.pnlStats = (r && r.ok) ? r : null;
        __pnlAt = Date.now();
        return state.pnlStats;
      })
      .catch(()=>{
        state.pnlStats = null;
        return null;
      })
      .finally(()=>{ __pnlInflight = null; });
    return __pnlInflight;
  }catch(e){
    state.pnlStats = null;
    __pnlInflight = null;
    return null;
  }
}

async function refreshRealPnlStats(force=false){
  const now = Date.now();
  if(!force && state.realPnlStats && (now-__realPnlAt) < 9000) return state.realPnlStats;
  if(__realPnlInflight) return __realPnlInflight;
  try{
    __realPnlInflight = apiGetCachedStale(`/trade/pnl.php?mode=real`, force ? 1200 : 9000, { timeoutMs: 3800 })
      .then(r=>{
        state.realPnlStats = (r && r.ok) ? r : null;
        __realPnlAt = Date.now();
        return state.realPnlStats;
      })
      .catch(()=>{
        state.realPnlStats = null;
        return null;
      })
      .finally(()=>{ __realPnlInflight = null; });
    return __realPnlInflight;
  }catch(e){
    state.realPnlStats = null;
    __realPnlInflight = null;
    return null;
  }
}

let __walletInflight = null;
let __walletAt = 0;
async function refreshWalletSummary(force=false){
  const now = Date.now();
  if(!force && state.walletSummary && (now-__walletAt) < 4000) return state.walletSummary;
  if(__walletInflight) return __walletInflight;
  __walletInflight = apiGetCached('/wallet/summary.php', 1200)
    .then(r=>{
      state.walletSummary = r;
      __walletAt = Date.now();
      return r;
    })
    .finally(()=>{ __walletInflight = null; });
  return __walletInflight;
}

async function refreshLedger(page=1){
  const r = await api(`/wallet/ledger.php?page=${encodeURIComponent(page)}`);
  state.ledger = r;
  state.ledgerPage = page;
}

let __depositsInflight = null;
let __depositsAt = 0;
async function refreshDepositsList(force=false){
  const now = Date.now();
  if(!force && state.depositsList && (now-__depositsAt) < 6000) return state.depositsList;
  if(__depositsInflight) return __depositsInflight;
  __depositsInflight = apiGetCached('/deposits/list.php', force ? 0 : 2000)
    .then(r=>{
      state.depositsList = (r && r.ok) ? r : null;
      __depositsAt = Date.now();
      return state.depositsList;
    })
    .catch(()=>{ state.depositsList = null; return null; })
    .finally(()=>{ __depositsInflight = null; });
  return __depositsInflight;
}

let __withdrawalsInflight = null;
let __withdrawalsAt = 0;
async function refreshWithdrawalsList(force=false){
  const now = Date.now();
  if(!force && state.withdrawalsList && (now-__withdrawalsAt) < 6000) return state.withdrawalsList;
  if(__withdrawalsInflight) return __withdrawalsInflight;
  __withdrawalsInflight = apiGetCached('/withdrawals/list.php', force ? 0 : 2000)
    .then(r=>{
      state.withdrawalsList = (r && r.ok) ? r : null;
      __withdrawalsAt = Date.now();
      return state.withdrawalsList;
    })
    .catch(()=>{ state.withdrawalsList = null; return null; })
    .finally(()=>{ __withdrawalsInflight = null; });
  return __withdrawalsInflight;
}

let __onboardingInflight = null;
let __onboardingAt = 0;
async function refreshOnboardingStatus(force=false){
  const now = Date.now();
  if(!force && state.onboardingStatus && (now-__onboardingAt) < 8000) return state.onboardingStatus;
  if(__onboardingInflight) return __onboardingInflight;
  __onboardingInflight = apiGetCached('/onboarding/status.php', force ? 0 : 2500)
    .then(r=>{
      state.onboardingStatus = (r && r.ok) ? r : null;
      __onboardingAt = Date.now();
      return state.onboardingStatus;
    })
    .catch(()=>{ state.onboardingStatus = null; return null; })
    .finally(()=>{ __onboardingInflight = null; });
  return __onboardingInflight;
}

let __kycInflight = null;
let __kycAt = 0;
async function loadKycStatus(force=false){
  const now = Date.now();
  if(!force && state.kycStatus && (now-__kycAt) < 4000) return state.kycStatus;
  if(__kycInflight) return __kycInflight;
  __kycInflight = apiGetCachedStale('/kyc/status.php', force ? 1500 : 12000, { timeoutMs: 3200 })
    .then(r=>{
      state.kycStatus = (r && r.kyc) ? r.kyc : null;
      state.kycStatusLoaded = true;
      __kycAt = Date.now();
      return state.kycStatus;
    })
    .catch(e=>{ state.kycStatus = null; state.kycStatusLoaded = true; throw e; })
    .finally(()=>{ __kycInflight = null; });
  return __kycInflight;
}


let __countriesInflight = null;
let __countriesAt = 0;
async function loadCountriesList(force=false){
  const now = Date.now();
  if(!force && Array.isArray(state.countries) && state.countries.length && state.countriesLang===state.lang && (now-__countriesAt) < 6*60*60*1000){
    return state.countries;
  }
  if(__countriesInflight) return __countriesInflight;
  __countriesInflight = apiGetCached(`/geo/countries.php?lang=${encodeURIComponent(state.lang)}`, 24*60*60*1000)
    .then(r=>{
      state.countries = Array.isArray(r.items) ? r.items : [];
      state.countriesLang = state.lang;
      __countriesAt = Date.now();
      return state.countries;
    })
    .finally(()=>{ __countriesInflight = null; });
  return __countriesInflight;
}

function countrySelectEl(selected){
  selected = String(selected||'').toUpperCase();
  const sel = h('select',{class:'input', id:'countrySel'});
  sel.appendChild(h('option',{value:'', selected: !/^[A-Z]{2}$/.test(selected), disabled:true}, state.t('wallet.choose_country')));
  const items = Array.isArray(state.countries) ? state.countries : [];
  for(const it of items){
    const cc = String(it.code||it.cc||it.country||'').toUpperCase();
    const name = String(it.name||it.label||cc);
    if(!/^[A-Z]{2}$/.test(cc)) continue;
    sel.appendChild(h('option',{value:cc, selected: cc===selected}, name));
  }
  return sel;
}

async function loadPaymentMethods(kind='deposit', currency='USDT', scope='real'){
  const r = await api(`/payment_methods/list.php?kind=${encodeURIComponent(kind)}&currency=${encodeURIComponent(currency)}&scope=${encodeURIComponent(scope)}&lang=${encodeURIComponent(state.lang||'en')}`);
  try{
    if(Array.isArray(r?.categories)){
      state.__vpFundingCategories = state.__vpFundingCategories || {};
      state.__vpFundingCategories[String(kind||'deposit').toLowerCase()] = r.categories;
    }
  }catch(e){}
  return Array.isArray(r?.items) ? r.items : [];
}

function paymentFieldControl(field, preset={}){
  const type = String(field?.type || 'text').toLowerCase();
  const key = String(field?.key || '').trim();
  const label = String(field?.label || key || 'Field');
  const placeholder = String(field?.placeholder || '');
  const required = !!field?.required;
  let input;
  if (type === 'textarea') {
    input = h('textarea',{class:'input', placeholder, value: preset[key] || ''});
  } else if (type === 'select') {
    const opts = Array.isArray(field?.options) ? field.options : [];
    input = h('select',{class:'input'},
      h('option',{value:''}, placeholder || label),
      ...opts.map(opt=>{
        const v = (typeof opt === 'object') ? String(opt.value ?? opt.label ?? '') : String(opt);
        const t = (typeof opt === 'object') ? String(opt.label ?? opt.value ?? '') : String(opt);
        return h('option',{value:v, selected:String(preset[key]||'')===v}, t);
      })
    );
  } else {
    input = h('input',{class:'input', type:(type==='number'?'number':'text'), step:type==='number'?'0.01':undefined, placeholder, value: preset[key] || ''});
  }
  return {
    key,
    required,
    field,
    input,
    getValue: ()=> String(input?.value ?? '').trim(),
    wrap: h('div',{class:'form-group full'}, h('label',{}, label + (required ? ' *' : '')), input)
  };
}

function collectPaymentFieldValues(controls){
  const data = {};
  for (const c of controls) {
    if (!c.key) continue;
    const value = String(c.input?.value ?? '').trim();
    if (c.required && value === '') {
      throw new Error((c.field?.label || c.key) + ' is required');
    }
    if (value !== '') data[c.key] = value;
  }
  return data;
}

async function walletDepositFlow(){
  if(!requireRealWorkflowAccess('deposit')) return;
  try{
    location.hash = '#/wallet?tab=deposit';
    render();
    return true;
  }catch(_e){}
  const methods = await loadPaymentMethods('deposit', 'USDT', 'real');
  if (!methods.length) return toast(tr('No active deposit methods found in admin.','لا توجد وسائل إيداع مفعلة في لوحة الإدارة.','Нет активных методов пополнения в админ-панели.'));

  const amount = h('input',{class:'input', type:'number', step:'0.01', placeholder: state.t('wallet.enter_amount')});
  const methodSelect = h('select',{class:'input'}, ...methods.map((m,idx)=>h('option',{value:m.code, selected:idx===0}, `${m.title} (${m.currency})`)));
  const methodInfo = h('div',{class:'notice funding-method-card mt-2'}, '');
  const instructionsBox = h('div',{class:'funding-instructions muted small'}, '');
  const fieldsBox = h('div',{class:'grid', style:'grid-template-columns:1fr;gap:12px'});
  let activeMethod = methods[0];
  let controls = [];
  const preview = buildFundingPreview('deposit', amount, ()=>activeMethod, ()=>controls);

  const refreshMethodUI = ()=>{
    activeMethod = methods.find(m=>m.code===methodSelect.value) || methods[0];
    const minAmount = Number(activeMethod.min_amount || 0);
    const maxAmount = Number(activeMethod.max_amount || 0);
    const hasCap = maxAmount > 0;
    methodInfo.innerHTML = `
      <div class="funding-method-top">
        <strong>${activeMethod.title}</strong>
        <span class="status-pill neutral">${String(activeMethod.currency || 'USDT').toUpperCase()}</span>
      </div>
      <div class="muted small">${activeMethod.description || tr('Admin-managed method with guided review workflow.','وسيلة مُدارة من الإدارة مع مراجعة منظمة للطلب.','Метод под управлением администратора с контролируемой проверкой заявки.')}</div>
      <div class="funding-method-meta">${tr('Limits','الحدود','Лимиты')}: ${fmt(minAmount,2)} - ${hasCap ? fmt(maxAmount,2) : '∞'} ${String(activeMethod.currency || 'USDT').toUpperCase()}</div>
    `;
    instructionsBox.textContent = String(activeMethod.instructions || tr('After submission, the platform will show the exact next steps for this method.','بعد إرسال الطلب ستظهر لك الخطوات الدقيقة الخاصة بهذه الوسيلة.','После отправки платформа покажет точные следующие шаги для этого метода.'));
    fieldsBox.innerHTML = '';
    controls = [];
    (Array.isArray(activeMethod.fields) ? activeMethod.fields : []).forEach(f=>{
      const ctrl = paymentFieldControl(f);
      try{ ctrl.input?.addEventListener('input', ()=>preview.update()); }catch(e){}
      try{ ctrl.input?.addEventListener('change', ()=>preview.update()); }catch(e){}
      controls.push(ctrl);
      fieldsBox.appendChild(ctrl.wrap);
    });
  };
  methodSelect.addEventListener('change', ()=>{ refreshMethodUI(); preview.update(); });
  amount.addEventListener('input', ()=>preview.update());
  refreshMethodUI();

  openDialog({
    title: tr('Live account deposit','إيداع إلى الحساب الحقيقي','Пополнение реального счёта'),
    body: [
      fundingSteps('deposit'),
      h('div',{class:'notice'}, tr(
        'All deposits are sent to the live account only. Choose the method, enter the amount, then submit the request for review.',
        'جميع الإيداعات تُرسل إلى الحساب الحقيقي فقط. اختر الوسيلة، أدخل المبلغ، ثم أرسل الطلب للمراجعة.',
        'Все пополнения отправляются только на реальный счёт. Выберите метод, укажите сумму и отправьте заявку на проверку.'
      )),
      h('div',{class:'mini-stat-grid'},
        miniStatCard(tr('Account','الحساب','Счёт'), tr('Live / Primary','الحقيقي / الرئيسي','Реальный / основной')),
        miniStatCard(tr('Processing','المعالجة','Обработка'), tr('Admin review','مراجعة الإدارة','Проверка админом'))
      ),
      fundingChecklist('deposit'),
      preview.wrap,
      h('div',{class:'form-group full'}, h('label',{}, tr('Payment method','وسيلة الدفع','Метод оплаты')), methodSelect),
      methodInfo,
      h('div',{class:'form-group full'}, h('label',{}, tr('Amount (USDT)','المبلغ (USDT)','Сумма (USDT)')), amount),
      fieldsBox,
      instructionsBox
    ],
    actions:[
      {label: state.t('common.cancel'), class:'btn', onClick: closeDialog},
      {label: tr('Submit deposit request','إرسال طلب الإيداع','Отправить заявку на пополнение'), class:'btn primary', onClick: async()=>{
        const amt = Number(amount.value||0);
        if (!(amt > 0)) throw new Error(state.t('wallet.amount_invalid'));
        const details = collectPaymentFieldValues(controls);
        preview.update();
        const r = await api('/deposits/create.php', {
          method:'POST',
          headers:{'Idempotency-Key': (crypto?.randomUUID ? crypto.randomUUID() : ('dep_'+Date.now()))},
          body:{ provider: activeMethod.provider || 'manual', method: activeMethod.code, currency: activeMethod.currency || 'USDT', amount: amt, details }
        });
        closeDialog();
        tpSync.invalidate('deposit-created');
        openDialog({
          title: tr('Deposit request received','تم استلام طلب الإيداع','Заявка на пополнение получена'),
          body:[
            h('div',{class:'notice'}, `${tr('Request ID','رقم الطلب','Номер заявки')}: #${r.deposit?.id || ''}`),
            h('div',{class:'mini-stat-grid'},
              miniStatCard(tr('Method','الوسيلة','Метод'), String(activeMethod.title || activeMethod.code || '—')),
              miniStatCard(tr('Amount','المبلغ','Сумма'), `${fmt(amt,2)} ${String(activeMethod.currency || 'USDT').toUpperCase()}`)
            ),
            h('div',{class:'funding-instructions'}, r.instructions?.details || tr('Your request is now queued for review. Complete any method-specific instructions shown by the platform.','تم وضع الطلب في قائمة المراجعة. أكمل أي تعليمات إضافية تظهر لك من المنصة.','Ваша заявка поставлена в очередь на проверку. Выполните дополнительные инструкции, показанные платформой.'))
          ],
          actions:[{label: state.t('common.ok'), class:'btn primary', onClick: async()=>{ closeDialog(); await refreshDepositsList(); await refreshLedger(1); render(); }}]
        });
      }}
    ]
  });
}

async function walletWithdrawFlow(){
  if(!requireRealWorkflowAccess('withdraw')) return;
  const methods = await loadPaymentMethods('withdraw', 'USDT', 'real');
  if (!methods.length) return toast(tr('No active withdrawal methods found in admin.','لا توجد وسائل سحب مفعلة في لوحة الإدارة.','Нет активных методов вывода в админ-панели.'));

  const amount = h('input',{class:'input', type:'number', step:'0.01', placeholder: state.t('wallet.enter_amount')});
  const methodSelect = h('select',{class:'input'}, ...methods.map((m,idx)=>h('option',{value:m.code, selected:idx===0}, `${m.title} (${m.currency})`)));
  const methodInfo = h('div',{class:'notice funding-method-card mt-2'}, '');
  const instructionsBox = h('div',{class:'funding-instructions muted small'}, '');
  const fieldsBox = h('div',{class:'grid', style:'grid-template-columns:1fr;gap:12px'});
  let activeMethod = methods[0];
  let controls = [];
  const preview = buildFundingPreview('withdraw', amount, ()=>activeMethod, ()=>controls);

  const refreshMethodUI = ()=>{
    activeMethod = methods.find(m=>m.code===methodSelect.value) || methods[0];
    const minAmount = Number(activeMethod.min_amount || 0);
    const maxAmount = Number(activeMethod.max_amount || 0);
    const hasCap = maxAmount > 0;
    methodInfo.innerHTML = `
      <div class="funding-method-top">
        <strong>${activeMethod.title}</strong>
        <span class="status-pill neutral">${String(activeMethod.currency || 'USDT').toUpperCase()}</span>
      </div>
      <div class="muted small">${activeMethod.description || tr('Admin-managed payout route with manual review.','مسار سحب مُدار من الإدارة مع مراجعة يدوية.','Маршрут вывода под управлением администратора с ручной проверкой.')}</div>
      <div class="funding-method-meta">${tr('Limits','الحدود','Лимиты')}: ${fmt(minAmount,2)} - ${hasCap ? fmt(maxAmount,2) : '∞'} ${String(activeMethod.currency || 'USDT').toUpperCase()}</div>
    `;
    instructionsBox.textContent = String(activeMethod.instructions || tr('Enter the payout destination exactly as required for the selected method.','أدخل جهة الاستلام بدقة حسب متطلبات الوسيلة المختارة.','Введите реквизиты получения точно в соответствии с выбранным методом.'));
    fieldsBox.innerHTML = '';
    controls = [];
    (Array.isArray(activeMethod.fields) ? activeMethod.fields : []).forEach(f=>{
      const ctrl = paymentFieldControl(f);
      try{ ctrl.input?.addEventListener('input', ()=>preview.update()); }catch(e){}
      try{ ctrl.input?.addEventListener('change', ()=>preview.update()); }catch(e){}
      controls.push(ctrl);
      fieldsBox.appendChild(ctrl.wrap);
    });
  };
  methodSelect.addEventListener('change', ()=>{ refreshMethodUI(); preview.update(); });
  amount.addEventListener('input', ()=>preview.update());
  refreshMethodUI();

  openDialog({
    title: tr('Live account withdrawal','سحب من الحساب الحقيقي','Вывод с реального счёта'),
    body:[
      fundingSteps('withdraw'),
      h('div',{class:'notice'}, tr(
        'Withdrawal requests are reviewed by admin before release. Choose the payout method and complete the destination details carefully.',
        'طلبات السحب تُراجع من الإدارة قبل التنفيذ. اختر وسيلة الاستلام وأكمل بيانات الوجهة بدقة.',
        'Заявки на вывод проверяются администратором перед выполнением. Выберите метод получения и внимательно заполните реквизиты.'
      )),
      h('div',{class:'mini-stat-grid'},
        miniStatCard(tr('Account','الحساب','Счёт'), tr('Live / Primary','الحقيقي / الرئيسي','Реальный / основной')),
        miniStatCard(tr('Review','المراجعة','Проверка'), tr('Manual verification','تحقق يدوي','Ручная проверка'))
      ),
      fundingChecklist('withdraw'),
      preview.wrap,
      h('div',{class:'form-group full'}, h('label',{}, tr('Withdrawal method','طريقة السحب','Метод вывода')), methodSelect),
      methodInfo,
      h('div',{class:'form-group full'}, h('label',{}, tr('Amount (USDT)','المبلغ (USDT)','Сумма (USDT)')), amount),
      fieldsBox,
      instructionsBox
    ],
    actions:[
      {label: state.t('common.cancel'), class:'btn', onClick: closeDialog},
      {label: tr('Submit withdrawal request','إرسال طلب السحب','Отправить заявку на вывод'), class:'btn primary', onClick: async()=>{
        const amt = Number(amount.value||0);
        if (!(amt > 0)) throw new Error(state.t('wallet.amount_invalid'));
        const details = collectPaymentFieldValues(controls);
        const destination = String(details.destination || details.wallet_address || details.bank_account || Object.values(details)[0] || '').trim();
        if (!destination) throw new Error(tr('Payout details are required','بيانات الاستلام مطلوبة','Требуются реквизиты вывода'));
        const r = await api('/withdrawals/create.php', {
          method:'POST',
          headers:{'Idempotency-Key': (crypto?.randomUUID ? crypto.randomUUID() : ('wdr_'+Date.now()))},
          body:{ method: activeMethod.code, currency: activeMethod.currency || 'USDT', amount: amt, destination, details }
        });
        closeDialog();
        tpSync.invalidate('withdrawal-created');
        openDialog({
          title: tr('Withdrawal request submitted','تم إرسال طلب السحب','Заявка на вывод отправлена'),
          body:[
            h('div',{class:'notice'}, `${tr('Request ID','رقم الطلب','Номер заявки')}: #${r.withdrawal?.id || ''}`),
            h('div',{class:'mini-stat-grid'},
              miniStatCard(tr('Method','الوسيلة','Метод'), String(activeMethod.title || activeMethod.code || '—')),
              miniStatCard(tr('Amount','المبلغ','Сумма'), `${fmt(amt,2)} ${String(activeMethod.currency || 'USDT').toUpperCase()}`)
            ),
            h('div',{class:'funding-instructions'}, r.instructions?.details || tr('Your withdrawal is now pending review. Track the request status from the funding center.','طلب السحب الآن قيد المراجعة. تابع حالة الطلب من مركز التمويل.','Ваш вывод ожидает проверки. Отслеживайте статус заявки в центре финансирования.'))
          ],
          actions:[{label: state.t('common.ok'), class:'btn primary', onClick: async()=>{ closeDialog(); await refreshWithdrawalsList(); await refreshLedger(1); render(); }}]
        });
      }}
    ]
  });
}

// Note: no “demo → real” money transfer. Users can switch trading mode; real trading is feature-flagged.


const __vpLiveQuoteByKey = new Map();

const VP_UI_LIVE_QUOTES_STORAGE_KEY = 'vp_ui_live_quotes_v3';
let __vpPersistRememberedQuotesTimer = null;

function vpPersistRememberedQuotes(){
  try{
    const unique = new Map();
    for(const item of __vpLiveQuoteByKey.values()){
      if(!item || typeof item !== 'object') continue;
      const symbol = String(item.symbol || '').toUpperCase().trim();
      const type = normalizeLiveAssetType(item.type || 'crypto');
      const market = String(item.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
      const price = safeNum(resolveQuoteLivePrice(item, market, type) || item.price || item.last || item.mark_price, 0);
      const updatedAt = vpTradeQuoteTsSec(item.updated_at || item.ts || item.time || 0);
      if(!symbol || !(price > 0) || !(updatedAt > 0)) continue;
      const key = `${type}:${symbol}:${market}`;
      const prev = unique.get(key);
      if(!prev || vpTradeQuoteTsSec(prev.updated_at || 0) <= updatedAt){
        unique.set(key, {
          symbol,
          type,
          market,
          price,
          change_pct: safeNum(item.change_pct ?? item.changePct ?? 0, 0),
          updated_at: updatedAt,
          source: String(item.source || item.provider || '').toLowerCase(),
          mark_price: safeNum(item.mark_price ?? 0, 0),
          index_price: safeNum(item.index_price ?? 0, 0)
        });
      }
    }
    const items = [...unique.values()].sort((a,b)=> Number(b.updated_at||0) - Number(a.updated_at||0)).slice(0, 240);
    const payload = JSON.stringify({ ts: Date.now(), items });
    try{ sessionStorage.setItem(VP_UI_LIVE_QUOTES_STORAGE_KEY, payload); }catch(e){}
    try{ localStorage.setItem(VP_UI_LIVE_QUOTES_STORAGE_KEY, payload); }catch(e){}
  }catch(e){}
}

function vpSchedulePersistRememberedQuotes(){
  try{ if(__vpPersistRememberedQuotesTimer) return; }catch(e){}
  __vpPersistRememberedQuotesTimer = setTimeout(()=>{
    __vpPersistRememberedQuotesTimer = null;
    try{ vpPersistRememberedQuotes(); }catch(e){}
  }, 120);
}

function vpRestoreRememberedQuotes(){
  try{
    let raw = '';
    try{ raw = sessionStorage.getItem(VP_UI_LIVE_QUOTES_STORAGE_KEY) || ''; }catch(e){}
    if(!raw){ try{ raw = localStorage.getItem(VP_UI_LIVE_QUOTES_STORAGE_KEY) || ''; }catch(e){} }
    if(!raw) return;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if(!items.length) return;
    const nowSec = Math.floor(Date.now()/1000);
    items.forEach((item)=>{
      try{
        const symbol = String(item?.symbol || '').toUpperCase().trim();
        const type = normalizeLiveAssetType(item?.type || 'crypto');
        const market = String(item?.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
        const updatedAt = vpTradeQuoteTsSec(item?.updated_at || 0);
        const age = Math.max(0, nowSec - updatedAt);
        const maxAge = type === 'crypto' ? 90 : 45;
        const source = String(item?.source || '').toLowerCase();
        if(!symbol || !(updatedAt > 0) || age > maxAge) return;
        if(!isTrustedUiLiveSource(source, symbol, type)) return;
        vpRememberLiveQuote(Object.assign({}, item, { symbol, type, market, updated_at: updatedAt }));
      }catch(e){}
    });
  }catch(e){}
}

const VPQuoteStore = (()=>{
  const records = new Map();
  const listeners = new Set();

  function normSymbol(symbol){
    return String(symbol || '').toUpperCase().trim();
  }

  function normType(type){
    return normalizeLiveAssetType(type || 'crypto');
  }

  function normMarket(type, market, symbol){
    const safeType = normType(type);
    const fallback = (safeType === 'crypto' || safeType === 'futures') ? 'perp' : 'spot';
    const next = String(market || fallback).toLowerCase().trim();
    if(safeType === 'futures') return 'perp';
    if(safeType !== 'crypto') return 'spot';
    try{ return String(resolveLiveMarketForSymbol(normSymbol(symbol), safeType, next || fallback) || fallback).toLowerCase(); }catch(e){}
    return next === 'spot' ? 'spot' : fallback;
  }

  function sourceRank(source, type, symbol, market){
    const src = String(source || '').trim().toLowerCase();
    const safeType = normType(type);
    const safeMarket = String(market || '').toLowerCase();
    if(!src) return 15;
    const map = {
      binance: 100,
      trade_stream: 96,
      stream: 94,
      provider_live: 92,
      eodhd: 91,
      eodhd_rest: 90,
      eodhd_intraday: 86,
      massive: 90,
      polygon: 90,
      provider_fallback: 84,
      yahoo: 72,
      yahoo_chart_live: 70,
      fx_fallback: 68,
      frankfurter: 66,
      stooq: 64,
      quote_cache: 42,
      selection_seed: 28,
      seed: 20,
      seed_fallback: 16,
      stale_cache: 10,
      chart_seed: 6,
      seed_candle: 4,
      aggs: 2,
      synthetic: 1
    };
    let rank = Object.prototype.hasOwnProperty.call(map, src) ? map[src] : 40;
    if(safeType === 'crypto' && safeMarket === 'perp' && src === 'binance') rank += 2;
    if(!isTrustedUiLiveSource(src, symbol, safeType)) rank = Math.min(rank, 12);
    return rank;
  }

  function normalizeQuote(quote, fallback={}){
    const base = Object.assign({}, fallback || {}, quote || {});
    const symbol = normSymbol(base.symbol || fallback.symbol);
    const type = normType(base.type || fallback.type || state.selectedAssetType || 'crypto');
    const market = normMarket(type, base.market || fallback.market, symbol);
    const price = safeNum(resolveQuoteLivePrice(base, market, type) || base.price || base.last || base.mark_price, 0);
    if(!symbol || !(price > 0)) return null;
    const source = String(base.source || base.provider || fallback.source || '').trim().toLowerCase();
    const updatedAt = vpTradeQuoteTsSec(base.updated_at || base.ts || base.time || Date.now());
    return Object.assign({}, base, {
      symbol,
      type,
      market,
      price,
      source,
      change_pct: safeNum(base.change_pct ?? base.changePct ?? fallback.change_pct ?? 0, 0),
      updated_at: updatedAt || vpTradeQuoteTsSec(Date.now())
    });
  }

  function shouldReplace(prev, next){
    if(!prev) return true;
    const prevType = normType(prev.type || next.type || 'crypto');
    const nextType = normType(next.type || prev.type || 'crypto');
    const prevTs = vpTradeQuoteTsSec(prev.updated_at || prev.ts || prev.time || 0);
    const nextTs = vpTradeQuoteTsSec(next.updated_at || next.ts || next.time || 0);
    const prevPrice = safeNum(prev.price || prev.last || prev.mark_price, 0);
    const nextPrice = safeNum(next.price || next.last || next.mark_price, 0);
    const prevRank = sourceRank(prev.source || prev.provider, prevType, prev.symbol, prev.market);
    const nextRank = sourceRank(next.source || next.provider, nextType, next.symbol, next.market);
    const prevTrusted = isTrustedUiLiveSource(prev.source || prev.provider, prev.symbol, prevType);
    const nextTrusted = isTrustedUiLiveSource(next.source || next.provider, next.symbol, nextType);
    if(!(nextPrice > 0)) return false;
    if(!(prevPrice > 0)) return true;
    const rankGap = nextRank - prevRank;
    if(nextType !== 'crypto'){
      if(!nextTrusted && prevTrusted) return false;
      if(nextTrusted && !prevTrusted) return true;
      if(nextTrusted && prevTrusted && rankGap >= 8 && nextTs + 1800 >= prevTs) return true;
      if(nextTs + 2 < prevTs && prevTrusted && rankGap < 8) return false;
      if(nextTs === prevTs && nextRank < prevRank && prevTrusted) return false;
      return (nextTs > prevTs) || (rankGap >= 4 && nextTrusted) || (nextTs === prevTs && (nextRank >= prevRank || Math.abs(nextPrice - prevPrice) > 1e-12)) || (!prevTrusted && nextTrusted);
    }
    if(nextTrusted && !prevTrusted) return true;
    if(!nextTrusted && prevTrusted) return false;
    if(nextTs + 1 < prevTs) return false;
    if(nextTs > prevTs) return true;
    if(nextTs === prevTs){
      if(nextRank > prevRank) return true;
      if(nextRank < prevRank) return false;
      return Math.abs(nextPrice - prevPrice) > 1e-12;
    }
    return nextRank >= (prevRank + 8);
  }

  function emit(record, meta){
    listeners.forEach(fn=>{ try{ fn(record ? Object.assign({}, record) : null, meta || {}); }catch(e){} });
  }

  function store(record){
    const keys = [
      `${record.type}:${record.symbol}`,
      `${record.type}:${record.symbol}:${record.market}`,
      record.symbol
    ];
    keys.forEach(key=>{
      const prev = records.get(key);
      if(shouldReplace(prev, record)) records.set(key, record);
    });
    return record;
  }

  function ingest(quote, meta){
    const record = normalizeQuote(quote);
    if(!record) return null;
    const stored = store(record);
    emit(stored, Object.assign({ source:'ingest' }, meta || {}));
    return Object.assign({}, stored);
  }

  function get(symbol, type, market, maxAgeSec){
    const sym = normSymbol(symbol);
    const safeType = normType(type || state.selectedAssetType || 'crypto');
    const safeMarket = normMarket(safeType, market, sym);
    const cap = Number(maxAgeSec || (safeType === 'crypto' ? 18 : 8));
    const candidate = records.get(`${safeType}:${sym}:${safeMarket}`) || records.get(`${safeType}:${sym}`) || records.get(sym) || null;
    if(!candidate) return null;
    const ts = vpTradeQuoteTsSec(candidate.updated_at || candidate.ts || candidate.time || 0);
    if(!(ts > 0)) return null;
    const age = Math.max(0, Math.floor(Date.now()/1000) - ts);
    if(age > cap) return null;
    const price = safeNum(resolveQuoteLivePrice(candidate, safeMarket, safeType) || candidate.price || candidate.last || candidate.mark_price, 0);
    if(!(price > 0)) return null;
    const source = String(candidate.source || candidate.provider || '').trim().toLowerCase();
    if(!isTrustedUiLiveSource(source, sym, safeType)) return null;
    return Object.assign({}, candidate, { symbol:sym, type:safeType, market:safeMarket, price, source, updated_at:ts });
  }

  function subscribe(fn, filter){
    if(typeof fn !== 'function') return ()=>{};
    const wrapped = (record, meta)=>{
      if(!record) return;
      try{
        if(filter){
          if(filter.symbol && normSymbol(filter.symbol) !== normSymbol(record.symbol)) return;
          if(filter.type && normType(filter.type) !== normType(record.type)) return;
          if(filter.market && String(filter.market).toLowerCase() !== String(record.market || '').toLowerCase()) return;
        }
      }catch(e){}
      fn(Object.assign({}, record), meta || {});
    };
    listeners.add(wrapped);
    try{
      if(filter && filter.symbol){
        const existing = get(filter.symbol, filter.type, filter.market, filter.maxAgeSec);
        if(existing) wrapped(existing, { source:'subscribe_snapshot' });
      }
    }catch(e){}
    return ()=>{ try{ listeners.delete(wrapped); }catch(e){} };
  }

  return { ingest, get, subscribe, peek:get };
})();
try{ window.VPQuoteStore = VPQuoteStore; }catch(e){}

function vpUiQuoteAuthorityRank(source, type, market, symbol=''){
  try{
    const safeType = normalizeLiveAssetType(type || 'crypto');
    const safeMarket = String(market || ((safeType === 'crypto' || safeType === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const src = String(source || '').trim().toLowerCase();
    if(!src) return 0;
    const base = {
      binance: 100,
      trade_stream: 96,
      stream: 94,
      provider_live: 92,
      eodhd: 91,
      eodhd_rest: 90,
      eodhd_intraday: 86,
      massive: 90,
      polygon: 90,
      provider_fallback: 84,
      yahoo: 72,
      yahoo_chart_live: 70,
      fx_fallback: 68,
      frankfurter: 66,
      stooq: 64,
      quote_cache: 44,
      remember_live_quote: 42,
      market_state: 20,
      selection_seed: 18,
      seed: 14,
      seed_fallback: 12,
      stale_cache: 8,
      chart_seed: 4,
      seed_candle: 3,
      aggs: 2,
      synthetic: 1
    };
    let rank = Object.prototype.hasOwnProperty.call(base, src) ? base[src] : 38;
    if(safeType === 'crypto' && safeMarket === 'perp' && src === 'binance') rank += 2;
    if(safeType !== 'crypto' && typeof isTrustedUiLiveSource === 'function' && !isTrustedUiLiveSource(src, symbol, safeType)) rank = Math.min(rank, 14);
    return rank;
  }catch(e){
    return 0;
  }
}

function vpNormalizeUiQuoteCandidate(quote, fallback={}){
  try{
    if(!quote || typeof quote !== 'object') return null;
    const symbol = String(fallback.symbol || quote.symbol || '').toUpperCase().trim();
    const type = normalizeLiveAssetType(fallback.type || quote.type || state.selectedAssetType || 'crypto');
    const market = String(fallback.market || quote.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const price = safeNum(resolveQuoteLivePrice(quote, market, type) || quote.price || quote.last || quote.mark_price, 0);
    if(!symbol || !(price > 0)) return null;
    const source = String(quote.source || quote.provider || fallback.source || '').trim().toLowerCase();
    const trusted = !!(typeof isTrustedUiLiveSource === 'function' ? isTrustedUiLiveSource(source, symbol, type) : true);
    const ts = vpTradeQuoteTsSec(quote.updated_at || quote.ts || quote.time || fallback.updated_at || Date.now());
    const nowSec = Math.floor(Date.now()/1000);
    const ageSec = ts > 0 ? Math.max(0, nowSec - ts) : 1e9;
    const authority = vpUiQuoteAuthorityRank(source, type, market, symbol);
    return Object.assign({}, quote, {
      symbol, type, market, price, source, trusted, updated_at: ts || nowSec, age_sec: ageSec,
      change_pct: safeNum(quote.change_pct ?? quote.changePct ?? fallback.change_pct ?? 0, 0),
      authority_rank: authority
    });
  }catch(e){
    return null;
  }
}

function vpPickUiAuthorityQuote(candidates, fallback={}){
  try{
    const list = Array.isArray(candidates) ? candidates.map(c=>vpNormalizeUiQuoteCandidate(c, fallback)).filter(Boolean) : [];
    if(!list.length) return null;
    const safeType = normalizeLiveAssetType(fallback.type || list[0]?.type || 'crypto');
    const maxAgeSec = Number(fallback.maxAgeSec || (safeType === 'crypto' ? 18 : 8));
    const fresh = list.filter(item=>item.age_sec <= maxAgeSec);
    const pool = fresh.length ? fresh : list.slice();
    pool.sort((a,b)=>{
      const aTrusted = a.trusted ? 1 : 0;
      const bTrusted = b.trusted ? 1 : 0;
      if(aTrusted !== bTrusted) return bTrusted - aTrusted;
      const aTs = Number(a.updated_at || 0);
      const bTs = Number(b.updated_at || 0);
      const aRank = Number(a.authority_rank || 0);
      const bRank = Number(b.authority_rank || 0);
      if(safeType !== 'crypto'){
        if(aRank !== bRank){
          const rankGap = Math.abs(aRank - bRank);
          if(rankGap >= 8) return bRank - aRank;
        }
        const tsGap = Math.abs(aTs - bTs);
        if(tsGap >= 4) return bTs - aTs;
        if(a.age_sec !== b.age_sec){
          const ageGap = Math.abs(a.age_sec - b.age_sec);
          if(ageGap >= 2) return a.age_sec - b.age_sec;
        }
        if(aRank !== bRank) return bRank - aRank;
        return bTs - aTs;
      }
      if(aRank !== bRank){
        const rankGap = Math.abs(aRank - bRank);
        if(rankGap >= 6) return bRank - aRank;
      }
      if(a.age_sec !== b.age_sec){
        const ageGap = Math.abs(a.age_sec - b.age_sec);
        if(ageGap >= 2 || aRank === bRank) return a.age_sec - b.age_sec;
      }
      if(aTs !== bTs) return bTs - aTs;
      return bRank - aRank;
    });
    return Object.assign({}, pool[0]);
  }catch(e){
    return null;
  }
}

function vpCanonicalQuoteForUi(symbol, type, market, opts={}){
  try{
    const sym = String(symbol || '').toUpperCase().trim();
    const safeType = normalizeLiveAssetType(type || state.selectedAssetType || 'crypto');
    const safeMarket = String(market || ((safeType === 'crypto' || safeType === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const maxAgeSec = Number(opts.maxAgeSec || (safeType === 'crypto' ? 18 : 26));
    if(!sym) return null;
    const candidates = [];
    try{
      if(typeof window !== 'undefined' && window.VPTradeLiveQuoteStore && typeof window.VPTradeLiveQuoteStore.get === 'function'){
        const live = window.VPTradeLiveQuoteStore.get({ symbol:sym, type:safeType, market:safeMarket });
        if(live) candidates.push(Object.assign({}, live, { __candidate:'trade_live' }));
      }
    }catch(e){}
    try{
      if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.get === 'function'){
        const storeQuote = VPQuoteStore.get(sym, safeType, safeMarket, maxAgeSec + 3);
        if(storeQuote) candidates.push(Object.assign({}, storeQuote, { __candidate:'quote_store' }));
      }
    }catch(e){}
    try{
      const remembered = vpGetFreshRememberedQuote(sym, safeType, maxAgeSec + 4);
      if(remembered) candidates.push(Object.assign({}, remembered, { __candidate:'remembered' }));
    }catch(e){}
    try{
      const item = marketBySymbol(sym);
      const mp = Number(item?.price || item?.last || item?.mark_price || 0);
      if(item && mp > 0){
        candidates.push({
          symbol:sym,
          type:safeType,
          market:safeMarket,
          price:mp,
          change_pct:Number(item?.change_pct || 0) || 0,
          source:String(item?.source || item?.provider || 'market_state').toLowerCase(),
          updated_at:Number(item?.updated_at || item?.ts || item?.time || 0) || Math.floor(Date.now()/1000),
          __candidate:'market_state'
        });
      }
    }catch(e){}
    const chosen = vpPickUiAuthorityQuote(candidates, { symbol:sym, type:safeType, market:safeMarket, maxAgeSec });
    if(!chosen) return null;
    if(safeType !== 'crypto'){
      const chosenSrc = String(chosen.source || chosen.provider || '').toLowerCase();
      const chosenTs = vpTradeQuoteTsSec(chosen.updated_at || chosen.ts || chosen.time || 0);
      const chosenAge = Math.max(0, Math.floor(Date.now()/1000) - chosenTs);
      if(!isTrustedUiLiveSource(chosenSrc, sym, safeType) || chosenAge > Math.max(1, maxAgeSec)) return null;
    }
    const price = safeNum(resolveQuoteLivePrice(chosen, safeMarket, safeType) || chosen.price || chosen.last || chosen.mark_price, 0);
    if(!(price > 0)) return null;
    return Object.assign({}, chosen, {
      symbol:sym,
      type:safeType,
      market:safeMarket,
      price,
      change_pct:safeNum(chosen.change_pct ?? chosen.changePct ?? 0, 0),
      source:String(chosen.source || chosen.provider || '').toLowerCase(),
      authority_rank:Number(chosen.authority_rank || vpUiQuoteAuthorityRank(chosen.source || chosen.provider || '', safeType, safeMarket, sym) || 0),
      age_sec:Number(chosen.age_sec || 0),
      trusted: !!(typeof isTrustedUiLiveSource === 'function' ? isTrustedUiLiveSource(chosen.source || chosen.provider || '', sym, safeType) : true)
    });
  }catch(e){
    return null;
  }
}
try{ window.vpCanonicalQuoteForUi = vpCanonicalQuoteForUi; }catch(e){}

function vpRememberLiveQuote(quote){
  try{
    if(!quote || typeof quote !== 'object') return null;
    const symbol = String(quote.symbol || '').toUpperCase().trim();
    const type = normalizeLiveAssetType(quote.type || state.selectedAssetType || 'crypto');
    if(!symbol || !type) return null;
    const market = String(quote.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const price = safeNum(resolveQuoteLivePrice(quote, market, type) || quote.price || quote.last || quote.mark_price, 0);
    if(!(price > 0)) return null;
    const source = String(quote?.source || quote?.provider || '').trim().toLowerCase();
    const trusted = isTrustedUiLiveSource(source, symbol, type);
    if(type === 'crypto' && !trusted) return null;
    const updatedAt = vpTradeQuoteTsSec(quote.updated_at || quote.ts || quote.time || Date.now());
    const next = Object.assign({}, quote, {
      symbol,
      type,
      market,
      price,
      source,
      updated_at: updatedAt || vpTradeQuoteTsSec(Date.now())
    });
    const keys = [`${type}:${symbol}:${market}`, `${type}:${symbol}`, symbol];
    keys.forEach(key=>{
      const prev = __vpLiveQuoteByKey.get(key);
      const prevTs = vpTradeQuoteTsSec(prev?.updated_at || prev?.ts || prev?.time || 0);
      const prevPrice = safeNum(prev?.price || prev?.last || prev?.mark_price, 0);
      const prevSource = String(prev?.source || prev?.provider || '').trim().toLowerCase();
      const prevTrusted = isTrustedUiLiveSource(prevSource, symbol, type);
      const prevRank = vpUiQuoteAuthorityRank(prevSource, type, prev?.market || market, symbol);
      const nextRank = vpUiQuoteAuthorityRank(source, type, market, symbol);
      if(type !== 'crypto'){
        const rankGap = nextRank - prevRank;
        if(!trusted && prevTrusted && prevPrice > 0) return;
        if(trusted && !prevTrusted && prevPrice > 0){
          __vpLiveQuoteByKey.set(key, next);
          return;
        }
        if(prevTrusted && trusted && prevPrice > 0){
          if(rankGap >= 8 && updatedAt + 1800 >= prevTs){
            __vpLiveQuoteByKey.set(key, next);
            return;
          }
          if(prevTs > updatedAt + 2 && rankGap < 8) return;
          if(prevTs >= updatedAt && prevRank > nextRank) return;
        }
        if(!trusted && !prevTrusted && prevTs > updatedAt && prevPrice > 0) return;
      } else if(prev && prevTs > next.updated_at && prevPrice > 0) {
        return;
      }
      __vpLiveQuoteByKey.set(key, next);
    });
    try{
      if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.ingest === 'function'){
        VPQuoteStore.ingest(next, { source:'remember_live_quote' });
      }
    }catch(_storeErr){}
    try{ vpSchedulePersistRememberedQuotes(); }catch(_persistErr){}
    return next;
  }catch(_err){
    return null;
  }
}

function vpGetFreshRememberedQuote(symbol, assetType, maxAgeSec){
  try{
    const sym = String(symbol || '').toUpperCase().trim();
    const type = normalizeLiveAssetType(assetType || state.selectedAssetType || 'crypto');
    if(!sym) return null;
    const cap = Number(maxAgeSec || (type === 'crypto' ? 18 : 28));
    try{
      if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.get === 'function'){
        const preferred = VPQuoteStore.get(sym, type, (type === 'crypto' || type === 'futures') ? 'perp' : 'spot', cap);
        if(preferred) return preferred;
      }
    }catch(_storeErr){}
    const preferredMarkets = (type === 'crypto' || type === 'futures') ? ['perp','spot'] : ['spot','perp'];
    const candidate = preferredMarkets
      .map(mk => __vpLiveQuoteByKey.get(`${type}:${sym}:${mk}`))
      .find(Boolean) || __vpLiveQuoteByKey.get(`${type}:${sym}`) || __vpLiveQuoteByKey.get(sym) || null;
    if(!candidate) return null;
    const ts = vpTradeQuoteTsSec(candidate.updated_at || candidate.ts || candidate.time || 0);
    if(!(ts > 0)) return null;
    const age = Math.max(0, Math.floor(Date.now()/1000) - ts);
    if(age > cap) return null;
    const market = String(candidate.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
    const price = safeNum(resolveQuoteLivePrice(candidate, market, type) || candidate.price || candidate.last || candidate.mark_price, 0);
    const source = String(candidate?.source || candidate?.provider || '').trim().toLowerCase();
    if(!(price > 0)) return null;
    if(!isTrustedUiLiveSource(source, sym, type)) return null;
    return Object.assign({}, candidate, {symbol: sym, type, market, price, source, updated_at: ts});
  }catch(_err){
    return null;
  }
}

function vpMarketAuthorityMeta(item, typeHint){
  const type = normalizeLiveAssetType(item?.type || typeHint || state.selectedAssetType || 'crypto');
  const symbol = String(item?.symbol || '').toUpperCase().trim();
  const price = safeNum(item?.price || item?.last || item?.mark_price || 0, 0);
  const ts = vpTradeQuoteTsSec(item?.updated_at || item?.ts || item?.time || 0);
  const src = String(item?.source || item?.provider || '').trim().toLowerCase();
  const nowSec = Math.floor(Date.now()/1000);
  const age = ts > 0 ? Math.max(0, nowSec - ts) : 999999;
  const trusted = price > 0 && isTrustedUiLiveSource(src, symbol, type);
  const freshAge = type === 'crypto'
    ? 18
    : (['stocks','arab'].includes(type) ? 18 : (type === 'forex' ? 10 : (['commodities','futures'].includes(type) ? 8 : 12)));
  return { type, symbol, price, ts, src, age, trusted, liveish: trusted && age <= freshAge };
}

function vpMergeMarketItemAuthority(existing, incoming, typeHint){
  if(!existing) return incoming ? Object.assign({}, incoming) : existing;
  if(!incoming) return existing ? Object.assign({}, existing) : incoming;
  const merged = Object.assign({}, existing, incoming);
  const prev = vpMarketAuthorityMeta(existing, typeHint);
  const next = vpMarketAuthorityMeta(incoming, typeHint);
  let chosen = incoming;
  const prevRank = vpUiQuoteAuthorityRank(prev.src, prev.type, String(existing?.market || ''), prev.symbol);
  const nextRank = vpUiQuoteAuthorityRank(next.src, next.type, String(incoming?.market || ''), next.symbol);
  const isCryptoQuote = prev.type === 'crypto' || next.type === 'crypto';
  if(isCryptoQuote && next.price > 0 && next.trusted && (!prev.trusted || nextRank >= prevRank || prev.age > next.age + 2)){
    chosen = incoming;
  }else if(isCryptoQuote && prev.price > 0 && prev.trusted && !next.trusted){
    chosen = existing;
  }else if(isCryptoQuote && prev.price > 0 && prev.trusted && next.trusted && prev.ts > next.ts + 8 && prevRank >= nextRank){
    chosen = existing;
  }else if(!(next.price > 0) && prev.price > 0){
    chosen = existing;
  }else if(prev.liveish && !next.liveish){
    chosen = existing;
  }else if(prev.price > 0 && next.price > 0 && prev.ts > (next.ts + 1)){
    chosen = existing;
  }else if(prev.liveish && next.liveish && prev.ts > next.ts){
    chosen = existing;
  }
  const winner = chosen === existing ? prev : next;
  if(winner.price > 0){
    merged.price = winner.price;
    const chosenChg = safeNum((chosen?.change_pct ?? chosen?.changePct ?? 0), 0);
    const prevChg = safeNum((existing?.change_pct ?? existing?.changePct ?? 0), 0);
    merged.change_pct = (Math.abs(chosenChg) < 1e-12 && Math.abs(prevChg) > 1e-12) ? prevChg : safeNum((chosen?.change_pct ?? chosen?.changePct ?? merged?.change_pct ?? 0), safeNum(merged?.change_pct, 0));
    merged.updated_at = winner.ts > 0 ? winner.ts : safeNum(merged?.updated_at, 0);
    merged.source = String(chosen?.source || chosen?.provider || merged?.source || '');
    merged.market = String(chosen?.market || merged?.market || ((winner.type === 'crypto' || winner.type === 'futures') ? 'perp' : 'spot')).toLowerCase();
  }
  merged.symbol = winner.symbol || String(merged?.symbol || '').toUpperCase();
  merged.type = winner.type || normalizeLiveAssetType(merged?.type || typeHint || 'crypto');
  return merged;
}
try{ window.vpMergeMarketItemAuthority = vpMergeMarketItemAuthority; }catch(e){}

function vpOverlayMarketsWithFreshQuotes(items, typeHint){
  if(!Array.isArray(items) || !items.length) return Array.isArray(items) ? items : [];
  const fallbackType = normalizeLiveAssetType(typeHint || state.selectedAssetType || 'crypto');
  return items.map(item=>{
    const symbol = String(item?.symbol || '').toUpperCase().trim();
    const itemType = normalizeLiveAssetType(item?.type || fallbackType);
    if(!symbol) return item;
    const remembered = vpGetFreshRememberedQuote(symbol, itemType, itemType === 'crypto' ? 18 : 20);
    if(!remembered) return item;
    return vpMergeMarketItemAuthority(item, Object.assign({}, remembered, {
      symbol,
      type: itemType,
      market: remembered.market || item?.market || ((itemType === 'crypto' || itemType === 'futures') ? 'perp' : 'spot')
    }), itemType);
  });
}

function vpMarketItemsLookFreshEnough(items, typeHint){
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!rows.length) return false;
  const nowSec = Math.floor(Date.now()/1000);
  let priced = 0;
  let trusted = 0;
  rows.forEach(item=>{
    const itemType = normalizeLiveAssetType(item?.type || typeHint || state.selectedAssetType || 'crypto');
    const price = safeNum(item?.price || 0, 0);
    if(!(price > 0)) return;
    priced++;
    const ts = vpTradeQuoteTsSec(item?.updated_at || item?.ts || item?.time || 0);
    const age = ts > 0 ? Math.max(0, nowSec - ts) : 999999;
    if(itemType === 'crypto'){
      if(age <= 6) trusted++;
      return;
    }
    const src = String(item?.source || item?.provider || '').trim().toLowerCase();
    const maxAge = ['stocks','arab'].includes(itemType) ? 10 : (['commodities','futures'].includes(itemType) ? 8 : 8);
    if(ts > 0 && age <= maxAge && isTrustedUiLiveSource(src, item?.symbol || '', itemType)) trusted++;
  });
  const rowCount = rows.length;
  const neededCoverage = rowCount <= 6 ? 0.84 : (rowCount <= 16 ? 0.72 : 0.6);
  const priceCoverage = priced / rowCount;
  const trustedCoverage = trusted / rowCount;
  return priceCoverage >= neededCoverage && trustedCoverage >= neededCoverage;
}

function vpReadWarmMarketsCache(type = state.selectedAssetType){
  const cacheKey = marketsCacheKey(type);
  try{
    const raw = localStorage.getItem(cacheKey);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(!obj || !Array.isArray(obj.items) || !obj.items.length) return null;
    const ts = Number(obj.ts || 0) || 0;
    const ageMs = Math.max(0, Date.now() - ts);
    const normType = normalizeLiveAssetType(type || state.selectedAssetType || 'crypto');
    const maxAgeMs = normType === 'crypto' ? 18000 : 18000;
    if(ts > 0 && ageMs > maxAgeMs) return null;
    return {ts, items: vpOverlayMarketsWithFreshQuotes(obj.items, normType)};
  }catch(e){
    return null;
  }
}

function marketsCacheKey(type = state.selectedAssetType){
  return 'mk_v3_live_cache_' + String(type || 'all');
}

function warmMarketsFromLocal(type = state.selectedAssetType){
  try{
    const cached = vpReadWarmMarketsCache(type);
    if(cached && Array.isArray(cached.items) && cached.items.length){
      if(type === state.selectedAssetType) state.markets = cached.items;
      return cached.items;
    }
  }catch(e){}
  return [];
}

function persistMarketsLocal(type = state.selectedAssetType, items = state.markets || []){
  try{
    localStorage.setItem(marketsCacheKey(type), JSON.stringify({ts:Date.now(), items: vpOverlayMarketsWithFreshQuotes(items || [], type)}));
  }catch(e){}
}


function updateMarketCachesFromLiveQuote(quote){
  if(!quote || typeof quote !== 'object') return false;
  const symbol = String(quote.symbol || '').toUpperCase().trim();
  if(!symbol) return false;
  const type = normalizeLiveAssetType(quote.type || state.selectedAssetType || 'crypto');
  const market = String(quote.market || ((type === 'crypto' || type === 'futures') ? 'perp' : 'spot')).toLowerCase();
  const price = safeNum(resolveQuoteLivePrice(quote, market, type) || quote.price || quote.last || quote.mark_price, 0);
  if(!(price > 0)) return false;
  const updatedAt = safeNum(quote.updated_at ?? quote.ts ?? Math.floor(Date.now()/1000), Math.floor(Date.now()/1000));
  const changePct = safeNum(quote.change_pct ?? quote.changePct ?? 0, 0);
  const source = String(quote?.source || quote?.provider || '').trim().toLowerCase();
  const trusted = isTrustedUiLiveSource(source, symbol, type);
  if(!trusted && type === 'crypto') return false;
  if(type !== 'crypto' && !trusted){
    try{
      const prev = vpGetFreshRememberedQuote(symbol, type, 20);
      if(prev && safeNum(prev?.price || 0, 0) > 0) return false;
    }catch(e){}
  }
  try{ vpRememberLiveQuote(Object.assign({}, quote, {symbol, type, market, price, source, updated_at: updatedAt, change_pct: changePct})); }catch(e){}
  const normalizeItemType = (item)=>normalizeLiveAssetType(item?.type || type || 'crypto');
  const patchItems = (items)=>{
    if(!Array.isArray(items) || !items.length) return {items, changed:false};
    let changed = false;
    const next = items.map(item=>{
      const itemSym = String(item?.symbol || '').toUpperCase().trim();
      if(itemSym !== symbol) return item;
      const itemType = normalizeItemType(item);
      if(itemType && type && itemType !== type) return item;
      const prevTs = safeNum(item?.updated_at || 0, 0);
      const prevPrice = safeNum(item?.price || 0, 0);
      const prevSource = String(item?.source || item?.provider || '').trim().toLowerCase();
      const prevTrusted = isTrustedUiLiveSource(prevSource, symbol, itemType);
      const prevRank = vpUiQuoteAuthorityRank(prevSource, itemType, item?.market || market, symbol);
      const nextRank = vpUiQuoteAuthorityRank(source, type, market, symbol);
      if(prevTs > updatedAt + 1 && prevPrice > 0 && (prevTrusted && prevRank >= nextRank)) return item;
      if(prevPrice > 0 && Math.abs(prevPrice - price) < 1e-12 && Math.abs(safeNum(item?.change_pct || 0, 0) - changePct) < 1e-12 && prevTs === updatedAt) return item;
      changed = true;
      return Object.assign({}, item, {
        symbol,
        type: item?.type || type,
        market: item?.market || market,
        price,
        change_pct: changePct,
        updated_at: updatedAt,
        source: quote?.source || item?.source || ''
      });
    });
    return {items: next, changed};
  };

  let anyChanged = false;
  try{
    if(Array.isArray(state.markets) && state.markets.length){
      const patched = patchItems(state.markets);
      if(patched.changed){
        state.markets = patched.items;
        anyChanged = true;
        try{ persistMarketsLocal(state.selectedAssetType || type, state.markets); }catch(e){}
      }
    }
  }catch(e){}

  const cacheBuckets = [type, state.selectedAssetType, 'crypto','forex','stocks','commodities','futures','arab']
    .map(v=>String(v || '').toLowerCase().trim())
    .filter(Boolean)
    .filter((v, idx, arr)=>arr.indexOf(v) === idx);

  cacheBuckets.forEach(bucket=>{
    try{
      const key = marketsCacheKey(bucket);
      const raw = localStorage.getItem(key);
      if(!raw) return;
      const parsed = JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return;
      const patched = patchItems(parsed.items);
      if(!patched.changed) return;
      parsed.items = patched.items;
      parsed.ts = Date.now();
      localStorage.setItem(key, JSON.stringify(parsed));
      anyChanged = true;
    }catch(e){}
  });

  try{
    window.dispatchEvent(new CustomEvent('vp:quote', {detail:{
      symbol,
      type,
      market,
      price,
      change_pct: changePct,
      updated_at: updatedAt,
      source: String(quote?.source || '')
    }}));
  }catch(e){}

  return anyChanged;
}
try{ window.vpApplyLiveQuote = updateMarketCachesFromLiveQuote; }catch(e){}

function resolveTradeSymbolSeed(symbol, preferredType){
  const sym = String(symbol || '').toUpperCase().trim();
  if(!sym) return null;
  const wanted = String(preferredType || '').toLowerCase().trim();
  const take = (item)=>{
    if(!item) return null;
    if(String(item.symbol || '').toUpperCase() !== sym) return null;
    return Object.assign({}, item, {
      symbol: sym,
      type: String(item.type || wanted || '').toLowerCase() || 'crypto',
      price: safeNum(item.price, 0),
      change_pct: Number(item.change_pct ?? 0),
      updated_at: Number(item.updated_at || 0) || 0
    });
  };

  try{
    const seed = state.__tradeSeedQuote;
    if(seed && String(seed.symbol || '').toUpperCase() === sym){
      const seeded = take(seed);
      if(seeded) return seeded;
    }
  }catch(e){}

  const searchPools = [];
  try{ if(Array.isArray(state.markets) && state.markets.length) searchPools.push(state.markets); }catch(e){}
  const knownTypes = [wanted, state.selectedAssetType, 'crypto', 'forex', 'stocks', 'commodities', 'futures', 'arab']
    .map(v=>String(v || '').toLowerCase().trim())
    .filter(Boolean)
    .filter((v, idx, arr)=>arr.indexOf(v)===idx);
  for(const ty of knownTypes){
    try{
      const raw = localStorage.getItem(marketsCacheKey(ty));
      if(!raw) continue;
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.items) && parsed.items.length) searchPools.push(parsed.items);
    }catch(e){}
  }

  for(const pool of searchPools){
    const exact = pool.find(item=>String(item?.symbol || '').toUpperCase() === sym && (!wanted || String(item?.type || '').toLowerCase() === wanted));
    if(exact){
      const meta = take(exact);
      if(meta) return meta;
    }
  }
  for(const pool of searchPools){
    const loose = pool.find(item=>String(item?.symbol || '').toUpperCase() === sym);
    if(loose){
      const meta = take(loose);
      if(meta) return meta;
    }
  }
  return null;
}


const __vpFreshMarketsQuotesCache = new Map();
async function vpFetchFreshMarketQuotes(type, items, ttlMs=1200){
  const normType = normalizeLiveAssetType(type || 'crypto');
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!list.length || normType === 'all') return list;

  if(normType === 'crypto'){
    const symbols = [...new Set(list.map(item => String(item?.symbol || '').toUpperCase()).filter(Boolean))].slice(0, 30);
    if(!symbols.length) return list;
    const path = `/quotes.php?fresh=1&type=crypto&symbols=${encodeURIComponent(symbols.join(','))}&_=${Date.now()}`;
    try{
      const resp = await apiLiveQuotes(path, normType, 5200);
      const by = new Map((Array.isArray(resp?.items) ? resp.items : [])
        .filter(item => isTrustedUiLiveSource(item?.source || item?.provider || '', item?.symbol || '', normType))
        .map(item => [String(item?.symbol || '').toUpperCase(), item]));
      const merged = list.map(item => {
        const sym = String(item?.symbol || '').toUpperCase();
        return by.has(sym) ? vpMergeMarketItemAuthority(item, by.get(sym), normType) : item;
      });
      return vpOverlayMarketsWithFreshQuotes(merged, normType);
    }catch(e){
      return vpOverlayMarketsWithFreshQuotes(list, normType);
    }
  }

  if(normType !== 'crypto'){
    const tradeDrawerOpen = !!state.__vpTradeSymbolsDrawerOpen && String(location.hash || '').indexOf('#/trade') === 0;
    const currentHash = String(location.hash || '');
    const liveMarketRoute = currentHash.indexOf('#/markets') === 0 || currentHash.indexOf('#/trade') === 0;
    const warmMaxAge = liveMarketRoute ? 0 : (tradeDrawerOpen ? 450 : 1200);
    try{
      const warm = vpReadWarmMarketsCache(normType);
      if(warm && Array.isArray(warm.items) && warm.items.length){
        const byWarm = new Map(warm.items.map(item => [String(item?.symbol || '').toUpperCase(), item]));
        const mergedWarm = list.map(item => {
          const sym = String(item?.symbol || '').toUpperCase();
          return byWarm.has(sym) ? Object.assign({}, item, byWarm.get(sym)) : item;
        });
        if(warmMaxAge > 0 && (Date.now() - Number(warm.ts || 0)) <= warmMaxAge) return vpOverlayMarketsWithFreshQuotes(mergedWarm, normType);
      }
    }catch(e){}

    const symbols = [...new Set(list.map(item => String(item?.symbol || '').toUpperCase()).filter(Boolean))];
    if(!symbols.length) return list;
    const useDirect = symbols.length === 1;
    const timeoutMs = ['arab','stocks'].includes(normType) ? (tradeDrawerOpen ? 2600 : 4200) : (normType === 'futures' ? (tradeDrawerOpen ? 2500 : 3800) : (normType === 'commodities' ? (tradeDrawerOpen ? 2200 : 3200) : (normType === 'forex' ? (tradeDrawerOpen ? 2400 : 3400) : 4600)));
    const path = `/quotes.php?type=${encodeURIComponent(normType)}&symbols=${encodeURIComponent(symbols.join(','))}${useDirect ? '&direct=1' : '&visible=1'}`;
    try{
      const resp = await apiLiveQuotes(path, normType, timeoutMs);
      const by = new Map((Array.isArray(resp?.items) ? resp.items : []).map(item => [String(item?.symbol || '').toUpperCase(), item]));
      const merged = list.map(item => {
        const sym = String(item?.symbol || '').toUpperCase();
        return by.has(sym) ? vpMergeMarketItemAuthority(item, by.get(sym), normType) : item;
      });
      return vpOverlayMarketsWithFreshQuotes(merged, normType);
    }catch(e){
      return vpOverlayMarketsWithFreshQuotes(list, normType);
    }
  }
  return list;
}

async function refreshMarkets(opts={}){
  const selectedType = String(opts.type || state.selectedAssetType || 'all');
  const applyToState = opts.applyToState !== false;
  const lite = opts.lite !== false; // default true: fast open, then hydrate prices in chunks
  const withQuotes = (typeof opts.withQuotes === 'boolean') ? opts.withQuotes : false;
  const warm = opts.warm !== false;

  if (warm && applyToState) warmMarketsFromLocal(selectedType);

  const ttlMs = Number(opts.ttlMs || (selectedType==='crypto' ? 350 : 1800));
  const effectiveWithQuotes = selectedType === 'crypto' ? true : !!withQuotes;
  const qs = `?type=${encodeURIComponent(selectedType)}${lite ? '&lite=1' : ''}${effectiveWithQuotes ? '&with_quotes=1&force_live=1' : ''}`;
  const r = await apiGetCached(`/markets.php${qs}`, ttlMs);
  let nextItems = vpOverlayMarketsWithFreshQuotes(Array.isArray(r?.items) ? r.items : [], selectedType);
  const needsFreshHydration = Array.isArray(nextItems)
    && nextItems.length
    && (effectiveWithQuotes ? !vpMarketItemsLookFreshEnough(nextItems, selectedType) : (selectedType !== 'crypto' && withQuotes));
  if(needsFreshHydration){
    try{ nextItems = await vpFetchFreshMarketQuotes(selectedType, nextItems, selectedType === 'crypto' ? 900 : 1100); }catch(e){}
  }

  if (applyToState && selectedType === state.selectedAssetType) {
    state.markets = vpMergeMarketItemsByKeyLite(state.markets || [], nextItems || []);
    nextItems = state.markets;
    persistMarketsLocal(selectedType, state.markets || []);

    if(selectedType==='crypto'){
      const exists = (state.markets || []).find(x=>x.symbol===state.selectedSymbol);
      if(!exists && state.markets.length) state.selectedSymbol = state.markets[0].symbol;
    }
  }

  return nextItems;
}

function navLink(href, label){
  const active = location.hash===href;
  const icon = (function(){
    const common = {viewBox:'0 0 24 24','aria-hidden':'true'};
    const stroke = {fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'};
    if (href==='#/home') return h('svg', common,
      h('path', Object.assign({d:'M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z'}, stroke))
    );
    if (href==='#/markets') return h('svg', common,
      h('path', Object.assign({d:'M4 19V5'}, stroke)),
      h('path', Object.assign({d:'M8 16l3-3 3 2 6-7'}, stroke))
    );
    if (href==='#/portfolio') return h('svg', common,
      h('path', Object.assign({d:'M5 19h14'}, stroke)),
      h('path', Object.assign({d:'M8 15V9'}, stroke)),
      h('path', Object.assign({d:'M12 15V6'}, stroke)),
      h('path', Object.assign({d:'M16 15v-3'}, stroke))
    );
    if (href==='#/trade') return h('svg', common,
      h('path', Object.assign({d:'M13 2L3 14h7l-1 8 10-12h-7l1-8z'}, stroke))
    );
    if (href==='#/invest') return h('svg', common,
      h('path', Object.assign({d:'M12 2l2.2 6.5H21l-5.4 3.9L17.8 19 12 15.6 6.2 19l2.2-6.6L3 8.5h6.8L12 2z'}, stroke))
    );
    return h('svg', common,
      h('path', Object.assign({d:'M20 21a8 8 0 0 0-16 0'}, stroke)),
      h('circle', {cx:'12', cy:'8', r:'4', fill:'none', stroke:'currentColor','stroke-width':'2'})
    );
  })();

  const badgeCount = 0;
  return h('a', {href, class: active ? 'active' : ''},
    h('div', {class:'nav-ico', 'aria-hidden':'true'}, icon, badgeCount>0 ? h('span',{class:'nav-badge'}, String(badgeCount > 99 ? '99+' : badgeCount)) : null),
    h('div', {class:'tiny'}, label)
  );
}

function assetTypeLabel(type){
  const v = String(type||'crypto').toLowerCase();
  if(v==='forex' || v==='fx' || v==='indices') return state.t('markets.fx');
  if(v==='stocks') return state.t('markets.stocks');
  if(v==='arab') return tr('Arab Stocks','الأسهم العربية','Арабские акции');
  if(v==='futures' || v==='perpetual' || v==='perp') return tr('Perpetual','العقود الدائمة','Бессрочные');
  if(v==='commodities') return state.t('markets.commodities');
  return state.t('markets.crypto');
}

function accountModeLabel(mode){
  return String(mode||'demo').toLowerCase()==='real' ? state.t('trade.mode_real') : state.t('trade.mode_demo');
}

function topBar(){
  const currentHash = String(location.hash || '#/home');
  const skipPrimer = currentHash.startsWith('#/trade') || currentHash.startsWith('#/markets') || currentHash.startsWith('#/portfolio');
  if(!skipPrimer && (!state.notificationsFeed || !state.__notificationsPrimed) && !state.__notificationsPriming){
    queueNotificationsPrimer(900);
  }
  const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  const realEq = safeNum(ws?.real?.balance, 0);
  const realAvail = safeNum(ws?.real?.available, realEq);
  const realHolds = safeNum(ws?.real?.holds, Math.max(0, realEq - realAvail));
  const demoEq = safeNum(ws?.demo?.balance, 0);
  const currentRoute = String(location.hash || '#/home');
  const routeLabel = currentRoute.startsWith('#/trade') ? state.t('nav.trade')
    : currentRoute.startsWith('#/markets') ? state.t('nav.markets')
    : currentRoute.startsWith('#/invest') ? state.t('nav.invest')
    : currentRoute.startsWith('#/wallet') ? state.t('nav.transactions')
    : currentRoute.startsWith('#/kyc') ? (state.t('kyc.title') || tr('Verification','التحقق','Верификация'))
    : currentRoute.startsWith('#/support') ? state.t('support.title')
    : currentRoute.startsWith('#/notifications') ? tr('Notifications','التنبيهات','Уведомления')
    : currentRoute.startsWith('#/news') ? tr('News','الأخبار','Новости')
    : currentRoute.startsWith('#/account') ? state.t('nav.account')
    : state.t('nav.home');

  const contextChips = [];
  if(currentRoute.startsWith('#/trade')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, state.selectedSymbol || '—'));
    contextChips.push(h('span',{class:'vp-context-chip'}, assetTypeLabel(state.selectedAssetType)));
    contextChips.push(h('span',{class:'vp-context-chip'}, accountModeLabel(state.tradeMode)));
  } else if(currentRoute.startsWith('#/markets')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, assetTypeLabel(state.selectedAssetType)));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('Instruments','الأدوات','Инструменты')}: ${Array.isArray(state.markets)?state.markets.length:0}`));
  } else if(currentRoute.startsWith('#/wallet')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${tr('Live available','المتاح الحقيقي','Доступно на реальном')}: $${fmt(realAvail,2)}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('On hold','قيد الحجز','В холде')}: $${fmt(realHolds,2)}`));
  } else if(currentRoute.startsWith('#/kyc')){
    const kycLabel = String(state.onboardingStatus?.kyc?.status || state.kycStatus?.status || 'none').toUpperCase();
    contextChips.push(h('span',{class:'vp-context-chip active'}, kycLabel));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('Live available','المتاح الحقيقي','Доступно на реальном')}: $${fmt(realAvail,2)}`));
  } else if(currentRoute.startsWith('#/account')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${state.t('account.primary')}: $${fmt(realEq,2)}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${state.t('account.demo')}: $${fmt(demoEq,2)}`));
  } else if(currentRoute.startsWith('#/support')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${tr('Tickets','التذاكر','Тикеты')}: ${Array.isArray(state.supportTickets)?state.supportTickets.length:0}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('Live available','المتاح الحقيقي','Доступно на реальном')}: $${fmt(realAvail,2)}`));
  } else if(currentRoute.startsWith('#/notifications')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${tr('Unread','غير مقروء','Непрочитано')}: ${notificationsUnreadCount()}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('Live available','المتاح الحقيقي','Доступно на реальном')}: $${fmt(realAvail,2)}`));
  } else if(currentRoute.startsWith('#/news')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${tr('Updates','التحديثات','Обновления')}: ${Array.isArray(state.newsFeed)?state.newsFeed.length:0}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${tr('Live available','المتاح الحقيقي','Доступно на реальном')}: $${fmt(realAvail,2)}`));
  } else if(currentRoute.startsWith('#/invest')){
    contextChips.push(h('span',{class:'vp-context-chip active'}, tr('Structured plans','خطط منظمة','Структурированные планы')));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${state.t('account.primary')}: $${fmt(realEq,2)}`));
  } else {
    contextChips.push(h('span',{class:'vp-context-chip active'}, `${state.t('account.primary')}: $${fmt(realEq,2)}`));
    contextChips.push(h('span',{class:'vp-context-chip'}, `${state.t('account.demo')}: $${fmt(demoEq,2)}`));
  }

  const utilityTopbar = (function(){
    if(!(currentRoute.startsWith('#/support') || currentRoute.startsWith('#/notifications'))) return null;
    const isSupport = currentRoute.startsWith('#/support');
    const primaryCount = isSupport ? (Array.isArray(state.supportTickets) ? state.supportTickets.length : 0) : (Array.isArray(buildNotificationsFeed()) ? buildNotificationsFeed().length : 0);
    const secondaryCount = isSupport ? supportUnreadCount() : notificationsUnreadCount();
    const statOneLabel = isSupport ? tr('Open tickets','تذاكر مفتوحة','Открытые тикеты','खुले टिकट') : tr('Total items','إجمالي العناصر','Всего элементов','कुल आइटम');
    const statTwoLabel = isSupport ? tr('Unread replies','ردود غير مقروءة','Непрочитанные ответы','अपठित उत्तर') : tr('Unread','غير مقروء','Непрочитано','अपठित');
    return h('div', {class:'vp-topbar vp-topbar-utility card mb-3'},
      h('div',{class:'vp-topbar-utility-flat utility-no-logo'},
        h('div',{class:'vp-topbar-utility-actions-inline utility-header-actions'},
          h('div',{class:'utility-switch-pair'},
            h('button',{class:'btn slim ' + (isSupport ? 'primary' : 'outline'), onclick:()=>{ if(!isSupport) location.hash = '#/support'; }}, state.t('support.title')),
            h('button',{class:'btn slim ' + (!isSupport ? 'primary' : 'outline'), onclick:()=>{ if(isSupport) location.hash = '#/notifications'; }}, tr('Notifications','التنبيهات','Уведомления','सूचनाएं'))
          ),
          languageMenuNode(state.lang, 'utility-lang-menu')
        ),
        h('div',{class:'vp-topbar-utility-grid utility-two-stats'},
          h('div',{class:'vp-mini-stat utility-compact-stat'}, h('span',{class:'k'}, statOneLabel), h('span',{class:'v'}, String(primaryCount))),
          h('div',{class:'vp-mini-stat utility-compact-stat ' + (secondaryCount > 0 ? '' : 'ghost')}, h('span',{class:'k'}, statTwoLabel), h('span',{class:'v'}, String(secondaryCount)))
        )
      )
    );
  })();

  const actionButtons = [];
  if(currentRoute.startsWith('#/wallet')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>{ if(!requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.deposit_failed')))); }}, state.t('wallet.deposit')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>{ if(!requireRealWorkflowAccess('withdraw')) return; walletWithdrawFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.withdraw_failed')||tr('Withdrawal failed','فشل تنفيذ السحب','Ошибка вывода')))); }}, state.t('wallet.withdraw')));
  } else if(currentRoute.startsWith('#/trade')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/markets'}, state.t('nav.markets')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
  } else if(currentRoute.startsWith('#/markets')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, state.t('nav.trade')));
  } else if(currentRoute.startsWith('#/account')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>openSupportBot()}, state.t('support.title')));
  } else if(currentRoute.startsWith('#/kyc')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, state.t('nav.account')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
  } else if(currentRoute.startsWith('#/support')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, tr('Notifications','التنبيهات','Уведомления')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/account'}, state.t('nav.account')));
  } else if(currentRoute.startsWith('#/notifications')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, state.t('support.title')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
  } else if(currentRoute.startsWith('#/news')){
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, state.t('support.title')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
  } else {
    actionButtons.push(h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')));
    actionButtons.push(h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, state.t('nav.trade')));
  }

  if(utilityTopbar) return utilityTopbar;

  return h('div', {class:'vp-topbar card mb-3 vp-topbar-brand-centered'},
    h('div', {class:'vp-topbar-center'},
      h('div',{id:'brandMark', class:'vp-brandmark vp-brandmark-centered'})
    ),
    h('div',{class:'vp-topbar-right'},
      h('div',{class:'vp-mini-stat'}, h('span',{class:'k'}, state.t('account.primary')), h('span',{class:'v'}, `$${fmt(realEq,2)}`)),
      h('div',{class:'vp-mini-stat ghost'}, h('span',{class:'k'}, state.t('account.demo')), h('span',{class:'v'}, `$${fmt(demoEq,2)}`)),
      h('div',{class:'vp-topbar-actions'},
        h('button',{class:'btn outline notif-top-btn', onclick:async()=>{ await refreshNotificationsData(true); location.hash='#/notifications'; render(); }, title:tr('Notifications center','مركز التنبيهات','Центр уведомлений')},
          h('span',{class:'notif-top-ico'}, '⎋'),
          h('span',{}, tr('Notifications','التنبيهات','Уведомления')),
          notificationsUnreadCount()>0 ? h('span',{class:'notif-top-badge'}, String(notificationsUnreadCount()>99?'99+':notificationsUnreadCount())) : null
        ),
        ...actionButtons,
        languageMenuNode(state.lang, 'topbar-lang-menu')
      )
    )
  );
}

function kpiCard(title, value, sub){
  return h('div',{class:'card kpi'},
    h('div',{class:'muted small'}, title),
    h('div',{class:'v'}, value),
    sub ? h('div',{class:'muted small'}, sub) : null
  );
}

function homePage(){
  const me = state.me;
  const activeMode = currentTradeModeKey();
  const modeLabel = activeMode === 'real' ? (state.t('trade.mode_real') || tr('Real','حقيقي','Реал')) : (state.t('trade.mode_demo') || tr('Demo','ديمو','Демо'));
  const accountData = currentAccountModeData(activeMode);
  const rp = accountData.pf || {};

  const totalBal = Number(accountData.balance ?? 0);
  const availableCash = Number(accountData.available ?? totalBal);
  const positions = Array.isArray(rp?.positions) ? rp.positions : [];
  const marginUsed = positions.reduce((acc, pos)=>{
    const st = String(pos?.status||'open').toLowerCase();
    if(st && st !== 'open') return acc;
    const mt = String(pos?.market_type||'spot').toLowerCase();
    const qty = Math.abs(Number(pos?.qty||0));
    const entry = Number(pos?.entry_price||0);
    const lev = Math.max(1, Number(pos?.leverage||1));
    const margin = Number(pos?.margin_initial||0);
    if(mt==='perp') return acc + (margin>0 ? margin : ((qty*entry)/lev));
    return acc + (margin>0 ? margin : (qty*entry));
  }, 0);
  const investUsed = safeNum(rp?.invest_in_use, 0);
  const inUseBal = Math.max(0, marginUsed + investUsed);

  const realized = safeNum(rp?.realized_pnl, 0);
  const unrealInit = safeNum(rp?.unrealized_pnl, 0);
  const pnlTotalInit = realized + unrealInit;
  const availableBal = availableCash + unrealInit;
  const totalBalInit = Math.max(0, availableBal + inUseBal);
  const activePnlStats = activeMode === 'real' ? state.realPnlStats : state.pnlStats;
  const realized24Init = safeNum(activePnlStats?.realized_24h, 0);
  const pnl24Init = safeNum(activePnlStats?.pnl_24h, realized24Init);

  // Refs (live updates)
  const totalValEl = h('span',{}, `$${fmt(Math.max(0,totalBalInit),2)}`);
  const availValEl = h('span',{}, `$${fmt(Math.max(0,availableBal),2)}`);
  const inUseValEl = h('span',{}, `$${fmt(Math.max(0,inUseBal),2)}`);

  const pnlTotalValEl = h('span',{class: pnlTotalInit>=0?'up':'down'}, `${pnlTotalInit>=0?'+':''}$${fmt(pnlTotalInit,2)}`);
  const pnl24ValEl    = h('span',{class: pnl24Init>=0?'up':'down'}, `${pnl24Init>=0?'+':''}$${fmt(pnl24Init,2)}`);

  const pnlTotalSubEl = h('span',{}, `${state.t('dashboard.realized')} ${realized>=0?'+':''}$${fmt(realized,2)} • ${state.t('dashboard.unreal')} ${unrealInit>=0?'+':''}$${fmt(unrealInit,2)}`);
  const pnl24SubEl    = h('span',{}, `${state.t('dashboard.realized_24h')} ${realized24Init>=0?'+':''}$${fmt(realized24Init,2)} • ${state.t('dashboard.unreal_24h')} $0.00`);

  const paintHomeBalanceSnapshot = ()=>{
    try{
      const snap = currentAccountModeData(currentTradeModeKey());
      const rp2 = snap.pf || {};
      const avail2 = Number(snap.available ?? 0);
      const unreal2 = safeNum(rp2?.unrealized_pnl, 0);
      const availEq2 = avail2 + unreal2;
      availValEl.textContent = `$${fmt(Math.max(0,availEq2),2)}`;
      const pos2 = Array.isArray(rp2?.positions) ? rp2.positions : [];
      const margin2 = pos2.reduce((acc, pos)=>{
        const st = String(pos?.status||'open').toLowerCase();
        if(st && st !== 'open') return acc;
        const mt = String(pos?.market_type||'spot').toLowerCase();
        const qty = Math.abs(Number(pos?.qty||0));
        const entry = Number(pos?.entry_price||0);
        const lev = Math.max(1, Number(pos?.leverage||1));
        const margin = Number(pos?.margin_initial||0);
        if(mt==='perp') return acc + (margin>0?margin:((qty*entry)/lev));
        return acc + (margin>0?margin:(qty*entry));
      }, 0);
      const inv2 = safeNum(rp2?.invest_in_use, 0);
      const inUse2 = Math.max(0, margin2 + inv2);
      inUseValEl.textContent = `$${fmt(inUse2,2)}`;
      lastTotalUsd = Math.max(0, (avail2 + unreal2) + inUse2);
      totalValEl.textContent = `$${fmt(lastTotalUsd,2)}`;
      try{ updateLocalBalanceUI && updateLocalBalanceUI(); }catch(e){}
    }catch(e){}
  };

  paintHomeBalanceSnapshot();
  let baseTimer = setInterval(()=>{
    if(isEffectivelyHidden()) return;
    paintHomeBalanceSnapshot();
  }, 2800);
  onCleanup(()=>{ try{ clearInterval(baseTimer); }catch(e){} });
  const __homeFastUpdate = async ()=>{
    if(isEffectivelyHidden()) return;
    paintHomeBalanceSnapshot();
  };

  const __onHomeSync = ()=>{ __homeFastUpdate(); };
  window.addEventListener('tp:sync', __onHomeSync, {passive:true});
  onCleanup(()=>{ try{ window.removeEventListener('tp:sync', __onHomeSync); }catch(e){} });

  // Live PnL ticker (quotes -> recompute unrealized + pnl_total / pnl_24)
  const stopDash = startHomeRealPnlTicker({
    pnlTotalValEl,
    pnl24ValEl,
    pnlTotalSubEl,
    pnl24SubEl,
  });
  onCleanup(()=>{ try{ stopDash && stopDash(); }catch(e){} });

  // --- Local currency converter (shown under PnL 24h) ---
  let lastTotalUsd = Math.max(0, totalBalInit);
  let localCur = (localStorage.getItem('tp_local_cur') || 'EGP').toUpperCase();
  if(!/^[A-Z]{3}$/.test(localCur)) localCur = 'EGP';

  const localOptions = ['USD', 'EGP', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'QAR', 'JOD', 'IQD', 'TRY', 'RUB', 'INR', 'PKR', 'IDR', 'MYR', 'THB', 'VND', 'NGN', 'ZAR', 'BRL', 'MXN', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY', 'CNY'];
  const __curFlag = {
    USD:'🇺🇸', EGP:'🇪🇬', EUR:'🇪🇺', GBP:'🇬🇧', SAR:'🇸🇦', AED:'🇦🇪', KWD:'🇰🇼', QAR:'🇶🇦', JOD:'🇯🇴', IQD:'🇮🇶',
    TRY:'🇹🇷', INR:'🇮🇳', PKR:'🇵🇰', IDR:'🇮🇩', MYR:'🇲🇾', THB:'🇹🇭', VND:'🇻🇳', NGN:'🇳🇬', ZAR:'🇿🇦',
    BRL:'🇧🇷', MXN:'🇲🇽', CAD:'🇨🇦', AUD:'🇦🇺', CHF:'🇨🇭', SEK:'🇸🇪', NOK:'🇳🇴', DKK:'🇩🇰', JPY:'🇯🇵', CNY:'🇨🇳', RUB:'🇷🇺'
  };
  const flagOf = (c)=> __curFlag[String(c||'').toUpperCase()] || '🏳️';
  const localSel = h('select',{class:'input', onchange: async (e)=>{
    localCur = String(e.target.value||'USD').toUpperCase();
    localStorage.setItem('tp_local_cur', localCur);
    await fetchFxRate();
    updateLocalBalanceUI();
  }},
    ...localOptions.map(c=>h('option',{value:c, selected: c===localCur}, `${flagOf(c)} ${c}`))
  );

  const localValueEl = h('div',{class:'v'}, '—');
  const localMetaEl  = h('div',{class:'muted small'}, '');
  const localRateEl  = h('div',{class:'muted small'}, '');

  let fxRate = 0;
  async function fetchFxRate(){
    try{
      if(localCur==='USD'){ fxRate = 1; return; }
      const r = await apiGetCached(`/fx_rate.php?to=${encodeURIComponent(localCur)}`, 30000);
      fxRate = Number(r?.rate||0) || 0;
    }catch(e){
      fxRate = 0;
    }
  }

  function updateLocalBalanceUI(){
    const tTotal = state.t('home.total_balance');
    localMetaEl.textContent = `${tTotal}: $${fmt(Math.max(0,lastTotalUsd),2)}`;
    if (fxRate > 0) {
      localValueEl.textContent = `${fmt(Math.max(0,lastTotalUsd) * fxRate, 2)} ${localCur}`;
      localRateEl.textContent = `1 USD ≈ ${fmt(fxRate, 4)} ${localCur}`;
    } else {
      localValueEl.textContent = '—';
      localRateEl.textContent = state.t('home.fx_rate_unavailable');
    }
  }

  const localBalanceCard = h('div',{class:'card mt-2'},
    h('div',{class:'row mb-2', style:'justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;'},
      h('div',{},
        h('div',{class:'muted small'}, state.t('home.local_balance') || (state.lang==='ar'?'رصيدك بعملتك المحلية':'Local balance')) ,
        h('div',{class:'muted tiny'}, state.t('home.local_balance_hint') || (state.lang==='ar'?'حوِّل إجمالي رصيدك من الدولار إلى عملة بلدك.':'Convert your total balance from USD'))
      ),
      localSel
    ),
    localValueEl,
    localMetaEl,
    localRateEl
  );

  // init + refresh rate occasionally
  fetchFxRate().then(updateLocalBalanceUI).catch(()=>{});
  let fxTimer = setInterval(async ()=>{
    try{
      if(isEffectivelyHidden()) return;
      await fetchFxRate();
      updateLocalBalanceUI();
    }catch(e){}
  }, 120000);
  onCleanup(()=>{ try{ clearInterval(fxTimer); }catch(e){} });

  const quickTrade = h('div',{class:'card vp-home-quick-card vp-home-quick-card--trade'},
    h('div',{class:'row mb-2'},
      h('div',{class:'h2 flex-1'}, state.t('home.quickTrade')),
      h('span',{class:'pill'}, state.selectedSymbol)
    ),
    h('div',{class:'grid', style:'grid-template-columns: 1fr 1fr;'},
      h('button',{class:'btn primary', onclick:()=>{location.hash='#/trade';}}, state.t('nav.trade')),
      h('button',{class:'btn', onclick:()=>{location.hash='#/markets';}}, state.t('nav.markets'))
    ),
    h('div',{class:'muted small mt-2'}, state.t('home.subtitle'))
  );

  const plans = state.portfolio?.top_plans || [];
  const quickInvest = h('div',{class:'card vp-home-quick-card vp-home-quick-card--earn'},
    h('div',{class:'row mb-2'},
      h('div',{class:'h2 flex-1'}, state.t('home.quickInvest')),
      h('button',{class:'btn', onclick:()=>{location.hash='#/invest';}}, state.t('common.refresh'))
    ),
    plans.length ? plans.map(pl=>
      h('div',{class:'row', style:'justify-content:space-between; padding:10px; border:1px solid rgba(148,163,184,.14); border-radius:14px; margin-top:10px;'},
        h('div',{},
          h('div',{style:'font-weight:800'}, pl.name),
          h('div',{class:'muted small'}, `${pl.term_days}d • ${pl.roi_percent}% ROI`)
        ),
        h('button',{class:'btn primary', onclick:()=>{location.hash='#/invest?plan='+encodeURIComponent(pl.id)}}, state.t('invest.subscribe'))
      )
    ) : h('div',{class:'muted small'}, state.t('common.loading'))
  );

  const displayName = me ? ((me.first_name||'') + (me.last_name?(' '+me.last_name):'')).trim() : '';
  const username = me?.username ? ('@'+me.username) : '';
  const summaryCard = h('div',{class:'card mt-3 vp-home-summary-card'},
    h('div',{class:'row mb-2'},
      h('div',{class:'flex-1'},
        h('div',{class:'h2'}, `${state.t('dashboard.accountSummary')} • ${modeLabel}`),
        h('div',{class:'muted small'}, displayName ? `${displayName} ${username}`.trim() : (username||'') )
      )
    ),
    // Real balance is already shown in the breakdown cards below.
    h('div',{class:'grid cols4'},
      h('button',{class:'btn deposit-btn with-ico', onclick:()=>{ if(!requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.deposit_failed')))); }},
        h('span',{class:'ico'}, h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},
          h('path',{d:'M12 4v12m0 0l-5-5m5 5l5-5',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'})
        )),
        state.t('wallet.deposit')
      ),
      h('button',{class:'btn withdraw-btn with-ico', onclick:()=>{ if(!requireRealWorkflowAccess('withdraw')) return; walletWithdrawFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.withdraw_failed')||tr('Withdrawal failed','فشل تنفيذ السحب','Ошибка вывода')))); }},
        h('span',{class:'ico'}, h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},
          h('path',{d:'M12 20V8m0 0l-5 5m5-5l5 5',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'})
        )),
        state.t('wallet.withdraw')
      ),
      h('button',{class:'btn', onclick:()=>{location.hash='#/wallet';}}, state.t('wallet.open_wallet')),
      h('button',{class:'btn', onclick:()=>{location.hash='#/trade';}}, state.t('nav.trade'))
    )
  );

  // Open the license PDF inside Telegram WebApp (same webview) when possible.
  const __licenseUrl = new URL('assets/docs/SCA_LIC-0005622_Certificate.pdf', location.href).href;
  const openLicense = (ev)=>{
    try{ if(ev) ev.stopPropagation(); }catch(e){}
    try{
      if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function'){
        window.Telegram.WebApp.openLink(__licenseUrl);
        return;
      }
    }catch(e){}
    window.location.href = __licenseUrl;
  };

  const homeHero = pageHero({
    eyebrow: tr('Client dashboard','لوحة العميل','Клиентская панель'),
    title: state.t('home.title') || tr('Overview','نظرة عامة','Обзор'),
    subtitle: state.t('home.subtitle'),
    actions: [
      h('button',{class:'btn primary', onclick:()=>{location.hash='#/trade';}}, state.t('nav.trade')),
      h('button',{class:'btn', onclick:()=>{location.hash='#/wallet';}}, state.t('wallet.open_wallet')),
      h('button',{class:'btn secondary', onclick:()=>{location.hash='#/invest';}}, state.t('nav.invest'))
    ],
    aside: h('div',{class:'mini-stat-grid'},
      miniStatCard(state.t('home.total_balance'), `$${fmt(Math.max(0,totalBalInit),2)}`, activeMode === 'real' ? tr('Real account overview','ملخص الحساب الحقيقي','Обзор реального счёта') : tr('Demo account overview','ملخص حساب الديمو','Обзор демо-счёта')),
      miniStatCard(state.t('home.available_balance')||state.t('home.balance'), `$${fmt(Math.max(0,availableBal),2)}`, activeMode === 'real' ? tr('Free balance + unrealized PnL','الرصيد الحر + الأرباح غير المحققة','Свободный баланс + нереализованный PnL') : tr('Demo buying power + unrealized PnL','قوة شراء الديمو + الأرباح غير المحققة','Покупательная сила demo + нереализованный PnL'), 'good')
    ),
    className:'vp-home-desktop-hero'
  });

  const pulseCard = (tone, title, value, sub, target, cta)=>h('button',{class:`vp-home-pulse-card tone-${tone}`, type:'button', onclick:()=>{ location.hash = target; }},
    h('div',{class:'vp-home-pulse-top'},
      h('span',{class:'vp-home-pulse-label'}, title),
      h('span',{class:'vp-home-pulse-cta'}, cta)
    ),
    h('div',{class:'vp-home-pulse-value'}, value),
    h('div',{class:'vp-home-pulse-sub'}, sub)
  );

  const pulseGrid = h('div',{class:'vp-home-pulse-grid mt-3'},
    pulseCard('wallet', activeMode === 'real' ? tr('Funding ready','التمويل جاهز','Финансирование готово') : tr('Demo wallet','محفظة الديمو','Демо-кошелёк'), `$${fmt(Math.max(0,availableBal),2)}`, activeMode === 'real' ? tr('Live available for deposits, withdrawals, and trade margin.','المتاح الحقيقي للإيداع والسحب وهامش التداول.','Доступно на реальном счёте для пополнений, выводов и маржи.') : tr('Practice balance only. Funding actions stay locked until you switch to Real.','هذا رصيد للتجربة فقط. إجراءات التمويل تبقى مقفولة حتى التحويل إلى الحقيقي.','Это тренировочный баланс. Финансовые действия заблокированы, пока вы не переключитесь в Real.'), '#/wallet', tr('Open wallet','فتح المحفظة','Открыть кошелёк')),
    pulseCard('trade', tr('Trading desk','مكتب التداول','Торговый терминал'), String(accountData.openPositions), activeMode === 'real' ? tr('Open real positions currently running on your account.','عدد الصفقات الحقيقية المفتوحة على حسابك الآن.','Количество открытых реальных позиций на вашем счёте.') : tr('Open demo positions currently running on your practice account.','عدد الصفقات المفتوحة على حساب الديمو الآن.','Количество открытых demo-позиций на тренировочном счёте.'), '#/trade', tr('Go trade','اذهب للتداول','Открыть трейд')),
    pulseCard('support', tr('Support inbox','صندوق الدعم','Поддержка'), String(supportUnreadCount()), supportUnreadCount()>0 ? tr('Unread replies need your attention.','هناك ردود غير مقروءة تحتاج انتباهك.','Есть непрочитанные ответы, которые требуют внимания.') : tr('Support conversations are up to date.','محادثات الدعم محدثة حالياً.','Диалоги с поддержкой актуальны.'), '#/support', tr('Open support','فتح الدعم','Открыть поддержку')),
    pulseCard('news', tr('Platform updates','تحديثات المنصة','Обновления платформы'), String(newsUnreadCount()), newsUnreadCount()>0 ? tr('Fresh announcements and maintenance notes are waiting.','هناك إعلانات أو ملاحظات صيانة جديدة بانتظارك.','Вас ждут новые объявления и заметки о техобслуживании.') : tr('No unread announcements right now.','لا توجد إعلانات غير مقروءة حالياً.','Сейчас нет непрочитанных объявлений.'), '#/news', tr('Open news','فتح الأخبار','Открыть новости'))
  );

  return h('div',{class:'vp-page vp-home-desktop-page'},
    topBar(),
    homeHero,
    pulseGrid,
    buildRealWorkflowNotice('funding'),
    (!isTg()) ? h('div',{class:'card mb-3'},
      h('div',{class:'notice'}, 'Tip: Open the secure client area from your normal browser or inside Telegram if you still use bot workflows.')
    ) : null,
    summaryCard,
    h('div',{class:'grid cols3'},
      kpiCard(state.t('home.total_balance'), totalValEl, state.lang==='ar'?'متاح + قيد الاستخدام':state.t('wallet.available_in_use')),
      kpiCard(state.t('home.available_balance')||state.t('home.balance'), availValEl, state.lang==='ar'?'المحفظة الأساسية المتاحة':state.t('wallet.primary_free')),
      kpiCard(state.t('home.in_use_balance')||state.t('home.used_balance'), inUseValEl, state.lang==='ar'?'هامش + أصل الاستثمار':state.t('wallet.in_use_hint'))
    ),
    h('div',{class:'grid cols2 mt-2'},
      kpiCard(state.t('home.pnl_total'), pnlTotalValEl, pnlTotalSubEl),
      kpiCard(state.t('home.pnl_24h'), pnl24ValEl, pnl24SubEl)
    ),
    localBalanceCard,
    h('div',{class:'grid cols2 mt-3 vp-home-quick-grid'},
      h('div',{class:'grid vp-home-quick-col', style:'gap:12px'}, quickTrade),
      h('div',{class:'grid vp-home-quick-col', style:'gap:12px'}, quickInvest)
    ),
    h('div',{class:'grid cols3 mt-3'},
      h('div',{class:'card vp-home-panel vp-home-panel--notifications'},
        h('div',{class:'split'},
          h('div',{},
            h('div',{class:'h2', style:'margin:0 0 6px'}, tr('Notifications center','مركز التنبيهات','Центр уведомлений')),
            h('div',{class:'muted small'}, tr('One place for support replies, funding progress, verification status, and platform updates.','مكان واحد لردود الدعم وتقدم التمويل وحالة التحقق وتحديثات المنصة.','Одно место для ответов поддержки, прогресса финансирования, статуса верификации и обновлений платформы.'))
          ),
          notificationsUnreadCount() > 0 ? h('span',{class:'pill warn'}, tr('Unread','غير مقروء','Непрочитано') + ' ' + notificationsUnreadCount()) : h('span',{class:'pill'}, tr('Seen','تمت القراءة','Просмотрено'))
        ),
        ...((buildNotificationsFeed().length ? buildNotificationsFeed().slice(0,3).map(it=>h('div',{style:'padding:10px 0; border-bottom:1px solid rgba(148,163,184,.12)'},
          h('div',{class:'split'},
            h('div',{style:'font-weight:700'}, String(it.title || notificationKindLabel(it.kind))),
            h('span',{class:'pill ' + (it.kind==='support' && Number(it.unread_count||0)>0 ? 'ok' : (it.is_unread ? 'warn' : ''))}, it.kind==='support' && Number(it.unread_count||0)>0 ? ('+' + Number(it.unread_count||0)) : (it.is_unread ? tr('New','جديد','Новое') : notificationKindLabel(it.kind)))
          ),
          h('div',{class:'muted small mt-1'}, String(it.body || '').slice(0,140))
        )) : [h('div',{class:'empty', style:'margin-top:12px'}, tr('No fresh notifications yet.','لا توجد تنبيهات جديدة حتى الآن.','Пока нет новых уведомлений.'))])),
        h('div',{class:'row wrap mt-2', style:'gap:10px'},
          h('button',{class:'btn primary', onclick:async()=>{ await refreshNotificationsData(true); location.hash='#/notifications'; render(); }}, tr('Open notifications','فتح التنبيهات','Открыть уведомления')),
          h('button',{class:'btn outline', onclick:()=>{ markNotificationsSeen(); render(); }}, tr('Mark seen','تعليم كمقروء','Отметить как просмотренное'))
        )
      ),
      h('div',{class:'card vp-home-panel vp-home-panel--support'},
        h('div',{class:'split'},
          h('div',{},
            h('div',{class:'h2', style:'margin:0 0 6px'}, tr('Support inbox','صندوق الدعم','Входящие поддержки')),
            h('div',{class:'muted small'}, tr('Track unread replies and jump back into the latest operational conversation.','تابع الردود غير المقروءة وارجع مباشرة لآخر محادثة مع فريق التشغيل.','Следите за непрочитанными ответами и быстро возвращайтесь к последнему диалогу.'))
          ),
          supportUnreadCount() > 0 ? h('span',{class:'pill ok'}, tr('Unread','غير مقروء','Непрочитано') + ' ' + supportUnreadCount()) : h('span',{class:'pill'}, tr('Up to date','محدث','Актуально'))
        ),
        ...((Array.isArray(state.supportTickets) && state.supportTickets.length ? state.supportTickets.slice(0,2).map(it=>h('div',{class:'row', style:'justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid rgba(148,163,184,.12)'},
          h('div',{style:'min-width:0'},
            h('div',{style:'font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis'}, String(it.subject||it.reason_code||('Ticket #'+it.id))),
            h('div',{class:'muted small', style:'white-space:nowrap; overflow:hidden; text-overflow:ellipsis'}, String(it.last_message_preview||''))
          ),
          h('div',{class:'row wrap', style:'gap:6px; justify-content:flex-end'},
            Number(it.unread_count||0) > 0 ? h('span',{class:'pill ok'}, '+' + Number(it.unread_count||0)) : h('span',{}),
            supportStatusPill(it.status)
          )
        )) : [h('div',{class:'empty', style:'margin-top:12px'}, tr('No support tickets yet.','لا توجد تذاكر دعم حتى الآن.','Пока нет тикетов поддержки.'))])),
        h('div',{class:'row wrap mt-2', style:'gap:10px'},
          h('button',{class:'btn primary', onclick:()=>location.hash='#/support'}, state.t('support.title')),
          h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, tr('Create ticket','إنشاء تذكرة','Создать тикет'))
        )
      ),
      h('div',{class:'card news-dashboard-card vp-home-panel vp-home-panel--news'},
        h('div',{class:'split'},
          h('div',{},
            h('div',{class:'h2', style:'margin:0 0 6px'}, tr('Latest announcements','آخر الإعلانات','Последние объявления')),
            h('div',{class:'muted small'}, tr('Keep up with platform changes, maintenance windows, and product updates from the dashboard itself.','تابع تحديثات المنصة ونوافذ الصيانة وتغييرات المنتج من لوحة العميل نفسها.','Следите за изменениями платформы, окнами техобслуживания и обновлениями продукта прямо из панели клиента.'))
          ),
          newsUnreadCount() > 0 ? h('span',{class:'pill warn'}, tr('New','جديد','Новое') + ' ' + newsUnreadCount()) : h('span',{class:'pill'}, tr('Seen','تمت القراءة','Просмотрено'))
        ),
        ...((Array.isArray(state.newsFeed) && state.newsFeed.length ? state.newsFeed.slice(0,2).map(it=>h('button',{class:'news-dashboard-row', type:'button', onclick:()=>{ markNewsSeen(); location.hash = `#/news?id=${encodeURIComponent(String(it?.id || ''))}`; render(); }},
          it?.image_url ? h('div',{class:'news-dashboard-media'}, h('img',{src:String(it.image_url), alt:String(it.title || 'News')})) : h('div',{class:'news-dashboard-media news-dashboard-media--placeholder'}, '✦'),
          h('div',{class:'news-dashboard-copy'},
            h('div',{class:'split', style:'gap:10px; align-items:flex-start'},
              h('div',{style:'font-weight:800'}, String(it.title||'Update')),
              Number(it.pinned||0) === 1 ? h('span',{class:'pill ok'}, tr('Pinned','مثبت','Закреплено')) : h('span',{})
            ),
            h('div',{class:'muted small mt-1'}, String(it.excerpt || it.body || '').slice(0,140)),
            h('div',{class:'muted small mt-1'}, [String(it.source_label || tr('Platform updates','تحديثات المنصة','Обновления платформы')), new Date((Number(it.published_at||it.updated_at||0)||0)*1000).toLocaleString()].filter(Boolean).join(' • '))
          )
        )) : [h('div',{class:'empty', style:'margin-top:12px'}, tr('No announcements published yet.','لا توجد إعلانات منشورة حتى الآن.','Пока нет опубликованных объявлений.'))])),
        h('div',{class:'row wrap mt-2', style:'gap:10px'},
          h('button',{class:'btn primary', onclick:()=>{ markNewsSeen(); location.hash='#/news'; render(); }}, tr('Open news','فتح الأخبار','Открыть новости')),
          h('button',{class:'btn outline', onclick:async()=>{ await refreshNewsFeed(true); render(); }}, state.t('common.refresh'))
        )
      )
    ),

    // License block at the bottom (opens the official license PDF)
    h('div',{class:'card mt-3', onclick:openLicense, dir:(state.lang==='ar'?'rtl':'ltr'), style:'cursor:pointer;'+(state.lang==='ar'?'direction:rtl;text-align:right;':'' )},
      h('div',{class:'row', style:'gap:12px; align-items:center;'+(state.lang==='ar'?'flex-direction:row-reverse;':'' )},
        h('div',{style:'width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);'},
          h('img',{src:'assets/img/uae_flag.svg', alt:'UAE', style:'width:28px;height:28px;border-radius:50%;object-fit:cover'})
        ),
        h('div',{class:'flex-1'},
          h('div',{class:'h2', style:'margin:0;'}, state.t('license.title')),
          h('div',{class:'muted small'}, state.t('license.desc'))
        )
      ),
      h('div',{class:'row mt-2', style:'justify-content:center;'},
        h('button',{class:'btn primary', onclick:openLicense}, state.t('license.button'))
      )
    )
  );
}

function marketsPage(){
  let items = state.markets || [];
  let sortMode = localStorage.getItem('markets_sort') || 'change_desc';
  const q = h('input',{class:'input', placeholder: state.t('markets.search')});
  const list = h('div',{});
  const rowMap = new Map(); // symbol -> {itemEl,priceEl,badgeEl,lastPx,idx}
  let builtTerm = null;
  let alive = true;
  let hydrateWave = 0;
  let pollTimer = null;
  let pollChunkIdx = 0;
  let cascadeTimer = null;
  let fetchBusy = false;
  let observer = null;
  let visibleOrder = [];
  let visibleSet = new Set();
  const __isNonCryptoMarkets = normalizeLiveAssetType(state.selectedAssetType || 'crypto') !== 'crypto';
  const FIRST_BATCH_SIZE = __isNonCryptoMarkets
    ? Math.max(3, Math.min(6, Number(window.__MARKETS_FIRST_BATCH_SIZE_NONCRYPTO || 4) || 4))
    : Math.max(8, Math.min(20, Number(window.__MARKETS_FIRST_BATCH_SIZE || 12) || 12));
  const BATCH_SIZE = __isNonCryptoMarkets
    ? Math.max(FIRST_BATCH_SIZE, Math.min(6, Number(window.__MARKETS_BATCH_SIZE_NONCRYPTO || 4) || 4))
    : Math.max(FIRST_BATCH_SIZE, Math.min(24, Number(window.__MARKETS_BATCH_SIZE || 20) || 20));
  const MAX_ROWS = 100;
  let quotePaintTimer = null;
  let lastQuotePaintAt = 0;

  const sortOptions = [
    {value:'change_desc', label: tr('Top movers','الأكثر حركة','Топ движение')},
    {value:'change_asc', label: tr('Largest drops','أكبر هبوط','Крупнейшее падение')},
    {value:'symbol', label: tr('A–Z','أ–ي','А–Я')},
    {value:'price_desc', label: tr('Highest price','أعلى سعر','Наивысшая цена')}
  ];

  const switchAssetType = (nextType)=>{
    nextType = String(nextType||'crypto');
    if (nextType === state.selectedAssetType) return;
    state.selectedAssetType = nextType;
    const warm = warmMarketsFromLocal(nextType);
    if (warm && warm.length) state.markets = warm;
    render();
    Promise.resolve().then(async ()=>{
      try{
        await refreshMarkets({type: nextType, lite: true, withQuotes: nextType !== 'crypto', applyToState: true, warm: false});
        if (state.selectedAssetType === nextType) render();
      }catch(e){}
    });
  };

  const tabs = h('div',{class:'row mb-2 wrap markets-tabs'},
    h('button',{class:'btn'+(state.selectedAssetType==='crypto'?' primary':''), onclick:()=>switchAssetType('crypto')}, state.t('markets.crypto')),
    h('button',{class:'btn'+(state.selectedAssetType==='futures'?' primary':''), onclick:()=>switchAssetType('futures')}, tr('Perpetual','العقود الدائمة','Бессрочные')),
    h('button',{class:'btn'+(state.selectedAssetType==='forex'?' primary':''), onclick:()=>switchAssetType('forex')}, state.t('markets.fx')),
    h('button',{class:'btn'+(state.selectedAssetType==='stocks'?' primary':''), onclick:()=>switchAssetType('stocks')}, state.t('markets.stocks')),
    h('button',{class:'btn'+(state.selectedAssetType==='arab'?' primary':''), onclick:()=>switchAssetType('arab')}, tr('Arab Stocks','الأسهم العربية','Арабские акции')),
    h('button',{class:'btn'+(state.selectedAssetType==='commodities'?' primary':''), onclick:()=>switchAssetType('commodities')}, state.t('markets.commodities'))
  );

  const sortButtons = h('div',{class:'sort-strip'});
  const updateSortButtons = ()=>{
    sortButtons.innerHTML = '';
    sortOptions.forEach(opt=>{
      sortButtons.appendChild(
        h('button',{
          class:'sort-chip'+(sortMode===opt.value?' active':''),
          onclick:()=>{
            sortMode = opt.value;
            try{ localStorage.setItem('markets_sort', sortMode); }catch(e){}
            paint(true);
            startBatchHydration();
          }
        }, opt.label)
      );
    });
  };

  function sortItems(src){
    const arr = [...(src||[])];
    arr.sort((a,b)=>{
      const ac = Number(a?.change_pct || 0);
      const bc = Number(b?.change_pct || 0);
      const ap = Number(a?.price || 0);
      const bp = Number(b?.price || 0);
      const as = String(a?.symbol||'');
      const bs = String(b?.symbol||'');
      if(sortMode==='change_asc') return ac - bc || as.localeCompare(bs);
      if(sortMode==='symbol') return as.localeCompare(bs);
      if(sortMode==='price_desc') return bp - ap || as.localeCompare(bs);
      return bc - ac || as.localeCompare(bs);
    });
    const selected = String(state.selectedSymbol || '').toUpperCase();
    const idx = arr.findIndex(x=>String(x?.symbol||'').toUpperCase()===selected);
    if(idx > 0){
      const [hit] = arr.splice(idx,1);
      arr.unshift(hit);
    }
    return arr;
  }

  function filteredItems(){
    const term = (q.value||'').trim().toUpperCase();
    const src = sortItems(items || (state.markets||[]));
    return src.filter(x=>!term || String(x.symbol||'').includes(term) || String(x.name||'').toUpperCase().includes(term)).slice(0, MAX_ROWS);
  }

  function marketSnapshot(){
    const src = Array.isArray(items) ? items : [];
    const filtered = filteredItems();
    const pos = src.filter(x=>Number(x?.change_pct||0) > 0).length;
    const neg = src.filter(x=>Number(x?.change_pct||0) < 0).length;
    return {
      total: src.length,
      shown: filtered.length,
      gainers: pos,
      losers: neg,
      signals: src.reduce((acc, x)=>acc + Number(x?.signal_count || 0), 0)
    };
  }

  function persistCurrentItems(){
    persistMarketsLocal(state.selectedAssetType, items || []);
  }

  function rebuildVisiblePriority(){
    const filtered = filteredItems();
    const all = filtered.map(x=>String(x.symbol||'')).filter(Boolean);
    const vis = visibleOrder.filter(sym => visibleSet.has(sym) && rowMap.has(sym));
    const rest = all.filter(sym => !visibleSet.has(sym));
    visibleOrder = vis.concat(rest);
  }

  function setupVisibilityObserver(){
    try{ if(observer) observer.disconnect(); }catch(e){}
    observer = null;
    visibleSet = new Set();
    visibleOrder = filteredItems().map(x=>String(x.symbol||'')).filter(Boolean);
    if(!('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver((entries)=>{
      let changed = false;
      for(const entry of entries){
        const sym = String(entry?.target?.dataset?.symbol || '');
        if(!sym) continue;
        if(entry.isIntersecting){
          if(!visibleSet.has(sym)){
            visibleSet.add(sym);
            visibleOrder = visibleOrder.filter(x=>x!==sym);
            visibleOrder.unshift(sym);
            changed = true;
          }
        } else if(visibleSet.has(sym)) {
          visibleSet.delete(sym);
          changed = true;
        }
      }
      if(changed) rebuildVisiblePriority();
    }, {root: null, rootMargin: '220px 0px 320px 0px', threshold: 0.01});

    for(const [sym, ref] of rowMap.entries()){
      try{
        if(ref?.itemEl) observer.observe(ref.itemEl);
        if(ref?.idx < FIRST_BATCH_SIZE){
          visibleSet.add(sym);
        }
      }catch(e){}
    }
    rebuildVisiblePriority();
  }

  function buildList(){
    rowMap.clear();
    list.innerHTML='';
    builtTerm = (q.value||'').trim().toUpperCase();

    const filtered = filteredItems();
    visibleSet = new Set();
    visibleOrder = filtered.map(x=>String(x.symbol||'')).filter(Boolean);

    if(!filtered.length){
      list.appendChild(h('div',{class:'empty-state'}, state.t('common.no_results')));
      return;
    }

    const wrap = h('div',{class:'mkt-list'});
    filtered.forEach((x, idx)=>{
      const sym = String(x.symbol||'');
      const ch = Number(x.change_pct||0);
      const px = Number(x.price)||0;
      const priceTxt = `\$${fmt(px, px<1?6:2)}`;
      const selected = String(state.selectedSymbol||'').toUpperCase() === sym.toUpperCase();

      const priceEl = h('div',{class:'mkt-price'}, priceTxt);
      const badgeEl = h('span',{class:(ch>0?'badge up':(ch<0?'badge down':'badge'))}, `${ch>0?'+':''}${fmt(ch,2)}%`);
      const signalCount = Number(x.signal_count || 0);

      const openTrade = ()=>{
        try{
          if(typeof window.vpApplyTradeSelection === 'function' && window.vpApplyTradeSelection(x)) return;
        }catch(_err){}
        const nextType = String(x.type || state.selectedAssetType || 'crypto').toLowerCase();
        const nextMarket = String((x.market || x.market_type || ((nextType==='crypto' || nextType==='futures') ? 'perp' : 'spot'))).toLowerCase();
        syncTradeRouteIntoState({ symbol:sym, type:nextType, market:nextMarket, watch:'', ticket:'positions', search:'' });
        state.__tradeSeedQuote = {symbol:sym, type:nextType, market:nextMarket, price:x.price, change_pct:x.change_pct, updated_at:x.updated_at||0, source:'selection_seed'};
        try{
          if(typeof window.vpCommitTradeRoute === 'function') window.vpCommitTradeRoute({ symbol:sym, type:nextType, market:nextMarket }, { source:'market_list' });
          else location.hash = `#/trade?symbol=${encodeURIComponent(sym)}&type=${encodeURIComponent(nextType)}&market=${encodeURIComponent(nextMarket)}`;
        }catch(_e){
          location.hash = `#/trade?symbol=${encodeURIComponent(sym)}&type=${encodeURIComponent(nextType)}&market=${encodeURIComponent(nextMarket)}`;
        }
      };
      const item = h('div',{class:'mkt-item'+(selected?' selected':''), 'data-symbol': sym, role:'button', tabIndex:0, onclick:openTrade, onkeydown:(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openTrade(); } }},
        h('div',{class:'mkt-row'},
          h('div',{class:'mkt-left'},
            h('div',{class:'mkt-sym truncate'}, sym),
            h('div',{class:'muted tiny truncate'}, x.name||''),
            h('div',{class:'mkt-tags'},
              h('span',{class:'mkt-tag'}, assetTypeLabel(x.type)),
              signalCount>0 ? h('span',{class:'mkt-tag signal'}, `${tr('Signals','إشارات','Сигналы')}: ${signalCount}`) : null,
              selected ? h('span',{class:'mkt-tag active'}, tr('Selected','محدد','Выбрано')) : null
            )
          ),
          h('div',{class:'mkt-right'},
            priceEl,
            badgeEl
          )
        ),
        h('div',{class:'mkt-actions mt-2'},
          h('span',{class:'muted tiny'}, selected
            ? tr('This symbol is already selected for the trade screen.','هذا الرمز محدد بالفعل لشاشة التداول.','Этот символ уже выбран для экрана торговли.')
            : tr('Tap to open the full trade ticket for this instrument.','اضغط لفتح تذكرة التداول الكاملة لهذه الأداة.','Нажмите, чтобы открыть полный торговый тикет по этому инструменту.')),
          h('button',{class:'btn primary small', onclick:(e)=>{ e.stopPropagation(); openTrade(); }}, state.t('nav.trade'))
        )
      );
      rowMap.set(sym, {itemEl:item, priceEl, badgeEl, lastPx: px, idx});
      if(idx < FIRST_BATCH_SIZE) visibleSet.add(sym);
      wrap.appendChild(item);
    });

    list.appendChild(wrap);
    setupVisibilityObserver();
  }

  function updateVisibleRows(){
    const src = items || (state.markets||[]);
    for(const x of src){
      const sym = String(x.symbol||'');
      const ref = rowMap.get(sym);
      if(!ref) continue;

      const px = Number(x.price)||0;
      const prev = (ref.lastPx!==undefined && ref.lastPx!==null && isFinite(ref.lastPx)) ? Number(ref.lastPx) : null;
      ref.lastPx = px;

      ref.priceEl.textContent = `\$${fmt(px, px<1?6:2)}`;
      if(prev!==null && px!==prev){
        ref.priceEl.classList.toggle('up', px > prev);
        ref.priceEl.classList.toggle('down', px < prev);
      }

      const ch = Number(x.change_pct||0);
      ref.badgeEl.textContent = `${ch>0?'+':''}${fmt(ch,2)}%`;
      ref.badgeEl.className = ch>0 ? 'badge up' : (ch<0 ? 'badge down' : 'badge');
    }
  }

  function paint(force=false){
    const term = (q.value||'').trim().toUpperCase();
    if(force || builtTerm === null || term !== builtTerm){
      buildList();
    } else {
      updateVisibleRows();
    }
  }

  function scheduleListPaint(force=false){
    const normType = normalizeLiveAssetType(state.selectedAssetType || 'crypto');
    const minGap = normType === 'crypto' ? 120 : 420;
    const delay = normType === 'crypto' ? 80 : 240;
    const now = Date.now();
    if(force && (now - lastQuotePaintAt) >= minGap){
      lastQuotePaintAt = now;
      paint(true);
      return;
    }
    if(quotePaintTimer) return;
    quotePaintTimer = setTimeout(()=>{
      quotePaintTimer = null;
      lastQuotePaintAt = Date.now();
      paint(false);
    }, delay);
  }

  function quoteChunks(){
    const filtered = filteredItems();
    const ordered = [];
    const seen = new Set();

    for(const sym of visibleOrder){
      if(sym && !seen.has(sym) && rowMap.has(sym)){
        ordered.push(sym);
        seen.add(sym);
      }
    }

    for(const x of filtered){
      const sym = String(x.symbol||'');
      if(sym && !seen.has(sym)){
        ordered.push(sym);
        seen.add(sym);
      }
    }

    if(!ordered.length) return [];
    const out = [];
    out.push(ordered.slice(0, FIRST_BATCH_SIZE));
    for(let i=FIRST_BATCH_SIZE; i<ordered.length; i+=BATCH_SIZE){
      out.push(ordered.slice(i, i+BATCH_SIZE));
    }
    return out.filter(chunk => Array.isArray(chunk) && chunk.length);
  }

  function mergeQuoteItems(quoteItems){
    if(!Array.isArray(quoteItems) || !quoteItems.length) return;
    const bySym = new Map();
    for(const q of quoteItems){
      const sym = String(q?.symbol||'').toUpperCase();
      if(sym){
        try{ vpRememberLiveQuote(q); }catch(e){}
        bySym.set(sym, q);
      }
    }
    if(!bySym.size) return;

    let changed = false;
    items = (items || []).map(x=>{
      const sym = String(x.symbol||'').toUpperCase();
      const q = bySym.get(sym);
      if(!q) return x;
      changed = true;
      const inferredMarket = resolveLiveMarketForSymbol(String(x?.symbol || ''), String(x?.type || ''), String(x?.market || x?.market_type || ((String(x?.type || '').toLowerCase()==='crypto') ? 'perp' : 'spot')));
      const nextPrice = safeNum((resolveQuoteLivePrice(q, inferredMarket, q?.type || x?.type || state.selectedAssetType) || Number(q?.price ?? x?.price ?? 0)), safeNum(x.price, 0));
      const nextChange = safeNum(q.change_pct ?? x.change_pct ?? 0, safeNum(x.change_pct, 0));
      const nextUpdated = safeNum(q.updated_at ?? x.updated_at ?? 0, safeNum(x.updated_at, 0));
      return vpMergeMarketItemAuthority(x, Object.assign({}, q, {
        symbol: sym,
        type: x?.type || q?.type || state.selectedAssetType || 'crypto',
        market: inferredMarket,
        price: nextPrice,
        change_pct: nextChange,
        updated_at: nextUpdated,
        source: String(q?.source || q?.provider || x?.source || '')
      }), x?.type || state.selectedAssetType || 'crypto');
    });
    if(!changed) return;
    state.markets = items;
    persistCurrentItems();
    scheduleListPaint(false);
  }

  async function fetchQuoteChunk(chunk, ttlMs){
    if(!alive || fetchBusy || !Array.isArray(chunk) || !chunk.length) return;
    fetchBusy = true;
    try{
      const itemPool = Array.isArray(items) && items.length ? items : (Array.isArray(state.markets) ? state.markets : []);
      const fallbackMarket = String(state.selectedMarket || (((state.selectedAssetType === 'crypto') || (state.selectedAssetType === 'futures')) ? 'perp' : 'spot') || 'spot');
      const groups = new Map();
      chunk.forEach(symRaw=>{
        const sym = String(symRaw || '').toUpperCase();
        if(!sym) return;
        const existing = itemPool.find(it => String(it?.symbol || '').toUpperCase() === sym)
          || (Array.isArray(state.markets) ? state.markets.find(it => String(it?.symbol || '').toUpperCase() === sym) : null)
          || (typeof resolveTradeSymbolSeed === 'function' ? resolveTradeSymbolSeed(sym, state.selectedAssetType) : null);
        const type = normalizeLiveAssetType(existing?.type || state.selectedAssetType || 'crypto');
        const market = resolveLiveMarketForSymbol(sym, type, String(existing?.market || existing?.market_type || fallbackMarket));
        const key = `${type}:${market}`;
        if(!groups.has(key)) groups.set(key, {type, market, symbols:[]});
        groups.get(key).symbols.push(sym);
      });

      let pulled = [];
      for(const group of groups.values()){
        const symbols = [...new Set(group.symbols)].filter(Boolean);
        if(!symbols.length) continue;
        try{
          if(group.type === 'crypto'){
            const resp = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(group.type)}&market=${encodeURIComponent(group.market)}&symbols=${encodeURIComponent(symbols.join(','))}&_=${Date.now()}`);
            const liveItems = resp?.quotes && typeof resp.quotes === 'object' ? Object.values(resp.quotes) : [];
            if(Array.isArray(liveItems) && liveItems.length) pulled = pulled.concat(liveItems);
          }
        }catch(err){}
      }

      if(groups.size){
        for(const group of groups.values()){
          const symbols = [...new Set(group.symbols)].filter(Boolean);
          if(!symbols.length) continue;
          const groupTypeNorm = normalizeLiveAssetType(group.type);
          try{
            if(groupTypeNorm === 'crypto'){
              const path = `/quotes.php?fresh=1&type=${encodeURIComponent(group.type)}&symbols=${encodeURIComponent(symbols.join(','))}`;
              const r = await apiGetCachedStale(path, Math.min(ttlMs, 550), { timeoutMs: 5000 });
              const quoteItems = Array.isArray(r?.items) ? r.items : [];
              if(quoteItems.length) pulled = pulled.concat(quoteItems);
            }else{
              const hasVisibleSymbols = symbols.some(sym => visibleSet.has(sym));
              const useVisibleLive = hasVisibleSymbols && symbols.length <= 6;
              const useDirectLive = useVisibleLive && symbols.length === 1;
              const batchTimeout = groupTypeNorm === 'forex' ? 6000 : (['stocks','arab'].includes(groupTypeNorm) ? 7000 : (groupTypeNorm === 'commodities' ? 6500 : (groupTypeNorm === 'futures' ? 6200 : 4500)));
              const livePath = `/quotes.php?type=${encodeURIComponent(groupTypeNorm)}&symbols=${encodeURIComponent(symbols.join(','))}${useDirectLive ? '&direct=1' : '&visible=1'}`;
              const staleMs = useVisibleLive
                ? (groupTypeNorm === 'commodities' ? 500 : (groupTypeNorm === 'forex' ? 600 : 700))
                : (groupTypeNorm === 'forex' ? 1800 : (groupTypeNorm === 'commodities' ? 1400 : 1600));
              const qr = await apiGetCachedStale(livePath, staleMs, { timeoutMs: batchTimeout });
              const quoteItems = Array.isArray(qr?.items) ? qr.items : [];
              if(quoteItems.length) pulled = pulled.concat(quoteItems);
            }
          }catch(e){}
        }
      }
      if(!alive) return;
      mergeQuoteItems(pulled || []);
    }catch(e){
      // ignore: keep last prices on screen
    }finally{
      fetchBusy = false;
    }
  }

  function startBatchHydration(){
    hydrateWave++;
    const wave = hydrateWave;
    pollChunkIdx = 0;
    try{ if(cascadeTimer) clearTimeout(cascadeTimer); }catch(e){}
    try{ if(pollTimer) clearInterval(pollTimer); }catch(e){}

    const typeNorm = normalizeLiveAssetType(state.selectedAssetType || 'crypto');

    if(typeNorm !== 'crypto'){
      const onTradeRoute = String(location.hash || '').indexOf('#/trade') === 0;
      const refreshNonCrypto = async(force=false)=>{
        if(!alive || wave !== hydrateWave || (isEffectivelyHidden() && !force)) return;
        try{
          const next = await refreshMarkets({ type:typeNorm, lite:true, withQuotes:false, applyToState:true, warm:false, ttlMs: force ? 0 : 1800 });
          if(!alive || wave !== hydrateWave) return;
          const beforeSig = vpLiteMarketSignature(items || []);
          items = vpMergeMarketItemsByKeyLite(items || [], Array.isArray(next) ? next : (state.markets || items));
          state.markets = items;
          const afterSig = vpLiteMarketSignature(items || []);
          if(beforeSig !== afterSig) scheduleListPaint(true);
          const chunks = quoteChunks();
          if(chunks.length){
            const firstChunk = chunks[0] || [];
            if(firstChunk.length) await fetchQuoteChunk(firstChunk, force ? 300 : 900);
          }
        }catch(e){}
      };
      refreshNonCrypto(true);
      if(onTradeRoute){
        pollTimer = setInterval(async ()=>{
          if(!alive || wave !== hydrateWave || isEffectivelyHidden()) return;
          const chunks = quoteChunks();
          const firstChunk = chunks[0] || [];
          if(firstChunk.length) await fetchQuoteChunk(firstChunk, typeNorm === 'forex' ? 900 : (typeNorm === 'commodities' ? 850 : 1200));
        }, typeNorm === 'forex' ? 2200 : (typeNorm === 'commodities' ? 2000 : (typeNorm === 'futures' ? 2300 : 2600)));
        return;
      }
      const runCascade = async(idx=0)=>{
        if(!alive || wave !== hydrateWave) return;
        const chunks = quoteChunks();
        if(!chunks.length || idx >= chunks.length) return;
        await fetchQuoteChunk(chunks[idx], idx === 0 ? 700 : 950);
        if(!alive || wave !== hydrateWave) return;
        cascadeTimer = setTimeout(()=>{ runCascade(idx + 1); }, idx === 0 ? 180 : 320);
      };
      runCascade(1);
      pollTimer = setInterval(async ()=>{
        if(!alive || wave !== hydrateWave || isEffectivelyHidden()) return;
        const chunks = quoteChunks();
        if(!chunks.length) return;
        const idx = pollChunkIdx % chunks.length;
        pollChunkIdx = (pollChunkIdx + 1) % chunks.length;
        await fetchQuoteChunk(chunks[idx] || [], typeNorm === 'commodities' ? 850 : (typeNorm === 'forex' ? 900 : 1200));
      }, typeNorm === 'forex' ? 2600 : (typeNorm === 'commodities' ? 2300 : (typeNorm === 'futures' ? 2800 : 3200)));
      return;
    }

    const runCascade = async(idx=0)=>{
      if(!alive || wave !== hydrateWave) return;
      const chunks = quoteChunks();
      if(!chunks.length || idx >= chunks.length) return;
      const ttlMs = (idx === 0) ? 80 : 200;
      await fetchQuoteChunk(chunks[idx], ttlMs);
      if(!alive || wave !== hydrateWave) return;
      cascadeTimer = setTimeout(()=>{ runCascade(idx + 1); }, idx === 0 ? 45 : 90);
    };

    runCascade(0);

    pollTimer = setInterval(async ()=>{
      if(!alive || wave !== hydrateWave || isEffectivelyHidden()) return;
      const chunks = quoteChunks();
      if(!chunks.length) return;
      const idx = pollChunkIdx % chunks.length;
      pollChunkIdx = (pollChunkIdx + 1) % chunks.length;
      const currentChunk = chunks[idx] || [];
      const hasVisible = currentChunk.some(sym => visibleSet.has(sym));
      const ttlMs = hasVisible ? 260 : 520;
      await fetchQuoteChunk(currentChunk, ttlMs);
    }, 1800);
  }

  q.addEventListener('input', ()=>{
    paint(true);
    startBatchHydration();
  });

  if(!items.length){
    const warm = warmMarketsFromLocal(state.selectedAssetType);
    if (warm && warm.length){
      items = warm;
      state.markets = warm;
    } else {
      Promise.resolve().then(async ()=>{
        try{
          await refreshMarkets({type: state.selectedAssetType, lite: true, withQuotes: state.selectedAssetType !== 'crypto', applyToState: true, warm: false});
          if(!alive) return;
          items = state.markets || items;
          paint(true);
          startBatchHydration();
        }catch(e){}
      });
    }
  }

  setTimeout(()=>{
    if(!alive) return;
    items = state.markets || items;
    updateSortButtons();
    paint(true);
    startBatchHydration();
  }, 0);

  onCleanup(()=>{
    alive = false;
    try{ if(observer) observer.disconnect(); }catch(e){}
    observer = null;
    try{ if(cascadeTimer) clearTimeout(cascadeTimer); }catch(e){}
    try{ if(pollTimer) clearInterval(pollTimer); }catch(e){}
  });

  const snap = marketSnapshot();
  const hero = pageHero({
    eyebrow: tr('Market board','لوحة الأسواق','Рыночная панель'),
    title: state.t('markets.title'),
    subtitle: tr(
      'Browse one market type at a time, search quickly, sort the board, and jump directly to the trade ticket of the selected instrument.',
      'استعرض نوع سوق واحد في كل مرة، وابحث بسرعة، ورتب اللوحة، ثم انتقل مباشرة إلى تذكرة التداول للأداة المختارة.',
      'Просматривайте по одному типу рынка, быстро ищите, сортируйте доску и сразу переходите к торговому тикету выбранного инструмента.'
    ),
    actions: [
      h('button',{class:'btn primary', onclick:()=>location.hash='#/trade'}, state.t('nav.trade')),
      h('button',{class:'btn', onclick:async()=>{
        try{ await refreshMarkets({type: state.selectedAssetType, lite: true, withQuotes: true, applyToState: true, warm: true, ttlMs: 0}); }catch(e){}
        items = state.markets || items;
        paint(true);
        startBatchHydration();
      }}, state.t('common.refresh'))
    ],
    aside: h('div',{class:'mini-stat-grid'},
      miniStatCard(tr('Showing','المعروض','Показано'), String(snap.shown), `${assetTypeLabel(state.selectedAssetType)}`),
      miniStatCard(tr('Gainers','المرتفعة','Рост'), String(snap.gainers), tr('Positive change','تغير إيجابي','Положительное изменение'), snap.gainers>0?'good':''),
      miniStatCard(tr('Losers','الهابطة','Падение'), String(snap.losers), tr('Negative change','تغير سلبي','Отрицательное изменение'), snap.losers>0?'warn':''),
      miniStatCard(tr('Signals','الإشارات','Сигналы'), String(snap.signals), tr('Active trade ideas','أفكار تداول نشطة','Активные торговые идеи'))
    )
  });

  updateSortButtons();

  return h('div',{},
    topBar(),
    hero,
    h('div',{class:'card section-card'},
      h('div',{class:'section-card-head'},
        h('div',{},
          h('div',{class:'h2'}, tr('Browse instruments','استعراض الأدوات','Просмотр инструментов')),
          h('div',{class:'muted small'}, tr('Switch the market type, search by symbol, or reorder the board to focus on movers first.','بدّل نوع السوق، وابحث بالرمز، أو أعد ترتيب اللوحة للتركيز على الأكثر حركة أولاً.','Переключайте тип рынка, ищите по символу или меняйте сортировку, чтобы видеть самые активные инструменты в начале.'))
        ),
        h('span',{class:'pill'}, `${tr('Sort','الترتيب','Сортировка')}: ${sortOptions.find(x=>x.value===sortMode)?.label || '—'}`)
      ),
      tabs,
      h('div',{class:'market-controls-card'},
        h('div',{class:'market-search-row'},
          q,
          h('button',{class:'btn secondary', onclick:()=>{ q.value=''; paint(true); startBatchHydration(); }}, tr('Clear','مسح','Очистить'))
        ),
        sortButtons
      ),
      h('div',{class:'mt-3'}, list)
    )
  );
}


/* =========================
   Trade Page v3 (Canvas + Kline WS + DB Logs)
   - No TradingView / no lightweight-charts
   - Live kline stream from Binance (spot/futures)
   - Orders/Deals logs pulled from backend (DB)
   ========================= */

function rafBatch(fn){
  let queued = false;
  let lastArgs = null;
  return function(...args){
    lastArgs = args;
    if(queued) return;
    queued = true;
    requestAnimationFrame(()=>{
      queued = false;
      try{ fn.apply(null, lastArgs || []); }catch(e){}
    });
  };
}

function cssVar(name, fallback){
  try{
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    if(v && v.trim()!=='') return v.trim();
  }catch(e){}
  return fallback;
}

function fmtTs(tsSec){
  const d = new Date((Number(tsSec)||0)*1000);
  if(!Number.isFinite(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

function fmtDate(tsSec){
  const d = new Date((Number(tsSec)||0)*1000);
  if(!Number.isFinite(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function safeNum(x, fallback=0){
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function buildBinanceWsUrl(symbol, marketType, interval){
  // Shared-hosting + Telegram WebView friendly: disable direct Binance WS
  return null;
}

function tradeChartCandlesSignature(items){
  const list = Array.isArray(items) ? items : [];
  const len = list.length;
  if(!len) return '0';
  const first = list[0] || {};
  const last = list[len - 1] || {};
  const firstTime = safeNum(first?.time, 0);
  const lastTime = safeNum(last?.time, 0);
  const lastClose = safeNum(last?.close, 0);
  const roundedClose = lastClose > 0 ? Number(lastClose).toFixed(lastClose < 1 ? 8 : 4) : '0';
  return `${len}:${firstTime}:${lastTime}:${roundedClose}`;
}

function _buildBinanceWsUrl_disabled(symbol, marketType, interval){
  const sym = (symbol||'').toLowerCase();
  const tf = interval || '1m';
  const isPerp = String(marketType||'spot').toLowerCase()==='perp';
  const base = isPerp ? 'wss://fstream.binance.com/ws' : 'wss://stream.binance.com:9443/ws';
  return `${base}/${sym}@kline_${tf}`;
}

class TradeCanvasChart{
  constructor(canvas, opts={}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.candles = [];
    this.lastPrice = null;
    this._candlesSig = '0';
    this._lastPriceDrawTs = 0;

    // viewport / panning (show older candles by dragging horizontally)
    this.view = {
      window: 180,
      offset: 0,
      minWindow: 72,
      maxWindow: 420,
    };
    this._lastGoodSize = { width: 0, height: 0 };
    this.onNeedMore = (typeof opts.onNeedMore === 'function') ? opts.onNeedMore : null;
    this._pan = {down:false, x0:0, off0:0, moved:false};

    // toggles (controlled by toolbar)
    this.opts = {
      crosshair: true,
      ma: false,
      ema: false,
    };

    // crosshair state: tap to lock/unlock (doesn't kill page scroll)
    this.cross = { active:false, locked:false, x:0, y:0 };

    this._drawBatched = rafBatch(()=>this._draw());
    this.resize();

    // Redraw immediately when theme variables change (prevents "dark chart on light mode")
    this._onThemeChange = ()=>{ try{ this._drawBatched(); }catch(e){} };
    window.addEventListener('themechange', this._onThemeChange, {passive:true});

    // tap-to-toggle crosshair lock
    this._onTap = (e)=>{
      if(!this.opts.crosshair) return;
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left);
      const y = (e.clientY - r.top);
      if(this.cross.locked){
        this.cross.locked = false;
        this.cross.active = false;
      }else{
        this.cross.x = x;
        this.cross.y = y;
        this.cross.active = true;
        this.cross.locked = true;
      }
      this._drawBatched();
    };
    canvas.addEventListener('click', this._onTap, {passive:true});
    canvas.style.touchAction = 'pan-y';

    // pointer-based horizontal pan
    this._onDown = (e)=>{
      try{ this.canvas.setPointerCapture(e.pointerId); }catch(_){ }
      this._pan.down = true;
      this._pan.x0 = e.clientX;
      this._pan.off0 = this.view.offset;
      this._pan.moved = false;
    };
    this._onMove = (e)=>{
      if(!this._pan.down) return;
      const dx = (e.clientX - this._pan.x0);
      if(Math.abs(dx) > 6) this._pan.moved = true;
      const rect = this.canvas.getBoundingClientRect();
      const cw = Math.max(1, rect.width - 64 - 12*2);
      const shown = Math.max(this.view.minWindow, Math.min(this.view.maxWindow, this.view.window));
      const pxPerCandle = cw / Math.max(30, shown);
      // Drag right => show older candles (increase offset). Drag left => show newer.
      const delta = Math.round((dx) / Math.max(2, pxPerCandle));
      const maxOff = Math.max(0, this.candles.length - shown);
      const next = Math.max(0, Math.min(maxOff, this._pan.off0 + delta));
      if(next !== this.view.offset){
        this.view.offset = next;
        if(this.onNeedMore && this.view.offset >= maxOff - 2){
          try{ this.onNeedMore(); }catch(_){ }
        }
        this._drawBatched();
      }
    };
    this._onUp = ()=>{ this._pan.down = false; };
    canvas.addEventListener('pointerdown', this._onDown, {passive:true});
    canvas.addEventListener('pointermove', this._onMove, {passive:true});
    canvas.addEventListener('pointerup', this._onUp, {passive:true});
    canvas.addEventListener('pointercancel', this._onUp, {passive:true});

    // keep crisp on resize
    this.ro = new ResizeObserver(()=>{ this.resize(); this._drawBatched(); });
    this.ro.observe(canvas);
    this._viewportResize = ()=>{ try{ this.resize(); this._drawBatched(); }catch(e){} };
    try{ window.addEventListener('resize', this._viewportResize, {passive:true}); }catch(e){}
    try{ window.addEventListener('orientationchange', this._viewportResize, {passive:true}); }catch(e){}
    try{ if(window.visualViewport){ window.visualViewport.addEventListener('resize', this._viewportResize, {passive:true}); window.visualViewport.addEventListener('scroll', this._viewportResize, {passive:true}); } }catch(e){}
  }

  setOptions(partial){
    if(!partial) return;
    if(Object.prototype.hasOwnProperty.call(partial,'crosshair')) this.opts.crosshair = !!partial.crosshair;
    if(Object.prototype.hasOwnProperty.call(partial,'ma')) this.opts.ma = !!partial.ma;
    if(Object.prototype.hasOwnProperty.call(partial,'ema')) this.opts.ema = !!partial.ema;

    if(!this.opts.crosshair){
      this.cross.active = false;
      this.cross.locked = false;
    }
    this._drawBatched();
  }

  resetView(){
    this.cross.active = false;
    this.cross.locked = false;
    this.view.offset = 0;
    this.view.window = Math.max(this.view.minWindow, Math.min(this.view.maxWindow, 160));
    this._drawBatched();
  }

  zoom(step=0){
    const delta = Number(step || 0);
    if(!Number.isFinite(delta) || delta === 0) return;
    const next = Math.max(this.view.minWindow, Math.min(this.view.maxWindow, this.view.window + delta));
    if(next === this.view.window) return;
    const prevWindow = this.view.window;
    this.view.window = next;
    const maxOff = Math.max(0, this.candles.length - this.view.window);
    if(this.view.offset > maxOff) this.view.offset = maxOff;
    if(next < prevWindow && this.onNeedMore && this.view.offset >= maxOff - 2){
      try{ this.onNeedMore(); }catch(_){ }
    }
    this._drawBatched();
  }

  setCandles(items){
    const next = Array.isArray(items) ? items.slice(-800) : [];
    const nextSig = tradeChartCandlesSignature(next);
    if(nextSig === this._candlesSig){
      if(next.length){
        const lp = safeNum(next[next.length-1]?.close, null);
        if(lp!=null && lp>0) this.lastPrice = lp;
      }
      return;
    }
    this.candles = next;
    this._candlesSig = nextSig;
    this.view.offset = Math.min(this.view.offset, Math.max(0, this.candles.length - this.view.window));
    if(this.candles.length){
      const lp = safeNum(this.candles[this.candles.length-1].close, null);
      if(lp!=null && lp>0) this.lastPrice = lp;
    }
    this._drawBatched();
  }

  prependCandles(items){
    if(!Array.isArray(items) || !items.length) return;
    const firstT = this.candles.length ? safeNum(this.candles[0].time, 0) : 0;
    const add = items.filter(x => safeNum(x?.time,0) > 0 && (firstT===0 || safeNum(x.time,0) < firstT));
    if(!add.length) return;
    this.candles = add.concat(this.candles);
    if(this.candles.length > 1200) this.candles = this.candles.slice(-1200);
    this._candlesSig = tradeChartCandlesSignature(this.candles);
    this.view.offset += add.length;
    this._drawBatched();
  }

  setLastPrice(p){
    const v = safeNum(p, null);
    if(v!=null && v>0){
      const same = (this.lastPrice != null) && Math.abs(Number(this.lastPrice) - Number(v)) <= Math.max(1e-8, Math.abs(Number(v)) * 1e-8);
      const now = Date.now();
      this.lastPrice = v;
      if(same && (now - this._lastPriceDrawTs) < 900) return;
      this._lastPriceDrawTs = now;
      this._drawBatched();
    }
  }

  updateFromKline(msg){
    const k = msg && msg.k;
    if(!k) return;
    const t = Math.floor(safeNum(k.t,0)/1000);
    if(!t) return;
    const c = {
      time: t,
      open: safeNum(k.o,0),
      high: safeNum(k.h,0),
      low:  safeNum(k.l,0),
      close:safeNum(k.c,0),
      volume: safeNum(k.v,0),
    };
    // Basic sanity
    if(!(c.open>0 && c.high>0 && c.low>0 && c.close>0)) return;
    this.upsertCandle(c);
  }


  upsertCandle(c){
    if(!c || !c.time) return;
    const last = this.candles.length ? this.candles[this.candles.length-1] : null;
    let changed = false;
    if(last && last.time === c.time){
      const prevSig = `${safeNum(last.open,0)}:${safeNum(last.high,0)}:${safeNum(last.low,0)}:${safeNum(last.close,0)}:${safeNum(last.volume,0)}`;
      Object.assign(last, c);
      const nextSig = `${safeNum(last.open,0)}:${safeNum(last.high,0)}:${safeNum(last.low,0)}:${safeNum(last.close,0)}:${safeNum(last.volume,0)}`;
      changed = prevSig !== nextSig;
    }else{
      this.candles.push(c);
      if(this.candles.length > 900) this.candles.shift();
      changed = true;
    }
    this.lastPrice = safeNum(c.close, this.lastPrice);
    if(!changed){
      this.setLastPrice(this.lastPrice);
      return;
    }
    this._candlesSig = tradeChartCandlesSignature(this.candles);
    this._drawBatched();
  }

  resize(){
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    this.dpr = dpr;
    const rawW = Math.floor(r.width || 0);
    const rawH = Math.floor(r.height || 0);
    const safeW = rawW >= 180 ? rawW : (this._lastGoodSize.width >= 180 ? this._lastGoodSize.width : 0);
    const safeH = rawH >= 180 ? rawH : (this._lastGoodSize.height >= 180 ? this._lastGoodSize.height : 0);
    if(safeW >= 180) this._lastGoodSize.width = safeW;
    if(safeH >= 180) this._lastGoodSize.height = safeH;
    const finalW = Math.max(1, Math.floor((safeW || rawW || 1) * dpr));
    const finalH = Math.max(1, Math.floor((safeH || rawH || 1) * dpr));
    if(this.canvas.width === finalW && this.canvas.height === finalH) return;
    this.canvas.width = finalW;
    this.canvas.height = finalH;
  }

  destroy(){
    try{ this.ro && this.ro.disconnect(); }catch(e){}
    try{ if(this._viewportResize) window.removeEventListener('resize', this._viewportResize); }catch(e){}
    try{ if(this._viewportResize) window.removeEventListener('orientationchange', this._viewportResize); }catch(e){}
    try{ if(this._viewportResize && window.visualViewport){ window.visualViewport.removeEventListener('resize', this._viewportResize); window.visualViewport.removeEventListener('scroll', this._viewportResize); } }catch(e){}
    try{ this.canvas.removeEventListener('click', this._onTap); }catch(e){}
    try{ this.canvas.removeEventListener('pointerdown', this._onDown); }catch(e){}
    try{ this.canvas.removeEventListener('pointermove', this._onMove); }catch(e){}
    try{ this.canvas.removeEventListener('pointerup', this._onUp); }catch(e){}
    try{ this.canvas.removeEventListener('pointercancel', this._onUp); }catch(e){}
    this.ro = null;
    this._onTap = null;
  }

  _readColors(){
    return {
      bg: cssVar('--chart-bg', cssVar('--card', '#0b1220')),
      bgGlow: 'rgba(56,189,248,.10)',
      grid: cssVar('--chart-grid', 'rgba(148,163,184,.16)'),
      grid2: cssVar('--chart-grid2', 'rgba(148,163,184,.08)'),
      up: cssVar('--green', '#22c55e'),
      dn: cssVar('--red', '#f87171'),
      upFill: 'rgba(34,197,94,.18)',
      dnFill: 'rgba(248,113,113,.16)',
      price: cssVar('--brand2', '#38bdf8'),
      ma: cssVar('--brand2', '#38bdf8'),
      ema: cssVar('--warn', '#f59e0b'),
      volumeUp: 'rgba(34,197,94,.32)',
      volumeDn: 'rgba(248,113,113,.28)',
      text: cssVar('--chart-text', cssVar('--text', '#e5e7eb')),
      sub: cssVar('--muted', 'rgba(226,232,240,.72)'),
      border: cssVar('--chart-label-border', 'rgba(148,163,184,.22)'),
      labelBg: cssVar('--chart-label-bg', 'rgba(2,6,23,.92)'),
      labelText: cssVar('--chart-label-text', cssVar('--chart-text', '#e5e7eb')),
    };
  }

  _calcMA(closes, period){
    const out = new Array(closes.length).fill(null);
    let sum = 0;
    for(let i=0;i<closes.length;i++){
      sum += closes[i];
      if(i>=period) sum -= closes[i-period];
      if(i>=period-1) out[i] = sum/period;
    }
    return out;
  }

  _calcEMA(closes, period){
    const out = new Array(closes.length).fill(null);
    const k = 2/(period+1);
    let ema = null;
    for(let i=0;i<closes.length;i++){
      const c = closes[i];
      if(ema==null) ema = c;
      else ema = (c*k) + (ema*(1-k));
      if(i>=period-1) out[i] = ema;
    }
    return out;
  }

  _draw(){
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const dpr = this.dpr || 1;

    const {bg, bgGlow, grid, grid2, up, dn, upFill, dnFill, price, ma, ema, volumeUp, volumeDn, text, sub, border, labelBg, labelText} = this._readColors();

    // work in CSS px
    ctx.save();
    ctx.scale(dpr,dpr);

    const w = W/dpr;
    const h = H/dpr;

    // background
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,w,h);

    const pad = 12;
    const axisW = 64;
    const left = pad;
    const top = pad;
    const bottom = h - pad;

    const glow = ctx.createRadialGradient(w*0.84, top+24, 8, w*0.84, top+24, Math.max(120, w*0.6));
    glow.addColorStop(0, bgGlow);
    glow.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,w,h);
    const volumeH = Math.max(54, Math.floor((h - top - pad) * 0.18));
    const priceBottom = bottom - volumeH - 8;
    const cw = Math.max(10, w - pad - axisW);
    const ch = Math.max(10, priceBottom - top);

    // grid
    ctx.strokeStyle = grid2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const v = 6;
    for(let i=0;i<=v;i++){
      const x = left + (cw*i/v);
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    const hh = 6;
    for(let i=0;i<=hh;i++){
      const y = top + (ch*i/hh);
      ctx.moveTo(left, y);
      ctx.lineTo(left+cw, y);
    }
    ctx.stroke();

    // no data
    if(!this.candles.length){
      ctx.fillStyle = sub;
      ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText(state.t('trade.chart_loading') , left, top+18);
      ctx.restore();
      return;
    }

    const maxBars = Math.max(40, Math.min(this.view.maxWindow, Math.max(this.view.minWindow, Math.floor(cw/6))));
    this.view.window = maxBars;
    const end = Math.max(0, this.candles.length - (this.view.offset||0));
    const start = Math.max(0, end - maxBars);
    const vis = this.candles.slice(start, end);
    const n = vis.length;
    const xStep = cw / Math.max(1,n);

    // price range
    let lo = Infinity, hi = -Infinity;
    for(const c of vis){
      if(c.low < lo) lo = c.low;
      if(c.high > hi) hi = c.high;
    }
    if(!isFinite(lo) || !isFinite(hi) || lo===hi){ lo = lo-1; hi = hi+1; }
    const r = hi-lo;
    lo -= r*0.08;
    hi += r*0.08;

    const yOf = (p)=> top + (hi-p)/(hi-lo)*ch;
    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

    // indicators
    const closes = vis.map(x=>safeNum(x.close,0));
    const maxVol = Math.max(1, ...vis.map(x=>safeNum(x.volume,0)));
    const volTop = priceBottom + 8;
    const volBottom = bottom;
    const volRange = Math.max(8, volBottom - volTop);

    if(this.opts.ma || this.opts.ema){
      if(this.opts.ma){
        const maArr = this._calcMA(closes, 20);
        ctx.strokeStyle = ma;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        let started=false;
        for(let i=0;i<n;i++){
          const v = maArr[i];
          if(v==null) continue;
          const x = left + (i+0.5)*xStep;
          const y = yOf(v);
          if(!started){ ctx.moveTo(x,y); started=true; }
          else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      if(this.opts.ema){
        const emaArr = this._calcEMA(closes, 50);
        ctx.strokeStyle = ema;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        let started=false;
        for(let i=0;i<n;i++){
          const v = emaArr[i];
          if(v==null) continue;
          const x = left + (i+0.5)*xStep;
          const y = yOf(v);
          if(!started){ ctx.moveTo(x,y); started=true; }
          else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    }

    // candles + volume
    const bodyW = Math.max(3, Math.floor(xStep*0.66));
    for(let i=0;i<n;i++){
      const c = vis[i];
      const x = left + (i+0.5)*xStep;

      const yO = yOf(c.open);
      const yC = yOf(c.close);
      const yH = yOf(c.high);
      const yL = yOf(c.low);

      const isUp = c.close >= c.open;
      ctx.strokeStyle = isUp ? up : dn;
      ctx.fillStyle = isUp ? upFill : dnFill;

      const vv = safeNum(c.volume,0);
      const vh = Math.max(2, (vv / maxVol) * volRange);
      ctx.fillStyle = isUp ? volumeUp : volumeDn;
      ctx.fillRect(Math.floor(x - Math.max(1, bodyW*0.45)), Math.floor(volBottom - vh), Math.max(2, bodyW*0.9), Math.floor(vh));

      ctx.strokeStyle = isUp ? up : dn;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();

      const t = Math.min(yO,yC);
      const bh = Math.max(2, Math.abs(yC-yO));
      ctx.fillStyle = isUp ? up : dn;
      this._roundRect(ctx, Math.floor(x - bodyW/2), Math.floor(t), bodyW, Math.floor(bh), Math.min(4, bodyW/2));
      ctx.fill();
    }

    // axis labels
    ctx.fillStyle = sub;
    ctx.font = '600 11px system-ui, -apple-system, Segoe UI, Roboto';
    for(let i=0;i<=4;i++){
      const v = lo + (i/4)*(hi-lo);
      const y = yOf(v);
      ctx.fillText(fmt(v), left+cw+8, y+4);
    }
    ctx.fillStyle = 'rgba(159,179,218,.72)';
    ctx.font = '700 10px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Vol', left+2, volTop+10);

    // last price line + label
    if(this.lastPrice){
      const y = yOf(this.lastPrice);
      ctx.strokeStyle = price;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left+cw, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = fmt(this.lastPrice);
      const lx = left + cw + 8;
      const ly = y - 10;
      ctx.fillStyle = labelBg;
      ctx.strokeStyle = 'rgba(56,189,248,.55)';
      ctx.lineWidth = 1;
      this._roundRect(ctx, lx-4, ly-2, axisW-10, 18, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = labelText;
      ctx.fillText(label, lx, ly+11);

      // small dot on the chart edge
      ctx.fillStyle = price;
      ctx.beginPath();
      ctx.arc(left+cw, y, 2.6, 0, Math.PI*2);
      ctx.fill();
    }

    const focusIdx = (this.opts.crosshair && this.cross.active && this.cross.locked) ? clamp(Math.floor((clamp(this.cross.x, left, left+cw)-left)/xStep), 0, n-1) : (n-1);
    const focus = vis[focusIdx] || vis[n-1];
    if(focus){
      const ohlc = `O ${fmt(focus.open)}  H ${fmt(focus.high)}  L ${fmt(focus.low)}  C ${fmt(focus.close)}`;
      ctx.font = '700 11px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = 'rgba(214,228,255,.88)';
      ctx.fillText(ohlc, left+4, top+14);
    }

    // crosshair (tap to lock/unlock)
    if(this.opts.crosshair && this.cross.active && this.cross.locked){
      const cx = clamp(this.cross.x, left, left+cw);
      const cy = clamp(this.cross.y, top, bottom);

      ctx.strokeStyle = 'rgba(148,163,184,.42)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);

      // snap to nearest candle center
      const idx = clamp(Math.floor((cx-left)/xStep), 0, n-1);
      const sx = left + (idx+0.5)*xStep;

      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.lineTo(sx, bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left, cy);
      ctx.lineTo(left+cw, cy);
      ctx.stroke();

      ctx.setLineDash([]);

      // price label (right)
      const pv = hi - ((cy-top)/ch)*(hi-lo);
      const pLabel = fmt(pv);
      ctx.fillStyle = labelBg;
      ctx.strokeStyle = border;
      this._roundRect(ctx, left+cw+4, cy-10, axisW-8, 18, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = labelText;
      ctx.fillText(pLabel, left+cw+10, cy+4);

      // time label (bottom)
      const t = vis[idx].time;
      const tLabel = fmtTs(t);
      ctx.font = '600 10px system-ui, -apple-system, Segoe UI, Roboto';
      const tw = ctx.measureText(tLabel).width;
      const bx = clamp(sx - tw/2 - 8, left, left+cw - tw - 16);
      const by = bottom + 4;
      ctx.fillStyle = labelBg;
      ctx.strokeStyle = border;
      this._roundRect(ctx, bx, by, tw+16, 16, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = labelText;
      ctx.fillText(tLabel, bx+8, by+12);
    }

    ctx.restore();
  }

  _roundRect(ctx,x,y,w,h,r){
    const rr = Math.max(2, Math.min(r, Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }
}

async function tradeFetchOrders(params){
  const q = new URLSearchParams();
  const mode = String(params?.mode || state.tradeMode || 'demo');
  // keep history consistent with the requested account mode
  q.set('mode', mode);
  if(params?.symbol) q.set('symbol', String(params.symbol).toUpperCase());
  if(params?.side) q.set('side', String(params.side).toUpperCase());
  if(params?.limit) q.set('limit', String(params.limit));
  // prefer lightweight endpoint; fallback to portfolio
  try{
    const r = await api('/trade/orders.php?' + q.toString());
    const list = Array.isArray(r.orders) ? r.orders : (Array.isArray(r.items) ? r.items : []);
    return list;
  }catch(e){
    const p = await api('/trade/portfolio.php?mode='+encodeURIComponent(mode));
    const list = Array.isArray(p.orders) ? p.orders : (Array.isArray(p.items) ? p.items : []);
    return list.map(x=>x);
  }
}

async function tradeClearOrders(params){
  const body = {};
  if(params?.symbol) body.symbol = String(params.symbol).toUpperCase();
  if(params?.side) body.side = String(params.side).toUpperCase();
  try{
    await api('/trade/orders_clear.php', {method:'POST', body});
    return true;
  }catch(e){
    // fallback: refuse destructive reset (it resets wallet too)
    throw e;
  }
}

function tradeOpenOrderSheet({side, symbol, assetType, marketType, lastPrice, orderType='market', onDone}){
  const isPerp = String(marketType||'spot').toLowerCase()==='perp';
  const requestedOrderType = String(orderType || 'market').toLowerCase();
  const isLimit = requestedOrderType === 'limit';
  const sideLabel = (String(side).toUpperCase()==='BUY') ? state.t('trade.buy') : state.t('trade.sell');

  const backdrop = h('div',{class:'sheet-backdrop'});
  const sheet = h('div',{class:'sheet'},
    h('div',{class:'sheet-head'},
      h('div',{class:'sheet-title'}, `${sideLabel} • ${symbol}${isLimit ? ' • LIMIT' : ''}`),
      h('button',{class:'icon-btn', onclick:close}, '✕')
    ),
    h('div',{class:'sheet-body'},
      h('label',{class:'lbl'}, state.t('trade.order.amount_usd')),
      h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.01', min:'0', placeholder:'e.g. 10', id:'usdIn'}),

      (isLimit ? h('div',{},
        h('div',{class:'lbl'}, tr('Limit price','سعر الحد','Лимитная цена')),
        h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.0001', min:'0', placeholder: lastPrice?fmt(lastPrice,4):'0.0000', id:'limitPriceIn', value: lastPrice?String(lastPrice):''})
      ) : null),

      h('div',{class:'row', style:'gap:10px;align-items:center;'},
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, state.t('trade.order.qty_auto')),
          h('input',{class:'input', type:'text', readonly:'true', id:'qtyOut'})
        ),
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, state.t('trade.entry')),
          h('input',{class:'input', type:'text', readonly:'true', id:'entryOut', value: lastPrice?fmt(lastPrice,4):'—'})
        )
      ),

      isPerp ? (function(){
        const maxLev = Math.max(1, Math.floor(safeNum(state?.leverageCaps?.max_effective, 100)));
        const defLev = Math.min(10, maxLev);
        const base = [1,2,3,5,10,15,20,25,30,50,75,100,125,150,200];
        const list = (maxLev<=20) ? Array.from({length:maxLev}, (_,i)=>i+1) : base.filter(v=>v<=maxLev);
        if (!list.includes(defLev)) list.push(defLev);
        if (!list.includes(maxLev)) list.push(maxLev);
        list.sort((a,b)=>a-b);
        return h('div',{},
          h('div',{class:'lbl'}, state.t('trade.leverage')+` (1-${maxLev}x)`),
          h('select',{class:'input', id:'levSel'},
            ...list.map(v=>h('option',{value:String(v), selected: v===defLev}, `${v}x`))
          )
        );
      })() : null,

      h('div',{class:'row', style:'gap:10px;'},
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, state.t('trade.order.take_profit_optional')),
          h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.01', min:'0', placeholder:'—', id:'tpIn'})
        ),
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, state.t('trade.order.stop_loss_optional')),
          h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.01', min:'0', placeholder:'—', id:'slIn'})
        )
      ),

      h('button',{class:`btn w-100 ${side==='BUY'?'buy':'sell'}`, onclick:submit}, ((String(side).toUpperCase()==='BUY') ? state.t('trade.order.buy_now') : state.t('trade.order.sell_now')))
    )
  );

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  try{ document.body.classList.add('sheet-open'); }catch(e){}
  requestAnimationFrame(()=>{
    backdrop.classList.add('show');
    sheet.classList.add('show');
    const usdEl = sheet.querySelector('#usdIn');
    if(usdEl) usdEl.focus();
    updateQty();
  });

  function close(){
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
    setTimeout(()=>{ try{ backdrop.remove(); sheet.remove(); }catch(e){} try{ document.body.classList.remove('sheet-open'); }catch(e){} }, 180);
  }

  const updateQty = rafBatch(()=>{
    const usd = safeNum(sheet.querySelector('#usdIn')?.value, 0);
    const marketPx = safeNum(lastPrice, 0);
    const entryPrice = isLimit ? safeNum(sheet.querySelector('#limitPriceIn')?.value, 0) : marketPx;
    const levFactor = isPerp ? Math.max(1, parseInt(sheet.querySelector('#levSel')?.value || '1', 10) || 1) : 1;
    const qty = (usd>0 && entryPrice>0) ? ((usd * levFactor)/entryPrice) : 0;
    const out = sheet.querySelector('#qtyOut');
    if(out) out.value = qty ? fmt(qty, 8) : '—';
    const entryOut = sheet.querySelector('#entryOut');
    if(entryOut) entryOut.value = entryPrice>0 ? fmt(entryPrice, 4) : '—';
  });

  sheet.querySelector('#usdIn')?.addEventListener('input', updateQty);
  sheet.querySelector('#limitPriceIn')?.addEventListener('input', updateQty);
  sheet.querySelector('#levSel')?.addEventListener('change', updateQty);

  async function submit(){
    const usd = safeNum(sheet.querySelector('#usdIn')?.value, 0);
    if(!(usd>0)){ toast('USD amount must be > 0'); return; }
    const marketPx = safeNum(lastPrice, 0);
    const price = isLimit ? safeNum(sheet.querySelector('#limitPriceIn')?.value, 0) : marketPx;
    if(!(price>0)){ toast(isLimit ? 'Limit price required' : 'Price unavailable'); return; }

    // Real mode is allowed (backend decides permission)

    const tp = safeNum(sheet.querySelector('#tpIn')?.value, 0);
    const sl = safeNum(sheet.querySelector('#slIn')?.value, 0);
    const maxLev = isPerp ? Math.max(1, Math.floor(safeNum(state?.leverageCaps?.max_effective, 100))) : 1;
    const levRaw = isPerp ? (parseInt(sheet.querySelector('#levSel')?.value || '10', 10) || 1) : 1;
    const lev = isPerp ? Math.max(1, Math.min(maxLev, levRaw)) : 1;
    const qty = (usd/price) * (isPerp ? lev : 1);

    try{
      const payload = {
        symbol,
        asset_type: assetType,
        market_type: marketType,
        side,
        order_type: isLimit ? 'LIMIT' : 'MARKET',
        qty,
        leverage: lev,
        tp: tp>0?tp:0,
        sl: sl>0?sl:0,
        usd: usd,
        price: isLimit ? price : 0,
        mode: (state && state.tradeMode) ? state.tradeMode : 'demo'
      };
      const r = await api('/trade/place_order.php', {method:'POST', body: payload});
      haptic('notification','success');
      toast(isLimit ? `Order placed @ ${fmt(Number(r.fill_price||price), 4)}` : `Filled @ ${fmt(Number(r.fill_price||price), 4)}`);
      close();
      if(typeof onDone === 'function') onDone();
    }catch(e){
      haptic('notification','error');
      toast(e.message || state.t('trade.failed_place_order'));
    }
  }
}

function tradeEditTpSlSheet(pos, onDone){
  const id = safeNum(pos?.id, 0);
  if(!(id>0)) return;
  const symDb = String(pos.symbol||'');
  const sym = (typeof trade_ui_symbol === 'function') ? trade_ui_symbol(symDb) : symDb.replace(/^@R@/,'');
  const mt = String(pos.market_type||'spot').toLowerCase();
  const tp0 = safeNum(pos.tp_price, 0);
  const sl0 = safeNum(pos.sl_price, 0);

  const backdrop = h('div',{class:'sheet-backdrop'});
  const sheet = h('div',{class:'sheet'},
    h('div',{class:'sheet-head'},
      h('div',{class:'sheet-title'}, `TP/SL • ${sym} • ${mt.toUpperCase()}`),
      h('button',{class:'icon-btn', onclick:close}, '✕')
    ),
    h('div',{class:'sheet-body'},
      h('div',{class:'row', style:'gap:10px;'},
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, 'Take Profit'),
          h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.01', min:'0', placeholder:'—', id:'tpIn', value: tp0>0?String(tp0):''})
        ),
        h('div',{class:'flex-1'},
          h('div',{class:'lbl'}, 'Stop Loss'),
          h('input',{class:'input', type:'number', inputmode:'decimal', step:'0.01', min:'0', placeholder:'—', id:'slIn', value: sl0>0?String(sl0):''})
        )
      ),
      h('button',{class:'btn w-100 primary', onclick:submit}, 'Save')
    )
  );

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  requestAnimationFrame(()=>{ backdrop.classList.add('show'); sheet.classList.add('show'); });

  function close(){
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
    setTimeout(()=>{ try{ backdrop.remove(); sheet.remove(); }catch(e){} }, 180);
  }

  async function submit(){
    const tp = safeNum(sheet.querySelector('#tpIn')?.value, 0);
    const sl = safeNum(sheet.querySelector('#slIn')?.value, 0);
    try{
      await api('/trade/update_position.php', {method:'POST', body:{id, tp: tp>0?tp:0, sl: sl>0?sl:0}});
      haptic('notification','success');
      toast(state.t('common.saved'));
      close();
      if(typeof onDone === 'function') onDone();
    }catch(e){
      haptic('notification','error');
      toast(e.message || state.t('common.failed_save'));
    }
  }
}

function tradeOrdersToCards(items){
  const wrap = h('div',{class:'log-wrap'});
  const raw = Array.isArray(items) ? items : [];
  const itemTs = (o)=> uiEpoch(o?.updated_at || o?.closed_at || o?.closedAt || o?.filled_at || o?.fill_time || o?.created_at || o?.createdAt || o?.opened_at || o?.open_time || 0);

  // 1) Respect current mode (demo/real)
  const activeMode = (state && state.tradeMode) ? String(state.tradeMode) : 'demo';
  let list = raw.filter(o => (String(o.account_mode||o.mode||activeMode).toLowerCase() === String(activeMode).toLowerCase()));

  // 2) Bybit-style: default to CLOSED history here (open positions are in "Active Positions")
  list = list.filter(o => {
    const st = String(o.status||'').toLowerCase();
    const ca = safeNum(o.closed_at ?? o.closedAt, 0);
    return st === 'closed' || ca > 0;
  }).slice().sort((a,b)=> itemTs(b) - itemTs(a) || (Number(b?.id || 0) - Number(a?.id || 0)));

  if(!list.length){
    wrap.appendChild(h('div',{class:'muted small'}, state.t('trade.no_closed_deals')));
    return wrap;
  }

  const fmtSym = (s)=> String(s||'').toUpperCase().replace(/^@R@|^@D@/,'');

  list.slice(0, 60).forEach(o=>{
    const sym = fmtSym(o.symbol);
    const mkt = String(o.market_type||'spot').toLowerCase();
    const side = String(o.side||'BUY').toUpperCase();
    const lev = Math.max(1, parseInt(o.leverage||1,10) || 1);

    const used = safeNum(o.used_usdt, safeNum(o.usd_amount, 0));
    const entry = safeNum(o.entry_price, safeNum(o.fill_price, 0));
    const exit = safeNum(o.exit_price, safeNum(o.limit_price, 0));
    const pnl = safeNum(o.pnl_usd, 0);
    const fee = safeNum(o.fee_paid, 0);
    const orderType = normalizeLiveAssetType(o.asset_type || o.type || state.selectedAssetType || 'crypto');
    const liveNow = vpCanonicalQuoteForUi(sym, orderType, mkt === 'perp' ? 'perp' : 'spot', { maxAgeSec: orderType === 'crypto' ? 18 : 8 });

    const roe = (used>0) ? (pnl/used)*100 : 0;
    const pnlCls = pnl>0 ? 'up' : (pnl<0 ? 'down' : '');

    const closedAt = safeNum(o.closed_at ?? o.closedAt, 0);
    const t = closedAt>0 ? `${fmtDate(closedAt)} ${fmtTs(closedAt)}` : '';

    const head = h('div',{class:'log-head'},
      h('div',{class:'log-left'},
        h('div',{class:'log-sym'}, sym),
        h('div',{class:'log-sub muted tiny'}, `${mkt.toUpperCase()}${mkt==='perp' ? ` • ${lev}x` : ''}`)
      ),
      h('div',{class:'log-right'},
        h('span',{class:`log-badge ${side==='BUY'?'buy':'sell'}`}, (side==='BUY'?state.t('trade.buy'):state.t('trade.sell'))),
        h('div',{class:`log-pnl ${pnlCls}`}, `${pnl>=0?'+':''}${fmt(pnl,2)} USDT`),
        h('div',{class:'muted tiny'}, `${fmt(roe,2)}% ROE`)
      )
    );

    // NOTE: Entry can be admin-adjusted (bonus PnL), so we keep it in DB but hide it from the client.
    // We keep the grid spacing using visibility:hidden.
    const stats = h('div',{class:'log-kv'},
      h('div',{class:'log-row'},
        h('div',{class:'muted tiny'}, state.t('trade.exit')),
        h('div',{class:'log-val'}, `$${fmt(exit,  mkt==='spot'? (exit<1?6:2) : 2)}`)
      ),
      h('div',{class:'log-row'},
        h('div',{class:'muted tiny'}, (mkt==='perp'?state.t('trade.margin'):state.t('trade.value'))),
        h('div',{class:'log-val'}, `${fmt(used,2)} USDT`)
      ),
      (mkt==='perp' && (Number.isFinite(safeNum(o.final_value_usdt, NaN)))) ? h('div',{class:'log-row'},
        h('div',{class:'muted tiny'}, state.t('trade.final_value')),
        h('div',{class:'log-val'}, `${fmt(safeNum(o.final_value_usdt,0),2)} USDT`)
      ) : null,
      h('div',{class:'log-row'},
        h('div',{class:'muted tiny'}, state.t('trade.qty')),
        h('div',{class:'log-val'}, `${fmt(safeNum(o.qty,0), 8)}`)
      )
    );

    const foot = h('div',{class:'log-foot'},
      h('div',{class:'muted tiny'}, t || ''),
      h('div',{class:'muted tiny'}, fee>0 ? ((state.lang==='ar'?'رسوم: ':'Fee: ') + `${fmt(fee,4)} USDT`) : '')
    );

    wrap.appendChild(h('div',{class:'log-card'}, head, stats, foot));
  });

  return wrap;
}




function normalizeTradingViewSymbol(symbol, type, raw){
  const sym = String(symbol || '').trim().toUpperCase();
  const t = String(type || '').trim().toLowerCase();
  let candidate = String(raw || '').trim().toUpperCase();

  const futuresAlias = {
    ES_F: 'CME_MINI:ES1!',
    NQ_F: 'CME_MINI:NQ1!',
    YM_F: 'CBOT_MINI:YM1!',
    RTY_F: 'CME_MINI:RTY1!',
    CL_F: 'NYMEX:CL1!',
    NG_F: 'NYMEX:NG1!',
    RB_F: 'NYMEX:RB1!',
    HO_F: 'NYMEX:HO1!',
    GC_F: 'COMEX:GC1!',
    SI_F: 'COMEX:SI1!',
    HG_F: 'COMEX:HG1!',
    ZS_F: 'CBOT:ZS1!',
    ZW_F: 'CBOT:ZW1!',
    ZC_F: 'CBOT:ZC1!'
  };

  const commodityAlias = {
    XAUUSD: 'OANDA:XAUUSD',
    GOLD: 'OANDA:XAUUSD',
    XAGUSD: 'OANDA:XAGUSD',
    SILVER: 'OANDA:XAGUSD',
    XPTUSD: 'OANDA:XPTUSD',
    PLAT: 'OANDA:XPTUSD',
    PLATINUM: 'OANDA:XPTUSD',
    XPDUSD: 'OANDA:XPDUSD',
    PALL: 'OANDA:XPDUSD',
    PALLADIUM: 'OANDA:XPDUSD',
    USOIL: 'TVC:USOIL',
    WTI: 'TVC:USOIL',
    OIL: 'TVC:USOIL',
    UKOIL: 'TVC:UKOIL',
    BRENT: 'TVC:UKOIL',
    NGAS: 'FX:NGAS',
    NATGAS: 'FX:NGAS',
    COPPER: 'CAPITALCOM:COPPER',
    CORN: 'OANDA:CORNUSD',
    WHEAT: 'CAPITALCOM:WHEAT',
    SOY: 'CBOT:ZS1!',
    SOYBEAN: 'CBOT:ZS1!',
    SUGAR: 'ICEUS:SB1!',
    COFFEE: 'ICEUS:KC1!',
    COCOA: 'ICEUS:CC1!',
    COTTON: 'ICEUS:CT1!',
    RICE: 'CBOT:ZR1!',
    OAT: 'CBOT:ZO1!',
    GASOLINE: 'NYMEX:RB1!',
    HEATOIL: 'NYMEX:HO1!',
    LUMBER: 'CME:LBR1!',
    CATTLE: 'CME:LE1!',
    HOGS: 'CME:HE1!',
    ORANGE: 'ICEUS:OJ1!'
    ,GLD: 'AMEX:GLD'
    ,SLV: 'AMEX:SLV'
  };

  const normalizePrefixed = (value)=>{
    const v = String(value || '').trim().toUpperCase();
    if (!v) return '';
    if (t === 'commodities') {
      if (/^TVC:(XAGUSD|XPTUSD|XPDUSD|NGAS|COPPER|CORN|WHEAT|SOY|SUGAR|COFFEE|COCOA|COTTON|RICE|OAT|GASOLINE|HEATOIL|LUMBER|CATTLE|HOGS|ORANGE)$/i.test(v)) {
        const stripped = v.split(':').pop();
        return commodityAlias[stripped] || stripped;
      }
      if (/^TVC:(WTI|OIL)$/i.test(v)) return 'TVC:USOIL';
      if (/^TVC:BRENT$/i.test(v)) return 'TVC:UKOIL';
      if (/^[A-Z0-9._-]+:[A-Z0-9!._-]+$/.test(v)) return v;
    } else if (/^[A-Z0-9._-]+:[A-Z0-9!._-]+$/.test(v)) {
      return v;
    }
    return '';
  };

  const prefixed = normalizePrefixed(candidate);
  if (prefixed) return prefixed;

  if (t === 'crypto') return `BINANCE:${sym}`;
  if (t === 'forex') return `FX:${sym}`;
  if (t === 'stocks') {
    if (/^[A-Z]+$/.test(sym)) return `NASDAQ:${sym}`;
    return `NYSE:${sym}`;
  }
  if (t === 'arab') return `TADAWUL:${sym}`;
  if (t === 'futures') return futuresAlias[candidate] || futuresAlias[sym] || `CME_MINI:${sym.replace(/_F$/,'')}1!`;
  if (t === 'commodities') return commodityAlias[candidate] || commodityAlias[sym] || futuresAlias[candidate] || futuresAlias[sym] || '';
  return candidate || sym;
}

function tvSymbolGuess(symbol, type){
  return normalizeTradingViewSymbol(symbol, type, '');
}

let __tvWidgetScriptPromise = null;
function loadTradingViewWidgetScript(){
  if (window.TradingView && typeof window.TradingView.widget === 'function') return Promise.resolve();
  if (__tvWidgetScriptPromise) return __tvWidgetScriptPromise;
  __tvWidgetScriptPromise = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.async = true;
    s.onload = ()=>resolve();
    s.onerror = ()=>reject(new Error('TradingView widget failed to load'));
    document.head.appendChild(s);
  });
  return __tvWidgetScriptPromise;
}

function mountTradingViewWidget(host, cfg={}){
  const symbol = String(cfg.symbol || 'BINANCE:BTCUSDT');
  const locale = String(cfg.locale || state.lang || 'en');
  const theme = 'dark';
  const interval = String(cfg.interval || '15');
  const studies = Array.isArray(cfg.studies) ? cfg.studies : [];
  host.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'tradingview-widget-container';
  box.style.width = '100%';
  box.style.height = '100%';
  const chart = document.createElement('div');
  chart.className = 'tradingview-widget-container__widget';
  chart.style.width = '100%';
  chart.style.height = '100%';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.text = JSON.stringify({
    autosize: true,
    symbol,
    interval,
    timezone: 'Etc/UTC',
    theme,
    style: '1',
    locale,
    allow_symbol_change: false,
    calendar: false,
    support_host: 'https://www.tradingview.com',
    hide_top_toolbar: true,
    hide_legend: false,
    hide_side_toolbar: true,
    withdateranges: false,
    details: false,
    hotlist: false,
    studies,
    backgroundColor: '#0B1323',
    gridColor: 'rgba(148,163,184,0.08)',
    watchlist: []
  });
  box.appendChild(chart);
  box.appendChild(script);
  host.appendChild(box);
}

function createTradeWatchlistPanel(symbol, assetType, onSelect, opts={}){
  const search = h('input',{class:'input', placeholder: state.t('markets.search')});
  const list = h('div',{class:'trade-watch-items'});
  const livePill = h('span',{class:'pill ok trade-watch-head-pill'}, tr('Live desk','أسعار مباشرة','Лайв'));
  const panel = h('div',{class:'card trade-watchlist', 'data-scroll-key':'trade-watchlist'},
    h('div',{class:'trade-panel-head'},
      h('div',{},
        h('div',{class:'trade-panel-title'}, state.t('nav.markets')),
        h('div',{class:'muted tiny'}, state.t('market.select'))
      ),
      livePill
    ),
    search,
    list
  );

  const rowRefs = new Map();
  const getCurrentMarket = ()=>{
    try{
      return String(typeof opts.getMarketType === 'function' ? opts.getMarketType() : (opts.marketType || 'spot')).toLowerCase() || 'spot';
    }catch(e){
      return 'spot';
    }
  };
  const fmtRowPrice = (value)=>{
    const px = Number(value || 0);
    if(!(px > 0)) return '—';
    return `$${fmt(px, px < 1 ? 6 : 2)}`;
  };
  const applyRowQuote = (symbolKey, quote, fallbackItem=null)=>{
    const ref = rowRefs.get(symbolKey);
    if(!ref) return;
    try{ if(quote && typeof quote === 'object') vpRememberLiveQuote(quote); }catch(e){}
    let remembered = null;
    try{
      if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.get === 'function'){
        remembered = VPQuoteStore.get(symbolKey, assetType, getCurrentMarket(), assetType === 'crypto' ? 18 : 8);
      }
    }catch(_storeErr){}
    if(!remembered) remembered = vpGetFreshRememberedQuote(symbolKey, assetType, assetType === 'crypto' ? 18 : 8);
    const hasDirectQuote = !!(quote && typeof quote === 'object' && Number(resolveQuoteLivePrice(quote, getCurrentMarket(), assetType) || quote?.price || quote?.last || quote?.mark_price || 0) > 0);
    const live = hasDirectQuote ? quote : (remembered || (fallbackItem && typeof fallbackItem === 'object' ? fallbackItem : null));
    if(!live) return;
    const market = getCurrentMarket();
    const liveType = normalizeLiveAssetType(live?.type || assetType || 'crypto');
    const liveSource = String(live?.source || live?.provider || '').trim().toLowerCase();
    const liveTs = vpTradeQuoteTsSec(live?.updated_at || live?.ts || live?.time || 0);
    const liveTrusted = isTrustedUiLiveSource(liveSource, symbolKey, liveType);
    const px = Number(resolveQuoteLivePrice(live, market, assetType) || live?.price || live?.last || live?.mark_price || fallbackItem?.price || 0) || 0;
    const ch = Number(live?.change_pct ?? live?.changePct ?? live?.change ?? fallbackItem?.change_pct ?? 0) || 0;
    if(px > 0){
      ref.priceEl.textContent = fmtRowPrice(px);
      ref.row.dataset.livePrice = String(px);
    }
    ref.changeEl.textContent = `${ch>=0?'+':''}${fmt(ch,2)}%`;
    ref.changeEl.classList.toggle('up', ch >= 0);
    ref.changeEl.classList.toggle('down', ch < 0);
    ref.liveEl.textContent = (px > 0 && liveTrusted) ? vpDelayedBadgeText(assetType, false) : vpDelayedBadgeText(assetType, true);
    ref.liveEl.classList.toggle('ready', px > 0 && liveTrusted);
    try{
      if(Array.isArray(state.markets)){
        state.markets = state.markets.map(item => String(item?.symbol || '').toUpperCase() === symbolKey
          ? Object.assign({}, item, {
              price: px > 0 ? px : Number(item?.price || 0),
              change_pct: Number.isFinite(ch) ? ch : Number(item?.change_pct || 0),
              updated_at: (px > 0 && liveTrusted) ? (liveTs || Math.floor(Date.now()/1000)) : safeNum(item?.updated_at, 0),
              source: liveTrusted ? liveSource : (item?.source || item?.provider || '')
            })
          : item);
      }
    }catch(e){}
  };

  const renderRows = ()=>{
    const term = String(search.value||'').trim().toUpperCase();
    const drawerPool = (state.__vpTradeDrawerMarketCache && Array.isArray(state.__vpTradeDrawerMarketCache[assetType]))
      ? state.__vpTradeDrawerMarketCache[assetType]
      : [];
    const marketPool = Array.isArray(state.markets) ? state.markets.filter(x=> String(x.type||'')===String(assetType||'')) : [];
    const mergedPool = vpMergeMarketItemsByKeyLite(drawerPool, marketPool);
    const baseRows = (typeof vpOverlayMarketsWithFreshQuotes === 'function')
      ? vpOverlayMarketsWithFreshQuotes(mergedPool, assetType)
      : mergedPool;
    const rows = baseRows.filter(x=>(!term || String(x.symbol||'').includes(term) || String(x.name||'').toUpperCase().includes(term))).slice(0,18);
    list.innerHTML='';
    rowRefs.clear();
    if(!rows.length){ list.appendChild(h('div',{class:'muted small'}, state.t('common.no_results'))); return; }
    rows.forEach(x=>{
      const symbolKey = String(x.symbol||'').toUpperCase();
      const rowLive = vpGetFreshRememberedQuote(symbolKey, x?.type || assetType, (normalizeLiveAssetType(x?.type || assetType) === 'crypto') ? 18 : 8);
      const rowItem = rowLive ? Object.assign({}, x, {
        price: safeNum(rowLive.price || rowLive.last || rowLive.mark_price, safeNum(x?.price, 0)),
        change_pct: safeNum(rowLive.change_pct ?? x?.change_pct ?? 0, safeNum(x?.change_pct, 0)),
        updated_at: Math.max(vpTradeQuoteTsSec(x?.updated_at || 0), vpTradeQuoteTsSec(rowLive.updated_at || 0))
      }) : x;
      const active = symbolKey === String(symbol||'').toUpperCase();
      const ch = Number(rowItem.change_pct||0);
      const signalPill = Number(x.signal_count||0) > 0 ? h('div',{class:'trade-watch-signal'}, `${Number(x.signal_count||0)} ${state.t('trade.signals')}`) : null;
      const priceEl = h('div',{class:'trade-watch-price'}, fmtRowPrice(Number(rowItem.price||0)));
      const changeEl = h('div',{class:'trade-watch-change '+(ch>=0?'up':'down')}, `${ch>=0?'+':''}${fmt(ch,2)}%`);
      const liveEl = h('div',{class:'trade-watch-live'+(Number(rowItem.price||0) > 0 ? ' ready' : '')}, vpDelayedBadgeText(assetType, !(Number(rowItem.price||0) > 0)));
      const row = h('button',{class:'trade-watch-row'+(active?' active':''), onclick:()=>onSelect(rowItem)},
        h('div',{class:'trade-watch-main'},
          h('div',{class:'trade-watch-sym'}, String(x.symbol||'')),
          h('div',{class:'trade-watch-name'}, String(x.name||x.symbol||''))
        ),
        h('div',{class:'trade-watch-meta'},
          signalPill,
          liveEl,
          priceEl,
          changeEl
        )
      );
      rowRefs.set(symbolKey, { row, priceEl, changeEl, liveEl });
      list.appendChild(row);
    });
  };

  let rowsInflight = false;
  const refreshVisibleRows = async()=>{
    if(rowsInflight) return;
    if(String(location.hash || '') !== '#/trade' && !String(location.hash || '').startsWith('#/trade?')) return;
    const symbols = [...rowRefs.keys()].filter(Boolean);
    if(!symbols.length) return;
    rowsInflight = true;
    const market = getCurrentMarket();
    try{
      const merged = getCanonicalQuoteMap(symbols, assetType || 'crypto', market, { maxAgeSec: normalizeLiveAssetType(assetType || 'crypto') === 'crypto' ? 5 : 10 });
      const missing = symbols.filter(sym=>!merged.has(sym));
      if(missing.length){
        try{
          if(normalizeLiveAssetType(assetType||'crypto') === 'crypto'){
            const qr = await apiLiveQuotes(`/quotes.php?fresh=1&type=${encodeURIComponent(assetType || '')}&symbols=${encodeURIComponent(missing.join(','))}`, assetType || 'crypto', 4500);
            const items = Array.isArray(qr?.items) ? qr.items : [];
            items.forEach(item=>{
              const sym = String(item?.symbol || '').toUpperCase();
              if(sym){
                try{ vpRememberLiveQuote(item); }catch(e){}
                merged.set(sym, item);
              }
            });
          }else{
            const qr = await api(`/quotes.php?type=${encodeURIComponent(normalizeLiveAssetType(assetType||'crypto'))}&symbols=${encodeURIComponent(missing.join(','))}`, { timeoutMs: 4200 });
            (Array.isArray(qr?.items) ? qr.items : []).forEach(item=>{
              const sym = String(item?.symbol || '').toUpperCase();
              if(sym && missing.includes(sym)){
                try{ vpRememberLiveQuote(item); }catch(e){}
                merged.set(sym, item);
              }
            });
          }
        }catch(e){}
      }
      const stillMissing = normalizeLiveAssetType(assetType||'crypto') === 'crypto'
        ? symbols.filter(sym=>!merged.has(sym))
        : [];
      if(stillMissing.length){
        try{
          const sr = await api(`/trade/stream.php?lite=1&type=${encodeURIComponent(assetType || '')}&symbols=${encodeURIComponent(stillMissing.join(','))}&market=${encodeURIComponent(market)}&_=${Date.now()}`, { timeoutMs: 4500 });
          const items = sr?.quotes && typeof sr.quotes === 'object' ? Object.values(sr.quotes) : (Array.isArray(sr?.items) ? sr.items : []);
          (Array.isArray(items) ? items : []).forEach(item=>{
            const sym = String(item?.symbol || '').toUpperCase();
            if(sym){
              try{ vpRememberLiveQuote(item); }catch(e){}
              merged.set(sym, Object.assign({}, merged.get(sym) || {}, item));
            }
          });
        }catch(e){}
      }
      symbols.forEach(sym=>{
        const fallbackItem = Array.isArray(state.markets) ? state.markets.find(item => String(item?.symbol || '').toUpperCase() === sym) : null;
        applyRowQuote(sym, merged.get(sym) || null, fallbackItem || null);
      });
    }finally{
      rowsInflight = false;
    }
  };

  search.addEventListener('input', ()=>{ renderRows(); refreshVisibleRows().catch(()=>{}); });
  renderRows();
  refreshVisibleRows().catch(()=>{});
  const rowsEvery = normalizeLiveAssetType(assetType||'crypto') === 'crypto' ? 2200 : 4800;
  const rowsTick = ()=>{
    try{
      if(!panel.isConnected) return;
      if(document.hidden) return;
      refreshVisibleRows().catch(()=>{});
    }catch(e){}
  };
  const rowsTimer = setInterval(rowsTick, rowsEvery);
  const onRowsVisible = ()=>{ try{ if(!document.hidden) rowsTick(); }catch(e){} };
  try{ document.addEventListener('visibilitychange', onRowsVisible, {passive:true}); }catch(e){}
  onCleanup(()=>{ try{ clearInterval(rowsTimer); }catch(e){} try{ document.removeEventListener('visibilitychange', onRowsVisible); }catch(e){} });
  return panel;
}

function createTradeSignalsPanel(ctx){
  const list = h('div',{class:'trade-signal-list'}, h('div',{class:'muted small'}, tr('Loading signals…','جاري تحميل الإشارات…','Загрузка сигналов…')));
  const countPill = h('span',{class:'pill'}, '0');
  const panel = h('div',{class:'card trade-signals-panel'},
    h('div',{class:'trade-panel-head'},
      h('div',{},
        h('div',{class:'trade-panel-title'}, tr('Analyst signals','إشارات المحللين','Сигналы аналитиков')),
        h('div',{class:'muted tiny'}, tr('Live ideas published by your admins or pushed from TradingView webhooks.','أفكار مباشرة ينشرها فريق الإدارة أو تصل من Webhooks الخاصة بـ TradingView.','Актуальные идеи, опубликованные администраторами или пришедшие из вебхуков TradingView.'))
      ),
      countPill
    ),
    list
  );
  const signalLiveBindings = [];

  const fmtExpiry = (ts)=>{
    const n = Number(ts || 0);
    if(!(n > 0)) return tr('No expiry','بدون انتهاء','Без срока');
    try{
      return new Date(n * 1000).toLocaleString(state.lang === 'ar' ? 'ar-EG' : (state.lang === 'ru' ? 'ru-RU' : 'en-US'));
    }catch(e){
      return String(n);
    }
  };

  const toneClass = (dir)=> String(dir || '').toUpperCase()==='SELL' ? 'down' : 'up';
  const syncSignalLiveBindings = ()=>{
    if(document.hidden) return;
    signalLiveBindings.forEach(binding=>{
      try{
        const live = vpCanonicalQuoteForUi(binding.symbol, binding.type, binding.market, { maxAgeSec: binding.type === 'crypto' ? 18 : 8 }) || null;
        if(!binding.priceEl || !binding.changeEl) return;
        const price = Number(live?.price || binding.fallbackPrice || 0);
        const change = Number((live && (live.change_pct ?? live.changePct)) ?? binding.fallbackChange ?? 0) || 0;
        const src = String(live?.source || binding.fallbackSource || '').trim().toUpperCase() || 'LIVE';
        const sig = `${price}|${change}|${src}`;
        if(sig === binding.lastSig) return;
        binding.lastSig = sig;
        binding.priceEl.textContent = price > 0 ? money(price, price < 1 ? 4 : 2) : '—';
        binding.changeEl.textContent = percentText(change);
        binding.changeEl.className = 'pill ghost ' + changeClass(change);
        if(binding.sourceEl){
          binding.sourceEl.textContent = src;
        }
      }catch(e){}
    });
  };

  const renderItems = (items)=>{
    list.innerHTML = '';
    signalLiveBindings.length = 0;
    countPill.textContent = String(Array.isArray(items) ? items.length : 0);
    if(!Array.isArray(items) || !items.length){
      list.appendChild(h('div',{class:'muted small'}, state.t('trade.no_signals')));
      return;
    }
    items.slice(0,6).forEach(sig=>{
      const dir = String(sig.direction || '').toUpperCase();
      const tf = String(sig.timeframe || '').trim();
      const confidence = Math.max(0, Math.min(100, Number(sig.confidence || 0)));
      const tone = toneClass(dir);
      const hasEntry = Number.isFinite(Number(sig.entry));
      const hasSl = Number.isFinite(Number(sig.sl));
      const hasTp1 = Number.isFinite(Number(sig.tp1));
      const hasTp2 = Number.isFinite(Number(sig.tp2));
      const sigType = normalizeLiveAssetType(sig.type || ctx.assetType || 'crypto');
      const sigMarket = resolveLiveMarketForSymbol(String(sig.symbol || ctx.symbol || '').toUpperCase(), sigType, sigType === 'crypto' ? 'spot' : 'spot');
      try{
        if(Number(sig.live_price || 0) > 0){
          vpRememberLiveQuote({ symbol:String(sig.symbol || ctx.symbol || '').toUpperCase(), type:sigType, market:sigMarket, price:Number(sig.live_price || 0), change_pct:Number(sig.live_change_pct ?? 0) || 0, source:String(sig.live_source || 'signals_api').toLowerCase(), updated_at:Math.floor(Date.now()/1000) });
        }
      }catch(e){}
      const live = vpCanonicalQuoteForUi(String(sig.symbol || ctx.symbol || '').toUpperCase(), sigType, sigMarket, { maxAgeSec: sigType === 'crypto' ? 18 : 8 }) || (Number(sig.live_price || 0) > 0 ? { price:Number(sig.live_price || 0), change_pct:Number(sig.live_change_pct ?? 0) || 0, source:String(sig.live_source || 'signals_api').toLowerCase() } : null);
      const livePriceEl = h('span',{class:'pill ghost'}, Number(live?.price || 0) > 0 ? money(Number(live.price || 0), Number(live.price || 0) < 1 ? 4 : 2) : '—');
      const liveChangeEl = h('span',{class:'pill ghost ' + changeClass(Number(live?.change_pct ?? 0) || 0)}, percentText(Number(live?.change_pct ?? 0) || 0));
      const liveSourceEl = h('span',{class:'pill ghost'}, String(live?.source || sig.live_source || 'LIVE').trim().toUpperCase() || 'LIVE');
      signalLiveBindings.push({ symbol:String(sig.symbol || ctx.symbol || '').toUpperCase(), type:sigType, market:sigMarket, priceEl:livePriceEl, changeEl:liveChangeEl, sourceEl:liveSourceEl, fallbackPrice:Number(sig.live_price || 0) || 0, fallbackChange:Number(sig.live_change_pct ?? 0) || 0, fallbackSource:String(sig.live_source || 'signals_api').toLowerCase() });
      list.appendChild(h('div',{class:'trade-signal-card'},
        h('div',{class:'trade-signal-top'},
          h('div',{class:'trade-signal-main'},
            h('div',{class:'trade-signal-title'}, `${sig.symbol || ctx.symbol} ${tf ? '• ' + tf : ''}`),
            h('div',{class:'trade-signal-meta'},
              h('span',{class:`badge ${tone}`}, dir || '—'),
              h('span',{class:'pill'}, `${tr('Confidence','الثقة','Уверенность')}: ${confidence}%`),
              livePriceEl,
              liveChangeEl,
              liveSourceEl,
              sig.bot_enabled ? h('span',{class:'pill ok'}, String(sig.bot_name || tr('Trading bot','روبوت التداول','Trading bot'))) : null,
              sig.source ? h('span',{class:'pill ghost'}, String(sig.source).toUpperCase()) : null
            )
          ),
          h('button',{class:`btn small ${tone==='down' ? 'sell' : 'buy'}`, onclick:()=>ctx.openSignal(sig)}, dir === 'SELL' ? state.t('trade.sell') : state.t('trade.buy'))
        ),
        h('div',{class:'trade-signal-grid'},
          h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, state.t('trade.entry')), h('span',{class:'v'}, hasEntry ? `$${fmt(Number(sig.entry), Number(sig.entry)<1?6:4)}` : '—')),
          h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'SL'), h('span',{class:'v'}, hasSl ? `$${fmt(Number(sig.sl), Number(sig.sl)<1?6:4)}` : '—')),
          h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'TP1'), h('span',{class:'v'}, hasTp1 ? `$${fmt(Number(sig.tp1), Number(sig.tp1)<1?6:4)}` : '—')),
          h('div',{class:'trade-signal-kv'}, h('span',{class:'k'}, 'TP2'), h('span',{class:'v'}, hasTp2 ? `$${fmt(Number(sig.tp2), Number(sig.tp2)<1?6:4)}` : '—'))
        ),
        sig.bot_brief ? h('div',{class:'trade-signal-note'}, String(sig.bot_brief)) : (sig.note ? h('div',{class:'trade-signal-note'}, String(sig.note)) : null),
        h('div',{class:'trade-signal-foot muted tiny'}, `${tr('Valid until','صالح حتى','Действителен до')}: ${fmtExpiry(sig.valid_until)}`),
        sig.bot_enabled ? h('div',{class:'row wrap mt-2', style:'gap:8px;'},
          h('button',{class:'btn outline small', onclick:()=>openTradingBotDetails(sig)}, tr('Details','التفاصيل','Подробнее')),
          h('button',{class:'btn primary small', onclick:()=>openTradingBotCopyDialog(sig)}, tr('Copy trade','نسخ الصفقة','Копировать сделку'))
        ) : null
      ));
    });
    syncSignalLiveBindings();
  };

  const signalAssetTypeNorm = normalizeLiveAssetType(ctx.assetType || 'crypto');
  if(signalAssetTypeNorm === 'crypto'){
    Promise.resolve().then(async()=>{
      const items = await fetchSignals(ctx.symbol, ctx.assetType);
      renderItems(items);
    }).catch(()=>renderItems([]));
    const signalSyncEvery = 1600;
    const signalSyncTimer = setInterval(()=>{ try{ syncSignalLiveBindings(); }catch(e){} }, signalSyncEvery);
    const onSignalVisible = ()=>{ try{ if(!document.hidden) syncSignalLiveBindings(); }catch(e){} };
    try{ document.addEventListener('visibilitychange', onSignalVisible, {passive:true}); }catch(e){}
    onCleanup(()=>{ try{ clearInterval(signalSyncTimer); }catch(e){} try{ document.removeEventListener('visibilitychange', onSignalVisible); }catch(e){} });
  }else{
    renderItems([]);
  }

  return panel;
}

function createTradeOrderPanel(ctx){
  const sideLabel = String(ctx.marketType||'spot').toUpperCase();
  const priceRef = ctx.priceRef;
  const priceValue = h('div',{class:'trade-ticket-price'}, priceRef.value ? `$${fmt(priceRef.value,4)}` : '—');
  const accountAvailable = state.tradeMode==='real'
    ? safeNum(state.walletSummary?.real?.available, safeNum(state.walletSummary?.real?.balance, 0))
    : safeNum(state.walletSummary?.demo?.available, safeNum(state.walletSummary?.demo?.balance, 0));
  const currentModeLabel = state.tradeMode==='real' ? state.t('trade.mode_real') : state.t('trade.mode_demo');
  const openSheet = (side, orderType='market')=>tradeOpenOrderSheet({
    side,
    symbol: ctx.symbol,
    assetType: ctx.assetType,
    marketType: ctx.marketType,
    lastPrice: priceRef.value,
    orderType,
    onDone: ctx.onDone
  });
  const panel = h('div',{class:'card trade-ticket-panel'},
    h('div',{class:'trade-panel-head'},
      h('div',{},
        h('div',{class:'trade-panel-title'}, tr('Order ticket','تذكرة التنفيذ','Торговый тикет')),
        h('div',{class:'muted tiny'}, `${ctx.symbol} • ${sideLabel}`)
      ),
      h('span',{class:'badge'}, currentModeLabel)
    ),
    h('div',{class:'trade-ticket-box'},
      h('div',{class:'trade-ticket-price-block'},
        h('div',{class:'trade-ticket-label'}, state.t('trade.price')),
        priceValue,
        h('div',{class:'trade-ticket-sub muted small'}, tr('Open the ticket below with all order fields already grouped clearly.','افتح التذكرة بالأسفل وستجد جميع حقول التنفيذ مرتبة بوضوح.','Откройте тикет ниже — все поля ордера уже сгруппированы и понятны.'))
      ),
      h('div',{class:'trade-ticket-grid'},
        h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, state.t('trade.mode')), h('span',{class:'v'}, currentModeLabel)),
        h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, tr('Market type','نوع السوق','Тип рынка')), h('span',{class:'v'}, sideLabel)),
        h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, tr('Available balance','الرصيد المتاح','Доступный баланс')), h('span',{class:'v'}, `$${fmt(accountAvailable,2)}`)),
        h('div',{class:'trade-ticket-kv'}, h('span',{class:'k'}, tr('Selected symbol','الرمز المختار','Выбранный символ')), h('span',{class:'v'}, ctx.symbol))
      ),
      h('div',{class:'trade-ticket-section'},
        h('div',{class:'trade-ticket-section-title'}, tr('Market execution','تنفيذ مباشر','Рыночное исполнение')),
        h('div',{class:'trade-ticket-actions'},
          h('button',{class:'btn sell', onclick:()=>openSheet('SELL','market')}, state.t('trade.sell')),
          h('button',{class:'btn buy', onclick:()=>openSheet('BUY','market')}, state.t('trade.buy'))
        )
      ),
      h('div',{class:'trade-ticket-section'},
        h('div',{class:'trade-ticket-section-title'}, tr('Planned entry','دخول مخطط','Плановый вход')),
        h('div',{class:'trade-ticket-actions'},
          h('button',{class:'btn outline', onclick:()=>openSheet('BUY','limit')}, `${state.t('trade.buy')} Limit`),
          h('button',{class:'btn outline', onclick:()=>openSheet('SELL','limit')}, `${state.t('trade.sell')} Limit`)
        )
      ),
      h('div',{class:'trade-ticket-quicklinks'},
        h('button',{class:'btn secondary', onclick:()=>location.hash='#/markets'}, state.t('market.select')),
        h('button',{class:'btn secondary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions'))
      ),
      h('div',{class:'trade-ticket-note muted small'}, tr('The trade form includes amount, leverage, TP and SL so the process stays simple without hiding important controls.','نموذج الصفقة يتضمن المبلغ والرافعة ووقف الخسارة وجني الربح حتى تبقى العملية سهلة بدون إخفاء العناصر المهمة.','Форма сделки включает сумму, плечо, TP и SL, поэтому процесс остаётся простым без скрытия важных параметров.'))
    )
  );
  panel.__updatePrice = ()=>{ priceValue.textContent = priceRef.value ? `$${fmt(priceRef.value,4)}` : '—'; };
  return panel;
}


function vpTradeQuoteTsSec(rawTs){
  const raw = Number(rawTs || 0);
  if(!(raw > 0)) return 0;
  return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
}
function vpTradeSeedQuoteFresh(seed, opts={}){
  try{
    if(!seed || typeof seed !== 'object') return false;
    const wantSymbol = String(opts.symbol || '').toUpperCase().trim();
    const wantType = normalizeLiveAssetType(opts.type || 'crypto');
    const gotSymbol = String(seed.symbol || '').toUpperCase().trim();
    const gotType = normalizeLiveAssetType(seed.type || opts.type || 'crypto');
    if(wantSymbol && gotSymbol && gotSymbol !== wantSymbol) return false;
    if(wantType && gotType && gotType !== wantType) return false;
    const ts = vpTradeQuoteTsSec(seed.updated_at || seed.ts || seed.time || 0);
    if(!(ts > 0)) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    const ageSec = Math.max(0, nowSec - ts);
    const maxAgeSec = Number(opts.maxAgeSec || (wantType === 'crypto' ? 18 : 12));
    return ageSec <= maxAgeSec;
  }catch(_err){
    return false;
  }
}
function vpResolveFreshTradeSeed(symbol, assetType, seedMeta){
  const safeType = normalizeLiveAssetType(assetType || 'crypto');
  const maxAgeSec = safeType === 'crypto' ? 8 : 2;
  const accept = (candidate)=>{
    try{
      if(!vpTradeSeedQuoteFresh(candidate, {symbol, type: safeType, maxAgeSec})) return null;
      if(safeType === 'crypto') return candidate;
      const src = String(candidate?.source || candidate?.provider || '').toLowerCase();
      const price = safeNum(candidate?.price || candidate?.last || candidate?.mark_price, 0);
      const ts = vpTradeQuoteTsSec(candidate?.updated_at || candidate?.ts || candidate?.time || 0);
      if(price > 0 && ts > 0 && isTrustedUiLiveSource(src, symbol, safeType)) return candidate;
    }catch(_e){}
    return null;
  };
  try{
    const first = accept(seedMeta);
    if(first) return first;
  }catch(_err){}
  try{
    const seeded = accept(state.__tradeSeedQuote);
    if(seeded) return seeded;
  }catch(_err){}
  return null;
}
function vpResolveFreshQuoteCacheQuote(symbol, assetType, nextMarket){
  try{
    const safeType = normalizeLiveAssetType(assetType || 'crypto');
    const maxAgeSec = safeType === 'crypto' ? 12 : 18;
    const remembered = vpGetFreshRememberedQuote(symbol, safeType, maxAgeSec);
    if(remembered){
      const remSrc = String(remembered?.source || remembered?.provider || '').toLowerCase();
      if(isTrustedUiLiveSource(remSrc, symbol, safeType)) return remembered;
    }
    if(typeof QuoteCache === 'undefined' || !QuoteCache || typeof QuoteCache.get !== 'function') return null;
    const cached = QuoteCache.get();
    if(!cached) return null;
    const market = String(nextMarket || 'spot').toLowerCase();
    const px = safeNum(resolveQuoteLivePrice(cached, market, safeType), 0);
    if(!(px > 0)) return null;
    const ts = vpTradeQuoteTsSec(cached.updated_at || cached.ts || cached.time || (typeof QuoteCache.lastAt === 'function' ? QuoteCache.lastAt() : 0));
    const synthetic = Object.assign({}, cached, { updated_at: ts || vpTradeQuoteTsSec(Date.now()) });
    const src = String(synthetic?.source || synthetic?.provider || '').toLowerCase();
    if(safeType !== 'crypto' && !isTrustedUiLiveSource(src, symbol, safeType)) return null;
    return vpTradeSeedQuoteFresh(synthetic, {symbol, type: safeType, maxAgeSec}) ? synthetic : null;
  }catch(_err){
    return null;
  }
}

function tradePage(){
  try{
    const currentHash = String(location.hash || '#/trade');
    if(currentHash.indexOf('#/markets') !== 0) state.__vpTradeSymbolsDrawerOpen = false;
  }catch(e){}
  const tradeRoute = syncTradeRouteIntoState(getTradeRouteSnapshot());
  const symbol = String(tradeRoute.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase();
  const seedMeta = resolveTradeSymbolSeed(symbol, tradeRoute.type || state.selectedAssetType);
  const selectedItem = (state.markets || []).find(x => String(x?.symbol || '').toUpperCase() === symbol) || seedMeta || null;
  const assetType = String((selectedItem && selectedItem.type) || tradeRoute.type || state.selectedAssetType || 'crypto').toLowerCase();
  const bootstrapQuote = readActiveTradeBootstrapQuote(tradeRoute);
  const freshSeedMeta = vpResolveFreshTradeSeed(symbol, assetType, Object.assign({}, seedMeta || {}, (bootstrapQuote && bootstrapQuote.price > 0) ? bootstrapQuote : {}));
  state.selectedAssetType = assetType;
  try{ localStorage.setItem('marketType', assetType); }catch(e){}

  const marketTypeRef = {
    value: String(tradeRoute.market || localStorage.getItem('tradeMarket') || ((assetType === 'crypto' || assetType === 'futures') ? 'perp' : 'spot')).toLowerCase() === 'spot'
      ? 'spot'
      : ((assetType === 'crypto' || assetType === 'futures') ? 'perp' : 'spot')
  };

  const mk = Object.assign({}, seedMeta || {}, (state.markets || []).find(x => (x.symbol||'').toUpperCase() === symbol) || {});
  const ch = safeNum(mk.change_pct, 0);

  // balances
  const wsum = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  function calcTradeTotals(mode){
    mode = (mode==='real') ? 'real' : 'demo';
    const pf = (mode==='real') ? state.realPortfolio : state.portfolio;
    const cur = (mode==='real')
      ? (wsum?.real?.currency ? String(wsum.real.currency).toUpperCase() : 'USDT')
      : (wsum?.demo?.currency ? String(wsum.demo.currency).toUpperCase() : 'USDT_DEMO');
    const w = (pf && pf.wallet) ? (pf.wallet[cur] || pf.wallet.USDT || pf.wallet.USDT_DEMO || {}) : {};
    const availCash = Number(w.available ?? w.balance ?? 0);
    const positions = Array.isArray(pf?.positions) ? pf.positions : [];
    const marginUsed = positions.reduce((acc, pos)=>{
      const st = String(pos?.status||'open').toLowerCase();
      if(st && st !== 'open') return acc;
      const mt = String(pos?.market_type||'spot').toLowerCase();
      const qty = Math.abs(Number(pos?.qty||0));
      const entry = Number(pos?.entry_price||0);
      const lev = Math.max(1, Number(pos?.leverage||1));
      const margin = Number(pos?.margin_initial||0);
      if(mt==='perp'){
        if(margin>0) return acc + margin;
        return acc + ((qty*entry)/lev);
      }
      return acc + (margin>0?margin:(qty*entry));
    }, 0);
    const investUsed = safeNum(pf?.invest_in_use, 0);
    const inUse = Math.max(0, marginUsed + investUsed);
    const unreal = safeNum(pf?.unrealized_pnl, 0);
    const availableEq = availCash + unreal;
    const totalEq = Math.max(0, availableEq + inUse);
    return {availableEq, totalEq};
  }


  const activeTradeMode = ()=>String(state.tradeMode || 'demo').toLowerCase()==='real' ? 'real' : 'demo';
  const activeTradePortfolio = ()=>activeTradeMode()==='real' ? state.realPortfolio : state.portfolio;
  async function refreshActiveTradeData(force){
    const mode = activeTradeMode();
    try{
      if(mode === 'real'){
        await Promise.allSettled([refreshRealPortfolio(force), refreshRealPnlStats()]);
      }else{
        await Promise.allSettled([refreshPortfolio(force), refreshPnlStats()]);
      }
    }catch(e){}
    return activeTradePortfolio();
  }

  // refs for fast UI updates (no full render on each tick)
  const priceEl = h('span',{class:'trade-price'}, '—');
  const liveDotEl = h('span',{class:'live-dot', title: vpIsDelayedQuoteType(assetType) ? tr('Delayed quote','سعر متأخر','Задержанная котировка') : 'Live'}, '');
  const changeEl = h('span',{class:`trade-change ${ch>=0?'up':'down'}`}, `${ch>=0?'+':''}${fmt(ch,2)}%`);
  // NOTE: do not escape template placeholders; these must render translated labels.
  const __tradeInitMode = state.tradeMode==='real' ? 'real' : 'demo';
  const __tradeAccInit = currentAccountModeData(__tradeInitMode);
  const __tradePnlInit = safeNum((__tradeInitMode==='real' ? state.realPnlStats?.total_pnl : state.pnlStats?.total_pnl), safeNum(__tradeAccInit.realized, 0) + safeNum(__tradeAccInit.unreal, 0));
  const tradeBalanceModeEl = h('span',{class:'chip trade-balance-mode-chip','data-trade-balance-mode':'1'}, __tradeInitMode==='real' ? state.t('trade.mode_real') : state.t('trade.mode_demo'));
  const tradeBalanceTotalValueEl = h('strong',{class:'v','data-trade-balance-total':'1'}, `$${fmt(Math.max(0, safeNum(__tradeAccInit.balance, 0) + safeNum(__tradeAccInit.unreal, 0)),2)}`);
  const tradeBalanceAvailableValueEl = h('strong',{class:'v','data-trade-balance-available':'1'}, `$${fmt(Math.max(0, safeNum(__tradeAccInit.available, 0)),2)}`);
  const tradeBalancePnlValueEl = h('strong',{class:`v ${__tradePnlInit>=0?'up':'down'}`,'data-trade-balance-pnl':'1'}, `${__tradePnlInit>=0?'+':''}$${fmt(__tradePnlInit,2)}`);
  const tradeBalanceCaptionEl = h('small',{class:'trade-balance-caption','data-trade-balance-caption':'1'}, __tradeInitMode==='real'
    ? tr('Live balances, available funds, and total PnL sync here.','هنا يظهر رصيد الحقيقي والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются live-баланс, доступные средства и общий PnL.')
    : tr('Demo balances, available funds, and total PnL sync here.','هنا يظهر رصيد الديمو والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются демо-баланс, доступные средства и общий PnL.'));
  const demoChip = tradeBalanceModeEl;
  // Show the real balance without the "Primary" label (user already has a "Real" label elsewhere).

  // PERP extras removed from UI (we keep mark price internally for PnL/ROE)
  const initialLiveSeed = (bootstrapQuote && safeNum(bootstrapQuote.price, 0) > 0) ? bootstrapQuote : freshSeedMeta;
  const extraRef = { value: (initialLiveSeed && ((safeNum(initialLiveSeed.price,0)>0) || Number.isFinite(Number(initialLiveSeed.change_pct)))) ? initialLiveSeed : null };

  // Live PnL ticker stop handle (restarted when positions refresh)
  let stopLivePos = null;
  let tradeSeedReqSeq = 0;
  let tradeBootstrapReqSeq = 0;
  const tradeBootstrapGate = (window.__vpTradeBootstrapGate instanceof Map) ? window.__vpTradeBootstrapGate : (window.__vpTradeBootstrapGate = new Map());
  const tradeSeedFetchedByKey = (window.__vpTradeSeedFetchedByKey instanceof Map) ? window.__vpTradeSeedFetchedByKey : (window.__vpTradeSeedFetchedByKey = new Map());
  const tradeSeedSoftErrorByKey = (window.__vpTradeSeedSoftErrorByKey instanceof Map) ? window.__vpTradeSeedSoftErrorByKey : (window.__vpTradeSeedSoftErrorByKey = new Map());
  let tradeLoadMoreReqSeq = 0;
  let tradeSeedInflightKey = '';
  let tradeSeedInflightPromise = null;
  let tradeSeedLastFetchedAt = 0;
  let tradeVisibleResyncAt = 0;
  const tradeRouteCommit = (partial={})=>{
    try{
      if(typeof window.vpCommitTradeRoute === 'function'){
        window.vpCommitTradeRoute(Object.assign({ symbol, type: assetType, market: marketTypeRef.value }, partial || {}));
        return;
      }
    }catch(err){}
  };
  onCleanup(()=>{ try{ if(stopLivePos) stopLivePos(); }catch(e){} stopLivePos = null; tradeSeedReqSeq += 1; tradeBootstrapReqSeq += 1; tradeLoadMoreReqSeq += 1; tradeSeedInflightKey = ''; tradeSeedInflightPromise = null; tradeSeedLastFetchedAt = 0; tradeVisibleResyncAt = 0; });

  const canvas = h('canvas',{class:'trade-canvas'});
  const tvStage = h('div',{class:'tv-chart-stage hidden'});
  const chartStage = h('div',{class:'trade-chart-stage'}, canvas, tvStage);
  const chartSymbolEl = h('div',{class:'trade-chart-symbol'}, String(symbol || '').toUpperCase());
  const chartDisplay = (()=>{
    try{
      if (typeof window.vpInstrumentDisplay === 'function') return window.vpInstrumentDisplay(mk || {});
    }catch(_e){}
    const sym = String((mk && (mk.symbol || mk.code)) || symbol || '').toUpperCase();
    const raw = String((mk && (mk.name || mk.title || mk.instrument_name || mk.display_name)) || '').trim();
    return { primary: sym || raw || '—', secondary: raw || sym || '—' };
  })();
  const chartNameEl = h('div',{class:'trade-chart-name'}, String(chartDisplay.secondary || chartDisplay.primary || '—'));
  const chartLiveBadge = h('span',{class:'trade-chart-live-badge'}, vpDelayedBadgeText(assetType, false));
  const chartLivePriceEl = h('div',{class:'trade-chart-live-price'}, '—');
  const chartLiveChangeEl = h('div',{class:'trade-chart-live-change ' + (ch>=0?'up':'down')}, `${ch>=0?'+':''}${fmt(ch,2)}%`);
  const chartMarketInfoEl = h('div',{class:'trade-chart-marketinfo'}, `${String(marketTypeRef.value || 'spot').toUpperCase()} • ${String(assetType || '').toUpperCase()}`);
  const chartSourceEl = h('div',{class:'trade-chart-source'}, tr('Native chart • platform quotes','شارت داخلي • أسعار المنصة','Нативный график • котировки платформы'));
  const chartTopbar = h('div',{class:'trade-chart-topbar'},
    h('div',{class:'trade-chart-topbar-left'},
      h('div',{class:'trade-chart-symbolwrap'}, chartSymbolEl, chartNameEl),
      chartLiveBadge
    ),
    h('div',{class:'trade-chart-topbar-right'},
      chartMarketInfoEl,
      chartSourceEl
    )
  );
  const chartWrap = h('div',{class:'trade-chart card'}, chartTopbar, chartStage);


  const posCountEl = h('span',{class:'muted tiny'}, '');
  const posListHost = h('div',{id:'posListHost'});
  const posHost = h('div',{class:'card trade-positions'},
    h('div',{class:'pos-head'},
      h('div',{class:'h2'}, state.t('trade.active_positions')),
      h('div',{class:'row', style:'gap:8px;align-items:center'},
        posCountEl,
        h('button',{class:'btn small', onclick:()=>loadPositionsIntoUI()}, state.t('common.refresh'))
      )
    ),
    posListHost
  );

  const logsHost = h('div',{class:'card trade-logs'},
    h('div',{class:'logs-head'},
      h('div',{class:'h2'}, state.t('trade.deals')),
      (function(){
        const sideSel = h('select',{class:'input mini', id:'sideSel'},
          h('option',{value:''}, state.t('common.all')),
          h('option',{value:'BUY'}, state.t('trade.buy')),
          h('option',{value:'SELL'}, state.t('trade.sell'))
        );
        const symIn = h('input',{
          class:'input mini',
          id:'symIn',
          placeholder: state.t('trade.symbol_filter_placeholder'),
          value: symbol
        });
        return h('div',{class:'logs-controls'},
          symIn, sideSel
        );
      })()
    ),
    h('div',{id:'logsList'}, h('div',{class:'muted small'}, state.t('common.loading')))
  );

  const badgeEl = h('div',{class:'badge'}, marketTypeRef.value==='perp'?'PERP':'SPOT');

  const marketToggle = h('div',{class:'trade-toggle'},
    h('button',{class:`tbtn ${marketTypeRef.value==='spot'?'on':''}`, type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} switchMarket('spot'); }}, 'SPOT'),
    h('button',{class:`tbtn ${marketTypeRef.value==='perp'?'on':''}`, type:'button', onclick:(e)=>{ try{ if(e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} switchMarket('perp'); }}, 'PERP')
  );

  // layout sync: keep logs above sticky actions
  setTimeout(()=>{
    const sticky = document.querySelector('.trade-sticky');
    if(sticky){
      const h = Math.ceil(sticky.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--trade-sticky-h', h+'px');
    }
  }, 0);


  const initialTradePrice = safeNum((initialLiveSeed && initialLiveSeed.price) || (bootstrapQuote && bootstrapQuote.price), 0);
  const lastPriceRef = { value: initialTradePrice > 0 ? initialTradePrice : null };
  const watchPanel = createTradeWatchlistPanel(symbol, assetType, (item)=>{
    try{
      if(typeof window.vpApplyTradeSelection === 'function' && window.vpApplyTradeSelection(item)) return;
    }catch(e){}
    state.selectedSymbol = String(item.symbol||symbol).toUpperCase();
    state.selectedAssetType = String(item.type||assetType||'crypto');
    try{ state.__tradeSeedQuote = {symbol:String(item.symbol||symbol).toUpperCase(), type:String(item.type||assetType||'crypto'), price:Number(item.price||0), change_pct:Number(item.change_pct||0), updated_at:Number(item.updated_at||0)||0}; }catch(e){}
    state.selectedMarketType = state.selectedAssetType;
    render(true);
  }, { getMarketType: ()=>marketTypeRef.value });
  const orderPanelHost = h('div',{class:'trade-order-panel-host'});
  let currentOrderPanel = null;
  function rebuildOrderPanel(){
    const nextPanel = createTradeOrderPanel({
      symbol,
      assetType,
      marketType: marketTypeRef.value,
      getMarketType: ()=>marketTypeRef.value,
      priceRef:lastPriceRef,
      onDone:afterOrder
    });
    orderPanelHost.innerHTML = '';
    if(nextPanel) orderPanelHost.appendChild(nextPanel);
    currentOrderPanel = nextPanel || null;
    try{ currentOrderPanel && currentOrderPanel.__updatePrice && currentOrderPanel.__updatePrice(); }catch(e){}
    try{ currentOrderPanel && currentOrderPanel.__updateQuote && currentOrderPanel.__updateQuote(extraRef.value || null); }catch(e){}
  }
  rebuildOrderPanel();
  const signalsPanel = createTradeSignalsPanel({
    symbol,
    assetType,
    openSignal:(sig)=>tradeOpenOrderSheet({
      side: String(sig?.direction || 'BUY').toUpperCase()==='SELL' ? 'SELL' : 'BUY',
      symbol,
      assetType,
      marketType: marketTypeRef.value,
      lastPrice: Number(sig?.entry || lastPriceRef.value || 0) || lastPriceRef.value,
      onDone: afterOrder
    })
  });

  const resolveTradeViewportWidth = ()=>{
    const vv = Number(window.visualViewport && window.visualViewport.width) || 0;
    const iw = Number(window.innerWidth || 0) || 0;
    return Math.max(vv, iw, 0);
  };
  const computeTradeMobile = ()=>resolveTradeViewportWidth() > 0 ? resolveTradeViewportWidth() <= 768 : ((window.innerWidth || 0) <= 768);
  const isTradeMobile = computeTradeMobile();
  const tradeViewportModeRef = { value: isTradeMobile ? 'mobile' : 'desktop' };
  const mobileAccountNo = state.tradeMode === 'real' ? (state.me?.live_account?.account_no || state.me?.uid || '—') : (state.me?.demo_account?.account_no || state.me?.uid || '—');
  const mobileAccountLabel = state.tradeMode === 'real' ? state.t('trade.mode_real') : state.t('trade.mode_demo');
  const mobileBalanceValue = state.tradeMode === 'real'
    ? safeNum(wsum?.real?.available, safeNum(wsum?.real?.balance, 0))
    : safeNum(wsum?.demo?.available, safeNum(wsum?.demo?.balance, 0));
  const currentHoldValue = state.tradeMode === 'real'
    ? safeNum(wsum?.real?.holds, 0)
    : safeNum(wsum?.demo?.holds, 0);
  const tradeSummaryStrip = h('div',{class:'trade-summary-strip trade-summary-strip-premium'},
    h('div',{class:'mini-stat-card trade-balance-stat'},
      h('span',{class:'k'}, tr('Total balance','الرصيد الكلي','Общий баланс')),
      tradeBalanceTotalValueEl,
      h('small',{}, tr('Live account value including active PnL','قيمة الحساب الحالية متضمنة الربح والخسارة الحية','Текущая стоимость счёта с учётом live PnL'))
    ),
    h('div',{class:'mini-stat-card trade-balance-stat good'},
      h('span',{class:'k'}, tr('Available','المتاح','Доступно')),
      tradeBalanceAvailableValueEl,
      h('small',{}, tr('Ready for new orders and margin use','جاهز للصفقات الجديدة واستخدام الهامش','Готово для новых ордеров и использования маржи'))
    ),
    h('div',{'data-trade-balance-pnl-card':'1', class:`mini-stat-card trade-balance-stat pnl ${__tradePnlInit>=0?'up':'down'}`.trim()},
      h('span',{class:'k'}, tr('PnL total','إجمالي الربح والخسارة','Общий PnL')),
      tradeBalancePnlValueEl,
      h('small',{}, tr('Combined realized and live floating result','النتيجة المجمعة بين المحقق والعائم الحي','Сумма реализованного и текущего плавающего результата'))
    )
  );

  const tradeLayoutNode = (()=>{
    if(isTradeMobile){
      return h('div',{class:'trade-mobile-stack'}, chartWrap, orderPanelHost, signalsPanel, posHost, watchPanel, logsHost);
    }
    const tradeCenter = h('div',{class:'trade-center-col'}, chartWrap, posHost, logsHost);
    const tradeRightCol = h('div',{class:'trade-right-col'}, orderPanelHost, signalsPanel);
    return h('div',{class:'trade-grid-desktop'}, watchPanel, tradeCenter, tradeRightCol);
  })();

  const root = h('div',{class:'trade-v3 mb-trade-v29'},
    h('div',{class:'card trade-head ' + (isTradeMobile ? 'trade-head-mobile' : '')},
      h('div',{class:'trade-head-row'},
        h('div',{class:'trade-balance-hero'},
          h('div',{class:'trade-balance-copy'},
            h('span',{class:'trade-balance-eyebrow'}, tr('Trade balance','رصيد التداول','Торговый баланс')),
            h('strong',{class:'trade-balance-title','data-trade-balance-mode':'1'}, mobileAccountLabel),
            tradeBalanceCaptionEl
          ),
          h('div',{class:'trade-chips'}, demoChip)
        ),
        h('div',{class:'trade-head-actions'},
          h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, state.t('nav.account')),
          h('button',{class:'btn deposit-btn with-ico', onclick:()=>{ if(!requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.deposit_failed')))); }},
            h('span',{class:'ico'}, h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},
              h('path',{d:'M12 4v12m0 0l-5-5m5 5l5-5',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'})
            )),
            state.t('wallet.deposit')
          )
        )
      ),
      h('div',{class:'trade-account-meta'},
        h('span',{class:'chip'}, `${tr('Account','الحساب','Счёт')}: ${String(mobileAccountNo)}`),
        h('span',{class:'chip ghost'}, `${tr('Market','السوق','Рынок')}: ${marketTypeRef.value.toUpperCase()}`)
      ),
      tradeSummaryStrip,
      buildRealWorkflowNotice('trade'),
      h('div',{class:'divider'}),
      h('div',{class:'trade-head-row2'},
        h('div',{class:'trade-sym'},
          h('div',{class:'sym-top'},
            h('div',{class:'sym-name'}, symbol),
            badgeEl
          ),
          h('div',{class:'sym-sub sym-sub-clean'},
            h('span',{class:'trade-head-live-inline'}, liveDotEl, priceEl),
            changeEl
          ),
          marketToggle
        ),
        h('div',{class:'trade-head-actions'},
          h('button',{class:'btn outline', onclick:()=>location.hash='#/markets'}, state.t('market.select')),
          h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions'))
        )
      )
    ),

    tradeLayoutNode,

    (!isTradeMobile ? h('div',{class:'trade-sticky'},
      h('button',{class:'btn sell', onclick:()=>tradeOpenOrderSheet({side:'SELL',symbol,assetType,marketType:marketTypeRef.value,lastPrice:lastPriceRef.value,onDone:afterOrder})}, state.t('trade.sell')),
      h('button',{class:'btn buy', onclick:()=>tradeOpenOrderSheet({side:'BUY',symbol,assetType,marketType:marketTypeRef.value,lastPrice:lastPriceRef.value,onDone:afterOrder})}, state.t('trade.buy'))
    ) : null)
  );

  function computeTradeHeaderMetrics(modeKey){
    const resolved = String(modeKey || activeTradeMode()).toLowerCase() === 'real' ? 'real' : 'demo';
    const acc = currentAccountModeData(resolved);
    const pf = acc.pf || {};
    const positions = Array.isArray(pf.positions) ? pf.positions.filter(pos=>String(pos?.status || 'open').toLowerCase() === 'open') : [];
    const realized = safeNum(pf?.realized_pnl, acc.realized);
    let liveUnreal = 0;
    let pricedCount = 0;
    for(const pos of positions){
      const symDb = String(pos?.symbol || '');
      const posSymbol = (typeof trade_ui_symbol === 'function') ? trade_ui_symbol(symDb) : symDb.replace(/^@R@/, '');
      const mt = String(pos?.market_type || 'spot').toLowerCase();
      const posType = normalizeLiveAssetType(pos?.type || pos?.asset_type || assetType || state.selectedAssetType || 'crypto');
      let mark = 0;
      if(String(posSymbol || '').toUpperCase() === String(symbol || '').toUpperCase()) mark = safeNum(lastPriceRef.value, 0);
      if(!(mark > 0)){
        try{
          const quote = vpCanonicalQuoteForUi(posSymbol, posType, mt, { maxAgeSec: posType === 'crypto' ? 18 : 8 });
          mark = safeNum(resolveQuoteLivePrice(quote, mt, posType), safeNum(quote?.price || quote?.last || quote?.mark_price, 0));
        }catch(e){}
      }
      if(!(mark > 0)) mark = safeNum(pos?.mark_price ?? pos?.current_price ?? pos?.last_price ?? pos?.price, safeNum(pos?.entry_price, 0));
      const qty = Math.abs(Number(pos?.qty || 0));
      const entry = safeNum(pos?.entry_price, 0);
      const side = String(pos?.side || (Number(pos?.qty || 0) < 0 ? 'SELL' : 'BUY')).toUpperCase();
      if(mark > 0 && qty > 0 && entry > 0){
        liveUnreal += __calcPnl(side, qty, entry, mark);
        pricedCount += 1;
      }
    }
    if(!positions.length || !pricedCount) liveUnreal = safeNum(pf?.unrealized_pnl, acc.unreal);
    const totalPnl = realized + liveUnreal;
    const totalBalance = Math.max(0, safeNum(acc.balance, 0) + liveUnreal);
    const available = Math.max(0, safeNum(acc.available, 0));
    return {
      mode: resolved,
      modeLabel: resolved === 'real' ? state.t('trade.mode_real') : state.t('trade.mode_demo'),
      caption: resolved === 'real'
        ? tr('Live balances, available funds, and total PnL sync here.','هنا يظهر رصيد الحقيقي والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются live-баланс, доступные средства и общий PnL.')
        : tr('Demo balances, available funds, and total PnL sync here.','هنا يظهر رصيد الديمو والمتاح وإجمالي الربح والخسارة بشكل متزامن.','Здесь синхронно отображаются демо-баланс, доступные средства и общий PnL.'),
      totalBalance,
      available,
      totalPnl
    };
  }

  function updateTradeBalancePanel(){
    try{
      const metrics = computeTradeHeaderMetrics(activeTradeMode());
      try{ root?.setAttribute('data-trade-account-mode', metrics.mode); }catch(e){}
      try{ root?.querySelector('.trade-head')?.setAttribute('data-trade-account-mode', metrics.mode); }catch(e){}
      root.querySelectorAll('[data-trade-balance-mode]').forEach(el=>{ el.textContent = metrics.modeLabel; });
      root.querySelectorAll('[data-trade-balance-caption]').forEach(el=>{ el.textContent = metrics.caption; });
      root.querySelectorAll('[data-trade-balance-total]').forEach(el=>{ el.textContent = `$${fmt(metrics.totalBalance,2)}`; });
      root.querySelectorAll('[data-trade-balance-available]').forEach(el=>{ el.textContent = `$${fmt(metrics.available,2)}`; });
      root.querySelectorAll('[data-trade-balance-pnl]').forEach(el=>{
        el.textContent = `${metrics.totalPnl>=0?'+':''}$${fmt(metrics.totalPnl,2)}`;
        el.classList.toggle('up', metrics.totalPnl >= 0);
        el.classList.toggle('down', metrics.totalPnl < 0);
      });
      root.querySelectorAll('[data-trade-balance-pnl-card]').forEach(el=>{
        el.classList.toggle('up', metrics.totalPnl >= 0);
        el.classList.toggle('down', metrics.totalPnl < 0);
      });
    }catch(e){}
  }

  updateTradeBalancePanel();

  const onTradeViewportMaybeChange = ()=>{
    try{
      const nextMode = computeTradeMobile() ? 'mobile' : 'desktop';
      if(nextMode === tradeViewportModeRef.value){
        try{ syncTradeFullscreenState(); }catch(e){}
        return;
      }
      tradeViewportModeRef.value = nextMode;
      try{ syncTradeFullscreenState(); }catch(e){}
      if(String(location.hash || '').indexOf('#/trade') !== 0) return;
      requestAnimationFrame(()=>{ try{ render(); }catch(e){} });
    }catch(e){}
  };
  window.addEventListener('resize', onTradeViewportMaybeChange, {passive:true});
  try{ if(window.visualViewport) window.visualViewport.addEventListener('resize', onTradeViewportMaybeChange, {passive:true}); }catch(e){}
  onCleanup(()=>{
    try{ window.removeEventListener('resize', onTradeViewportMaybeChange); }catch(e){}
    try{ if(window.visualViewport) window.visualViewport.removeEventListener('resize', onTradeViewportMaybeChange); }catch(e){}
    try{ document.body.classList.remove('trade-fullscreen-active'); }catch(e){}
    try{ document.documentElement.classList.remove('trade-fullscreen-active'); }catch(e){}
  });

  let tradeSummaryInflight = false;
  const liveSummaryEvery = computeTradeMobile() ? 26000 : 22000;
  const liveSummaryTick = ()=>{
    try{
      if(document.hidden) return;
      if(String(location.hash || '').indexOf('#/trade') !== 0) return;
      if(tradeSummaryInflight) return;
      tradeSummaryInflight = true;
      Promise.allSettled([
        refreshWalletSummary(false),
        refreshActiveTradeData(false)
      ]).finally(()=>{ try{ updateTradeBalancePanel(); }catch(_e){} tradeSummaryInflight = false; });
    }catch(e){
      tradeSummaryInflight = false;
    }
  };
  const liveSummaryTimer = setInterval(liveSummaryTick, liveSummaryEvery);
  const onTradeSummaryVisible = ()=>{ try{ if(!document.hidden) liveSummaryTick(); }catch(e){} };
  try{ document.addEventListener('visibilitychange', onTradeSummaryVisible, {passive:true}); }catch(e){}
  onCleanup(()=>{ try{ clearInterval(liveSummaryTimer); }catch(e){} try{ document.removeEventListener('visibilitychange', onTradeSummaryVisible); }catch(e){} });

  // internal state refs
  let lastHeaderPx = null;
  let loadingMore = false;
  let lastLiveQuoteTs = 0;
  let lastLiveQuotePrice = 0;
  let lastLiveQuoteSource = '';
  const tradeQuoteStore = (typeof window !== 'undefined' && window.VPTradeLiveQuoteStore) ? window.VPTradeLiveQuoteStore : null;
  const readTradeQuoteCtx = ()=>({ symbol: String(symbol || '').toUpperCase(), type: assetType || 'crypto', market: String(marketTypeRef.value || 'spot').toLowerCase() });
  try{ tradeQuoteStore && tradeQuoteStore.setContext(readTradeQuoteCtx()); }catch(e){}
  try{
    const seedSource = String(freshSeedMeta?.source || freshSeedMeta?.provider || '').trim().toLowerCase();
    const seedPrice = safeNum(freshSeedMeta?.price || freshSeedMeta?.last || freshSeedMeta?.mark_price, 0);
    const seedTs = vpTradeQuoteTsSec(freshSeedMeta?.updated_at || freshSeedMeta?.ts || freshSeedMeta?.time || 0);
    const seedTrusted = normalizeLiveAssetType(assetType || 'crypto') === 'crypto'
      ? (seedPrice > 0 && seedTs > 0)
      : (seedPrice > 0 && seedTs > 0 && isTrustedUiLiveSource(seedSource, symbol, assetType || 'crypto'));
    if(seedTrusted){
      lastLiveQuoteTs = seedTs;
      lastLiveQuotePrice = seedPrice;
      lastLiveQuoteSource = seedSource || 'seed';
      const seedRecord = Object.assign({}, freshSeedMeta || {}, { symbol, type: assetType, market: marketTypeRef.value, price: seedPrice, updated_at: seedTs, source: seedSource || 'seed' });
      try{ if(tradeQuoteStore){ tradeQuoteStore.ingest(seedRecord, readTradeQuoteCtx()); } }catch(_e){}
      try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(seedRecord); }catch(_e){}
      try{ if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.ingest === 'function') VPQuoteStore.ingest(seedRecord, { source:'trade_seed' }); }catch(_e){}
    }
  }catch(e){}
  let lastChartSeedTs = 0;
  let lastChartClosePrice = 0;
  const acceptLiveQuote = (quote, price)=>{
    const ts = safeNum(quote?.updated_at ?? quote?.ts ?? Date.now()/1000, Math.floor(Date.now()/1000));
    const px = safeNum(price ?? resolveQuoteLivePrice(quote, marketTypeRef.value, assetType), 0);
    if(!(px > 0)) return false;
    const src = String(quote?.source || '').toLowerCase();
    const activeNormType = normalizeLiveAssetType(assetType || quote?.type || 'crypto');
    const thresholds = vpLiveQuoteThresholds(activeNormType, Math.max(Math.abs(px), Math.abs(lastLiveQuotePrice)));
    const diffAbs = Math.abs(px - lastLiveQuotePrice);
    const diffRel = diffAbs / Math.max(1, Math.abs(lastLiveQuotePrice || px || 1));
    if(lastLiveQuotePrice > 0 && diffAbs < thresholds.dedupeAbs && diffRel < thresholds.dedupeRel && safeNum(quote?.updated_at ?? quote?.ts ?? 0, 0) <= lastLiveQuoteTs + 1 && src === lastLiveQuoteSource){
      return false;
    }
    const isNonCrypto = activeNormType !== 'crypto';
    if(isNonCrypto && lastChartClosePrice > 0 && lastChartSeedTs > 0){
      const chartAgeMs = Date.now() - lastChartSeedTs;
      const chartDrift = Math.abs(px - lastChartClosePrice) / Math.max(1, Math.abs(lastChartClosePrice));
      const chartSeedTs = Math.max(0, Math.floor(lastChartSeedTs / 1000));
      if(chartAgeMs < 45000 && chartDrift > 0.015 && ts <= Math.max(lastLiveQuoteTs, chartSeedTs + 2)) return false;
    }
    if(ts + 1 < lastLiveQuoteTs) return false;
    if(lastLiveQuotePrice > 0){
      const drift = Math.abs(px - lastLiveQuotePrice) / Math.max(1, Math.abs(lastLiveQuotePrice));
      if(ts <= lastLiveQuoteTs && drift > 0.06) return false;
      if(!isNonCrypto){
        const quoteAgeSec = Math.max(0, ts - lastLiveQuoteTs);
        if(drift > 0.025 && quoteAgeSec <= 2) return false;
      }
      if(isNonCrypto && ((!src) || ['cache','stale_cache','seed','seed_price','seed_fallback','chart_seed','seed_candle','yahoo_chart','aggs'].includes(src)) && drift > 0.005){
        return false;
      }
      if(isNonCrypto){
        const stableSources = ['provider_live','provider_fallback','massive','polygon','yahoo'];
        if(lastLiveQuoteSource && src && lastLiveQuoteSource !== src && stableSources.includes(lastLiveQuoteSource) && !stableSources.includes(src) && drift > 0.0025){
          return false;
        }
      }
    }
    const normalizedQuote = Object.assign({}, quote || {}, { symbol, type: assetType, market: marketTypeRef.value, price: px, updated_at: ts, source: src || quote?.provider || '' });
    try{
      if(tradeQuoteStore){
        const accepted = tradeQuoteStore.ingest(normalizedQuote, readTradeQuoteCtx());
        if(!accepted) return false;
        const canonical = tradeQuoteStore.get(readTradeQuoteCtx()) || accepted;
        try{ if(typeof vpRememberLiveQuote === 'function') vpRememberLiveQuote(canonical || normalizedQuote); }catch(_e){}
        try{ if(typeof VPQuoteStore !== 'undefined' && VPQuoteStore && typeof VPQuoteStore.ingest === 'function') VPQuoteStore.ingest(canonical || normalizedQuote, { source:'trade_live_accept' }); }catch(_e){}
        lastLiveQuoteTs = Math.max(lastLiveQuoteTs, safeNum(canonical?.updated_at || canonical?.ts || ts, ts));
        lastLiveQuotePrice = safeNum(canonical?.price || px, px);
        lastLiveQuoteSource = String(canonical?.source || src).toLowerCase();
        return true;
      }
    }catch(e){}
    lastLiveQuoteTs = Math.max(lastLiveQuoteTs, ts);
    lastLiveQuotePrice = px;
    lastLiveQuoteSource = src;
    return true;
  };
  const __tradeTvOnly = false;
  const chart = __tradeTvOnly ? createTradeChartStub() : new TradeCanvasChart(canvas, { onNeedMore: ()=>loadMoreCandles().catch(()=>{}) });

  // ===== Chart tools (timeframes + indicators) =====
  const allowedTf = ['1m','3m','5m','15m','30m','1h','2h','4h','1d'];
  let tf = (localStorage.getItem('trade_tf') || '1m').trim();
  if(!allowedTf.includes(tf)) tf = '1m';

  const quickTf = ['1m','5m','15m','30m','1h'];
  const tfBtns = quickTf.map(v=>h('button',{class:'toolbtn tf'+(v===tf?' on':''), 'data-tf':v, onclick:()=>setTf(v)}, v));
  const tfSel = h('select',{class:'toolsel', onchange:()=>setTf(tfSel.value)},
    ...allowedTf.map(v=>h('option',{value:v, selected:v===tf}, v))
  );

  const tvPrefs = {
    volume: true,
    ma: !!chart.opts.ma,
    ema: !!chart.opts.ema,
  };
  let tvEnabled = false;

  const tvIntervalFromTf = (value)=>{
    const raw = String(value || '15m').trim().toLowerCase();
    if(raw === '1d') return 'D';
    if(raw.endsWith('h')) return String(Math.max(1, parseInt(raw, 10) || 1) * 60);
    if(raw.endsWith('m')) return String(Math.max(1, parseInt(raw, 10) || 1));
    return String(parseInt(raw, 10) || 15);
  };

  const activeTvStudies = ()=>{
    const studies = [];
    if(tvPrefs.volume) studies.push('Volume@tv-basicstudies');
    if(tvPrefs.ma) studies.push('MASimple@tv-basicstudies');
    if(tvPrefs.ema) studies.push('MAExp@tv-basicstudies');
    return studies;
  };

  const ensureTvSymbol = ()=>{
    const tvSymbol = normalizeTradingViewSymbol(symbol, assetType, mk.tv_symbol || '');
    if(tvSymbol) return tvSymbol;
    toast(state.lang==='ar' ? 'هذا الرمز غير متاح حالياً عبر TradingView' : (state.lang==='ru' ? 'Этот символ сейчас недоступен в TradingView' : 'This symbol is not currently available on TradingView'));
    return '';
  };

  const mountActiveTradingView = ()=>{
    const tvSymbol = ensureTvSymbol();
    if(!tvSymbol) return false;
    const nextCfg = {
      symbol: tvSymbol,
      locale: state.lang,
      interval: tvIntervalFromTf(tf),
      studies: activeTvStudies()
    };
    const nextKey = JSON.stringify(nextCfg);
    if(tvStage && tvStage.dataset && tvStage.dataset.tvMountKey === nextKey && tvStage.childElementCount > 0) return true;
    if(tvStage && tvStage.dataset) tvStage.dataset.tvMountKey = nextKey;
    mountTradingViewWidget(tvStage, nextCfg);
    return true;
  };

  const syncTradeToolbarState = ()=>{
    btnCross.textContent = tvEnabled ? 'VOL' : '⌖';
    btnCross.title = tvEnabled ? 'Volume' : 'Crosshair';
    btnCross.classList.toggle('on', tvEnabled ? !!tvPrefs.volume : !!chart.opts.crosshair);
    btnMA.classList.toggle('on', tvEnabled ? !!tvPrefs.ma : !!chart.opts.ma);
    btnEMA.classList.toggle('on', tvEnabled ? !!tvPrefs.ema : !!chart.opts.ema);
    
  };

  const setTradingViewEnabled = (next)=>{
    const desired = __tradeTvOnly ? true : !!next;
    if(desired){
      if(!mountActiveTradingView()) return;
    } else {
      tvStage.innerHTML = '';
      try{ if(tvStage && tvStage.dataset) delete tvStage.dataset.tvMountKey; }catch(e){}
    }
    tvEnabled = desired;
    try{ localStorage.setItem('trade_tv_enabled', desired ? '1' : '0'); }catch(e){}
    chartStage.classList.toggle('tv-on', tvEnabled);
    tvStage.classList.toggle('hidden', !tvEnabled);
    canvas.classList.toggle('hidden', tvEnabled);
    syncTradeToolbarState();
  };

  const btnCross = h('button',{class:'toolbtn'+(chart.opts.crosshair?' on':''), title:'Crosshair', onclick:()=>{
    if(tvEnabled){
      tvPrefs.volume = !tvPrefs.volume;
      if(!mountActiveTradingView()) return;
      syncTradeToolbarState();
      return;
    }
    chart.setOptions({crosshair: !chart.opts.crosshair});
    syncTradeToolbarState();
  }}, '⌖');

  const btnMA = h('button',{class:'toolbtn'+(chart.opts.ma?' on':''), title:'MA(20)', onclick:()=>{
    const next = !chart.opts.ma;
    chart.setOptions({ma: next});
    tvPrefs.ma = next;
    if(tvEnabled){
      if(!mountActiveTradingView()) return;
    }
    syncTradeToolbarState();
  }}, 'MA');

  const btnEMA = h('button',{class:'toolbtn'+(chart.opts.ema?' on':''), title:'EMA(50)', onclick:()=>{
    const next = !chart.opts.ema;
    chart.setOptions({ema: next});
    tvPrefs.ema = next;
    if(tvEnabled){
      if(!mountActiveTradingView()) return;
    }
    syncTradeToolbarState();
  }}, 'EMA');

  const btnReset = h('button',{class:'toolbtn', title:'Reset', onclick:()=>{
    if(tvEnabled){
      mountActiveTradingView();
      syncTradeToolbarState();
      return;
    }
    chart.resetView();
  }}, '⟲');

  
  let tradeFullscreen = false;
  let tradePositionsPeek = false;
  const tradeCanUseFullscreen = ()=>!computeTradeMobile();
  const syncTradeFullscreenState = ()=>{
    const canFullscreen = tradeCanUseFullscreen();
    if(!canFullscreen) tradeFullscreen = false;
    try{ root.classList.toggle('trade-fullscreen', canFullscreen && !!tradeFullscreen); }catch(e){}
    try{ root.classList.toggle('trade-positions-open', !!tradePositionsPeek); }catch(e){}
    try{ document.body.classList.toggle('trade-fullscreen-active', canFullscreen && !!tradeFullscreen); }catch(e){}
    try{ document.documentElement.classList.toggle('trade-fullscreen-active', canFullscreen && !!tradeFullscreen); }catch(e){}
    try{ if(btnFullscreen) btnFullscreen.style.display = canFullscreen ? '' : 'none'; }catch(e){}
    try{ if(typeof chart.resize === 'function') setTimeout(()=>{ try{ chart.resize(); }catch(e){} }, 30); }catch(e){}
  };
  const btnPositionsPeek = h('button',{class:'toolbtn', title:'Open positions', onclick:()=>{ tradePositionsPeek = !tradePositionsPeek; syncTradeFullscreenState(); }}, '≣');
  const btnFullscreen = h('button',{class:'toolbtn', title:'Fullscreen chart', onclick:()=>{ if(!tradeCanUseFullscreen()) return; tradeFullscreen = !tradeFullscreen; if(!tradeFullscreen) tradePositionsPeek = false; syncTradeFullscreenState(); }}, '⛶');
  const toolsBar = h('div',{class:'trade-chart-tools'},
    h('div',{class:'toolgroup'},
      h('span',{class:'toolicon'}, '⏱'),
      ...tfBtns,
      tfSel
    ),
    h('div',{class:'toolgroup'},
      btnCross, btnMA, btnEMA, btnReset, btnPositionsPeek, btnFullscreen
    )
  );
  chartWrap.appendChild(toolsBar);
  syncTradeFullscreenState();

  function setTf(next){
    if(!allowedTf.includes(next)) return;
    if(tf === next) return;
    tf = next;
    localStorage.setItem('trade_tf', tf);
    try{ tradeRouteCommit({ market: marketTypeRef.value }); }catch(e){}

    // UI state
    for(const b of tfBtns) b.classList.toggle('on', b.dataset.tf === tf);
    tfSel.value = tf;

    // reload candles + restart stream
    seedCandles();
    stopStream();
    connectWs();
    if(tvEnabled){
      mountActiveTradingView();
      syncTradeToolbarState();
    }
  }

  syncTradeToolbarState();
  setTradingViewEnabled(false);

  function applyTradeQuote(quote, price){
    const px = safeNum(price ?? resolveQuoteLivePrice(quote, marketTypeRef.value, assetType), 0);
    if(!(px > 0)) return null;
    if(!acceptLiveQuote(quote, px)) return null;
    let canonical = Object.assign({}, quote || {}, { symbol, type: assetType, market: marketTypeRef.value, price: px });
    try{ if(tradeQuoteStore){ canonical = tradeQuoteStore.get(readTradeQuoteCtx()) || canonical; } }catch(e){}
    const livePx = safeNum(resolveQuoteLivePrice(canonical, marketTypeRef.value, assetType), safeNum(canonical?.price, px));
    if(!(livePx > 0)) return null;
    lastPriceRef.value = livePx;
    extraRef.value = Object.assign({}, extraRef.value || {}, canonical || {});
    try{ updateTradeBalancePanel(); }catch(e){}
    try{
      if(Array.isArray(state.markets)){
        state.markets = state.markets.map(it => String(it?.symbol||'').toUpperCase()===String(symbol||'').toUpperCase()
          ? Object.assign({}, it, { price: safeNum(livePx, safeNum(it.price, 0)), change_pct: safeNum(canonical?.change_pct ?? it.change_pct ?? 0, safeNum(it.change_pct, 0)), updated_at: safeNum(canonical?.updated_at ?? Date.now()/1000, Math.floor(Date.now()/1000)) })
          : it);
      }
    }catch(e){}
    return { quote: canonical, price: livePx };
  }

  async function bootstrapTradeQuote(){
    const reqSeq = ++tradeBootstrapReqSeq;
    const reqMarket = String(marketTypeRef.value || 'spot').toLowerCase();
    try{
      const normType = normalizeLiveAssetType(assetType || 'crypto');
      const bootKey = `${String(symbol || '').toUpperCase()}:${normType}:${reqMarket}`;
      const bootGap = normType === 'crypto' ? 900 : 2200;
      const prevBootAt = Number(tradeBootstrapGate.get(bootKey) || 0) || 0;
      if(prevBootAt > 0 && (Date.now() - prevBootAt) < bootGap) return;
      tradeBootstrapGate.set(bootKey, Date.now());
    }catch(_e){}
    try{
      const seed = vpResolveFreshTradeSeed(symbol, state.selectedAssetType || assetType || 'crypto', seedMeta);
      if(seed && String(seed.symbol||'').toUpperCase() === String(symbol||'').toUpperCase()){
        const seeded = applyTradeQuote(seed, safeNum(seed.price, 0));
        if(seeded) updateHeader();
      }
    }catch(e){}
    try{
      try{ if(normalizeLiveAssetType(assetType || 'crypto') !== 'crypto') window.__vpTradeBootstrapBusyUntil = Date.now() + 1800; }catch(_e){}
      let fresh = await fetchQuote(symbol, assetType, reqMarket);
      let px = safeNum(resolveQuoteLivePrice(fresh, reqMarket, assetType), 0);
      if(!alive || reqSeq !== tradeBootstrapReqSeq || String(marketTypeRef.value || 'spot').toLowerCase() !== reqMarket) return;
      try{
        const remembered = vpResolveFreshQuoteCacheQuote(symbol, state.selectedAssetType || assetType || 'crypto', reqMarket);
        const rememberedPx = safeNum(resolveQuoteLivePrice(remembered, reqMarket, assetType), 0);
        const rememberedTs = vpTradeQuoteTsSec(remembered?.updated_at || remembered?.ts || remembered?.time || 0);
        const fetchedTs = vpTradeQuoteTsSec(fresh?.updated_at || fresh?.ts || fresh?.time || 0);
        const rememberedSrc = String(remembered?.source || remembered?.provider || '').trim().toLowerCase();
        const rememberedTrusted = rememberedPx > 0 && isTrustedUiLiveSource(rememberedSrc, symbol, assetType || 'crypto') && rememberedTs > 0
          && (normalizeLiveAssetType(assetType || 'crypto') === 'crypto' || ((Math.floor(Date.now()/1000) - rememberedTs) <= 2));
        if(rememberedTrusted && !(px > 0)){
          fresh = Object.assign({}, fresh || {}, remembered, { symbol: String(remembered?.symbol || symbol).toUpperCase(), type: String(remembered?.type || assetType || 'crypto') });
          px = rememberedPx;
        }
      }catch(_e){}
      const applied = applyTradeQuote(fresh, px);
      if(applied){
        try{ if(!(Array.isArray(chart.candles) && chart.candles.length) && safeNum(applied?.price, 0) > 0) tradeApplyLocalSeedFallback(safeNum(applied.price, 0), reqMarket); }catch(_e){}
        updateHeader();
      }else if(fresh && Number.isFinite(Number(fresh?.change_pct ?? extraRef.value?.change_pct))){
        extraRef.value = Object.assign({}, extraRef.value || {}, fresh || {});
        updateHeader();
      }
      try{ state.__tradeSeedQuote = null; }catch(e){}
    }catch(e){}
    finally{ try{ if(normalizeLiveAssetType(assetType || 'crypto') !== 'crypto') window.__vpTradeBootstrapBusyUntil = 0; }catch(_e){} }
  }

  // Load initial candles from backend (auth), then start WS
  let ws = null;
  let poll = null;
  let unsub = null;
  function stopStream(){ try{ ws && ws.close(); }catch(e){} ws = null; }
  let alive = true;

  function startPerpExtras(){
    // No separate polling: QuoteCache drives both price and perp extras.
    extraRef.value = null;
  }

  const updateHeader = rafBatch(()=>{
    const p = lastPriceRef.value;
    const spotlightPriceEl = root.querySelector('.mb-trade-spotlight-price');
    const spotlightHintEl = root.querySelector('.mb-trade-spotlight-pricehint');
    const spotlightChangeEl = root.querySelector('.mb-trade-spotlight-change');
    if (p && isFinite(p)) {
      const px = Number(p);
      const displayPrice = `$${fmt(px, px < 1 ? 5 : 4)}`;
      priceEl.textContent = displayPrice;
      chartLivePriceEl.textContent = displayPrice;
      if (spotlightPriceEl) spotlightPriceEl.textContent = displayPrice;
      try{
        root.dataset.tradeLiveSymbol = String(symbol || '').toUpperCase();
        root.dataset.tradeLivePrice = String(px);
      }catch(err){}
      try{
        root.querySelectorAll('.vp-mobile-trade-live-price').forEach(el=>{ el.textContent = money(px, px < 1 ? 5 : 4); try{ el.dataset.livePrice = String(px); }catch(err){} });
      }catch(e){}
      if (lastHeaderPx !== null && px !== lastHeaderPx) {
        priceEl.classList.toggle('up', px > lastHeaderPx);
        priceEl.classList.toggle('down', px < lastHeaderPx);
        if (spotlightPriceEl) {
          spotlightPriceEl.classList.toggle('up', px > lastHeaderPx);
          spotlightPriceEl.classList.toggle('down', px < lastHeaderPx);
        }
      }
      lastHeaderPx = px;
    } else {
      priceEl.textContent = '—';
      liveDotEl.classList.remove('on');
      if (spotlightPriceEl) spotlightPriceEl.textContent = '—';
      try{
        chartLivePriceEl.textContent = '—';
        chartLiveChangeEl.textContent = '—';
        delete root.dataset.tradeLivePrice;
        delete root.dataset.tradeLiveSymbol;
      }catch(err){}
      try{
        root.querySelectorAll('.vp-mobile-trade-live-price').forEach(el=>{ el.textContent = '—'; try{ delete el.dataset.livePrice; }catch(err){} });
      }catch(e){}
    }

    // 24h change (keep fresh next to the price)
    try{
      let cp = Number((extraRef.value||{}).change_pct);
      if (!Number.isFinite(cp)) {
        const currentMarket = Array.isArray(state.markets)
          ? state.markets.find(it => String(it?.symbol||'').toUpperCase()===String(symbol||'').toUpperCase())
          : null;
        cp = Number(currentMarket?.change_pct ?? mk?.change_pct);
      }
      if (isFinite(cp)) {
        const cpText = `${cp>0?'+':''}${fmt(cp, 2)}%`;
        changeEl.textContent = cpText;
        changeEl.classList.toggle('up', cp > 0);
        changeEl.classList.toggle('down', cp < 0);
        if (spotlightChangeEl) {
          spotlightChangeEl.textContent = cpText;
          spotlightChangeEl.classList.toggle('up', cp > 0);
          spotlightChangeEl.classList.toggle('down', cp < 0);
        }
        try{
          root.querySelectorAll('.vp-trade-live-change').forEach(el=>{
            el.textContent = cpText;
            el.classList.toggle('up', cp > 0);
            el.classList.toggle('down', cp < 0);
          });
        }catch(e){}
      }
    }catch(e){}
    // pulse live indicator when price updates
    if (p && isFinite(p)) {
      liveDotEl.classList.remove('on');
      // force reflow for pulse
      void liveDotEl.offsetWidth;
      liveDotEl.classList.add('on');
    }
    const modeLabel = state.tradeMode==='real' ? state.t('trade.mode_real') : state.t('trade.mode_demo');
    const tt = calcTradeTotals(state.tradeMode==='real'?'real':'demo');
    demoChip.textContent = `${modeLabel} $${fmt(tt.totalEq,2)}`;
    badgeEl.textContent = marketTypeRef.value==='perp'?'PERP':'SPOT';
    try{
      chartMarketInfoEl.textContent = `${String(marketTypeRef.value || 'spot').toUpperCase()} • ${String(assetType || '').toUpperCase()} • ${modeLabel}`;
      chartSourceEl.textContent = tr('Native chart • platform quotes','شارت داخلي • أسعار المنصة','Нативный график • котировки платформы');
    }catch(err){}
    if (spotlightHintEl) spotlightHintEl.textContent = `${vpIsDelayedQuoteType(assetType) ? tr('Synced delayed quote','سعر متأخر متزامن','Синхронизированная задержанная цена') : tr('Synced live quote','سعر حي متزامن','Синхронизированная живая цена')} • ${modeLabel}`;
    try{ currentOrderPanel && currentOrderPanel.__updatePrice && currentOrderPanel.__updatePrice(); }catch(e){}
    try{ currentOrderPanel && currentOrderPanel.__updateQuote && currentOrderPanel.__updateQuote(extraRef.value || null); }catch(e){}

    // bootstrap selected symbol quote once the header bindings exist
    try{ if(!bootstrapTradeQuote.__started){ bootstrapTradeQuote.__started = true; bootstrapTradeQuote(); } }catch(e){}

    // Live PnL/ROE update for open positions
    try{
      const liveMark = (marketTypeRef.value==='perp') ? safeNum((extraRef.value||{}).mark_price, 0) : 0;
      updateLivePositionsForSymbol(symbol, (liveMark>0?liveMark:lastPriceRef.value));
    }catch(e){}
  });

  const tradeCandlesCacheKey = (mk='')=>`trade_candles_v3:${String(symbol || '').toUpperCase()}:${String(assetType || 'crypto').toLowerCase()}:${String(mk || marketTypeRef.value || 'spot').toLowerCase()}:${String(tf || '1m').toLowerCase()}`;
  let tradeSeedAppliedSig = '';
  const tradeSeedLocalSeedItems = (price, tfValue, count=72)=>{
    const px = safeNum(price, 0);
    if(!(px > 0)) return [];
    const sec = Math.max(60, safeNum(tfSec(tfValue || tf || '1m'), 60));
    const nowSec = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(nowSec / sec) * sec;
    const len = Math.max(24, Math.min(160, safeNum(count, 72)));
    const items = [];
    for(let i = len - 1; i >= 0; i--){
      const t = bucket - (i * sec);
      items.push({ time:t, open:px, high:px, low:px, close:px, volume:0 });
    }
    return items;
  };
  const tradeCandlesHaveMovement = (items, sample=36)=>{
    try{
      const list = Array.isArray(items) ? items.filter(Boolean) : [];
      if(list.length < 2) return false;
      const take = Math.max(2, Math.min(list.length, safeNum(sample, 36)));
      const tail = list.slice(-take);
      let minClose = Infinity;
      let maxClose = -Infinity;
      let bodyMoves = 0;
      let wickMoves = 0;
      tail.forEach(item=>{
        const o = safeNum(item?.open, 0);
        const h = safeNum(item?.high, 0);
        const l = safeNum(item?.low, 0);
        const c = safeNum(item?.close, 0);
        if(c > 0){
          minClose = Math.min(minClose, c);
          maxClose = Math.max(maxClose, c);
        }
        const ref = Math.max(Math.abs(o), Math.abs(c), Math.abs(h), Math.abs(l), 1);
        if(Math.abs(c - o) / ref > 1e-9) bodyMoves++;
        if(Math.abs(h - l) / ref > 1e-9) wickMoves++;
      });
      if(!(maxClose > 0) || !(minClose > 0)) return false;
      if((maxClose - minClose) / Math.max(maxClose, 1) > 1e-9) return true;
      return bodyMoves >= 2 || wickMoves >= 2;
    }catch(_e){
      return false;
    }
  };
  const tradeResolveImmediateSeedPrice = ()=>{
    let px = safeNum(lastLiveQuotePrice, 0);
    if(px > 0) return px;
    try{
      const maxAgeSec = normalizeLiveAssetType(assetType || 'crypto') === 'crypto' ? 4 : 2;
      const canonical = (typeof vpCanonicalQuoteForUi === 'function')
        ? vpCanonicalQuoteForUi(symbol, assetType || 'crypto', marketTypeRef.value, { maxAgeSec })
        : null;
      px = safeNum(resolveQuoteLivePrice(canonical, marketTypeRef.value, assetType), safeNum(canonical?.price, 0));
      if(px > 0) return px;
    }catch(_e){}
    try{
      const remembered = vpResolveFreshQuoteCacheQuote(symbol, state.selectedAssetType || assetType || 'crypto', marketTypeRef.value);
      px = safeNum(resolveQuoteLivePrice(remembered, marketTypeRef.value, assetType), safeNum(remembered?.price, 0));
      if(px > 0) return px;
    }catch(_e){}
    try{
      const marketRow = Array.isArray(state.markets)
        ? state.markets.find(it => String(it?.symbol || '').toUpperCase() === String(symbol || '').toUpperCase())
        : null;
      px = safeNum(marketRow?.price, 0);
      if(px > 0) return px;
    }catch(_e){}
    return safeNum(lastPriceRef.value, 0);
  };
  const tradeApplyLocalSeedFallback = (seedPrice, mk='')=>{
    const px = safeNum(seedPrice, 0);
    if(!(px > 0)) return false;
    try{
      const localItems = tradeSeedLocalSeedItems(px, tf || '1m', computeTradeMobile() ? 72 : 96);
      if(!Array.isArray(localItems) || !localItems.length) return false;
      const localSig = tradeChartCandlesSignature(localItems);
      if(localSig !== tradeSeedAppliedSig){
        chart.setCandles(localItems);
        tradeSeedAppliedSig = localSig;
      }
      try{ writeTradeCandlesCache(localItems, mk); }catch(_e){}
      lastChartClosePrice = px;
      lastChartSeedTs = Date.now();
      if(!(lastLiveQuotePrice > 0)) lastPriceRef.value = px;
      try{ chart.setLastPrice(lastLiveQuotePrice > 0 ? lastLiveQuotePrice : px); }catch(_e){}
      updateHeader();
      return true;
    }catch(_e){
      return false;
    }
  };
  const readTradeCandlesCache = (mk='')=>{
    try{
      const raw = localStorage.getItem(tradeCandlesCacheKey(mk));
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      if(!items.length) return null;
      const typeNorm = normalizeLiveAssetType(assetType || 'crypto');
      const maxAgeMs = typeNorm === 'crypto' ? 120000 : 300000;
      const ts = Number(parsed?.ts || 0) || 0;
      if(ts > 0 && (Date.now() - ts) > maxAgeMs) return null;
      if(typeNorm === 'crypto' && !tradeCandlesHaveMovement(items)){
        try{ localStorage.removeItem(tradeCandlesCacheKey(mk)); }catch(_e){}
        return null;
      }
      return items;
    }catch(e){
      return null;
    }
  };
  const writeTradeCandlesCache = (items, mk='')=>{
    try{
      if(!Array.isArray(items) || !items.length) return;
      const key = tradeCandlesCacheKey(mk);
      if(normalizeLiveAssetType(assetType || 'crypto') === 'crypto' && !tradeCandlesHaveMovement(items)){
        try{ localStorage.removeItem(key); }catch(_e){}
        return;
      }
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), items }));
    }catch(e){}
  };

  function tradeCandleTimeoutMs(type, market){
    const norm = normalizeLiveAssetType(type || 'crypto');
    const mk = String(market || 'spot').toLowerCase();
    if(norm === 'crypto') return mk === 'perp' ? 9000 : 7000;
    if(norm === 'forex') return 8500;
    if(norm === 'commodities') return 9500;
    if(norm === 'stocks' || norm === 'arab' || norm === 'futures') return 11000;
    return 9000;
  }

  async function seedCandles(opts={}){
    const reqSeq = ++tradeSeedReqSeq;
    const reqMarket = String(marketTypeRef.value || 'spot').toLowerCase();
    const reqTf = String(tf || '15m');
    const reqKey = `${String(symbol || '').toUpperCase()}:${String(assetType || 'crypto').toLowerCase()}:${reqMarket}:${reqTf}`;
    const nowMs = Date.now();
    const typeNorm = normalizeLiveAssetType(assetType || 'crypto');
    const isHidden = !!(typeof document !== 'undefined' && document.hidden);
    const force = !!opts.force;
    const preferCachedOnly = !!opts.cachedOnly || (isHidden && !force);
    const reseedMinMs = typeNorm === 'crypto' ? 45000 : 90000;
    const cachedItems = readTradeCandlesCache(reqMarket);
    const keyLastFetchedAt = Number(tradeSeedFetchedByKey.get(reqKey) || 0) || 0;
    const seedLimit = typeNorm === 'crypto'
      ? (computeTradeMobile() ? 120 : 180)
      : (computeTradeMobile() ? 220 : 320);
    const immediateSeedPrice = tradeResolveImmediateSeedPrice();
    const softErrorAt = Number(tradeSeedSoftErrorByKey.get(reqKey) || 0) || 0;
    if(typeNorm !== 'crypto' && !force && softErrorAt > 0 && (nowMs - softErrorAt) < 180000) {
      updateHeader();
      return { items: Array.isArray(chart.candles) && chart.candles.length ? chart.candles : (cachedItems || []), cached: true, cooledOff: true };
    }
    try{
      if(alive && reqSeq === tradeSeedReqSeq && Array.isArray(cachedItems) && cachedItems.length){
        const cachedSig = tradeChartCandlesSignature(cachedItems);
        if(cachedSig !== tradeSeedAppliedSig){
          try{ chart.setCandles(cachedItems); }catch(_e){}
          tradeSeedAppliedSig = cachedSig;
        }
        try{
          const cachedLast = cachedItems[cachedItems.length - 1] || null;
          const cachedPrice = safeNum(cachedLast?.close, 0);
          if(cachedPrice > 0){
            lastChartClosePrice = cachedPrice;
            lastChartSeedTs = nowMs;
            if(!(lastLiveQuotePrice > 0)) lastPriceRef.value = cachedPrice;
            try{ chart.setLastPrice(lastLiveQuotePrice > 0 ? lastLiveQuotePrice : cachedPrice); }catch(_e){}
          }
        }catch(_e){}
      }
    }catch(_e){}

    if(preferCachedOnly && Array.isArray(cachedItems) && cachedItems.length){
      updateHeader();
      return { items: cachedItems, cached: true, deferred: true };
    }
    if(typeNorm !== 'crypto' && !Array.isArray(cachedItems)?.length){
      try{
        const earlyPx = tradeResolveImmediateSeedPrice();
        if(earlyPx > 0 && !(Array.isArray(chart.candles) && chart.candles.length)){
          tradeApplyLocalSeedFallback(earlyPx, reqMarket);
        }
      }catch(_e){}
    }
    if(!force && Array.isArray(chart.candles) && chart.candles.length && (nowMs - keyLastFetchedAt) < reseedMinMs){
      updateHeader();
      return { items: chart.candles || [], cached: true, throttled: true };
    }
    if(!force && Array.isArray(cachedItems) && cachedItems.length && (nowMs - keyLastFetchedAt) < Math.max(12000, Math.floor(reseedMinMs / 2))){
      updateHeader();
      return { items: cachedItems, cached: true, throttled: true };
    }
    if(tradeSeedInflightPromise && tradeSeedInflightKey === reqKey && !force){
      try{ return await tradeSeedInflightPromise; }catch(_e){ return { items: Array.isArray(chart.candles) ? chart.candles : [] }; }
    }

    const run = (async()=>{
      const candlePath = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(assetType)}&market=${encodeURIComponent(reqMarket)}&tf=${encodeURIComponent(reqTf)}&limit=${encodeURIComponent(seedLimit)}`;
      if(typeNorm !== 'crypto' && Array.isArray(chart.candles) && chart.candles.length && !force && (nowMs - keyLastFetchedAt) < 180000){
        updateHeader();
        return { items: chart.candles || [], cached: true, throttled: true };
      }
      const r = await apiGetCachedStale(candlePath, typeNorm === 'crypto' ? 900 : 2600, { timeoutMs: tradeCandleTimeoutMs(assetType, reqMarket) });
      if(!alive || reqSeq !== tradeSeedReqSeq || String(marketTypeRef.value || 'spot').toLowerCase() !== reqMarket || String(tf || '15m') !== reqTf) return { items: [] };
      let nextItems = Array.isArray(r.items) ? r.items : [];
      if(typeNorm !== 'crypto' && !nextItems.length){
        const fallbackPx = tradeResolveImmediateSeedPrice();
        const existingItems = Array.isArray(chart.candles) ? chart.candles : [];
        if(existingItems.length){
          updateHeader();
          return { items: existingItems, cached: true, preserved: true };
        }
        if(fallbackPx > 0){
          tradeApplyLocalSeedFallback(fallbackPx, reqMarket);
          updateHeader();
          return { items: Array.isArray(chart.candles) ? chart.candles : [], cached: false, fallback: true, preserved: true };
        }
      }
      const nextSig = tradeChartCandlesSignature(nextItems);
      if(nextItems.length && nextSig !== tradeSeedAppliedSig){
        chart.setCandles(nextItems);
        tradeSeedAppliedSig = nextSig;
      }
      tradeSeedLastFetchedAt = Date.now();
      tradeSeedFetchedByKey.set(reqKey, tradeSeedLastFetchedAt);
      try{ tradeSeedSoftErrorByKey.delete(reqKey); }catch(_e){}
      try{ writeTradeCandlesCache(nextItems, reqMarket); }catch(_e){}
      const lp = nextItems && nextItems.length ? safeNum(nextItems[nextItems.length-1].close, 0) : 0;
      if(lp > 0){
        lastChartClosePrice = lp;
        lastChartSeedTs = Date.now();
        const nonCrypto = typeNorm !== 'crypto';
        const liveAgeSec = lastLiveQuoteTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - lastLiveQuoteTs) : 999999;
        const liveTooOld = nonCrypto && liveAgeSec > vpFocusQuoteFreshnessSec(assetType || typeNorm || 'crypto');
        if(nonCrypto){
          if(!(lastLiveQuotePrice > 0 && lastLiveQuoteTs > 0) || liveTooOld){
            lastPriceRef.value = lp;
            if(liveTooOld){
              try{
                extraRef.value = Object.assign({}, extraRef.value || {}, {
                  price: lp,
                  source: 'chart_sync',
                  updated_at: Math.floor(Date.now()/1000)
                });
              }catch(_e){}
            }
          } else {
            const driftVsLive = Math.abs(lp - lastLiveQuotePrice) / Math.max(1, Math.abs(lastLiveQuotePrice));
            if(driftVsLive <= 0.0025) lastPriceRef.value = lastLiveQuotePrice;
          }
        }else if(lastLiveQuotePrice > 0){
          lastPriceRef.value = lastLiveQuotePrice;
        }
      }

      const tfToSeconds = (value)=>{
        if(value==='1m') return 60;
        if(value==='3m') return 180;
        if(value==='5m') return 300;
        if(value==='15m') return 900;
        if(value==='30m') return 1800;
        if(value==='1h') return 3600;
        if(value==='2h') return 7200;
        if(value==='4h') return 14400;
        if(value==='1d') return 86400;
        return 60;
      };
      const chartSyncPrice = (()=>{
        if(lastLiveQuotePrice > 0) return safeNum(lastLiveQuotePrice, 0);
        if(typeNorm === 'crypto'){
          try{
            const cached = vpResolveFreshQuoteCacheQuote(symbol, state.selectedAssetType || assetType || 'crypto', marketTypeRef.value);
            const cachedPx = safeNum(resolveQuoteLivePrice(cached, marketTypeRef.value, assetType), 0);
            if(cachedPx > 0) return cachedPx;
          }catch(err){}
          const fallbackSeed = vpResolveFreshTradeSeed(symbol, state.selectedAssetType || assetType || 'crypto', seedMeta);
          if(fallbackSeed && safeNum(fallbackSeed.price, 0) > 0) return safeNum(fallbackSeed.price, 0);
        }
        return safeNum(lastPriceRef.value, 0);
      })();
      if(chartSyncPrice > 0){
        const sec = tfToSeconds(reqTf);
        const bucket = Math.floor(Date.now()/1000 / sec) * sec;
        const candles = Array.isArray(chart.candles) ? chart.candles : [];
        const last = candles.length ? candles[candles.length - 1] : null;
        const lastTime = safeNum(last?.time, 0);
        const lastClose = safeNum(last?.close, chartSyncPrice);
        const gapBuckets = (lastTime > 0 && sec > 0) ? Math.max(0, Math.round((bucket - lastTime) / sec)) : 0;
        const driftVsLast = lastClose > 0 ? Math.abs(chartSyncPrice - lastClose) / Math.max(1, Math.abs(lastClose)) : 0;
        const isCryptoChart = typeNorm === 'crypto';
        const syntheticDriftLimit = isCryptoChart ? 0.035 : 0.025;
        const shouldAnchorFlat = gapBuckets > 2 || driftVsLast > syntheticDriftLimit;
        if(last && lastTime === bucket){
          if(shouldAnchorFlat && !isCryptoChart){
            chart.setLastPrice(chartSyncPrice);
          } else {
            last.high = Math.max(safeNum(last.high, chartSyncPrice), chartSyncPrice, safeNum(last.open, chartSyncPrice));
            last.low = Math.min(safeNum(last.low, chartSyncPrice), chartSyncPrice, safeNum(last.open, chartSyncPrice));
            last.close = chartSyncPrice;
            chart.setLastPrice(chartSyncPrice);
            chart._drawBatched?.();
          }
        } else if(last && lastTime < bucket){
          if(shouldAnchorFlat && isCryptoChart){
            chart.setLastPrice(chartSyncPrice);
          } else if(shouldAnchorFlat){
            chart.upsertCandle({
              time: bucket,
              open: chartSyncPrice,
              high: chartSyncPrice,
              low: chartSyncPrice,
              close: chartSyncPrice,
              volume: 0
            });
          } else {
            const prevClose = safeNum(last.close, chartSyncPrice);
            chart.upsertCandle({
              time: bucket,
              open: prevClose,
              high: Math.max(prevClose, chartSyncPrice),
              low: Math.min(prevClose, chartSyncPrice),
              close: chartSyncPrice,
              volume: 0
            });
          }
          chart.setLastPrice(chartSyncPrice);
        } else if(!last){
          chart.setLastPrice(chartSyncPrice);
        }
        lastChartClosePrice = chartSyncPrice;
        lastChartSeedTs = Date.now();
        lastPriceRef.value = chartSyncPrice;
      }
      updateHeader();
      return { items: nextItems, cached: false };
    })();

    tradeSeedInflightKey = reqKey;
    tradeSeedInflightPromise = run;
    try{
      return await run;
    }catch(e){
      try{ tradeSeedSoftErrorByKey.set(reqKey, Date.now()); }catch(_e){}
      const fallbackMsg = String(e?.message || e || 'error');
      try{
        const warnKey = reqKey + ':warn';
        const lastWarn = Number(tradeSeedSoftErrorByKey.get(warnKey) || 0) || 0;
        if((Date.now() - lastWarn) > 30000){
          tradeSeedSoftErrorByKey.set(warnKey, Date.now());
          if(typeNorm === 'crypto') console.warn('seedCandles fallback', fallbackMsg);
        }
      }catch(_e){}
      
      if(Array.isArray(cachedItems) && cachedItems.length){
        updateHeader();
        return { items: cachedItems, cached: true, fallback: true, softError: fallbackMsg };
      }
      try{
        const fallbackPx = tradeResolveImmediateSeedPrice();
        if(typeNorm !== 'crypto' && fallbackPx > 0){
          tradeApplyLocalSeedFallback(fallbackPx, reqMarket);
          updateHeader();
          return { items: Array.isArray(chart.candles) ? chart.candles : [], cached: false, fallback: true, softError: fallbackMsg };
        }
      }catch(_e){}
      updateHeader();
      return { items: Array.isArray(chart.candles) ? chart.candles : [], cached: false, fallback: true, softError: fallbackMsg };
    }finally{
      if(tradeSeedInflightPromise === run){
        tradeSeedInflightPromise = null;
        tradeSeedInflightKey = '';
      }
    }
  }

  async function loadMoreCandles(){
    if(loadingMore) return;
    const oldest = safeNum(chart.candles && chart.candles[0] ? chart.candles[0].time : 0, 0);
    if(!(oldest>0)) return;
    const historyLookbackSec = (()=>{
      const norm = normalizeLiveAssetType(assetType || 'crypto');
      if(norm === 'crypto') return (60 * 86400) - 3600;
      if(norm === 'forex') return (120 * 86400) - 3600;
      if(norm === 'commodities') return (180 * 86400) - 3600;
      if(norm === 'stocks' || norm === 'arab' || norm === 'futures') return (180 * 86400) - 3600;
      return (120 * 86400) - 3600;
    })();
    if((Date.now()/1000 - oldest) > historyLookbackSec) return;
    loadingMore = true;
    const reqSeq = ++tradeLoadMoreReqSeq;
    const reqMarket = String(marketTypeRef.value || 'spot').toLowerCase();
    const reqTf = String(tf || '15m');
    try{
      const end = Math.max(0, oldest - 1);
      const pageLimit = normalizeLiveAssetType(assetType || 'crypto') === 'crypto'
        ? (computeTradeMobile() ? 160 : 220)
        : (computeTradeMobile() ? 260 : 360);
      const r = await api(`/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(assetType)}&market=${encodeURIComponent(reqMarket)}&tf=${encodeURIComponent(reqTf)}&limit=${encodeURIComponent(pageLimit)}&end=${encodeURIComponent(end)}`);
      if(!alive || reqSeq !== tradeLoadMoreReqSeq || String(marketTypeRef.value || 'spot').toLowerCase() !== reqMarket || String(tf || '15m') !== reqTf) return;
      const items = (r.items || []).filter(x=>safeNum(x?.time,0) < oldest);
      if(items.length){
        chart.prependCandles(items);
        try{ writeTradeCandlesCache(chart.candles || [], reqMarket); }catch(_e){}
      }
    }catch(_){
      // ignore
    } finally {
      loadingMore = false;
    }
  }


function startPolling(){
  QuoteCache.setActive(symbol, assetType, marketTypeRef.value);

  // map tf -> seconds
  const tfSec = (v)=>{
    if(v==='1m') return 60;
    if(v==='3m') return 180;
    if(v==='5m') return 300;
    if(v==='15m') return 900;
    if(v==='30m') return 1800;
    if(v==='1h') return 3600;
    if(v==='2h') return 7200;
    if(v==='4h') return 14400;
    if(v==='1d') return 86400;
    return 60;
  };

  let lastReseedAt = 0;
  const upsertLiveCandle = (price)=>{
    if(!(price>0)) return;
    const sec = tfSec(tf);
    const now = Math.floor(Date.now()/1000);
    const bucket = Math.floor(now/sec)*sec;

    // If no candles loaded yet, just set last price line
    if(!chart.candles || !chart.candles.length){
      chart.setLastPrice(price);
      return;
    }

    const last = chart.candles[chart.candles.length-1];
    if(!last || !last.time){
      chart.setLastPrice(price);
      return;
    }

    const refClose = safeNum(last.close, price);
    const drift = refClose > 0 ? Math.abs(price - refClose) / refClose : 0;
    const nowMs = Date.now();
    if(lastLiveQuotePrice > 0 && Math.abs(lastLiveQuotePrice - price) <= Math.max(1e-8, Math.abs(price) * 1e-8) && (nowMs - lastChartSeedTs) < 450){
      chart.setLastPrice(price);
      return;
    }
    if(drift > 0.08){
      const lastTime = safeNum(last.time, bucket);
      const gapBuckets = sec > 0 ? Math.max(0, Math.round((bucket - lastTime) / sec)) : 0;
      const isCryptoChart = normalizeLiveAssetType(assetType || 'crypto') === 'crypto';
      if(!isCryptoChart && gapBuckets > 0){
        chart.upsertCandle({
          time: bucket,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0
        });
      }
      chart.setLastPrice(price);
      const allowReseed = !isCryptoChart && !computeTradeMobile() && !(typeof document !== 'undefined' && document.hidden);
      if(allowReseed && gapBuckets > 4 && (Date.now() - lastReseedAt) > 240000){
        lastReseedAt = Date.now();
        try{ seedCandles({ force:true }); }catch(e){}
      }
      return;
    }

    // same bucket -> update current candle
    if(last.time === bucket){
      last.high = Math.max(safeNum(last.high, price), price);
      last.low  = Math.min(safeNum(last.low, price),  price);
      last.close = price;
      chart.setLastPrice(price);
      lastChartSeedTs = nowMs;
      return;
    }

    // new bucket -> append new candle
    const prevClose = refClose;
    chart.upsertCandle({
      time: bucket,
      open: prevClose,
      high: Math.max(prevClose, price),
      low:  Math.min(prevClose, price),
      close: price,
      volume: 0
    });
    chart.setLastPrice(price);
    lastChartSeedTs = nowMs;
  };

  try{ unsub && unsub(); }catch(e){}
  unsub = QuoteCache.subscribe((q)=>{
    if(!alive) return;
    const qSym = String(q?.symbol || '').toUpperCase();
    const qType = normalizeLiveAssetType(q?.type || assetType || 'crypto');
    const wantType = normalizeLiveAssetType(assetType || 'crypto');
    if(qSym && qSym !== String(symbol||'').toUpperCase()) return;
    if(qType && qType !== wantType) return;

    const p = safeNum(resolveQuoteLivePrice(q, marketTypeRef.value, assetType), 0);
    const applied = applyTradeQuote(q, p);
    if(applied){
      try{
        if((normalizeLiveAssetType(assetType || 'crypto') !== 'crypto') && (!(Array.isArray(chart.candles) && chart.candles.length)) && applied.price > 0){
          tradeApplyLocalSeedFallback(applied.price, marketTypeRef.value || 'spot');
        }
      }catch(e){}
      try{ upsertLiveCandle(applied.price); }catch(e){}
      updateHeader();
    }
  });

  // make sure speed is fast on trade
  try{ QuoteCache.setSpeed(preferredQuotePollMs(assetType || 'crypto', marketTypeRef.value, !!document.hidden)); }catch(e){}
  try{ poll && clearInterval(poll); }catch(e){}
  poll = null;
  if(normalizeLiveAssetType(assetType || 'crypto') !== 'crypto'){
    const tailEvery = normalizeLiveAssetType(assetType || 'crypto') === 'forex' ? 14000 : 18000;
    const tailTick = async(force=false)=>{
      if(!alive) return;
      if(typeof document !== 'undefined' && document.hidden) return;
      if(String(location.hash || '').indexOf('#/trade') !== 0) return;
      const liveAgeSec = lastLiveQuoteTs > 0 ? Math.max(0, Math.floor(Date.now()/1000) - lastLiveQuoteTs) : 999999;
      if(!force && liveAgeSec <= vpFocusQuoteFreshnessSec(assetType || 'crypto')) return;
      try{
        const tailPath = `/trade/candles.php?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(assetType)}&market=${encodeURIComponent(marketTypeRef.value || 'spot')}&tf=${encodeURIComponent(tf || '1m')}&limit=3`;
        const tailResp = await apiGetCachedStale(tailPath, 2800, { timeoutMs: Math.min(7500, tradeCandleTimeoutMs(assetType, marketTypeRef.value || 'spot')) });
        const tailItems = Array.isArray(tailResp?.items) ? tailResp.items.filter(Boolean) : [];
        if(!tailItems.length) return;
        tailItems.slice(-2).forEach(item=>{
          try{ chart.upsertCandle(item); }catch(_e){}
        });
        const lastTail = tailItems[tailItems.length - 1] || null;
        const tailPrice = safeNum(lastTail?.close, 0);
        if(!(tailPrice > 0)) return;
        lastChartClosePrice = tailPrice;
        lastChartSeedTs = Date.now();
        if(liveAgeSec > vpFocusQuoteFreshnessSec(assetType || 'crypto')){
          lastPriceRef.value = tailPrice;
          try{
            extraRef.value = Object.assign({}, extraRef.value || {}, {
              price: tailPrice,
              source: 'chart_sync',
              updated_at: Math.floor(Date.now()/1000)
            });
          }catch(_e){}
          updateHeader();
        }
      }catch(_e){}
    };
    poll = setInterval(()=>{ tailTick(false).catch(()=>{}); }, tailEvery);
    try{ setTimeout(()=>{ tailTick(true).catch(()=>{}); }, 2400); }catch(e){}
  }
}


  function connectWs(){
    // Direct Binance WS is disabled on shared hosting / Telegram WebView.
    // We rely on QuoteCache + lightweight polling of the last candle instead.
    return;
  }

  
  function openClosePosition(pos){
    if(!pos || !pos.id) return;
    // Allow closing positions in real mode even if opening is restricted
    const qtyMax = safeNum(pos.qty, 0);
    const qtyIn = h('input',{class:'input', type:'number', step:'0.00000001', min:'0', value:String(qtyMax)});
    const symDb = String(pos.symbol||'');
    const sym = (typeof trade_ui_symbol === 'function') ? trade_ui_symbol(symDb) : symDb.replace(/^@R@/,'');
    const entry = safeNum(pos.entry_price, 0);
    const mark = safeNum(pos.mark_price, 0);
    const pnl = safeNum(pos.unrealized_pnl, 0);

    openDialog({
      title: `${state.lang==='ar'?'إغلاق':'Close'} ${sym}`,
      dialogClass:'trade-close-dialog',
      bodyClass:'trade-close-dialog-body',
      actionsClass:'trade-close-dialog-actions',
      body: [
        h('div',{class:'trade-close-stats'},
          h('div',{class:'trade-close-stat'}, h('span',{class:'k'}, 'Entry'), h('strong',{class:'v'}, `$${fmt(entry,4)}`)),
          h('div',{class:'trade-close-stat'}, h('span',{class:'k'}, 'Mark'), h('strong',{class:'v'}, `$${fmt(mark,4)}`)),
          h('div',{class:'trade-close-stat ' + (pnl>=0?'up':'down')}, h('span',{class:'k'}, 'PnL'), h('strong',{class:'v'}, `${pnl>=0?'+':''}$${fmt(pnl,2)}`))
        ),
        h('div',{class:'trade-close-form'},
          h('label',{class:'trade-close-label'}, state.t('trade.qty')),
          qtyIn,
          h('div',{class:'trade-close-hint'}, (state.lang==='ar'?'يمكنك الإغلاق الجزئي بإدخال كمية أصغر من إجمالي الصفقة.':'You can partially close by entering a smaller quantity than the full position.'))
        )
      ],
      actions: [
        {label:(state.lang==='ar'?'إلغاء':'Cancel'), class:'btn ghost', onClick:()=>closeDialog()},
        {label:(state.lang==='ar'?'إغلاق':'Close'), class:'btn danger', onClick:async()=>{
          const qty = safeNum(qtyIn.value, 0);
          if(!(qty>0)) return toast(state.lang==='ar'?'أدخل الكمية':'Enter qty');
          if(qty > qtyMax + 1e-12) return toast(state.lang==='ar'?'الكمية أكبر من الصفقة':'Qty exceeds position');

          try{
let r = null;

// 1) Preferred: id + qty + mode in BODY (more backend-friendly)
try{
  r = await api(`/trade/close_position.php`, {
    method:'POST',
    body:{
      id: pos.id,
      qty,
      mode: (state && state.tradeMode) ? state.tradeMode : 'demo'
    }
  });
}catch(err){
  // 2) Fallback: legacy query param + body qty + mode
  try{
    r = await api(`/trade/close_position.php?id=${encodeURIComponent(pos.id)}`, {
      method:'POST',
      body:{
        qty,
        mode: (state && state.tradeMode) ? state.tradeMode : 'demo'
      }
    });
  }catch(err2){
    throw err2;
  }
}

if(!r || !r.ok) throw new Error(r?.error || state.t('trade.close_failed'));


            closeDialog();
            // Sometimes upstream returns pnl_usd as 0/empty; compute client-side as a fallback.
            let pnlUsd = safeNum(r.closed?.pnl_usd, NaN);
            const closePx = safeNum(r.closed?.close_price, safeNum(r.close_price, NaN));
            if(!Number.isFinite(pnlUsd) || pnlUsd===0){
              try{
                const posSnap = ((activeTradePortfolio()?.positions)||[]).find(pp => String(pp.id)===String(pos.id));
                const side = String(posSnap?.side||'BUY').toUpperCase();
                const entry = safeNum(posSnap?.entry_price, 0);
                const q = safeNum(qty, safeNum(posSnap?.qty, 0));
                const m = Number.isFinite(closePx) ? closePx : safeNum(posSnap?.mark_price, entry);
                pnlUsd = __calcPnl(side, q, entry, m);
              }catch(e){
                pnlUsd = safeNum(r.closed?.pnl_usd, 0);
              }
            }
            toast(`Closed • PnL ${pnlUsd>=0?'+':''}$${fmt(pnlUsd,2)}`);
            try{ haptic('success'); }catch(e){}
            try{
              await refreshWalletSummary(true);
              await refreshActiveTradeData(true);
            }catch(e){}
            updateHeader();
            loadOrdersIntoUI();
            loadPositionsIntoUI();
          }catch(e){
            toast('❌ '+(e.message||state.t('trade.close_failed')));
          }
        }},
      ]
    });
  }

  async function loadPositionsIntoUI(){
    // restart live PnL stream whenever positions UI rebuilds
    try{ if(stopLivePos) stopLivePos(); }catch(e){}
    stopLivePos = null;
    const mode = activeTradeMode();
    try{ await refreshActiveTradeData(true); }catch(e){}
    const pf = activeTradePortfolio();
    const items = (pf && pf.ok) ? (pf.positions||[]) : [];
    posCountEl.textContent = items.length ? (state.lang==='ar'?`${items.length} مفتوحة`:`${items.length} open`) : (state.lang==='ar'?'0 مفتوحة':'0 open');
    posListHost.innerHTML = '';
    posListHost.appendChild(tradePositionsToCards(items, {
      onClose: openClosePosition,
      onEdit: ()=>loadPositionsIntoUI()
    }));

    // Live PnL for ALL symbols (chart already updates only current symbol).
    try{ stopLivePos = startLiveOpenPositionsPnlTicker(); }catch(e){}
  }

	  async function loadOrdersIntoUI(){
	    const activeSymbolFilter = String(root.querySelector('#symIn')?.value || symbol || '').toUpperCase().trim();
	    const side = String(root.querySelector('#sideSel')?.value || '').toUpperCase().trim();
	    try{
	      const items = await tradeFetchOrders({symbol:(activeSymbolFilter||''), side: side||'', limit: 60, mode: activeTradeMode()});
      const host = root.querySelector('#logsList');
      if(host){
        host.innerHTML='';
        host.appendChild(tradeOrdersToCards(items));
      }
    }catch(e){
      const host = root.querySelector('#logsList');
      if(host){
        host.innerHTML='';
        host.appendChild(h('div',{class:'muted small'}, e.message || state.t('trade.failed_load_deals')));
      }
    }
  }

  async function afterOrder(){
    try{
      await refreshWalletSummary(true);
      await refreshActiveTradeData(true);
    }catch(e){}
    updateHeader();
    loadOrdersIntoUI();
    loadPositionsIntoUI();
  }

  function switchMarket(next){
    next = String(next||'spot').toLowerCase();
    if(next !== 'spot' && next !== 'perp') return;
    if(marketTypeRef.value === next) return;
    marketTypeRef.value = next;
    try{ state.tradeMarket = next; state.currentTradeMarket = next; state.selectedMarket = next; }catch(e){}
    localStorage.setItem('tradeMarket', next);
    try{ tradeRouteCommit({ market: next }); }catch(e){}
    toast(next==='perp' ? (state.t('trade.perp_mode')) : (state.t('trade.spot_mode')));
    rebuildOrderPanel();
    try{ QuoteCache.setActive(symbol, assetType, marketTypeRef.value); }catch(e){}
    try{ bootstrapTradeQuote.__started = false; }catch(e){}
    stopStream();
    seedCandles().finally(()=>{ connectWs(); startPerpExtras(); try{ bootstrapTradeQuote(); }catch(e){} updateHeader(); });
    // toggle buttons
    const btns = root.querySelectorAll('.trade-toggle .tbtn');
    btns.forEach(b=>{
      const t = String(b.textContent||'').toLowerCase();
      b.classList.toggle('on', (t===next));
    });
    const metaMarket = root.querySelector('.trade-account-meta .chip.ghost');
    if(metaMarket) metaMarket.textContent = `${tr('Market','السوق','Рынок')}: ${marketTypeRef.value.toUpperCase()}`;
    root.querySelectorAll('.vp-markettype-sync').forEach(el=>{ try{ el.textContent = marketTypeRef.value.toUpperCase(); }catch(e){} });
  }

  // wire filters
  setTimeout(()=>{
    const symIn = root.querySelector('#symIn');
    const sideSel = root.querySelector('#sideSel');
    if(symIn) symIn.addEventListener('input', rafBatch(loadOrdersIntoUI));
    if(sideSel) sideSel.addEventListener('change', loadOrdersIntoUI);
  }, 0);

  // boot view
seedCandles().catch(()=>({items:[]})).finally(()=>{
  // IMPORTANT: Binance WS is disabled in this build, so ALWAYS use QuoteCache polling
  startPolling();
  startPerpExtras();
  loadOrdersIntoUI();
  loadPositionsIntoUI();
  updateHeader();
});

  const onTradeVisibilityChange = ()=>{
    try{
      if(document.hidden) return;
      const now = Date.now();
      if((now - tradeVisibleResyncAt) < 4000) return;
      tradeVisibleResyncAt = now;
      try{ bootstrapTradeQuote(); }catch(e){}
      try{
        const needForce = (now - tradeSeedLastFetchedAt) > 300000 && !(Array.isArray(chart.candles) && chart.candles.length);
        seedCandles({ force: needForce });
      }catch(e){}
    }catch(e){}
  };
  try{ document.addEventListener('visibilitychange', onTradeVisibilityChange, { passive:true }); }catch(e){}

  onCleanup(()=>{
    alive = false;
    try{ document.removeEventListener('visibilitychange', onTradeVisibilityChange); }catch(e){}
    try{ ws && ws.close(); }catch(e){}
    try{ poll && clearInterval(poll); }catch(e){}
    try{ unsub && unsub(); }catch(e){} unsub = null;
    
    try{ chart.destroy(); }catch(e){}
  });

  return root;
}







function investPage(){
  const container = h('div',{});

  const scheduleLabel = (s)=>{
    if (s==='daily') return state.t('invest.schedule_daily');
    if (s==='weekly') return state.t('invest.schedule_weekly');
    return state.t('invest.schedule_end');
  };
  const riskTone = (risk)=>{
    const v = String(risk||'medium').toLowerCase();
    if (v==='low') return 'up';
    if (v==='high') return 'down';
    return 'warn';
  };
  const makeIdemKey = ()=> crypto?.randomUUID ? crypto.randomUUID() : ('idem_'+Date.now()+Math.random().toString(16).slice(2));

  async function load(){
    const plans = await api(`/invest/plans.php?lang=${encodeURIComponent(state.lang)}`);
    const mine  = await api(`/invest/my.php?lang=${encodeURIComponent(state.lang)}`);
    container.innerHTML='';
    container.appendChild(topBar());
    const investModeLock = String(state.tradeMode || 'demo').toLowerCase() !== 'real'
      ? h('div',{class:'notice mb-3'}, tr('Copy trading and investment subscriptions are locked while you are in Demo mode. Switch to Real first, then complete KYC to unlock these flows.','نسخ الصفقات والاشتراكات الاستثمارية مقفولة أثناء وجودك على وضع الديمو. حوّل إلى الحقيقي أولاً ثم أكمل KYC لفتح هذه المسارات.','Копитрейдинг и инвестиционные подписки заблокированы в режиме Demo. Сначала переключитесь в Real, затем завершите KYC, чтобы открыть эти сценарии.'))
      : null;
    container.appendChild(h('div',{class:'card mb-3 invest-hero'},
      h('div',{class:'invest-hero-copy'},
        h('div',{class:'h1'}, state.t('invest.title')),
        h('div',{class:'muted small'}, state.t('invest.subtitle')),
        h('div',{class:'row wrap mt-3'},
          h('span',{class:'pill'}, `${state.t('invest.wallet_usdt')}: $${fmt(state.realPortfolio?.wallet?.USDT?.balance ?? 0,2)}`),
          h('span',{class:'pill ghost'}, `${state.t('invest.my')}: ${Array.isArray(mine.items)?mine.items.length:0}`),
          h('button',{class:'btn outline small', onclick:load}, state.t('common.refresh'))
        )
      ),
      h('div',{class:'invest-hero-side'},
        h('div',{class:'invest-badge'}, 'ROI'),
        h('div',{class:'invest-hero-value'}, '6% - 12%'),
        h('div',{class:'muted small'}, state.lang==='ar' ? 'خطط مرتبة وواضحة' : (state.lang==='ru' ? 'Чистое отображение планов' : 'Clean plan presentation'))
      )
    ));

    if(investModeLock) container.appendChild(investModeLock);
    const grid = h('div',{class:'invest-grid'});
    (plans.items || []).forEach(pl=>{
      const cap = (pl.max_amount && pl.max_amount>0) ? `$${fmt(pl.max_amount,0)}` : state.t('invest.no_max');
      const details = (pl.details||'').trim();
      const amount = h('input',{class:'input', type:'number', step:'1', value: pl.min_amount});
      grid.appendChild(h('div',{class:'card invest-card'},
        h('div',{class:'invest-card-head'},
          h('div',{},
            h('div',{class:'invest-card-title'}, pl.name),
            h('div',{class:'muted small'}, pl.desc || '')
          ),
          h('span',{class:`badge ${riskTone(pl.risk)}`}, (function(){
            const v = String(pl.risk||'').toLowerCase();
            const k = v ? `invest.risk.${v}` : '';
            return k && state.dict[state.lang] && state.dict[state.lang][k] ? state.t(k) : (pl.risk || '');
          })())
        ),
        h('div',{class:'invest-stats'},
          h('div',{class:'invest-stat'}, h('span',{class:'k'}, state.t('invest.term')), h('span',{class:'v'}, `${pl.term_days}d`)),
          h('div',{class:'invest-stat'}, h('span',{class:'k'}, state.t('invest.roi')), h('span',{class:'v'}, `${pl.roi_percent}%`)),
          h('div',{class:'invest-stat'}, h('span',{class:'k'}, state.t('invest.min')), h('span',{class:'v'}, `$${fmt(pl.min_amount,0)}`)),
          h('div',{class:'invest-stat'}, h('span',{class:'k'}, state.t('invest.max')), h('span',{class:'v'}, cap))
        ),
        h('div',{class:'muted small mt-2'}, `${state.t('invest.payout')}: ${scheduleLabel(pl.payout_schedule)}`),
        details ? h('details',{class:'mt-2'}, h('summary',{class:'small', style:'cursor:pointer'}, state.t('invest.show_details')), h('div',{class:'muted small mt-2', style:'white-space:pre-wrap'}, details)) : null,
        h('div',{class:'row mt-3 wrap'}, amount, h('button',{class:'btn primary', onclick:async()=>{
          if(!requireRealWorkflowAccess('copy')) return;
          const val = Number(amount.value||0);
          try{
            const r = await api('/invest/subscribe.php', {method:'POST', headers:{'Idempotency-Key': makeIdemKey()}, body:{plan_id: pl.id, amount: val}});
            await refreshPortfolio(true); await refreshRealPortfolio(true); await refreshPnlStats(); await refreshRealPnlStats();
            toast(`✅ ${state.t('invest.subscribed')} (#${r.investment_id})`);
            await load();
          }catch(err){ toast(`❌ ${err.message}`); }
        }}, state.t('invest.subscribe')))
      ));
    });
    container.appendChild(grid);

    const mineBox = h('div',{class:'card mt-3'}, h('div',{class:'h2 mb-2'}, state.t('invest.my')));
    if (Array.isArray(mine.items) && mine.items.length) {
      const mineList = h('div',{class:'invest-mine-list'});
      mine.items.forEach(x=>{
        mineList.appendChild(h('div',{class:'invest-mine-row'},
          h('div',{},
            h('div',{class:'invest-card-title'}, x.plan_name),
            h('div',{class:'muted small'}, `${state.t('invest.amount')}: $${fmt(x.amount,2)} • ${state.t('invest.expected')}: $${fmt(x.expected_return,2)}`),
            h('div',{class:'muted small'}, `${state.t('invest.start')}: ${new Date(x.start_at*1000).toLocaleDateString()} • ${state.t('invest.end')}: ${new Date(x.end_at*1000).toLocaleDateString()}`)
          ),
          h('div',{style:'text-align:right'},
            h('span',{class:`badge ${String(x.status||'').toLowerCase()==='active'?'up':'warn'}`}, (function(){
              const v = String(x.status||'').toLowerCase();
              const k = v ? `invest.status.${v}` : '';
              return k && state.dict[state.lang] && state.dict[state.lang][k] ? state.t(k) : (x.status||'');
            })()),
            h('div',{class:'muted small mt-2'}, `${state.t('invest.paid')}: $${fmt(x.paid_total,2)} • ${state.t('invest.remaining')}: $${fmt(x.remaining,2)}`)
          )
        ));
      });
      mineBox.appendChild(mineList);
    } else {
      mineBox.appendChild(h('div',{class:'muted small'}, state.t('invest.none')));
    }
    container.appendChild(mineBox);
  }

  load().catch(e=>{ container.appendChild(h('div',{class:'card'}, `❌ ${e.message}`)); });
  return container;
}

function tradePositionsToCards(items, opts={}){
  const onClose = opts.onClose;
  const onEdit  = opts.onEdit;
  __posLive.clear();

  const list = h('div',{class:'pos-list'});

  // Safety: UI must never mix demo/real positions.
  const activeMode = String(state.tradeMode || 'demo').toLowerCase();
  if(Array.isArray(items)){
    items = items.filter(p => String(p.account_mode||'demo').toLowerCase() === activeMode);
  }

  if(!items || !items.length){
    list.appendChild(h('div',{class:'muted small'}, state.t('trade.no_open_positions')));
    return list;
  }

  for(const p of items){
    const side = String(p.side||'').toUpperCase();
    const sideCls = (side==='SELL') ? 'down' : 'up';

    const symDb = String(p.symbol||'');
    const sym = (typeof trade_ui_symbol === 'function')
      ? trade_ui_symbol(symDb)
      : symDb.replace(/^@R@/,'');

    const assetType = String(p.asset_type || 'crypto').toLowerCase();
    const mt = String(p.market_type||'spot').toLowerCase();
    const lev = Math.max(1, Math.floor(safeNum(p.leverage, 1)));

    const qty   = safeNum(p.qty, 0);
    const entry = safeNum(p.entry_price, 0);
    const mark  = safeNum(p.mark_price, 0);
    // Bybit style:
    // - Used (Margin) is shown in its own stat
    // - PnL shows ONLY PnL (not position value)
    // NOTE: For SPOT, use the stored initial cost (margin_initial) for Size/Margin,
    // so admin-adjusting entry doesn't shrink the displayed principal.
    const initCost = safeNum(p.margin_initial, 0);
    const sizeUsd   = (mt==='spot' && initCost>0) ? Math.abs(initCost) : Math.abs(qty * entry);
    const marginUsd = (mt==='perp')
      ? (initCost > 0 ? Math.abs(initCost) : (sizeUsd/lev))
      : sizeUsd;

    const liq = safeNum(p.liquidation_price, 0);

    // TP/SL (Bybit style: always visible, even if unset)
    const tp = safeNum(p.tp_price ?? p.take_profit ?? p.tp ?? 0, 0);
    const sl = safeNum(p.sl_price ?? p.stop_loss ?? p.sl ?? 0, 0);

    // Initial pnl calc (will be live-updated by ticker)
    const pnl0 = (mark>0) ? __calcPnl(side, qty, entry, mark) : safeNum(p.unrealized_pnl, 0);
    const roe0 = __calcRoePctFromMargin(pnl0, marginUsd);

    const L_used  = state.t('trade.margin_usdt');
    const L_size  = state.t('trade.size_usdt');
    const L_entry = state.t('trade.entry');
    const L_mark  = state.t('trade.mark');
    const L_pnl   = state.t('trade.pnl');
    const L_liq   = state.t('trade.liq');
    const L_qty   = state.t('trade.qty');

    const top = h('div',{class:'pos-row'},
      h('div',{class:'pos-left'},
        h('div',{class:'pos-sym'}, sym),
        h('div',{class:'pos-meta'}, (function(){
          const base = (mt==='perp')
            ? `${mt.toUpperCase()} • ${(String(p.margin_mode||'isolated')).toUpperCase()} • x${lev}`
            : `${mt.toUpperCase()}`;
          // Keep header compact; show opened time near ROE/TP-SL instead.
          return base;
        })())
      ),
      h('div',{class:'pos-right'},
        h('span',{class:`badge ${sideCls}`}, state.t(side==='sell' ? 'trade.side.sell' : 'trade.side.buy')),
        (mt==='perp') ? h('button',{class:'btn ghost small', title:state.t('trade.tp_sl'), onclick:()=>tradeEditTpSlSheet(p, ()=>{ if(onEdit) onEdit(p); })}, state.t('trade.tp_sl')) : null,
        h('button',{class:'btn danger small', onclick:()=>onClose && onClose(p)}, state.t('trade.close'))
      )
    );

    const markEl  = h('div',{class:'pos-val'}, `$${fmt(mark, 4)}`);
    const pnlEl   = h('div',{class:`pos-val ${pnl0>=0?'up':'down'}`}, `${pnl0>=0?'+':''}$${fmt(pnl0, 2)}`);
    const roeEl   = h('span',{class:`badge ${roe0>=0?'up':'down'}`}, `ROE ${roe0>=0?'+':''}${fmt(roe0, 2)}%`);

    const stats = h('div',{class:'pos-stats'},
      h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_used),  h('div',{class:'pos-val'}, `$${fmt(marginUsd, 2)}`)),
      h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_size),  h('div',{class:'pos-val'}, `$${fmt(sizeUsd, 2)}`)),
      h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_entry),        h('div',{class:'pos-val'}, `$${fmt(entry, 4)}`)),
      h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_mark),         markEl),
      h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_pnl),          pnlEl),
      (mt==='perp')
        ? h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_liq),      h('div',{class:'pos-val'}, liq>0 ? `$${fmt(liq, 4)}` : '—'))
        : h('div',{class:'pos-stat'}, h('div',{class:'muted tiny'}, L_qty),      h('div',{class:'pos-val'}, fmt(qty, 6)))
    );

    const tpslRow = h('div',{class:'pos-tpsl'},
      h('span',{class:'pill tiny'}, tp>0 ? `TP ${fmt(tp,4)}` : 'TP —'),
      h('span',{class:'pill tiny'}, sl>0 ? `SL ${fmt(sl,4)}` : 'SL —')
    );

    // opened timestamp may arrive as epoch seconds, epoch ms, or an ISO string depending on backend/driver.
    const __parseEpoch = (v)=>{
      if(v===null||v===undefined) return 0;
      if(typeof v==='number'){
        if(!Number.isFinite(v) || v<=0) return 0;
        return v>1e12 ? Math.floor(v/1000) : Math.floor(v);
      }
      const s = String(v).trim();
      if(!s) return 0;
      const n = Number(s);
      if(Number.isFinite(n) && n>0) return n>1e12 ? Math.floor(n/1000) : Math.floor(n);
      const ms = Date.parse(s);
      return Number.isFinite(ms) ? Math.floor(ms/1000) : 0;
    };
    const opened = __parseEpoch(p.opened_at ?? p.created_at ?? p.open_time ?? p.createdAt ?? p.openedAt);
    const L_open = state.t('trade.opened');
    const openedEl = opened>0
      ? h('span',{class:'muted tiny'}, `${L_open}: ${fmtDate(opened)} ${fmtTs(opened)}`)
      : null;

    const footRight = h('div',{class:'pos-foot-right'}, openedEl, roeEl);
    const foot = h('div',{class:'pos-foot'}, tpslRow, footRight);

    // Register live bindings (update on price ticks)
    try{
      const key = String(p.id ?? `${symDb}:${entry}:${qty}:${side}`);
      __posLive.set(key, {
        symDb,
        uiSymbol: sym,
        assetType,
        market: mt,
        side,
        qty,
        entry,
        sizeUsd,
        marginUsd,
        lev,
        markEl,
        pnlEl,
        roeEl,
      });
    }catch(e){}

    const card = h('div',{class:'pos-card'}, top, stats, foot);
    list.appendChild(card);
  }

  return list;
}

function __calcPnl(side, qty, entry, mark){
  const dir = String(side||'').toUpperCase()==='SELL' ? -1 : 1;
  return (mark - entry) * qty * dir;
}

function __calcRoePctFromMargin(pnl, marginUsd){
  const m = Math.abs(Number(marginUsd)||0);
  return m>0 ? (pnl/m)*100 : 0;
}

// Legacy helper (kept for other callers)
function __calcRoePct(pnl, qty, entry, lev){
  const L = Math.max(1, Number(lev)||1);
  const margin = Math.abs(qty * entry) / L;
  return margin>0 ? (pnl / margin) * 100 : 0;
}

function updateLivePositionsForSymbol(uiSymbol, markPrice){
  if(!(markPrice>0)) return;
  for(const o of __posLive.values()){
    if(o.uiSymbol !== uiSymbol) continue;
    if(!o.markEl || !o.pnlEl || !o.roeEl) continue;

    const mark = Number(markPrice);
    o.markEl.textContent = `$${fmt(mark, 4)}`;

    const pnl = __calcPnl(o.side, o.qty, o.entry, mark);
    o.pnlEl.textContent = `${pnl>=0?'+':''}$${fmt(pnl, 2)}`;
    o.pnlEl.classList.toggle('up', pnl>=0);
    o.pnlEl.classList.toggle('down', pnl<0);

    const marginUsd = Number(o.marginUsd || 0) || (Math.abs(Number(o.qty||0) * Number(o.entry||0)) / Math.max(1, Number(o.lev||1)));
    const roe = __calcRoePctFromMargin(pnl, marginUsd);
    o.roeEl.textContent = `ROE ${roe>=0?'+':''}${fmt(roe, 2)}%`;
    o.roeEl.classList.toggle('up', roe>=0);
    o.roeEl.classList.toggle('down', roe<0);
  }
}

// Live PnL engine for ALL open positions (not only the currently selected chart symbol).
// - Uses backend /trade/stream.php with comma-separated symbols (efficient)
// - Splits requests by market (spot/perp) + assetType to avoid unnecessary upstream calls
// Returns a stop() function.
function startLiveOpenPositionsPnlTicker(){
  let timer = null;
  let inflight = false;
  let alive = true;

  const cleanSym = (s)=> String(s||'').toUpperCase().replace(/^@R@/,'').trim();

  function collectGroups(){
    const groups = new Map();
    for(const o of __posLive.values()){
      const sym = cleanSym(o.symDb);
      if(!sym) continue;
      const mt = String(o.market||'spot').toLowerCase();
      const ty = String(o.assetType||'crypto').toLowerCase();
      const key = `${mt}|${ty}`;
      if(!groups.has(key)) groups.set(key, {market: mt, type: ty, symbols: new Set()});
      groups.get(key).symbols.add(sym);
    }
    const out = [];
    for(const g of groups.values()) out.push({market:g.market, type:g.type, symbols:[...g.symbols]});
    return out;
  }

  function pickInterval(){
    // Keep it snappy, but don't DOS shared hosting.
    const n = __posLive.size;
    if(n <= 2) return 320;
    if(n <= 6) return 420;
    return 600;
  }

  async function tick(){
    if(!alive) return;
    if(isEffectivelyHidden()) return;
    if(inflight) return;
    // Only run while on trade route
    const hash = String(location.hash||'');
    if(!hash.startsWith('#/trade')) return;

    const groups = collectGroups();
    if(!groups.length) return;

    inflight = true;
    try{
      for(const g of groups){
        if(!g.symbols.length) continue;
        const symList = g.symbols.slice(0, 30).join(',');
        const url = `/trade/stream.php?lite=1&symbols=${encodeURIComponent(symList)}&type=${encodeURIComponent(g.type)}&market=${encodeURIComponent(g.market)}`;
        const r = await api(url);
        const quotes = r && r.quotes ? r.quotes : {};
        for(const [sym, q] of Object.entries(quotes)){
          const px = (g.market==='perp')
            ? safeNum(q && (q.mark_price ?? q.price ?? q.last), 0)
            : safeNum(q && (q.price ?? q.last ?? q.mark_price), 0);
          if(px>0) updateLivePositionsForSymbol(String(sym||'').toUpperCase(), px);
        }
      }
    }catch(e){
      // silent
    }finally{
      inflight = false;
    }
  }

  tick();
  let ms = pickInterval();
  if(ms > 0) timer = setInterval(tick, ms);

  const tune = ()=>{
    const next = pickInterval();
    if(next === ms) return;
    ms = next;
    try{ if(timer) clearInterval(timer); }catch(e){}
    timer = ms > 0 ? setInterval(tick, ms) : null;
  };
  document.addEventListener('visibilitychange', ()=>{ try{ tune(); tick(); }catch(e){} }, {passive:true});

  return function stop(){
    alive = false;
    try{ if(timer) clearInterval(timer); }catch(e){}
    timer = null;
  };
}


// Live PnL ticker for DASHBOARD (REAL only)
// - Updates pnl_total / pnl_24 using current quotes (like chart)
// - Bybit style: pnl_total / pnl_24 are PnL only (no notional)
function startHomeRealPnlTicker(refs){
  const activeMode = ()=> currentTradeModeKey();
  let timer = null;
  let inflight = false;
  let alive = true;
  const lastPx = new Map(); // SYM -> px
  let lastRealPnlFetchAt = 0;

  const cleanSym = (s)=> String(s||'').toUpperCase().replace(/^@R@/,'').replace(/^@D@/,'').trim();

  function collectGroups(){
    const rp = activeMode() === 'real' ? state.realPortfolio : state.portfolio;
    const pos = Array.isArray(rp?.positions) ? rp.positions : [];
    const groups = new Map();
    for(const p of pos){
      const st = String(p?.status||'open').toLowerCase();
      if(st && st !== 'open') continue;
      const sym = cleanSym(p?.symbol);
      if(!sym) continue;
      const mt = String(p?.market_type||'spot').toLowerCase();
      const ty = String(p?.asset_type||'crypto').toLowerCase();
      const key = `${mt}|${ty}`;
      if(!groups.has(key)) groups.set(key, {market: mt, type: ty, symbols: new Set()});
      groups.get(key).symbols.add(sym);
    }
    const out = [];
    for(const g of groups.values()) out.push({market:g.market, type:g.type, symbols:[...g.symbols]});
    return out;
  }

  function pickInterval(){
    const livePf = activeMode() === 'real' ? state.realPortfolio : state.portfolio;
    const n = Array.isArray(livePf?.positions) ? livePf.positions.length : 0;
    if(n <= 0) return 0;
    if(n <= 2) return 2400;
    if(n <= 6) return 3200;
    return 4200;
  }

  function computeAndPaint(){
    const rp = activeMode() === 'real' ? state.realPortfolio : state.portfolio;
    const pos = Array.isArray(rp?.positions) ? rp.positions : [];
    const nowSec = Math.floor(Date.now()/1000);
    const cutoff = nowSec - 86400;

    const realized = safeNum(rp?.realized_pnl, 0);
    const stats = activeMode() === 'real' ? state.realPnlStats : state.pnlStats;
    const realized24 = safeNum(stats?.realized_24h, 0);

    let unrealTotal = 0;
    let unreal24 = 0;
    for(const p of pos){
      const st = String(p?.status||'open').toLowerCase();
      if(st && st !== 'open') continue;
      const sym = cleanSym(p?.symbol);
      const px = lastPx.get(sym);
      if(!(px>0)) continue;
      const qty = Number(p?.qty||0);
      const entry = Number(p?.entry_price||0);
      const side = String(p?.side||'BUY');
      const pnl = __calcPnl(side, qty, entry, Number(px));
      unrealTotal += pnl;
      const createdAt = Number(p?.created_at||0);
      if(createdAt && createdAt >= cutoff) unreal24 += pnl;
    }

    const pnlTotal = realized + unrealTotal;
    const pnl24 = realized24 + unreal24;

    if(refs?.pnlTotalValEl){
      refs.pnlTotalValEl.textContent = `${pnlTotal>=0?'+':''}$${fmt(pnlTotal,2)}`;
      refs.pnlTotalValEl.className = pnlTotal>=0?'up':'down';
    }
    if(refs?.pnl24ValEl){
      refs.pnl24ValEl.textContent = `${pnl24>=0?'+':''}$${fmt(pnl24,2)}`;
      refs.pnl24ValEl.className = pnl24>=0?'up':'down';
    }
    if(refs?.pnlTotalSubEl){
      refs.pnlTotalSubEl.textContent = `${state.t('dashboard.realized')} ${realized>=0?'+':''}$${fmt(realized,2)} • ${state.t('dashboard.unreal')} ${unrealTotal>=0?'+':''}$${fmt(unrealTotal,2)}`;
    }
    if(refs?.pnl24SubEl){
      refs.pnl24SubEl.textContent = `${state.t('dashboard.realized_24h')} ${realized24>=0?'+':''}$${fmt(realized24,2)} • ${state.t('dashboard.unreal_24h')} ${unreal24>=0?'+':''}$${fmt(unreal24,2)}`;
    }
  }

  async function tick(){
    if(!alive) return;
    if(isEffectivelyHidden()) return;
    if(inflight) return;
    if(!(String(location.hash||'').startsWith('#/home'))) return;
    const nowMs = Date.now();
    if(nowMs - lastRealPnlFetchAt > 45000){
      lastRealPnlFetchAt = nowMs;
      try{ if(activeMode() === 'real') await refreshRealPnlStats(false); else await refreshPnlStats({ force:false, mode:'demo' }); }catch(e){}
    }

    const groups = collectGroups();
    if(!groups.length){
      computeAndPaint();
      return;
    }

    inflight = true;
    try{
      for(const g of groups){
        if(!g.symbols.length) continue;
        const symList = g.symbols.slice(0, 30).join(',');
        const url = `/trade/stream.php?lite=1&symbols=${encodeURIComponent(symList)}&type=${encodeURIComponent(g.type)}&market=${encodeURIComponent(g.market)}`;
        const r = await api(url);
        const quotes = r && r.quotes ? r.quotes : {};
        for(const [sym, q] of Object.entries(quotes)){
          const s = String(sym||'').toUpperCase();
          const px = (g.market==='perp')
            ? safeNum(q && (q.mark_price ?? q.price ?? q.last), 0)
            : safeNum(q && (q.price ?? q.last ?? q.mark_price), 0);
          if(px>0) lastPx.set(s, px);
        }
      }
    }catch(e){
      // silent
    }finally{
      inflight = false;
      computeAndPaint();
    }
  }

  tick();
  let ms = pickInterval();
  if(ms > 0) timer = setInterval(tick, ms);

  const tune = ()=>{
    const next = pickInterval();
    if(next === ms) return;
    ms = next;
    try{ if(timer) clearInterval(timer); }catch(e){}
    timer = ms > 0 ? setInterval(tick, ms) : null;
  };
  document.addEventListener('visibilitychange', ()=>{ try{ tune(); tick(); }catch(e){} }, {passive:true});

  return function stop(){
    alive = false;
    try{ if(timer) clearInterval(timer); }catch(e){}
    timer = null;
  };
}



async function openKycFlow(){
  if((location.hash || '') !== '#/kyc') location.hash = '#/kyc';
  else render();
  return true;
}

function kycStatusMeta(status){
  const st = String(status || 'none').toLowerCase();
  if(st === 'approved' || st === 'active'){
    return {
      tone:'up',
      badge: state.t('kyc.status_approved') || tr('Approved','معتمد','Подтверждено'),
      title: tr('Verification approved','تم اعتماد التحقق','Проверка одобрена'),
      text: tr('Your identity review is complete. Funding and withdrawals can continue from the live-account flow.','تم اعتماد هويتك ويمكنك متابعة الإيداع والسحب من مسار الحساب الحقيقي.','Проверка личности завершена. Теперь можно продолжить пополнение и вывод средств.')
    };
  }
  if(st === 'pending' || st === 'under_review'){
    return {
      tone:'warn',
      badge: state.t('kyc.status_pending') || tr('Pending review','قيد المراجعة','На проверке'),
      title: tr('Verification under review','التحقق قيد المراجعة','Проверка рассматривается'),
      text: tr('Operations are reviewing the submitted files. You can revisit this page to track status updates and admin notes.','تقوم الإدارة بمراجعة الملفات المرفوعة الآن. يمكنك العودة لهذه الصفحة لمتابعة الحالة وملاحظات الإدارة.','Операторы проверяют загруженные файлы. Возвращайтесь на эту страницу, чтобы отслеживать статус и заметки.')
    };
  }
  if(st === 'rejected'){
    return {
      tone:'down',
      badge: state.t('kyc.status_rejected') || tr('Rejected','مرفوض','Отклонено'),
      title: tr('Verification needs attention','التحقق يحتاج تعديلًا','Проверка требует правок'),
      text: tr('Review the admin note, correct the details, and resubmit the required files below.','راجع ملاحظة الإدارة ثم صحّح البيانات وأعد إرسال الملفات المطلوبة بالأسفل.','Проверьте примечание администратора, исправьте данные и отправьте файлы повторно.')
    };
  }
  return {
    tone:'neutral',
    badge: state.t('kyc.not_verified') || tr('Not submitted','غير مُرسل','Не отправлено'),
    title: tr('Start account verification','ابدأ توثيق الحساب','Начните верификацию аккаунта'),
    text: tr('Submit your identity details once to unlock a cleaner funding and withdrawal workflow in the live account.','أرسل بيانات الهوية مرة واحدة لفتح مسار أوضح للإيداع والسحب في الحساب الحقيقي.','Отправьте данные личности один раз, чтобы открыть более понятный процесс пополнения и вывода для реального счёта.')
  };
}

function kycPage(){
  if(!state.walletSummary) refreshWalletSummary().then(()=>render()).catch(()=>{});
  if(!state.onboardingStatus) refreshOnboardingStatus().then(()=>render()).catch(()=>{});
  if(!state.kycStatusLoaded) loadKycStatus().then(()=>render()).catch(()=>{});
  if((!Array.isArray(state.countries) || !state.countries.length)) loadCountriesList().then(()=>render()).catch(()=>{});

  const me = state.me || {};
  const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  const liveAvail = safeNum(ws?.real?.available, safeNum(ws?.real?.balance, 0));
  const existing = state.kycStatus || null;
  const st = String(existing?.status || state.onboardingStatus?.kyc?.status || 'none').toLowerCase();
  const meta = kycStatusMeta(st);
  const allowSubmit = !['approved','active','pending','under_review'].includes(st);
  const fullName = h('input',{class:'input', placeholder:(state.t('kyc.full_name') || tr('Full legal name','الاسم الكامل الرسمي','Полное имя')), value: existing?.full_name || me.name || ''});
  const country = countrySelectEl(existing?.country || state.onboardingStatus?.kyc?.country || state.country || '');
  const docType = h('select',{class:'input'},
    h('option',{value:'passport'}, (state.t('kyc.doc_passport') || tr('Passport','جواز السفر','Паспорт'))),
    h('option',{value:'id'}, (state.t('kyc.doc_id') || tr('National ID','الهوية الوطنية','ID карта'))),
    h('option',{value:'driver'}, (state.t('kyc.doc_driver') || tr('Driver license','رخصة القيادة','Водительское удостоверение')))
  );
  if(existing?.doc_type){ try{ docType.value = String(existing.doc_type); }catch(e){} }
  const docNo = h('input',{class:'input', placeholder:(state.t('kyc.doc_number') || tr('Document number','رقم المستند','Номер документа')), value: existing?.doc_number || ''});
  const front = h('input',{class:'input', type:'file', accept:'image/*'});
  const back  = h('input',{class:'input', type:'file', accept:'image/*'});
  const selfie= h('input',{class:'input', type:'file', accept:'image/*'});
  const statusBadge = h('span',{class:`badge ${meta.tone==='up'?'up':(meta.tone==='down'?'down':'')}`}, meta.badge);
  const noteBox = existing?.admin_note ? h('div',{class:'kyc-note-box'},
    h('div',{class:'kyc-note-title'}, tr('Admin note','ملاحظة الإدارة','Примечание администратора')),
    h('div',{class:'muted'}, String(existing.admin_note))
  ) : null;
  const lastUpdated = Number(existing?.updated_at || state.onboardingStatus?.kyc?.updated_at || 0);

  async function submitKyc(){
    const fd = new FormData();
    fd.append('full_name', String(fullName.value||'').trim());
    fd.append('country', String(country.value||'').trim());
    fd.append('doc_type', String(docType.value||'').trim());
    fd.append('doc_number', String(docNo.value||'').trim());
    if(front.files && front.files[0]) fd.append('front', front.files[0]);
    if(back.files && back.files[0]) fd.append('back', back.files[0]);
    if(selfie.files && selfie.files[0]) fd.append('selfie', selfie.files[0]);
    try{
      await api('/kyc/submit.php', {method:'POST', body:fd, isFormData:true, timeoutMs:30000});
      state.kycStatus = null;
      state.kycStatusLoaded = false;
      await Promise.allSettled([loadKycStatus(true), refreshOnboardingStatus()]);
      toast(state.t('kyc.submitted') || tr('Verification submitted','تم إرسال التحقق','Проверка отправлена'));
      render();
    }catch(e){
      toast('❌ ' + (e?.message || state.t('common.failed') || tr('Request failed','فشل الطلب','Ошибка запроса')));
    }
  }

  const summaryCards = h('div',{class:'kyc-summary-grid'},
    h('div',{class:'kyc-summary-card'}, h('span',{class:'k'}, tr('Current status','الحالة الحالية','Текущий статус')), h('strong',{class:'v'}, meta.badge), h('small',{}, meta.text)),
    h('div',{class:'kyc-summary-card'}, h('span',{class:'k'}, tr('Country / region','الدولة / المنطقة','Страна / регион')), h('strong',{class:'v'}, existing?.country || state.onboardingStatus?.kyc?.country || '—'), h('small',{}, tr('Funding methods can follow the verified country when admin enables country-specific routes.','يمكن لوسائل التمويل اتباع الدولة الموثقة عندما يفعّل الأدمن التقييد حسب الدولة.','Методы пополнения могут зависеть от подтверждённой страны, если администратор включил такие правила.'))),
    h('div',{class:'kyc-summary-card'}, h('span',{class:'k'}, tr('Live account','الحساب الحقيقي','Реальный счёт')), h('strong',{class:'v'}, `$${fmt(liveAvail,2)}`), h('small',{}, tr('Available balance shown here so the onboarding context stays connected to funding.','يظهر هنا الرصيد المتاح حتى يبقى سياق التحقق مرتبطًا بالتمويل.','Доступный баланс показан здесь, чтобы сохранять связь между верификацией и финансированием.'))),
    h('div',{class:'kyc-summary-card'}, h('span',{class:'k'}, tr('Last update','آخر تحديث','Последнее обновление')), h('strong',{class:'v'}, lastUpdated ? new Date(lastUpdated*1000).toLocaleString() : '—'), h('small',{}, tr('Pending and rejected requests will continue to show here until a new decision is posted.','ستستمر الطلبات المعلقة أو المرفوضة في الظهور هنا حتى يصدر قرار جديد.','Ожидающие и отклонённые заявки будут отображаться здесь до нового решения.')))
  );

  const hero = h('div',{class:'card kyc-hero mb-3'},
    h('div',{class:'kyc-hero-copy'},
      h('div',{class:'eyebrow'}, tr('Verification center','مركز التحقق','Центр верификации')),
      h('h2',{class:'kyc-hero-title'}, meta.title),
      h('div',{class:'kyc-hero-sub'}, meta.text),
      h('div',{class:'row wrap mt-2', style:'gap:10px'}, statusBadge, h('span',{class:'pill'}, tr('Live account only','للحساب الحقيقي فقط','Только для реального счёта')))
    ),
    h('div',{class:'kyc-hero-actions'},
      h('button',{class:'btn outline', onclick:()=>location.hash='#/account'}, state.t('nav.account') || tr('Account','الحساب','Аккаунт')),
      h('button',{class:'btn primary', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions') || tr('Funds','التمويل','Финансы'))
    )
  );

  const formCard = h('div',{class:'card kyc-form-card'},
    h('div',{class:'split'},
      h('div',{}, h('h3',{style:'margin:0 0 6px'}, tr('Submit verification details','أرسل بيانات التحقق','Отправьте данные для верификации')), h('div',{class:'muted small'}, allowSubmit ? tr('Provide the identity details exactly as they appear on the document. Front document image and selfie are required.','أدخل بيانات الهوية كما تظهر في المستند تمامًا. صورة المستند الأمامية وصورة السيلفي مطلوبتان.','Укажите данные ровно так, как они указаны в документе. Нужны фото лицевой стороны документа и селфи.') : tr('The current verification request is locked while the existing decision remains active.','طلب التحقق الحالي مقفل طالما أن القرار الحالي ما زال نشطًا.','Текущая заявка на верификацию заблокирована, пока действует текущее решение.'))),
      allowSubmit ? h('span',{class:'pill'}, st === 'rejected' ? tr('Resubmission enabled','إعادة الإرسال متاحة','Повторная отправка доступна') : tr('New submission','طلب جديد','Новая заявка')) : h('span',{class:'pill'}, meta.badge)
    ),
    noteBox,
    h('div',{class:'kyc-form-grid mt-2'},
      h('div',{class:'stack'}, h('label',{class:'lbl'}, state.t('kyc.full_name') || tr('Full legal name','الاسم الكامل الرسمي','Полное имя')), fullName),
      h('div',{class:'stack'}, h('label',{class:'lbl'}, state.t('kyc.country') || tr('Country','الدولة','Страна')), country),
      h('div',{class:'stack'}, h('label',{class:'lbl'}, state.t('kyc.doc_type') || tr('Document type','نوع المستند','Тип документа')), docType),
      h('div',{class:'stack'}, h('label',{class:'lbl'}, state.t('kyc.doc_number') || tr('Document number','رقم المستند','Номер документа')), docNo)
    ),
    h('div',{class:'kyc-upload-grid mt-2'},
      h('div',{class:'kyc-upload-card'}, h('div',{class:'kyc-upload-title'}, tr('Front document','واجهة المستند','Лицевая сторона документа')), h('div',{class:'muted small'}, tr('Required','مطلوب','Обязательно')), front),
      h('div',{class:'kyc-upload-card'}, h('div',{class:'kyc-upload-title'}, tr('Back document','خلفية المستند','Обратная сторона документа')), h('div',{class:'muted small'}, tr('Optional for passports, recommended for ID cards.','اختياري لجواز السفر ومفضل للهوية.','Необязательно для паспорта, рекомендовано для ID карты.')), back),
      h('div',{class:'kyc-upload-card'}, h('div',{class:'kyc-upload-title'}, tr('Selfie / face match','سيلفي / مطابقة الوجه','Селфи / совпадение лица')), h('div',{class:'muted small'}, tr('Required','مطلوب','Обязательно')), selfie)
    ),
    h('div',{class:'kyc-checklist mt-2'},
      h('div',{class:'kyc-check-item'}, h('span',{class:'no'}, '1'), h('div',{}, tr('Make sure the name and document number are readable.','تأكد من وضوح الاسم ورقم المستند.','Убедитесь, что имя и номер документа читаемы.'))),
      h('div',{class:'kyc-check-item'}, h('span',{class:'no'}, '2'), h('div',{}, tr('Do not crop the document edges unless the document itself is damaged.','لا تقص أطراف المستند إلا إذا كان المستند تالفًا أصلًا.','Не обрезайте края документа, если сам документ не повреждён.'))),
      h('div',{class:'kyc-check-item'}, h('span',{class:'no'}, '3'), h('div',{}, tr('Use the same country that should later unlock the correct funding routes.','استخدم نفس الدولة التي ستفتح لاحقًا وسائل التمويل الصحيحة.','Используйте ту же страну, которая позже откроет корректные методы пополнения.')))
    ),
    h('div',{class:'row wrap mt-2', style:'gap:10px'},
      allowSubmit ? h('button',{class:'btn primary', onclick:submitKyc}, st === 'rejected' ? tr('Resubmit verification','إعادة إرسال التحقق','Отправить заново') : (state.t('kyc.submit') || tr('Submit verification','إرسال التحقق','Отправить проверку'))) : h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions') || tr('Open funds','افتح التمويل','Открыть финансы')),
      h('button',{class:'btn', onclick:()=>location.hash='#/account'}, state.t('nav.account') || tr('Back to account','العودة للحساب','Назад в аккаунт'))
    )
  );

  return h('div',{}, topBar(), hero, summaryCards, formCard, bottomNav());
}

function accountPage(){
  const me = state.me || {};
  const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  const demoBal = ws ? safeNum(ws.demo?.balance, 0) : 0;
  const realBal = ws ? safeNum(ws.real?.balance, 0) : 0;

  const name = (me.name || me.telegram_first_name || me.telegram_username || state.t('account.user'));
  const uid  = me.uid ? String(me.uid) : (me.id ? String(me.id) : '—');
  const tgUser = me.telegram_username ? '@'+me.telegram_username : (me.telegram_id ? ('#'+me.telegram_id) : '—');
  const provider = String(me.login_provider || 'web').toLowerCase();
  const providerLabel = provider === 'telegram' ? 'Telegram login' : 'Web login';

  const initials = (String(name||'U').trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('') || 'U').toUpperCase();

  const avatar = h('div',{class:'acc-avatar', title:name}, initials);
  const title = h('div',{class:'acc-title'},
    h('div',{class:'acc-name'}, name),
    h('div',{class:'acc-sub'}, `UID: ${uid} • ${tgUser}`)
  );

  const chips = h('div',{class:'row', style:'gap:8px;flex-wrap:wrap;'},
    h('span',{class:'chip'}, providerLabel),
    h('span',{class:'chip ghost'}, `${state.t('kyc.title')}: ${String(state.kycStatus?.status || state.onboardingStatus?.kyc?.status || 'none').toUpperCase()}`),
    (state.flags && state.flags.real_trading) ? h('span',{class:'pill tiny'}, state.t('trade.real_on')) : h('span',{class:'pill tiny'}, state.t('trade.real_off'))
  );

  const quick = h('div',{class:'acc-quick'},
    h('button',{class:'btn', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')),
    h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, tr('Notifications','التنبيهات','Уведомления')),
  h('button',{class:'btn support-btn with-ico', onclick:()=>openSupportBot()},
    h('span',{class:'ico'}, h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},
      h('path',{d:'M12 2a7 7 0 00-7 7v1a7 7 0 007 7v3l3-3h1a7 7 0 007-7V9a7 7 0 00-7-7h-4z',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'})
    )),
    (state.t('support.title'))
  )
);

  const accountHero = pageHero({
    eyebrow: tr('Profile hub','مركز الحساب','Профиль'),
    title: tr('Account, access, and client controls','الحساب والصلاحيات وأدوات العميل','Аккаунт, доступ и управление'),
    subtitle: tr('Review balances, verification state, notifications, and support entry points from one focused profile workspace.','راجع الأرصدة وحالة التحقق والتنبيهات ونقاط دخول الدعم من مساحة حساب واحدة وواضحة.','Проверяйте балансы, статус верификации, уведомления и поддержку из одного рабочего пространства.'),
    actions:[
      h('button',{class:'btn outline', onclick:()=>location.hash='#/wallet'}, state.t('nav.transactions')),
      h('button',{class:'btn primary', onclick:()=>location.hash='#/support'}, state.t('support.title'))
    ],
    aside: h('div',{class:'mini-stat-grid'},
      miniStatCard(state.t('account.primary'), `$${fmt(realBal,2)}`, tr('Live balance connected to platform operations','الرصيد الحقيقي المرتبط بعمليات المنصة','Реальный баланс платформы'), 'good'),
      miniStatCard(state.t('account.demo'), `$${fmt(demoBal,2)}`, tr('Practice environment balance','رصيد بيئة التجربة','Баланс тренировочного счёта')),
      miniStatCard(tr('Notifications','التنبيهات','Уведомления'), String(notificationsUnreadCount()), tr('Unread platform events','أحداث منصة غير مقروءة','Непрочитанные события платформы'), notificationsUnreadCount()>0 ? 'warn' : ''),
      miniStatCard(state.t('support.title'), String(supportUnreadCount()), tr('Replies waiting in your inbox','ردود بانتظارك في صندوق الدعم','Ответы в вашем инбоксе'), supportUnreadCount()>0 ? 'warn' : 'good')
    ),
    className:'account-hero-v26'
  });

  const list = h('div',{class:'acc-list'});

  // KYC status (best-effort)
  const kycRow = h('div',{class:'acc-item'},
    h('div',{class:'acc-item-l'},
      h('div',{class:'acc-item-t'}, state.t('kyc.title')),
      h('div',{class:'acc-item-s muted small'}, state.t('common.loading'))
    ),
    h('button',{class:'btn small', onclick:()=>openKycFlow().catch(e=>toast(e?.message||state.t('kyc.failed')))}, state.t('kyc.open'))
  );
  list.appendChild(kycRow);

  (async()=>{
    try{
      const existingKyc = await loadKycStatus();
      const k = { kyc: existingKyc };
      const st = (k.kyc && k.kyc.status) ? String(k.kyc.status) : 'none';
      const isGood = (st==='approved' || st==='active');
      const pretty = isGood ? (st==='approved' ? state.t('kyc.status_approved') : state.t('kyc.status_active')) :
                    st==='pending' ? state.t('kyc.status_pending') :
                    st==='rejected'? state.t('kyc.status_rejected') :
                    state.t('kyc.not_verified');
      const badge = h('span',{class:`badge ${isGood?'up':(st==='rejected'?'down':'')}`}, pretty);
      const sub = kycRow.querySelector('.acc-item-s');
      if(sub){ sub.innerHTML=''; sub.appendChild(badge); }
    }catch(e){
      const sub = kycRow.querySelector('.acc-item-s');
      if(sub) sub.textContent = state.t('common.failed_load');
    }
  })();

  // Language
  const langPicker = h('select',{class:'input mini', onchange:(e)=>setLang(e.target.value)},
    ...languageOptionNodes(state.lang)
  );
  list.appendChild(h('div',{class:'acc-item'},
    h('div',{class:'acc-item-l'},
      h('div',{class:'acc-item-t'}, state.t('account.language')),
      h('div',{class:'acc-item-s muted small'}, state.t('settings.language_hint'))
    ),
    langPicker
  ));


  list.appendChild(h('div',{class:'acc-item'},
    h('div',{class:'acc-item-l'},
      h('div',{class:'acc-item-t'}, tr('Notifications center','مركز التنبيهات','Центр уведомлений')),
      h('div',{class:'acc-item-s muted small'}, tr('Support replies, platform updates, verification changes, and funding progress in one feed.','ردود الدعم وتحديثات المنصة وتغييرات التحقق وتقدم التمويل في موجز واحد.','Ответы поддержки, обновления платформы, изменения верификации и прогресс финансирования в одной ленте.'))
    ),
    h('div',{class:'row wrap', style:'gap:8px; justify-content:flex-end'},
      notificationsUnreadCount() > 0 ? h('span',{class:'pill warn'}, tr('Unread','غير مقروء','Непрочитано') + ' ' + notificationsUnreadCount()) : h('span',{class:'pill'}, tr('Seen','تمت القراءة','Просмотрено')),
      h('button',{class:'btn small', onclick:()=>location.hash='#/notifications'}, tr('Open','فتح','Открыть'))
    )
  ));

  list.appendChild(h('div',{class:'acc-item'},
    h('div',{class:'acc-item-l'},
      h('div',{class:'acc-item-t'}, state.t('support.title')),
      h('div',{class:'acc-item-s muted small'}, supportUnreadCount() > 0 ? (tr('Unread replies waiting for you.','هناك ردود غير مقروءة بانتظارك.','Вас ждут непрочитанные ответы.')) : tr('Support inbox is up to date.','صندوق الدعم محدث ولا توجد ردود جديدة.','Входящие поддержки актуальны.'))
    ),
    h('div',{class:'row wrap', style:'gap:8px; justify-content:flex-end'},
      supportUnreadCount() > 0 ? h('span',{class:'pill ok'}, '+' + supportUnreadCount()) : h('span',{class:'pill'}, tr('Up to date','محدث','Актуально')),
      h('button',{class:'btn small', onclick:()=>location.hash='#/support'}, tr('Open','فتح','Открыть'))
    )
  ));

  // Session
  list.appendChild(h('div',{class:'acc-item'},
    h('div',{class:'acc-item-l'},
      h('div',{class:'acc-item-t'}, state.t('settings.session')),
      h('div',{class:'acc-item-s muted small'}, 'Secure web session')
    ),
    h('button',{class:'btn danger small', onclick:()=>{ try{ localStorage.removeItem('tp_token'); }catch(e){} window.location.href='/logout.php'; }}, state.lang==='ar' ? 'تسجيل الخروج' : (state.lang==='ru' ? 'Выйти' : 'Log out'))
  ));

  return h('div',{class:'account-page-v26'},
    topBar(),
    accountHero,
    h('div',{class:'card acc-head acc-head-v26'},
      h('div',{class:'row', style:'gap:12px;align-items:center;'}, avatar, title),
      h('div',{class:'divider'}),
      chips,
      h('div',{class:'mt-2'}, quick)
    ),
    h('div',{class:'card acc-settings-card-v26'},
      h('div',{class:'h2 mb-2'}, state.t('settings.title')),
      list
    ),
    bottomNav()
  );
}



function walletPage(){
  if (!state.ledger) refreshLedger(1).then(render).catch(()=>{});
  if (!state.depositsList) refreshDepositsList().then(render).catch(()=>{});
  if (!state.withdrawalsList) refreshWithdrawalsList().then(render).catch(()=>{});

  const ws = (state.walletSummary && state.walletSummary.ok) ? state.walletSummary : null;
  const activeMode = currentTradeModeKey();
  const walletDemoLocked = activeMode !== 'real';
  const activeSnap = currentAccountModeData(activeMode);
  const altSnap = currentAccountModeData(activeMode === 'real' ? 'demo' : 'real');
  const realBal = safeNum(ws?.real?.balance, 0);
  const realAvail = safeNum(ws?.real?.available, realBal);
  const realHolds = safeNum(ws?.real?.holds, Math.max(0, realBal - realAvail));
  const demoBal = safeNum(ws?.demo?.balance, 0);

  const hero = pageHero({
    eyebrow: tr('Funding center','مركز التمويل','Центр финансирования'),
    title: state.t('wallet.title'),
    subtitle: tr(
      'Everything related to deposits, withdrawals, and request tracking is grouped here in one clear place.',
      'كل ما يتعلق بالإيداع والسحب ومتابعة الطلبات موجود هنا بشكل واضح داخل مكان واحد.',
      'Всё, что связано с пополнениями, выводами и отслеживанием заявок, собрано здесь в одном понятном месте.'
    ),
    actions: [],
    className:`vp-wallet-hero${walletDemoLocked ? ' vp-page-preview-lock' : ''}`,
    aside: h('div',{class:'mini-stat-grid'},
      miniStatCard(activeMode === 'real' ? tr('Live available','المتاح الحقيقي','Доступно на реальном') : tr('Demo available','المتاح في الديمو','Доступно в demo'), `$${fmt(activeSnap.available,2)}`, activeMode === 'real' ? tr('Ready for withdrawal or trading','جاهز للسحب أو التداول','Готово к выводу или торговле') : tr('Practice-only buying power','رصيد للتجربة فقط','Баланс только для практики'), activeMode === 'real' ? 'good' : ''),
      miniStatCard(tr('On hold','قيد الحجز','В холде'), `$${fmt(activeSnap.holds,2)}`, tr('Pending admin review or holds','طلبات أو حجوزات معلقة','Ожидающие проверки или удержания'), activeSnap.holds>0?'warn':''),
      miniStatCard(activeMode === 'real' ? tr('Demo balance','رصيد الديمو','Демо баланс') : tr('Live balance','الرصيد الحقيقي','Реальный баланс'), `$${fmt(altSnap.balance,2)}`, activeMode === 'real' ? tr('For practice mode only','للتجربة فقط','Только для тренировки') : tr('Visible for funding once live access is unlocked','يظهر للتمويل عند فتح الوصول الحقيقي','Будет доступен для финансирования после разблокировки live'))
    )
  });

  const walletGateBanner = walletDemoLocked ? h('div',{class:'card vp-real-only-hero'},
    h('div',{class:'vp-real-only-copy'},
      h('div',{class:'vp-real-only-kicker'}, tr('Real account only','الحساب الحقيقي فقط','Только реальный счёт')),
      h('div',{class:'vp-real-only-title'}, tr('Assets, deposits, and withdrawals stay locked in Demo mode','الأصول والإيداعات والسحوبات تظل مقفولة في وضع الديمو','Активы, пополнения и выводы заблокированы в Demo')),
      h('div',{class:'vp-real-only-text'}, tr('This page is shown as a locked preview while you are on Demo. Switch to the real account to manage deposits, withdrawals, and funding requests.','هذه الصفحة تظهر كمعاينة مقفولة طالما أنت على الديمو. حوّل إلى الحساب الحقيقي لإدارة الإيداعات والسحوبات وطلبات التمويل.','Эта страница показывается как заблокированный предпросмотр, пока вы в Demo. Переключитесь на реальный счёт, чтобы управлять пополнениями, выводами и заявками на финансирование.')),
      h('div',{class:'vp-real-only-meta'},
        h('span',{class:'pill ghost'}, `${tr('Mode','الوضع','Режим')}: ${state.t('trade.mode_demo')}`),
        h('span',{class:'pill ghost'}, `${tr('Balance','الرصيد','Баланс')}: ${money(Number(walletBalance || 0), 2)}`),
        h('span',{class:'pill ghost'}, `${tr('Available','المتاح','Доступно')}: ${money(Number(walletAvailable || 0), 2)}`)
      ),
      h('div',{class:'vp-real-only-actions'},
        h('button',{class:'btn primary', type:'button', onclick:async()=>{ const ok = await requestTradeModeSwitch('real'); if(ok) render(true); }}, tr('Switch to Real','حوّل إلى الحقيقي','Переключить в Real')),
        h('button',{class:'btn outline', type:'button', onclick:()=>{ try{ openWalletRealOnlyDialog(); }catch(e){} }}, tr('Why is it locked?','لماذا هي مقفولة؟','Почему заблокировано?'))
      )
    ),
    h('div',{class:'vp-real-only-preview'},
      h('div',{class:'vp-real-only-preview-top'},
        h('span',{class:'vp-real-only-preview-badge'}, tr('Funding preview','معاينة التمويل','Превью финансирования')),
        h('span',{class:'vp-real-only-preview-dot'})
      ),
      h('div',{class:'vp-real-only-preview-grid'},
        h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, tr('Deposits','الإيداعات','Пополнения')), h('small',{}, tr('Approved methods, proof upload, and live credit requests stay here.','الوسائل المعتمدة ورفع الإثباتات وطلبات الإضافة الحية تبقى هنا.','Одобренные методы, загрузка подтверждений и live-заявки остаются здесь.'))),
        h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, tr('Withdrawals','السحوبات','Выводы')), h('small',{}, tr('Open payout routes and review details only inside the real account workflow.','افتح مسارات السحب وراجع البيانات فقط داخل مسار الحساب الحقيقي.','Маршруты вывода и реквизиты открываются только внутри real-потока.'))),
        h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, tr('Request history','سجل الطلبات','История заявок')), h('small',{}, tr('Track funding review progress and status changes from one protected timeline.','تابع تقدم المراجعة وتغييرات الحالة من خط زمني محمي واحد.','Отслеживайте прогресс проверки и изменения статуса из одной защищённой ленты.'))),
        h('div',{class:'vp-real-only-preview-card'}, h('strong',{}, tr('KYC aware','واعٍ بالتوثيق','С учётом KYC')), h('small',{}, tr('Pending verification opens as a popup on the next step instead of an abrupt redirect.','التوثيق المعلق يظهر كنافذة في الخطوة التالية بدل التحويل المفاجئ.','Ожидающая верификация откроется следующим шагом как окно, а не резкий редирект.')))
      )
    )
  ) : null;

  const actionCard = (kind, title, hint, onclick)=>h('button',{class:`wallet-action-card ${kind}`.trim(), onclick},
    h('div',{class:'wallet-action-icon'}, kind==='withdraw' ? '↑' : (kind==='history' ? '≡' : '↓')),
    h('div',{class:'wallet-action-main'},
      h('strong',{}, title),
      h('small',{}, hint)
    )
  );
  const walletModeLock = !walletDemoLocked ? buildRealWorkflowNotice('funding') : null;

  const actions = h('div',{class:'card section-card vp-wallet-panel' + (walletDemoLocked ? ' vp-page-preview-lock' : '')},
    h('div',{class:'section-card-head'},
      h('div',{},
        h('div',{class:'h2'}, tr('Quick actions','إجراءات سريعة','Быстрые действия')),
        h('div',{class:'muted small'}, tr('Start the exact funding action you need without switching between pages.','ابدأ الإجراء المطلوب مباشرة بدون التنقل بين صفحات كثيرة.','Запустите нужное действие без переходов между множеством страниц.'))
      )
    ),
    walletModeLock,
    h('div',{class:'wallet-actions-grid'},
      actionCard('deposit', state.t('wallet.deposit'), tr('Create a live deposit request','إنشاء طلب إيداع للحساب الحقيقي','Создать заявку на пополнение реального счёта'), ()=>{ if(!requireRealWorkflowAccess('deposit')) return; walletDepositFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.deposit_failed')))); }),
      actionCard('withdraw', state.t('wallet.withdraw'), tr('Submit a payout request for review','إرسال طلب سحب للمراجعة','Отправить заявку на вывод на проверку'), ()=>{ if(!requireRealWorkflowAccess('withdraw')) return; walletWithdrawFlow().catch(e=>toast('❌ '+(e?.message||state.t('wallet.withdraw_failed')||tr('Withdrawal failed','فشل تنفيذ السحب','Ошибка вывода')))); }),
      actionCard('history', tr('Transaction history','سجل المعاملات','История операций'), tr('Open wallet history and requests below','راجع السجل والطلبات بالأسفل','Просмотрите историю и заявки ниже'), ()=>document.querySelector('.wallet-history-anchor')?.scrollIntoView({behavior:'smooth', block:'start'}))
    )
  );

  const ledger = state.ledger;
  const all = (ledger && ledger.items) ? ledger.items : [];
  const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
  const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];

  const reqRow = (label, it, kind)=>{
    const id = it && it.id ? `#${it.id}` : '';
    const cur = String((it && it.currency) || '').toUpperCase();
    const amt = safeNum(it && it.amount, 0);
    const st = String((it && it.status) || '');
    const dt = it && it.created_at ? new Date(it.created_at*1000).toLocaleString() : '';
    const method = String((it && it.method) || '');
    return h('div',{class:'tx-item req-item'},
      h('div',{class:'tx-main'},
        h('div',{class:'tx-title-row'},
          h('div',{class:'tx-title'}, `${label} ${id}`.trim()),
          statusPill(st)
        ),
        h('div',{class:'tx-sub'}, [cur, method, dt].filter(Boolean).join(' • '))
      ),
      h('div',{class:`tx-amt ${kind==='deposit'?'up':'down'}`}, `${kind==='deposit'?'+':''}${fmt(amt,2)}`)
    );
  };

  const requestsCard = h('div',{class:'card section-card vp-wallet-panel' + (walletDemoLocked ? ' vp-page-preview-lock' : '')},
    h('div',{class:'section-card-head'},
      h('div',{},
        h('div',{class:'h2'}, state.t('wallet.requests')),
        h('div',{class:'muted small'}, state.t('wallet.requests_hint'))
      ),
      h('div',{class:'row wrap', style:'gap:8px'},
        h('span',{class:'pill'}, `${state.t('wallet.deposits')}: ${depItems.length}`),
        h('span',{class:'pill'}, `${state.t('wallet.withdrawals')}: ${wdrItems.length}`)
      )
    ),
    h('div',{class:'wallet-dual-grid'},
      h('div',{class:'section-subcard'},
        h('div',{class:'section-subtitle'}, state.t('wallet.deposits')),
        depItems.length
          ? h('div',{class:'tx-list'}, ...depItems.slice(0, 15).map(it=>reqRow(state.t('wallet.deposit'), it, 'deposit')))
          : h('div',{class:'empty-state'}, tr('No deposit requests yet.','لا توجد طلبات إيداع حتى الآن.','Пока нет заявок на пополнение.'))
      ),
      h('div',{class:'section-subcard'},
        h('div',{class:'section-subtitle'}, state.t('wallet.withdrawals')),
        wdrItems.length
          ? h('div',{class:'tx-list'}, ...wdrItems.slice(0, 15).map(it=>reqRow(state.t('wallet.withdraw'), it, 'withdraw')))
          : h('div',{class:'empty-state'}, tr('No withdrawal requests yet.','لا توجد طلبات سحب حتى الآن.','Пока нет заявок на вывод.'))
      )
    )
  );

  const items = all.filter(it=>{
    const rt = String((it && it.ref_type) || '').toLowerCase();
    const ty = String((it && it.type) || '').toLowerCase();
    if (rt === 'deposit' || rt === 'withdrawal') return true;
    if (ty.includes('deposit')) return true;
    if (ty.includes('withdraw')) return true;
    return false;
  });

  const txIcon = (kind)=> kind==='deposit'
    ? h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'}, h('path',{d:'M12 4v12m0 0l-5-5m5 5l5-5',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'}))
    : h('svg',{viewBox:'0 0 24 24','aria-hidden':'true'}, h('path',{d:'M12 20V8m0 0l-5 5m5-5l5 5',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'}));

  const txCard = h('div',{class:'card section-card wallet-history-anchor vp-wallet-panel' + (walletDemoLocked ? ' vp-page-preview-lock' : '')},
    h('div',{class:'section-card-head'},
      h('div',{},
        h('div',{class:'h2'}, state.t('wallet.transactions') || state.t('wallet.ledger')),
        h('div',{class:'muted small'}, tr('Only deposit and withdrawal entries are shown here for clarity.','يتم عرض حركات الإيداع والسحب فقط هنا لتبقى الصفحة واضحة.','Здесь для наглядности отображаются только операции пополнения и вывода.'))
      )
    ),
    (items.length ? h('div',{class:'tx-list'}, ...items.map(it=>{
      const amt = safeNum(it && it.amount, 0);
      const rt = String((it && it.ref_type) || '').toLowerCase();
      const ty = String((it && it.type) || '').toLowerCase();
      const isDep = (rt==='deposit') || ty.includes('deposit') || amt>0;
      const kind = isDep ? 'deposit' : 'withdraw';
      const dt = it && it.created_at ? new Date(it.created_at*1000).toLocaleString() : '';
      const cur = String(it.currency||'').toUpperCase();
      const title = isDep ? state.t('wallet.deposit') : state.t('wallet.withdraw');
      const sub = `${cur}${dt?(' • '+dt):''}`;
      return h('div',{class:`tx-item ${isDep?'dep':'wd'}`},
        h('div',{class:`tx-ico ${isDep?'dep':'wd'}`}, txIcon(kind)),
        h('div',{class:'tx-main'},
          h('div',{class:'tx-title'}, title),
          h('div',{class:'tx-sub'}, sub)
        ),
        h('div',{class:`tx-amt ${amt>=0?'up':'down'}`}, (amt>0?'+':'') + fmt(amt,2))
      );
    })) : h('div',{class:'empty-state'}, state.t('wallet.ledger_empty'))),
    h('div',{class:'row mt-2 wrap', style:'gap:10px'},
      h('button',{class:'btn secondary', onclick:async()=>{const p = Math.max(1,(state.ledgerPage||1)-1); await refreshLedger(p); render();}}, '‹'),
      h('span',{class:'pill'}, `${state.t('wallet.page')}: ${state.ledgerPage||1}`),
      h('button',{class:'btn secondary', onclick:async()=>{const p = (state.ledgerPage||1)+1; await refreshLedger(p); render();}}, '›')
    )
  );

  if(walletDemoLocked){
    try{
      const gateKey = `${String(location.hash || '#/wallet')}::demo`;
      if(state.__vpWalletDemoGateShownFor !== gateKey){
        state.__vpWalletDemoGateShownFor = gateKey;
        setTimeout(()=>{
          try{
            if(String(location.hash || '').startsWith('#/wallet') && currentTradeModeKey() !== 'real' && typeof openWalletRealOnlyDialog === 'function'){
              openWalletRealOnlyDialog();
            }
          }catch(e){}
        }, 60);
      }
    }catch(e){}
  }else{
    try{ state.__vpWalletDemoGateShownFor = null; }catch(e){}
  }

  return h('div',{class:`vp-wallet-page${walletDemoLocked ? ' is-demo-locked' : ''}`.trim()}, topBar(), hero, walletGateBanner, actions, requestsCard, txCard, bottomNav());
}


function notificationSeenAt(){
  try{ return Number(localStorage.getItem('tp_notifications_seen_at') || 0) || 0; }catch(e){ return 0; }
}

function notificationStatusTone(status){
  const v = String(status || '').toLowerCase();
  if(['approved','completed','confirmed','done','active','published','resolved'].includes(v)) return 'ok';
  if(['rejected','cancelled','failed','blocked','closed'].includes(v)) return 'bad';
  if(['pending','under_review','review','requested','processing','draft'].includes(v)) return 'warn';
  return '';
}

function notificationKindLabel(kind){
  if(kind==='support') return tr('Support','الدعم','Поддержка');
  if(kind==='news') return tr('News','الأخبار','Новости');
  if(kind==='deposit') return tr('Deposit','إيداع','Пополнение');
  if(kind==='withdrawal') return tr('Withdrawal','سحب','Вывод');
  if(kind==='kyc') return state.t('kyc.title') || tr('Verification','التحقق','Верификация');
  return tr('Update','تحديث','Обновление');
}

function notificationKindIcon(kind){
  if(kind==='support') return '☏';
  if(kind==='news') return '✦';
  if(kind==='deposit') return '↓';
  if(kind==='withdrawal') return '↑';
  if(kind==='kyc') return '✓';
  return '•';
}

function notificationPreviewBody(text, limit=180){
  const clean = String(text||'').replace(/\s+/g,' ').trim();
  if(clean.length <= limit) return clean;
  return clean.slice(0, Math.max(20, limit-1)).trimEnd() + '…';
}

function buildNotificationsFeed(){
  const items = [];
  const seenAt = notificationSeenAt();
  const pushItem = (item)=>{
    if(!item) return;
    items.push(Object.assign({
      id:'',
      kind:'system',
      title:'',
      body:'',
      status:'',
      ts:0,
      href:'#/home',
      pinned:false,
      unread_count:0,
      is_unread:false,
      meta:''
    }, item));
  };

  const support = Array.isArray(state.supportTickets) ? state.supportTickets : [];
  support.forEach(it=>{
    const ts = Number(it?.last_message_created_at || it?.last_message_at || it?.updated_at || it?.created_at || 0) || 0;
    const unread = Math.max(0, Number(it?.unread_count || 0));
    pushItem({
      id:'support-' + String(it?.id || Math.random()),
      kind:'support',
      title:String(it?.subject || it?.reason_code || (tr('Support ticket','تذكرة دعم','Тикет поддержки') + ' #' + String(it?.id || ''))),
      body:notificationPreviewBody(it?.last_message_preview || (it?.admin_note || '')),
      status:String(it?.status || 'open'),
      ts,
      href:`#/support?ticket=${encodeURIComponent(String(it?.id || ''))}`,
      unread_count: unread,
      is_unread: unread > 0,
      meta:[notificationKindLabel('support'), ts ? new Date(ts*1000).toLocaleString() : ''].filter(Boolean).join(' • ')
    });
  });

  const news = Array.isArray(state.newsFeed) ? state.newsFeed : [];
  news.forEach(it=>{
    const ts = Number(it?.published_at || it?.updated_at || 0) || 0;
    pushItem({
      id:'news-' + String(it?.id || Math.random()),
      kind:'news',
      title:String(it?.title || tr('Platform announcement','إعلان المنصة','Объявление платформы')),
      body:notificationPreviewBody(it?.body || ''),
      status:String(it?.status || 'published'),
      ts,
      href:`#/news?id=${encodeURIComponent(String(it?.id || ''))}`,
      pinned:Number(it?.pinned || 0) === 1,
      is_unread: ts > seenAt,
      meta:[notificationKindLabel('news'), ts ? new Date(ts*1000).toLocaleString() : ''].filter(Boolean).join(' • ')
    });
  });

  const kyc = state.onboardingStatus?.kyc || state.kycStatus || null;
  const kycStatus = String(kyc?.status || '').toLowerCase();
  const kycTs = Number(kyc?.updated_at || 0) || 0;
  if(kycStatus){
    const body = kycStatus === 'approved'
      ? tr('Your verification is approved and your live workflow is in a healthy state.','تمت الموافقة على التحقق ويمكنك المتابعة في الحساب الحقيقي بشكل طبيعي.','Верификация одобрена, и рабочий процесс по реальному счёту в порядке.')
      : kycStatus === 'pending'
        ? tr('Documents are under review. Operations will update the result here once checks finish.','مستنداتك قيد المراجعة وسيتم تحديث النتيجة هنا بعد انتهاء الفحص.','Документы на проверке. Команда обновит результат после завершения проверки.')
        : kycStatus === 'rejected'
          ? tr('Your verification needs attention. Open the KYC page and review the latest admin note.','التحقق يحتاج إلى انتباهك. افتح صفحة التحقق وراجع آخر ملاحظة من الإدارة.','Верификация требует внимания. Откройте страницу KYC и просмотрите последнюю заметку администратора.')
          : tr('Verification status has been updated. Open the KYC center for more details.','تم تحديث حالة التحقق. افتح مركز التحقق للمزيد من التفاصيل.','Статус верификации обновлён. Откройте центр KYC для подробностей.');
    pushItem({
      id:'kyc-' + String(kycStatus),
      kind:'kyc',
      title:tr('Verification status updated','تم تحديث حالة التحقق','Статус верификации обновлён'),
      body,
      status:kycStatus,
      ts:kycTs,
      href:'#/kyc',
      is_unread: kycTs > seenAt,
      meta:[notificationKindLabel('kyc'), kycTs ? new Date(kycTs*1000).toLocaleString() : ''].filter(Boolean).join(' • ')
    });
  }

  const depItems = (state.depositsList && Array.isArray(state.depositsList.items)) ? state.depositsList.items : [];
  depItems.slice(0,8).forEach(it=>{
    const ts = Number(it?.updated_at || it?.confirmed_at || it?.created_at || 0) || 0;
    const amount = Number(it?.amount || 0) || 0;
    const cur = String(it?.currency || 'USDT').toUpperCase();
    const method = String(it?.method_code || it?.provider || '');
    pushItem({
      id:'deposit-' + String(it?.id || Math.random()),
      kind:'deposit',
      title:tr('Deposit request','طلب إيداع','Заявка на пополнение') + ' #' + String(it?.id || ''),
      body:[method, `${fmt(amount,2)} ${cur}`].filter(Boolean).join(' • '),
      status:String(it?.status || 'pending'),
      ts,
      href:'#/wallet',
      is_unread: ts > seenAt,
      meta:[notificationKindLabel('deposit'), ts ? new Date(ts*1000).toLocaleString() : ''].filter(Boolean).join(' • ')
    });
  });

  const wdrItems = (state.withdrawalsList && Array.isArray(state.withdrawalsList.items)) ? state.withdrawalsList.items : [];
  wdrItems.slice(0,8).forEach(it=>{
    const ts = Number(it?.updated_at || it?.completed_at || it?.created_at || 0) || 0;
    const amount = Number(it?.amount || 0) || 0;
    const cur = String(it?.currency || 'USDT').toUpperCase();
    const method = String(it?.method || '');
    pushItem({
      id:'withdrawal-' + String(it?.id || Math.random()),
      kind:'withdrawal',
      title:tr('Withdrawal request','طلب سحب','Заявка на вывод') + ' #' + String(it?.id || ''),
      body:[method, `${fmt(amount,2)} ${cur}`].filter(Boolean).join(' • '),
      status:String(it?.status || 'pending'),
      ts,
      href:'#/wallet',
      is_unread: ts > seenAt,
      meta:[notificationKindLabel('withdrawal'), ts ? new Date(ts*1000).toLocaleString() : ''].filter(Boolean).join(' • ')
    });
  });

  items.sort((a,b)=>{
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    return bp - ap || Number(b.ts || 0) - Number(a.ts || 0);
  });
  return items;
}

async function refreshNotificationsData(force=false){
  await Promise.allSettled([
    refreshSupportTickets(force),
    refreshNewsFeed(force),
    refreshOnboardingStatus(),
    loadKycStatus(force),
    refreshDepositsList(),
    refreshWithdrawalsList()
  ]);
  state.notificationsFeed = buildNotificationsFeed();
  state.__notificationsUnreadCached = (state.notificationsFeed || []).reduce((acc, it)=> acc + (it.kind==='support' ? Math.max(0, Number(it.unread_count || 0)) : (it.is_unread ? 1 : 0)), 0);
  return state.notificationsFeed;
}

function notificationsUnreadCount(){
  if(Array.isArray(state.notificationsFeed)){
    if(Number.isFinite(Number(state.__notificationsUnreadCached))) return Number(state.__notificationsUnreadCached) || 0;
    state.__notificationsUnreadCached = (state.notificationsFeed || []).reduce((acc, it)=> acc + (it.kind==='support' ? Math.max(0, Number(it.unread_count || 0)) : (it.is_unread ? 1 : 0)), 0);
    return Number(state.__notificationsUnreadCached) || 0;
  }
  const built = buildNotificationsFeed();
  const unread = built.reduce((acc, it)=> acc + (it.kind==='support' ? Math.max(0, Number(it.unread_count || 0)) : (it.is_unread ? 1 : 0)), 0);
  state.__notificationsUnreadCached = unread;
  return unread;
}

function markNotificationsSeen(){
  const currentSeen = notificationSeenAt();
  const latestTs = buildNotificationsFeed().filter(it=>it.kind!=='support').reduce((acc, it)=> Math.max(acc, Number(it.ts || 0) || 0), currentSeen);
  if(latestTs > currentSeen){
    try{ localStorage.setItem('tp_notifications_seen_at', String(latestTs)); }catch(e){}
  }
  try{ markNewsSeen(); }catch(e){}
}
try{
  window.refreshNotificationsData = refreshNotificationsData;
  window.notificationsUnreadCount = notificationsUnreadCount;
  window.markNotificationsSeen = markNotificationsSeen;
}catch(e){}



function uiEpoch(ts){
  if (ts === null || ts === undefined) return 0;
  const raw = String(ts).trim();
  if (!raw) return 0;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed / 1000) : 0;
}

function uiDateText(ts){
  const epoch = uiEpoch(ts);
  return epoch > 0 ? new Date(epoch * 1000).toLocaleString() : '';
}

let __newsInflight = null;
let __newsAt = 0;
let __newsPrimed = false;
async function refreshNewsFeed(force=false){
  const now = Date.now();
  if (state.newsFeed && !force && (now-__newsAt) < 9000) return state.newsFeed;
  if(__newsInflight) return __newsInflight;
  const prevLatest = (Array.isArray(state.newsFeed) ? state.newsFeed : []).reduce((acc, it)=> Math.max(acc, uiEpoch(it && (it.published_at || it.updated_at || it.created_at))), 0);
  __newsInflight = apiGetCached(`/news/list.php?lang=${encodeURIComponent(state.lang)}&limit=12`, force ? 0 : 3500)
    .then(r=>{
      state.newsFeed = (Array.isArray(r.items) ? r.items.slice() : []).sort((a,b)=> uiEpoch(b && (b.published_at || b.updated_at || b.created_at)) - uiEpoch(a && (a.published_at || a.updated_at || a.created_at)) || (Number(b && b.id || 0) - Number(a && a.id || 0)));
      state.newsConfig = (r && r.config && typeof r.config === 'object') ? r.config : (state.newsConfig || null);
      __newsAt = Date.now();
      const latestTs = state.newsFeed.reduce((acc, it)=> Math.max(acc, uiEpoch(it && (it.published_at || it.updated_at || it.created_at))), 0);
      if(__newsPrimed && latestTs > prevLatest){
        const newest = state.newsFeed.find(it=>uiEpoch(it && (it.published_at || it.updated_at || it.created_at)) === latestTs) || state.newsFeed[0];
        if(newest && (!state.newsConfig || state.newsConfig.toast_enabled !== false)){
          try{ showLiveNotificationToast({kind:'news', title:String(newest.title || tr('New announcement','إعلان جديد','Новое объявление')), body:String(newest.excerpt || newest.body || ''), href:`#/news?id=${encodeURIComponent(String(newest.id || ''))}`}); }catch(e){}
        }
      }
      __newsPrimed = true;
      return state.newsFeed;
    })
    .catch(()=>{ state.newsFeed = []; return state.newsFeed; })
    .finally(()=>{ __newsInflight = null; });
  return __newsInflight;
}

let __supportTicketsInflight = null;
let __supportTicketsAt = 0;
async function refreshSupportTickets(force=false){
  const now = Date.now();
  if (state.supportTickets && !force && (now-__supportTicketsAt) < 6000) return state.supportTickets;
  if(__supportTicketsInflight) return __supportTicketsInflight;
  __supportTicketsInflight = apiGetCached('/support/list.php', force ? 0 : 2500)
    .then(r=>{
      state.supportTickets = (Array.isArray(r.items) ? r.items.slice() : []).sort((a,b)=> uiEpoch(b && (b.updated_at || b.created_at)) - uiEpoch(a && (a.updated_at || a.created_at)) || (Number(b && b.id || 0) - Number(a && a.id || 0)));
      __supportTicketsAt = Date.now();
      return state.supportTickets;
    })
    .catch(()=>{ state.supportTickets = []; return state.supportTickets; })
    .finally(()=>{ __supportTicketsInflight = null; });
  return __supportTicketsInflight;
}

async function loadSupportTicket(ticketId){
  if (!ticketId) return null;
  const r = await api(`/support/get.php?id=${encodeURIComponent(ticketId)}`);
  state.supportCurrent = r && r.ok ? {ticket:r.ticket || null, messages:Array.isArray(r.messages)?r.messages:[]} : null;
  return state.supportCurrent;
}

function supportStatusTone(status){
  const s = String(status||'open').toLowerCase();
  if(['resolved','approved','done'].includes(s)) return 'ok';
  if(['closed','rejected','failed'].includes(s)) return 'bad';
  if(['pending','under_review','waiting'].includes(s)) return 'warn';
  return '';
}

function supportStatusPill(status){
  return h('span',{class:`pill ${supportStatusTone(status)}`.trim()}, String(status||'open').replace(/_/g,' '));
}

function supportUnreadCount(){
  return (Array.isArray(state.supportTickets) ? state.supportTickets : []).reduce((acc, it)=> acc + Math.max(0, Number((it && it.unread_count) || 0)), 0);
}

function newsUnreadCount(){
  const seenAt = uiEpoch(localStorage.getItem('tp_news_seen_at') || 0);
  return (Array.isArray(state.newsFeed) ? state.newsFeed : []).reduce((acc, it)=>{
    const ts = uiEpoch(it && (it.published_at || it.updated_at || it.created_at));
    return acc + (ts > seenAt ? 1 : 0);
  }, 0);
}

function markNewsSeen(){
  const currentSeen = uiEpoch(localStorage.getItem('tp_news_seen_at') || 0);
  const latestTs = (Array.isArray(state.newsFeed) ? state.newsFeed : []).reduce((acc, it)=> Math.max(acc, uiEpoch(it && (it.published_at || it.updated_at || it.created_at))), currentSeen);
  if (latestTs > currentSeen) localStorage.setItem('tp_news_seen_at', String(latestTs));
}


function newsHeroImage(url, alt='News image', cls='news-media-cover'){
  const src = String(url || '').trim();
  if(!src) return null;
  return h('img',{class:cls, src, alt});
}

function newsTickerStrip(limit=8){
  if(state.newsConfig && state.newsConfig.dashboard_ticker_enabled === false) return null;
  const effLimit = (state.newsConfig && Number(state.newsConfig.max_items_home||0) > 0) ? Number(state.newsConfig.max_items_home) : limit;
  const items = (Array.isArray(state.newsFeed) ? state.newsFeed : []).slice(0, effLimit);
  if(!items.length) return null;
  const trackItems = items.concat(items);
  return h('div',{class:'card news-ticker-card'},
    h('div',{class:'split', style:'align-items:center; gap:10px'},
      h('div',{},
        h('div',{class:'h2', style:'margin:0 0 4px'}, tr('Latest news pulse','نبض الأخبار الأخيرة','Пульс последних новостей')),
        h('div',{class:'muted small'}, tr('A live ribbon of platform announcements from the client dashboard.', 'شريط حي لآخر أخبار المنصة من داخل لوحة العميل.', 'Живая лента объявлений платформы прямо из клиентской панели.'))
      ),
      newsUnreadCount() > 0 ? h('span',{class:'pill warn'}, tr('New','جديد','Новое') + ' ' + newsUnreadCount()) : h('span',{class:'pill'}, tr('Live','لحظي','Онлайн'))
    ),
    h('div',{class:'news-ticker-shell'},
      h('div',{class:'news-ticker-track'}, ...trackItems.map(it=>h('button',{class:'news-ticker-chip', type:'button', onclick:()=>{ markNewsSeen(); location.hash = `#/news?id=${encodeURIComponent(String(it?.id || ''))}`; render(); }},
        it?.image_url ? h('span',{class:'news-ticker-thumb-wrap'}, h('img',{class:'news-ticker-thumb', src:String(it.image_url), alt:String(it.title || 'News')})) : h('span',{class:'news-ticker-dot'}, '✦'),
        h('span',{class:'news-ticker-copy'},
          h('strong',{}, String(it?.title || tr('Update','تحديث','Обновление'))),
          h('span',{}, String(it?.source_label || tr('Platform updates','تحديثات المنصة','Обновления платформы')))
        )
      )))
    )
  );
}

function queueNotificationsPrimer(delay=900){
  if(state.__notificationsPrimed || state.__notificationsPriming) return;
  const run = ()=>{
    state.__notificationsPriming = true;
    const unreadBefore = Number(state.__notificationsUnreadCached || 0) || 0;
    refreshNotificationsData(false)
      .then(()=>{
        state.__notificationsPrimed = true;
        const unreadAfter = Number(state.__notificationsUnreadCached || 0) || 0;
        const currentRoute = routeNameFromHash(location.hash || '#/home');
        if(currentRoute !== 'trade'){
          if(!Array.isArray(state.notificationsFeed) || unreadAfter !== unreadBefore){
            try{ requestRender(); }catch(e){}
          } else {
            try{ requestRender(); }catch(e){}
          }
        }
      })
      .catch(()=>{})
      .finally(()=>{ state.__notificationsPriming = false; });
  };
  if(typeof window.requestIdleCallback === 'function'){
    requestIdleCallback(run, {timeout: delay});
  } else {
    setTimeout(run, delay);
  }
}


const __vpMarketSnapshotCache = new Map();
async function vpFetchMarketSnapshot(route='home', preferredType=state.selectedAssetType || 'crypto', force=false){
  const preferred = normalizeLiveAssetType(preferredType || state.selectedAssetType || 'crypto');
  const key = `${String(route||'home').toLowerCase()}:${preferred}`;
  const now = Date.now();
  const hit = __vpMarketSnapshotCache.get(key);
  if(!force && hit && hit.promise) return hit.promise;
  if(!force && hit && hit.data && (now - Number(hit.ts || 0)) <= 1600) return hit.data;
  const run = (async()=>{
    const routeName = String(route || 'home').toLowerCase();
    const snapshotTypes = routeName === 'trade'
      ? [preferred]
      : (routeName === 'home'
          ? [...new Set([preferred, 'crypto', 'forex', 'stocks', 'commodities'].map(v=>normalizeLiveAssetType(v)))]
          : [preferred]);
    const typesParam = snapshotTypes.filter(Boolean).join(',');
    const wantsLive = force || routeName === 'trade' || preferred === 'crypto';
    const resp = await api(`/market_snapshot.php?route=${encodeURIComponent(routeName)}&preferred=${encodeURIComponent(preferred)}${typesParam ? `&types=${encodeURIComponent(typesParam)}` : ''}${force ? '&force=1' : ''}${wantsLive ? '&force_live=1' : ''}`, { timeoutMs: preferred === 'crypto' ? 6200 : 7600 });
    const pools = (resp && typeof resp.pools === 'object' && resp.pools) ? resp.pools : {};
    const normalizedPools = {};
    Object.keys(pools).forEach(type=>{
      const normType = normalizeLiveAssetType(type || 'crypto');
      const items = Array.isArray(pools[type]) ? vpOverlayMarketsWithFreshQuotes(pools[type], normType) : [];
      normalizedPools[normType] = items;
      try{ if(items.length) persistMarketsLocal(normType, items); }catch(e){}
    });
    const merged = vpMergeMarketItemsByKeyLite([], Array.isArray(resp?.items) ? resp.items : Object.values(normalizedPools).flat());
    const out = { ok: !!resp?.ok, pools: normalizedPools, items: merged, generated_at: Number(resp?.generated_at || Math.floor(Date.now()/1000)) || Math.floor(Date.now()/1000) };
    __vpMarketSnapshotCache.set(key, { ts: Date.now(), data: out });
    return out;
  })().finally(()=>{
    const cur = __vpMarketSnapshotCache.get(key);
    if(cur && cur.promise) __vpMarketSnapshotCache.set(key, { ts: cur.ts || Date.now(), data: cur.data || null });
  });
  __vpMarketSnapshotCache.set(key, { ts: now, data: hit?.data || null, promise: run });
  return run;
}

function vpMergeMarketItemsByKeyLite(existing, incoming){
  const map = new Map();
  const push = (items)=>{
    (Array.isArray(items) ? items : []).forEach(item=>{
      const sym = String(item?.symbol || '').toUpperCase().trim();
      const type = normalizeLiveAssetType(item?.type || 'crypto');
      if(!sym) return;
      const key = `${type}:${sym}`;
      const prev = map.get(key) || null;
      const normalized = Object.assign({}, item, { symbol:sym, type });
      map.set(key, prev ? vpMergeMarketItemAuthority(prev, normalized, type) : normalized);
    });
  };
  push(existing);
  push(incoming);
  return [...map.values()];
}

function vpLiteMarketSignature(items){
  return (Array.isArray(items) ? items : [])
    .slice(0, 60)
    .map(item=>{
      const sym = String(item?.symbol || '').toUpperCase().trim();
      const type = normalizeLiveAssetType(item?.type || 'crypto');
      const price = Number(item?.price || 0).toFixed(6);
      const chg = Number(item?.change_pct || 0).toFixed(4);
      const upd = Number(item?.updated_at || 0);
      return `${type}:${sym}:${price}:${chg}:${upd}`;
    })
    .join('|');
}

async function primePlatformMarketUniverse(opts={}){
  const force = !!opts.force;
  const now = Date.now();
  const last = Number(state.__vpGlobalMarketsPrimedAt || 0);
  if(!force && state.__vpGlobalMarketsPriming) return state.__vpGlobalMarketsPriming;
  if(!force && last && (now - last) < 45000) return Promise.resolve(Array.isArray(state.__vpGlobalMarketsPrimePool) ? state.__vpGlobalMarketsPrimePool : []);
  const preferred = normalizeLiveAssetType(opts.preferredType || state.selectedAssetType || 'crypto');
  const routeName = String(opts.route || routeNameFromHash(location.hash || '#/home')).toLowerCase();
  if(routeName === 'trade') return Promise.resolve(Array.isArray(state.__vpGlobalMarketsPrimePool) ? state.__vpGlobalMarketsPrimePool : []);
  const baseOrder = [preferred, 'crypto','forex','stocks','arab','commodities','futures']
    .map(v=>normalizeLiveAssetType(v || 'crypto'))
    .filter((v, idx, arr)=>v && v !== 'all' && arr.indexOf(v) === idx);
  const prioritySet = new Set(routeName === 'home' ? [preferred, 'crypto'] : (routeName === 'trade' ? [preferred, 'crypto'] : [preferred]));
  const order = baseOrder.filter(v=>prioritySet.has(v));
  const deferredOrder = baseOrder.filter(v=>!prioritySet.has(v));
  const drawerCache = state.__vpTradeDrawerMarketCache = (state.__vpTradeDrawerMarketCache && typeof state.__vpTradeDrawerMarketCache === 'object') ? state.__vpTradeDrawerMarketCache : {};
  const run = (async()=>{
    let merged = Array.isArray(state.__vpGlobalMarketsPrimePool) ? state.__vpGlobalMarketsPrimePool.slice() : [];
    let lastRenderSig = vpLiteMarketSignature(merged);
    try{
      const snap = await vpFetchMarketSnapshot(opts.route || routeNameFromHash(location.hash || '#/home'), preferred, force);
      if(snap && snap.pools && typeof snap.pools === 'object'){
        order.forEach(type=>{
          const items = Array.isArray(snap.pools[type]) ? snap.pools[type] : [];
          if(!items.length) return;
          drawerCache[type] = vpMergeMarketItemsByKeyLite(drawerCache[type] || [], items);
          merged = vpMergeMarketItemsByKeyLite(merged, items);
          try{ persistMarketsLocal(type, drawerCache[type]); }catch(e){}
        });
        state.__vpGlobalMarketsPrimePool = merged;
        state.__vpHomeMarketPool = vpMergeMarketItemsByKeyLite(Array.isArray(state.__vpHomeMarketPool) ? state.__vpHomeMarketPool : [], merged);
        const nextRenderSig = vpLiteMarketSignature(merged);
        if(nextRenderSig !== lastRenderSig){
          lastRenderSig = nextRenderSig;
          try{ requestRender(); }catch(e){}
        }
      }
    }catch(e){}

    for(let i=0;i<order.length;i+=2){
      const wave = order.slice(i, i + 2);
      await Promise.allSettled(wave.map(async(type)=>{
        const pool = Array.isArray(drawerCache[type]) ? drawerCache[type].slice(0, type === preferred ? (type === 'crypto' ? 20 : 14) : 10) : [];
        if(!pool.length) return;
        try{
          const liveItems = await vpFetchFreshMarketQuotes(type, pool, type === 'crypto' ? 800 : 1000);
          if(Array.isArray(liveItems) && liveItems.length){
            drawerCache[type] = vpMergeMarketItemsByKeyLite(drawerCache[type] || [], liveItems);
            merged = vpMergeMarketItemsByKeyLite(merged, liveItems);
            try{ persistMarketsLocal(type, drawerCache[type]); }catch(e){}
          }
        }catch(e){}
      }));
      if(i <= 0){
        state.__vpGlobalMarketsPrimePool = merged;
        state.__vpHomeMarketPool = vpMergeMarketItemsByKeyLite(Array.isArray(state.__vpHomeMarketPool) ? state.__vpHomeMarketPool : [], merged);
        const nextRenderSig = vpLiteMarketSignature(merged);
        if(nextRenderSig !== lastRenderSig){
          lastRenderSig = nextRenderSig;
          try{ requestRender(); }catch(e){}
        }
      }
      if(i + 2 < order.length) await new Promise(resolve=>setTimeout(resolve, i === 0 ? 120 : 180));
    }
    try{
      const stillSameRoute = ()=> String(routeNameFromHash(location.hash || '#/home')) === routeName;
      for(let i=0;i<deferredOrder.length;i++){
        const type = deferredOrder[i];
        if(!type) continue;
        if(document.hidden || !stillSameRoute()) break;
        await new Promise(resolve=>setTimeout(resolve, 2200));
        if(document.hidden || !stillSameRoute()) break;
        const pool = Array.isArray(drawerCache[type]) ? drawerCache[type].slice(0, 8) : [];
        if(!pool.length) continue;
        try{
          const liveItems = await vpFetchFreshMarketQuotes(type, pool, 1200);
          if(Array.isArray(liveItems) && liveItems.length){
            drawerCache[type] = vpMergeMarketItemsByKeyLite(drawerCache[type] || [], liveItems);
            merged = vpMergeMarketItemsByKeyLite(merged, liveItems);
            try{ persistMarketsLocal(type, drawerCache[type]); }catch(e){}
          }
        }catch(e){}
      }
    }catch(e){}

    try{
      if(String(opts.route || routeNameFromHash(location.hash || '#/home')) === 'home'){
        await Promise.allSettled([refreshTradingBotSignals(false), refreshMyTradingBotSubs(false)]);
      }
    }catch(e){}
    state.__vpGlobalMarketsPrimePool = merged;
    state.__vpGlobalMarketsPrimedAt = Date.now();
    return merged;
  })().finally(()=>{ state.__vpGlobalMarketsPriming = null; });
  state.__vpGlobalMarketsPriming = run;
  return run;
}

async function warmRouteData(force=false, hash=location.hash || '#/home'){
  const route = routeNameFromHash(hash);
  const now = Date.now();
  const last = Number(state.__routeWarmAt?.[route] || 0);
  if(!force && last && (now - last) < 7000) return;
  state.__routeWarmAt[route] = now;

  const jobs = [];
  if(!state.walletSummary || force) jobs.push(refreshWalletSummary(force));
  if((route === 'home' || route === 'wallet' || route === 'account' || route === 'kyc' || route === 'notifications' || route === 'support') || force){
    jobs.push(refreshOnboardingStatus(force));
  }

  if(route === 'home'){
    const homeMode = String(state.tradeMode || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    jobs.push(homeMode === 'real' ? refreshRealPortfolio(force) : refreshPortfolio({ force, mode:'demo' }));
    jobs.push(homeMode === 'real' ? refreshRealPnlStats() : refreshPnlStats({ force, mode:'demo' }));
    const lastMarketsWarm = Number(state.__routeWarmMarketsAt?.home || 0);
    if(force || !lastMarketsWarm || (now - lastMarketsWarm) > 12000){
      state.__routeWarmMarketsAt = state.__routeWarmMarketsAt || {};
      state.__routeWarmMarketsAt.home = now;
      jobs.push(refreshMarkets({type:'crypto', warm:true, ttlMs:900, withQuotes:false}));
      jobs.push(Promise.resolve().then(()=>primePlatformMarketUniverse({ route:'home', preferredType: state.selectedAssetType || 'crypto', force:false })).catch(()=>{}));
    }
          } else if(route === 'trade'){
    const tradeRoute = syncTradeRouteIntoState(getTradeRouteSnapshot());
    jobs.push(refreshMarkets({type: tradeRoute.type || state.selectedAssetType || 'crypto', warm:true, ttlMs:500, withQuotes:true}));
    jobs.push(Promise.resolve().then(()=>{
      try{
        QuoteCache.setActive(String(tradeRoute.symbol || state.selectedSymbol || 'BTCUSDT').toUpperCase(), tradeRoute.type || state.selectedAssetType || 'crypto', tradeRoute.market || state.tradeMarket || 'spot');
        QuoteCache.setSpeed(preferredQuotePollMs(tradeRoute.type || state.selectedAssetType || 'crypto', tradeRoute.market || state.tradeMarket || 'spot', !!document.hidden));
      }catch(e){}
    }));
    jobs.push(refreshPortfolio({force, mode: state.tradeMode}), refreshPnlStats({force, mode: state.tradeMode}));
      } else if(route === 'markets'){
    jobs.push(refreshMarkets({type: state.selectedAssetType || 'crypto', warm:true, ttlMs:900, withQuotes:(normalizeLiveAssetType(state.selectedAssetType || 'crypto') !== 'crypto')}));
      } else if(route === 'portfolio'){
    jobs.push(refreshPortfolio({force, mode: state.tradeMode}), refreshPnlStats({force, mode: state.tradeMode}));
  } else if(route === 'wallet'){
    jobs.push(loadKycStatus(force), refreshDepositsList(force), refreshWithdrawalsList(force));
    queueNotificationsPrimer(1000);
  } else if(route === 'notifications'){
    jobs.push(refreshNotificationsData(force));
  } else if(route === 'support'){
    jobs.push(refreshSupportTickets(force));
  } else if(route === 'news'){
    jobs.push(refreshNewsFeed(force));
    queueNotificationsPrimer(1200);
  } else if(route === 'account' || route === 'kyc'){
    jobs.push(loadKycStatus(force));
    queueNotificationsPrimer(1400);
  } else if(route === 'invest'){
    jobs.push(refreshWalletSummary(force));
    jobs.push(String(state.tradeMode || 'demo').toLowerCase() === 'real' ? refreshRealPortfolio(force) : refreshPortfolio({ force, mode:'demo' }));
  }

  await Promise.allSettled(jobs).catch(()=>{});
}

function queueRouteWarm(force=false, delay=30){
  try{ if(state.__routeWarmTimer) clearTimeout(state.__routeWarmTimer); }catch(e){}
  state.__routeWarmTimer = setTimeout(()=>{ warmRouteData(force).catch(()=>{}); }, delay);
}

function notificationsPage(){
  if(!state.notificationsFeed) refreshNotificationsData().then(()=>{ markNotificationsSeen(); render(); }).catch(()=>{});
  const active = state.__notificationsTab || 'all';
  const seenAt = notificationSeenAt();
  const items = buildNotificationsFeed();
  if(items.length) markNotificationsSeen();
  const unread = items.reduce((acc, it)=> acc + (it.kind==='support' ? Math.max(0, Number(it.unread_count || 0)) : ((Number(it.ts||0) > seenAt) ? 1 : 0)), 0);
  const tabs = [
    ['all', tr('All updates','كل التحديثات','Все обновления')],
    ['support', notificationKindLabel('support')],
    ['funding', tr('Funding','التمويل','Финансы')],
    ['system', tr('System','النظام','Система')]
  ];
  const filtered = items.filter(it=>{
    if(active==='support') return it.kind==='support';
    if(active==='funding') return it.kind==='deposit' || it.kind==='withdrawal';
    if(active==='system') return it.kind==='news' || it.kind==='kyc';
    return true;
  });
  const filterTabs = tabs.map(([key,label])=>h('button',{class:'btn' + (active===key ? ' primary' : ' outline'), onclick:()=>{ state.__notificationsTab = key; render(); }}, label));
  const hero = compactOpsHero({
    title: tr('Notifications center','مركز التنبيهات','Центр уведомлений'),
    subtitle: tr('One clean feed for support replies, funding progress, verification changes, and platform updates.', 'موجز نظيف لردود الدعم وتحديثات التمويل وتغييرات التحقق وتحديثات المنصة.', 'Единая компактная лента для ответов поддержки, хода финансирования, изменений верификации и обновлений платформы.') + (unread>0 ? (' • ' + tr('Unread items:','عناصر غير مقروءة:','Непрочитанные элементы:') + ' ' + unread) : ''),
    tabs: filterTabs,
    actions:[
      h('button',{class:'btn outline', onclick:()=>{ location.hash = routeBackTarget('#/home'); }}, tr('Back','رجوع','Назад','वापस')),
      h('button',{class:'btn primary', onclick:()=>{ markNotificationsSeen(); render(); }}, tr('Mark seen','تعليم كمقروء','Отметить как просмотренное')),
      h('button',{class:'btn outline', onclick:async()=>{ await refreshNotificationsData(true); markNotificationsSeen(); render(); }}, state.t('common.refresh'))
    ],
    stats:[
      miniStatCard(tr('Total items','إجمالي العناصر','Всего элементов'), String(items.length), tr('Combined client notifications','موجز تنبيهات العميل الموحّد','Объединённая лента клиентских уведомлений')),
      miniStatCard(tr('Unread','غير مقروء','Непрочитано'), String(unread), tr('Support replies and fresh operational updates','ردود الدعم والتحديثات التشغيلية الجديدة','Ответы поддержки и свежие обновления'), unread>0 ? 'warn' : 'good')
    ]
  });
  const list = filtered.length ? h('div',{class:'notif-list-compact'}, ...filtered.map(it=>{
    const itemUnread = it.kind==='support' ? Math.max(0, Number(it.unread_count || 0)) > 0 : (Number(it.ts || 0) > seenAt);
    return h('div',{class:'card notif-card' + (itemUnread ? ' unread' : '')},
      h('div',{class:'notif-row'},
        h('div',{class:'notif-icon'}, notificationKindIcon(it.kind)),
        h('div',{class:'notif-main'},
          h('div',{class:'notif-head'},
            h('div',{class:'notif-title'}, String(it.title || notificationKindLabel(it.kind))),
            h('div',{class:'row wrap', style:'gap:8px; justify-content:flex-end'},
              it.pinned ? h('span',{class:'pill ok'}, tr('Pinned','مثبت','Закреплено')) : h('span',{}),
              itemUnread ? h('span',{class:'pill warn'}, it.kind==='support' ? (tr('Unread','غير مقروء','Непрочитано') + ' ' + Math.max(0, Number(it.unread_count || 0))) : tr('New','جديد','Новое')) : h('span',{class:'pill'}, tr('Seen','تمت القراءة','Просмотрено')),
              it.status ? h('span',{class:'pill ' + notificationStatusTone(it.status)}, String(it.status).replace(/_/g,' ')) : h('span',{})
            )
          ),
          h('div',{class:'muted small notif-meta'}, String(it.meta || '')),
          h('div',{class:'notif-body'}, String(it.body || tr('Open this item to review the latest details.','افتح هذا العنصر لمراجعة آخر التفاصيل.','Откройте элемент, чтобы просмотреть последние детали.'))),
          h('div',{class:'row wrap mt-2', style:'gap:10px'},
            h('button',{class:'btn primary', onclick:()=>{ if(it.kind==='news') markNewsSeen(); location.hash = it.href || '#/home'; }}, tr('Open','فتح','Открыть')),
            (it.kind==='support' && it.unread_count>0) ? h('button',{class:'btn outline', onclick:()=>{ location.hash = it.href || '#/support'; }}, tr('Reply now','الرد الآن','Ответить')) : h('span',{})
          )
        )
      )
    );
  })) : h('div',{class:'card empty'}, tr('No notifications match this view right now.','لا توجد تنبيهات مطابقة لهذا العرض الآن.','Сейчас нет уведомлений для этого вида.'));
  return h('div',{}, topBar(), hero, list, bottomNav());
}

function newsPage(){
  if (!state.newsFeed) refreshNewsFeed().then(render).catch(()=>{});
  const items = Array.isArray(state.newsFeed) ? state.newsFeed : [];
  if (state.newsConfig && state.newsConfig.enabled === false){
    return h('div',{}, topBar(), pageHero({eyebrow: tr('Platform updates','تحديثات المنصة','Обновления платформы'), title: tr('News center disabled','مركز الأخبار متوقف','Центр новостей отключён'), subtitle: tr('The administrator has temporarily hidden the client news center.','قام الأدمن بإخفاء مركز الأخبار مؤقتًا.','Администратор временно скрыл центр новостей для клиентов.'), actions:[h('button',{class:'btn outline', onclick:()=>location.hash=routeBackTarget('#/home')}, tr('Back','رجوع','Назад'))]}), h('div',{class:'card empty'}, tr('No news is available right now.','لا توجد أخبار متاحة الآن.','Сейчас новости недоступны.')), bottomNav());
  }
  const unread = newsUnreadCount();
  const hash = String(location.hash || '');
  const idMatch = hash.match(/[?&]id=(\d+)/);
  const activeId = idMatch ? parseInt(idMatch[1],10) : 0;
  const activeItem = activeId ? (items.find(it=>Number(it?.id || 0) === activeId) || null) : null;
  const hero = pageHero({
    eyebrow: tr('Platform updates','تحديثات المنصة','Обновления платформы'),
    title: tr('News & announcements','الأخبار والتنبيهات','Новости и объявления'),
    subtitle: tr('See the latest product updates, maintenance notes, and client-facing announcements in one feed.', 'شاهد آخر تحديثات المنصة والتنبيهات وملاحظات الصيانة داخل موجز واحد.', 'Следите за обновлениями продукта, заметками о техобслуживании и объявлениями для клиентов в единой ленте.') + (unread>0 ? (' • ' + tr('New items:','عناصر جديدة:','Новых элементов:') + ' ' + unread) : ''),
    actions:[
      activeItem ? h('button',{class:'btn outline', onclick:()=>{ location.hash='#/notifications'; }}, tr('Back to notifications','العودة للتنبيهات','Назад к уведомлениям')) : h('button',{class:'btn outline', onclick:()=>location.hash=routeBackTarget('#/home')}, tr('Back','رجوع','Назад')),
      h('button',{class:'btn primary', onclick:async()=>{await refreshNewsFeed(true); render();}}, state.t('common.refresh')),
      h('button',{class:'btn outline', onclick:()=>location.hash='#/support'}, state.t('support.title'))
    ]
  });
  const detailCard = activeItem ? h('div',{class:'card news-detail-card selected-news-card'},
    activeItem.image_url ? h('div',{class:'news-detail-media-wrap'}, h('img',{class:'news-detail-media', src:String(activeItem.image_url), alt:String(activeItem.title || 'News')})) : null,
    h('div',{class:'split', style:'align-items:flex-start; gap:14px'},
      h('div',{},
        h('div',{class:'h2', style:'margin:0 0 6px'}, String(activeItem.title||tr('Update','تحديث','Обновление'))),
        h('div',{class:'muted small'}, [String(activeItem.source_label || tr('Platform updates','تحديثات المنصة','Обновления платформы')), uiDateText(activeItem.published_at||activeItem.updated_at||activeItem.created_at||0)].filter(Boolean).join(' • '))
      ),
      Number(activeItem.pinned||0)===1 ? h('span',{class:'pill ok'}, tr('Pinned','مثبت','Закреплено')) : h('span',{class:'pill'}, tr('News','خبر','Новость'))
    ),
    h('div',{class:'admin-note news-detail-body', style:'margin-top:14px; white-space:pre-wrap;'}, String(activeItem.body||'')),
    h('div',{class:'row wrap mt-2', style:'gap:10px'},
      activeItem.cta_url ? h('button',{class:'btn primary', onclick:()=>{ location.hash = String(activeItem.cta_url); }}, tr('Open related page','فتح الصفحة المرتبطة','Открыть связанную страницу')) : h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, tr('Open notifications','فتح التنبيهات','Открыть уведомления')),
      h('button',{class:'btn', onclick:()=>{ location.hash = '#/news'; }}, tr('All news','كل الأخبار','Все новости'))
    )
  ) : null;
  const seenAt = uiEpoch(localStorage.getItem('tp_news_seen_at') || 0);
  const list = h('div',{class:'stack news-stack', style:'gap:14px'}, ...(items.length ? items.map(it=>h('button',{class:'card news-list-card' + (Number(it?.id||0)===activeId ? ' active' : ''), type:'button', onclick:()=>{ location.hash = `#/news?id=${encodeURIComponent(String(it?.id||0))}`; }},
    it?.image_url ? h('div',{class:'news-list-media'}, h('img',{src:String(it.image_url), alt:String(it.title || 'News')})) : h('div',{class:'news-list-media news-list-media--placeholder'}, '✦'),
    h('div',{class:'news-list-content'},
      h('div',{class:'split'},
        h('div',{}, h('div',{class:'h2', style:'margin:0 0 6px'}, String(it.title||'Update')), h('div',{class:'muted small'}, [String(it.source_label || tr('Platform updates','تحديثات المنصة','Обновления платформы')), uiDateText(it.published_at||it.updated_at||it.created_at||0)].filter(Boolean).join(' • '))),
        h('div',{class:'row wrap', style:'gap:8px; justify-content:flex-end'},
          Number(it.pinned||0)===1 ? h('span',{class:'pill ok'}, tr('Pinned','مثبت','Закреплено')) : h('span',{}),
          uiEpoch(it.published_at||it.updated_at||it.created_at||0) > seenAt ? h('span',{class:'pill warn'}, tr('New','جديد','Новое')) : h('span',{class:'pill'}, tr('Seen','تمت القراءة','Просмотрено'))
        )
      ),
      h('div',{class:'admin-note news-list-body', style:'margin-top:12px'}, notificationPreviewBody(String(it.excerpt || it.body || ''), 220))
    )
  )) : [h('div',{class:'card empty'}, tr('No announcements have been published yet.','لا توجد إعلانات منشورة حتى الآن.','Пока нет опубликованных объявлений.'))]));
  if (items.length) markNewsSeen();
  return h('div',{}, topBar(), hero, newsTickerStrip(8), detailCard, list, bottomNav());
}



function supportPage(){
  if (!state.supportTickets) refreshSupportTickets().then(render).catch(()=>{});
  const hash = String(location.hash || '');
  const idMatch = hash.match(/ticket=(\d+)/);
  const activeId = idMatch ? parseInt(idMatch[1],10) : 0;
  if (activeId && (!state.supportCurrent || Number(state.supportCurrent.ticket?.id||0)!==activeId)) {
    loadSupportTicket(activeId).then(()=>refreshSupportTickets(true)).then(render).catch(()=>{});
  }
  const tickets = Array.isArray(state.supportTickets) ? state.supportTickets : [];
  const current = state.supportCurrent || null;
  const unreadTotal = supportUnreadCount();
  const openTickets = tickets.filter(it=>!['closed','resolved','done'].includes(String(it?.status || '').toLowerCase())).length;
  const resolvedTickets = tickets.filter(it=>['closed','resolved','done'].includes(String(it?.status || '').toLowerCase())).length;
  const reasonRef = {value:'general'};
  const subjectRef = {value:''};
  const messageRef = {value:''};
  const replyRef = {value:''};

  async function createTicket(){
    const subject = String(subjectRef.value||'').trim();
    const message = String(messageRef.value||'').trim();
    if(!message){ toast(tr('Write the first support message.','اكتب أول رسالة للدعم.','Напишите первое сообщение в поддержку.')); return; }
    const r = await api('/support/create.php',{method:'POST', body:{reason_code:reasonRef.value, subject, message, lang:state.lang}});
    await refreshSupportTickets(true);
    if(r && r.ticket_id){
      await loadSupportTicket(r.ticket_id);
      await refreshSupportTickets(true);
      location.hash = `#/support?ticket=${r.ticket_id}`;
    }
    render();
    toast(tr('Support ticket created.','تم إنشاء تذكرة الدعم.','Тикет поддержки создан.'));
  }

  async function sendReply(){
    if(!current?.ticket?.id) return;
    const message = String(replyRef.value||'').trim();
    if(!message){ toast(tr('Write a reply first.','اكتب الرد أولاً.','Сначала напишите ответ.')); return; }
    await api('/support/reply.php',{method:'POST', body:{ticket_id:current.ticket.id, message}});
    await Promise.allSettled([refreshSupportTickets(true), loadSupportTicket(current.ticket.id)]);
    render();
    toast(tr('Reply sent.','تم إرسال الرد.','Ответ отправлен.'));
  }

  const hero = compactOpsHero({
    title: state.t('support.title'),
    subtitle: tr('Create a ticket, follow replies from operations, and keep the whole conversation inside the platform.', 'أنشئ تذكرة دعم وتابع ردود فريق التشغيل داخل المنصة نفسها.', 'Создавайте тикеты и отслеживайте ответы команды прямо внутри платформы.') + (unreadTotal>0 ? (' • ' + tr('Unread replies:','ردود غير مقروءة:','Непрочитанные ответы:') + ' ' + unreadTotal) : ''),
    actions:[
      h('button',{class:'btn outline', onclick:()=>{ location.hash = routeBackTarget('#/home'); }}, tr('Back','رجوع','Назад','वापस')),
      h('button',{class:'btn primary', onclick:createTicket}, tr('Create ticket','إنشاء تذكرة','Создать тикет')),
      h('button',{class:'btn outline', onclick:()=>location.hash='#/notifications'}, tr('Notifications','التنبيهات','Уведомления')),
      h('button',{class:'btn outline', onclick:()=>location.hash='#/news'}, tr('Announcements','الإعلانات','Объявления'))
    ],
    stats:[
      miniStatCard(tr('Open tickets','تذاكر مفتوحة','Открытые тикеты'), String(openTickets), tr('Conversations still waiting for closure','محادثات ما زالت قيد المتابعة','Диалоги, которые ещё не закрыты')),
      miniStatCard(tr('Unread replies','ردود غير مقروءة','Непрочитанные ответы'), String(unreadTotal), resolvedTickets>0 ? (tr('Resolved tickets:','التذاكر المغلقة:','Решённых тикетов:') + ' ' + resolvedTickets) : tr('Support inbox is up to date','صندوق الدعم محدث','Поддержка без новых ответов'), unreadTotal>0 ? 'warn' : 'good')
    ]
  });

  const createCard = h('div',{class:'card support-compose-card'},
    h('div',{class:'support-block-head'},
      h('div',{},
        h('div',{class:'h2', style:'margin:0 0 6px'}, tr('New support ticket','تذكرة دعم جديدة','Новый тикет поддержки','नया सहायता टिकट')),
        h('div',{class:'muted small'}, tr('Keep it concise and add the key operational details that the team needs first.','اكتب ملخصًا واضحًا وأضف أهم التفاصيل التشغيلية التي يحتاجها الفريق أولاً.','Кратко опишите проблему и добавьте ключевые детали для команды.'))
      ),
      h('button',{class:'btn outline', onclick:async()=>{await refreshSupportTickets(true); render();}}, state.t('common.refresh'))
    ),
    h('div',{class:'grid support-form-grid', style:'gap:12px'},
      h('label',{class:'stack'},
        h('span',{class:'muted small'}, tr('Reason','السبب','Причина','कारण')),
        h('select',{class:'input', onchange:e=>reasonRef.value=e.target.value},
          h('option',{value:'general'}, tr('General help','مساعدة عامة','Общий вопрос','सामान्य सहायता')),
          h('option',{value:'deposit'}, tr('Deposit issue','مشكلة إيداع','Проблема с пополнением','जमा समस्या')),
          h('option',{value:'withdrawal'}, tr('Withdrawal issue','مشكلة سحب','Проблема с выводом','निकासी समस्या')),
          h('option',{value:'verification'}, tr('Verification issue','مشكلة تحقق','Проблема с верификацией','सत्यापन समस्या')),
          h('option',{value:'trade'}, tr('Trading issue','مشكلة تداول','Проблема с торговлей','ट्रेडिंग समस्या'))
        )
      ),
      h('label',{class:'stack'},
        h('span',{class:'muted small'}, tr('Subject','العنوان','Тема','الموضوع')),
        h('input',{class:'input', name:'support_subject', placeholder:tr('Short summary','ملخص قصير','Короткое описание','संक्षिप्त सारांश'), oninput:e=>subjectRef.value=e.target.value})
      )
    ),
    h('label',{class:'stack', style:'margin-top:12px'},
      h('span',{class:'muted small'}, tr('Message','الرسالة','Сообщение','الرسالة')),
      h('textarea',{rows:5, class:'input support-compose', name:'support_message', placeholder:tr('Describe the issue and add any useful detail for the operations team.','اشرح المشكلة وأضف أي تفاصيل مهمة لفريق التشغيل.','Опишите проблему и добавьте детали для команды.','समस्या बताइए और टीम के लिए जरूरी विवरण जोड़िए।'), oninput:e=>messageRef.value=e.target.value})
    ),
    h('div',{class:'row wrap mt-2', style:'gap:10px'},
      h('button',{class:'btn primary', onclick:createTicket}, tr('Submit ticket','إرسال التذكرة','Отправить тикет','टिकट भेजें'))
    )
  );

  const ticketButtons = tickets.map(it => {
    const unread = Math.max(0, Number((it && it.unread_count) || 0));
    const lastSender = String((it && it.last_message_sender) || '');
    return h('button',{
      class:'card support-ticket-card' + (Number(it.id)===activeId ? ' active' : ''),
      onclick:()=>{ location.hash=`#/support?ticket=${it.id}`; loadSupportTicket(it.id).then(()=>refreshSupportTickets(true)).then(render).catch(()=>{}); }
    },
      h('div',{class:'split'},
        h('strong',{}, String(it.subject||it.reason_code||('Ticket #'+it.id))),
        h('div',{class:'row wrap', style:'gap:6px; justify-content:flex-end'},
          unread > 0 ? h('span',{class:'pill ok'}, tr('New','جديد','Новое') + ' ' + unread) : h('span',{}),
          supportStatusPill(it.status)
        )
      ),
      h('div',{class:'muted small mt-1'}, uiDateText(it.updated_at||it.created_at||0)),
      h('div',{class:'muted small mt-1'}, (lastSender === 'admin' ? tr('Support team:','فريق الدعم:','Команда:') : (lastSender === 'user' ? tr('You:','أنت:','Вы:') : '')) + ' ' + String(it.last_message_preview||''))
    );
  });

  const list = h('div',{class:'card support-list-card'},
    h('div',{class:'support-block-head'},
      h('div',{},
        h('div',{class:'h2', style:'margin:0'}, tr('My tickets','تذاكري','Мои тикеты')),
        h('div',{class:'muted small'}, tr('Open the latest conversation or review older resolved tickets.','افتح آخر محادثة أو راجع التذاكر السابقة.','Откройте последнее обращение или просмотрите прошлые тикеты.'))
      ),
      h('span',{class:'pill'}, String(tickets.length))
    ),
    tickets.length
      ? h('div',{class:'support-ticket-list'}, ...ticketButtons)
      : h('div',{class:'empty', style:'margin-top:12px'}, tr('No support tickets yet.','لا توجد تذاكر دعم حتى الآن.','Пока нет тикетов поддержки.'))
  );

  const messageCards = current?.messages?.map(msg => h('div',{
      class:'card support-message-card ' + (String(msg.sender)==='admin' ? 'is-admin' : 'is-user')
    },
    h('div',{class:'split'},
      h('strong',{}, String(msg.sender)==='admin' ? tr('Support team','فريق الدعم','Команда поддержки') : tr('You','أنت','Вы')),
      h('span',{class:'muted small'}, uiDateText(msg.created_at||0))
    ),
    h('div',{class:'admin-note', style:'margin-top:8px'}, String(msg.content||''))
  )) || [];

  const detail = h('div',{class:'card support-detail-card'},
    h('div',{class:'support-block-head'},
      h('div',{},
        h('div',{class:'h2', style:'margin:0'}, current?.ticket ? `#${current.ticket.id} — ${String(current.ticket.subject||current.ticket.reason_code||'Support')}` : tr('Ticket details','تفاصيل التذكرة','Детали тикета')),
        h('div',{class:'muted small'}, current?.ticket ? uiDateText(current.ticket.created_at||0) : tr('Select a ticket to read the conversation.','اختر تذكرة لقراءة المحادثة.','Выберите тикет, чтобы открыть переписку.'))
      ),
      current?.ticket ? supportStatusPill(current.ticket.status) : h('span',{})
    ),
    current?.ticket
      ? h('div',{class:'stack', style:'gap:10px; margin-top:12px'},
          current.ticket.admin_note ? h('div',{class:'notice'}, h('strong',{}, tr('Operations note','ملاحظة فريق التشغيل','Заметка команды')), h('div',{class:'mt-1'}, String(current.ticket.admin_note||''))) : h('span',{}),
          h('div',{class:'support-message-list'}, ...messageCards),
          h('label',{class:'stack'},
            h('span',{class:'muted small'}, tr('Reply','الرد','Ответ','الرد')),
            h('textarea',{rows:5, class:'input support-compose reply-compose', placeholder:tr('Write your reply to the operations team.','اكتب ردك لفريق التشغيل.','Напишите ответ команде.','टीम को अपना उत्तर लिखें।'), oninput:e=>replyRef.value=e.target.value})
          ),
          h('div',{class:'row wrap', style:'gap:10px'},
            h('button',{class:'btn primary', onclick:sendReply}, tr('Send reply','إرسال الرد','Отправить ответ'))
          )
        )
      : h('div',{class:'empty', style:'margin-top:12px'}, tr('Select a ticket from the list or create a new one above.','اختر تذكرة من القائمة أو أنشئ تذكرة جديدة بالأعلى.','Выберите тикет из списка или создайте новый выше.'))
  );

  return h('div',{}, topBar(), hero, createCard, h('div',{class:'support-main-grid-compact'}, list, detail), bottomNav());
}

function uiToastTopPx(){
  try{
    const candidates = [
      '.vp-shell-header-card',
      '.vp-shell-header',
      '.vp-topbar-stack',
      '.vp-topbar',
      '.vp-topbar-utility',
      '.mb-topbar',
      '.trade-head',
      '.trade-topbar',
      '.mb-trade-top',
      '.vp-trade-terminal-head',
      '.vp-trade-compact-head'
    ];
    let best = 16;
    for(const sel of candidates){
      document.querySelectorAll(sel).forEach(node=>{
        try{
          const rect = node.getBoundingClientRect();
          if(!rect) return;
          const isVisible = rect.bottom > 0 && rect.height > 0 && rect.top < 140;
          if(isVisible) best = Math.max(best, Math.round(rect.bottom + 10));
        }catch(_e){}
      });
    }
    return best;
  }catch(e){}
  return 16;
}

function toast(text){
  const stack = document.querySelectorAll('.vp-top-toast,.vp-live-toast').length;
  const top = uiToastTopPx() + (stack * 10);
  const el = h('div',{class:'card vp-top-toast', style:`position:fixed;left:12px;right:12px;top:${top}px;z-index:4310;padding:14px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(8,20,50,.98),rgba(5,12,32,.98));border:1px solid rgba(125,211,252,.16);box-shadow:0 20px 56px rgba(2,8,24,.52);`}, text);
  document.body.appendChild(el);
  requestAnimationFrame(()=>{ try{ el.classList.add('is-visible'); }catch(e){} });
  setTimeout(()=>{ try{ el.classList.remove('is-visible'); el.classList.add('is-leaving'); }catch(e){} setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 180); }, 2400);
}

function showLiveNotificationToast(item){
  if(!item || !document || document.hidden) return;
  const title = String(item.title || tr('New update','تحديث جديد','Новое обновление'));
  const body = String(item.body || item.meta || '').trim();
  const href = String(item.href || '');
  const tone = item.kind === 'support' ? 'support' : (item.kind === 'news' ? 'news' : 'system');
  const el = h('button',{
      class:'vp-live-toast vp-live-toast--' + tone,
      type:'button'
    },
    h('div',{class:'vp-live-toast__icon'}, notificationKindIcon(item.kind || 'system')),
    h('div',{class:'vp-live-toast__content'},
      h('div',{class:'vp-live-toast__title'}, title),
      body ? h('div',{class:'vp-live-toast__body'}, notificationPreviewBody(body, 120)) : null
    ),
    h('div',{class:'vp-live-toast__meta'},
      h('span',{class:'vp-live-toast__pill'}, tr('Live','لحظي','Онлайн')),
      h('span',{class:'vp-live-toast__close'}, '×')
    )
  );
  const close = ()=>{ try{ el.classList.add('is-leaving'); }catch(e){} setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 180); };
  el.addEventListener('click', ()=>{
    if(href){
      location.hash = href;
      try{ render(); }catch(e){}
    }
    close();
  }, {once:true});
  const stack = document.querySelectorAll('.vp-live-toast,.vp-top-toast').length;
  try{ el.style.top = `${uiToastTopPx() + (stack * 10)}px`; }catch(e){}
  document.body.appendChild(el);
  requestAnimationFrame(()=>{ try{ el.classList.add('is-visible'); }catch(e){} });
  setTimeout(close, 3600);
}

function liveNotificationKey(item){
  const id = String(item?.id || '');
  const ts = Number(item?.ts || 0) || 0;
  const unread = Number(item?.unread_count || 0) || 0;
  return `${id}:${ts}:${unread}`;
}

async function startLiveNotificationPulse(){
  if(window.__vpLiveNotificationPulseStarted) return;
  window.__vpLiveNotificationPulseStarted = true;
  let primed = false;
  let timer = null;
  let lastUnread = Number(state.__notificationsUnreadCached || 0) || 0;
  const tick = async(force=false)=>{
    if(document.hidden) return;
    const currentRoute = routeNameFromHash(location.hash || '#/home');
    if(currentRoute === 'trade') return;
    try{
      const items = await refreshNotificationsData(!!force);
      const nextKeys = new Set((Array.isArray(items) ? items : []).map(liveNotificationKey));
      if(primed){
        (Array.isArray(items) ? items : []).forEach(item=>{
          const shouldToast = item && nextKeys.has(liveNotificationKey(item)) && !(state.__vpLiveNotificationKeys instanceof Set && state.__vpLiveNotificationKeys.has(liveNotificationKey(item))) && ((item.kind === 'support' && Number(item.unread_count || 0) > 0) || !!item.is_unread);
          if(shouldToast) showLiveNotificationToast(item);
        });
      }
      state.__vpLiveNotificationKeys = nextKeys;
      primed = true;
      const route = routeNameFromHash(location.hash || '#/home');
      const unreadNow = Number(state.__notificationsUnreadCached || 0) || 0;
      if(route === 'notifications' || route === 'support' || route === 'news') {
        try{ render(); }catch(e){}
      } else if(route !== 'trade' && unreadNow !== lastUnread) {
        try{ requestRender(); }catch(e){}
      }
      lastUnread = unreadNow;
    }catch(e){}
  };
  setTimeout(()=>{ tick(false).catch(()=>{}); }, 2600);
  timer = window.setInterval(()=>{ tick(true).catch(()=>{}); }, 30000);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) tick(false).catch(()=>{}); }, {passive:true});
  window.addEventListener('beforeunload', ()=>{ if(timer){ clearInterval(timer); timer = null; } }, {once:true});
}

// Spacer so content isn't hidden behind bottom navigation (especially on iPhone safe-area)
function bottomNav(){
  const mobile = (window.innerWidth || 0) <= 640;
  return h('div',{style:`height:${mobile ? 118 : 92}px;`});
}

function nav(){
  return h('div',{class:'nav'},
    h('div',{class:'wrap'},
      navLink('#/home', state.t('nav.home')),
      navLink('#/portfolio', state.t('nav.portfolio') || tr('Portfolio','المحفظة','Портфель')),
      navLink('#/trade', state.t('nav.trade')),
      navLink('#/invest', state.t('nav.earn') || state.t('nav.invest')),
      navLink('#/wallet', state.t('nav.assets') || tr('Assets','الأصول','Активы'))
    )
  );
}

function route(){
  const hash = location.hash || '#/home';
  if(hash.startsWith('#/wallet')) return walletPage();
  if(hash.startsWith('#/kyc')) return kycPage();
  if(hash.startsWith('#/support')) return supportPage();
  if(hash.startsWith('#/notifications')) return notificationsPage();
  if(hash.startsWith('#/news')) return newsPage();
  if(hash.startsWith('#/markets')) {
    try{ state.__vpTradeSymbolsDrawerOpen = true; }catch(e){}
    return tradePage();
  }
  if(hash.startsWith('#/portfolio')) return portfolioPage();
  if(hash.startsWith('#/trade')) return tradePage();
  if(hash.startsWith('#/invest')) return investPage();
  if(hash.startsWith('#/account')) return accountPage();
  return homePage();
}


function __vpCaptureRenderScrollState(hash, rootEl){
  const stateMap = { hash: String(hash || ''), sameRoute: false, windowY: 0, appY: 0, keyed: {} };
  try{
    const activeHash = String(hash || location.hash || '#/home');
    const currentHash = String(rootEl?.dataset?.renderHash || '');
    stateMap.sameRoute = !!currentHash && currentHash === activeHash;
    if(!stateMap.sameRoute) return stateMap;
    stateMap.windowY = Math.max(
      Number(window.pageYOffset || 0),
      Number(document.documentElement?.scrollTop || 0),
      Number(document.body?.scrollTop || 0)
    ) || 0;
    stateMap.appY = Number(rootEl?.scrollTop || 0) || 0;
    const keyedNodes = Array.from(document.querySelectorAll('[data-scroll-key]'));
    keyedNodes.forEach((node)=>{
      try{
        const key = String(node.getAttribute('data-scroll-key') || '').trim();
        if(!key) return;
        stateMap.keyed[key] = { top: Number(node.scrollTop || 0) || 0, left: Number(node.scrollLeft || 0) || 0 };
      }catch(e){}
    });
  }catch(e){}
  return stateMap;
}

function __vpRestoreRenderScrollState(snapshot, rootEl){
  if(!snapshot || !snapshot.sameRoute) return;
  const restore = ()=>{
    try{
      const y = Number(snapshot.windowY || 0) || 0;
      window.scrollTo(0, y);
      if(document.documentElement) document.documentElement.scrollTop = y;
      if(document.body) document.body.scrollTop = y;
    }catch(e){}
    try{ if(rootEl) rootEl.scrollTop = Number(snapshot.appY || 0) || 0; }catch(e){}
    try{
      const keyed = snapshot.keyed || {};
      Object.keys(keyed).forEach((key)=>{
        try{
          const node = document.querySelector('[data-scroll-key="' + String(key).replace(/"/g, '\\"') + '"]');
          if(!node) return;
          node.scrollTop = Number(keyed[key]?.top || 0) || 0;
          node.scrollLeft = Number(keyed[key]?.left || 0) || 0;
        }catch(e){}
      });
    }catch(e){}
  };
  try{ requestAnimationFrame(restore); }catch(e){ setTimeout(restore, 0); }
  setTimeout(restore, 32);
}

function render(force=false){
  const hash = location.hash || '#/home';
  const root = document.getElementById('app');
  const __vpScrollSnapshot = __vpCaptureRenderScrollState(hash, root);
  const now = Date.now();
  const minGap = hash.startsWith('#/trade') ? 340 : 180;
  const settleUntil = Number(state.__routeSettledUntil || 0) || 0;
  if(!force && root && root.dataset && root.dataset.renderHash === hash){
    const lastAt = Number(root.dataset.renderAt || 0);
    if((settleUntil && now < settleUntil) || (lastAt && (now - lastAt) < minGap)) return;
  }
  // Run cleanup from previous route/view to prevent background polling.
  while(__cleanup.length){
    try { (__cleanup.pop())(); } catch(e) {}
  }
  root.innerHTML='';
  let pageNode = null;
  try{
    pageNode = route();
  }catch(e){
    try{ console.error('VertexPluse route render failed:', e); }catch(_e){}
    pageNode = h('div',{class:'card page-runtime-fallback'},
      h('div',{class:'h1'}, tr('Screen temporarily unavailable','هذه الشاشة غير متاحة مؤقتاً','Экран временно недоступен')),
      h('div',{class:'muted small mt-2'}, tr('A page-level runtime issue happened. You can return home and continue using the platform while this section reloads.','حدثت مشكلة تشغيل في هذه الصفحة. يمكنك الرجوع للرئيسية ومتابعة استخدام المنصة بينما يُعاد تحميل هذا القسم.','Произошла ошибка выполнения на странице. Вы можете вернуться на главную и продолжить работу, пока раздел перезагружается.')),
      h('div',{class:'muted small mt-2'}, `Error: ${e?.message || 'render_failed'}`),
      h('div',{class:'row mt-3'},
        h('button',{class:'btn primary', onclick:()=>{ location.hash = '#/home'; }}, tr('Go home','العودة للرئيسية','На главную')),
        h('button',{class:'btn outline', onclick:()=>{ try{ render(); }catch(_err){} }}, tr('Retry','إعادة المحاولة','Повторить'))
      )
    );
  }
  root.appendChild(pageNode);
  root.appendChild(nav());
  try{
    root.dataset.renderHash = hash;
    root.dataset.renderAt = String(now);
  }catch(e){}

  // Theme
  applyTheme();
  try{ document.body.dataset.route = routeNameFromHash(hash); }catch(e){}
  try{ mountLogo('brandMark'); }catch(e){}
  try{ __vpRestoreRenderScrollState(__vpScrollSnapshot, root); }catch(e){}

  // Telegram UI polish
  if(isTg()){
    try{
      tg().expand();
    } catch{}
  }
}

async function boot(){
  applyTheme();
  await loadI18n();
  try{ vpRestoreRememberedQuotes(); }catch(e){}
  const root = document.getElementById('app');
  root.innerHTML='';
  root.appendChild(h('div',{class:'card'},
    h('div',{class:'h2'}, state.t('app.loading')),
    h('div',{class:'muted small mt-2'}, state.t('app.loading_hint'))
  ));
  root.appendChild(nav());

  const withTimeout = (p, ms, label='timeout')=> Promise.race([
    p,
    new Promise((_,rej)=> setTimeout(()=> rej(new Error(label)), ms))
  ]);

  try{
    await withTimeout(ensureAuth(), 8000, 'auth timeout');

    const initialHash = location.hash || '#/home';
    const initialRoute = routeNameFromHash(initialHash);
    const needWalletEarly = ['home','trade','wallet','portfolio','account','invest'].includes(initialRoute);
    const needOnboardingEarly = ['home','wallet','account','kyc','invest'].includes(initialRoute);
    const essentialJobs = [
      withTimeout(refreshFeatureFlags(), 3200, 'feature flags timeout')
    ];
    if(needWalletEarly){
      essentialJobs.push(withTimeout(refreshWalletSummary(), 3800, 'wallet timeout'));
    }
    if(needOnboardingEarly){
      essentialJobs.push(withTimeout(refreshOnboardingStatus(), 4200, 'onboarding timeout'));
    }

    state.__routeSettledUntil = Date.now() + 900;
    requestRender(false);
    Promise.allSettled(essentialJobs).then(()=>{ try{ if(routeNameFromHash(location.hash || '#/home') !== 'trade') requestRender(false); }catch(e){} });

    scheduleIdleTask(()=>{
      try{
        const prefType = initialRoute === 'trade' ? ((getTradeRouteSnapshot()?.type) || state.selectedAssetType || 'crypto') : (state.selectedAssetType || 'crypto');
        primePlatformMarketUniverse({ route: initialRoute, preferredType: prefType, force:false }).catch(()=>{});
      }catch(e){}
    }, 260);
    scheduleIdleTask(()=>{ warmRouteData(false, initialHash).catch(()=>{}).finally(()=>{ try{ if(routeNameFromHash(location.hash || '#/home') !== 'trade') requestRender(); }catch(e){} }); }, 320);

    try{ QuoteCache.start(); }catch(e){}
    scheduleIdleTask(()=>{ startLiveNotificationPulse().catch(()=>{}); }, 1800);
    scheduleIdleTask(()=>{ queueNotificationsPrimer(900); }, 2200);
  } catch(e){
    const root = document.getElementById('app');
    root.innerHTML='';
    root.appendChild(h('div',{class:'card'},
      h('div',{class:'h1'}, 'Platform setup required'),
      h('div',{class:'muted small mt-2'}, 'Your server must expose the PHP API and database configuration correctly.'),
      h('div',{class:'muted small mt-2'}, `Error: ${e.message}`),
      h('div',{class:'row mt-3'},
        h('a',{class:'btn primary', href:'./api/ping.php', target:'_blank'}, 'Test API'),
        h('button',{class:'btn', onclick:()=>boot()}, 'Retry')
      )
    ));
    root.appendChild(nav());
  }
}

state.__vpCurrentHash = location.hash || '#/home';
window.addEventListener('hashchange', ()=>{
  const nextHash = location.hash || '#/home';
  const prevHash = String(state.__vpCurrentHash || '#/home');
  const prevRoute = routeNameFromHash(prevHash);
  const nextRoute = routeNameFromHash(nextHash);
  try{
    state.__vpPrevHash = prevHash;
    state.__vpCurrentHash = nextHash;
    state.__routeSettledUntil = Date.now() + (prevRoute === nextRoute ? 520 : 850);
  }catch(e){}
  if(prevRoute !== nextRoute){
    try{
      const resetScroll = ()=>{
        try{ window.scrollTo({top:0, left:0, behavior:'instant'}); }catch(_e){ try{ window.scrollTo(0,0); }catch(__e){} }
        try{ document.documentElement.scrollTop = 0; }catch(_e){}
        try{ document.body.scrollTop = 0; }catch(_e){}
        try{ const appRoot = document.getElementById('app'); if(appRoot) appRoot.scrollTop = 0; }catch(_e){}
      };
      requestAnimationFrame(resetScroll);
      setTimeout(resetScroll, 24);
    }catch(e){}
  }
  try{ if(nextRoute !== 'invest') state.__vpInvestDemoGateShownFor = null; }catch(e){}
  requestRender(prevRoute !== nextRoute);
  queueRouteWarm(false, prevRoute !== nextRoute ? (nextRoute === 'trade' ? 220 : 90) : 420);
});
boot();
