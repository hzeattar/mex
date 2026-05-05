<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('POST');
$uid = require_auth();
require_account_active($uid);

$in = json_input();
$direction = strtolower((string)($in['direction'] ?? 'demo_to_real'));
$amount = (float)($in['amount'] ?? 0);

if ($amount <= 0) {
  json_response(['ok'=>false,'error'=>'amount_invalid'], 400);
}

$realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
$demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));

if (!in_array($direction, ['demo_to_real','real_to_demo'], true)) {
  json_response(['ok'=>false,'error'=>'direction_invalid'], 400);
}

// By default, only allow demo -> real (as requested). Reverse can be enabled later.
if ($direction === 'real_to_demo' && (string)env('ALLOW_REAL_TO_DEMO', '') !== '1') {
  json_response(['ok'=>false,'error'=>'direction_disabled'], 403);
}

$fromCur = $direction === 'demo_to_real' ? $demoCur : $realCur;
$toCur   = $direction === 'demo_to_real' ? $realCur : $demoCur;

$avail = wallet_available($uid, $fromCur);
$available = (float)($avail['available'] ?? 0);
if ($available + 1e-9 < $amount) {
  json_response(['ok'=>false,'error'=>'insufficient_funds','available'=>$available], 400);
}

$pdo = db();
$pdo->beginTransaction();
try {
  $fromW = ensure_wallet($uid, $fromCur);
  $toW   = ensure_wallet($uid, $toCur);
  $fromWid = (int)($fromW['id'] ?? 0);
  $toWid   = (int)($toW['id'] ?? 0);

  if (db_driver() === 'mysql') {
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$fromWid]);
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$toWid]);
  }

  $now = time();
  $type = $direction === 'demo_to_real' ? 'transfer_demo_to_real' : 'transfer_real_to_demo';
  $meta = ['direction'=>$direction,'note'=>'user initiated'];

  ledger_add($uid, $fromWid, $fromCur, -$amount, $type, 'transfer', null, $meta, $now);
  ledger_add($uid, $toWid, $toCur, +$amount, $type, 'transfer', null, $meta, $now);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok'=>false,'error'=>'transfer_failed'], 500);
}

json_response(['ok'=>true]);
