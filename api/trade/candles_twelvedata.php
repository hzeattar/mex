<?php
declare(strict_types=1);

/**
 * Twelve Data Candles API — real-time and historical OHLCV data for all markets.
 * Provides superior data quality vs Yahoo for forex, commodities, futures, arab.
 *
 * GET /api/trade/candles_twelvedata.php?symbol=XAUUSD&type=commodities&tf=1m&limit=300
 */

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_sources.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, max-age=5');

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$type   = strtolower(trim((string)($_GET['type'] ?? 'forex')));
$tf     = strtolower(trim((string)($_GET['tf'] ?? '1m')));
$limit  = min(5000, max(1, (int)($_GET['limit'] ?? 300)));

if (!$symbol) { echo json_encode([]); exit; }

$tdSymbol = twelvedata_symbol_for_market($symbol, $type, function_exists('vp_get_market_meta') ? vp_get_market_meta($symbol, $type) : []);
if (!$tdSymbol) { echo json_encode([]); exit; }

$candles = twelvedata_time_series_candles_cached($tdSymbol, $tf, $limit, 0, max(10, min(3600, (int)env('TWELVEDATA_CANDLES_TTL', '60'))));
echo json_encode($candles, JSON_UNESCAPED_UNICODE);
