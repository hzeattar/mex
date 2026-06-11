<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';
require_once __DIR__ . '/api/lib/affiliates.php';

require_method('POST');
$uid = require_auth();
$pdo = db();

$full_name = trim((string)($_POST['full_name'] ?? ''));
$country = trim((string)($_POST['country'] ?? ''));
$doc_type = trim((string)($_POST['doc_type'] ?? ''));
$doc_number = trim((string)($_POST['doc_number'] ?? ''));

if ($full_name === '' || $country === '' || $doc_type === '' || $doc_number === '') {
  json_response(['ok'=>false,'error'=>'Missing fields'], 422);
}

$uploadDir = realpath(__DIR__ . '/../uploads/kyc');
if (!$uploadDir) {
  @mkdir(__DIR__ . '/../uploads/kyc', 0775, true);
  $uploadDir = realpath(__DIR__ . '/../uploads/kyc');
}
if (!$uploadDir) {
  json_response(['ok'=>false,'error'=>'Upload directory not available'], 500);
}

function save_upload(string $key, string $uploadDir): ?string {
  if (!isset($_FILES[$key]) || !is_array($_FILES[$key])) return null;
  $f = $_FILES[$key];
  if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return null;
  $size = (int)($f['size'] ?? 0);
  if ($size <= 0 || $size > 6 * 1024 * 1024) {
    json_response(['ok'=>false,'error'=>'File too large'], 422);
  }
  $name = (string)($f['name'] ?? '');
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  if (!in_array($ext, ['jpg','jpeg','png','webp'], true)) {
    json_response(['ok'=>false,'error'=>'Unsupported file type'], 422);
  }
  $rnd = bin2hex(random_bytes(16));
  $fileName = $rnd . '.' . $ext;
  $dest = rtrim($uploadDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fileName;
  if (!move_uploaded_file($f['tmp_name'], $dest)) {
    json_response(['ok'=>false,'error'=>'Failed to save upload'], 500);
  }
  return 'uploads/kyc/' . $fileName;
}

$front = save_upload('front', $uploadDir);
$back = save_upload('back', $uploadDir);
$selfie = save_upload('selfie', $uploadDir);
if (!$front || !$selfie) {
  json_response(['ok'=>false,'error'=>'Front document and selfie are required'], 422);
}

$now = time();
$stmt = $pdo->prepare('INSERT INTO kyc_requests(user_id,status,full_name,country,doc_type,doc_number,front_path,back_path,selfie_path,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$stmt->execute([$uid,'pending',$full_name,$country,$doc_type,$doc_number,$front,$back,$selfie,$now,$now]);
$id = (int)$pdo->lastInsertId();

// Notify the marketer/manager (best effort)
try {
  aff_notify_manager_for_user($uid, 'kyc_submitted', [
    'id' => $id,
    'country' => $country,
    'doc' => $doc_type,
  ]);
} catch (Throwable $e) {}

json_response(['ok'=>true,'id'=>$id,'status'=>'pending']);
