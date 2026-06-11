<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/idempotency.php';
require_once __DIR__ . '/api/lib/ledger.php';
require_once __DIR__ . '/api/lib/crypto.php';
require_once __DIR__ . '/api/lib/affiliates.php';

require_method('POST');
$idem = idem_require('withdraw_create');
$uid = (int)$idem['user_id'];

$pdo = db();
$body = read_json_body();
$method = strtolower(trim((string)($body['method'] ?? '')));
$currency = strtoupper(trim((string)($body['currency'] ?? 'USDT')));
$amount = (float)($body['amount'] ?? 0);
$details = $body['details'] ?? [];
if (!is_array($details)) $details = [];
$destination = trim((string)($body['destination'] ?? ($details['destination'] ?? $details['wallet_address'] ?? $details['bank_account'] ?? '')));

// Keep sensitive payout destination encrypted only in destination_enc.
// details_json remains for non-sensitive notes/metadata shown in admin UI.
$sensitiveDetailKeys = ['destination','wallet_address','bank_account','iban','card_number','account_number','routing_number','swift','bank_iban','crypto_address'];
foreach ($sensitiveDetailKeys as $sKey) {
  if (array_key_exists($sKey, $details)) unset($details[$sKey]);
}

if ($amount <= 0 || $destination === '') {
  $resp = ['ok'=>false,'error'=>'Invalid request'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

require_withdraw_allowed($uid);

$kycFlag = $pdo->prepare('SELECT enabled FROM feature_flags WHERE flag_key=?');
$kycFlag->execute(['kyc_required_withdraw']);
$kycRequired = (int)($kycFlag->fetchColumn() ?: 0);
if ($kycRequired === 1) {
  require_approved_kyc($uid, 'withdraw');
  $kyc = $pdo->prepare('SELECT status FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
  $kyc->execute([$uid]);
  $kycStatus = (string)($kyc->fetchColumn() ?: 'none');
  if ($kycStatus !== 'approved') {
    $resp = ['ok'=>false,'error'=>'KYC required'];
    idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
    json_response($resp, 403);
  }
}

$st = $pdo->prepare("SELECT code, currency, min_amount, max_amount, status, instructions_en, instructions_ar, instructions_ru, title_en, title_ar, title_ru, account_scope FROM payment_methods WHERE kind='withdraw' AND code=? LIMIT 1");
$st->execute([$method]);
$pm = $st->fetch(PDO::FETCH_ASSOC);
$accountScope = strtolower(trim((string)($pm['account_scope'] ?? 'real')));
if ($pm && !in_array($accountScope, ['real','both'], true)) {
  $resp = ['ok'=>false,'error'=>'payment_scope_locked']; idem_store_response($uid, $idem['key'], $idem['scope'], $resp); json_response($resp, 403);
}
if (!$pm || ($pm['status'] ?? '') !== 'active') {
  $resp = ['ok'=>false,'error'=>'Withdrawal method not available'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}
if (strtoupper((string)$pm['currency']) !== $currency) {
  $resp = ['ok'=>false,'error'=>'Currency not supported for this method'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}
$min = (float)($pm['min_amount'] ?? 0);
$max = (float)($pm['max_amount'] ?? 0);
if ($amount + 1e-9 < $min) {
  $resp = ['ok'=>false,'error'=>'Amount below minimum'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}
if ($max > 0 && $amount - 1e-9 > $max) {
  $resp = ['ok'=>false,'error'=>'Amount above maximum'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

$lang = 'en';
try {
  $u = $pdo->prepare('SELECT locale FROM users WHERE id=? LIMIT 1');
  $u->execute([$uid]);
  $lang = strtolower((string)($u->fetchColumn() ?: 'en'));
} catch (Throwable $e) {}
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
$instructions = (string)($pm['instructions_en'] ?? '');
$title = (string)($pm['title_en'] ?? $method);
if ($lang === 'ar') { $instructions = (string)(($pm['instructions_ar'] ?? '') ?: $instructions); $title = (string)(($pm['title_ar'] ?? '') ?: $title); }
if ($lang === 'ru') { $instructions = (string)(($pm['instructions_ru'] ?? '') ?: $instructions); $title = (string)(($pm['title_ru'] ?? '') ?: $title); }

$pdo->beginTransaction();
try {
  $holdId = hold_create($uid, $currency, $amount, 'withdraw_request', time()+3600);
  $enc = crypto_encrypt($destination);
  $now = time();
  $stmt = $pdo->prepare('INSERT INTO withdrawals(user_id,method,currency,amount,status,destination_enc,details_json,hold_id,risk_score,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  $stmt->execute([$uid,$method,$currency,$amount,'requested',$enc,json_encode($details, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$holdId,0,$now,$now]);
  $wid = (int)$pdo->lastInsertId();
  $pdo->commit();

  try {
    aff_notify_manager_for_user($uid, 'wdr_created', [
      'id' => $wid,
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => $currency,
    ]);
  } catch (Throwable $e2) {}

  $resp = ['ok'=>true,'withdrawal'=>['id'=>$wid,'status'=>'requested','amount'=>$amount,'currency'=>$currency],'instructions'=>['title'=>$title,'details'=>$instructions ?: 'Your withdrawal request was received and is now being processed.']];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  $msg = (string)($e->getMessage() ?: '');
  if (stripos($msg, 'Insufficient available balance') !== false) {
    $av = wallet_available($uid, $currency);
    $available = (float)($av['available'] ?? 0);
    $resp = ['ok'=>false,'error'=>'insufficient_funds','code'=>'INSUFFICIENT_BALANCE','available'=>$available,'currency'=>$currency];
    idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
    json_response($resp, 400);
  }
  $resp = ['ok'=>false,'error'=>$msg];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 400);
}
