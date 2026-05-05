<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/settings.php';

// Allow setting webhook without admin session on shared hosting
// using ?key=BOT_WEBHOOK_KEY (or BOT_WEBHOOK_SECRET/CRON_KEY/INSTALL_KEY).
admin_or_key();

// Main MiniApp bot token (prefer .env to avoid accidentally using a wrong stored token)
$token = (string)env('TELEGRAM_BOT_TOKEN','');
if ($token==='') $token = (string)setting_get('bot.token','');
if ($token==='') { header('Content-Type: text/plain; charset=utf-8'); echo "TELEGRAM_BOT_TOKEN (or bot.token) is missing"; exit; }

// Keep settings in sync (best effort)
try {
  $cur = (string)setting_get('bot.token','');
  if ($cur === '' || $cur !== $token) {
    if (function_exists('setting_set')) setting_set('bot.token', $token);
  }
} catch (Throwable $e) {}

// Base URL (prefer SITE_URL so you don't accidentally set webhook to an IP/alternate host)
$base = rtrim((string)env('SITE_URL',''), '/');
if ($base === '') {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $base = $scheme . '://' . $host;
}

// Protect webhook on shared hosting
$pathToken   = (string)env('BOT_PATH_TOKEN','');
$secretToken = trim((string)env('BOT_WEBHOOK_SECRET',''));
// Telegram secret_token must be 1-256 chars of A-Z a-z 0-9 _ -
if ($secretToken !== '' && !preg_match('/^[A-Za-z0-9_-]{1,256}$/', $secretToken)) {
  $secretToken = '';
}

$qs  = $pathToken !== '' ? ('?token=' . rawurlencode($pathToken)) : '';
$url = $base . '/bot/webhook.php' . $qs;

// setWebhook
$api = "https://api.telegram.org/bot{$token}/setWebhook";
$payload = array_filter([
  'url' => $url,
  'secret_token' => ($secretToken !== '' ? $secretToken : null),
  'drop_pending_updates' => true,
], fn($v) => $v !== null);

$ch = curl_init($api);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => http_build_query($payload),
  CURLOPT_TIMEOUT => 15,
]);
$res = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

// getWebhookInfo (for verification)
$info = @file_get_contents("https://api.telegram.org/bot{$token}/getWebhookInfo");

header('Content-Type: application/json; charset=utf-8');
if ($res === false) {
  echo json_encode(['ok'=>false,'error'=>$err,'url'=>$url], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  exit;
}

$out = [
  'ok' => true,
  'setWebhook' => (json_decode($res, true) ?: $res),
  'webhook_url' => $url,
  'getWebhookInfo' => (json_decode((string)$info, true) ?: $info),
];

echo json_encode($out, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

function admin_or_key(): void {
  @session_start();
  if (!empty($_SESSION['admin_ok'])) return;

  $key = (string)($_GET['key'] ?? '');

  $allowed = array_values(array_filter([
    (string)env('BOT_WEBHOOK_KEY',''),
    (string)env('BOT_WEBHOOK_SECRET',''),
    (string)env('CRON_KEY',''),
    (string)env('INSTALL_KEY',''),
  ], fn($v)=>$v!==''));

  if ($key !== '' && in_array($key, $allowed, true)) return;

  http_response_code(403);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'Forbidden';
  exit;
}
