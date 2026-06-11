<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/trade_close.php';

require_method('POST');
$uid = require_auth();
$body = read_json_body();
$subscriptionId = (int)($body['subscription_id'] ?? ($body['id'] ?? 0));
if ($subscriptionId <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid subscription id', 'code' => 'invalid_subscription_id'], 422);
}

$pdo = db();
$st = $pdo->prepare('SELECT * FROM trading_bot_subscriptions WHERE id=? AND user_id=? LIMIT 1');
$st->execute([$subscriptionId, $uid]);
$sub = $st->fetch(PDO::FETCH_ASSOC);
if (!$sub) {
  json_response(['ok' => false, 'error' => 'Copy subscription not found', 'code' => 'subscription_not_found'], 404);
}

require_trade_allowed($uid);
require_approved_kyc($uid, 'copy');

$positionIds = [];
try {
  if (schema_table_exists($pdo, 'positions', db_driver())) {
    $parts = [];
    $params = [$uid];
    if (schema_column_exists($pdo, 'positions', 'copy_subscription_id', db_driver())) {
      $parts[] = 'copy_subscription_id=?';
      $params[] = $subscriptionId;
    }
    $copiedPositionId = (int)($sub['copied_position_id'] ?? 0);
    if ($copiedPositionId > 0) {
      $parts[] = 'id=?';
      $params[] = $copiedPositionId;
    }
    if ($parts) {
      $sql = "SELECT id FROM positions WHERE user_id=? AND status='open' AND (" . implode(' OR ', $parts) . ') ORDER BY id DESC';
      $ps = $pdo->prepare($sql);
      $ps->execute($params);
      foreach (($ps->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
        $pid = (int)($row['id'] ?? 0);
        if ($pid > 0) $positionIds[] = $pid;
      }
    }
  }
} catch (Throwable $e) {
  try { tp_log('trade', 'ERROR', 'copy_cancel_positions_lookup_failed', ['subscription_id' => $subscriptionId, 'error' => $e->getMessage()]); } catch (Throwable $ignored) {}
}

$positionIds = array_values(array_unique($positionIds));
$closed = [];
$failed = [];

foreach ($positionIds as $pid) {
  try {
    $closed[] = trade_close_position($pdo, $uid, $pid, ['reason' => 'copy_cancel']);
  } catch (TradeCloseException $e) {
    $failed[] = [
      'position_id' => $pid,
      'code' => $e->publicCode,
      'error' => $e->getMessage(),
    ];
  } catch (Throwable $e) {
    $failed[] = [
      'position_id' => $pid,
      'code' => 'close_failed',
      'error' => 'Could not close this copied position now.',
    ];
    try { tp_log('trade', 'ERROR', 'copy_cancel_close_failed', ['subscription_id' => $subscriptionId, 'position_id' => $pid, 'error' => $e->getMessage()]); } catch (Throwable $ignored) {}
  }
}

if ($failed) {
  json_response([
    'ok' => false,
    'code' => 'copy_cancel_partial_failed',
    'error' => 'Some copied positions could not be closed because a live price is unavailable.',
    'closed_positions' => $closed,
    'failed_positions' => $failed,
  ], 409);
}

$now = time();
try {
  $holdId = (int)($sub['hold_id'] ?? 0);
  if (!$positionIds && $holdId > 0) hold_release($holdId, 'cancelled');
  $newStatus = $positionIds ? 'closed' : 'canceled';
  $pdo->prepare("UPDATE trading_bot_subscriptions SET status=?, hold_id=NULL, updated_at=? WHERE id=? AND user_id=?")
      ->execute([$newStatus, $now, $subscriptionId, $uid]);
} catch (Throwable $e) {
  try { tp_log('trade', 'ERROR', 'copy_cancel_status_update_failed', ['subscription_id' => $subscriptionId, 'error' => $e->getMessage()]); } catch (Throwable $ignored) {}
  json_response(['ok' => false, 'error' => 'Copy was closed but status update failed.', 'code' => 'status_update_failed'], 500);
}

json_response([
  'ok' => true,
  'subscription_id' => $subscriptionId,
  'status' => $positionIds ? 'closed' : 'canceled',
  'closed_count' => count($closed),
  'closed_positions' => $closed,
]);
