<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/ledger.php';
require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();

$demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
$seed = (float)env('DEMO_START_BALANCE', 10000);

$pdo->beginTransaction();
try {
  // Reset ONLY the demo trading state (keep real deposits/withdrawals/investments)
  $pdo->prepare('DELETE FROM orders WHERE user_id=?')->execute([$uid]);
  $pdo->prepare('DELETE FROM positions WHERE user_id=?')->execute([$uid]);

  // Drop demo wallet + its ledger entries (FK cascade), then seed again
  $pdo->prepare('DELETE FROM wallets WHERE user_id=? AND currency=?')->execute([$uid, $demoCur]);
  $demoW = ensure_wallet($uid, $demoCur);
  $demoWid = (int)($demoW['id'] ?? 0);
  ledger_add($uid, $demoWid, $demoCur, $seed, 'seed_demo', 'user', (string)$uid, ['note'=>'Reset demo balance'], time());
  $pdo->commit();
  json_response(['ok'=>true]);
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 500);
}
