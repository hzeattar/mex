<?php
// Dummy payment provider webhook: confirm a pending deposit.
// POST JSON: {"external_ref":"DUM-...","status":"confirmed"}
require_once __DIR__ . '/../../lib/common.php';
require_once __DIR__ . '/../../lib/ledger.php';
require_once __DIR__ . '/../../lib/user_notifications.php';

require_method('POST');

$secret = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
if ($secret === '' || $secret !== env('PAYMENT_WEBHOOK_SECRET', '')) {
  json_response(['ok'=>false,'error'=>'Invalid webhook secret'], 403);
}

$body = read_json_body();
$external = trim((string)($body['external_ref'] ?? ''));
$status = strtolower(trim((string)($body['status'] ?? '')));
if ($external === '' || $status === '') json_response(['ok'=>false,'error'=>'Bad payload'], 422);
if (!in_array($status, ['confirmed','failed'], true)) json_response(['ok'=>false,'error'=>'Bad status'], 422);

$pdo = db();
$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare('SELECT * FROM deposits WHERE external_ref=? LIMIT 1 FOR UPDATE');
  // SQLite doesn't support FOR UPDATE
  if (db_driver() !== 'mysql') {
    $stmt = $pdo->prepare('SELECT * FROM deposits WHERE external_ref=? LIMIT 1');
  }
  $stmt->execute([$external]);
  $dep = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$dep) throw new RuntimeException('Deposit not found');
  if ($dep['status'] !== 'pending') {
    // idempotent: already processed
    $pdo->commit();
    json_response(['ok'=>true,'status'=>$dep['status']]);
  }

  $now = time();
  if ($status === 'failed') {
    $pdo->prepare('UPDATE deposits SET status="failed", updated_at=? WHERE id=?')->execute([$now, (int)$dep['id']]);
    $pdo->commit();
    user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'failed', (int)$dep['id']);
    json_response(['ok'=>true,'status'=>'failed']);
  }

  // Confirm: credit ledger
  $uid = (int)$dep['user_id'];
  ledger_add($uid, (string)$dep['currency'], (float)$dep['amount'], 'deposit_credit', 'deposit', (string)$dep['id'], ['provider'=>$dep['provider']]);
  $pdo->prepare('UPDATE deposits SET status="confirmed", updated_at=?, confirmed_at=? WHERE id=?')->execute([$now, $now, (int)$dep['id']]);

  $pdo->commit();
  user_notify_funding_status((int)$dep['user_id'], 'deposit', (float)$dep['amount'], (string)$dep['currency'], 'confirmed', (int)$dep['id']);
  json_response(['ok'=>true,'status'=>'confirmed']);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
}
