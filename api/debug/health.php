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
  'auto_migrate' => (string)env('AUTO_MIGRATE', '1'),
];

function health_mysql_probe(string $label, array $cfg): array {
  $host = trim((string)($cfg['host'] ?? ''));
  $port = trim((string)($cfg['port'] ?? '')) ?: '3306';
  $name = trim((string)($cfg['name'] ?? ''));
  $user = trim((string)($cfg['user'] ?? ''));
  $pass = (string)($cfg['pass'] ?? '');
  $out = [
    'label' => $label,
    'host_kind' => mysql_private_host_like($host) ? 'private' : ($host !== '' ? 'public_or_custom' : 'missing'),
    'port' => $port,
    'db_present' => $name !== '',
    'user_present' => $user !== '',
    'pass_present' => $pass !== '',
  ];
  if ($host === '' || $name === '' || $user === '') {
    $out['ok'] = false;
    $out['error'] = 'incomplete';
    return $out;
  }
  $start = microtime(true);
  try {
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_TIMEOUT => 4,
    ]);
    $out['connect_ms'] = (int)round((microtime(true) - $start) * 1000);
    $q = microtime(true);
    $out['select_1'] = (int)($pdo->query('SELECT 1')->fetchColumn() ?: 0);
    $out['query_ms'] = (int)round((microtime(true) - $q) * 1000);
    $out['ok'] = true;
  } catch (Throwable $e) {
    $out['connect_ms'] = (int)round((microtime(true) - $start) * 1000);
    $out['ok'] = false;
    $out['error'] = $e->getMessage();
  }
  return $out;
}

$rawDbCfg = [
  'host' => env_nonempty('DB_HOST'),
  'port' => env_nonempty('DB_PORT') ?: '3306',
  'name' => env_nonempty('DB_NAME'),
  'user' => env_nonempty('DB_USER'),
  'pass' => (string)env('DB_PASS', ''),
];
$mysqlVarCfg = [
  'host' => env_nonempty('MYSQLHOST'),
  'port' => env_nonempty('MYSQLPORT') ?: '3306',
  'name' => env_nonempty('MYSQLDATABASE') ?: env_nonempty('MYSQL_DATABASE'),
  'user' => env_nonempty('MYSQLUSER') ?: 'root',
  'pass' => env_nonempty('MYSQLPASSWORD') ?: env_nonempty('MYSQL_ROOT_PASSWORD'),
];
$report['mysql_probes'] = [
  health_mysql_probe('db_vars', $rawDbCfg),
  health_mysql_probe('mysql_vars', $mysqlVarCfg),
  health_mysql_probe('mysql_public_url', mysql_public_proxy_config()),
  health_mysql_probe('mysql_url', mysql_url_config_key('MYSQL_URL')),
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
