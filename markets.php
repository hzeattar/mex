<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl  = $lang === 'ar';
$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) {}
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$markets = [
  // Crypto (40)
  ['BTCUSDT','Bitcoin','BTC','crypto'],['ETHUSDT','Ethereum','ETH','crypto'],['BNBUSDT','BNB','BNB','crypto'],
  ['SOLUSDT','Solana','SOL','crypto'],['XRPUSDT','Ripple','XRP','crypto'],['ADAUSDT','Cardano','ADA','crypto'],
  ['DOGEUSDT','Dogecoin','DOGE','crypto'],['LTCUSDT','Litecoin','LTC','crypto'],['DOTUSDT','Polkadot','DOT','crypto'],
  ['LINKUSDT','Chainlink','LINK','crypto'],['MATICUSDT','Polygon','MATIC','crypto'],['AVAXUSDT','Avalanche','AVAX','crypto'],
  ['UNIUSDT','Uniswap','UNI','crypto'],['ATOMUSDT','Cosmos','ATOM','crypto'],['ETCUSDT','Ethereum Classic','ETC','crypto'],
  ['XLMUSDT','Stellar','XLM','crypto'],['TRXUSDT','TRON','TRX','crypto'],['SHIBUSDT','Shiba Inu','SHIB','crypto'],
  ['NEARUSDT','NEAR Protocol','NEAR','crypto'],['VETUSDT','VeChain','VET','crypto'],['SANDUSDT','Sandbox','SAND','crypto'],
  ['MANAUSDT','Decentraland','MANA','crypto'],['ALGOUSDT','Algorand','ALGO','crypto'],['AAVEUSDT','Aave','AAVE','crypto'],
  ['APTUSDT','Aptos','APT','crypto'],['ARBUSDT','Arbitrum','ARB','crypto'],['OPUSDT','Optimism','OP','crypto'],
  ['INJUSDT','Injective','INJ','crypto'],['SUIUSDT','Sui','SUI','crypto'],['GRTUSDT','The Graph','GRT','crypto'],
  ['MKRUSDT','Maker','MKR','crypto'],['FETUSDT','Fetch.ai','FET','crypto'],['STXUSDT','Stacks','STX','crypto'],
  ['COMPUSDT','Compound','COMP','crypto'],['ZECUSDT','Zcash','ZEC','crypto'],['DASHUSDT','Dash','DASH','crypto'],
  ['SNXUSDT','Synthetix','SNX','crypto'],['FILUSDT','Filecoin','FIL','crypto'],['ICPUSDT','Internet Computer','ICP','crypto'],
  ['CRVUSDT','Curve DAO','CRV','crypto'],
  // Forex (44)
  ['EURUSD','Euro / US Dollar','EUR/USD','forex'],['GBPUSD','Pound / US Dollar','GBP/USD','forex'],
  ['USDJPY','Dollar / Yen','USD/JPY','forex'],['USDCHF','Dollar / Franc','USD/CHF','forex'],
  ['AUDUSD','Australian Dollar','AUD/USD','forex'],['USDCAD','Dollar / CAD','USD/CAD','forex'],
  ['NZDUSD','NZD / USD','NZD/USD','forex'],['EURGBP','Euro / Pound','EUR/GBP','forex'],
  ['EURJPY','Euro / Yen','EUR/JPY','forex'],['GBPJPY','Pound / Yen','GBP/JPY','forex'],
  ['EURCAD','Euro / CAD','EUR/CAD','forex'],['EURAUD','Euro / AUD','EUR/AUD','forex'],
  ['EURCHF','Euro / Franc','EUR/CHF','forex'],['EURNZD','Euro / NZD','EUR/NZD','forex'],
  ['GBPAUD','Pound / AUD','GBP/AUD','forex'],['GBPCAD','Pound / CAD','GBP/CAD','forex'],
  ['GBPCHF','Pound / Franc','GBP/CHF','forex'],['GBPNZD','Pound / NZD','GBP/NZD','forex'],
  ['AUDCAD','AUD / CAD','AUD/CAD','forex'],['AUDCHF','AUD / Franc','AUD/CHF','forex'],
  ['AUDNZD','AUD / NZD','AUD/NZD','forex'],['AUDJPY','AUD / Yen','AUD/JPY','forex'],
  ['CADJPY','CAD / Yen','CAD/JPY','forex'],['CHFJPY','Franc / Yen','CHF/JPY','forex'],
  ['NZDJPY','NZD / Yen','NZD/JPY','forex'],['CADCHF','CAD / Franc','CAD/CHF','forex'],
  ['USDMXN','Dollar / Peso','USD/MXN','forex'],['USDSEK','Dollar / Krona','USD/SEK','forex'],
  ['USDNOK','Dollar / Krone','USD/NOK','forex'],['USDPLN','Dollar / Zloty','USD/PLN','forex'],
  ['USDTRY','Dollar / Lira','USD/TRY','forex'],['USDSGD','Dollar / SGD','USD/SGD','forex'],
  ['USDHKD','Dollar / HKD','USD/HKD','forex'],['USDBRL','Dollar / Real','USD/BRL','forex'],
  ['USDZAR','Dollar / Rand','USD/ZAR','forex'],['USDCNH','Dollar / Yuan','USD/CNH','forex'],
  ['USDINR','Dollar / Rupee','USD/INR','forex'],['EURHUF','Euro / Forint','EUR/HUF','forex'],
  ['EURPLN','Euro / Zloty','EUR/PLN','forex'],['EURTRY','Euro / Lira','EUR/TRY','forex'],
  ['GBPTRY','Pound / Lira','GBP/TRY','forex'],['USDDKK','Dollar / DKK','USD/DKK','forex'],
  ['USDILS','Dollar / Shekel','USD/ILS','forex'],['USDTHB','Dollar / Baht','USD/THB','forex'],
  // Commodities (25)
  ['XAUUSD','Gold Spot','GOLD','commodities'],['XAGUSD','Silver Spot','SILVER','commodities'],
  ['XPTUSD','Platinum Spot','PLAT','commodities'],['XPDUSD','Palladium Spot','PALL','commodities'],
  ['USOIL','WTI Crude Oil','OIL','commodities'],['UKOIL','Brent Crude Oil','BRENT','commodities'],
  ['NGAS','Natural Gas','GAS','commodities'],['COPPER','Copper','COPPER','commodities'],
  ['WHEAT','Wheat','WHEAT','commodities'],['CORN','Corn','CORN','commodities'],
  ['SOYBEAN','Soybeans','SOY','commodities'],['SUGAR','Sugar #11','SUGAR','commodities'],
  ['COTTON','Cotton #2','COTTON','commodities'],['COFFEE','Coffee','COFFEE','commodities'],
  ['COCOA','Cocoa','COCOA','commodities'],['LUMBER','Lumber','LUMBER','commodities'],
  ['NICKEL','Nickel','NICKEL','commodities'],['ZINC','Zinc','ZINC','commodities'],
  ['ALUMINIUM','Aluminium','ALU','commodities'],['LEAD','Lead','LEAD','commodities'],
  ['TIN','Tin','TIN','commodities'],['OJ','Orange Juice','OJ','commodities'],
  ['LEAN_HOGS','Lean Hogs','HOGS','commodities'],['LIVE_CATTLE','Live Cattle','CATTLE','commodities'],
  ['HEATING_OIL','Heating Oil','HOIL','commodities'],
  // Stocks (46)
  ['AAPL','Apple Inc.','AAPL','stocks'],['TSLA','Tesla Inc.','TSLA','stocks'],['NVDA','NVIDIA Corp.','NVDA','stocks'],
  ['MSFT','Microsoft Corp.','MSFT','stocks'],['GOOGL','Alphabet Inc.','GOOGL','stocks'],['META','Meta Platforms','META','stocks'],
  ['AMZN','Amazon.com Inc.','AMZN','stocks'],['NFLX','Netflix Inc.','NFLX','stocks'],['AMD','AMD Inc.','AMD','stocks'],
  ['INTC','Intel Corp.','INTC','stocks'],['ORCL','Oracle Corp.','ORCL','stocks'],['CRM','Salesforce Inc.','CRM','stocks'],
  ['PYPL','PayPal Holdings','PYPL','stocks'],['V','Visa Inc.','V','stocks'],['MA','Mastercard Inc.','MA','stocks'],
  ['JPM','JPMorgan Chase','JPM','stocks'],['BAC','Bank of America','BAC','stocks'],['UNH','UnitedHealth Grp','UNH','stocks'],
  ['JNJ','Johnson & Johnson','JNJ','stocks'],['PFE','Pfizer Inc.','PFE','stocks'],['MRK','Merck & Co.','MRK','stocks'],
  ['CVX','Chevron Corp.','CVX','stocks'],['XOM','ExxonMobil Corp.','XOM','stocks'],['WMT','Walmart Inc.','WMT','stocks'],
  ['COST','Costco Wholesale','COST','stocks'],['HD','Home Depot Inc.','HD','stocks'],['DIS','Walt Disney Co.','DIS','stocks'],
  ['BABA','Alibaba Group','BABA','stocks'],['NKE','Nike Inc.','NKE','stocks'],['SBUX','Starbucks Corp.','SBUX','stocks'],
  ['GS','Goldman Sachs','GS','stocks'],['MS','Morgan Stanley','MS','stocks'],['PLTR','Palantir Tech.','PLTR','stocks'],
  ['COIN','Coinbase Global','COIN','stocks'],['SQ','Block Inc.','SQ','stocks'],['ADBE','Adobe Inc.','ADBE','stocks'],
  ['UBER','Uber Technologies','UBER','stocks'],['SNAP','Snap Inc.','SNAP','stocks'],['SHOP','Shopify Inc.','SHOP','stocks'],
  ['RBLX','Roblox Corp.','RBLX','stocks'],['DKNG','DraftKings Inc.','DKNG','stocks'],['SOFI','SoFi Tech.','SOFI','stocks'],
  ['RIVN','Rivian Automotive','RIVN','stocks'],['GME','GameStop Corp.','GME','stocks'],['HOOD','Robinhood Mkts','HOOD','stocks'],
  ['AMD','AMD Inc.','AMD2','stocks'],
  // Futures (27)
  ['ES_F','E-mini S&P 500','ES','futures'],['NQ_F','E-mini Nasdaq 100','NQ','futures'],
  ['YM_F','E-mini Dow','YM','futures'],['RTY_F','E-mini Russell 2000','RTY','futures'],
  ['CL_F','WTI Crude Future','CL','futures'],['GC_F','Gold Future','GC','futures'],
  ['ZN_F','10Y Note Future','ZN','futures'],['ZB_F','30Y Bond Future','ZB','futures'],
  ['ZC_F','Corn Future','ZC','futures'],['ZS_F','Soybean Future','ZS','futures'],
  ['ZW_F','Wheat Future','ZW','futures'],['SI_F','Silver Future','SI','futures'],
  ['HG_F','Copper Future','HG','futures'],['NG_F','Nat Gas Future','NG','futures'],
  ['RB_F','Gasoline Future','RB','futures'],['HO_F','Heating Oil Future','HO','futures'],
  ['VX_F','VIX Future','VX','futures'],['BTC_F','Bitcoin CME Fut.','BTCF','futures'],
  ['ETH_F','Ether CME Fut.','ETHF','futures'],['DX_F','Dollar Index Fut.','DX','futures'],
  ['6E_F','Euro FX Future','6E','futures'],['6B_F','GBP Future','6B','futures'],
  ['6J_F','JPY Future','6J','futures'],['PA_F','Palladium Future','PA','futures'],
  ['PL_F','Platinum Future','PL','futures'],['LE_F','Live Cattle Future','LE','futures'],
  ['HE_F','Lean Hog Future','HE','futures'],
  // Arab Stocks (35)
  ['2222','Saudi Aramco','ARAMCO','arab'],['1120','Al Rajhi Bank','ALRAJHI','arab'],
  ['2010','SABIC','SABIC','arab'],['7010','STC','STC','arab'],['1211','Maaden','MAADEN','arab'],
  ['1150','Alinma Bank','ALINMA','arab'],['1180','Saudi National Bank','SNB','arab'],
  ['2280','Almarai','ALMARAI','arab'],['1010','Riyad Bank','RIYAD','arab'],
  ['1020','Bank AlJazira','ALJAZIRA','arab'],['1030','Saudi Hollandi','HOLLANDI','arab'],
  ['1050','Saudi British Bank','SABB','arab'],['2050','Savola Group','SAVOLA','arab'],
  ['2080','Sisco','SISCO','arab'],['7020','Zain KSA','ZAIN','arab'],
  ['7030','Etihad Etisalat','MOBILY','arab'],['2040','Saudi Cable','SCCO','arab'],
  ['2060','Al Qassim Cement','ALQASSIM','arab'],['2090','National Cement','NATCEM','arab'],
  ['2100','Yanbu Cement','YANBU','arab'],['4001','Kingdom Holding','KHC','arab'],
  ['4002','MBC Group','MBC','arab'],['4190','Jarir Marketing','JARIR','arab'],
  ['4200','Saudi Telecom','STCO','arab'],['4240','Saudi Food & Drug','SFDA','arab'],
  ['4260','Dallah Healthcare','DALLAH','arab'],['4280','Al Moammar Info.','MOAMMAR','arab'],
  ['4300','SABIC Agri-Nutrients','SABICAGR','arab'],['4321','Al Khaleej Training','ALKHALEEJ','arab'],
  ['2150','Hail Cement','HAILCEM','arab'],['2160','Arabian Cement','ARCEM','arab'],
  ['2170','Southern Cement','SCEM','arab'],['2180','Eastern Cement','ECEM','arab'],
  ['1060','Arab National Bank','ANB','arab'],['1080','Banque Saudi Fransi','BSF','arab'],
];
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl?'rtl':'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="MEX Group Markets — 70+ live prices across crypto, forex, stocks and commodities.">
  <title>Markets — MEX Group</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css')?: time(); ?>">
</head>
<body class="mex-landing-page<?php echo $rtl?' is-rtl':''; ?>">

<header class="mex-header" id="mex-header">
  <div class="mex-header-inner">
    <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>">
      <img src="/assets/img/mexgroup_logo.svg" alt="" loading="lazy" onerror="this.style.display='none'">
      <strong>MEX Group</strong>
    </a>
    <nav class="mex-header-nav">
      <a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>">Home</a>
      <a class="mex-nav-link is-active" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a>
      <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
      <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
    </nav>
    <div class="mex-header-actions">
      <div class="mex-lang-wrap">
        <button class="mex-lang-btn" id="mex-lang-trigger" aria-expanded="false">
          <span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="mex-lang-dropdown" id="mex-lang-dropdown">
          <?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?>
            <a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>"><?php echo _h($n); ?></a>
          <?php endforeach; ?>
        </div>
      </div>
      <?php if($isLoggedIn): ?>
        <a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home">Open App</a>
      <?php else: ?>
        <div class="mex-header-btns">
          <a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>">Log in</a>
          <a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>">Create Account</a>
        </div>
      <?php endif; ?>
      <button class="mex-hamburger" id="mex-hamburger" aria-label="Menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<main class="mex-page">
  <section class="mex-section">
    <div class="mex-section-head">
      <span class="mex-kicker">Trading Instruments</span>
      <h2>70+ Global Markets</h2>
      <p>Live and delayed quotes across crypto, forex, commodities and stocks — all tradeable from one account.</p>
    </div>

    <!-- Search bar -->
    <div class="mex-market-search-wrap">
      <input type="search" class="mex-market-search" id="market-search"
             placeholder="Search symbol or name..." autocomplete="off" spellcheck="false">
      <svg class="mex-market-search-ico" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </div>

    <!-- Filter tabs -->
    <div class="mex-market-filters" id="market-filters">
      <?php
      $counts = ['all'=>0,'crypto'=>0,'forex'=>0,'commodities'=>0,'stocks'=>0,'futures'=>0,'arab'=>0];
      foreach($markets as $m) { $counts['all']++; $t=$m[3]; if(isset($counts[$t])) $counts[$t]++; }
      ?>
      <button class="mex-filter-btn is-active" data-filter="all">All <span class="fc-count"><?php echo $counts['all']; ?></span></button>
      <button class="mex-filter-btn" data-filter="crypto">Crypto <span class="fc-count"><?php echo $counts['crypto']; ?></span></button>
      <button class="mex-filter-btn" data-filter="forex">Forex <span class="fc-count"><?php echo $counts['forex']; ?></span></button>
      <button class="mex-filter-btn" data-filter="commodities">Commodities <span class="fc-count"><?php echo $counts['commodities']; ?></span></button>
      <button class="mex-filter-btn" data-filter="stocks">Stocks <span class="fc-count"><?php echo $counts['stocks']; ?></span></button>
      <button class="mex-filter-btn" data-filter="futures">Futures <span class="fc-count"><?php echo $counts['futures']; ?></span></button>
      <button class="mex-filter-btn" data-filter="arab">Arab <span class="fc-count"><?php echo $counts['arab']; ?></span></button>
    </div>

    <!-- Market grid -->
    <div class="mex-market-grid-v2" id="market-grid">
      <?php foreach($markets as $m): ?>
        <div class="mex-market-card-v2 is-loading"
             data-type="<?php echo _h($m[3]); ?>"
             data-symbol="<?php echo _h($m[0]); ?>"
             data-name="<?php echo _h(strtolower($m[1])); ?>">
          <div class="mc-top">
            <span class="mc-symbol"><?php echo _h($m[0]); ?></span>
            <span class="mc-badge mc-badge-<?php echo _h($m[3]); ?>"><?php echo _h(strtoupper($m[3])); ?></span>
            <span class="mc-live-dot"></span>
          </div>
          <strong class="mc-price mex-skeleton" data-price-symbol="<?php echo _h($m[0]); ?>">--</strong>
          <span class="mc-change mex-skeleton" data-change-symbol="<?php echo _h($m[0]); ?>">0.00%</span>
          <span class="mc-name"><?php echo _h($m[1]); ?></span>
          <div class="mc-spark"><?php for($i=0;$i<8;$i++): $h=18+((ord($m[0][$i%strlen($m[0])])+$i*7)%26); ?><i style="height:<?php echo $h; ?>px"></i><?php endfor; ?></div>
          <a class="mc-trade-btn"
             href="<?php echo $isLoggedIn?'/app.php#/trade?symbol='._h($m[0]):'/register.php?lang='._h($lang).'&next='.rawurlencode('/app.php#/trade?symbol='.$m[0]); ?>">
            Trade <?php echo _h($m[2]); ?> →
          </a>
        </div>
      <?php endforeach; ?>
    </div>

    <p id="no-results" style="text-align:center;color:#4d6a8f;padding:40px 0;display:none">
      No markets match your search.
    </p>

    <p style="text-align:center;margin-top:24px">
      <small style="color:#4d6a8f;font-size:12px">
        Prices update every 15 seconds • Last refresh: <span id="price-age-sec">0</span>s ago
      </small>
    </p>
  </section>
</main>

<footer class="mex-footer">
  <div class="mex-footer-inner">
    <div class="mex-footer-main">
      <div class="mex-footer-brand">
        <a class="mex-footer-logo" href="/"><img src="/assets/img/mexgroup_logo.svg" alt=""><strong>MEX Group</strong></a>
        <p>Professional multi-asset trading platform with transparent pricing.</p>
      </div>
      <div class="mex-footer-col"><h4>Products</h4><a href="/app.php#/trade">Trading Desk</a><a href="/app.php#/invest">Copy Trading</a><a href="/app.php#/invest">Contracts</a><a href="/app.php#/deposit">Funding</a></div>
      <div class="mex-footer-col"><h4>Pages</h4><a href="/features.php">Features</a><a href="/about.php">About</a><a href="/contact.php">Contact</a></div>
      <div class="mex-footer-col"><h4>Legal</h4><a href="/legal.php?page=terms">Terms</a><a href="/legal.php?page=privacy">Privacy</a><a href="/legal.php?page=risk">Risk</a></div>
    </div>
    <div class="mex-footer-bottom">
      <span>&copy; <?php echo date('Y'); ?> MEX Group. Trading involves significant risk of loss.</span>
    </div>
  </div>
</footer>

<script>
(function(){
  'use strict';

  var prevPrices = {};
  var lastFetch = 0;
  var secEl = document.getElementById('price-age-sec');

  setInterval(function(){
    if (lastFetch && secEl) secEl.textContent = Math.round((Date.now()-lastFetch)/1000);
  }, 1000);

  function fmt(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return '--';
    if (n >= 1000) return '$'+n.toLocaleString(undefined,{maximumFractionDigits:2});
    if (n >= 1)    return '$'+n.toLocaleString(undefined,{maximumFractionDigits:4});
    return '$'+n.toLocaleString(undefined,{maximumFractionDigits:6});
  }

  function updatePrice(el, price, sym) {
    var old = prevPrices[sym] || 0;
    el.textContent = fmt(price);
    el.classList.remove('mex-skeleton');
    if (old > 0 && price > 0 && price !== old) {
      var cls = price > old ? 'flash-up' : 'flash-down';
      el.classList.remove('flash-up','flash-down');
      requestAnimationFrame(function(){
        el.classList.add(cls);
        setTimeout(function(){ el.classList.remove(cls); }, 900);
      });
    }
  }

  function fetchPrices() {
    var symbols = [];
    document.querySelectorAll('[data-price-symbol]').forEach(function(e){ symbols.push(e.getAttribute('data-price-symbol')); });
    symbols = [...new Set(symbols.filter(Boolean))];
    if (!symbols.length) return;
    fetch('/api/public_prices.php?symbols='+encodeURIComponent(symbols.join(',')),{headers:{Accept:'application/json'}})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(data){
      if (!data || !Array.isArray(data.items)) return;
      lastFetch = Date.now();
      data.items.forEach(function(q){
        var sym    = String(q.symbol||'').toUpperCase();
        var price  = (q.price != null && q.price > 0) ? Number(q.price) : 0;
        var change = Number(q.change_pct||0);
        document.querySelectorAll('[data-price-symbol="'+sym+'"]').forEach(function(el){ updatePrice(el,price,sym); });
        document.querySelectorAll('[data-change-symbol="'+sym+'"]').forEach(function(el){
          el.textContent = isFinite(change)?((change>=0?'+':'')+change.toFixed(2)+'%'):'--';
          el.classList.remove('mex-skeleton');
          el.className = el.className.replace(/\bdown\b/,'').trim();
          if (change<0) el.classList.add('down');
        });
        var card = document.querySelector('.mex-market-card-v2[data-symbol="'+sym+'"]');
        if (card) card.classList.remove('is-loading');
        prevPrices[sym] = price;
      });
    }).catch(function(){});
  }
  fetchPrices();
  setInterval(fetchPrices, 15000);

  // ── filter tabs ───────────────────────────────────────────────
  var cards = document.querySelectorAll('.mex-market-card-v2');
  var noResults = document.getElementById('no-results');
  var searchInput = document.getElementById('market-search');
  var activeFilter = 'all';
  var searchTerm = '';

  function applyFilters() {
    var visible = 0;
    cards.forEach(function(card){
      var type   = card.getAttribute('data-type') || '';
      var symbol = (card.getAttribute('data-symbol') || '').toLowerCase();
      var name   = (card.getAttribute('data-name') || '').toLowerCase();
      var matchFilter = (activeFilter === 'all' || type === activeFilter);
      var matchSearch = !searchTerm || symbol.includes(searchTerm) || name.includes(searchTerm);
      var show = matchFilter && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (noResults) noResults.style.display = visible === 0 ? '' : 'none';
  }

  document.querySelectorAll('.mex-filter-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.mex-filter-btn').forEach(function(b){ b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function(){
      searchTerm = searchInput.value.toLowerCase().trim();
      applyFilters();
    });
  }

  // ── lang dropdown ─────────────────────────────────────────────
  var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
  if(lb&&ld){
    lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});
    document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});
    ld.addEventListener('click',function(e){e.stopPropagation();});
  }

  // ── hamburger ─────────────────────────────────────────────────
  var hb=document.getElementById('mex-hamburger'),nav=document.querySelector('.mex-header-nav');
  if(hb&&nav){
    hb.addEventListener('click',function(){var o=hb.getAttribute('aria-expanded')==='true';hb.setAttribute('aria-expanded',o?'false':'true');nav.classList.toggle('is-open',!o);hb.classList.toggle('is-active',!o);});
    nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){hb.setAttribute('aria-expanded','false');nav.classList.remove('is-open');hb.classList.remove('is-active');});});
  }

})();
</script>
</body>
</html>
