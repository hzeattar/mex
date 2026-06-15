<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_store.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));
$type = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
$market = strtolower(trim((string)($_GET['market'] ?? '')));
$visible = (int)($_GET['visible'] ?? 0) === 1;
$scope = strtolower(trim((string)($_GET['scope'] ?? 'active')));
$focus = (int)($_GET['focus'] ?? 0) === 1;
$fresh = ((int)($_GET['fresh'] ?? $_GET['force_fresh'] ?? 0) === 1);
$direct = ((int)($_GET['direct'] ?? 0) === 1);
$strictLive = ((int)($_GET['strict_live'] ?? 0) === 1);
$cacheOnly = ((int)($_GET['cache_only'] ?? 0) === 1);
$allowUiLive = (int)env('QUOTE_ACTIVE_ALLOW_UI_LIVE', '0') === 1;
$allowLive = $fresh || $direct || $strictLive || ($allowUiLive && !$cacheOnly && !$visible && $focus);

if ($type === '' || $type === 'all') {
  json_response(['ok' => false, 'error' => 'type_required'], 400);
}

$list = [];
if ($symbolsRaw !== '') {
  foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $s) {
    $s = strtoupper(trim((string)$s));
    if ($s !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $s)) $list[] = $s;
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
$defaultCacheTtl = $single ? 3 : 5;
$typeCacheTtl = match($type) {
  'crypto' => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_CRYPTO', (string)$defaultCacheTtl),
  'forex' => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_FOREX', (string)$defaultCacheTtl),
  'commodities' => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_COMMODITIES', '6'),
  'futures' => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_FUTURES', '6'),
  'stocks', 'arab' => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_DELAYED', '10'),
  default => (int)env('QUOTE_ACTIVE_RESPONSE_TTL_DEFAULT', (string)$defaultCacheTtl),
};
$typeCacheTtl = max(1, min(30, $typeCacheTtl));
$liveResponseTtl = max(0, min(5, (int)env('QUOTE_ACTIVE_LIVE_RESPONSE_TTL', '1')));
$cacheTtl = $allowLive ? $liveResponseTtl : $typeCacheTtl;
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

$marketRowsBySymbol = function_exists('qa_market_meta_by_symbols') ? qa_market_meta_by_symbols($list) : [];
$metaBySymbol = [];
foreach ($list as $sym) {
  $metaBySymbol[$sym] = is_array($marketRowsBySymbol[$sym]['meta'] ?? null) ? $marketRowsBySymbol[$sym]['meta'] : [];
}

$warmBySymbol = [];
foreach ($list as $sym) {
  try {
    $row = quote_get($sym, $type);
    if (is_array($row)) $warmBySymbol[$sym] = $row;
  } catch (Throwable $e) {}
}

$cachedBySymbol = [];
foreach ($warmBySymbol as $sym => $row) {
  $cachedBySymbol[$sym] = [
    'symbol' => $sym,
    'type' => $type,
    'price' => (float)($row['price'] ?? 0),
    'change_pct' => (float)($row['change_pct'] ?? 0),
    'updated_at' => (int)($row['updated_at'] ?? 0),
    'source' => (string)($row['source'] ?? $row['provider'] ?? ''),
  ];
}

$buildItem = static function(string $sym, ?array $row, string $type, string $market, int $nowTs): ?array {
  if (!is_array($row)) return null;
  $price = (float)($row['price'] ?? $row['last'] ?? $row['mark_price'] ?? 0);
  if (!($price > 0)) return null;
  $updatedAt = (int)($row['updated_at'] ?? $row['ts'] ?? $row['time'] ?? 0);
  if ($updatedAt <= 0) $updatedAt = $nowTs;
  $timingClass = (string)($row['timing_class'] ?? '');
  if ($timingClass === '') {
    $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
    $timingClass = str_contains($source, 'seed') ? 'seed' : (in_array($type, ['stocks','arab'], true) ? 'delayed' : 'live');
  }
  return [
    'symbol' => $sym,
    'type' => $type,
    'market' => $market,
    'price' => $price,
    'change_pct' => (float)($row['change_pct'] ?? $row['changePct'] ?? 0),
    'updated_at' => $updatedAt,
    'source' => (string)($row['source'] ?? $row['provider'] ?? ''),
    'timing_class' => $timingClass,
  ];
};

$referenceRow = static function(string $sym) use (&$marketRowsBySymbol, $type, $nowTs): ?array {
  if ((int)env('QUOTE_ACTIVE_ALLOW_REFERENCE_QUOTES', '1') !== 1) return null;
  if ($type === 'crypto') return null;
  $seed = (float)($marketRowsBySymbol[$sym]['seed_price'] ?? 0);
  if (!($seed > 0)) return null;
  return [
    'symbol' => $sym,
    'type' => $type,
    'price' => $seed,
    'change_pct' => 0.0,
    'updated_at' => $nowTs,
    'source' => 'seed_price',
    'timing_class' => 'seed',
  ];
};

$warmUsable = static function(?array $row, string $assetType, int $nowTs, string $symbol = ''): bool {
  if (!is_array($row)) return false;
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  if ($assetType === 'crypto') return true;
  $src = strtolower(trim((string)($row['source'] ?? '')));
  if (function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($symbol ?: (string)($row['symbol'] ?? ''), $assetType, $src)) return false;
  if (!quote_source_is_liveish($src, $assetType)) return false;
  $updatedAt = (int)($row['updated_at'] ?? 0);
  if ($updatedAt <= 0) return false;
  $age = max(0, $nowTs - $updatedAt);
  $maxAge = match($assetType) {
    'forex' => max(300, min(1800, (int)env('QUOTE_ACTIVE_CACHE_SECONDS_FOREX', '900'))),
    'commodities' => max(300, min(3600, (int)env('QUOTE_ACTIVE_CACHE_SECONDS_COMMODITIES', '1800'))),
    'futures' => max(300, min(3600, (int)env('QUOTE_ACTIVE_CACHE_SECONDS_FUTURES', '1800'))),
    'stocks', 'arab' => max(600, min(43200, (int)env('QUOTE_ACTIVE_CACHE_SECONDS_DELAYED', '14400'))),
    default => 600,
  };
  return $age <= $maxAge;
};

if (!$allowLive) {
  $items = [];
  foreach ($list as $sym) {
    $warm = is_array($warmBySymbol[$sym] ?? null) ? $warmBySymbol[$sym] : null;
    $normWarm = $buildItem($sym, $warm, $type, $market, $nowTs);
    if ($normWarm && $warmUsable($warm, $type, $nowTs, $sym)) {
      if (($normWarm['source'] ?? '') === '') $normWarm['source'] = 'cache';
      $normWarm['cache_first'] = true;
      $items[] = $normWarm;
      continue;
    }
    $normReference = $buildItem($sym, $referenceRow($sym), $type, $market, $nowTs);
    if ($normReference) {
      $normReference['cache_first'] = true;
      $items[] = $normReference;
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
      'timing_class' => 'unavailable',
      'cache_first' => true,
    ];
  }
  $out = [
    'ok' => true,
    'items' => $items,
    'count' => count($items),
    'type' => $type,
    'market' => $market,
    'live_count' => 0,
    'authority' => 'active',
    'cache_first' => true,
    'mode' => 'cache_fast',
  ];
  $json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($cacheTtl > 0 && $json !== false) @file_put_contents($cacheFile, $json, LOCK_EX);
  header('Content-Type: application/json; charset=utf-8');
  echo $json !== false ? $json : json_encode($out);
  exit;
}

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
            'source' => 'eodhd',
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
            'source' => 'massive',
          ];
        }
      }
    } catch (Throwable $e) {}
  }

  if (function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($sym, $type, 'provider_live')) {
    return null;
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
    $liveCandidatesByType = qa_live_candidates_grouped([$type => $list], $cachedBySymbol, [
      'force_live' => $force,
      'strict_live_noncrypto' => $singleFocus || $focus || $visible,
    ]);
    $liveSymbols = $liveCandidatesByType[$type] ?? [];
    $liveMap = $liveSymbols ? quote_bulk_live($liveSymbols, $type, $metaBySymbol, [
      'ttl' => 1,
      'yahoo_ttl' => 1,
      'massive_ttl' => 1,
      'eodhd_ttl' => 3,
      'direct_budget' => count($liveSymbols),
      'direct_yahoo_budget' => count($liveSymbols),
      'chart_budget' => min(2, count($liveSymbols)),
      'allow_direct_batch' => true,
    ]) : [];
  } catch (Throwable $e) {
    $liveMap = [];
  }
}

$items = [];
$liveCount = 0;
foreach ($list as $sym) {
  $warm = is_array($cachedBySymbol[$sym] ?? null) ? $cachedBySymbol[$sym] : (is_array($warmBySymbol[$sym] ?? null) ? $warmBySymbol[$sym] : null);
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
  if ($warmUsable($warm, $type, $nowTs, $sym) && $normWarm) {
    $items[] = $normWarm;
    continue;
  }
  $normReference = $buildItem($sym, $referenceRow($sym), $type, $market, $nowTs);
  if ($normReference) {
    $items[] = $normReference;
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
    'timing_class' => 'unavailable',
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
  'cache_first' => !$allowLive,
  'response_ttl' => $cacheTtl,
];
$json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($cacheTtl > 0 && $json !== false) {
  @file_put_contents($cacheFile, $json, LOCK_EX);
}
header('Content-Type: application/json; charset=utf-8');
echo $json !== false ? $json : json_encode($out);
