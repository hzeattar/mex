<?php
require_once __DIR__ . '/../lib/common.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();
$body = read_json_body();

$orderId = (int)($body['order_id'] ?? ($body['id'] ?? ($body['orderId'] ?? 0)));
if ($orderId <= 0) {
  json_response(['ok' => false, 'error' => 'order_id required'], 400);
}

$hasEntry = array_key_exists('limit_price', $body) || array_key_exists('entry_price', $body) || array_key_exists('price', $body);
$hasTp = array_key_exists('tp_price', $body) || array_key_exists('tp', $body);
$hasSl = array_key_exists('sl_price', $body) || array_key_exists('sl', $body);
if (!$hasEntry && !$hasTp && !$hasSl) {
  json_response(['ok' => false, 'error' => 'Nothing to update'], 422);
}

$parseNullablePrice = static function($value, string $label): ?float {
  if ($value === null || $value === '') return null;
  if (!is_numeric($value)) {
    json_response(['ok' => false, 'error' => $label . ' must be numeric'], 422);
  }
  $n = (float)$value;
  if ($n < 0) {
    json_response(['ok' => false, 'error' => $label . ' cannot be negative'], 422);
  }
  return $n > 0 ? $n : null;
};

$newEntry = null;
if ($hasEntry) {
  $newEntry = $parseNullablePrice($body['limit_price'] ?? ($body['entry_price'] ?? ($body['price'] ?? null)), 'Entry price');
  if ($newEntry === null) json_response(['ok' => false, 'error' => 'Entry price is required'], 422);
}
$newTp = $hasTp ? $parseNullablePrice($body['tp_price'] ?? ($body['tp'] ?? null), 'Take profit') : '__keep__';
$newSl = $hasSl ? $parseNullablePrice($body['sl_price'] ?? ($body['sl'] ?? null), 'Stop loss') : '__keep__';

$pdo->beginTransaction();
try {
  $lock = db_driver() === 'mysql' ? ' FOR UPDATE' : '';
  $st = $pdo->prepare("SELECT id, side, status, order_type, limit_price, fill_price, tp_price, sl_price, position_id, closed_at FROM orders WHERE id=? AND user_id=?{$lock}");
  $st->execute([$orderId, $uid]);
  $order = $st->fetch(PDO::FETCH_ASSOC);
  if (!$order) {
    $pdo->rollBack();
    json_response(['ok' => false, 'error' => 'Order not found'], 404);
  }

  $status = strtolower(trim((string)($order['status'] ?? '')));
  $positionId = (int)($order['position_id'] ?? 0);
  $fillPrice = (float)($order['fill_price'] ?? 0);
  $closedAt = (int)($order['closed_at'] ?? 0);
  $terminal = in_array($status, ['filled', 'closed', 'canceled', 'cancelled', 'rejected'], true);
  if ($terminal || $positionId > 0 || $fillPrice > 0 || $closedAt > 0) {
    $pdo->rollBack();
    json_response([
      'ok' => false,
      'error' => 'This order is already executed. Edit TP/SL from the open position controls.',
      'code' => 'order_already_executed',
    ], 409);
  }

  $entry = $newEntry ?? (float)($order['limit_price'] ?? 0);
  $side = strtoupper((string)($order['side'] ?? 'BUY')) === 'SELL' ? 'SELL' : 'BUY';
  $tpForValidation = $newTp === '__keep__' ? $parseNullablePrice($order['tp_price'] ?? null, 'Take profit') : $newTp;
  $slForValidation = $newSl === '__keep__' ? $parseNullablePrice($order['sl_price'] ?? null, 'Stop loss') : $newSl;
  if ($entry > 0 && $tpForValidation !== null) {
    if ($side === 'BUY' && $tpForValidation <= $entry) json_response(['ok' => false, 'error' => 'BUY take profit should be above entry'], 422);
    if ($side === 'SELL' && $tpForValidation >= $entry) json_response(['ok' => false, 'error' => 'SELL take profit should be below entry'], 422);
  }
  if ($entry > 0 && $slForValidation !== null) {
    if ($side === 'BUY' && $slForValidation >= $entry) json_response(['ok' => false, 'error' => 'BUY stop loss should be below entry'], 422);
    if ($side === 'SELL' && $slForValidation <= $entry) json_response(['ok' => false, 'error' => 'SELL stop loss should be above entry'], 422);
  }

  $sets = ['updated_at=?'];
  $params = [now_ts()];
  if ($hasEntry) {
    $sets[] = 'limit_price=?';
    $params[] = $newEntry;
    $sets[] = "order_type='LIMIT'";
  }
  if ($hasTp) {
    $sets[] = 'tp_price=?';
    $params[] = $newTp;
  }
  if ($hasSl) {
    $sets[] = 'sl_price=?';
    $params[] = $newSl;
  }
  $params[] = $orderId;
  $params[] = $uid;

  $sql = 'UPDATE orders SET ' . implode(',', $sets) . ' WHERE id=? AND user_id=?';
  $up = $pdo->prepare($sql);
  $up->execute($params);
  $pdo->commit();

  json_response(['ok' => true, 'order_id' => $orderId]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
