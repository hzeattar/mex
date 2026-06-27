<?php
declare(strict_types=1);
require_once __DIR__ . '/register_common.php';

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
$currency = strtoupper((string)($data['currency'] ?? 'USD'));

if (!schema_column_exists($pdo, 'users', 'currency', db_driver())) {
  schema_add_column($pdo, 'users', "currency VARCHAR(5) NOT NULL DEFAULT 'USD'", "currency TEXT NOT NULL DEFAULT 'USD'", db_driver());
}

// Optionally store initial KYC consent; table may not exist.
try {
  $kycFields = [];
  try {
    $cols = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='kyc_requests'")->fetchAll(PDO::FETCH_COLUMN);
    if ($cols && in_array('user_id', $cols, true)) $kycFields = $cols;
  } catch (Throwable $e) { $kycFields = null; }
  if (!empty($kycFields)) {
    $consentColumns = [];
    $consentValues = [];
    $consentBindings = [];
    if (in_array('agreed_terms', $kycFields, true)) { $consentColumns[]='agreed_terms'; $consentValues[]='?'; $consentBindings[]=1; }
    if (in_array('agreed_age', $kycFields, true)) { $consentColumns[]='agreed_age'; $consentValues[]='?'; $consentBindings[]=1; }
    if (in_array('agreed_kyc', $kycFields, true)) { $consentColumns[]='agreed_kyc'; $consentValues[]='?'; $consentBindings[]=1; }
    if (in_array('status', $kycFields, true)) { $consentColumns[]='status'; $consentValues[]='?'; $consentBindings[]='pending'; }
    if (in_array('created_at', $kycFields, true)) { $consentColumns[]='created_at'; $consentValues[]='?'; $consentBindings[]=$now; }
    if (in_array('updated_at', $kycFields, true)) { $consentColumns[]='updated_at'; $consentValues[]='?'; $consentBindings[]=$now; }
    // user_id placeholder; we'll set after insert via lastInsertId to avoid FK ordering issues.
  }
} catch (Throwable $e) {}

$ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,country_code,country_name,phone_dial_code,phone_number,phone_e164,birth_date,currency,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$ins->execute([
  $data['email'],$hash,$data['first_name'],$data['last_name'],$display,$data['lang'],'active','web',
  $data['country_code'],$data['country_name'],$data['phone_dial_code'],$data['phone_number'],$data['phone_e164'],$data['birth_date'],$currency,
  $now,$now,$now
]);
$uid = (int)$pdo->lastInsertId();

// Insert KYC consent after user is created
if (!empty($kycFields) && !empty($consentColumns)) {
  try {
    $consentColumnsStr = 'user_id,' . implode(',', $consentColumns);
    $consentValuesStr = '?' . ($consentValues ? ',' . implode(',', $consentValues) : '');
    $consentBindingsAll = array_merge([$uid], $consentBindings);
    $kycStmt = $pdo->prepare("INSERT INTO kyc_requests ($consentColumnsStr) VALUES ($consentValuesStr)");
    $kycStmt->execute($consentBindingsAll);
  } catch (Throwable $e) {}
}

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
