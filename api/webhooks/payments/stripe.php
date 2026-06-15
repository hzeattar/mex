<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/common.php';
require_once __DIR__ . '/../../lib/ledger.php';
require_once __DIR__ . '/../../lib/stripe_bootstrap.php';
require_once __DIR__ . '/../../lib/user_notifications.php';

require_method('POST');
stripe_require_ready();

$webhookSecret = trim((string)env('STRIPE_WEBHOOK_SECRET', ''));
if ($webhookSecret === '') {
  json_response(['ok' => false, 'error' => 'Stripe webhook secret is missing'], 503);
}

$payload = file_get_contents('php://input') ?: '';
$signature = (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

try {
  $event = \Stripe\Webhook::constructEvent($payload, $signature, $webhookSecret);
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => 'Invalid Stripe signature'], 400);
}

$type = (string)($event->type ?? '');
$session = $event->data->object ?? null;

if (!$session || !in_array($type, [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
], true)) {
  json_response(['ok' => true, 'ignored' => $type]);
}

$metadata = stripe_object_metadata_array($session);
$depositId = (int)($metadata['deposit_id'] ?? 0);
$sessionId = (string)($session->id ?? '');
$paymentStatus = strtolower((string)($session->payment_status ?? ''));
$amountTotal = isset($session->amount_total) ? (int)$session->amount_total : 0;
$stripeCurrency = strtolower((string)($session->currency ?? stripe_checkout_currency()));
$now = time();

if ($depositId <= 0 && $sessionId !== '') {
  try {
    $st = db()->prepare("SELECT id FROM deposits WHERE provider='stripe' AND external_ref=? LIMIT 1");
    $st->execute([$sessionId]);
    $depositId = (int)($st->fetchColumn() ?: 0);
  } catch (Throwable $ignored) {}
}

if ($depositId <= 0) {
  json_response(['ok' => false, 'error' => 'Deposit not found'], 404);
}

$pdo = db();
try {
  $pdo->beginTransaction();
  $st = $pdo->prepare("SELECT * FROM deposits WHERE id=? AND provider='stripe' LIMIT 1");
  $st->execute([$depositId]);
  $dep = $st->fetch(PDO::FETCH_ASSOC);
  if (!$dep) {
    $pdo->rollBack();
    json_response(['ok' => false, 'error' => 'Deposit not found'], 404);
  }

  $details = [];
  if (!empty($dep['details_json'])) {
    $decoded = json_decode((string)$dep['details_json'], true);
    if (is_array($decoded)) $details = $decoded;
  }
  $details['stripe_event'] = $type;
  $details['stripe_session_id'] = $sessionId;
  $details['stripe_payment_status'] = $paymentStatus;
  $details['stripe_amount_total'] = $amountTotal;
  $details['stripe_currency'] = $stripeCurrency;
  $details['stripe_payment_intent'] = (string)($session->payment_intent ?? '');

  $status = strtolower((string)($dep['status'] ?? 'pending'));
  if (in_array($status, ['confirmed', 'completed', 'paid', 'approved'], true)) {
    $upd = $pdo->prepare('UPDATE deposits SET details_json=?, updated_at=? WHERE id=?');
    $upd->execute([json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
    $pdo->commit();
    json_response(['ok' => true, 'status' => 'already_confirmed']);
  }

  if (in_array($type, ['checkout.session.expired', 'checkout.session.async_payment_failed'], true)) {
    $details['checkout_status'] = $type === 'checkout.session.expired' ? 'expired' : 'failed';
    $upd = $pdo->prepare("UPDATE deposits SET status='cancelled', details_json=?, updated_at=? WHERE id=? AND status='pending'");
    $upd->execute([json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $depositId]);
    $changedRows = $upd->rowCount();
    $pdo->commit();
    if ($changedRows > 0) user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'cancelled', $depositId);
    json_response(['ok' => true, 'status' => 'cancelled']);
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
      ['provider' => 'stripe', 'session_id' => $sessionId, 'event' => $type],
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
  json_response(['ok' => false, 'error' => 'Webhook processing failed'], 500);
}
