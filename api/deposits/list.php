<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = require_auth();
$pdo = db();
$driver = db_driver();
$cols = ['id','provider','method_code','currency','amount','status','external_ref','created_at','updated_at'];
foreach (['confirmed_at','admin_note','details_json'] as $c) {
  try { if (schema_column_exists($pdo, 'deposits', $c, $driver)) $cols[] = $c; } catch (Throwable $e) {}
}
$stmt = $pdo->prepare('SELECT '.implode(',', $cols).' FROM deposits WHERE user_id=? ORDER BY id DESC LIMIT 100');
$stmt->execute([$uid]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
foreach ($items as &$it) {
  $details = [];
  $raw = trim((string)($it['details_json'] ?? ''));
  if ($raw !== '') { $decoded = json_decode($raw, true); if (is_array($decoded)) $details = $decoded; }
  $it['proof_available'] = !empty($details['proof_path']);
}
unset($it);
json_response(['ok'=>true,'items'=>$items]);
