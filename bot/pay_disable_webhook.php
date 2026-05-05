<?php
declare(strict_types=1);

function load_env_file(string $path): void {
  if (!is_file($path) || !is_readable($path)) return;
  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!$lines) return;
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line,'#') || !str_contains($line,'=')) continue;
    [$k,$v] = explode('=', $line, 2);
    $k = trim($k);
    $v = trim($v);
    $v = trim($v, " \t\n\r\0\x0B\"'");
    if ($k !== '') { $_ENV[$k] = $v; }
  }
}

load_env_file(__DIR__.'/.env');
load_env_file(__DIR__.'/../.env');

require_once __DIR__ . '/../api/lib/common.php';

$k = (string)($_GET['key'] ?? '');
$secret = (string)env('BOT_WEBHOOK_KEY','');

if ($secret === '' || !hash_equals($secret, $k)) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

$token = (string)env('BOT_TOKEN','');
if ($token === '') {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'BOT_TOKEN missing'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  exit;
}

function tg_call(string $token, string $method, array $payload): array {
  $url = 'https://api.telegram.org/bot'.$token.'/'.$method;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 14,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

$del = tg_call($token, 'deleteWebhook', ['drop_pending_updates'=>true]);
$info = tg_call($token, 'getWebhookInfo', []);

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok'=>true,'deleteWebhook'=>$del,'getWebhookInfo'=>$info], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
