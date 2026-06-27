<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/quote_central.php';

$bannedSources = [
  'yahoo',
  'yahoo_chart',
  'yahoo_chart_live',
  'yahoo_crypto_chart',
  'yahoo_rest',
  'eodhd',
  'eodhd_rest',
  'eodhd_intraday',
  'currencyfreaks',
  'massive',
  'polygon',
  'synthetic',
  'seed',
  'seed_price',
  'seed_fallback',
  'chart_seed',
  'seed_candle',
];

$stats = [
  'market_quotes_deleted' => 0,
  'central_quotes_deleted' => 0,
  'market_candles_deleted' => 0,
  'files_deleted' => 0,
  'errors' => [],
];

$deleteFiles = static function (string $pattern) use (&$stats): void {
  foreach (glob($pattern) ?: [] as $file) {
    if (!is_file($file)) continue;
    if (@unlink($file)) $stats['files_deleted']++;
  }
};

try {
  $pdo = db();
  $driver = db_driver();
  $placeholders = implode(',', array_fill(0, count($bannedSources), '?'));

  try {
    $st = $pdo->prepare("DELETE FROM market_quotes WHERE LOWER(source) IN ($placeholders)");
    $st->execute($bannedSources);
    $stats['market_quotes_deleted'] = $st->rowCount();
  } catch (Throwable $e) {
    $stats['errors'][] = 'market_quotes: ' . $e->getMessage();
  }

  try {
    quote_central_ensure_table();
    $st = $pdo->prepare("DELETE FROM central_quotes WHERE LOWER(source) IN ($placeholders)");
    $st->execute($bannedSources);
    $stats['central_quotes_deleted'] = $st->rowCount();
  } catch (Throwable $e) {
    $stats['errors'][] = 'central_quotes: ' . $e->getMessage();
  }

  try {
    $st = $pdo->prepare("DELETE FROM market_candles WHERE LOWER(type) <> 'crypto'");
    $st->execute();
    $stats['market_candles_deleted'] = $st->rowCount();
  } catch (Throwable $e) {
    $stats['errors'][] = 'market_candles: ' . $e->getMessage();
  }
} catch (Throwable $e) {
  $stats['errors'][] = 'db: ' . $e->getMessage();
}

$centralDir = __DIR__ . '/../api/data/central';
if (is_dir($centralDir)) {
  foreach (glob($centralDir . '/*.json') ?: [] as $file) {
    $base = basename($file);
    if (str_starts_with($base, 'bundle_') || $base === '_manifest.json') {
      if (@unlink($file)) $stats['files_deleted']++;
      continue;
    }
    $raw = @file_get_contents($file);
    $data = $raw ? json_decode($raw, true) : null;
    $source = strtolower(trim((string)($data['source'] ?? '')));
    $type = strtolower(trim((string)($data['type'] ?? '')));
    if (in_array($source, $bannedSources, true) || ($type !== '' && $type !== 'crypto' && in_array($source, ['cache', 'stale_cache'], true))) {
      if (@unlink($file)) $stats['files_deleted']++;
    }
  }
}

$deleteFiles(__DIR__ . '/../api/data/candles_spot_forex_*.json');
$deleteFiles(__DIR__ . '/../api/data/candles_spot_stocks_*.json');
$deleteFiles(__DIR__ . '/../api/data/candles_spot_commodities_*.json');
$deleteFiles(__DIR__ . '/../api/data/candles_perp_futures_*.json');
$deleteFiles(__DIR__ . '/../api/data/candles_spot_arab_*.json');
$deleteFiles(__DIR__ . '/../api/data/cache/central_bundle/*.json');

echo json_encode(['ok' => empty($stats['errors']), 'stats' => $stats], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
