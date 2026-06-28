<?php
// TwelveData diagnostics - same helpers used by candles.php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_sources.php';
$symbol = $_GET['symbol'] ?? 'XAUUSD';
$type = $_GET['type'] ?? 'commodities';
$tf = $_GET['tf'] ?? '1m';
$limit = (int)($_GET['limit'] ?? 20);
header('Content-Type: application/json');

$meta = function_exists('vp_get_market_meta') ? vp_get_market_meta($symbol, $type) : [];
$tdTicker = function_exists('twelvedata_symbol_for_market') ? twelvedata_symbol_for_market($symbol, $type, $meta) : null;
$interval = function_exists('twelvedata_interval_for_tf') ? twelvedata_interval_for_tf($tf) : null;
$key = trim((string)env('QUOTES_TWELVEDATA_KEY', ''));

$items = [];
$rawError = null;
$rawProbe = null;
if ($tdTicker && $interval && function_exists('twelvedata_time_series_candles_cached')) {
  try {
    $items = twelvedata_time_series_candles_cached($tdTicker, $tf, $limit, 0, 5);
    if (!$items && (int)($_GET['raw'] ?? 0) === 1) {
      $params = [
        'symbol' => $tdTicker,
        'interval' => $interval,
        'outputsize' => (string)max(5, min(20, $limit)),
        'format' => 'JSON',
        'timezone' => 'UTC',
        'apikey' => $key,
      ];
      $raw = http_get_json('https://api.twelvedata.com/time_series?' . http_build_query($params));
      if (is_array($raw)) {
        $rawProbe = [
          'status' => $raw['status'] ?? null,
          'code' => $raw['code'] ?? null,
          'message' => $raw['message'] ?? null,
          'keys' => array_slice(array_keys($raw), 0, 12),
          'value_count' => isset($raw['values']) && is_array($raw['values']) ? count($raw['values']) : null,
        ];
      }
    }
  } catch (Throwable $e) {
    $rawError = $e->getMessage();
  }
}

echo json_encode([
  'ok' => count($items) > 0,
  'symbol' => $symbol,
  'type' => $type,
  'td_ticker' => $tdTicker,
  'interval' => $interval,
  'key_suffix' => $key ? substr($key, -6) : null,
  'error' => $rawError,
  'raw_probe' => $rawProbe,
  'count' => count($items),
  'first' => $items[0] ?? null,
  'last' => $items[count($items)-1] ?? null,
], JSON_PRETTY_PRINT);
