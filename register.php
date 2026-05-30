<?php
declare(strict_types=1);

require_once __DIR__ . '/site_bootstrap.php';
require_once __DIR__ . '/api/auth/_common.php';

function mex_reg_h(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function mex_reg_lang(): string {
  $lang = strtolower(substr((string)($_REQUEST['lang'] ?? $_COOKIE['vp_lang'] ?? 'en'), 0, 2));
  if (!in_array($lang, ['en', 'ar'], true)) $lang = 'en';
  setcookie('vp_lang', $lang, [
    'expires' => time() + 31536000,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => false,
    'samesite' => 'Lax',
  ]);
  return $lang;
}

function mex_register_copy(string $lang): array {
  $en = [
    'title' => 'Create account',
    'page_title' => 'Create your MEX Group account',
    'eyebrow' => 'MEX Group onboarding',
    'headline' => 'Open your VertexPluse trading workspace.',
    'subtitle' => 'Start with a demo balance, complete KYC, fund manually or by card, then use internal real trading, copy signals, and contracts.',
    'first' => 'First name',
    'last' => 'Last name',
    'country' => 'Country of residence',
    'select_country' => 'Select country',
    'email' => 'Email address',
    'password' => 'Password',
    'submit' => 'Create secure account',
    'login' => 'Log in',
    'login_note' => 'Already registered?',
    'home' => 'Home',
    'lang_switch' => 'العربية',
    'invalid' => 'Please enter valid registration data.',
    'exists' => 'This email is already registered.',
    'service_error' => 'Service reconnecting, please retry in a moment.',
    'risk' => 'By continuing, you agree to the client agreement and risk disclosures. Real trading remains internal until external execution is enabled.',
    'telegram' => 'Use Telegram',
    'telegram_loading' => 'Connecting your Telegram account...',
    'telegram_ready' => 'Telegram sign-up and sign-in are both supported.',
    'telegram_disabled' => 'Telegram login is ready in the code, but the bot username is not configured yet.',
    'step_one' => 'Demo workspace',
    'step_two' => 'KYC approval',
    'step_three' => 'Real funding',
    'support' => 'Support',
  ];
  if ($lang !== 'ar') return $en;
  return [
    'title' => 'إنشاء حساب',
    'page_title' => 'إنشاء حساب MEX Group',
    'eyebrow' => 'بدء استخدام MEX Group',
    'headline' => 'افتح مساحة تداول VertexPluse.',
    'subtitle' => 'ابدأ برصيد تجريبي، أكمل التحقق، موّل الحساب يدويًا أو بالبطاقة، ثم استخدم التداول الداخلي ونسخ الصفقات والعقود.',
    'first' => 'الاسم الأول',
    'last' => 'اسم العائلة',
    'country' => 'دولة الإقامة',
    'select_country' => 'اختر الدولة',
    'email' => 'البريد الإلكتروني',
    'password' => 'كلمة المرور',
    'submit' => 'إنشاء الحساب',
    'login' => 'تسجيل الدخول',
    'login_note' => 'لديك حساب بالفعل؟',
    'home' => 'الرئيسية',
    'lang_switch' => 'English',
    'invalid' => 'من فضلك أدخل بيانات تسجيل صحيحة.',
    'exists' => 'هذا البريد مسجل بالفعل.',
    'service_error' => 'الخدمة تعيد الاتصال الآن، حاول مرة أخرى بعد لحظات.',
    'risk' => 'بالمتابعة، أنت توافق على اتفاقية العميل وإفصاحات المخاطر. التداول الحقيقي يظل داخليًا حتى يتم تفعيل التنفيذ الخارجي.',
    'telegram' => 'استخدام Telegram',
    'telegram_loading' => 'جاري ربط حساب Telegram...',
    'telegram_ready' => 'التسجيل والدخول عبر Telegram مدعومان.',
    'telegram_disabled' => 'تسجيل Telegram جاهز في الكود، لكن اسم البوت غير مضبوط بعد.',
    'step_one' => 'مساحة تجريبية',
    'step_two' => 'تحقق KYC',
    'step_three' => 'تمويل حقيقي',
    'support' => 'الدعم',
  ];
}

$lang = mex_reg_lang();
$isRtl = $lang === 'ar';
$copy = mex_register_copy($lang);
$next = safe_public_redirect_target((string)($_REQUEST['next'] ?? ''), '/app.php#/home');
if (session_user_id() > 0) { header('Location: ' . $next); exit; }

$s = site_defaults();
$tgBot = telegram_login_bot_username();
$supportEmail = (string)($s['support_email'] ?? 'support@mexgroup.com');
$countries = [
  'United Arab Emirates', 'Saudi Arabia', 'Egypt', 'Qatar', 'Kuwait', 'Bahrain',
  'Jordan', 'Oman', 'Turkey', 'United Kingdom', 'United States', 'Germany', 'France',
];
$error = '';
$serviceIssue = false;
$values = [
  'first_name' => '',
  'last_name' => '',
  'country' => '',
  'email' => '',
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $values['first_name'] = trim((string)($_POST['first_name'] ?? ''));
  $values['last_name'] = trim((string)($_POST['last_name'] ?? ''));
  $values['country'] = trim((string)($_POST['country'] ?? ''));
  $values['email'] = strtolower(trim((string)($_POST['email'] ?? '')));
  $password = (string)($_POST['password'] ?? '');

  if ($values['first_name'] === '' || $values['last_name'] === '' || !filter_var($values['email'], FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
    $error = $copy['invalid'];
  } else {
    try {
      $pdo = auth_bootstrap_schema();
      $st = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
      $st->execute([$values['email']]);
      if ($st->fetchColumn()) {
        $error = $copy['exists'];
      } else {
        $now = now_ts();
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $display = trim($values['first_name'] . ' ' . $values['last_name']);
        $ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $ins->execute([$values['email'], $hash, $values['first_name'], $values['last_name'], $display, $lang, 'active', 'web', $now, $now, $now]);
        $uid = (int)$pdo->lastInsertId();
        auth_ensure_wallets($uid);
        auth_ensure_trading_accounts($uid);
        auth_sync_identity($pdo, $uid, 'email', strtolower($values['email']), null, strtolower($values['email']), ['source' => 'web', 'country' => $values['country']]);
        set_session_user_id($uid);
        header('Location: ' . safe_public_redirect_target((string)($_POST['next'] ?? $next), '/app.php#/home'));
        exit;
      }
    } catch (Throwable $e) {
      error_log('MEX register database unavailable: ' . $e->getMessage());
      $error = $copy['service_error'];
      $serviceIssue = true;
    }
  }
}

$langSwitch = $lang === 'ar' ? 'en' : 'ar';
$nextAttr = mex_reg_h($next);
$registerUrl = '/register.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
$loginUrl = '/login.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
$langUrl = '/register.php?lang=' . rawurlencode($langSwitch) . '&next=' . rawurlencode($next);
?>
<!doctype html>
<html lang="<?php echo mex_reg_h($lang); ?>" dir="<?php echo $isRtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050a16">
  <title><?php echo mex_reg_h($copy['page_title']); ?></title>
  <link rel="dns-prefetch" href="//telegram.org">
  <link rel="preconnect" href="https://telegram.org" crossorigin>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/public-site.css') ?: time(); ?>">
</head>
<body class="mex-auth-page mex-auth-page-register<?php echo $isRtl ? ' is-rtl' : ''; ?>">
  <header class="mex-auth-top">
    <a class="mex-auth-brand" href="/">
      <img src="/assets/img/mexgroup_logo.svg" alt="MEX Group">
      <span><strong>MEX Group</strong><small>VertexPluse onboarding</small></span>
    </a>
    <nav class="mex-auth-links" aria-label="Account links">
      <a href="/"><?php echo mex_reg_h($copy['home']); ?></a>
      <a href="<?php echo mex_reg_h($loginUrl); ?>"><?php echo mex_reg_h($copy['login']); ?></a>
      <a href="<?php echo mex_reg_h($langUrl); ?>"><?php echo mex_reg_h($copy['lang_switch']); ?></a>
    </nav>
  </header>

  <main class="mex-auth-shell">
    <section class="mex-auth-hero" aria-label="MEX Group onboarding">
      <div class="mex-auth-kicker"><?php echo mex_reg_h($copy['eyebrow']); ?></div>
      <h1><?php echo mex_reg_h($copy['headline']); ?></h1>
      <p><?php echo mex_reg_h($copy['subtitle']); ?></p>
      <div class="mex-auth-steps">
        <div><strong>01</strong><span><?php echo mex_reg_h($copy['step_one']); ?></span></div>
        <div><strong>02</strong><span><?php echo mex_reg_h($copy['step_two']); ?></span></div>
        <div><strong>03</strong><span><?php echo mex_reg_h($copy['step_three']); ?></span></div>
      </div>
      <div class="mex-auth-proof">
        <span>Crypto</span>
        <span>Forex</span>
        <span>Stocks</span>
        <span>Contracts</span>
      </div>
    </section>

    <section class="mex-auth-card" aria-labelledby="register-title">
      <div class="mex-auth-card-head">
        <span>Secure registration</span>
        <a href="mailto:<?php echo mex_reg_h($supportEmail); ?>"><?php echo mex_reg_h($copy['support']); ?></a>
      </div>
      <h2 id="register-title"><?php echo mex_reg_h($copy['title']); ?></h2>
      <?php if ($error !== ''): ?>
        <div class="mex-auth-alert<?php echo $serviceIssue ? ' is-service' : ''; ?>"><?php echo mex_reg_h($error); ?></div>
      <?php endif; ?>

      <form class="mex-auth-form mex-auth-form-grid" method="post" action="<?php echo mex_reg_h($registerUrl); ?>">
        <input type="hidden" name="next" value="<?php echo $nextAttr; ?>">
        <label>
          <span><?php echo mex_reg_h($copy['first']); ?></span>
          <input type="text" name="first_name" value="<?php echo mex_reg_h($values['first_name']); ?>" autocomplete="given-name" required>
        </label>
        <label>
          <span><?php echo mex_reg_h($copy['last']); ?></span>
          <input type="text" name="last_name" value="<?php echo mex_reg_h($values['last_name']); ?>" autocomplete="family-name" required>
        </label>
        <label class="span-2">
          <span><?php echo mex_reg_h($copy['country']); ?></span>
          <select name="country" autocomplete="country-name" required>
            <option value="" disabled <?php echo $values['country'] === '' ? 'selected' : ''; ?>><?php echo mex_reg_h($copy['select_country']); ?></option>
            <?php foreach ($countries as $country): ?>
              <option value="<?php echo mex_reg_h($country); ?>" <?php echo $values['country'] === $country ? 'selected' : ''; ?>><?php echo mex_reg_h($country); ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="span-2">
          <span><?php echo mex_reg_h($copy['email']); ?></span>
          <input type="email" name="email" value="<?php echo mex_reg_h($values['email']); ?>" placeholder="name@example.com" autocomplete="email" required>
        </label>
        <label class="span-2">
          <span><?php echo mex_reg_h($copy['password']); ?></span>
          <input type="password" name="password" minlength="6" autocomplete="new-password" required>
        </label>
        <p class="mex-auth-risk span-2"><?php echo mex_reg_h($copy['risk']); ?></p>
        <button class="mex-auth-submit span-2" type="submit"><?php echo mex_reg_h($copy['submit']); ?></button>
      </form>

      <div class="mex-auth-secondary">
        <span><?php echo mex_reg_h($copy['login_note']); ?></span>
        <a href="<?php echo mex_reg_h($loginUrl); ?>"><?php echo mex_reg_h($copy['login']); ?></a>
      </div>

      <div class="mex-auth-divider"><span><?php echo mex_reg_h($copy['telegram']); ?></span></div>
      <div class="mex-telegram-box" id="telegram-login">
        <?php if ($tgBot !== ''): ?>
          <div id="tg-widget-wrap"></div>
          <div class="telegram-spinner" id="tg-spinner"><?php echo mex_reg_h($copy['telegram_loading']); ?></div>
          <p><?php echo mex_reg_h($copy['telegram_ready']); ?></p>
        <?php else: ?>
          <p><?php echo mex_reg_h($copy['telegram_disabled']); ?></p>
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
      if (!data || !data.ok) throw new Error((data && data.error) || 'Telegram sign-up failed');
      window.location.replace(VP_NEXT || '/app.php#/home');
    }).catch(err => {
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
    s.setAttribute('data-telegram-login', <?php echo json_encode($tgBot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>);
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
