<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/marketdata.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_batch.php';
require_once __DIR__ . '/lib/quotes.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$sym = strtoupper(trim((string)($_GET['symbol'] ?? 'XAUUSD')));
$type = strtolower(trim((string)($_GET['type'] ?? 'commodities')));

// Get meta from DB
$metaRows = qa_market_meta_by_symbols([$sym]);
$dbMeta = is_array($metaRows[$sym]['meta'] ?? null) ? $metaRows[$sym]['meta'] : [];
$seedPrice = (float)($metaRows[$sym]['seed_price'] ?? 0);

$ticker = yahoo_ticker_for_market($sym, $type, $dbMeta);
$factor = function_exists('futures_to_spot_factor') ? futures_to_spot_factor($sym) : 'FUNC_NOT_FOUND';
$spot = function_exists('vp_is_spot_metal_symbol') ? vp_is_spot_metal_symbol($sym, $type) : 'FUNC_NOT_FOUND';
$prefersEodhd = quote_provider_prefers_eodhd($type, $dbMeta, $sym);
$prefersYahoo = quote_provider_prefers_yahoo($type, $dbMeta, $sym);

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

// Test quote_bulk_live directly
$bulkLive = 'NOT_TESTED';
try {
  $bulkLive = quote_bulk_live([$sym], $type, [$sym => $dbMeta], [
    'allow_live' => true,
    'direct_budget' => 3,
    'direct_yahoo_budget' => 3,
    'chart_budget' => 2,
    'chart_budget_ms' => 5000,
    'allow_direct_batch' => true,
  ]);
} catch (Throwable $e) {
  $bulkLive = 'ERROR: ' . $e->getMessage();
}

// Test full qa_quote_payload
$qaResult = 'NOT_TESTED';
try {
  $qaResult = qa_quote_payload($type, [$sym], [
    'allow_live' => true,
    'allow_stale_display' => true,
    'allow_noncrypto_seed' => false,
    'direct_yahoo_budget' => 3,
    'chart_budget' => 2,
    'chart_budget_ms' => 5000,
    'allow_direct_batch' => true,
  ]);
} catch (Throwable $e) {
  $qaResult = 'ERROR: ' . $e->getMessage();
}

echo json_encode([
  'symbol' => $sym,
  'type' => $type,
  'db_meta' => $dbMeta,
  'seed_price' => $seedPrice,
  'yahoo_ticker' => $ticker,
  'is_spot_metal' => $spot,
  'futures_to_spot_factor' => $factor,
  'prefers_eodhd' => $prefersEodhd,
  'prefers_yahoo' => $prefersYahoo,
  'yahoo_cached_result' => $yahooCached,
  'quote_bulk_live' => $bulkLive,
  'qa_quote_payload' => $qaResult,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
