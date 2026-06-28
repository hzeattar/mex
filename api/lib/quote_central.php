<?php
declare(strict_types=1);

/**
 * Quote Central — Single Source of Truth for price reads.
 *
 * This layer NEVER hits upstream providers. It only reads/writes
 * a shared cache that is populated exclusively by the
 * prices_feed_worker.php process.
 *
 * Storage priority:
 *   1. DB table `central_quotes` (shared across Railway services via MySQL)
 *   2. File-based cache in data/central/ (fast local reads, single-process only)
 *
 * All user-facing endpoints (SSE, quotes.php, trade/stream.php, etc.)
 * MUST read from here instead of calling quote_bulk_live() directly.
 */

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/redis.php';

function quote_central_source_disabled(string $source): bool {
  $src = strtolower(trim($source));
  if ($src === '') return false;
  if (in_array($src, ['seed','seed_price','seed_fallback','seed_default','chart_seed','seed_candle','synthetic','synthetic_seed_fast','synthetic_error_fallback','aggs','cache','stale_cache','unavailable'], true)) {
    return true;
  }
  if (in_array($src, ['yahoo','yahoo_rest','yahoo_chart','yahoo_chart_live','yahoo_crypto_chart'], true)) {
    return (int)env('YAHOO_ENABLED', '0') !== 1
      && (int)env('ALLOW_YAHOO_PROVIDER', '0') !== 1
      && (int)env('YAHOO_FALLBACK_ENABLED', '0') !== 1;
  }
  if (in_array($src, ['eodhd','eodhd_rest','eodhd_intraday','eodhd_cache'], true)) {
    return (int)env('EODHD_ENABLED', '0') !== 1;
  }
  if (in_array($src, ['polygon','massive','polygon_ticker','massive_ticker'], true)) {
    return (int)env('ENABLE_MASSIVE_FALLBACK', '0') !== 1
      && (int)env('POLYGON_ENABLED', '0') !== 1
      && strtolower(trim((string)env('PRICE_PROVIDER', 'twelvedata'))) !== 'massive';
  }
  if ($src === 'currencyfreaks') {
    return (int)env('CURRENCYFREAKS_ENABLED', '0') !== 1;
  }
  return false;
}

function quote_central_row_usable($data): bool {
  if (!is_array($data)) return false;
  if (!((float)($data['price'] ?? 0) > 0)) return false;
  return !quote_central_source_disabled((string)($data['source'] ?? ''));
}

// ── DB-backed central cache (shared across containers) ──────────────────────

function quote_central_ensure_table(): void {
  static $ensured = false;
  if ($ensured) return;
  $ensured = true;
  $pdo = db();
  $driver = db_driver();
  if ($driver === 'mysql') {
    $pdo->exec("CREATE TABLE IF NOT EXISTS central_quotes (
      symbol VARCHAR(30) NOT NULL,
      type VARCHAR(20) NOT NULL,
      price DOUBLE NOT NULL DEFAULT 0,
      change_pct DOUBLE NOT NULL DEFAULT 0,
      source VARCHAR(60) NOT NULL DEFAULT '',
      central_ts INT UNSIGNED NOT NULL DEFAULT 0,
      updated_at INT UNSIGNED NOT NULL DEFAULT 0,
      payload JSON DEFAULT NULL,
      PRIMARY KEY (symbol, type),
      INDEX idx_central_ts (central_ts),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } else {
    $pdo->exec("CREATE TABLE IF NOT EXISTS central_quotes (
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      change_pct REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      central_ts INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      payload TEXT DEFAULT NULL,
      PRIMARY KEY (symbol, type)
    )");
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_central_ts ON central_quotes(central_ts)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_type ON central_quotes(type)"); } catch (Throwable $e) {}
  }
}

function quote_central_ensure_manifest_table(): void {
  static $ensured = false;
  if ($ensured) return;
  $ensured = true;
  $pdo = db();
  $driver = db_driver();
  if ($driver === 'mysql') {
    $pdo->exec("CREATE TABLE IF NOT EXISTS central_manifest (
      id INT UNSIGNED NOT NULL DEFAULT 1,
      payload JSON DEFAULT NULL,
      updated_at INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } else {
    $pdo->exec("CREATE TABLE IF NOT EXISTS central_manifest (
      id INTEGER NOT NULL DEFAULT 1,
      payload TEXT DEFAULT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id)
    )");
  }
}

// ── File-based cache (local per-container) ──────────────────────────────────

function quote_central_dir(): string {
  static $dir = null;
  if ($dir !== null) return $dir;
  $dir = dirname(__DIR__) . '/data/central';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);
  return $dir;
}

function quote_central_file(string $symbol, string $type): string {
  return quote_central_dir() . '/' . strtolower(vp_normalize_asset_type($type)) . '_' . strtoupper(trim($symbol)) . '.json';
}

function quote_central_bundle_file(string $type): string {
  return quote_central_dir() . '/bundle_' . strtolower(vp_normalize_asset_type($type)) . '.json';
}

// ── Read functions (try file first, then DB) ────────────────────────────────

function quote_central_get(string $symbol, string $type, int $maxAge = 30): ?array {
  $symbol = strtoupper(trim($symbol));
  $type = vp_normalize_asset_type($type);

  // Try file cache first (fastest)
  $file = quote_central_file($symbol, $type);
  if (is_file($file)) {
    $raw = @file_get_contents($file);
    if ($raw !== false && $raw !== '') {
      $data = json_decode($raw, true);
      if (quote_central_row_usable($data)) {
        if ($maxAge <= 0) return $data;
        $providerTs = (int)($data['updated_at'] ?? $data['provider_ts'] ?? 0);
        $centralTs = (int)($data['central_ts'] ?? $providerTs);
        $effectiveTs = max($providerTs, $centralTs);
        if ($effectiveTs > 0 && (time() - $effectiveTs) <= $maxAge) return $data;
      }
    }
  }

  // Fallback to DB (shared across containers)
  try {
    quote_central_ensure_table();
    $pdo = db();
    $st = $pdo->prepare("SELECT payload FROM central_quotes WHERE symbol = ? AND type = ?");
    $st->execute([$symbol, $type]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    $payload = $row['payload'] ?? null;
    if (!$payload) return null;
    $data = json_decode($payload, true);
    if (!quote_central_row_usable($data)) return null;
    if ($maxAge > 0) {
      $ts = (int)($data['central_ts'] ?? $data['updated_at'] ?? 0);
      if ($ts > 0 && (time() - $ts) > $maxAge) return null;
    }
    // Warm the local file cache from DB
    quote_central_write_file($symbol, $type, $data);
    return $data;
  } catch (Throwable $e) {
    return null;
  }
}

function quote_central_get_many(array $symbols, string $type, int $maxAge = 30): array {
  $out = [];
  $type = vp_normalize_asset_type($type);
  $missing = [];

  // Try file cache first
  foreach ($symbols as $sym) {
    $sym = strtoupper(trim((string)$sym));
    if ($sym === '') continue;
    $file = quote_central_file($sym, $type);
    if (is_file($file)) {
      $raw = @file_get_contents($file);
      if ($raw !== false && $raw !== '') {
        $data = json_decode($raw, true);
        if (quote_central_row_usable($data)) {
          if ($maxAge <= 0) { $out[$sym] = $data; continue; }
          $providerTs = (int)($data['updated_at'] ?? $data['provider_ts'] ?? 0);
          $centralTs = (int)($data['central_ts'] ?? $providerTs);
          $effectiveTs = max($providerTs, $centralTs);
          if ($effectiveTs > 0 && (time() - $effectiveTs) <= $maxAge) { $out[$sym] = $data; continue; }
        }
      }
    }
    $missing[] = $sym;
  }

  // Fetch missing from DB
  if ($missing) {
    try {
      quote_central_ensure_table();
      $pdo = db();
      $in = implode(',', array_fill(0, count($missing), '?'));
      $st = $pdo->prepare("SELECT symbol, payload FROM central_quotes WHERE symbol IN ($in) AND type = ?");
      $params = array_merge($missing, [$type]);
      $st->execute($params);
      while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
        $payload = $row['payload'] ?? null;
        if (!$sym || !$payload) continue;
        $data = json_decode($payload, true);
        if (!quote_central_row_usable($data)) continue;
        if ($maxAge > 0) {
          $providerTs = (int)($data['updated_at'] ?? $data['provider_ts'] ?? 0);
          $centralTs = (int)($data['central_ts'] ?? $providerTs);
          $effectiveTs = max($providerTs, $centralTs);
          if ($effectiveTs > 0 && (time() - $effectiveTs) > $maxAge) continue;
        }
        // Do not return rows whose source has been disabled by configuration.
        if (function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($data['source'] ?? $data['provider'] ?? '')) continue;
        $out[$sym] = $data;
        // Warm file cache
        quote_central_write_file($sym, $type, $data);
      }
    } catch (Throwable $e) {}
  }

  return $out;
}

function quote_central_bundle_read(string $type, int $maxAge = 30): array {
  // Fast path: check file-based bundle cache first (avoids DB query per request)
  $bundleCacheDir = __DIR__ . '/../data/cache/central_bundle';
  if (!is_dir($bundleCacheDir)) @mkdir($bundleCacheDir, 0777, true);
  $bundleCacheFile = $bundleCacheDir . '/' . strtolower($type) . '.json';
  if (is_file($bundleCacheFile)) {
    $age = time() - (int)@filemtime($bundleCacheFile);
    if ($age <= $maxAge) {
      $raw = @file_get_contents($bundleCacheFile);
      if ($raw !== false) {
        $cached = json_decode($raw, true);
        if (is_array($cached) && count($cached) > 0) {
          // Filter stale or disabled-source rows out of the file cache, otherwise
          // file can shadow fresh DB writes indefinitely.
          $filtered = [];
          foreach ($cached as $sym => $data) {
            if (!quote_central_row_usable($data)) continue;
            if ($maxAge > 0) {
              $providerTs = (int)($data['updated_at'] ?? $data['provider_ts'] ?? 0);
              $centralTs = (int)($data['central_ts'] ?? $providerTs);
              $effectiveTs = max($providerTs, $centralTs);
              if ($effectiveTs > 0 && (time() - $effectiveTs) > $maxAge) continue;
            }
            if (function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($data['source'] ?? $data['provider'] ?? '')) continue;
            $filtered[$sym] = $data;
          }
          if (count($filtered) > 0) return $filtered;
        }
      }
    }
  }

  // DB fallback
  try {
    quote_central_ensure_table();
    $pdo = db();
    $st = $pdo->prepare("SELECT symbol, payload FROM central_quotes WHERE type = ?");
    $st->execute([$type]);
    $out = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
      $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
      $payload = $row['payload'] ?? null;
      if (!$sym || !$payload) continue;
      $data = json_decode($payload, true);
      if (!quote_central_row_usable($data)) continue;
      if ($maxAge > 0) {
        $providerTs = (int)($data['updated_at'] ?? $data['provider_ts'] ?? 0);
        $centralTs = (int)($data['central_ts'] ?? $providerTs);
        $effectiveTs = max($providerTs, $centralTs);
        if ($effectiveTs > 0 && (time() - $effectiveTs) > $maxAge) continue;
      }
      // Drop disabled-source rows from bundles
      if (function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($data['source'] ?? $data['provider'] ?? '')) continue;
      $out[$sym] = $data;
    }
    // Write to file cache for subsequent reads
    if (count($out) > 0) {
      @file_put_contents($bundleCacheFile, json_encode($out), LOCK_EX);
    }
    return $out;
  } catch (Throwable $e) {
    return [];
  }
}

// ── Write functions (write to both file AND DB) ─────────────────────────────

function quote_central_write_file(string $symbol, string $type, array $data): void {
  if (!quote_central_row_usable($data)) return;
  $file = quote_central_file($symbol, $type);
  $data['symbol'] = strtoupper(trim($symbol));
  $data['type'] = vp_normalize_asset_type($type);
  if (empty($data['central_ts'])) $data['central_ts'] = time();
  $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);
}

function quote_central_write(string $symbol, string $type, array $data): void {
  $symbol = strtoupper(trim($symbol));
  $type = vp_normalize_asset_type($type);
  $data['symbol'] = $symbol;
  $data['type'] = $type;
  if (empty($data['central_ts'])) $data['central_ts'] = time();
  if (!quote_central_row_usable($data)) return;

  // Compute change_pct from prev_close if it wasn't provided by the upstream feed.
  $price = (float)($data['price'] ?? 0);
  $prevClose = (float)($data['prev_close'] ?? $data['previous_close'] ?? 0);
  $changePct = (float)($data['change_pct'] ?? 0);
  if ($price > 0 && $prevClose > 0 && abs($changePct) < 0.000001) {
    $changePct = (($price - $prevClose) / $prevClose) * 100.0;
    $data['change_pct'] = $changePct;
  }

  // Write to file cache
  quote_central_write_file($symbol, $type, $data);

  // Write to Redis (fast shared + pub/sub)
  try {
    redis_set_quote($data, 300);
    redis_publish_quote($data);
  } catch (Throwable $e) {}

  // Write to DB (shared across containers)
  try {
    quote_central_ensure_table();
    $pdo = db();
    $payload = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $st = $pdo->prepare("INSERT INTO central_quotes (symbol, type, price, change_pct, source, central_ts, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE price=VALUES(price), change_pct=VALUES(change_pct), source=VALUES(source),
        central_ts=VALUES(central_ts), updated_at=VALUES(updated_at), payload=VALUES(payload)");
    $st->execute([
      $symbol, $type,
      (float)($data['price'] ?? 0),
      (float)($data['change_pct'] ?? 0),
      (string)($data['source'] ?? ''),
      (int)($data['central_ts'] ?? time()),
      (int)($data['updated_at'] ?? time()),
      $payload,
    ]);
  } catch (Throwable $e) {}
}

function quote_central_bundle_write(string $type, array $bySymbol): void {
  $type = vp_normalize_asset_type($type);
  $filtered = [];
  foreach ($bySymbol as $symbol => $row) {
    if (quote_central_row_usable($row)) $filtered[$symbol] = $row;
  }
  $bySymbol = $filtered;
  // Write bundle file
  $file = quote_central_bundle_file($type);
  $json = json_encode($bySymbol, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);
  // Individual writes already handle DB via quote_central_write
}

function quote_central_manifest_write(array $meta): void {
  $now = time();
  $existing = quote_central_manifest_read();
  if (!is_array($existing)) $existing = [];

  $incomingTypeCounts = is_array($meta['type_counts'] ?? null) ? $meta['type_counts'] : [];
  $merged = array_merge($existing, $meta);
  if ($incomingTypeCounts) {
    $typeCounts = is_array($existing['type_counts'] ?? null) ? $existing['type_counts'] : [];
    $typeUpdatedAt = is_array($existing['type_updated_at'] ?? null) ? $existing['type_updated_at'] : [];
    foreach ($incomingTypeCounts as $type => $count) {
      $type = vp_normalize_asset_type((string)$type);
      if ($type === '') continue;
      $typeCounts[$type] = (int)$count;
      $typeUpdatedAt[$type] = $now;
    }
    $merged['type_counts'] = $typeCounts;
    $merged['type_updated_at'] = $typeUpdatedAt;
  }
  $merged['updated_at'] = $now;
  $meta = $merged;

  // Write to file
  $file = quote_central_dir() . '/_manifest.json';
  $json = json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);

  // Write to DB
  try {
    quote_central_ensure_manifest_table();
    $pdo = db();
    $payload = json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $st = $pdo->prepare("INSERT INTO central_manifest (id, payload, updated_at) VALUES (1, ?, ?)
      ON DUPLICATE KEY UPDATE payload=VALUES(payload), updated_at=VALUES(updated_at)");
    $st->execute([$payload, time()]);
  } catch (Throwable $e) {}
}

function quote_central_manifest_read(): array {
  // Try DB first (shared)
  try {
    quote_central_ensure_manifest_table();
    $pdo = db();
    $st = $pdo->query("SELECT payload FROM central_manifest WHERE id = 1");
    $row = $st ? $st->fetch(PDO::FETCH_ASSOC) : null;
    if ($row && $row['payload']) {
      $data = json_decode($row['payload'], true);
      if (is_array($data)) return $data;
    }
  } catch (Throwable $e) {}

  // Fallback to file
  $file = quote_central_dir() . '/_manifest.json';
  if (is_file($file)) {
    $raw = @file_get_contents($file);
    if ($raw !== false) {
      $data = json_decode($raw, true);
      if (is_array($data)) return $data;
    }
  }
  return [];
}

function quote_central_is_warm(string $type = ''): bool {
  $manifest = quote_central_manifest_read();
  $lastRun = (int)($manifest['updated_at'] ?? 0);
  $now = time();
  if ($lastRun <= 0 || ($now - $lastRun) > 120) return false;
  if ($type !== '') {
    $typeCounts = $manifest['type_counts'] ?? [];
    $typeUpdatedAt = $manifest['type_updated_at'] ?? [];
    $type = strtolower(vp_normalize_asset_type($type));
    $count = (int)($typeCounts[$type] ?? 0);
    $typeTs = (int)($typeUpdatedAt[$type] ?? $lastRun);
    return $count > 0 && $typeTs > 0 && ($now - $typeTs) <= 120;
  }
  $typeUpdatedAt = is_array($manifest['type_updated_at'] ?? null) ? $manifest['type_updated_at'] : [];
  if ($typeUpdatedAt) {
    foreach ($typeUpdatedAt as $ts) {
      $ts = (int)$ts;
      if ($ts > 0 && ($now - $ts) <= 120) return true;
    }
    return false;
  }
  return true;
}

function quote_central_items(array $symbols, string $type, int $maxAge = 30): array {
  $type = vp_normalize_asset_type($type);
  $central = quote_central_get_many($symbols, $type, $maxAge);
  $items = [];
  foreach ($symbols as $sym) {
    $sym = strtoupper(trim((string)$sym));
    $row = $central[$sym] ?? null;
    if (quote_central_row_usable($row)) {
      $src = strtolower(trim((string)($row['source'] ?? '')));
      $delayed = in_array($type, ['stocks', 'arab'], true) || ($type !== 'crypto' && str_starts_with($src, 'yahoo'));
      $items[] = [
        'symbol' => $sym,
        'type' => $type,
        'price' => (float)$row['price'],
        'change_pct' => (float)($row['change_pct'] ?? 0),
        'open' => (float)($row['open'] ?? 0),
        'prev_close' => (float)($row['prev_close'] ?? 0),
        'updated_at' => (int)($row['central_ts'] ?? $row['updated_at'] ?? 0),
        'provider_updated_at' => (int)($row['updated_at'] ?? 0),
        'received_at' => (int)($row['received_at'] ?? 0),
        'ingested_at' => (int)($row['ingested_at'] ?? 0),
        'cache_updated_at' => (int)($row['central_ts'] ?? 0),
        'source' => (string)($row['source'] ?? 'central'),
        'delayed' => $delayed,
        'timing_class' => $delayed ? 'delayed' : 'live',
        'age_sec' => max(0, time() - (int)($row['central_ts'] ?? $row['updated_at'] ?? 0)),
      ];
    } else {
      $items[] = [
        'symbol' => $sym,
        'type' => $type,
        'price' => 0.0,
        'change_pct' => 0.0,
        'updated_at' => 0,
        'provider_updated_at' => 0,
        'received_at' => 0,
        'ingested_at' => 0,
        'cache_updated_at' => 0,
        'source' => 'unavailable',
        'delayed' => false,
        'timing_class' => 'unavailable',
        'age_sec' => null,
      ];
    }
  }
  return $items;
}
