<?php
declare(strict_types=1);

// Debug helper: sends a test message using the support bot (protected by SUPPORT_BOT_WEBHOOK_KEY)
// Usage: /bot/support_test_send.php?key=YOUR_SUPPORT_BOT_WEBHOOK_KEY&chat_id=123456789

function load_env_file(string $path): void {
  if (!is_file($path) || !is_readable($path)) return;
  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!$lines) return;
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line,'#') || !str_contains($line,'=')) continue;
    [$k,$v] = explode('=', $line, 2);
    $k = trim($k); $v = trim($v);
    if ((str_starts_with($v,'"') && str_ends_with($v,'"')) || (str_starts_with($v,"'") && str_ends_with($v,"'"))) $v = substr($v,1,-1);
    if ($k !== '' && (getenv($k) === false || getenv($k) === '')) { putenv($k.'='.$v); $_ENV[$k]=$v; }
  }
}

load_env_file(__DIR__.'/.env');
load_env_file(__DIR__.'/../.env');

require_once __DIR__ . '/../api/lib/common.php';

$key = (string)($_GET['key'] ?? '');
$guard = (string)env('SUPPORT_BOT_WEBHOOK_KEY','');
if ($guard === '' || !hash_equals($guard, $key)) {
  http_response_code(403);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok'=>false,'error'=>'Forbidden']);
  exit;
}

$token = (string)env('SUPPORT_BOT_TOKEN','');
if ($token==='') {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok'=>false,'error'=>'SUPPORT_BOT_TOKEN not set']);
  exit;
}

$chatId = (int)($_GET['chat_id'] ?? 0);
if ($chatId <= 0) {
  // fallback: BOT_ADMIN_CHAT_IDS first value
  $ids = (string)env('BOT_ADMIN_CHAT_IDS','');
  if ($ids !== '') {
    $parts = preg_split('/[^0-9]+/', $ids);
    foreach ($parts as $p) { if ($p !== '') { $chatId = (int)$p; break; } }
  }
}

if ($chatId <= 0) {
  http_response_code(400);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok'=>false,'error'=>'Provide chat_id']);
  exit;
}

$payload = [
  'chat_id' => $chatId,
  'text' => "✅ Support bot test message (".date('c').")",
];

$ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_TIMEOUT => 12,
]);
$res = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
if ($res === false) {
  echo json_encode(['ok'=>false,'error'=>$err]);
  exit;
}

echo $res;
