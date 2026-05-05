<?php
require_once __DIR__ . '/../lib/common.php';

$uid = require_auth();
$pdo = db();
$page = max(1, (int)($_GET['page'] ?? 1));
$per = min(100, max(10, (int)($_GET['per'] ?? 25)));
$offset = ($page-1)*$per;

// Pagination: avoid binding LIMIT/OFFSET (can break on some MySQL setups)
$per = min(100, max(10, (int)($per)));
$offset = max(0, (int)$offset);
$sql = "SELECT id,currency,amount,type,ref_type,ref_id,metadata,created_at FROM ledger_entries WHERE user_id=? ORDER BY id DESC LIMIT ".(int)$per." OFFSET ".(int)$offset;
$stmt = $pdo->prepare($sql);
$stmt->execute([$uid]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
json_response(['ok'=>true,'page'=>$page,'per'=>$per,'items'=>$items]);
