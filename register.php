<?php
declare(strict_types=1);

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'POST') {
  $next = (string)($_GET['next'] ?? '/app.php#/home');
  $lang = strtolower((string)($_GET['lang'] ?? ($_COOKIE['vp_lang'] ?? 'en')));
  if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
  $rtl = ($lang === 'ar');
  $T = [
    'en' => ['title'=>'Create account','sub'=>'Start with a demo workspace, then verify to unlock live funding and trading.','first'=>'First name','last'=>'Last name','email'=>'Email','pass'=>'Password','langlbl'=>'Language','create'=>'Create account','back'=>'Back to site','login'=>'Log in','fail'=>'Registration failed.'],
    'ar' => ['title'=>'إنشاء حساب','sub'=>'ابدأ بحساب تجريبي، ثم وثّق حسابك لفتح الإيداع والتداول الحقيقي.','first'=>'الاسم الأول','last'=>'اسم العائلة','email'=>'البريد الإلكتروني','pass'=>'كلمة المرور','langlbl'=>'اللغة','create'=>'إنشاء حساب','back'=>'العودة إلى الموقع','login'=>'تسجيل الدخول','fail'=>'فشل إنشاء الحساب.'],
    'ru' => ['title'=>'Создать аккаунт','sub'=>'Начните с демо-счёта, затем подтвердите личность для пополнения и реальной торговли.','first'=>'Имя','last'=>'Фамилия','email'=>'Эл. почта','pass'=>'Пароль','langlbl'=>'Язык','create'=>'Создать аккаунт','back'=>'На сайт','login'=>'Войти','fail'=>'Не удалось создать аккаунт.'],
  ];
  $L = $T[$lang];
  $loginUrl = '/login.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
  header('Content-Type: text/html; charset=utf-8');
  ?>
<!doctype html>
<html lang="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>" dir="<?php echo $rtl ? 'rtl' : 'ltr'; ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8'); ?> — MEX Global</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo (int)(@filemtime(__DIR__ . '/assets/css/public-site.css') ?: time()); ?>">
  <style>
    body{min-height:100vh;margin:0;background:#050814;color:#eef5ff;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;padding:24px}
    .auth-card{width:min(460px,100%);border:1px solid rgba(128,160,220,.18);border-radius:14px;background:linear-gradient(180deg,#0b1730,#060c1a);box-shadow:0 24px 70px rgba(0,0,0,.38);padding:22px}
    .auth-logo{display:flex;align-items:center;justify-content:center;margin-bottom:18px}.auth-logo img{max-width:178px;height:44px;object-fit:contain}
    .auth-card h1{font-size:26px;line-height:1.1;margin:0 0 6px;font-weight:900}.auth-card p{margin:0 0 18px;color:rgba(207,225,255,.68);line-height:1.55}
    .auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.auth-field{display:grid;gap:6px;margin-bottom:12px}.auth-field span{font-size:11px;font-weight:800;text-transform:uppercase;color:rgba(207,225,255,.58)}
    .auth-field input,.auth-field select{height:44px;border-radius:10px;border:1px solid rgba(128,160,220,.18);background:#081226;color:#eef5ff;padding:0 12px;outline:0}.auth-field input:focus,.auth-field select:focus{border-color:#5d7cff}
    .auth-submit{width:100%;height:46px;border:0;border-radius:10px;background:#5d7cff;color:white;font-weight:900;margin-top:4px}.auth-submit:disabled{opacity:.65}
    .auth-error{display:none;margin-top:12px;border:1px solid rgba(255,77,109,.32);border-radius:10px;background:rgba(255,77,109,.1);color:#ff8ba0;padding:10px;font-size:13px}
    .auth-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:rgba(207,225,255,.68);font-size:13px}.auth-foot a{color:#7ea0ff;text-decoration:none;font-weight:800}
    @media (max-width:520px){.auth-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="auth-card">
    <a class="auth-logo" href="/"><img src="/assets/img/mex_global_logo.png" alt="MEX Global"></a>
    <h1><?php echo htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8'); ?></h1>
    <p><?php echo htmlspecialchars($L['sub'], ENT_QUOTES, 'UTF-8'); ?></p>
    <form id="register-form" novalidate>
      <div class="auth-grid">
        <label class="auth-field"><span><?php echo htmlspecialchars($L['first'], ENT_QUOTES, 'UTF-8'); ?></span><input name="first_name" autocomplete="given-name" required></label>
        <label class="auth-field"><span><?php echo htmlspecialchars($L['last'], ENT_QUOTES, 'UTF-8'); ?></span><input name="last_name" autocomplete="family-name" required></label>
      </div>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['email'], ENT_QUOTES, 'UTF-8'); ?></span><input name="email" type="email" autocomplete="email" required></label>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['pass'], ENT_QUOTES, 'UTF-8'); ?></span><input name="password" type="password" autocomplete="new-password" minlength="6" required></label>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['langlbl'], ENT_QUOTES, 'UTF-8'); ?></span><select name="lang"><option value="en"<?php echo $lang==='en'?' selected':''; ?>>English</option><option value="ar"<?php echo $lang==='ar'?' selected':''; ?>>العربية</option><option value="ru"<?php echo $lang==='ru'?' selected':''; ?>>Русский</option></select></label>
      <button class="auth-submit" type="submit"><?php echo htmlspecialchars($L['create'], ENT_QUOTES, 'UTF-8'); ?></button>
      <div class="auth-error" id="register-error"></div>
    </form>
    <div class="auth-foot"><a href="/?lang=<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['back'], ENT_QUOTES, 'UTF-8'); ?></a><a href="<?php echo htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['login'], ENT_QUOTES, 'UTF-8'); ?></a></div>
  </main>
  <script>
    const nextUrl = <?php echo json_encode($next, JSON_UNESCAPED_SLASHES); ?>;
    const FAIL_MSG = <?php echo json_encode($L['fail'], JSON_UNESCAPED_UNICODE); ?>;
    const form = document.getElementById('register-form');
    const errorBox = document.getElementById('register-error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.style.display = 'none';
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const body = {
          first_name: form.first_name.value.trim(),
          last_name: form.last_name.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          lang: form.lang.value || 'en'
        };
        const res = await fetch('/register.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || FAIL_MSG);
        window.location.href = nextUrl || '/app.php#/home';
      } catch (err) {
        errorBox.textContent = err.message || FAIL_MSG;
        errorBox.style.display = 'block';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
  <?php
  exit;
}

require_once __DIR__ . '/_common.php';

require_method('POST');
$pdo = auth_bootstrap_schema();
$body = read_json_body();

$first = trim((string)($body['first_name'] ?? ''));
$last = trim((string)($body['last_name'] ?? ''));
$email = strtolower(trim((string)($body['email'] ?? '')));
$password = (string)($body['password'] ?? '');
$lang = strtolower(trim((string)($body['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

$ERR = [
  'invalid' => [
    'en' => 'Please enter valid registration data.',
    'ar' => 'يرجى إدخال بيانات تسجيل صحيحة.',
    'ru' => 'Пожалуйста, введите корректные данные для регистрации.',
  ],
  'exists' => [
    'en' => 'This email is already registered.',
    'ar' => 'هذا البريد الإلكتروني مسجّل بالفعل.',
    'ru' => 'Этот адрес электронной почты уже зарегистрирован.',
  ],
];

if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
  json_response(['ok'=>false,'error'=>($ERR['invalid'][$lang] ?? $ERR['invalid']['en'])], 422);
}

$st = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$st->execute([$email]);
if ($st->fetchColumn()) {
  json_response(['ok'=>false,'error'=>($ERR['exists'][$lang] ?? $ERR['exists']['en'])], 409);
}

$now = now_ts();
$hash = password_hash($password, PASSWORD_BCRYPT);
$display = trim($first . ' ' . $last);
$ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$ins->execute([$email,$hash,$first,$last,$display,$lang,'active','web',$now,$now,$now]);
$uid = (int)$pdo->lastInsertId();

auth_ensure_platform_user($uid, ['email' => $email]);
set_session_user_id($uid, 'web');
$token = auth_issue_token($uid, 'web');
$row = auth_find_user($pdo, $uid) ?: ['id'=>$uid,'email'=>$email,'first_name'=>$first,'last_name'=>$last,'display_name'=>$display,'locale'=>$lang,'login_provider'=>'web'];
json_response(['ok'=>true,'user'=>auth_user_payload($row), 'token'=>$token]);
