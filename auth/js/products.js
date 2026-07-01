/* ============================================================
   PRODUCTS.JS — Live price simulation engine for product pages
   - Random walk with realistic volatility per market
   - Animated sparklines (last 30 ticks)
   - Bid/ask cells flash on tick
   - Filter by category
   ============================================================ */
(function () {
  'use strict';

  const NS = (window.MEXProducts = window.MEXProducts || {});

  /* ---------- DATA ---------- */
  NS.SYMBOLS = {
    forex: [
      { sym:'EURUSD', name:'EUR/USD', desc:'يورو / دولار أمريكي', price:1.08524, dec:5, spread:0.5, vol:0.00018, cat:'major' },
      { sym:'GBPUSD', name:'GBP/USD', desc:'إسترليني / دولار', price:1.26432, dec:5, spread:0.7, vol:0.00022, cat:'major' },
      { sym:'USDJPY', name:'USD/JPY', desc:'دولار / ين ياباني', price:149.342, dec:3, spread:0.6, vol:0.025, cat:'major' },
      { sym:'USDCHF', name:'USD/CHF', desc:'دولار / فرنك سويسري', price:0.88142, dec:5, spread:0.8, vol:0.00021, cat:'major' },
      { sym:'AUDUSD', name:'AUD/USD', desc:'دولار أسترالي / أمريكي', price:0.65728, dec:5, spread:0.6, vol:0.00019, cat:'major' },
      { sym:'NZDUSD', name:'NZD/USD', desc:'نيوزيلندي / أمريكي', price:0.60134, dec:5, spread:0.9, vol:0.00021, cat:'major' },
      { sym:'USDCAD', name:'USD/CAD', desc:'دولار / كندي', price:1.36218, dec:5, spread:0.7, vol:0.00022, cat:'major' },
      { sym:'EURGBP', name:'EUR/GBP', desc:'يورو / إسترليني', price:0.85842, dec:5, spread:0.9, vol:0.00016, cat:'cross' },
      { sym:'EURJPY', name:'EUR/JPY', desc:'يورو / ين ياباني', price:162.114, dec:3, spread:1.0, vol:0.030, cat:'cross' },
      { sym:'GBPJPY', name:'GBP/JPY', desc:'إسترليني / ين', price:188.846, dec:3, spread:1.4, vol:0.038, cat:'cross' },
      { sym:'AUDJPY', name:'AUD/JPY', desc:'أسترالي / ين', price:98.124, dec:3, spread:1.1, vol:0.026, cat:'cross' },
      { sym:'EURCHF', name:'EUR/CHF', desc:'يورو / فرنك', price:0.95624, dec:5, spread:1.2, vol:0.00018, cat:'cross' },
      { sym:'GBPCHF', name:'GBP/CHF', desc:'إسترليني / فرنك', price:1.11432, dec:5, spread:1.5, vol:0.00024, cat:'cross' },
      { sym:'AUDNZD', name:'AUD/NZD', desc:'أسترالي / نيوزيلندي', price:1.09312, dec:5, spread:1.3, vol:0.00020, cat:'cross' },
      { sym:'EURAUD', name:'EUR/AUD', desc:'يورو / أسترالي', price:1.65124, dec:5, spread:1.4, vol:0.00028, cat:'cross' },
      { sym:'USDTRY', name:'USD/TRY', desc:'دولار / ليرة تركية', price:35.842, dec:3, spread:25, vol:0.060, cat:'exotic' },
      { sym:'USDZAR', name:'USD/ZAR', desc:'دولار / راند', price:18.624, dec:4, spread:18, vol:0.025, cat:'exotic' },
      { sym:'USDMXN', name:'USD/MXN', desc:'دولار / بيزو مكسيكي', price:20.142, dec:4, spread:14, vol:0.022, cat:'exotic' },
      { sym:'USDSGD', name:'USD/SGD', desc:'دولار / سنغافوري', price:1.34218, dec:5, spread:1.2, vol:0.00018, cat:'exotic' },
      { sym:'USDCNH', name:'USD/CNH', desc:'دولار / يوان صيني', price:7.21384, dec:5, spread:2.0, vol:0.00040, cat:'exotic' }
    ],
    metals: [
      { sym:'XAUUSD', name:'XAU/USD', desc:'الذهب / دولار', price:2342.18, dec:2, spread:18, vol:0.65, cat:'gold' },
      { sym:'XAGUSD', name:'XAG/USD', desc:'الفضة / دولار', price:28.642, dec:3, spread:1.8, vol:0.018, cat:'silver' },
      { sym:'XPTUSD', name:'XPT/USD', desc:'البلاتين / دولار', price:962.34, dec:2, spread:32, vol:0.85, cat:'platinum' },
      { sym:'XPDUSD', name:'XPD/USD', desc:'البلاديوم / دولار', price:982.18, dec:2, spread:28, vol:0.95, cat:'palladium' },
      { sym:'XAUEUR', name:'XAU/EUR', desc:'الذهب / يورو', price:2152.42, dec:2, spread:22, vol:0.62, cat:'gold' },
      { sym:'XAGEUR', name:'XAG/EUR', desc:'الفضة / يورو', price:26.342, dec:3, spread:2.2, vol:0.020, cat:'silver' },
      { sym:'XAUGBP', name:'XAU/GBP', desc:'الذهب / إسترليني', price:1852.18, dec:2, spread:24, vol:0.58, cat:'gold' },
      { sym:'XAUJPY', name:'XAU/JPY', desc:'الذهب / ين', price:349824, dec:0, spread:120, vol:55, cat:'gold' },
      { sym:'XAUCHF', name:'XAU/CHF', desc:'الذهب / فرنك', price:2062.34, dec:2, spread:26, vol:0.60, cat:'gold' },
      { sym:'XAUAUD', name:'XAU/AUD', desc:'الذهب / أسترالي', price:3562.42, dec:2, spread:34, vol:0.95, cat:'gold' },
      { sym:'XAGAUD', name:'XAG/AUD', desc:'الفضة / أسترالي', price:43.624, dec:3, spread:3.4, vol:0.025, cat:'silver' },
      { sym:'XAGJPY', name:'XAG/JPY', desc:'الفضة / ين', price:4282.18, dec:1, spread:4.2, vol:1.5, cat:'silver' }
    ],
    indices: [
      { sym:'US30',   name:'US30',   desc:'Dow Jones — وول ستريت 30', price:38842.5, dec:1, spread:1.8, vol:8.5, cat:'us' },
      { sym:'NAS100', name:'NAS100', desc:'Nasdaq 100 — أسهم التقنية', price:18324.6, dec:1, spread:1.4, vol:6.2, cat:'us' },
      { sym:'SPX500', name:'SPX500', desc:'S&P 500 — مؤشر القياس الرئيسي', price:5142.34, dec:2, spread:0.5, vol:1.8, cat:'us' },
      { sym:'US2000', name:'US2000', desc:'Russell 2000 — الشركات الصغيرة', price:2042.18, dec:1, spread:1.0, vol:1.4, cat:'us' },
      { sym:'GER40',  name:'GER40 (DAX)', desc:'DAX — أكبر 40 شركة ألمانية', price:18642.4, dec:1, spread:1.5, vol:5.8, cat:'eu' },
      { sym:'UK100',  name:'UK100 (FTSE)', desc:'FTSE 100 — لندن', price:8324.18, dec:1, spread:1.2, vol:3.2, cat:'eu' },
      { sym:'FRA40',  name:'FRA40 (CAC)', desc:'CAC 40 — باريس', price:7842.32, dec:2, spread:1.4, vol:3.6, cat:'eu' },
      { sym:'EUR50',  name:'EUR50 (Stoxx)', desc:'Euro Stoxx 50', price:4982.4, dec:1, spread:1.3, vol:2.4, cat:'eu' },
      { sym:'ESP35',  name:'ESP35 (IBEX)', desc:'IBEX 35 — مدريد', price:11242.6, dec:1, spread:2.4, vol:5.0, cat:'eu' },
      { sym:'NL25',   name:'NL25 (AEX)', desc:'AEX — أمستردام', price:912.42, dec:2, spread:0.5, vol:0.6, cat:'eu' },
      { sym:'JPN225', name:'JPN225 (Nikkei)', desc:'Nikkei 225 — طوكيو', price:39842.5, dec:1, spread:6.5, vol:18, cat:'asia' },
      { sym:'HK50',   name:'HK50 (Hang Seng)', desc:'Hang Seng — هونغ كونغ', price:18432.6, dec:1, spread:5.2, vol:14, cat:'asia' },
      { sym:'CHN50',  name:'CHN50', desc:'China A50 — شنغهاي', price:12642.3, dec:1, spread:4.5, vol:9.5, cat:'asia' },
      { sym:'IND50',  name:'IND50 (Nifty)', desc:'Nifty 50 — مومباي', price:24342.8, dec:2, spread:3.8, vol:8.0, cat:'asia' },
      { sym:'AUS200', name:'AUS200', desc:'ASX 200 — سيدني', price:7842.4, dec:1, spread:1.5, vol:2.8, cat:'asia' }
    ],
    stocks: [
      { sym:'AAPL', name:'AAPL', desc:'Apple Inc.', price:218.42, dec:2, spread:0.05, vol:0.18, cat:'tech' },
      { sym:'MSFT', name:'MSFT', desc:'Microsoft Corp.', price:432.18, dec:2, spread:0.06, vol:0.32, cat:'tech' },
      { sym:'GOOGL', name:'GOOGL', desc:'Alphabet Inc.', price:178.34, dec:2, spread:0.05, vol:0.21, cat:'tech' },
      { sym:'AMZN', name:'AMZN', desc:'Amazon.com Inc.', price:204.62, dec:2, spread:0.06, vol:0.28, cat:'tech' },
      { sym:'META', name:'META', desc:'Meta Platforms', price:582.34, dec:2, spread:0.08, vol:0.65, cat:'tech' },
      { sym:'TSLA', name:'TSLA', desc:'Tesla Inc.', price:248.18, dec:2, spread:0.10, vol:0.95, cat:'tech' },
      { sym:'NVDA', name:'NVDA', desc:'NVIDIA Corp.', price:142.82, dec:2, spread:0.07, vol:0.85, cat:'tech' },
      { sym:'NFLX', name:'NFLX', desc:'Netflix Inc.', price:732.42, dec:2, spread:0.12, vol:1.4, cat:'tech' },
      { sym:'AMD',  name:'AMD',  desc:'Advanced Micro Devices', price:152.34, dec:2, spread:0.06, vol:0.42, cat:'tech' },
      { sym:'INTC', name:'INTC', desc:'Intel Corp.', price:24.62, dec:2, spread:0.04, vol:0.12, cat:'tech' },
      { sym:'JPM',  name:'JPM',  desc:'JPMorgan Chase', price:218.42, dec:2, spread:0.06, vol:0.32, cat:'finance' },
      { sym:'V',    name:'V',    desc:'Visa Inc.', price:284.62, dec:2, spread:0.07, vol:0.28, cat:'finance' },
      { sym:'MA',   name:'MA',   desc:'Mastercard Inc.', price:482.34, dec:2, spread:0.10, vol:0.42, cat:'finance' },
      { sym:'BAC',  name:'BAC',  desc:'Bank of America', price:42.18, dec:2, spread:0.04, vol:0.14, cat:'finance' },
      { sym:'GS',   name:'GS',   desc:'Goldman Sachs', price:514.32, dec:2, spread:0.12, vol:0.85, cat:'finance' },
      { sym:'WMT',  name:'WMT',  desc:'Walmart Inc.', price:82.42, dec:2, spread:0.04, vol:0.18, cat:'retail' },
      { sym:'KO',   name:'KO',   desc:'Coca-Cola Co.', price:64.18, dec:2, spread:0.04, vol:0.12, cat:'retail' },
      { sym:'NKE',  name:'NKE',  desc:'Nike Inc.', price:78.62, dec:2, spread:0.05, vol:0.22, cat:'retail' },
      { sym:'MCD',  name:'MCD',  desc:'McDonald\'s Corp.', price:294.42, dec:2, spread:0.06, vol:0.34, cat:'retail' },
      { sym:'DIS',  name:'DIS',  desc:'Walt Disney Co.', price:98.18, dec:2, spread:0.05, vol:0.28, cat:'retail' }
    ],
    commodities: [
      { sym:'WTIUSD', name:'WTI', desc:'النفط الأمريكي الخام', price:74.28, dec:2, spread:0.04, vol:0.18, cat:'energy' },
      { sym:'BRNUSD', name:'Brent', desc:'النفط برنت', price:78.42, dec:2, spread:0.05, vol:0.20, cat:'energy' },
      { sym:'NGAS',   name:'Natural Gas', desc:'الغاز الطبيعي', price:2.84, dec:3, spread:0.012, vol:0.012, cat:'energy' },
      { sym:'GASOIL', name:'Gasoline', desc:'البنزين', price:2.234, dec:3, spread:0.014, vol:0.014, cat:'energy' },
      { sym:'HEATOL', name:'Heating Oil', desc:'زيت التدفئة', price:2.412, dec:3, spread:0.018, vol:0.018, cat:'energy' },
      { sym:'COFFEE', name:'Coffee', desc:'البن', price:182.42, dec:2, spread:0.50, vol:1.2, cat:'soft' },
      { sym:'COCOA',  name:'Cocoa', desc:'الكاكاو', price:8642.18, dec:0, spread:18, vol:65, cat:'soft' },
      { sym:'SUGAR',  name:'Sugar', desc:'السكر', price:21.34, dec:2, spread:0.05, vol:0.18, cat:'soft' },
      { sym:'COTTON', name:'Cotton', desc:'القطن', price:71.82, dec:2, spread:0.18, vol:0.42, cat:'soft' },
      { sym:'CORN',   name:'Corn', desc:'الذرة', price:432.42, dec:2, spread:0.85, vol:2.4, cat:'agri' },
      { sym:'WHEAT',  name:'Wheat', desc:'القمح', price:564.18, dec:2, spread:1.4, vol:3.2, cat:'agri' },
      { sym:'SOYBN',  name:'Soybean', desc:'فول الصويا', price:1042.34, dec:2, spread:1.8, vol:4.5, cat:'agri' },
      { sym:'CATTLE', name:'Live Cattle', desc:'الأبقار الحية', price:184.62, dec:2, spread:0.42, vol:0.85, cat:'agri' },
      { sym:'LHOG',   name:'Lean Hogs', desc:'الخنازير', price:88.42, dec:2, spread:0.32, vol:0.65, cat:'agri' }
    ],
    crypto: [
      { sym:'BTCUSD', name:'BTC/USD', desc:'Bitcoin', price:96842.18, dec:2, spread:18, vol:185, cat:'major' },
      { sym:'ETHUSD', name:'ETH/USD', desc:'Ethereum', price:3624.42, dec:2, spread:5.5, vol:18, cat:'major' },
      { sym:'BNBUSD', name:'BNB/USD', desc:'Binance Coin', price:684.32, dec:2, spread:1.4, vol:5.5, cat:'major' },
      { sym:'SOLUSD', name:'SOL/USD', desc:'Solana', price:218.42, dec:2, spread:0.85, vol:3.2, cat:'major' },
      { sym:'XRPUSD', name:'XRP/USD', desc:'Ripple', price:2.342, dec:4, spread:0.012, vol:0.038, cat:'major' },
      { sym:'ADAUSD', name:'ADA/USD', desc:'Cardano', price:0.9842, dec:4, spread:0.008, vol:0.018, cat:'major' },
      { sym:'DOGUSD', name:'DOGE/USD', desc:'Dogecoin', price:0.3982, dec:5, spread:0.0012, vol:0.012, cat:'major' },
      { sym:'AVXUSD', name:'AVAX/USD', desc:'Avalanche', price:42.18, dec:3, spread:0.085, vol:0.85, cat:'major' },
      { sym:'DOTUSD', name:'DOT/USD', desc:'Polkadot', price:7.42, dec:3, spread:0.024, vol:0.18, cat:'major' },
      { sym:'MATUSD', name:'MATIC/USD', desc:'Polygon', price:0.4632, dec:5, spread:0.0014, vol:0.014, cat:'alt' },
      { sym:'LTCUSD', name:'LTC/USD', desc:'Litecoin', price:108.42, dec:2, spread:0.45, vol:1.8, cat:'alt' },
      { sym:'LNKUSD', name:'LINK/USD', desc:'Chainlink', price:24.18, dec:3, spread:0.045, vol:0.45, cat:'alt' },
      { sym:'BCHUSD', name:'BCH/USD', desc:'Bitcoin Cash', price:482.32, dec:2, spread:1.2, vol:5.5, cat:'alt' },
      { sym:'UNIUSD', name:'UNI/USD', desc:'Uniswap', price:14.62, dec:3, spread:0.038, vol:0.32, cat:'alt' },
      { sym:'ATMUSD', name:'ATOM/USD', desc:'Cosmos', price:8.42, dec:3, spread:0.024, vol:0.18, cat:'alt' }
    ]
  };
  // CFDs page mixes representative symbols
  NS.SYMBOLS.cfds = [
    NS.SYMBOLS.forex[0], NS.SYMBOLS.forex[1], NS.SYMBOLS.forex[2],
    NS.SYMBOLS.metals[0], NS.SYMBOLS.metals[1],
    NS.SYMBOLS.indices[0], NS.SYMBOLS.indices[1], NS.SYMBOLS.indices[4],
    NS.SYMBOLS.stocks[0], NS.SYMBOLS.stocks[5], NS.SYMBOLS.stocks[6],
    NS.SYMBOLS.commodities[0], NS.SYMBOLS.commodities[1],
    NS.SYMBOLS.crypto[0], NS.SYMBOLS.crypto[1]
  ].map(o => Object.assign({}, o));

  // ECN page focuses on majors with tighter spreads
  NS.SYMBOLS.ecn = NS.SYMBOLS.forex.slice(0,8).map(o => {
    const c = Object.assign({}, o);
    c.spread = Math.max(0.0, +(c.spread - 0.4).toFixed(1));
    return c;
  }).concat([
    Object.assign({}, NS.SYMBOLS.metals[0], { spread: 12 }),
    Object.assign({}, NS.SYMBOLS.metals[1], { spread: 1.2 }),
    Object.assign({}, NS.SYMBOLS.indices[0], { spread: 1.0 }),
    Object.assign({}, NS.SYMBOLS.indices[2], { spread: 0.3 })
  ]);

  /* ---------- HELPERS ---------- */
  function fmt(n, dec){
    if (Math.abs(n) >= 1000 && dec === 0) {
      return Math.round(n).toLocaleString('en-US');
    }
    return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function arrowSvg(up){
    return up
      ? '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 2L11 9H1z"/></svg>'
      : '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 10L1 3h10z"/></svg>';
  }

  /* SVG sparkline with gradient area */
  function sparkSvg(history, isUp){
    const W = 110, H = 38;
    if (!history || history.length < 2) return '';
    const min = Math.min.apply(null, history);
    const max = Math.max.apply(null, history);
    const range = (max - min) || (Math.abs(max) * 0.001) || 1;
    const pts = history.map(function(v, i){
      const x = (i / (history.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return x.toFixed(2) + ',' + y.toFixed(2);
    });
    const linePts = pts.join(' ');
    const areaPts = '0,' + H + ' ' + linePts + ' ' + W + ',' + H;
    const color = isUp ? '#22c55e' : '#ef4444';
    const gid = 'spk_' + Math.random().toString(36).slice(2, 8);
    const last = pts[pts.length - 1].split(',');
    return ''
      + '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">'
      +   '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1">'
      +     '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.32"/>'
      +     '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>'
      +   '</linearGradient></defs>'
      +   '<polygon points="' + areaPts + '" fill="url(#' + gid + ')"/>'
      +   '<polyline points="' + linePts + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>'
      +   '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.4" fill="' + color + '">'
      +     '<animate attributeName="r" values="2.4;3.6;2.4" dur="1.6s" repeatCount="indefinite"/>'
      +   '</circle>'
      + '</svg>';
  }

  /* short symbol code (4 chars) for icon chip */
  function shortSym(name){
    return name.replace(/[\/\s]/g, '').slice(0, 4);
  }

  /* ---------- RENDER ---------- */
  function rowHtml(s){
    const isUp = s.changeUp;
    return ''
      + '<div class="price-row" data-sym="' + s.sym + '" data-cat="' + (s.cat || '') + '">'
      +   '<div class="pr-sym">'
      +     '<div class="pr-sym__icon">' + shortSym(s.name) + '</div>'
      +     '<div class="pr-sym__text"><div class="pr-sym__name">' + s.name + '</div><div class="pr-sym__desc">' + s.desc + '</div></div>'
      +   '</div>'
      +   '<div><span class="pr-bid">' + fmt(s.bid, s.dec) + '</span></div>'
      +   '<div><span class="pr-ask">' + fmt(s.ask, s.dec) + '</span></div>'
      +   '<div class="pr-chg-cell"><span class="pr-chg ' + (isUp ? 'is-up' : 'is-down') + '">' + arrowSvg(isUp) + (isUp ? '+' : '') + s.changePct + '%</span></div>'
      +   '<div class="pr-hl pr-high" data-i18n-aria="quote.high" data-label="أعلى">' + fmt(s.high, s.dec) + '</div>'
      +   '<div class="pr-hl pr-low" data-i18n-aria="quote.low" data-label="أدنى">' + fmt(s.low, s.dec) + '</div>'
      +   '<div class="pr-spread-cell"><span class="pr-spread">' + (s.spread % 1 === 0 ? s.spread : s.spread.toFixed(1)) + '</span></div>'
      +   '<div class="pr-spark">' + sparkSvg(s.history, isUp) + '</div>'
      +   '<div class="pr-btn-cell"><a href="#" class="pr-btn" data-i18n="trade.btn">تداول</a></div>'
      + '</div>';
  }

  function tickSymbol(s){
    // random walk
    const drift = (Math.random() - 0.5) * 2 * s.vol;
    const newMid = Math.max(s.price * 0.0001, s.price + drift);
    const wasUp = newMid >= s.price;
    s.price = newMid;
    s.bid = newMid - s.spread * Math.pow(10, -s.dec) * 0.5;
    s.ask = newMid + s.spread * Math.pow(10, -s.dec) * 0.5;
    s.history.push(newMid);
    if (s.history.length > 30) s.history.shift();
    s.high = Math.max(s.high, newMid);
    s.low = Math.min(s.low, newMid);
    const start = s.history[0];
    s.changePct = (((newMid - start) / start) * 100).toFixed(2);
    s.changeUp = parseFloat(s.changePct) >= 0;
    return wasUp;
  }

  function applyTickToDom(body, s, wasUp){
    const row = body.querySelector('.price-row[data-sym="' + s.sym + '"]');
    if (!row) return;
    const bidEl = row.querySelector('.pr-bid');
    const askEl = row.querySelector('.pr-ask');
    const chgEl = row.querySelector('.pr-chg');
    const sparkEl = row.querySelector('.pr-spark');
    const highEl = row.querySelector('.pr-high');
    const lowEl = row.querySelector('.pr-low');

    bidEl.textContent = fmt(s.bid, s.dec);
    askEl.textContent = fmt(s.ask, s.dec);
    highEl.textContent = fmt(s.high, s.dec);
    lowEl.textContent = fmt(s.low, s.dec);
    chgEl.className = 'pr-chg ' + (s.changeUp ? 'is-up' : 'is-down');
    chgEl.innerHTML = arrowSvg(s.changeUp) + (s.changeUp ? '+' : '') + s.changePct + '%';
    sparkEl.innerHTML = sparkSvg(s.history, s.changeUp);

    // flash
    const target = wasUp ? askEl : bidEl;
    target.classList.add('flash');
    setTimeout(function(){ target.classList.remove('flash'); }, 420);
  }

  /* ---------- PUBLIC INIT ---------- */
  NS.init = function init(market){
    const symbols = NS.SYMBOLS[market];
    if (!symbols) return;
    const body = document.getElementById('priceTable');
    if (!body) return;

    // initialize state
    symbols.forEach(function(s){
      const startPrice = s.price;
      s.history = [];
      // seed 30 ticks of small noise
      let cur = startPrice * (1 - (Math.random() * 0.012 - 0.006));
      for (let i = 0; i < 30; i++){
        cur += (Math.random() - 0.5) * 2 * s.vol * 0.7;
        s.history.push(cur);
      }
      s.price = cur;
      s.bid = cur - s.spread * Math.pow(10, -s.dec) * 0.5;
      s.ask = cur + s.spread * Math.pow(10, -s.dec) * 0.5;
      s.high = Math.max.apply(null, s.history);
      s.low = Math.min.apply(null, s.history);
      const startH = s.history[0];
      s.changePct = (((cur - startH) / startH) * 100).toFixed(2);
      s.changeUp = parseFloat(s.changePct) >= 0;
    });

    // initial render
    body.innerHTML = symbols.map(rowHtml).join('');

    // ticks
    setInterval(function(){
      // pick a few symbols to tick each interval (more natural)
      const sample = symbols.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, Math.max(3, Math.floor(symbols.length * 0.4)));
      sample.forEach(function(s){
        const wasUp = tickSymbol(s);
        applyTickToDom(body, s, wasUp);
      });
    }, 1500);

    // filters (if present)
    const filterEls = document.querySelectorAll('.price-filter[data-cat]');
    if (filterEls.length){
      filterEls.forEach(function(btn){
        btn.addEventListener('click', function(){
          const cat = btn.dataset.cat;
          filterEls.forEach(function(b){ b.classList.toggle('is-active', b === btn); });
          body.querySelectorAll('.price-row').forEach(function(row){
            row.style.display = (cat === 'all' || row.dataset.cat === cat) ? '' : 'none';
          });
        });
      });
    }
  };

  /* Auto-init on DOMContentLoaded if a price-table is in the page */
  document.addEventListener('DOMContentLoaded', function(){
    const tbl = document.querySelector('.price-table[data-market]');
    if (tbl) NS.init(tbl.dataset.market);
  });

})();
