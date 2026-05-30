<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';

$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl = $lang === 'ar';
$isLoggedIn = false; try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#060b18">
  <meta name="description" content="MEX Group — Trade 70+ crypto, forex, stocks and commodities with professional tools.">
  <title>Markets — MEX Group</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="mex-landing-page <?php echo $rtl ? 'is-rtl' : ''; ?>">

  <!-- Header (simplified inline for independence) -->
  <header class="mex-header" id="mex-header">
    <div class="mex-header-inner">
      <a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>"><img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none'"><strong>MEX Group</strong></a>
      <nav class="mex-header-nav" aria-label="Main">
        <a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>">Home</a>
        <a class="mex-nav-link is-active" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a>
        <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
        <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
        <a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
      </nav>
      <div class="mex-header-actions">
        <div class="mex-lang-wrap">
          <button class="mex-lang-btn" id="mex-lang-trigger" aria-expanded="false"><span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg></button>
          <div class="mex-lang-dropdown" id="mex-lang-dropdown"><?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$name): ?><a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>"><?php echo _h($name); ?></a><?php endforeach; ?></div>
        </div>
        <?php if($isLoggedIn): ?><a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home">Open App</a>
        <?php else: ?><div class="mex-header-btns"><a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>">Log in</a><a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>">Create Account</a></div><?php endif; ?>
        <button class="mex-hamburger" id="mex-hamburger"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <main class="mex-page"><section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker">Markets</span><h2>70+ Instruments</h2><p>Crypto, forex, stocks, commodities and futures — all available for demo and real trading.</p></div>
    <div class="mex-market-grid-v2" id="market-full-grid">
      <?php foreach([
        ['BTCUSDT','Bitcoin','crypto'],['ETHUSDT','Ethereum','crypto'],['BNBUSDT','BNB','crypto'],['SOLUSDT','Solana','crypto'],
        ['XRPUSDT','Ripple','crypto'],['ADAUSDT','Cardano','crypto'],
        ['EURUSD','Euro / Dollar','forex'],['GBPUSD','Pound / Dollar','forex'],['USDJPY','Dollar / Yen','forex'],['USDCHF','Dollar / Franc','forex'],
        ['XAUUSD','Gold Spot','commodities'],['USOIL','WTI Crude Oil','commodities'],['NATGAS','Natural Gas','commodities'],['BRENT','Brent Crude','commodities'],
        ['AAPL','Apple Inc.','stocks'],['TSLA','Tesla Inc.','stocks'],['NVDA','NVIDIA','stocks'],['MSFT','Microsoft','stocks'],['GOOGL','Alphabet','stocks'],['META','Meta Platforms','stocks'],
        ['ES_F','S&P 500 Futures','futures'],['NQ_F','Nasdaq 100 Futures','futures'],
      ] as $m): ?><div class="mex-market-card-v2"><div class="mc-top"><span class="mc-symbol"><?php echo _h($m[0]); ?></span><span class="mc-badge"><?php echo _h(strtoupper($m[2])); ?></span></div><strong class="mc-price" data-price-symbol="<?php echo _h($m[0]); ?>">--</strong><span class="mc-change" data-change-symbol="<?php echo _h($m[0]); ?>">0.00%</span><span class="mc-name"><?php echo _h($m[1]); ?></span></div><?php endforeach; ?>
    </div>
  </section></main>

  <footer class="mex-footer"><div class="mex-footer-inner"><div class="mex-footer-main"><div class="mex-footer-brand"><a class="mex-footer-logo" href="/"><img src="/assets/img/mexgroup_logo.svg" alt=""><strong>MEX Group</strong></a><p>Professional multi-asset trading platform with transparent pricing.</p></div><div class="mex-footer-col"><h4>Products</h4><a href="/app.php#/trade">Trading Desk</a><a href="/app.php#/invest">Copy Trading</a><a href="/app.php#/invest">Investment Contracts</a><a href="/app.php#/deposit">Funding</a></div><div class="mex-footer-col"><h4>Resources</h4><a href="/app.php#/kyc">Verification</a><a href="/app.php#/support">Support Center</a></div><div class="mex-footer-col"><h4>Legal</h4><a href="/legal.php?page=terms">Terms</a><a href="/legal.php?page=privacy">Privacy</a><a href="/legal.php?page=risk">Risk Disclosure</a></div></div><div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. Trading involves significant risk.</span></div></div></footer>

  <script>
  (function(){function fmt(v){var n=Number(v);if(!isFinite(n)||n<=0)return'--';if(n>=1000)return'$'+n.toLocaleString(undefined,{maximumFractionDigits:2});if(n>=1)return'$'+n.toLocaleString(undefined,{maximumFractionDigits:4});return'$'+n.toLocaleString(undefined,{maximumFractionDigits:6});}
  function fetchPrices(){var symbols=Array.from(document.querySelectorAll('[data-price-symbol]')).map(function(el){return el.getAttribute('data-price-symbol');});symbols=Array.from(new Set(symbols.filter(Boolean)));if(!symbols.length)return;fetch('/api/quotes.php?symbols='+encodeURIComponent(symbols.join(','))+'&type=all&purpose=landing',{headers:{Accept:'application/json'}}).then(function(r){return r.ok?r.json():null;}).then(function(data){if(!data)return;var quotes=data.quotes||data.data||data.items||[];if(!Array.isArray(quotes)&&typeof quotes==='object')quotes=Object.values(quotes);quotes.forEach(function(q){var sym=String(q.symbol||q.market||'').toUpperCase();var price=q.price||q.last||q.bid||q.close;var change=q.change_pct||q.changePercent||q.change||0;var c=Number(change);document.querySelectorAll('[data-price-symbol="'+sym+'"]').forEach(function(el){el.textContent=fmt(price);});document.querySelectorAll('[data-change-symbol="'+sym+'"]').forEach(function(el){el.textContent=isFinite(c)?((c>=0?'+':'')+c.toFixed(2)+'%'):'--';el.className=c<0?'mc-change down':'mc-change';});});}).catch(function(){});}fetchPrices();setInterval(fetchPrices,15000);
  var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});
  var h=document.getElementById('mex-hamburger'),n=document.querySelector('.mex-header-nav');if(h&&n){h.addEventListener('click',function(){var o=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',o?'false':'true');n.classList.toggle('is-open',!o);h.classList.toggle('is-active',!o);});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.setAttribute('aria-expanded','false');n.classList.remove('is-open');h.classList.remove('is-active');});});}
  })();
  </script>
</body>
</html>
