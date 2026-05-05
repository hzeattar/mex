<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = require_auth();
$pdo = db();

$stmt = $pdo->prepare('SELECT id,status,full_name,country,doc_type,doc_number,admin_note,created_at,updated_at FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
$stmt->execute([$uid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

json_response(['ok'=>true,'kyc'=>$row]);
