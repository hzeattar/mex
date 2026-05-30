<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl = $lang === 'ar';
$isLoggedIn = false; try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$title = 'Contact';
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Contact MEX Group — support and inquiries."><title><?php echo _h($title); ?> — MEX Group</title><link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>"></head>
<body class="mex-landing-page <?php echo $rtl ? 'is-rtl' : ''; ?>">
<header class="mex-header"><div class="mex-header-inner"><a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>"><img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none'"><strong>MEX Group</strong></a>
<nav class="mex-header-nav"><a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>">Home</a><a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a><a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a><a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a><a class="mex-nav-link is-active" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a></nav>
<div class="mex-header-actions"><div class="mex-lang-wrap"><button class="mex-lang-btn" id="mex-lang-trigger"><span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg></button><div class="mex-lang-dropdown" id="mex-lang-dropdown"><?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?><a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>"><?php echo _h($n); ?></a><?php endforeach; ?></div></div><?php if($isLoggedIn): ?><a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home">Open App</a><?php else: ?><div class="mex-header-btns"><a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>">Log in</a><a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>">Create Account</a></div><?php endif; ?><button class="mex-hamburger" id="mex-hamburger"><span></span><span></span><span></span></button></div>
</div></header>
<main class="mex-page">
  <section class="mex-hero-v2" style="padding:60px 0 50px"><div class="mex-hero-grid" style="grid-template-columns:1fr;text-align:center"><div class="mex-hero-text"><span class="mex-kicker">Contact</span><h1 style="max-width:700px;margin:0 auto 16px">We're here to <span class="accent">help</span></h1><p style="max-width:560px;margin:0 auto">Reach out for support, partnerships, or general inquiries. Our team responds within 24 hours.</p></div></div></section>
  <section class="mex-section"><div class="mex-section-head"><span class="mex-kicker">Get in touch</span><h2>Contact us</h2></div>
    <div class="mex-contact-grid" style="display:grid;grid-template-columns:1fr;gap:24px;max-width:640px;margin:0 auto">
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,0.12);border-radius:12px;padding:28px;display:flex;align-items:center;gap:16px">
        <div style="width:44px;height:44px;border-radius:10px;background:rgba(64,125,181,0.1);display:grid;place-items:center;color:#3e9be0"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div><h4 style="margin:0 0 4px;font-size:15px">Email</h4><p style="margin:0;color:#5d7ea8;font-size:14px">support@mexgroup.com</p></div>
      </div>
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,0.12);border-radius:12px;padding:28px;display:flex;align-items:center;gap:16px">
        <div style="width:44px;height:44px;border-radius:10px;background:rgba(64,125,181,0.1);display:grid;place-items:center;color:#3e9be0"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
        <div><h4 style="margin:0 0 4px;font-size:15px">Support</h4><p style="margin:0;color:#5d7ea8;font-size:14px">Open a ticket in the Support Center</p></div>
      </div>
      <div style="background:#0a1122;border:1px solid rgba(64,125,181,0.12);border-radius:12px;padding:28px;display:flex;align-items:center;gap:16px">
        <div style="width:44px;height:44px;border-radius:10px;background:rgba(64,125,181,0.1);display:grid;place-items:center;color:#3e9be0"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <div><h4 style="margin:0 0 4px;font-size:15px">Global</h4><p style="margin:0;color:#5d7ea8;font-size:14px">Serving 180+ countries worldwide</p></div>
      </div>
    </div>
  </section>
</main>
<footer class="mex-footer"><div class="mex-footer-inner"><div class="mex-footer-main"><div class="mex-footer-brand"><a class="mex-footer-logo" href="/"><img src="/assets/img/mexgroup_logo.svg" alt=""><strong>MEX Group</strong></a><p>Professional multi-asset trading platform.</p></div><div class="mex-footer-col"><h4>Products</h4><a href="/app.php#/trade">Trading Desk</a><a href="/app.php#/invest">Copy Trading</a><a href="/app.php#/invest">Contracts</a><a href="/app.php#/deposit">Funding</a></div><div class="mex-footer-col"><h4>Resources</h4><a href="/app.php#/kyc">Verification</a><a href="/app.php#/support">Support Center</a></div><div class="mex-footer-col"><h4>Legal</h4><a href="/legal.php?page=terms">Terms</a><a href="/legal.php?page=privacy">Privacy</a><a href="/legal.php?page=risk">Risk</a></div></div><div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. Trading involves significant risk.</span></div></div></footer>
<script>(function(){var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});}var h=document.getElementById('mex-hamburger'),n=document.querySelector('.mex-header-nav');if(h&&n){h.addEventListener('click',function(){var o=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',o?'false':'true');n.classList.toggle('is-open',!o);h.classList.toggle('is-active',!o);});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.setAttribute('aria-expanded','false');n.classList.remove('is-open');h.classList.remove('is-active');});});}})();</script>
</body></html>
