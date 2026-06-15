<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/idempotency.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/affiliates.php';
require_once __DIR__ . '/../lib/user_notifications.php';

require_method('POST');
$idem = idem_require('deposit_create');
$uid = (int)$idem['user_id'];
require_deposit_allowed($uid);
require_approved_kyc($uid, 'deposit');

$pdo = db();
$body = read_json_body();
$provider = strtolower(trim((string)($body['provider'] ?? 'manual')));
$method = strtolower(trim((string)($body['method'] ?? '')));
$currency = strtoupper(trim((string)($body['currency'] ?? 'USDT')));
$amount = (float)($body['amount'] ?? 0);
$details = $body['details'] ?? [];
if (!is_array($details)) $details = [];

if ($amount <= 0) {
  $resp = ['ok'=>false,'error'=>'Invalid amount'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

if ($method === '') {
  $resp = ['ok'=>false,'error'=>'Payment method required'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}
$st = $pdo->prepare("SELECT code, provider, currency, min_amount, max_amount, status, instructions_en, instructions_ar, instructions_ru, title_en, title_ar, title_ru, checkout_label, account_scope FROM payment_methods WHERE kind='deposit' AND code=? LIMIT 1");
$st->execute([$method]);
$pm = $st->fetch(PDO::FETCH_ASSOC);
$accountScope = strtolower(trim((string)($pm['account_scope'] ?? 'real')));
if ($pm && !in_array($accountScope, ['real','both'], true)) {
  $resp = ['ok'=>false,'error'=>'payment_scope_locked']; idem_store_response($uid, $idem['key'], $idem['scope'], $resp); json_response($resp, 403);
}
if (!$pm || ($pm['status'] ?? '') !== 'active') {
  $resp = ['ok'=>false,'error'=>'Payment method not available'];
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
if (!empty($pm['provider'])) {
  $provider = strtolower((string)$pm['provider']);
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

$now = time();
$external = 'DEP-' . strtoupper(bin2hex(random_bytes(5)));

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare('INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,external_ref,details_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  $stmt->execute([$uid,$provider,$method,$currency,$amount,'pending',$external,json_encode($details, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$now,$now]);
  $id = (int)$pdo->lastInsertId();
  $pdo->commit();

  user_notify_funding_status($uid, 'deposit', $amount, $currency, 'pending', $id);

  try {
    aff_notify_manager_for_user($uid, 'dep_created', [
      'id' => $id,
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => $currency,
    ]);
  } catch (Throwable $e2) {}

  $resp = [
    'ok'=>true,
    'deposit'=>[
      'id'=>$id,
      'provider'=>$provider,
      'method'=>$method,
      'currency'=>$currency,
      'amount'=>$amount,
      'status'=>'pending',
      'external_ref'=>$external,
    ],
    'instructions'=>[
      'title'=>$title,
      'details'=>$instructions !== '' ? $instructions : 'Your transfer confirmation was received and is now being processed.',
      'button_label'=>(string)($pm['checkout_label'] ?? ''),
    ]
  ];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  $resp = ['ok'=>false,'error'=>$e->getMessage()];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 500);
}
