<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_store.php';
$defs = qa_static_supported_defs_by_symbol();
$samples = ['XAUUSD','AAPL','TSLA','EURUSD','BTCUSDT'];
$out = [];
foreach ($samples as $s) {
  $out[$s] = $defs[$s] ?? 'missing';
}
header('Content-Type: application/json; charset=utf-8');
json_response(['ok'=>true,'file'=>__FILE__,'samples'=>$out]);
