<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/marketdata.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_authority.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$sym = strtoupper(trim((string)($_GET['symbol'] ?? 'XAUUSD')));
$type = strtolower(trim((string)($_GET['type'] ?? 'commodities')));
$meta = [];

$ticker = yahoo_ticker_for_market($sym, $type, $meta);
$factor = function_exists('futures_to_spot_factor') ? futures_to_spot_factor($sym) : 'FUNC_NOT_FOUND';
$spot = function_exists('vp_is_spot_metal_symbol') ? vp_is_spot_metal_symbol($sym, $type) : 'FUNC_NOT_FOUND';

// Test yahoo_quote_many_cached directly
$yahooCached = 'NOT_TESTED';
if ($ticker) {
  try {
    $bulk = yahoo_quote_many_cached([$ticker], 0);
    $yahooCached = $bulk[$ticker] ?? 'NO_DATA';
  } catch (Throwable $e) {
    $yahooCached = 'ERROR: ' . $e->getMessage();
  }
}

// Test qa_quote_payload (full pipeline)
$qaResult = 'NOT_TESTED';
try {
  $qa = qa_quote_payload_simple($sym, $type);
  $qaResult = $qa;
} catch (Throwable $e) {
  $qaResult = 'ERROR: ' . $e->getMessage();
}

function qa_quote_payload_simple(string $sym, string $type): array {
  return qa_quote_payload($type, [$sym], [
    'allow_live' => true,
    'allow_stale_display' => true,
    'allow_noncrypto_seed' => false,
    'direct_yahoo_budget' => 3,
    'chart_budget' => 2,
    'chart_budget_ms' => 5000,
    'allow_direct_batch' => true,
  ]);
}

echo json_encode([
  'symbol' => $sym,
  'type' => $type,
  'yahoo_ticker' => $ticker,
  'is_spot_metal' => $spot,
  'futures_to_spot_factor' => $factor,
  'yahoo_cached_result' => $yahooCached,
  'qa_quote_payload' => $qaResult,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
