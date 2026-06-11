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

// maxAge=0 → serve the last known central price at any age (age_sec is
// reported per item; the frontend rejects regressions on its own).
$maxAge = max(0, (int)env('QUOTE_FOCUS_MAX_AGE', '0'));
$items = quote_central_items($list, $type, $maxAge);

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
