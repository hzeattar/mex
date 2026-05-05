<?php
require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../lib/symbols.php';

bot_require_token();
$pdo = db();

$telegramId = $_GET['telegram_id'] ?? ($_POST['telegram_id'] ?? '');
$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);
$uid = (int)$u['id'];

$st = $pdo->prepare('SELECT id,symbol,side,qty,entry_price,mark_price,leverage,market_type,mode,opened_at,updated_at FROM positions WHERE user_id=? AND status=\'open\' ORDER BY updated_at DESC LIMIT 50');
$st->execute([$uid]);
$rows = $st->fetchAll() ?: [];

$out = [];
foreach ($rows as $r) {
  $symUi = strip_store_symbol((string)$r['symbol']);
  $out[] = [
    'id'=>(int)$r['id'],
    'symbol'=>$symUi,
    'side'=>(string)$r['side'],
    'qty'=>(float)$r['qty'],
    'entry_price'=>(float)$r['entry_price'],
    'mark_price'=>(float)$r['mark_price'],
    'leverage'=>(int)$r['leverage'],
    'market_type'=>(string)$r['market_type'],
    'mode'=>(string)$r['mode'],
    'opened_at'=>(string)$r['opened_at'],
    'updated_at'=>(string)$r['updated_at'],
  ];
}

json_response(['ok'=>true,'count'=>count($out),'positions'=>$out]);
