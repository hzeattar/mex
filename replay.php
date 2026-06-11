<?php
declare(strict_types=1);

// Replay orderbook snapshots persisted by /api/perp/depth.php.
// Useful for debugging / latency simulation.

require_once __DIR__ . '/api/lib/common.php';

$uid = require_auth();

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? 'BTCUSDT')));
$limit = (int)($_GET['limit'] ?? 30);
$limit = max(1, min(200, $limit));

$pdo = db();
$sql = "SELECT id, symbol, bids, asks, source, updated_at FROM orderbook_snapshots WHERE symbol=? ORDER BY updated_at DESC LIMIT ".(int)$limit;
$stmt = $pdo->prepare($sql);
$stmt->execute([$symbol]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$items = [];
foreach (array_reverse($rows) as $r) {
  $items[] = [
    'id' => (int)($r['id'] ?? 0),
    'symbol' => (string)($r['symbol'] ?? ''),
    'bids' => json_decode((string)($r['bids'] ?? '[]'), true) ?: [],
    'asks' => json_decode((string)($r['asks'] ?? '[]'), true) ?: [],
    'source' => (string)($r['source'] ?? ''),
    'updated_at' => (int)($r['updated_at'] ?? 0),
  ];
}

json_response(['ok'=>true,'symbol'=>$symbol,'items'=>$items]);
