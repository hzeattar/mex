<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
$_v2_uid = 0;
try { $_v2_uid = session_user_id(); } catch (Throwable $e) { $_v2_uid = 0; }
if ($_v2_uid <= 0) {
  $next = rawurlencode('/app-v2.php#/home');
  header('Location: /login.php?next=' . $next);
  exit;
}
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Load Vite manifest
$manifestPath = __DIR__ . '/assets/dist/.vite/manifest.json';
$manifest = [];
if (is_file($manifestPath)) {
  $manifest = json_decode(file_get_contents($manifestPath), true) ?: [];
}

$mainEntry = $manifest['src/main.js'] ?? null;
$cssFile = $manifest['style.css']['file'] ?? null;
$jsFile = $mainEntry['file'] ?? null;

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
    body { margin: 0; background: #060A14; color: #e8f0ff; font-family: Inter, system-ui, sans-serif; }
    .boot-screen { min-height: 100vh; display: grid; place-items: center; }
    .boot-mark { position: relative; width: 132px; height: 38px; border-radius: 7px; overflow: hidden; background: #000; box-shadow: 0 0 0 1px rgba(128,160,220,.14), 0 20px 55px rgba(0,0,0,.32); animation: bootFloat 1.65s ease-in-out infinite; }
    .boot-mark img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
    .boot-mark:after { content: ''; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 0%, transparent 35%, rgba(255,255,255,.34) 48%, transparent 62%, transparent 100%); transform: translateX(-115%); animation: bootSweep 1.25s ease-in-out infinite; }
    @keyframes bootFloat { 0%,100% { opacity: .96; transform: translateY(0) scale(1); } 50% { opacity: 1; transform: translateY(-3px) scale(.985); } }
    @keyframes bootSweep { 0% { transform: translateX(-115%); } 62%,100% { transform: translateX(115%); } }
  </style>
</head>
<body>
  <div id="app">
    <div class="boot-screen">
      <div style="text-align:center">
        <div class="boot-mark" style="margin:0 auto 16px"><img src="/assets/img/mex_global_logo.png" alt="MEX Global"></div>
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
