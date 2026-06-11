<?php
// Ultra-light health check — does NOT require database.
// Returns 200 as long as PHP-FPM is alive and nginx is forwarding.
// Add ?diag=1 for DB + runtime diagnostics.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$payload = ['ok'=>true,'service'=>'mexgroup','time'=>time()];

if ((int)($_GET['diag'] ?? 0) === 1) {
  require_once __DIR__ . '/api/lib/common.php';
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
    'railway_project_id' => env_nonempty('RAILWAY_PROJECT_ID') !== '' ? env_nonempty('RAILWAY_PROJECT_ID') : null,
    'railway_project_name' => env_nonempty('RAILWAY_PROJECT_NAME') !== '' ? env_nonempty('RAILWAY_PROJECT_NAME') : null,
    'railway_service_id' => env_nonempty('RAILWAY_SERVICE_ID') !== '' ? env_nonempty('RAILWAY_SERVICE_ID') : null,
    'railway_service_name' => env_nonempty('RAILWAY_SERVICE_NAME') !== '' ? env_nonempty('RAILWAY_SERVICE_NAME') : null,
    'railway_environment_id' => env_nonempty('RAILWAY_ENVIRONMENT_ID') !== '' ? env_nonempty('RAILWAY_ENVIRONMENT_ID') : null,
    'railway_environment_name' => env_nonempty('RAILWAY_ENVIRONMENT_NAME') !== '' ? env_nonempty('RAILWAY_ENVIRONMENT_NAME') : null,
    'db_driver' => db_driver(),
    'mysql_env_present' => env_nonempty('MYSQLHOST') !== '' || mysql_url_env() !== '',
    'db_host_present' => env_nonempty('DB_HOST') !== '',
    'db_name_present' => env_nonempty('DB_NAME') !== '',
    'db_user_present' => env_nonempty('DB_USER') !== '',
    'db_pass_present' => env_nonempty('DB_PASS') !== '',
    'placeholder_mysql_config' => railway_mysql_placeholders_only(),
  ];
  // Test DB connection only in diag mode
  try {
    $pdo = db();
    $payload['db_status'] = 'connected';
    $payload['db_driver_actual'] = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
  } catch (Throwable $e) {
    $payload['db_status'] = 'failed: ' . $e->getMessage();
  }
}

echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
