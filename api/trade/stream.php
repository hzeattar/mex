<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/quote_central.php';
require_once __DIR__ . '/../lib/market_resolver.php';
require_once __DIR__ . '/../lib/asset_reference.php';
require_once __DIR__ . '/../lib/quote_authority.php';
require_once __DIR__ . '/../lib/quote_snapshot.php';
require_once __DIR__ . '/../lib/risk.php';

require_method('GET');

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// lite=1 => quotes only (no auth required). Used by UI fast tickers.
$lite = (int)($_GET['lite'] ?? 0) === 1;
$uid = 0;
if (!$lite) {
  $uid = require_auth();
} else {
  $uid = session_user_id(); // may be 0 (guest)
}

$pdo = db();

// Client can pass comma-separated symbols to reduce payload.
// Backward-compat: some frontends send ?symbol=BTCUSDT&type=crypto&market=perp
$symbolsRaw = (string)($_GET['symbols'] ?? '');
if (trim($symbolsRaw) === '' && isset($_GET['symbol'])) {
  $symbolsRaw = (string)$_GET['symbol'];
}
$symbols = [];
if (trim($symbolsRaw) !== '') {
  foreach (explode(',', $symbolsRaw) as $s) {
    $s = strtoupper(trim($s));
    if ($s !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $s)) $symbols[] = $s;
  }
  $symbols = array_values(array_unique($symbols));
}

$now = time();

// Optional hint from UI
$reqTypeRaw = (string)($_GET['type'] ?? 'crypto');
$reqType = vp_normalize_asset_type($reqTypeRaw);
$reqMarket = strtolower((string)($_GET['market'] ?? (($reqType === 'crypto') ? 'perp' : 'spot'))); // spot|perp
if (!in_array($reqMarket, ['spot','perp'], true)) $reqMarket = (($reqType === 'crypto') ? 'perp' : 'spot');
$returnType = $reqType;
$providerType = vp_provider_asset_type($reqType, $reqMarket);

$cacheDir = dirname(__DIR__) . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
$streamLiteCacheFile = null;
$streamLiteCacheTtl = 0;
$streamLiteStaleCacheTtl = 0;
if ($lite && $symbols) {
  $streamLiteCacheTtl = max(1, min(($providerType === 'crypto' ? 2 : 3), (int)env('STREAM_LITE_CACHE_TTL', ($providerType === 'crypto' ? '1' : '3'))));
  $streamLiteSymbols = $symbols;
  sort($streamLiteSymbols);
  $streamLiteCacheKey = sha1(json_encode([$reqType, $reqMarket, $streamLiteSymbols, 'lite_stream'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  $streamLiteCacheFile = $cacheDir . '/trade_stream_lite_' . $streamLiteCacheKey . '.json';
  if ($streamLiteCacheTtl > 0 && is_file($streamLiteCacheFile)) {
    $age = time() - (int)@filemtime($streamLiteCacheFile);
    if ($age >= 0 && $age <= $streamLiteCacheTtl) {
      $raw = @file_get_contents($streamLiteCacheFile);
      if ($raw !== false && $raw !== '') {
        header('Content-Type: application/json; charset=utf-8');
        echo $raw;
        exit;
      }
    }
  }
  $streamLiteStaleCacheTtl = ($providerType !== 'crypto' && $providerType !== 'arab' && count($symbols) >= 8) ? max(2, min(15, (int)env('STREAM_LITE_STALE_CACHE_TTL_NONCRYPTO', '8'))) : 0;
  if ($streamLiteStaleCacheTtl > 0 && is_file($streamLiteCacheFile)) {
    $age = time() - (int)@filemtime($streamLiteCacheFile);
    if ($age >= 0 && $age <= $streamLiteStaleCacheTtl) {
      $raw = @file_get_contents($streamLiteCacheFile);
      if ($raw !== false && $raw !== '') {
        header('Content-Type: application/json; charset=utf-8');
        echo $raw;
        exit;
      }
    }
  }
}

// ---------------- Positions (only in full mode) ----------------
$positions = [];
$posRows = [];
$posSymbols = [];

if (!$lite && $uid > 0) {
  // Only open positions for speed
  $ps = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,liquidation_price,tp_price,sl_price FROM positions WHERE user_id=? AND status='open'");
  $ps->execute([$uid]);
  $posRows = $ps->fetchAll(PDO::FETCH_ASSOC) ?: [];

  foreach ($posRows as $p) {
    $symDb = (string)($p['symbol'] ?? '');
    // Strip @R@/@D@ prefix for upstream price sources and UI.
    $symUi = (str_starts_with($symDb,'@R@') || str_starts_with($symDb,'@D@')) ? substr($symDb,3) : $symDb;
    $symUi = strtoupper($symUi);
    if ($symUi !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $symUi)) $posSymbols[] = $symUi;
  }
  $posSymbols = array_values(array_unique($posSymbols));
}

// ---------------- Quotes ----------------
// Ensure we have quotes for:
// - requested symbols
// - open position symbols (for mark/pnl calc)
$quoteSymbols = $symbols;
if ($posSymbols) {
  $quoteSymbols = array_values(array_unique(array_merge($quoteSymbols, $posSymbols)));
}
$streamLiteLargeBatch = $lite && count($quoteSymbols) > 6;
$streamLiteLargeNonCrypto = $streamLiteLargeBatch && strtolower($providerType) !== 'crypto';

$quotes = [];
$marketInfoBySymbol = [];
if (!function_exists('stream_enrich_market_meta')) {
  function stream_enrich_market_meta(string $symbol, string $type, array $meta): array {
    $symbol = strtoupper(trim($symbol));
    $type = vp_normalize_asset_type($type);
    if ($symbol === '' || !function_exists('vp_asset_reference')) return $meta;
    try {
      $ref = vp_asset_reference($symbol, $type, $meta);
      $overrideReference = ($type === 'futures');
      foreach (['twelvedata_ticker','eodhd_symbol','tv_symbol'] as $key) {
        if (!empty($ref[$key]) && ($overrideReference || empty($meta[$key]))) $meta[$key] = $ref[$key];
      }
    } catch (Throwable $e) {
      // Keep DB metadata if the reference map is unavailable for any reason.
    }
    return $meta;
  }
}
if (!function_exists('stream_latest_cached_candle_quote')) {
  function stream_latest_cached_candle_quote(string $symbol, string $market, string $type): ?array {
    $symbol = strtoupper(trim($symbol));
    if ($symbol === '' || !preg_match('/^[A-Z0-9:._-]{1,32}$/', $symbol)) return null;
    $market = strtolower(trim($market)) === 'perp' ? 'perp' : 'spot';
    $type = vp_normalize_asset_type($type ?: 'generic');
    $safe = preg_replace('/[^A-Z0-9_]/', '_', $symbol);
    $safe = substr((string)$safe, 0, 40);
    $safeType = preg_replace('/[^a-z0-9_]/', '_', strtolower($type ?: 'generic'));
    $best = null;
    $sourceAllowed = static function(string $source) use ($type): bool {
      $src = strtolower(trim($source));
      if ($src === '' || in_array($src, ['seed','synthetic','synthetic_error_fallback','yahoo','yahoo_chart','yahoo_chart_fallback','aggs'], true)) return false;
      if ($type === 'arab') return in_array($src, ['eodhd_intraday','eodhd','eodhd_rest','provider_live','twelvedata_time_series','twelvedata','twelvedata_ws'], true);
      return in_array($src, ['twelvedata_time_series','twelvedata','twelvedata_ws','eodhd_intraday','eodhd','eodhd_rest','provider_live'], true);
    };
    $considerRow = static function($row) use (&$best, $sourceAllowed): void {
      if (!is_array($row)) return;
      $quality = strtolower((string)($row['quality'] ?? ''));
      if (!empty($row['synthetic']) || in_array($quality, ['synthetic','seed','gap_fill'], true)) return;
      $source = strtolower(trim((string)($row['source'] ?? '')));
      $realCachedCandle = ($source === '' || in_array($source, ['cache','cache_fast'], true)) && str_starts_with($quality, 'real');
      if (!$sourceAllowed($source) && !$realCachedCandle) return;
      $price = (float)($row['close'] ?? $row['c'] ?? 0);
      $time = (int)($row['time'] ?? $row['t'] ?? 0);
      if (!($price > 0) || $time <= 0) return;
      if (!is_array($best) || $time > (int)($best['updated_at'] ?? 0)) {
        $best = [
          'price' => $price,
          'open' => (float)($row['open'] ?? $row['o'] ?? 0),
          'updated_at' => $time,
        ];
      }
    };
    foreach (['1m','5m','15m','30m','1h','1d'] as $tf) {
      $path = __DIR__ . '/../data/candles_v5_' . $market . '_' . $safeType . '_' . strtolower($safe) . '_' . $tf . '.json';
      if (!is_file($path)) continue;
      $raw = @file_get_contents($path);
      if (!is_string($raw) || $raw === '') continue;
      $rows = json_decode($raw, true);
      if (!is_array($rows) || !$rows) continue;
      for ($i = count($rows) - 1; $i >= 0; $i--) {
        $row = is_array($rows[$i] ?? null) ? $rows[$i] : null;
        $before = is_array($best) ? (int)($best['updated_at'] ?? 0) : 0;
        $considerRow($row);
        if (is_array($best) && (int)($best['updated_at'] ?? 0) > $before) break;
      }
    }
    try {
      $pdo = db();
      foreach (['1m','5m','15m','30m','1h','1d'] as $tf) {
        $st = $pdo->prepare("SELECT time,open,close,source,quality FROM market_candles WHERE symbol=? AND type=? AND market=? AND tf=? ORDER BY time DESC LIMIT 12");
        $st->execute([$symbol, $type, $market, $tf]);
        foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
          $before = is_array($best) ? (int)($best['updated_at'] ?? 0) : 0;
          $considerRow($row);
          if (is_array($best) && (int)($best['updated_at'] ?? 0) > $before) break;
        }
      }
    } catch (Throwable $e) {
      // DB candle cache may not be enabled in every environment.
    }
    if (is_array($best)) {
      $maxAge = in_array($type, ['stocks','arab'], true) ? 604800 : 259200;
      if ((time() - (int)($best['updated_at'] ?? 0)) > $maxAge) return null;
    }
    return $best;
  }
}
$resolveStreamContext = static function(string $sym) use (&$marketInfoBySymbol, $reqTypeRaw, $reqMarket): array {
  $sym = strtoupper(trim($sym));
  $info = $marketInfoBySymbol[$sym] ?? [];
  $rawType = strtolower((string)($info['type'] ?? $reqTypeRaw ?? 'crypto'));
  if ($rawType === 'fx') $rawType = 'forex';
  if ($rawType === 'indices') $rawType = 'forex';
  $meta = is_array($info['meta'] ?? null) ? $info['meta'] : [];
  return vp_market_context($sym, $rawType, $reqMarket, $meta);
};
$resolveStreamQuoteType = static function(string $sym) use (&$resolveStreamContext): string {
  $ctx = $resolveStreamContext($sym);
  return (string)($ctx['provider_type'] ?? 'crypto');
};
$resolveStreamReturnType = static function(string $sym) use (&$marketInfoBySymbol, $reqType): string {
  $raw = strtolower((string)($marketInfoBySymbol[$sym]['type'] ?? ''));
  if ($raw === 'fx') return 'forex';
  if ($raw === 'indices') return 'indices';
  if ($raw === 'perpetual' || $raw === 'perp') return 'futures';
  if ($raw !== '') return $raw;
  return vp_normalize_asset_type((string)$reqType);
};
$streamQuoteRowUsable = static function($row, string $assetType) use ($now): bool {
  if (!is_array($row)) return false;
  $assetType = vp_normalize_asset_type($assetType);
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  if ($assetType === 'crypto') return true;
  $src = strtolower(trim((string)($row['source'] ?? '')));
  if (!quote_source_is_liveish($src, $assetType)) return false;
  $updatedAt = (int)($row['updated_at'] ?? 0);
  if ($updatedAt <= 0) return false;
  $age = max(0, $now - $updatedAt);
  $maxAge = in_array($assetType, ['stocks','arab'], true) ? 20 : (in_array($assetType, ['commodities','futures'], true) ? 12 : 10);
  return $age <= $maxAge;
};
$streamQuoteRowFallbackUsable = static function($row, string $assetType) use ($now): bool {
  if (!is_array($row)) return false;
  $assetType = vp_normalize_asset_type($assetType);
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  if ($assetType === 'crypto') return true;
  $src = strtolower(trim((string)($row['source'] ?? '')));
  if (!quote_source_is_liveish($src, $assetType)) return false;
  $updatedAt = (int)($row['updated_at'] ?? 0);
  if ($updatedAt <= 0) return false;
  $age = max(0, $now - $updatedAt);
  $maxAge = in_array($assetType, ['stocks','arab'], true) ? 32 : (in_array($assetType, ['commodities','futures'], true) ? 20 : 18);
  return $age <= $maxAge;
};

$streamRowTs = static function($row, int $fallback = 0): int {
  if (!is_array($row)) return $fallback;
  foreach (['provider_updated_at','as_of','updated_at'] as $k) {
    if (isset($row[$k]) && is_numeric($row[$k])) {
      $ts = (int)$row[$k];
      if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
      if ($ts > 0) return $ts;
    }
  }
  return $fallback;
};
if ($quoteSymbols) {
  // ── Central cache fast path ──────────────────────────────────────────────
  // If the feed worker is running and central cache is warm, read prices from
  // there first. This avoids ALL upstream hits from this per-user endpoint.
  $centralWarmForStream = quote_central_is_warm($reqType);

  $in = implode(',', array_fill(0, count($quoteSymbols), '?'));
  try {
    $metaSt = $pdo->prepare("SELECT symbol,type,meta FROM markets WHERE symbol IN ($in)");
    $metaSt->execute($quoteSymbols);
    foreach (($metaSt->fetchAll(PDO::FETCH_ASSOC) ?: []) as $mr) {
      $sym = strtoupper((string)($mr['symbol'] ?? ''));
      if ($sym === '') continue;
      $mType = vp_normalize_asset_type((string)($mr['type'] ?? $reqType));
      $marketInfoBySymbol[$sym] = [
        'type' => $mType,
        'meta' => stream_enrich_market_meta($sym, $mType, market_meta($mr['meta'] ?? null)),
      ];
    }
  } catch (Throwable $e) {
    $marketInfoBySymbol = [];
  }
  $bulkLiteLive = [];
  // Skip upstream bulk live when central cache is warm — the feed worker handles it
  if ($lite && $providerType !== 'crypto' && $quoteSymbols && !$centralWarmForStream) {
    $metaBySymbol = [];
    foreach ($quoteSymbols as $qsym) {
      $metaBySymbol[$qsym] = is_array($marketInfoBySymbol[$qsym]['meta'] ?? null) ? $marketInfoBySymbol[$qsym]['meta'] : [];
    }
    try {
      $streamBudget = $streamLiteLargeNonCrypto ? 0 : (in_array($reqType, ['stocks','arab','futures'], true) ? count($quoteSymbols) : min(8, count($quoteSymbols)));
      $bulkLiteLive = quote_bulk_live($quoteSymbols, $reqType, $metaBySymbol, [
        'ttl' => 1,
        'yahoo_ttl' => 0,
        'massive_ttl' => 1,
        'direct_budget' => $streamBudget,
        'direct_yahoo_budget' => 0,
        'chart_budget' => $streamLiteLargeNonCrypto ? max(0, min(2, count($quoteSymbols))) : (in_array($reqType, ['arab','futures'], true) ? max(8, min(count($quoteSymbols), 20)) : 8),
      ]);
    } catch (Throwable $e) {
      $bulkLiteLive = [];
    }
  }
  $drv = db_driver();
  $hasMark  = function_exists('schema_column_exists') ? schema_column_exists($pdo,'market_quotes','mark_price',$drv) : true;
  $hasIndex = function_exists('schema_column_exists') ? schema_column_exists($pdo,'market_quotes','index_price',$drv) : true;
  $hasFund  = function_exists('schema_column_exists') ? schema_column_exists($pdo,'market_quotes','funding_rate',$drv) : true;
  $hasNft   = function_exists('schema_column_exists') ? schema_column_exists($pdo,'market_quotes','next_funding_time',$drv) : true;
  $sel = "symbol,type,price,change_pct";
  $sel .= $hasMark  ? ",mark_price"        : ",price AS mark_price";
  $sel .= $hasIndex ? ",index_price"       : ",NULL AS index_price";
  $hasSource = function_exists('schema_column_exists') ? schema_column_exists($pdo,'market_quotes','source',$drv) : true;
  $sel .= $hasFund  ? ",funding_rate"      : ",NULL AS funding_rate";
  $sel .= $hasNft   ? ",next_funding_time" : ",NULL AS next_funding_time";
  $sel .= $hasSource ? ",source" : ",'' AS source";
  $sel .= ",updated_at";
  $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol IN ($in)");
  $st->execute($quoteSymbols);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  foreach ($rows as $r) {
    $sym = (string)$r['symbol'];
    $quotes[$sym] = [
      'symbol'=>(string)$r['symbol'],
      'type'=>(string)($r['type'] ?? 'crypto'),
      'price'=>(float)($r['price'] ?? 0),
      'change_pct'=>(float)($r['change_pct'] ?? 0),
      'mark_price'=>isset($r['mark_price']) ? (float)$r['mark_price'] : null,
      'index_price'=>isset($r['index_price']) ? (float)$r['index_price'] : null,
      'funding_rate'=>isset($r['funding_rate']) ? (float)$r['funding_rate'] : null,
      'next_funding_time'=>isset($r['next_funding_time']) ? (int)$r['next_funding_time'] : null,
      'source'=>(string)($r['source'] ?? ''),
      'updated_at'=>(int)($r['updated_at'] ?? 0),
    ];
  }

  if ($lite) {
    foreach (array_keys($quotes) as $sym) {
      $assetTypeForSym = $resolveStreamQuoteType($sym);
      if ($assetTypeForSym !== 'crypto' && !$streamQuoteRowUsable($quotes[$sym] ?? null, $assetTypeForSym)) {
        unset($quotes[$sym]);
      }
    }
    if ($bulkLiteLive) {
      foreach ($bulkLiteLive as $sym => $row) {
        if (!is_array($row) || !((float)($row['price'] ?? 0) > 0)) continue;
        $quotes[$sym] = [
          'symbol' => $sym,
          'type' => $resolveStreamReturnType($sym) ?: ($marketInfoBySymbol[$sym]['type'] ?? $returnType ?: $reqType),
          'price' => (float)($row['price'] ?? 0),
          'change_pct' => (float)($row['change_pct'] ?? 0),
          'mark_price' => null,
          'index_price' => null,
          'funding_rate' => null,
          'next_funding_time' => null,
          'source' => (string)($row['source'] ?? 'provider_live'),
          'updated_at' => (int)($row['updated_at'] ?? $now),
        ];
      }
    }
  }

  // Fill missing symbols with a quote from central cache or fallback.
  foreach ($quoteSymbols as $sym) {
    $ctxForSym = $resolveStreamContext($sym);
    $assetTypeForSym = $resolveStreamQuoteType($sym);
    $returnTypeForSym = $resolveStreamReturnType($sym) ?: $assetTypeForSym;
    $forceSmallLiveVerify = $lite && count($quoteSymbols) <= 3 && in_array($assetTypeForSym, ['futures'], true);
    if (isset($quotes[$sym]) && (float)($quotes[$sym]['price'] ?? 0) > 0 && !$forceSmallLiveVerify) continue;
    $effectiveMarketForSym = (string)($ctxForSym['effective_market'] ?? (($assetTypeForSym === 'crypto' && $reqMarket === 'perp') ? 'perp' : 'spot'));
    $existingQuote = is_array($quotes[$sym] ?? null) ? $quotes[$sym] : null;
    $p = (float)($existingQuote['price'] ?? 0.0);
    $chg = (float)($existingQuote['change_pct'] ?? 0.0);
    $src = (string)($existingQuote['source'] ?? '');
    $updTs = (int)($existingQuote['updated_at'] ?? $now) ?: $now;

    // ── Try central cache first ──
    $centralRow = null;
    if ($centralWarmForStream) {
      try {
        $centralRow = quote_central_get($sym, $assetTypeForSym, 60);
      } catch (Throwable $e) { $centralRow = null; }
    }
    if (is_array($centralRow) && (float)($centralRow['price'] ?? 0) > 0) {
      $p = (float)$centralRow['price'];
      $chg = (float)($centralRow['change_pct'] ?? 0);
      $src = (string)($centralRow['source'] ?? 'central');
      $updTs = (int)($centralRow['central_ts'] ?? $centralRow['updated_at'] ?? $now) ?: $now;
    }
    if ($p <= 0) {
      try {
        if ($lite && $assetTypeForSym !== 'crypto') {
          $qrow = quote_get($sym, $assetTypeForSym);
          $rowOkay = $streamQuoteRowUsable($qrow, $assetTypeForSym) || ($streamLiteLargeNonCrypto && $streamQuoteRowFallbackUsable($qrow, $assetTypeForSym));
          if (is_array($qrow) && $rowOkay) {
            $p = (float)($qrow['price'] ?? 0.0);
            $chg = (float)($qrow['change_pct'] ?? 0.0);
            $src = (string)($qrow['source'] ?? '');
            $updTs = (int)($qrow['updated_at'] ?? $now) ?: $now;
          }
        } else {
          $p = (float)quote_price_fresh($sym, $assetTypeForSym);
          $qrow = quote_get($sym, $assetTypeForSym);
          if (is_array($qrow)) {
            $chg = (float)($qrow['change_pct'] ?? 0.0);
            $src = (string)($qrow['source'] ?? '');
            $updTs = (int)($qrow['updated_at'] ?? $now) ?: $now;
            if ($p <= 0) $p = (float)($qrow['price'] ?? 0);
          }
        }
      } catch (Throwable $e) {
        if (!$lite || $assetTypeForSym === 'crypto') {
          try {
            $p = (float)quote_price($sym, $effectiveMarketForSym, $assetTypeForSym);
            $qrow = quote_get($sym, $assetTypeForSym);
            if (is_array($qrow)) {
              $chg = (float)($qrow['change_pct'] ?? $chg);
              $src = (string)($qrow['source'] ?? $src);
              $updTs = (int)($qrow['updated_at'] ?? $updTs) ?: $updTs;
            }
          } catch (Throwable $ignored) { $p = 0.0; }
        } else {
          $p = 0.0;
        }
      }
    }
    if (($p <= 0 || $forceSmallLiveVerify) && function_exists('qa_quote_payload')) {
      try {
        $allowSmallLiveFallback = !$streamLiteLargeNonCrypto || count($quoteSymbols) <= 3;
        if ($assetTypeForSym !== 'crypto' && $allowSmallLiveFallback && ($p <= 0 || $forceSmallLiveVerify) && function_exists('quote_bulk_live')) {
          $metaArr = is_array($marketInfoBySymbol[$sym]['meta'] ?? null) ? $marketInfoBySymbol[$sym]['meta'] : [];
          $liveMap = quote_bulk_live([$sym], $assetTypeForSym, [$sym => $metaArr], [
            'ttl' => 1,
            'yahoo_ttl' => 0,
            'massive_ttl' => 1,
            'direct_budget' => 1,
            'direct_yahoo_budget' => 0,
            'chart_budget' => 1,
            'chart_budget_ms' => 1500,
          ]);
          $liveRow = is_array($liveMap[$sym] ?? null) ? $liveMap[$sym] : null;
          if ($liveRow && (float)($liveRow['price'] ?? 0) > 0) {
            $p = (float)$liveRow['price'];
            $chg = (float)($liveRow['change_pct'] ?? $chg);
            $src = (string)($liveRow['source'] ?? $src ?: 'provider_live');
            $updTs = (int)($liveRow['updated_at'] ?? $updTs) ?: $updTs;
          }
        }
        if ($p <= 0) {
          $qa = qa_quote_payload($assetTypeForSym, [$sym], [
            'allow_live' => ($assetTypeForSym === 'crypto' || $allowSmallLiveFallback),
            'allow_crypto_seed' => true,
            'allow_noncrypto_seed' => false,
            'direct_budget' => 1,
            'direct_yahoo_budget' => 0,
            'chart_budget' => 1,
          ]);
          $item = is_array($qa['items'][0] ?? null) ? $qa['items'][0] : null;
          if ($item && (float)($item['price'] ?? 0) > 0) {
            $p = (float)$item['price'];
            $chg = (float)($item['change_pct'] ?? $chg);
            $src = (string)($item['source'] ?? $src);
            $updTs = (int)($item['updated_at'] ?? $updTs) ?: $updTs;
          }
        }
      } catch (Throwable $ignored) {}
    }
    if (($p <= 0 && in_array($returnTypeForSym, ['stocks','arab'], true)) || $returnTypeForSym === 'arab') {
      try {
        $candleQuote = stream_latest_cached_candle_quote($sym, $effectiveMarketForSym, $returnTypeForSym);
        if (is_array($candleQuote) && (float)($candleQuote['price'] ?? 0) > 0) {
          $candlePrice = (float)$candleQuote['price'];
          $drift = ($p > 0 && $candlePrice > 0) ? abs($p - $candlePrice) / max(0.000001, $candlePrice) : 1.0;
          $marketClosed = function_exists('qa_market_is_open') ? !qa_market_is_open($returnTypeForSym) : true;
          if ($p <= 0 || ($returnTypeForSym === 'arab' && ($marketClosed || $drift > 0.05))) {
            $p = $candlePrice;
            $open = (float)($candleQuote['open'] ?? 0);
            $chg = $open > 0 ? (($p / $open) - 1.0) * 100.0 : $chg;
            $src = 'twelvedata';
            $updTs = (int)($candleQuote['updated_at'] ?? $updTs) ?: $updTs;
          }
        }
      } catch (Throwable $ignoredCandleQuote) {}
    }
    $quotes[$sym] = [
      'symbol' => $sym,
      'type' => $resolveStreamReturnType($sym) ?: ($marketInfoBySymbol[$sym]['type'] ?? $returnType ?: $assetTypeForSym ?: 'crypto'),
      'price' => (float)$p,
      'change_pct' => $chg,
      'mark_price' => ($effectiveMarketForSym === 'perp' && $assetTypeForSym === 'crypto' ? (float)$p : null),
      'index_price' => null,
      'funding_rate' => null,
      'next_funding_time' => null,
      'updated_at' => $updTs,
      'source' => $src,
    ];
  }

  // Ultra-fast path: for CRYPTO SPOT, use central cache or Binance bulk.
  if (strtolower($providerType) === 'crypto' && strtolower($reqMarket) === 'spot' && count($quoteSymbols) >= 1) {
    if ($centralWarmForStream) {
      // Central cache path — read from feed worker's cache, no upstream
      foreach ($quoteSymbols as $sym) {
        try {
          $cr = quote_central_get($sym, 'crypto', 60);
          if (is_array($cr) && (float)($cr['price'] ?? 0) > 0) {
            $quotes[$sym]['price'] = (float)$cr['price'];
            $quotes[$sym]['change_pct'] = (float)($cr['change_pct'] ?? $quotes[$sym]['change_pct']);
            $quotes[$sym]['updated_at'] = (int)($cr['central_ts'] ?? $now);
          }
        } catch (Throwable $e) {}
      }
    } else {
    try {
      $b = binance_ticker_24hr_many_cached($quoteSymbols, (int)(env('CRYPTO_PRICE_TTL', '1') ?? '1'));
      foreach ($quoteSymbols as $sym) {
        if (!isset($b[$sym])) continue;
        $quotes[$sym]['price'] = (float)($b[$sym]['price'] ?? $quotes[$sym]['price']);
        $quotes[$sym]['change_pct'] = (float)($b[$sym]['change_pct'] ?? $quotes[$sym]['change_pct']);
        $quotes[$sym]['updated_at'] = $now;
      }
    } catch (Throwable $e) {
      // ignore
    }
    }
  }

  // For CRYPTO PERP, prefer central cache or Binance futures mark price.
  if (strtolower($providerType) === 'crypto' && strtolower($reqMarket) === 'perp' && $quoteSymbols) {
    if ($centralWarmForStream) {
      // Central cache path — read from feed worker's cache, no upstream
      foreach ($quoteSymbols as $sym) {
        try {
          $cr = quote_central_get($sym, 'crypto', 60);
          if (is_array($cr) && (float)($cr['price'] ?? 0) > 0) {
            $quotes[$sym]['price'] = (float)$cr['price'];
            $quotes[$sym]['mark_price'] = (float)$cr['price'];
            $quotes[$sym]['updated_at'] = (int)($cr['central_ts'] ?? $now);
          }
        } catch (Throwable $e) {}
      }
    } else {
    $ttl = (int)(env('STREAM_PERP_TTL', '1') ?? '1');
    $ttl = max(1, min(10, $ttl));
    foreach ($quoteSymbols as $sym) {
      try {
        $m = binance_futures_mark_price_cached($sym, $ttl);
        if (is_array($m) && isset($m['mark_price']) && (float)$m['mark_price'] > 0) {
          $quotes[$sym]['mark_price'] = (float)$m['mark_price'];
          $quotes[$sym]['price'] = (float)$m['mark_price'];
          if (isset($m['index_price'])) {
            $idx = (float)$m['index_price'];
            $mark = (float)$m['mark_price'];
            $quotes[$sym]['index_price'] = ($idx > 0 && abs($idx - $mark) / max(1.0, abs($mark)) <= 0.02) ? $idx : $mark;
          }
          if (isset($m['funding_rate'])) $quotes[$sym]['funding_rate'] = $m['funding_rate'];
          if (isset($m['next_funding_time'])) {
            $nft = $m['next_funding_time'] !== null ? (int)$m['next_funding_time'] : null;
            $quotes[$sym]['next_funding_time'] = ($nft !== null && $nft >= ($now - 3600)) ? $nft : null;
          }
          $quotes[$sym]['updated_at'] = $now;
        }
      } catch (Throwable $e) {
        // ignore
      }
    }
    } // end else (central cache miss for perp)
  }

  // Fast non-crypto path: bulk Yahoo quotes or central cache.
  if (in_array(strtolower($providerType), ['stocks','commodities','futures'], true) && $quoteSymbols) {
    // Try central cache first
    if ($centralWarmForStream) {
      foreach ($quoteSymbols as $sym) {
        try {
          $cr = quote_central_get($sym, $providerType, 60);
          if (is_array($cr) && (float)($cr['price'] ?? 0) > 0) {
            $quotes[$sym]['price'] = (float)$cr['price'];
            $quotes[$sym]['change_pct'] = (float)($cr['change_pct'] ?? $quotes[$sym]['change_pct']);
            $quotes[$sym]['updated_at'] = (int)($cr['central_ts'] ?? $quotes[$sym]['updated_at'] ?? $now);
            $quotes[$sym]['source'] = (string)($cr['source'] ?? $quotes[$sym]['source'] ?? 'central');
          }
        } catch (Throwable $e) {}
      }
    } else {
    try {
      $in2 = implode(',', array_fill(0, count($quoteSymbols), '?'));
      $st2 = $pdo->prepare("SELECT symbol,type,meta FROM markets WHERE symbol IN ($in2)");
      $st2->execute($quoteSymbols);
      $mrows = $st2->fetchAll(PDO::FETCH_ASSOC) ?: [];

      $ySyms = [];
      $yKeyBySym = [];
      if (function_exists('quote_yahoo_enabled') && quote_yahoo_enabled()) {
        foreach ($mrows as $mr) {
          $sym = strtoupper((string)($mr['symbol'] ?? ''));
          $tt  = strtolower((string)($mr['type'] ?? ''));
          if ($sym === '') continue;
          $ctxType = vp_provider_asset_type($tt);
          if (!in_array($ctxType, ['stocks','commodities','futures'], true) && $tt !== 'arab') continue;

          $metaArr = stream_enrich_market_meta($sym, $tt, market_meta($mr['meta'] ?? null));
          if ($tt === 'commodities' && vp_is_spot_metal_symbol($sym, $tt)) {
            continue;
          }
          if (!quote_provider_prefers_yahoo($tt, $metaArr, $sym) && !in_array($tt, ['futures'], true)) {
            continue;
          }

          $y = yahoo_ticker_for_market($sym, $tt, $metaArr) ?: '';
          if ($y !== '' && preg_match('/^[A-Z0-9.=\-]{1,20}$/', $y)) {
            $yKeyBySym[$sym] = $y;
            $ySyms[] = $y;
          }
        }
      }

      if ($ySyms) {
        $ttlY = (int)(env('YAHOO_PRICE_TTL', '3') ?? '3');
        $ttlY = max(1, min(30, $ttlY));
        $ySyms = array_values(array_unique($ySyms));
        $yMap = [];
        foreach (array_chunk($ySyms, 30) as $ch) {
          $part = yahoo_quote_many_cached($ch, $ttlY);
          if (is_array($part)) {
            foreach ($part as $k => $v) {
              if (is_array($v)) $yMap[(string)$k] = $v;
            }
          }
        }

        foreach ($quoteSymbols as $sym) {
          $sym = strtoupper($sym);
          $yk = $yKeyBySym[$sym] ?? '';
          if ($yk === '' || !isset($yMap[$yk]) || !is_array($yMap[$yk])) continue;
          $yp = (float)($yMap[$yk]['price'] ?? 0);
          if ($yp <= 0) continue;
          $quotes[$sym]['price'] = $yp;
          $quotes[$sym]['change_pct'] = (float)($yMap[$yk]['change_pct'] ?? $quotes[$sym]['change_pct']);
          $quotes[$sym]['updated_at'] = $streamRowTs($yMap[$yk], $quotes[$sym]['updated_at'] ?? $now);
          $quotes[$sym]['source'] = (string)($yMap[$yk]['source'] ?? 'yahoo');
        }
      }
    } catch (Throwable $e) {
      // ignore
    }
    } // end else (central cache miss for non-crypto)
  }

  if ($quoteSymbols) {
    try {
      $authorityGroups = [];
      foreach ($quoteSymbols as $qsym) {
        $qsym = strtoupper((string)$qsym);
        if ($qsym === '') continue;
        $assetTypeForSym = $resolveStreamQuoteType($qsym);
        if ($assetTypeForSym === 'crypto') continue;
        $authorityGroups[$assetTypeForSym][] = $qsym;
      }
      foreach ($authorityGroups as $assetTypeForGroup => $groupSymbols) {
        $groupSymbols = array_values(array_unique(array_filter(array_map('strtoupper', (array)$groupSymbols))));
        if (!$groupSymbols) continue;
        // Skip authority payload call when central cache is warm — prices already filled
        if ($centralWarmForStream) continue;
        $payload = qa_quote_payload($assetTypeForGroup, $groupSymbols, [
          'allow_live' => true,
          'allow_noncrypto_seed' => false,
          'direct_budget' => min(count($groupSymbols), $lite ? 10 : 6),
          'direct_yahoo_budget' => 0,
          'chart_budget' => in_array($assetTypeForGroup, ['stocks','arab'], true) ? 0 : min(count($groupSymbols), 4),
        ]);
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        foreach ($items as $row) {
          $sym = strtoupper((string)($row['symbol'] ?? ''));
          if ($sym === '' || !isset($quotes[$sym])) continue;
          $assetTypeForSym = $resolveStreamQuoteType($sym);
          if (!$streamQuoteRowUsable($row, $assetTypeForSym) && !$streamQuoteRowFallbackUsable($row, $assetTypeForSym)) continue;
          $quotes[$sym]['price'] = (float)($row['price'] ?? $quotes[$sym]['price'] ?? 0);
          $quotes[$sym]['change_pct'] = (float)($row['change_pct'] ?? $quotes[$sym]['change_pct'] ?? 0);
          $quotes[$sym]['updated_at'] = (int)($row['updated_at'] ?? $quotes[$sym]['updated_at'] ?? $now);
          $quotes[$sym]['source'] = (string)($row['source'] ?? $quotes[$sym]['source'] ?? '');
        }
      }
    } catch (Throwable $e) {
      // ignore and keep local stream fallbacks
    }
  }

  // Soft-refresh stale quotes to make UI feel realtime.
  // IMPORTANT: We still keep it rate-limit friendly by using cached upstream calls.
  $ttlSpot = (int)(env('STREAM_SPOT_TTL', '2') ?? '2');
  $ttlPerp = (int)(env('STREAM_PERP_TTL', '1') ?? '1');
  $ttlSpot = max(1, min(30, $ttlSpot));
  $ttlPerp = max(1, min(30, $ttlPerp));
  $ttl = ($reqMarket === 'perp') ? $ttlPerp : $ttlSpot;

  $budget = (int)(env('STREAM_REFRESH_BUDGET', $lite ? '10' : '16') ?? ($lite ? '10' : '16'));
  $budget = max(0, min(30, $budget));
  if ($lite && strtolower($providerType) !== 'crypto') $budget = $streamLiteLargeNonCrypto ? 0 : max(0, min(1, $budget));
  // Skip upstream refresh budget when central cache is warm — feed worker handles it
  if ($centralWarmForStream) $budget = 0;

  $forceFreshSymbols = [];
  if ($lite && count($quoteSymbols) > 0 && count($quoteSymbols) <= 3) {
    foreach ($quoteSymbols as $sym) {
      $sym = strtoupper((string)$sym);
      $ctxType = $resolveStreamQuoteType($sym);
      if ($ctxType === 'crypto') $forceFreshSymbols[$sym] = true;
    }
  }

  if ($budget > 0 || $forceFreshSymbols) {
    $todo = [];
    foreach ($quoteSymbols as $sym) {
      $q = $quotes[$sym] ?? null;
      $upd = $q ? (int)($q['updated_at'] ?? 0) : 0;
      $age = ($upd > 0) ? ($now - $upd) : 999999;
      $px = $q ? (float)($q['price'] ?? 0) : 0.0;
      if ($px <= 0 || $age > $ttl || isset($forceFreshSymbols[$sym])) {
        $todo[$sym] = $age + (isset($forceFreshSymbols[$sym]) ? 999999 : 0);
      }
    }

    // Refresh older ones first
    arsort($todo);
    $i = 0;
    foreach ($todo as $sym => $age) {
      if ($i >= $budget) break;
      $assetTypeForSym = $resolveStreamQuoteType($sym);
      try {
        $p = 0.0;
        if (isset($forceFreshSymbols[$sym]) && in_array($assetTypeForSym, ['commodities','futures','stocks','forex','arab'], true)) {
          try {
            $metaArr = is_array($marketInfoBySymbol[$sym]['meta'] ?? null) ? ($marketInfoBySymbol[$sym]['meta'] ?? []) : market_meta($marketInfoBySymbol[$sym]['meta'] ?? null);
            $direct = quote_fetch_external($sym, $assetTypeForSym, $metaArr ?: []);
            if (is_numeric($direct) && (float)$direct > 0) {
              $p = (float)$direct;
              // Disabled: read path must not persist quote state.
            }
          } catch (Throwable $ignoredDirect) {}
        }
        if ($p <= 0) $p = (float)quote_price_fresh($sym, $assetTypeForSym);
        if ($p > 0) {
          $quotes[$sym]['price'] = $p;
          if ($reqMarket === 'perp' && $assetTypeForSym === 'crypto') $quotes[$sym]['mark_price'] = $p;
          $freshUpd = $now;
          try {
            $freshRow = quote_get($sym, $assetTypeForSym);
            if (is_array($freshRow)) {
              $quotes[$sym]['change_pct'] = (float)($freshRow['change_pct'] ?? $quotes[$sym]['change_pct'] ?? 0);
              $quotes[$sym]['source'] = (string)($freshRow['source'] ?? ($quotes[$sym]['source'] ?? ''));
              $freshUpd = (int)($freshRow['updated_at'] ?? $freshUpd) ?: $freshUpd;
            }
          } catch (Throwable $ignored) {}
          $quotes[$sym]['updated_at'] = $freshUpd;
        }
      } catch (Throwable $e) {
        try {
          $p = (float)quote_price($sym, ($assetTypeForSym === 'crypto' ? $reqMarket : 'spot'), $assetTypeForSym);
          if ($p > 0) {
            $quotes[$sym]['price'] = $p;
            if ($reqMarket === 'perp' && $assetTypeForSym === 'crypto') $quotes[$sym]['mark_price'] = $p;
            $quotes[$sym]['updated_at'] = $now;
          }
        } catch (Throwable $ignored2) {}
      }
      $i++;
    }
  }
}

// Compute positions snapshot with current pnl (no N+1 quote_get).
if (!$lite && $posRows) {
  foreach ($posRows as $p) {
    $symDb = (string)($p['symbol'] ?? '');
    $sym = (str_starts_with($symDb,'@R@') || str_starts_with($symDb,'@D@')) ? substr($symDb,3) : $symDb;
    $sym = strtoupper($sym);

    $assetType = (string)($p['asset_type'] ?? 'crypto');
    $mt = strtolower((string)($p['market_type'] ?? 'spot'));
    if (!in_array($mt, ['spot','perp'], true)) $mt = 'spot';

    $q = $quotes[$sym] ?? null;
    $mark = 0.0;
    if ($q) {
      if ($mt === 'perp') {
        $mp = (float)($q['mark_price'] ?? 0);
        $mark = ($mp > 0) ? $mp : (float)($q['price'] ?? 0);
      } else {
        $mark = (float)($q['price'] ?? 0);
      }
    }

    if ($mark <= 0) {
      try { $mark = (float)quote_price($sym, $mt ?: 'spot', $assetType ?: 'crypto'); } catch (Throwable $e) { $mark = 0.0; }
    }

    $qty = (float)($p['qty'] ?? 0);
    $entry = (float)($p['entry_price'] ?? 0);
    $side = (string)($p['side'] ?? 'BUY');
    $margin = (float)($p['margin_initial'] ?? 0);
    $principal = ($mt==='perp' && $margin>0) ? $margin : ($qty*$entry);
    $pnl = perp_calc_pnl($entry,$mark,$qty,$side);
    $roe = ($principal>0) ? ($pnl/$principal)*100.0 : 0.0;

    $positions[] = [
      'id'=>(int)($p['id'] ?? 0),
      'symbol'=>$sym,
      'symbol_raw'=>$symDb,
      'asset_type'=>$assetType,
      'market_type'=>$mt,
      'side'=>strtoupper($side),
      'qty'=>$qty,
      'entry_price'=>$entry,
      'leverage'=>(int)($p['leverage'] ?? 1),
      'margin_initial'=>$margin,
      'liquidation_price'=>isset($p['liquidation_price']) ? (float)$p['liquidation_price'] : null,
      'tp_price'=>isset($p['tp_price']) ? (float)$p['tp_price'] : null,
      'sl_price'=>isset($p['sl_price']) ? (float)$p['sl_price'] : null,
      'mark_price'=>$mark,
      'unrealized_pnl'=>$pnl,
      'roe_pct'=>$roe,
    ];
  }
}

// --- Candles (optional) ---
// Query: candles=1&tf=60&limit=200&symbol=BTCUSDT
$candlesEnabled = (int)($_GET['candles'] ?? 0) === 1;

$tf = (int)($_GET['tf'] ?? 60);          // seconds
if ($tf <= 0) $tf = 60;
$allowed = [60, 300, 900, 1800, 3600, 14400, 86400]; // 1m,5m,15m,30m,1h,4h,1d
if (!in_array($tf, $allowed, true)) $tf = 60;

$limit = (int)($_GET['limit'] ?? 200);
if ($limit < 20) $limit = 20;
if ($limit > 500) $limit = 500;

$symbolForCandles = (string)($_GET['symbol'] ?? '');
$symbolForCandles = strtoupper(trim($symbolForCandles));
if ($symbolForCandles === '' && $symbols) $symbolForCandles = $symbols[0];

$candles = [];
if ($candlesEnabled && $symbolForCandles !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $symbolForCandles)) {
  $end = $now;
  $start = $end - ($tf * $limit * 3);

  $st = $pdo->prepare("\n    SELECT ts, price, COALESCE(volume,0) AS volume\n    FROM market_ticks\n    WHERE symbol = ? AND ts >= ? AND ts <= ?\n    ORDER BY ts ASC\n  ");
  $st->execute([$symbolForCandles, $start, $end]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $buckets = [];
  foreach ($rows as $r) {
    $t = (int)$r['ts'];
    $p = (float)$r['price'];
    $v = (float)$r['volume'];
    if ($p <= 0) continue;

    $bt = intdiv($t, $tf) * $tf;
    if (!isset($buckets[$bt])) {
      $buckets[$bt] = ['t'=>$bt, 'o'=>$p, 'h'=>$p, 'l'=>$p, 'c'=>$p, 'v'=>$v];
    } else {
      if ($p > $buckets[$bt]['h']) $buckets[$bt]['h'] = $p;
      if ($p < $buckets[$bt]['l']) $buckets[$bt]['l'] = $p;
      $buckets[$bt]['c'] = $p;
      $buckets[$bt]['v'] += $v;
    }
  }

  ksort($buckets);
  $candles = array_values($buckets);

  if (count($candles) > $limit) {
    $candles = array_slice($candles, -$limit);
  }

  // Fill gaps with flat candles (close=prevClose) for clean chart.
  if ($candles) {
    $filled = [];
    $prev = $candles[0];
    $filled[] = $prev;

    for ($i=1; $i<count($candles); $i++) {
      $cur = $candles[$i];
      $expected = $prev['t'] + $tf;
      while ($expected < $cur['t']) {
        $pc = $prev['c'];
        $filled[] = ['t'=>$expected, 'o'=>$pc, 'h'=>$pc, 'l'=>$pc, 'c'=>$pc, 'v'=>0.0];
        $expected += $tf;
      }
      $filled[] = $cur;
      $prev = $cur;
    }

    if (count($filled) > $limit) $filled = array_slice($filled, -$limit);
    $candles = $filled;
  }
}

foreach ($quotes as $sym => &$q) {
  $assetTypeForSym = vp_normalize_asset_type((string)($q['type'] ?? $returnType ?: $reqType ?: 'crypto'));
  if ($assetTypeForSym !== 'crypto') continue;
  $mark = (float)($q['mark_price'] ?? $q['price'] ?? 0);
  $idx = isset($q['index_price']) ? (float)$q['index_price'] : 0.0;
  if ($mark > 0 && $idx > 0 && abs($idx - $mark) / max(1.0, abs($mark)) > 0.02) {
    $q['index_price'] = $mark;
  }
  if (isset($q['next_funding_time']) && $q['next_funding_time'] !== null && (int)$q['next_funding_time'] < ($now - 3600)) {
    $q['next_funding_time'] = null;
  }
}
unset($q);

foreach ($quotes as $sym => $q) {
  if (!is_array($q)) continue;
  $assetTypeForSym = vp_normalize_asset_type((string)($q['type'] ?? $returnType ?: $reqType ?: 'crypto')) ?: 'crypto';
  $marketForSym = (string)($q['market'] ?? $reqMarket ?? 'spot');
  $quotes[$sym] = qs_public_item(qs_snapshot_from_row((string)$sym, $assetTypeForSym, $marketForSym, $q, ['mode' => 'display']));
}

$quoteSingle = null;
if (count($symbols) === 1) {
  $only = $symbols[0];
  if (isset($quotes[$only])) $quoteSingle = $quotes[$only];
}

$out = [
  'ok'=>true,
  'ts'=>$now,
  'quotes'=>$quotes,
  'quote'=>$quoteSingle, // for QuoteCache (single symbol)
  'positions'=>$lite ? null : $positions,
  'candles'=> $candlesEnabled ? $candles : null,
  'candles_symbol'=> $candlesEnabled ? $symbolForCandles : null,
  'tf'=> $candlesEnabled ? $tf : null,
];
if ($streamLiteCacheFile) {
  $outJson = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($outJson !== false) @file_put_contents($streamLiteCacheFile, $outJson, LOCK_EX);
}
json_response($out);
