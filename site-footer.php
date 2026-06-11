<?php
declare(strict_types=1);
require_once __DIR__ . '/site-helpers.php';

function render_site_footer(string $activePage = 'home'): void {
  $l = site_locale();
  $isLoggedIn = false;
  try { $isLoggedIn = session_user_id() > 0; } catch (Throwable $e) { $isLoggedIn = false; }

  $products = [
    [site_t('footer_trade', $l), '/app.php#/trade'],
    [site_t('footer_copy', $l), '/app.php#/invest'],
    [site_t('footer_invest', $l), '/app.php#/invest'],
    [site_t('footer_funding', $l), '/app.php#/deposit'],
  ];
  $resources = [
    [site_t('footer_kyc', $l), '/app.php#/kyc'],
    [site_t('footer_support', $l), '/app.php#/support'],
    [site_t('footer_api', $l), '#'],
  ];
  $legal = [
    [site_t('footer_terms', $l), '/legal.php?page=terms&lang=' . $l],
    [site_t('footer_privacy', $l), '/legal.php?page=privacy&lang=' . $l],
    [site_t('footer_risk', $l), '/legal.php?page=risk&lang=' . $l],
  ];

  $prodLinks = '';
  foreach ($products as $pr) {
    $prodLinks .= '<a href="' . __e($pr[1]) . '"' . (str_starts_with($pr[1], '/app.php') ? ' target="_self"' : '') . '>' . __e($pr[0]) . '</a>';
  }
  $resLinks = '';
  foreach ($resources as $pr) {
    $resLinks .= '<a href="' . __e($pr[1]) . '">' . __e($pr[0]) . '</a>';
  }
  $legalLinks = '';
  foreach ($legal as $pr) {
    $legalLinks .= '<a href="' . __e($pr[1]) . '">' . __e($pr[0]) . '</a>';
  }

  echo '<footer class="mex-footer">
    <div class="mex-footer-inner">
      <div class="mex-footer-main">
        <div class="mex-footer-brand">
          <a class="mex-footer-logo" href="/?lang=' . $l . '">
            <img src="/assets/img/mex_global_logo.png" alt="MEX Global" onerror="this.style.display=\'none\'">
            <strong>MEX Group</strong>
          </a>
          <p>' . __e(site_t('footer_desc', $l)) . '</p>
        </div>
        <div class="mex-footer-col">
          <h4>' . __e(site_t('footer_products', $l)) . '</h4>' . $prodLinks . '
        </div>
        <div class="mex-footer-col">
          <h4>' . __e(site_t('footer_resources', $l)) . '</h4>' . $resLinks . '
        </div>
        <div class="mex-footer-col">
          <h4>' . __e(site_t('footer_legal', $l)) . '</h4>' . $legalLinks . '
        </div>
      </div>
      <div class="mex-footer-bottom">
        <span>&copy; ' . date('Y') . ' MEX Group. ' . __e(site_t('footer_disclaimer', $l)) . '</span>
      </div>
    </div>
  </footer>';
}
