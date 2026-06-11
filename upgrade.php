<?php
// Force DB migrate/seed for this script
define('FORCE_MIGRATE', true);

if (!function_exists('json')) {
  function json($data, int $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
}
// Manual schema bootstrap / upgrade endpoint.
// Called by the WebApp when it detects missing tables/columns.
//
// IMPORTANT: On some shared hosts, 500 errors come back with an EMPTY body.
// This file is intentionally defensive so we ALWAYS respond with JSON.

@ini_set('display_errors', '0');
@ini_set('log_errors', '1');
@ini_set('error_reporting', (string)E_ALL);

if (!headers_sent()) {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
}

register_shutdown_function(function () {
  $e = error_get_last();
  if (!$e) return;
  $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
  if (!in_array($e['type'] ?? 0, $fatalTypes, true)) return;
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'error' => 'Fatal: ' . ($e['message'] ?? 'Unknown fatal'),
    'file' => basename($e['file'] ?? ''),
    'line' => $e['line'] ?? 0,
  ], JSON_UNESCAPED_SLASHES);
});

try {
  require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/schema.php';
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'error' => 'Bootstrap failed: ' . $e->getMessage(),
    'type' => get_class($e),
    'file' => basename($e->getFile()),
    'line' => $e->getLine(),
  ], JSON_UNESCAPED_SLASHES);
  exit;
}

$key = $_GET['key'] ?? '';
$master = getenv('MASTER_KEY') ?: 'master';
if ($key !== $master) {
  json(['ok' => false, 'error' => 'Forbidden'], 403);
}

try {
  $pdo = db();
  $driver = db_driver();

  if (!function_exists('schema_install') || !function_exists('schema_upgrade') || !function_exists('schema_seed')) {
    throw new RuntimeException('Schema functions are missing. Upload /api/lib/schema.php and /api/lib/common.php.');
  }

  // Idempotent: safe to call repeatedly.
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  schema_seed($pdo, $driver);

  json([
    'ok' => true,
    'message' => 'Upgraded',
    'driver' => $driver,
  ]);
} catch (Throwable $e) {
  // Also log server-side for easier SSH debugging.
  error_log('upgrade.php error: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
  json([
    'ok' => false,
    'error' => $e->getMessage(),
    'type' => get_class($e),
    'file' => basename($e->getFile()),
    'line' => $e->getLine(),
  ], 500);
}
