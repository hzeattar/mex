<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
header('Content-Type: application/json');
$symbol = $_GET['symbol'] ?? 'XAUUSD';
$type = $_GET['type'] ?? 'commodities';
$tf = $_GET['tf'] ?? '1m';
$limit = (int)($_GET['limit'] ?? 20);

$meta = vp_get_market_meta($symbol, $type);
$tdTicker = twelvedata_symbol_for_market($symbol, $type, $meta);
$interval = twelvedata_interval_for_tf($tf);

$raw = [];
if ($tdTicker && $interval) {
  $url = 'https://api.twelvedata.com/time_series'
    . '?symbol=' . urlencode($tdTicker)
    . '&interval=' . urlencode($interval)
    . '&outputsize=' . $limit
    . '&apikey=' . urlencode(trim((string)env('QUOTES_TWELVEDATA_KEY', '')));
  $raw = json_decode(wp_remote_get($url, ['timeout' => 8]), true) ?? [];
}

echo json_encode([
  'ok' => !empty($raw['values']),
  'symbol' => $symbol,
  'type' => $type,
  'td_ticker' => $tdTicker,
  'interval' => $interval,
  'key_suffix' => substr(trim((string)env('QUOTES_TWELVEDATA_KEY', '')), -6),
  'raw_first' => $raw['values'][0] ?? null,
  'raw_status' => $raw['status'] ?? 'no_status',
  'raw_message' => $raw['message'] ?? null,
  'count' => count($raw['values'] ?? []),
], JSON_PRETTY_PRINT);
