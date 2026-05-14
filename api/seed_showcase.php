<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/feature_bootstrap.php';

function seed_showcase_schema(PDO $pdo, string $driver): array {
  $tables = ['customer_levels', 'invest_plans', 'trading_signals', 'markets'];
  $out = [];
  foreach ($tables as $table) {
    try {
      if (!schema_table_exists($pdo, $table, $driver)) {
        $out[$table] = ['exists' => false, 'columns' => []];
        continue;
      }
      if ($driver === 'mysql') {
        $rows = $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out[$table] = [
          'exists' => true,
          'columns' => array_map(static function(array $row): array {
            return [
              'field' => (string)($row['Field'] ?? ''),
              'type' => (string)($row['Type'] ?? ''),
              'null' => (string)($row['Null'] ?? ''),
              'key' => (string)($row['Key'] ?? ''),
            ];
          }, $rows),
        ];
      } else {
        $rows = $pdo->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out[$table] = [
          'exists' => true,
          'columns' => array_map(static function(array $row): array {
            return [
              'field' => (string)($row['name'] ?? ''),
              'type' => (string)($row['type'] ?? ''),
              'null' => ((int)($row['notnull'] ?? 0) === 1) ? 'NO' : 'YES',
              'key' => ((int)($row['pk'] ?? 0) === 1) ? 'PRI' : '',
            ];
          }, $rows),
        ];
      }
    } catch (Throwable $e) {
      $out[$table] = ['exists' => null, 'error' => $e->getMessage(), 'columns' => []];
    }
  }
  return $out;
}

function seed_showcase_statements(string $sql): array {
  $statements = [];
  $buffer = '';
  $len = strlen($sql);
  $quote = null;
  $escape = false;
  for ($i = 0; $i < $len; $i++) {
    $ch = $sql[$i];
    $buffer .= $ch;
    if ($quote !== null) {
      if ($escape) {
        $escape = false;
      } elseif ($ch === '\\') {
        $escape = true;
      } elseif ($ch === $quote) {
        $quote = null;
      }
      continue;
    }
    if ($ch === "'" || $ch === '"') {
      $quote = $ch;
      continue;
    }
    if ($ch === ';') {
      $stmt = trim($buffer);
      if ($stmt !== '') $statements[] = $stmt;
      $buffer = '';
    }
  }
  $tail = trim($buffer);
  if ($tail !== '') $statements[] = $tail;
  return $statements;
}

function seed_showcase_run_sql(PDO $pdo, string $sql, bool $diag): array {
  $statements = seed_showcase_statements($sql);
  $ran = 0;
  foreach ($statements as $index => $statement) {
    try {
      $pdo->exec($statement);
      $ran++;
    } catch (Throwable $e) {
      $preview = preg_replace('/\s+/', ' ', trim($statement));
      if ($preview === null) $preview = '';
      return [
        'ok' => false,
        'ran' => $ran,
        'failed_index' => $index + 1,
        'failed_statement' => $diag ? substr($preview, 0, 240) : null,
        'error' => $diag ? $e->getMessage() : 'Seed failed',
      ];
    }
  }
  return ['ok' => true, 'ran' => $ran];
}

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

$diag = (string)($_GET['diag'] ?? $_POST['diag'] ?? '') === '1';

$sqlFile = __DIR__ . '/../db/seed_levels_copy_contracts_2026_05_07.sql';
$sql = file_get_contents($sqlFile);
if ($sql === false || trim($sql) === '') {
  json_response(['ok' => false, 'error' => 'Seed SQL missing'], 500);
}

try {
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  schema_seed_defaults($pdo, $driver);
  vp_feature_bootstrap($pdo, $driver);
} catch (Throwable $e) {
  json_response([
    'ok' => false,
    'error' => 'Schema bootstrap failed',
    'detail' => $diag ? $e->getMessage() : null,
  ], 500);
}

if ((string)($_GET['inspect'] ?? $_POST['inspect'] ?? '') === 'schema') {
  json_response([
    'ok' => true,
    'inspect' => 'schema',
    'schema' => seed_showcase_schema($pdo, $driver),
  ]);
}

$run = seed_showcase_run_sql($pdo, $sql, $diag);
if (!$run['ok']) {
  json_response([
    'ok' => false,
    'error' => $run['error'] ?? 'Seed failed',
    'ran' => $run['ran'] ?? 0,
    'failed_index' => $run['failed_index'] ?? null,
    'failed_statement' => $run['failed_statement'] ?? null,
  ], 500);
}

$counts = [];
foreach (['customer_levels', 'invest_plans', 'trading_signals', 'markets'] as $table) {
  $counts[$table] = (int)$pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
}

json_response([
  'ok' => true,
  'seed' => 'levels_copy_contracts_2026_05_07',
  'statements' => $run['ran'] ?? null,
  'counts' => $counts,
]);
