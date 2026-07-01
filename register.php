<?php
declare(strict_types=1);

require_once __DIR__ . '/api/auth/register_common.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'POST') {
  $next = (string)($_GET['next'] ?? '/app.php#/home');
  $lang = strtolower((string)($_GET['lang'] ?? ($_COOKIE['vp_lang'] ?? 'en')));
  if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
  $rtl = ($lang === 'ar');
  // Persist language choice so the SPA picks it up after registration
  setcookie('vp_lang', $lang, ['expires'=>time()+31536000,'path'=>'/','samesite'=>'Lax','httponly'=>false,'secure'=>false]);
  $countries = auth_registration_countries($lang);
  $defaultCountry = strtoupper(trim((string)($_GET['country'] ?? 'US')));
  if (!auth_registration_country_by_code($defaultCountry, $lang)) $defaultCountry = 'US';
  $T = [
    'en' => [
      'title'=>'Create account','sub'=>'Start with a demo workspace, then verify to unlock live funding and trading.',
      'first'=>'First name','last'=>'Last name','email'=>'Email','pass'=>'Password','confirm'=>'Confirm password',
      'country'=>'Country','phone'=>'Phone number','dial'=>'Code','birth'=>'Date of birth','day'=>'Day','month'=>'Month','year'=>'Year',
      'langlbl'=>'Language','create'=>'Create account','back'=>'Back to site','login'=>'Log in','fail'=>'Registration failed.',
      'match'=>'Password confirmation does not match.','birth_invalid'=>'Please enter a valid birth date. You must be at least 18 years old.',
      'phone_invalid'=>'Please enter a valid phone number.',
    ],
    'ar' => [
      'title'=>'إنشاء حساب','sub'=>'ابدأ بحساب تجريبي، ثم وثّق حسابك لفتح الإيداع والتداول الحقيقي.',
      'first'=>'الاسم الأول','last'=>'اسم العائلة','email'=>'البريد الإلكتروني','pass'=>'كلمة المرور','confirm'=>'تأكيد كلمة المرور',
      'country'=>'الدولة','phone'=>'رقم الهاتف','dial'=>'الكود','birth'=>'تاريخ الميلاد','day'=>'اليوم','month'=>'الشهر','year'=>'السنة',
      'langlbl'=>'اللغة','create'=>'إنشاء حساب','back'=>'العودة إلى الموقع','login'=>'تسجيل الدخول','fail'=>'فشل إنشاء الحساب.',
      'match'=>'تأكيد كلمة المرور غير مطابق.','birth_invalid'=>'يرجى إدخال تاريخ ميلاد صحيح. يجب أن يكون عمرك 18 عاماً على الأقل.',
      'phone_invalid'=>'يرجى إدخال رقم هاتف صحيح.',
    ],
    'ru' => [
      'title'=>'Создать аккаунт','sub'=>'Начните с демо-счёта, затем подтвердите личность для пополнения и реальной торговли.',
      'first'=>'Имя','last'=>'Фамилия','email'=>'Эл. почта','pass'=>'Пароль','confirm'=>'Подтвердите пароль',
      'country'=>'Страна','phone'=>'Телефон','dial'=>'Код','birth'=>'Дата рождения','day'=>'День','month'=>'Месяц','year'=>'Год',
      'langlbl'=>'Язык','create'=>'Создать аккаунт','back'=>'На сайт','login'=>'Войти','fail'=>'Не удалось создать аккаунт.',
      'match'=>'Подтверждение пароля не совпадает.','birth_invalid'=>'Введите корректную дату рождения. Вам должно быть не менее 18 лет.',
      'phone_invalid'=>'Введите корректный номер телефона.',
    ],
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
  <title><?php echo htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8'); ?> - MEX Global</title>
  <link rel="stylesheet" href="/assets/css/public-site.css?v=<?php echo (int)(@filemtime(__DIR__ . '/assets/css/public-site.css') ?: time()); ?>">
  <style>
    body{box-sizing:border-box;min-height:100vh;margin:0;background:#050814;color:#eef5ff;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;padding:24px;overflow-x:hidden}
    .auth-card{box-sizing:border-box;width:min(620px,100%);max-width:calc(100vw - 48px);border:1px solid rgba(128,160,220,.18);border-radius:14px;background:linear-gradient(180deg,#0b1730,#060c1a);box-shadow:0 24px 70px rgba(0,0,0,.38);padding:22px}
    .auth-logo{display:flex;align-items:center;justify-content:center;margin-bottom:18px}.auth-logo img{max-width:178px;height:44px;object-fit:contain}
    .auth-card h1{font-size:26px;line-height:1.1;margin:0 0 6px;font-weight:900}.auth-card p{margin:0 0 18px;color:rgba(207,225,255,.68);line-height:1.55}
    .auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.auth-field{display:grid;gap:6px;margin-bottom:12px}.auth-field span{font-size:11px;font-weight:800;text-transform:uppercase;color:rgba(207,225,255,.58)}
    .auth-field input,.auth-field select{height:44px;border-radius:10px;border:1px solid rgba(128,160,220,.18);background:#081226;color:#eef5ff;padding:0 12px;outline:0;font-size:16px;touch-action:manipulation}.auth-field input:focus,.auth-field select:focus{border-color:#5d7cff}
    .auth-phone-row{display:grid;grid-template-columns:180px 1fr;gap:10px}.auth-date-row{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:10px}
    .auth-phone-row input[name="phone_number"],.auth-date-row input{direction:ltr;text-align:center}
    .auth-submit{width:100%;height:46px;border:0;border-radius:10px;background:#5d7cff;color:white;font-weight:900;margin-top:4px}.auth-submit:disabled{opacity:.65}
    .auth-error{display:none;margin-top:12px;border:1px solid rgba(255,77,109,.32);border-radius:10px;background:rgba(255,77,109,.1);color:#ff8ba0;padding:10px;font-size:13px}
    .auth-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:rgba(207,225,255,.68);font-size:13px}.auth-foot a{color:#7ea0ff;text-decoration:none;font-weight:800}
    @media (max-width:620px){.auth-grid,.auth-phone-row,.auth-date-row{grid-template-columns:1fr}.auth-card{padding:18px}}
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
      <div class="auth-grid">
        <label class="auth-field"><span><?php echo htmlspecialchars($L['pass'], ENT_QUOTES, 'UTF-8'); ?></span><input name="password" type="password" autocomplete="new-password" minlength="6" required></label>
        <label class="auth-field"><span><?php echo htmlspecialchars($L['confirm'], ENT_QUOTES, 'UTF-8'); ?></span><input name="password_confirm" type="password" autocomplete="new-password" minlength="6" required></label>
      </div>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['country'], ENT_QUOTES, 'UTF-8'); ?></span>
        <select name="country_code" required>
          <?php foreach ($countries as $country): $cc = (string)$country['code']; ?>
            <option value="<?php echo htmlspecialchars($cc, ENT_QUOTES, 'UTF-8'); ?>" data-dial="<?php echo htmlspecialchars((string)$country['dial_code'], ENT_QUOTES, 'UTF-8'); ?>"<?php echo $cc === $defaultCountry ? ' selected' : ''; ?>>
              <?php echo htmlspecialchars(trim((string)$country['flag'] . ' ' . (string)$country['name']), ENT_QUOTES, 'UTF-8'); ?>
            </option>
          <?php endforeach; ?>
        </select>
      </label>
      <div class="auth-phone-row">
        <label class="auth-field"><span><?php echo htmlspecialchars($L['dial'], ENT_QUOTES, 'UTF-8'); ?></span>
          <select name="phone_dial_code" required>
            <?php foreach ($countries as $country): if (($country['dial_code'] ?? '') === '') continue; ?>
              <option value="<?php echo htmlspecialchars((string)$country['dial_code'], ENT_QUOTES, 'UTF-8'); ?>"<?php echo (string)$country['code'] === $defaultCountry ? ' selected' : ''; ?>>
                <?php echo htmlspecialchars(trim((string)$country['flag'] . ' ' . (string)$country['dial_code']), ENT_QUOTES, 'UTF-8'); ?>
              </option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="auth-field"><span><?php echo htmlspecialchars($L['phone'], ENT_QUOTES, 'UTF-8'); ?></span><input name="phone_number" type="tel" autocomplete="tel-national" inputmode="tel" enterkeyhint="next" pattern="[0-9+()\\s-]*" dir="ltr" required></label>
      </div>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['birth'], ENT_QUOTES, 'UTF-8'); ?></span>
        <div class="auth-date-row">
          <input name="birth_day" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="bday-day" placeholder="<?php echo htmlspecialchars($L['day'], ENT_QUOTES, 'UTF-8'); ?>" required>
          <input name="birth_month" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="bday-month" placeholder="<?php echo htmlspecialchars($L['month'], ENT_QUOTES, 'UTF-8'); ?>" required>
          <input name="birth_year" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="bday-year" placeholder="<?php echo htmlspecialchars($L['year'], ENT_QUOTES, 'UTF-8'); ?>" required>
        </div>
      </label>
      <label class="auth-field"><span><?php echo htmlspecialchars($L['langlbl'], ENT_QUOTES, 'UTF-8'); ?></span><select name="lang"><option value="en"<?php echo $lang==='en'?' selected':''; ?>>English</option><option value="ar"<?php echo $lang==='ar'?' selected':''; ?>>العربية</option><option value="ru"<?php echo $lang==='ru'?' selected':''; ?>>Русский</option></select></label>
      <button class="auth-submit" type="submit"><?php echo htmlspecialchars($L['create'], ENT_QUOTES, 'UTF-8'); ?></button>
      <div class="auth-error" id="register-error"></div>
    </form>
    <div class="auth-foot"><a href="/?lang=<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['back'], ENT_QUOTES, 'UTF-8'); ?></a><a href="<?php echo htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($L['login'], ENT_QUOTES, 'UTF-8'); ?></a></div>
  </main>
  <script>
    const nextUrl = <?php echo json_encode($next, JSON_UNESCAPED_SLASHES); ?>;
    const MSG = <?php echo json_encode([
      'fail' => $L['fail'],
      'match' => $L['match'],
      'birth' => $L['birth_invalid'],
      'phone' => $L['phone_invalid'],
    ], JSON_UNESCAPED_UNICODE); ?>;
    const form = document.getElementById('register-form');
    const errorBox = document.getElementById('register-error');

    function showError(message) {
      errorBox.textContent = message || MSG.fail;
      errorBox.style.display = 'block';
    }

    function isAdultBirthDate(day, month, year) {
      day = Number(day); month = Number(month); year = Number(year);
      if (!day || !month || !year) return false;
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
      const now = new Date();
      const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
      return date <= cutoff;
    }

    form.country_code.addEventListener('change', () => {
      const opt = form.country_code.selectedOptions[0];
      const dial = opt ? opt.dataset.dial : '';
      if (dial) form.phone_dial_code.value = dial;
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.style.display = 'none';
      if (form.password.value !== form.password_confirm.value) return showError(MSG.match);
      if (!isAdultBirthDate(form.birth_day.value, form.birth_month.value, form.birth_year.value)) return showError(MSG.birth);
      const phoneDigits = String(form.phone_number.value || '').replace(/\D+/g, '').replace(/^0+/, '');
      const dialDigits = String(form.phone_dial_code.value || '').replace(/\D+/g, '');
      if (!phoneDigits || (dialDigits + phoneDigits).length < 8 || (dialDigits + phoneDigits).length > 15) return showError(MSG.phone);

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const body = {
          first_name: form.first_name.value.trim(),
          last_name: form.last_name.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          password_confirm: form.password_confirm.value,
          country_code: form.country_code.value,
          phone_dial_code: form.phone_dial_code.value,
          phone_number: form.phone_number.value.trim(),
          birth_day: form.birth_day.value,
          birth_month: form.birth_month.value,
          birth_year: form.birth_year.value,
          lang: form.lang.value || 'en'
        };
        const res = await fetch('/register.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || MSG.fail);
        localStorage.setItem('vp_mode', 'demo');
        window.location.href = nextUrl || '/app.php#/home';
      } catch (err) {
        showError(err.message || MSG.fail);
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

require_method('POST');
$pdo = auth_bootstrap_schema();
$body = read_json_body();

$lang = strtolower(trim((string)($body['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

$normalized = auth_normalize_registration_payload($body, $lang);
if (empty($normalized['ok'])) {
  json_response(['ok'=>false,'error'=>auth_registration_error((string)($normalized['error_key'] ?? 'invalid'), $lang)], 422);
}
$data = $normalized['data'];

$st = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$st->execute([$data['email']]);
if ($st->fetchColumn()) {
  json_response(['ok'=>false,'error'=>auth_registration_error('exists', $lang)], 409);
}

$now = now_ts();
$hash = password_hash((string)$data['password'], PASSWORD_BCRYPT);
$display = trim((string)$data['first_name'] . ' ' . (string)$data['last_name']);
$ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,country_code,country_name,phone_dial_code,phone_number,phone_e164,birth_date,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$ins->execute([
  $data['email'],$hash,$data['first_name'],$data['last_name'],$display,$data['lang'],'active','web',
  $data['country_code'],$data['country_name'],$data['phone_dial_code'],$data['phone_number'],$data['phone_e164'],$data['birth_date'],
  $now,$now,$now
]);
$uid = (int)$pdo->lastInsertId();

auth_ensure_platform_user($uid, ['email' => (string)$data['email']]);
set_session_user_id($uid, 'web');
$token = auth_issue_token($uid, 'web');
$row = auth_find_user($pdo, $uid) ?: [
  'id'=>$uid,'email'=>$data['email'],'first_name'=>$data['first_name'],'last_name'=>$data['last_name'],
  'display_name'=>$display,'locale'=>$data['lang'],'login_provider'=>'web',
  'country_code'=>$data['country_code'],'country_name'=>$data['country_name'],'phone_dial_code'=>$data['phone_dial_code'],
  'phone_number'=>$data['phone_number'],'phone_e164'=>$data['phone_e164'],'birth_date'=>$data['birth_date'],
];
json_response(['ok'=>true,'user'=>auth_user_payload($row), 'token'=>$token, 'mode'=>'demo']);
