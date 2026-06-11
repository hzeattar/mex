<?php
declare(strict_types=1);

// Debug helper: returns getMe() for the support bot (protected by SUPPORT_BOT_WEBHOOK_KEY)
// Usage: /bot/support_getme.php?key=YOUR_SUPPORT_BOT_WEBHOOK_KEY

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

require_once __DIR__ . '/api/lib/common.php';

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

$url = "https://api.telegram.org/bot{$token}/getMe";
$res = @file_get_contents($url);

header('Content-Type: application/json; charset=utf-8');
if ($res === false) {
  echo json_encode(['ok'=>false,'error'=>'Request failed']);
  exit;
}
echo $res;
