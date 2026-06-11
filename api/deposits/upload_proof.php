<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

require_method('POST');
$uid = require_auth();
$depositId = (int)($_POST['deposit_id'] ?? 0);
if ($depositId <= 0) json_response(['ok'=>false,'error'=>'Invalid deposit id'], 422);
if (!isset($_FILES['proof']) || !is_array($_FILES['proof'])) json_response(['ok'=>false,'error'=>'Proof file is required'], 422);

$f = $_FILES['proof'];
if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) json_response(['ok'=>false,'error'=>'Upload failed'], 422);
$size = (int)($f['size'] ?? 0);
if ($size <= 0 || $size > 8 * 1024 * 1024) json_response(['ok'=>false,'error'=>'File too large'], 422);
$ext = strtolower(pathinfo((string)($f['name'] ?? ''), PATHINFO_EXTENSION));
$allowedMimeByExt = [
  'jpg' => ['image/jpeg'],
  'jpeg' => ['image/jpeg'],
  'png' => ['image/png'],
  'webp' => ['image/webp'],
  'pdf' => ['application/pdf','application/x-pdf'],
];
if (!isset($allowedMimeByExt[$ext])) json_response(['ok'=>false,'error'=>'Unsupported file type'], 422);
$mime = '';
if (function_exists('finfo_open')) {
  $fi = @finfo_open(FILEINFO_MIME_TYPE);
  if ($fi) {
    $mime = (string)@finfo_file($fi, (string)$f['tmp_name']);
    @finfo_close($fi);
  }
}
if ($mime !== '' && !in_array($mime, $allowedMimeByExt[$ext], true)) {
  json_response(['ok'=>false,'error'=>'Unsupported file content'], 422);
}

$pdo = db();
$driver = db_driver();
$cols = ['id','details_json'];
try { if (schema_column_exists($pdo, 'deposits', 'status', $driver)) $cols[] = 'status'; } catch (Throwable $e) {}
$stmt = $pdo->prepare('SELECT '.implode(',', $cols).' FROM deposits WHERE id=? AND user_id=? LIMIT 1');
$stmt->execute([$depositId, $uid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row) json_response(['ok'=>false,'error'=>'Deposit not found'], 404);

$dir = __DIR__ . '/../uploads/funding';
if (!is_dir($dir)) @mkdir($dir, 0775, true);
$real = realpath($dir);
if (!$real) json_response(['ok'=>false,'error'=>'Upload directory not available'], 500);
$filename = 'dep_' . $depositId . '_' . bin2hex(random_bytes(12)) . '.' . $ext;
$dest = rtrim($real, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file((string)$f['tmp_name'], $dest)) json_response(['ok'=>false,'error'=>'Failed to save upload'], 500);

$details = [];
$raw = trim((string)($row['details_json'] ?? ''));
if ($raw !== '') {
  $decoded = json_decode($raw, true);
  if (is_array($decoded)) $details = $decoded;
}
$details['proof_path'] = 'uploads/funding/' . $filename;
$details['proof_original_name'] = (string)($f['name'] ?? $filename);
$details['proof_uploaded_at'] = time();
$details['proof_size'] = $size;
$details['proof_ext'] = $ext;
$details['proof_mime'] = $mime;
$pdo->prepare('UPDATE deposits SET details_json=?, updated_at=? WHERE id=? AND user_id=?')->execute([
  json_encode($details, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
  time(),
  $depositId,
  $uid,
]);

json_response(['ok'=>true,'deposit_id'=>$depositId,'proof'=>['name'=>$details['proof_original_name'],'uploaded_at'=>$details['proof_uploaded_at'],'view_url'=>'/api/deposits/proof.php?id='.$depositId]]);
