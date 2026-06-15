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
