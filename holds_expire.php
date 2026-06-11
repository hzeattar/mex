<?php
/**
 * Cron: expire holds (prevent stale reserved balances).
 *
 * Call via cron:
 *   GET /api/cron/holds_expire.php?token=CRON_KEY
 *
 * Recommended schedule: every 5-15 minutes.
 */
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/ledger.php';

function cron_input_token_he(): string {
  $web = trim((string)($_GET['token'] ?? $_GET['key'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      if (str_starts_with($arg, 'key=')) return trim(substr($arg, 4));
      if (str_starts_with($arg, '--key=')) return trim(substr($arg, 6));
      return $arg;
    }
  }
  return '';
}

$token = cron_input_token_he();
if ($token === '' || !hash_equals((string)env('CRON_KEY', ''), $token)) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

$count = hold_expire_tick();
$payload = ['ok'=>true,'expired'=>$count,'ts'=>time()];
try { tp_status_write('holds_expire', $payload); } catch (Throwable $e) {}
try { tp_log('cron','INFO','holds_expire', ['expired'=>$count]); } catch (Throwable $e) {}
json_response($payload);
