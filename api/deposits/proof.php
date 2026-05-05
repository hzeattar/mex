<?php
require_once __DIR__ . '/../lib/common.php';

require_method('GET');
$uid = require_auth();
$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(404); exit; }
$pdo = db();
$stmt = $pdo->prepare('SELECT details_json FROM deposits WHERE id=? AND user_id=? LIMIT 1');
$stmt->execute([$id, $uid]);
$raw = (string)($stmt->fetchColumn() ?: '');
$details = [];
if ($raw !== '') { $decoded = json_decode($raw, true); if (is_array($decoded)) $details = $decoded; }
$rel = trim((string)($details['proof_path'] ?? ''));
if ($rel === '') { http_response_code(404); exit; }
$base = realpath(__DIR__ . '/../');
$path = realpath(__DIR__ . '/../' . ltrim($rel, '/'));
if (!$base || !$path || strpos($path, $base) !== 0 || !is_file($path)) { http_response_code(404); exit; }
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$contentTypes = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','pdf'=>'application/pdf'];
header('Content-Type: ' . ($contentTypes[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . (string)filesize($path));
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
readfile($path);
exit;
