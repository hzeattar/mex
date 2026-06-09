<?php
require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../api/lib/ledger.php';

bot_require_token();
$pdo = db();

$telegramId = $_POST['telegram_id'] ?? ($_GET['telegram_id'] ?? '');
$amount = (float)($_POST['amount'] ?? ($_GET['amount'] ?? 0));
$currency = strtoupper(trim((string)($_POST['currency'] ?? ($_GET['currency'] ?? 'USDT'))));
$method = trim((string)($_POST['method'] ?? ($_GET['method'] ?? 'BOT')));
$note = trim((string)($_POST['note'] ?? ($_GET['note'] ?? '')));
$mode = strtolower(trim((string)($_POST['mode'] ?? ($_GET['mode'] ?? 'real'))));
if (!in_array($mode, ['demo','real'], true)) $mode = 'real';

if ($amount <= 0) json_response(['ok'=>false,'error'=>'Invalid amount'], 422);

$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);

$uid = (int)$u['id'];
$ref = 'BOT-' . bin2hex(random_bytes(8));

$pdo->beginTransaction();
try {
  $st = $pdo->prepare("INSERT INTO deposits (user_id,amount,currency,method,status,reference,meta_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))");
  $meta = json_encode([
    'source'=>'telegram-bot',
    'telegram_id'=>$u['telegram_id'],
    'telegram_username'=>$u['telegram_username'] ?? null,
    'note'=>$note,
    'mode'=>$mode,
  ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  $st->execute([$uid, $amount, $currency, $method, 'pending', $ref, $meta]);
  $pdo->commit();
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok'=>false,'error'=>'Could not create deposit: '.$e->getMessage()], 500);
}

json_response(['ok'=>true,'reference'=>$ref,'status'=>'pending']);
