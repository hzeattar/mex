<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl  = $lang === 'ar';
$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) {}
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$markets = [
  // Crypto
  ['BTCUSDT','Bitcoin','BTC','crypto'],['ETHUSDT','Ethereum','ETH','crypto'],
  ['BNBUSDT','BNB','BNB','crypto'],['SOLUSDT','Solana','SOL','crypto'],
  ['XRPUSDT','Ripple','XRP','crypto'],['ADAUSDT','Cardano','ADA','crypto'],
  ['DOGEUSDT','Dogecoin','DOGE','crypto'],['LTCUSDT','Litecoin','LTC','crypto'],
  ['DOTUSDT','Polkadot','DOT','crypto'],['LINKUSDT','Chainlink','LINK','crypto'],
  ['MATICUSDT','Polygon','MATIC','crypto'],['AVAXUSDT','Avalanche','AVAX','crypto'],
  // Forex
  ['EURUSD','Euro / US Dollar','EUR/USD','forex'],['GBPUSD','Pound / US Dollar','GBP/USD','forex'],
  ['USDJPY','US Dollar / Yen','USD/JPY','forex'],['USDCHF','Dollar / Franc','USD/CHF','forex'],
  ['AUDUSD','Australian Dollar','AUD/USD','forex'],['USDCAD','Dollar / CAD','USD/CAD','forex'],
  ['NZDUSD','NZ Dollar','NZD/USD','forex'],['EURGBP','Euro / Pound','EUR/GBP','forex'],
  ['EURJPY','Euro / Yen','EUR/JPY','forex'],['GBPJPY','Pound / Yen','GBP/JPY','forex'],
  // Commodities
  ['XAUUSD','Gold Spot','GOLD','commodities'],['XAGUSD','Silver Spot','SILVER','commodities'],
  ['USOIL','WTI Crude Oil','OIL','commodities'],['BRENT','Brent Crude','BRENT','commodities'],
  ['NATGAS','Natural Gas','GAS','commodities'],
  // Stocks
  ['AAPL','Apple Inc.','AAPL','stocks'],['TSLA','Tesla Inc.','TSLA','stocks'],
  ['NVDA','NVIDIA Corp.','NVDA','stocks'],['MSFT','Microsoft Corp.','MSFT','stocks'],
  ['GOOGL','Alphabet Inc.','GOOGL','stocks'],['META','Meta Platforms','META','stocks'],
  ['AMZN','Amazon.com','AMZN','stocks'],['NFLX','Netflix Inc.','NFLX','stocks'],
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
      <button class="mex-filter-btn is-active" data-filter="all">All <span class="fc-count"><?php echo count($markets); ?></span></button>
      <button class="mex-filter-btn" data-filter="crypto">Crypto <span class="fc-count"><?php echo count(array_filter($markets,fn($m)=>$m[3]==='crypto')); ?></span></button>
      <button class="mex-filter-btn" data-filter="forex">Forex <span class="fc-count"><?php echo count(array_filter($markets,fn($m)=>$m[3]==='forex')); ?></span></button>
      <button class="mex-filter-btn" data-filter="commodities">Commodities <span class="fc-count"><?php echo count(array_filter($markets,fn($m)=>$m[3]==='commodities')); ?></span></button>
      <button class="mex-filter-btn" data-filter="stocks">Stocks <span class="fc-count"><?php echo count(array_filter($markets,fn($m)=>$m[3]==='stocks')); ?></span></button>
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
            <span class="mc-badge"><?php echo _h(strtoupper($m[3])); ?></span>
            <span class="mc-live-dot"></span>
          </div>
          <strong class="mc-price mex-skeleton" data-price-symbol="<?php echo _h($m[0]); ?>">--</strong>
          <span class="mc-change mex-skeleton" data-change-symbol="<?php echo _h($m[0]); ?>">0.00%</span>
          <span class="mc-name"><?php echo _h($m[1]); ?></span>
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
