<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/marketdata.php';
require_once __DIR__ . '/lib/market_resolver.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$sym = strtoupper(trim((string)($_GET['symbol'] ?? 'XAUUSD')));
$type = strtolower(trim((string)($_GET['type'] ?? 'commodities')));
$meta = [];

$ticker = yahoo_ticker_for_market($sym, $type, $meta);
$factor = function_exists('futures_to_spot_factor') ? futures_to_spot_factor($sym) : 'FUNC_NOT_FOUND';
$spot = function_exists('vp_is_spot_metal_symbol') ? vp_is_spot_metal_symbol($sym, $type) : 'FUNC_NOT_FOUND';

$yahooResult = 'NOT_TESTED';
if ($ticker) {
  try {
    $bulk = yahoo_quote_many_cached([$ticker], 0);
    $yahooResult = $bulk[$ticker] ?? 'NO_DATA';
  } catch (Throwable $e) {
    $yahooResult = 'ERROR: ' . $e->getMessage();
  }
}

echo json_encode([
  'symbol' => $sym,
  'type' => $type,
  'yahoo_ticker' => $ticker,
  'is_spot_metal' => $spot,
  'futures_to_spot_factor' => $factor,
  'yahoo_raw_result' => $yahooResult,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
