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

// Two-tier central read. Tier 1 enforces a freshness window so a stale local
// file cache falls through to the DB (which the feed worker keeps fresh) and
// re-warms the file. Tier 2 serves the last-known price (better than '--').
$freshAge = match ($type) {
  'crypto' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_CRYPTO', '8')),
  'forex' => max(5, (int)env('QUOTE_FOCUS_FRESH_AGE_FOREX', '20')),
  default => max(10, (int)env('QUOTE_FOCUS_FRESH_AGE_DEFAULT', '90')),
};
$items = quote_central_items($list, $type, $freshAge);

$stale = [];
foreach ($items as $i => $it) {
  if (!((float)($it['price'] ?? 0) > 0)) $stale[(string)($it['symbol'] ?? '')] = $i;
}
if ($stale) {
  $maxAge = max($freshAge, (int)env('QUOTE_FOCUS_MAX_AGE', '900'));
  $lastKnown = quote_central_items(array_keys($stale), $type, $maxAge);
  foreach ($lastKnown as $lk) {
    $sym = (string)($lk['symbol'] ?? '');
    if ($sym !== '' && isset($stale[$sym]) && (float)($lk['price'] ?? 0) > 0) {
      $items[$stale[$sym]] = $lk;
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
      $upd = (int)($q['updated_at'] ?? 0);
      $items[$i] = [
        'symbol' => $sym,
        'type' => $type,
        'price' => (float)$q['price'],
        'change_pct' => (float)($q['change_pct'] ?? 0),
        'updated_at' => $upd,
        'provider_updated_at' => (int)($q['provider_ts'] ?? $upd),
        'received_at' => (int)($q['received_at'] ?? 0),
        'ingested_at' => (int)($q['ingested_at'] ?? 0),
        'cache_updated_at' => $upd,
        'source' => (string)($q['source'] ?? 'cache'),
        'delayed' => $type !== 'crypto',
        'timing_class' => $type !== 'crypto' ? 'delayed' : 'live',
        'age_sec' => $upd > 0 ? max(0, $now - $upd) : null,
      ];
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
