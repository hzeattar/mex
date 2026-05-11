<?php
/**
 * Seed script: Run platform seed data (levels, signals, contracts).
 * Execute via browser: GET /scripts/seed_platform_v2.php?token=CRON_KEY
 * Or CLI: php scripts/seed_platform_v2.php token=CRON_KEY
 */
declare(strict_types=1);
require_once __DIR__ . '/../api/lib/common.php';

// Auth via CRON_KEY
$token = trim((string)($_GET['token'] ?? ''));
if ($token === '' && PHP_SAPI === 'cli') {
  global $argv;
  foreach ((array)($argv ?? []) as $idx => $arg) {
    if ((int)$idx === 0) continue;
    $arg = trim((string)$arg);
    if (str_starts_with($arg, 'token=')) { $token = substr($arg, 6); break; }
  }
}
$cronKey = (string)env('CRON_KEY', '');
if ($cronKey === '' || !hash_equals($cronKey, $token)) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

header('Content-Type: application/json');

$pdo = db();
$sqlFile = __DIR__ . '/../db/seed_platform_data_v2.sql';

if (!is_file($sqlFile)) {
  echo json_encode(['ok' => false, 'error' => 'Seed file not found']);
  exit;
}

$sql = file_get_contents($sqlFile);
$statements = array_filter(array_map('trim', explode(';', $sql)), function($s) {
  return $s !== '' && !str_starts_with($s, '--');
});

$results = [];
$errors = [];

foreach ($statements as $i => $stmt) {
  // Skip comment-only blocks
  $clean = trim(preg_replace('/--.*$/m', '', $stmt));
  if ($clean === '' || str_starts_with($clean, '-- ')) continue;
  
  try {
    $affected = $pdo->exec($clean . ';');
    $results[] = ['index' => $i, 'affected' => $affected];
  } catch (Throwable $e) {
    $errors[] = ['index' => $i, 'error' => $e->getMessage(), 'sql_preview' => substr($clean, 0, 120)];
  }
}

echo json_encode([
  'ok' => empty($errors),
  'executed' => count($results),
  'errors' => $errors,
  'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
