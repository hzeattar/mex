<?php
// Error explorer (JSON)
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';

// --- simple auth ---
$k = (string)($_GET['key'] ?? '');
$allowed = array_values(array_filter([
  (string)env('DEBUG_KEY',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
  (string)env('BOT_WEBHOOK_KEY',''),
  (string)env('BOT_WEBHOOK_SECRET',''),
], fn($v)=>$v!=='' ));
if ($k === '' || !in_array($k, $allowed, true)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$limit = (int)($_GET['limit'] ?? 250);
$limit = max(20, min(2000, $limit));

$logPath = (string)(ini_get('error_log') ?: (defined('TP_PHP_ERROR_LOG') ? TP_PHP_ERROR_LOG : (__DIR__ . '/../data/php_errors.log')));

function tail_lines(string $path, int $lines): array {
  if (!is_file($path) || !is_readable($path)) return [];
  $fp = fopen($path, 'rb');
  if (!$fp) return [];
  $buf = '';
  $chunk = 8192;
  fseek($fp, 0, SEEK_END);
  $pos = ftell($fp);
  $need = $lines + 1;
  while ($pos > 0 && $need > 0) {
    $read = ($pos - $chunk) < 0 ? $pos : $chunk;
    $pos -= $read;
    fseek($fp, $pos);
    $data = fread($fp, $read);
    if ($data === false) break;
    $buf = $data . $buf;
    $need = $lines - substr_count($buf, "\n");
  }
  fclose($fp);
  $arr = preg_split('/\r?\n/', trim($buf));
  if (!$arr) return [];
  return array_slice($arr, -$lines);
}

$out = tail_lines($logPath, $limit);
json_response([
  'ok' => true,
  'log_path' => $logPath,
  'lines' => $out,
]);
