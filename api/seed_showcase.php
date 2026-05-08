<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/feature_bootstrap.php';

$key = (string)($_GET['key'] ?? $_POST['key'] ?? '');
$expected = (string)(env('INSTALL_KEY', '') ?: env('CRON_KEY', ''));
if ($expected === '' || $key === '' || !hash_equals($expected, $key)) {
  json_response(['ok' => false, 'error' => 'Forbidden'], 403);
}

if ((string)env('ALLOW_SQL_IMPORT', '0') !== '1') {
  json_response(['ok' => false, 'error' => 'Seed disabled'], 403);
}

$pdo = db();
$driver = db_driver();
if ($driver !== 'mysql') {
  json_response(['ok' => false, 'error' => 'MySQL required', 'driver' => $driver], 409);
}

$sqlFile = __DIR__ . '/../db/seed_levels_copy_contracts_2026_05_07.sql';
$sql = file_get_contents($sqlFile);
if ($sql === false || trim($sql) === '') {
  json_response(['ok' => false, 'error' => 'Seed SQL missing'], 500);
}

schema_install($pdo, $driver);
schema_upgrade($pdo, $driver);
schema_seed_defaults($pdo, $driver);
vp_feature_bootstrap($pdo, $driver);

$pdo->exec($sql);

$counts = [];
foreach (['customer_levels', 'invest_plans', 'trading_signals', 'markets'] as $table) {
  $counts[$table] = (int)$pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
}

json_response([
  'ok' => true,
  'seed' => 'levels_copy_contracts_2026_05_07',
  'counts' => $counts,
]);
