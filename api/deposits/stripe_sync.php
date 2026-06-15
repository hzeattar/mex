<?php
declare(strict_types=1);

/**
 * Reconcile a Stripe Checkout deposit directly against the Stripe API.
 * Used as a fallback when the user returns from Checkout (stripe=success)
 * so funds are credited even if the webhook has not been configured yet.
 */

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/stripe_bootstrap.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/user_notifications.php';

require_method('POST');
$uid = require_auth();

$body = read_json_body();
$depositId = (int)($body['deposit_id'] ?? 0);
if ($depositId <= 0) json_response(['ok' => false, 'error' => 'Invalid deposit id'], 422);

$pdo = db();
$st = $pdo->prepare("SELECT * FROM deposits WHERE id=? AND user_id=? AND provider='stripe' LIMIT 1");
$st->execute([$depositId, $uid]);
$dep = $st->fetch(PDO::FETCH_ASSOC);
if (!$dep) json_response(['ok' => false, 'error' => 'Deposit not found'], 404);

$status = strtolower((string)($dep['status'] ?? 'pending'));
if (in_array($status, ['confirmed', 'completed', 'paid', 'approved'], true)) {
  json_response(['ok' => true, 'status' => 'confirmed']);
}
if ($status !== 'pending') {
  json_response(['ok' => true, 'status' => $status]);
}

$details = [];
if (!empty($dep['details_json'])) {
  $decoded = json_decode((string)$dep['details_json'], true);
  if (is_array($decoded)) $details = $decoded;
}

$sessionId = (string)($details['stripe_session_id'] ?? '');
if ($sessionId === '' && str_starts_with((string)($dep['external_ref'] ?? ''), 'cs_')) {
  $sessionId = (string)$dep['external_ref'];
}
if ($sessionId === '') json_response(['ok' => false, 'error' => 'No Stripe session for this deposit'], 422);

stripe_require_ready();

try {
  $session = \Stripe\Checkout\Session::retrieve($sessionId);
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => 'Could not verify payment with Stripe'], 502);
}

$paymentStatus = strtolower((string)($session->payment_status ?? ''));
$sessionStatus = strtolower((string)($session->status ?? ''));
$amountTotal = isset($session->amount_total) ? (int)$session->amount_total : 0;
$now = time();

$details['stripe_session_id'] = $sessionId;
$details['stripe_payment_status'] = $paymentStatus;
$details['stripe_amount_total'] = $amountTotal;
$details['stripe_payment_intent'] = (string)($session->payment_intent ?? '');
$details['reconciled_via'] = 'stripe_sync';

try {
  $pdo->beginTransaction();

  if ($sessionStatus === 'expired') {
    $details['checkout_status'] = 'expired';
    $upd = $pdo->prepare("UPDATE deposits SET status='failed', details_json=?, updated_at=? WHERE id=? AND status='pending'");
    $upd->execute([json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
    $changedRows = $upd->rowCount();
    $pdo->commit();
    if ($changedRows > 0) user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'failed', $depositId);
    json_response(['ok' => true, 'status' => 'failed']);
  }

  if ($paymentStatus !== 'paid') {
    $details['checkout_status'] = 'awaiting_payment';
    $upd = $pdo->prepare('UPDATE deposits SET details_json=?, updated_at=? WHERE id=?');
    $upd->execute([json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
    $pdo->commit();
    json_response(['ok' => true, 'status' => 'awaiting_payment']);
  }

  $expectedMinor = stripe_amount_to_minor_units((float)$dep['amount']);
  if ($amountTotal > 0 && $expectedMinor > 0 && abs($amountTotal - $expectedMinor) > 1) {
    $details['checkout_status'] = 'amount_mismatch';
    $upd = $pdo->prepare("UPDATE deposits SET status='failed', details_json=?, updated_at=? WHERE id=? AND status='pending'");
    $upd->execute([json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
    $changedRows = $upd->rowCount();
    $pdo->commit();
    if ($changedRows > 0) user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'failed', $depositId);
    json_response(['ok' => false, 'error' => 'Stripe amount mismatch'], 409);
  }

  $details['checkout_status'] = 'paid';
  $changed = $pdo->prepare("UPDATE deposits SET status='confirmed', confirmed_at=?, details_json=?, updated_at=? WHERE id=? AND status NOT IN ('confirmed','completed','paid','approved')");
  $changed->execute([$now, json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
  if ($changed->rowCount() > 0) {
    ledger_add(
      (int)$dep['user_id'],
      strtoupper((string)$dep['currency']),
      (float)$dep['amount'],
      'deposit_credit',
      'deposit',
      (string)$depositId,
      ['provider' => 'stripe', 'session_id' => $sessionId, 'event' => 'stripe_sync'],
      $now
    );
    $shouldNotifyConfirmed = true;
  } else {
    $shouldNotifyConfirmed = false;
  }
  $pdo->commit();
  if ($shouldNotifyConfirmed) user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'confirmed', $depositId);
  json_response(['ok' => true, 'status' => 'confirmed']);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Reconcile failed'], 500);
}
