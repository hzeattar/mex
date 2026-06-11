<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/tick_validate.php';
require_once __DIR__ . '/tick_store.php';

function tick_build_from_quote_row(array $marketRow, array $quoteRow): ?array {
  $symbol = strtoupper(trim((string)($marketRow['symbol'] ?? '')));
  $type = vp_normalize_asset_type((string)($marketRow['type'] ?? ''));
  if ($symbol === '' || $type === '') return null;
  $price = (float)($quoteRow['price'] ?? 0);
  $source = strtolower(trim((string)($quoteRow['source'] ?? '')));
  $updatedAt = (int)($quoteRow['updated_at'] ?? 0);
  $market = strtolower(trim((string)($quoteRow['market'] ?? $marketRow['market'] ?? 'spot')));
  if (!in_array($market, ['spot','perp'], true)) $market = 'spot';
  if (!($price > 0) || $updatedAt <= 0) return null;
  $tick = [
    'symbol' => $symbol,
    'type' => $type,
    'market' => $market,
    'price' => $price,
    'volume' => (float)($quoteRow['volume'] ?? 0),
    'source' => $source,
    'ts' => $updatedAt,
  ];
  return tick_payload_is_valid($tick) ? $tick : null;
}
