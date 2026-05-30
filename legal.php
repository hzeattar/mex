<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$lang = strtolower((string)($_GET['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'));
$rtl = $lang === 'ar';
$isLoggedIn = false; try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }
function _h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
$pages = ['terms'=>['Terms of Service','شروط الاستخدام','Условия'],'privacy'=>['Privacy Policy','سياسة الخصوصية','Политика'],'risk'=>['Risk Disclosure','إفصاح المخاطر','Раскрытие']];
$page = $_GET['page'] ?? 'terms';
if(!isset($pages[$page])) $page='terms';
$title = is_array($pages[$page]) ? ($pages[$page][$lang==='ar'?1:($lang==='ru'?2:0)] ?? reset($pages[$page])) : $pages[$page];
?>
<!doctype html>
<html lang="<?php echo _h($lang); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title><?php echo _h($title); ?> — MEX Group</title><link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>"></head>
<body class="mex-landing-page <?php echo $rtl ? 'is-rtl' : ''; ?>">
<header class="mex-header"><div class="mex-header-inner"><a class="mex-logo" href="/?lang=<?php echo _h($lang); ?>"><img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none'"><strong>MEX Group</strong></a>
<nav class="mex-header-nav"><a class="mex-nav-link" href="/?lang=<?php echo _h($lang); ?>">Home</a><a class="mex-nav-link" href="/markets.php?lang=<?php echo _h($lang); ?>">Markets</a><a class="mex-nav-link" href="/features.php?lang=<?php echo _h($lang); ?>">Features</a><a class="mex-nav-link" href="/about.php?lang=<?php echo _h($lang); ?>">About</a><a class="mex-nav-link" href="/contact.php?lang=<?php echo _h($lang); ?>">Contact</a></nav>
<div class="mex-header-actions"><div class="mex-lang-wrap"><button class="mex-lang-btn" id="mex-lang-trigger"><span class="mex-lang-current"><?php echo strtoupper(_h($lang)); ?></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg></button><div class="mex-lang-dropdown" id="mex-lang-dropdown"><?php foreach(['en'=>'English','ar'=>'العربية','ru'=>'Русский','tr'=>'Türkçe','fr'=>'Français','de'=>'Deutsch','es'=>'Español','it'=>'Italiano','pt'=>'Português','nl'=>'Nederlands','pl'=>'Polski','zh'=>'中文','ja'=>'日本語','ko'=>'한국어','vi'=>'Tiếng Việt'] as $c=>$n): ?><a class="mex-lang-opt<?php echo $c===$lang?' is-active':''; ?>" href="?lang=<?php echo _h($c); ?>&page=<?php echo _h($page); ?>"><?php echo _h($n); ?></a><?php endforeach; ?></div></div><?php if($isLoggedIn): ?><a class="mex-btn mex-btn-primary mex-btn-sm" href="/app.php#/home">Open App</a><?php else: ?><div class="mex-header-btns"><a class="mex-btn mex-btn-soft mex-btn-sm" href="/login.php?lang=<?php echo _h($lang); ?>">Log in</a><a class="mex-btn mex-btn-primary mex-btn-sm" href="/register.php?lang=<?php echo _h($lang); ?>">Create Account</a></div><?php endif; ?><button class="mex-hamburger" id="mex-hamburger"><span></span><span></span><span></span></button></div>
</div></header>
<main class="mex-page">
  <section class="mex-hero-v2" style="padding:50px 0 30px"><div class="mex-hero-grid" style="grid-template-columns:1fr;text-align:center"><div class="mex-hero-text"><span class="mex-kicker">Legal</span><h1 style="max-width:700px;margin:0 auto 10px"><?php echo _h($title); ?></h1></div></div></section>
  <section class="mex-section"><div class="mex-legal-nav" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:24px">
    <a class="mex-nav-link<?php echo $page==='terms'?' is-active':''; ?>" href="/legal.php?page=terms&lang=<?php echo _h($lang); ?>">Terms</a>
    <a class="mex-nav-link<?php echo $page==='privacy'?' is-active':''; ?>" href="/legal.php?page=privacy&lang=<?php echo _h($lang); ?>">Privacy</a>
    <a class="mex-nav-link<?php echo $page==='risk'?' is-active':''; ?>" href="/legal.php?page=risk&lang=<?php echo _h($lang); ?>">Risk</a>
  </div>
  <div class="mex-legal-body">
<?php if($page==='terms'): ?>
<h2>Terms of Service</h2>
<p>Welcome to MEX Group. By accessing or using our platform, you agree to be bound by these terms. If you do not agree, you must not use the platform.</p>
<h3>1. Eligibility</h3>
<p>You must be at least 18 years old and able to form legally binding contracts to use our services.</p>
<h3>2. Account</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access.</p>
<h3>3. Risk</h3>
<p>Trading involves significant risk. You may lose your entire investment. Past performance is not indicative of future results.</p>
<h3>4. Prohibited Activities</h3>
<p>You may not use the platform for money laundering, fraud, market manipulation, or any illegal activity. We reserve the right to suspend accounts for suspected violations.</p>
<h3>5. Changes</h3>
<p>We may modify these terms at any time. Continued use after changes constitutes acceptance.</p>
<?php elseif($page==='privacy'): ?>
<h2>Privacy Policy</h2>
<p>MEX Group is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.</p>
<h3>1. Information We Collect</h3>
<p>We collect registration information, KYC documents, transaction history, device information, and user activity data.</p>
<h3>2. How We Use It</h3>
<p>Data is used to provide services, verify identity, prevent fraud, comply with regulations, and improve the platform.</p>
<h3>3. Sharing</h3>
<p>We do not sell your data. We may share it with regulators, payment processors, and service providers who agree to confidentiality.</p>
<h3>4. Security</h3>
<p>We use encryption, secure servers, access controls, and regular audits to protect your data.</p>
<h3>5. Your Rights</h3>
<p>You have the right to access, correct, or delete your personal data. Contact us for requests.</p>
<?php else: ?>
<h2>Risk Disclosure</h2>
<p>Trading leveraged financial instruments carries a high risk of losing money rapidly. Consider whether you understand how these products work and whether you can afford the high risk.</p>
<h3>Market Risk</h3>
<p>Prices may change rapidly due to macroeconomic events, geopolitical developments, liquidity gaps, and technical issues. Stop losses may not execute at your desired price.</p>
<h3>Leverage Risk</h3>
<p>Leverage amplifies both gains and losses. A small adverse price movement can result in a total loss of your margin.</p>
<h3>Provider Risk</h3>
<p>Price quotes are sourced from third-party providers. Delays, outages, or inaccuracies may occur.</p>
<h3>Platform Risk</h3>
<p>Technical failures, maintenance windows, network issues, or force majeure events may prevent trading.</p>
<h3>No Guarantees</h3>
<p>This platform does not provide investment advice. All trading decisions are yours alone.</p>
<?php endif; ?>
  </div></section>
</main>
<footer class="mex-footer"><div class="mex-footer-inner"><div class="mex-footer-main"><div class="mex-footer-brand"><a class="mex-footer-logo" href="/"><img src="/assets/img/mexgroup_logo.svg" alt=""><strong>MEX Group</strong></a><p>Professional multi-asset trading platform.</p></div><div class="mex-footer-col"><h4>Products</h4><a href="/app.php#/trade">Trading Desk</a><a href="/app.php#/invest">Copy Trading</a><a href="/app.php#/invest">Contracts</a><a href="/app.php#/deposit">Funding</a></div><div class="mex-footer-col"><h4>Resources</h4><a href="/app.php#/kyc">Verification</a><a href="/app.php#/support">Support Center</a></div><div class="mex-footer-col"><h4>Legal</h4><a href="/legal.php?page=terms">Terms</a><a href="/legal.php?page=privacy">Privacy</a><a href="/legal.php?page=risk">Risk</a></div></div><div class="mex-footer-bottom"><span>&copy; <?php echo date('Y'); ?> MEX Group. Trading involves significant risk.</span></div></div></footer>
<script>(function(){var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');if(lb&&ld){lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});}var h=document.getElementById('mex-hamburger'),n=document.querySelector('.mex-header-nav');if(h&&n){h.addEventListener('click',function(){var o=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',o?'false':'true');n.classList.toggle('is-open',!o);h.classList.toggle('is-active',!o);});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.setAttribute('aria-expanded','false');n.classList.remove('is-open');h.classList.remove('is-active');});});}})();</script>
</body></html>
