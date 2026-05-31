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

// Test qa_quote_payload ALONE
$qaResult = 'NOT_TESTED';
$qaDebug = [];
try {
  // Manually replicate what qa_quote_payload does
  $metaRows2 = qa_market_meta_by_symbols([$sym]);
  $resolvedType2 = 'commodities';
  $metaBySym2 = is_array($metaRows2[$sym]['meta'] ?? null) ? $metaRows2[$sym]['meta'] : [];
  $symbolsByType2 = ['commodities' => [$sym]];

  $qaDebug['metaBySym'] = $metaBySym2;
  $qaDebug['symbolsByType'] = $symbolsByType2;

  // Step 1: qa_live_map_grouped
  try {
    $liveBySym = qa_live_map_grouped($symbolsByType2, [$sym => $metaBySym2], [
      'allow_live' => true,
      'direct_yahoo_budget' => 3,
      'chart_budget' => 2,
      'chart_budget_ms' => 5000,
      'allow_direct_batch' => true,
    ]);
    $qaDebug['liveBySym'] = $liveBySym;
  } catch (Throwable $e2) {
    $qaDebug['liveError'] = $e2->getMessage();
  }

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
  $qaDebug['outerError'] = $e->getMessage();
}

echo json_encode([
  'symbol' => $sym,
  'type' => $type,
  'db_meta' => $dbMeta,
  'seed_price' => $seedPrice,
  'yahoo_ticker' => $ticker,
  'is_spot_metal' => $spot,
  'futures_to_spot_factor' => $factor,
  'qa_debug' => $qaDebug,
  'qa_quote_payload' => $qaResult,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
