<?php
// Basic smoke test (run locally): php tests/smoke.php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';
require_once __DIR__ . '/api/lib/ledger.php';

try {
  $pdo = db();
} catch (Throwable $e) {
  // Common on minimal PHP installs: PDO without pdo_sqlite / pdo_mysql
  fwrite(STDERR, "SKIP: " . $e->getMessage() . PHP_EOL);
  exit(0);
}

try { $pdo->query('SELECT 1 FROM users LIMIT 1'); } catch (Throwable $e) {
  schema_install($pdo, db_driver());
  schema_seed_defaults($pdo, db_driver());
}

$now = time();
$pdo->prepare('INSERT INTO users(tg_id,username,first_name,last_name,locale,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    ->execute(['999999','smoke','Smoke','Test','en', $now, $now]);
$uid = (int)$pdo->lastInsertId();
ensure_wallet($uid,'USDT');
ledger_add($uid,'USDT',100,'test_credit','test','1',[]);
$b = wallet_available($uid,'USDT');
if (abs($b['available'] - 100) > 1e-6) {
  echo "FAIL
";
  exit(1);
}

echo "OK
";
