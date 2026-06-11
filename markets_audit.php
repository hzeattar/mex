<?php
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quotes.php';
require_once __DIR__ . '/api/lib/marketdata.php';

$k = (string)($_GET['key'] ?? '');
$allowed = array_values(array_filter([
  (string)env('DEBUG_KEY',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
], fn($v)=>$v!=='' ));
if ($k === '' || !in_array($k, $allowed, true)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$typeFilter = strtolower(trim((string)($_GET['type'] ?? '')));
$limit = max(1, min(500, (int)($_GET['limit'] ?? 250)));
$checkLive = (int)($_GET['check_live'] ?? 0) === 1;
$tf = strtolower(trim((string)($_GET['tf'] ?? '1m')));
if (!in_array($tf, ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w'], true)) $tf = '1m';

function audit_tf_seconds(string $tf): int {
  return match ($tf) {
    '1m' => 60,
    '3m' => 180,
    '5m' => 300,
    '15m' => 900,
    '30m' => 1800,
    '1h' => 3600,
    '2h' => 7200,
    '4h' => 14400,
    '6h' => 21600,
    '8h' => 28800,
    '12h' => 43200,
    '1d' => 86400,
    '3d' => 259200,
    '1w' => 604800,
    default => 60,
  };
}

function audit_source_key(string $symbol, string $type, array $meta): string {
  $symbol = strtoupper(trim($symbol));
  $type = strtolower(trim($type));
  if ($type === 'commodities') {
    if (function_exists('commodity_is_precious_spot_symbol') && commodity_is_precious_spot_symbol($symbol)) {
      $preferred = strtolower(trim((string)($meta['history_source'] ?? env('PRECIOUS_METALS_HISTORY_SOURCE', 'yahoo'))));
      $yTicker = commodity_yahoo_symbol($symbol, $meta);
      $mTicker = commodity_massive_supported_ticker($symbol, $meta);
      if (!in_array($preferred, ['massive','polygon'], true) && $yTicker) return 'YAHOO:' . strtoupper($yTicker);
      if ($mTicker) return 'MASSIVE:' . strtoupper($mTicker);
      if ($yTicker) return 'YAHOO:' . strtoupper($yTicker);
      return 'GEN:' . $symbol;
    }
    $preferred = strtolower(trim((string)($meta['history_source'] ?? env('COMMODITIES_HISTORY_SOURCE', 'yahoo'))));
    $yTicker = commodity_yahoo_symbol($symbol, $meta);
    $mTicker = commodity_massive_supported_ticker($symbol, $meta);
    if (!in_array($preferred, ['massive','polygon'], true) && $yTicker) return 'YAHOO:' . strtoupper($yTicker);
    if ($mTicker) return 'MASSIVE:' . strtoupper($mTicker);
    if ($yTicker) return 'YAHOO:' . strtoupper($yTicker);
    return 'GEN:' . $symbol;
  }
  if ($type === 'stocks') {
    $preferred = strtolower(trim((string)($meta['history_source'] ?? env('STOCKS_HISTORY_SOURCE', 'yahoo'))));
    $mTicker = massive_market_ticker($symbol, $type, $meta);
    $yTicker = yahoo_ticker_for_market($symbol, $type, $meta);
    if ($preferred === 'yahoo' && $yTicker) return 'YAHOO:' . strtoupper($yTicker);
    if ($mTicker) return 'MASSIVE:' . strtoupper($mTicker);
    if ($yTicker) return 'YAHOO:' . strtoupper($yTicker);
    return 'GEN:' . $symbol;
  }
  if ($type === 'forex') {
    $preferred = strtolower(trim((string)($meta['history_source'] ?? env('FOREX_HISTORY_SOURCE', 'massive'))));
    $yTicker = yahoo_ticker_for_market($symbol, $type, $meta);
    $mTicker = massive_market_ticker($symbol, $type, $meta);
    if ($preferred === 'yahoo' && $yTicker) return 'YAHOO:' . strtoupper($yTicker);
    if ($mTicker) return 'MASSIVE:' . strtoupper($mTicker);
    if ($yTicker) return 'YAHOO:' . strtoupper($yTicker);
    return 'GEN:' . $symbol;
  }
  if ($type === 'crypto') return 'BINANCE:' . $symbol;
  return 'GEN:' . $symbol;
}

function audit_candle_cache_path(string $symbol, string $market, string $tf, string $sourceKey): string {
  $safe = preg_replace('/[^A-Z0-9_]/', '_', strtoupper($symbol));
  $safe = substr($safe, 0, 40);
  $src = strtoupper(trim($sourceKey));
  if ($src !== '') {
    $src = preg_replace('/[^A-Z0-9_=:\-]/', '_', $src);
    $src = substr($src, 0, 50);
  } else {
    $src = 'GEN';
  }
  return __DIR__ . '/../data/candles_spot_' . strtolower($safe) . '_' . strtolower($src) . '_' . strtolower($tf) . '.json';
}

function audit_tick_stats(PDO $pdo, string $symbol, string $tf): array {
  $step = max(60, audit_tf_seconds($tf));
  $window = max(3600, $step * 90);
  $start = time() - $window;
  $st = $pdo->prepare("SELECT ts, price FROM market_ticks WHERE symbol=? AND ts>=? ORDER BY ts ASC");
  $st->execute([$symbol, $start]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  $buckets = [];
  foreach ($rows as $r) {
    $ts = (int)($r['ts'] ?? 0);
    $price = (float)($r['price'] ?? 0.0);
    if ($ts <= 0 || $price <= 0) continue;
    $bucket = (int)(floor($ts / $step) * $step);
    if (!isset($buckets[$bucket])) {
      $buckets[$bucket] = ['open'=>$price,'high'=>$price,'low'=>$price,'close'=>$price,'count'=>1];
      continue;
    }
    $buckets[$bucket]['high'] = max((float)$buckets[$bucket]['high'], $price);
    $buckets[$bucket]['low'] = min((float)$buckets[$bucket]['low'], $price);
    $buckets[$bucket]['close'] = $price;
    $buckets[$bucket]['count']++;
  }
  $bars = 0;
  $flatBars = 0;
  $expressiveBars = 0;
  $multiTickBars = 0;
  foreach ($buckets as $bucket => $bar) {
    $bars++;
    if ((int)($bar['count'] ?? 0) > 1) $multiTickBars++;
    $open = (float)($bar['open'] ?? 0.0);
    $close = (float)($bar['close'] ?? 0.0);
    $high = (float)($bar['high'] ?? 0.0);
    $low = (float)($bar['low'] ?? 0.0);
    $base = max(abs($close), 1.0);
    $relative = max(abs($high - $low), abs($open - $close)) / $base;
    if ($relative <= 0.00001) $flatBars++;
    else $expressiveBars++;
  }

  $mergeRecommended = false;
  if ($step <= 60) {
    $mergeRecommended = $expressiveBars >= max(6, (int)ceil($bars * 0.35));
  } elseif ($step <= 300) {
    $mergeRecommended = $expressiveBars >= max(3, (int)ceil($bars * 0.12)) && ($bars <= 0 || ($flatBars / max($bars, 1)) < 0.92);
  } else {
    $mergeRecommended = $expressiveBars >= 2 && ($bars <= 0 || ($flatBars / max($bars, 1)) < 0.96);
  }

  return [
    'window_sec' => $window,
    'bars' => $bars,
    'flat_bars' => $flatBars,
    'expressive_bars' => $expressiveBars,
    'multi_tick_bars' => $multiTickBars,
    'flat_ratio' => $bars > 0 ? ($flatBars / $bars) : null,
    'merge_recommended' => $mergeRecommended,
  ];
}

$pdo = db();
$sql = "SELECT m.symbol, m.type, m.meta, q.price, q.change_pct, q.updated_at
        FROM markets m
        LEFT JOIN market_quotes q ON q.symbol = m.symbol
        WHERE m.status='active'";
$params = [];
if ($typeFilter !== '') {
  $sql .= " AND m.type=?";
  $params[] = $typeFilter;
}
$sql .= " ORDER BY m.type, COALESCE(m.sort_order, 999999), m.symbol LIMIT " . (int)$limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$items = [];
$summary = [
  'count' => 0,
  'warn' => 0,
  'error' => 0,
  'by_type' => [],
  'flat_tick_tail_1m' => 0,
  'stale_quotes' => 0,
  'missing_history_mapping' => 0,
  'missing_live_mapping' => 0,
];
$now = time();

foreach ($rows as $row) {
  $symbol = strtoupper((string)($row['symbol'] ?? ''));
  $type = strtolower((string)($row['type'] ?? ''));
  if ($symbol === '' || $type === '') continue;

  $meta = market_meta($row['meta'] ?? null);
  $preferredLive = function_exists('market_preferred_live_source') ? market_preferred_live_source($symbol, $type, $meta) : 'none';
  $preferredHistory = strtolower(trim((string)($meta['history_source'] ?? ($type === 'forex' ? env('FOREX_HISTORY_SOURCE', 'massive') : ($type === 'stocks' ? env('STOCKS_HISTORY_SOURCE', 'yahoo') : env('COMMODITIES_HISTORY_SOURCE', 'yahoo'))))));
  if ($preferredHistory === 'polygon') $preferredHistory = 'massive';
  if ($preferredHistory === '' || $preferredHistory === 'auto') {
    $preferredHistory = ($type === 'forex') ? 'massive' : 'yahoo';
  }

  $massiveTicker = function_exists('massive_market_ticker') ? massive_market_ticker($symbol, $type, $meta) : null;
  $yahooTicker = function_exists('yahoo_ticker_for_market') ? yahoo_ticker_for_market($symbol, $type, $meta) : null;
  $quote = [
    'price' => (float)($row['price'] ?? 0.0),
    'updated_at' => (int)($row['updated_at'] ?? 0),
    'change_pct' => (float)($row['change_pct'] ?? 0.0),
  ];
  $quoteFresh = function_exists('quote_row_is_fresh') ? quote_row_is_fresh($quote, $type) : null;
  $quoteAge = ((int)$quote['updated_at'] > 0) ? ($now - (int)$quote['updated_at']) : null;
  $sourceKey = audit_source_key($symbol, $type, $meta);
  $cacheFile = audit_candle_cache_path($symbol, 'spot', $tf, $sourceKey);
  $cacheExists = is_file($cacheFile);
  $cacheCount = 0;
  $cacheLast = null;
  $cacheAge = $cacheExists ? ($now - (int)@filemtime($cacheFile)) : null;
  if ($cacheExists) {
    $cacheRaw = @file_get_contents($cacheFile);
    $cacheData = json_decode((string)$cacheRaw, true);
    if (is_array($cacheData)) {
      $cacheCount = count($cacheData);
      $cacheLast = $cacheCount > 0 && is_array(end($cacheData)) ? end($cacheData) : null;
    }
  }

  $tickStats = audit_tick_stats($pdo, $symbol, $tf);
  $flags = [];
  if ($preferredLive === 'none') $flags[] = 'missing_live_mapping';
  if (($preferredHistory === 'massive' && !$massiveTicker) || ($preferredHistory === 'yahoo' && !$yahooTicker)) $flags[] = 'missing_history_mapping';
  if (!$quoteFresh || (is_int($quoteAge) && $quoteAge > 180)) $flags[] = 'stale_quote';
  if ($tf === '1m' && (int)($tickStats['bars'] ?? 0) >= 16 && (float)($tickStats['flat_ratio'] ?? 0.0) >= 0.85 && !(bool)($tickStats['merge_recommended'] ?? false)) {
    $flags[] = 'flat_tick_tail_risk_1m';
  }
  if ($type === 'commodities' && in_array($symbol, ['USOIL','WTI','OIL','UKOIL','BRENT','NGAS'], true) && $preferredHistory !== 'yahoo') {
    $flags[] = 'broad_commodity_history_not_yahoo';
  }
  if ($cacheExists && is_array($cacheLast) && (float)($cacheLast['close'] ?? 0) > 0 && (float)$quote['price'] > 0) {
    $base = max(abs((float)$cacheLast['close']), abs((float)$quote['price']), 1.0);
    $gap = abs((float)$quote['price'] - (float)$cacheLast['close']) / $base;
    if ($gap > 0.08) $flags[] = 'cache_live_gap_large';
  }

  $severity = 'ok';
  if (in_array('missing_live_mapping', $flags, true) || in_array('missing_history_mapping', $flags, true)) $severity = 'error';
  elseif ($flags) $severity = 'warn';

  $liveNow = null;
  if ($checkLive) {
    try {
      $liveNow = quote_live_now($symbol, $type, 'spot', $meta);
    } catch (Throwable $e) {
      $liveNow = ['error' => $e->getMessage()];
    }
  }

  $items[] = [
    'symbol' => $symbol,
    'type' => $type,
    'severity' => $severity,
    'flags' => $flags,
    'preferred_live_source' => $preferredLive,
    'preferred_history_source' => $preferredHistory,
    'massive_ticker' => $massiveTicker,
    'yahoo_ticker' => $yahooTicker,
    'quote_db' => [
      'price' => (float)$quote['price'],
      'change_pct' => (float)$quote['change_pct'],
      'updated_at' => (int)$quote['updated_at'],
      'fresh' => $quoteFresh,
      'age_sec' => $quoteAge,
    ],
    'candle_cache' => [
      'tf' => $tf,
      'source_key' => $sourceKey,
      'exists' => $cacheExists,
      'age_sec' => $cacheAge,
      'count' => $cacheCount,
      'last' => $cacheLast,
    ],
    'tick_tail' => $tickStats,
    'live_now' => $liveNow,
  ];

  $summary['count']++;
  $summary['by_type'][$type] = ($summary['by_type'][$type] ?? 0) + 1;
  if ($severity === 'warn') $summary['warn']++;
  if ($severity === 'error') $summary['error']++;
  if (in_array('flat_tick_tail_risk_1m', $flags, true)) $summary['flat_tick_tail_1m']++;
  if (in_array('stale_quote', $flags, true)) $summary['stale_quotes']++;
  if (in_array('missing_history_mapping', $flags, true)) $summary['missing_history_mapping']++;
  if (in_array('missing_live_mapping', $flags, true)) $summary['missing_live_mapping']++;
}

json_response([
  'ok' => true,
  'generated_at' => $now,
  'tf' => $tf,
  'type_filter' => $typeFilter !== '' ? $typeFilter : null,
  'check_live' => $checkLive,
  'summary' => $summary,
  'items' => $items,
]);
