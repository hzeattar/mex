<?php
declare(strict_types=1);

// Set webhook for affiliate/manager bot (mexaff_bot)

function load_env_file_local(string $path): void {
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

load_env_file_local(__DIR__.'/.env');
load_env_file_local(__DIR__.'/../.env');

require_once __DIR__ . '/api/lib/common.php';

$k = (string)($_GET['key'] ?? '');
$secretKey = (string)env('AFF_BOT_WEBHOOK_KEY','');
if ($secretKey === '' || !hash_equals($secretKey, $k)) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

$token = (string)env('AFF_BOT_TOKEN','');
if ($token==='') { http_response_code(500); echo "AFF_BOT_TOKEN not set"; exit; }

$webhook = rtrim((string)env('SITE_URL',''), '/') . '/bot/aff_webhook.php';
if ($webhook === '/bot/aff_webhook.php') {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $webhook = $scheme . '://' . $host . '/bot/aff_webhook.php';
}

$url = "https://api.telegram.org/bot{$token}/setWebhook";
$payload = [
  'url' => $webhook,
  'drop_pending_updates' => true,
];
$sec = (string)env('AFF_BOT_WEBHOOK_SECRET','');
if ($sec !== '') {
  $payload['secret_token'] = $sec;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_TIMEOUT => 15,
]);
$res = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
if ($res === false) { echo json_encode(['ok'=>false,'error'=>$err]); exit; }
echo $res;
