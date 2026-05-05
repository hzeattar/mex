<?php
DECLARE(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
require_once __DIR__ . '/api/auth/_common.php';
if (session_user_id() > 0) { header('Location: /'); exit; }
$s = site_defaults();
$tgBot = telegram_login_bot_username();
$error = '';
$next = safe_public_redirect_target((string)($_REQUEST['next'] ?? ''), '/app.php#/home');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $pdo = auth_bootstrap_schema();
  $email = strtolower(trim((string)($_POST['email'] ?? '')));
  $password = (string)($_POST['password'] ?? '');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    $error = 'Invalid email or password.';
  } else {
    $st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if (!$row || empty($row['password_hash']) || !password_verify($password, (string)$row['password_hash'])) {
      $error = 'Invalid email or password.';
    } elseif (strtolower((string)($row['account_status'] ?? 'active')) !== 'active') {
      $error = 'Your account is not active.';
    } else {
      $pdo->prepare('UPDATE users SET last_login_at=?, updated_at=?, login_provider=? WHERE id=?')->execute([now_ts(), now_ts(), 'web', (int)$row['id']]);
      auth_ensure_wallets((int)$row['id']);
      auth_ensure_trading_accounts((int)$row['id']);
      auth_sync_identity($pdo, (int)$row['id'], 'email', strtolower($email), null, strtolower($email), ['source'=>'web']);
      set_session_user_id((int)$row['id']);
      header('Location: ' . safe_public_redirect_target((string)($_POST['next'] ?? $next), '/app.php#/home'));
      exit;
    }
  }
}
$brand = htmlspecialchars($s['brand'], ENT_QUOTES);
$heroTitle = htmlspecialchars($s['hero_title'], ENT_QUOTES);
$supportEmail = htmlspecialchars($s['support_email'], ENT_QUOTES);
$nextAttr = htmlspecialchars($next, ENT_QUOTES);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050a16">
  <title>Log In • <?php echo $brand; ?></title>
  <link rel="dns-prefetch" href="//telegram.org">
  <link rel="preconnect" href="https://telegram.org" crossorigin>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="auth-page auth-page-ref">
  <div class="utility-bar">
    <div class="container utility-inner">
      <div class="utility-left"><span>AE 800703040</span><a href="/">Home</a></div>
      <div class="utility-right"><a href="mailto:<?php echo $supportEmail; ?>"><?php echo $supportEmail; ?></a><a href="/register.php?next=<?php echo rawurlencode($next); ?>">Sign Up</a></div>
    </div>
  </div>

  <header class="site-header site-header-landing auth-topbar">
    <div class="container site-header-inner landing-header-grid">
      <a class="site-brand landing-brand" href="/">
        <span class="site-brand-mark"><?php echo $brand; ?></span>
        <span class="site-brand-sep">PART OF</span>
        <span class="site-brand-main">Trading Platform</span>
      </a>
      <div class="site-actions site-actions-landing auth-header-actions">
        <a class="btn primary" href="/register.php?next=<?php echo rawurlencode($next); ?>">Sign Up</a>
        <a class="btn outline" href="/login.php<?php echo $next !== '/app.php#/home' ? ('?next=' . rawurlencode($next)) : ''; ?>">Log In</a>
      </div>
    </div>
  </header>

  <main class="auth-stage auth-stage-ref">
    <div class="container auth-shell auth-shell-ref">
      <section class="auth-left auth-left-ref">
        <h1 class="auth-title auth-title-ref">Log In</h1>
        <p class="auth-sub auth-sub-ref">Access your client area, funding requests, KYC status, portfolio, and trading screens from one web-first dashboard.</p>
        <?php if ($error): ?><div class="error-box"><?php echo htmlspecialchars($error, ENT_QUOTES); ?></div><?php endif; ?>

        <form class="auth-form" method="post">
          <input type="hidden" name="next" value="<?php echo $nextAttr; ?>">
          <div class="form-group"><label>Email address*</label><input type="email" name="email" placeholder="Email address" required></div>
          <div class="form-group"><label>Password*</label><input type="password" name="password" placeholder="Password" required></div>
          <div class="auth-inline-links"><a href="/register.php?next=<?php echo rawurlencode($next); ?>">Don’t have an account? Sign up now</a><a href="/">Continue as a guest</a></div>
          <button class="btn primary" type="submit" style="width:100%">Continue to Client Area</button>
        </form>

        <div class="auth-divider">or continue</div>
        <div class="telegram-auth-box" id="telegram-login">
          <?php if ($tgBot !== ''): ?>
            <div id="tg-widget-wrap"></div>
            <div class="telegram-spinner" id="tg-spinner">Connecting your Telegram account…</div>
            <div class="telegram-auth-note">Telegram login is enabled for this build. Your Telegram identity is linked to the same web account workflow and lands inside the client area.</div>
          <?php else: ?>
            <div class="telegram-auth-disabled">Telegram login is ready in the code, but the bot username is not configured yet in settings or environment.</div>
          <?php endif; ?>
        </div>
      </section>

      <aside class="auth-right auth-right-ref">
        <div class="auth-right-inner">
          <h2><?php echo $heroTitle; ?></h2>
          <p>One account, multiple channels. Sign in from the web, continue with Telegram if you want, and move straight into the redesigned client dashboard.</p>
          <div class="auth-badges"><div class="auth-badge">＋</div><div class="auth-badge">₿</div></div>
          <div class="auth-dots"><span class="active"></span><span></span><span></span><span></span></div>
        </div>
      </aside>
    </div>
  </main>

<?php if ($tgBot !== ''): ?>
<script>
  const VP_NEXT = <?php echo json_encode($next, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE); ?>;
  function vpTelegramAuth(user){
    const spinner = document.getElementById('tg-spinner');
    if (spinner) spinner.classList.add('show');
    fetch('/api/auth/telegram_login.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(user || {})
    }).then(r=>r.json()).then(data=>{
      if (!data || !data.ok) throw new Error((data && data.error) || 'Telegram login failed');
      window.location.replace(VP_NEXT || '/app.php#/home');
    }).catch(err=>{
      alert(err && err.message ? err.message : 'Telegram login failed');
      if (spinner) spinner.classList.remove('show');
    });
  }
  (function(){
    const wrap = document.getElementById('tg-widget-wrap');
    if (!wrap) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.setAttribute('data-telegram-login', <?php echo json_encode($tgBot, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE); ?>);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '14');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-onauth', 'vpTelegramAuth(user)');
    wrap.appendChild(s);
  })();
</script>
<?php endif; ?>
</body>
</html>
