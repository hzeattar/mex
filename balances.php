<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/ledger.php';

$uid = require_auth();
$pdo = db();
$stmt = $pdo->prepare('SELECT currency FROM wallets WHERE user_id=?');
$stmt->execute([$uid]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
if (!$rows) {
  ensure_wallet($uid,'USDT');
  $stmt->execute([$uid]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}
$out = [];
foreach ($rows as $r) {
  $cur = strtoupper((string)$r['currency']);
  $out[$cur] = wallet_available($uid, $cur);
}
json_response(['ok'=>true,'balances'=>$out]);
