<?php
declare(strict_types=1);
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

if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
  json_response(['ok'=>false,'error'=>'Please enter valid registration data.'], 422);
}

$st = $pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$st->execute([$email]);
if ($st->fetchColumn()) {
  json_response(['ok'=>false,'error'=>'This email is already registered.'], 409);
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
