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
$primary = wallet_available($pdo, $uid, 'primary', $mode);
$demo = wallet_available($pdo, $uid, 'trade', 'demo');
$real = wallet_available($pdo, $uid, 'trade', 'real');

json_response([
  'ok'=>true,
  'user'=>['id'=>$uid,'uid'=>$u['uid'],'telegram_id'=>$u['telegram_id']],
  'balances'=>[
    'primary'=>$primary,
    'trade_demo'=>$demo,
    'trade_real'=>$real,
  ]
]);
