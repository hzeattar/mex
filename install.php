<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/schema.php';
require_once __DIR__ . '/lib/settings.php';

header('Content-Type: application/json; charset=utf-8');

$key = (string)($_GET['key'] ?? '');
$reset = ((string)($_GET['reset'] ?? '') === '1');

$installKey = (string)(env('INSTALL_KEY', '') ?? '');
$isCli = (PHP_SAPI === 'cli');
if (!$isCli && $installKey === '') {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'Installer disabled on production']);
  exit;
}
if (!$isCli && ($key === '' || !hash_equals($installKey, $key))) {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'Forbidden']);
  exit;
}
if ($reset && (string)env('ALLOW_INSTALL_RESET', '0') !== '1') {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'Reset disabled']);
  exit;
}

function rrmdir_files(string $dir): void {
  if (!is_dir($dir)) return;
  foreach (new DirectoryIterator($dir) as $f) {
    if ($f->isDot()) continue;
    $p = $f->getPathname();
    if ($f->isDir()) {
      rrmdir_files($p);
      @rmdir($p);
    } else {
      @unlink($p);
    }
  }
}

function install_reset(PDO $pdo, string $driver): void {
  $driver = strtolower($driver);
  $dataDir = __DIR__ . '/data';

  // Clear schema markers so auto-migrate can run cleanly
  @unlink($dataDir . '/.schema_version');
  @unlink($dataDir . '/.migrated');

  // Clear caches/logs (best-effort)
  rrmdir_files($dataDir . '/cache');
  rrmdir_files($dataDir . '/locks');
  @unlink($dataDir . '/php_errors.log');
  @unlink($dataDir . '/migrate.log');

  if ($driver === 'mysql') {
    // Drop EVERYTHING in the current database
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM) ?: [];
    foreach ($tables as $t) {
      $name = (string)($t[0] ?? '');
      if ($name === '') continue;
      $pdo->exec('DROP TABLE IF EXISTS `' . str_replace('`','``',$name) . '`');
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    return;
  }

  // SQLite: delete db file (+ wal/shm)
  $path = (string)(env('DB_SQLITE_PATH', __DIR__ . '/data/app.db') ?? (__DIR__ . '/data/app.db'));
  if (!str_starts_with($path, '/')) {
    $base = realpath(__DIR__ . '/../') ?: __DIR__ . '/../';
    $path = $base . '/' . ltrim($path, '/');
  }
  if ($path) {
    @unlink($path);
    @unlink($path . '-wal');
    @unlink($path . '-shm');
  }
}

try {
  $driver = db_driver();
  $pdo = db();

  if ($reset) {
    install_reset($pdo, $driver);
    // Reconnect (SQLite file may have been removed)
    $pdo = db();
    $driver = db_driver();
  }

  // Force schema install/upgrade + defaults now (even if AUTO_MIGRATE=0)
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  schema_seed_defaults($pdo, $driver);

  @file_put_contents(__DIR__ . '/data/.schema_version', SCHEMA_VERSION);
  try { setting_set('META_SCHEMA_VER', SCHEMA_VERSION); } catch (Throwable $e) {}

  echo json_encode([
    'ok' => true,
    'driver' => $driver,
    'reset' => $reset ? 1 : 0,
    'schema' => SCHEMA_VERSION,
    'ts' => time(),
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok'=>false,
    'error'=>$e->getMessage(),
  ]);
}
