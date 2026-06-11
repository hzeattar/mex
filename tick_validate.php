<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/market_resolver.php';

function tick_source_is_allowed(?string $source): bool {
  $src = strtolower(trim((string)$source));
  if ($src === '') return false;
  return !in_array($src, ['seed','seed_price','seed_fallback','seed_default','fallback_static','synthetic','chart_seed','aggs','unavailable'], true);
}

function tick_payload_is_valid(array $tick): bool {
  $symbol = strtoupper(trim((string)($tick['symbol'] ?? '')));
  $type = vp_normalize_asset_type((string)($tick['type'] ?? ''));
  $market = strtolower(trim((string)($tick['market'] ?? 'spot')));
  $price = (float)($tick['price'] ?? 0);
  $ts = (int)($tick['ts'] ?? 0);
  $source = (string)($tick['source'] ?? '');
  if ($symbol === '' || !preg_match('/^[A-Z0-9:._\-]{1,32}$/', $symbol)) return false;
  if ($type === '' || $type === 'all') return false;
  if (!in_array($market, ['spot','perp'], true)) return false;
  if (!($price > 0)) return false;
  if ($ts <= 0) return false;
  if (!tick_source_is_allowed($source)) return false;
  return true;
}
