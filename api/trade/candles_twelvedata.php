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

$apiKey = trim((string)getenv('QUOTES_TWELVEDATA_KEY') ?? '');
if (!$apiKey) { echo json_encode([]); exit; }

// Map timeframe to Twelve Data interval
$intervalMap = [
  '1m' => '1min', '3m' => '3min', '5m' => '5min', '15m' => '15min',
  '30m' => '30min', '1h' => '1h', '2h' => '2h', '4h' => '4h',
  '6h' => '6h', '8h' => '8h', '12h' => '12h',
  '1d' => '1day', '3d' => '3day', '1w' => '1week', '1M' => '1month',
];
$tdInterval = $intervalMap[$tf] ?? '1min';

// Map symbol to Twelve Data format
$tdSymbol = $symbol;
if ($type === 'forex') {
  $s = str_replace('USDT', 'USD', $symbol);
  if (strlen($s) >= 6) $tdSymbol = substr($s, 0, 3) . '/' . substr($s, 3, 6);
} elseif ($type === 'commodities') {
  if (str_starts_with($symbol, 'XAU')) $tdSymbol = 'XAU/USD';
  elseif (str_starts_with($symbol, 'XAG')) $tdSymbol = 'XAG/USD';
  elseif (str_starts_with($symbol, 'XPT')) $tdSymbol = 'XPT/USD';
  elseif (str_starts_with($symbol, 'XPD')) $tdSymbol = 'XPD/USD';
  elseif ($symbol === 'USOIL') $tdSymbol = 'CL/USD';
  elseif ($symbol === 'UKOIL') $tdSymbol = 'BZ/USD';
  elseif ($symbol === 'NGAS') $tdSymbol = 'NG/USD';
  elseif ($symbol === 'COPPER') $tdSymbol = 'HG/USD';
} elseif ($type === 'futures') {
  $futuresMap = [
    'GC=F' => 'GC1!','CL=F' => 'CL1!','SI=F' => 'SI1!','HG=F' => 'HG1!',
    'NG=F' => 'NG1!','ZC=F' => 'ZC1!','ZW=F' => 'ZW1!','ZS=F' => 'ZS1!',
    'ES=F' => 'ES1!','NQ=F' => 'NQ1!','YM=F' => 'YM1!','RTY=F' => 'RTY1!',
  ];
  $tdSymbol = $futuresMap[$symbol] ?? $symbol;
}

// Determine output size
$outputSize = $limit <= 100 ? 'compact' : 'full';

$url = "https://api.twelvedata.com/time_series"
  . "?symbol=" . urlencode($tdSymbol)
  . "&interval=" . urlencode($tdInterval)
  . "&outputsize=" . $outputSize
  . "&apikey=" . urlencode($apiKey);

$ctx = stream_context_create([
  'http' => ['timeout' => 8, 'method' => 'GET', 'ignore_errors' => true],
  'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
]);

$raw = @file_get_contents($url, false, $ctx);
if (!$raw) { echo json_encode([]); exit; }

$data = json_decode($raw, true);
if (!$data || !isset($data['values']) || !is_array($data['values'])) {
  echo json_encode([]);
  exit;
}

// Convert Twelve Data format to our candle format
$candles = [];
foreach (array_reverse($data['values']) as $v) {
  $t = strtotime($v['datetime'] ?? '') ?: 0;
  if (!$t) continue;
  $o = (float)($v['open'] ?? 0);
  $h = (float)($v['high'] ?? 0);
  $l = (float)($v['low'] ?? 0);
  $c = (float)($v['close'] ?? 0);
  $vol = (float)($v['volume'] ?? 0);
  if ($c <= 0 && $o <= 0) continue;
  $candles[] = [
    'time' => $t,
    'open' => $o > 0 ? $o : $c,
    'high' => $h > 0 ? $h : $c,
    'low'  => $l > 0 ? $l : $c,
    'close' => $c,
    'volume' => $vol,
  ];
}

// Trim to requested limit
if (count($candles) > $limit) {
  $candles = array_slice($candles, -$limit);
}

echo json_encode($candles, JSON_UNESCAPED_UNICODE);
