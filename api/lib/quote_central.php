<?php
declare(strict_types=1);

/**
 * Quote Central — Single Source of Truth for price reads.
 *
 * This layer NEVER hits upstream providers. It only reads/writes
 * a local shared cache that is populated exclusively by the
 * prices_feed_worker.php process.
 *
 * All user-facing endpoints (SSE, quotes.php, trade/stream.php, etc.)
 * MUST read from here instead of calling quote_bulk_live() directly.
 */

require_once __DIR__ . '/common.php';

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

function quote_central_manifest_file(): string {
  return quote_central_dir() . '/_manifest.json';
}

/**
 * Read a single symbol's latest price from central cache.
 * Returns null if not found or stale beyond $maxAge seconds.
 */
function quote_central_get(string $symbol, string $type, int $maxAge = 30): ?array {
  $file = quote_central_file($symbol, $type);
  if (!is_file($file)) return null;
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return null;
  $data = json_decode($raw, true);
  if (!is_array($data)) return null;
  $price = (float)($data['price'] ?? 0);
  if (!($price > 0)) return null;
  if ($maxAge > 0) {
    $ts = (int)($data['central_ts'] ?? $data['updated_at'] ?? 0);
    if ($ts > 0 && (time() - $ts) > $maxAge) return null;
  }
  return $data;
}

/**
 * Read multiple symbols from central cache.
 * Returns [symbol => data, ...] for found symbols only.
 */
function quote_central_get_many(array $symbols, string $type, int $maxAge = 30): array {
  $out = [];
  $type = vp_normalize_asset_type($type);
  foreach ($symbols as $sym) {
    $sym = strtoupper(trim((string)$sym));
    if ($sym === '') continue;
    $row = quote_central_get($sym, $type, $maxAge);
    if ($row !== null) $out[$sym] = $row;
  }
  return $out;
}

/**
 * Read all prices for a given asset type from the bundle file.
 * Bundle files are written by the worker for bulk reads (SSE, snapshots).
 */
function quote_central_bundle_read(string $type, int $maxAge = 30): array {
  $file = quote_central_bundle_file($type);
  if (!is_file($file)) return [];
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) return [];
  $out = [];
  foreach ($data as $sym => $row) {
    if (!is_array($row)) continue;
    $price = (float)($row['price'] ?? 0);
    if (!($price > 0)) continue;
    if ($maxAge > 0) {
      $ts = (int)($row['central_ts'] ?? $row['updated_at'] ?? 0);
      if ($ts > 0 && (time() - $ts) > $maxAge) continue;
    }
    $out[$sym] = $row;
  }
  return $out;
}

/**
 * Write a single symbol's price to central cache.
 * Called only by the feed worker.
 */
function quote_central_write(string $symbol, string $type, array $data): void {
  $file = quote_central_file($symbol, $type);
  $data['symbol'] = strtoupper(trim($symbol));
  $data['type'] = vp_normalize_asset_type($type);
  if (empty($data['central_ts'])) $data['central_ts'] = time();
  $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);
}

/**
 * Write a bundle (all symbols for a type) to central cache.
 * Called only by the feed worker after each cycle.
 */
function quote_central_bundle_write(string $type, array $bySymbol): void {
  $file = quote_central_bundle_file($type);
  $json = json_encode($bySymbol, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);
}

/**
 * Write the manifest (metadata about what's in the cache).
 * Called only by the feed worker.
 */
function quote_central_manifest_write(array $meta): void {
  $file = quote_central_manifest_file();
  $meta['updated_at'] = time();
  $json = json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($file, $json, LOCK_EX);
}

/**
 * Read the manifest.
 */
function quote_central_manifest_read(): array {
  $file = quote_central_manifest_file();
  if (!is_file($file)) return [];
  $raw = @file_get_contents($file);
  if ($raw === false) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

/**
 * Check if the central cache is warm enough to serve as the primary source.
 * Returns true if the manifest shows a recent successful worker cycle.
 */
function quote_central_is_warm(string $type = ''): bool {
  $manifest = quote_central_manifest_read();
  $lastRun = (int)($manifest['updated_at'] ?? 0);
  if ($lastRun <= 0 || (time() - $lastRun) > 120) return false;
  if ($type !== '') {
    $typeCounts = $manifest['type_counts'] ?? [];
    $type = strtolower(vp_normalize_asset_type($type));
    $count = (int)($typeCounts[$type] ?? 0);
    return $count > 0;
  }
  return true;
}

/**
 * Build a quote_authority-compatible items array from central cache.
 * This allows drop-in replacement in SSE, quotes.php, etc.
 */
function quote_central_items(array $symbols, string $type, int $maxAge = 30): array {
  $type = vp_normalize_asset_type($type);
  $central = quote_central_get_many($symbols, $type, $maxAge);
  $items = [];
  foreach ($symbols as $sym) {
    $sym = strtoupper(trim((string)$sym));
    $row = $central[$sym] ?? null;
    if ($row && (float)($row['price'] ?? 0) > 0) {
      $src = strtolower(trim((string)($row['source'] ?? '')));
      $delayed = in_array($type, ['stocks', 'arab'], true) || ($type !== 'crypto' && str_starts_with($src, 'yahoo'));
      $items[] = [
        'symbol' => $sym,
        'type' => $type,
        'price' => (float)$row['price'],
        'change_pct' => (float)($row['change_pct'] ?? 0),
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
