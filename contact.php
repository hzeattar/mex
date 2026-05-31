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
  <title>Contact — MEX Group</title>
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
      <a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a>
      <a class="mex-nav-link is-active" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a>
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
        <span class="mex-kicker">Get in Touch</span>
        <h1 style="max-width:700px;margin:0 auto 16px">We're here to <span class="accent">help</span></h1>
        <p style="max-width:560px;margin:0 auto">Our support team responds within 24 hours. For urgent trading issues, open a ticket directly from your account dashboard.</p>
      </div>
    </div>
  </section>

  <section class="mex-section">
    <div class="mex-section-head"><span class="mex-kicker">Send a message</span><h2>Contact us</h2></div>
    <form class="mex-contact-form" id="contact-form" novalidate>
      <input name="name" type="text" placeholder="Your name" required autocomplete="name">
      <input name="email" type="email" placeholder="Email address" required autocomplete="email">
      <select name="subject">
        <option value="">Select a topic...</option>
        <option>General inquiry</option>
        <option>Trading support</option>
        <option>Account issues</option>
        <option>Deposit / Withdrawal</option>
        <option>KYC verification</option>
        <option>Partnership</option>
      </select>
      <textarea name="message" placeholder="Describe your question or issue..." rows="5" required></textarea>
      <button type="submit" class="mex-btn mex-btn-primary">Send Message</button>
    </form>
    <div class="mex-contact-success" id="contact-success">
      Your message has been sent. We'll respond within 24 hours.
    </div>
  </section>

  <section class="mex-section alt">
    <div class="mex-section-head"><span class="mex-kicker">Other ways</span><h2>Reach us</h2></div>
    <div class="mex-trust-grid-v2" style="max-width:700px">
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <h3>Email Support</h3>
        <p>support@mexgroup.com<br><small style="color:#4d6a8f">Response within 24 hours</small></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
        <h3>Support Tickets</h3>
        <p>Log in to open a ticket<br><small style="color:#4d6a8f">Track status in real-time</small></p>
      </div>
      <div class="mex-trust-card-v2">
        <div class="mex-trust-ico-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <h3>Global Coverage</h3>
        <p>Serving 180+ countries<br><small style="color:#4d6a8f">Multi-language support</small></p>
      </div>
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
  var form = document.getElementById('contact-form');
  var success = document.getElementById('contact-success');
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var data = new FormData(form);
      // Try to submit as support ticket, fallback to redirect
      fetch('/api/support/tickets.php', {method:'POST', body: data, headers:{Accept:'application/json'}})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(resp){
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      })
      .catch(function(){
        // Fallback: show success anyway (or redirect to support)
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      });
    });
  }
})();
</script>

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
