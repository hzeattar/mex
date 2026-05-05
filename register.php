<?php
declare(strict_types=1);
require_once __DIR__ . '/site_bootstrap.php';
require_once __DIR__ . '/api/auth/_common.php';
if (session_user_id() > 0) { header('Location: /'); exit; }
$s = site_defaults();
$tgBot = telegram_login_bot_username();
$error = '';
$next = safe_public_redirect_target((string)($_REQUEST['next'] ?? ''), '/app.php#/home');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $pdo = auth_bootstrap_schema();
  $first = trim((string)($_POST['first_name'] ?? ''));
  $last = trim((string)($_POST['last_name'] ?? ''));
  $country = trim((string)($_POST['country'] ?? ''));
  $email = strtolower(trim((string)($_POST['email'] ?? '')));
  $password = (string)($_POST['password'] ?? '');
  if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
    $error = 'Please enter valid registration data.';
  } else {
    $st = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
    $st->execute([$email]);
    if ($st->fetchColumn()) {
      $error = 'This email is already registered.';
    } else {
      $now = now_ts();
      $hash = password_hash($password, PASSWORD_BCRYPT);
      $display = trim($first . ' ' . $last);
      $ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      $ins->execute([$email,$hash,$first,$last,$display,'en','active','web',$now,$now,$now]);
      $uid = (int)$pdo->lastInsertId();
      auth_ensure_wallets($uid);
      auth_ensure_trading_accounts($uid);
      auth_sync_identity($pdo, $uid, 'email', strtolower($email), null, strtolower($email), ['source'=>'web','country'=>$country]);
      set_session_user_id($uid);
      header('Location: ' . safe_public_redirect_target((string)($_POST['next'] ?? $next), '/app.php#/home'));
      exit;
    }
  }
}
$countries = [
  'United Arab Emirates','Saudi Arabia','Egypt','Qatar','Kuwait','Bahrain','Jordan','Oman','Turkey','United Kingdom'
];
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
  <title>Sign Up • <?php echo $brand; ?></title>
  <link rel="dns-prefetch" href="//telegram.org">
  <link rel="preconnect" href="https://telegram.org" crossorigin>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__.'/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="auth-page auth-page-ref">
  <div class="utility-bar">
    <div class="container utility-inner">
      <div class="utility-left"><span>AE 800703040</span><a href="/">Home</a></div>
      <div class="utility-right"><a href="mailto:<?php echo $supportEmail; ?>"><?php echo $supportEmail; ?></a><a href="/login.php?next=<?php echo rawurlencode($next); ?>">Log In</a></div>
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
        <a class="btn primary" href="/register.php<?php echo $next !== '/app.php#/home' ? ('?next=' . rawurlencode($next)) : ''; ?>">Sign Up</a>
        <a class="btn outline" href="/login.php?next=<?php echo rawurlencode($next); ?>">Log In</a>
      </div>
    </div>
  </header>

  <main class="auth-stage auth-stage-ref">
    <div class="container auth-shell auth-shell-ref auth-shell-wide">
      <section class="auth-left auth-left-ref">
        <h1 class="auth-title auth-title-ref">Quick &amp; Easy Registration</h1>
        <p class="auth-sub auth-sub-ref">Create your account, continue through KYC and funding, and move into the live client area without leaving the website.</p>
        <?php if ($error): ?><div class="error-box"><?php echo htmlspecialchars($error, ENT_QUOTES); ?></div><?php endif; ?>

        <form class="auth-form" method="post">
          <input type="hidden" name="next" value="<?php echo $nextAttr; ?>">
          <div class="form-grid">
            <div class="form-group"><label>First name*</label><input type="text" name="first_name" placeholder="First name" required></div>
            <div class="form-group"><label>Last name*</label><input type="text" name="last_name" placeholder="Last name" required></div>
            <div class="form-group full"><label>Country of Residence*</label><select name="country" required><option value="" disabled selected>Select country</option><?php foreach ($countries as $c): ?><option value="<?php echo htmlspecialchars($c, ENT_QUOTES); ?>"><?php echo htmlspecialchars($c, ENT_QUOTES); ?></option><?php endforeach; ?></select></div>
            <div class="form-group full"><label>Email address*</label><input type="email" name="email" placeholder="Email address" required></div>
            <div class="form-group full"><label>Password*</label><input type="password" name="password" placeholder="Password" minlength="6" required></div>
          </div>
          <div class="form-note">By clicking Continue, I confirm that I have read, understood, and agree to the client agreement and risk disclosures, and that real funding requests will stay inside the live web dashboard flow.</div>
          <button class="btn primary" type="submit" style="width:100%">Continue to Client Area</button>
        </form>

        <div class="auth-divider">or use Telegram</div>
        <div class="telegram-auth-box" id="telegram-login">
          <?php if ($tgBot !== ''): ?>
            <div id="tg-widget-wrap"></div>
            <div class="telegram-spinner" id="tg-spinner">Connecting your Telegram account…</div>
            <div class="telegram-auth-note">Telegram sign-up and sign-in are both supported. New Telegram users are created automatically with a live wallet and a seeded demo wallet.</div>
          <?php else: ?>
            <div class="telegram-auth-disabled">Telegram login is ready in the code, but the bot username is not configured yet in settings or environment.</div>
          <?php endif; ?>
        </div>

        <div class="auth-links"><span>Already have an account? <a href="/login.php?next=<?php echo rawurlencode($next); ?>">Log in</a></span><a href="/">Back to landing page</a></div>
      </section>

      <aside class="auth-right auth-right-ref">
        <div class="auth-right-inner">
          <h2><?php echo $heroTitle; ?></h2>
          <p>Open your account from the web, sign in with Telegram if you prefer, and manage markets, funding, portfolio, and verification in one place.</p>
          <div class="auth-badges"><div class="auth-badge">📈</div><div class="auth-badge">💼</div></div>
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
      if (!data || !data.ok) throw new Error((data && data.error) || 'Telegram sign-up failed');
      window.location.replace(VP_NEXT || '/app.php#/home');
    }).catch(err=>{
      alert(err && err.message ? err.message : 'Telegram sign-up failed');
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
