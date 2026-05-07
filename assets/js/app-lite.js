(function () {
  'use strict';

  const root = document.getElementById('app');
  const api = {
    bootstrap: '/api/bootstrap.php',
    quotes: '/api/quotes.php',
    candles: '/api/trade/candles.php',
    portfolio: '/api/trade/portfolio.php',
    orders: '/api/trade/orders.php',
    wallet: '/api/wallet/summary.php',
    placeOrder: '/api/trade/place_order.php',
    closePosition: '/api/trade/close_position.php'
  };
  const tabs = [
    { key: 'crypto', label: 'Crypto' },
    { key: 'forex', label: 'Forex' },
    { key: 'stocks', label: 'Stocks' },
    { key: 'commodities', label: 'Commodities' },
    { key: 'futures', label: 'Futures' },
    { key: 'arab', label: 'Arab' }
  ];
  const state = {
    booted: false,
    brand: {
      name: window.__BRAND_NAME || 'VertexPluse',
      tagline: window.__BRAND_TAGLINE || 'Professional trading & investment platform',
      logo_url: window.__BRAND_LOGO_URL || './assets/img/vertexpluse-logo.svg',
      support_email: window.__SUPPORT_EMAIL || 'support@vertexpluse.com'
    },
    user: null,
    wallet: null,
    markets: {},
    flags: {},
    route: normalizeRoute(location.hash),
    mode: localStorage.getItem('vp-lite-mode') === 'real' ? 'real' : 'demo',
    activeTab: localStorage.getItem('vp-lite-tab') || 'crypto',
    activeSymbol: localStorage.getItem('vp-lite-symbol') || '',
    activeType: localStorage.getItem('vp-lite-type') || 'crypto',
    activeMarket: localStorage.getItem('vp-lite-market') || 'spot',
    timeframe: localStorage.getItem('vp-lite-tf') || '1m',
    quote: null,
    quoteMap: {},
    portfolio: null,
    orders: [],
    intervals: {},
    inflight: {},
    chart: null,
    candleSeries: null,
    chartSymbolKey: '',
    lastCandle: null
  };

  function normalizeRoute(hash) {
    const route = (hash || '#/home').replace(/^#/, '');
    return ['/home', '/trade', '/portfolio', '/wallet', '/account'].includes(route) ? route : '/home';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
    });
  }

  function money(value, currency) {
    const number = Number(value || 0);
    const digits = Math.abs(number) >= 1000 ? 2 : Math.abs(number) >= 1 ? 4 : 6;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits }) + (currency ? ' ' + currency : '');
  }

  function compactPrice(value) {
    const number = Number(value || 0);
    if (!number) return '—';
    const digits = Math.abs(number) >= 1000 ? 2 : Math.abs(number) >= 1 ? 4 : 6;
    return number.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function pct(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? '+' : '';
    return sign + number.toFixed(2) + '%';
  }

  function sourceLabel(item) {
    if (!item) return 'waiting';
    const timing = String(item.timing_class || '').toLowerCase();
    const source = String(item.source || '').toLowerCase();
    if (item.delayed || timing === 'delayed') return 'delayed';
    if (timing === 'stale' || item.is_stale) return 'stale';
    if (source.includes('synthetic') || source.includes('seed')) return 'reference';
    if (source && source !== 'unavailable') return source.replace(/_/g, ' ');
    return 'unavailable';
  }

  async function getJson(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin', headers: { Accept: 'application/json' } }, options || {}));
    const data = await response.json().catch(function () { return { ok: false, error: 'Invalid JSON response' }; });
    if (!response.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + response.status));
    return data;
  }

  async function postJson(url, body) {
    return getJson(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  }

  function toast(message) {
    let node = document.querySelector('.vp-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'vp-toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(node._timer);
    node._timer = setTimeout(function () { node.classList.remove('is-visible'); }, 3600);
  }

  function setBusy(key, busy) {
    state.inflight[key] = busy;
  }

  function clearPollers() {
    Object.keys(state.intervals).forEach(function (key) {
      clearInterval(state.intervals[key]);
      delete state.intervals[key];
    });
  }

  function setPoller(key, fn, ms, immediate) {
    clearInterval(state.intervals[key]);
    if (immediate) fn();
    state.intervals[key] = setInterval(fn, ms);
  }

  async function bootstrap() {
    root.innerHTML = bootHtml();
    try {
      const data = await getJson(api.bootstrap);
      state.booted = true;
      state.user = data.user || null;
      state.wallet = data.wallet || null;
      state.markets = data.markets || {};
      state.flags = data.feature_flags || {};
      state.brand = Object.assign(state.brand, data.brand || {});
      chooseInitialMarket();
      render();
      startRouteWork();
    } catch (error) {
      root.innerHTML = '<div class="vp-error"><div class="vp-card"><div class="vp-card__body"><h2>Unable to load workspace</h2><p class="vp-muted">' + esc(error.message) + '</p><button class="vp-btn" data-action="retry">Retry</button></div></div></div>';
    }
  }

  function bootHtml() {
    return '<div class="vp-boot"><div class="vp-boot__mark">V</div><div><strong>' + esc(state.brand.name) + '</strong><span>Loading trading workspace...</span></div></div>';
  }

  function chooseInitialMarket() {
    const groups = state.markets || {};
    if (!groups[state.activeTab] || !groups[state.activeTab].length) {
      const found = tabs.find(function (tab) { return groups[tab.key] && groups[tab.key].length; });
      state.activeTab = found ? found.key : 'crypto';
    }
    const list = groups[state.activeTab] || [];
    const selected = list.find(function (item) { return item.symbol === state.activeSymbol; }) || list[0];
    if (selected) setActiveMarket(selected, false);
  }

  function setActiveMarket(item, rerender) {
    state.activeSymbol = String(item.symbol || '').toUpperCase();
    state.activeType = item.type || state.activeTab || 'crypto';
    state.activeMarket = item.market || (state.activeType === 'futures' ? 'perp' : 'spot');
    localStorage.setItem('vp-lite-symbol', state.activeSymbol);
    localStorage.setItem('vp-lite-type', state.activeType);
    localStorage.setItem('vp-lite-market', state.activeMarket);
    if (rerender !== false) {
      state.chartSymbolKey = '';
      state.quote = null;
      render();
      startRouteWork();
    }
  }

  function navHtml() {
    const items = [['/home', 'Home'], ['/trade', 'Trade'], ['/portfolio', 'Portfolio'], ['/wallet', 'Wallet'], ['/account', 'Account']];
    return '<nav class="vp-nav">' + items.map(function (item) {
      return '<a class="' + (state.route === item[0] ? 'is-active' : '') + '" href="#' + item[0] + '">' + item[1] + '</a>';
    }).join('') + '</nav>';
  }

  function topbarHtml() {
    const wallet = state.wallet && state.wallet[state.mode] ? state.wallet[state.mode] : {};
    return '<header class="vp-topbar"><div class="vp-brand"><div class="vp-logo">V</div><div><h1>' + esc(state.brand.name) + '</h1><span>' + esc(state.brand.tagline) + '</span></div></div><div class="vp-account"><span class="vp-balance">' + esc(state.mode.toUpperCase()) + ' · ' + esc(money(wallet.available, wallet.currency)) + '</span><select class="vp-mode" data-action="mode"><option value="demo"' + (state.mode === 'demo' ? ' selected' : '') + '>Demo</option><option value="real"' + (state.mode === 'real' ? ' selected' : '') + '>Real</option></select></div></header>';
  }

  function render() {
    if (!state.booted) return;
    root.innerHTML = '<div class="vp-shell">' + topbarHtml() + navHtml() + '<main class="vp-main"><section class="vp-page">' + routeHtml() + '</section></main></div>';
    bindUi();
    if (state.route === '/trade') requestAnimationFrame(initChart);
  }

  function routeHtml() {
    if (state.route === '/trade') return tradeHtml();
    if (state.route === '/portfolio') return portfolioHtml();
    if (state.route === '/wallet') return walletHtml();
    if (state.route === '/account') return accountHtml();
    return homeHtml();
  }

  function homeHtml() {
    const active = activeMarket();
    const wallet = state.wallet || {};
    const positions = (state.portfolio && state.portfolio.positions) || [];
    return '<div class="vp-grid vp-dashboard"><div class="vp-card"><div class="vp-card__head"><div><h2>Trading dashboard</h2><span class="vp-muted">Fast shell · controlled network usage</span></div><a class="vp-btn" href="#/trade">Open Trade</a></div><div class="vp-card__body"><div class="vp-kpis"><div class="vp-kpi"><span>Demo available</span><strong>' + esc(money(wallet.demo && wallet.demo.available, wallet.demo && wallet.demo.currency)) + '</strong></div><div class="vp-kpi"><span>Real available</span><strong>' + esc(money(wallet.real && wallet.real.available, wallet.real && wallet.real.currency)) + '</strong></div><div class="vp-kpi"><span>Active symbol</span><strong>' + esc(active.symbol || '—') + '</strong></div><div class="vp-kpi"><span>Open positions</span><strong>' + positions.length + '</strong></div></div></div></div><div class="vp-card"><div class="vp-card__head"><h3>Market focus</h3><span class="vp-source">' + esc(sourceLabel(state.quote || active)) + '</span></div><div class="vp-card__body">' + heroPriceHtml() + '</div></div></div>';
  }

  function tradeHtml() {
    return '<div class="vp-grid vp-trade-grid"><div class="vp-card"><div class="vp-card__head"><h3>Watchlist</h3></div><div class="vp-card__body">' + tabsHtml() + '<div class="vp-watchlist">' + watchlistHtml() + '</div></div></div><div class="vp-trade-main vp-grid"><div class="vp-card"><div class="vp-card__head">' + heroPriceHtml(true) + timeframeHtml() + '</div><div class="vp-chart-wrap"><div id="vp-chart"></div><div id="vp-chart-note" class="vp-chart-note">Loading chart...</div></div></div><div class="vp-card"><div class="vp-card__head"><h3>Active positions</h3><button class="vp-btn vp-btn--ghost" data-action="refresh-portfolio">Refresh</button></div><div class="vp-scroll" data-panel="positions">' + positionsTableHtml() + '</div></div></div><div class="vp-side-stack"><div class="vp-card"><div class="vp-card__head"><h3>Order ticket</h3><span class="vp-status">' + esc(state.mode.toUpperCase()) + '</span></div><div class="vp-card__body">' + orderTicketHtml() + '</div></div><div class="vp-card"><div class="vp-card__head"><h3>Orders / history</h3></div><div class="vp-scroll" data-panel="orders">' + ordersTableHtml() + '</div></div></div></div>';
  }

  function portfolioHtml() {
    return '<div class="vp-grid"><div class="vp-card"><div class="vp-card__head"><h2>Portfolio</h2><button class="vp-btn vp-btn--ghost" data-action="refresh-portfolio">Refresh</button></div><div class="vp-card__body"><div class="vp-kpis"><div class="vp-kpi"><span>Equity</span><strong>' + esc(money(state.portfolio && state.portfolio.equity, 'USDT')) + '</strong></div><div class="vp-kpi"><span>Unrealized PnL</span><strong class="' + pnlClass(state.portfolio && state.portfolio.unrealized_pnl) + '">' + esc(money(state.portfolio && state.portfolio.unrealized_pnl, 'USDT')) + '</strong></div><div class="vp-kpi"><span>Realized PnL</span><strong class="' + pnlClass(state.portfolio && state.portfolio.realized_pnl) + '">' + esc(money(state.portfolio && state.portfolio.realized_pnl, 'USDT')) + '</strong></div><div class="vp-kpi"><span>Mode</span><strong>' + esc(state.mode.toUpperCase()) + '</strong></div></div></div></div><div class="vp-card"><div class="vp-card__head"><h3>Positions</h3></div><div class="vp-scroll">' + positionsTableHtml() + '</div></div><div class="vp-card"><div class="vp-card__head"><h3>Orders</h3></div><div class="vp-scroll">' + ordersTableHtml() + '</div></div></div>';
  }

  function walletHtml() {
    const wallet = state.wallet || {};
    return '<div class="vp-grid vp-dashboard"><div class="vp-card"><div class="vp-card__head"><h2>Wallet summary</h2><button class="vp-btn vp-btn--ghost" data-action="refresh-wallet">Refresh</button></div><div class="vp-card__body"><div class="vp-kpis"><div class="vp-kpi"><span>Demo balance</span><strong>' + esc(money(wallet.demo && wallet.demo.balance, wallet.demo && wallet.demo.currency)) + '</strong><span>Available ' + esc(money(wallet.demo && wallet.demo.available, wallet.demo && wallet.demo.currency)) + '</span></div><div class="vp-kpi"><span>Real balance</span><strong>' + esc(money(wallet.real && wallet.real.balance, wallet.real && wallet.real.currency)) + '</strong><span>Available ' + esc(money(wallet.real && wallet.real.available, wallet.real && wallet.real.currency)) + '</span></div></div></div></div><div class="vp-card"><div class="vp-card__head"><h3>Funding</h3></div><div class="vp-card__body"><p class="vp-muted">Use the existing deposit and withdrawal pages for funding operations. This lightweight shell keeps trading fast and avoids background wallet spam.</p></div></div></div>';
  }

  function accountHtml() {
    const user = state.user || {};
    return '<div class="vp-card"><div class="vp-card__head"><h2>Account</h2></div><div class="vp-card__body"><div class="vp-kpis"><div class="vp-kpi"><span>Name</span><strong>' + esc(user.display_name || user.name || 'User') + '</strong></div><div class="vp-kpi"><span>Email</span><strong>' + esc(user.email || '—') + '</strong></div><div class="vp-kpi"><span>Language</span><strong>' + esc(user.lang || user.locale || 'en') + '</strong></div><div class="vp-kpi"><span>Support</span><strong>' + esc(state.brand.support_email) + '</strong></div></div></div></div>';
  }

  function tabsHtml() {
    return '<div class="vp-tabs">' + tabs.filter(function (tab) { return state.markets[tab.key] && state.markets[tab.key].length; }).map(function (tab) {
      return '<button class="vp-tab ' + (state.activeTab === tab.key ? 'is-active' : '') + '" data-tab="' + esc(tab.key) + '">' + esc(tab.label) + '</button>';
    }).join('') + '</div>';
  }

  function watchlistHtml() {
    const list = state.markets[state.activeTab] || [];
    if (!list.length) return '<div class="vp-empty">No markets available.</div>';
    return list.map(function (item) {
      const quote = state.quoteMap[item.symbol] || item;
      const change = Number(quote.change_pct || item.change_pct || 0);
      return '<button class="vp-market-row ' + (item.symbol === state.activeSymbol ? 'is-active' : '') + '" data-symbol="' + esc(item.symbol) + '"><div><div class="vp-symbol">' + esc(item.symbol) + '</div><div class="vp-name">' + esc(item.name || item.symbol) + '</div></div><div><div class="vp-price">' + esc(compactPrice(quote.price || item.price)) + '</div><div class="vp-change ' + (change >= 0 ? 'is-up' : 'is-down') + '">' + esc(pct(change)) + '</div></div></button>';
    }).join('');
  }

  function activeMarket() {
    const list = state.markets[state.activeTab] || [];
    return list.find(function (item) { return item.symbol === state.activeSymbol; }) || list[0] || {};
  }

  function heroPriceHtml() {
    const active = activeMarket();
    const quote = state.quote || active;
    const change = Number((quote && quote.change_pct) || 0);
    return '<div class="vp-hero-price"><span class="vp-muted">' + esc(active.name || state.activeSymbol || 'Market') + '</span><strong>' + esc(compactPrice(quote && quote.price)) + '</strong><div class="vp-hero-line"><span class="' + (change >= 0 ? 'is-up' : 'is-down') + '">' + esc(pct(change)) + '</span><span class="vp-status">' + esc(state.activeSymbol || '—') + '</span><span class="vp-source">' + esc(sourceLabel(quote)) + '</span></div></div>';
  }

  function timeframeHtml() {
    const frames = ['1m', '5m', '15m', '1h', '1d'];
    return '<div class="vp-segment">' + frames.map(function (tf) { return '<button class="vp-chip ' + (state.timeframe === tf ? 'is-active' : '') + '" data-tf="' + tf + '">' + tf + '</button>'; }).join('') + '</div>';
  }

  function orderTicketHtml() {
    return '<form class="vp-form" data-form="order"><div class="vp-field"><label>Symbol</label><input readonly value="' + esc(state.activeSymbol || '') + '"></div><div class="vp-field"><label>USD amount</label><input name="amount" type="number" min="1" step="1" value="100"></div><div class="vp-field"><label>Market</label><select name="market_type"><option value="spot"' + (state.activeMarket === 'spot' ? ' selected' : '') + '>Spot</option><option value="perp"' + (state.activeMarket === 'perp' ? ' selected' : '') + '>Perp</option></select></div><div class="vp-field"><label>Leverage</label><input name="leverage" type="number" min="1" max="125" step="1" value="1"></div><div class="vp-actions"><button class="vp-btn" name="side" value="BUY" type="submit">Buy</button><button class="vp-btn vp-btn--danger" name="side" value="SELL" type="submit">Sell</button></div></form>';
  }

  function pnlClass(value) {
    return Number(value || 0) >= 0 ? 'is-up' : 'is-down';
  }

  function positionsTableHtml() {
    const positions = (state.portfolio && state.portfolio.positions) || [];
    if (!positions.length) return '<div class="vp-empty">No open positions.</div>';
    return '<table class="vp-table"><thead><tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>PnL</th><th></th></tr></thead><tbody>' + positions.map(function (item) {
      return '<tr><td>' + esc(item.symbol) + '</td><td>' + esc(item.side) + '</td><td>' + esc(money(item.margin_initial || item.qty * item.entry_price, '')) + '</td><td>' + esc(compactPrice(item.entry_price)) + '</td><td>' + esc(compactPrice(item.mark_price)) + '</td><td class="' + pnlClass(item.unrealized_pnl) + '">' + esc(money(item.unrealized_pnl, 'USDT')) + '</td><td><button class="vp-btn vp-btn--danger" data-close="' + esc(item.id) + '">Close</button></td></tr>';
    }).join('') + '</tbody></table>';
  }

  function ordersTableHtml() {
    const orders = state.orders || [];
    if (!orders.length) return '<div class="vp-empty">No orders yet.</div>';
    return '<table class="vp-table"><thead><tr><th>Symbol</th><th>Side</th><th>Status</th><th>Entry</th><th>PnL</th></tr></thead><tbody>' + orders.slice(0, 12).map(function (item) {
      return '<tr><td>' + esc(item.symbol) + '</td><td>' + esc(item.side) + '</td><td>' + esc(item.status) + '</td><td>' + esc(compactPrice(item.entry_price || item.fill_price)) + '</td><td class="' + pnlClass(item.pnl_usd) + '">' + esc(money(item.pnl_usd, 'USDT')) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  function updateTradeTables() {
    const positionWrap = root.querySelector('[data-panel="positions"]');
    if (positionWrap) {
      positionWrap.innerHTML = positionsTableHtml();
      positionWrap.querySelectorAll('[data-close]').forEach(function (node) {
        node.addEventListener('click', function () { closePosition(node.dataset.close); });
      });
    }
    const orderWrap = root.querySelector('[data-panel="orders"]');
    if (orderWrap) orderWrap.innerHTML = ordersTableHtml();
  }
  function bindMarketRows(scope) {
    (scope || root).querySelectorAll('[data-symbol]').forEach(function (node) {
      node.addEventListener('click', function () {
        const item = (state.markets[state.activeTab] || []).find(function (market) { return market.symbol === node.dataset.symbol; });
        if (item) setActiveMarket(item, true);
      });
    });
  }
  function bindUi() {
    root.querySelectorAll('[data-tab]').forEach(function (node) {
      node.addEventListener('click', function () {
        state.activeTab = node.dataset.tab;
        localStorage.setItem('vp-lite-tab', state.activeTab);
        const next = (state.markets[state.activeTab] || [])[0];
        if (next) setActiveMarket(next, true);
      });
    });

    bindMarketRows(root);

    root.querySelectorAll('[data-tf]').forEach(function (node) {
      node.addEventListener('click', function () {
        state.timeframe = node.dataset.tf || '1m';
        localStorage.setItem('vp-lite-tf', state.timeframe);
        state.chartSymbolKey = '';
        render();
        startRouteWork();
      });
    });
    const mode = root.querySelector('[data-action="mode"]');
    if (mode) mode.addEventListener('change', function () {
      state.mode = mode.value === 'real' ? 'real' : 'demo';
      localStorage.setItem('vp-lite-mode', state.mode);
      render();
      refreshAfterTrade();
      startRouteWork();
    });
    root.querySelectorAll('[data-action="refresh-portfolio"]').forEach(function (node) { node.addEventListener('click', refreshAfterTrade); });
    root.querySelectorAll('[data-action="refresh-wallet"]').forEach(function (node) { node.addEventListener('click', refreshWallet); });
    root.querySelectorAll('[data-close]').forEach(function (node) { node.addEventListener('click', function () { closePosition(node.dataset.close); }); });
    const form = root.querySelector('[data-form="order"]');
    if (form) form.addEventListener('submit', submitOrder);
  }

  async function refreshActiveQuote() {
    if (!state.activeSymbol || state.inflight.activeQuote) return;
    setBusy('activeQuote', true);
    try {
      const params = new URLSearchParams({ symbol: state.activeSymbol, type: state.activeType, purpose: 'focus' });
      const data = await getJson(api.quotes + '?' + params.toString());
      const quote = data.items && data.items[0] ? data.items[0] : null;
      if (quote) {
        state.quote = quote;
        state.quoteMap[quote.symbol] = quote;
        updateQuoteDom(quote);
        updateChartTail(quote);
      }
    } catch (error) {
      console.warn('active quote failed', error.message);
    } finally {
      setBusy('activeQuote', false);
    }
  }

  async function refreshWatchlistQuotes() {
    const list = (state.markets[state.activeTab] || []).slice(0, 16);
    if (!list.length || state.inflight.watchlist) return;
    setBusy('watchlist', true);
    try {
      const params = new URLSearchParams({ symbols: list.map(function (item) { return item.symbol; }).join(','), type: state.activeTab, visible: '1' });
      const data = await getJson(api.quotes + '?' + params.toString());
      (data.items || []).forEach(function (item) { state.quoteMap[item.symbol] = item; });
      if (state.route === '/trade') {
        const watch = root.querySelector('.vp-watchlist');
        if (watch) {
          watch.innerHTML = watchlistHtml();
          bindMarketRows(watch);
        }
      }
    } catch (error) {
      console.warn('watchlist quotes failed', error.message);
    } finally {
      setBusy('watchlist', false);
    }
  }

  function updateQuoteDom(quote) {
    if (state.route !== '/trade' && state.route !== '/home') return;
    root.querySelectorAll('.vp-hero-price strong').forEach(function (node) { node.textContent = compactPrice(quote.price); });
    root.querySelectorAll('.vp-source').forEach(function (node) { node.textContent = sourceLabel(quote); });
  }

  async function refreshPortfolio() {
    if (state.inflight.portfolio) return;
    setBusy('portfolio', true);
    try {
      const data = await getJson(api.portfolio + '?mode=' + encodeURIComponent(state.mode));
      state.portfolio = data;
      const orders = await getJson(api.orders + '?mode=' + encodeURIComponent(state.mode) + '&limit=60');
      state.orders = orders.items || data.orders || [];
    } catch (error) {
      console.warn('portfolio refresh failed', error.message);
    } finally {
      setBusy('portfolio', false);
    }
  }

  async function refreshWallet() {
    try {
      const data = await getJson(api.wallet);
      state.wallet = { real: data.real, demo: data.demo };
      render();
    } catch (error) {
      toast(error.message);
    }
  }

  async function refreshAfterTrade() {
    await Promise.all([refreshPortfolio(), refreshWallet()]);
    render();
  }

  async function submitOrder(event) {
    event.preventDefault();
    const submitter = event.submitter;
    const form = event.currentTarget;
    const amount = Number(form.elements.amount.value || 0);
    const marketType = form.elements.market_type.value || state.activeMarket || 'spot';
    const leverage = Number(form.elements.leverage.value || 1);
    const side = submitter && submitter.value === 'SELL' ? 'SELL' : 'BUY';
    if (!state.activeSymbol || !(amount > 0)) {
      toast('Enter a valid amount.');
      return;
    }
    submitter.disabled = true;
    try {
      await postJson(api.placeOrder, { symbol: state.activeSymbol, asset_type: state.activeType, market_type: marketType, side: side, order_type: 'MARKET', usd: amount, leverage: leverage, mode: state.mode });
      toast(side + ' order filled.');
      await refreshAfterTrade();
    } catch (error) {
      toast(error.message);
    } finally {
      submitter.disabled = false;
    }
  }

  async function closePosition(id) {
    if (!id) return;
    try {
      await postJson(api.closePosition, { id: Number(id), mode: state.mode });
      toast('Position closed.');
      await refreshAfterTrade();
    } catch (error) {
      toast(error.message);
    }
  }

  function initChart() {
    const container = document.getElementById('vp-chart');
    if (!container || typeof LightweightCharts === 'undefined') return;
    state.chart = LightweightCharts.createChart(container, {
      layout: { background: { color: 'transparent' }, textColor: '#8fa2bd' },
      grid: { vertLines: { color: 'rgba(148,163,184,.08)' }, horzLines: { color: 'rgba(148,163,184,.08)' } },
      rightPriceScale: { borderColor: 'rgba(148,163,184,.16)' },
      timeScale: { borderColor: 'rgba(148,163,184,.16)', timeVisible: true },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal }
    });
    state.candleSeries = state.chart.addCandlestickSeries({ upColor: '#18c98b', downColor: '#ff5c7a', borderUpColor: '#18c98b', borderDownColor: '#ff5c7a', wickUpColor: '#18c98b', wickDownColor: '#ff5c7a' });
    resizeChart();
    state.chartSymbolKey = '';
    loadCandles();
  }

  function resizeChart() {
    const container = document.getElementById('vp-chart');
    if (state.chart && container) state.chart.applyOptions({ width: container.clientWidth, height: container.clientHeight || 330 });
  }

  function chartNote(message, visible) {
    const node = document.getElementById('vp-chart-note');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-visible', !!visible);
  }

  async function loadCandles() {
    const key = [state.activeSymbol, state.activeType, state.activeMarket, state.timeframe].join('|');
    if (!state.activeSymbol || state.chartSymbolKey === key || state.inflight.candles) return;
    state.chartSymbolKey = key;
    state.lastCandle = null;
    chartNote('Loading chart...', true);
    setBusy('candles', true);
    const timer = setTimeout(function () { chartNote('Real chart temporarily unavailable', true); }, 3500);
    try {
      const params = new URLSearchParams({ symbol: state.activeSymbol, type: state.activeType, market: state.activeMarket, tf: state.timeframe, limit: '180' });
      const data = await getJson(api.candles + '?' + params.toString());
      const items = (data.items || []).map(function (item) { return { time: Number(item.time), open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close) }; }).filter(function (item) { return item.time && item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0; });
      const source = String(data.source || '').toLowerCase();
      const synthetic = data.synthetic === true || source.indexOf('synthetic') === 0 || !items.length;
      if (state.candleSeries) state.candleSeries.setData(items);
      state.lastCandle = items.length ? items[items.length - 1] : null;
      if (state.chart) state.chart.timeScale().fitContent();
      chartNote(synthetic ? 'Real chart temporarily unavailable' : '', synthetic);
    } catch (error) {
      chartNote('Real chart temporarily unavailable', true);
    } finally {
      clearTimeout(timer);
      setBusy('candles', false);
    }
  }

  function updateChartTail(quote) {
    if (!state.candleSeries || !state.lastCandle || !quote || !(Number(quote.price) > 0)) return;
    const price = Number(quote.price);
    const step = timeframeSeconds(state.timeframe);
    const bucket = Math.floor(Date.now() / 1000 / step) * step;
    let candle = state.lastCandle;
    if (bucket > candle.time) {
      candle = { time: bucket, open: candle.close, high: Math.max(candle.close, price), low: Math.min(candle.close, price), close: price };
    } else {
      candle = Object.assign({}, candle, { high: Math.max(candle.high, price), low: Math.min(candle.low, price), close: price });
    }
    state.lastCandle = candle;
    state.candleSeries.update(candle);
  }

  function timeframeSeconds(tf) {
    if (tf === '5m') return 300;
    if (tf === '15m') return 900;
    if (tf === '1h') return 3600;
    if (tf === '1d') return 86400;
    return 60;
  }

  function startRouteWork() {
    clearPollers();
    if (state.route === '/trade') {
      refreshPortfolio().then(function () { if (state.route === '/trade') updateTradeTables(); });
      setPoller('activeQuote', refreshActiveQuote, 2600, true);
      setPoller('watchlist', refreshWatchlistQuotes, 7000, true);
      setPoller('portfolio', function () { refreshPortfolio().then(function () { if (state.route === '/trade') updateTradeTables(); }); }, 14000, false);
      return;
    }
    if (state.route === '/home') {
      setPoller('activeQuote', refreshActiveQuote, 3000, true);
      refreshPortfolio().then(function () { if (state.route === '/home') render(); });
      return;
    }
    if (state.route === '/portfolio') {
      refreshPortfolio().then(render);
      setPoller('portfolio', function () { refreshPortfolio().then(function () { if (state.route === '/portfolio') render(); }); }, 15000, false);
      return;
    }
    if (state.route === '/wallet') setPoller('wallet', refreshWallet, 15000, false);
  }

  window.addEventListener('resize', resizeChart, { passive: true });
  window.addEventListener('hashchange', function () {
    state.route = normalizeRoute(location.hash);
    render();
    startRouteWork();
  });
  document.addEventListener('click', function (event) {
    const retry = event.target.closest('[data-action="retry"]');
    if (retry) bootstrap();
  });
  bootstrap();
})();