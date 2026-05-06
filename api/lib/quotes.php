<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/marketdata.php';
require_once __DIR__ . '/market_resolver.php';

function market_meta($meta): array {
  if (is_array($meta)) return $meta;
  if ($meta === null) return [];
  if (is_string($meta) && $meta !== '') {
    $d = json_decode($meta, true);
    return is_array($d) ? $d : [];
  }
  return [];
}


function quote_singleflight(string $key, int $ttlSec = 2): bool {
  $ttlSec = max(1, min(60, $ttlSec));
  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);
  $safe = preg_replace('/[^a-zA-Z0-9_.-]/','_', $key);
  $lock = $dir . '/sf_' . $safe . '.lock';

  // If lock file is fresh, someone already refreshed very recently
  if (is_file($lock)) {
    $age = time() - (int)@filemtime($lock);
    if ($age >= 0 && $age < $ttlSec) return false;
  }

  // Try acquire exclusive lock non-blocking
  $fp = @fopen($lock, 'c+');
  if (!$fp) return false;
  if (!@flock($fp, LOCK_EX | LOCK_NB)) { fclose($fp); return false; }

  // Stamp
  ftruncate($fp, 0);
  fwrite($fp, (string)time());
  fflush($fp);
  @flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}


/**
 * Quote storage is the single source of truth for prices used by the demo engine.
 * - Crypto quotes can be refreshed from Binance.
 * - Non-crypto quotes are simulated (random walk) unless an external feed is added later.
 */

/**
 * Detect optional quote columns (older DBs may not have perp extras).
 * Always return a stable shape; missing columns are returned as NULL.
 */
function quote_cols_flags(): array {
  static $flags = null;
  if ($flags !== null) return $flags;
  $pdo = db();
  $drv = db_driver();
  // schema_column_exists is provided by api/lib/schema.php (loaded by common.php)
  $flags = [
    'mark_price'        => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'mark_price', $drv) : true,
    'index_price'       => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'index_price', $drv) : true,
    'funding_rate'      => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'funding_rate', $drv) : true,
    'next_funding_time' => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'next_funding_time', $drv) : true,
    'source'            => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'source', $drv) : true,
    'market'            => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'market', $drv) : false,
    'provider'          => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'provider', $drv) : false,
    'provider_ts'       => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'provider_ts', $drv) : false,
    'received_at'       => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'received_at', $drv) : false,
    'source_strength'   => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'source_strength', $drv) : false,
    'is_stale'          => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'is_stale', $drv) : false,
    'as_of'             => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'as_of', $drv) : false,
    'ingested_at'       => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'ingested_at', $drv) : false,
    'source_priority'   => function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'source_priority', $drv) : false,
  ];
  return $flags;
}


function quote_source_is_liveish(?string $source, string $assetType = ''): bool {
  $src = strtolower(trim((string)$source));
  if ($src === '') return false;
  $assetType = vp_normalize_asset_type($assetType);
  $providerType = vp_provider_asset_type($assetType);
  if ($providerType === 'crypto') {
    return in_array($src, ['binance','trade_stream','stream','provider_live'], true);
  }
  if (in_array($assetType, ['forex','stocks'], true)) {
    return in_array($src, ['eodhd','eodhd_rest','provider_live'], true);
  }
  if (in_array($assetType, ['arab','commodities','futures'], true)) {
    return in_array($src, ['eodhd','eodhd_rest','provider_live','yahoo_chart_live','yahoo'], true);
  }
  if (in_array($src, ['eodhd','eodhd_rest','provider_live'], true)) return true;
  return false;
}

function quote_source_is_untrusted(?string $source): bool {
  $src = strtolower(trim((string)$source));
  if ($src === '') return true;
  return in_array($src, [
    'seed','seed_fallback','seed_price','seed_default','fallback_static','chart_seed',
    'seed_candle','yahoo_chart','aggs','stale_cache','cache','synthetic'
  ], true);
}

function quote_live_provider_max_age(string $assetType): int {
  $providerType = vp_provider_asset_type($assetType);
  if ($providerType === 'forex') return max(45, min(300, (int)env('FOREX_LIVE_PROVIDER_MAX_AGE', '75')));
  if ($providerType === 'commodities') return max(45, min(300, (int)env('COMMODITIES_LIVE_PROVIDER_MAX_AGE', '90')));
  if ($providerType === 'futures') return max(45, min(300, (int)env('FUTURES_LIVE_PROVIDER_MAX_AGE', '90')));
  if ($providerType === 'stocks' || $providerType === 'arab') return max(300, min(3600, (int)env('DELAYED_LIVE_PROVIDER_MAX_AGE', '900')));
  return max(60, min(1800, (int)env('NONCRYPTO_LIVE_PROVIDER_MAX_AGE', '120')));
}

function quote_live_row_age_sec(array $row, int $now = 0): int {
  $now = $now > 0 ? $now : time();
  $ts = quote_row_provider_ts($row, 0);
  if ($ts <= 0) return 999999;
  return max(0, $now - $ts);
}

function quote_primary_row_is_stale(array $row, string $assetType, int $now = 0): bool {
  $src = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  if ($src === '') return true;
  if (!in_array($src, ['eodhd', 'eodhd_rest', 'provider_live'], true)) return false;
  return quote_live_row_age_sec($row, $now) > quote_live_provider_max_age($assetType);
}

function quote_try_yahoo_rescue_row(string $symbol, string $assetType, array $meta = [], int $now = 0): ?array {
  $now = $now > 0 ? $now : time();
  $ySym = yahoo_ticker_for_market($symbol, $assetType, $meta) ?: $symbol;
  if (!preg_match('/^[A-Z0-9._=\/-]{1,24}$/', strtoupper((string)$ySym))) return null;

  try {
    $bulk = yahoo_quote_many_cached([$ySym], max(1, (int)env('YAHOO_PRICE_TTL', '5')));
    $it = $bulk[$ySym] ?? null;
    if (is_array($it) && (float)($it['price'] ?? 0) > 0) {
      return [
        'symbol' => strtoupper($symbol),
        'type' => $assetType,
        'price' => (float)($it['price'] ?? 0),
        'change_pct' => (float)($it['change_pct'] ?? 0.0),
        'updated_at' => quote_row_provider_ts($it, $now),
        'source' => (string)($it['source'] ?? 'yahoo'),
      ];
    }
  } catch (Throwable $e) { /* ignore */ }

  try {
    $live = yahoo_live_quote_or_chart($ySym, '1m');
    if (is_array($live) && (float)($live['price'] ?? 0) > 0) {
      return [
        'symbol' => strtoupper($symbol),
        'type' => $assetType,
        'price' => (float)($live['price'] ?? 0),
        'change_pct' => (float)($live['change_pct'] ?? 0.0),
        'updated_at' => quote_row_provider_ts($live, $now),
        'source' => (string)($live['source'] ?? 'yahoo'),
      ];
    }
  } catch (Throwable $e) { /* ignore */ }

  return null;
}

function quote_row_provider_ts(array $row, int $fallback = 0): int {
  foreach (['provider_updated_at','as_of','updated_at'] as $k) {
    if (isset($row[$k]) && is_numeric($row[$k])) {
      $ts = (int)$row[$k];
      if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
      if ($ts > 0) return $ts;
    }
  }
  return $fallback > 0 ? $fallback : 0;
}

function quote_storage_market_key(string $symbol, string $type, ?string $market = null): string {
  $type = vp_normalize_asset_type($type);
  $raw = strtolower(trim((string)$market));
  if ($raw === 'perpetual') $raw = 'perp';
  if ($raw === 'perp' || $raw === 'spot') return $raw;
  return 'spot';
}


function quote_provider_prefers_eodhd(string $assetType, array $meta = [], string $symbol = ''): bool {
  $assetType = vp_normalize_asset_type($assetType);
  $providerType = vp_provider_asset_type($assetType);
  $preferredProvider = strtolower((string)env('PRICE_PROVIDER', 'eodhd'));
  if ($preferredProvider !== 'eodhd') return false;
  if (function_exists('eodhd_enabled') && !eodhd_enabled()) return false;
  if ($providerType === 'crypto' || $providerType === 'futures') return false;
  if ($providerType === 'forex') return true;
  if ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $assetType)) return true;

  $resolved = eodhd_symbol_for_market($symbol, $assetType, $meta);
  if ($assetType === 'stocks') {
    $stocksPrimary = strtolower(trim((string)env('STOCK_QUOTES_PROVIDER', env('STOCKS_QUOTES_PROVIDER', 'yahoo'))));
    return $stocksPrimary === 'eodhd' && $resolved !== null;
  }
  if ($assetType === 'arab') {
    $arabPrimary = strtolower(trim((string)env('ARAB_QUOTES_PROVIDER', 'yahoo')));
    return $arabPrimary === 'eodhd' && $resolved !== null;
  }
  return $resolved !== null;
}

function quote_provider_prefers_yahoo(string $assetType, array $meta = [], string $symbol = ''): bool {
  $assetType = vp_normalize_asset_type($assetType);
  $providerType = vp_provider_asset_type($assetType);
  if ($assetType === 'stocks') {
    $stocksPrimary = strtolower(trim((string)env('STOCK_QUOTES_PROVIDER', env('STOCKS_QUOTES_PROVIDER', 'yahoo'))));
    return $stocksPrimary !== 'eodhd' || eodhd_symbol_for_market($symbol, $assetType, $meta) === null;
  }
  if ($assetType === 'arab') {
    $arabPrimary = strtolower(trim((string)env('ARAB_QUOTES_PROVIDER', 'yahoo')));
    return $arabPrimary !== 'eodhd' || eodhd_symbol_for_market($symbol, $assetType, $meta) === null;
  }
  if ($providerType === 'forex') return !quote_provider_prefers_eodhd($assetType, $meta, $symbol);
  if (in_array($assetType, ['futures'], true)) return true;
  if ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $assetType)) return !quote_provider_prefers_eodhd($assetType, $meta, $symbol);
  if ($providerType === 'commodities' && !vp_is_spot_metal_symbol($symbol, $assetType)) return true;
  return false;
}

function quote_get(string $symbol, ?string $type = null, ?string $market = null): ?array {
  $pdo = db();
  $flags = quote_cols_flags();

  // Build a SELECT that never fails when optional columns are missing.
  $sel = "symbol,type,price,change_pct";
  $sel .= $flags['mark_price']        ? ",mark_price"        : ",NULL AS mark_price";
  $sel .= $flags['index_price']       ? ",index_price"       : ",NULL AS index_price";
  $sel .= $flags['funding_rate']      ? ",funding_rate"      : ",NULL AS funding_rate";
  $sel .= $flags['next_funding_time'] ? ",next_funding_time" : ",NULL AS next_funding_time";
  $sel .= $flags['source']            ? ",source"            : ",'' AS source";
  $sel .= $flags['market']            ? ",market"            : ",'spot' AS market";
  $sel .= $flags['provider']          ? ",provider"          : ",NULL AS provider";
  $sel .= $flags['provider_ts']       ? ",provider_ts"       : ",0 AS provider_ts";
  $sel .= $flags['received_at']       ? ",received_at"       : ",0 AS received_at";
  $sel .= $flags['source_strength']   ? ",source_strength"   : ",0 AS source_strength";
  $sel .= $flags['is_stale']          ? ",is_stale"          : ",0 AS is_stale";
  $sel .= $flags['as_of']             ? ",as_of"             : ",0 AS as_of";
  $sel .= $flags['ingested_at']       ? ",ingested_at"       : ",0 AS ingested_at";
  $sel .= $flags['source_priority']   ? ",source_priority"   : ",0 AS source_priority";
  $sel .= ",updated_at";

  $symbol = strtoupper($symbol);
  $type = $type !== null ? vp_normalize_asset_type($type) : null;

  $marketKey = ($type !== null && $type !== '') ? quote_storage_market_key($symbol, $type, $market) : null;

  if ($type !== null && $type !== '' && $marketKey !== null && !empty($flags['market'])) {
    $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol=? AND type=? AND market=? ORDER BY updated_at DESC, id DESC LIMIT 1");
    $st->execute([$symbol, $type, $marketKey]);
  } elseif ($type !== null && $type !== '') {
    $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol=? AND type=? ORDER BY updated_at DESC, id DESC LIMIT 1");
    $st->execute([$symbol, $type]);
  } else {
    $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol=? ORDER BY updated_at DESC, id DESC LIMIT 1");
    $st->execute([$symbol]);
  }
  $r = $st->fetch(PDO::FETCH_ASSOC);
  return $r ?: null;
}

function quote_mark_price(string $symbol, string $assetType = 'crypto'): float {
  $q = quote_get($symbol, $assetType);
  if ($q && isset($q['mark_price']) && (float)$q['mark_price'] > 0) return (float)$q['mark_price'];
  return quote_price_fresh($symbol, $assetType);
}

function quote_bulk_live(array $symbols, string $assetType, array $metaBySymbol = [], array $opts = []): array {
  $assetType = vp_normalize_asset_type($assetType);
  $providerType = vp_provider_asset_type($assetType);
  $symbols = array_values(array_unique(array_filter(array_map(static function($s){
    $s = strtoupper(trim((string)$s));
    return ($s !== '' && preg_match('/^[A-Z0-9:._\-]{2,32}$/', $s)) ? $s : '';
  }, $symbols))));
  if (!$symbols) return [];
  $now = time();
  $out = [];

  if ($providerType === 'crypto') {
    try {
      $ttl = max(1, min(3, (int)($opts['ttl'] ?? env('CRYPTO_PRICE_TTL', '1'))));
      $rows = binance_ticker_24hr_many_cached($symbols, $ttl);
      foreach ($symbols as $sym) {
        $row = is_array($rows[$sym] ?? null) ? $rows[$sym] : null;
        if (!$row) continue;
        $p = (float)($row['price'] ?? 0);
        if (!($p > 0)) continue;
        $out[$sym] = [
          'symbol' => $sym,
          'type' => $assetType,
          'price' => $p,
          'change_pct' => (float)($row['change_pct'] ?? 0.0),
          'updated_at' => $now,
          'source' => 'binance',
        ];
      }
    } catch (Throwable $e) {}
    return $out;
  }

  $yahooBySym = [];
  $massiveBySym = [];
  $eodhdBySym = [];
  $preferredProvider = strtolower((string)env('PRICE_PROVIDER', 'eodhd'));
  $massiveFallbackEnabled = ((int)env('ENABLE_MASSIVE_FALLBACK', '0') === 1) && $preferredProvider === 'massive';
  foreach ($symbols as $sym) {
    $meta = is_array($metaBySymbol[$sym] ?? null) ? $metaBySymbol[$sym] : [];
    $spotMetal = vp_is_spot_metal_symbol($sym, $assetType);
    $preferEodhd = quote_provider_prefers_eodhd($assetType, $meta, $sym);
    $preferYahoo = quote_provider_prefers_yahoo($assetType, $meta, $sym);
    // Prefer EODHD for forex and spot metals whenever it is the configured provider.
    if ($preferEodhd) {
      $e = eodhd_symbol_for_market($sym, $assetType, $meta);
      if ($e) $eodhdBySym[$sym] = $e;
    }
    // Yahoo stays the bulk fallback for stocks / arab / futures and for non-metal commodities.
    if ($preferYahoo || ($providerType === 'commodities' && !$preferEodhd)) {
      $y = yahoo_ticker_for_market($sym, $assetType, $meta);
      if ($y) $yahooBySym[$sym] = $y;
    }
    // Massive is opt-in only now; do not let it silently compete with the main provider.
    if ($massiveFallbackEnabled && ($providerType === 'forex' || ($providerType === 'commodities' && $spotMetal))) {
      $m = massive_market_ticker($sym, $assetType, $meta);
      if ($m) $massiveBySym[$sym] = $m;
    }
  }

  if ($eodhdBySym) {
    try {
      $ttl = max(1, min(5, (int)($opts['eodhd_ttl'] ?? env('EODHD_PRICE_TTL', '2'))));
      $fetchMap = $eodhdBySym;
      $bulk = eodhd_quote_many_cached(array_values(array_unique(array_values($fetchMap))), $ttl);
      foreach ($fetchMap as $sym => $ticker) {
        $row = is_array($bulk[$ticker] ?? null) ? $bulk[$ticker] : null;
        if (!$row) continue;
        $p = (float)($row['price'] ?? 0);
        if (!($p > 0)) continue;
        $liveRow = [
          'symbol' => $sym,
          'type' => $assetType,
          'price' => $p,
          'change_pct' => (float)($row['change_pct'] ?? 0.0),
          'updated_at' => quote_row_provider_ts($row, $now),
          'source' => (string)($row['source'] ?? 'eodhd'),
        ];
        if (in_array($providerType, ['forex','commodities','futures'], true) && quote_primary_row_is_stale($liveRow, $assetType, $now)) {
          $rescue = quote_try_yahoo_rescue_row($sym, $assetType, is_array($metaBySymbol[$sym] ?? null) ? $metaBySymbol[$sym] : [], $now);
          if (is_array($rescue) && (float)($rescue['price'] ?? 0) > 0) $liveRow = $rescue;
        }
        $out[$sym] = $liveRow;
      }
    } catch (Throwable $e) {}
  }

  if ($yahooBySym) {
    $preferDirectYahoo = quote_provider_prefers_yahoo($assetType) || ($providerType === 'forex' && !quote_provider_prefers_eodhd($assetType));
    $yahooCount = count($yahooBySym);
    $allowDirectBatch = !empty($opts['allow_direct_batch']);
    $singleSymbolOnly = ($yahooCount === 1);
    $disableDirectYahooForBatch = !$singleSymbolOnly;
    $preferDirectBudget = ($preferDirectYahoo && $singleSymbolOnly)
      ? max(0, min(2, (int)($opts['direct_yahoo_budget'] ?? 1)))
      : 0;
    if ($preferDirectBudget > 0) {
      foreach ($yahooBySym as $sym => $ticker) {
        if ($preferDirectBudget <= 0) break;
        try {
          $row = yahoo_live_quote_or_chart($ticker, '1m');
          $p = (float)($row['price'] ?? 0);
          if ($p > 0) {
            $out[$sym] = [
              'symbol' => $sym,
              'type' => $assetType,
              'price' => $p,
              'change_pct' => (float)($row['change_pct'] ?? 0.0),
              'updated_at' => quote_row_provider_ts($row, $now),
              'source' => (string)($row['source'] ?? 'yahoo'),
            ];
          }
        } catch (Throwable $e) {}
        $preferDirectBudget--;
      }
    }
    try {
      $ttl = max(1, min(4, (int)($opts['yahoo_ttl'] ?? env('YAHOO_PRICE_TTL_FRESH', '1'))));
      $bulk = yahoo_quote_many_cached(array_values(array_unique(array_values($yahooBySym))), $ttl);
      foreach ($yahooBySym as $sym => $ticker) {
        if (isset($out[$sym]) && (float)($out[$sym]['price'] ?? 0) > 0) continue;
        $row = is_array($bulk[$ticker] ?? null) ? $bulk[$ticker] : null;
        if (!$row) continue;
        $p = (float)($row['price'] ?? 0);
        if (!($p > 0)) continue;
        $out[$sym] = [
          'symbol' => $sym,
          'type' => $assetType,
          'price' => $p,
          'change_pct' => (float)($row['change_pct'] ?? 0.0),
          'updated_at' => quote_row_provider_ts($row, $now),
          'source' => (string)($row['source'] ?? 'yahoo'),
        ];
      }
    } catch (Throwable $e) {}

    $chartBudget = $singleSymbolOnly
      ? max(0, min(2, (int)($opts['chart_budget'] ?? 1)))
      : 0;
    if ($chartBudget > 0) {
      foreach ($yahooBySym as $sym => $ticker) {
        if ($chartBudget <= 0) break;
        if (isset($out[$sym]) && (float)($out[$sym]['price'] ?? 0) > 0) continue;
        try {
          $row = yahoo_live_quote_or_chart($ticker, '1m');
          $p = (float)($row['price'] ?? 0);
          if ($p > 0) {
            $out[$sym] = [
              'symbol' => $sym,
              'type' => $assetType,
              'price' => $p,
              'change_pct' => (float)($row['change_pct'] ?? 0.0),
              'updated_at' => quote_row_provider_ts($row, $now),
              'source' => (string)($row['source'] ?? 'yahoo'),
            ];
          }
        } catch (Throwable $e) {}
        $chartBudget--;
      }
    }
  }

  if ($massiveBySym) {
    try {
      $ttl = max(1, min(4, (int)($opts['massive_ttl'] ?? env('MASSIVE_SNAPSHOT_TTL_FRESH', '1'))));
      $bulk = massive_snapshot_many_cached(array_values(array_unique(array_values($massiveBySym))), $ttl);
      foreach ($massiveBySym as $sym => $ticker) {
        if (isset($out[$sym]) && (float)($out[$sym]['price'] ?? 0) > 0) continue;
        $row = is_array($bulk[$ticker] ?? null) ? $bulk[$ticker] : null;
        if (!$row) continue;
        $p = (float)($row['price'] ?? 0);
        if (!($p > 0)) continue;
        $out[$sym] = [
          'symbol' => $sym,
          'type' => $assetType,
          'price' => $p,
          'change_pct' => (float)($row['change_pct'] ?? 0.0),
          'updated_at' => quote_row_provider_ts($row, $now),
          'source' => (string)($row['source'] ?? 'massive'),
        ];
      }
    } catch (Throwable $e) {}
  }

  $directBudget = max(0, min(12, (int)($opts['direct_budget'] ?? 6)));
  foreach ($symbols as $sym) {
    if (isset($out[$sym]) && (float)($out[$sym]['price'] ?? 0) > 0) continue;
    if ($directBudget <= 0) break;
    try {
      $meta = is_array($metaBySymbol[$sym] ?? null) ? $metaBySymbol[$sym] : [];
      $p = (float)quote_fetch_external($sym, $assetType, $meta);
      if ($p > 0) {
        $chg = 0.0;
        try {
          $prevRow = quote_get($sym, $assetType);
          if (is_array($prevRow)) $chg = (float)($prevRow['change_pct'] ?? 0.0);
        } catch (Throwable $ignoredPrev) {}
        $out[$sym] = [
          'symbol' => $sym,
          'type' => $assetType,
          'price' => $p,
          'change_pct' => $chg,
          'updated_at' => $now,
          'source' => 'provider_live',
        ];
      }
    } catch (Throwable $e) {}
    $directBudget--;
  }
  return $out;
}


function quote_price_fresh(string $symbol, string $assetType): float {
  $symbol = strtoupper($symbol);
  $assetType = vp_normalize_asset_type($assetType);
  $providerType = vp_provider_asset_type($assetType);
  $now = time();
  $q = quote_get($symbol, $assetType);

  // --- Crypto realtime-ish strategy ---
  // We poll fast from the UI, but we must not hammer Binance.
  // So we use a file-cache for spot price (and another for 24h change).
  // Defaults are aggressive for "instant" feel on stronger hosting.
  $priceTtl = (int)(env('CRYPTO_PRICE_TTL', env('CRYPTO_QUOTE_TTL', '1')) ?? '2');
  $priceTtl = max(1, min(30, $priceTtl));
  // Keep % change relatively fresh (used in UI next to the price)
  // Accept both CRYPTO_CHG_TTL (env file) and CRYPTO_CHANGE_TTL (older name).
  $chgTtl = (int)(env('CRYPTO_CHG_TTL', env('CRYPTO_CHANGE_TTL', '10')) ?? '10');
  $chgTtl = max(5, min(3600, $chgTtl));

  if ($assetType === 'crypto') {
    $isFresh = $q && ((int)$q['updated_at'] > 0) && (($now - (int)$q['updated_at']) <= $priceTtl) && ((float)$q['price'] > 0);
    if ($isFresh) return (float)$q['price'];

    // single-flight: avoid hammering upstream when many clients poll
    if (!$isFresh && !$q) { /* nothing */ }
    if (!$isFresh && !quote_singleflight('crypto_'.$symbol, (int)$priceTtl)) {
      if ($q && (float)$q['price'] > 0) return (float)$q['price'];
    }

    try {
      $provider = strtolower((string)env('CRYPTO_PROVIDER', 'binance'));
      $pkey = (string)env('POLYGON_API_KEY', '');

      // Price: fast + cached
      if ($provider === 'polygon' && $pkey !== '') {
        $pair = polygon_crypto_pair_from_symbol($symbol);
        $last = polygon_crypto_last_trade_cached($pair['from'], $pair['to'], $priceTtl);
        $p = (float)($last['price'] ?? 0.0);
        if ($p <= 0) throw new RuntimeException('No polygon price');

        // 24h %: approximate using Polygon previous close (cached)
        $prev = polygon_crypto_prev_close_cached($pair['ticker'], max(60, $chgTtl));
        $chg = ($prev > 0) ? (($p - $prev) / $prev) * 100.0 : 0.0;

        quote_upsert($symbol, 'crypto', $p, (float)$chg, $now, ['source'=>'polygon']);
        return $p;
      }

      // Fallback: Binance
      $p = (float)binance_price_cached($symbol, $priceTtl);
      if ($p <= 0) throw new RuntimeException('No spot price');

      $chg = $q ? (float)($q['change_pct'] ?? 0.0) : 0.0;
      try {
        $m = binance_ticker_24hr_cached($symbol, $chgTtl);
        if (isset($m['change_pct'])) $chg = (float)$m['change_pct'];
      } catch (Throwable $e) {
        // keep last change
      }

      quote_upsert($symbol, 'crypto', $p, $chg, $now, ['source'=>'binance']);
      return $p;
    } catch (Throwable $e) {
      // If upstream fails, fall back to last cached quote (avoid crashing cron/risk engine).
      if ($q && (float)$q['price'] > 0) return (float)$q['price'];
      return 0.0;
    }
  }

  // Non-crypto: refresh quickly enough for the trade UI, but keep rate limits sane.
  $staleBase = (int)(env('NONCRYPTO_STALE_SECONDS', env('QUOTE_STALE_SECONDS', '300')) ?? '300');
  if ($providerType === 'commodities' || $providerType === 'futures') {
    $staleSec = max(1, min(20, (int)env('COMMODITIES_STALE_SECONDS', '3')));
  } elseif ($providerType === 'stocks' || $providerType === 'forex') {
    $staleSec = max(2, min(30, (int)env('MARKETS_STALE_SECONDS', '5')));
  } else {
    $staleSec = max(2, min(60, $staleBase));
  }
  $qSource = strtolower((string)($q['source'] ?? ''));
  $spotMetal = vp_is_spot_metal_symbol($symbol, $assetType);
  $metalTrustedSources = ['provider_live','eodhd','eodhd_rest','yahoo','yahoo_chart_live'];
  $requiresTrustedFreshSource = ($providerType !== 'crypto');
  $isChartSeed = in_array($qSource, ['yahoo_chart','aggs','chart_seed','seed_candle'], true);
  $isTrustedSpotMetalSource = (!$spotMetal) || in_array($qSource, $metalTrustedSources, true);
  $isTrustedFreshSource = (!$requiresTrustedFreshSource) || quote_source_is_liveish($qSource, $assetType);
  $isFresh = $q
    && !$isChartSeed
    && !quote_source_is_untrusted($qSource)
    && $isTrustedSpotMetalSource
    && $isTrustedFreshSource
    && ((int)$q['updated_at'] > 0)
    && (($now - (int)$q['updated_at']) <= $staleSec)
    && ((float)($q['price'] ?? 0) > 0);
  if ($isFresh) return (float)$q['price'];

  $pdo = db();
  $st = $pdo->prepare("SELECT seed_price, meta FROM markets WHERE symbol=? LIMIT 1");
  $st->execute([$symbol]);
  $row = $st->fetch(PDO::FETCH_ASSOC) ?: [];
  $meta = market_meta($row['meta'] ?? null);
  $seed = (float)($row['seed_price'] ?? 0);

  $preferredProvider = strtolower((string)env('PRICE_PROVIDER', 'eodhd'));
  $massiveFallbackEnabled = ((int)env('ENABLE_MASSIVE_FALLBACK', '0') === 1);
  if (quote_provider_prefers_eodhd($assetType, $meta, $symbol)) {
    try {
      $eSym = eodhd_symbol_for_market($symbol, $assetType, $meta);
      if ($eSym) {
        $live = eodhd_quote_realtime_cached($eSym, max(1, min(5, (int)env('EODHD_PRICE_TTL', '2'))));
        $p = (float)($live['price'] ?? 0);
        if ($p > 0) {
          $liveRow = [
            'symbol' => $symbol,
            'type' => $assetType,
            'price' => $p,
            'change_pct' => (float)($live['change_pct'] ?? 0.0),
            'updated_at' => quote_row_provider_ts($live, $now),
            'source' => (string)($live['source'] ?? 'eodhd'),
          ];
          if (in_array($providerType, ['forex','commodities','futures'], true) && quote_primary_row_is_stale($liveRow, $assetType, $now)) {
            $rescue = quote_try_yahoo_rescue_row($symbol, $assetType, $meta, $now);
            if (is_array($rescue) && (float)($rescue['price'] ?? 0) > 0) $liveRow = $rescue;
          }
          $p = (float)($liveRow['price'] ?? 0);
          $chg = (float)($liveRow['change_pct'] ?? 0.0);
          $upd = quote_row_provider_ts($liveRow, $now);
          quote_upsert($symbol, $assetType, $p, $chg, $upd, ['source'=>(string)($liveRow['source'] ?? 'eodhd'),'as_of'=>$upd,'ingested_at'=>$now]);
          return $p;
        }
      }
    } catch (Throwable $e) { /* ignore */ }
  }

  // Fast non-crypto path: prefer Yahoo for stocks / Arab markets / futures and non-spot-metal commodities.
  // Use Massive first for FX and spot metals. This avoids slow provider timeouts from dominating trade/watchlist UI.
  if (in_array($providerType, ['forex', 'stocks', 'commodities', 'futures'], true)) {
    $preferYahooFirst = quote_provider_prefers_yahoo($assetType, $meta, $symbol);
    if ($preferYahooFirst) {
      $ySym = yahoo_ticker_for_market($symbol, $assetType, $meta);
      if ($ySym) {
        try {
          $ym = yahoo_quote_many_cached([$ySym], max(1, (int)env('YAHOO_PRICE_TTL', '5')));
          $it = $ym[$ySym] ?? null;
          if (is_array($it)) {
            $p = (float)($it['price'] ?? 0);
            if ($p > 0) {
              $chg = (float)($it['change_pct'] ?? 0.0);
              quote_upsert($symbol, $assetType, $p, $chg, quote_row_provider_ts($it, $now), ['source'=>(string)($it['source'] ?? 'yahoo'),'as_of'=>quote_row_provider_ts($it, $now),'ingested_at'=>$now]);
              return $p;
            }
          }
        } catch (Throwable $e) { /* ignore */ }
        try {
          $live = yahoo_live_quote_or_chart($ySym, '1m');
          $p = (float)($live['price'] ?? 0);
          if ($p > 0) {
            $chg = (float)($live['change_pct'] ?? 0.0);
            quote_upsert($symbol, $assetType, $p, $chg, quote_row_provider_ts($live, $now), ['source'=>(string)($live['source'] ?? 'yahoo'),'as_of'=>quote_row_provider_ts($live, $now),'ingested_at'=>$now]);
            return $p;
          }
        } catch (Throwable $e) { /* ignore */ }
      }
    }

    $snapTicker = null;
    if (in_array($providerType, ['forex','stocks','commodities'], true) || $assetType === 'arab') {
      $snapTicker = massive_market_ticker($symbol, $assetType, $meta);
    }
    if ($snapTicker && $massiveFallbackEnabled) {
      try {
        $snap = massive_snapshot_many_cached([$snapTicker], massive_snapshot_ttl_for_type($providerType));
        $it = $snap[$snapTicker] ?? null;
        if (is_array($it)) {
          $p = (float)($it['price'] ?? 0);
          if ($p > 0) {
            $chg = (float)($it['change_pct'] ?? 0.0);
            $upd = $now;
            quote_upsert($symbol, $assetType, $p, $chg, $upd, ['source'=>'massive']);
            return $p;
          }
        }
      } catch (Throwable $e) { /* ignore */ }
    }

    if (!$preferYahooFirst && in_array($providerType, ['forex','stocks','commodities','futures'], true)) {
      $ySym = yahoo_ticker_for_market($symbol, $assetType, $meta);
      if ($ySym) {
        try {
          $ym = yahoo_quote_many_cached([$ySym], max(1, (int)env('YAHOO_PRICE_TTL', '5')));
          $it = $ym[$ySym] ?? null;
          if (is_array($it)) {
            $p = (float)($it['price'] ?? 0);
            if ($p > 0) {
              $chg = (float)($it['change_pct'] ?? 0.0);
              quote_upsert($symbol, $assetType, $p, $chg, quote_row_provider_ts($it, $now), ['source'=>(string)($it['source'] ?? 'yahoo'),'as_of'=>quote_row_provider_ts($it, $now),'ingested_at'=>$now]);
              return $p;
            }
          }
        } catch (Throwable $e) { /* ignore */ }
        try {
          $live = yahoo_live_quote_or_chart($ySym, '1m');
          $p = (float)($live['price'] ?? 0);
          if ($p > 0) {
            $chg = (float)($live['change_pct'] ?? 0.0);
            quote_upsert($symbol, $assetType, $p, $chg, quote_row_provider_ts($live, $now), ['source'=>(string)($live['source'] ?? 'yahoo'),'as_of'=>quote_row_provider_ts($live, $now),'ingested_at'=>$now]);
            return $p;
          }
        } catch (Throwable $e) { /* ignore */ }
      }
    }
  }

  $ext = null;
  // single-flight for external feeds (stocks/forex/commodities)
  if (quote_singleflight('noncrypto_'.$assetType.'_'.$symbol, (int)$staleSec)) {
    try { $ext = quote_fetch_external($symbol, $assetType, $meta); } catch (Throwable $e) { $ext = null; }
  } else {
    // someone else is refreshing; do not block
    $ext = null;
  }

  if ($ext !== null && $ext > 0) {
    quote_upsert($symbol, $assetType, (float)$ext, 0.0, $now, ['source'=>'provider_live','as_of'=>$now,'ingested_at'=>$now]);
    return (float)$ext;
  }

  // When the cached non-crypto row is stale, do one direct provider refresh attempt
  // before falling back to the older cached value. This prevents symbols like XAUUSD
  // from bouncing between a fresh quote and an older DB row under concurrent polling.
  if ($providerType !== 'crypto' && (!$isFresh)) {
    try {
      $direct = quote_fetch_external($symbol, $assetType, $meta);
      if ($direct !== null && (float)$direct > 0) {
        quote_upsert($symbol, $assetType, (float)$direct, (float)($q['change_pct'] ?? 0.0), $now, ['source'=>'provider_live','as_of'=>$now,'ingested_at'=>$now]);
        return (float)$direct;
      }
    } catch (Throwable $e) {
      // ignore and fall through to stale cache
    }
  }

  // If external feed failed, NEVER replay stale DB rows for stocks / arab / futures.
  // Those are exactly the cases where the UI was showing an old price as if it were live.
  $allowStaleCacheRow = $q && (float)($q['price'] ?? 0) > 0;
  if ($allowStaleCacheRow) {
    if (in_array($assetType, ['stocks','arab','futures'], true)) {
      $allowStaleCacheRow = false;
    } elseif ($spotMetal) {
      $metalLiveSources = ['massive','provider_live','provider_fallback','polygon','eodhd','eodhd_rest'];
      $allowStaleCacheRow = in_array($qSource, $metalLiveSources, true);
    } elseif ($providerType !== 'crypto') {
      $allowStaleCacheRow = quote_source_is_liveish($qSource, $assetType);
    }
  }
  if ($allowStaleCacheRow) {
    $rowUpdatedAt = (int)($q['updated_at'] ?? 0);
    $rowAge = $rowUpdatedAt > 0 ? max(0, $now - $rowUpdatedAt) : 999999;
    $maxStaleFallbackAge = ($providerType === 'commodities') ? 3 : max(4, (int)ceil($staleSec));
    if ($rowUpdatedAt <= 0 || $rowAge > $maxStaleFallbackAge) {
      $allowStaleCacheRow = false;
    }
  }
  if ($allowStaleCacheRow) return (float)$q['price'];

  // Fall back to market seed only as a last resort for FX / commodities placeholders.
  // For stocks / arab / futures, returning 0 is safer than replaying a static seed as if it were live.
  if ($seed > 0 && !in_array($assetType, ['stocks','arab','futures'], true)) {
    return $seed;
  }

  // Avoid poisoning the quote table with generic static numbers for live markets.
  $fallback = ($providerType === 'forex') ? 1.0 : 0.0;
  return $fallback;
}


function quote_read_endpoints_persist_enabled(): bool {
  $raw = strtolower(trim((string)env('READ_ENDPOINTS_PERSIST_QUOTES', '0')));
  return in_array($raw, ['1', 'true', 'yes', 'on'], true);
}

function quote_upsert_from_read_path(string $symbol, string $type, float $price, float $changePct, int $ts, array $extras = []): void {
  if (!quote_read_endpoints_persist_enabled()) return;
  quote_upsert($symbol, $type, $price, $changePct, $ts, $extras);
}

function quote_upsert(string $symbol, string $type, float $price, float $changePct, int $ts, array $extras = []): void {
  $pdo = db();
  $driver = db_driver();
  $symbol = strtoupper($symbol);
  $type = strtolower($type);
  $market = quote_storage_market_key($symbol, $type, isset($extras['market']) ? (string)$extras['market'] : null);
  $rank = static function(string $src): int {
    return match($src) {
      'binance' => 100,
      'trade_stream', 'stream' => 96,
      'provider_live' => 92,
      'eodhd', 'eodhd_rest' => 91,
      'yahoo_chart_live', 'yahoo' => 72,
      'massive', 'polygon', 'provider_fallback', 'fx_fallback', 'frankfurter', 'stooq' => 20,
      'eodhd_intraday' => 12,
      'cache', 'stale_cache' => 12,
      'seed', 'seed_fallback', 'seed_price', 'chart_seed', 'seed_candle', 'synthetic', 'aggs' => 4,
      default => ($src === '' ? 0 : 40),
    };
  };

  $existing = null;
  try { $existing = quote_get($symbol, $type, $market); } catch (Throwable $ignoredExisting) { $existing = null; }
  $source = array_key_exists('source', $extras) ? (string)($extras['source'] ?? '') : null;
  if (is_array($existing) && (float)($existing['price'] ?? 0) > 0) {
    $prevTs = (int)($existing['updated_at'] ?? 0);
    $prevSrc = strtolower(trim((string)($existing['source'] ?? '')));
    $nextSrc = strtolower(trim((string)($source ?? '')));
    $prevRank = $rank($prevSrc);
    $nextRank = $rank($nextSrc);
    $prevLive = quote_source_is_liveish($prevSrc, $type);
    $nextLive = quote_source_is_liveish($nextSrc, $type);
    if ($type !== 'crypto' && $nextLive && !$prevLive && $nextRank >= max(40, $prevRank)) {
      // allow a newly fetched trusted quote to replace an older seed/cache row even when the provider timestamp lags.
    } else {
      if ($prevTs > 0 && $prevTs > $ts && $prevRank >= $nextRank) return;
      if ($prevTs > 0 && $prevTs === $ts && $prevRank > $nextRank) return;
      if ($prevTs > 0 && $prevTs >= $ts && $prevLive && !$nextLive) return;
      if ($type !== 'crypto' && $prevLive && $nextLive && $prevRank > ($nextRank + 6) && $prevTs > ($ts + 1800)) return;
    }
  }

  $flags = quote_cols_flags();
  $mark = $extras['mark_price'] ?? null;
  $index = $extras['index_price'] ?? null;
  $fund = $extras['funding_rate'] ?? null;
  $nft = $extras['next_funding_time'] ?? null;
  $asOf = isset($extras['as_of']) && is_numeric($extras['as_of']) ? (int)$extras['as_of'] : $ts;
  $ingestedAt = isset($extras['ingested_at']) && is_numeric($extras['ingested_at']) ? (int)$extras['ingested_at'] : time();
  $sourcePriority = isset($extras['source_priority']) && is_numeric($extras['source_priority']) ? (int)$extras['source_priority'] : 0;
  if ($sourcePriority <= 0) {
    $sourcePriority = $rank(strtolower(trim((string)($source ?? ''))));
  }

  // Build INSERT dynamically so older DBs never 500.
  $cols = ['symbol','type','price','change_pct','updated_at'];
  $vals = [$symbol,$type,$price,$changePct,$ts];

  if ($flags['market'])            { $cols[] = 'market';            $vals[] = $market; }
  if ($flags['mark_price'])        { $cols[] = 'mark_price';        $vals[] = $mark; }
  if ($flags['index_price'])       { $cols[] = 'index_price';       $vals[] = $index; }
  if ($flags['funding_rate'])      { $cols[] = 'funding_rate';      $vals[] = $fund; }
  if ($flags['next_funding_time']) { $cols[] = 'next_funding_time'; $vals[] = $nft; }
  if ($flags['source'])            { $cols[] = 'source';            $vals[] = $source; }
  if ($flags['provider'])          { $cols[] = 'provider';          $vals[] = $extras['provider'] ?? $source; }
  if ($flags['provider_ts'])       { $cols[] = 'provider_ts';       $vals[] = isset($extras['provider_ts']) && is_numeric($extras['provider_ts']) ? (int)$extras['provider_ts'] : $asOf; }
  if ($flags['received_at'])       { $cols[] = 'received_at';       $vals[] = isset($extras['received_at']) && is_numeric($extras['received_at']) ? (int)$extras['received_at'] : $ingestedAt; }
  if ($flags['source_strength'])   { $cols[] = 'source_strength';   $vals[] = isset($extras['source_strength']) && is_numeric($extras['source_strength']) ? (int)$extras['source_strength'] : $sourcePriority; }
  if ($flags['is_stale'])          { $cols[] = 'is_stale';          $vals[] = !empty($extras['is_stale']) ? 1 : 0; }
  if ($flags['as_of'])             { $cols[] = 'as_of';             $vals[] = $asOf; }
  if ($flags['ingested_at'])       { $cols[] = 'ingested_at';       $vals[] = $ingestedAt; }
  if ($flags['source_priority'])   { $cols[] = 'source_priority';   $vals[] = $sourcePriority; }

  $ph = implode(',', array_fill(0, count($cols), '?'));
  $colSql = implode(',', $cols);

  if ($driver === 'mysql') {
    $updates = [
      'type=VALUES(type)',
      'price=VALUES(price)',
      'change_pct=VALUES(change_pct)',
      'updated_at=VALUES(updated_at)',
    ];
    if ($flags['mark_price'])        $updates[] = 'mark_price=COALESCE(VALUES(mark_price), mark_price)';
    if ($flags['index_price'])       $updates[] = 'index_price=COALESCE(VALUES(index_price), index_price)';
    if ($flags['funding_rate'])      $updates[] = 'funding_rate=COALESCE(VALUES(funding_rate), funding_rate)';
    if ($flags['next_funding_time']) $updates[] = 'next_funding_time=COALESCE(VALUES(next_funding_time), next_funding_time)';
    if ($flags['source'])            $updates[] = "source=COALESCE(NULLIF(VALUES(source),''), source)";
    if ($flags['market'])            $updates[] = "market=COALESCE(NULLIF(VALUES(market),''), market)";
    if ($flags['provider'])          $updates[] = "provider=COALESCE(NULLIF(VALUES(provider),''), provider)";
    if ($flags['provider_ts'])       $updates[] = 'provider_ts=GREATEST(COALESCE(provider_ts,0), COALESCE(VALUES(provider_ts),0))';
    if ($flags['received_at'])       $updates[] = 'received_at=GREATEST(COALESCE(received_at,0), COALESCE(VALUES(received_at),0))';
    if ($flags['source_strength'])   $updates[] = 'source_strength=GREATEST(COALESCE(source_strength,0), COALESCE(VALUES(source_strength),0))';
    if ($flags['is_stale'])          $updates[] = 'is_stale=LEAST(COALESCE(is_stale,0), COALESCE(VALUES(is_stale),0))';
    if ($flags['as_of'])             $updates[] = 'as_of=GREATEST(COALESCE(as_of,0), COALESCE(VALUES(as_of),0))';
    if ($flags['ingested_at'])       $updates[] = 'ingested_at=GREATEST(COALESCE(ingested_at,0), COALESCE(VALUES(ingested_at),0))';
    if ($flags['source_priority'])   $updates[] = 'source_priority=GREATEST(COALESCE(source_priority,0), COALESCE(VALUES(source_priority),0))';

    $sql = "INSERT INTO market_quotes({$colSql}) VALUES ({$ph}) ON DUPLICATE KEY UPDATE " . implode(',', $updates);
    try {
      $pdo->prepare($sql)->execute($vals);
    } catch (PDOException $e) {
      // Shared-hosting SQLite/MySQL can briefly lock under concurrency; don't crash the UI.
      if (stripos($e->getMessage(), 'database is locked') !== false) return;
      throw $e;
    }
  } else {
    // SQLite: OR REPLACE is simplest. Extras included only if columns exist.
    $sql = "INSERT OR REPLACE INTO market_quotes({$colSql}) VALUES ({$ph})";
    try {
      $pdo->prepare($sql)->execute($vals);
    } catch (PDOException $e) {
      if (stripos($e->getMessage(), 'database is locked') !== false) return;
      throw $e;
    }
  }
}

/**
 * Get a current mark price for trading.
 * For crypto: try quotes, then Binance (and update quotes).
 * For others: quotes are required (seeded + updated by cron).
 */
/**
 * Trading price helper.
 *
 * Legacy: quote_price(symbol, assetType)
 * Preferred: quote_price(symbol, marketType, assetType)
 *   - marketType: spot|perp
 *   - assetType: crypto|forex|stocks|indices|...
 */
function quote_price(string $symbol, string $assetOrMarket, ?string $maybeAssetType = null): float {
  $a = strtolower(trim((string)$assetOrMarket));

  // New signature: (symbol, marketType, assetType)
  if (in_array($a, ['spot','perp'], true)) {
    $marketType = $a;
    $assetType  = strtolower(trim((string)($maybeAssetType ?? 'crypto')));

    // Perp crypto: prefer cached DB mark_price, then cached Binance futures premiumIndex.
    if ($marketType === 'perp' && ($assetType === 'crypto' || $assetType === 'perp')) {
      $ttl = (int)env('PERP_MARK_TTL', '2');
      $ttl = max(1, min(30, $ttl));
      $now = time();

      try {
        $q = quote_get($symbol, $assetType, 'perp');
        $mp = $q ? (float)($q['mark_price'] ?? 0) : 0.0;
        $upd = $q ? (int)($q['updated_at'] ?? 0) : 0;
        if ($mp > 0 && $upd > 0 && ($now - $upd) <= $ttl) {
          return $mp;
        }
      } catch (Throwable $e) {
        // ignore
      }

      $mpArr = binance_futures_mark_price_cached($symbol, $ttl);
      $mark = (float)($mpArr['mark_price'] ?? 0);
      if ($mark <= 0) throw new RuntimeException('No mark price');

      // Best-effort: persist to quotes table so the UI can reuse it.
      try {
        $index = isset($mpArr['index_price']) ? (float)$mpArr['index_price'] : null;
        $fund  = isset($mpArr['funding_rate']) ? (float)$mpArr['funding_rate'] : null;
        $nft   = isset($mpArr['next_funding_time']) ? (int)$mpArr['next_funding_time'] : null;
        quote_upsert($symbol, 'crypto', $mark, 0.0, $now, [
          'market' => 'perp',
          'mark_price' => $mark,
          'index_price' => $index,
          'funding_rate' => $fund,
          'next_funding_time' => $nft,
        ]);
      } catch (Throwable $e) {
        // ignore
      }

      return $mark;
    }

    // Spot (or non-crypto perp markets): fall back to quote system
    return quote_price_fresh($symbol, $assetType ?: 'crypto');
  }

  // Legacy signature: (symbol, assetType)
  $assetType = $a ?: 'crypto';
  return quote_price_fresh($symbol, $assetType);
}

/** small random walk helper */
function quote_random_walk(float $price, float $volPct): float {
  if ($price <= 0) $price = 1.0;
  // random percent change in [-volPct, +volPct]
  $r = (random_int(-10000, 10000) / 10000.0) * $volPct;
  $n = $price * (1.0 + $r / 100.0);
  return max(0.00000001, $n);
}

function quotes_tick(bool $refreshCrypto = true): array {
  $pdo = db();
  $now = time();
  $t0 = microtime(true);

  // Keep cron fast and avoid overlapping locks on shared hosting.
  $budget = (float)env('QUOTES_TICK_BUDGET_SEC', '18');
  $budget = max(5.0, min(60.0, $budget));
  $maxMarkets = (int)env('QUOTES_TICK_MAX_MARKETS', '1200');
  $maxMarkets = max(50, min(5000, $maxMarkets));

  // IMPORTANT: keep refresh order stable and matching admin sort_order.
  // Use id as a deterministic tiebreaker (avoids symbol-based reorder).
  $rows = $pdo->query("SELECT id,symbol,type,seed_price,meta FROM markets WHERE status='active' ORDER BY type, sort_order, id")
    ->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (count($rows) > $maxMarkets) $rows = array_slice($rows, 0, $maxMarkets);

  // Preload existing quotes in one query (avoid N*quote_get()).
  $prevMap = [];
  try {
    $selPrev = !empty(quote_cols_flags()['source']) ? "SELECT symbol, type, price, change_pct, updated_at, source FROM market_quotes" : "SELECT symbol, type, price, change_pct, updated_at, '' AS source FROM market_quotes";
    $qs = $pdo->query($selPrev)
      ->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($qs as $q) {
      $s = strtoupper((string)($q['symbol'] ?? ''));
      $t = vp_normalize_asset_type((string)($q['type'] ?? ''));
      if ($s !== '' && $t !== '') $prevMap[$s.'|'.$t] = $q;
    }
  } catch (Throwable $e) {
    $prevMap = [];
  }

  $polygonKey = (string)env('POLYGON_API_KEY', '');
  $polygonOn = ($polygonKey !== '');

  $symbolsCrypto = [];
  $nonCryptoSyms = [];
  // Bulk Yahoo map for stocks + commodity proxies. Fast and provides daily change_pct.
  // Keyed by Yahoo symbol (example: BRK-B, GC=F).
  $yahooBulk = [];
  $yahooKeyBySym = [];
  $eodhdBulk = [];
  $eodhdKeyBySym = [];
  foreach ($rows as $r) {
    $sym = strtoupper((string)($r['symbol'] ?? ''));
    $type = strtolower((string)($r['type'] ?? ''));
    if ($sym === '') continue;
    if ($type === 'crypto') $symbolsCrypto[] = $sym;
    else $nonCryptoSyms[] = $sym;

    // Pre-compute Yahoo mapping for stocks / arab / commodities / futures so we can refresh them in bulk.
    if (in_array($type, ['stocks','commodities','futures','arab'], true)) {
      $metaArr = market_meta($r['meta'] ?? null);
      $y = yahoo_ticker_for_market($sym, $type, $metaArr) ?: '';
      if ($y !== '' && preg_match('/^[A-Z0-9.=\-]{1,20}$/', $y)) {
        $yahooKeyBySym[$sym] = $y;
      }
      if (quote_provider_prefers_eodhd($type, $metaArr, $sym)) {
        $e = eodhd_symbol_for_market($sym, $type, $metaArr) ?: '';
        if ($e !== '' && preg_match('/^[A-Z0-9._=\-]{2,40}$/', $e)) $eodhdKeyBySym[$sym] = $e;
      }
    }
  }

  // Refresh ALL stocks/commodities via Yahoo in bulk (fast: 2-3 requests for 60 symbols).
  if ($yahooKeyBySym) {
    try {
      $ttlY = (int)env('YAHOO_PRICE_TTL', '3');
      $ttlY = max(1, min(30, $ttlY));
      $req = array_values(array_unique(array_values($yahooKeyBySym)));
      $chunks = array_chunk($req, 30);
      foreach ($chunks as $ch) {
        $part = yahoo_quote_many_cached($ch, $ttlY);
        if (is_array($part)) {
          foreach ($part as $k => $v) {
            if (is_array($v)) $yahooBulk[(string)$k] = $v;
          }
        }
      }
    } catch (Throwable $e) {
      $yahooBulk = [];
    }
  }

  if ($eodhdKeyBySym) {
    try {
      $ttlE = (int)env('EODHD_PRICE_TTL', '2');
      $ttlE = max(1, min(15, $ttlE));
      $req = array_values(array_unique(array_values($eodhdKeyBySym)));
      $chunks = array_chunk($req, 25);
      foreach ($chunks as $ch) {
        $part = eodhd_quote_many_cached($ch, $ttlE);
        if (is_array($part)) {
          foreach ($part as $k => $v) if (is_array($v)) $eodhdBulk[(string)$k] = $v;
        }
      }
    } catch (Throwable $e) {
      $eodhdBulk = [];
    }
  }

  // Select a batch per run for external (network) refresh for FOREX only.
  // Stocks/commodities are refreshed in bulk via Yahoo above.
  $extBatchSize = (int)env('NONCRYPTO_EXTERNAL_BATCH', '20');
  $extBatchSize = max(0, min(300, $extBatchSize));
  $extSet = [];
  if ($extBatchSize > 0 && count($nonCryptoSyms) > 0) {
    $cursorFile = __DIR__ . '/../data/cache/noncrypto_cursor.json';
    $dir = dirname($cursorFile);
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    $cur = 0;
    if (is_file($cursorFile)) {
      $raw = @file_get_contents($cursorFile);
      $tmp = json_decode((string)$raw, true);
      if (is_array($tmp) && isset($tmp['cursor'])) $cur = (int)$tmp['cursor'];
    }
    $n = count($nonCryptoSyms);
    if ($cur < 0) $cur = 0;
    if ($cur >= $n) $cur = 0;
    for ($i=0; $i<$extBatchSize && $i<$n; $i++) {
      $idx = ($cur + $i) % $n;
      $extSet[$nonCryptoSyms[$idx]] = true;
    }
    $next = ($cur + $extBatchSize) % $n;
    @file_put_contents($cursorFile, json_encode(['cursor'=>$next,'n'=>$n,'ts'=>$now]));
  }

  // Crypto refresh: batch via Binance whenever possible.
  $cryptoData = [];
  if ($refreshCrypto && $symbolsCrypto) {
    $provider = strtolower((string)env('CRYPTO_PROVIDER', 'binance'));
    // Polygon per-symbol can be slow. If many symbols, prefer Binance batch.
    $preferBinance = ($provider !== 'polygon') || !$polygonOn || (count($symbolsCrypto) > 20);

    if ($preferBinance) {
      try { $cryptoData = binance_ticker_24hr_map($symbolsCrypto); } catch (Throwable $e) { $cryptoData = []; }
    } else {
      foreach ($symbolsCrypto as $sym) {
        try {
          $pair = polygon_crypto_pair_from_symbol($sym);
          $last = polygon_crypto_last_trade_cached($pair['from'], $pair['to'], 2);
          $price = (float)($last['price'] ?? 0.0);
          if ($price <= 0) continue;
          $prev = polygon_crypto_prev_close_cached($pair['ticker'], 900);
          $chg = ($prev > 0) ? (($price - $prev) / $prev) * 100.0 : 0.0;
          $cryptoData[$sym] = ['price' => $price, 'change_pct' => (float)$chg];
        } catch (Throwable $e) { /* ignore */ }
      }
    }
  }

  $updated = 0; $errors = 0; $external = 0;

  // Perp extras: keep small and cached to avoid long runs.
  $perpOn = (string)env('PERP_QUOTES_ENABLED', '1') !== '0';
  $perpMax = (int)env('PERP_MAX_SYMBOLS', '3');
  $perpMax = max(0, min(20, $perpMax));
  $perpTtl = (int)env('PERP_MARK_TTL', '15');
  $perpTtl = max(5, min(120, $perpTtl));
  $perpDone = 0;

  $skipExpensive = false;

  foreach ($rows as $r) {
    $sym = strtoupper((string)($r['symbol'] ?? ''));
    $type = strtolower((string)($r['type'] ?? ''));
    if ($sym === '' || $type === '') continue;

    if (!$skipExpensive && (microtime(true) - $t0) > $budget) $skipExpensive = true;

    $seed = (float)($r['seed_price'] ?? 0);

    try {
$prevRow = $prevMap[$sym.'|'.$type] ?? null;
      $prev = $prevRow ? (float)($prevRow['price'] ?? 0.0) : 0.0;
      $price = $prev > 0 ? $prev : ($seed > 0 ? $seed : 1.0);
      $chgPct = $prevRow ? (float)($prevRow['change_pct'] ?? 0.0) : 0.0;

      $metaArr = market_meta($r['meta'] ?? null);
      $providerType = vp_provider_asset_type($type);
      $extras = [];
      $sourceName = (string)($prevRow['source'] ?? '');
      $sourceTs = (int)($prevRow['updated_at'] ?? 0);
      $hadAuthoritativeUpdate = false;

      if ($type === 'crypto') {
        if (isset($cryptoData[$sym])) {
          $d = $cryptoData[$sym];
          $price = (float)($d['price'] ?? $price);
          $chgPct = (float)($d['change_pct'] ?? $chgPct);
          $external++;
          $sourceName = 'binance';
          $hadAuthoritativeUpdate = true;
        } else {
          $price = quote_random_walk($price, 0.016);
          if ($prev > 0) $chgPct = (($price / $prev) - 1.0) * 100.0;
        }

        if (!$skipExpensive && $perpOn && $perpDone < $perpMax) {
          try {
            $perp = binance_futures_mark_price_cached($sym, $perpTtl);
            if (!empty($perp['mark_price'])) {
              $extras = $perp;
              $perpDone++;
              if ($sourceName === '') $sourceName = 'binance';
            }
          } catch (Throwable $e) { /* ignore */ }
        }
      } else {
        $used = false;

        if (isset($eodhdKeyBySym[$sym])) {
          $ek = $eodhdKeyBySym[$sym];
          if (isset($eodhdBulk[$ek]) && is_array($eodhdBulk[$ek])) {
            $ep = (float)($eodhdBulk[$ek]['price'] ?? 0);
            if ($ep > 0) {
              $price = $ep;
              $chgPct = (float)($eodhdBulk[$ek]['change_pct'] ?? $chgPct);
              $used = true;
              $external++;
              $sourceName = (string)($eodhdBulk[$ek]['source'] ?? 'eodhd');
              $sourceTs = quote_row_provider_ts($eodhdBulk[$ek], $sourceTs);
              $hadAuthoritativeUpdate = true;
            }
          }
        }

        // Fast path: stocks / arab / commodities / futures refreshed from Yahoo bulk map (real session change_pct).
        if (in_array($type, ['stocks','commodities','futures','arab'], true) && isset($yahooKeyBySym[$sym])) {
          $yk = $yahooKeyBySym[$sym];
          if (isset($yahooBulk[$yk]) && is_array($yahooBulk[$yk])) {
            $yp = (float)($yahooBulk[$yk]['price'] ?? 0);
            if ($yp > 0) {
              $price = $yp;
              $chgPct = (float)($yahooBulk[$yk]['change_pct'] ?? $chgPct);
              $used = true;
              $external++;
              $sourceName = (string)($yahooBulk[$yk]['source'] ?? 'yahoo');
              $sourceTs = quote_row_provider_ts($yahooBulk[$yk], $sourceTs);
              $hadAuthoritativeUpdate = true;
            }
          }
        }

        // Only attempt network refresh for the selected batch (keeps cron fast).
        if (!$used && !$skipExpensive && isset($extSet[$sym])) {
          // Prefer Polygon when configured
          if ($polygonOn) {
            $poly = strtoupper(trim((string)($metaArr['polygon_ticker'] ?? '')));
            if ($poly === '') {
              if ($providerType === 'stocks') {
                if (preg_match('/^[A-Z]{1,6}$/', $sym)) $poly = $sym;
              } elseif ($providerType === 'forex') {
                if (preg_match('/^[A-Z]{6}$/', $sym)) $poly = 'C:' . $sym;
              } elseif ($providerType === 'commodities') {
                if (preg_match('/^X(?:AU|AG|PT|PD)USD$/', $sym)) $poly = 'C:' . $sym;
              }
            }

            if ($poly !== '') {
              try {
                $p = (float)polygon_price($poly);
                if ($p > 0) {
                  $price = $p;
                  $used = true;
                  $external++;
                  $sourceName = 'polygon';
                  $sourceTs = $now;
                  $hadAuthoritativeUpdate = true;
                  if ($prev > 0) $chgPct = (($price / $prev) - 1.0) * 100.0;
                }
              } catch (Throwable $e) { $used = false; }
            }
          }

          if (!$used) {
            try {
              $ext = quote_fetch_external($sym, $type, $metaArr);
              if ($ext !== null && $ext > 0) {
                $price = (float)$ext;
                $used = true;
                $external++;
                $sourceName = 'provider_live';
                $sourceTs = $now;
                $hadAuthoritativeUpdate = true;
                if ($prev > 0) $chgPct = (($price / $prev) - 1.0) * 100.0;
              }
            } catch (Throwable $e) { /* ignore */ }
          }
        }

        if (!$used) {
          $simulate = ((string)env('NONCRYPTO_SIMULATE', '0') === '1');
          if ($simulate) {
            $vol = ($type === 'forex') ? 0.004 : (($type === 'stocks') ? 0.010 : 0.012);
            $price = quote_random_walk($price, $vol);
            if ($prev > 0) $chgPct = (($price / $prev) - 1.0) * 100.0;
            $hadAuthoritativeUpdate = true;
          } else {
            // Keep last known price if no external update this run (prevents jumping back to seed).
            if ($prev > 0) $chgPct = (($price / $prev) - 1.0) * 100.0;
            else $chgPct = 0.0;
          }
        }
      }

      if ($type !== 'crypto' && !$hadAuthoritativeUpdate && ((string)env('NONCRYPTO_SIMULATE', '0') !== '1')) {
        // Do not mark an old non-crypto quote as freshly updated when no real provider price arrived.
        // Keeping the prior row untouched is safer than poisoning market_quotes with a stale timestamp.
        continue;
      }
      if ($sourceName !== '') $extras['source'] = $sourceName;
      if (!isset($extras['source_priority']) && $sourceName !== '') {
        $extras['source_priority'] = match(strtolower($sourceName)) {
          'binance' => 100, 'eodhd','eodhd_rest' => 88, 'massive','polygon' => 90, 'yahoo' => 72, 'provider_live' => 92, 'eodhd_intraday','yahoo_chart_live' => 36, default => 40,
        };
      }
      $persistTs = ($type === 'crypto') ? $now : ($sourceTs > 0 ? $sourceTs : $now);
      if ($sourceTs > 0) { $extras['as_of'] = $sourceTs; $extras['ingested_at'] = $now; }
      quote_upsert($sym, $type, $price, $chgPct, $persistTs, $extras);
      $updated++;
    } catch (Throwable $e) {
      $errors++;
    }
  }

  $elapsed = (int)round((microtime(true) - $t0) * 1000);
  return ['updated'=>$updated,'errors'=>$errors,'external'=>$external,'ts'=>$now,'ms'=>$elapsed,'budget_hit'=>$skipExpensive];
}



/**
 * Attempt to fetch an external price (best effort).
 * Uses, in order:
 *  - Binance (crypto)
 *  - Polygon (if POLYGON_API_KEY and polygon_ticker is configured)
 *  - Free FX fallback (Frankfurter) for forex pairs like EURUSD
 *  - Free Stooq fallback for stocks/ETFs if stooq_ticker is configured (or can be guessed)
 */

function quote_fetch_external(string $symbol, string $type, array $meta = []): ?float {
  $symbol = strtoupper($symbol);
  $type = vp_normalize_asset_type($type);
  $providerType = vp_provider_asset_type($type);
  $isSpotMetal = vp_is_spot_metal_symbol($symbol, $type);

  try {
    if ($providerType === 'crypto') return binance_price($symbol);
  } catch (Throwable $e) { /* ignore */ }

  if (quote_provider_prefers_eodhd($type, $meta, $symbol)) {
    try {
      $eSym = eodhd_symbol_for_market($symbol, $type, $meta);
      if ($eSym) {
        $live = eodhd_quote_realtime_cached($eSym, max(1, min(5, (int)env('EODHD_PRICE_TTL', '2'))));
        if (is_array($live) && (float)($live['price'] ?? 0) > 0) {
          $liveRow = [
            'symbol' => $symbol,
            'type' => $type,
            'price' => (float)($live['price'] ?? 0),
            'change_pct' => (float)($live['change_pct'] ?? 0.0),
            'updated_at' => quote_row_provider_ts($live, time()),
            'source' => (string)($live['source'] ?? 'eodhd'),
          ];
          if (in_array($providerType, ['forex','commodities','futures'], true) && quote_primary_row_is_stale($liveRow, $type, time())) {
            $rescue = quote_try_yahoo_rescue_row($symbol, $type, $meta, time());
            if (is_array($rescue) && (float)($rescue['price'] ?? 0) > 0) $liveRow = $rescue;
          }
          if ((float)($liveRow['price'] ?? 0) > 0) return (float)$liveRow['price'];
        }
      }
    } catch (Throwable $e) { /* ignore */ }
  }

  if ($providerType === 'forex' && ((int)env('ENABLE_MASSIVE_FALLBACK', '0') === 1) && strtolower((string)env('PRICE_PROVIDER', 'eodhd')) === 'massive') {
    try {
      $mSym = massive_market_ticker($symbol, $type, $meta);
      if ($mSym) {
        $bulk = massive_snapshot_many_cached([$mSym], max(1, min(5, (int)env('MASSIVE_FOREX_TTL', '2'))));
        $row = is_array($bulk[$mSym] ?? null) ? $bulk[$mSym] : null;
        if ($row && (float)($row['price'] ?? 0) > 0) return (float)$row['price'];
      }
    } catch (Throwable $e) { /* ignore */ }
  }

  $allowYahooFallback = !($providerType === 'commodities' && $isSpotMetal && quote_provider_prefers_eodhd($type, $meta, $symbol));
  if ($allowYahooFallback) try {
    $ySym = yahoo_ticker_for_market($symbol, $type, $meta) ?: $symbol;
    if (preg_match('/^[A-Z0-9._=\/-]{1,24}$/', strtoupper((string)$ySym))) {
      try {
        $bulk = yahoo_quote_many_cached([$ySym], max(1, (int)env('YAHOO_PRICE_TTL', '5')));
        $it = $bulk[$ySym] ?? null;
        if (is_array($it) && (float)($it['price'] ?? 0) > 0) return (float)$it['price'];
      } catch (Throwable $e) { /* ignore */ }
      $live = yahoo_live_quote_or_chart($ySym, '1m');
      if (is_array($live) && (float)($live['price'] ?? 0) > 0) return (float)$live['price'];
      $last = yahoo_last_price($ySym);
      if ((float)$last > 0) return (float)$last;
    }
  } catch (Throwable $e) { /* ignore */ }

  if ($providerType === 'commodities' && $isSpotMetal && ((int)env('ENABLE_MASSIVE_FALLBACK', '0') === 1)) {
    try {
      $mSym = massive_market_ticker($symbol, $type, $meta);
      if ($mSym) {
        $bulk = massive_snapshot_many_cached([$mSym], max(1, min(5, (int)env('MASSIVE_COMMODITIES_TTL', '2'))));
        $row = is_array($bulk[$mSym] ?? null) ? $bulk[$mSym] : null;
        if ($row && (float)($row['price'] ?? 0) > 0) return (float)$row['price'];
      }
    } catch (Throwable $e) { /* ignore */ }
  }

  return null;
}
