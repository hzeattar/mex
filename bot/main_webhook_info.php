<?php
declare(strict_types=1);

// Debug helper (protected by BOT_WEBHOOK_KEY/BOT_WEBHOOK_SECRET):
// Returns Telegram getWebhookInfo() for:
// - Main MiniApp bot (Tradeoxplus_bot)
// - Pay bot (MexFinance_bot)
// - Affiliate bot (mexaff_bot)
//
// Usage:
//   /bot/main_webhook_info.php?key=YOUR_BOT_WEBHOOK_KEY

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

require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/settings.php';

$k = (string)($_GET['key'] ?? '');
$allowed = array_values(array_filter([
  (string)env('BOT_WEBHOOK_KEY',''),
  (string)env('BOT_WEBHOOK_SECRET',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
], fn($v)=>$v!=='' ));

if ($k === '' || !in_array($k, $allowed, true)) {
  http_response_code(403);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok'=>false,'error'=>'Forbidden']);
  exit;
}

function expected_url(string $path, string $pathTokenEnv=''): string {
  $base = rtrim((string)env('SITE_URL',''), '/');
  if ($base === '') {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $base = $scheme . '://' . $host;
  }
  $qs = '';
  if ($pathTokenEnv !== '') {
    $pt = (string)env($pathTokenEnv, '');
    if ($pt !== '') $qs = '?token=' . rawurlencode($pt);
  }
  return $base . $path . $qs;
}

function get_webhook_info(string $token): array {
  if ($token === '') return ['ok'=>false,'error'=>'token_missing'];
  $url = "https://api.telegram.org/bot{$token}/getWebhookInfo";
  $res = @file_get_contents($url);
  if ($res === false) return ['ok'=>false,'error'=>'request_failed'];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'bad_json'];
}

$mainToken = (string)setting_get('bot.token','');
if ($mainToken==='') $mainToken = (string)env('TELEGRAM_BOT_TOKEN','');
$payToken  = (string)env('BOT_TOKEN','');
$affToken  = (string)env('AFF_BOT_TOKEN','');

$out = [
  'expected' => [
    'main' => expected_url('/bot/webhook.php', 'BOT_PATH_TOKEN'),
    'pay'  => expected_url('/bot/pay_webhook.php', ''),
    'aff'  => expected_url('/bot/aff_webhook.php', 'AFF_BOT_PATH_TOKEN'),
  ],
  'telegram' => [
    'main' => get_webhook_info($mainToken),
    'pay'  => get_webhook_info($payToken),
    'aff'  => get_webhook_info($affToken),
  ],
];

header('Content-Type: application/json; charset=utf-8');
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
