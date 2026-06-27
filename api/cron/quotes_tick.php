<?php
/**
 * Cron: market quotes refresh (crypto live + simulated markets).
 *
 * Call via cron:
 *   GET /api/cron/quotes_tick.php?token=CRON_KEY
 *
 * Recommended schedule: every 1-5 minutes.
 */
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';

// Keep this cron responsive on shared hosting
@ignore_user_abort(true);
@set_time_limit((int)env('QUOTES_TICK_MAX_EXEC', '25'));


// Single-instance lock (prevents overlapping cron runs causing SQLite "database is locked")
$locksDir = __DIR__ . '/../data/locks';
if (!is_dir($locksDir)) @mkdir($locksDir, 0775, true);
$lockFp = @fopen($locksDir . '/quotes_tick.lock', 'c+');
if ($lockFp) {
  if (!flock($lockFp, LOCK_EX | LOCK_NB)) {
    // Another run is still in progress.
    // IMPORTANT: never output a blank page (it confuses hosting cron + Monitor).
    // Locked is not a failure; it means the previous run is still working.
    $out = ['ok'=>true,'locked'=>true,'busy'=>true,'ts'=>time()];
    try { tp_status_write('quotes_tick', $out); } catch (Throwable $e) {}
    try { tp_log('cron','WARN','quotes_tick_locked', $out); } catch (Throwable $e) {}
    json_response($out);
  }
}

require_once __DIR__ . '/../lib/quotes.php';

function cron_input_token_qt(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      return $arg;
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}

$token = cron_input_token_qt();
// Trusted in-container warmer: the startup script runs this via CLI with
// CRON_LOCAL_RUN=1 set in the container environment. External HTTP requests
// cannot set that env var, so this bypass is local-only and lets the bundled
// warmer run even when no external CRON_KEY is configured.
$cliLocal = (PHP_SAPI === 'cli') && (trim((string)getenv('CRON_LOCAL_RUN')) === '1');
if (!$cliLocal && ($token === '' || !hash_equals((string)env('CRON_KEY', ''), $token))) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

require_once __DIR__ . '/../lib/quote_central.php';

$refreshCrypto = (int)($_GET['crypto'] ?? 1) === 1;

try {
  $res = quotes_tick($refreshCrypto);
  $out = ['ok'=>true] + $res;
  try { tp_status_write('quotes_tick', $out); } catch (Throwable $e) {}
  try { tp_log('cron','INFO','quotes_tick', $res); } catch (Throwable $e) {}
  json_response($out);
} catch (Throwable $e) {
  $out = ['ok'=>false,'error'=>'quotes_tick_failed','message'=>$e->getMessage(),'ts'=>time()];
  try { tp_status_write('quotes_tick', $out); } catch (Throwable $e2) {}
  try { tp_log('cron','ERROR','quotes_tick_failed', $out); } catch (Throwable $e2) {}
  json_response($out);
}
