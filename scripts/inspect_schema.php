<?php
require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/schema.php';

putenv('APP_ENV=local');
putenv('DB_DRIVER=sqlite');
putenv('DB_SQLITE_PATH=./api/data/test.sqlite');
$_ENV['APP_ENV'] = 'local';
$_ENV['DB_DRIVER'] = 'sqlite';
$_ENV['DB_SQLITE_PATH'] = './api/data/test.sqlite';

$root = dirname(__DIR__);
@unlink($root . '/api/data/test.sqlite');
@unlink($root . '/api/data/test.sqlite-wal');
@unlink($root . '/api/data/test.sqlite-shm');

$pdo = db();
schema_install($pdo, 'sqlite');
schema_upgrade($pdo, 'sqlite');

$cols = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
echo 'users columns: ' . count($cols) . PHP_EOL;
foreach ($cols as $c) {
  echo '  ' . $c['name'] . ' (' . $c['type'] . ')' . PHP_EOL;
}
echo PHP_EOL;

echo '===positions===' . PHP_EOL;
$cols = $pdo->query('PRAGMA table_info(positions)')->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) echo '  ' . $c['name'] . ' (' . $c['type'] . ')' . PHP_EOL;
echo PHP_EOL;

echo '===orders===' . PHP_EOL;
$cols = $pdo->query('PRAGMA table_info(orders)')->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) echo '  ' . $c['name'] . ' (' . $c['type'] . ')' . PHP_EOL;
echo PHP_EOL;

echo '===wallets===' . PHP_EOL;
$cols = $pdo->query('PRAGMA table_info(wallets)')->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) echo '  ' . $c['name'] . ' (' . $c['type'] . ')' . PHP_EOL;
