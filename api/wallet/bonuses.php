<?php
// Wallet / Funding bonuses endpoint
// GET ?method_key=card  → returns active bonus for that method/category
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

$methodKey = trim((string)($_GET['method_key'] ?? ''));
if ($methodKey === '') json_response(['ok'=>false,'error'=>'missing_method_key'], 422);

$pdo = db();
$now = time();

try {
  $st = $pdo->prepare("SELECT id, method_id, method_key, type, amount, min_deposit, max_bonus FROM payment_method_bonuses WHERE status='active' AND (method_key=? OR method_id IN (SELECT id FROM payment_methods WHERE code=?)) LIMIT 1");
  $st->execute([$methodKey, $methodKey]);
  $bonus = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  json_response(['ok'=>true,'bonus'=>$bonus]);
} catch (Throwable $e) {
  json_response(['ok'=>false,'error'=>'db_error'], 500);
}
