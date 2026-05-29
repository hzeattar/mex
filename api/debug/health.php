<?php
// Health + schema check (JSON)
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';

$k = (string)($_GET['key'] ?? '');
$allowed = array_values(array_filter([
  (string)env('DEBUG_KEY',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
], fn($v)=>$v!=='' ));
if ($k === '' || !in_array($k, $allowed, true)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$report = [
  'php' => PHP_VERSION,
  'driver' => db_driver(),
  'time' => time(),
  'error_log' => (string)(ini_get('error_log') ?: ''),
  'db_host_kind' => mysql_private_host_like(env_nonempty('DB_HOST')) ? 'private' : (env_nonempty('DB_HOST') !== '' ? 'public_or_custom' : 'missing'),
  'mysql_public_url_present' => env_nonempty('MYSQL_PUBLIC_URL') !== '',
  'db_use_public_proxy' => (string)env('DB_USE_PUBLIC_PROXY', 'auto'),
];

try {
  $dbStart = microtime(true);
  $pdo = db();
  $report['db_ok'] = true;
  $report['db_connect_ms'] = (int)round((microtime(true) - $dbStart) * 1000);
  $queryStart = microtime(true);
  $report['db_time'] = (int)($pdo->query('SELECT 1')->fetchColumn() ?: 0);
  $report['db_query_ms'] = (int)round((microtime(true) - $queryStart) * 1000);
} catch (Throwable $e) {
  $report['db_ok'] = false;
  $report['db_error'] = $e->getMessage();
  json_response(['ok'=>true,'report'=>$report]);
}

try {
  $drv = db_driver();
  $pdo = db();
  $need = [
    ['market_quotes','mark_price'],
    ['market_quotes','index_price'],
    ['wallets','currency'],
    ['positions','status'],
    ['orders','status'],
  ];
  $cols = [];
  foreach ($need as [$t,$c]) {
    $cols[$t.'.'.$c] = function_exists('schema_column_exists') ? schema_column_exists($pdo, $t, $c, $drv) : null;
  }
  $report['columns'] = $cols;
} catch (Throwable $e) {
  $report['columns_error'] = $e->getMessage();
}

json_response(['ok'=>true,'report'=>$report]);
