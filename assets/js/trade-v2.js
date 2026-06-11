(function(){
  if(!window.__VP_TRADE_V2) return;

  const API = window.__API_BASE || '/api';
  const HOST_ID = 'vp-trade-v2-root';
  const CHART_SRC = 'https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js';
  const TYPES = [
    { key:'crypto', label:'Crypto', defaultSymbol:'BTCUSDT', markets:['spot','perp'] },
    { key:'forex', label:'Forex', defaultSymbol:'EURUSD', markets:['spot'] },
    { key:'stocks', label:'Stocks', defaultSymbol:'AAPL', markets:['spot'] },
    { key:'commodities', label:'Commodities', defaultSymbol:'XAUUSD', markets:['spot'] },
    { key:'futures', label:'Futures', defaultSymbol:'ES_F', markets:['perp'] },
    { key:'arab', label:'Arab', defaultSymbol:'2222', markets:['spot'] }
  ];
  const TYPE_KEYS = new Set(TYPES.map(t => t.key));

  let root = null;
  let mounted = false;
  let chart = null;
  let candleSeries = null;
  let volumeSeries = null;
  let resizeObserver = null;
  let timers = [];
  let boundRoot = null;
  let runId = 0;
  let activeBusy = false;
  let marketsBusy = false;
  let marketHydrateBusy = false;
  let marketHydrateKey = '';
  let portfolioBusy = false;
  let candlesBusy = false;
  let marketItems = [];
  let positions = [];
  let orders = [];
  let lastQuote = null;
  let lastCandle = null;
  let state = readRoute();

  function $(sel){ return root ? root.querySelector(sel) : null; }
  function $all(sel){ return root ? Array.from(root.querySelectorAll(sel)) : []; }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmt(n, d){
    n = Number(n || 0);
    if(!isFinite(n)) n = 0;
    if(d == null) d = n >= 1000 ? 2 : (n >= 10 ? 4 : 5);
    return n.toLocaleString('en-US', { minimumFractionDigits:d, maximumFractionDigits:d });
  }
  function money(n, d){ return '$' + fmt(n, d); }
  function pct(n){
    n = Number(n || 0);
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function typeDef(key){ return TYPES.find(t => t.key === key) || TYPES[0]; }
  function normType(v){
    v = String(v || '').toLowerCase();
    if(v === 'fx') v = 'forex';
    if(v === 'perpetual') v = 'crypto';
    return TYPE_KEYS.has(v) ? v : 'crypto';
  }
  function defaultMarket(type){
    const def = typeDef(type);
    if(def.markets.includes('perp') && (type === 'futures')) return 'perp';
    return def.markets[0] || 'spot';
  }
  function cleanSymbol(sym){ return String(sym || '').toUpperCase().replace(/^@R@|^@D@/, '').trim(); }
  function readRoute(){
    const hash = String(location.hash || '#/trade');
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const params = new URLSearchParams(query);
    const type = normType(params.get('type') || localStorage.getItem('vp2_type') || localStorage.getItem('marketType') || 'crypto');
    const def = typeDef(type);
    const symbol = cleanSymbol(params.get('symbol') || localStorage.getItem('vp2_symbol_' + type) || localStorage.getItem('marketSymbol') || def.defaultSymbol);
    const marketRaw = String(params.get('market') || localStorage.getItem('vp2_market_' + type) || defaultMarket(type)).toLowerCase();
    const market = def.markets.includes(marketRaw) ? marketRaw : defaultMarket(type);
    const tf = String(params.get('tf') || localStorage.getItem('vp2_tf') || '1m').toLowerCase();
    const mode = String(localStorage.getItem('trade_mode') || 'demo').toLowerCase() === 'real' ? 'real' : 'demo';
    return { type, symbol, market, tf: normalizeTf(tf), mode, search:'' };
  }
  function writeRoute(next){
    localStorage.setItem('vp2_type', next.type);
    localStorage.setItem('vp2_symbol_' + next.type, next.symbol);
    localStorage.setItem('vp2_market_' + next.type, next.market);
    localStorage.setItem('vp2_tf', next.tf);
    localStorage.setItem('marketSymbol', next.symbol);
    localStorage.setItem('marketType', next.type);
    const hash = `#/trade?symbol=${encodeURIComponent(next.symbol)}&type=${encodeURIComponent(next.type)}&market=${encodeURIComponent(next.market)}&tf=${encodeURIComponent(next.tf)}`;
    if(location.hash !== hash) location.hash = hash;
  }
  function normalizeTf(tf){
    const allowed = ['1m','3m','5m','15m','30m','1h','4h','1d'];
    return allowed.includes(tf) ? tf : '1m';
  }
  function tfSeconds(tf){
    return { '1m':60, '3m':180, '5m':300, '15m':900, '30m':1800, '1h':3600, '4h':14400, '1d':86400 }[tf] || 60;
  }
  function pollMs(type){
    if(document.hidden) return 20000;
    if(type === 'crypto') return 2000;
    if(type === 'forex' || type === 'commodities' || type === 'futures') return 4000;
    return 15000;
  }
  function apiUrl(path){
    if(/^https?:\/\//i.test(path)) return path;
    if(path.startsWith('/api/')) return path;
    return API + (path.startsWith('/') ? path : '/' + path);
  }
  async function api(path, opts){
    opts = opts || {};
    const timeoutMs = Number(opts.timeoutMs || 12000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const init = {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: Object.assign({ 'Accept':'application/json' }, opts.headers || {})
    };
    if(opts.body !== undefined){
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    try{
      const res = await fetch(apiUrl(path), init);
      const text = await res.text();
      let data = null;
      try{ data = text ? JSON.parse(text) : null; }catch(e){ data = { ok:false, error:text || 'Bad JSON' }; }
      if(!res.ok || (data && data.ok === false)){
        throw new Error((data && data.error) || ('HTTP ' + res.status));
      }
      return data || {};
    }finally{
      clearTimeout(timer);
    }
  }
  function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  function ensureCharts(){
    if(window.LightweightCharts) return Promise.resolve(true);
    return new Promise(resolve => {
      const existing = document.querySelector('script[data-vp2-chart]');
      if(existing){
        existing.addEventListener('load', () => resolve(!!window.LightweightCharts), { once:true });
        existing.addEventListener('error', () => resolve(false), { once:true });
        return;
      }
      const s = document.createElement('script');
      s.src = CHART_SRC;
      s.defer = true;
      s.dataset.vp2Chart = '1';
      s.onload = () => resolve(!!window.LightweightCharts);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }
  function routeIsTrade(){ return String(location.hash || '').startsWith('#/trade'); }
  function schedule(fn, ms){
    const id = setInterval(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers(){
    timers.forEach(id => { try{ clearInterval(id); }catch(e){} });
    timers = [];
  }
  function cleanup(){
    clearTimers();
    try{
      if(boundRoot) boundRoot.removeEventListener('click', onClick);
    }catch(e){}
    boundRoot = null;
    mounted = false;
    activeBusy = false;
    marketsBusy = false;
    marketHydrateBusy = false;
    marketHydrateKey = '';
    portfolioBusy = false;
    candlesBusy = false;
    try{ if(resizeObserver) resizeObserver.disconnect(); }catch(e){}
    resizeObserver = null;
    try{ if(chart) chart.remove(); }catch(e){}
    chart = null;
    candleSeries = null;
    volumeSeries = null;
  }

  function renderShell(){
    const def = typeDef(state.type);
    root.innerHTML = `
      <div class="vp2-shell">
        <aside class="vp2-side">
          <div class="vp2-brand">V</div>
          <nav class="vp2-nav" aria-label="Main">
            <a href="#/home">Home</a>
            <a href="#/portfolio">Portfolio</a>
            <a class="active" href="#/trade">Trade</a>
            <a href="#/invest">Earn</a>
            <a href="#/wallet">Assets</a>
          </nav>
        </aside>
        <main class="vp2-main">
          <section class="vp2-top">
            <div class="vp2-title">
              <div>
                <div class="vp2-symbol" data-active-symbol>${esc(state.symbol)}</div>
                <div class="vp2-subtitle"><span data-active-name>${esc(state.symbol)}</span> / ${esc(def.label)} / <span data-active-market>${esc(state.market.toUpperCase())}</span></div>
              </div>
              <div class="vp2-live" data-live-badge>SYNCING</div>
            </div>
            <div class="vp2-actions">
              <div>
                <div class="vp2-price" data-active-price>--</div>
                <div class="vp2-change" data-active-change>+0.00%</div>
              </div>
              <button class="vp2-btn ghost" data-action="mode">${state.mode === 'real' ? 'Real' : 'Demo'}</button>
              <button class="vp2-btn primary" data-action="refresh">Refresh</button>
            </div>
          </section>
          <section class="vp2-grid">
            <aside class="vp2-panel vp2-watch">
              <div class="vp2-panel-head">
                <div>
                  <div class="vp2-panel-title">Markets</div>
                  <div class="vp2-muted">Only visible symbols are refreshed.</div>
                </div>
              </div>
              <div class="vp2-watch-tools">
                <div class="vp2-tabs" data-type-tabs>
                  ${TYPES.map(t => `<button class="vp2-chip ${t.key === state.type ? 'active' : ''}" data-type="${t.key}">${esc(t.label)}</button>`).join('')}
                </div>
                <div class="vp2-tabs" data-market-tabs>
                  ${def.markets.map(m => `<button class="vp2-chip ${m === state.market ? 'active' : ''}" data-market="${m}">${esc(m.toUpperCase())}</button>`).join('')}
                </div>
                <input class="vp2-field" data-search placeholder="Search symbols" value="${esc(state.search)}" />
              </div>
              <div class="vp2-list" data-market-list><div class="vp2-empty">Loading markets...</div></div>
            </aside>
            <section class="vp2-panel vp2-chart-panel">
              <div class="vp2-panel-head">
                <div>
                  <div class="vp2-panel-title" data-chart-title>${esc(state.symbol)}</div>
                  <div class="vp2-muted" data-chart-source>Quote authority + native candles</div>
                </div>
                <div class="vp2-live" data-source-badge>LIVE</div>
              </div>
              <div class="vp2-chart-wrap">
                <div class="vp2-chart" data-chart></div>
                <div class="vp2-chart-state" data-chart-state>Loading chart...</div>
              </div>
              <div class="vp2-chart-foot">
                <div class="vp2-tfs">
                  ${['1m','3m','5m','15m','30m','1h','4h'].map(tf => `<button class="vp2-chip ${tf === state.tf ? 'active' : ''}" data-tf="${tf}">${tf}</button>`).join('')}
                </div>
                <button class="vp2-btn ghost" data-action="fit">Fit chart</button>
              </div>
            </section>
            <aside class="vp2-panel vp2-ticket">
              <div class="vp2-panel-head">
                <div>
                  <div class="vp2-panel-title">Order Ticket</div>
                  <div class="vp2-muted">${esc(state.mode.toUpperCase())} internal trading</div>
                </div>
                <span class="vp2-chip active">${esc(state.market.toUpperCase())}</span>
              </div>
              <div class="vp2-form">
                <div class="vp2-two">
                  <div class="vp2-stat"><span class="vp2-muted">Available</span><b data-available>--</b></div>
                  <div class="vp2-stat"><span class="vp2-muted">PnL</span><b data-pnl>--</b></div>
                </div>
                <label class="vp2-label">Amount USD
                  <input class="vp2-field" data-amount type="number" min="1" step="1" value="100" />
                </label>
                <label class="vp2-label">Leverage
                  <select class="vp2-select" data-leverage>
                    ${[1,2,3,5,10,20,50,100].map(v => `<option value="${v}" ${v === 10 ? 'selected' : ''}>${v}x</option>`).join('')}
                  </select>
                </label>
                <div class="vp2-two">
                  <button class="vp2-sell" data-order="SELL">Sell / Short<br><span data-sell-price>--</span></button>
                  <button class="vp2-buy" data-order="BUY">Buy / Long<br><span data-buy-price>--</span></button>
                </div>
                <div class="vp2-muted" data-ticket-note>Market orders fill using the current quote authority price.</div>
              </div>
            </aside>
          </section>
          <section class="vp2-bottom">
            <div class="vp2-panel">
              <div class="vp2-panel-head">
                <div class="vp2-panel-title">Active Positions</div>
                <button class="vp2-btn ghost" data-action="portfolio">Refresh</button>
              </div>
              <div data-positions><div class="vp2-empty">Loading positions...</div></div>
            </div>
            <div class="vp2-panel">
              <div class="vp2-panel-head">
                <div class="vp2-panel-title">Orders History</div>
              </div>
              <div data-orders><div class="vp2-empty">Loading orders...</div></div>
            </div>
          </section>
        </main>
      </div>
    `;
    bindUi();
  }

  function bindUi(){
    if(boundRoot !== root){
      try{ if(boundRoot) boundRoot.removeEventListener('click', onClick); }catch(e){}
      root.addEventListener('click', onClick);
      boundRoot = root;
    }
    const search = $('[data-search]');
    if(search){
      search.addEventListener('input', () => {
        state.search = search.value || '';
        renderMarketList();
      });
    }
  }

  function onClick(e){
    const typeBtn = e.target.closest('[data-type]');
    if(typeBtn){
      const type = normType(typeBtn.dataset.type);
      const def = typeDef(type);
      state = Object.assign({}, state, { type, symbol:def.defaultSymbol, market:defaultMarket(type), search:'' });
      writeRoute(state);
      return;
    }
    const marketBtn = e.target.closest('[data-market]');
    if(marketBtn){
      const def = typeDef(state.type);
      const market = String(marketBtn.dataset.market || '').toLowerCase();
      if(def.markets.includes(market)){
        state.market = market;
        writeRoute(state);
      }
      return;
    }
    const tfBtn = e.target.closest('[data-tf]');
    if(tfBtn){
      state.tf = normalizeTf(tfBtn.dataset.tf);
      localStorage.setItem('vp2_tf', state.tf);
      $all('[data-tf]').forEach(b => b.classList.toggle('active', b.dataset.tf === state.tf));
      loadCandles(true).catch(showChartError);
      return;
    }
    const row = e.target.closest('[data-row-symbol]');
    if(row){
      state.symbol = cleanSymbol(row.dataset.rowSymbol);
      const rowType = normType(row.dataset.rowType || state.type);
      state.type = rowType;
      state.market = String(row.dataset.rowMarket || state.market || defaultMarket(rowType)).toLowerCase();
      writeRoute(state);
      return;
    }
    const order = e.target.closest('[data-order]');
    if(order){
      placeOrder(order.dataset.order).catch(err => setNote(err.message || 'Order failed', true));
      return;
    }
    const close = e.target.closest('[data-close-position]');
    if(close){
      closePosition(Number(close.dataset.closePosition || 0)).catch(err => setNote(err.message || 'Close failed', true));
      return;
    }
    const action = e.target.closest('[data-action]');
    if(!action) return;
    const name = action.dataset.action;
    if(name === 'refresh') loadAll(true).catch(() => {});
    if(name === 'portfolio') loadPortfolio(true).catch(() => {});
    if(name === 'fit') fitChart();
    if(name === 'mode') toggleMode();
  }

  function setNote(text, error){
    const el = $('[data-ticket-note]');
    if(!el) return;
    el.textContent = text;
    el.classList.toggle('vp2-error', !!error);
  }

  function renderMarketList(){
    const list = $('[data-market-list]');
    if(!list) return;
    const term = String(state.search || '').trim().toUpperCase();
    const rows = marketItems
      .filter(item => !term || cleanSymbol(item.symbol).includes(term) || String(item.name || '').toUpperCase().includes(term))
      .slice(0, 40);
    if(!rows.length){
      list.innerHTML = '<div class="vp2-empty">No symbols found for this market.</div>';
      return;
    }
    list.innerHTML = rows.map(item => {
      const sym = cleanSymbol(item.symbol);
      const price = Number(item.price || item.q_price || 0);
      const change = Number(item.change_pct || item.q_change || 0);
      const rowType = normType(item.type || state.type);
      const rowMarket = String(item.market || item.market_type || defaultMarket(rowType)).toLowerCase();
      const active = sym === state.symbol && rowType === state.type;
      return `
        <button class="vp2-row ${active ? 'active' : ''}" data-row-symbol="${esc(sym)}" data-row-type="${esc(rowType)}" data-row-market="${esc(rowMarket)}">
          <span>
            <span class="vp2-row-symbol">${esc(sym)}</span>
            <span class="vp2-row-name">${esc(item.name || sym)}</span>
          </span>
          <span>
            <span class="vp2-row-price">${price > 0 ? money(price) : '--'}</span>
            <span class="vp2-row-change ${change < 0 ? 'down' : ''}">${pct(change)}</span>
          </span>
        </button>
      `;
    }).join('');
  }

  function updateHeader(){
    const item = marketItems.find(x => cleanSymbol(x.symbol) === state.symbol);
    const name = item ? (item.name || state.symbol) : state.symbol;
    const q = lastQuote || {};
    const price = Number(q.price || item?.price || item?.q_price || 0);
    const change = Number((q.change_pct ?? item?.change_pct ?? item?.q_change ?? 0) || 0);
    const delayed = !!q.delayed || ['stocks','arab'].includes(state.type) || String(q.timing_class || '').includes('stale');
    const source = String(q.source || item?.source || item?.provider || '').toUpperCase() || 'QUOTE';
    const spread = price > 0 ? price * (state.type === 'crypto' ? 0.0002 : 0.0001) : 0;
    const sell = price > 0 ? price - spread : 0;
    const buy = price > 0 ? price + spread : 0;
    const setText = (sel, text) => { const el = $(sel); if(el) el.textContent = text; };
    setText('[data-active-symbol]', state.symbol);
    setText('[data-active-name]', name);
    setText('[data-active-market]', state.market.toUpperCase());
    setText('[data-active-price]', price > 0 ? money(price) : '--');
    setText('[data-active-change]', pct(change));
    setText('[data-chart-title]', state.symbol);
    setText('[data-chart-source]', source + ' / ' + state.tf);
    setText('[data-buy-price]', buy > 0 ? fmt(buy) : '--');
    setText('[data-sell-price]', sell > 0 ? fmt(sell) : '--');
    const changeEl = $('[data-active-change]');
    if(changeEl) changeEl.classList.toggle('down', change < 0);
    const live = $('[data-live-badge]');
    const sourceBadge = $('[data-source-badge]');
    [live, sourceBadge].forEach(el => {
      if(!el) return;
      el.textContent = delayed ? 'DELAYED' : 'LIVE';
      el.classList.toggle('delayed', delayed);
    });
    updateOrderSizing();
  }

  function updateOrderSizing(){
    const price = Number(lastQuote?.price || 0);
    const amount = Number($('[data-amount]')?.value || 0);
    const lev = Math.max(1, Number($('[data-leverage]')?.value || 1));
    const note = $('[data-ticket-note]');
    if(!note || !(price > 0) || !(amount > 0)) return;
    const qty = state.market === 'perp' ? (amount * lev / price) : (amount / price);
    note.textContent = `Estimated size: ${fmt(qty, qty < 1 ? 6 : 4)} ${state.symbol}`;
    note.classList.remove('vp2-error');
  }

  async function loadMarkets(force){
    if(marketsBusy) return;
    marketsBusy = true;
    try{
      const cache = force ? '&_=' + Date.now() : '';
      const data = await api(`/markets.php?type=${encodeURIComponent(state.type)}&lite=1&with_quotes=1${cache}`, { timeoutMs:6500 });
      let rows = Array.isArray(data.items) ? data.items : (Array.isArray(data.markets) ? data.markets : []);
      if(!rows.length && data.groups && typeof data.groups === 'object'){
        rows = Object.values(data.groups).flatMap(v => Array.isArray(v) ? v : (Array.isArray(v?.items) ? v.items : []));
      }
      rows = rows.filter(x => cleanSymbol(x.symbol));
      marketItems = rows;
      if(!marketItems.some(x => cleanSymbol(x.symbol) === state.symbol)){
        const first = marketItems[0];
        if(first){
          state.symbol = cleanSymbol(first.symbol);
          state.market = String(first.market || first.market_type || state.market || defaultMarket(state.type)).toLowerCase();
          localStorage.setItem('vp2_symbol_' + state.type, state.symbol);
        }
      }
      renderMarketList();
      updateHeader();
      if(state.type !== 'crypto') hydrateMarketQuotes(force).catch(() => {});
    }catch(err){
      const list = $('[data-market-list]');
      if(list) list.innerHTML = `<div class="vp2-error">Markets unavailable: ${esc(err.message || err)}</div>`;
    }finally{
      marketsBusy = false;
    }
  }

  async function hydrateMarketQuotes(force){
    if(marketHydrateBusy || state.type === 'crypto') return;
    const symbols = [];
    if(state.symbol) symbols.push(state.symbol);
    marketItems.forEach(item => {
      const sym = cleanSymbol(item.symbol);
      if(sym && !symbols.includes(sym)) symbols.push(sym);
    });
    const wanted = symbols.slice(0, 6);
    if(!wanted.length) return;
    const key = `${state.type}|${wanted.join(',')}`;
    if(!force && marketHydrateKey === key) return;
    marketHydrateKey = key;
    marketHydrateBusy = true;
    try{
      for(const sym of wanted){
        const data = await api(`/quotes.php?purpose=focus&fresh=1&direct=1&symbol=${encodeURIComponent(sym)}&type=${encodeURIComponent(state.type)}&_=${Date.now()}`, { timeoutMs:4200 });
        const q = Array.isArray(data.items) ? data.items.find(item => cleanSymbol(item.symbol) === sym) : null;
        if(!q || !(Number(q.price || 0) > 0)) continue;
        marketItems = marketItems.map(row => {
          if(cleanSymbol(row.symbol) !== sym) return row;
          if(!q || !(Number(q.price || 0) > 0)) return row;
          return Object.assign({}, row, {
            price: Number(q.price || 0),
            change_pct: Number(q.change_pct ?? row.change_pct ?? 0),
            updated_at: Number(q.updated_at || row.updated_at || 0),
            source: q.source || row.source || '',
            timing_class: q.timing_class || row.timing_class || 'live',
            is_stale: q.timing_class === 'stale'
          });
        });
        renderMarketList();
        updateHeader();
        await sleep(120);
      }
    }finally{
      marketHydrateBusy = false;
    }
  }

  async function loadQuote(){
    if(activeBusy) return;
    activeBusy = true;
    const myRun = runId;
    try{
      const path = `/quotes.php?purpose=focus&fresh=1&direct=1&symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&_=${Date.now()}`;
      const data = await api(path, { timeoutMs: state.type === 'crypto' ? 5000 : 8500 });
      if(myRun !== runId) return;
      const q = Array.isArray(data.items) ? data.items[0] : data.item;
      if(q && Number(q.price || 0) > 0){
        lastQuote = Object.assign({}, q, { symbol:state.symbol, type:state.type, market:state.market });
        rememberQuote(lastQuote);
        updateHeader();
        updateLiveCandle(Number(lastQuote.price || 0));
        updatePositionMarks();
      }
    }catch(err){
      const live = $('[data-live-badge]');
      if(live){
        live.textContent = 'WAITING';
        live.classList.add('delayed');
      }
    }finally{
      activeBusy = false;
    }
  }

  function rememberQuote(q){
    const sym = cleanSymbol(q.symbol);
    marketItems = marketItems.map(item => cleanSymbol(item.symbol) === sym ? Object.assign({}, item, {
      price: Number(q.price || item.price || 0),
      change_pct: Number(q.change_pct ?? item.change_pct ?? 0),
      updated_at: Number(q.updated_at || item.updated_at || 0),
      source: q.source || item.source || item.provider || ''
    }) : item);
    renderMarketList();
  }

  async function loadCandles(force){
    if(candlesBusy) return;
    candlesBusy = true;
    const myRun = runId;
    const stateEl = $('[data-chart-state]');
    if(stateEl){
      stateEl.textContent = 'Loading chart...';
      stateEl.classList.remove('hide');
    }
    try{
      const limit = window.innerWidth < 760 ? 96 : 140;
      const data = await api(`/trade/candles.php?symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&market=${encodeURIComponent(state.market)}&tf=${encodeURIComponent(state.tf)}&limit=${limit}${force ? '&_=' + Date.now() : ''}`, { timeoutMs:15000 });
      if(myRun !== runId) return;
      const items = Array.isArray(data.items) ? data.items.filter(c => Number(c.close || 0) > 0) : [];
      if(!items.length) throw new Error('No candles from provider');
      await initChart();
      if(!candleSeries) return;
      candleSeries.setData(items.map(c => ({
        time:Number(c.time),
        open:Number(c.open),
        high:Number(c.high),
        low:Number(c.low),
        close:Number(c.close)
      })));
      if(volumeSeries){
        volumeSeries.setData(items.map(c => ({
          time:Number(c.time),
          value:Number(c.volume || 0),
          color:Number(c.close || 0) >= Number(c.open || 0) ? 'rgba(47,230,166,.35)' : 'rgba(255,96,120,.35)'
        })));
      }
      lastCandle = items[items.length - 1] || null;
      fitChart();
      if(stateEl) stateEl.classList.add('hide');
    }catch(err){
      showChartError(err);
    }finally{
      candlesBusy = false;
    }
  }

  async function initChart(){
    if(chart && candleSeries) return;
    const ok = await ensureCharts();
    const el = $('[data-chart]');
    if(!ok || !el) throw new Error('Chart library unavailable');
    chart = LightweightCharts.createChart(el, {
      layout: { background: { color:'#07131f' }, textColor:'#9fb1c9', fontFamily:'Inter, system-ui, sans-serif' },
      grid: { vertLines: { color:'rgba(142,169,214,.08)' }, horzLines: { color:'rgba(142,169,214,.08)' } },
      rightPriceScale: { borderColor:'rgba(142,169,214,.12)' },
      timeScale: { borderColor:'rgba(142,169,214,.12)', timeVisible:true, secondsVisible:false },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      handleScale: true,
      handleScroll: true
    });
    candleSeries = chart.addCandlestickSeries({
      upColor:'#2fe6a6',
      downColor:'#ff6078',
      wickUpColor:'#2fe6a6',
      wickDownColor:'#ff6078',
      borderVisible:false,
      priceLineColor:'#58a6ff'
    });
    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type:'volume' },
      priceScaleId:'',
      scaleMargins: { top:.82, bottom:0 },
      color:'rgba(47,230,166,.24)'
    });
    const resize = () => {
      try{
        const box = el.getBoundingClientRect();
        chart.applyOptions({ width:Math.max(320, Math.floor(box.width)), height:Math.max(320, Math.floor(box.height)) });
      }catch(e){}
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();
  }

  function updateLiveCandle(price){
    if(!(price > 0) || !candleSeries) return;
    const step = tfSeconds(state.tf);
    const bucket = Math.floor(Math.floor(Date.now()/1000) / step) * step;
    const prev = lastCandle || { time:bucket, open:price, high:price, low:price, close:price, volume:0 };
    const prevTime = Number(prev.time || bucket);
    let next;
    if(prevTime === bucket){
      next = {
        time:bucket,
        open:Number(prev.open || price),
        high:Math.max(Number(prev.high || price), price),
        low:Math.min(Number(prev.low || price), price),
        close:price,
        volume:Number(prev.volume || 0)
      };
    }else{
      const close = Number(prev.close || price);
      next = { time:bucket, open:close, high:Math.max(close, price), low:Math.min(close, price), close:price, volume:0 };
    }
    lastCandle = next;
    candleSeries.update(next);
  }

  function fitChart(){
    try{ chart && chart.timeScale().fitContent(); }catch(e){}
  }
  function showChartError(err){
    const el = $('[data-chart-state]');
    if(el){
      el.textContent = 'Chart unavailable: ' + (err && err.message ? err.message : 'provider timeout');
      el.classList.remove('hide');
    }
  }

  async function loadPortfolio(force){
    if(portfolioBusy) return;
    portfolioBusy = true;
    try{
      const data = await api(`/trade/portfolio.php?mode=${encodeURIComponent(state.mode)}${force ? '&_=' + Date.now() : ''}`, { timeoutMs:12000 });
      positions = Array.isArray(data.positions) ? data.positions : [];
      orders = Array.isArray(data.orders) ? data.orders : [];
      const wallet = data.wallet || {};
      const cur = state.mode === 'real' ? 'USDT' : 'USDT_DEMO';
      const available = Number(wallet[cur]?.available ?? wallet[cur]?.balance ?? data.equity ?? 0);
      const pnl = Number(data.unrealized_pnl || 0);
      const avEl = $('[data-available]');
      const pnlEl = $('[data-pnl]');
      if(avEl) avEl.textContent = money(available, 2);
      if(pnlEl){
        pnlEl.textContent = (pnl >= 0 ? '+' : '') + money(pnl, 2);
        pnlEl.className = pnl >= 0 ? 'vp2-good' : 'vp2-bad';
      }
      renderPositions();
      renderOrders();
    }catch(err){
      const p = $('[data-positions]');
      if(p) p.innerHTML = `<div class="vp2-error">Portfolio unavailable: ${esc(err.message || err)}</div>`;
    }finally{
      portfolioBusy = false;
    }
  }

  function renderPositions(){
    const el = $('[data-positions]');
    if(!el) return;
    if(!positions.length){
      el.innerHTML = '<div class="vp2-empty">No open positions.</div>';
      return;
    }
    el.innerHTML = `
      <div style="overflow:auto">
        <table class="vp2-table">
          <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Mark</th><th>PnL</th><th></th></tr></thead>
          <tbody>
            ${positions.map(p => {
              const pnl = Number(p.unrealized_pnl || 0);
              return `<tr data-pos-row="${Number(p.id || 0)}" data-pos-symbol="${esc(cleanSymbol(p.symbol))}">
                <td>${esc(cleanSymbol(p.symbol))}</td>
                <td>${esc(String(p.side || '').toUpperCase())}</td>
                <td>${fmt(p.entry_price)}</td>
                <td data-pos-mark>${fmt(p.mark_price)}</td>
                <td class="${pnl >= 0 ? 'vp2-good' : 'vp2-bad'}" data-pos-pnl>${pnl >= 0 ? '+' : ''}${money(pnl, 2)}</td>
                <td><button class="vp2-btn danger" data-close-position="${Number(p.id || 0)}">Close</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOrders(){
    const el = $('[data-orders]');
    if(!el) return;
    if(!orders.length){
      el.innerHTML = '<div class="vp2-empty">No orders yet.</div>';
      return;
    }
    el.innerHTML = `
      <div style="overflow:auto">
        <table class="vp2-table">
          <thead><tr><th>Symbol</th><th>Side</th><th>Status</th><th>Fill</th><th>PnL</th></tr></thead>
          <tbody>
            ${orders.slice(0, 20).map(o => {
              const pnl = Number(o.pnl_usd || 0);
              return `<tr>
                <td>${esc(cleanSymbol(o.symbol))}</td>
                <td>${esc(String(o.side || '').toUpperCase())}</td>
                <td>${esc(String(o.status || ''))}</td>
                <td>${fmt(o.fill_price || o.entry_price)}</td>
                <td class="${pnl >= 0 ? 'vp2-good' : 'vp2-bad'}">${pnl ? ((pnl >= 0 ? '+' : '') + money(pnl, 2)) : '--'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function updatePositionMarks(){
    if(!lastQuote || !(Number(lastQuote.price) > 0)) return;
    const price = Number(lastQuote.price);
    positions.forEach(p => {
      if(cleanSymbol(p.symbol) !== state.symbol) return;
      const row = root.querySelector(`[data-pos-row="${Number(p.id || 0)}"]`);
      if(!row) return;
      const entry = Number(p.entry_price || 0);
      const qty = Number(p.qty || 0);
      const side = String(p.side || 'buy').toLowerCase();
      const pnl = side === 'sell' ? (entry - price) * qty : (price - entry) * qty;
      const markEl = row.querySelector('[data-pos-mark]');
      const pnlEl = row.querySelector('[data-pos-pnl]');
      if(markEl) markEl.textContent = fmt(price);
      if(pnlEl){
        pnlEl.textContent = (pnl >= 0 ? '+' : '') + money(pnl, 2);
        pnlEl.className = pnl >= 0 ? 'vp2-good' : 'vp2-bad';
      }
    });
  }

  async function placeOrder(side){
    const amount = Number($('[data-amount]')?.value || 0);
    const leverage = Math.max(1, Number($('[data-leverage]')?.value || 1));
    if(!(amount > 0)) throw new Error('Enter amount first');
    if(!(Number(lastQuote?.price || 0) > 0)) throw new Error('Price is not ready yet');
    setNote('Sending order...', false);
    const payload = {
      symbol: state.symbol,
      asset_type: state.type,
      market_type: state.market,
      side,
      order_type: 'MARKET',
      usd: amount,
      leverage,
      mode: state.mode
    };
    const data = await api('/trade/place_order.php', { method:'POST', body:payload, timeoutMs:12000 });
    setNote(`Order filled at ${fmt(data.fill_price || lastQuote.price)}`, false);
    await loadPortfolio(true);
  }

  async function closePosition(id){
    if(!(id > 0)) return;
    setNote('Closing position...', false);
    const data = await api('/trade/close_position.php', { method:'POST', body:{ id, mode:state.mode }, timeoutMs:12000 });
    setNote(`Position closed. PnL ${money(data.pnl_usd || 0, 2)}`, false);
    await loadPortfolio(true);
  }

  function toggleMode(){
    state.mode = state.mode === 'real' ? 'demo' : 'real';
    localStorage.setItem('trade_mode', state.mode);
    const btn = $('[data-action="mode"]');
    if(btn) btn.textContent = state.mode === 'real' ? 'Real' : 'Demo';
    loadPortfolio(true).catch(() => {});
  }

  async function loadAll(force){
    const myRun = ++runId;
    lastQuote = null;
    lastCandle = null;
    updateHeader();
    const marketLoad = loadMarkets(force).catch(() => {});
    await Promise.allSettled([loadQuote(), loadCandles(force), loadPortfolio(force), marketLoad]);
    if(myRun !== runId) return;
  }

  function startLoops(){
    clearTimers();
    schedule(()=>{ if(!document.hidden) loadQuote().catch(()=>{}); }, pollMs(state.type));
    schedule(()=>{ if(!document.hidden) loadMarkets(false).catch(()=>{}); }, state.type==='crypto' ? 15000 : 20000);
    schedule(()=>{ if(!document.hidden) loadPortfolio(false).catch(()=>{}); }, 12000);
  }

  function mount(){
    if(!routeIsTrade()){
      if(mounted) cleanup();
      return;
    }
    const host = document.getElementById(HOST_ID);
    if(!host) return;
    const nextState = readRoute();
    if(root !== host){
      cleanup();
      root = host;
      mounted = true;
      state = nextState;
      marketItems = [];
      positions = [];
      orders = [];
      renderShell();
      loadAll(true).catch(() => {});
      startLoops();
      return;
    }
    if(!mounted){
      mounted = true;
      state = nextState;
      renderShell();
      loadAll(true).catch(() => {});
      startLoops();
      return;
    }
    const changed = nextState.symbol !== state.symbol || nextState.type !== state.type || nextState.market !== state.market || nextState.tf !== state.tf || nextState.mode !== state.mode;
    if(changed){
      state = nextState;
      marketItems = [];
      positions = [];
      orders = [];
      lastQuote = null;
      lastCandle = null;
      activeBusy = false;
      marketsBusy = false;
      marketHydrateBusy = false;
      marketHydrateKey = '';
      portfolioBusy = false;
      candlesBusy = false;
      clearTimers();
      try{ if(resizeObserver) resizeObserver.disconnect(); }catch(e){}
      resizeObserver = null;
      try{ if(chart) chart.remove(); }catch(e){}
      chart = null;
      candleSeries = null;
      volumeSeries = null;
      renderShell();
      loadAll(true).catch(() => {});
      startLoops();
    }
  }

  function scheduleMount(){
    setTimeout(mount, 0);
    setTimeout(mount, 60);
    setTimeout(mount, 180);
  }

  window.addEventListener('hashchange', scheduleMount);
  let __trVisDebounce = 0;
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    clearTimeout(__trVisDebounce);
    __trVisDebounce = setTimeout(() => {
      if(routeIsTrade()){
        loadQuote().catch(() => {});
        loadPortfolio(false).catch(() => {});
      }
    }, 400);
  }, { passive:true });
  document.addEventListener('DOMContentLoaded', scheduleMount);
  scheduleMount();
})();
