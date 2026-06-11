<?php
/**
 * Seed script: Run platform seed data (levels, signals, contracts, news, payment methods).
 * Execute via browser: GET /scripts/seed_platform_v2.php?token=CRON_KEY
 * Or CLI: php scripts/seed_platform_v2.php token=CRON_KEY
 */
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/feature_bootstrap.php';

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
$sqlFile = __DIR__ . '/../db/seed_levels_copy_contracts_2026_05_07.sql';

if (!is_file($sqlFile)) {
  echo json_encode(['ok' => false, 'error' => 'Seed file not found']);
  exit;
}

$startedAt = microtime(true);
$results = [];
$errors = [];
$driver = db_driver();

if ($driver !== 'mysql') {
  http_response_code(409);
  echo json_encode([
    'ok' => false,
    'error' => 'This seed is intended for the production MySQL database only.',
    'db_driver' => $driver,
  ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  schema_seed_defaults($pdo, $driver);
  vp_feature_bootstrap($pdo, $driver);
  $results[] = ['step' => 'bootstrap', 'ok' => true];
} catch (Throwable $e) {
  $errors[] = ['step' => 'bootstrap', 'error' => $e->getMessage()];
}

$sql = (string)file_get_contents($sqlFile);
$sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql) ?? $sql;
$sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
$sql = preg_replace('/\/\*.*?\*\//s', '', $sql) ?? $sql;
$statements = array_values(array_filter(array_map('trim', explode(';', $sql)), static function($s) {
  return $s !== '';
}));

foreach ($statements as $i => $stmt) {
  try {
    $affected = $pdo->exec($stmt);
    $results[] = ['index' => $i, 'affected' => $affected];
  } catch (Throwable $e) {
    $errors[] = ['index' => $i, 'error' => $e->getMessage(), 'sql_preview' => substr($stmt, 0, 180)];
  }
}

$counts = [];
foreach ([
  'customer_levels' => "SELECT COUNT(*) FROM customer_levels WHERE status='active'",
  'contracts' => "SELECT COUNT(*) FROM invest_plans WHERE status='active' AND COALESCE(product_kind,'')='contract'",
  'copy_signals' => "SELECT COUNT(*) FROM trading_signals WHERE status='active' AND COALESCE(bot_enabled,0)=1",
  'news' => "SELECT COUNT(*) FROM announcements WHERE status='published'",
  'payment_methods' => "SELECT COUNT(*) FROM payment_methods WHERE status='active'",
  'markets' => "SELECT COUNT(*) FROM markets WHERE status='active'",
] as $key => $query) {
  try {
    $counts[$key] = (int)$pdo->query($query)->fetchColumn();
  } catch (Throwable $e) {
    $counts[$key] = null;
  }
}

echo json_encode([
  'ok' => empty($errors),
  'seed_file' => basename($sqlFile),
  'executed' => count($results),
  'counts' => $counts,
  'duration_ms' => (int)round((microtime(true) - $startedAt) * 1000),
  'errors' => $errors,
  'results' => array_slice($results, 0, 30),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
