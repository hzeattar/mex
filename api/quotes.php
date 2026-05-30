<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_cache_policy.php';

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
$typeAlias = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
if ($typeAlias === '') $typeAlias = 'crypto';
$fresh = ((int)($_GET['fresh'] ?? $_GET['force_fresh'] ?? 0) === 1);
$direct = ((int)($_GET['direct'] ?? 0) === 1);
$visible = ((int)($_GET['visible'] ?? 0) === 1);
$strictLive = ((int)($_GET['strict_live'] ?? 0) === 1);
$list = qa_parse_symbols($symbolsRaw);

function quotes_focus_cache_max_age(string $assetType): int {
  $assetType = vp_normalize_asset_type($assetType);
  return match ($assetType) {
    'forex' => max(300, min(14400, (int)env('QUOTES_FOCUS_CACHE_SECONDS_FOREX', '900'))),
    'commodities', 'futures' => max(300, min(14400, (int)env('QUOTES_FOCUS_CACHE_SECONDS_MARKET_HOURS', '900'))),
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

function quotes_degraded_payload(string $typeAlias, array $list, bool $allowLive = true): array {
  $typeAlias = vp_normalize_asset_type($typeAlias);
  if ($typeAlias === '' || $typeAlias === 'all') $typeAlias = 'crypto';
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
          'commodities', 'futures', 'arab' => min($count, 3),
          'forex' => min($count, 2),
          default => min($count, 2),
        };
        $chartBudgetMs = max(600, min(3500, (int)env('QUOTES_FAST_CHART_FALLBACK_MS_NONCRYPTO', '2200')));
      }
      $live = quote_bulk_live($list, $typeAlias, [], [
        'ttl' => $isCrypto ? 1 : 2,
        'yahoo_ttl' => 2,
        'massive_ttl' => 2,
        'persist' => false,
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
  foreach ($list as $sym) {
    $sym = strtoupper((string)$sym);
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    $price = (float)($row['price'] ?? 0);
    $source = (string)($row['source'] ?? $row['provider'] ?? 'unavailable');
    $sourceLc = strtolower($source);
    $delayed = !empty($row['delayed']) || in_array($typeAlias, ['stocks','arab'], true) || ($typeAlias !== 'crypto' && str_starts_with($sourceLc, 'yahoo'));
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
      'timing_class' => $price > 0 ? ($delayed ? 'delayed' : 'live') : 'unavailable',
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
$cacheOnly = ((int)($_GET['cache_only'] ?? 0) === 1) || ($purpose === 'watchlist');
$mode = $cacheOnly ? 'cache_only' : ($direct ? 'direct' : ($visible ? 'visible' : ($purpose === 'focus' ? 'focus' : ($fresh ? 'fresh' : 'standard'))));
$cacheKey = json_encode([$typeAlias, $list, $mode], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$cacheFile = qa_cache_file('quotes_api', $cacheKey);
$cacheTtl = qa_quotes_cache_ttl($typeAlias, $mode, count($list));
$validator = function(array $payload) use ($typeAlias, $list): bool {
  return qa_payload_has_coverage($payload, $typeAlias, count($list));
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
  $purpose === 'watchlist' ||
  ($purpose === 'focus' && count($list) <= 12)
);
if ($isUiFastPath) {
  $fastAllowLive = !$cacheOnly && !$visible && $purpose === 'focus';
  $fastPayload = quotes_degraded_payload($typeAlias, $list, $fastAllowLive);
  $fastPayload['mode'] = $fastAllowLive ? 'focus_fast' : 'cache_fast';
  $fastPayload['cache_first'] = true;
  if ($cacheTtl > 0 && qa_payload_has_coverage($fastPayload, $typeAlias, count($list))) {
    qa_cache_write($cacheFile, $fastPayload);
  }
  json_response($fastPayload);
}

$isNonCrypto = ($typeAlias !== 'crypto');
$isFocusRequest = $isNonCrypto && ($purpose === 'focus') && !$fresh && !$direct && !$strictLive && count($list) <= 3;
if ($isFocusRequest) {
  try {
    $quickPayload = qa_quote_payload($typeAlias, $list, [
      'allow_live' => false,
      'allow_crypto_seed' => false,
      'allow_noncrypto_seed' => false,
      'allow_stale_display' => true,
    ]);
  } catch (Throwable $e) {
    $quickPayload = quotes_degraded_payload($typeAlias, $list, false);
  }
  if (quotes_focus_cache_payload_usable($quickPayload, $typeAlias, count($list))) {
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
    'strict_live_noncrypto' => $strictLive,
    'allow_live' => $allowLive,
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => $visible || $cacheOnly,
    'direct_budget' => ($visibleNonCrypto || $focusNonCrypto) ? 0 : (($direct || $fresh) ? max(1, min(count($list), 12)) : ($visible ? min(4, count($list)) : min(6, count($list)))),
    'direct_yahoo_budget' => ($visibleNonCrypto || $focusNonCrypto) ? 0 : (($direct || $fresh) ? max(1, min(count($list), 3)) : min(2, count($list))),
    'chart_budget' => $typeAlias === 'crypto' ? min(8, count($list)) : ($visibleNonCrypto ? $visibleChartBudget : ($focusNonCrypto ? 0 : min(1, count($list)))),
    'chart_budget_ms' => $visibleNonCrypto ? max(300, min(2000, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_MS_NONCRYPTO', '700'))) : 3000,
    'allow_direct_batch' => $visibleNonCrypto,
    'yahoo_ttl' => $visibleNonCrypto ? 6 : ($focusNonCrypto ? 2 : 4),
  ]);
} catch (Throwable $e) {
  $payload = quotes_degraded_payload($typeAlias, $list, $allowLive && !$cacheOnly);
}
$payload['mode'] = $mode;

if ($cacheTtl > 0 && qa_payload_has_coverage($payload, $typeAlias, count($list))) {
  qa_cache_write($cacheFile, $payload);
}
json_response($payload);
