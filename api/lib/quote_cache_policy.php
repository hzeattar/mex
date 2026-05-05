<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/market_resolver.php';

function qa_cache_dir(): string {
  $dir = dirname(__DIR__) . '/data/cache';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);
  return $dir;
}

function qa_cache_file(string $prefix, string $key): string {
  return qa_cache_dir() . '/' . preg_replace('/[^a-z0-9_\-]/i', '_', $prefix) . '_' . sha1($key) . '.json';
}

function qa_payload_has_coverage($payload, string $assetType, int $requestedCount): bool {
  if (!is_array($payload)) return false;
  if ($assetType === 'crypto') return true;
  $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
  if (!$items) return false;
  $valid = 0;
  foreach ($items as $row) {
    $price = (float)($row['price'] ?? 0);
    $src = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
    if (!($price > 0)) continue;
    if ($src === '' || in_array($src, ['unavailable','seed','seed_price','seed_fallback','cache'], true)) continue;
    $valid++;
  }
  $minValid = ($requestedCount <= 4) ? 1 : max(2, (int)ceil($requestedCount * 0.34));
  return $valid >= $minValid;
}

function qa_cache_read(string $file, int $ttl, ?callable $validator = null): ?array {
  if ($ttl <= 0 || !is_file($file)) return null;
  $age = time() - (int)@filemtime($file);
  if ($age < 0 || $age > $ttl) return null;
  $raw = @file_get_contents($file);
  if ($raw === false || $raw === '') return null;
  $decoded = json_decode((string)$raw, true);
  if (!is_array($decoded)) return null;
  if ($validator && !$validator($decoded)) return null;
  return $decoded;
}

function qa_cache_write(string $file, array $payload): void {
  $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json === false) return;
  @file_put_contents($file, $json, LOCK_EX);
}

function qa_quotes_cache_ttl(string $assetType, string $mode, int $count): int {
  $assetType = vp_normalize_asset_type($assetType);
  $mode = strtolower(trim($mode));
  if ($mode === 'direct') {
    return $assetType === 'crypto' ? 0 : max(0, min(2, (int)env('QUOTES_API_DIRECT_CACHE_TTL_NONCRYPTO', '0')));
  }
  if ($mode === 'visible') {
    return $assetType === 'crypto' ? 0 : max(0, min(2, (int)env('QUOTES_API_VISIBLE_CACHE_TTL_NONCRYPTO', '0')));
  }
  if ($mode === 'fresh') {
    return $assetType === 'crypto'
      ? max(1, min(3, (int)env('QUOTES_API_FRESH_CACHE_TTL_CRYPTO', '1')))
      : max(1, min(6, (int)env('QUOTES_API_FRESH_CACHE_TTL_NONCRYPTO', '2')));
  }
  if ($assetType === 'crypto') return max(0, min(5, (int)env('QUOTES_API_CACHE_TTL_CRYPTO', '1')));
  if ($assetType === 'forex') return max(0, min(8, (int)env('QUOTES_API_CACHE_TTL_FOREX', '1')));
  if ($assetType === 'arab') return max(0, min(6, (int)env('QUOTES_API_CACHE_TTL_ARAB', '1')));
  if ($assetType === 'stocks') return max(0, min(15, (int)env('QUOTES_API_CACHE_TTL_STOCKS', '1')));
  if (in_array($assetType, ['commodities','futures'], true)) return max(0, min(10, (int)env('QUOTES_API_CACHE_TTL_COMMODITIES', '2')));
  return 0;
}
