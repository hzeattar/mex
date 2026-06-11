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

$pdo->beginTransaction();
try {
  $lock = db_driver() === 'mysql' ? ' FOR UPDATE' : '';
  $st = $pdo->prepare("SELECT id, status, position_id, fill_price, closed_at FROM orders WHERE id=? AND user_id=?{$lock}");
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
      'error' => 'This order is already executed. Use Close position instead.',
      'code' => 'order_already_executed',
    ], 409);
  }

  $ts = now_ts();
  $up = $pdo->prepare("UPDATE orders SET status='canceled', close_reason='user_canceled', closed_at=?, updated_at=? WHERE id=? AND user_id=?");
  $up->execute([$ts, $ts, $orderId, $uid]);
  $pdo->commit();

  json_response(['ok' => true, 'order_id' => $orderId, 'status' => 'canceled']);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
