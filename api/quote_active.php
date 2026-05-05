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
$visible = (int)($_GET['visible'] ?? 0) === 1;
$scope = strtolower(trim((string)($_GET['scope'] ?? 'active')));
$focus = (int)($_GET['focus'] ?? 0) === 1;

if ($type === '' || $type === 'all') {
  json_response(['ok' => false, 'error' => 'type_required'], 400);
}

$list = [];
if ($symbolsRaw !== '') {
  foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $s) {
    $s = strtoupper(trim((string)$s));
    if ($s !== '' && preg_match('/^[A-Z0-9:._\-]{2,32}$/', $s)) $list[] = $s;
  }
}
$list = array_values(array_unique($list));
if (!$list) json_response(['ok' => true, 'items' => [], 'count' => 0, 'type' => $type, 'market' => $market]);
if (count($list) > 8) $list = array_slice($list, 0, 8);
if ($market === '') $market = in_array($type, ['crypto','futures'], true) ? 'perp' : 'spot';
$market = ($market === 'perp' && in_array($type, ['crypto','futures'], true)) ? 'perp' : 'spot';

$nowTs = time();
$single = count($list) === 1;
$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
$cacheKeyList = $list;
sort($cacheKeyList);
$cacheKey = sha1(json_encode(['quote_active', $type, $market, $scope, $visible ? 1 : 0, $focus ? 1 : 0, $cacheKeyList], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
$cacheFile = $cacheDir . '/quote_active_' . $cacheKey . '.json';
$cacheTtl = $single ? 0 : 1;
if ($cacheTtl > 0 && is_file($cacheFile)) {
  $age = time() - (int)@filemtime($cacheFile);
  if ($age >= 0 && $age <= $cacheTtl) {
    $raw = @file_get_contents($cacheFile);
    if ($raw !== false && $raw !== '') {
      header('Content-Type: application/json; charset=utf-8');
      echo $raw;
      exit;
    }
  }
}

$metaBySymbol = [];
try {
  $marks = implode(',', array_fill(0, count($list), '?'));
  $st = db()->prepare("SELECT symbol, meta FROM markets WHERE symbol IN ($marks)");
  $st->execute($list);
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $sym = strtoupper((string)($row['symbol'] ?? ''));
    if ($sym === '') continue;
    $metaBySymbol[$sym] = market_meta($row['meta'] ?? null);
  }
} catch (Throwable $e) {}

$warmBySymbol = [];
foreach ($list as $sym) {
  try {
    $row = quote_get($sym, $type);
    if (is_array($row)) $warmBySymbol[$sym] = $row;
  } catch (Throwable $e) {}
}

$buildItem = static function(string $sym, ?array $row, string $type, string $market, int $nowTs): ?array {
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

$warmUsable = static function(?array $row, string $assetType, int $nowTs): bool {
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
    'forex' => 10,
    'commodities' => 8,
    'futures' => 10,
    'stocks', 'arab' => 14,
    default => 12,
  };
  return $age <= $maxAge;
};

$directRow = static function(string $sym, string $type, array $meta, ?array $warm, int $nowTs): ?array {
  $chg = is_array($warm) ? (float)($warm['change_pct'] ?? 0) : 0.0;

  if ($type !== 'crypto' && quote_provider_prefers_eodhd($type, $meta, $sym)) {
    try {
      $eSym = eodhd_symbol_for_market($sym, $type, $meta);
      if ($eSym) {
        $live = eodhd_quote_realtime_cached($eSym, 1);
        if (is_array($live) && (float)($live['price'] ?? 0) > 0) {
          return [
            'symbol' => $sym,
            'type' => $type,
            'price' => (float)$live['price'],
            'change_pct' => (float)($live['change_pct'] ?? $chg),
            'updated_at' => $nowTs,
            'source' => 'eodhd_live',
          ];
        }
      }
    } catch (Throwable $e) {}
  }

  if ($type !== 'crypto') {
    try {
      $ySym = yahoo_ticker_for_market($sym, $type, $meta) ?: $sym;
      if ($ySym) {
        $live = yahoo_live_quote_or_chart($ySym, '1m');
        if (is_array($live) && (float)($live['price'] ?? 0) > 0) {
          return [
            'symbol' => $sym,
            'type' => $type,
            'price' => (float)$live['price'],
            'change_pct' => (float)($live['change_pct'] ?? $chg),
            'updated_at' => $nowTs,
            'source' => (string)($live['source'] ?? 'yahoo_chart_live'),
          ];
        }
      }
    } catch (Throwable $e) {}
  }

  if ($type !== 'crypto' && (vp_provider_asset_type($type) === 'forex' || (vp_provider_asset_type($type) === 'commodities' && vp_is_spot_metal_symbol($sym, $type)))) {
    try {
      $mSym = massive_market_ticker($sym, $type, $meta);
      if ($mSym) {
        $bulk = massive_snapshot_many_cached([$mSym], 1);
        $row = is_array($bulk[$mSym] ?? null) ? $bulk[$mSym] : null;
        if ($row && (float)($row['price'] ?? 0) > 0) {
          return [
            'symbol' => $sym,
            'type' => $type,
            'price' => (float)$row['price'],
            'change_pct' => (float)($row['change_pct'] ?? $chg),
            'updated_at' => $nowTs,
            'source' => 'massive_live',
          ];
        }
      }
    } catch (Throwable $e) {}
  }

  try {
    $p = (float)quote_fetch_external($sym, $type, $meta);
    if ($p > 0) {
      return [
        'symbol' => $sym,
        'type' => $type,
        'price' => $p,
        'change_pct' => $chg,
        'updated_at' => $nowTs,
        'source' => 'provider_live',
      ];
    }
  } catch (Throwable $e) {}

  return null;
};

$liveMap = [];
if (!$single) {
  try {
    $liveMap = quote_bulk_live($list, $type, $metaBySymbol, [
      'ttl' => 1,
      'yahoo_ttl' => 1,
      'massive_ttl' => 1,
      'eodhd_ttl' => 1,
      'direct_budget' => count($list),
      'direct_yahoo_budget' => count($list),
      'chart_budget' => min(2, count($list)),
      'allow_direct_batch' => true,
    ]);
  } catch (Throwable $e) {
    $liveMap = [];
  }
}

$items = [];
$liveCount = 0;
foreach ($list as $sym) {
  $warm = is_array($warmBySymbol[$sym] ?? null) ? $warmBySymbol[$sym] : null;
  $meta = is_array($metaBySymbol[$sym] ?? null) ? $metaBySymbol[$sym] : [];
  $live = $single ? null : (is_array($liveMap[$sym] ?? null) ? $liveMap[$sym] : null);
  $normLive = $buildItem($sym, $live, $type, $market, $nowTs);
  if (!$normLive || !(float)($normLive['price'] ?? 0) > 0 || ($type !== 'crypto' && !quote_source_is_liveish((string)($normLive['source'] ?? ''), $type))) {
    $normLive = $buildItem($sym, $directRow($sym, $type, $meta, $warm, $nowTs), $type, $market, $nowTs);
  }
  if ($normLive && (float)($normLive['price'] ?? 0) > 0) {
    $items[] = $normLive;
    $liveCount++;
    try {
      quote_upsert_from_read_path($sym, $type, (float)$normLive['price'], (float)($normLive['change_pct'] ?? 0), (int)($normLive['updated_at'] ?? $nowTs), ['source' => (string)($normLive['source'] ?? 'provider_live')]);
    } catch (Throwable $e) {}
    continue;
  }
  $normWarm = $buildItem($sym, $warm, $type, $market, $nowTs);
  if ($warmUsable($warm, $type, $nowTs) && $normWarm) {
    $items[] = $normWarm;
    continue;
  }
  $items[] = [
    'symbol' => $sym,
    'type' => $type,
    'market' => $market,
    'price' => 0.0,
    'change_pct' => 0.0,
    'updated_at' => 0,
    'source' => 'unavailable',
  ];
}

$out = [
  'ok' => true,
  'items' => $items,
  'count' => count($items),
  'type' => $type,
  'market' => $market,
  'live_count' => $liveCount,
  'authority' => 'active',
];
$json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($cacheTtl > 0 && $json !== false) {
  @file_put_contents($cacheFile, $json, LOCK_EX);
}
header('Content-Type: application/json; charset=utf-8');
echo $json !== false ? $json : json_encode($out);
