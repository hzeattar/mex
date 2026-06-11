<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';

require_method('GET');

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
if ($symbol === '') json_response(['ok'=>false,'error'=>'symbol required'], 422);

$pdo = db();

// Try to get latest mark price from cached quotes
$row = quote_get($symbol, 'crypto', 'perp');

$markPrice = 0.0;
$source = 'none';
$updatedAt = 0;

if ($row && !empty($row['price'])) {
  $markPrice = (float)$row['price'];
  $source = (string)($row['source'] ?? 'cache');
  $updatedAt = (int)($row['updated_at'] ?? 0);
}

// Fallback: try spot quote if perp not available
if ($markPrice <= 0) {
  $row = quote_get($symbol, 'crypto', 'spot');
  if ($row && !empty($row['price'])) {
    $markPrice = (float)$row['price'];
    $source = 'spot_fallback';
    $updatedAt = (int)($row['updated_at'] ?? 0);
  }
}

json_response([
  'ok'         => true,
  'symbol'     => $symbol,
  'mark_price' => $markPrice,
  'source'     => $source,
  'updated_at' => $updatedAt,
]);
