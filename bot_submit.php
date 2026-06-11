<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';
require_once __DIR__ . '/api/lib/ledger.php';
require_once __DIR__ . '/api/lib/crypto.php';
require_once __DIR__ . '/api/lib/affiliates.php';

require_method('POST');
$pdo = db();
$body = json_body();

$payload = (string)($body['payload'] ?? '');
$sig = (string)($body['sig'] ?? '');
$method = trim((string)($body['method_code'] ?? ''));
$proof = trim((string)($body['proof_ref'] ?? '')); // e.g. tg_photo:FILE_ID

if($payload==='' || $sig==='') json_response(['ok'=>false,'error'=>'Missing payload'], 400);

$secret = (string)env('BOT_INTENT_SECRET','change_me');
$calc = hash_hmac('sha256', $payload, $secret);
if(!hash_equals($calc, $sig)) json_response(['ok'=>false,'error'=>'Bad signature'], 403);

$data = json_decode(base64_decode($payload, true) ?: '', true);
if(!is_array($data)) json_response(['ok'=>false,'error'=>'Bad payload'], 400);

$kind = strtolower(trim((string)($data['kind'] ?? '')));
$amount = (float)($data['amount'] ?? 0);
$user_id = (int)($data['user_id'] ?? 0);
$currency = (string)($data['currency'] ?? 'USDT');
$ts = (int)($data['ts'] ?? 0);

if(!in_array($kind,['deposit','withdraw'],true)) json_response(['ok'=>false,'error'=>'Invalid kind'], 400);
if(!($amount>0) || $user_id<=0) json_response(['ok'=>false,'error'=>'Invalid amount/user'], 400);
if($ts>0 && abs(time()-$ts) > 3600) json_response(['ok'=>false,'error'=>'Expired'], 400);

$now = time();
if($kind==='deposit'){
  $st = $pdo->prepare("INSERT INTO deposits (user_id, provider, method_code, currency, amount, status, external_ref, created_at, updated_at) VALUES (?,?,?,?,?,'pending',?,?,?)");
  $st->execute([$user_id,'bot', $method ?: null, $currency, $amount, $proof ?: null, $now, $now]);
  $id = (int)$pdo->lastInsertId();
  // Notify manager (best effort)
  try {
    aff_notify_manager_for_user($user_id, 'dep_created', [
      'id' => $id,
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => strtoupper((string)$currency),
    ]);
  } catch (Throwable $e2) {}
  json_response(['ok'=>true,'id'=>$id,'kind'=>'deposit']);
}else{
  // Withdrawals must create a HOLD to prevent double-spend.
  // Destination may be present in payload, otherwise we store proof_ref as a placeholder.
  $destination = trim((string)($data['destination'] ?? ''));
  if ($destination === '' && $proof !== '') $destination = $proof;
  if ($destination === '') json_response(['ok'=>false,'error'=>'Missing destination/proof'], 422);

  $pdo->beginTransaction();
  try {
    $holdId = hold_create($user_id, $currency, $amount, 'withdraw_request', time()+3600);
    $enc = crypto_encrypt($destination);
    $st = $pdo->prepare("INSERT INTO withdrawals (user_id, method, currency, amount, status, destination_enc, hold_id, risk_score, created_at, updated_at) VALUES (?,?,?,?, 'requested', ?, ?, 0, ?, ?)");
    $st->execute([$user_id, $method ?: 'bot', $currency, $amount, $enc, $holdId, $now, $now]);
    $id = (int)$pdo->lastInsertId();
    $pdo->commit();
    // Notify manager (best effort)
    try {
      aff_notify_manager_for_user($user_id, 'wdr_created', [
        'id' => $id,
        'amount' => number_format($amount, 2, '.', ''),
        'cur' => strtoupper((string)$currency),
      ]);
    } catch (Throwable $e2) {}
    json_response(['ok'=>true,'id'=>$id,'kind'=>'withdraw']);
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    try { if (!empty($holdId)) hold_release((int)$holdId, 'released'); } catch(Throwable $ignored) {}
    json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
  }
}
