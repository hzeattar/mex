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
  <title>About — MEX Group</title>
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
      <a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a>
      <a class="mex-nav-link is-active" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
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
        <span class="mex-kicker">About MEX Group</span>
        <h1 style="max-width:700px;margin:0 auto 16px">Built for <span class="accent">serious</span> traders</h1>
        <p style="max-width:560px;margin:0 auto">
          MEX Group delivers institutional-grade trading technology to retail investors worldwide,
          with transparent pricing and professional tools at every tier.
        </p>
      </div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker">Our Story</span><h2>Who we are</h2></div>
    <div style="max-width:800px;margin:0 auto;display:grid;gap:24px">
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,.12);border-radius:16px;padding:32px" class="mex-reveal">
        <h3 style="color:#e2e8f0;margin:0 0 12px;font-size:20px">Our Mission</h3>
        <p style="color:#8ea9d8;line-height:1.8;margin:0">To democratize access to global financial markets by providing professional-grade tools, transparent pricing, and institutional-level security — regardless of portfolio size or experience.</p>
      </div>
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,.12);border-radius:16px;padding:32px" class="mex-reveal">
        <h3 style="color:#e2e8f0;margin:0 0 12px;font-size:20px">Our Technology</h3>
        <p style="color:#8ea9d8;line-height:1.8;margin:0">Multi-provider price aggregation (Binance + Yahoo + Frankfurter) for best-effort real-time quotes. TradingView-powered charts, instant order matching engine, end-to-end encrypted sessions, and manual KYC flow for compliance.</p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker">By the numbers</span><h2>Platform at a glance</h2></div>
    <div class="mex-trust-grid-v2">
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div><h3>70+</h3><p>Tradeable instruments across crypto, forex, stocks, and commodities</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div><h3>180+</h3><p>Countries served with localized interfaces and 15-language support</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>99.9%</h3><p>Platform uptime with redundant infrastructure and automatic failover</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h3>24/7</h3><p>Support coverage with ticket system and fast response times</p></div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker">Our Values</span><h2>What drives us</h2></div>
    <div class="mex-values-grid">
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3>Transparency</h3>
        <p>Every price has a visible source label. Every fee is disclosed. No hidden spreads or surprise charges.</p>
      </div>
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <h3>Security</h3>
        <p>KYC verification, encrypted sessions, manual funding review, and audit logs on every transaction.</p>
      </div>
      <div class="mex-value-card mex-reveal">
        <div class="mex-value-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <h3>Innovation</h3>
        <p>Continuously shipping features: copy trading, investment contracts, multi-language support, and more.</p>
      </div>
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker">Leadership</span><h2>The team</h2></div>
    <div class="mex-trust-grid-v2" style="max-width:900px">
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">AK</div><h3>Ahmed K.</h3><p>CEO — 15+ years in digital asset markets and fintech</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">SM</div><h3>Sara M.</h3><p>CTO — Former lead engineer at a major crypto exchange</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">RH</div><h3>Rami H.</h3><p>Head of Compliance — KYC/AML specialist, regulated markets background</p></div>
      <div class="mex-trust-card-v2 mex-reveal"><div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#5d7cff,#00c087);margin:0 auto 12px;display:grid;place-items:center;color:#fff;font-size:20px;font-weight:900">LW</div><h3>Lina W.</h3><p>Head of Trading — Quant strategies, market making, and risk systems</p></div>
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
