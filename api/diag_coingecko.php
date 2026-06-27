<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/marketdata.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_coingecko.php';
$result = [];
try {
  $result['coingecko'] = coingecko_spot_metal_quote('XAUUSD');
  $result['http_ok'] = true;
} catch (Throwable $e) {
  $result['http_ok'] = false;
  $result['error'] = $e->getMessage();
}
header('Content-Type: application/json; charset=utf-8');
json_response(['ok'=>true,'result'=>$result,'time'=>time()]);
