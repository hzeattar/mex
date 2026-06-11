<?php
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';

function cron_input_token_cr(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $arg) {
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}
$token = cron_input_token_cr();
if ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token)) {
  http_response_code(403);
  echo 'Forbidden';
  exit;
}
header('Content-Type: application/json; charset=utf-8');
$dir = realpath(__DIR__ . '/../data/cache');
$deleted = 0;
if ($dir && is_dir($dir)) {
  foreach (glob($dir . '/*.json') ?: [] as $file) {
    if (@unlink($file)) $deleted++;
  }
}
echo json_encode(['ok'=>true,'deleted'=>$deleted,'dir'=>$dir], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
