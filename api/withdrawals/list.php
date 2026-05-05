<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = require_auth();
$pdo = db();
// Older DBs may miss some columns. Build a safe select list to avoid 500 errors.
$cols = ['id','method','currency','amount','status','created_at','updated_at'];
foreach (['hold_id','risk_score','admin_note','completed_at','details_json'] as $c) {
  try { if (schema_column_exists('withdrawals', $c)) $cols[] = $c; } catch (Throwable $e) {}
}

$stmt = $pdo->prepare('SELECT '.implode(',', $cols).' FROM withdrawals WHERE user_id=? ORDER BY id DESC LIMIT 100');
$stmt->execute([$uid]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
json_response(['ok'=>true,'items'=>$items]);
