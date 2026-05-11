<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 */

// Buffer all output from includes to prevent header corruption
ob_start();

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_authority.php';

// Auth check (non-blocking)
$uid = 0;
try { $uid = require_auth(); } catch (Throwable $e) { /* allow anonymous */ }

// Parse params
$symbolsRaw = trim((string)($_GET['symbols'] ?? ''));
$type = strtolower(trim((string)($_GET['type'] ?? 'crypto')));
$symbols = array_filter(array_map('strtoupper', array_map('trim', explode(',', $symbolsRaw))));
if (empty($symbols)) $symbols = ['BTCUSDT'];
$symbols = array_slice($symbols, 0, 20);

// CRITICAL: Clean any buffered output before sending SSE headers
ob_end_clean();

// SSE headers - must be sent CLEAN
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

// Disable output buffering completely
@ini_set('output_buffering', '0');
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
if (function_exists('apache_setenv')) {
  @apache_setenv('no-gzip', '1');
}
while (ob_get_level() > 0) @ob_end_flush();

// Send initial connection event
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'ts' => time()]) . "\n\n";
flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '55');
$startTime = time();
$interval = max(1, (int)env('SSE_INTERVAL', '1'));
$lastData = '';

while (true) {
  if ((time() - $startTime) >= $maxRuntime) {
    echo "event: reconnect\ndata: {\"reason\":\"timeout\"}\n\n";
    flush();
    break;
  }

  if (connection_aborted()) break;

  try {
    $payload = qa_quote_payload($type, $symbols, [
      'allow_live' => true,
      'allow_crypto_seed' => true,
      'allow_noncrypto_seed' => true,
    ]);

    $data = json_encode($payload['items'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($data !== $lastData) {
      echo "data: " . $data . "\n\n";
      $lastData = $data;
    } else {
      echo ": heartbeat\n\n";
    }
    flush();
  } catch (Throwable $e) {
    echo "event: error\ndata: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
    flush();
  }

  sleep($interval);
}
