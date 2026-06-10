<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 *
 * Reads from central cache ONLY — never hits upstream providers.
 * The prices_feed_worker.php is the single source of truth for upstream access.
 */

// Buffer all output from includes to prevent header corruption
ob_start();

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_central.php';
require_once __DIR__ . '/../lib/quote_authority.php';

// Auth check (non-blocking)
$uid = 0;
try { $uid = require_auth(); } catch (Throwable $e) { /* allow anonymous */ }

// Parse params
$symbolsRaw = trim((string)($_GET['symbols'] ?? ''));
$type = strtolower(trim((string)($_GET['type'] ?? 'crypto')));
$scope = strtolower(trim((string)($_GET['scope'] ?? 'watchlist')));
$symbols = array_filter(array_map('strtoupper', array_map('trim', explode(',', $symbolsRaw))));
if (empty($symbols)) $symbols = ['BTCUSDT'];
$symbols = array_slice($symbols, 0, 20);

// Check if central cache is warm enough to serve as primary source
$useCentral = quote_central_is_warm($type);

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
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'scope' => $scope, 'ts' => time(), 'source' => $useCentral ? 'central' : 'legacy']) . "\n\n";
flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '55');
$startTime = time();
$providerType = function_exists('vp_provider_asset_type') ? vp_provider_asset_type($type) : $type;
// Central cache allows faster intervals since we never hit upstream
$defaultInterval = $useCentral
  ? ($providerType === 'crypto' ? 1 : 2)   // Fast: read from cache only
  : ($providerType === 'crypto' ? 4 : 8);   // Legacy: slower to avoid upstream pressure
$interval = max(1, (int)env('SSE_INTERVAL', (string)$defaultInterval));
$lastData = '';

while (true) {
  if ((time() - $startTime) >= $maxRuntime) {
    echo "event: reconnect\ndata: {\"reason\":\"timeout\"}\n\n";
    flush();
    break;
  }

  if (connection_aborted()) break;

  try {
    $items = [];

    if ($useCentral) {
      // ── Central cache path: FAST, no upstream hits ──
      $items = quote_central_items($symbols, $type, 60);
    } else {
      // ── Legacy fallback: only if central cache is cold ──
      $allowLive = in_array($scope, ['focus', 'active', 'symbol'], true) || (int)env('SSE_ALLOW_WATCHLIST_LIVE', '0') === 1;
      $payload = qa_quote_payload($type, $symbols, [
        'allow_live' => $allowLive,
        'allow_stale_display' => true,
        'allow_crypto_seed' => false,
        'allow_noncrypto_seed' => false,
      ]);
      $items = $payload['items'] ?? [];
      // Re-check if central is warm now (worker may have started)
      $useCentral = quote_central_is_warm($type);
      if ($useCentral) {
        $interval = max(1, (int)env('SSE_INTERVAL', (string)($providerType === 'crypto' ? 1 : 2)));
      }
    }

    $data = json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

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
