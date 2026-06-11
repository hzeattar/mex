<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/feature_bootstrap.php';

if (PHP_SAPI !== 'cli') {
  fwrite(STDERR, "CLI only\n");
  exit(1);
}

$pdo = db();
$driver = db_driver();
if ($driver !== 'mysql') {
  fwrite(STDERR, "This production seed is intended for MySQL/Railway. Current driver: {$driver}\n");
  exit(2);
}

schema_install($pdo, $driver);
schema_upgrade($pdo, $driver);
schema_seed_defaults($pdo, $driver);
vp_feature_bootstrap($pdo, $driver);

$sql = file_get_contents(__DIR__ . '/../db/seed_levels_copy_contracts_2026_05_07.sql');
if ($sql === false || trim($sql) === '') {
  fwrite(STDERR, "Seed SQL file missing or empty\n");
  exit(3);
}

try {
  $pdo->exec($sql);
  $counts = [];
  foreach (['customer_levels', 'invest_plans', 'trading_signals', 'markets'] as $table) {
    $counts[$table] = (int)$pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
  }
  echo json_encode(['ok' => true, 'seed' => 'levels_copy_contracts_2026_05_07', 'counts' => $counts], JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $e) {
  fwrite(STDERR, $e->getMessage() . PHP_EOL);
  exit(4);
}
