<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('GET');
$uid = require_auth();
$pdo = db();

$currency = strtoupper(trim((string)($_GET['currency'] ?? '')));
$type     = trim((string)($_GET['type'] ?? ''));
$limit    = min(200, max(1, (int)($_GET['limit'] ?? 50)));
$offset   = max(0, (int)($_GET['offset'] ?? 0));

$sql  = 'SELECT le.id, le.wallet_id, le.currency, le.amount, le.type, le.ref_type, le.ref_id, le.metadata, le.created_at, w.label AS wallet_label FROM ledger_entries le LEFT JOIN wallets w ON w.id = le.wallet_id WHERE le.user_id = ?';
$params = [$uid];

if ($currency !== '') {
  $sql .= ' AND le.currency = ?';
  $params[] = $currency;
}
if ($type !== '') {
  $sql .= ' AND le.type = ?';
  $params[] = $type;
}

$sql .= ' ORDER BY le.id DESC LIMIT ? OFFSET ?';
$params[] = $limit;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$total = 0;
try {
  $countSql = 'SELECT COUNT(*) FROM ledger_entries WHERE user_id = ?';
  $countParams = [$uid];
  if ($currency !== '') { $countSql .= ' AND currency = ?'; $countParams[] = $currency; }
  if ($type !== '') { $countSql .= ' AND type = ?'; $countParams[] = $type; }
  $total = (int)$pdo->prepare($countSql)->execute($countParams) ? (int)$pdo->query($countSql)->fetchColumn() : 0;
} catch (Throwable $e) {}

$out = [];
foreach ($rows as $r) {
  $meta = $r['metadata'];
  if (is_string($meta)) {
    $decoded = json_decode($meta, true);
    $meta = is_array($decoded) ? $decoded : $meta;
  }
  $out[] = [
    'id'           => (int)$r['id'],
    'wallet_id'    => (int)$r['wallet_id'],
    'wallet_label' => (string)($r['wallet_label'] ?? ''),
    'currency'     => strtoupper((string)$r['currency']),
    'amount'       => (float)$r['amount'],
    'type'         => (string)$r['type'],
    'ref_type'     => (string)($r['ref_type'] ?? ''),
    'ref_id'       => (string)($r['ref_id'] ?? ''),
    'metadata'     => $meta,
    'created_at'   => (int)$r['created_at'],
  ];
}

json_response([
  'ok'    => true,
  'total' => $total,
  'count' => count($out),
  'limit' => $limit,
  'offset'=> $offset,
  'transactions' => $out,
]);
