<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$id = (int)($_GET['id'] ?? 0);
$kind = (string)($_GET['kind'] ?? 'front');
$idx = max(0, (int)($_GET['idx'] ?? 0));

if ($id <= 0) { http_response_code(404); exit; }

if ($kind === 'extra') {
  $stmt = $pdo->prepare('SELECT extra_paths_json FROM kyc_requests WHERE id=?');
  $stmt->execute([$id]);
  $items = json_decode((string)($stmt->fetchColumn() ?: ''), true);
  $pathRel = is_array($items) ? (string)($items[$idx] ?? '') : '';
} else {
  $col = match($kind){
    'front' => 'front_path',
    'back' => 'back_path',
    'selfie' => 'selfie_path',
    'contract' => 'contract_path',
    default => 'front_path'
  };
  $stmt = $pdo->prepare("SELECT {$col} AS path FROM kyc_requests WHERE id=?");
  $stmt->execute([$id]);
  $pathRel = (string)($stmt->fetchColumn() ?: '');
}

if ($pathRel==='') { http_response_code(404); exit; }

$full = realpath(__DIR__ . '/../api/' . $pathRel);
$base = realpath(__DIR__ . '/../api/uploads/kyc');
if (!$full || !$base || strpos($full, $base) !== 0 || !is_file($full)) {
  http_response_code(404); exit;
}

$ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
$mime = match($ext){
  'jpg','jpeg' => 'image/jpeg',
  'png' => 'image/png',
  'webp' => 'image/webp',
  'pdf' => 'application/pdf',
  default => 'application/octet-stream'
};
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="kyc-' . $id . '-' . preg_replace('/[^a-z0-9_-]+/i', '', $kind) . '.' . $ext . '"');
readfile($full);
exit;
