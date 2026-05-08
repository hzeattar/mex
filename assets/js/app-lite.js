(() => {
  'use strict';

  const API = '/api';
  const ACTIVE_QUOTE_MS = 1500;
  const WATCHLIST_QUOTE_MS = 4000;
  const MIN_QUOTE_MS = 1000;
  const FAST_QUOTE_MS = 1200;
  const SLOW_QUOTE_MS = 2500;
  const TRADE_MOBILE_BREAKPOINT = 768;
  const ACCOUNT_POLL_MS = 15000;
  const FINANCE_POLL_MS = 18000;
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
  const MARKET_TABS = [
    { key: 'favorites', label: 'Favorites' },
    { key: 'all', label: 'All' },
    ...TYPES.map((item) => ({ key: item.key, label: displayTypeLabel(item.key) }))
  ];
  const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h'];
  const ROUTES = ['home', 'trade', 'portfolio', 'wallet', 'deposit', 'withdraw', 'kyc', 'invest', 'account'];
  const ROUTE_ALIASES = { assets: 'wallet', funds: 'wallet', earn: 'invest', contracts: 'invest', levels: 'invest' };
  const MARKET_ICON_PATH = './assets/img/markets/';
  const UI_ASSET_PATH = './assets/img/ui/';
  const UI_ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/><path d="M9 21v-6h6v6"/></svg>',
    trade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V8"/><path d="M12 19V4"/><path d="M19 19v-9"/><path d="M3 19h18"/><path d="M7 8H3"/><path d="M14 4h-4"/><path d="M21 10h-4"/></svg>',
    portfolio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2"/><path d="M4 12h16"/><path d="M10 12v2h4v-2"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z"/><path d="M16 12h4v4h-4a2 2 0 1 1 0-4Z"/><path d="M6 9h10"/></svg>',
    earn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"/><path d="M7 7h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17"/><path d="M5 11l-3 3 3 3"/><path d="m19 7 3 3-3 3"/></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    deposit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/></svg>',
    withdraw: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 5h16"/></svg>',
    kyc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/><path d="m16 17 1 1 3-3"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18v-6a7 7 0 0 1 14 0v6"/><path d="M5 13H3v4h2"/><path d="M19 13h2v4h-2"/><path d="M14 20h2a3 3 0 0 0 3-3"/></svg>',
    legacy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="M9 9h6v6H9z"/><path d="M3 9h2"/><path d="M3 15h2"/><path d="M19 9h2"/><path d="M19 15h2"/></svg>'
  };
  const SYMBOL_VISUALS = {
    BTCUSDT: { short: 'BTC', family: 'crypto', icon: MARKET_ICON_PATH + 'btc.svg' },
    ETHUSDT: { short: 'ETH', family: 'crypto', icon: MARKET_ICON_PATH + 'eth.svg' },
    SOLUSDT: { short: 'SOL', family: 'crypto', icon: MARKET_ICON_PATH + 'sol.svg' },
    BNBUSDT: { short: 'BNB', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    XRPUSDT: { short: 'XRP', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    ADAUSDT: { short: 'ADA', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    AVAXUSDT: { short: 'AVAX', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    DOTUSDT: { short: 'DOT', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    LINKUSDT: { short: 'LINK', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    DOGEUSDT: { short: 'DOGE', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    USDCUSDT: { short: 'USDC', family: 'crypto', icon: MARKET_ICON_PATH + 'usdc.svg' },
    EURUSD: { short: 'EUR', family: 'forex', icon: MARKET_ICON_PATH + 'forex.svg' },
    GBPUSD: { short: 'GBP', family: 'forex', icon: MARKET_ICON_PATH + 'forex.svg' },
    USDJPY: { short: 'JPY', family: 'forex', icon: MARKET_ICON_PATH + 'forex.svg' },
    AUDUSD: { short: 'AUD', family: 'forex', icon: MARKET_ICON_PATH + 'forex.svg' },
    XAUUSD: { short: 'XAU', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    XAGUSD: { short: 'XAG', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    USOIL: { short: 'OIL', family: 'energy', icon: MARKET_ICON_PATH + 'oil.svg' },
    UKOIL: { short: 'OIL', family: 'energy', icon: MARKET_ICON_PATH + 'oil.svg' },
    NGAS: { short: 'GAS', family: 'energy', icon: MARKET_ICON_PATH + 'oil.svg' },
    COPPER: { short: 'CU', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    PLAT: { short: 'PT', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    PALL: { short: 'PD', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    AAPL: { short: 'AAPL', family: 'equity', icon: MARKET_ICON_PATH + 'apple.svg' },
    MSFT: { short: 'MSFT', family: 'equity', icon: MARKET_ICON_PATH + 'microsoft.svg' },
    TSLA: { short: 'TSLA', family: 'equity', icon: MARKET_ICON_PATH + 'stock.svg' },
    NVDA: { short: 'NVDA', family: 'equity', icon: MARKET_ICON_PATH + 'stock.svg' },
    AMZN: { short: 'AMZN', family: 'equity', icon: MARKET_ICON_PATH + 'stock.svg' },
    GOOGL: { short: 'GOOGL', family: 'equity', icon: MARKET_ICON_PATH + 'stock.svg' },
    SPX500: { short: 'SPX', family: 'index', icon: MARKET_ICON_PATH + 'stock.svg' },
    NAS100: { short: 'NAS', family: 'index', icon: MARKET_ICON_PATH + 'stock.svg' },
    ES_F: { short: 'ES', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    NQ_F: { short: 'NQ', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    YM_F: { short: 'YM', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    RTY_F: { short: 'RTY', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    NKD_F: { short: 'NKD', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    CL_F: { short: 'CL', family: 'future', icon: MARKET_ICON_PATH + 'oil.svg' },
    BZ_F: { short: 'BZ', family: 'future', icon: MARKET_ICON_PATH + 'oil.svg' },
    GC_F: { short: 'GC', family: 'future', icon: MARKET_ICON_PATH + 'metal.svg' },
    SI_F: { short: 'SI', family: 'future', icon: MARKET_ICON_PATH + 'metal.svg' },
    NG_F: { short: 'NG', family: 'future', icon: MARKET_ICON_PATH + 'oil.svg' },
    ZN_F: { short: 'ZN', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    ZB_F: { short: 'ZB', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    '2222': { short: '2222', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '1120': { short: '1120', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '2010': { short: '2010', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '7010': { short: '7010', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '1211': { short: '1211', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '1150': { short: '1150', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '1180': { short: '1180', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '2280': { short: '2280', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '4002': { short: '4002', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' },
    '4300': { short: '4300', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' }
  };
  const TYPE_VISUALS = {
    crypto: { short: 'CR', family: 'crypto', icon: MARKET_ICON_PATH + 'crypto.svg' },
    forex: { short: 'FX', family: 'forex', icon: MARKET_ICON_PATH + 'forex.svg' },
    stocks: { short: 'EQ', family: 'equity', icon: MARKET_ICON_PATH + 'stock.svg' },
    commodities: { short: 'CMD', family: 'metal', icon: MARKET_ICON_PATH + 'metal.svg' },
    futures: { short: 'FUT', family: 'future', icon: MARKET_ICON_PATH + 'future.svg' },
    arab: { short: 'AR', family: 'arab', icon: MARKET_ICON_PATH + 'arab.svg' }
  };

  const state = {
    route: 'home',
    lang: safeStorage('vp_lang', browserLang()),
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
    marketTab: safeStorage('vp_market_tab', safeStorage('vp_market_type', 'crypto')),
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
    finance: {
      deposits: [],
      withdrawals: [],
      ledger: []
    },
    kyc: null,
    level: null,
    invest: {
      tab: safeStorage('vp_earn_tab', 'copy') === 'contracts' ? 'contracts' : 'copy',
      signals: [],
      tradeSignals: [],
      copies: [],
      contracts: [],
      mine: []
    },
    paymentMethods: {
      deposit: [],
      withdraw: []
    },
    paymentCategories: {
      deposit: [],
      withdraw: []
    },
    funding: {
      kind: 'deposit',
      method: '',
      amount: 100,
      currency: 'USDT',
      result: null
    },
    lastError: ''
  };

  if (!TYPE_BY_KEY[state.type]) state.type = 'crypto';
  if (!MARKET_TABS.some((tab) => tab.key === state.marketTab)) state.marketTab = state.type;
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
    candles: [],
    maSeries: null,
    emaSeries: null,
    chartTools: { crosshair: true, ma: false, ema: false },
    chartFullscreen: false,
    chartUnavailable: false,
    quoteCadence: ACTIVE_QUOTE_MS,
    watchCadence: WATCHLIST_QUOTE_MS,
    tradeViewport: computeTradeMobile() ? 'mobile' : 'desktop',
    resizeTimer: null,
    cleanups: [],
    pending: freshPending()
  };

  const app = document.getElementById('app');
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('error', handleMarketLogoError, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  function freshPending() {
    return {
      markets: false,
      visibleQuotes: false,
      activeQuote: false,
      candles: false,
      account: false,
      wallet: false,
      finance: false,
      kyc: false,
      invest: false,
      signals: false,
      funding: false
    };
  }

  function handleMarketLogoError(event) {
    const target = event.target;
    if (!target || !target.matches || !target.matches('.market-logo img')) return;
    const parent = target.parentNode;
    target.remove();
    if (parent && parent.classList) parent.classList.add('fallback');
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
      state.kyc = data.kyc || null;
      state.level = data.level || null;
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
            <a class="btn btn-ghost" href="mailto:support@vertexpluse.com">Support</a>
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
            <span class="brand-mark brand-svg-mark">${buildBrandLogoSvg(state.brand.name, state.brand.tagline)}</span>
            <span class="brand-word">${esc(state.brand.name || 'Vertex')}</span>
          </a>
          <nav class="rail-nav" aria-label="Primary">
            ${navItems().map(navButton).join('')}
          </nav>
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
      { route: 'home', label: 'Home', icon: 'home' },
      { route: 'trade', label: 'Trade', icon: 'trade' },
      { route: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
      { route: 'wallet', label: 'Assets', icon: 'wallet' },
      { route: 'invest', label: 'Earn', icon: 'earn' },
      { route: 'account', label: 'Account', icon: 'account' }
    ];
  }

  function navButton(item) {
    return `<a class="nav-pill" data-nav="${item.route}" href="#/${item.route}" title="${esc(item.label)}">
      <span>${uiIcon(item.icon)}</span><em>${esc(item.label)}</em>
    </a>`;
  }

  function applyRoute() {
    runtime.routeToken += 1;
    clearRuntime();

    const parsed = parseHash();
    state.route = parsed.route;
    if (parsed.params.type && TYPE_BY_KEY[parsed.params.type]) {
      state.type = parsed.params.type;
      state.marketTab = parsed.params.type;
    }
    if (parsed.params.symbol) state.symbol = cleanSymbol(parsed.params.symbol);
    if (parsed.params.market) state.market = parsed.params.market === 'perp' ? 'perp' : 'spot';
    if (parsed.params.tf && TIMEFRAMES.includes(parsed.params.tf)) state.tf = parsed.params.tf;
    rememberSelection();

    syncShell();
    renderTopbar();
    if (state.route === 'trade') renderTrade();
    else if (state.route === 'portfolio') renderPortfolio();
    else if (state.route === 'wallet') renderWallet();
    else if (state.route === 'deposit' || state.route === 'withdraw') renderFunding(state.route);
    else if (state.route === 'kyc') renderKyc();
    else if (state.route === 'invest') renderInvest();
    else if (state.route === 'account') renderAccount();
    else renderHome();
  }

  function parseHash() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const normalized = ROUTE_ALIASES[path] || path;
    const route = ROUTES.includes(normalized) ? normalized : 'home';
    const params = Object.fromEntries(new URLSearchParams(query));
    return { route, params };
  }

  function syncShell() {
    app.querySelectorAll('[data-nav]').forEach((el) => {
      const nav = el.getAttribute('data-nav');
      const activeRoute = ['deposit', 'withdraw', 'kyc'].includes(state.route) ? (state.route === 'kyc' ? 'account' : 'wallet') : state.route;
      el.classList.toggle('active', nav === activeRoute);
    });
  }

  function renderTopbar() {
    const wallet = activeWallet();
    const type = TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto;
    const kyc = kycStatusLabel();
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
        <a class="status-chip ${kyc.className}" href="#/kyc">
          <small>KYC</small>
          <strong>${esc(kyc.label)}</strong>
        </a>
        <button class="user-chip" type="button" data-user-menu title="Account">
          <span>${esc(userInitials())}</span>
          <em>${esc((state.user && (state.user.email || state.user.username)) || 'Account')}</em>
        </button>
      </div>`;
    $('[data-mode-toggle]')?.addEventListener('click', () => {
      setTradeMode(state.mode === 'real' ? 'demo' : 'real', { promptKyc: true });
    });
    $('[data-user-menu]')?.addEventListener('click', () => {
      location.hash = '#/account';
    });
  }

  function routeTitle() {
    if (state.route === 'trade') return `${state.symbol || 'Market'} Trading`;
    if (state.route === 'portfolio') return 'Portfolio';
    if (state.route === 'wallet') return 'Assets';
    if (state.route === 'deposit') return 'Deposit';
    if (state.route === 'withdraw') return 'Withdraw';
    if (state.route === 'kyc') return 'KYC Verification';
    if (state.route === 'invest') return 'Copy & Contracts';
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
            <a class="btn btn-ghost" href="#/deposit">Deposit</a>
            <a class="btn btn-ghost" href="#/invest">Earn</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-balance">
            <small>${state.mode.toUpperCase()} BALANCE</small>
            <strong>${money(wallet.available ?? wallet.balance ?? 0)}</strong>
            <span>${esc(wallet.currency || '')}</span>
          </div>
          <div class="hero-tape">
            ${featured.slice(0, 3).map((m) => {
              const quote = mergedQuote(m);
              const q = quoteState(quote);
              return `<button type="button" data-symbol="${escAttr(m.symbol)}" data-type="${escAttr(m.type || state.type)}" data-market="${escAttr(m.market || defaultMarket(m.type))}">
                ${marketLogo(m, q.className)}
                <span><strong>${esc(m.symbol)}</strong><small class="${q.changeClass}">${pct(quote.change_pct)}</small></span>
                <em>${quote.price > 0 ? price(quote.price, m.type) : '--'}</em>
              </button>`;
            }).join('')}
          </div>
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
            <span class="eyebrow">Workspace</span>
            <h2>Quick actions</h2>
          </div>
        </div>
        <div class="quick-grid">
          ${quickAction('Deposit', 'Start a real funding request', '#/deposit', 'deposit')}
          ${quickAction('Withdraw', 'Request a manual payout review', '#/withdraw', 'withdraw')}
          ${quickAction('KYC', 'Verify account documents', '#/kyc', 'kyc')}
          ${quickAction('Earn', 'Copy signals and level contracts', '#/invest', 'earn')}
          ${quickAction('Support', 'Help desk and account guidance', '#/account', 'support')}
        </div>
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

  function quickAction(title, sub, href, icon) {
    return `<a class="quick-action" href="${escAttr(href)}">
      <span class="quick-icon">${uiIcon(icon)}</span>
      <strong>${esc(title)}</strong>
      <small>${esc(sub)}</small>
    </a>`;
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
      <span class="market-tile-top">
        ${marketLogo(m, q.className)}
        <span class="quality-pill ${q.className}">${esc(q.label)}</span>
      </span>
      <em>${esc(m.symbol)}</em>
      <span class="market-tile-name">${esc(m.name || displayTypeLabel(m.type))}</span>
      <strong>${quote.price > 0 ? price(quote.price, m.type) : '--'}</strong>
      <small class="${q.changeClass}">${pct(quote.change_pct)}</small>
    </button>`;
  }

  function renderTrade() {
    const type = TYPE_BY_KEY[state.type] || TYPE_BY_KEY.crypto;
    const market = state.market || type.market;
    const rows = filteredMarkets(state.marketTab || state.type);
    const isMobile = computeTradeMobile();
    runtime.tradeViewport = isMobile ? 'mobile' : 'desktop';
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

      <section class="trade-layout ${isMobile ? 'trade-mobile-stack' : 'trade-grid-desktop'}">
        <aside class="panel watch-panel">
          <div class="section-head compact">
            <div>
              <h2>Symbols</h2>
              <p>Select the market you want to trade</p>
            </div>
            <button class="icon-btn" type="button" data-refresh-markets title="Refresh markets">R</button>
          </div>
          <div class="type-tabs">
            ${MARKET_TABS.map((item) => `<button class="${item.key === (state.marketTab || state.type) ? 'active' : ''}" data-type-tab="${item.key}" type="button">${esc(item.label)}</button>`).join('')}
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
            <div class="chart-tools-bar">
              <button class="${runtime.chartTools.crosshair ? 'active' : ''}" type="button" data-chart-tool="crosshair">Crosshair</button>
              <button class="${runtime.chartTools.ma ? 'active' : ''}" type="button" data-chart-tool="ma">MA 20</button>
              <button class="${runtime.chartTools.ema ? 'active' : ''}" type="button" data-chart-tool="ema">EMA 9</button>
              <button type="button" data-chart-tool="reset">Reset</button>
              <button type="button" data-chart-tool="fullscreen">Fullscreen</button>
            </div>
            <div class="chart-wrap" data-chart-wrap>
              <div id="liteChart" class="chart-canvas"></div>
              <div class="chart-overlay" data-chart-overlay>Loading chart...</div>
            </div>
          </section>

          <section class="panel trade-signals-panel" data-trade-signals-panel>
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Copy Trading</span>
                <h2>Signals for ${esc(state.symbol)}</h2>
                <p>Real-only copy desk, loaded without fast polling.</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" data-refresh-signals>Refresh</button>
            </div>
            <div data-trade-signals-list>${emptyState('Loading copy signals...')}</div>
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
        const type = btn.dataset.typeTab || 'crypto';
        state.marketTab = type;
        state.search = '';
        if (TYPE_BY_KEY[type]) {
          const def = TYPE_BY_KEY[type] || TYPE_BY_KEY.crypto;
          state.type = type;
          state.market = def.market;
          state.symbol = firstMarketSymbol(type) || def.symbol;
          goTrade();
        } else {
          safeStorage('vp_market_tab', state.marketTab, true);
          updateWatchlist();
          hydrateVisibleQuotes(runtime.routeToken);
        }
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
    $('[data-refresh-signals]')?.addEventListener('click', () => loadTradeSignals(runtime.routeToken, true));
    $('#view').querySelectorAll('[data-chart-tool]').forEach((btn) => {
      btn.addEventListener('click', () => toggleChartTool(btn.dataset.chartTool, btn));
    });
    setupTradeViewportWatcher(runtime.routeToken);
  }

  function setupTrade(token, hardRefresh = false) {
    loadMarkets(token, hardRefresh);
    loadActiveQuote(token, true);
    loadCandles(token);
    loadTradingAccount(token, true);
    loadTradeSignals(token, true);
    loadKyc(token);
    setAdaptiveTimer(() => { if (!document.hidden) return loadActiveQuote(token, false); }, () => runtime.quoteCadence, token);
    setAdaptiveTimer(() => { if (!document.hidden) return hydrateVisibleQuotes(token); }, () => runtime.watchCadence, token);
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
    const visible = filteredMarkets(state.marketTab || state.type).slice(0, 10);
    const groups = visible.reduce((acc, m) => {
      const type = TYPE_BY_KEY[m.type] ? m.type : state.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(m.symbol);
      return acc;
    }, {});
    const groupEntries = Object.entries(groups).filter(([, symbols]) => symbols.length);
    if (!groupEntries.length) return;
    runtime.pending.visibleQuotes = true;
    try {
      const responses = await Promise.all(groupEntries.map(([type, symbols]) => (
        api(`/quotes.php?visible=1&type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(symbols.join(','))}&purpose=watchlist`, { timeout: type === 'crypto' ? 5000 : 6500 })
          .then((data) => ({ type, data }))
      )));
      if (!isToken(token)) return;
      responses.forEach(({ type, data }) => {
        if (!data || data.ok === false) return;
        const map = quoteMap(data.items || [], type);
        Object.assign(state.visibleQuotes, map);
        mergeQuotesIntoMarkets(type, map);
      });
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
    const started = performance.now ? performance.now() : Date.now();
    try {
      const data = await api(`/quotes.php?symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&purpose=focus`, { timeout: state.type === 'crypto' ? (immediate ? 7000 : 5000) : (immediate ? 10000 : 8500) });
      updateQuoteCadence((performance.now ? performance.now() : Date.now()) - started);
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

  async function loadTradeSignals(token, immediate = false) {
    if (runtime.pending.signals && !immediate) return;
    runtime.pending.signals = true;
    try {
      const data = await api(`/signals.php?bot=1&symbol=${encodeURIComponent(state.symbol)}&type=${encodeURIComponent(state.type)}&lang=en`, { timeout: immediate ? 8500 : 6500 });
      if (!isToken(token)) return;
      state.invest.tradeSignals = (data && data.ok !== false && Array.isArray(data.items)) ? data.items : [];
      renderTradeSignalsPanel();
    } catch (err) {
      if (!isAbort(err)) {
        state.invest.tradeSignals = [];
        renderTradeSignalsPanel(err.message || 'Copy signals unavailable');
      }
    } finally {
      runtime.pending.signals = false;
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
      runtime.candles = candles;
      runtime.candleSeries.setData(candles.map(stripVolume));
      if (runtime.volumeSeries) runtime.volumeSeries.setData(candles.map(volumePoint));
      runtime.lastCandle = Object.assign({}, candles[candles.length - 1]);
      refreshChartOverlays();
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
      const [wallet, deposits, withdrawals, ledger, kyc, level] = await Promise.all([
        api('/wallet/summary.php', { timeout: immediate ? 9000 : 6500 }),
        api('/deposits/list.php', { timeout: immediate ? 9000 : 6500 }),
        api('/withdrawals/list.php', { timeout: immediate ? 9000 : 6500 }),
        api('/wallet/ledger.php?per=25', { timeout: immediate ? 9000 : 6500 }),
        api('/kyc/status.php', { timeout: immediate ? 9000 : 6500 }),
        api('/user/level.php', { timeout: immediate ? 9000 : 6500 })
      ]);
      if (!isToken(token)) return;
      if (wallet && wallet.ok !== false) state.wallet = wallet;
      if (deposits && deposits.ok !== false) state.finance.deposits = deposits.items || [];
      if (withdrawals && withdrawals.ok !== false) state.finance.withdrawals = withdrawals.items || [];
      if (ledger && ledger.ok !== false) state.finance.ledger = ledger.items || [];
      if (kyc && kyc.ok !== false) state.kyc = kyc.kyc || null;
      if (level && level.ok !== false) state.level = level;
      renderTopbar();
      if (state.route === 'wallet') renderWalletBody();
    } catch (err) {
      if (!isAbort(err)) state.lastError = err.message || 'Wallet request failed';
    } finally {
      runtime.pending.wallet = false;
    }
  }

  async function placeOrder(side) {
    if (state.mode === 'real' && !isKycApproved()) { openKycRequiredDialog('trade'); return; }
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
          <span class="eyebrow">Assets</span>
          <h1>Funds desk</h1>
          <p>Wallets, manual deposits, withdrawals, ledger records, and account level status.</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/deposit">Deposit</a>
          <a class="btn btn-ghost" href="#/withdraw">Withdraw</a>
          <button class="btn btn-ghost" type="button" data-refresh-wallet>Refresh</button>
        </div>
      </section>
      <div data-wallet-body>${emptyState('Loading wallet...')}</div>`;
    $('[data-refresh-wallet]')?.addEventListener('click', () => loadWallet(token, true));
    loadWallet(token, true);
    setTimer(() => loadWallet(token, false), FINANCE_POLL_MS);
  }

  function renderWalletBody() {
    const wallet = state.wallet || {};
    const node = $('[data-wallet-body]');
    if (!node) return;
    const kyc = kycStatusLabel();
    const level = (state.level && state.level.current) || null;
    const next = (state.level && state.level.next) || null;
    const demoLocked = state.mode !== 'real';
    node.innerHTML = `
      ${demoLocked ? demoGateBanner('wallet') : buildRealWorkflowNotice('funding')}
      <div class="${demoLocked ? 'vp-page-preview-lock' : ''}">
      <section class="wallet-grid">
        ${walletCard('Demo wallet', wallet.demo || {})}
        ${walletCard('Real wallet', wallet.real || {})}
      </section>
      <section class="funds-grid">
        <article class="panel action-card">
          <span class="eyebrow">Verification</span>
          <h2>${esc(kyc.label)}</h2>
          <p>${esc(kyc.text)}</p>
          <a class="btn btn-primary" href="#/kyc">KYC Verification</a>
        </article>
        <article class="panel action-card">
          <span class="eyebrow">Customer level</span>
          <h2>${esc(levelName(level))}</h2>
          <p>${next ? `Next: ${esc(levelName(next))} at ${money(next.min_deposit_total || 0)} confirmed deposits.` : 'All available level benefits are active for this account.'}</p>
          <a class="btn btn-ghost" href="#/invest">View levels & contracts</a>
        </article>
      </section>
      <section class="panel">
        <div class="section-head">
          <div><span class="eyebrow">Funding</span><h2>Manual requests</h2></div>
          <div class="hero-actions tight">
            <a class="btn btn-primary btn-sm" href="#/deposit">New deposit</a>
            <a class="btn btn-ghost btn-sm" href="#/withdraw">New withdrawal</a>
          </div>
        </div>
        <div class="request-columns">
          <div>${requestList('Deposits', state.finance.deposits, 'deposit')}</div>
          <div>${requestList('Withdrawals', state.finance.withdrawals, 'withdraw')}</div>
        </div>
      </section>
      <section class="panel">
        <div class="section-head"><div><span class="eyebrow">Ledger</span><h2>Latest transactions</h2></div></div>
        <div class="table-shell">${ledgerTable(state.finance.ledger)}</div>
      </section>
      </div>`;
    bindGateActions(node);
    if (demoLocked) openDemoGateDialog('wallet');
  }

  function requestList(title, items, kind) {
    if (!items || !items.length) return `<div class="request-card"><h3>${esc(title)}</h3>${emptyState(`No ${title.toLowerCase()} yet.`)}</div>`;
    return `<div class="request-card">
      <h3>${esc(title)}</h3>
      ${items.slice(0, 6).map((item) => `
        <article class="request-row">
          <div><strong>${money(item.amount || 0)} ${esc(item.currency || 'USDT')}</strong><small>${esc(item.method_code || item.method || item.provider || kind)}</small></div>
          <span class="status-badge ${statusClass(item.status)}">${esc(item.status || 'pending')}</span>
        </article>`).join('')}
    </div>`;
  }

  function ledgerTable(items) {
    if (!items || !items.length) return emptyState('No ledger entries yet.');
    return `<table class="data-table">
      <thead><tr><th>Type</th><th>Currency</th><th>Amount</th><th>Reference</th><th>Date</th></tr></thead>
      <tbody>${items.slice(0, 25).map((x) => `
        <tr>
          <td>${esc(x.type || '')}</td>
          <td>${esc(x.currency || '')}</td>
          <td class="${Number(x.amount || 0) >= 0 ? 'pos' : 'neg'}">${money(x.amount || 0)}</td>
          <td>${esc([x.ref_type, x.ref_id].filter(Boolean).join(' #'))}</td>
          <td>${dateText(x.created_at)}</td>
        </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderFunding(kind) {
    const token = runtime.routeToken;
    state.funding.kind = kind;
    state.funding.result = null;
    $('#view').innerHTML = `
      <section class="panel page-head">
        <div>
          <span class="eyebrow">Manual ${esc(kind)}</span>
          <h1>${kind === 'deposit' ? 'Deposit funds' : 'Withdraw funds'}</h1>
          <p>${kind === 'deposit' ? 'Create a funding request, follow the payment instructions, then upload proof when required.' : 'Submit a payout request for admin review. KYC and available real balance are required.'}</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-ghost" href="#/wallet">Back to assets</a>
          <a class="btn btn-ghost" href="#/kyc">KYC</a>
        </div>
      </section>
      ${state.mode !== 'real' ? demoGateBanner(kind) : buildRealWorkflowNotice(kind)}
      <section class="funding-layout ${state.mode !== 'real' ? 'vp-page-preview-lock' : ''}">
        <div class="panel funding-methods">
          <div class="section-head compact"><div><h2>Payment methods</h2><p>Real account only</p></div></div>
          <div data-method-list>${emptyState('Loading methods...')}</div>
        </div>
        <div class="panel funding-form-panel">
          <div class="section-head compact"><div><h2>${kind === 'deposit' ? 'Deposit request' : 'Withdrawal request'}</h2><p>Reviewed by admin desk</p></div></div>
          <div data-funding-form>${emptyState('Loading form...')}</div>
        </div>
      </section>`;
    bindGateActions($('#view'));
    if (state.mode !== 'real') openDemoGateDialog(kind);
    loadFunding(token, kind);
  }

  async function loadFunding(token, kind) {
    if (runtime.pending.funding) return;
    runtime.pending.funding = true;
    try {
      const [methods, wallet, kyc] = await Promise.all([
        api(`/payment_methods/list.php?kind=${encodeURIComponent(kind)}&currency=USDT&scope=real&lang=en`, { timeout: 9000 }),
        api('/wallet/summary.php', { timeout: 7000 }),
        api('/kyc/status.php', { timeout: 7000 })
      ]);
      if (!isToken(token)) return;
      if (methods && methods.ok !== false) {
        state.paymentMethods[kind] = methods.items || [];
        state.paymentCategories[kind] = methods.categories || [];
        if (!state.funding.method || !state.paymentMethods[kind].some((m) => m.code === state.funding.method)) {
          state.funding.method = (state.paymentMethods[kind][0] && state.paymentMethods[kind][0].code) || '';
        }
      }
      if (wallet && wallet.ok !== false) state.wallet = wallet;
      if (kyc && kyc.ok !== false) state.kyc = kyc.kyc || null;
      renderFundingBody(kind);
      renderTopbar();
    } catch (err) {
      if (!isAbort(err)) {
        $('[data-method-list]').innerHTML = emptyState(err.message || 'Payment methods unavailable');
        $('[data-funding-form]').innerHTML = emptyState('Funding form unavailable');
      }
    } finally {
      runtime.pending.funding = false;
    }
  }

  function renderFundingBody(kind) {
    const methods = state.paymentMethods[kind] || [];
    const selected = methods.find((m) => m.code === state.funding.method) || methods[0] || null;
    const list = $('[data-method-list]');
    const form = $('[data-funding-form]');
    if (list) {
      list.innerHTML = methods.length ? `<div class="method-list">${methods.map((m) => methodCard(m, selected)).join('')}</div>` : emptyState('No active payment methods for USDT.');
      list.querySelectorAll('[data-method-code]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.funding.method = btn.dataset.methodCode || '';
          renderFundingBody(kind);
        });
      });
    }
    if (form) {
      form.innerHTML = selected ? fundingForm(kind, selected) : emptyState('No method selected.');
      bindFundingForm(kind, selected);
    }
  }

  function methodCard(m, selected) {
    const active = selected && selected.code === m.code ? ' active' : '';
    return `<button class="method-card${active}" type="button" data-method-code="${escAttr(m.code)}">
      ${marketLogo({ symbol: m.provider || m.code, type: 'crypto' })}
      <strong>${esc(m.title || m.code)}</strong>
      <small>${esc(m.description || m.provider || '')}</small>
      <em>${money(m.min_amount || 0)} min${m.max_amount > 0 ? ` / ${money(m.max_amount)} max` : ''}</em>
    </button>`;
  }

  function fundingForm(kind, method) {
    const kyc = kycStatusLabel();
    const real = (state.wallet && state.wallet.real) || {};
    const fields = normalizePaymentFields(method.fields, kind);
    const result = state.funding.result;
    return `<form class="funding-form" data-funding-submit>
      <div class="funding-status-grid">
        <div><small>KYC</small><strong class="${kyc.className}">${esc(kyc.label)}</strong></div>
        <div><small>Available</small><strong>${money(real.available || 0)} ${esc(real.currency || 'USDT')}</strong></div>
        <div><small>Method</small><strong>${esc(method.title || method.code)}</strong></div>
      </div>
      ${method.instructions ? `<div class="instructions-box">${esc(method.instructions)}</div>` : ''}
      ${method.payment_address ? `<div class="copy-box"><span>${esc(method.payment_address)}</span><button class="btn btn-ghost btn-sm" type="button" data-copy="${escAttr(method.payment_address)}">Copy</button></div>` : ''}
      ${method.payment_qr_url ? `<img class="payment-qr" src="${escAttr(method.payment_qr_url)}" alt="Payment QR" />` : ''}
      <label class="field"><span>Amount (${esc(method.currency || 'USDT')})</span><input inputmode="decimal" name="amount" value="${escAttr(String(state.funding.amount || method.min_amount || 100))}" /></label>
      <div class="form-grid">
        ${fields.map(paymentFieldControl).join('')}
      </div>
      ${kind === 'deposit' ? `<label class="field"><span>Proof file after creating request</span><input type="file" name="proof" accept="image/*,.pdf" /></label>` : ''}
      <button class="btn btn-primary" type="submit">${kind === 'deposit' ? 'Create deposit request' : 'Request withdrawal'}</button>
      <div class="ticket-status" data-funding-status>${result ? esc(result) : ''}</div>
    </form>`;
  }

  function bindFundingForm(kind, method) {
    const form = $('[data-funding-submit]');
    if (!form || !method) return;
    form.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy || ''); showToast('Copied'); } catch (e) {}
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = $('[data-funding-status]');
      if (state.mode !== 'real') { if (status) status.textContent = ''; openDemoGateDialog(kind); return; }
      if (!isKycApproved()) { if (status) status.textContent = ''; openKycRequiredDialog(kind); return; }
      if (status) status.textContent = 'Submitting...';
      const amount = parseNumber(form.elements.amount?.value);
      const details = collectFormDetails(form);
      const payload = kind === 'deposit'
        ? { provider: method.provider || 'manual', method: method.code, currency: method.currency || 'USDT', amount, details }
        : { method: method.code, currency: method.currency || 'USDT', amount, details, destination: details.destination || details.wallet_address || details.bank_account || details.address || '' };
      try {
        const data = await api(`/${kind === 'deposit' ? 'deposits' : 'withdrawals'}/create.php`, {
          method: 'POST',
          body: JSON.stringify(payload),
          timeout: 12000,
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey(kind) }
        });
        if (!data || data.ok === false) throw new Error((data && data.error) || 'Request failed');
        const item = kind === 'deposit' ? data.deposit : data.withdrawal;
        if (kind === 'deposit' && item && item.id && form.elements.proof?.files?.[0]) {
          await uploadDepositProof(item.id, form.elements.proof.files[0]);
        }
        state.funding.result = `${kind === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted for admin review.`;
        showToast(state.funding.result);
        await loadWallet(runtime.routeToken, true);
        renderFundingBody(kind);
      } catch (err) {
        if (status) status.textContent = err.message || 'Request failed';
        showToast(err.message || 'Request failed', 'danger');
      }
    });
  }

  async function uploadDepositProof(depositId, file) {
    const fd = new FormData();
    fd.append('deposit_id', String(depositId));
    fd.append('proof', file);
    const data = await api('/deposits/upload_proof.php', { method: 'POST', body: fd, timeout: 12000 });
    if (!data || data.ok === false) throw new Error((data && data.error) || 'Proof upload failed');
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

  function renderKyc() {
    const token = runtime.routeToken;
    $('#view').innerHTML = `
      <section class="panel page-head">
        <div>
          <span class="eyebrow">Account security</span>
          <h1>KYC verification</h1>
          <p>Submit your identity documents for admin review. Required for real deposits, withdrawals, and contracts.</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-ghost" href="#/wallet">Assets</a>
        </div>
      </section>
      <section class="kyc-layout">
        <div class="panel kyc-status-panel" data-kyc-status>${emptyState('Loading KYC status...')}</div>
        <div class="panel kyc-form-panel">
          <div class="section-head compact"><div><h2>Verification form</h2><p>JPG, PNG, WEBP up to 6MB</p></div></div>
          <form class="kyc-form" data-kyc-form>
            <div class="form-grid">
              <label class="field"><span>Full name</span><input name="full_name" required /></label>
              <label class="field"><span>Country</span><input name="country" required /></label>
              <label class="field"><span>Document type</span><select name="doc_type"><option value="passport">Passport</option><option value="id_card">National ID</option><option value="driver_license">Driver license</option></select></label>
              <label class="field"><span>Document number</span><input name="doc_number" required /></label>
              <label class="field"><span>Front document</span><input name="front" type="file" accept="image/*" required /></label>
              <label class="field"><span>Back document</span><input name="back" type="file" accept="image/*" /></label>
              <label class="field"><span>Selfie</span><input name="selfie" type="file" accept="image/*" required /></label>
            </div>
            <button class="btn btn-primary" type="submit">Submit KYC</button>
            <div class="ticket-status" data-kyc-submit-status></div>
          </form>
        </div>
      </section>`;
    bindKycForm(token);
    loadKyc(token);
  }

  async function loadKyc(token) {
    if (runtime.pending.kyc) return;
    runtime.pending.kyc = true;
    try {
      const [kyc, level] = await Promise.all([
        api('/kyc/status.php', { timeout: 8000 }),
        api('/user/level.php', { timeout: 8000 })
      ]);
      if (!isToken(token)) return;
      if (kyc && kyc.ok !== false) state.kyc = kyc.kyc || null;
      if (level && level.ok !== false) state.level = level;
      renderKycStatus();
      renderTopbar();
    } catch (err) {
      if (!isAbort(err) && $('[data-kyc-status]')) $('[data-kyc-status]').innerHTML = emptyState(err.message || 'KYC status unavailable');
    } finally {
      runtime.pending.kyc = false;
    }
  }

  function renderKycStatus() {
    const node = $('[data-kyc-status]');
    if (!node) return;
    const kyc = state.kyc || {};
    const label = kycStatusLabel();
    const level = (state.level && state.level.current) || null;
    node.innerHTML = `
      <div class="section-head compact"><div><h2>Status</h2><p>Admin controlled verification</p></div><span class="status-badge ${label.className}">${esc(label.label)}</span></div>
      <div class="kyc-summary">
        <div><small>Full name</small><strong>${esc(kyc.full_name || 'Not submitted')}</strong></div>
        <div><small>Country</small><strong>${esc(kyc.country || '--')}</strong></div>
        <div><small>Document</small><strong>${esc(kyc.doc_type || '--')}</strong></div>
        <div><small>Customer level</small><strong>${esc(levelName(level))}</strong></div>
      </div>
      ${kyc.admin_note ? `<div class="instructions-box">${esc(kyc.admin_note)}</div>` : ''}
      <p class="muted-note">${esc(label.text)}</p>`;
  }

  function bindKycForm(token) {
    const form = $('[data-kyc-form]');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = $('[data-kyc-submit-status]');
      if (status) status.textContent = 'Uploading documents...';
      try {
        const fd = new FormData(form);
        const data = await api('/kyc/submit.php', { method: 'POST', body: fd, timeout: 20000 });
        if (!data || data.ok === false) throw new Error((data && data.error) || 'KYC submit failed');
        showToast('KYC submitted for review');
        if (status) status.textContent = 'Submitted for admin review.';
        form.reset();
        await loadKyc(token);
      } catch (err) {
        if (status) status.textContent = err.message || 'KYC submit failed';
        showToast(err.message || 'KYC submit failed', 'danger');
      }
    });
  }

  function renderInvest() {
    const token = runtime.routeToken;
    $('#view').innerHTML = `
      <section class="panel page-head">
        <div>
          <span class="eyebrow">Earn</span>
          <h1>Copy trading and contracts</h1>
          <p>Follow approved trading signals on Real accounts, or subscribe to level-gated contracts managed inside VertexPluse.</p>
        </div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/deposit">Deposit</a>
          <a class="btn btn-ghost" href="#/trade">Open Trade</a>
        </div>
      </section>
      <div data-invest-body>${emptyState('Loading copy desk...')}</div>`;
    loadInvest(token, true);
    setTimer(() => loadInvest(token, false), FINANCE_POLL_MS);
  }

  async function loadInvest(token, immediate = false) {
    if (runtime.pending.invest && !immediate) return;
    runtime.pending.invest = true;
    try {
      const [signals, copies, contracts, mine, wallet, level, kyc] = await Promise.all([
        optionalApi('/signals.php?bot=1&home=1&lang=en', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/trading_bot/my.php?lang=en', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/invest/contracts.php?lang=en', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/invest/my.php?lang=en', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/wallet/summary.php', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/user/level.php?lang=en', { timeout: immediate ? 9000 : 7000 }),
        optionalApi('/kyc/status.php', { timeout: immediate ? 9000 : 7000 })
      ]);
      if (!isToken(token)) return;
      if (signals && signals.ok !== false) state.invest.signals = signals.items || [];
      if (copies && copies.ok !== false) state.invest.copies = copies.items || [];
      if (contracts && contracts.ok !== false) state.invest.contracts = contracts.items || [];
      if (mine && mine.ok !== false) state.invest.mine = mine.items || [];
      if (wallet && wallet.ok !== false) state.wallet = wallet;
      if (level && level.ok !== false) state.level = level;
      if (kyc && kyc.ok !== false) state.kyc = kyc.kyc || null;
      renderInvestBody();
      renderTopbar();
    } catch (err) {
      if (!isAbort(err)) $('[data-invest-body]').innerHTML = emptyState(err.message || 'Earn products unavailable');
    } finally {
      runtime.pending.invest = false;
    }
  }

  function earnAccessGuard() {
    const kyc = kycStatusLabel();
    if (state.mode !== 'real') {
      return {
        title: 'Real account required',
        text: 'Copy trading and contracts are available on Real accounts only. Switch to Real to continue.',
        icon: 'wallet',
        action: 'Switch to Real',
        switchReal: true
      };
    }
    if (kyc.label !== 'Approved') {
      return {
        title: 'KYC required',
        text: 'Complete KYC verification before using Real copy trading and contracts.',
        icon: 'kyc',
        action: 'Verify KYC',
        href: '#/kyc'
      };
    }
    return null;
  }

  function guardedEarnContent(content, guard) {
    if (!guard) return content;
    const action = guard.switchReal
      ? `<button class="btn btn-primary btn-sm" type="button" data-earn-switch-real>${esc(guard.action)}</button>`
      : `<a class="btn btn-primary btn-sm" href="${escAttr(guard.href || '#/kyc')}" data-earn-guard-link>${esc(guard.action)}</a>`;
    return `<div class="earn-gate is-locked">
      <div class="earn-gate-content">${content}</div>
      <div class="earn-gate-overlay">
        <span class="guard-icon">${uiIcon(guard.icon || 'kyc')}</span>
        <strong>${esc(guard.title)}</strong>
        <p>${esc(guard.text)}</p>
        ${action}
      </div>
    </div>`;
  }

  function bindEarnGuardActions(root = document) {
    root.querySelectorAll('[data-earn-switch-real]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTradeMode('real', { promptKyc: true });
      });
    });
  }

  function renderInvestBody() {
    const node = $('[data-invest-body]');
    if (!node) return;
    const level = (state.level && state.level.current) || null;
    const next = (state.level && state.level.next) || null;
    const real = (state.wallet && state.wallet.real) || {};
    const contractMine = state.invest.mine.filter((x) => String(x.product_kind || x.kind || 'contract').toLowerCase() !== 'plan');
    const activeCopies = state.invest.copies.filter((x) => ['active', 'armed', 'copied'].includes(String(x.status || '').toLowerCase())).length;
    const activeContracts = contractMine.filter((x) => ['active', 'running'].includes(String(x.status || '').toLowerCase())).length;
    const accessGuard = earnAccessGuard();
    const demoLocked = state.mode !== 'real';
    node.innerHTML = `
      ${demoLocked ? demoGateBanner('earn') : buildRealWorkflowNotice('earn')}
      ${levelStrip()}
      <section class="metric-grid">
        ${metricCard('Current level', levelName(level), 'Customer tier')}
        ${metricCard('Next level', levelName(next), next ? `${money(next.min_deposit_total || 0)} deposits` : 'Maximum tier')}
        ${metricCard('Real available', money(real.available || 0), real.currency || 'USDT')}
        ${metricCard('Active copies', String(activeCopies), 'Real copy desk')}
        ${metricCard('Active contracts', String(activeContracts), 'Running')}
      </section>
      <section class="panel">
        <div class="earn-tabs">
          <button class="${state.invest.tab === 'copy' ? 'active' : ''}" type="button" data-earn-tab="copy">Copy Trading</button>
          <button class="${state.invest.tab === 'contracts' ? 'active' : ''}" type="button" data-earn-tab="contracts">Contracts</button>
        </div>
      </section>
      ${state.invest.tab === 'copy' ? `
        <section class="panel">
          <div class="section-head">
            <div><span class="eyebrow">Signal desk</span><h2>Copy trading signals</h2><p>Real-only subscriptions. KYC approval is required before copying.</p></div>
          </div>
          ${guardedEarnContent(`<div class="copy-grid">${copySignalCards(state.invest.signals, 'earn')}</div>`, accessGuard)}
        </section>
        <section class="panel">
          <div class="section-head"><div><span class="eyebrow">My copies</span><h2>Copied and armed trades</h2></div></div>
          <div class="table-shell">${copyHistoryTable(state.invest.copies)}</div>
        </section>` : `
        <section class="panel">
          <div class="section-head"><div><span class="eyebrow">Contracts</span><h2>Perpetual and term contracts</h2></div></div>
          ${guardedEarnContent(`<div class="invest-grid">${productCards(state.invest.contracts, 'contract')}</div>`, accessGuard)}
        </section>
        <section class="panel">
          <div class="section-head"><div><span class="eyebrow">My contracts</span><h2>Active contracts</h2></div></div>
          <div class="table-shell">${investmentsTable(contractMine)}</div>
        </section>`}
      `;
    bindEarnTabs();
    bindCopyButtons(node);
    bindInvestButtons();
    bindEarnGuardActions(node);
    bindGateActions(node);
    if (demoLocked) openDemoGateDialog('earn');
  }

  function bindEarnTabs() {
    $('#view').querySelectorAll('[data-earn-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.invest.tab = btn.dataset.earnTab === 'contracts' ? 'contracts' : 'copy';
        safeStorage('vp_earn_tab', state.invest.tab, true);
        renderInvestBody();
      });
    });
  }

  function copySignalCards(items, context) {
    if (!items || !items.length) {
      return emptyState(context === 'trade' ? 'No copy signals for this market right now.' : 'No copy trading signals are available yet.');
    }
    return items.map((sig) => signalCard(sig, context === 'trade')).join('');
  }

  function signalCard(sig, compactMode = false) {
    const live = signalQuote(sig);
    const q = quoteState(live);
    const direction = String(sig.direction || sig.side || 'buy').toLowerCase();
    const minAmount = Number(sig.copy_min_amount || sig.min_amount || 0);
    const lockDays = Number(sig.copy_lock_days || 0);
    const share = Number(sig.copy_profit_share_pct || 0);
    const confidence = Number(sig.confidence || 0);
    const subscribers = Number(sig.subscribers || sig.followers || 0);
    return `<article class="copy-card ${compactMode ? 'is-compact' : ''}" data-signal-card="${escAttr(String(sig.id || ''))}" data-signal-symbol="${escAttr(cleanSymbol(sig.symbol || ''))}">
      <div class="copy-card-head">
        ${marketLogo({ symbol: sig.symbol, type: sig.type || state.type, icon_url: sig.icon_url || null }, q.className)}
        <div>
          <h3>${esc(cleanSymbol(sig.symbol || state.symbol))}</h3>
          <small>${esc(sig.bot_name || sig.type || 'Copy signal')} ${sig.timeframe ? `- ${esc(sig.timeframe)}` : ''}</small>
        </div>
        <span class="side ${direction.includes('sell') || direction.includes('short') ? 'is-sell' : 'is-buy'}">${esc(direction.includes('sell') || direction.includes('short') ? 'Sell' : 'Buy')}</span>
      </div>
      <div class="signal-live">
        <span class="quality-pill ${q.className}" data-signal-quality>${esc(q.label)}</span>
        <strong data-signal-live-price>${live.price > 0 ? price(live.price, sig.type || state.type) : '--'}</strong>
        <small class="${q.changeClass}" data-signal-live-change>${pct(live.change_pct)}</small>
      </div>
      <div class="signal-grid">
        <div><small>Entry</small><strong>${signalPrice(sig.entry, sig.type)}</strong></div>
        <div><small>Stop loss</small><strong>${signalPrice(sig.sl, sig.type)}</strong></div>
        <div><small>Take profit</small><strong>${signalPrice(sig.tp1 || sig.tp, sig.type)}</strong></div>
        <div><small>Confidence</small><strong>${confidence > 0 ? `${compact(confidence)}%` : '--'}</strong></div>
      </div>
      <p>${esc(sig.bot_brief || sig.note || 'Copy this approved setup on your Real account after KYC approval.')}</p>
      <div class="copy-meta">
        <span>Min ${money(minAmount || 0)}</span>
        <span>${lockDays > 0 ? `${lockDays}d lock` : 'Flexible'}</span>
        <span>${share > 0 ? `${compact(share)}% share` : 'No share'}</span>
        <span>${subscribers} followers</span>
      </div>
      <button class="btn btn-primary btn-sm" type="button" data-copy-signal="${escAttr(String(sig.id || ''))}">Copy Real</button>
    </article>`;
  }

  function renderTradeSignalsPanel(errorMessage = '') {
    const panel = $('[data-trade-signals-panel]');
    if (!panel) return;
    const title = panel.querySelector('h2');
    if (title) title.textContent = `Signals for ${state.symbol}`;
    const list = panel.querySelector('[data-trade-signals-list]');
    if (!list) return;
    const accessGuard = earnAccessGuard();
    list.innerHTML = errorMessage ? emptyState(errorMessage) : guardedEarnContent(`<div class="copy-grid compact">${copySignalCards(state.invest.tradeSignals, 'trade')}</div>`, accessGuard);
    bindEarnGuardActions(list);
    bindCopyButtons(list);
    updateSignalLiveFromQuote();
  }

  function bindCopyButtons(root = document) {
    root.querySelectorAll('[data-copy-signal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sig = findSignal(btn.dataset.copySignal);
        if (!sig) return;
        if (state.mode !== 'real') { openDemoGateDialog('copy'); return; }
        if (!isKycApproved()) { openKycRequiredDialog('copy'); return; }
        openCopyDialog(sig);
      });
    });
  }

  function findSignal(id) {
    const target = String(id || '');
    return [...(state.invest.signals || []), ...(state.invest.tradeSignals || [])].find((sig) => String(sig.id || '') === target) || null;
  }

  function openCopyDialog(sig) {
    const kyc = kycStatusLabel();
    const realWallet = (state.wallet && state.wallet.real) || {};
    const minAmount = Number(sig.copy_min_amount || sig.min_amount || 50);
    const modeOk = state.mode === 'real';
    const kycOk = kyc.label === 'Approved';
    const live = signalQuote(sig);
    const q = quoteState(live);
    const guard = !modeOk
      ? '<div class="modal-warning">Copy Trading is Real Only. Switch to Real mode before copying this signal.</div>'
      : (!kycOk ? '<div class="modal-warning">KYC approval is required before Real copy trading.</div>' : '');
    openLiteModal(`
      <div class="modal-head">
        <div><span class="eyebrow">Copy trading</span><h2>Copy ${esc(cleanSymbol(sig.symbol || state.symbol))}</h2></div>
        <button class="icon-btn" type="button" data-modal-close>X</button>
      </div>
      <form class="signal-copy-sheet" data-copy-form="${escAttr(String(sig.id || ''))}">
        ${guard}
        <div class="signal-copy-summary">
          <div><small>Direction</small><strong>${esc(String(sig.direction || 'buy').toUpperCase())}</strong></div>
          <div><small>Live price</small><strong>${live.price > 0 ? price(live.price, sig.type || state.type) : '--'}</strong></div>
          <div><small>Status</small><strong class="${q.className}">${esc(q.label)}</strong></div>
          <div><small>Real available</small><strong>${money(realWallet.available || 0)}</strong></div>
        </div>
        <div class="signal-grid">
          <div><small>Entry</small><strong>${signalPrice(sig.entry, sig.type)}</strong></div>
          <div><small>SL</small><strong>${signalPrice(sig.sl, sig.type)}</strong></div>
          <div><small>TP1</small><strong>${signalPrice(sig.tp1 || sig.tp, sig.type)}</strong></div>
          <div><small>Lock</small><strong>${Number(sig.copy_lock_days || 0) || 0}d</strong></div>
        </div>
        <label class="field">
          <span>Copy amount</span>
          <input name="amount" inputmode="decimal" value="${escAttr(String(minAmount || 50))}" />
        </label>
        <div class="modal-actions">
          ${!modeOk ? '<button class="btn btn-ghost" type="button" data-switch-real>Switch to Real</button>' : ''}
          ${!kycOk ? '<a class="btn btn-ghost" href="#/kyc" data-modal-close>KYC Verification</a>' : ''}
          <button class="btn btn-primary" type="submit" ${modeOk && kycOk ? '' : 'disabled'}>Copy on Real</button>
        </div>
        <p class="ticket-status" data-copy-status>Real copy subscriptions reserve funds internally and may open when the signal entry is reached.</p>
      </form>`);
    const form = document.querySelector('[data-copy-form]');
    form?.addEventListener('submit', (event) => submitCopyForm(event, sig));
    document.querySelector('[data-switch-real]')?.addEventListener('click', () => {
      setTradeMode('real', { promptKyc: true });
      closeLiteModal();
    });
  }

  async function submitCopyForm(event, sig) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-copy-status]');
    const amount = parseNumber(form.elements.amount?.value) || Number(sig.copy_min_amount || 0);
    if (status) status.textContent = 'Submitting copy request...';
    try {
      const data = await api('/trading_bot/copy.php', {
        method: 'POST',
        body: JSON.stringify({ signal_id: sig.id, amount, mode: 'real' }),
        headers: { 'Content-Type': 'application/json' },
        timeout: 12000
      });
      if (!data || data.ok === false) throw new Error((data && data.error) || 'Copy request failed');
      showToast(data.armed ? 'Copy armed and waiting for entry' : 'Copy position created');
      closeLiteModal();
      await Promise.all([
        loadInvest(runtime.routeToken, true),
        loadTradingAccount(runtime.routeToken, true)
      ]);
    } catch (err) {
      if (status) status.textContent = err.message || 'Copy request failed';
      showToast(err.message || 'Copy request failed', 'danger');
    }
  }

  function copyHistoryTable(items) {
    if (!items || !items.length) return emptyState('No copied trades yet.');
    return `<table class="data-table copy-history-table">
      <thead><tr><th>Signal</th><th>Amount</th><th>Entry</th><th>Live</th><th>Status</th><th>Lock</th></tr></thead>
      <tbody>${items.map((x) => {
        const live = signalQuote(x);
        const q = quoteState(live);
        return `<tr>
          <td><strong>${esc(cleanSymbol(x.symbol || ''))}</strong><small>${esc(x.bot_name || x.direction || '')}</small></td>
          <td>${money(x.reserved_amount || x.amount || 0)}<small>${esc(x.mode || 'real')}</small></td>
          <td>${signalPrice(x.entry_price_snapshot || x.entry, x.type)}</td>
          <td><strong>${live.price > 0 ? price(live.price, x.type || state.type) : '--'}</strong><small class="${q.changeClass}">${pct(live.change_pct)}</small></td>
          <td><span class="status-badge ${copyStatusClass(x.status)}">${esc(x.status || 'active')}</span></td>
          <td>${dateText(x.lock_until)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function signalQuote(sig) {
    const symbol = cleanSymbol(sig.symbol || state.symbol);
    const cached = state.visibleQuotes[symbol];
    const active = symbol === state.symbol ? state.activeQuote : null;
    const raw = active || cached || {};
    return {
      symbol,
      type: sig.type || raw.type || state.type,
      price: Number(raw.price || sig.live_price || sig.price || 0),
      change_pct: Number(raw.change_pct ?? sig.live_change_pct ?? 0),
      source: String(raw.source || sig.live_source || sig.source || 'unavailable'),
      timing_class: String(raw.timing_class || ''),
      is_stale: !!raw.is_stale
    };
  }

  function updateSignalLiveFromQuote() {
    if (!state.activeQuote) return;
    const symbol = cleanSymbol(state.activeQuote.symbol || state.symbol);
    const cssSymbol = window.CSS && CSS.escape ? CSS.escape(symbol) : symbol.replace(/["\\]/g, '\\$&');
    document.querySelectorAll(`[data-signal-symbol="${cssSymbol}"]`).forEach((card) => {
      const live = signalQuote({ symbol, type: state.type });
      const q = quoteState(live);
      const priceNode = card.querySelector('[data-signal-live-price]');
      const changeNode = card.querySelector('[data-signal-live-change]');
      const qualityNode = card.querySelector('[data-signal-quality]');
      if (priceNode) priceNode.textContent = live.price > 0 ? price(live.price, state.type) : '--';
      if (changeNode) {
        changeNode.textContent = pct(live.change_pct);
        changeNode.className = q.changeClass;
      }
      if (qualityNode) {
        qualityNode.textContent = q.label;
        qualityNode.className = `quality-pill ${q.className}`;
      }
    });
  }

  function copyStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (['active', 'copied', 'open'].includes(s)) return 'is-live';
    if (['armed', 'pending', 'waiting'].includes(s)) return 'is-delayed';
    if (['closed', 'completed'].includes(s)) return 'is-stale';
    if (['failed', 'rejected', 'cancelled', 'canceled'].includes(s)) return 'is-unavailable';
    return 'is-stale';
  }

  function signalPrice(value, type) {
    const n = Number(value || 0);
    return n > 0 ? price(n, type || state.type) : '--';
  }


  function browserLang() {
    const lang = String((navigator.language || 'en').slice(0, 2)).toLowerCase();
    return ['ar', 'ru'].includes(lang) ? lang : 'en';
  }

  function tr(en, ar, ru) {
    if (state.lang === 'ar') return ar || en;
    if (state.lang === 'ru') return ru || en;
    return en;
  }

  function setTradeMode(mode, options = {}) {
    state.mode = mode === 'real' ? 'real' : 'demo';
    safeStorage('vp_trade_mode', state.mode, true);
    renderTopbar();
    if (state.mode === 'real' && options.promptKyc && !isKycApproved()) openKycRequiredDialog('real_mode');
    if (state.route === 'trade') {
      renderTradeSignalsPanel();
      loadTradingAccount(runtime.routeToken, true);
    } else if (state.route === 'portfolio') {
      renderPortfolio();
    } else if (state.route === 'wallet') {
      loadWallet(runtime.routeToken, true);
    } else if (state.route === 'invest') {
      loadInvest(runtime.routeToken, true);
    } else if (state.route === 'deposit' || state.route === 'withdraw') {
      renderFunding(state.route);
    }
    showToast(state.mode === 'real' ? 'Real mode enabled' : 'Demo mode enabled');
  }

  function isKycApproved() {
    return kycStatusLabel().label === 'Approved';
  }

  function demoGateBanner(context) {
    const wallet = state.wallet || {};
    const demo = wallet.demo || {};
    const real = wallet.real || {};
    const title = context === 'earn'
      ? 'Earn is locked in Demo mode'
      : context === 'withdraw'
        ? 'Withdrawals require Real mode'
        : context === 'deposit'
          ? 'Deposits require Real mode'
          : 'This area is a locked Demo preview';
    return `<section class="panel vp-real-only-hero">
      <div class="vp-real-only-copy">
        <span class="eyebrow">Real account only</span>
        <h2>${esc(title)}</h2>
        <p>Switch to Real mode to unlock funding, copy trading, contracts, and live account actions. Demo remains available for practice trading only.</p>
        <div class="vp-gate-pills">
          <span>Mode: ${state.mode.toUpperCase()}</span>
          <span>Demo available: ${money(demo.available ?? demo.balance ?? 0)}</span>
          <span>Real available: ${money(real.available ?? real.balance ?? 0)}</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="button" data-switch-real>Switch to Real</button>
          <button class="btn btn-ghost" type="button" data-demo-info>Why locked?</button>
        </div>
      </div>
      <div class="vp-real-only-preview">
        <span>${uiIcon('wallet')}</span>
        <strong>Protected live workflow</strong>
        <small>Real mode + approved KYC unlocks sensitive actions.</small>
      </div>
    </section>`;
  }

  function buildRealWorkflowNotice(context) {
    const kyc = kycStatusLabel();
    if (state.mode !== 'real' || kyc.label === 'Approved') return '';
    return `<section class="panel vp-workflow-notice">
      <span class="guard-icon">${uiIcon('kyc')}</span>
      <div>
        <strong>Verification required for live actions</strong>
        <p>${esc(kyc.text)}</p>
      </div>
      <a class="btn btn-primary btn-sm" href="#/kyc">Open KYC</a>
    </section>`;
  }

  function openDemoGateDialog(route) {
    const key = `vp_demo_gate_${route}`;
    try { if (sessionStorage.getItem(key) === '1') return; sessionStorage.setItem(key, '1'); } catch (e) {}
    openLiteModal(buildGateDialogBody({
      tone: 'real',
      badge: 'Real account only',
      title: 'This workflow is locked in Demo',
      text: 'You can preview the page, but deposits, withdrawals, copy trading, and contracts need Real mode.',
      summary: 'Switch to Real to continue. KYC may still be required for sensitive actions.',
      action: 'real'
    }));
    bindGateActions(document);
  }

  function buildGateDialogBody(opts = {}) {
    return `<div class="gate-dialog gate-${escAttr(opts.tone || 'real')}">
      <div class="modal-head">
        <div><span class="eyebrow">${esc(opts.badge || '')}</span><h2>${esc(opts.title || '')}</h2></div>
        <button class="icon-btn" type="button" data-modal-close>X</button>
      </div>
      <div class="gate-dialog-body">
        <span class="guard-icon">${uiIcon(opts.tone === 'kyc' ? 'kyc' : 'wallet')}</span>
        <p>${esc(opts.text || '')}</p>
        <div class="instructions-box">${esc(opts.summary || '')}</div>
      </div>
      <div class="modal-actions">
        ${opts.action === 'real' ? '<button class="btn btn-primary" type="button" data-switch-real>Switch to Real</button>' : ''}
        <a class="btn btn-primary" href="#/kyc" data-modal-close>Open Verification</a>
        <button class="btn btn-ghost" type="button" data-modal-close>Close</button>
      </div>
    </div>`;
  }

  function openKycRequiredDialog(context = 'real_mode') {
    openLiteModal(buildGateDialogBody({
      tone: 'kyc',
      badge: 'Verification required',
      title: 'KYC approval is required',
      text: 'This live-account action stays locked until your identity review is approved.',
      summary: `Current KYC: ${kycStatusLabel().label}`,
      action: ''
    }));
  }

  function bindGateActions(root = document) {
    root.querySelectorAll('[data-switch-real]').forEach((btn) => {
      if (btn.dataset.boundGate === '1') return;
      btn.dataset.boundGate = '1';
      btn.addEventListener('click', () => { closeLiteModal(); setTradeMode('real', { promptKyc: true }); });
    });
    root.querySelectorAll('[data-demo-info]').forEach((btn) => {
      if (btn.dataset.boundGate === '1') return;
      btn.dataset.boundGate = '1';
      btn.addEventListener('click', () => openDemoGateDialog(state.route || 'demo'));
    });
  }

  function openLiteModal(html) {
    closeLiteModal();
    const modal = document.createElement('div');
    modal.className = 'lite-modal';
    modal.innerHTML = `<div class="modal-backdrop" data-modal-close></div><div class="modal-panel">${html}</div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-modal-close]').forEach((item) => item.addEventListener('click', closeLiteModal));
  }

  function closeLiteModal() {
    document.querySelectorAll('.lite-modal').forEach((modal) => modal.remove());
  }

  function levelStrip() {
    const levels = state.level && Array.isArray(state.level.levels) ? state.level.levels : [];
    if (!levels.length) return '';
    const current = (state.level && state.level.current) || {};
    const currentCode = String(current.level_code || current.code || '');
    return `<section class="panel level-strip-panel">
      <div class="section-head compact">
        <div><span class="eyebrow">Level desk</span><h2>Customer levels</h2><p>Unlock copy desk, contracts, higher limits, and private support.</p></div>
        <span class="level-head-icon">${marketLogo({ symbol: 'LEVEL', type: 'futures', icon_url: UI_ASSET_PATH + 'level.svg' })}</span>
      </div>
      <div class="level-strip">${levels.map((lvl, index) => {
        const isActive = String(lvl.level_code || lvl.code || '') === currentCode;
        return `<div class="level-chip-card ${isActive ? 'is-active' : ''}">
          <span>Tier ${index + 1}</span>
          <strong>${esc(levelName(lvl))}</strong>
          <small>${money(lvl.min_deposit_total || 0)} deposits</small>
        </div>`;
      }).join('')}</div>
    </section>`;
  }
  function productCards(items, fallbackKind) {
    if (!items || !items.length) return emptyState(`No ${fallbackKind} products configured yet.`);
    return items.map((p) => `<article class="invest-card ${p.eligible ? '' : 'is-locked'}">
      <div class="invest-card-head">
        <span class="product-mark">${marketLogo({ symbol: p.is_perpetual ? 'VIP' : 'CONTRACT', type: 'futures', icon_url: UI_ASSET_PATH + 'contract.svg' }, p.eligible ? 'is-live' : 'is-stale')}</span>
        <span class="eyebrow">${esc(p.badge || p.product_kind || fallbackKind)}</span>
        <span class="status-badge ${p.eligible ? 'is-live' : 'is-stale'}">${p.eligible ? 'Eligible' : 'Level locked'}</span>
      </div>
      <h3>${esc(p.name || p.id)}</h3>
      <p>${esc(p.desc || p.headline || 'VertexPluse managed product')}</p>
      <div class="invest-stats">
        <div><small>ROI</small><strong>${compact(p.roi_percent || 0)}%</strong></div>
        <div><small>Term</small><strong>${p.is_perpetual ? 'Perpetual' : `${Number(p.term_days || 0)}d`}</strong></div>
        <div><small>Minimum</small><strong>${money(p.min_amount || 0)}</strong></div>
      </div>
      ${p.required_level ? `<small class="muted-note">Requires ${esc(levelName(p.required_level))}</small>` : ''}
      <form class="invest-subscribe" data-invest-form="${escAttr(String(p.id))}">
        <input name="amount" inputmode="decimal" value="${escAttr(String(p.min_amount || 100))}" />
        <button class="btn btn-primary btn-sm" type="submit" ${p.eligible ? '' : 'disabled'}>Subscribe</button>
      </form>
    </article>`).join('');
  }

  function bindInvestButtons() {
    $('#view').querySelectorAll('[data-invest-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const planId = form.dataset.investForm || '';
        const amount = parseNumber(form.elements.amount?.value);
        if (state.mode !== 'real') { openDemoGateDialog('contract'); return; }
        if (!isKycApproved()) { openKycRequiredDialog('contract'); return; }
        try {
          const data = await api('/invest/subscribe.php', {
            method: 'POST',
            body: JSON.stringify({ plan_id: planId, amount }),
            timeout: 12000,
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey('invest') }
          });
          if (!data || data.ok === false) throw new Error((data && data.error) || 'Subscribe failed');
          showToast('Subscription created');
          await loadInvest(runtime.routeToken, true);
        } catch (err) {
          showToast(err.message || 'Subscribe failed', 'danger');
        }
      });
    });
  }

  function investmentsTable(items) {
    if (!items || !items.length) return emptyState('No active investments yet.');
    return `<table class="data-table">
      <thead><tr><th>Product</th><th>Amount</th><th>Expected</th><th>Status</th><th>Schedule</th></tr></thead>
      <tbody>${items.map((x) => `<tr>
        <td><strong>${esc(x.plan_name || x.plan_id)}</strong><small>${esc(x.product_kind || '')}${x.is_perpetual ? ' perpetual' : ''}</small></td>
        <td>${money(x.amount || 0)}</td>
        <td>${money(x.expected_return || 0)}</td>
        <td><span class="status-badge ${statusClass(x.status)}">${esc(x.status || 'active')}</span></td>
        <td>${esc(x.payout_schedule || 'end')}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderAccount() {
    const user = state.user || {};
    const kyc = kycStatusLabel();
    const level = (state.level && state.level.current) || null;
    $('#view').innerHTML = `
      <section class="account-layout">
        <div class="panel account-card">
          <div class="account-avatar">${esc(userInitials())}</div>
          <h1>${esc(user.name || user.username || 'Account')}</h1>
          <p>${esc(user.email || 'client@vertexpluse.com')}</p>
          <dl class="account-list">
            <div><dt>Account number</dt><dd>${esc(String(user.id || user.account_number || '900000000'))}</dd></div>
            <div><dt>Mode</dt><dd>${esc(state.mode)}</dd></div>
            <div><dt>KYC</dt><dd>${esc(kyc.label)}</dd></div>
            <div><dt>Level</dt><dd>${esc(levelName(level))}</dd></div>
            <div><dt>Support</dt><dd>${esc(window.__SUPPORT_EMAIL || state.brand.support_email || 'support@vertexpluse.com')}</dd></div>
          </dl>
          <div class="account-actions">
            <a class="btn btn-primary" href="#/wallet">Funds</a>
            <a class="btn btn-ghost" href="#/kyc">KYC</a>
            <a class="btn btn-ghost" href="#/invest">Earn</a>
            <a class="btn btn-ghost" href="mailto:${escAttr(state.brand.support_email || 'support@vertexpluse.com')}">Support</a>
            <a class="btn btn-danger" href="/logout.php">Log out</a>
          </div>
        </div>
        <div class="panel account-menu">
          <h2>Workspace</h2>
          ${navItems().map((item) => `<a href="#/${item.route}"><span>${uiIcon(item.icon)}</span><strong>${esc(item.label)}</strong><em>Open ${esc(item.label.toLowerCase())}</em></a>`).join('')}
          <a href="#/deposit"><span>${uiIcon('deposit')}</span><strong>Deposit</strong><em>Manual funding request</em></a>
          <a href="#/withdraw"><span>${uiIcon('withdraw')}</span><strong>Withdraw</strong><em>Reviewed payout</em></a>
          <a href="#/kyc"><span>${uiIcon('kyc')}</span><strong>KYC</strong><em>Identity verification</em></a>
        </div>
      </section>`;
    loadKyc(runtime.routeToken);
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
    const rows = filteredMarkets(state.marketTab || state.type);
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
      ${marketLogo(m, q.className)}
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
    updateSignalLiveFromQuote();
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


  function computeTradeMobile() {
    const width = Number((window.visualViewport && window.visualViewport.width) || window.innerWidth || 0);
    return width > 0 && width <= TRADE_MOBILE_BREAKPOINT;
  }

  function setupTradeViewportWatcher(token) {
    const handler = () => {
      clearTimeout(runtime.resizeTimer);
      runtime.resizeTimer = setTimeout(() => {
        if (!isToken(token) || state.route !== 'trade') return;
        const next = computeTradeMobile() ? 'mobile' : 'desktop';
        if (next !== runtime.tradeViewport) applyRoute();
        else if (runtime.chart) { try { runtime.chart.timeScale().fitContent(); } catch (e) {} }
      }, 200);
    };
    window.addEventListener('resize', handler, { passive: true });
    try { if (window.visualViewport) window.visualViewport.addEventListener('resize', handler, { passive: true }); } catch (e) {}
    runtime.cleanups.push(() => {
      window.removeEventListener('resize', handler);
      try { if (window.visualViewport) window.visualViewport.removeEventListener('resize', handler); } catch (e) {}
    });
  }

  function toggleChartTool(tool, button) {
    if (tool === 'crosshair') {
      runtime.chartTools.crosshair = !runtime.chartTools.crosshair;
      if (runtime.chart) runtime.chart.applyOptions({ crosshair: { mode: runtime.chartTools.crosshair ? 1 : 0 } });
      button?.classList.toggle('active', runtime.chartTools.crosshair);
      return;
    }
    if (tool === 'ma' || tool === 'ema') {
      runtime.chartTools[tool] = !runtime.chartTools[tool];
      button?.classList.toggle('active', runtime.chartTools[tool]);
      refreshChartOverlays();
      return;
    }
    if (tool === 'reset') {
      runtime.chartTools.ma = false;
      runtime.chartTools.ema = false;
      removeOverlaySeries('ma');
      removeOverlaySeries('ema');
      $('#view').querySelectorAll('[data-chart-tool="ma"],[data-chart-tool="ema"]').forEach((btn) => btn.classList.remove('active'));
      try { runtime.chart?.timeScale().fitContent(); } catch (e) {}
      return;
    }
    if (tool === 'fullscreen') toggleChartFullscreen();
  }

  function toggleChartFullscreen() {
    const panel = $('.chart-panel');
    if (!panel) return;
    panel.classList.toggle('is-fullscreen-chart');
    runtime.chartFullscreen = panel.classList.contains('is-fullscreen-chart');
    setTimeout(() => { try { runtime.chart?.timeScale().fitContent(); } catch (e) {} }, 80);
  }

  function removeOverlaySeries(name) {
    const key = name === 'ma' ? 'maSeries' : 'emaSeries';
    if (runtime.chart && runtime[key]) {
      try { runtime.chart.removeSeries(runtime[key]); } catch (e) {}
    }
    runtime[key] = null;
  }

  function refreshChartOverlays() {
    if (!runtime.chart || !runtime.candles.length) return;
    if (runtime.chartTools.ma) {
      if (!runtime.maSeries && typeof runtime.chart.addLineSeries === 'function') runtime.maSeries = runtime.chart.addLineSeries({ color: '#36b7ff', lineWidth: 2, priceLineVisible: false });
      runtime.maSeries?.setData(movingAverage(runtime.candles, 20));
    } else removeOverlaySeries('ma');
    if (runtime.chartTools.ema) {
      if (!runtime.emaSeries && typeof runtime.chart.addLineSeries === 'function') runtime.emaSeries = runtime.chart.addLineSeries({ color: '#ffbf47', lineWidth: 2, priceLineVisible: false });
      runtime.emaSeries?.setData(exponentialAverage(runtime.candles, 9));
    } else removeOverlaySeries('ema');
  }

  function movingAverage(candles, period) {
    const out = [];
    for (let i = period - 1; i < candles.length; i += 1) {
      const slice = candles.slice(i - period + 1, i + 1);
      const value = slice.reduce((sum, c) => sum + Number(c.close || 0), 0) / period;
      out.push({ time: candles[i].time, value });
    }
    return out;
  }

  function exponentialAverage(candles, period) {
    const out = [];
    const k = 2 / (period + 1);
    let ema = Number(candles[0]?.close || 0);
    candles.forEach((c, i) => {
      const close = Number(c.close || 0);
      ema = i === 0 ? close : close * k + ema * (1 - k);
      if (i >= period - 1) out.push({ time: c.time, value: ema });
    });
    return out;
  }

  function updateQuoteCadence(ms) {
    if (!(ms >= 0)) return;
    runtime.quoteCadence = ms < 800 ? FAST_QUOTE_MS : (ms > 3000 ? SLOW_QUOTE_MS : ACTIVE_QUOTE_MS);
    runtime.quoteCadence = Math.max(MIN_QUOTE_MS, Math.min(SLOW_QUOTE_MS, runtime.quoteCadence));
    runtime.watchCadence = runtime.quoteCadence >= 2000 ? 5000 : WATCHLIST_QUOTE_MS;
  }

  function handleVisibilityChange() {
    if (!document.hidden && state.route === 'trade') {
      loadActiveQuote(runtime.routeToken, true);
      hydrateVisibleQuotes(runtime.routeToken);
    }
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
    runtime.maSeries = null;
    runtime.emaSeries = null;
    runtime.candles = [];
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
    if (runtime.candles.length) {
      const index = runtime.candles.findIndex((item) => item.time === candle.time);
      if (index >= 0) runtime.candles[index] = candle;
      else runtime.candles.push(candle);
      refreshChartOverlays();
    }
  }

  function setChartMessage(message) {
    const overlay = $('[data-chart-overlay]');
    if (!overlay) return;
    overlay.textContent = message || '';
    overlay.classList.toggle('is-hidden', !message);
  }

  function selectSymbol(symbol, type, market) {
    state.symbol = cleanSymbol(symbol || state.symbol);
    if (type && TYPE_BY_KEY[type]) {
      state.type = type;
      state.marketTab = type;
    }
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
    runtime.cleanups.forEach((fn) => { try { fn(); } catch (e) {} });
    runtime.cleanups = [];
    clearTimeout(runtime.resizeTimer);
    runtime.resizeTimer = null;
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

  function setAdaptiveTimer(fn, getMs, token) {
    const schedule = () => {
      if (!isToken(token)) return;
      const delay = Math.max(MIN_QUOTE_MS, Number(getMs()) || ACTIVE_QUOTE_MS);
      const id = setTimeout(async () => {
        runtime.timers.delete(id);
        try { await fn(); } catch (e) {}
        schedule();
      }, delay);
      runtime.timers.add(id);
    };
    schedule();
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

  async function optionalApi(path, options = {}) {
    try {
      return await api(path, options);
    } catch (err) {
      if (isAbort(err)) throw err;
      return { ok: false, error: err.message || 'Request failed' };
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

  function quoteMap(items, fallbackType = state.type) {
    const out = {};
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const q = normalizeQuote(item, fallbackType);
        if (q.symbol) out[q.symbol] = q;
      });
    } else if (items && typeof items === 'object') {
      Object.keys(items).forEach((key) => {
        const q = normalizeQuote(Object.assign({ symbol: key }, items[key] || {}), fallbackType);
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
    let rows = [];
    if (type === 'all') {
      rows = TYPES.flatMap((t) => marketRowsForType(t.key).slice(0, 18));
    } else if (type === 'favorites') {
      const favs = favoriteSymbols();
      rows = TYPES.flatMap((t) => marketRowsForType(t.key)).filter((m) => favs.includes(m.symbol));
      if (!rows.length) rows = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'XAUUSD', 'AAPL'].map(findMarketBySymbol).filter(Boolean);
    } else {
      rows = marketRowsForType(type);
    }
    const term = state.search.trim().toLowerCase();
    if (!term) return rows.slice(0, 80);
    return rows.filter((m) => `${m.symbol} ${m.name}`.toLowerCase().includes(term)).slice(0, 80);
  }

  function marketRowsForType(type) {
    return state.markets[type] && state.markets[type].length ? state.markets[type] : fallbackMarkets(type);
  }

  function favoriteSymbols() {
    try {
      const raw = JSON.parse(localStorage.getItem('vp_favorites') || '[]');
      return Array.isArray(raw) ? raw.map(cleanSymbol).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function findMarketBySymbol(symbol) {
    const target = cleanSymbol(symbol);
    for (const t of TYPES) {
      const row = marketRowsForType(t.key).find((m) => m.symbol === target);
      if (row) return row;
    }
    return null;
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
    const rows = marketRowsForType(type);
    return (rows[0] && rows[0].symbol) || '';
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

  function kycStatusLabel() {
    const status = String((state.kyc && state.kyc.status) || 'not_submitted').toLowerCase();
    if (status === 'approved') return { label: 'Approved', className: 'is-live', text: 'Real deposits, withdrawals, and earn products are enabled.' };
    if (status === 'pending' || status === 'submitted') return { label: 'Pending', className: 'is-delayed', text: 'Your documents are waiting for admin review.' };
    if (status === 'rejected') return { label: 'Rejected', className: 'is-unavailable', text: 'Please review the admin note and submit updated documents.' };
    return { label: 'Required', className: 'is-stale', text: 'Submit KYC documents before using real-money flows.' };
  }

  function levelName(level) {
    if (!level) return 'Starter';
    return String(level.name || level.name_en || level.level_code || level.code || 'Starter');
  }

  function displayTypeLabel(type) {
    if (type === 'futures') return 'Perpetual';
    return (TYPE_BY_KEY[type] && TYPE_BY_KEY[type].label) || type || 'Market';
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (['approved', 'confirmed', 'completed', 'paid', 'active', 'closed'].includes(s)) return 'is-live';
    if (['pending', 'requested', 'review', 'processing'].includes(s)) return 'is-delayed';
    if (['rejected', 'failed', 'cancelled', 'canceled'].includes(s)) return 'is-unavailable';
    return 'is-stale';
  }

  function normalizePaymentFields(fields, kind) {
    const rows = Array.isArray(fields) ? fields : [];
    if (rows.length) {
      return rows.map((f, i) => ({
        key: String(f.key || f.name || f.id || `field_${i + 1}`),
        label: String(f.label || f.title || f.placeholder || f.key || f.name || `Field ${i + 1}`),
        type: String(f.type || 'text'),
        required: f.required !== false,
        placeholder: String(f.placeholder || ''),
        options: Array.isArray(f.options) ? f.options : []
      }));
    }
    if (kind === 'withdraw') {
      return [
        { key: 'destination', label: 'Wallet address / destination', type: 'text', required: true, placeholder: 'USDT address, bank account, or payout details' },
        { key: 'network', label: 'Network / channel', type: 'text', required: false, placeholder: 'TRC20, ERC20, bank, Vodafone Cash...' }
      ];
    }
    return [
      { key: 'sender_name', label: 'Sender name', type: 'text', required: false, placeholder: 'Name used for payment' },
      { key: 'transaction_ref', label: 'Transaction reference', type: 'text', required: false, placeholder: 'Hash, receipt number, or bank reference' }
    ];
  }

  function paymentFieldControl(field) {
    const required = field.required ? ' required' : '';
    if (field.type === 'select' && field.options.length) {
      return `<label class="field"><span>${esc(field.label)}</span><select name="${escAttr(field.key)}"${required}>${field.options.map((opt) => {
        const value = typeof opt === 'object' ? (opt.value ?? opt.key ?? opt.label) : opt;
        const label = typeof opt === 'object' ? (opt.label ?? opt.value ?? opt.key) : opt;
        return `<option value="${escAttr(value)}">${esc(label)}</option>`;
      }).join('')}</select></label>`;
    }
    const inputType = ['email', 'tel', 'number'].includes(field.type) ? field.type : 'text';
    return `<label class="field"><span>${esc(field.label)}</span><input name="${escAttr(field.key)}" type="${inputType}" placeholder="${escAttr(field.placeholder || '')}"${required} /></label>`;
  }

  function collectFormDetails(form) {
    const details = {};
    Array.from(form.elements || []).forEach((el) => {
      if (!el.name || el.name === 'amount' || el.type === 'file') return;
      details[el.name] = String(el.value || '').trim();
    });
    return details;
  }

  function idemKey(scope) {
    const rand = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `vp-lite-${scope}-${rand}`;
  }

  function dateText(ts) {
    if (!ts) return '--';
    const n = Number(ts);
    try {
      const date = n > 0 ? new Date(n * 1000) : new Date(String(ts).replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return '--';
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--';
    }
  }

  function defaultMarket(type) {
    return type === 'futures' ? 'perp' : 'spot';
  }

  function rememberSelection() {
    safeStorage('vp_market_type', state.type, true);
    safeStorage('vp_market_tab', state.marketTab || state.type, true);
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


  function buildBrandLogoSvg(name, tagline) {
    const safeName = esc(String(name || 'VertexPluse').slice(0, 18));
    const initials = safeName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'VP';
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="vpLogoGrad" x1="8" x2="56" y1="8" y2="58"><stop stop-color="#5d7cff"/><stop offset="1" stop-color="#24d28d"/></linearGradient></defs><rect x="6" y="6" width="52" height="52" rx="16" fill="url(#vpLogoGrad)"/><path d="M18 38 28 18l8 18 7-13 5 15" fill="none" stroke="rgba(255,255,255,.94)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="49" text-anchor="middle" font-size="10" font-weight="900" fill="white">${esc(initials)}</text></svg>`;
  }

  function uiIcon(name) {
    return UI_ICONS[name] || UI_ICONS.home || esc(String(name || '').slice(0, 1).toUpperCase());
  }

  function marketLogo(item, extraClass = '') {
    const symbol = cleanSymbol(item && item.symbol || item || 'V');
    const visual = SYMBOL_VISUALS[symbol] || TYPE_VISUALS[(item && item.type) || state.type] || { short: assetInitial(symbol), family: 'default' };
    const iconUrl = safeIconUrl((item && (item.icon_url || item.logo_url)) || visual.icon || '');
    const classes = ['market-logo', `family-${visual.family || 'default'}`, extraClass].filter(Boolean).join(' ');
    if (iconUrl) {
      return `<span class="${escAttr(classes)}"><img src="${escAttr(iconUrl)}" alt="${escAttr(symbol)}" loading="lazy" decoding="async"><em>${esc(visual.short || assetInitial(symbol))}</em></span>`;
    }
    return `<span class="${escAttr(classes)} fallback"><em>${esc(visual.short || assetInitial(symbol))}</em></span>`;
  }
  function safeIconUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/assets\/img\//i.test(url)) return url;
    if (/^(?:\.\/)?assets\/img\//i.test(url)) return url.startsWith('./') ? url : `./${url}`;
    return '';
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
