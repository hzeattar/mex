<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

$pdo = auth_bootstrap_schema();
$body = [];
if (str_contains((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
  try { $body = read_json_body(); } catch (Throwable $e) { $body = []; }
}
$data = array_merge($_GET ?? [], $_POST ?? [], is_array($body) ? $body : []);

$botToken = trim((string)env('TELEGRAM_BOT_TOKEN', ''));
if ($botToken === '') {
  json_response(['ok'=>false, 'error'=>'Telegram bot token is not configured on the server.'], 503);
}

$required = ['id','auth_date','hash'];
foreach ($required as $k) {
  if (!isset($data[$k]) || (string)$data[$k] === '') {
    json_response(['ok'=>false, 'error'=>'Invalid Telegram login payload.'], 422);
  }
}

$check = $data;
unset($check['hash']);
ksort($check, SORT_STRING);
$pairs = [];
foreach ($check as $key => $value) {
  if ($value === null) continue;
  $pairs[] = $key . '=' . (is_scalar($value) ? (string)$value : json_encode($value, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
}
$dataCheckString = implode("\n", $pairs);
$secret = hash('sha256', $botToken, true);
$calcHash = hash_hmac('sha256', $dataCheckString, $secret);
$recvHash = (string)$data['hash'];
if (!hash_equals($calcHash, $recvHash)) {
  json_response(['ok'=>false, 'error'=>'Telegram login verification failed.'], 401);
}

$authDate = (int)$data['auth_date'];
if ($authDate <= 0 || abs(time() - $authDate) > 86400) {
  json_response(['ok'=>false, 'error'=>'Telegram login request expired.'], 401);
}

$tgId = trim((string)$data['id']);
$first = trim((string)($data['first_name'] ?? ''));
$last = trim((string)($data['last_name'] ?? ''));
$username = trim(ltrim((string)($data['username'] ?? ''), '@'));
$display = trim((string)($data['display_name'] ?? ''));
if ($display === '') $display = trim($first . ' ' . $last);
if ($display === '') $display = $username !== '' ? ('@' . $username) : ('Telegram User ' . $tgId);
$locale = strtolower(trim((string)($data['lang'] ?? $data['language_code'] ?? 'en')));
if (!in_array($locale, ['en','ar','ru','fr','de','zh'], true)) $locale = 'en';
$now = now_ts();

$row = null;
$st = $pdo->prepare("SELECT u.* FROM user_identities i JOIN users u ON u.id=i.user_id WHERE i.provider='telegram' AND i.provider_user_id=? LIMIT 1");
$st->execute([$tgId]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row) {
  $st = $pdo->prepare('SELECT * FROM users WHERE tg_id=? LIMIT 1');
  $st->execute([$tgId]);
  $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

if ($row) {
  $pdo->prepare('UPDATE users SET telegram_chat_id=?, username=?, first_name=?, last_name=?, display_name=?, locale=?, account_status=?, login_provider=?, last_login_at=?, updated_at=? WHERE id=?')
      ->execute([$tgId, $username !== '' ? $username : ($row['username'] ?? null), $first !== '' ? $first : ($row['first_name'] ?? null), $last !== '' ? $last : ($row['last_name'] ?? null), $display, $locale, 'active', 'telegram', $now, $now, (int)$row['id']]);
  $uid = (int)$row['id'];
} else {
  $ins = $pdo->prepare('INSERT INTO users(tg_id,telegram_chat_id,username,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  $ins->execute([$tgId,$tgId,$username !== '' ? $username : null,$first !== '' ? $first : null,$last !== '' ? $last : null,$display,$locale,'active','telegram',$now,$now,$now]);
  $uid = (int)$pdo->lastInsertId();
}

auth_ensure_platform_user($uid, ['telegram_id' => $tgId, 'username' => $username]);
auth_sync_identity($pdo, $uid, 'telegram', $tgId, $username !== '' ? $username : null, null, ['first_name'=>$first,'last_name'=>$last]);
set_session_user_id($uid, 'telegram');
$token = auth_issue_token($uid, 'telegram');
$row = auth_find_user($pdo, $uid) ?: ['id'=>$uid,'tg_id'=>$tgId,'username'=>$username,'first_name'=>$first,'last_name'=>$last,'display_name'=>$display,'locale'=>$locale,'login_provider'=>'telegram'];
json_response(['ok'=>true, 'user'=>auth_user_payload($row), 'token'=>$token]);
