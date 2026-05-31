<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/idempotency.php';
require_once __DIR__ . '/../lib/stripe_bootstrap.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('POST');

$idem = idem_require('deposit_stripe_checkout');
$uid = (int)$idem['user_id'];
require_deposit_allowed($uid);
require_approved_kyc($uid, 'deposit');
stripe_require_ready();

$pdo = db();
$body = read_json_body();
$method = strtolower(trim((string)($body['method'] ?? 'stripe_card')));
$currency = strtoupper(trim((string)($body['currency'] ?? env('REAL_CURRENCY', 'USDT'))));
$amount = (float)($body['amount'] ?? 0);
$details = $body['details'] ?? [];
if (!is_array($details)) $details = [];

if ($amount <= 0) {
  $resp = ['ok' => false, 'error' => 'Invalid amount'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

$st = $pdo->prepare("SELECT * FROM payment_methods WHERE kind='deposit' AND code=? LIMIT 1");
$st->execute([$method]);
$pm = $st->fetch(PDO::FETCH_ASSOC);
if (!$pm || strtolower((string)($pm['status'] ?? '')) !== 'active' || strtolower((string)($pm['provider'] ?? '')) !== 'stripe') {
  $resp = ['ok' => false, 'error' => 'Stripe payment method not available'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

$accountScope = strtolower(trim((string)($pm['account_scope'] ?? 'real')));
if (!in_array($accountScope, ['real', 'both'], true)) {
  $resp = ['ok' => false, 'error' => 'payment_scope_locked'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 403);
}

$pmCurrency = strtoupper((string)($pm['currency'] ?? 'USDT'));
if ($pmCurrency !== $currency) {
  $resp = ['ok' => false, 'error' => 'Currency not supported for this method'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

$min = (float)($pm['min_amount'] ?? 0);
$max = (float)($pm['max_amount'] ?? 0);
if ($amount + 1e-9 < $min) {
  $resp = ['ok' => false, 'error' => 'Amount below minimum'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}
if ($max > 0 && $amount - 1e-9 > $max) {
  $resp = ['ok' => false, 'error' => 'Amount above maximum'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 422);
}

$now = time();
$externalRef = 'STRIPE-' . strtoupper(bin2hex(random_bytes(6)));
$details['payment_provider'] = 'stripe';
$details['checkout_status'] = 'created';
$details['stripe_currency'] = stripe_checkout_currency();
$details['stripe_amount_minor'] = stripe_amount_to_minor_units($amount);

try {
  $pdo->beginTransaction();
  $ins = $pdo->prepare('INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,external_ref,details_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  $ins->execute([
    $uid,
    'stripe',
    $method,
    $currency,
    $amount,
    'pending',
    $externalRef,
    json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    $now,
    $now,
  ]);
  $depositId = (int)$pdo->lastInsertId();
  $pdo->commit();
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  $resp = ['ok' => false, 'error' => 'Could not create deposit'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 500);
}

$appUrl = stripe_app_url();
$checkoutCurrency = stripe_checkout_currency();
$amountMinor = stripe_amount_to_minor_units($amount);

try {
  $session = \Stripe\Checkout\Session::create([
    'mode' => 'payment',
    'client_reference_id' => $externalRef,
    'success_url' => $appUrl . '/app.php#/wallet?stripe=success&deposit=' . $depositId,
    'cancel_url' => $appUrl . '/app.php#/deposit?stripe=cancel&deposit=' . $depositId,
    'line_items' => [[
      'quantity' => 1,
      'price_data' => [
        'currency' => $checkoutCurrency,
        'unit_amount' => $amountMinor,
        'product_data' => [
          'name' => 'MEX Group account funding',
          'description' => 'MEX Group ' . $currency . ' live wallet deposit #' . $depositId,
        ],
      ],
    ]],
    'metadata' => [
      'deposit_id' => (string)$depositId,
      'user_id' => (string)$uid,
      'external_ref' => $externalRef,
      'wallet_currency' => $currency,
      'method_code' => $method,
    ],
  ], [
    'idempotency_key' => 'vp_deposit_' . $depositId,
  ]);

  $stripeDetails = $details;
  $stripeDetails['stripe_session_id'] = (string)$session->id;
  $stripeDetails['stripe_checkout_url'] = (string)$session->url;
  $stripeDetails['checkout_status'] = 'open';
  $upd = $pdo->prepare('UPDATE deposits SET external_ref=?, details_json=?, updated_at=? WHERE id=?');
  $upd->execute([
    (string)$session->id,
    json_encode($stripeDetails, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    time(),
    $depositId,
  ]);

  $resp = [
    'ok' => true,
    'provider' => 'stripe',
    'checkout_url' => (string)$session->url,
    'session_id' => (string)$session->id,
    'deposit' => [
      'id' => $depositId,
      'provider' => 'stripe',
      'method' => $method,
      'currency' => $currency,
      'amount' => $amount,
      'status' => 'pending',
      'external_ref' => (string)$session->id,
    ],
  ];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp);
} catch (Throwable $e) {
  try {
    $failDetails = $details;
    $failDetails['checkout_status'] = 'failed_to_create';
    $failDetails['stripe_error'] = $e->getMessage();
    $upd = $pdo->prepare("UPDATE deposits SET status='failed', details_json=?, updated_at=? WHERE id=? AND status='pending'");
    $upd->execute([json_encode($failDetails, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), time(), $depositId]);
  } catch (Throwable $ignored) {}

  $resp = ['ok' => false, 'error' => 'Could not start Stripe Checkout'];
  idem_store_response($uid, $idem['key'], $idem['scope'], $resp);
  json_response($resp, 502);
}
