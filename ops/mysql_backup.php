<?php
declare(strict_types=1);

function opt(string $name, string $default = ''): string {
  global $argv;
  $prefix = '--' . $name . '=';
  foreach ($argv as $arg) {
    if ($arg === '--' . $name) return '1';
    if (str_starts_with((string)$arg, $prefix)) return substr((string)$arg, strlen($prefix));
  }
  return $default;
}

function envv(string $name, string $default = ''): string {
  $v = getenv($name);
  return $v === false ? $default : (string)$v;
}

function quote_ident(string $name): string {
  return '`' . str_replace('`', '``', $name) . '`';
}

$host = envv('DB_HOST', envv('MYSQLHOST'));
$port = envv('DB_PORT', envv('MYSQLPORT', '3306'));
$db = envv('DB_NAME', envv('MYSQLDATABASE', envv('MYSQL_DATABASE')));
$user = envv('DB_USER', envv('MYSQLUSER', 'root'));
$pass = envv('DB_PASS', envv('MYSQLPASSWORD', envv('MYSQL_ROOT_PASSWORD')));
$backup = opt('backup');
$dropAll = opt('drop-all') === '1';
$confirm = opt('confirm');

if ($host === '' || $db === '' || $user === '' || $backup === '') {
  fwrite(STDERR, "Usage: DB_HOST=... DB_NAME=... DB_USER=... DB_PASS=... php ops/mysql_backup.php --backup=/path/file.sql [--drop-all --confirm=DROP_ALL]\n");
  exit(2);
}
if ($dropAll && $confirm !== 'DROP_ALL') {
  fwrite(STDERR, "Refusing to drop tables without --confirm=DROP_ALL\n");
  exit(2);
}

$pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$tables = array_map(static fn($r) => (string)$r[0], $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM) ?: []);
$dir = dirname($backup);
if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
  throw new RuntimeException('Cannot create backup directory: ' . $dir);
}

$fh = fopen($backup, 'wb');
if (!$fh) throw new RuntimeException('Cannot open backup file: ' . $backup);
fwrite($fh, "-- Railway MySQL backup before VertexPluse full import\n");
fwrite($fh, "-- Created at " . gmdate('c') . "\n");
fwrite($fh, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

foreach ($tables as $table) {
  $qt = quote_ident($table);
  $create = $pdo->query('SHOW CREATE TABLE ' . $qt)->fetch(PDO::FETCH_ASSOC);
  $createSql = (string)($create['Create Table'] ?? array_values($create)[1] ?? '');
  fwrite($fh, 'DROP TABLE IF EXISTS ' . $qt . ";\n");
  fwrite($fh, $createSql . ";\n\n");

  $stmt = $pdo->query('SELECT * FROM ' . $qt);
  $cols = [];
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!$cols) $cols = array_keys($row);
    $colSql = implode(', ', array_map('quote_ident', $cols));
    $vals = [];
    foreach ($cols as $c) {
      $v = $row[$c];
      $vals[] = $v === null ? 'NULL' : $pdo->quote((string)$v);
    }
    fwrite($fh, 'INSERT INTO ' . $qt . ' (' . $colSql . ') VALUES (' . implode(', ', $vals) . ");\n");
  }
  fwrite($fh, "\n");
}
fwrite($fh, "SET FOREIGN_KEY_CHECKS=1;\n");
fclose($fh);

$dropped = 0;
if ($dropAll && $tables) {
  $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
  try {
    foreach (array_reverse($tables) as $table) {
      $pdo->exec('DROP TABLE IF EXISTS ' . quote_ident($table));
      $dropped++;
    }
  } finally {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
  }
}

echo json_encode([
  'ok' => true,
  'tables' => count($tables),
  'backup' => $backup,
  'bytes' => filesize($backup),
  'dropped' => $dropped,
], JSON_UNESCAPED_SLASHES) . PHP_EOL;
