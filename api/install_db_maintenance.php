<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';

@set_time_limit((int)max(60, (int)env('SQL_IMPORT_TIME_LIMIT', '240')));
@ini_set('memory_limit', (string)env('SQL_IMPORT_MEMORY_LIMIT', '512M'));

function maint_bool_env(string $key, bool $default = false): bool {
  $v = strtolower(trim((string)env($key, $default ? '1' : '0')));
  return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

function maint_request_value(string $name, string $default = ''): string {
  $headerName = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  if (isset($_POST[$name])) return (string)$_POST[$name];
  if (isset($_GET[$name])) return (string)$_GET[$name];
  if (isset($_SERVER[$headerName])) return (string)$_SERVER[$headerName];
  return $default;
}

function maint_authorize(): void {
  require_method('POST');

  $installKey = (string)env('INSTALL_KEY', '');
  $key = maint_request_value('key');
  if ($key === '') $key = (string)($_SERVER['HTTP_X_INSTALL_KEY'] ?? '');

  if ($installKey === '' || $key === '' || !hash_equals($installKey, $key)) {
    json_response(['ok' => false, 'error' => 'Forbidden'], 403);
  }
  if (!maint_bool_env('ALLOW_SQL_IMPORT', false)) {
    json_response(['ok' => false, 'error' => 'SQL maintenance is disabled'], 403);
  }
}

function maint_quote_ident(string $name): string {
  return '`' . str_replace('`', '``', $name) . '`';
}

function maint_tables(PDO $pdo): array {
  return array_map(static fn($r) => (string)$r[0], $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM) ?: []);
}

function maint_backup(PDO $pdo, array $tables): void {
  $name = 'railway_mysql_backup_' . gmdate('Ymd_His') . '.sql';
  header('Content-Type: application/sql; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $name . '"');
  header('X-Table-Count: ' . count($tables));

  echo "-- Railway MySQL backup before VertexPluse full import\n";
  echo "-- Created at " . gmdate('c') . "\n";
  echo "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";

  foreach ($tables as $table) {
    $qt = maint_quote_ident($table);
    $create = $pdo->query('SHOW CREATE TABLE ' . $qt)->fetch(PDO::FETCH_ASSOC);
    $createSql = (string)($create['Create Table'] ?? array_values($create)[1] ?? '');
    echo 'DROP TABLE IF EXISTS ' . $qt . ";\n";
    echo $createSql . ";\n\n";

    $stmt = $pdo->query('SELECT * FROM ' . $qt);
    $cols = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      if (!$cols) $cols = array_keys($row);
      $colSql = implode(', ', array_map('maint_quote_ident', $cols));
      $vals = [];
      foreach ($cols as $c) {
        $v = $row[$c];
        $vals[] = $v === null ? 'NULL' : $pdo->quote((string)$v);
      }
      echo 'INSERT INTO ' . $qt . ' (' . $colSql . ') VALUES (' . implode(', ', $vals) . ");\n";
    }
    echo "\n";
    if (function_exists('flush')) flush();
  }

  echo "SET FOREIGN_KEY_CHECKS=1;\n";
  exit;
}

try {
  maint_authorize();
  if (db_driver() !== 'mysql') {
    json_response(['ok' => false, 'error' => 'SQL maintenance is allowed only when db_driver=mysql', 'db_driver' => db_driver()], 409);
  }

  $pdo = db();
  $tables = maint_tables($pdo);
  $action = maint_request_value('action', 'backup');

  if ($action === 'backup') {
    maint_backup($pdo, $tables);
  }

  if ($action === 'drop_all') {
    if (maint_request_value('confirm') !== 'DROP_ALL') {
      json_response(['ok' => false, 'error' => 'Refusing to drop tables without confirm=DROP_ALL', 'tables_before' => count($tables)], 409);
    }
    $dropped = 0;
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    try {
      foreach (array_reverse($tables) as $table) {
        $pdo->exec('DROP TABLE IF EXISTS ' . maint_quote_ident($table));
        $dropped++;
      }
    } finally {
      try { $pdo->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $e) {}
    }
    json_response(['ok' => true, 'dropped' => $dropped, 'tables_after' => count(maint_tables($pdo)), 'ts' => time()]);
  }

  json_response(['ok' => false, 'error' => 'Unsupported action'], 422);
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
