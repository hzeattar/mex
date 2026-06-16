<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 *
 * When REDIS_URL is set, subscribes to Redis pub/sub channels for
 * instantaneous price pushes. Otherwise falls back to polling the
 * central cache.
 *
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 */

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quote_authority.php';
require_once __DIR__ . '/api/lib/redis.php';

// Buffer all output from includes to prevent header corruption
ob_start();

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
$symbolSet = array_flip($symbols);

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
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'scope' => $scope, 'ts' => time(), 'mode' => redis_enabled() ? 'redis_pubsub' : 'cache_poll']) . "\n\n";
flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '90');
$startTime = time();
$lastData = '';
$liveState = [];

// Build state from central cache initially
foreach ($symbols as $sym) {
  $row = quote_central_get($sym, $type, 30);
  if ($row) $liveState[$sym] = $row;
}

function emitState(array $state): void {
  global $lastData;
  $items = [];
  foreach ($state as $sym => $row) {
    $items[] = qa_public_item_from_central($row);
  }
  $data = json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($data !== $lastData) {
    echo "data: " . $data . "\n\n";
    $lastData = $data;
    flush();
  }
}

// ── Redis Pub/Sub Mode (instant pushes) ────────────────────────────────────

if (redis_enabled()) {
  // Fork/subscribe cannot run forever; cap runtime
  $endAt = $startTime + min($maxRuntime, 90);

  $callback = function(array $data) use ($symbols, &$liveState, $endAt) {
    $sym = strtoupper($data['symbol'] ?? '');
    $t = strtolower($data['type'] ?? '');
    if (!isset($symbols[$sym])) return;
    if ($t !== $symbols['type']) return; // ignore wrong type
    if ((float)($data['price'] ?? 0) <= 0) return;

    $liveState[$sym] = $data;
    emitState($liveState);

    if (time() >= $endAt) {
      echo "event: reconnect\ndata: {\"reason\":\"timeout\"}\n\n";
      flush();
      exit;
    }
  };

  // Emit current state once
  emitState($liveState);

  // Subscribe to Redis channel(s)
  redis_subscribe_quotes($callback, [$type], $maxRuntime * 1000);
  exit;
}

// ── Fallback Polling Mode ─────────────────────────────────────────────────

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
      'direct_budget' => $providerType === 'crypto' ? min($count, 36) : min($count, 10),
      'direct_yahoo_budget' => $providerType === 'crypto' ? 0 : min($count, 5),
      'chart_budget' => $providerType === 'crypto' ? min($count, 12) : min($count, 6),
      'chart_budget_ms' => $providerType === 'crypto' ? 500 : 1200,
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

// Helper: convert central row to public item (mirrors quote_authority logic)
function qa_public_item_from_central(array $row): array {
  $type = strtolower($row['type'] ?? 'crypto');
  $src = strtolower(trim((string)($row['source'] ?? '')));
  $delayed = in_array($type, ['stocks', 'arab'], true) || ($type !== 'crypto' && str_starts_with($src, 'yahoo'));
  return [
    'symbol' => strtoupper($row['symbol'] ?? ''),
    'type' => $type,
    'price' => (float)($row['price'] ?? 0),
    'change_pct' => (float)($row['change_pct'] ?? 0),
    'open' => (float)($row['open'] ?? 0),
    'prev_close' => (float)($row['prev_close'] ?? 0),
    'updated_at' => (int)($row['central_ts'] ?? $row['updated_at'] ?? 0),
    'source' => (string)($row['source'] ?? 'central'),
    'delayed' => $delayed,
    'age_sec' => max(0, time() - (int)($row['central_ts'] ?? $row['updated_at'] ?? 0)),
  ];
}
