<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/marketdata.php';
require_once __DIR__ . '/lib/market_resolver.php';
header('Content-Type: application/json');
try {
  $symbol = $_GET['symbol'] ?? 'XAUUSD';
  $type = $_GET['type'] ?? 'commodities';
  $tf = $_GET['tf'] ?? '1m';
  $limit = (int)($_GET['limit'] ?? 20);

  $meta = vp_get_market_meta($symbol, $type);
  $tdTicker = twelvedata_symbol_for_market($symbol, $type, $meta);
  $interval = twelvedata_interval_for_tf($tf);
  $key = trim((string)env('QUOTES_TWELVEDATA_KEY', ''));

  $url = '';
  $raw = [];
  if ($tdTicker && $interval && $key !== '') {
    $url = 'https://api.twelvedata.com/time_series'
      . '?symbol=' . urlencode($tdTicker)
      . '&interval=' . urlencode($interval)
      . '&outputsize=' . $limit
      . '&format=JSON&timezone=UTC'
      . '&apikey=' . urlencode($key);
    $raw = http_get_json($url);
  }

  echo json_encode([
    'ok' => !empty($raw['values']),
    'symbol' => $symbol,
    'type' => $type,
    'td_ticker' => $tdTicker,
    'interval' => $interval,
    'key_suffix' => substr($key, -6),
    'url_mask' => $url ? preg_replace('/apikey=[^&]+/', 'apikey=***', $url) : '',
    'raw_first' => $raw['values'][0] ?? null,
    'raw_status' => $raw['status'] ?? 'no_status',
    'raw_message' => $raw['message'] ?? null,
    'count' => count($raw['values'] ?? []),
  ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
}
