<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/trading_bot_engine.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);
require_approved_kyc($uid, 'copy');
$pdo = db();
$body = read_json_body();

$signalId = (int)($body['signal_id'] ?? 0);
$subscriptionId = (int)($body['subscription_id'] ?? 0);
$amount = (float)($body['amount'] ?? 0);
$mode = strtolower(trim((string)($body['mode'] ?? 'demo')));
$mode = ($mode === 'real' || $mode === 'demo') ? $mode : 'demo';
if ($signalId <= 0) json_response(['ok'=>false,'error'=>'Invalid signal'], 422);

$st = $pdo->prepare("SELECT * FROM trading_signals WHERE id=? AND status='active' AND COALESCE(bot_enabled,0)=1 AND (valid_until IS NULL OR valid_until=0 OR valid_until>=?) LIMIT 1");
$st->execute([$signalId, time()]);
$signal = $st->fetch(PDO::FETCH_ASSOC);
if (!$signal) json_response(['ok'=>false,'error'=>'Trading bot not found'], 404);
$direction = strtoupper(trim((string)($signal['direction'] ?? 'BUY')));
if ($direction === 'NEUTRAL') {
  json_response([
    'ok' => false,
    'error' => 'neutral_bot_watch_only',
    'message' => 'This Avalon bot is neutral right now. Copy opens only after admin publishes BUY or SELL direction.',
  ], 422);
}

$sub = null;
if ($subscriptionId > 0) {
  $q = $pdo->prepare("SELECT * FROM trading_bot_subscriptions WHERE id=? AND user_id=? LIMIT 1");
  $q->execute([$subscriptionId, $uid]);
  $sub = $q->fetch(PDO::FETCH_ASSOC) ?: null;
}
if (!$sub) {
  $q = $pdo->prepare("SELECT * FROM trading_bot_subscriptions WHERE user_id=? AND signal_id=? AND mode=? AND status IN ('active','armed','copied') ORDER BY id DESC LIMIT 1");
  $q->execute([$uid, $signalId, $mode]);
  $sub = $q->fetch(PDO::FETCH_ASSOC) ?: null;
}
if (!$sub) {
  if (!($amount > 0)) $amount = max((float)($signal['copy_min_amount'] ?? 100), 100);
  $currency = $mode === 'demo' ? (string)env('DEMO_CURRENCY', 'USDT_DEMO') : (string)env('REAL_CURRENCY', 'USDT');
  $lockDays = max(0, (int)($signal['copy_lock_days'] ?? 7));
  $lockUntil = $lockDays > 0 ? (time() + ($lockDays * 86400)) : null;
  $pdo->beginTransaction();
  try {
    $holdId = hold_create($uid, $currency, $amount, 'trading_bot_subscription', $lockUntil);
    $now = time();
    $ins = $pdo->prepare("INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,hold_id,lock_until,profit_share_pct,leverage,status,created_at,updated_at)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    $ins->execute([$uid,$signalId,$mode,$currency,$amount,$holdId,$lockUntil,(float)($signal['copy_profit_share_pct'] ?? 0),max(1, (int)($signal['copy_leverage'] ?? 1)),'active',$now,$now]);
    $subscriptionId = (int)$pdo->lastInsertId();
    $pdo->commit();
    $q = $pdo->prepare("SELECT * FROM trading_bot_subscriptions WHERE id=? AND user_id=? LIMIT 1");
    $q->execute([$subscriptionId, $uid]);
    $sub = $q->fetch(PDO::FETCH_ASSOC) ?: null;
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
  }
}
if (!$sub) json_response(['ok'=>false,'error'=>'Subscription unavailable'], 400);
if (in_array((string)$sub['status'], ['copied'], true) && (int)($sub['copied_position_id'] ?? 0) > 0) {
  json_response([
    'ok'=>true,
    'already_copied'=>true,
    'subscription_id'=>(int)$sub['id'],
    'position_id'=>(int)$sub['copied_position_id'],
    'message'=>'This signal is already active in your copy desk',
  ]);
}

try {
  $live = tb_quote_signal_live($signal, $sub);
} catch (Throwable $e) {
  $live = 0.0;
}
if ((float)($signal['entry_price'] ?? 0) > 0 && !tb_signal_entry_ready($signal, $live)) {
  $pdo->prepare("UPDATE trading_bot_subscriptions SET status='armed', updated_at=?, entry_price_snapshot=? WHERE id=? AND user_id=?")
    ->execute([time(), (float)($signal['entry_price'] ?? 0), (int)$sub['id'], $uid]);
  json_response([
    'ok'=>true,
    'armed'=>true,
    'subscription_id'=>(int)$sub['id'],
    'entry_price'=>(float)($signal['entry_price'] ?? 0),
    'live_price'=>$live,
    'message'=>'Subscription armed until entry price is reached',
  ]);
}

$pdo->beginTransaction();
try {
  $result = tb_open_subscription($pdo, $uid, $signal, $sub);
  $pdo->commit();
  json_response(['ok'=>true] + $result + ['armed'=>false,'subscription_id'=>(int)$sub['id']]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
}
