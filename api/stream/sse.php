<?php
declare(strict_types=1);
/**
 * Server-Sent Events endpoint for real-time price streaming.
 * GET /api/stream/sse.php?symbols=BTCUSDT,ETHUSDT&type=crypto
 *
 * Optimized: event-driven loop with fast crypto checks, delta updates,
 * and immediate push when prices change (no fixed sleep for crypto).
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

$isFirstTick = true;
$lastPrices = []; // symbol => price for delta detection

// Send initial connection event
echo "event: connected\ndata: " . json_encode(['symbols' => $symbols, 'type' => $type, 'scope' => $scope, 'ts' => time(), 'snapshot' => true]) . "\n\n";
flush();

$maxRuntime = (int)env('SSE_MAX_RUNTIME', '55');
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

// Faster intervals for more responsive streaming
$defaultInterval = $allowLive ? ($providerType === 'crypto' ? 1 : 3) : ($providerType === 'crypto' ? 2 : 4);
$interval = max(1, (int)env('SSE_INTERVAL', (string)$defaultInterval));

$lastData = '';
$tickCount = 0;

while (true) {
  if ((time() - $startTime) >= $maxRuntime) {
    echo "event: reconnect\ndata: {\"reason\":\"timeout\"}\n\n";
    flush();
    break;
  }

  if (connection_aborted()) break;

  $tickCount++;

  try {
    // Non-crypto watchlist without live: send heartbeat only at interval
    if ($providerType !== 'crypto' && $isWatchlist && !$allowLive) {
      echo ": noncrypto-watchlist-polling\n\n";
      flush();
      sleep($interval);
      continue;
    }

    // For crypto: use micro-polling between full ticks to detect changes faster
    // This reads from file cache only (no upstream) so it's very cheap
    if ($providerType === 'crypto' && !$isFirstTick && $tickCount > 1 && function_exists('binance_price_cached')) {
      $microChanged = false;
      $microItems = [];
      try {
        $now = time();
        foreach ($symbols as $sym) {
          $prevPrice = isset($lastPrices[$sym]) ? (float)$lastPrices[$sym] : 0;
          try {
            $p = (float)binance_price_cached($sym, 1);
            if ($p > 0 && $prevPrice > 0 && abs($p - $prevPrice) / max(0.0001, $prevPrice) > 0.000001) {
              $microChanged = true;
              $microItems[] = [
                'symbol' => $sym,
                'type' => $type,
                'price' => $p,
                'change_pct' => 0,
                'updated_at' => $now,
                'source' => 'binance',
                'delta' => true,
              ];
              $lastPrices[$sym] = $p;
            }
          } catch (Throwable $me) {}
        }
      } catch (Throwable $e) {}

      if ($microChanged && !empty($microItems)) {
        echo "event: delta\ndata: " . json_encode($microItems, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n\n";
        flush();
      }
    }

    // Full tick: fetch authoritative quotes from all providers
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

    $items = $payload['items'] ?? [];

    // Track prices for delta detection
    foreach ($items as $item) {
      $sym = (string)($item['symbol'] ?? '');
      $p = (float)($item['price'] ?? 0);
      if ($sym !== '' && $p > 0) {
        $lastPrices[$sym] = $p;
      }
    }

    $data = json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($isFirstTick) {
      // First tick: always send as snapshot
      echo "event: snapshot\ndata: " . $data . "\n\n";
      $lastData = $data;
      $isFirstTick = false;
    } elseif ($data !== $lastData) {
      // Subsequent: detect which symbols changed and send only deltas
      $prevItems = [];
      $prevRaw = json_decode($lastData, true);
      if (is_array($prevRaw)) {
        foreach ($prevRaw as $pi) {
          $psym = (string)($pi['symbol'] ?? '');
          if ($psym !== '') $prevItems[$psym] = $pi;
        }
      }
      $deltas = [];
      foreach ($items as $item) {
        $sym = (string)($item['symbol'] ?? '');
        $prev = $prevItems[$sym] ?? null;
        if (!$prev) {
          $deltas[] = $item; // new symbol
        } else {
          $prevPrice = (float)($prev['price'] ?? 0);
          $curPrice = (float)($item['price'] ?? 0);
          $prevChange = (float)($prev['change_pct'] ?? 0);
          $curChange = (float)($item['change_pct'] ?? 0);
          // Check if price or change_pct meaningfully changed
          if ($prevPrice !== $curPrice || $prevChange !== $curChange) {
            $deltas[] = $item;
          }
        }
      }
      if (!empty($deltas)) {
        echo "event: delta\ndata: " . json_encode($deltas, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n\n";
      } else {
        echo ": heartbeat\n\n";
      }
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
