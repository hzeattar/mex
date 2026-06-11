<?php
require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/schema.php';
putenv('APP_ENV=local'); putenv('DB_DRIVER=sqlite'); putenv('DB_SQLITE_PATH=./api/data/test.sqlite');
$root = dirname(__DIR__);
@unlink($root . '/api/data/test.sqlite'); @unlink($root . '/api/data/test.sqlite-wal'); @unlink($root . '/api/data/test.sqlite-shm');
$pdo = db();
schema_install($pdo, 'sqlite');
schema_upgrade($pdo, 'sqlite');
foreach (['deposits', 'withdrawals', 'positions', 'orders', 'wallets', 'users', 'trading_bots', 'trading_bot_subscriptions', 'signals', 'investments', 'invest_plans', 'trading_bot_commissions', 'markets', 'market_quotes', 'kyc_requests'] as $t) {
  try {
    $cols = $pdo->query("PRAGMA table_info($t)")->fetchAll(PDO::FETCH_ASSOC);
    echo "=== $t (" . count($cols) . " cols) ===\n";
    foreach ($cols as $c) echo '  ' . $c['name'] . ' (' . $c['type'] . ")\n";
    echo "\n";
  } catch (Throwable $e) { echo "$t: MISSING\n\n"; }
}
