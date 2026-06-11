<?php
require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quote_store.php';

if (!function_exists('vp_pricecore_cache_dir')) {
  function vp_pricecore_cache_dir(): string {
    $dir = dirname(__DIR__) . '/data/cache';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    return $dir;
  }
}

if (!function_exists('vp_pricecore_symbols_from_raw')) {
  function vp_pricecore_symbols_from_raw(string $symbolsRaw): array {
    $out = [];
    foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $s) {
      $s = strtoupper(trim((string)$s));
      if ($s !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $s)) $out[] = $s;
    }
    return array_values(array_unique($out));
  }
}

if (!function_exists('vp_pricecore_cache_ttl')) {
  function vp_pricecore_cache_ttl(string $assetType, int $count, string $route, bool $forceLive = false): int {
    $assetType = vp_normalize_asset_type($assetType);
    if ($forceLive && $count <= 1) return 0;
    if ($assetType === 'crypto') return ($count <= 1 ? 1 : 1);
    if ($route === 'trade_stream' && $count <= 4) return 1;
    if ($assetType === 'forex') return ($count <= 2 ? 1 : 2);
    if ($assetType === 'commodities') return ($count <= 2 ? 1 : 2);
    if ($assetType === 'futures') return ($count <= 2 ? 1 : 2);
    if (in_array($assetType, ['stocks','arab'], true)) return ($count <= 2 ? 2 : 3);
    return 2;
  }
}

if (!function_exists('vp_pricecore_cache_key')) {
  function vp_pricecore_cache_key(array $symbols, string $type, string $market, string $route, array $opts = []): string {
    $norm = array_values(array_unique(array_map('strtoupper', $symbols)));
    sort($norm);
    $shape = [
      'route' => $route,
      'type' => vp_normalize_asset_type($type),
      'market' => strtolower(trim($market ?: 'spot')),
      'symbols' => $norm,
      'visible' => !empty($opts['visible']) ? 1 : 0,
      'force_live' => !empty($opts['force_live']) ? 1 : 0,
      'prefer_live' => !empty($opts['prefer_live']) ? 1 : 0,
    ];
    return sha1(json_encode($shape, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  }
}

if (!function_exists('vp_pricecore_cache_read')) {
  function vp_pricecore_cache_read(string $key, int $ttl): ?array {
    if ($ttl <= 0) return null;
    $file = vp_pricecore_cache_dir() . '/pricecore_' . $key . '.json';
    if (!is_file($file)) return null;
    $age = time() - (int)@filemtime($file);
    if ($age < 0 || $age > $ttl) return null;
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return null;
    $decoded = json_decode((string)$raw, true);
    return is_array($decoded) ? $decoded : null;
  }
}

if (!function_exists('vp_pricecore_cache_write')) {
  function vp_pricecore_cache_write(string $key, array $payload): void {
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) return;
    $file = vp_pricecore_cache_dir() . '/pricecore_' . $key . '.json';
    @file_put_contents($file, $json, LOCK_EX);
  }
}

if (!function_exists('vp_pricecore_singleflight_lock')) {
  function vp_pricecore_singleflight_lock(string $key, int $ttl = 3): bool {
    $lockFile = vp_pricecore_cache_dir() . '/pricecore_lock_' . $key . '.lock';
    $now = time();
    if (is_file($lockFile)) {
      $age = $now - (int)@filemtime($lockFile);
      if ($age >= 0 && $age <= $ttl) return false;
    }
    @file_put_contents($lockFile, (string)$now, LOCK_EX);
    return true;
  }
}

if (!function_exists('vp_pricecore_singleflight_unlock')) {
  function vp_pricecore_singleflight_unlock(string $key): void {
    $lockFile = vp_pricecore_cache_dir() . '/pricecore_lock_' . $key . '.lock';
    if (is_file($lockFile)) @unlink($lockFile);
  }
}

if (!function_exists('vp_pricecore_row_usable')) {
  function vp_pricecore_row_usable($row, string $assetType, string $mode = 'warm'): bool {
    if (!is_array($row)) return false;
    $assetType = vp_normalize_asset_type($assetType);
    $price = (float)($row['price'] ?? 0);
    if (!($price > 0)) return false;
    if ($assetType === 'crypto') return true;
    $src = strtolower(trim((string)($row['source'] ?? '')));
    if (!quote_source_is_liveish($src, $assetType)) return false;
    $updatedAt = (int)($row['updated_at'] ?? 0);
    if ($updatedAt <= 0) return false;
    $age = max(0, time() - $updatedAt);
    $warmMax = 8;
    $staleMax = 16;
    if ($assetType === 'forex') { $warmMax = 4; $staleMax = 8; }
    elseif ($assetType === 'commodities') { $warmMax = 3; $staleMax = 7; }
    elseif ($assetType === 'futures') { $warmMax = 4; $staleMax = 9; }
    elseif (in_array($assetType, ['stocks','arab'], true)) { $warmMax = 10; $staleMax = 20; }
    $maxAge = ($mode === 'stale') ? $staleMax : $warmMax;
    return $age <= $maxAge;
  }
}

if (!function_exists('vp_pricecore_market_rows')) {
  function vp_pricecore_market_rows(array $symbols): array {
    $symbols = array_values(array_unique(array_filter($symbols)));
    if (!$symbols) return [];
    try {
      $rows = function_exists('qa_market_meta_by_symbols') ? qa_market_meta_by_symbols($symbols) : [];
      $out = [];
      foreach ($rows as $row) {
        $sym = strtoupper((string)($row['symbol'] ?? ''));
        if ($sym === '') continue;
        $out[$sym] = [
          'symbol' => $sym,
          'type' => vp_normalize_asset_type((string)($row['type'] ?? 'crypto')),
          'seed_price' => (float)($row['seed_price'] ?? 0),
          'meta' => market_meta($row['meta'] ?? null),
        ];
      }
      return $out;
    } catch (Throwable $e) {
      return [];
    }
  }
}

if (!function_exists('vp_pricecore_context_map')) {
  function vp_pricecore_context_map(array $symbols, string $typeHint = '', string $marketHint = 'spot'): array {
    $markets = vp_pricecore_market_rows($symbols);
    $contexts = [];
    foreach ($symbols as $sym) {
      $marketRow = $markets[$sym] ?? null;
      $rawType = (string)($marketRow['type'] ?? $typeHint ?: 'crypto');
      $meta = is_array($marketRow['meta'] ?? null) ? $marketRow['meta'] : [];
      $ctx = vp_market_context($sym, $rawType, $marketHint, $meta);
      $ctx['return_type'] = vp_normalize_asset_type($rawType);
      $ctx['meta'] = $meta;
      $ctx['seed_price'] = (float)($marketRow['seed_price'] ?? 0);
      $contexts[$sym] = $ctx;
    }
    return $contexts;
  }
}

if (!function_exists('vp_pricecore_prefetch_group')) {
  function vp_pricecore_prefetch_group(array $symbols, string $assetType, array $metaBySymbol, array $opts = []): array {
    if (!$symbols) return [];
    $assetType = vp_normalize_asset_type($assetType);
    $count = count($symbols);
    $route = (string)($opts['route'] ?? 'quotes');
    $preferLive = !empty($opts['prefer_live']);
    $visible = !empty($opts['visible']);
    $directBudget = 0;
    $chartBudget = 0;
    if ($assetType === 'crypto') {
      $directBudget = ($count <= 1) ? 1 : 0;
      $chartBudget = 0;
    } elseif ($count === 1) {
      $directBudget = 1;
      $chartBudget = in_array($assetType, ['forex','commodities'], true) ? 1 : 0;
    } elseif ($count <= 4 && ($preferLive || $visible || $route === 'trade_stream')) {
      if (in_array($assetType, ['forex','commodities'], true)) {
        $directBudget = min(4, $count);
        $chartBudget = min(2, $count);
      } elseif (in_array($assetType, ['futures','stocks','arab'], true)) {
        $directBudget = min(2, $count);
        $chartBudget = 1;
      }
    }
    try {
      return quote_bulk_live($symbols, $assetType, $metaBySymbol, [
        'ttl' => 1,
        'yahoo_ttl' => 1,
        'massive_ttl' => 1,
        'eodhd_ttl' => 1,
        'direct_budget' => $directBudget,
        'direct_yahoo_budget' => $directBudget,
        'chart_budget' => $chartBudget,
        'allow_direct_batch' => ($count <= 4 && ($visible || $preferLive)),
        'eodhd_batch_budget' => ($count <= 2 ? 2 : 1),
      ]);
    } catch (Throwable $e) {
      return [];
    }
  }
}

if (!function_exists('vp_pricecore_fetch_rows')) {
  function vp_pricecore_fetch_rows(array $symbols, string $typeHint = '', string $marketHint = 'spot', array $opts = []): array {
    $symbols = array_values(array_unique(array_filter(array_map(static function($s){
      $s = strtoupper(trim((string)$s));
      return ($s !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $s)) ? $s : '';
    }, $symbols))));
    if (!$symbols) return [];

    $route = (string)($opts['route'] ?? 'quotes');
    $forceLive = !empty($opts['force_live']);
    $preferLive = !empty($opts['prefer_live']) || $forceLive;
    $allowWarmFallback = array_key_exists('allow_warm_fallback', $opts) ? (bool)$opts['allow_warm_fallback'] : true;

    $contexts = vp_pricecore_context_map($symbols, $typeHint, $marketHint);
    $groups = [];
    foreach ($symbols as $sym) {
      $ctx = $contexts[$sym] ?? [
        'provider_type' => vp_provider_asset_type($typeHint ?: 'crypto', $marketHint),
        'return_type' => vp_normalize_asset_type($typeHint ?: 'crypto'),
        'meta' => [],
        'seed_price' => 0.0,
        'effective_market' => $marketHint ?: 'spot',
      ];
      $groupKey = (string)($ctx['provider_type'] ?? 'crypto');
      if (!isset($groups[$groupKey])) $groups[$groupKey] = ['symbols' => [], 'meta' => []];
      $groups[$groupKey]['symbols'][] = $sym;
      $groups[$groupKey]['meta'][$sym] = is_array($ctx['meta'] ?? null) ? $ctx['meta'] : [];
    }

    $out = [];
    foreach ($groups as $groupType => $group) {
      $groupSymbols = array_values(array_unique($group['symbols'] ?? []));
      if (!$groupSymbols) continue;
      $liveMap = vp_pricecore_prefetch_group($groupSymbols, $groupType, $group['meta'] ?? [], [
        'route' => $route,
        'prefer_live' => $preferLive,
        'visible' => !empty($opts['visible']),
      ]);

      foreach ($groupSymbols as $sym) {
        $ctx = $contexts[$sym] ?? null;
        $returnType = (string)($ctx['return_type'] ?? $groupType);
        $effectiveMarket = (string)($ctx['effective_market'] ?? 'spot');
        $warmRow = null;
        try { $warmRow = quote_get($sym, $returnType); } catch (Throwable $e) { $warmRow = null; }

        $row = is_array($liveMap[$sym] ?? null) ? $liveMap[$sym] : null;
        if (is_array($row) && (float)($row['price'] ?? 0) > 0) {
          $row['type'] = $returnType;
          $row['updated_at'] = (int)($row['updated_at'] ?? time()) ?: time();
          $row['source'] = (string)($row['source'] ?? 'provider_live');
          if ($returnType !== 'crypto' && quote_source_is_liveish((string)$row['source'], $returnType)) {
            try { quote_upsert_from_read_path($sym, $returnType, (float)$row['price'], (float)($row['change_pct'] ?? 0.0), (int)$row['updated_at'], ['source' => (string)$row['source']]); } catch (Throwable $e) {}
          }
        } else {
          $row = null;
        }

        if (!$row && ($forceLive || ($preferLive && count($groupSymbols) <= 2))) {
          try {
            $p = (float)quote_price_fresh($sym, $returnType);
            $freshRow = quote_get($sym, $returnType);
            if ($p > 0 || is_array($freshRow)) {
              $row = [
                'symbol' => $sym,
                'type' => $returnType,
                'price' => $p > 0 ? $p : (float)($freshRow['price'] ?? 0),
                'change_pct' => (float)($freshRow['change_pct'] ?? 0.0),
                'updated_at' => (int)($freshRow['updated_at'] ?? time()) ?: time(),
                'source' => (string)($freshRow['source'] ?? 'provider_live'),
              ];
            }
          } catch (Throwable $e) {
            $row = null;
          }
        }

        if (!$row && $allowWarmFallback && vp_pricecore_row_usable($warmRow, $returnType, count($groupSymbols) > 6 ? 'stale' : 'warm')) {
          $row = [
            'symbol' => $sym,
            'type' => $returnType,
            'price' => (float)($warmRow['price'] ?? 0),
            'change_pct' => (float)($warmRow['change_pct'] ?? 0.0),
            'updated_at' => (int)($warmRow['updated_at'] ?? 0),
            'source' => (string)($warmRow['source'] ?? 'cache'),
          ];
        }

        if (!$row && $returnType === 'crypto' && is_array($warmRow) && (float)($warmRow['price'] ?? 0) > 0) {
          $row = [
            'symbol' => $sym,
            'type' => $returnType,
            'price' => (float)($warmRow['price'] ?? 0),
            'change_pct' => (float)($warmRow['change_pct'] ?? 0.0),
            'updated_at' => (int)($warmRow['updated_at'] ?? 0),
            'source' => (string)($warmRow['source'] ?? 'cache'),
          ];
        }

        if (!$row) {
          $row = [
            'symbol' => $sym,
            'type' => $returnType,
            'price' => 0.0,
            'change_pct' => 0.0,
            'updated_at' => 0,
            'source' => 'unavailable',
          ];
        }

        $row['symbol'] = $sym;
        $row['type'] = $returnType;
        if ($effectiveMarket === 'perp' && $returnType === 'crypto') {
          $row['mark_price'] = (float)($row['price'] ?? 0);
        }
        $out[$sym] = $row;
      }
    }

    $ordered = [];
    foreach ($symbols as $sym) {
      if (isset($out[$sym])) $ordered[$sym] = $out[$sym];
    }
    return $ordered;
  }
}
