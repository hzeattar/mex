<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
if (session_user_id() <= 0) {
  $next = rawurlencode('/legacy-app.php#/home');
  header('Location: /login.php?next=' . $next);
  exit;
}
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$css = __DIR__ . '/assets/css/app.css';
$js  = __DIR__ . '/assets/js/app.js';
$css_v = is_file($css) ? (int)@filemtime($css) : time();
$js_v  = is_file($js)  ? (int)@filemtime($js)  : time();
$trade_v2_css = __DIR__ . '/assets/css/trade-v2.css';
$trade_v2_js  = __DIR__ . '/assets/js/trade-v2.js';
$trade_v2_css_v = is_file($trade_v2_css) ? (int)@filemtime($trade_v2_css) : $css_v;
$trade_v2_js_v  = is_file($trade_v2_js)  ? (int)@filemtime($trade_v2_js)  : $js_v;
$theme_css = __DIR__ . '/assets/css/multibank-theme.css';
$theme_js  = __DIR__ . '/assets/js/multibank-theme.js';
$theme_css_v = is_file($theme_css) ? (int)@filemtime($theme_css) : $css_v;
$theme_js_v  = is_file($theme_js)  ? (int)@filemtime($theme_js)  : $js_v;
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="Legacy VertexPluse client area." />
  <meta name="theme-color" content="#060A14" />
  <meta name="color-scheme" content="dark" />
  <title><?php echo htmlspecialchars(site_setting('site.brand', 'VertexPluse'), ENT_QUOTES); ?> - Legacy App</title>
  <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <script>
    (()=>{ try{ localStorage.setItem('theme','dark'); document.documentElement.dataset.theme = 'dark'; }catch(e){} })();
  </script>
  <link rel="stylesheet" href="./assets/css/app.css?v=<?php echo $css_v; ?>" />
  <link rel="stylesheet" href="./assets/css/multibank-theme.css?v=<?php echo $theme_css_v; ?>" />
  <link rel="stylesheet" href="./assets/css/trade-v2.css?v=<?php echo $trade_v2_css_v; ?>" />
</head>
<body>
  <div id="app"></div>
  <script>
    window.__VP_TRADE_V2 = true;
    window.__SUPPORT_EMAIL = <?php echo json_encode(site_setting('site.support_email', 'support@vertexpluse.com'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
    window.__BRAND_NAME = <?php echo json_encode(site_setting('site.brand', 'VertexPluse'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
    window.__BRAND_TAGLINE = <?php echo json_encode(site_setting('site.tagline', 'Professional trading & investment platform'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
    window.__BRAND_LOGO_URL = <?php echo json_encode(site_setting('site.app_logo_url', $defaultLogoUrl ?? './assets/img/vertexpluse-logo.svg'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
    window.__MARKETS_FIRST_BATCH_SIZE = <?php echo (int)env('MARKETS_FIRST_BATCH_SIZE', '12'); ?>;
    window.__MARKETS_BATCH_SIZE = <?php echo (int)env('MARKETS_BATCH_SIZE', '20'); ?>;
  </script>
  <script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js" defer></script>
  <script src="./assets/js/app.js?v=<?php echo $js_v; ?>" defer></script>
  <script src="./assets/js/trade-v2.js?v=<?php echo $trade_v2_js_v; ?>" defer></script>
  <script src="./assets/js/multibank-theme.js?v=<?php echo $theme_js_v; ?>" defer></script>
</body>
</html>
