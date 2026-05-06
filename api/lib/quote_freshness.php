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
  if ($assetType === 'crypto') return $strict ? 6 : 12;
  if ($assetType === 'forex') return $strict ? 300 : 360;
  if ($assetType === 'stocks') return $strict ? 129600 : 172800;
  if ($assetType === 'arab') return $strict ? 3600 : 7200;
  if ($assetType === 'commodities') return $strict ? 900 : 1800;
  if ($assetType === 'futures') return $strict ? 3600 : 7200;
  return $strict ? 180 : 360;
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
  if (in_array($assetType, ['stocks','arab'], true) || !empty($row['delayed'])) {
    return qa_quote_is_usable($row, $assetType, false) ? 'delayed' : 'stale';
  }
  return qa_quote_is_usable($row, $assetType, false) ? 'live' : 'stale';
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
