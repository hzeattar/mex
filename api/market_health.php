<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_central.php';
require_once __DIR__ . '/lib/quote_snapshot.php';

require_method('GET');
require_auth();

$types = ['crypto','forex','commodities','futures','stocks','arab'];
$samples = [
  'crypto' => ['BTCUSDT','ETHUSDT','SOLUSDT'],
  'forex' => ['EURUSD','GBPUSD','USDJPY'],
  'commodities' => ['XAUUSD','USOIL','NATGAS'],
  'futures' => ['ES_F','NQ_F','GC_F'],
  'stocks' => ['AAPL','MSFT','NVDA'],
  'arab' => ['2222','1120','2010'],
];

$manifest = quote_central_manifest_read();
$manifestAge = isset($manifest['updated_at']) ? max(0, time() - (int)$manifest['updated_at']) : null;
$status = [
  'feed_worker' => function_exists('tp_status_read') ? tp_status_read('feed_worker') : null,
  'quotes_warm' => function_exists('tp_status_read') ? tp_status_read('quotes_warm') : null,
  'quotes_tick' => function_exists('tp_status_read') ? tp_status_read('quotes_tick') : null,
];

$byType = [];
foreach ($types as $type) {
  $snapshots = qs_snapshots($samples[$type] ?? [], $type, 'spot', ['mode' => 'display']);
  $valid = 0;
  $maxAge = null;
  $items = [];
  foreach ($snapshots as $snap) {
    if ((float)($snap['price'] ?? 0) > 0) $valid++;
    if (isset($snap['age_sec']) && is_numeric($snap['age_sec'])) {
      $age = (int)$snap['age_sec'];
      $maxAge = $maxAge === null ? $age : max($maxAge, $age);
    }
    $items[] = qs_public_item($snap);
  }
  $byType[$type] = [
    'warm' => quote_central_is_warm($type),
    'valid_samples' => $valid,
    'sample_count' => count($items),
    'max_sample_age_sec' => $maxAge,
    'items' => $items,
  ];
}

json_response([
  'ok' => true,
  'ts' => time(),
  'central' => [
    'warm' => quote_central_is_warm(),
    'manifest_age_sec' => $manifestAge,
    'manifest' => $manifest,
  ],
  'statuses' => $status,
  'providers' => [
    'strategy' => 'hybrid',
    'crypto' => (string)env('CRYPTO_PROVIDER', 'binance'),
    'primary' => (string)env('PRICE_PROVIDER', 'yahoo'),
    'has_eodhd_key' => trim((string)env('EODHD_API_KEY', '')) !== '',
    'has_polygon_key' => trim((string)env('POLYGON_API_KEY', '')) !== '',
    'has_massive_key' => trim((string)env('MASSIVE_API_KEY', '')) !== '',
  ],
  'types' => $byType,
]);
