<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

require_method('GET');
$uid = session_user_id();
if ($uid <= 0) {
  json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
}
$pdo = auth_bootstrap_schema();
$row = auth_find_user($pdo, $uid);
if (!$row) {
  clear_session_user_id();
  json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
}
auth_ensure_platform_user($uid, [
  'email' => (string)($row['email'] ?? ''),
  'telegram_id' => (string)($row['tg_id'] ?? ''),
  'username' => (string)($row['username'] ?? ''),
]);
$row = auth_find_user($pdo, $uid) ?: $row;
json_response(['ok'=>true,'user'=>auth_user_payload($row)]);
