<?php
declare(strict_types=1);

// Diagnostics for PAY bot webhook (MexFinance_bot)
// Usage: /bot/pay_webhook_info.php?key=BOT_WEBHOOK_KEY

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
    if ($k !== '' && getenv($k) === false) { putenv($k.'='.$v); $_ENV[$k]=$v; }
  }
}

load_env_file(__DIR__.'/.env');
load_env_file(__DIR__.'/../.env');

require_once __DIR__ . '/api/lib/common.php';

header('Content-Type: application/json; charset=utf-8');

$key = (string)($_GET['key'] ?? '');
$secretKey = (string)env('BOT_WEBHOOK_KEY','');
if ($secretKey === '' || !hash_equals($secretKey, $key)) {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'Forbidden']);
  exit;
}

$token = (string)env('BOT_TOKEN','');
if ($token === '') {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'BOT_TOKEN missing']);
  exit;
}

$expected = rtrim((string)env('SITE_URL',''), '/') . '/bot/pay_webhook.php';
if ($expected === '/bot/pay_webhook.php') {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $expected = $scheme . '://' . $host . '/bot/pay_webhook.php';
}

function tg_call(string $token, string $method, array $payload = []): array {
  $url = 'https://api.telegram.org/bot'.$token.'/'.$method;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 15,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

echo json_encode([
  'ok' => true,
  'expected' => ['pay' => $expected],
  'getMe' => tg_call($token, 'getMe', []),
  'getWebhookInfo' => tg_call($token, 'getWebhookInfo', []),
], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
