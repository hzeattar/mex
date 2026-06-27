<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_store.php';
$typeParam = strtolower(trim((string)($_GET['type'] ?? '')));
$defsBySym = qa_static_supported_defs_by_symbol();
$res = [];
foreach (['XAUUSD','AAPL','TSLA','EURUSD'] as $s) {
  $res[$s] = [$typeParam, (string)($defsBySym[$s]['type'] ?? 'missing'), vp_normalize_asset_type((string)($defsBySym[$s]['type'] ?? ''))];
}
header('Content-Type: application/json; charset=utf-8');
json_response(['ok'=>true,'type_param'=>$typeParam,'res'=>$res,'hash'=>md5_file(__FILE__)]);
