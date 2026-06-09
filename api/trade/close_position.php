<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/trade_close.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$body = read_json_body();
$id = (int)($_GET['id'] ?? ($body['id'] ?? ($body['position_id'] ?? ($body['positionId'] ?? 0))));

try {
  $res = trade_close_position(db(), $uid, $id, [
    'qty' => (float)($body['qty'] ?? 0),
    'reason' => 'manual',
  ]);
  json_response($res);
} catch (TradeCloseException $e) {
  $payload = [
    'ok' => false,
    'error' => $e->getMessage(),
    'code' => $e->publicCode,
  ];
  if ($e->context) $payload['context'] = $e->context;
  json_response($payload, $e->httpStatus);
} catch (Throwable $e) {
  try { tp_log('trade', 'ERROR', 'close_position_failed', ['error' => $e->getMessage(), 'position_id' => $id]); } catch (Throwable $ignored) {}
  json_response(['ok' => false, 'error' => 'Could not close this position now.', 'code' => 'close_failed'], 500);
}
