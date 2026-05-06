<?php
require_once __DIR__ . '/lib/common.php';

$payload = ['ok'=>true,'service'=>'vertexpluse','time'=>time()];

if ((int)($_GET['diag'] ?? 0) === 1) {
  $payload['php'] = [
    'version' => PHP_VERSION,
    'pdo_drivers' => PDO::getAvailableDrivers(),
    'extensions' => [
      'curl' => extension_loaded('curl'),
      'pdo_mysql' => extension_loaded('pdo_mysql'),
      'mysqli' => extension_loaded('mysqli'),
      'mbstring' => extension_loaded('mbstring'),
      'gd' => extension_loaded('gd'),
      'zip' => extension_loaded('zip'),
    ],
  ];
  $payload['runtime'] = [
    'railway' => railway_runtime(),
    'db_driver' => db_driver(),
    'mysql_env_present' => env_nonempty('MYSQLHOST') !== '' || mysql_url_env() !== '',
    'db_host_present' => env_nonempty('DB_HOST') !== '',
    'db_name_present' => env_nonempty('DB_NAME') !== '',
    'db_user_present' => env_nonempty('DB_USER') !== '',
    'db_pass_present' => env_nonempty('DB_PASS') !== '',
    'placeholder_mysql_config' => railway_mysql_placeholders_only(),
  ];
}

json_response($payload);
