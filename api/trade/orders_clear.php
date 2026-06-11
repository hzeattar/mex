<?php
require_once __DIR__ . '/../lib/common.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();
$body = read_json_body();

$symbol = strtoupper(trim((string)($body['symbol'] ?? '')));
$side   = strtoupper(trim((string)($body['side'] ?? '')));

$where = 'user_id=?';
$params = [$uid];

if ($symbol !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $symbol)) {
  $where .= ' AND symbol=?';
  $params[] = $symbol;
}

if ($side === 'BUY' || $side === 'SELL') {
  $where .= ' AND side=?';
  $params[] = $side;
}

$st = $pdo->prepare("DELETE FROM orders WHERE $where");
$st->execute($params);

json_response(['ok'=>true,'deleted'=>$st->rowCount()]);
