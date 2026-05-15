<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quote_freshness.php';
require_once __DIR__ . '/quote_cache_policy.php';
require_once __DIR__ . '/quote_store.php';
require_once __DIR__ . '/quote_batch.php';

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

  $liveBySymbol = [];
  $allowLive = array_key_exists('allow_live', $opts) ? (bool)$opts['allow_live'] : true;
  if ($allowLive) {
    $liveBySymbol = qa_live_map_grouped($symbolsByType, $metaBySymbol, $opts);
  }

  $cachedBySymbol = qa_quote_rows_by_symbols($symbols, ($typeAlias && $typeAlias !== 'all') ? $typeAlias : null);
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
    $providerUpdatedAt = 0; $timingClass = 'unavailable';
    $delayed = in_array($assetType, ['stocks','arab'], true);
    if ($chosen) {
      $price = (float)($chosen['price'] ?? 0);
      $change = (float)($chosen['change_pct'] ?? 0);
      $updatedAt = qa_quote_row_ts($chosen);
      $providerUpdatedAt = $updatedAt;
      $source = (string)($chosen['source'] ?? $chosen['provider'] ?? '');
      $sourceLower = strtolower(trim($source));
      $delayed = !empty($chosen['delayed']) || in_array($assetType, ['stocks','arab'], true) || ($assetType !== 'crypto' && $sourceLower === 'yahoo');
      $timingClass = qa_quote_timing_class($chosen + ['delayed' => $delayed], $assetType);
    } elseif (!empty($opts['allow_stale_display']) && $assetType !== 'crypto' && is_array($cached)) {
      $cachedPrice = (float)($cached['price'] ?? 0);
      $cachedSource = (string)($cached['source'] ?? $cached['provider'] ?? '');
      if ($cachedPrice > 0 && !quote_source_is_untrusted($cachedSource)) {
        $price = $cachedPrice;
        $change = (float)($cached['change_pct'] ?? 0);
        $updatedAt = qa_quote_row_ts($cached);
        $providerUpdatedAt = $updatedAt;
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

    $items[] = [
      'symbol' => $sym,
      'type' => $assetType,
      'price' => $price,
      'change_pct' => $change,
      'updated_at' => $updatedAt,
      'provider_updated_at' => $providerUpdatedAt,
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

  $liveBySymbol = $withLive ? qa_live_map_grouped($symbolsByType, $metaBySymbol, $opts) : [];
  $out = [];
  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;

    $cached = qa_cached_quote_from_market_row($row, $type);
    if ((float)($cached['price'] ?? 0) <= 0) {
      try {
        $stored = quote_get($sym, $type);
        if (is_array($stored) && (float)($stored['price'] ?? 0) > 0) $cached = $stored;
      } catch (Throwable $ignoredStoredQuote) {}
    }
    $live = is_array($liveBySymbol[$sym] ?? null) ? $liveBySymbol[$sym] : null;
    $chosen = qa_choose_authoritative_quote($cached, $live, $type, [
      'allow_crypto_seed' => $allowCryptoSeed,
      'allow_noncrypto_seed' => $allowNonCryptoSeed,
    ]);

    if ($chosen) {
      $out[$sym] = [
        'price' => (float)($chosen['price'] ?? 0),
        'change_pct' => (float)($chosen['change_pct'] ?? 0),
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
        : qa_quote_max_age($type, false);
      if ($cachedPrice > 0 && !quote_source_is_untrusted($cachedSource) && $cachedAge <= $maxStaleAge) {
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
