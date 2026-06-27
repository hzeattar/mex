<?php
declare(strict_types=1);
// Ultra-light cache-only quote endpoint for active-symbol polling.
// Never hits upstream providers: it reads the central quote cache that the
// dedicated feed worker keeps fresh, with a market_quotes DB fallback for
// cold symbols. Designed to sit behind the nginx fastcgi micro-cache (1s)
// so all concurrent users share a single PHP execution per second.
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_central.php';
require_once __DIR__ . '/lib/quote_snapshot.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=1');

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));
$type = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
if ($type === '') $type = 'crypto';

$list = [];
foreach (explode(',', $symbolsRaw) as $sym) {
  $sym = strtoupper(trim($sym));
  if ($sym !== '' && preg_match('/^[A-Z0-9:._^=\/\-]{1,32}$/', $sym)) $list[] = $sym;
}
$list = array_slice(array_values(array_unique($list)), 0, 40);
if (!$list) {
  json_response(['ok' => false, 'error' => 'symbols required'], 400);
}

// Cache-only focus endpoint. Provider calls are handled by the feed worker;
// this request must not block on Binance/Yahoo during active chart polling.
$items = null;

// Two-tier central read. Tier 1 enforces a freshness window so a stale local
// file cache falls through to the DB (which the feed worker keeps fresh) and
// re-warms the file. Tier 2 serves the last-known price (better than '--').
$freshAge = match ($type) {
  'crypto' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_CRYPTO', '5')),
  'forex' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_FOREX', '4')),
  'commodities' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_COMMODITIES', '4')),
  'futures' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_FUTURES', '4')),
  'stocks' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_STOCKS', '5')),
  'arab' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_ARAB', '5')),
  default => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_DEFAULT', '10')),
};
$centralItems = qs_public_items(qs_snapshots($list, $type, 'spot', ['mode' => 'display']));
$items = is_array($items) ? array_merge($items, $centralItems) : $centralItems;

$stale = [];
foreach ($items as $i => $it) {
  $age = isset($it['age_sec']) && is_numeric($it['age_sec']) ? (int)$it['age_sec'] : null;
  if (!((float)($it['price'] ?? 0) > 0) || ($age !== null && $age > $freshAge)) {
    $stale[(string)($it['symbol'] ?? '')] = $i;
  }
}
if ($stale) {
  $maxAge = max($freshAge, (int)env('QUOTE_FOCUS_MAX_AGE', '900'));
  $lastKnown = quote_central_items(array_keys($stale), $type, $maxAge);
  foreach ($lastKnown as $lk) {
    $sym = (string)($lk['symbol'] ?? '');
    if ($sym !== '' && isset($stale[$sym]) && (float)($lk['price'] ?? 0) > 0) {
      $items[$stale[$sym]] = qs_public_item(qs_snapshot_from_row($sym, $type, 'spot', $lk, ['mode' => 'display']));
      unset($stale[$sym]);
    }
  }
}

// Cold-start fallback: symbols missing from central get the newest trusted
// market_quotes row (pure DB read — still no upstream calls).
$missing = [];
foreach ($items as $i => $it) {
  if (!((float)($it['price'] ?? 0) > 0)) $missing[$i] = (string)($it['symbol'] ?? '');
}
if ($missing) {
  require_once __DIR__ . '/lib/quotes.php';
  $now = time();
  foreach ($missing as $i => $sym) {
    if ($sym === '') continue;
    try {
      $q = quote_get($sym, $type);
    } catch (Throwable $e) {
      $q = null;
    }
    if (is_array($q) && (float)($q['price'] ?? 0) > 0) {
      $items[$i] = qs_public_item(qs_snapshot_from_row($sym, $type, 'spot', $q, ['mode' => 'display']));
    }
  }
}

json_response([
  'ok' => true,
  'items' => array_values($items),
  'authority' => 'central',
  'mode' => 'focus_central',
  'source' => 'central',
]);
