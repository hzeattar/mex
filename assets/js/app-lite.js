(() => {
  'use strict';

  const API = '/api';
  const ACTIVE_QUOTE_MS = 2400;
  const WATCHLIST_QUOTE_MS = 6000;
  const ACCOUNT_POLL_MS = 15000;
  const DEFAULT_AMOUNT = 100;

  const TYPES = [
    { key: 'crypto', label: 'Crypto', short: 'CR', market: 'spot', symbol: 'BTCUSDT', name: 'Bitcoin / Tether' },
    { key: 'forex', label: 'Forex', short: 'FX', market: 'spot', symbol: 'EURUSD', name: 'Euro / US Dollar' },
    { key: 'stocks', label: 'Stocks', short: 'ST', market: 'spot', symbol: 'AAPL', name: 'Apple Inc.' },
    { key: 'commodities', label: 'Commodities', short: 'CM', market: 'spot', symbol: 'XAUUSD', name: 'Gold Spot' },
    { key: 'futures', label: 'Futures', short: 'FU', market: 'perp', symbol: 'ES_F', name: 'E-mini S&P 500 Future' },
    { key: 'arab', label: 'Arab', short: 'AR', market: 'spot', symbol: '2222', name: 'Arab Market' }
  ];
  const TYPE_BY_KEY = Object.fromEntries(TYPES.map((item) => [item.key, item]));
  const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h'];

  const state = {
    route: 'home',
    booted: false,
    bootstrap: null,
    brand: {
      name: window.__BRAND_NAME || 'VertexPluse',
      tagline: window.__BRAND_TAGLINE || 'Professional trading workspace',
      logo_url: window.__BRAND_LOGO_URL || ''
    },
    user: null,
    wallet: null,
    mode: safeStorage('vp_trade_mode', 'demo') === 'real' ? 'real' : 'demo',
    type: safeStorage('vp_market_type', 'crypto'),
    symbol: safeStorage('vp_symbol', 'BTCUSDT'),
    market: safeStorage('vp_market', 'spot'),
    tf: safeStorage('vp_tf', '1m'),
    search: '',
    orderType: 'MARKET',
    amount: DEFAULT_AMOUNT,
    leverage: 10,
    activeQuote: null,
    visibleQuotes: {},
    markets: {},
    portfolio: null,
    orders: [],
    lastError: ''
  };

  if (!TYPE_BY_KEY[state.type]) state.type = 'crypto';
  if (!TIMEFRAMES.includes(state.tf)) state.tf = '1m';

  const runtime = {
    routeToken: 0,
    timers: new Set(),
    controllers: new Set(),
    chart: null,
    candleSeries: null,
    volumeSeries: null,
    chartResize: null,
    lastCandle: null,
    chartUnavailable: false,
    pending: freshPending()
  };

  const app = document.getElementById('app');
  document.addEventListener('DOMContentLoaded', init);

  function freshPending() {
    return {
      markets: false,
      visibleQuotes: false,
      activeQuote: false,
      candles: false,
      account: false,
      wallet: false
    };
  }

  async function init() {
    renderBoot();
    try {
      const data = await api('/bootstrap.php', { timeout: 9000, noAbortTrack: true });
      if (!data || data.ok === false) throw new Error((data && data.error) || 'Bootstrap failed');
      state.bootstrap = data;
      state.user = data.user || null;
      state.brand = Object.assign({}, state.brand, data.brand || {});
      state.wallet = data.wallet || null;
      state.markets = normalizeBootMarkets(data.markets || {});
      primeSelectionFromMarkets();
      state.booted = true;
      renderShell();
      if (!location.hash || location.hash === '#') location.hash = '#/home';
      applyRoute();
      window.addEventListener('hashchange', applyRoute);
    } catch (err) {
      renderSetupError(err);
    }
  }

  function renderBoot() {
    app.innerHTML = `
      <div class="vp-boot">
        <div class="vp-boot__mark">V</div>
        <div>
          <strong>${esc(state.brand.name)}</strong>
          <span>Loading trading workspace...</span>
        </div>
      </div>`;
  }

  function renderSetupError(err) {
    app.innerHTML = `
      <main class="setup-screen">
        <section class="setup-card">
          <span class="setup-mark">V</span>
          <h1>Platform setup required</h1>
          <p>Your server must expose the PHP API and database configuration correctly.</p>
          <small>${esc(err && err.message ? err.message : 'Bootstrap error')}</small>
          <div class="setup-actions">
            <button class="btn btn-primary" data-test-api>Test API</button>
            <button class="btn btn-ghost" data-retry>Retry</button>
            <a class="btn btn-ghost" href="/legacy-app.php#/home">Legacy</a>
          </div>
        </section>
      </main>`;
    $('[data-retry]')?.addEventListener('click', () => location.reload());
    $('[data-test-api]')?.addEventListener('click', async () => {
      try {
        const ping = await api('/ping.php?diag=1', { timeout: 7000, noAbortTrack: true });
        alert(JSON.stringify(ping, null, 2));
      } catch (e) {
        alert(e.message || 'API test failed');
      }
    });
  }

  function renderShell() {
    app.innerHTML = `
      <div class="app-shell">
        <aside class="side-rail">
          <a class="brand-lockup" href="#/home" aria-label="${esc(state.brand.name)} home">
            <span class="brand-mark">V</span>
            <span class="brand-word">Vertex</span>
          </a>
          <nav class="rail-nav" aria-label="Primary">
            ${navItems().map(navButton).join('')}
          </nav>
          <a class="rail-legacy" href="/legacy-app.php#/home">Legacy</a>
        </aside>
        <div class="workspace">
          <header class="topbar" id="topbar"></header>
          <main class="view" id="view"></main>
        </div>
        <nav class="mobile-nav" aria-label="Mobile primary">
          ${navItems().map(navButton).join('')}
        </nav>
      </div>`;
    app.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => {
        if (window.innerWidth < 900) window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function navItems() {
    return [
      { route: 'home', label: 'Home', icon: 'H' },
      { route: 'trade', label: 'Trade', icon: 'T' },
      { route: 'portfolio', label: 'Portfolio', icon: 'P' },
      { route: 'wallet', label: 'Wallet', icon: 'W' },
      { route: 'account', label: 'Account', icon: 'A' }
    ];
  }

  function navButton(item) {
    return `<a class="nav-pill" data-nav="${item.route}" href="#/${item.route}" title="${esc(item.label)}">
      <span>${esc(item.icon)}</span><em>${esc(item.label)}</em>
    </a>`;
  }

  function applyRoute() {
    runtime.routeToken += 1;
    clearRuntime();

    const parsed = parseHash();
    state.route = parsed.route;
    if (parsed.params.type && TYPE_BY_KEY[parsed.params.type]) state.type = parsed.params.type;
    if (parsed.params.symbol) state.symbol = cleanSymbol(parsed.params.symbol);
    if (parsed.params.market) state.market = parsed.params.market === 'perp' ? 'perp' : 'spot';
    if (parsed.params.tf && TIMEFRAMES.includes(parsed.params.tf)) state.tf = parsed.params.tf;
    rememberSelection();

    syncShell();
    renderTopbar();
    if (state.route === 'trade') renderTrade();
    else if (state.route === 'portfolio') renderPortfolio();
    else if (state.route === 'wallet') renderWallet();
    else if (state.route === 'account') renderAccount();
    else renderHome();
  }

  function parseHash() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const route = ['home', 'trade', 'portfolio', 'wallet', 'account'].includes(path) ? path : 'home';
    const params = Object.fromEntries(new URLSearchParams(query));
    return { route, params };
  }

  function syncShell() {
    app.querySelectorAll('[data-nav]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-nav') === state.route);
    });
  }

  function renderTopbar() {
    const wallet = activeWallet();
    const type = TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto;
    const topbar = $('#topbar');
    if (!topbar) return;
    topbar.innerHTML = `
      <div class="topbar-title">
        <span class="route-kicker">${esc(type.label)} workspace</span>
        <strong>${routeTitle()}</strong>
      </div>
      <div class="topbar-actions">
        <button class="mode-switch ${state.mode === 'real' ? 'is-real' : ''}" type="button" data-mode-toggle>
          <span>${state.mode === 'real' ? 'Real' : 'Demo'}</span>
        </button>
        <div class="balance-chip">
          <small>${esc(wallet.currency || (state.mode === 'real' ? 'USDT' : 'USDT_DEMO'))}</small>
          <strong>${money(wallet.available ?? wallet.balance ?? 0)}</strong>
        </div>
        <button class="user-chip" type="button" data-user-menu title="Account">
          <span>${esc(userInitials())}</span>
          <em>${esc((state.user && (state.user.email || state.user.username)) || 'Account')}</em>
        </button>
      </div>`;
    $('[data-mode-toggle]')?.addEventListener('click', () => {
      state.mode = state.mode === 'real' ? 'demo' : 'real';
      safeStorage('vp_trade_mode', state.mode, true);
      renderTopbar();
      if (state.route === 'trade') {
        loadTradingAccount(runtime.routeToken, true);
      } else if (state.route === 'portfolio') {
        renderPortfolio();
      } else if (state.route === 'wallet') {
        loadWallet(runtime.routeToken, true);
      }
    });
    $('[data-user-menu]')?.addEventListener('click', () => {
      location.hash = '#/account';
    });
  }

  function routeTitle() {
    if (state.route === 'trade') return `${state.symbol || 'Market'} Trading`;
    if (state.route === 'portfolio') return 'Portfolio';
    if (state.route === 'wallet') return 'Funds';
    if (state.route === 'account') return 'Account';
    return 'Home Dashboard';
  }

  function renderHome() {
    const token = runtime.routeToken;
    const wallet = activeWallet();
    const featured = collectFeaturedMarkets();
    $('#view').innerHTML = `
      <section class="home-hero panel">
        <div>
          <span class="eyebrow">${esc(state.brand.name)}</span>
          <h1>Trading desk</h1>
          <p>${esc(state.brand.tagline || 'Professional trading and investment platform')}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/trade">Open Trade</a>
            <a class="btn btn-ghost" href="#/wallet">Funds</a>
          </div>
        </div>
        <div class="hero-balance">
          <small>${state.mode.toUpperCase()} BALANCE</small>
          <strong>${money(wallet.available ?? wallet.balance ?? 0)}</strong>
          <span>${esc(wallet.currency || '')}</span>
        </div>
      </section>

      <section class="metric-grid">
        ${metricCard('Available', money(wallet.available ?? 0), wallet.currency || '')}
        ${metricCard('Balance', money(wallet.balance ?? 0), wallet.currency || '')}
        ${metricCard('Holds', money(wallet.holds ?? 0), 'Locked margin')}
        ${metricCard('Mode', state.mode === 'real' ? 'Real' : 'Demo', 'Internal execution')}
      </section>

      <section class="panel">
        <div class="section-head">
          <div>
            <span class="eyebrow">Markets</span>
            <h2>Fast watch</h2>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/trade">Trade</a>
        </div>
        <div class="home-market-grid">
          ${featured.map((m) => marketCard(m)).join('')}
        </div>
      </section>

      <section class="panel" id="homePortfolioPanel">
        <div class="section-head">
          <div>
            <span class="eyebrow">Portfolio</span>
            <h2>Open positions</h2>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/portfolio">View all</a>
        </div>
        <div class="table-shell" data-home-positions>${emptyState('Loading positions...')}</div>
      </section>`;
    $('#view').querySelectorAll('[data-symbol]').forEach((el) => {
      el.addEventListener('click', () => selectSymbol(el.dataset.symbol, el.dataset.type, el.dataset.market || undefined));
    });
    loadTradingAccount(token, true, true);
    setTimer(() => loadTradingAccount(token, false, true), ACCOUNT_POLL_MS);
  }

  function metricCard(label, value, sub) {
    return `<article class="metric-card">
      <small>${esc(label)}</small>
      <strong>${esc(value)}</strong>
      <span>${esc(sub || '')}</span>
    </article>`;
  }

  function marketCard(m) {
    const quote = mergedQuote(m);
    const q = quoteState(quote);
    return `<button class="market-tile" data-symbol="${escAttr(m.symbol)}" data-type="${escAttr(m.type || state.type)}" data-market="${escAttr(m.market || defaultMarket(m.type))}" type="button">
      <span class="asset-badge">${esc(assetInitial(m.symbol))}</span>
      <em>${esc(m.symbol)}</em>
      <strong>${quote.price > 0 ? price(quote.price, m.type) : '--'}</strong>
      <small class="${q.changeClass}">${pct(quote.change_pct)}</small>
    </button>`;
  }

  function renderTrade() {
    const type = TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto;
    const market = state.market || type.market;
    const rows = filteredMarkets(state.type);
    $('#view').innerHTML = `
      <section class="trade-hero panel">
        <div>
          <span class="status-dot"></span>
          <small>${esc(type.label)} ${market.toUpperCase()}</small>
          <h1 data-active-symbol>${esc(state.symbol)}</h1>
          <div class="price-line">
            <strong data-active-price>--</strong>
            <span data-active-change>--</span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-ghost" type="button" data-refresh-trade>Refresh</button>
          <a class="btn btn-primary" href="#/portfolio">Transactions</a>
        </div>
      </section>

      <section class="trade-balance-strip">
        <div class="mini-balance-card">
          <small>Trade mode</small>
          <strong>${esc(state.mode.toUpperCase())}</strong>
        </div>
        <div class="mini-balance-card">
          <small>Available</small>
          <strong data-trade-available>${money(activeWallet().available ?? 0)} ${esc(activeWallet().currency || '')}</strong>
        </div>
        <div class="mini-balance-card">
          <small>Open PnL</small>
          <strong data-trade-pnl>${money((state.portfolio && state.portfolio.open_pnl) || 0)}</strong>
        </div>
        <div class="mini-balance-card">
          <small>Quote status</small>
          <strong data-trade-quality>Checking</strong>
        </div>
      </section>

      <section class="trade-layout">
        <aside class="panel watch-panel">
          <div class="section-head compact">
            <div>
              <h2>Symbols</h2>
              <p>Select the market you want to trade</p>
            </div>
            <button class="icon-btn" type="button" data-refresh-markets title="Refresh markets">R</button>
          </div>
          <div class="type-tabs">
            ${TYPES.map((item) => `<button class="${item.key === state.type ? 'active' : ''}" data-type-tab="${item.key}" type="button">${esc(item.label)}</button>`).join('')}
          </div>
          <label class="search-box">
            <span>Search</span>
            <input type="search" value="${escAttr(state.search)}" placeholder="Search symbols" data-market-search />
          </label>
          <div class="watch-list" data-watch-list>
            ${rows.length ? rows.map(watchRow).join('') : emptyState('No symbols found for this tab yet.')}
          </div>
        </aside>

        <div class="trade-main">
          <section class="panel chart-panel">
            <div class="chart-head">
              <div>
                <h2>${esc(state.symbol)}</h2>
                <p data-active-name>${esc(activeMarketName())}</p>
              </div>
              <div class="source-stack">
                <span class="quality-pill" data-source-pill>Checking</span>
                <small data-source-label>Quote authority</small>
              </div>
            </div>
            <div class="tf-row">
              ${TIMEFRAMES.map((tf) => `<button class="${tf === state.tf ? 'active' : ''}" data-tf="${tf}" type="button">${tf}</button>`).join('')}
            </div>
            <div class="chart-wrap">
              <div id="liteChart" class="chart-canvas"></div>
              <div class="chart-overlay" data-chart-overlay>Loading chart...</div>
            </div>
          </section>

          <section class="panel positions-panel">
            <div class="section-head compact">
              <div>
                <h2>Active Positions</h2>
                <p data-position-count>Loading</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" data-refresh-account>Refresh</button>
            </div>
            <div class="table-shell" data-positions-table>${emptyState('Loading positions...')}</div>
          </section>

          <section class="panel orders-panel">
            <div class="section-head compact">
              <div>
                <h2>Orders & History</h2>
                <p>Latest execution records</p>
              </div>
            </div>
            <div class="table-shell" data-orders-table>${emptyState('Loading orders...')}</div>
          </section>
        </div>

        <aside class="panel ticket-panel">
          ${orderTicket()}
        </aside>
      </section>`;

    bindTradeEvents();
    setupTrade(runtime.routeToken);
  }

  function orderTicket() {
    const quote = state.activeQuote || {};
    const p = Number(quote.price || 0);
    const amount = Number(state.amount || DEFAULT_AMOUNT);
    const lev = Math.max(1, Number(state.leverage || 1));
    const units = p > 0 ? (amount * (state.market === 'perp' ? lev : 1)) / p : 0;
    const wallet = activeWallet();
    return `
      <div class="ticket-head">
        <div>
          <h2>Order Ticket</h2>
          <p>${esc(state.symbol)} - ${esc(state.type.toUpperCase())}</p>
        </div>
        <span>${esc((state.market || 'spot').toUpperCase())}</span>
      </div>
      <div class="segmented" data-order-tabs>
        <button class="${state.orderType === 'MARKET' ? 'active' : ''}" data-order-type="MARKET" type="button">Market</button>
        <button class="${state.orderType === 'LIMIT' ? 'active' : ''}" data-order-type="LIMIT" type="button">Limit</button>
      </div>
      <div class="quote-buttons">
        <button class="sell-quote" type="button" data-side-short="SELL">
          <small>Sell</small>
          <strong data-ticket-sell>${p > 0 ? price(p, state.type) : '--'}</strong>
        </button>
        <button class="buy-quote" type="button" data-side-short="BUY">
          <small>Buy</small>
          <strong data-ticket-buy>${p > 0 ? price(p, state.type) : '--'}</strong>
        </button>
      </div>
      <div class="ticket-wallet" data-ticket-wallet>
        <span>You have</span>
        <strong>${money(wallet.available ?? 0)} ${esc(wallet.currency || '')}</strong>
      </div>
      <label class="field">
        <span>Amount (USD)</span>
        <input inputmode="decimal" data-order-amount value="${escAttr(String(state.amount || DEFAULT_AMOUNT))}" />
      </label>
      <label class="field ${state.orderType === 'LIMIT' ? '' : 'is-hidden'}" data-limit-field>
        <span>Limit price</span>
        <input inputmode="decimal" data-limit-price value="${p > 0 ? escAttr(trimPrice(p)) : ''}" />
      </label>
      <label class="field">
        <span>Leverage</span>
        <select data-leverage>
          ${[1, 2, 5, 10, 20, 50].map((x) => `<option value="${x}" ${lev === x ? 'selected' : ''}>${x}x</option>`).join('')}
        </select>
      </label>
      <div class="ticket-metrics">
        <div><small>Initial margin</small><strong>${money(amount)}</strong></div>
        <div><small>Units</small><strong>${units > 0 ? compact(units) : '--'}</strong></div>
      </div>
      <div class="field-grid">
        <label class="field"><span>Take profit</span><input inputmode="decimal" data-tp placeholder="0.00000" /></label>
        <label class="field"><span>Stop loss</span><input inputmode="decimal" data-sl placeholder="0.00000" /></label>
      </div>
      <p class="ticket-note">Orders are executed internally at the current platform quote.</p>
      <div class="ticket-actions">
        <button class="btn btn-sell" type="button" data-place="SELL">Sell / Short</button>
        <button class="btn btn-buy" type="button" data-place="BUY">Buy / Long</button>
      </div>
      <div class="ticket-status" data-ticket-status></div>`;
  }

  function bindTradeEvents() {
    $('#view').querySelectorAll('[data-type-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.typeTab;
        const def = TYPE_BY_KEY[type] || TYPE_BY_KEY.crypto;
        state.type = type;
        state.market = def.market;
        state.symbol = firstMarketSymbol(type) || def.symbol;
        state.search = '';
        goTrade();
      });
    });
    $('[data-market-search]')?.addEventListener('input', (event) => {
      state.search = event.target.value || '';
      updateWatchlist();
      hydrateVisibleQuotes(runtime.routeToken);
    });
    $('#view').querySelectorAll('[data-watch-symbol]').forEach((row) => {
      row.addEventListener('click', () => selectSymbol(row.dataset.watchSymbol, row.dataset.watchType, row.dataset.watchMarket));
    });
    $('#view').querySelectorAll('[data-tf]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tf = btn.dataset.tf;
        safeStorage('vp_tf', state.tf, true);
        $('#view').querySelectorAll('[data-tf]').forEach((b) => b.classList.toggle('active', b === btn));
        loadCandles(runtime.routeToken);
      });
    });
    bindTicketEvents();
    $('[data-refresh-trade]')?.addEventListener('click', () => applyRoute());
    $('[data-refresh-markets]')?.addEventListener('click', () => loadMarkets(runtime.routeToken, true));
    $('[data-refresh-account]')?.addEventListener('click', () => loadTradingAccount(runtime.routeToken, true));
  }

  function setupTrade(token, hardRefresh = false) {
    loadMarkets(token, hardRefresh);
    loadActiveQuote(token, true);
    loadCandles(token);
    loadTradingAccount(token, true);
    setTimer(() => loadActiveQuote(token, false), ACTIVE_QUOTE_MS);
    setTimer(() => hydrateVisibleQuotes(token), WATCHLIST_QUOTE_MS);
    setTimer(() => loadTradingAccount(token, false), ACCOUNT_POLL_MS);
  }

  async function loadMarkets(token, hardRefresh = false) {
    if (runtime.pending.markets && !hardRefresh) return;
    runtime.pending.markets = true;
    try {
      const cache = state.markets[state.type] || [];
      if (!hardRefresh && cache.length) {
        updateWatchlist();
        hydrateVisibleQuotes(token);
        return;
      }
      const data = await api(`/markets.php?type=${encodeURIComponent(state.type)}&lite=1&with_quotes=1`, { timeout: 8500 });
      if (!isToken(token) || !data || data.ok === false) return;
      state.markets[state.type] = normalizeMarketItems(data.items || [], state.type);
      if (!state.markets[state.type].some((m) => m.symbol === state.symbol)) {
        state.symbol = firstMarketSymbol(state.type) || (TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto).symbol;
      }
      updateWatchlist();
      hydrateVisibleQuotes(token);
    } catch (err) {
      if (!isAbort(err)) showToast(`Markets unavailable: ${err.message || 'request failed'}`, 'warn');
    } finally {
      runtime.pending.markets = false;
    }
  }

  async function hydrateVisibleQuotes(token) {
    if (runtime.pending.visibleQuotes) return;
    const visible = filteredMarkets(state.type).slice(0, 8);
    const symbols = visible.map((m) => m.symbol).filter(Boolean);
    if (!symbols.length) return;
    runtime.pending.visibleQuotes = true;
    try {
      const data = await api(`/quotes.php?visible=1&type=${encodeURIComponent(state.type)}&symbols=${encodeURIComponent(symbols.join(','))}&purpose=watchlist`, { timeout: state.type === 'crypto' ? 5000 : 6500 });
      if (!isToken(token) || !data || data.ok === false) return;
      const map = quoteMap(data.items || []);
      Object.assign(state.visibleQuotes, map);
      mergeQuotesIntoMarkets(state.type, map);
      updateWatchlist();
    } catch (err) {
      if (!isAbort(err)) markWatchlistStale();
    } finally {
      runtime.pending.visibleQuotes = false;
    }
  }

  async function loadActiveQuote(token, immediate = false) {
    if (runtime.pending.activeQuote && !immediate) return;
    runtime.pending.activeQuote = true;
    try {
      const data = await api(`/quotes.php?symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&purpose=focus`, { timeout: state.type === 'crypto' ? (immediate ? 7000 : 5000) : (immediate ? 10000 : 8500) });
      if (!isToken(token) || !data || data.ok === false) return;
      const item = firstQuote(data.items || data);
      if (!item) return;
      state.activeQuote = normalizeQuote(item, state.type);
      state.visibleQuotes[state.symbol] = state.activeQuote;
      mergeQuotesIntoMarkets(state.type, { [state.symbol]: state.activeQuote });
      updateActiveQuoteUI();
      updateWatchlist();
      updateChartTail(state.activeQuote);
    } catch (err) {
      if (!isAbort(err)) {
        setText('[data-source-label]', 'Quote temporarily unavailable');
        setClass('[data-source-pill]', 'quality-pill is-unavailable');
      }
    } finally {
      runtime.pending.activeQuote = false;
    }
  }

  async function loadCandles(token) {
    if (runtime.pending.candles) return;
    runtime.pending.candles = true;
    runtime.lastCandle = null;
    runtime.chartUnavailable = false;
    setChartMessage('Loading chart...');
    try {
      const url = `/trade/candles.php?symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&market=${encodeURIComponent(state.market || defaultMarket(state.type))}&tf=${encodeURIComponent(state.tf)}&limit=180`;
      const data = await api(url, { timeout: state.type === 'crypto' ? 9000 : 11500 });
      if (!isToken(token)) return;
      const source = String((data && data.source) || '');
      const synthetic = !!(data && data.synthetic) || /synthetic/i.test(source);
      const candles = normalizeCandles((data && data.items) || []);
      if (!data || data.ok === false || synthetic || candles.length < 5) {
        destroyChart();
        runtime.chartUnavailable = true;
        setChartMessage('Real chart temporarily unavailable. Live quote is still active.');
        return;
      }
      ensureChart();
      runtime.candleSeries.setData(candles.map(stripVolume));
      if (runtime.volumeSeries) runtime.volumeSeries.setData(candles.map(volumePoint));
      runtime.lastCandle = Object.assign({}, candles[candles.length - 1]);
      setChartMessage('');
      updateChartTail(state.activeQuote);
    } catch (err) {
      if (!isAbort(err)) {
        destroyChart();
        runtime.chartUnavailable = true;
        setChartMessage('Real chart temporarily unavailable. Try another symbol or timeframe.');
      }
    } finally {
      runtime.pending.candles = false;
    }
  }

  async function loadTradingAccount(token, immediate = false, homeOnly = false) {
    if (runtime.pending.account && !immediate) return;
    runtime.pending.account = true;
    try {
      const [portfolio, orders, wallet] = await Promise.all([
        api(`/trade/portfolio.php?mode=${encodeURIComponent(state.mode)}`, { timeout: immediate ? 9000 : 6500 }),
        homeOnly ? Promise.resolve(null) : api(`/trade/orders.php?mode=${encodeURIComponent(state.mode)}&limit=60`, { timeout: immediate ? 9000 : 6500 }),
        api('/wallet/summary.php', { timeout: immediate ? 9000 : 6500 })
      ]);
      if (!isToken(token)) return;
      if (wallet && wallet.ok !== false) state.wallet = wallet;
      if (portfolio && portfolio.ok !== false) state.portfolio = portfolio;
      if (orders && orders.ok !== false) state.orders = orders.items || [];
      renderTopbar();
      if (state.route === 'home') updateHomePositions();
      if (state.route === 'trade') {
        updatePositions();
        updateOrders();
        updateTicketWallet();
        updateTicketMetrics();
        updateTradeSummary();
      }
      if (state.route === 'portfolio') renderPortfolioBody();
      if (state.route === 'wallet') renderWalletBody();
    } catch (err) {
      if (!isAbort(err)) {
        state.lastError = err.message || 'Account request failed';
      }
    } finally {
      runtime.pending.account = false;
    }
  }

  async function loadWallet(token, immediate = false) {
    if (runtime.pending.wallet && !immediate) return;
    runtime.pending.wallet = true;
    try {
      const wallet = await api('/wallet/summary.php', { timeout: immediate ? 9000 : 6500 });
      if (!isToken(token) || !wallet || wallet.ok === false) return;
      state.wallet = wallet;
      renderTopbar();
      if (state.route === 'wallet') renderWalletBody();
    } catch (err) {
      if (!isAbort(err)) state.lastError = err.message || 'Wallet request failed';
    } finally {
      runtime.pending.wallet = false;
    }
  }

  async function placeOrder(side) {
    const status = $('[data-ticket-status]');
    if (status) status.textContent = 'Sending order...';
    const limitInput = $('[data-limit-price]');
    const payload = {
      symbol: state.symbol,
      asset_type: state.type,
      market_type: state.market || defaultMarket(state.type),
      side,
      order_type: state.orderType,
      usd: parseNumber($('[data-order-amount]')?.value) || state.amount || DEFAULT_AMOUNT,
      leverage: Number($('[data-leverage]')?.value || state.leverage || 1),
      mode: state.mode,
      tp: parseNumber($('[data-tp]')?.value || ''),
      sl: parseNumber($('[data-sl]')?.value || '')
    };
    if (state.orderType === 'LIMIT') payload.price = parseNumber(limitInput?.value || '') || Number(state.activeQuote?.price || 0);
    try {
      const data = await api('/trade/place_order.php', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 9000,
        headers: { 'Content-Type': 'application/json' }
      });
      if (!data || data.ok === false) throw new Error((data && data.error) || 'Order rejected');
      if (status) status.textContent = 'Order filled.';
      showToast('Order filled');
      await loadTradingAccount(runtime.routeToken, true);
    } catch (err) {
      if (status) status.textContent = err.message || 'Order failed';
      showToast(err.message || 'Order failed', 'danger');
    }
  }

  async function closePosition(id) {
    if (!id) return;
    try {
      const data = await api('/trade/close_position.php', {
        method: 'POST',
        body: JSON.stringify({ id, mode: state.mode }),
        timeout: 9000,
        headers: { 'Content-Type': 'application/json' }
      });
      if (!data || data.ok === false) throw new Error((data && data.error) || 'Close failed');
      showToast('Position closed');
      await loadTradingAccount(runtime.routeToken, true);
    } catch (err) {
      showToast(err.message || 'Close failed', 'danger');
    }
  }

  function renderPortfolio() {
    const token = runtime.routeToken;
    $('#view').innerHTML = `
      <section class="panel page-head">
        <div>
          <span class="eyebrow">${state.mode.toUpperCase()} ACCOUNT</span>
          <h1>Portfolio</h1>
          <p>Positions, orders, history, and PnL from the internal trading engine.</p>
        </div>
        <button class="btn btn-primary" type="button" data-refresh-portfolio>Refresh</button>
      </section>
      <div data-portfolio-body>${emptyState('Loading portfolio...')}</div>`;
    $('[data-refresh-portfolio]')?.addEventListener('click', () => loadTradingAccount(token, true));
    loadTradingAccount(token, true);
    setTimer(() => loadTradingAccount(token, false), ACCOUNT_POLL_MS);
  }

  function renderPortfolioBody() {
    const p = state.portfolio || {};
    const positions = p.positions || [];
    const orders = state.orders.length ? state.orders : (p.orders || []);
    const node = $('[data-portfolio-body]');
    if (!node) return;
    node.innerHTML = `
      <section class="metric-grid">
        ${metricCard('Equity', money(p.equity || 0), state.mode)}
        ${metricCard('Unrealized PnL', money(p.unrealized_pnl || 0), 'Floating')}
        ${metricCard('Realized PnL', money(p.realized_pnl || 0), 'Closed')}
        ${metricCard('Positions', String(positions.length), 'Open')}
      </section>
      <section class="panel">
        <div class="section-head"><h2>Open positions</h2><a class="btn btn-ghost btn-sm" href="#/trade">Trade</a></div>
        <div class="table-shell">${positionsTable(positions)}</div>
      </section>
      <section class="panel">
        <div class="section-head"><h2>Order history</h2></div>
        <div class="table-shell">${ordersTable(orders)}</div>
      </section>`;
    bindCloseButtons(node);
  }

  function renderWallet() {
    const token = runtime.routeToken;
    $('#view').innerHTML = `
      <section class="panel page-head">
        <div>
          <span class="eyebrow">Funds</span>
          <h1>Wallet</h1>
          <p>Real deposits and withdrawals are manually reviewed by the admin desk.</p>
        </div>
        <button class="btn btn-primary" type="button" data-refresh-wallet>Refresh</button>
      </section>
      <div data-wallet-body>${emptyState('Loading wallet...')}</div>`;
    $('[data-refresh-wallet]')?.addEventListener('click', () => loadWallet(token, true));
    loadWallet(token, true);
    setTimer(() => loadWallet(token, false), ACCOUNT_POLL_MS);
  }

  function renderWalletBody() {
    const wallet = state.wallet || {};
    const node = $('[data-wallet-body]');
    if (!node) return;
    node.innerHTML = `
      <section class="wallet-grid">
        ${walletCard('Demo wallet', wallet.demo || {})}
        ${walletCard('Real wallet', wallet.real || {})}
      </section>
      <section class="panel funds-actions">
        <div>
          <h2>Manual funding desk</h2>
          <p>Deposits, withdrawals, and KYC review remain handled by admin for this stable release.</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/app.php#/account">KYC</a>
          <a class="btn btn-ghost" href="/legacy-app.php#/deposit">Legacy deposit</a>
          <a class="btn btn-ghost" href="/legacy-app.php#/withdraw">Legacy withdraw</a>
        </div>
      </section>`;
  }

  function walletCard(title, wallet) {
    return `<article class="panel wallet-card">
      <span>${esc(title)}</span>
      <strong>${money(wallet.available ?? wallet.balance ?? 0)}</strong>
      <small>${esc(wallet.currency || '')}</small>
      <dl>
        <div><dt>Balance</dt><dd>${money(wallet.balance ?? 0)}</dd></div>
        <div><dt>Holds</dt><dd>${money(wallet.holds ?? 0)}</dd></div>
      </dl>
    </article>`;
  }

  function renderAccount() {
    const user = state.user || {};
    $('#view').innerHTML = `
      <section class="account-layout">
        <div class="panel account-card">
          <div class="account-avatar">${esc(userInitials())}</div>
          <h1>${esc(user.name || user.username || 'Account')}</h1>
          <p>${esc(user.email || 'client@vertexpluse.com')}</p>
          <dl class="account-list">
            <div><dt>Account number</dt><dd>${esc(String(user.id || user.account_number || '900000000'))}</dd></div>
            <div><dt>Mode</dt><dd>${esc(state.mode)}</dd></div>
            <div><dt>Support</dt><dd>${esc(window.__SUPPORT_EMAIL || state.brand.support_email || 'support@vertexpluse.com')}</dd></div>
          </dl>
          <div class="account-actions">
            <a class="btn btn-primary" href="#/wallet">Funds</a>
            <a class="btn btn-ghost" href="/legacy-app.php#/kyc">KYC</a>
            <a class="btn btn-ghost" href="/legacy-app.php#/support">Support</a>
            <a class="btn btn-danger" href="/logout.php">Log out</a>
          </div>
        </div>
        <div class="panel account-menu">
          <h2>Workspace</h2>
          ${navItems().map((item) => `<a href="#/${item.route}"><span>${esc(item.icon)}</span><strong>${esc(item.label)}</strong><em>Open ${esc(item.label.toLowerCase())}</em></a>`).join('')}
        </div>
      </section>`;
  }

  function updateHomePositions() {
    const node = $('[data-home-positions]');
    if (!node) return;
    node.innerHTML = positionsTable((state.portfolio && state.portfolio.positions || []).slice(0, 4));
    bindCloseButtons(node);
  }

  function updatePositions() {
    const positions = (state.portfolio && state.portfolio.positions) || [];
    setText('[data-position-count]', `${positions.length} open`);
    const node = $('[data-positions-table]');
    if (node) {
      node.innerHTML = positionsTable(positions);
      bindCloseButtons(node);
    }
  }

  function updateOrders() {
    const node = $('[data-orders-table]');
    if (node) node.innerHTML = ordersTable(state.orders);
  }

  function positionsTable(items) {
    if (!items || !items.length) return emptyState('No open positions yet.');
    return `<table class="data-table">
      <thead><tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>PnL</th><th></th></tr></thead>
      <tbody>${items.map((p) => `
        <tr>
          <td><strong>${esc(cleanSymbol(p.symbol || ''))}</strong><small>${esc((p.market_type || 'spot').toUpperCase())}</small></td>
          <td><span class="side ${String(p.side).toLowerCase()}">${esc(String(p.side || '').toUpperCase())}</span></td>
          <td>${compact(p.qty || 0)}</td>
          <td>${price(p.entry_price || 0, p.asset_type)}</td>
          <td>${price(p.mark_price || 0, p.asset_type)}</td>
          <td class="${Number(p.unrealized_pnl || 0) >= 0 ? 'pos' : 'neg'}">${money(p.unrealized_pnl || 0)}</td>
          <td><button class="btn btn-ghost btn-sm" data-close-position="${escAttr(String(p.id || p.position_id || ''))}" type="button">Close</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
  }

  function ordersTable(items) {
    if (!items || !items.length) return emptyState('No orders yet.');
    return `<table class="data-table">
      <thead><tr><th>Symbol</th><th>Side</th><th>Type</th><th>Entry</th><th>Status</th><th>PnL</th></tr></thead>
      <tbody>${items.slice(0, 40).map((o) => `
        <tr>
          <td><strong>${esc(cleanSymbol(o.symbol || ''))}</strong><small>${esc((o.market_type || '').toUpperCase())}</small></td>
          <td><span class="side ${String(o.side).toLowerCase()}">${esc(String(o.side || '').toUpperCase())}</span></td>
          <td>${esc(o.order_type || 'MARKET')}</td>
          <td>${price(o.entry_price || o.fill_price || 0, o.asset_type)}</td>
          <td><span class="status-badge">${esc(o.status || 'open')}</span></td>
          <td class="${Number(o.pnl_usd || 0) >= 0 ? 'pos' : 'neg'}">${money(o.pnl_usd || 0)}</td>
        </tr>`).join('')}</tbody>
    </table>`;
  }

  function bindCloseButtons(root) {
    root.querySelectorAll('[data-close-position]').forEach((btn) => {
      btn.addEventListener('click', () => closePosition(Number(btn.dataset.closePosition || 0)));
    });
  }

  function updateWatchlist() {
    const list = $('[data-watch-list]');
    if (!list) return;
    const rows = filteredMarkets(state.type);
    list.innerHTML = rows.length ? rows.map(watchRow).join('') : emptyState('No symbols found for this tab yet.');
    list.querySelectorAll('[data-watch-symbol]').forEach((row) => {
      row.addEventListener('click', () => selectSymbol(row.dataset.watchSymbol, row.dataset.watchType, row.dataset.watchMarket));
    });
  }

  function watchRow(m) {
    const quote = mergedQuote(m);
    const q = quoteState(quote);
    const active = m.symbol === state.symbol ? ' active' : '';
    return `<button class="watch-row${active}" type="button" data-watch-symbol="${escAttr(m.symbol)}" data-watch-type="${escAttr(m.type || state.type)}" data-watch-market="${escAttr(m.market || defaultMarket(m.type))}">
      <span class="asset-badge ${q.className}">${esc(assetInitial(m.symbol))}</span>
      <span class="watch-name"><strong>${esc(m.symbol)}</strong><small>${esc(m.name || m.symbol)}</small></span>
      <span class="watch-price"><strong>${quote.price > 0 ? price(quote.price, m.type) : '--'}</strong><small class="${q.changeClass}">${pct(quote.change_pct)}</small></span>
    </button>`;
  }

  function markWatchlistStale() {
    const list = $('[data-watch-list]');
    if (list) list.classList.add('is-stale');
  }

  function updateActiveQuoteUI() {
    const quote = state.activeQuote || {};
    const q = quoteState(quote);
    const activeMarket = activeMarketRow();
    setText('[data-active-symbol]', state.symbol);
    setText('[data-active-name]', activeMarket.name || state.symbol);
    setText('[data-active-price]', quote.price > 0 ? price(quote.price, state.type) : '--');
    setText('[data-active-change]', pct(quote.change_pct));
    setText('[data-source-pill]', q.label);
    setText('[data-source-label]', quote.source ? `Source: ${quote.source}` : 'Quote authority');
    setClass('[data-source-pill]', `quality-pill ${q.className}`);
    const changeNode = $('[data-active-change]');
    if (changeNode) changeNode.className = q.changeClass;
    setText('[data-ticket-sell]', quote.price > 0 ? price(quote.price, state.type) : '--');
    setText('[data-ticket-buy]', quote.price > 0 ? price(quote.price, state.type) : '--');
    updateTicketMetrics();
    updateTradeSummary();
  }

  function updateTradeSummary() {
    if (state.route !== 'trade') return;
    const wallet = activeWallet();
    const pnl = Number((state.portfolio && (state.portfolio.open_pnl ?? state.portfolio.unrealized_pnl)) || 0);
    const q = quoteState(state.activeQuote || {});
    setText('[data-trade-available]', `${money(wallet.available ?? 0)} ${wallet.currency || ''}`.trim());
    setText('[data-trade-pnl]', money(pnl));
    setText('[data-trade-quality]', q.label);
    const pnlNode = $('[data-trade-pnl]');
    if (pnlNode) pnlNode.className = pnl >= 0 ? 'pos' : 'neg';
  }

  function renderTicketOnly() {
    const panel = $('.ticket-panel');
    if (!panel || state.route !== 'trade') return;
    panel.innerHTML = orderTicket();
    bindTicketEvents();
  }

  function bindTicketEvents() {
    const panel = $('.ticket-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-order-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.orderType = btn.dataset.orderType || 'MARKET';
        renderTicketOnly();
      });
    });
    panel.querySelector('[data-order-amount]')?.addEventListener('input', (event) => {
      state.amount = parseNumber(event.target.value) || DEFAULT_AMOUNT;
      updateTicketMetrics();
    });
    panel.querySelector('[data-leverage]')?.addEventListener('change', (event) => {
      state.leverage = Number(event.target.value || 1);
      updateTicketMetrics();
    });
    panel.querySelectorAll('[data-place]').forEach((btn) => {
      btn.addEventListener('click', () => placeOrder(btn.dataset.place));
    });
  }

  function updateTicketWallet() {
    const node = $('[data-ticket-wallet]');
    if (!node) return;
    const wallet = activeWallet();
    node.innerHTML = `<span>You have</span><strong>${money(wallet.available ?? 0)} ${esc(wallet.currency || '')}</strong>`;
    updateTradeSummary();
  }

  function updateTicketMetrics() {
    const amount = parseNumber($('[data-order-amount]')?.value) || state.amount || DEFAULT_AMOUNT;
    const lev = Number($('[data-leverage]')?.value || state.leverage || 1);
    const p = Number(state.activeQuote?.price || 0);
    state.amount = amount;
    state.leverage = lev;
    const metrics = $('.ticket-metrics');
    if (!metrics) return;
    const units = p > 0 ? (amount * (state.market === 'perp' ? lev : 1)) / p : 0;
    metrics.innerHTML = `<div><small>Initial margin</small><strong>${money(amount)}</strong></div>
      <div><small>Units</small><strong>${units > 0 ? compact(units) : '--'}</strong></div>`;
  }

  function ensureChart() {
    const box = $('#liteChart');
    if (!box || !window.LightweightCharts) {
      setChartMessage('Chart library unavailable.');
      return;
    }
    if (runtime.chart && runtime.candleSeries) return;
    box.innerHTML = '';
    runtime.chart = window.LightweightCharts.createChart(box, {
      layout: { background: { color: '#0a1422' }, textColor: '#9fb1d1' },
      grid: { vertLines: { color: 'rgba(130, 160, 220, .09)' }, horzLines: { color: 'rgba(130, 160, 220, .09)' } },
      rightPriceScale: { borderColor: 'rgba(130, 160, 220, .12)' },
      timeScale: { borderColor: 'rgba(130, 160, 220, .12)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true
    });
    runtime.candleSeries = runtime.chart.addCandlestickSeries({
      upColor: '#24d28d',
      downColor: '#ff5c7c',
      wickUpColor: '#24d28d',
      wickDownColor: '#ff5c7c',
      borderVisible: false,
      priceLineColor: '#55aaff'
    });
    if (typeof runtime.chart.addHistogramSeries === 'function') {
      runtime.volumeSeries = runtime.chart.addHistogramSeries({
        color: 'rgba(68, 122, 255, .32)',
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });
      runtime.volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    }
    if ('ResizeObserver' in window) {
      runtime.chartResize = new ResizeObserver(() => {
        try { runtime.chart.timeScale().fitContent(); } catch (e) {}
      });
      runtime.chartResize.observe(box);
    }
  }

  function destroyChart() {
    if (runtime.chartResize) runtime.chartResize.disconnect();
    runtime.chartResize = null;
    if (runtime.chart) {
      try { runtime.chart.remove(); } catch (e) {}
    }
    runtime.chart = null;
    runtime.candleSeries = null;
    runtime.volumeSeries = null;
    runtime.lastCandle = null;
  }

  function updateChartTail(quote) {
    if (!quote || runtime.chartUnavailable || !runtime.candleSeries || !runtime.lastCandle) return;
    if (quoteState(quote).className.includes('unavailable')) return;
    const p = Number(quote.price || 0);
    if (!(p > 0)) return;
    const step = tfSeconds(state.tf);
    const nowBucket = Math.floor(Date.now() / 1000 / step) * step;
    let candle = Object.assign({}, runtime.lastCandle);
    if (nowBucket > candle.time) {
      candle = { time: nowBucket, open: p, high: p, low: p, close: p, volume: 0 };
    } else {
      candle.close = p;
      candle.high = Math.max(Number(candle.high || p), p);
      candle.low = Math.min(Number(candle.low || p), p);
    }
    runtime.lastCandle = candle;
    runtime.candleSeries.update(stripVolume(candle));
    if (runtime.volumeSeries) runtime.volumeSeries.update(volumePoint(candle));
  }

  function setChartMessage(message) {
    const overlay = $('[data-chart-overlay]');
    if (!overlay) return;
    overlay.textContent = message || '';
    overlay.classList.toggle('is-hidden', !message);
  }

  function selectSymbol(symbol, type, market) {
    state.symbol = cleanSymbol(symbol || state.symbol);
    if (type && TYPE_BY_KEY[type]) state.type = type;
    state.market = market || defaultMarket(state.type);
    state.search = '';
    goTrade();
  }

  function goTrade() {
    rememberSelection();
    const query = new URLSearchParams({ symbol: state.symbol, type: state.type, market: state.market || defaultMarket(state.type), tf: state.tf });
    location.hash = `#/trade?${query.toString()}`;
  }

  function clearRuntime() {
    runtime.timers.forEach((id) => clearInterval(id));
    runtime.timers.clear();
    runtime.controllers.forEach((ctrl) => {
      try { ctrl.abort(); } catch (e) {}
    });
    runtime.controllers.clear();
    runtime.pending = freshPending();
    destroyChart();
  }

  function setTimer(fn, ms) {
    const id = setInterval(fn, ms);
    runtime.timers.add(id);
    return id;
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 8000);
    if (!options.noAbortTrack) runtime.controllers.add(controller);
    const headers = Object.assign({ 'Accept': 'application/json' }, options.headers || {});
    const init = Object.assign({}, options, {
      headers,
      credentials: 'same-origin',
      signal: controller.signal
    });
    delete init.timeout;
    delete init.noAbortTrack;
    try {
      const res = await fetch(API + path, init);
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { ok: false, error: text || res.statusText }; }
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      return data;
    } finally {
      clearTimeout(timeout);
      runtime.controllers.delete(controller);
    }
  }

  function isToken(token) {
    return token === runtime.routeToken;
  }

  function isAbort(err) {
    return err && (err.name === 'AbortError' || /aborted/i.test(err.message || ''));
  }

  function normalizeBootMarkets(groups) {
    const out = {};
    TYPES.forEach((t) => {
      const rows = Array.isArray(groups[t.key]) ? groups[t.key] : [];
      out[t.key] = normalizeMarketItems(rows, t.key);
    });
    return out;
  }

  function normalizeMarketItems(items, fallbackType) {
    return (Array.isArray(items) ? items : []).map((m) => {
      const type = TYPE_BY_KEY[m.type] ? m.type : fallbackType;
      return {
        symbol: cleanSymbol(m.symbol || ''),
        name: String(m.name || m.symbol || 'Market'),
        type,
        market: m.market || defaultMarket(type),
        price: Number(m.price || m.q_price || 0),
        change_pct: Number(m.change_pct || m.q_change || 0),
        updated_at: Number(m.updated_at || m.q_updated || 0),
        source: String(m.source || 'cache'),
        timing_class: String(m.timing_class || ''),
        icon_url: m.icon_url || null
      };
    }).filter((m) => m.symbol);
  }

  function normalizeQuote(q, fallbackType) {
    const type = TYPE_BY_KEY[q.type] ? q.type : fallbackType;
    return {
      symbol: cleanSymbol(q.symbol || state.symbol),
      type,
      price: Number(q.price || q.mark_price || q.close || 0),
      change_pct: Number(q.change_pct || q.change || 0),
      updated_at: Number(q.updated_at || 0),
      source: String(q.source || 'unavailable'),
      timing_class: String(q.timing_class || ''),
      is_stale: !!q.is_stale
    };
  }

  function normalizeCandles(items) {
    return (Array.isArray(items) ? items : []).map((c) => ({
      time: Number(c.time || c.t || 0),
      open: Number(c.open || c.o || 0),
      high: Number(c.high || c.h || 0),
      low: Number(c.low || c.l || 0),
      close: Number(c.close || c.c || 0),
      volume: Number(c.volume || c.v || 0)
    })).filter((c) => c.time > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
  }

  function stripVolume(c) {
    return { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
  }

  function volumePoint(c) {
    return { time: c.time, value: Number(c.volume || 0), color: c.close >= c.open ? 'rgba(36,210,141,.32)' : 'rgba(255,92,124,.28)' };
  }

  function quoteMap(items) {
    const out = {};
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const q = normalizeQuote(item, state.type);
        if (q.symbol) out[q.symbol] = q;
      });
    } else if (items && typeof items === 'object') {
      Object.keys(items).forEach((key) => {
        const q = normalizeQuote(Object.assign({ symbol: key }, items[key] || {}), state.type);
        if (q.symbol) out[q.symbol] = q;
      });
    }
    return out;
  }

  function firstQuote(payload) {
    if (Array.isArray(payload)) return payload[0] || null;
    if (payload && Array.isArray(payload.items)) return payload.items[0] || null;
    if (payload && typeof payload === 'object' && payload.symbol) return payload;
    if (payload && typeof payload === 'object') {
      const first = Object.values(payload).find((x) => x && typeof x === 'object');
      return first || null;
    }
    return null;
  }

  function mergeQuotesIntoMarkets(type, map) {
    const rows = state.markets[type] || [];
    rows.forEach((m) => {
      const q = map[m.symbol];
      if (q && q.price > 0) Object.assign(m, q);
    });
  }

  function mergedQuote(m) {
    const live = state.visibleQuotes[m.symbol];
    return Object.assign({}, m, live || {});
  }

  function quoteState(q) {
    const source = String(q && q.source || '').toLowerCase();
    const timing = String(q && q.timing_class || '').toLowerCase();
    const stale = !!(q && q.is_stale);
    const bad = !q || !(Number(q.price || 0) > 0) || source.includes('synthetic') || source.includes('seed');
    if (bad) return { label: 'Unavailable', className: 'is-unavailable', changeClass: 'muted' };
    if (stale || timing === 'stale') return { label: 'Stale', className: 'is-stale', changeClass: changeClass(q.change_pct) };
    if (timing === 'delayed' || source.includes('yahoo')) return { label: 'Delayed', className: 'is-delayed', changeClass: changeClass(q.change_pct) };
    return { label: 'Live', className: 'is-live', changeClass: changeClass(q.change_pct) };
  }

  function filteredMarkets(type) {
    const rows = (state.markets[type] && state.markets[type].length ? state.markets[type] : fallbackMarkets(type));
    const term = state.search.trim().toLowerCase();
    if (!term) return rows.slice(0, 80);
    return rows.filter((m) => `${m.symbol} ${m.name}`.toLowerCase().includes(term)).slice(0, 80);
  }

  function fallbackMarkets(type) {
    const def = TYPE_BY_KEY[type] || TYPE_BY_KEY.crypto;
    const defaults = {
      crypto: [['BTCUSDT', 'Bitcoin'], ['ETHUSDT', 'Ethereum'], ['BNBUSDT', 'BNB'], ['SOLUSDT', 'Solana'], ['XRPUSDT', 'XRP'], ['DOGEUSDT', 'Dogecoin'], ['ADAUSDT', 'Cardano'], ['LINKUSDT', 'Chainlink']],
      forex: [['EURUSD', 'Euro / US Dollar'], ['GBPUSD', 'British Pound / US Dollar'], ['USDJPY', 'US Dollar / Yen'], ['AUDUSD', 'Australian Dollar / US Dollar'], ['USDCAD', 'US Dollar / Canadian Dollar'], ['USDCHF', 'US Dollar / Swiss Franc'], ['NZDUSD', 'New Zealand Dollar / US Dollar'], ['EURJPY', 'Euro / Yen']],
      stocks: [['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft'], ['TSLA', 'Tesla'], ['NVDA', 'NVIDIA'], ['AMZN', 'Amazon'], ['GOOGL', 'Alphabet'], ['META', 'Meta Platforms'], ['NFLX', 'Netflix']],
      commodities: [['XAUUSD', 'Gold Spot'], ['XAGUSD', 'Silver Spot'], ['USOIL', 'WTI Crude Oil'], ['UKOIL', 'Brent Crude Oil'], ['NGAS', 'Natural Gas'], ['COPPER', 'Copper'], ['PLAT', 'Platinum'], ['PALL', 'Palladium']],
      futures: [['ES_F', 'E-mini S&P 500 Future'], ['NQ_F', 'E-mini Nasdaq Future'], ['YM_F', 'E-mini Dow Future'], ['RTY_F', 'E-mini Russell Future'], ['CL_F', 'WTI Crude Future'], ['GC_F', 'Gold Future'], ['ZN_F', '10Y Treasury Note Future'], ['ZB_F', '30Y Treasury Bond Future']],
      arab: [['2222', 'Saudi Aramco'], ['1120', 'Al Rajhi Bank'], ['2010', 'SABIC'], ['7010', 'stc'], ['1211', 'Maaden'], ['1150', 'Alinma Bank'], ['1180', 'Saudi National Bank'], ['2280', 'Almarai']]
    };
    return (defaults[type] || [[def.symbol, def.name]]).map(([symbol, name]) => ({
      symbol,
      name,
      type,
      market: defaultMarket(type),
      price: 0,
      change_pct: 0,
      source: 'unavailable'
    }));
  }

  function collectFeaturedMarkets() {
    const out = [];
    TYPES.slice(0, 5).forEach((t) => out.push(...filteredMarkets(t.key).slice(0, 2)));
    return out.slice(0, 8);
  }

  function primeSelectionFromMarkets() {
    if (!state.markets[state.type]?.some((m) => m.symbol === state.symbol)) {
      state.symbol = firstMarketSymbol(state.type) || (TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto).symbol;
      state.market = defaultMarket(state.type);
    }
  }

  function firstMarketSymbol(type) {
    return (state.markets[type] && state.markets[type][0] && state.markets[type][0].symbol) || '';
  }

  function activeMarketRow() {
    return (state.markets[state.type] || []).find((m) => m.symbol === state.symbol) || fallbackMarkets(state.type).find((m) => m.symbol === state.symbol) || { symbol: state.symbol, name: state.symbol, type: state.type };
  }

  function activeMarketName() {
    return activeMarketRow().name || state.symbol;
  }

  function activeWallet() {
    const wallet = state.wallet || {};
    return state.mode === 'real' ? (wallet.real || {}) : (wallet.demo || {});
  }

  function defaultMarket(type) {
    return type === 'futures' ? 'perp' : 'spot';
  }

  function rememberSelection() {
    safeStorage('vp_market_type', state.type, true);
    safeStorage('vp_symbol', state.symbol, true);
    safeStorage('vp_market', state.market || defaultMarket(state.type), true);
    safeStorage('vp_tf', state.tf, true);
  }

  function safeStorage(key, value, write = false) {
    try {
      if (write) {
        localStorage.setItem(key, value);
        return value;
      }
      return localStorage.getItem(key) || value;
    } catch (e) {
      return value;
    }
  }

  function showToast(message, tone = 'ok') {
    let toast = $('.toast-stack');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-stack';
      document.body.appendChild(toast);
    }
    const item = document.createElement('div');
    item.className = `toast ${tone}`;
    item.textContent = message;
    toast.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  function emptyState(text) {
    return `<div class="empty-state">${esc(text)}</div>`;
  }

  function userInitials() {
    const user = state.user || {};
    const src = String(user.name || user.username || user.email || 'VP');
    const parts = src.split(/[\s@._-]+/).filter(Boolean);
    return (parts[0]?.[0] || 'V').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  }

  function assetInitial(symbol) {
    return String(symbol || 'V').replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || 'V';
  }

  function cleanSymbol(value) {
    return String(value || '').replace(/^@[RD]@/, '').trim().toUpperCase();
  }

  function tfSeconds(tf) {
    if (tf === '5m') return 300;
    if (tf === '15m') return 900;
    if (tf === '30m') return 1800;
    if (tf === '1h') return 3600;
    return 60;
  }

  function parseNumber(value) {
    const n = Number(String(value || '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  function money(value) {
    return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function price(value, type) {
    const n = Number(value || 0);
    if (!(n > 0)) return '--';
    const digits = type === 'forex' ? 5 : n >= 1000 ? 2 : n >= 1 ? 4 : 6;
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits })}`;
  }

  function trimPrice(value) {
    const n = Number(value || 0);
    if (!(n > 0)) return '';
    return n.toFixed(n >= 1000 ? 2 : n >= 1 ? 5 : 6);
  }

  function compact(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '--';
    return n.toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 2 : 6 });
  }

  function pct(value) {
    const n = Number(value || 0);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  }

  function changeClass(value) {
    return Number(value || 0) >= 0 ? 'pos' : 'neg';
  }

  function setText(selector, text) {
    const node = $(selector);
    if (node) node.textContent = text;
  }

  function setClass(selector, className) {
    const node = $(selector);
    if (node) node.className = className;
  }

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, '&#96;');
  }
})();
