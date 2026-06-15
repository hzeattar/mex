<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = require_auth();
$pdo = db();

$stmt = $pdo->prepare('SELECT id,status,full_name,country,phone_e164,birth_date,doc_type,doc_number,front_path,back_path,selfie_path,contract_path,extra_paths_json,admin_note,created_at,updated_at FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
$stmt->execute([$uid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

json_response(['ok'=>true,'kyc'=>$row]);
