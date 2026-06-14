<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';
require_once __DIR__ . '/../lib/affiliates.php';

require_method('POST');
$uid = require_auth();
$pdo = db();

function kyc_submit_ensure_schema(PDO $pdo): void {
  $driver = db_driver();
  if (!function_exists('schema_table_exists') || !function_exists('schema_add_column')) return;
  try {
    if (!schema_table_exists($pdo, 'kyc_requests', $driver)) {
      if (function_exists('schema_install')) schema_install($pdo, $driver);
      return;
    }
    $cols = [
      'phone_e164' => ["phone_e164 VARCHAR(32) NULL", "phone_e164 TEXT"],
      'birth_date' => ["birth_date DATE NULL", "birth_date TEXT"],
      'front_path' => ["front_path VARCHAR(255) NULL", "front_path TEXT"],
      'back_path' => ["back_path VARCHAR(255) NULL", "back_path TEXT"],
      'selfie_path' => ["selfie_path VARCHAR(255) NULL", "selfie_path TEXT"],
      'contract_path' => ["contract_path VARCHAR(255) NULL", "contract_path TEXT"],
      'extra_paths_json' => ["extra_paths_json MEDIUMTEXT NULL", "extra_paths_json TEXT"],
      'admin_note' => ["admin_note TEXT NULL", "admin_note TEXT"],
      'updated_at' => ["updated_at INT NOT NULL DEFAULT 0", "updated_at INTEGER NOT NULL DEFAULT 0"],
    ];
    foreach ($cols as $col => [$mysql, $sqlite]) {
      if (!schema_column_exists($pdo, 'kyc_requests', $col, $driver)) {
        schema_add_column($pdo, 'kyc_requests', $mysql, $sqlite, $driver);
      }
    }
  } catch (Throwable $e) {
    error_log('[kyc] schema ensure failed: ' . $e->getMessage());
  }
}

kyc_submit_ensure_schema($pdo);

$userStmt = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
$userStmt->execute([$uid]);
$user = $userStmt->fetch(PDO::FETCH_ASSOC) ?: [];

$registeredName = trim((string)($user['display_name'] ?? ''));
if ($registeredName === '') $registeredName = trim((string)($user['first_name'] ?? '') . ' ' . (string)($user['last_name'] ?? ''));

$full_name = trim((string)($_POST['full_name'] ?? $registeredName));
$country = trim((string)($_POST['country'] ?? ($user['country_name'] ?? '')));
$phone_e164 = trim((string)($_POST['phone_e164'] ?? ($user['phone_e164'] ?? '')));
$birth_date = trim((string)($_POST['birth_date'] ?? ($user['birth_date'] ?? '')));
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
if (!$uploadDir || !is_dir($uploadDir)) {
  json_response(['ok'=>false,'error'=>'Upload directory not available'], 500);
}
if (!is_writable($uploadDir)) {
  @chmod($uploadDir, 0775);
}
if (!is_writable($uploadDir)) {
  json_response(['ok'=>false,'error'=>'Upload directory is not writable'], 500);
}

function kyc_save_upload_entry(array $file, string $uploadDir, array $allowedExts, int $maxBytes = 8388608): ?string {
  if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
  if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    json_response(['ok'=>false,'error'=>'Upload failed'], 422);
  }
  $size = (int)($file['size'] ?? 0);
  if ($size <= 0 || $size > $maxBytes) {
    json_response(['ok'=>false,'error'=>'File too large'], 422);
  }
  $name = (string)($file['name'] ?? '');
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  if (!in_array($ext, $allowedExts, true)) {
    json_response(['ok'=>false,'error'=>'Unsupported file type'], 422);
  }
  $rnd = bin2hex(random_bytes(16));
  $fileName = $rnd . '.' . $ext;
  $dest = rtrim($uploadDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fileName;
  if (!move_uploaded_file((string)$file['tmp_name'], $dest)) {
    json_response(['ok'=>false,'error'=>'Failed to save upload'], 500);
  }
  return 'uploads/kyc/' . $fileName;
}

function kyc_save_upload(string $key, string $uploadDir, array $allowedExts): ?string {
  if (!isset($_FILES[$key]) || !is_array($_FILES[$key])) return null;
  $f = $_FILES[$key];
  if (is_array($f['name'] ?? null)) return null;
  return kyc_save_upload_entry($f, $uploadDir, $allowedExts);
}

function kyc_save_multi_upload(string $key, string $uploadDir, array $allowedExts, int $limit = 6): array {
  if (!isset($_FILES[$key]) || !is_array($_FILES[$key]) || !is_array($_FILES[$key]['name'] ?? null)) return [];
  $files = $_FILES[$key];
  $saved = [];
  $count = min(count($files['name']), $limit);
  for ($i = 0; $i < $count; $i++) {
    $entry = [
      'name' => $files['name'][$i] ?? '',
      'type' => $files['type'][$i] ?? '',
      'tmp_name' => $files['tmp_name'][$i] ?? '',
      'error' => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
      'size' => $files['size'][$i] ?? 0,
    ];
    $path = kyc_save_upload_entry($entry, $uploadDir, $allowedExts);
    if ($path) $saved[] = $path;
  }
  return $saved;
}

$imageExts = ['jpg','jpeg','png','webp'];
$docExts = ['jpg','jpeg','png','webp','pdf'];

$front = kyc_save_upload('front', $uploadDir, $docExts);
if (!$front) $front = kyc_save_upload('doc_file', $uploadDir, $docExts);
$back = kyc_save_upload('back', $uploadDir, $docExts);
$selfie = kyc_save_upload('selfie', $uploadDir, $imageExts);
$contract = kyc_save_upload('contract', $uploadDir, $docExts);
$extra = kyc_save_multi_upload('extra_files', $uploadDir, $docExts);

if (!$front) {
  json_response(['ok'=>false,'error'=>'Front document photo is required'], 422);
}

$now = time();
try {
  $stmt = $pdo->prepare('INSERT INTO kyc_requests(user_id,status,full_name,country,phone_e164,birth_date,doc_type,doc_number,front_path,back_path,selfie_path,contract_path,extra_paths_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $stmt->execute([
    $uid,'pending',$full_name,$country,$phone_e164,$birth_date,$doc_type,$doc_number,
    $front,$back,$selfie,$contract,$extra ? json_encode($extra, JSON_UNESCAPED_SLASHES) : null,$now,$now
  ]);
  $id = (int)$pdo->lastInsertId();
} catch (Throwable $e) {
  error_log('[kyc] submit insert failed: ' . $e->getMessage());
  json_response(['ok'=>false,'error'=>'Could not submit KYC right now. Please try again.'], 500);
}

try {
  aff_notify_manager_for_user($uid, 'kyc_submitted', [
    'id' => $id,
    'country' => $country,
    'doc' => $doc_type,
  ]);
} catch (Throwable $e) {}

json_response(['ok'=>true,'id'=>$id,'status'=>'pending']);
