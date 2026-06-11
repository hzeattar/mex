<?php
require_once __DIR__ . '/_common.php';

bot_require_token();
$pdo = db();

$telegramId = $_GET['telegram_id'] ?? ($_POST['telegram_id'] ?? '');
$mode = strtolower(trim($_GET['mode'] ?? ($_POST['mode'] ?? 'demo')));
if (!in_array($mode, ['demo','real'], true)) $mode = 'demo';

$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);

$uid = (int)$u['id'];
$realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
$demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
$primary = wallet_available($uid, $demoCur);
$demo = wallet_available($uid, $demoCur);
$real = wallet_available($uid, $realCur);

json_response([
  'ok'=>true,
  'user'=>['id'=>$uid,'uid'=>$u['uid'],'telegram_id'=>$u['telegram_id']],
  'balances'=>[
    'primary'=>$primary,
    'trade_demo'=>$demo,
    'trade_real'=>$real,
  ]
]);
