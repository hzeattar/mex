<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

require_method('POST');
$pdo = auth_bootstrap_schema();
$body = read_json_body();

$email = strtolower(trim((string)($body['email'] ?? '')));
$password = (string)($body['password'] ?? '');

// Rate limiting: max 5 failed attempts per IP per minute
$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$clientIp = substr(trim(explode(',', (string)$clientIp)[0] ?? ''), 0, 45);
$rateLimitDir = __DIR__ . '/../data/locks';
if (!is_dir($rateLimitDir)) @mkdir($rateLimitDir, 0775, true);
$rateLimitFile = $rateLimitDir . '/login_ratelimit_' . md5($clientIp) . '.json';
$rateLimit = ['count' => 0, 'window_start' => 0];
if (is_file($rateLimitFile)) {
  $raw = @file_get_contents($rateLimitFile);
  $decoded = $raw ? json_decode($raw, true) : null;
  if (is_array($decoded)) $rateLimit = $decoded;
}
$now = time();
if (($now - $rateLimit['window_start']) > 60) {
  $rateLimit = ['count' => 0, 'window_start' => $now];
}
if ($rateLimit['count'] >= 5) {
  json_response(['ok'=>false,'error'=>'Too many login attempts. Please wait a moment.'], 429);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
  $rateLimit['count']++;
  @file_put_contents($rateLimitFile, json_encode($rateLimit), LOCK_EX);
  json_response(['ok'=>false,'error'=>'Invalid email or password.'], 422);
}

$st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
$st->execute([$email]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row || empty($row['password_hash']) || !password_verify($password, (string)$row['password_hash'])) {
  $rateLimit['count']++;
  @file_put_contents($rateLimitFile, json_encode($rateLimit), LOCK_EX);
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
