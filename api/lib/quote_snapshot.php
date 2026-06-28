<?php
declare(strict_types=1);

/**
 * Unified quote snapshot layer.
 *
 * Read paths may display stale/last-known prices, but real trade execution must
 * only use snapshots explicitly marked execution_allowed=true.
 */

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/quote_central.php';
require_once __DIR__ . '/quote_authority.php';

function qs_normalize_market(string $type, string $market = ''): string {
  $type = vp_normalize_asset_type($type);
  $market = strtolower(trim($market));
  if (!in_array($market, ['spot', 'perp'], true)) {
    $market = ($type === 'crypto' || $type === 'futures') ? 'perp' : 'spot';
  }
  if (!in_array($type, ['crypto', 'futures'], true)) return 'spot';
  return $market;
}

function qs_source_rank(?string $source): int {
  if (function_exists('qa_source_rank')) return qa_source_rank($source);
  if (function_exists('vp_quote_source_rank')) return vp_quote_source_rank($source);
  $src = strtolower(trim((string)$source));
  return match ($src) {
    'binance' => 100,
    'binance_ws' => 98,
    'twelvedata_ws' => 97,
    'twelvedata' => 96,
    'trade_stream', 'stream' => 90,
    'provider_live' => 88,
    'finnhub_ws' => 86,
    'finnhub' => 84,
    'eodhd', 'eodhd_rest' => 82,
    'tiingo' => 87,
    'fcsapi' => 76,
    'currencyfreaks' => 74,
    'coingecko', 'coingecko_metal' => 72,
    'yahoo', 'yahoo_chart_live' => 1,
    'stooq', 'massive', 'polygon', 'provider_fallback' => 40,
    'cache', 'stale_cache', 'eodhd_intraday' => 12,
    'seed', 'seed_price', 'synthetic', 'unavailable' => 4,
    default => ($src === '' ? 0 : 40),
  };
}

function qs_ts($value): int {
  if (!is_numeric($value)) return 0;
  $ts = (int)$value;
  if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
  return max(0, $ts);
}

function qs_row_provider_ts(array $row): int {
  if (function_exists('quote_row_provider_ts')) {
    try {
      $ts = quote_row_provider_ts($row, 0);
      if ($ts > 0) return $ts;
    } catch (Throwable $e) {}
  }
  foreach (['provider_updated_at', 'provider_ts', 'as_of', 'updated_at'] as $key) {
    $ts = qs_ts($row[$key] ?? 0);
    if ($ts > 0) return $ts;
  }
  return 0;
}

function qs_row_received_ts(array $row): int {
  foreach (['received_at', 'ingested_at', 'cache_updated_at', 'central_ts'] as $key) {
    $ts = qs_ts($row[$key] ?? 0);
    if ($ts > 0) return $ts;
  }
  return qs_row_provider_ts($row);
}

function qs_display_max_age(string $type): int {
  $type = vp_normalize_asset_type($type);
  return match ($type) {
    'crypto' => max(30, min(900, (int)env('QS_DISPLAY_MAX_AGE_CRYPTO', '180'))),
    'forex' => max(60, min(3600, (int)env('QS_DISPLAY_MAX_AGE_FOREX', '900'))),
    'commodities', 'futures' => max(120, min(7200, (int)env('QS_DISPLAY_MAX_AGE_MARKETS', '1800'))),
    'stocks', 'arab' => max(600, min(86400, (int)env('QS_DISPLAY_MAX_AGE_DELAYED', '21600'))),
    default => max(60, min(3600, (int)env('QS_DISPLAY_MAX_AGE_DEFAULT', '900'))),
  };
}

function qs_execution_max_age(string $type): int {
  $type = vp_normalize_asset_type($type);
  return match ($type) {
    'crypto' => max(3, min(30, (int)env('QS_EXEC_MAX_AGE_CRYPTO', '10'))),
    'forex' => max(10, min(300, (int)env('QS_EXEC_MAX_AGE_FOREX', '60'))),
    'commodities', 'futures' => max(15, min(600, (int)env('QS_EXEC_MAX_AGE_MARKETS', '120'))),
    'stocks', 'arab' => max(60, min(1800, (int)env('QS_EXEC_MAX_AGE_DELAYED', '900'))),
    default => max(10, min(300, (int)env('QS_EXEC_MAX_AGE_DEFAULT', '60'))),
  };
}

function qs_spread_bps(string $type, string $market = ''): float {
  $type = vp_normalize_asset_type($type);
  $key = match ($type) {
    'crypto' => 'QS_SPREAD_BPS_CRYPTO',
    'forex' => 'QS_SPREAD_BPS_FOREX',
    'commodities' => 'QS_SPREAD_BPS_COMMODITIES',
    'futures' => 'QS_SPREAD_BPS_FUTURES',
    'stocks' => 'QS_SPREAD_BPS_STOCKS',
    'arab' => 'QS_SPREAD_BPS_ARAB',
    default => 'QS_SPREAD_BPS_DEFAULT',
  };
  $default = match ($type) {
    'crypto' => '2.0',
    'forex' => '1.5',
    'commodities', 'futures' => '3.0',
    'stocks' => '5.0',
    'arab' => '8.0',
    default => '5.0',
  };
  $bps = (float)env($key, $default);
  return max(0.0, min(200.0, $bps));
}

function qs_empty_snapshot(string $symbol, string $type, string $market = 'spot'): array {
  $symbol = strtoupper(trim($symbol));
  $type = vp_normalize_asset_type($type ?: 'crypto');
  if ($type === '') $type = 'crypto';
  $market = qs_normalize_market($type, $market);
  return [
    'symbol' => $symbol,
    'type' => $type,
    'market' => $market,
    'bid' => 0.0,
    'ask' => 0.0,
    'last' => 0.0,
    'mid' => 0.0,
    'mark' => 0.0,
    'price' => 0.0,
    'spread' => 0.0,
    'spread_bps' => 0.0,
    'change_pct' => 0.0,
    'source' => 'unavailable',
    'provider_ts' => 0,
    'received_at' => 0,
    'updated_at' => 0,
    'cache_updated_at' => 0,
    'age_sec' => null,
    'timing_class' => 'unavailable',
    'quality' => 'unavailable',
    'source_rank' => 0,
    'execution_allowed' => false,
    'execution_block_reason' => 'price_unavailable',
  ];
}

function qs_timing_class(array $row, string $type): string {
  if (function_exists('qa_quote_timing_class')) {
    try { return qa_quote_timing_class($row, $type); } catch (Throwable $e) {}
  }
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  if ((float)($row['price'] ?? 0) <= 0) return 'unavailable';
  if (function_exists('quote_source_is_untrusted') && quote_source_is_untrusted($source)) return 'seed';
  $isRealtimeProvider = in_array($source, ['finnhub','tiingo','binance','trade_stream','stream'], true);
  if (!$isRealtimeProvider && (in_array($type, ['stocks', 'arab'], true) || ($type !== 'crypto' && str_starts_with($source, 'yahoo')))) return 'delayed';
  return 'live';
}

function qs_snapshot_from_row(string $symbol, string $type, string $market, ?array $row, array $opts = []): array {
  $snap = qs_empty_snapshot($symbol, $type, $market);
  if (!is_array($row) || (float)($row['price'] ?? 0) <= 0) return $snap;

  $symbol = strtoupper(trim((string)($row['symbol'] ?? $symbol)));
  $type = vp_normalize_asset_type((string)($row['type'] ?? $type));
  if ($type === '') $type = vp_normalize_asset_type((string)($opts['type'] ?? 'crypto')) ?: 'crypto';
  $market = qs_normalize_market($type, (string)($row['market'] ?? $market));

  $last = (float)($row['price'] ?? 0);
  $mark = (float)($row['mark_price'] ?? 0);
  if (!($mark > 0)) $mark = $last;
  $mid = $market === 'perp' ? $mark : $last;
  if (!($mid > 0)) $mid = $last;

  $bid = (float)($row['bid'] ?? 0);
  $ask = (float)($row['ask'] ?? 0);
  $spreadBps = qs_spread_bps($type, $market);
  $spread = $mid * ($spreadBps / 10000.0);
  if (!($bid > 0) || !($ask > 0) || $ask < $bid) {
    $bid = max(0.00000001, $mid - ($spread / 2.0));
    $ask = max($bid, $mid + ($spread / 2.0));
  } else {
    $spread = max(0.0, $ask - $bid);
    $spreadBps = $mid > 0 ? ($spread / $mid) * 10000.0 : 0.0;
  }

  $providerTs = qs_row_provider_ts($row);
  $receivedAt = qs_row_received_ts($row);
  $effectiveTs = max($providerTs, $receivedAt);
  $age = $effectiveTs > 0 ? max(0, time() - $effectiveTs) : null;
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? 'cache')));
  if (function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($source)) {
    return $snap;
  }
  $rank = qs_source_rank($source);
  $timing = qs_timing_class($row + ['market' => $market], $type);
  $untrusted = function_exists('quote_source_is_untrusted') ? quote_source_is_untrusted($source) : in_array($source, ['seed', 'synthetic', 'cache', 'stale_cache', 'unavailable'], true);
  $blocked = function_exists('quote_source_blocked_for_symbol') ? quote_source_blocked_for_symbol($symbol, $type, $source) : false;
  $isLiveish = function_exists('quote_source_is_liveish') ? quote_source_is_liveish($source, $type) : ($rank >= 68);

  $mode = strtolower((string)($opts['mode'] ?? 'display'));
  $execMaxAge = qs_execution_max_age($type);
  $displayMaxAge = qs_display_max_age($type);
  $maxAge = $mode === 'execution' ? $execMaxAge : $displayMaxAge;
  $tooOld = $age === null || $age > $maxAge;

  $isCrypto = ($type === 'crypto');
  // Simulation / CFD-style execution: non-crypto venues (forex, stocks, commodities,
  // futures, arab) can be traded at the last known trusted price even when the venue is
  // closed or only a delayed / candle feed is available. Gated by QS_EXEC_ALLOW_NONCRYPTO.
  $allowNonCrypto = !$isCrypto && ((int)env('QS_EXEC_ALLOW_NONCRYPTO', '1') === 1);
  $allowDelayedExecution = $allowNonCrypto
    || (((int)env('QS_EXEC_ALLOW_DELAYED_STOCKS', '1') === 1) && in_array($type, ['stocks', 'arab'], true));

  if ($allowNonCrypto) {
    // Accept any trusted, live-ish provider feed up to the (larger) display freshness window.
    $tooOld = $age === null || $age > max($execMaxAge, $displayMaxAge);
    $timingExecutable = !in_array($timing, ['unavailable', 'seed'], true);
    $isLiveish = $isLiveish || (!$untrusted && $rank >= 40);
  } else {
    $timingExecutable = $timing === 'live' || ($allowDelayedExecution && in_array($timing, ['delayed', 'market_closed'], true));
  }

  $executionAllowed = $last > 0
    && !$untrusted
    && !$blocked
    && $isLiveish
    && !$tooOld
    && $timingExecutable;

  $blockReason = '';
  if (!$executionAllowed) {
    if ($last <= 0) $blockReason = 'price_unavailable';
    elseif ($untrusted) $blockReason = 'untrusted_source';
    elseif ($blocked) $blockReason = 'blocked_source';
    elseif (!$isLiveish) $blockReason = 'source_not_live';
    elseif ($tooOld) $blockReason = 'quote_stale';
    else $blockReason = 'timing_not_executable';
  }

  $changePct = (float)($row['change_pct'] ?? 0);
  $prevClose = (float)($row['prev_close'] ?? $row['previous_close'] ?? 0);
  if ($mid > 0 && $prevClose > 0) {
    $recomputed = (($mid - $prevClose) / $prevClose) * 100.0;
    // Prefer the stored pct if it is sane and close to the recomputed one;
    // otherwise use the recomputed pct so stale/wrong provider percentages don't mislead users.
    $threshold = function_exists('quote_change_pct_recompute_threshold')
      ? quote_change_pct_recompute_threshold($type)
      : 15.0;
    if (abs($changePct) < 0.000001 || abs($recomputed - $changePct) > $threshold) {
      $changePct = $recomputed;
    }
  }

  return [
    'symbol' => $symbol,
    'type' => $type,
    'market' => $market,
    'bid' => $bid,
    'ask' => $ask,
    'last' => $last,
    'mid' => $mid,
    'mark' => $mark,
    'price' => $mid,
    'spread' => $spread,
    'spread_bps' => $spreadBps,
    'change_pct' => $changePct,
    'open' => (float)($row['open'] ?? 0),
    'prev_close' => $prevClose,
    'source' => $source !== '' ? $source : 'cache',
    'provider_ts' => $providerTs,
    'received_at' => $receivedAt,
    'updated_at' => $providerTs,
    'cache_updated_at' => $receivedAt,
    'age_sec' => $age,
    'timing_class' => $timing,
    'quality' => $executionAllowed ? 'executable' : ($tooOld ? 'stale' : ($untrusted ? 'display_only' : 'display')),
    'source_rank' => $rank,
    'execution_allowed' => $executionAllowed,
    'execution_block_reason' => $blockReason,
  ];
}

function qs_choose_row(?array $central, ?array $stored, string $type): ?array {
  if ($central && function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($central['source'] ?? $central['provider'] ?? '')) $central = null;
  if ($stored && function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($stored['source'] ?? $stored['provider'] ?? '')) $stored = null;
  if (!$central && !$stored) return null;
  if ($central && !$stored) return $central;
  if ($stored && !$central) return $stored;
  $centralRank = qs_source_rank($central['source'] ?? $central['provider'] ?? '');
  $storedRank = qs_source_rank($stored['source'] ?? $stored['provider'] ?? '');
  $centralTs = max(qs_row_received_ts($central), qs_row_provider_ts($central));
  $storedTs = max(qs_row_received_ts($stored), qs_row_provider_ts($stored));
  if ($centralRank >= $storedRank && $centralTs + 30 >= $storedTs) return $central;
  if ($storedRank > $centralRank + 10 && $storedTs + 180 >= $centralTs) return $stored;
  return $centralTs >= $storedTs ? $central : $stored;
}

function qs_snapshots(array $symbols, string $type, string $market = 'spot', array $opts = []): array {
  $requestedType = vp_normalize_asset_type($type ?: '');
  $symbols = array_values(array_unique(array_filter(array_map(static function($sym) {
    $sym = strtoupper(trim((string)$sym));
    return ($sym !== '' && preg_match('/^[A-Z0-9:._^=\/\-]{1,32}$/', $sym)) ? $sym : '';
  }, $symbols))));
  if (!$symbols) return [];

  if ($requestedType === 'all') {
    $metaRows = [];
    try {
      if (function_exists('qa_market_meta_by_symbols')) $metaRows = qa_market_meta_by_symbols($symbols);
    } catch (Throwable $e) {
      $metaRows = [];
    }
    $groups = [];
    foreach ($symbols as $sym) {
      $assetType = vp_normalize_asset_type((string)($metaRows[$sym]['type'] ?? ''));
      if ($assetType === '' || $assetType === 'all') $assetType = 'crypto';
      $groups[$assetType][] = $sym;
    }
    $bySymbol = [];
    foreach ($groups as $assetType => $groupSymbols) {
      foreach (qs_snapshots($groupSymbols, $assetType, $market, $opts) as $snapshot) {
        $snapshotSymbol = strtoupper(trim((string)($snapshot['symbol'] ?? '')));
        if ($snapshotSymbol !== '') $bySymbol[$snapshotSymbol] = $snapshot;
      }
    }
    $ordered = [];
    foreach ($symbols as $sym) {
      $ordered[] = $bySymbol[$sym] ?? qs_empty_snapshot($sym, 'crypto', $market);
    }
    return $ordered;
  }

  $type = $requestedType !== '' ? $requestedType : 'crypto';
  $market = qs_normalize_market($type, $market);
  $mode = strtolower((string)($opts['mode'] ?? 'display'));
  $maxAge = $mode === 'execution' ? qs_execution_max_age($type) : qs_display_max_age($type);

  $centralRows = [];
  try { $centralRows = quote_central_get_many($symbols, $type, $maxAge); } catch (Throwable $e) { $centralRows = []; }

  $storedRows = [];
  try {
    if (function_exists('qa_quote_rows_by_symbols')) {
      $storedRows = qa_quote_rows_by_symbols($symbols, $type);
    } else {
      foreach ($symbols as $sym) {
        $row = quote_get($sym, $type, $market);
        if (is_array($row)) $storedRows[$sym] = $row;
      }
    }
  } catch (Throwable $e) {
    $storedRows = [];
  }

  $out = [];
  foreach ($symbols as $sym) {
    $row = qs_choose_row(
      is_array($centralRows[$sym] ?? null) ? $centralRows[$sym] : null,
      is_array($storedRows[$sym] ?? null) ? $storedRows[$sym] : null,
      $type
    );
    $out[] = qs_snapshot_from_row($sym, $type, $market, $row, $opts + ['mode' => $mode]);
  }
  return $out;
}

function qs_snapshot(string $symbol, string $type, string $market = 'spot', array $opts = []): array {
  $rows = qs_snapshots([$symbol], $type, $market, $opts);
  return $rows[0] ?? qs_empty_snapshot($symbol, $type, $market);
}

function qs_public_item(array $snapshot): array {
  return [
    'symbol' => (string)($snapshot['symbol'] ?? ''),
    'type' => (string)($snapshot['type'] ?? ''),
    'market' => (string)($snapshot['market'] ?? 'spot'),
    'price' => (float)($snapshot['price'] ?? $snapshot['last'] ?? 0),
    'bid' => (float)($snapshot['bid'] ?? 0),
    'ask' => (float)($snapshot['ask'] ?? 0),
    'mark_price' => (float)($snapshot['mark'] ?? 0),
    'spread' => (float)($snapshot['spread'] ?? 0),
    'spread_bps' => (float)($snapshot['spread_bps'] ?? 0),
    'change_pct' => (float)($snapshot['change_pct'] ?? 0),
    'open' => (float)($snapshot['open'] ?? 0),
    'prev_close' => (float)($snapshot['prev_close'] ?? 0),
    'updated_at' => (int)($snapshot['updated_at'] ?? 0),
    'provider_updated_at' => (int)($snapshot['provider_ts'] ?? 0),
    'received_at' => (int)($snapshot['received_at'] ?? 0),
    'cache_updated_at' => (int)($snapshot['cache_updated_at'] ?? 0),
    'source' => (string)($snapshot['source'] ?? 'unavailable'),
    'timing_class' => (string)($snapshot['timing_class'] ?? 'unavailable'),
    'delayed' => in_array((string)($snapshot['timing_class'] ?? ''), ['delayed', 'market_closed'], true),
    'quality' => (string)($snapshot['quality'] ?? 'unavailable'),
    'age_sec' => $snapshot['age_sec'] ?? null,
    'execution_allowed' => !empty($snapshot['execution_allowed']),
  ];
}

function qs_public_items(array $snapshots): array {
  return array_map('qs_public_item', $snapshots);
}

function qs_execution_price(array $snapshot, string $side): float {
  $side = strtoupper(trim($side));
  if ($side === 'BUY') return (float)($snapshot['ask'] ?? $snapshot['price'] ?? 0);
  if ($side === 'SELL') return (float)($snapshot['bid'] ?? $snapshot['price'] ?? 0);
  return (float)($snapshot['price'] ?? 0);
}

function qs_meta(array $snapshot): array {
  return [
    'symbol' => (string)($snapshot['symbol'] ?? ''),
    'type' => (string)($snapshot['type'] ?? ''),
    'market' => (string)($snapshot['market'] ?? ''),
    'bid' => (float)($snapshot['bid'] ?? 0),
    'ask' => (float)($snapshot['ask'] ?? 0),
    'last' => (float)($snapshot['last'] ?? 0),
    'mid' => (float)($snapshot['mid'] ?? 0),
    'mark' => (float)($snapshot['mark'] ?? 0),
    'spread_bps' => (float)($snapshot['spread_bps'] ?? 0),
    'source' => (string)($snapshot['source'] ?? ''),
    'provider_ts' => (int)($snapshot['provider_ts'] ?? 0),
    'received_at' => (int)($snapshot['received_at'] ?? 0),
    'age_sec' => $snapshot['age_sec'] ?? null,
    'timing_class' => (string)($snapshot['timing_class'] ?? ''),
    'quality' => (string)($snapshot['quality'] ?? ''),
    'execution_allowed' => !empty($snapshot['execution_allowed']),
    'execution_block_reason' => (string)($snapshot['execution_block_reason'] ?? ''),
  ];
}
