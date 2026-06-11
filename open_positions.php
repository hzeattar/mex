<?php
require_once __DIR__ . '/_common.php';

bot_require_token();
$pdo = db();

$telegramId = $_GET['telegram_id'] ?? ($_POST['telegram_id'] ?? '');
$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);
$uid = (int)$u['id'];

$st = $pdo->prepare('SELECT id,symbol,side,qty,entry_price,leverage,market_type,margin_mode,unrealized_pnl_usd,opened_at,updated_at FROM positions WHERE user_id=? AND status=\'open\' ORDER BY updated_at DESC LIMIT 50');
$st->execute([$uid]);
$rows = $st->fetchAll() ?: [];

$out = [];
foreach ($rows as $r) {
  $out[] = [
    'id'=>(int)$r['id'],
    'symbol'=>(string)$r['symbol'],
    'side'=>(string)$r['side'],
    'qty'=>(float)$r['qty'],
    'entry_price'=>(float)$r['entry_price'],
    'leverage'=>(int)$r['leverage'],
    'market_type'=>(string)$r['market_type'],
    'margin_mode'=>(string)$r['margin_mode'],
    'unrealized_pnl_usd'=>(float)$r['unrealized_pnl_usd'],
    'opened_at'=>(string)$r['opened_at'],
    'updated_at'=>(string)$r['updated_at'],
  ];
}

json_response(['ok'=>true,'count'=>count($out),'positions'=>$out]);
