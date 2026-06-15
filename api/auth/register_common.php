<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../../bot/countries.php';

function auth_registration_countries(string $lang = 'en'): array {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $items = [];
  foreach (mex_countries_sorted($lang) as $it) {
    $cc = strtoupper((string)($it['code'] ?? ''));
    if (!preg_match('/^[A-Z]{2}$/', $cc)) continue;
    $flag = mex_flag_emoji($cc);
    $dial = mex_country_dial_code($cc);
    $label = (string)($it['label'] ?? $cc);
    $items[] = [
      'code' => $cc,
      'name' => $label,
      'flag' => $flag,
      'dial_code' => $dial,
      'display' => trim($flag . ' ' . $label),
    ];
  }
  return $items;
}

function auth_registration_country_by_code(string $code, string $lang = 'en'): ?array {
  $code = strtoupper(trim($code));
  foreach (auth_registration_countries($lang) as $country) {
    if (($country['code'] ?? '') === $code) return $country;
  }
  return null;
}

function auth_registration_error(string $key, string $lang): string {
  $messages = [
    'invalid' => [
      'en' => 'Please enter valid registration data.',
      'ar' => 'يرجى إدخال بيانات تسجيل صحيحة.',
      'ru' => 'Пожалуйста, введите корректные данные для регистрации.',
    ],
    'password_match' => [
      'en' => 'Password confirmation does not match.',
      'ar' => 'تأكيد كلمة المرور غير مطابق.',
      'ru' => 'Подтверждение пароля не совпадает.',
    ],
    'phone' => [
      'en' => 'Please enter a valid phone number.',
      'ar' => 'يرجى إدخال رقم هاتف صحيح.',
      'ru' => 'Введите корректный номер телефона.',
    ],
    'country' => [
      'en' => 'Please select your country.',
      'ar' => 'يرجى اختيار الدولة.',
      'ru' => 'Выберите страну.',
    ],
    'birth_date' => [
      'en' => 'Please enter a valid birth date. You must be at least 18 years old.',
      'ar' => 'يرجى إدخال تاريخ ميلاد صحيح. يجب أن يكون عمرك 18 عاماً على الأقل.',
      'ru' => 'Введите корректную дату рождения. Вам должно быть не менее 18 лет.',
    ],
    'exists' => [
      'en' => 'This email is already registered.',
      'ar' => 'هذا البريد الإلكتروني مسجّل بالفعل.',
      'ru' => 'Этот адрес электронной почты уже зарегистрирован.',
    ],
  ];
  return $messages[$key][$lang] ?? $messages[$key]['en'] ?? $messages['invalid']['en'];
}

function auth_validate_birth_date(array $body): ?string {
  $raw = trim((string)($body['birth_date'] ?? ''));
  if ($raw !== '' && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw, $m)) {
    $year = (int)$m[1];
    $month = (int)$m[2];
    $day = (int)$m[3];
  } else {
    $day = (int)($body['birth_day'] ?? $body['day'] ?? 0);
    $month = (int)($body['birth_month'] ?? $body['month'] ?? 0);
    $year = (int)($body['birth_year'] ?? $body['year'] ?? 0);
  }
  if ($year < 1900 || $month < 1 || $day < 1 || !checkdate($month, $day, $year)) {
    return null;
  }
  try {
    $birth = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));
    $adultCutoff = (new DateTimeImmutable('today'))->modify('-18 years');
    if ($birth > $adultCutoff) return null;
  } catch (Throwable $e) {
    return null;
  }
  return sprintf('%04d-%02d-%02d', $year, $month, $day);
}

function auth_normalize_registration_payload(array $body, string $lang = 'en'): array {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $first = trim((string)($body['first_name'] ?? ''));
  $last = trim((string)($body['last_name'] ?? ''));
  $email = strtolower(trim((string)($body['email'] ?? '')));
  $password = (string)($body['password'] ?? '');
  $passwordConfirm = (string)($body['password_confirm'] ?? $body['confirm_password'] ?? '');
  if ($passwordConfirm === '') $passwordConfirm = $password;

  if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
    return ['ok' => false, 'error_key' => 'invalid'];
  }
  if (!hash_equals($password, $passwordConfirm)) {
    return ['ok' => false, 'error_key' => 'password_match'];
  }

  $countryCode = strtoupper(trim((string)($body['country_code'] ?? '')));
  $country = auth_registration_country_by_code($countryCode, $lang);
  if (!$country) {
    return ['ok' => false, 'error_key' => 'country'];
  }

  $phoneDial = trim((string)($body['phone_dial_code'] ?? $country['dial_code'] ?? ''));
  $phoneDial = '+' . preg_replace('/\D+/', '', $phoneDial);
  $phoneNumber = trim((string)($body['phone_number'] ?? ''));
  $phoneDigits = preg_replace('/\D+/', '', $phoneNumber);
  $nationalDigits = ltrim((string)$phoneDigits, '0');
  $dialDigits = preg_replace('/\D+/', '', $phoneDial);
  $totalDigits = $dialDigits . $nationalDigits;
  if ($dialDigits === '' || $nationalDigits === '' || strlen($totalDigits) < 8 || strlen($totalDigits) > 15) {
    return ['ok' => false, 'error_key' => 'phone'];
  }

  $birthDate = auth_validate_birth_date($body);
  if ($birthDate === null) {
    return ['ok' => false, 'error_key' => 'birth_date'];
  }

  return [
    'ok' => true,
    'data' => [
      'first_name' => $first,
      'last_name' => $last,
      'email' => $email,
      'password' => $password,
      'lang' => $lang,
      'country_code' => (string)$country['code'],
      'country_name' => (string)$country['name'],
      'phone_dial_code' => $phoneDial,
      'phone_number' => $phoneNumber,
      'phone_e164' => '+' . $totalDigits,
      'birth_date' => $birthDate,
    ],
  ];
}
