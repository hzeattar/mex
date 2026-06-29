<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_central.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_cache_policy.php';
require_once __DIR__ . '/lib/quote_snapshot.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: application/json; charset=utf-8');

$GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
  'connect_timeout' => max(1, min(3, (int)env('QUOTES_UPSTREAM_CONNECT_TIMEOUT', '1'))),
  'timeout' => max(2, min(5, (int)env('QUOTES_UPSTREAM_TIMEOUT', '2'))),
  'retries' => max(0, min(1, (int)env('QUOTES_UPSTREAM_RETRIES', '0'))),
];

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));

// Support per-symbol types via CSV or arrays, matched 1:1 with symbols.
$typesRaw = $_GET['types'] ?? ($_GET['type'] ?? '');
$resolvedTypes = [];
if (is_array($typesRaw)) {
  foreach ($typesRaw as $i => $v) {
    $resolvedTypes[$i] = vp_normalize_asset_type(trim((string)$v)) ?: 'crypto';
  }
} elseif (is_string($typesRaw) && trim($typesRaw) !== '') {
  $resolvedTypes = preg_split('/\s*,\s*/', trim($typesRaw));
  // Strip empty values and normalize
  $resolvedTypes = array_values(array_filter(array_map(static fn($v) => vp_normalize_asset_type(trim($v)) ?: '', $resolvedTypes)));
}

$typeAlias = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
if ($typeAlias === '') $typeAlias = 'crypto';

// If caller supplied multiple per-symbol types, route through the mixed-type path.
if ($resolvedTypes && count(array_unique($resolvedTypes)) > 1) {
  $typeAlias = 'all';
} elseif ($resolvedTypes && count($resolvedTypes) === 1) {
  $typeAlias = $resolvedTypes[0];
}
$fresh = ((int)($_GET['fresh'] ?? $_GET['force_fresh'] ?? 0) === 1);
$direct = ((int)($_GET['direct'] ?? 0) === 1);
$visible = ((int)($_GET['visible'] ?? 0) === 1);
$strictLive = ((int)($_GET['strict_live'] ?? 0) === 1);
$list = qa_parse_symbols($symbolsRaw);

// ── Central cache fast path ──────────────────────────────────────────────
// When the feed worker is running and the central cache is warm, serve ALL
// standard quote requests directly from cache — never hit upstream.
// This is the default path for 99% of requests.
$centralWarm = $typeAlias === 'all' ? true : quote_central_is_warm($typeAlias);
$bypassCentral = $fresh || $direct || $strictLive; // explicit upstream request

if ($centralWarm && !$bypassCentral && $list) {
  $items = qs_public_items(qs_snapshots($list, $typeAlias, 'spot', ['mode' => 'display']));
  $hasCoverage = qa_payload_has_coverage(['items' => $items], $typeAlias, count($list));
  if ($hasCoverage) {
    json_response([
      'ok' => true,
      'items' => $items,
      'authority' => 'central',
      'mode' => 'cache_only',
      'source' => 'central',
    ]);
  }
  // If central cache has insufficient coverage, fall through to legacy path
}

// ── Fresh/strict_live fast path ──────────────────────────────────────────
// Even "fresh" requests can be served from the central cache when the feed
// worker has updated the symbol within its own refresh cadence — going
// upstream cannot return anything newer than what the worker just wrote,
// it only adds 1-3s of provider latency. Tight per-type freshness windows
// keep this honest: crypto refreshes every ~3s, forex/commodities ~15s.
if ($centralWarm && $bypassCentral && $list) {
  $freshWindow = match ($typeAlias) {
    'crypto' => max(2, min(30, (int)env('QUOTES_FRESH_CENTRAL_MAX_AGE_CRYPTO', '8'))),
    'forex', 'commodities', 'futures' => max(5, min(120, (int)env('QUOTES_FRESH_CENTRAL_MAX_AGE_FOREX', '25'))),
    default => max(10, min(300, (int)env('QUOTES_FRESH_CENTRAL_MAX_AGE_OTHER', '60'))),
  };
  $items = qs_public_items(qs_snapshots($list, $typeAlias, 'spot', ['mode' => 'display']));
  $liveItems = array_values(array_filter($items, static function ($it) use ($freshWindow) {
    return (float)($it['price'] ?? 0) > 0 && (int)($it['age_sec'] ?? PHP_INT_MAX) <= $freshWindow;
  }));
  if (count($liveItems) === count($list)) {
    json_response([
      'ok' => true,
      'items' => $items,
      'authority' => 'central',
      'mode' => 'central_fresh',
      'source' => 'central',
    ]);
  }
  // Cache not fresh enough for this symbol set — fall through to upstream
}

function quotes_focus_cache_max_age(string $assetType): int {
  $assetType = vp_normalize_asset_type($assetType);
  return match ($assetType) {
    'forex' => max(30, min(1800, (int)env('QUOTES_FOCUS_CACHE_SECONDS_FOREX', '120'))),
    'commodities', 'futures' => max(60, min(3600, (int)env('QUOTES_FOCUS_CACHE_SECONDS_MARKET_HOURS', '300'))),
    'stocks', 'arab' => max(600, min(43200, (int)env('QUOTES_FOCUS_CACHE_SECONDS_DELAYED', '1800'))),
    default => max(180, min(3600, (int)env('QUOTES_FOCUS_CACHE_SECONDS_OTHER', '600'))),
  };
}

function quotes_focus_cache_payload_usable(array $payload, string $assetType, int $requestedCount): bool {
  if (!qa_payload_has_coverage($payload, $assetType, $requestedCount)) return false;
  $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
  if (!$items) return false;
  $maxAge = quotes_focus_cache_max_age($assetType);
  $valid = 0;
  foreach ($items as $item) {
    $price = (float)($item['price'] ?? 0);
    $source = strtolower(trim((string)($item['source'] ?? '')));
    if (!($price > 0) || quote_source_is_untrusted($source)) continue;
    $cacheAt = 0;
    foreach (['cache_updated_at', 'received_at', 'ingested_at', 'updated_at'] as $key) {
      if (!isset($item[$key]) || !is_numeric($item[$key])) continue;
      $ts = (int)$item[$key];
      if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
      if ($ts > $cacheAt) $cacheAt = $ts;
    }
    if ($cacheAt <= 0 || (time() - $cacheAt) > $maxAge) continue;
    $valid++;
  }
  return $valid >= min($requestedCount, max(1, (int)ceil($requestedCount * 0.75)));
}

function quotes_daily_change_rescue(string $symbol, string $assetType, array $meta = []): ?float {
  if ($assetType === 'crypto') return null;
  if (!function_exists('quote_yahoo_enabled') || !quote_yahoo_enabled()) return null;
  if (!function_exists('yahoo_ticker_for_market') || !function_exists('yahoo_chart_candles')) return null;
  $ticker = yahoo_ticker_for_market($symbol, $assetType, $meta);
  if (!$ticker) return null;
  try {
    $candles = yahoo_chart_candles($ticker, '1d', 8);
  } catch (Throwable $e) {
    return null;
  }
  $closes = [];
  foreach ((array)$candles as $candle) {
    if (!is_array($candle)) continue;
    $close = $candle['close'] ?? null;
    if (is_numeric($close) && (float)$close > 0) $closes[] = (float)$close;
  }
  if (count($closes) < 2) return null;
  $last = (float)end($closes);
  for ($i = count($closes) - 2; $i >= 0; $i--) {
    $prev = (float)$closes[$i];
    if ($prev <= 0) continue;
    $change = (($last - $prev) / $prev) * 100.0;
    return abs($change) > 20.0 ? null : $change;
  }
  return null;
}

function quotes_group_symbols_by_resolved_type(array $list, array $resolvedTypes = []): array {
  $symbols = array_values(array_unique(array_filter(array_map(static function($sym) {
    $sym = strtoupper(trim((string)$sym));
    return $sym !== '' ? $sym : '';
  }, $list))));
  if (!$symbols) return [];

  $metaRows = [];
  try {
    if (function_exists('qa_market_meta_by_symbols')) $metaRows = qa_market_meta_by_symbols($symbols);
  } catch (Throwable $e) {
    $metaRows = [];
  }

  $groups = [];
  foreach ($symbols as $idx => $sym) {
    if ($resolvedTypes[$idx] ?? null) {
      $assetType = $resolvedTypes[$idx];
    } else {
      $assetType = vp_normalize_asset_type((string)($metaRows[$sym]['type'] ?? ''));
      if ($assetType === '' || $assetType === 'all') $assetType = 'crypto';
    }
    $groups[$assetType][] = $sym;
  }
  return $groups;
}

function quotes_degraded_payload(string $typeAlias, array $list, bool $allowLive = true): array {
  $typeAlias = vp_normalize_asset_type($typeAlias);
  if ($typeAlias === 'all') {
    $bySymbol = [];
    foreach (quotes_group_symbols_by_resolved_type($list, $resolvedTypes) as $assetType => $groupSymbols) {
      $payload = quotes_degraded_payload($assetType, $groupSymbols, $allowLive);
      foreach ((array)($payload['items'] ?? []) as $row) {
        if (!is_array($row)) continue;
        $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
        if ($sym !== '') $bySymbol[$sym] = $row;
      }
    }
    $ordered = [];
    foreach ($list as $sym) {
      $sym = strtoupper(trim((string)$sym));
      if ($sym === '') continue;
      if (isset($bySymbol[$sym])) $ordered[] = $bySymbol[$sym];
    }
    return [
      'ok' => true,
      'items' => $ordered,
      'authority' => 'quote_authority',
      'degraded' => true,
      'mixed_types' => true,
    ];
  }
  if ($typeAlias === '') $typeAlias = 'crypto';
  $metaRows = function_exists('qa_market_meta_by_symbols') ? qa_market_meta_by_symbols($list) : [];
  $live = [];
  if ($allowLive && $list) {
    try {
      $count = count($list);
      $isCrypto = ($typeAlias === 'crypto');
      $chartBudget = 0;
      $chartBudgetMs = 0;
      if (!$isCrypto) {
        $chartBudget = match ($typeAlias) {
          'stocks' => min($count, 4),
          'arab' => min($count, max(3, min(12, (int)env('QUOTES_FAST_CHART_FALLBACK_ARAB', '8')))),
          'commodities', 'futures' => min($count, 3),
          'forex' => min($count, 2),
          default => min($count, 2),
        };
        $chartBudgetMs = $typeAlias === 'arab'
          ? max(1800, min(7000, (int)env('QUOTES_FAST_CHART_FALLBACK_MS_ARAB', '5000')))
          : max(600, min(3500, (int)env('QUOTES_FAST_CHART_FALLBACK_MS_NONCRYPTO', '2200')));
      }
      $live = quote_bulk_live($list, $typeAlias, [], [
        'ttl' => $isCrypto ? 1 : 2,
        'yahoo_ttl' => 2,
        'massive_ttl' => 2,
        'persist' => $allowLive && ((int)env('READ_ENDPOINTS_PERSIST_QUOTES', '0') === 1),
        'direct_budget' => min($count, $isCrypto ? 12 : 0),
        'direct_yahoo_budget' => (!$isCrypto && $count === 1) ? 1 : 0,
        'chart_budget' => $chartBudget,
        'chart_budget_ms' => $chartBudgetMs,
        'allow_direct_batch' => !$isCrypto && $chartBudget > 0,
      ]);
    } catch (Throwable $e) {
      $live = [];
    }
  }

  $items = [];
  $changeRescueBudget = $typeAlias === 'crypto' ? 0 : max(0, min(8, (int)env('QUOTES_CHANGE_RESCUE_BUDGET', '6')));
  foreach ($list as $sym) {
    $sym = strtoupper((string)$sym);
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    if (!$row) {
      // Fast UI paths must still return warmed DB/cache prices. The previous
      // cache-only branch returned coverage with price=0, so mobile lists looked
      // dead even when market_quotes had valid prices.
      try {
        $cachedRow = quote_get($sym, $typeAlias);
        $cachedSource = is_array($cachedRow) ? (string)($cachedRow['source'] ?? $cachedRow['provider'] ?? '') : '';
        if (
          is_array($cachedRow)
          && (float)($cachedRow['price'] ?? 0) > 0
          && !quote_source_is_untrusted($cachedSource)
          && !(function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($sym, $typeAlias, (string)($cachedRow['source'] ?? $cachedRow['provider'] ?? '')))
        ) {
          $row = $cachedRow;
        }
      } catch (Throwable $e) {}
    }
    if (!$row && $typeAlias !== 'crypto' && (int)env('QUOTES_REFERENCE_SEED_FALLBACK', '0') === 1) {
      $seed = (float)($metaRows[$sym]['seed_price'] ?? 0);
      if ($seed > 0) {
        $row = [
          'symbol' => $sym,
          'type' => $typeAlias,
          'price' => $seed,
          'change_pct' => 0.0,
          'updated_at' => time(),
          'source' => 'seed_price',
          'timing_class' => 'seed',
        ];
      }
    }
    $price = (float)($row['price'] ?? 0);
    if ($price > 0 && $changeRescueBudget > 0 && abs((float)($row['change_pct'] ?? 0.0)) < 0.0000001) {
      $rescuedChange = quotes_daily_change_rescue($sym, $typeAlias, is_array($metaRows[$sym] ?? null) ? $metaRows[$sym] : []);
      $changeRescueBudget--;
      if ($rescuedChange !== null) $row['change_pct'] = $rescuedChange;
    }
    $source = (string)($row['source'] ?? $row['provider'] ?? 'unavailable');
    $sourceLc = strtolower($source);
    $delayed = !empty($row['delayed']) || in_array($typeAlias, ['stocks','arab'], true) || ($typeAlias !== 'crypto' && str_starts_with($sourceLc, 'yahoo'));
    $timing = (string)($row['timing_class'] ?? '');
    if ($price > 0 && $timing === '') {
      $timing = str_contains($sourceLc, 'seed') ? 'seed' : ($delayed ? 'delayed' : 'live');
    }
    $items[] = [
      'symbol' => $sym,
      'type' => $typeAlias,
      'price' => $price > 0 ? $price : 0.0,
      'change_pct' => (float)($row['change_pct'] ?? 0),
      'updated_at' => $price > 0 ? (int)($row['updated_at'] ?? time()) : 0,
      'provider_updated_at' => $price > 0 ? (int)($row['provider_ts'] ?? $row['updated_at'] ?? time()) : 0,
      'received_at' => $price > 0 ? (int)($row['received_at'] ?? time()) : 0,
      'ingested_at' => $price > 0 ? (int)($row['ingested_at'] ?? time()) : 0,
      'cache_updated_at' => $price > 0 ? (int)($row['received_at'] ?? $row['ingested_at'] ?? time()) : 0,
      'source' => $price > 0 ? ($source !== '' ? $source : 'provider_live') : 'unavailable',
      'delayed' => $delayed,
      'timing_class' => $price > 0 ? ($timing !== '' ? $timing : ($delayed ? 'delayed' : 'live')) : 'unavailable',
      'age_sec' => $price > 0 ? 0 : null,
    ];
  }

  return [
    'ok' => true,
    'items' => $items,
    'authority' => 'quote_authority',
    'degraded' => true,
  ];
}

function quotes_item_has_display_price($row): bool {
  if (!is_array($row)) return false;
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  $timing = strtolower(trim((string)($row['timing_class'] ?? '')));
  return $source !== 'unavailable' && $timing !== 'unavailable';
}

function quotes_payload_has_all_display_prices(array $payload, array $list): bool {
  $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
  if (!$items && $list) return false;
  $wanted = [];
  foreach ($list as $sym) {
    $sym = strtoupper(trim((string)$sym));
    if ($sym !== '') $wanted[$sym] = false;
  }
  if (!$wanted) return true;
  foreach ($items as $row) {
    if (!is_array($row)) continue;
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if (!array_key_exists($sym, $wanted)) continue;
    if (quotes_item_has_display_price($row)) $wanted[$sym] = true;
  }
  foreach ($wanted as $ok) {
    if (!$ok) return false;
  }
  return true;
}

function quotes_fill_missing_display_prices(array $payload, string $typeAlias, array $list): array {
  if (quotes_payload_has_all_display_prices($payload, $list)) return $payload;
  $fallback = quotes_degraded_payload($typeAlias, $list, false);
  $fallbackBySymbol = [];
  foreach ((array)($fallback['items'] ?? []) as $row) {
    if (!is_array($row)) continue;
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if ($sym !== '' && quotes_item_has_display_price($row)) $fallbackBySymbol[$sym] = $row;
  }
  if (!$fallbackBySymbol) return $payload;

  $itemsBySymbol = [];
  foreach ((array)($payload['items'] ?? []) as $row) {
    if (!is_array($row)) continue;
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if ($sym !== '') $itemsBySymbol[$sym] = $row;
  }

  $rescued = 0;
  $ordered = [];
  foreach ($list as $sym) {
    $sym = strtoupper(trim((string)$sym));
    if ($sym === '') continue;
    $row = is_array($itemsBySymbol[$sym] ?? null) ? $itemsBySymbol[$sym] : null;
    if (!quotes_item_has_display_price($row) && is_array($fallbackBySymbol[$sym] ?? null)) {
      $row = $fallbackBySymbol[$sym];
      $row['rescued_from_cache'] = true;
      $rescued++;
    }
    if (is_array($row)) $ordered[] = $row;
  }

  if ($ordered) $payload['items'] = $ordered;
  if ($rescued > 0) {
    $payload['rescued_count'] = (int)($payload['rescued_count'] ?? 0) + $rescued;
    $payload['cache_rescue'] = true;
  }
  return $payload;
}

function quotes_apply_snapshot_shape(array $payload, string $typeAlias): array {
  $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
  if (!$items) return $payload;
  $out = [];
  foreach ($items as $row) {
    if (!is_array($row)) continue;
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if ($sym === '') continue;
    $assetType = vp_normalize_asset_type((string)($row['type'] ?? $typeAlias));
    if ($assetType === '' || $assetType === 'all') $assetType = $typeAlias ?: 'crypto';
    $market = (string)($row['market'] ?? 'spot');
    $out[] = qs_public_item(qs_snapshot_from_row($sym, $assetType, $market, $row, ['mode' => 'display']));
  }
  $payload['items'] = $out;
  return $payload;
}

if (!$list) {
  try {
    $pdo = db();
    $flags = function_exists('quote_cols_flags') ? quote_cols_flags() : ['source' => false];
    $sel = 'q.symbol,q.type,q.price,q.change_pct,q.updated_at';
    $sel .= !empty($flags['source']) ? ',q.source' : ",'' AS source";
    $sql = "SELECT {$sel} FROM market_quotes q JOIN markets m ON m.symbol=q.symbol WHERE m.status='active'";
    if ($typeAlias && $typeAlias !== 'all') {
      $sql .= ' AND q.type=' . $pdo->quote($typeAlias);
    }
    $sql .= ' ORDER BY q.updated_at DESC LIMIT 200';
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
    json_response(['ok' => true, 'items' => $rows, 'authority' => 'quote_authority']);
  } catch (Throwable $e) {
    json_response(['ok' => true, 'items' => [], 'authority' => 'quote_authority', 'degraded' => true]);
  }
}

$purpose = strtolower(trim((string)($_GET['purpose'] ?? '')));
$cacheOnly = ((int)($_GET['cache_only'] ?? 0) === 1);
$isWatchlistRequest = ($purpose === 'watchlist') || ($visible && $purpose !== 'focus');
$mode = $cacheOnly ? 'cache_only' : ($direct ? 'direct' : ($visible ? 'visible' : ($purpose === 'focus' ? 'focus' : ($fresh ? 'fresh' : 'standard'))));
$cacheKey = json_encode([$typeAlias, $list, $mode], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$cacheFile = qa_cache_file('quotes_api', $cacheKey);
$cacheTtl = qa_quotes_cache_ttl($typeAlias, $mode, count($list));
$validator = function(array $payload) use ($typeAlias, $list): bool {
  return qa_payload_has_coverage($payload, $typeAlias, count($list))
    && quotes_payload_has_all_display_prices($payload, $list);
};

if (!$fresh) {
  $cached = qa_cache_read($cacheFile, $cacheTtl, $validator);
  if ($cached !== null) {
    echo json_encode($cached, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
  }
}

$isUiFastPath = !$fresh && !$direct && !$strictLive && (
  $cacheOnly ||
  $visible ||
  $purpose === 'watchlist'
);
if ($isUiFastPath) {
  $focusLiveFast = (int)env('QUOTES_FOCUS_LIVE_FAST', '0') === 1;
  $watchlistLiveCrypto = !$cacheOnly && $isWatchlistRequest && $typeAlias === 'crypto';
  $watchlistNonCryptoLimit = match ($typeAlias) {
    'arab' => max(12, min(30, (int)env('QUOTES_WATCHLIST_LIVE_ARAB_LIMIT', '20'))),
    'commodities', 'futures' => max(8, min(20, (int)env('QUOTES_WATCHLIST_LIVE_MARKET_HOURS_LIMIT', '12'))),
    default => max(1, min(10, (int)env('QUOTES_WATCHLIST_LIVE_NONCRYPTO_LIMIT', '6'))),
  };
  // OPTIMIZED: Skip live fetch for non-crypto watchlist to improve speed
  // Use cached prices instead of waiting for slow EODHD/Yahoo responses
  $nonCryptoMarketOpen = !function_exists('qa_market_is_open') || qa_market_is_open($typeAlias);
  $watchlistLiveNonCrypto = !$cacheOnly
    && $isWatchlistRequest
    && $typeAlias !== 'crypto'
    && $nonCryptoMarketOpen
    && count($list) <= $watchlistNonCryptoLimit
    && (int)env('QUOTES_WATCHLIST_LIVE_NONCRYPTO', '0') === 1; // Changed from '1' to '0' to disable by default
  $fastAllowLive = ($focusLiveFast && !$cacheOnly && !$visible && $purpose === 'focus')
    || $watchlistLiveCrypto
    || $watchlistLiveNonCrypto;
  // For focus requests, prefer central cache (fast) over live upstream (slow)
  if ($purpose === 'focus' && !$cacheOnly) {
    $fastAllowLive = false;
  }
  $fastPayload = quotes_degraded_payload($typeAlias, $list, $fastAllowLive);
  $fastPayload = quotes_apply_snapshot_shape($fastPayload, $typeAlias);
  $fastPayload['mode'] = $fastAllowLive ? ($isWatchlistRequest ? 'watchlist_live_fast' : 'focus_fast') : 'cache_fast';
  $fastPayload['cache_first'] = true;
  $fastPayload['live_count'] = count(array_filter($fastPayload['items'] ?? [], static function($row): bool {
    $src = strtolower(trim((string)($row['source'] ?? '')));
    return (float)($row['price'] ?? 0) > 0 && !quote_source_is_untrusted($src);
  }));
  if ($cacheTtl > 0 && qa_payload_has_coverage($fastPayload, $typeAlias, count($list))) {
    qa_cache_write($cacheFile, $fastPayload);
  }
  json_response($fastPayload);
}

$isNonCrypto = ($typeAlias !== 'crypto');
$focusCacheFirst = (int)env('QUOTES_FOCUS_CACHE_FIRST_NONCRYPTO', '1') === 1;
$isFocusRequest = $focusCacheFirst && $isNonCrypto && ($purpose === 'focus') && !$fresh && !$direct && !$strictLive && count($list) <= 5;
if ($isFocusRequest) {
  try {
    $quickPayload = qa_quote_payload($typeAlias, $list, [
      'allow_live' => true,
      'allow_crypto_seed' => false,
      'allow_noncrypto_seed' => false,
      'allow_stale_display' => true,
    ]);
  } catch (Throwable $e) {
    $quickPayload = quotes_degraded_payload($typeAlias, $list, false);
  }
  if (quotes_focus_cache_payload_usable($quickPayload, $typeAlias, count($list))) {
    $quickPayload = quotes_apply_snapshot_shape($quickPayload, $typeAlias);
    $quickPayload['mode'] = 'focus_cache';
    $quickPayload['cache_first'] = true;
    json_response($quickPayload);
  }
}
$allowLive = true;
if ($cacheOnly) {
  $allowLive = false;
}
if ($isNonCrypto) {
  $isLiveFocusRequest = ($purpose === 'focus') || $direct || $strictLive || ($fresh && count($list) <= 2);
  $allowLive = !$cacheOnly && ($isLiveFocusRequest && count($list) <= 3 && !$visible);
}
$visibleNonCrypto = $visible && $isNonCrypto;
$focusNonCrypto = $isNonCrypto && (($purpose === 'focus') || $direct || $strictLive);
$visibleChartBudget = ($visibleNonCrypto && !$cacheOnly) ? max(0, min(4, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_LIMIT_NONCRYPTO', '0'))) : 0;
try {
  $payload = qa_quote_payload($typeAlias, $list, [
    'strict_live_noncrypto' => $strictLive || $focusNonCrypto,
    'allow_live' => $allowLive,
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => $visible || $cacheOnly,
    'direct_budget' => $visibleNonCrypto ? 0 : (($focusNonCrypto && count($list) <= 1) ? 0 : (($direct || $fresh) ? max(1, min(count($list), 12)) : ($visible ? min(4, count($list)) : min(6, count($list))))),
    'direct_yahoo_budget' => $visibleNonCrypto ? 0 : (($focusNonCrypto && count($list) <= 1) ? 0 : (($direct || $fresh) ? max(1, min(count($list), 3)) : min(2, count($list)))),
    'chart_budget' => $typeAlias === 'crypto' ? min(8, count($list)) : ($visibleNonCrypto ? $visibleChartBudget : ($focusNonCrypto ? 0 : min(1, count($list)))),
    'chart_budget_ms' => $visibleNonCrypto ? max(300, min(2000, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_MS_NONCRYPTO', '700'))) : ($focusNonCrypto ? 0 : 3000),
    'allow_direct_batch' => false,
    'yahoo_ttl' => $visibleNonCrypto ? 6 : ($focusNonCrypto ? 1 : 4),
  ]);
} catch (Throwable $e) {
  $payload = quotes_degraded_payload($typeAlias, $list, $allowLive && !$cacheOnly);
}
if (!$focusNonCrypto) {
  $payload = quotes_fill_missing_display_prices($payload, $typeAlias, $list);
}
$payload = quotes_apply_snapshot_shape($payload, $typeAlias);
$payload['mode'] = $mode;

if ($cacheTtl > 0 && qa_payload_has_coverage($payload, $typeAlias, count($list))) {
  qa_cache_write($cacheFile, $payload);
}
json_response($payload);
