<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('GET');
$uid = require_auth();
$pdo = db();

$mode = strtolower(trim((string)($_GET['mode'] ?? 'demo')));
if (!in_array($mode, ['demo', 'real'], true)) $mode = 'demo';

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));

$sql = 'SELECT id,symbol,side,qty,entry_price,leverage,market_type,margin_mode,margin_initial,liquidation_price,tp_price,sl_price,unrealized_pnl_usd,fees_paid,source_signal_id,copy_subscription_id,opened_at,updated_at FROM positions WHERE user_id=? AND status=\'open\'';
$params = [$uid];

if ($symbol !== '') {
  $sql .= ' AND symbol=?';
  $params[] = $symbol;
}

$sql .= ' ORDER BY updated_at DESC LIMIT 100';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$out = [];
foreach ($rows as $r) {
  $out[] = [
    'id'                  => (int)$r['id'],
    'symbol'              => (string)$r['symbol'],
    'side'                => (string)$r['side'],
    'qty'                 => (float)$r['qty'],
    'entry_price'         => (float)$r['entry_price'],
    'leverage'            => (int)$r['leverage'],
    'market_type'         => (string)$r['market_type'],
    'margin_mode'         => (string)$r['margin_mode'],
    'margin_initial'      => (float)$r['margin_initial'],
    'liquidation_price'   => isset($r['liquidation_price']) ? (float)$r['liquidation_price'] : null,
    'tp_price'            => isset($r['tp_price']) ? (float)$r['tp_price'] : null,
    'sl_price'            => isset($r['sl_price']) ? (float)$r['sl_price'] : null,
    'unrealized_pnl_usd'  => (float)$r['unrealized_pnl_usd'],
    'fees_paid'           => (float)$r['fees_paid'],
    'source_signal_id'    => isset($r['source_signal_id']) ? (int)$r['source_signal_id'] : null,
    'copy_subscription_id'=> isset($r['copy_subscription_id']) ? (int)$r['copy_subscription_id'] : null,
    'opened_at'           => (string)$r['opened_at'],
    'updated_at'          => (string)$r['updated_at'],
  ];
}

json_response(['ok'=>true,'mode'=>$mode,'count'=>count($out),'positions'=>$out]);
