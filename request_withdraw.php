<?php
require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/api/lib/crypto.php';
require_once __DIR__ . '/api/lib/ledger.php';

bot_require_token();
$pdo = db();

$telegramId = $_POST['telegram_id'] ?? ($_GET['telegram_id'] ?? '');
$amount = (float)($_POST['amount'] ?? ($_GET['amount'] ?? 0));
$currency = strtoupper(trim((string)($_POST['currency'] ?? ($_GET['currency'] ?? 'USDT'))));
$method = trim((string)($_POST['method'] ?? ($_GET['method'] ?? 'BOT')));
$address = trim((string)($_POST['address'] ?? ($_GET['address'] ?? '')));
$network = trim((string)($_POST['network'] ?? ($_GET['network'] ?? '')));
$note = trim((string)($_POST['note'] ?? ($_GET['note'] ?? '')));

if ($amount <= 0) json_response(['ok'=>false,'error'=>'Invalid amount'], 422);
if ($address === '') json_response(['ok'=>false,'error'=>'Missing address'], 422);

$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);
$uid = (int)$u['id'];

// Check sufficient available balance before creating the withdrawal
$avail = wallet_available($uid, $currency);
if (($avail['available'] ?? 0) + 1e-9 < $amount) {
  json_response(['ok'=>false,'error'=>'Insufficient available balance','available'=>(float)($avail['available'] ?? 0),'currency'=>$currency], 400);
}

$ref = 'BOT-' . bin2hex(random_bytes(8));
$payload = [
  'address'=>$address,
  'network'=>$network,
  'note'=>$note,
  'source'=>'telegram-bot',
  'ref'=>$ref,
];
$destEnc = crypto_encrypt(json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));

$now = time();
$adminNote = 'Requested via bot. Ref: '.$ref;

$pdo->beginTransaction();
try {
  // Create a hold to reserve the funds so the user cannot double-spend
  $holdId = hold_create($uid, $currency, $amount, 'withdraw_request', $now + 3600);

  $st = $pdo->prepare("INSERT INTO withdrawals (user_id,method,currency,amount,status,destination_enc,hold_id,risk_score,admin_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  $st->execute([$uid,$method,$currency,$amount,'pending',$destEnc,$holdId,0,$adminNote,$now,$now]);
  $pdo->commit();
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok'=>false,'error'=>'Could not create withdrawal: '.$e->getMessage()], 500);
}

json_response(['ok'=>true,'reference'=>$ref,'status'=>'pending']);
