<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/marketdata.php';

require_method('GET');

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
if ($symbol === '') json_response(['ok'=>false,'error'=>'symbol required'], 422);

$limit = (int)($_GET['limit'] ?? 50);
$limit = max(5, min(200, $limit));

$pdo = db();
$ttl = (int)env('DEPTH_TTL', '8');
$now = time();

// Try cached snapshot (latest)
$st = $pdo->prepare('SELECT bids,asks,updated_at FROM orderbook_snapshots WHERE symbol=? ORDER BY updated_at DESC, id DESC LIMIT 1');
$st->execute([$symbol]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;

$fresh = $row && (int)($row['updated_at'] ?? 0) > 0 && ($now - (int)$row['updated_at']) <= $ttl;

if (!$fresh) {
  try {
    $d = binance_futures_depth($symbol, $limit);
    $bids = json_encode($d['bids'] ?? []);
    $asks = json_encode($d['asks'] ?? []);
    $ins = $pdo->prepare('INSERT INTO orderbook_snapshots(symbol,bids,asks,source,updated_at) VALUES (?,?,?,?,?)');
    $ins->execute([$symbol,$bids,$asks,'binance',$now]);
    $row = ['bids'=>$bids,'asks'=>$asks,'updated_at'=>$now];
  } catch (Throwable $e) {
    // keep cached even if stale
  }
}

$bids = [];
$asks = [];
try { $bids = $row && $row['bids'] ? json_decode((string)$row['bids'], true) : []; } catch (Throwable $e) { $bids = []; }
try { $asks = $row && $row['asks'] ? json_decode((string)$row['asks'], true) : []; } catch (Throwable $e) { $asks = []; }

json_response([
  'ok'=>true,
  'symbol'=>$symbol,
  'bids'=>is_array($bids)?$bids:[],
  'asks'=>is_array($asks)?$asks:[],
  'updated_at'=>(int)($row['updated_at'] ?? 0),
]);
