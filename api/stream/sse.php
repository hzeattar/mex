<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 *
 * Streams price updates every ~1 second.
 */

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_authority.php';

// Auth check (optional - allow unauthenticated for now, can restrict later)
$uid = 0;
try { $uid = require_auth(); } catch (Throwable $e) { /* allow anonymous for price feed */ }

// Parse params
$symbolsRaw = trim((string)($_GET['symbols'] ?? ''));
$type = strtolower(trim((string)($_GET['type'] ?? 'crypto')));
$symbols = array_filter(array_map('strtoupper', array_map('trim', explode(',', $symbolsRaw))));
if (empty($symbols)) $symbols = ['BTCUSDT'];
$symbols = array_slice($symbols, 0, 20); // Max 20 symbols per stream

// SSE headers
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');
header('Access-Control-Allow-Origin: *');

// Disable output buffering
@ini_set('output_buffering', '0');
@ini_set('zlib.output_compression', '0');
if (function_exists('apache_setenv')) {
  @apache_setenv('no-gzip', '1');
}
while (ob_get_level() > 0) ob_end_flush();

// Send initial connection event
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'ts' => time()]) . "\n\n";
@ob_flush(); @flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '55'); // Railway may kill after 60s
$startTime = time();
$interval = max(1, (int)env('SSE_INTERVAL', '1')); // seconds between pushes
$lastData = '';

while (true) {
  // Check runtime limit
  if ((time() - $startTime) >= $maxRuntime) {
    echo "event: reconnect\ndata: {\"reason\":\"timeout\"}\n\n";
    @ob_flush(); @flush();
    break;
  }

  // Check if client disconnected
  if (connection_aborted()) break;

  try {
    $payload = qa_quote_payload($type, $symbols, [
      'allow_live' => true,
      'allow_crypto_seed' => true,
      'allow_noncrypto_seed' => true,
    ]);

    $data = json_encode($payload['items'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    // Only send if data changed
    if ($data !== $lastData) {
      echo "data: " . $data . "\n\n";
      $lastData = $data;
    } else {
      // Send heartbeat every few cycles to keep connection alive
      echo ": heartbeat\n\n";
    }
    @ob_flush(); @flush();
  } catch (Throwable $e) {
    echo "event: error\ndata: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
    @ob_flush(); @flush();
  }

  sleep($interval);
}
