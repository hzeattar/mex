<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/risk.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();
$body = read_json_body();

$id = (int)($body['id'] ?? 0);
$tp = isset($body['tp']) ? (float)$body['tp'] : null;
$sl = isset($body['sl']) ? (float)$body['sl'] : null;

if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid position id'], 422);
if ($tp !== null && $tp <= 0) $tp = null;
if ($sl !== null && $sl <= 0) $sl = null;

$stmt = $pdo->prepare('SELECT id,market_type,side,qty,entry_price,leverage FROM positions WHERE id=? AND user_id=?');
$stmt->execute([$id, $uid]);
$pos = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$pos) json_response(['ok'=>false,'error'=>'Position not found'], 404);

$marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
$side       = strtoupper((string)($pos['side'] ?? 'BUY'));
$entry      = (float)($pos['entry_price'] ?? 0);

// Directional validation for TP/SL
if ($tp !== null && $entry > 0) {
  if ($side === 'BUY' && $tp <= $entry) {
    json_response(['ok'=>false,'error'=>'Take Profit must be above entry price for BUY'], 422);
  }
  if ($side === 'SELL' && $tp >= $entry) {
    json_response(['ok'=>false,'error'=>'Take Profit must be below entry price for SELL'], 422);
  }
}
if ($sl !== null && $entry > 0) {
  if ($side === 'BUY' && $sl >= $entry) {
    json_response(['ok'=>false,'error'=>'Stop Loss must be below entry price for BUY'], 422);
  }
  if ($side === 'SELL' && $sl <= $entry) {
    json_response(['ok'=>false,'error'=>'Stop Loss must be above entry price for SELL'], 422);
  }
}
if ($tp !== null && $sl !== null && $tp > 0 && $sl > 0 && $tp === $sl) {
  json_response(['ok'=>false,'error'=>'Take Profit and Stop Loss cannot be the same value'], 422);
}

$upd = $pdo->prepare('UPDATE positions SET tp_price=?, sl_price=?, updated_at=? WHERE id=? AND user_id=?');
$upd->execute([
  $tp,
  $sl,
  now_ts(),
  $id,
  $uid,
]);

if ($upd->rowCount() === 0) {
  json_response(['ok'=>false,'error'=>'Position not found or already closed'], 404);
}

json_response(['ok'=>true,'tp'=>$tp,'sl'=>$sl]);
