<?php
declare(strict_types=1);
require_once __DIR__ . '/site-helpers.php';

function render_site_header(string $activePage = 'home', string $extraClass = ''): void {
  $l = site_locale();
  $rtl = site_is_rtl($l);
  $isLoggedIn = false;
  try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }

  $pages = [
    ['home',    site_t('home', $l),    '/'],
    ['markets', site_t('markets', $l), '/markets.php'],
    ['features',site_t('features', $l),'/features.php'],
    ['about',   site_t('about', $l),   '/about.php'],
    ['contact', site_t('contact', $l),  '/contact.php'],
  ];

  $langs = site_langs();
  $langSwitcherHtml = '';
  foreach ($langs as $code) {
    $langSwitcherHtml .= '<a class="mex-lang-opt' . ($code === $l ? ' is-active' : '') . '" href="?lang=' . $code . '">' . site_lang_name($code) . '</a>';
  }

  // Check if we are on a non-root page to add lang param to all links
  $c = $activePage;
  $navItems = '';
  foreach ($pages as $p) {
    $cls = $p[0] === $c ? ' is-active' : '';
    $href = $p[2] . (strpos($p[2], '?') === false ? '?lang=' . $l : '&lang=' . $l);
    $navItems .= '<a class="mex-nav-link' . $cls . '" href="' . __e($href) . '">' . __e($p[1]) . '</a>';
  }

  $loginUrl   = '/login.php?lang=' . $l;
  $regUrl     = '/register.php?lang=' . $l;
  $dashUrl    = '/app.php#/home';
  $logoutUrl  = '/logout.php';

  $searchLabel = __e(site_t('search_markets', $l));
  $langLabel   = __e(site_t('lang', $l));

  echo '<header class="mex-header' . ($extraClass ? ' ' . __e($extraClass) : '') . '" id="mex-header">
    <div class="mex-header-inner">
      <a class="mex-logo" href="/?lang=' . $l . '" aria-label="MEX Group">
        <img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">
        <span class="mex-logo-fallback" style="display:none">MX</span>
        <strong>MEX Group</strong>
      </a>

      <nav class="mex-header-nav" aria-label="Main">' . $navItems . '</nav>

      <div class="mex-header-actions">
        <button class="mex-search-btn" id="mex-search-trigger" aria-label="Search" title="' . $searchLabel . '">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>

        <div class="mex-lang-wrap">
          <button class="mex-lang-btn" id="mex-lang-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="mex-lang-current">' . strtoupper($l) . '</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="mex-lang-dropdown" id="mex-lang-dropdown" role="listbox">' . $langSwitcherHtml . '</div>
        </div>

        ' . ($isLoggedIn
          ? '<div class="mex-header-btns">
               <a class="mex-btn mex-btn-soft mex-btn-sm" href="' . __e($logoutUrl) . '">' . __e(site_t('logout', $l)) . '</a>
               <a class="mex-btn mex-btn-primary mex-btn-sm" href="' . __e($dashUrl) . '">' . __e(site_t('open_app', $l)) . '</a>
             </div>'
          : '<div class="mex-header-btns">
               <a class="mex-btn mex-btn-soft mex-btn-sm" href="' . __e($loginUrl) . '">' . __e(site_t('login', $l)) . '</a>
               <a class="mex-btn mex-btn-primary mex-btn-sm" href="' . __e($regUrl) . '">' . __e(site_t('register', $l)) . '</a>
             </div>') . '

        <button class="mex-hamburger" id="mex-hamburger" aria-label="Menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <!-- Language dropdown script -->
    <script>(function(){var b=document.getElementById("mex-lang-trigger"),d=document.getElementById("mex-lang-dropdown");if(!b||!d)return;b.addEventListener("click",function(e){e.stopPropagation();var o=b.getAttribute("aria-expanded")==="true";b.setAttribute("aria-expanded",o?"false":"true");d.classList.toggle("is-open",!o)});document.addEventListener("click",function(){b.setAttribute("aria-expanded","false");d.classList.remove("is-open")});d.addEventListener("click",function(e){e.stopPropagation()})})();</script>
    <!-- Mobile menu script -->
    <script>(function(){var h=document.getElementById("mex-hamburger"),n=document.querySelector(".mex-header-nav"),hdr=document.getElementById("mex-header");if(!h||!n)return;h.addEventListener("click",function(){var o=h.getAttribute("aria-expanded")==="true";h.setAttribute("aria-expanded",o?"false":"true");n.classList.toggle("is-open",!o);h.classList.toggle("is-active",!o);hdr.classList.toggle("menu-open",!o);document.body.classList.toggle("mex-menu-open",!o)});document.querySelectorAll(".mex-header-nav a").forEach(function(a){a.addEventListener("click",function(){h.setAttribute("aria-expanded","false");n.classList.remove("is-open");h.classList.remove("is-active");hdr.classList.remove("menu-open");document.body.classList.remove("mex-menu-open")})})})();</script>
  </header>';
}
