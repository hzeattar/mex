<?php
declare(strict_types=1);

require_once __DIR__ . '/site_bootstrap.php';
require_once __DIR__ . '/api/auth/_common.php';

function mex_auth_h(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function mex_auth_lang(): string {
  $lang = strtolower(substr((string)($_REQUEST['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'), 0, 2));
  if (!in_array($lang, ['en', 'ar'], true)) $lang = 'en';
  setcookie('vp_lang', $lang, [
    'expires' => time() + 31536000,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  return $lang;
}

function mex_login_copy(string $lang): array {
  $en = [
    'title' => 'Log in',
    'page_title' => 'Log in to MEX Group',
    'eyebrow' => 'MEX Group client portal',
    'headline' => 'Access your MEX Group trading workspace.',
    'subtitle' => 'Manage markets, funding, KYC, copy trading, contracts, and portfolio activity from one secure dashboard.',
    'email' => 'Email address',
    'password' => 'Password',
    'email_placeholder' => 'name@example.com',
    'password_placeholder' => 'Enter your password',
    'submit' => 'Continue to dashboard',
    'signup' => 'Create account',
    'signup_note' => 'New to MEX Group?',
    'home' => 'Home',
    'lang_switch' => 'العربية',
    'invalid' => 'Invalid email or password.',
    'inactive' => 'Your account is not active. Please contact support.',
    'service_error' => 'Service reconnecting, please retry in a moment.',
    'guest' => 'Explore public site',
    'telegram' => 'Continue with Telegram',
    'telegram_loading' => 'Connecting your Telegram account...',
    'telegram_ready' => 'Telegram login is connected to the same secure account workflow.',
    'telegram_disabled' => 'Telegram login is ready in the code, but the bot username is not configured yet.',
    'metric_one' => 'Live quotes',
    'metric_two' => 'Manual funding',
    'metric_three' => 'Copy desk',
    'security' => 'Protected session',
    'support' => 'Support',
  ];
  if ($lang !== 'ar') return $en;
  return [
    'title' => 'تسجيل الدخول',
    'page_title' => 'تسجيل الدخول إلى MEX Group',
    'eyebrow' => 'بوابة عملاء MEX Group',
    'headline' => 'ادخل إلى مساحة تداول MEX Group.',
    'subtitle' => 'تحكم في الأسواق والتمويل والتحقق ونسخ الصفقات والعقود والمحفظة من لوحة واحدة آمنة.',
    'email' => 'البريد الإلكتروني',
    'password' => 'كلمة المرور',
    'email_placeholder' => 'name@example.com',
    'password_placeholder' => 'اكتب كلمة المرور',
    'submit' => 'الدخول إلى اللوحة',
    'signup' => 'إنشاء حساب',
    'signup_note' => 'ليس لديك حساب؟',
    'home' => 'الرئيسية',
    'lang_switch' => 'English',
    'invalid' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'inactive' => 'حسابك غير نشط. تواصل مع الدعم.',
    'service_error' => 'الخدمة تعيد الاتصال الآن، حاول مرة أخرى بعد لحظات.',
    'guest' => 'تصفح الموقع',
    'telegram' => 'المتابعة عبر Telegram',
    'telegram_loading' => 'جاري ربط حساب Telegram...',
    'telegram_ready' => 'تسجيل Telegram مرتبط بنفس مسار الحساب الآمن.',
    'telegram_disabled' => 'تسجيل Telegram جاهز في الكود، لكن اسم البوت غير مضبوط بعد.',
    'metric_one' => 'أسعار مباشرة',
    'metric_two' => 'تمويل يدوي',
    'metric_three' => 'نسخ صفقات',
    'security' => 'جلسة محمية',
    'support' => 'الدعم',
  ];
}

$lang = mex_auth_lang();
$isRtl = $lang === 'ar';
$copy = mex_login_copy($lang);
$next = safe_public_redirect_target((string)($_REQUEST['next'] ?? ''), '/app.php#/home');
$_login_uid = 0;
try { $_login_uid = session_user_id(); } catch (Throwable $e) { $_login_uid = 0; }
if ($_login_uid > 0) { header('Location: ' . $next); exit; }

$s = site_defaults();
$tgBot = telegram_login_bot_username();
$supportEmail = (string)($s['support_email'] ?? 'support@mexgroup.com');
$error = '';
$serviceIssue = false;
$postedEmail = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $postedEmail = strtolower(trim((string)($_POST['email'] ?? '')));
  $password = (string)($_POST['password'] ?? '');
  if (!filter_var($postedEmail, FILTER_VALIDATE_EMAIL) || $password === '') {
    $error = $copy['invalid'];
  } else {
    try {
      $pdo = auth_bootstrap_schema();
      $st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
      $st->execute([$postedEmail]);
      $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      if (!$row || empty($row['password_hash']) || !password_verify($password, (string)$row['password_hash'])) {
        $error = $copy['invalid'];
      } elseif (strtolower((string)($row['account_status'] ?? 'active')) !== 'active') {
        $error = $copy['inactive'];
      } else {
        $pdo->prepare('UPDATE users SET last_login_at=?, updated_at=?, login_provider=? WHERE id=?')->execute([now_ts(), now_ts(), 'web', (int)$row['id']]);
        auth_ensure_wallets((int)$row['id']);
        auth_ensure_trading_accounts((int)$row['id']);
        auth_sync_identity($pdo, (int)$row['id'], 'email', strtolower($postedEmail), null, strtolower($postedEmail), ['source' => 'web']);
        set_session_user_id((int)$row['id']);
        header('Location: ' . safe_public_redirect_target((string)($_POST['next'] ?? $next), '/app.php#/home'));
        exit;
      }
    } catch (Throwable $e) {
      error_log('MEX login database unavailable: ' . $e->getMessage());
      $error = $copy['service_error'];
      $serviceIssue = true;
    }
  }
}

$langSwitch = $lang === 'ar' ? 'en' : 'ar';
$nextAttr = mex_auth_h($next);
$loginUrl = '/login.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
$registerUrl = '/register.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
$langUrl = '/login.php?lang=' . rawurlencode($langSwitch) . '&next=' . rawurlencode($next);
?>
<!doctype html>
<html lang="<?php echo mex_auth_h($lang); ?>" dir="<?php echo $isRtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050a16">
  <title><?php echo mex_auth_h($copy['page_title']); ?></title>
  <link rel="dns-prefetch" href="//telegram.org">
  <link rel="preconnect" href="https://telegram.org" crossorigin>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="mex-auth-page<?php echo $isRtl ? ' is-rtl' : ''; ?>">
  <header class="mex-auth-top">
    <a class="mex-auth-brand" href="/">
      <img src="/assets/img/mexgroup_logo.svg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="mex-logo-fallback" style="display:none">MX</span><span><strong>MEX Group</strong><small>Trading Platform</small></span>
    </a>
    <nav class="mex-auth-links" aria-label="Account links">
      <a href="/" class="mex-auth-top-link"><?php echo mex_auth_h($copy['home']); ?></a>
      <a href="<?php echo mex_auth_h($registerUrl); ?>" class="mex-auth-top-link"><?php echo mex_auth_h($copy['signup']); ?></a>
      <div class="mex-lang-wrap" style="margin-left:8px">
        <button class="mex-lang-btn" id="mex-lang-trigger" style="padding:2px 8px;min-height:28px">
          <span class="mex-lang-current"><?php echo strtoupper(mex_auth_h($lang==='ar'?'العربية':'English')); ?></span>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <div class="mex-lang-dropdown" id="mex-lang-dropdown" role="listbox" style="right:0;left:auto">
          <?php foreach(['en'=>'English','ar'=>'العربية'] as $c=>$n):
            $isActive = $c===$lang;
            $url = '/login.php?lang=' . rawurlencode($c) . '&next=' . rawurlencode($next);
          ?>
          <a class="mex-lang-opt<?php echo $isActive ? ' is-active' : ''; ?>" href="<?php echo mex_auth_h($url); ?>"><?php echo mex_auth_h($n); ?></a>
          <?php endforeach; ?>
        </div>
      </div>
    </nav>
  </header>

  <main class="mex-auth-shell">
    <section class="mex-auth-hero" aria-label="MEX Group overview">
      <div class="mex-auth-kicker"><?php echo mex_auth_h($copy['eyebrow']); ?></div>
      <h1><?php echo mex_auth_h($copy['headline']); ?></h1>
      <p><?php echo mex_auth_h($copy['subtitle']); ?></p>
      <div class="mex-auth-market-grid">
        <div><span>BTCUSDT</span><strong>$80,900</strong><em>+2.40%</em></div>
        <div><span>EURUSD</span><strong>1.1702</strong><em class="down">-0.11%</em></div>
        <div><span>XAUUSD</span><strong>$4,713</strong><em>Live</em></div>
      </div>
      <div class="mex-auth-proof">
        <span><?php echo mex_auth_h($copy['metric_one']); ?></span>
        <span><?php echo mex_auth_h($copy['metric_two']); ?></span>
        <span><?php echo mex_auth_h($copy['metric_three']); ?></span>
      </div>
    </section>

    <section class="mex-auth-card" aria-labelledby="login-title">
      <div class="mex-auth-card-head">
        <span><?php echo mex_auth_h($copy['security']); ?></span>
        <a href="mailto:<?php echo mex_auth_h($supportEmail); ?>"><?php echo mex_auth_h($copy['support']); ?></a>
      </div>
      <h2 id="login-title"><?php echo mex_auth_h($copy['title']); ?></h2>
      <?php if ($error !== ''): ?>
        <div class="mex-auth-alert<?php echo $serviceIssue ? ' is-service' : ''; ?>"><?php echo mex_auth_h($error); ?></div>
      <?php endif; ?>

      <form class="mex-auth-form" method="post" action="<?php echo mex_auth_h($loginUrl); ?>">
        <input type="hidden" name="next" value="<?php echo $nextAttr; ?>">
        <label>
          <span><?php echo mex_auth_h($copy['email']); ?></span>
          <input type="email" name="email" value="<?php echo mex_auth_h($postedEmail); ?>" placeholder="<?php echo mex_auth_h($copy['email_placeholder']); ?>" autocomplete="email" required>
        </label>
        <label>
          <span><?php echo mex_auth_h($copy['password']); ?></span>
          <input type="password" name="password" placeholder="<?php echo mex_auth_h($copy['password_placeholder']); ?>" autocomplete="current-password" required>
        </label>
        <button class="mex-auth-submit" type="submit"><?php echo mex_auth_h($copy['submit']); ?></button>
      </form>

      <div class="mex-auth-secondary">
        <span><?php echo mex_auth_h($copy['signup_note']); ?></span>
        <a href="<?php echo mex_auth_h($registerUrl); ?>"><?php echo mex_auth_h($copy['signup']); ?></a>
      </div>
      <a class="mex-auth-ghost" href="/"><?php echo mex_auth_h($copy['guest']); ?></a>

      <div class="mex-auth-divider"><span><?php echo mex_auth_h($copy['telegram']); ?></span></div>
      <div class="mex-telegram-box" id="telegram-login">
        <?php if ($tgBot !== ''): ?>
          <div id="tg-widget-wrap"></div>
          <div class="telegram-spinner" id="tg-spinner"><?php echo mex_auth_h($copy['telegram_loading']); ?></div>
          <p><?php echo mex_auth_h($copy['telegram_ready']); ?></p>
        <?php else: ?>
          <p><?php echo mex_auth_h($copy['telegram_disabled']); ?></p>
        <?php endif; ?>
      </div>
    </section>
  </main>

<?php if ($tgBot !== ''): ?>
<script>
  const VP_NEXT = <?php echo json_encode($next, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
  function vpTelegramAuth(user){
    const spinner = document.getElementById('tg-spinner');
    if (spinner) spinner.classList.add('show');
    fetch('/api/auth/telegram_login.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(user || {})
    }).then(r => r.json()).then(data => {
      if (!data || !data.ok) throw new Error((data && data.error) || 'Telegram login failed');
      window.location.replace(VP_NEXT || '/app.php#/home');
    }).catch(err => {
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
    s.setAttribute('data-telegram-login', <?php echo json_encode($tgBot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '14');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-onauth', 'vpTelegramAuth(user)');
    wrap.appendChild(s);
  })();
  // Lang dropdown
  (function(){
    var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
    if(!lb||!ld)return;
    lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});
    document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});
  })();
</script>
<?php else: ?>
<script>
  (function(){
    var lb=document.getElementById('mex-lang-trigger'),ld=document.getElementById('mex-lang-dropdown');
    if(!lb||!ld)return;
    lb.addEventListener('click',function(e){e.stopPropagation();var o=lb.getAttribute('aria-expanded')==='true';lb.setAttribute('aria-expanded',o?'false':'true');ld.classList.toggle('is-open',!o);});
    document.addEventListener('click',function(){lb.setAttribute('aria-expanded','false');ld.classList.remove('is-open');});
  })();
</script>
<?php endif; ?>
</body>
</html>
