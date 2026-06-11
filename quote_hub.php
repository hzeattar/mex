<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/market_resolver.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));
$type = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
$market = strtolower(trim((string)($_GET['market'] ?? '')));
$scope = strtolower(trim((string)($_GET['scope'] ?? 'ui')));
$visible = (int)($_GET['visible'] ?? 0) === 1;
$focus = (int)($_GET['focus'] ?? 0) === 1;
$force = (int)($_GET['force'] ?? 0) === 1;

if ($type === '' || $type === 'all') {
  json_response(['ok' => false, 'error' => 'type_required'], 400);
}

$list = [];
if ($symbolsRaw !== '') {
  foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $s) {
    $s = strtoupper(trim((string)$s));
    if ($s !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $s)) {
      $list[] = $s;
    }
  }
}
$list = array_values(array_unique($list));
if (!$list) {
  json_response(['ok' => true, 'items' => [], 'count' => 0, 'type' => $type, 'market' => $market]);
}

if ($market === '') {
  $market = in_array($type, ['crypto','futures'], true) ? 'perp' : 'spot';
}
$market = ($market === 'perp' && in_array($type, ['crypto','futures'], true)) ? 'perp' : 'spot';

$nowTs = time();
$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);

$single = count($list) === 1;
$batchCount = count($list);
$singleFocus = $single && ($focus || in_array($scope, ['active_trade','trade_watch','trade_drawer','stream_bridge','visible_batch'], true));

$cacheTtl = match($type) {
  'crypto' => ($single ? 1 : 1),
  'forex' => ($single ? 2 : 3),
  'commodities' => ($single ? 2 : 3),
  'futures' => ($single ? 2 : 3),
  'stocks', 'arab' => ($single ? 3 : 4),
  default => 2,
};
if ($singleFocus && $type !== 'crypto') $cacheTtl = min($cacheTtl, 1);
if ($force) $cacheTtl = 0;

$cacheKeyList = $list;
sort($cacheKeyList);
$cacheKey = sha1(json_encode([
  'quote_hub',
  $type,
  $market,
  $scope,
  $visible ? 1 : 0,
  $focus ? 1 : 0,
  $cacheKeyList,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
$cacheFile = $cacheDir . '/quote_hub_' . $cacheKey . '.json';

$readCache = static function(string $file, int $ttlSec): ?array {
  if ($ttlSec <= 0 || !is_file($file)) return null;
  $age = time() - (int)@filemtime($file);
  if ($age < 0 || $age > $ttlSec) return null;
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return null;
  $decoded = json_decode((string)$raw, true);
  return is_array($decoded) ? $decoded : null;
};
$writeCache = static function(string $file, array $payload): void {
  try {
    @file_put_contents($file, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  } catch (Throwable $e) {}
};
$symbolMeta = static function(array $symbols): array {
  $metaBySymbol = [];
  if (!$symbols) return $metaBySymbol;
  try {
    $marks = implode(',', array_fill(0, count($symbols), '?'));
    $st = db()->prepare("SELECT symbol, meta FROM markets WHERE symbol IN ($marks)");
    $st->execute($symbols);
    foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
      $sym = strtoupper((string)($row['symbol'] ?? ''));
      if ($sym === '') continue;
      $metaBySymbol[$sym] = market_meta($row['meta'] ?? null);
    }
  } catch (Throwable $e) {}
  return $metaBySymbol;
};
$normalizeItem = static function(string $sym, string $type, string $market, ?array $row, int $nowTs): ?array {
  if (!is_array($row)) return null;
  $price = (float)($row['price'] ?? $row['last'] ?? $row['mark_price'] ?? 0);
  if (!($price > 0)) return null;
  $updatedAt = (int)($row['updated_at'] ?? $row['ts'] ?? $row['time'] ?? 0);
  if ($updatedAt <= 0) $updatedAt = $nowTs;
  return [
    'symbol' => $sym,
    'type' => $type,
    'market' => $market,
    'price' => $price,
    'change_pct' => (float)($row['change_pct'] ?? $row['changePct'] ?? 0),
    'updated_at' => $updatedAt,
    'source' => (string)($row['source'] ?? $row['provider'] ?? ''),
  ];
};
$warmRowUsable = static function(?array $row, string $assetType, int $nowTs, bool $strict = false): bool {
  if (!is_array($row)) return false;
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  if ($assetType === 'crypto') return true;
  $src = strtolower(trim((string)($row['source'] ?? '')));
  if (!quote_source_is_liveish($src, $assetType)) return false;
  $updatedAt = (int)($row['updated_at'] ?? 0);
  if ($updatedAt <= 0) return false;
  $age = max(0, $nowTs - $updatedAt);
  $maxAge = match($assetType) {
    'forex' => ($strict ? 7 : 12),
    'commodities' => ($strict ? 6 : 10),
    'futures' => ($strict ? 7 : 12),
    'stocks', 'arab' => ($strict ? 9 : 16),
    default => ($strict ? 8 : 14),
  };
  return $age <= $maxAge;
};

if (!$force) {
  $cached = $readCache($cacheFile, $cacheTtl);
  if (is_array($cached)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($cached, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
  }
}

$sfKey = 'quote_hub_' . $cacheKey;
$haveFlight = quote_singleflight($sfKey, in_array($type, ['stocks','arab'], true) ? 3 : 2);
if (!$haveFlight && !$force) {
  $stale = $readCache($cacheFile, max(2, $cacheTtl + 3));
  if (is_array($stale)) {
    $stale['stale'] = true;
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($stale, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
  }
}

$metaBySymbol = $symbolMeta($list);
$warmBySymbol = [];
foreach ($list as $sym) {
  try {
    $row = quote_get($sym, $type);
    if (is_array($row)) $warmBySymbol[$sym] = $row;
  } catch (Throwable $e) {}
}

$allowDirectBatch = !$force
  ? ($visible && !$single && $batchCount <= (in_array($type, ['forex','commodities','futures'], true) ? 6 : 5))
  : false;
$directBudget = 0;
$chartBudget = 0;
if ($type === 'crypto') {
  $directBudget = 0;
  $chartBudget = 0;
} elseif ($singleFocus) {
  $directBudget = 1;
  $chartBudget = in_array($type, ['commodities','forex'], true) ? 1 : 0;
} elseif ($single) {
  $directBudget = 1;
  $chartBudget = in_array($type, ['commodities','forex'], true) ? 1 : 0;
} elseif ($allowDirectBatch) {
  $directBudget = min($batchCount, in_array($type, ['forex','commodities'], true) ? 4 : 3);
  $chartBudget = in_array($type, ['commodities','forex'], true) ? 1 : 0;
}

$liveMap = [];
try {
  $liveMap = quote_bulk_live($list, $type, $metaBySymbol, [
    'ttl' => $type === 'crypto' ? 1 : 1,
    'yahoo_ttl' => 1,
    'massive_ttl' => 1,
    'eodhd_ttl' => in_array($type, ['stocks','arab'], true) ? 2 : 1,
    'direct_budget' => $directBudget,
    'direct_yahoo_budget' => $directBudget,
    'chart_budget' => $chartBudget,
    'allow_direct_batch' => $allowDirectBatch,
  ]);
} catch (Throwable $e) {
  $liveMap = [];
}

$items = [];
$liveCount = 0;
$warmCount = 0;
$strictWarm = $single || $singleFocus || $focus || $force || $visible;
foreach ($list as $sym) {
  $chosen = null;
  $live = is_array($liveMap[$sym] ?? null) ? $liveMap[$sym] : null;
  $normLive = $normalizeItem($sym, $type, $market, $live, $nowTs);
  if ($normLive) {
    $chosen = $normLive;
    $liveCount++;
    try {
      quote_upsert_from_read_path($sym, $type, (float)$normLive['price'], (float)$normLive['change_pct'], (int)$normLive['updated_at'], [
        'source' => (string)$normLive['source'],
      ]);
    } catch (Throwable $e) {}
  }
  if (!$chosen) {
    $warm = is_array($warmBySymbol[$sym] ?? null) ? $warmBySymbol[$sym] : null;
    if ($warmRowUsable($warm, $type, $nowTs, $strictWarm)) {
      $chosen = $normalizeItem($sym, $type, $market, $warm, $nowTs);
      if ($chosen) $warmCount++;
    }
  }
  if (!$chosen && $type === 'crypto') {
    $warm = is_array($warmBySymbol[$sym] ?? null) ? $warmBySymbol[$sym] : null;
    $chosen = $normalizeItem($sym, $type, $market, $warm, $nowTs);
    if ($chosen) $warmCount++;
  }
  if ($chosen) $items[] = $chosen;
}

$payload = [
  'ok' => true,
  'type' => $type,
  'market' => $market,
  'scope' => $scope,
  'visible' => $visible,
  'focus' => $focus,
  'force' => $force,
  'count' => count($items),
  'requested' => count($list),
  'live_count' => $liveCount,
  'warm_count' => $warmCount,
  'items' => $items,
];

$writeCache($cacheFile, $payload);
json_response($payload);
