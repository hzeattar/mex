<?php
require_once __DIR__ . '/_common.php';

bot_require_token();
$pdo = db();

$telegramId = $_GET['telegram_id'] ?? ($_POST['telegram_id'] ?? '');
$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);
$uid = (int)$u['id'];

$plans = $pdo->query("SELECT id,name,term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,status FROM invest_plans WHERE status='active' ORDER BY sort_order ASC, term_days ASC LIMIT 50")->fetchAll() ?: [];

$st = $pdo->prepare("SELECT i.id,i.plan_id,i.amount,i.expected_return,i.paid_total,i.status,i.start_at,i.end_at, p.name AS plan_name, p.term_days, p.roi_percent FROM investments i LEFT JOIN invest_plans p ON p.id=i.plan_id WHERE i.user_id=? ORDER BY i.id DESC LIMIT 50");
$st->execute([$uid]);
$mine = $st->fetchAll() ?: [];

json_response([
  'ok'=>true,
  'plans'=>$plans,
  'my_investments'=>$mine,
]);
