<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);
require_approved_kyc($uid, 'copy');
$pdo = db();
$body = read_json_body();

$signalId = (int)($body['signal_id'] ?? 0);
$amount = (float)($body['amount'] ?? 0);
$mode = strtolower(trim((string)($body['mode'] ?? 'real')));
$mode = $mode === 'demo' ? 'demo' : 'real';
if ($mode !== 'real') json_response(['ok'=>false,'error'=>'demo_mode_locked'], 403);
if ($signalId <= 0 || !($amount > 0)) json_response(['ok'=>false,'error'=>'Invalid request'], 422);

$st = $pdo->prepare("SELECT * FROM trading_signals WHERE id=? AND status='active' AND COALESCE(bot_enabled,0)=1 AND (valid_until IS NULL OR valid_until=0 OR valid_until>=?) LIMIT 1");
$st->execute([$signalId, time()]);
$signal = $st->fetch(PDO::FETCH_ASSOC);
if (!$signal) json_response(['ok'=>false,'error'=>'Trading bot not found'], 404);

$minAmount = (float)($signal['copy_min_amount'] ?? 100);
if ($amount + 1e-9 < $minAmount) json_response(['ok'=>false,'error'=>'Amount below minimum'], 422);

$dup = $pdo->prepare("SELECT id FROM trading_bot_subscriptions WHERE user_id=? AND signal_id=? AND mode=? AND status IN ('active','armed','copied') ORDER BY id DESC LIMIT 1");
$dup->execute([$uid, $signalId, $mode]);
if ((int)($dup->fetchColumn() ?: 0) > 0) {
  json_response(['ok'=>false,'error'=>'You already have an active subscription for this Trading bot'], 409);
}

$currency = $mode === 'demo' ? (string)env('DEMO_CURRENCY', 'USDT_DEMO') : (string)env('REAL_CURRENCY', 'USDT');
$lockDays = max(0, (int)($signal['copy_lock_days'] ?? 7));
$lockUntil = $lockDays > 0 ? (time() + ($lockDays * 86400)) : null;

$pdo->beginTransaction();
try {
  $holdId = hold_create($uid, $currency, $amount, 'trading_bot_subscription', $lockUntil);
  $now = time();
  $ins = $pdo->prepare("INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,hold_id,lock_until,profit_share_pct,leverage,status,created_at,updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
  $ins->execute([
    $uid,
    $signalId,
    $mode,
    $currency,
    $amount,
    $holdId,
    $lockUntil,
    (float)($signal['copy_profit_share_pct'] ?? 0),
    max(1, (int)($signal['copy_leverage'] ?? 1)),
    'active',
    $now,
    $now,
  ]);
  $subscriptionId = (int)$pdo->lastInsertId();
  $pdo->commit();
  json_response(['ok'=>true,'subscription_id'=>$subscriptionId,'lock_until'=>$lockUntil]);
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
}
