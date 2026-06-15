<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/affiliates.php';
require_once __DIR__ . '/../lib/idempotency.php';
require_once __DIR__ . '/../lib/levels.php';

require_method('POST');

$idem = idem_require('invest_subscribe');
$uid = (int)$idem['user_id'];
require_trade_allowed($uid);
require_approved_kyc($uid, 'invest');
$pdo = db();
$body = read_json_body();

$planId = (string)($body['plan_id'] ?? '');
$amount = (float)($body['amount'] ?? 0);
if ($planId === '' || $amount <= 0) json_response(['ok'=>false,'error'=>'Invalid request'], 422);

$plan = $pdo->prepare("SELECT * FROM invest_plans WHERE id=? AND status='active'");
$plan->execute([$planId]);
$p = $plan->fetch(PDO::FETCH_ASSOC);
if (!$p) json_response(['ok'=>false,'error'=>'Plan not found'], 404);

$min = (float)($p['min_amount'] ?? 0);
$max = (float)($p['max_amount'] ?? 0);
if ($amount < $min) json_response(['ok'=>false,'error'=>'Amount below minimum'], 422);
if ($max > 0 && $amount > $max) json_response(['ok'=>false,'error'=>'Amount above maximum'], 422);

$productKind = strtolower((string)($p['product_kind'] ?? 'plan'));
if (!in_array($productKind, ['plan','contract'], true)) $productKind = 'plan';
$isPerpetual = (int)($p['is_perpetual'] ?? 0) === 1;
$requiredLevelId = (int)($p['required_level_id'] ?? 0);
if ($requiredLevelId > 0) {
  $requiredLevel = vp_level_row_by_id($pdo, $requiredLevelId, 'en');
  $depositTotal = vp_user_confirmed_deposit_total($pdo, $uid);
  $requiredMin = $requiredLevel ? (float)($requiredLevel['min_deposit_total'] ?? 0) : 0.0;
  $missingDeposit = max(0.0, $requiredMin - $depositTotal);
  if (!$requiredLevel || $missingDeposit > 1e-9) {
    json_response([
      'ok'=>false,
      'error'=>'Level requirement not met',
      'error_code'=>'level_requirement_not_met',
      'required_level'=>$requiredLevel,
      'level_gate'=>[
        'locked'=>true,
        'reason'=>$requiredLevel ? 'confirmed_deposit_total_below_required_level' : 'required_level_not_found',
        'required_level_id'=>$requiredLevelId,
        'required_min_deposit_total'=>$requiredMin,
        'confirmed_deposit_total'=>$depositTotal,
        'missing_deposit_total'=>$missingDeposit,
      ],
      'confirmed_deposit_total'=>$depositTotal,
    ], 422);
  }
}

$roi = (float)($p['roi_percent'] ?? 0);
$term = (int)($p['term_days'] ?? 0);
$schedule = strtolower((string)($p['payout_schedule'] ?? 'end'));
if (!in_array($schedule, ['daily','weekly','monthly','end'], true)) $schedule = 'end';
$start = now_ts();
$cycleRoi = 0.0;
$expected = 0.0;
$end = 0;

if ($productKind === 'contract') {
  if (!$isPerpetual && $term <= 0) json_response(['ok'=>false,'error'=>'Contract duration is required'], 422);
  if ($isPerpetual && !in_array($schedule, ['daily','weekly','monthly'], true)) {
    json_response(['ok'=>false,'error'=>'Perpetual contracts require a daily, weekly, or monthly payout schedule'], 422);
  }
  $cycleRoi = $roi;
  $cycleProfit = $amount * ($cycleRoi / 100.0);
  if ($schedule === 'end') {
    $expected = $amount * (1 + $roi / 100.0);
    $end = $start + max(1, $term) * 86400;
  } else {
    if ($schedule === 'daily') $cycleDays = 1;
    elseif ($schedule === 'weekly') $cycleDays = 7;
    else $cycleDays = 30;
    if ($isPerpetual) {
      $expected = $cycleProfit;
      $end = 0;
    } else {
      $cycles = max(1, (int)floor(max(1, $term) / $cycleDays));
      $expected = $amount + ($cycleProfit * $cycles);
      $end = $start + max(1, $term) * 86400;
    }
  }
} else {
  if ($term <= 0 || $roi <= 0) json_response(['ok'=>false,'error'=>'Plan configuration is invalid'], 422);
  $expected = $amount * (1 + $roi/100.0);
  $end = $start + $term*86400;
}

$pdo->beginTransaction();
try {
  $w = ensure_wallet($uid, 'USDT');
  if (db_driver() === 'mysql') {
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$w['id']]);
  }
  $avail = wallet_available($uid, 'USDT');
  if (($avail['available'] ?? 0) + 1e-9 < $amount) throw new RuntimeException('Insufficient USDT');

  $ins = $pdo->prepare('INSERT INTO investments(user_id,plan_id,amount,expected_return,payout_schedule,status,start_at,end_at,created_at,product_kind,is_perpetual,cycle_roi_percent,required_level_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $ins->execute([$uid,$planId,$amount,$expected,$schedule,'active',$start,$end, now_ts(),$productKind,$isPerpetual ? 1 : 0,$cycleRoi,$requiredLevelId ?: null]);
  $id = (int)$pdo->lastInsertId();

  $debitLedgerId = ledger_add($uid, 'USDT', -$amount, $productKind === 'contract' ? 'contract_subscribe' : 'invest_subscribe', 'investment', (string)$id, [
    'plan_id'=>$planId,
    'product_kind'=>$productKind,
    'term_days'=>$term,
    'roi_percent'=>$roi,
    'cycle_roi_percent'=>$cycleRoi,
    'payout_schedule'=>$schedule,
    'is_perpetual'=>$isPerpetual ? 1 : 0,
  ]);
  $pdo->prepare('UPDATE investments SET debit_ledger_id=? WHERE id=? AND user_id=?')->execute([$debitLedgerId, $id, $uid]);

  $pdo->commit();

  try {
    $planName = (string)($p['name'] ?? ($p['name_en'] ?? $planId));
    aff_notify_manager_for_user($uid, $productKind === 'contract' ? 'contract_subscribed' : 'invest_subscribed', [
      'id' => $id,
      'plan' => $planName,
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => 'USDT',
      'product_kind' => $productKind,
    ]);
  } catch (Throwable $e2) {}

  $resp = ['ok'=>true,'investment_id'=>$id,'product_kind'=>$productKind,'is_perpetual'=>$isPerpetual ? 1 : 0,'required_level_id'=>$requiredLevelId ?: null];
  idem_store_response($idem['user_id'], $idem['key'], $idem['scope'], $resp);
  json_response($resp);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
}
