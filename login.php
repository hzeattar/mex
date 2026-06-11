<?php
declare(strict_types=1);

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'POST') {
  $next = (string)($_GET['next'] ?? '/app.php#/home');
  $lang = strtolower((string)($_GET['lang'] ?? ($_COOKIE['vp_lang'] ?? 'en')));
  if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
  $rtl = ($lang === 'ar');
  $T = [
    'en' => ['title'=>'Log in','sub'=>'Access your trading workspace, funding, and account controls.','email'=>'Email','pass'=>'Password','login'=>'Log in','back'=>'Back to site','create'=>'Create account','fail'=>'Login failed.'],
    'ar' => ['title'=>'تسجيل الدخول','sub'=>'ادخل إلى مساحة التداول والإيداع وإدارة حسابك.','email'=>'البريد الإلكتروني','pass'=>'كلمة المرور','login'=>'تسجيل الدخول','back'=>'العودة إلى الموقع','create'=>'إنشاء حساب','fail'=>'فشل تسجيل الدخول.'],
    'ru' => ['title'=>'Вход','sub'=>'Доступ к торговой панели, пополнению и управлению счётом.','email'=>'Эл. почта','pass'=>'Пароль','login'=>'Войти','back'=>'На сайт','create'=>'Создать аккаунт','fail'=>'Не удалось войти.'],
  ];
  $L = $T[$lang];
  $registerUrl = '/register.php?lang=' . rawurlencode($lang) . '&next=' . rawurlencode($next);
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
    .auth-card{width:min(420px,100%);border:1px solid rgba(128,160,220,.18);border-radius:14px;background:linear-gradient(180deg,#0b1730,#060c1a);box-shadow:0 24px 70px rgba(0,0,0,.38);padding:22px}
    .auth-logo{display:flex;align-items:center;justify-content:center;margin-bottom:18px}.auth-logo img{max-width:178px;height:44px;object-fit:contain}
    .auth-card h1{font-size:26px;line-height:1.1;margin:0 0 6px;font-weight:900}.auth-card p{margin:0 0 18px;color:rgba(207,225,255,.68);line-height:1.55}
    .auth-field{display:grid;gap:6px;margin-bottom:12px}.auth-field span{font-size:11px;font-weight:800;text-transform:uppercase;color:rgba(207,225,255,.58)}
    .auth-field input{height:44px;border-radius:10px;border:1px solid rgba(128,160,220,.18);background:#081226;color:#eef5ff;padding:0 12px;outline:0}.auth-field input:focus{border-color:#5d7cff}
    .auth-submit{width:100%;height:46px;border:0;border-radius:10px;background:#5d7cff;color:white;font-weight:900;margin-top:4px}.auth-submit:disabled{opacity:.65}
    .auth-error{display:none;margin-top:12px;border:1px solid rgba(255,77,109,.32);border-radius:10px;background:rgba(255,77,109,.1);color:#ff8ba0;padding:10px;font-size:13px}
    .auth-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:rgba(207,225,255,.68);font-size:13px}.auth-foot a{color:#7ea0ff;text-decoration:none;font-weight:800}
  </style>
</head>
<body>
  <main class="auth-card">
    <a class="auth-logo" href="/"><img src="/assets/img/mex_global_logo.png" alt="MEX Global"></a>
    <h1><?php echo htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8'); ?></h1>
    <p><?php echo htmlspecialchars($L['sub'], ENT_QUOTES, 'UTF-8'); ?></p>
    <form id="login-form" novalidate>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['email'], ENT_QUOTES, 'UTF-8'); ?></span><input name="email" type="email" autocomplete="email" required></label>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['pass'], ENT_QUOTES, 'UTF-8'); ?></span><input name="password" type="password" autocomplete="current-password" required></label>
      <button class="auth-submit" type="submit"><?php echo htmlspecialchars($L['login'], ENT_QUOTES, 'UTF-8'); ?></button>
      <div class="auth-error" id="login-error"></div>
    </form>
    <div class="auth-foot"><a href="/?lang=<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['back'], ENT_QUOTES, 'UTF-8'); ?></a><a href="<?php echo htmlspecialchars($registerUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['create'], ENT_QUOTES, 'UTF-8'); ?></a></div>
  </main>
  <script>
    const nextUrl = <?php echo json_encode($next, JSON_UNESCAPED_SLASHES); ?>;
    const FAIL_MSG = <?php echo json_encode($L['fail'], JSON_UNESCAPED_UNICODE); ?>;
    const form = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.style.display = 'none';
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const body = {
          email: form.email.value.trim(),
          password: form.password.value
        };
        const res = await fetch('/login.php', {
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

$email = strtolower(trim((string)($body['email'] ?? '')));
$password = (string)($body['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
  json_response(['ok'=>false,'error'=>'Invalid email or password.'], 422);
}

$st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
$st->execute([$email]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row || empty($row['password_hash']) || !password_verify($password, (string)$row['password_hash'])) {
  json_response(['ok'=>false,'error'=>'Invalid email or password.'], 401);
}
if (strtolower((string)($row['account_status'] ?? 'active')) !== 'active') {
  json_response(['ok'=>false,'error'=>'Your account is not active.'], 403);
}

$pdo->prepare('UPDATE users SET last_login_at=?, updated_at=?, login_provider=? WHERE id=?')->execute([now_ts(), now_ts(), 'web', (int)$row['id']]);
auth_ensure_platform_user((int)$row['id'], ['email' => $email, 'username' => (string)($row['username'] ?? '')]);
set_session_user_id((int)$row['id'], 'web');
$token = auth_issue_token((int)$row['id'], 'web');
$row = auth_find_user($pdo, (int)$row['id']) ?: $row;
json_response(['ok'=>true,'user'=>auth_user_payload($row), 'token'=>$token]);
