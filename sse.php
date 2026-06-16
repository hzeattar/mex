<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 */

// Buffer all output from includes to prevent header corruption
ob_start();

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quote_authority.php';

// Auth check (non-blocking)
$uid = 0;
try { $uid = require_auth(); } catch (Throwable $e) { /* allow anonymous */ }

// Parse params
$symbolsRaw = trim((string)($_GET['symbols'] ?? ''));
$type = strtolower(trim((string)($_GET['type'] ?? 'crypto')));
$type = function_exists('vp_normalize_asset_type') ? vp_normalize_asset_type($type ?: 'crypto') : $type;
if ($type === '' || $type === 'all') $type = 'crypto';
$scope = strtolower(trim((string)($_GET['scope'] ?? 'watchlist')));
$symbols = array_filter(array_map('strtoupper', array_map('trim', explode(',', $symbolsRaw))));
if (empty($symbols)) $symbols = ['BTCUSDT'];
$symbolLimit = $type === 'crypto'
  ? max(12, min(48, (int)env('SSE_MAX_SYMBOLS_CRYPTO', '36')))
  : max(6, min(32, (int)env('SSE_MAX_SYMBOLS_NONCRYPTO', '18')));
$symbols = array_slice($symbols, 0, $symbolLimit);

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
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'scope' => $scope, 'ts' => time()]) . "\n\n";
flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '90');
$startTime = time();
$providerType = function_exists('vp_provider_asset_type') ? vp_provider_asset_type($type) : $type;
$isWatchlist = in_array($scope, ['watchlist', 'visible', 'markets'], true);
$nonCryptoLiveLimit = max(4, min(24, (int)env('SSE_WATCHLIST_LIVE_NONCRYPTO_LIMIT', '18')));
$allowWatchlistLive = $isWatchlist && (
  $providerType === 'crypto'
  || ((int)env('SSE_ALLOW_WATCHLIST_LIVE_NONCRYPTO', '1') === 1 && count($symbols) <= $nonCryptoLiveLimit)
);
$allowLive = in_array($scope, ['focus', 'active', 'symbol'], true)
  || $allowWatchlistLive
  || (int)env('SSE_ALLOW_WATCHLIST_LIVE', '0') === 1;
$defaultInterval = $allowLive ? ($providerType === 'crypto' ? 1 : 2) : ($providerType === 'crypto' ? 2 : 5);
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
    $count = count($symbols);
    $payload = qa_quote_payload($type, $symbols, [
      'allow_live' => $allowLive,
      'allow_stale_display' => true,
      'allow_crypto_seed' => false,
      'allow_noncrypto_seed' => false,
      'ttl' => $providerType === 'crypto' ? 1 : 2,
      'yahoo_ttl' => 2,
      'massive_ttl' => 2,
      'direct_budget' => $providerType === 'crypto' ? min($count, 36) : min($count, 6),
      'direct_yahoo_budget' => $providerType === 'crypto' ? 0 : min($count, 3),
      'chart_budget' => $providerType === 'crypto' ? min($count, 12) : min($count, 4),
      'chart_budget_ms' => $providerType === 'crypto' ? 500 : 1800,
      'allow_direct_batch' => $providerType !== 'crypto',
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
