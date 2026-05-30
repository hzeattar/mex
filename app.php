<?php
declare(strict_types=1);
/**
 * Main app entry point - now serves the Vite v2 frontend.
 * The old app-lite.js is preserved as fallback at /legacy-app.php
 */
require_once __DIR__ . '/site_bootstrap.php';

// Gracefully handle DB failures — if DB is down, treat as not logged in
// and redirect to login instead of crashing with a 502.
$uid = 0;
try {
  $uid = session_user_id();
} catch (Throwable $e) {
  error_log('[app.php] session_user_id failed: ' . $e->getMessage());
  $uid = 0;
}

if ($uid <= 0) {
  $next = rawurlencode('/app.php#/home');
  header('Location: /login.php?next=' . $next);
  exit;
}
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Load Vite manifest for cache-busted asset paths
$manifestPath = __DIR__ . '/assets/dist/.vite/manifest.json';
$manifest = [];
if (is_file($manifestPath)) {
  $manifest = json_decode(file_get_contents($manifestPath), true) ?: [];
}

$mainEntry = $manifest['src/main.js'] ?? null;
$cssFile = $manifest['style.css']['file'] ?? null;
$jsFile = $mainEntry['file'] ?? null;

// Fallback: if v2 build is missing, redirect to legacy
if (!$jsFile) {
  $css = __DIR__ . '/assets/css/app-lite.css';
  $js  = __DIR__ . '/assets/js/app-lite.js';
  $css_v = is_file($css) ? (int)@filemtime($css) : time();
  $js_v  = is_file($js)  ? (int)@filemtime($js)  : time();
  // Serve legacy inline (backwards compatible)
  include __DIR__ . '/legacy-app.php';
  exit;
}

$productName = site_setting('site.brand', 'MEX Group');
$brandName = htmlspecialchars('MEX Group', ENT_QUOTES);
$brandTagline = htmlspecialchars(site_setting('site.tagline', 'Professional trading & investment platform'), ENT_QUOTES);
$supportEmail = json_encode(site_setting('site.support_email', 'support@mexgroup.com'), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
?>
<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="<?php echo $brandName; ?> - Professional multi-market trading platform" />
  <meta name="theme-color" content="#060A14" />
  <meta name="color-scheme" content="dark" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title><?php echo $brandName; ?> - Trading Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <?php if ($cssFile): ?>
  <link rel="stylesheet" href="./assets/dist/<?php echo $cssFile; ?>" />
  <?php endif; ?>
  <style>
    body{margin:0;background:#060A14;color:#e8f0ff;font-family:Inter,system-ui,sans-serif}
    .boot-screen{min-height:100vh;display:grid;place-items:center}
    .boot-mark{width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,#5d7cff,#24d28d);display:grid;place-items:center;color:#fff;font-weight:900;font-size:20px;animation:pulse 1.5s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(.95)}}
  </style>
</head>
<body>
  <div id="app">
    <div class="boot-screen">
      <div style="text-align:center">
        <div class="boot-mark" style="margin:0 auto 16px">M</div>
        <strong style="font-size:14px"><?php echo $brandName; ?></strong>
        <p style="color:rgba(200,220,255,0.5);font-size:12px;margin-top:6px">Loading workspace...</p>
      </div>
    </div>
  </div>
  <script>
    window.__BRAND_NAME = <?php echo json_encode('MEX Group', JSON_UNESCAPED_UNICODE); ?>;
    window.__BRAND_PRODUCT = <?php echo json_encode($productName, JSON_UNESCAPED_UNICODE); ?>;
    window.__BRAND_TAGLINE = <?php echo json_encode(site_setting('site.tagline', 'Professional trading & investment platform'), JSON_UNESCAPED_UNICODE); ?>;
    window.__SUPPORT_EMAIL = <?php echo $supportEmail; ?>;
  </script>
  <?php if ($jsFile): ?>
  <script type="module" src="./assets/dist/<?php echo $jsFile; ?>"></script>
  <?php endif; ?>
</body>
</html>
