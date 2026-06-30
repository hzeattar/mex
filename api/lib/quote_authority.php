<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/quote_central.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quote_freshness.php';
require_once __DIR__ . '/quote_cache_policy.php';
require_once __DIR__ . '/quote_store.php';
require_once __DIR__ . '/quote_batch.php';

function qa_live_candidates_grouped(array $symbolsByType, array $cachedBySymbol = [], array $opts = []): array {
  $out = [];
  $forceLive = !empty($opts['force_live']);
  $strictLiveNonCrypto = !empty($opts['strict_live_noncrypto']);

  foreach ($symbolsByType as $assetType => $symbols) {
    $assetType = vp_normalize_asset_type((string)$assetType);
    if ($assetType === '' || $assetType === 'all') continue;

    foreach ((array)$symbols as $sym) {
      $sym = strtoupper(trim((string)$sym));
      if ($sym === '') continue;

      if ($forceLive || ($strictLiveNonCrypto && $assetType !== 'crypto')) {
        $out[$assetType][] = $sym;
        continue;
      }

      $cached = is_array($cachedBySymbol[$sym] ?? null) ? $cachedBySymbol[$sym] : null;
      if (!is_array($cached)) {
        $out[$assetType][] = $sym;
        continue;
      }

      if (qa_quote_is_usable($cached, $assetType, false)) {
        continue;
      }

      $out[$assetType][] = $sym;
    }
  }

  foreach ($out as $type => $list) {
    $out[$type] = array_values(array_unique($list));
  }

  return $out;
}

function qa_quote_payload(string $typeAlias, array $symbols, array $opts = []): array {
  $typeAlias = vp_normalize_asset_type($typeAlias ?: '');
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  $metaRows = qa_market_meta_by_symbols($symbols);

  $resolvedTypeBySymbol = [];
  $metaBySymbol = [];
  $seedBySymbol = [];
  $symbolsByType = [];
  foreach ($symbols as $sym) {
    $resolved = $typeAlias && $typeAlias !== 'all'
      ? $typeAlias
      : vp_normalize_asset_type((string)($metaRows[$sym]['type'] ?? 'crypto'));
    if ($resolved === '' || $resolved === 'all') $resolved = 'crypto';
    $resolvedTypeBySymbol[$sym] = $resolved;
    $metaBySymbol[$sym] = is_array($metaRows[$sym]['meta'] ?? null) ? $metaRows[$sym]['meta'] : [];
    $seedBySymbol[$sym] = (float)($metaRows[$sym]['seed_price'] ?? 0);
    $symbolsByType[$resolved][] = $sym;
  }

  $cachedBySymbol = qa_quote_rows_by_symbols($symbols, ($typeAlias && $typeAlias !== 'all') ? $typeAlias : null);
  $liveBySymbol = [];
  $allowLive = array_key_exists('allow_live', $opts) ? (bool)$opts['allow_live'] : true;
  if ($allowLive) {
    $liveCandidatesByType = qa_live_candidates_grouped($symbolsByType, $cachedBySymbol, $opts);
    if ($liveCandidatesByType) {
      $liveBySymbol = qa_live_map_grouped($liveCandidatesByType, $metaBySymbol, $opts);
    }
  }

  $items = [];
  foreach ($symbols as $sym) {
    $assetType = $resolvedTypeBySymbol[$sym] ?? ($typeAlias ?: 'crypto');
    $live = is_array($liveBySymbol[$sym] ?? null) ? $liveBySymbol[$sym] : null;
    $cached = is_array($cachedBySymbol[$sym] ?? null) ? $cachedBySymbol[$sym] : null;
    $strictLiveNonCrypto = !empty($opts['strict_live_noncrypto']) && $assetType !== 'crypto';
    $chosen = $strictLiveNonCrypto
      ? (qa_quote_is_usable($live, $assetType, true) ? $live : null)
      : qa_choose_authoritative_quote($cached, $live, $assetType, [
          'allow_crypto_seed' => !empty($opts['allow_crypto_seed']),
          'allow_noncrypto_seed' => !empty($opts['allow_noncrypto_seed']),
        ]);

    $price = 0.0; $change = 0.0; $updatedAt = 0; $source = 'unavailable';
    $openPrice = 0.0; $prevClose = 0.0;
    $providerUpdatedAt = 0; $receivedAt = 0; $ingestedAt = 0; $cacheUpdatedAt = 0; $timingClass = 'unavailable';
    $delayed = in_array($assetType, ['stocks','arab'], true);
    if ($chosen) {
      $price = (float)($chosen['price'] ?? 0);
      $change = (float)($chosen['change_pct'] ?? 0);
      $openPrice = (float)($chosen['open'] ?? 0);
      $prevClose = (float)($chosen['prev_close'] ?? $chosen['previous_close'] ?? 0);
      $updatedAt = qa_quote_row_ts($chosen);
      $providerUpdatedAt = $updatedAt;
      $receivedAt = isset($chosen['received_at']) && is_numeric($chosen['received_at']) ? (int)$chosen['received_at'] : 0;
      $ingestedAt = isset($chosen['ingested_at']) && is_numeric($chosen['ingested_at']) ? (int)$chosen['ingested_at'] : 0;
      $cacheUpdatedAt = max($receivedAt, $ingestedAt);
      $source = (string)($chosen['source'] ?? $chosen['provider'] ?? '');
      $sourceLower = strtolower(trim($source));
      $delayed = !empty($chosen['delayed']) || in_array($assetType, ['stocks','arab'], true) || ($assetType !== 'crypto' && $sourceLower === 'yahoo');
      $timingClass = qa_quote_timing_class($chosen + ['delayed' => $delayed], $assetType);
    } elseif (!empty($opts['allow_stale_display']) && is_array($cached)) {
      $cachedPrice = (float)($cached['price'] ?? 0);
      $cachedSource = (string)($cached['source'] ?? $cached['provider'] ?? '');
      $cachedUpdatedAt = qa_quote_row_ts($cached);
      $cachedAge = $cachedUpdatedAt > 0 ? max(0, time() - $cachedUpdatedAt) : 999999;
      $maxStaleAge = $assetType === 'crypto'
        ? max(30, min(600, (int)env('QUOTES_CACHE_ONLY_CRYPTO_STALE_SECONDS', '300')))
        : qa_market_list_stale_seconds($assetType);
      if (
        $cachedPrice > 0
        && !quote_source_is_untrusted($cachedSource)
        && !(function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($sym, $assetType, $cachedSource))
        && $cachedAge <= $maxStaleAge
      ) {
        $price = $cachedPrice;
        $change = (float)($cached['change_pct'] ?? 0);
        $updatedAt = $cachedUpdatedAt;
        $providerUpdatedAt = $updatedAt;
        $receivedAt = isset($cached['received_at']) && is_numeric($cached['received_at']) ? (int)$cached['received_at'] : 0;
        $ingestedAt = isset($cached['ingested_at']) && is_numeric($cached['ingested_at']) ? (int)$cached['ingested_at'] : 0;
        $cacheUpdatedAt = max($receivedAt, $ingestedAt);
        $source = $cachedSource !== '' ? $cachedSource : 'stale_cache';
        $sourceLower = strtolower(trim($source));
        $delayed = in_array($assetType, ['stocks','arab'], true) || str_starts_with($sourceLower, 'yahoo');
        $timingClass = 'stale';
      }
    } elseif ($assetType === 'crypto' && !empty($opts['allow_crypto_seed'])) {
      $seed = (float)($seedBySymbol[$sym] ?? 0);
      if ($seed > 0) {
        $price = $seed;
        $updatedAt = time();
        $providerUpdatedAt = $updatedAt;
        $source = 'seed_price';
        $timingClass = 'seed';
      }
    } elseif ($assetType !== 'crypto' && !empty($opts['allow_noncrypto_seed'])) {
      $seed = (float)($seedBySymbol[$sym] ?? 0);
      if ($seed > 0) {
        $price = $seed;
        $updatedAt = time();
        $providerUpdatedAt = $updatedAt;
        $source = 'seed_price';
        $timingClass = 'seed';
      }
    }

    if ($change == 0.0 && $prevClose > 0 && $price > 0 && abs($price - $prevClose) > 0.0000001) {
      $change = (($price - $prevClose) / $prevClose) * 100.0;
    }
    $items[] = [
      'symbol' => $sym,
      'type' => $assetType,
      'price' => $price,
      'change_pct' => $change,
      'open' => $openPrice,
      'prev_close' => $prevClose,
      'updated_at' => $updatedAt,
      'provider_updated_at' => $providerUpdatedAt,
      'received_at' => $receivedAt,
      'ingested_at' => $ingestedAt,
      'cache_updated_at' => $cacheUpdatedAt,
      'source' => $source,
      'delayed' => $delayed,
      'timing_class' => $timingClass,
      'age_sec' => $updatedAt > 0 ? max(0, time() - $updatedAt) : null,
    ];
  }

  return [
    'ok' => true,
    'items' => $items,
    'authority' => 'quote_authority',
  ];
}

function qa_overlay_market_rows(array $rows, array $opts = []): array {
  $withLive = !empty($opts['with_live']);
  $allowCryptoSeed = !empty($opts['allow_crypto_seed']);
  $allowNonCryptoSeed = !empty($opts['allow_noncrypto_seed']);
  $allowStaleDisplay = !empty($opts['allow_stale_display']);

  $symbolsByType = [];
  $metaBySymbol = [];
  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;
    $symbolsByType[$type][] = $sym;
    $metaBySymbol[$sym] = market_meta($row['meta'] ?? null);
  }

  $storedByType = [];
  $cachedBySymbol = [];

  // Prefer central cache (WebSocket feeds: TwelveData/Binance/Finnhub) whenever available.
  $centralBySymbol = [];
  if (function_exists('quote_central_get_many')) {
    try {
      foreach ($symbolsByType as $type => $symbolsForType) {
        $centralRows = quote_central_get_many($symbolsForType, $type, 0);
        foreach ($centralRows as $sym => $centralRow) {
          $sym = strtoupper(trim((string)$sym));
          if ($sym === '') continue;
          $centralBySymbol[$type . ':' . $sym] = $centralRow;
          $centralBySymbol[$sym] = $centralRow;
        }
      }
    } catch (Throwable $e) {}
  }

  foreach ($symbolsByType as $type => $symbolsForType) {
    $storedByType[$type] = qa_quote_rows_by_symbols($symbolsForType, $type);
  }
  $out = [];
  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;

    $cached = qa_cached_quote_from_market_row($row, $type);
    $centralKey = $type . ':' . $sym;
    $central = is_array($centralBySymbol[$centralKey] ?? null) ? $centralBySymbol[$centralKey] : (is_array($centralBySymbol[$sym] ?? null) ? $centralBySymbol[$sym] : null);
    if (is_array($central) && (float)($central['price'] ?? 0) > 0) {
      // Central cache from WebSocket always wins if it has a price.
      $cached = [
        'symbol' => $sym,
        'type' => $type,
        'price' => (float)($central['price'] ?? 0),
        'change_pct' => (float)($central['change_pct'] ?? 0),
        'updated_at' => (int)($central['updated_at'] ?? $central['central_ts'] ?? $central['received_at'] ?? 0),
        'source' => (string)($central['source'] ?? 'central'),
        'open' => (float)($central['open'] ?? 0),
        'change_basis' => (string)($central['change_basis'] ?? ''),
        'prev_close' => (float)($central['prev_close'] ?? $central['previous_close'] ?? 0),
      ];
    } elseif ((float)($cached['price'] ?? 0) <= 0) {
      $stored = is_array($storedByType[$type][$sym] ?? null) ? $storedByType[$type][$sym] : null;
      if (is_array($stored) && (float)($stored['price'] ?? 0) > 0) $cached = $stored;
    }
    $cachedBySymbol[$sym] = $cached;
  }

  $liveBySymbol = [];
  if ($withLive) {
    $liveCandidatesByType = qa_live_candidates_grouped($symbolsByType, $cachedBySymbol, $opts);
    if ($liveCandidatesByType) {
      $liveBySymbol = qa_live_map_grouped($liveCandidatesByType, $metaBySymbol, $opts);
    }
  }

  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;

    $cached = is_array($cachedBySymbol[$sym] ?? null) ? $cachedBySymbol[$sym] : qa_cached_quote_from_market_row($row, $type);
    $live = is_array($liveBySymbol[$sym] ?? null) ? $liveBySymbol[$sym] : null;
    $chosen = qa_choose_authoritative_quote($cached, $live, $type, [
      'allow_crypto_seed' => $allowCryptoSeed,
      'allow_noncrypto_seed' => $allowNonCryptoSeed,
    ]);

    if ($chosen) {
      $price = (float)($chosen['price'] ?? 0);
      $changePct = (float)($chosen['change_pct'] ?? 0);
      $prevClose = (float)($chosen['prev_close'] ?? $chosen['previous_close'] ?? 0);
      $open = (float)($chosen['open'] ?? 0);
      $changeBasis = (string)($chosen['change_basis'] ?? '');
      // WebSocket feeds (TwelveData/Binance) provide a live price but may omit
      // change_pct. Recompute it from prev_close/open when an authoritative
      // daily reference is available.
      if ($price > 0 && abs($changePct) < 0.000001 && $prevClose > 0 && abs($price - $prevClose) > 0.00000001) {
        $changePct = (($price - $prevClose) / $prevClose) * 100.0;
        $changeBasis = $changeBasis !== '' ? $changeBasis : 'prev_close';
      } elseif ($type === 'crypto' && $price > 0 && abs($changePct) < 0.000001 && $open > 0 && abs($price - $open) > 0.00000001) {
        $changePct = (($price - $open) / $open) * 100.0;
        $changeBasis = $changeBasis !== '' ? $changeBasis : 'binance_open_24h';
      }
      $out[$sym] = [
        'price' => $price,
        'change_pct' => $changePct,
        'change_basis' => $changeBasis,
        'open' => $open,
        'updated_at' => (int)($chosen['updated_at'] ?? 0),
        'source' => (string)($chosen['source'] ?? $chosen['provider'] ?? 'unavailable'),
        'is_stale' => false,
        'timing_class' => qa_quote_timing_class($chosen, $type),
      ];
      continue;
    }

    // Market lists should not flash from a real last-known price to 0.00 just
    // because a slow provider missed the current refresh window. Keep the
    // display stable, mark it stale, and let quotes.php remain the stricter
    // live authority for active symbols.
    if ($allowStaleDisplay && is_array($cached)) {
      $cachedPrice = (float)($cached['price'] ?? 0);
      $cachedSource = (string)($cached['source'] ?? $cached['provider'] ?? '');
      $cachedUpdatedAt = qa_quote_row_ts($cached);
      $cachedAge = $cachedUpdatedAt > 0 ? max(0, time() - $cachedUpdatedAt) : 999999;
      $maxStaleAge = $type === 'crypto'
        ? max(30, min(600, (int)env('MARKET_LIST_CRYPTO_STALE_SECONDS', '180')))
        : qa_market_list_stale_seconds($type);
      if (
        $cachedPrice > 0
        && !quote_source_is_untrusted($cachedSource)
        && !(function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($sym, $type, $cachedSource))
        && $cachedAge <= $maxStaleAge
      ) {
        $out[$sym] = [
          'price' => $cachedPrice,
          'change_pct' => (float)($cached['change_pct'] ?? 0),
          'updated_at' => $cachedUpdatedAt,
          'source' => $cachedSource !== '' ? $cachedSource : 'stale_cache',
          'is_stale' => true,
          'timing_class' => 'stale',
        ];
        continue;
      }
    }

    $seed = (float)($row['seed_price'] ?? 0);
    if ($seed > 0 && (($type === 'crypto' && $allowCryptoSeed) || ($type !== 'crypto' && $allowNonCryptoSeed))) {
      $out[$sym] = [
        'price' => $seed,
        'change_pct' => 0.0,
        'updated_at' => time(),
        'source' => 'seed_price',
        'is_stale' => false,
        'timing_class' => 'seed',
      ];
      continue;
    }

    $out[$sym] = [
      'price' => 0.0,
      'change_pct' => 0.0,
      'updated_at' => 0,
      'source' => 'unavailable',
      'is_stale' => true,
      'timing_class' => 'unavailable',
    ];
  }
  return $out;
}

function qa_market_list_stale_seconds(string $assetType): int {
  $assetType = vp_normalize_asset_type($assetType);
  return match ($assetType) {
    'forex' => max(30, min(1800, (int)env('MARKET_LIST_FOREX_STALE_SECONDS', '120'))),
    'commodities', 'futures' => max(60, min(3600, (int)env('MARKET_LIST_MARKET_HOURS_STALE_SECONDS', '300'))),
    'stocks', 'arab' => max(300, min(21600, (int)env('MARKET_LIST_DELAYED_STALE_SECONDS', '900'))),
    default => qa_quote_max_age($assetType, false),
  };
}
