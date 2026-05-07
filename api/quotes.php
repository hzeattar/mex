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
$mode = $direct ? 'direct' : ($visible ? 'visible' : ($purpose === 'focus' ? 'focus' : ($fresh ? 'fresh' : 'standard')));
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
$allowLive = true;
if ($isNonCrypto) {
  $visibleLiveLimit = max(4, min(24, (int)env('QUOTES_VISIBLE_LIVE_LIMIT_NONCRYPTO', '14')));
  $isFocusRequest = ($purpose === 'focus') || $direct || $strictLive || ($fresh && count($list) <= 2);
  $isVisibleBatch = $visible && count($list) <= $visibleLiveLimit;
  $allowLive = ($isFocusRequest && count($list) <= 3 && !$visible) || $isVisibleBatch;
}
$visibleNonCrypto = $visible && $isNonCrypto;
$focusNonCrypto = $isNonCrypto && (($purpose === 'focus') || $direct || $strictLive);
$visibleChartBudget = $visibleNonCrypto ? max(0, min(10, (int)env('QUOTES_VISIBLE_CHART_FALLBACK_LIMIT_NONCRYPTO', '8'))) : 0;
$payload = qa_quote_payload($typeAlias, $list, [
  'strict_live_noncrypto' => $strictLive,
  'allow_live' => $allowLive,
  'allow_crypto_seed' => false,
  'allow_noncrypto_seed' => false,
  'direct_budget' => $visibleNonCrypto ? 0 : (($direct || $fresh) ? max(1, min(count($list), 12)) : ($visible ? min(4, count($list)) : min(6, count($list)))),
  'direct_yahoo_budget' => $visibleNonCrypto ? 0 : (($direct || $fresh || $focusNonCrypto) ? max(1, min(count($list), 3)) : min(2, count($list))),
  'chart_budget' => $typeAlias === 'crypto' ? min(8, count($list)) : ($visibleNonCrypto ? $visibleChartBudget : min(1, count($list))),
  'allow_direct_batch' => $visibleNonCrypto,
  'yahoo_ttl' => $visibleNonCrypto ? 6 : ($focusNonCrypto ? 2 : 4),
]);
$payload['mode'] = $mode;

if ($cacheTtl > 0 && qa_payload_has_coverage($payload, $typeAlias, count($list))) {
  qa_cache_write($cacheFile, $payload);
}
json_response($payload);
