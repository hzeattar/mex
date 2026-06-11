<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();

// Redirects to a Telegram file URL for proof viewing.
// Proofs may come from different bots (main/pay/support/affiliate),
// so we try multiple tokens.

$fileId = (string)($_GET['file_id'] ?? '');
$fileId = trim($fileId);
if ($fileId === '') {
  http_response_code(400);
  echo 'Missing file_id';
  exit;
}

// Try tokens in priority order.
$tokens = array_values(array_unique(array_filter([
  (string)env('BOT_TOKEN', ''),
  (string)env('TELEGRAM_BOT_TOKEN', ''),
  (string)env('SUPPORT_BOT_TOKEN', ''),
  (string)env('AFF_BOT_TOKEN', ''),
], fn($v)=>is_string($v) && trim($v) !== '')));

if (!$tokens) {
  http_response_code(500);
  echo 'No Telegram bot token configured';
  exit;
}

foreach ($tokens as $token) {
  $url = "https://api.telegram.org/bot{$token}/getFile";
  $ctx = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => "Content-Type: application/json\r\n",
      'content' => json_encode(['file_id'=>$fileId]),
      'timeout' => 10,
    ]
  ]);

  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false) continue;
  $json = json_decode($raw, true);
  if (!is_array($json) || !($json['ok'] ?? false)) continue;

  $path = (string)($json['result']['file_path'] ?? '');
  if ($path === '') continue;

  $dl = "https://api.telegram.org/file/bot{$token}/{$path}";
  header('Location: '.$dl, true, 302);
  exit;
}

http_response_code(404);
echo 'File not found for any configured bot token';
exit;
