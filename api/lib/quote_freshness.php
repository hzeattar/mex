<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quotes.php';

function qa_source_rank(?string $source): int {
  $src = strtolower(trim((string)$source));
  return match($src) {
    'binance' => 100,
    'trade_stream', 'stream' => 96,
    'provider_live' => 92,
    'eodhd', 'eodhd_rest' => 91,
    'finnhub' => 89,
    'tiingo' => 87,
    'yahoo', 'yahoo_chart_live' => 72,
    'massive', 'polygon', 'provider_fallback', 'fx_fallback', 'frankfurter', 'stooq' => 20,
    'eodhd_intraday' => 12,
    'cache', 'stale_cache' => 12,
    'seed', 'seed_fallback', 'seed_price', 'seed_default', 'chart_seed', 'seed_candle', 'synthetic', 'aggs', 'unavailable' => 4,
    default => ($src === '' ? 0 : 40),
  };
}

function qa_quote_max_age(string $assetType, bool $strict = false): int {
  $assetType = vp_normalize_asset_type($assetType);
  // Max age before a cached quote is considered too stale to use.
  // Env-overridable so windows can be tightened once real provider keys + a
  // warming cron keep market_quotes fresh, without forcing a code change.
  // Defaults are generous enough to survive normal weekend/holiday market closures.
  $age = static function (string $key, int $default): int {
    $v = (int)env($key, (string)$default);
    return $v > 0 ? $v : $default;
  };
  // Crypto: cron runs every 60s so max age must exceed that. 90s non-strict, 45s strict.
  if ($assetType === 'crypto')      return $strict ? $age('QA_MAXAGE_CRYPTO_STRICT', 45)       : $age('QA_MAXAGE_CRYPTO', 90);
  if ($assetType === 'forex')       return $strict ? $age('QA_MAXAGE_FOREX_STRICT', 259200)    : $age('QA_MAXAGE_FOREX', 259200);
  if ($assetType === 'stocks')      return $strict ? $age('QA_MAXAGE_STOCKS_STRICT', 604800)   : $age('QA_MAXAGE_STOCKS', 604800);
  if ($assetType === 'arab')        return $strict ? $age('QA_MAXAGE_ARAB_STRICT', 604800)     : $age('QA_MAXAGE_ARAB', 604800);
  if ($assetType === 'commodities') return $strict ? $age('QA_MAXAGE_COMMODITIES_STRICT', 259200) : $age('QA_MAXAGE_COMMODITIES', 604800);
  if ($assetType === 'futures')     return $strict ? $age('QA_MAXAGE_FUTURES_STRICT', 259200)  : $age('QA_MAXAGE_FUTURES', 604800);
  return $strict ? 180 : 360;
}

function qa_market_is_open(string $assetType): bool {
  $assetType = vp_normalize_asset_type($assetType);
  if ($assetType === 'crypto') return true;
  $dow = (int)gmdate('N'); // 1=Mon … 7=Sun
  $min = (int)gmdate('G') * 60 + (int)gmdate('i'); // minutes since midnight UTC
  if ($assetType === 'arab') {
    // Arab/Gulf markets: Sun-Thu. Friday & Saturday closed.
    if ($dow === 5 || $dow === 6) return false;
    // Sun=7 or Mon-Thu=1-4: 07:00-12:30 UTC (covers SA 10-15:30 AST, DU 11-16:30 GST)
    $open = $dow === 7 || $dow <= 4;
    return $open && $min >= 420 && $min < 750;
  }
  if ($assetType === 'stocks') {
    // NYSE/NASDAQ: Mon-Fri 13:30-20:00 UTC
    if ($dow >= 6) return false;
    return $min >= 810 && $min < 1200;
  }
  // Forex, commodities, futures: Mon-Fri 24h (closed Sat & Sun)
  return $dow <= 5;
}

function qa_quote_row_ts($row): int {
  if (!is_array($row)) return 0;
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  if (in_array($source, ['yahoo_chart_live','provider_live'], true)) {
    foreach (['updated_at','received_at','ingested_at','as_of','provider_ts','provider_updated_at'] as $k) {
      if (isset($row[$k]) && is_numeric($row[$k])) {
        $ts = (int)$row[$k];
        if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
        if ($ts > 0) return $ts;
      }
    }
  }
  foreach (['provider_updated_at','provider_ts','as_of','updated_at'] as $k) {
    if (isset($row[$k]) && is_numeric($row[$k])) {
      $ts = (int)$row[$k];
      if ($ts > 1000000000000) $ts = (int)floor($ts / 1000);
      if ($ts > 0) return $ts;
    }
  }
  return 0;
}

function qa_quote_is_usable($row, string $assetType, bool $strict = false): bool {
  if (!is_array($row)) return false;
  $assetType = vp_normalize_asset_type($assetType);
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  $symbol = strtoupper(trim((string)($row['symbol'] ?? '')));
  if (function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($symbol, $assetType, $source)) return false;
  if ($assetType === 'crypto') {
    if (!quote_source_is_liveish($source, $assetType)) return false;
    $updatedAt = qa_quote_row_ts($row);
    if ($updatedAt <= 0) return false;
    $age = max(0, time() - $updatedAt);
    return $age <= qa_quote_max_age($assetType, $strict);
  }
  if (!quote_source_is_liveish($source, $assetType)) return false;
  $updatedAt = qa_quote_row_ts($row);
  if ($updatedAt <= 0) return false;
  $age = max(0, time() - $updatedAt);
  return $age <= qa_quote_max_age($assetType, $strict);
}

function qa_quote_timing_class($row, string $assetType): string {
  if (!is_array($row) || (float)($row['price'] ?? 0) <= 0) return 'unavailable';
  $assetType = vp_normalize_asset_type($assetType);
  $source = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  if (quote_source_is_untrusted($source)) return 'seed';
  if ($source === 'eodhd_intraday' || $source === 'yahoo_chart_live') return 'candle_fallback';
  if ($assetType !== 'crypto' && !quote_source_is_liveish($source, $assetType)) return 'stale';
  // Finnhub and Tiingo provide real-time quotes — treat as live even for stocks/arab
  $isRealtimeProvider = in_array($source, ['finnhub','tiingo','binance','trade_stream','stream'], true);
  if (!$isRealtimeProvider && (($assetType !== 'crypto' && $source === 'yahoo') || in_array($assetType, ['stocks','arab'], true) || !empty($row['delayed']))) {
    if (!qa_quote_is_usable($row, $assetType, false)) return 'stale';
    return qa_market_is_open($assetType) ? 'delayed' : 'market_closed';
  }
  if (!qa_quote_is_usable($row, $assetType, false)) return 'stale';
  if ($assetType !== 'crypto' && !qa_market_is_open($assetType)) return 'market_closed';
  return 'live';
}

function qa_choose_authoritative_quote(?array $cached, ?array $live, string $assetType, array $opts = []): ?array {
  $assetType = vp_normalize_asset_type($assetType);
  $allowCryptoSeed = !empty($opts['allow_crypto_seed']);
  $allowNonCryptoSeed = !empty($opts['allow_noncrypto_seed']);

  if (qa_quote_is_usable($live, $assetType, true)) {
    return $live;
  }
  if (qa_quote_is_usable($cached, $assetType, false)) {
    return $cached;
  }

  // Never promote stale rows to authoritative just because they have a positive price.
  if ($assetType === 'crypto' && $allowCryptoSeed) {
    foreach ([$live, $cached] as $candidate) {
      if (!is_array($candidate) || (float)($candidate['price'] ?? 0) <= 0) continue;
      $src = strtolower(trim((string)($candidate['source'] ?? $candidate['provider'] ?? '')));
      if (quote_source_is_untrusted($src)) return $candidate;
    }
  }
  if ($assetType !== 'crypto' && $allowNonCryptoSeed && is_array($cached) && (float)($cached['price'] ?? 0) > 0) {
    return $cached;
  }
  return null;
}
