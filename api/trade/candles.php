<?php
declare(strict_types=1);

if (!function_exists('vp_ends_with')) {
  function vp_ends_with($haystack, $needle) {
    if ($needle === '') return true;
    $len = strlen($needle);
    return substr($haystack, -$len) === $needle;
  }
}

// Candles endpoint for the Mini App chart.
// Output format (Lightweight Charts): [{time:<unix_sec>, open, high, low, close, volume}]

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/quote_authority.php';
require_once __DIR__ . '/../lib/marketdata.php';
require_once __DIR__ . '/../lib/market_resolver.php';

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$typeRaw   = strtolower(trim((string)($_GET['type'] ?? 'crypto'))); // crypto|forex|stocks|commodities|arab|futures
$type = vp_normalize_asset_type($typeRaw);
$market = strtolower(trim((string)($_GET['market'] ?? (($type === 'futures' || $typeRaw === 'perpetual' || $typeRaw === 'perp') ? 'perp' : 'spot')))); // spot|perp
$tf     = (string)($_GET['tf'] ?? '1m'); // Binance intervals
$limit  = (int)($_GET['limit'] ?? 200);
$end    = (int)($_GET['end'] ?? 0); // unix seconds (optional) for pagination

if ($symbol === '') json_response(['ok'=>false,'error'=>'Missing symbol'], 422);
$limit = max(10, min(500, $limit));
$uid = session_user_id();
if ($uid <= 0 && $limit > 100) {
  json_response(['ok'=>false,'error'=>'login_required','message'=>'Guest access limited to 100 candles','guest_limit'=>100], 401);
}
if ($uid <= 0) $limit = min($limit, 100);

$GLOBALS['CANDLES_REQUEST_STARTED_AT'] = microtime(true);
$GLOBALS['CANDLES_REQUEST_BUDGET_MS'] = max(900, min(10000, (int)env('CANDLES_REQUEST_BUDGET_MS', '4500')));
$GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
  'connect_timeout' => max(1, min(3, (int)env('CANDLES_UPSTREAM_CONNECT_TIMEOUT', '1'))),
  'timeout' => max(2, min(5, (int)env('CANDLES_UPSTREAM_TIMEOUT', '2'))),
  'retries' => max(0, min(1, (int)env('CANDLES_UPSTREAM_RETRIES', '0'))),
];

$mr = [];
$typeHintForLookup = vp_normalize_asset_type($typeRaw);
$needsMarketLookup = ($typeHintForLookup === '' || $typeHintForLookup === 'all' || (int)env('CANDLES_DB_LOOKUP', '0') === 1);
if ($needsMarketLookup) {
  try {
    $pdo = db();
    $st = $pdo->prepare("SELECT meta, type FROM markets WHERE symbol=? LIMIT 1");
    $st->execute([$symbol]);
    $mr = $st->fetch(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    $mr = [];
  }
}
$meta = market_meta($mr['meta'] ?? null);
$dbType = vp_normalize_asset_type((string)($mr['type'] ?? $typeRaw));
if ($typeRaw === '' || $typeRaw === 'all') $typeRaw = $dbType;
$fallbackMeta = candles_default_market_meta($symbol, $typeRaw ?: $dbType);
if ($fallbackMeta) $meta = array_merge($fallbackMeta, $meta);
$ctx = vp_market_context($symbol, $typeRaw ?: $dbType, $market, $meta);
$type = (string)($ctx['asset_type'] ?? vp_normalize_asset_type($typeRaw));
$providerType = (string)($ctx['provider_type'] ?? vp_provider_asset_type($type));
$market = (string)($ctx['effective_market'] ?? (($providerType === 'crypto' && strtolower($market) === 'perp') ? 'perp' : 'spot'));

// Allowed intervals for safety
$allowedTf = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w'];
if (!in_array($tf, $allowedTf, true)) $tf = '1m';

function tf_seconds(string $tf): int {
  $tf = trim(strtolower($tf));
  if ($tf === '1m') return 60;
  if ($tf === '3m') return 180;
  if ($tf === '5m') return 300;
  if ($tf === '15m') return 900;
  if ($tf === '30m') return 1800;
  if ($tf === '1h') return 3600;
  if ($tf === '2h') return 7200;
  if ($tf === '4h') return 14400;
  if ($tf === '6h') return 21600;
  if ($tf === '8h') return 28800;
  if ($tf === '12h') return 43200;
  if ($tf === '1d') return 86400;
  if ($tf === '3d') return 259200;
  if ($tf === '1w') return 604800;
  return 60;
}

function candles_default_market_meta(string $symbol, string $type): array {
  $symbol = strtoupper(trim($symbol));
  $type = vp_normalize_asset_type($type);
  $maps = [
    'forex' => [
      'EURUSD' => ['yahoo_ticker' => 'EURUSD=X', 'tv_symbol' => 'FX:EURUSD'],
      'GBPUSD' => ['yahoo_ticker' => 'GBPUSD=X', 'tv_symbol' => 'FX:GBPUSD'],
      'USDJPY' => ['yahoo_ticker' => 'JPY=X', 'tv_symbol' => 'FX:USDJPY'],
      'USDCHF' => ['yahoo_ticker' => 'CHF=X', 'tv_symbol' => 'FX:USDCHF'],
      'AUDUSD' => ['yahoo_ticker' => 'AUDUSD=X', 'tv_symbol' => 'FX:AUDUSD'],
      'USDCAD' => ['yahoo_ticker' => 'CAD=X', 'tv_symbol' => 'FX:USDCAD'],
    ],
    'commodities' => [
      'XAUUSD' => ['tv_symbol' => 'OANDA:XAUUSD'],
      'XAGUSD' => ['tv_symbol' => 'OANDA:XAGUSD'],
      'USOIL' => ['yahoo_ticker' => 'CL=F', 'tv_symbol' => 'TVC:USOIL'],
      'UKOIL' => ['yahoo_ticker' => 'BZ=F', 'tv_symbol' => 'TVC:UKOIL'],
      'NGAS' => ['yahoo_ticker' => 'NG=F', 'tv_symbol' => 'FX:NGAS'],
    ],
    'futures' => [
      'ES_F' => ['yahoo_ticker' => 'ES=F', 'tv_symbol' => 'CME_MINI:ES1!'],
      'NQ_F' => ['yahoo_ticker' => 'NQ=F', 'tv_symbol' => 'CME_MINI:NQ1!'],
      'YM_F' => ['yahoo_ticker' => 'YM=F', 'tv_symbol' => 'CBOT_MINI:YM1!'],
      'RTY_F' => ['yahoo_ticker' => 'RTY=F', 'tv_symbol' => 'CME_MINI:RTY1!'],
      'CL_F' => ['yahoo_ticker' => 'CL=F', 'tv_symbol' => 'NYMEX:CL1!'],
      'GC_F' => ['yahoo_ticker' => 'GC=F', 'tv_symbol' => 'COMEX:GC1!'],
      'ZN_F' => ['yahoo_ticker' => 'ZN=F', 'tv_symbol' => 'CBOT:ZN1!'],
      'ZB_F' => ['yahoo_ticker' => 'ZB=F', 'tv_symbol' => 'CBOT:ZB1!'],
    ],
    'arab' => [
      '2222' => ['yahoo_ticker' => '2222.SR', 'tv_symbol' => 'TADAWUL:2222'],
      '1120' => ['yahoo_ticker' => '1120.SR', 'tv_symbol' => 'TADAWUL:1120'],
      '2010' => ['yahoo_ticker' => '2010.SR', 'tv_symbol' => 'TADAWUL:2010'],
      '7010' => ['yahoo_ticker' => '7010.SR', 'tv_symbol' => 'TADAWUL:7010'],
      '1211' => ['yahoo_ticker' => '1211.SR', 'tv_symbol' => 'TADAWUL:1211'],
      '1150' => ['yahoo_ticker' => '1150.SR', 'tv_symbol' => 'TADAWUL:1150'],
      '1180' => ['yahoo_ticker' => '1180.SR', 'tv_symbol' => 'TADAWUL:1180'],
      '2280' => ['yahoo_ticker' => '2280.SR', 'tv_symbol' => 'TADAWUL:2280'],
    ],
  ];
  if (isset($maps[$type][$symbol])) return $maps[$type][$symbol];
  if ($type === 'stocks' && preg_match('/^[A-Z.]{1,8}$/', $symbol)) return ['yahoo_ticker' => $symbol];
  if ($type === 'crypto') return ['tv_symbol' => 'BINANCE:' . $symbol];
  return [];
}

function candles_elapsed_ms(): float {
  $started = (float)($GLOBALS['CANDLES_REQUEST_STARTED_AT'] ?? microtime(true));
  return (microtime(true) - $started) * 1000.0;
}

function candles_request_over_budget(int $reserveMs = 0): bool {
  $budget = (int)($GLOBALS['CANDLES_REQUEST_BUDGET_MS'] ?? 4500);
  return candles_elapsed_ms() >= max(100, $budget - max(0, $reserveMs));
}

function candles_cached_or_empty_response(string $symbol, string $market, string $tf, string $type, int $end, int $limit, string $source, string $softError = 'provider_unavailable'): void {
  $cached = candles_cache_load($symbol, $market, $tf, $type);
  if ($cached) {
    $items = candles_from_cache($cached, $end, $limit);
    json_response([
      'ok' => true,
      'items' => candles_finalize_items($items, $symbol, $market, $type, tf_seconds($tf), $end),
      'cached' => true,
      'source' => 'cache_' . $source,
      'soft_error' => $softError,
    ]);
  }
  json_response(['ok' => true, 'items' => [], 'source' => 'empty_' . $source, 'soft_error' => $softError]);
}


function candles_cache_path(string $symbol, string $market, string $tf, string $type = ''): string {
  $safe = preg_replace('/[^A-Z0-9_]/', '_', strtoupper($symbol));
  $safe = substr($safe, 0, 40);
  $safeType = preg_replace('/[^a-z0-9_]/', '_', strtolower($type ?: 'generic'));
  return __DIR__ . '/../data/candles_' . strtolower($market) . '_' . $safeType . '_' . strtolower($safe) . '_' . strtolower($tf) . '.json';
}
function candles_cache_load(string $symbol, string $market, string $tf, string $type = ''): array {
  $p = candles_cache_path($symbol,$market,$tf,$type);
  if (!is_file($p)) return [];
  $raw = file_get_contents($p);
  $j = json_decode($raw ?: '[]', true);
  return is_array($j) ? $j : [];
}
function candles_cache_save(string $symbol, string $market, string $tf, array $candles, string $type = ''): void {
  $kind = vp_normalize_asset_type($type ?: 'generic');
  $keepDays = 14;
  if (in_array($kind, ['stocks','arab','futures','commodities'], true)) $keepDays = 180;
  elseif ($kind === 'forex') $keepDays = 120;
  $cut = time() - ($keepDays * 24 * 3600);
  $by = [];
  foreach ($candles as $c) {
    $t = (int)($c['time'] ?? 0);
    if ($t < $cut || $t <= 0) continue;
    $by[$t] = [
      'time' => $t,
      'open' => (float)($c['open'] ?? 0),
      'high' => (float)($c['high'] ?? 0),
      'low' => (float)($c['low'] ?? 0),
      'close' => (float)($c['close'] ?? 0),
      'volume' => (float)($c['volume'] ?? 0),
    ];
  }
  ksort($by);
  $p = candles_cache_path($symbol,$market,$tf,$type);
  @file_put_contents($p, json_encode(array_values($by), JSON_UNESCAPED_SLASHES));
}
function candles_from_cache(array $candles, int $end, int $limit): array {
  if (!$candles) return [];
  // $end is unix seconds; return candles strictly <= end if provided, else latest.
  if ($end > 0) {
    $candles = array_values(array_filter($candles, fn($c)=> (int)$c['time'] <= $end));
  }
  $n = count($candles);
  if ($n <= $limit) return $candles;
  return array_slice($candles, $n - $limit);
}

function candles_last_time(array $candles): int {
  if (!$candles) return 0;
  $last = $candles[count($candles) - 1] ?? null;
  return (int)($last['time'] ?? 0);
}

function candles_cache_recent_enough(array $candles, int $step, string $providerType, int $end = 0): bool {
  if ($end > 0 || !$candles || $step <= 0) return true;
  $lastTime = candles_last_time($candles);
  if ($lastTime <= 0) return false;
  $nowBucket = (int)(floor(time() / $step) * $step);
  $gap = max(0, $nowBucket - $lastTime);
  if ($providerType === 'crypto') {
    $maxGap = max($step * 3, 600);
    return $gap <= $maxGap;
  }
  $maxGap = max($step * 6, 1800);
  return $gap <= $maxGap;
}

function candles_cache_depth_enough(array $candles, int $limit, string $providerType, string $tf = ''): bool {
  if (!$candles) return false;
  $count = count($candles);
  if ($providerType === 'crypto') return $count >= max(30, min($limit, 80));
  $tf = strtolower(trim($tf));
  $baseNeed = max(60, (int)ceil($limit * 0.72));
  if (in_array($providerType, ['commodities','forex'], true)) $baseNeed = max(80, (int)ceil($limit * 0.78));
  if (in_array($tf, ['4h','6h','8h','12h','1d','3d','1w'], true)) $baseNeed = max(40, (int)ceil($limit * 0.55));
  return $count >= min($limit, $baseNeed);
}


function map_klines_to_candles(array $klines): array {
  $out = [];
  foreach ($klines as $k) {
    // [ openTime, open, high, low, close, volume, closeTime, ...]
    if (!is_array($k) || count($k) < 6) continue;
    $t = (int)round(((float)$k[0]) / 1000.0);
    $out[] = [
      'time' => $t,
      'open' => (float)$k[1],
      'high' => (float)$k[2],
      'low'  => (float)$k[3],
      'close'=> (float)$k[4],
      'volume' => (float)$k[5],
    ];
  }
  return $out;
}

function candles_series_has_real_movement(array $items, int $sample = 24): bool {
  $items = candles_normalize_series($items);
  if (count($items) < 3) return false;
  $slice = array_slice($items, -max(3, $sample));
  $min = null;
  $max = null;
  $volume = 0.0;
  foreach ($slice as $c) {
    foreach (['open','high','low','close'] as $key) {
      $v = (float)($c[$key] ?? 0);
      if (!($v > 0)) continue;
      $min = $min === null ? $v : min($min, $v);
      $max = $max === null ? $v : max($max, $v);
    }
    $volume += max(0.0, (float)($c['volume'] ?? 0));
  }
  if ($min === null || $max === null) return false;
  $spread = abs($max - $min) / max(1.0, abs((float)$max));
  // Volume by itself does not prove the chart is useful. A cached sequence of
  // identical OHLC values with one non-zero volume bar was being treated as
  // real history, which made the trading chart look frozen.
  return $spread > 0.000001;
}

function candles_crypto_yahoo_symbol(string $symbol): string {
  $sym = strtoupper(preg_replace('/[^A-Z0-9]/', '', $symbol));
  if (str_ends_with($sym, 'USDT')) return substr($sym, 0, -4) . '-USD';
  if (str_ends_with($sym, 'BUSD')) return substr($sym, 0, -4) . '-USD';
  if (str_ends_with($sym, 'USDC')) return substr($sym, 0, -4) . '-USD';
  if (str_ends_with($sym, 'USD')) return substr($sym, 0, -3) . '-USD';
  return $sym . '-USD';
}

function candles_crypto_respond_from_provider(array $newItems, string $source, string $symbol, string $market, string $type, string $tf, int $end, int $limit): void {
  $newItems = candles_normalize_series($newItems);
  if (count($newItems) < 2) throw new RuntimeException('Provider returned too few candles');
  $cached = candles_cache_load($symbol, $market, $tf, $type);
  $by = [];
  foreach ($cached as $c) {
    if (!is_array($c)) continue;
    $by[(int)($c['time'] ?? 0)] = $c;
  }
  foreach ($newItems as $c) { $by[(int)$c['time']] = $c; }
  unset($by[0]);
  ksort($by);
  $merged = array_values($by);
  candles_cache_save($symbol, $market, $tf, $merged, $type);
  $items = candles_from_cache($merged, $end, $limit);
  $out = candles_finalize_items($items, $symbol, $market, $type, tf_seconds($tf), $end);
  json_response(['ok'=>true,'items'=>$out,'source'=>$source,'provider_count'=>count($newItems)]);
}


function candles_normalize_series(array $items): array {
  if (!$items) return [];
  $by = [];
  foreach ($items as $c) {
    if (!is_array($c)) continue;
    $t = (int)($c['time'] ?? 0);
    if ($t <= 0) continue;
    $by[$t] = [
      'time' => $t,
      'open' => (float)($c['open'] ?? 0),
      'high' => (float)($c['high'] ?? 0),
      'low' => (float)($c['low'] ?? 0),
      'close' => (float)($c['close'] ?? 0),
      'volume' => (float)($c['volume'] ?? 0),
    ];
  }
  ksort($by);
  return array_values($by);
}

function candles_fill_time_gaps(array $items, int $step, string $assetType = ''): array {
  $items = candles_normalize_series($items);
  if (!$items || $step <= 0) return $items;
  $kind = strtolower(trim($assetType));
  $maxFill = 8;
  if ($kind === 'crypto') $maxFill = 2;
  elseif ($kind === 'forex' || $kind === 'commodities') $maxFill = 4;
  elseif ($kind === 'stocks' || $kind === 'arab' || $kind === 'futures') $maxFill = 8;

  $out = [];
  $count = count($items);
  for ($i = 0; $i < $count; $i++) {
    $cur = $items[$i];
    $out[] = $cur;
    if ($i >= $count - 1) continue;
    $next = $items[$i + 1];
    $curTime = (int)($cur['time'] ?? 0);
    $nextTime = (int)($next['time'] ?? 0);
    if ($curTime <= 0 || $nextTime <= 0) continue;
    $gap = $nextTime - $curTime;
    if ($gap <= $step) continue;
    $missing = (int)floor($gap / $step) - 1;
    if ($missing <= 0 || $missing > $maxFill) continue;
    $anchor = (float)($cur['close'] ?? 0);
    if (!($anchor > 0)) $anchor = (float)($cur['open'] ?? 0);
    if (!($anchor > 0)) continue;
    for ($m = 1; $m <= $missing; $m++) {
      $t = $curTime + ($m * $step);
      $out[] = [
        'time' => $t,
        'open' => $anchor,
        'high' => $anchor,
        'low' => $anchor,
        'close' => $anchor,
        'volume' => 0.0,
      ];
    }
  }
  return candles_normalize_series($out);
}

function candles_finalize_items(array $items, string $symbol, string $market, string $assetType, int $step, int $end = 0): array {
  $items = candles_normalize_series($items);
  $items = candles_fill_time_gaps($items, $step, $assetType);
  return candles_sync_live_tail($items, $symbol, $market, $assetType, $step, $end);
}

function candles_sync_live_tail(array $items, string $symbol, string $market, string $assetType, int $step, int $end = 0): array {
  if ($end > 0 || !$items || $step <= 0) return $items;
  if ((int)env('CANDLES_SYNC_LIVE_TAIL', '0') !== 1) return $items;
  if (candles_request_over_budget((int)env('CANDLES_LIVE_TAIL_RESERVE_MS', '1000'))) return $items;
  try {
    $live = (float)quote_price($symbol, $market, $assetType);
    if (!($live > 0)) return $items;

    $nowBucket = (int)(floor(time() / $step) * $step);
    $lastIndex = count($items) - 1;
    if ($lastIndex < 0) return $items;

    $last = $items[$lastIndex] ?? [];
    $lastTime = (int)($last['time'] ?? 0);
    if ($lastTime <= 0) return $items;

    if ($lastTime < ($nowBucket - $step)) {
      $prevClose = (float)($last['close'] ?? $live);
      $gapBuckets = max(0, (int)round(($nowBucket - $lastTime) / max(1, $step)));
      $isCryptoAsset = (strtolower($assetType) === 'crypto');
      $driftVsPrev = ($prevClose > 0) ? abs($live - $prevClose) / max(1.0, abs($prevClose)) : 0.0;
      $useFlatAnchor = $isCryptoAsset && ($gapBuckets > 1 || $driftVsPrev > 0.03);
      $items[] = [
        'time' => $nowBucket,
        'open' => $useFlatAnchor ? $live : $prevClose,
        'high' => $useFlatAnchor ? $live : max($prevClose, $live),
        'low' => $useFlatAnchor ? $live : min($prevClose, $live),
        'close' => $live,
        'volume' => 0.0,
      ];
      return array_slice($items, -500);
    }

    $open = (float)($last['open'] ?? $live);
    $high = (float)($last['high'] ?? $live);
    $low = (float)($last['low'] ?? $live);
    $close = (float)($last['close'] ?? $live);
    $drift = ($close > 0) ? abs($live - $close) / max(1.0, abs($close)) : 0.0;
    $isCryptoAsset = (strtolower($assetType) === 'crypto');
    $hugeDrift = $drift > ($isCryptoAsset ? 0.02 : 0.08);
    if ($hugeDrift) {
      if (!$isCryptoAsset && $lastTime < $nowBucket) {
        $items[] = [
          'time' => $nowBucket,
          'open' => $live,
          'high' => $live,
          'low' => $live,
          'close' => $live,
          'volume' => 0.0,
        ];
        return array_slice($items, -500);
      }
      return $items;
    }

    if ($lastTime === $nowBucket || $lastTime === ($nowBucket - $step) || $drift > 0.0004) {
      $last['high'] = max($high, $live, $open, $close);
      $last['low'] = min($low, $live, $open, $close);
      $last['close'] = $live;
      if (!isset($last['open']) || (float)$last['open'] <= 0) $last['open'] = $close > 0 ? $close : $live;
      $items[$lastIndex] = $last;
    }
  } catch (Throwable $e) {
    return $items;
  }
  return $items;
}

function candles_live_anchor_price(string $symbol, string $market, string $assetType): float {
  try {
    return (float)quote_price($symbol, $market, $assetType);
  } catch (Throwable $e) {
    return 0.0;
  }
}

function candles_best_live_price(string $symbol, string $market, string $assetType, array $meta = []): float {
  $symbol = strtoupper(trim($symbol));
  $assetType = vp_normalize_asset_type($assetType);
  try {
    $bulk = quote_bulk_live([$symbol], $assetType, [$symbol => $meta], [
      'direct_budget' => 1,
      'direct_yahoo_budget' => 1,
      'chart_budget' => 1,
      'ttl' => ($assetType === 'crypto' ? 1 : 2),
    ]);
    $row = is_array($bulk[$symbol] ?? null) ? $bulk[$symbol] : null;
    $p = is_array($row) ? (float)($row['price'] ?? 0) : 0.0;
    if ($p > 0) return $p;
  } catch (Throwable $e) {}
  try {
    $q = quote_get($symbol, $assetType);
    $src = strtolower(trim((string)($q['source'] ?? '')));
    $p = (float)($q['price'] ?? 0);
    if ($p > 0 && quote_source_is_liveish($src, $assetType)) return $p;
  } catch (Throwable $e) {}
  try {
    return (float)quote_price($symbol, $market, $assetType);
  } catch (Throwable $e) {
    return 0.0;
  }
}

function candles_recent_anchor_close(array $items, int $take = 6): float {
  $closes = [];
  for ($i = count($items) - 1; $i >= 0 && count($closes) < $take; $i--) {
    $c = (float)($items[$i]['close'] ?? 0);
    if ($c > 0) $closes[] = $c;
  }
  if (!$closes) return 0.0;
  sort($closes, SORT_NUMERIC);
  $mid = (int)floor((count($closes) - 1) / 2);
  if ((count($closes) % 2) === 0) {
    return ((float)$closes[$mid] + (float)$closes[$mid + 1]) / 2.0;
  }
  return (float)$closes[$mid];
}

function candles_series_matches_live(array $items, string $symbol, string $market, string $assetType): bool {
  if (!$items) return true;
  $kind = strtolower(trim($assetType));
  if ($kind === 'crypto' && !candles_series_has_real_movement($items, 24)) return false;
  if ((int)env('CANDLES_VALIDATE_LIVE_MATCH', '0') !== 1) return true;
  if (candles_request_over_budget((int)env('CANDLES_LIVE_MATCH_RESERVE_MS', '1000'))) return true;
  $live = candles_best_live_price($symbol, $market, $assetType);
  if (!($live > 0)) return true;
  $anchor = candles_recent_anchor_close($items, 8);
  if (!($anchor > 0)) return true;
  $drift = abs($live - $anchor) / max(1.0, abs($anchor));
  if ($kind === 'futures') return $drift <= 0.12;
  if ($kind === 'commodities') return $drift <= 0.10;
  if ($kind === 'stocks' || $kind === 'arab') return $drift <= 0.20;
  return $drift <= 0.25;
}

function candles_quote_seed_items(float $price, int $now, int $step, int $limit): array {
  if (!($price > 0) || $step <= 0 || $limit <= 0) return [];
  $alignedNow = (int)(floor($now / $step) * $step);
  $items = [];
  for ($i = $limit - 1; $i >= 0; $i--) {
    $t = $alignedNow - ($i * $step);
    $items[] = ['time'=>$t,'open'=>$price,'high'=>$price,'low'=>$price,'close'=>$price,'volume'=>0.0];
  }
  return $items;
}

try {
  // Fast path: if we already have cached candles, return them immediately to make the chart load instantly.
  // Then refresh in the background (shared hosting friendly).
  $cacheFile = candles_cache_path($symbol,$market,$tf,$type);
  $cachedAll = candles_cache_load($symbol,$market,$tf,$type);
  if ($end <= 0 && $cachedAll) {
    $age = is_file($cacheFile) ? (time() - (int)@filemtime($cacheFile)) : 999999;
    $baseStale = (int)env('CANDLES_MAX_STALE_FAST', '180'); // seconds
    $maxStale = in_array($providerType, ['stocks','arab','commodities','futures','forex'], true) ? max(60, min(1800, (int)env('CANDLES_MAX_STALE_FAST_NONCRYPTO', '900'))) : max(10, min(900, $baseStale));
    $step = tf_seconds($tf);
    $cacheRecentEnough = candles_cache_recent_enough($cachedAll, $step, $providerType, 0);
    if ($age >= 0 && $age < $maxStale && $cacheRecentEnough) {
      $fastItems = candles_finalize_items(candles_from_cache($cachedAll, 0, $limit), $symbol, $market, $type, $step, 0);
      $allowWarmNonCrypto = in_array($providerType, ['stocks','arab','commodities','futures','forex'], true);
      $cacheDeepEnough = candles_cache_depth_enough($fastItems, $limit, $providerType, $tf);
      $cacheMovesEnough = candles_series_has_real_movement($fastItems, 24);
      if ($allowWarmNonCrypto && $cacheDeepEnough && $cacheMovesEnough) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok'=>true,'items'=>$fastItems, 'cached'=>true, 'warm'=>true, 'source'=>'cache_warm'], JSON_UNESCAPED_SLASHES);
        exit;
      }
      $fastMatchesLive = candles_series_matches_live($fastItems, $symbol, $market, $type);
      if ($fastMatchesLive) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok'=>true,'items'=>$fastItems, 'cached'=>true, 'warm'=>false], JSON_UNESCAPED_SLASHES);
        exit;
      }
      @unlink($cacheFile);
    }
  }

  // Do not short-circuit non-crypto cold starts with a flat quote seed here.
  // The frontend already paints a temporary local seed while we continue fetching real history.
  // Returning early from the backend was making first-load stock/forex/futures charts look flat and killing history depth.

  // Crypto candles from Binance
  if ($providerType === 'crypto') {
    // Prevent stampede on shared hosting: only one refresh per symbol/tf/market every few seconds.
    $guardDir = __DIR__ . '/../data/cache';
    if (!is_dir($guardDir)) @mkdir($guardDir, 0777, true);
    $guardKey = strtolower($market) . '_' . preg_replace('/[^A-Z0-9_]/','_', strtoupper($symbol)) . '_' . strtolower($tf);
    $guardFile = $guardDir . '/cndl_refresh_' . $guardKey . '.lock';
    $guardTtl = (int)env('CANDLES_REFRESH_GUARD_TTL', '3');
    $guardTtl = max(1, min(60, $guardTtl));
    $skipRefresh = false;
    if (is_file($guardFile)) {
      $gAge = time() - (int)@filemtime($guardFile);
      if ($gAge >= 0 && $gAge < $guardTtl) $skipRefresh = true;
    }
    if (!$skipRefresh) { @file_put_contents($guardFile, (string)time(), LOCK_EX); }

    // If this is a paginated (older) request and cache already satisfies it, avoid upstream.
    if ($end > 0 && $cachedAll) {
      $itemsCached = candles_from_cache($cachedAll, $end, $limit);
      if (count($itemsCached) >= max(10, (int)($limit*0.6))) {
        json_response(['ok'=>true,'items'=>$itemsCached,'cached'=>true]);
      }
    }

    // If cache is fresh enough, skip refresh and just return cache (when not already silent).
    if ($skipRefresh && $cachedAll && $end <= 0 && candles_cache_recent_enough($cachedAll, tf_seconds($tf), $providerType, 0)) {
      $cachedItems = candles_finalize_items(candles_from_cache($cachedAll, 0, $limit), $symbol, $market, $type, tf_seconds($tf), 0);
      if (candles_series_matches_live($cachedItems, $symbol, $market, $type)) {
        json_response(['ok'=>true,'items'=>$cachedItems,'cached'=>true]);
      }
    }

    $endMs = 0;
    if ($end > 0) {
      // cap lookback to ~60 days
      $min = time() - (60 * 86400);
      if ($end < $min) $end = $min;
      $endMs = $end * 1000;
    }
    $providerErrors = [];
    $providers = [];
    if ($market === 'perp') {
      $url = 'https://fapi.binance.com/fapi/v1/klines?symbol=' . urlencode($symbol) . '&interval=' . urlencode($tf) . '&limit=' . $limit;
      if ($endMs > 0) $url .= '&endTime=' . $endMs;
      $providers[] = ['source' => 'binance_futures_klines', 'url' => $url];
    }
    $spotPath = '/api/v3/klines';
    $spotQuery = ['symbol' => $symbol, 'interval' => $tf, 'limit' => $limit];
    if ($endMs > 0) $spotQuery['endTime'] = $endMs;
    $providers[] = ['source' => 'binance_spot_klines', 'spot_path' => $spotPath, 'query' => $spotQuery];

    foreach ($providers as $provider) {
      try {
        $kl = isset($provider['spot_path'])
          ? binance_spot_json((string)$provider['spot_path'], (array)$provider['query'])
          : http_get_json((string)$provider['url']);
        $newItems = map_klines_to_candles($kl);
        if (count($newItems) >= 2 && candles_series_has_real_movement($newItems, 24)) {
          candles_crypto_respond_from_provider($newItems, (string)$provider['source'], $symbol, $market, $type, $tf, $end, $limit);
        }
        $providerErrors[] = (string)$provider['source'] . ': empty_or_flat';
      } catch (Throwable $e) {
        $providerErrors[] = (string)$provider['source'] . ': ' . $e->getMessage();
      }
      if (candles_request_over_budget(800)) {
        candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
      }
    }

    if (candles_request_over_budget(1200)) {
      candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
    }

    try {
      $yahooSymbol = candles_crypto_yahoo_symbol($symbol);
      $newItems = yahoo_chart_candles($yahooSymbol, $tf, $limit);
      if (count($newItems) >= 2 && candles_series_has_real_movement($newItems, 24)) {
        candles_crypto_respond_from_provider($newItems, 'yahoo_crypto_chart', $symbol, $market, $type, $tf, $end, $limit);
      }
      $providerErrors[] = 'yahoo_crypto_chart: empty_or_flat';
    } catch (Throwable $e) {
      $providerErrors[] = 'yahoo_crypto_chart: ' . $e->getMessage();
    }

    if (candles_request_over_budget(500)) {
      candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
    }

    $cached = candles_cache_load($symbol,$market,$tf,$type);
    if ($cached && candles_series_has_real_movement($cached, 24)) {
      $items = candles_from_cache($cached, $end, $limit);
      json_response(['ok'=>true,'items'=>candles_finalize_items($items, $symbol, $market, $type, tf_seconds($tf), $end),'cached'=>true,'source'=>'cache_preserve','provider_errors'=>$providerErrors]);
    }

    throw new RuntimeException('Crypto candle providers unavailable: ' . implode(' | ', array_slice($providerErrors, -3)));
  }

    // Non-crypto candles: try Massive/Polygon aggregates first (real candles).
  // Falls back to synthetic candles only if upstream is unavailable.
  $now = ($end > 0) ? $end : time();
  $step = tf_seconds($tf);

  // Map timeframe to aggregates params
  $mult = 1;
  $span = 'minute';
  if (vp_ends_with($tf, 'm')) { $mult = (int)substr($tf, 0, -1); $span = 'minute'; }
  elseif (vp_ends_with($tf, 'h')) { $mult = (int)substr($tf, 0, -1); $span = 'hour'; }
  elseif (vp_ends_with($tf, 'd')) { $mult = (int)substr($tf, 0, -1); $span = 'day'; }
  elseif ($tf === '1w') { $mult = 1; $span = 'week'; }

  $mult = max(1, min(30, $mult));

  // Determine upstream ticker (supports meta polygon_ticker)
  $ticker = strtoupper((string)($meta['polygon_ticker'] ?? ''));
  if ($ticker === '') {
    if ($providerType === 'forex' && preg_match('/^[A-Z]{6}$/', $symbol)) $ticker = 'C:' . $symbol;
    elseif ($providerType === 'commodities' && preg_match('/^X(?:AU|AG|PT|PD)USD$/', $symbol)) $ticker = 'C:' . $symbol;
    else $ticker = $symbol;
  }

  $items = [];
  $paidAggsKey = trim((string)env('POLYGON_API_KEY', env('MASSIVE_API_KEY', '')));
  $hasAggsProvider = $paidAggsKey !== '';
  $preferAggsForSymbol = $hasAggsProvider && (($providerType === 'forex') || ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $typeRaw ?: $providerType)));
  $triedYahooChart = false;

  if (strtolower((string)env('PRICE_PROVIDER', 'eodhd')) === 'eodhd' && ($type === 'arab' || in_array($providerType, ['stocks','forex'], true) || ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $type)))) {
    try {
      $eSymbol = eodhd_symbol_for_market($symbol, $type, $meta) ?: eodhd_symbol_for_market($symbol, $providerType, $meta);
      if ($eSymbol) {
        $items = eodhd_intraday_candles($eSymbol, $tf, $limit);
        if (count($items) > 0) {
          $cachedAll = candles_cache_load($symbol,$market,$tf,$type);
          $merged = array_merge($cachedAll, $items);
          $out = candles_finalize_items(candles_from_cache($merged, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end);
          candles_cache_save($symbol,$market,$tf, $merged, $type);
          json_response(['ok'=>true,'items'=>$out,'source'=>'eodhd_intraday','warm'=>false]);
        }
      }
    } catch (Throwable $e) {
      // fall through
    }
  }

  if (candles_request_over_budget(1400)) {
    candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
  }

  // Keep charts aligned with the same source family as quotes:
  // - Yahoo first for stocks / arab / futures / non-spot commodity contracts
  // - Massive/Polygon aggs first for forex and spot metals, with Yahoo fallback if aggs fail.
  if (!$preferAggsForSymbol && in_array($providerType, ['stocks','arab','futures','commodities','forex'], true)) {
    try {
      $ySymbol = yahoo_ticker_for_market($symbol, $type, $meta) ?: yahoo_ticker_for_market($symbol, $providerType, $meta);
      if ($ySymbol) {
        $triedYahooChart = true;
        $items = yahoo_chart_candles($ySymbol, $tf, $limit);
        if (count($items) > 0) {
          $cachedAll = candles_cache_load($symbol,$market,$tf,$type);
          $merged = array_merge($cachedAll, $items);
          $out = candles_finalize_items(candles_from_cache($merged, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end);
          candles_cache_save($symbol,$market,$tf, $merged, $type);
          if (in_array($providerType, ['stocks','arab','commodities','futures'], true)) {
            if (candles_series_has_real_movement($out, 24)) {
              json_response(['ok'=>true,'items'=>$out,'source'=>'yahoo_chart','warm'=>true]);
            }
          }
          $outMatchesLive = candles_series_matches_live($out, $symbol, $market, $type);
          if ($outMatchesLive) {
            json_response(['ok'=>true,'items'=>$out,'source'=>'yahoo_chart','warm'=>false]);
          }
        }
      }
    } catch (Throwable $e) {
      // fall through to aggs / synthetic
    }
  }

  if (candles_request_over_budget(1200)) {
    candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
  }

  if ($hasAggsProvider) try {
    $key = $paidAggsKey;
    $base = upstream_base();
    $headers = upstream_auth_headers($key);

    // range window to cover requested candles
    $fromSec = $now - ($limit * $step) - (2 * $step);
    // widen to full days (API expects date range)
    $from = gmdate('Y-m-d', max(0, $fromSec));
    $to = gmdate('Y-m-d', $now);

    $url = "{$base}/v2/aggs/ticker/" . urlencode($ticker) . "/range/{$mult}/{$span}/{$from}/{$to}?adjusted=true&sort=asc&limit=50000";
    $url = upstream_add_key_to_url($url, $key);

    $d = http_get_json($url, $headers);
    $rows = $d['results'] ?? [];
    if (is_array($rows)) {
      foreach ($rows as $r) {
        if (!is_array($r)) continue;
        $tms = (int)($r['t'] ?? 0);
        if ($tms <= 0) continue;
        $t = (int)floor($tms / 1000);
        if ($end > 0 && $t > $end) continue;
        $items[] = [
          'time' => $t,
          'open' => (float)($r['o'] ?? 0),
          'high' => (float)($r['h'] ?? 0),
          'low'  => (float)($r['l'] ?? 0),
          'close'=> (float)($r['c'] ?? 0),
          'volume' => (float)($r['v'] ?? 0),
        ];
      }
    }
    if (count($items) > 0) {
      $cachedAll = candles_cache_load($symbol,$market,$tf,$type);
      $merged = array_merge($cachedAll, $items);
      $out = candles_finalize_items(candles_from_cache($merged, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end);
      candles_cache_save($symbol,$market,$tf, $merged, $type);
      if (in_array($providerType, ['stocks','arab','commodities','futures','forex'], true)) {
        if (candles_series_has_real_movement($out, 24)) {
          json_response(['ok'=>true,'items'=>$out,'source'=>'aggs','warm'=>true]);
        }
      }
      $outMatchesLive = candles_series_matches_live($out, $symbol, $market, $type);
      if ($outMatchesLive) {
        json_response(['ok'=>true,'items'=>$out,'source'=>'aggs','warm'=>false]);
      }
    }
  } catch (Throwable $e) {
    // fall through to yahoo fallback / synthetic
  }

  if (candles_request_over_budget(900)) {
    candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
  }

  // Secondary Yahoo chart fallback for FX and spot metals when primary aggs snapshots are unavailable.
  if (!$triedYahooChart && (($providerType === 'forex') || ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $type)))) {
    try {
      $ySymbol = yahoo_ticker_for_market($symbol, $type, $meta) ?: yahoo_ticker_for_market($symbol, $providerType, $meta);
      if ($ySymbol) {
        $triedYahooChart = true;
        $items = yahoo_chart_candles($ySymbol, $tf, $limit);
        if (count($items) > 0) {
          $cachedAll = candles_cache_load($symbol,$market,$tf,$type);
          $merged = array_merge($cachedAll, $items);
          $out = candles_finalize_items(candles_from_cache($merged, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end);
          candles_cache_save($symbol,$market,$tf, $merged, $type);
          if (in_array($providerType, ['forex','commodities'], true)) {
            if (candles_series_has_real_movement($out, 24)) {
              json_response(['ok'=>true,'items'=>$out,'source'=>'yahoo_chart_fallback','warm'=>true]);
            }
          }
          $outMatchesLive = candles_series_matches_live($out, $symbol, $market, $type);
          if ($outMatchesLive) {
            json_response(['ok'=>true,'items'=>$out,'source'=>'yahoo_chart_fallback','warm'=>false]);
          }
        }
      }
    } catch (Throwable $e) {
      // fall through to synthetic fallback
    }
  }

  if (candles_request_over_budget(500)) {
    candles_cached_or_empty_response($symbol, $market, $tf, $type, $end, $limit, 'provider_timeout');
  }

  // Before synthetic fallback, preserve any real cached history we already have.
  if (!empty($cachedAll)) {
    $cachedOut = candles_finalize_items(candles_from_cache($cachedAll, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end);
    if (count($cachedOut) >= max(24, (int)ceil($limit * 0.25))) {
      json_response(['ok'=>true,'items'=>$cachedOut,'cached'=>true,'source'=>'cache_preserve']);
    }
  }

  // Fallback synthetic is opt-in. By default we return cache/empty instead of
  // extending a stalled chart request with another live quote lookup.
  $allowFallbackLiveLookup = (int)env('CANDLES_ALLOW_FALLBACK_LIVE_LOOKUP', '0') === 1;
  $last = ($allowFallbackLiveLookup && !candles_request_over_budget(1800)) ? candles_best_live_price($symbol, $market, $type, $meta) : 0.0;
  if ($allowFallbackLiveLookup && !($last > 0) && !candles_request_over_budget(1600) && function_exists('qa_quote_payload')) {
    try {
      $qa = qa_quote_payload($type, [$symbol], [
        'allow_live' => ($type === 'crypto'),
        'allow_crypto_seed' => true,
        'allow_noncrypto_seed' => false,
        'direct_budget' => 1,
        'direct_yahoo_budget' => 1,
        'chart_budget' => 1,
      ]);
      $qaItem = is_array($qa['items'][0] ?? null) ? $qa['items'][0] : null;
      if ($qaItem && (float)($qaItem['price'] ?? 0) > 0) $last = (float)$qaItem['price'];
    } catch (Throwable $ignored) {}
  }
  if (!($last > 0) && !empty($cachedAll)) {
    $tail = candles_from_cache($cachedAll, $end, max(1, min($limit, 8)));
    $lastBar = $tail ? end($tail) : null;
    $last = is_array($lastBar) ? (float)($lastBar['close'] ?? 0) : 0.0;
  }
  $price = $last > 0 ? $last : 0.0;
  if (!($price > 0)) {
    json_response(['ok'=>true,'items'=>[],'source'=>'empty_fallback']);
  }
  $alignedNow = (int)(floor($now / $step) * $step);
  for ($i = $limit-1; $i >= 0; $i--) {
    $t = $alignedNow - ($i * $step);
    $seed = (int) sprintf('%u', crc32($symbol . '|' . (string)intval($t / $step) . '|' . $tf));
    $r1 = (($seed % 1000) / 1000.0) - 0.5;
    $r2 = (((int)((intdiv($seed, 7)) % 1000)) / 1000.0) - 0.5;
    $vol = max(0.00001, abs($r1) * 0.002);
    $o = $price;
    $c = $o * (1.0 + ($r1 * 0.001));
    $h = max($o, $c) * (1.0 + abs($r2) * 0.0008);
    $l = min($o, $c) * (1.0 - abs($r2) * 0.0008);
    $items[] = ['time'=>$t,'open'=>$o,'high'=>$h,'low'=>$l,'close'=>$c,'volume'=>$vol*1000];
    $price = $c;
  }
  json_response(['ok'=>true,'items'=>candles_finalize_items($items, $symbol, $market, $type, tf_seconds($tf), $end), 'synthetic'=>true, 'source'=>'synthetic']);} catch (Throwable $e) {
  try {
    $fallbackCached = candles_cache_load($symbol,$market,$tf,$type);
    if ($fallbackCached) {
      json_response(['ok'=>true,'items'=>candles_finalize_items(candles_from_cache($fallbackCached, $end, $limit), $symbol, $market, $type, tf_seconds($tf), $end), 'cached'=>true, 'soft_error'=>'provider_unavailable']);
    }
    $allowFallbackLiveLookup = (int)env('CANDLES_ALLOW_FALLBACK_LIVE_LOOKUP', '0') === 1;
    $last = 0.0;
    if ($allowFallbackLiveLookup && !candles_request_over_budget(400)) {
      try { $last = (float)quote_price($symbol, $market, $type); } catch (Throwable $ignored) { $last = 0.0; }
    }
    if ($allowFallbackLiveLookup && !($last > 0) && !candles_request_over_budget(300) && function_exists('qa_quote_payload')) {
      try {
        $qa = qa_quote_payload($type, [$symbol], [
          'allow_live' => ($type === 'crypto'),
          'allow_crypto_seed' => true,
          'allow_noncrypto_seed' => false,
          'direct_budget' => 1,
          'direct_yahoo_budget' => 1,
          'chart_budget' => 1,
        ]);
        $qaItem = is_array($qa['items'][0] ?? null) ? $qa['items'][0] : null;
        if ($qaItem && (float)($qaItem['price'] ?? 0) > 0) $last = (float)$qaItem['price'];
      } catch (Throwable $ignoredQa) {}
    }
    if (!($last > 0) && !empty($cachedAll)) {
      $tail = candles_from_cache($cachedAll, $end, max(1, min($limit, 4)));
      $lastBar = $tail ? end($tail) : null;
      $last = is_array($lastBar) ? (float)($lastBar['close'] ?? 0) : 0.0;
    }
    if (!($last > 0)) {
      json_response(['ok'=>true,'items'=>[],'soft_error'=>'provider_unavailable','source'=>'empty_error_fallback']);
    }
    $price = $last;
    $step = max(1, tf_seconds($tf));
    $items = candles_quote_seed_items($price, time(), $step, $limit);
    json_response(['ok'=>true,'items'=>candles_finalize_items($items, $symbol, $market, $type, $step, $end),'synthetic'=>true,'source'=>'synthetic_error_fallback','soft_error'=>'provider_unavailable']);
  } catch (Throwable $ignored2) {
    json_response(['ok'=>true,'items'=>[],'source'=>'empty_error_fallback','soft_error'=>'provider_unavailable']);
  }
}
