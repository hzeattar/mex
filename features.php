<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl  = $lang === 'ar';
$isLoggedIn = false;
try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) {}
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl?'rtl':'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Features — MEX Group</title>
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
      <a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a>
      <a class="mex-nav-link is-active" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
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
      <button class="mex-hamburger" id="mex-hamburger" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>

<main class="mex-page">
  <section class="mex-hero-v2" style="padding:60px 0 50px">
    <div class="mex-hero-grid" style="grid-template-columns:1fr;text-align:center">
      <div class="mex-hero-text">
        <span class="mex-kicker">Platform Features</span>
        <h1 style="max-width:700px;margin:0 auto 16px">
          Everything you need to <span class="accent">trade</span> professionally
        </h1>
        <p style="max-width:560px;margin:0 auto">
          A complete suite of tools built for speed, clarity, and control — from chart analysis to order execution.
        </p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker">Core Features</span><h2>What you get</h2></div>
    <div class="mex-features-grid">
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
        <h4>Professional Charts</h4>
        <p>Candlestick charts with MA lines, volume bars, crosshair OHLCV tooltip, and multiple timeframes from 1m to 1W.</p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <h4>Instant Execution</h4>
        <p>One-click market orders with real-time confirmation, leverage control up to 1:500, and TP/SL pre-configuration.</p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <h4>Copy Trading</h4>
        <p>Follow verified signal providers with transparent win rates, drawdown stats, and one-tap subscription from $10.</p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h4>KYC Verification</h4>
        <p>Multi-step online identity verification with document upload, face match, and real-time status tracking.</p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <h4>Funding & Withdrawals</h4>
        <p>Manual deposits with proof upload and full audit trail. Withdrawals processed with admin review and status updates.</p>
      </div>
      <div class="mex-feature-card mex-reveal">
        <div class="mex-feature-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></div>
        <h4>Investment Contracts</h4>
        <p>Fixed-term investment plans with guaranteed returns, multiple tiers, and automated compound options.</p>
      </div>
    </div>
  </section>

  <!-- Comparison Table -->
  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker">Comparison</span><h2>MEX Group vs Typical Broker</h2></div>
    <div class="mex-compare-wrap">
      <table class="mex-compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>MEX Group</th>
            <th>Typical Broker</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Asset types</td><td class="chk">✓ Crypto + Forex + Stocks + Commodities</td><td>Usually 1–2 asset types</td></tr>
          <tr><td>Demo account</td><td class="chk">✓ Free forever, $10,000 balance</td><td>Limited time or paid</td></tr>
          <tr><td>Copy trading</td><td class="chk">✓ Built-in, from $10</td><td>Often a paid add-on</td></tr>
          <tr><td>KYC process</td><td class="chk">✓ Online, same-day review</td><td>Manual, days-long</td></tr>
          <tr><td>Investment contracts</td><td class="chk">✓ Tiered fixed-return plans</td><td class="cross">✗ Not available</td></tr>
          <tr><td>Languages</td><td class="chk">✓ 15 languages</td><td>Usually 2–5</td></tr>
          <tr><td>Chart MA lines</td><td class="chk">✓ MA7 + MA25 built-in</td><td>Requires 3rd party plugin</td></tr>
          <tr><td>24/7 Support</td><td class="chk">✓ Ticket system + live chat</td><td>Limited hours</td></tr>
        </tbody>
      </table>
    </div>
    <div style="text-align:center;margin-top:28px">
      <a class="mex-btn mex-btn-primary" href="/register.php?lang=<?php echo _h($lang); ?>">Try for free — no deposit</a>
    </div>
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
      <div class="mex-footer-col"><h4>Company</h4><a href="/about.php">About</a><a href="/features.php">Features</a><a href="/contact.php">Contact</a></div>
      <div class="mex-footer-col"><h4>Legal</h4><a href="/legal.php?page=terms">Terms</a><a href="/legal.php?page=privacy">Privacy</a><a href="/legal.php?page=risk">Risk</a></div>
    </div>
    <div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. Trading involves significant risk of loss.</span></div>
  </div>
</footer>
<script>
(function(){
  var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
  if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});ld.addEventListener('click',function(e){e.stopPropagation();});}
  var hb=document.getElementById('mex-hamburger'),nav=document.querySelector('.mex-header-nav');
  if(hb&&nav){hb.addEventListener('click',function(){var o=hb.getAttribute('aria-expanded')==='true';hb.setAttribute('aria-expanded',o?'false':'true');nav.classList.toggle('is-open',!o);hb.classList.toggle('is-active',!o);});nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){hb.setAttribute('aria-expanded','false');nav.classList.remove('is-open');hb.classList.remove('is-active');});});}
  if('IntersectionObserver' in window){var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target);}});},{threshold:.15});document.querySelectorAll('.mex-reveal').forEach(function(el){obs.observe(el);});}else{document.querySelectorAll('.mex-reveal').forEach(function(el){el.classList.add('is-visible');});}
})();
</script>
</body>
</html>
