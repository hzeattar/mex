<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_cache_policy.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: application/json; charset=utf-8');

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
    'forex' => max(30, min(900, (int)env('QUOTES_FOCUS_CACHE_SECONDS_FOREX', '180'))),
    'commodities', 'futures' => max(30, min(900, (int)env('QUOTES_FOCUS_CACHE_SECONDS_MARKET_HOURS', '240'))),
    'stocks', 'arab' => max(120, min(7200, (int)env('QUOTES_FOCUS_CACHE_SECONDS_DELAYED', '1200'))),
    default => max(10, min(300, (int)env('QUOTES_FOCUS_CACHE_SECONDS_OTHER', '60'))),
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
    $updatedAt = (int)($item['updated_at'] ?? 0);
    if ($updatedAt <= 0 || (time() - $updatedAt) > $maxAge) continue;
    $valid++;
  }
  return $valid >= min($requestedCount, max(1, (int)ceil($requestedCount * 0.75)));
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
    json_response(['ok' => false, 'error' => $e->getMessage()], 500);
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

$isNonCrypto = ($typeAlias !== 'crypto');
$isFocusRequest = $isNonCrypto && ($purpose === 'focus') && !$fresh && !$direct && !$strictLive && count($list) <= 3;
if ($isFocusRequest) {
  $quickPayload = qa_quote_payload($typeAlias, $list, [
    'allow_live' => false,
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => true,
  ]);
  if (quotes_focus_cache_payload_usable($quickPayload, $typeAlias, count($list))) {
    $quickPayload['mode'] = 'focus_cache';
    $quickPayload['cache_first'] = true;
    json_response($quickPayload);
  }
}
$allowLive = true;
if ($isNonCrypto) {
  $isLiveFocusRequest = ($purpose === 'focus') || $direct || $strictLive || ($fresh && count($list) <= 2);
  $allowLive = !$cacheOnly && ($isLiveFocusRequest && count($list) <= 3 && !$visible);
}
$visibleNonCrypto = $visible && $isNonCrypto;
$focusNonCrypto = $isNonCrypto && (($purpose === 'focus') || $direct || $strictLive);
$visibleChartBudget = ($visibleNonCrypto && !$cacheOnly) ? max(0, min(4, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_LIMIT_NONCRYPTO', '0'))) : 0;
$payload = qa_quote_payload($typeAlias, $list, [
  'strict_live_noncrypto' => $strictLive,
  'allow_live' => $allowLive,
  'allow_crypto_seed' => false,
  'allow_noncrypto_seed' => false,
  'allow_stale_display' => $isNonCrypto && ($visible || $cacheOnly),
  'direct_budget' => $visibleNonCrypto ? 0 : (($direct || $fresh) ? max(1, min(count($list), 12)) : ($visible ? min(4, count($list)) : min(6, count($list)))),
  'direct_yahoo_budget' => $visibleNonCrypto ? 0 : (($direct || $fresh || $focusNonCrypto) ? max(1, min(count($list), 3)) : min(2, count($list))),
  'chart_budget' => $typeAlias === 'crypto' ? min(8, count($list)) : ($visibleNonCrypto ? $visibleChartBudget : min(1, count($list))),
  'chart_budget_ms' => $visibleNonCrypto ? max(300, min(2000, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_MS_NONCRYPTO', '700'))) : 3000,
  'allow_direct_batch' => $visibleNonCrypto,
  'yahoo_ttl' => $visibleNonCrypto ? 6 : ($focusNonCrypto ? 2 : 4),
]);
$payload['mode'] = $mode;

if ($cacheTtl > 0 && qa_payload_has_coverage($payload, $typeAlias, count($list))) {
  qa_cache_write($cacheFile, $payload);
}
json_response($payload);
