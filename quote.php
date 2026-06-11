<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quotes.php';
require_once __DIR__ . '/api/lib/marketdata.php';

require_method('GET');

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
if ($symbol === '') json_response(['ok'=>false,'error'=>'symbol required'], 422);

$assetType = strtolower((string)($_GET['asset_type'] ?? 'crypto'));
if ($assetType === 'fx') $assetType = 'forex';

$pdo = db();

// Best effort: use cached quote fields first
$row = quote_get($symbol, 'crypto', 'perp');

$ttl = (int)env('PERP_QUOTE_TTL', '10');
$now = time();
$fresh = $row && (int)($row['updated_at'] ?? 0) > 0 && ($now - (int)$row['updated_at']) <= $ttl;

if (!$fresh) {
  try {
    $perp = binance_futures_mark_price($symbol);
    // Keep spot price updated too
    $spot = null;
    try { $spot = quote_price_fresh($symbol, $assetType); } catch (Throwable $e) { $spot = null; }
    $price = ($spot !== null) ? (float)$spot : (float)($row['price'] ?? 0);
    $chg = (float)($row['change_pct'] ?? 0);
    $perp['market'] = 'perp';
    quote_upsert($symbol, 'crypto', $price, $chg, $now, $perp);
    $row = quote_get($symbol, 'crypto', 'perp') ?: $row;
  } catch (Throwable $e) {
    // Ignore upstream failures; return whatever cached data we have.
  }
}

$out = [
  'ok' => true,
  'symbol' => $symbol,
  'price' => (float)($row['price'] ?? 0),
  'change_pct' => (float)($row['change_pct'] ?? 0),
  'mark_price' => isset($row['mark_price']) ? (float)$row['mark_price'] : null,
  'index_price' => isset($row['index_price']) ? (float)$row['index_price'] : null,
  'funding_rate' => isset($row['funding_rate']) ? (float)$row['funding_rate'] : null,
  'next_funding_time' => isset($row['next_funding_time']) ? (int)$row['next_funding_time'] : null,
  'updated_at' => (int)($row['updated_at'] ?? 0),
];

json_response($out);
