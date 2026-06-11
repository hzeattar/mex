<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/risk.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();
$body = read_json_body();

$id = (int)($body['id'] ?? 0);
$tp = (float)($body['tp'] ?? 0);
$sl = (float)($body['sl'] ?? 0);

if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid position id'], 422);
if ($tp <= 0) $tp = 0.0;
if ($sl <= 0) $sl = 0.0;

$stmt = $pdo->prepare('SELECT id,market_type,side,qty,entry_price,leverage FROM positions WHERE id=? AND user_id=?');
$stmt->execute([$id, $uid]);
$pos = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$pos) json_response(['ok'=>false,'error'=>'Position not found'], 404);

$marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
if ($marketType !== 'perp') {
  json_response(['ok'=>false,'error'=>'TP/SL only supported for PERP in this build'], 422);
}

// Basic sanity: TP/SL must be positive. Directional checks are done in risk engine when triggered.
$upd = $pdo->prepare('UPDATE positions SET tp_price=?, sl_price=?, updated_at=? WHERE id=? AND user_id=?');
$upd->execute([
  ($tp > 0 ? $tp : null),
  ($sl > 0 ? $sl : null),
  now_ts(),
  $id,
  $uid,
]);

json_response(['ok'=>true]);
