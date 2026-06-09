<?php
declare(strict_types=1);

// Ensure API endpoints never output partial HTML on fatals/exceptions.
// Telegram MiniApp expects JSON; any warning/HTML breaks the UI.
@ob_start();

// Load schema helpers reliably (some deployments may change filename casing)
$__schemaPath = __DIR__ . '/schema.php';
if (!file_exists($__schemaPath)) { $__schemaPath = __DIR__ . '/Schema.php'; }
require_once $__schemaPath;
unset($__schemaPath);


// IMPORTANT:
// - Warnings/Notices printed by PHP will break JSON responses and make the MiniApp show "wallet not ready" / "setup required".
// - On shared hosting we log errors instead of echoing them.
error_reporting(E_ALL);

/**
 * Initialize error logging on shared hosting.
 * Ensures api/data exists and php_errors.log is writable.
 */
function __init_error_logging(): void {
  $env = (string)(getenv('APP_ENV') ?: 'prod');
  if ($env === 'local') return;

  @ini_set('display_errors', '0');
  @ini_set('log_errors', '1');

  $dir = __DIR__ . '/../data';
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

  $log = rtrim($dir, '/\\') . '/php_errors.log';
  // Touch the log file so it exists in production.
  if (!is_file($log)) { @file_put_contents($log, "", FILE_APPEND); }

  // If not writable, fall back to system temp.
  if (!is_writable(dirname($log)) || (is_file($log) && !is_writable($log))) {
    $log = rtrim(sys_get_temp_dir(), '/\\') . '/tp_php_errors.log';
    @file_put_contents($log, "", FILE_APPEND);
  }

  if (!defined('TP_PHP_ERROR_LOG')) define('TP_PHP_ERROR_LOG', $log);
  @ini_set('error_log', $log);
}

__init_error_logging();

/**
 * Emergency JSON response for fatal errors / uncaught exceptions.
 *
 * If APP_DEBUG=1, returns error details (for dev only).
 */
function __api_fail(Throwable $e, int $code = 500): void {
  // Best effort: clear any buffered output so we only return JSON.
  while (ob_get_level() > 0) { @ob_end_clean(); }
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');

  // Always log in prod so we can debug 500s quickly.
  try {
    $msg = '[' . date('c') . '] ' . get_class($e) . ': ' . ($e->getMessage() ?: 'Server error');
    $msg .= ' @ ' . ($e->getFile() ?: '?') . ':' . (string)$e->getLine();
    $msg .= "\n" . $e->getTraceAsString();
    error_log($msg);
    try { tp_log('php','ERROR','__api_fail', ['msg'=>$e->getMessage(),'file'=>$e->getFile(),'line'=>$e->getLine()]); } catch (Throwable $ignored2) {}
  } catch (Throwable $ignored) {}

  $debugRaw = (string)(getenv('APP_DEBUG') ?: '0');
  $debug = ($debugRaw === '1' || strtolower($debugRaw) === 'true');

  $payload = [
    'ok' => false,
    'error' => $debug ? ($e->getMessage() ?: 'Server error') : 'Server error',
  ];
  if ($debug) {
    $payload['type'] = get_class($e);
    $payload['trace'] = explode("\n", $e->getTraceAsString());
  }

  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

set_exception_handler(function(Throwable $e){
  __api_fail($e, 500);
});

register_shutdown_function(function(){
  $err = error_get_last();
  if (!$err) return;
  $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
  if (!in_array($err['type'] ?? 0, $fatalTypes, true)) return;
  $msg = (string)($err['message'] ?? 'Fatal error');
  $file = (string)($err['file'] ?? '');
  $line = (int)($err['line'] ?? 0);
  __api_fail(new Error($msg . ($file ? " @ {$file}:{$line}" : '')), 500);
});

require_once __DIR__ . '/dotenv.php';
load_dotenv();

// Structured logs + cron status snapshots
require_once __DIR__ . '/logger.php';

// Per-request id (helps correlate logs across endpoints)
if (!defined('TP_REQ_ID')) {
  try { define('TP_REQ_ID', bin2hex(random_bytes(8))); }
  catch (Throwable $e) { define('TP_REQ_ID', uniqid('r', true)); }
}

// Capture PHP warnings/notices into logs (prevents breaking JSON output)
set_error_handler(function(int $severity, string $message, string $file = '', int $line = 0){
  if (!(error_reporting() & $severity)) return false;
  $nonFatal = [E_WARNING,E_NOTICE,E_USER_WARNING,E_USER_NOTICE,E_DEPRECATED,E_USER_DEPRECATED,E_STRICT];
  if (in_array($severity, $nonFatal, true)) {
    try { tp_log('php', 'WARN', $message, ['severity'=>$severity,'file'=>$file,'line'=>$line]); } catch (Throwable $e) {}
    try { error_log('[php] '.$message.' @ '.$file.':'.$line); } catch (Throwable $e) {}
    return true;
  }
  return false;
});

function json_response(array $data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/**
 * Cacheable JSON response for public market data.
 * Allows browser/CDN to cache for a few seconds, dramatically reducing
 * API calls for repeated visits and back-navigation.
 */
function json_cacheable_response(array $data, int $maxAge = 5, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header("Cache-Control: public, max-age={$maxAge}, s-maxage={$maxAge}");
  header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $maxAge) . ' GMT');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/**
 * Read environment variables safely.
 *
 * With strict_types=1, callers may pass ints/bools as defaults,
 * so the default must be mixed.
 */
function env(string $key, mixed $default = null): mixed {
  $v = getenv($key);
  if ($v === false || $v === '') return $default;
  return $v;
}
/**
 * Acquire an exclusive lock for migrations/seeding to avoid SQLite "database is locked"
 * and to prevent parallel schema changes from cron + web requests.
 */
function migrate_lock_acquire(): mixed {
  $dir = realpath(__DIR__ . '/../data') ?: (__DIR__ . '/../data');
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
  $path = rtrim($dir, '/\\') . '/migrate.lock';
  $fh = @fopen($path, 'c+');
  if ($fh === false) return null;
  // Wait up to ~10s (best effort) on shared hosting
  $start = microtime(true);
  while (!@flock($fh, LOCK_EX | LOCK_NB)) {
    if ((microtime(true) - $start) > 10.0) break;
    usleep(200000);
  }
  // If we failed to lock, still return handle (some FS ignore locks); schema ops are idempotent.
  return $fh;
}
function migrate_lock_release(mixed $fh): void {
  if (!is_resource($fh)) return;
  @flock($fh, LOCK_UN);
  @fclose($fh);
}


function app_key(): string {
  $k = env('APP_KEY', '');
  if (!$k || strlen($k) < 16) {
    // Do not crash prod pages, but crypto features will refuse.
    return '';
  }
  return $k;
}

function require_method(string $method): void {
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== strtoupper($method)) {
    json_response(['ok'=>false,'error'=>'Method not allowed'], 405);
  }
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

// Backward-compat alias (older endpoints used json_body())
function json_body(): array {
  return read_json_body();
}

function env_nonempty(string $key): string {
  $v = getenv($key);
  return ($v === false) ? '' : trim((string)$v);
}

function env_placeholder_value(string $value): bool {
  $v = strtolower(trim($value));
  if ($v === '') return true;
  return in_array($v, ['your_password_here', 'your-password-here', 'change_me', 'changeme', 'xxx', 'null'], true);
}

function railway_runtime(): bool {
  return env_nonempty('RAILWAY_ENVIRONMENT') !== '' || env_nonempty('RAILWAY_SERVICE_NAME') !== '';
}

function mysql_url_env(): string {
  foreach (['MYSQL_URL', 'MYSQL_PRIVATE_URL', 'MYSQL_PUBLIC_URL', 'DATABASE_URL'] as $key) {
    $url = env_nonempty($key);
    if ($url === '') continue;
    $parts = parse_url($url);
    if (!is_array($parts)) continue;
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    if ($scheme === 'mysql' || $scheme === 'mariadb') return $url;
  }
  return '';
}

function mysql_url_config(): array {
  $url = mysql_url_env();
  if ($url === '') return [];
  return mysql_url_parse_config($url);
}

function mysql_url_parse_config(string $url): array {
  $parts = parse_url($url);
  if (!is_array($parts)) return [];
  $path = trim((string)($parts['path'] ?? ''), '/');
  return [
    'host' => (string)($parts['host'] ?? ''),
    'port' => (string)($parts['port'] ?? ''),
    'name' => $path,
    'user' => isset($parts['user']) ? rawurldecode((string)$parts['user']) : '',
    'pass' => isset($parts['pass']) ? rawurldecode((string)$parts['pass']) : '',
  ];
}

function mysql_url_config_key(string $key): array {
  $url = env_nonempty($key);
  if ($url === '') return [];
  $parts = parse_url($url);
  if (!is_array($parts)) return [];
  $scheme = strtolower((string)($parts['scheme'] ?? ''));
  if ($scheme !== 'mysql' && $scheme !== 'mariadb') return [];
  return mysql_url_parse_config($url);
}

function mysql_private_host_like(string $host): bool {
  $host = strtolower(trim($host));
  return $host !== '' && (
    str_contains($host, '.railway.internal') ||
    str_contains($host, '.internal') ||
    $host === 'mysql'
  );
}

function mysql_public_proxy_config(): array {
  $cfg = mysql_url_config_key('MYSQL_PUBLIC_URL');
  if ($cfg) return $cfg;
  $host = env_nonempty('RAILWAY_TCP_PROXY_DOMAIN');
  $port = env_nonempty('RAILWAY_TCP_PROXY_PORT');
  if ($host === '' || $port === '') return [];
  return [
    'host' => $host,
    'port' => $port,
    'name' => env_nonempty('MYSQLDATABASE') ?: env_nonempty('MYSQL_DATABASE'),
    'user' => env_nonempty('MYSQLUSER') ?: 'root',
    'pass' => env_nonempty('MYSQLPASSWORD') ?: env_nonempty('MYSQL_ROOT_PASSWORD'),
  ];
}

function railway_mysql_placeholders_only(): bool {
  if (!railway_runtime()) return false;
  if (env_nonempty('MYSQLHOST') !== '' || mysql_url_env() !== '') return false;
  $host = strtolower(env_nonempty('DB_HOST'));
  $name = strtolower(env_nonempty('DB_NAME'));
  $user = strtolower(env_nonempty('DB_USER'));
  $pass = env_nonempty('DB_PASS');
  $localHost = ($host === '' || in_array($host, ['localhost', '127.0.0.1'], true));
  $placeholderName = ($name === '' || in_array($name, ['mex', 'vertexpluse', 'vertexpluse_meg', 'mexgroup'], true));
  $placeholderUser = ($user === '' || in_array($user, ['root', 'vertexpluse_user', 'vertexpluse_mega', 'mexgroup_user'], true));
  return $localHost && $placeholderName && $placeholderUser && env_placeholder_value($pass);
}

function db_driver(): string {
  $configured = strtolower(trim((string)env('DB_DRIVER', '')));
  if ($configured === 'mariadb') $configured = 'mysql';
  if ($configured === 'mysql' && railway_mysql_placeholders_only() && env('DB_ALLOW_SQLITE_FALLBACK', '1') !== '0') {
    return 'sqlite';
  }
  if ($configured !== '') return $configured;
  if (env_nonempty('MYSQLHOST') !== '' || mysql_url_env() !== '') {
    return 'mysql';
  }
  return 'sqlite';
}

function require_pdo_driver(string $driverName): void {
  // PDO needs specific drivers (pdo_sqlite / pdo_mysql). If missing, fail with a clear error.
  $avail = PDO::getAvailableDrivers();
  if (!in_array($driverName, $avail, true)) {
    $msg = "Missing PDO driver '{$driverName}'. Enable the PHP extension (pdo_{$driverName}) or switch DB_DRIVER to a supported driver. Available: " . implode(', ', $avail);
    throw new RuntimeException($msg);
  }
}

function db_connect_retryable(Throwable $e): bool {
  $message = strtolower($e->getMessage());
  $code = (string)$e->getCode();
  $mysqlErrorCode = null;

  if ($e instanceof PDOException && isset($e->errorInfo) && is_array($e->errorInfo)) {
    $mysqlErrorCode = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : null;
  }

  if (in_array($mysqlErrorCode, [2006, 2013], true)) return true;
  if (in_array($code, ['2006', '2013'], true)) return true;

  if ($code === 'HY000') {
    return str_contains($message, 'server has gone away')
      || str_contains($message, 'lost connection')
      || str_contains($message, 'connection timed out')
      || str_contains($message, 'connection timeout')
      || str_contains($message, 'temporarily unavailable');
  }

  return str_contains($message, 'server has gone away')
    || str_contains($message, 'lost connection to mysql server');
}

function db_connect_backoff(int $attempt): void {
  $delayUs = min(750000, 150000 * ($attempt + 1));
  usleep($delayUs);
}


function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  // Schema version marker used by both MySQL and SQLite bootstrapping.
  $schemaVer = defined('SCHEMA_VERSION') ? (string)SCHEMA_VERSION : '1';

  // Defensive include: keep schema functions available even if entrypoints
  // include files in a different order on shared hosting.
  require_once __DIR__ . '/schema.php';
  require_once __DIR__ . '/feature_bootstrap.php';

  $driver = db_driver();
  if ($driver === 'mysql') {
    require_pdo_driver('mysql');
    $urlCfg = mysql_url_config();
    $railway = railway_runtime();
    $mysqlHost = env_nonempty('MYSQLHOST') ?: (string)($urlCfg['host'] ?? '');
    $mysqlName = env_nonempty('MYSQLDATABASE') ?: (string)($urlCfg['name'] ?? '');
    $mysqlUser = env_nonempty('MYSQLUSER') ?: (string)($urlCfg['user'] ?? '');
    $mysqlPass = env_nonempty('MYSQLPASSWORD') ?: (string)($urlCfg['pass'] ?? '');
    $mysqlPort = env_nonempty('MYSQLPORT') ?: (string)($urlCfg['port'] ?? '');

    $host = trim((string)env('DB_HOST', ''));
    if ($host === '' || ($railway && in_array(strtolower($host), ['localhost', '127.0.0.1'], true) && $mysqlHost !== '')) {
      $host = $mysqlHost !== '' ? $mysqlHost : 'localhost';
    }
    $port = trim((string)env('DB_PORT', ''));
    if ($port === '' || ($railway && $mysqlPort !== '' && $port === '3306')) $port = $mysqlPort !== '' ? $mysqlPort : '3306';

    $name = trim((string)env('DB_NAME', ''));
    if ($name === '' || ($railway && $mysqlName !== '' && in_array(strtolower($name), ['mex', 'vertexpluse', 'vertexpluse_meg', 'mexgroup'], true))) {
      $name = $mysqlName;
    }
    $user = trim((string)env('DB_USER', ''));
    if ($user === '' || ($railway && $mysqlUser !== '' && in_array(strtolower($user), ['root', 'vertexpluse_user', 'vertexpluse_mega', 'mexgroup_user'], true))) {
      $user = $mysqlUser;
    }
    $pass = (string)env('DB_PASS', '');
    if (env_placeholder_value($pass) && $mysqlPass !== '') $pass = $mysqlPass;
    // In this Railway project the private MySQL endpoint may be unavailable
    // unless outbound IPv6/private networking is fully enabled on the app
    // service. Prefer the public TCP proxy on Railway for reliability, while
    // allowing DB_USE_PUBLIC_PROXY=0 once private networking is verified.
    $usePublicProxy = strtolower((string)env('DB_USE_PUBLIC_PROXY', $railway ? '1' : 'auto'));
    if ($railway && !in_array($usePublicProxy, ['0', 'false', 'no', 'off'], true) && mysql_private_host_like($host)) {
      $publicCfg = mysql_public_proxy_config();
      if (!empty($publicCfg['host']) && !empty($publicCfg['port'])) {
        $host = (string)$publicCfg['host'];
        $port = (string)$publicCfg['port'];
        if (!empty($publicCfg['name'])) $name = (string)$publicCfg['name'];
        if (!empty($publicCfg['user'])) $user = (string)$publicCfg['user'];
        if (array_key_exists('pass', $publicCfg) && (string)$publicCfg['pass'] !== '') $pass = (string)$publicCfg['pass'];
      }
    }
    if (!$name || !$user) {
      throw new RuntimeException('DB is not configured. Set DB_* or Railway MYSQL* variables.');
    }
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $connectTimeout = max(1, min(30, (int)env('DB_CONNECT_TIMEOUT', $railway ? '8' : '5')));
    $pdoOptions = [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_TIMEOUT => $connectTimeout,
    ];
    $persistentRaw = strtolower(trim((string)env('DB_PERSISTENT', $railway ? '0' : '1')));
    $persistentEnabled = !$railway
      && PHP_SAPI !== 'cli'
      && !in_array($persistentRaw, ['0', 'false', 'no', 'off'], true);
    if ($persistentEnabled) {
      $pdoOptions[PDO::ATTR_PERSISTENT] = true;
    }
    $connectRetries = max(0, min(5, (int)env('DB_CONNECT_RETRIES', $railway ? '2' : '0')));
    $lastConnectError = null;
    for ($attempt = 0; $attempt <= $connectRetries; $attempt++) {
      try {
        $pdo = new PDO($dsn, $user, $pass, $pdoOptions);
        break;
      } catch (Throwable $e) {
        $lastConnectError = $e;
        if ($attempt >= $connectRetries || !db_connect_retryable($e)) {
          throw $e;
        }
        db_connect_backoff($attempt);
      }
    }
    if (!$pdo instanceof PDO) {
      if ($lastConnectError instanceof Throwable) throw $lastConnectError;
      throw new RuntimeException('Could not connect to the configured database.');
    }

    // Auto-install/upgrade schema (MySQL + SQLite). Idempotent & safe to call often.
    // On Railway, schema migration runs on the first request. If it takes too long
    // or fails, we must not crash the entire container — return the PDO connection
    // so the app can at least serve pages that don't need DB.
    static $bootstrapped = false;
    if (!$bootstrapped && env('AUTO_MIGRATE','1') !== '0') {
      $bootstrapped = true;
      require_once __DIR__ . '/schema.php';

      // Fast path: when the DB already records the current schema version, skip the
      // expensive install/upgrade scan. The upgrade issues hundreds of
      // information_schema round-trips, which over the Railway DB proxy can take
      // tens of seconds. Without this gate every cold PHP-FPM worker pays that cost
      // on its first DB request (very slow immediately after a deploy/restart).
      // Mirrors the version-marker gating already used by the SQLite branch below.
      if (!defined('FORCE_MIGRATE') && function_exists('schema_setting_get')) {
        try {
          $dbSchemaVer = (string)(schema_setting_get($pdo, 'mysql', 'META_SCHEMA_VER', '') ?: '');
        } catch (Throwable $e) {
          $dbSchemaVer = '';
        }
        if ($dbSchemaVer !== '' && $dbSchemaVer === $schemaVer) {
          return $pdo;
        }
      }

      $driver = 'mysql';
      try { $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) ?: 'mysql'; } catch (Throwable $e) {}

      // Defensive: in case an older schema.php is deployed
      if (!function_exists('schema_install')) {
        error_log('[db] schema_install() is missing — skipping migration');
        return $pdo;
      }
      if (!function_exists('schema_upgrade')) {
        function schema_upgrade(PDO $pdo, string $driver = 'mysql'): void { /* noop */ }
      }

      // Install base tables then apply upgrades (both are idempotent)
      // Wrap in try/catch so a failed migration does not kill the container.
      try {
        $lock = migrate_lock_acquire();
        try {
          schema_install($pdo, $driver);
          schema_upgrade($pdo, $driver);
          vp_feature_bootstrap($pdo, $driver);
          // Seed defaults only once (heavy writes). Upgrades should not re-seed unless forced.
          $seedDone = '';
          try {
            $seedDone = (string)(schema_setting_get($pdo, $driver, 'META_SEED_DONE', '') ?: '');
          } catch (Throwable $e) {
            $seedDone = '';
          }
          if ($seedDone !== '1' || defined('FORCE_SEED')) {
            if (function_exists('schema_seed_defaults')) {
              schema_seed_defaults($pdo, $driver);
            }
          }
        // Persist schema version in DB to avoid repeated upgrades when marker file isn't writable.
          try {
            $now = time();
            schema_setting_set($pdo, $driver, 'META_SCHEMA_VER', (string)$schemaVer, $now);
          } catch (Throwable $e) {
            // ignore
          }
        } finally {
          migrate_lock_release($lock);
        }
      } catch (Throwable $migrateError) {
        error_log('[db] Schema migration failed (non-fatal): ' . $migrateError->getMessage());
        // Still return the PDO connection — the app can handle missing tables gracefully
      }
    }
    return $pdo;
  }

  // SQLite fallback (local/dev)
  require_pdo_driver('sqlite');

  // Respect DB_SQLITE_PATH from .env.
  // Relative paths are resolved from the project root (one level above /api).
  $envPath = (string)env('DB_SQLITE_PATH', './api/data/app.sqlite');
  $envPath = trim($envPath);
  if ($envPath === '') $envPath = './api/data/app.sqlite';

  $projectRoot = realpath(__DIR__ . '/..');      // /api
  $webRoot     = realpath($projectRoot . '/..'); // project root (public_html)
  $path = $envPath;

  $isAbs = str_starts_with($envPath, '/') || preg_match('/^[A-Za-z]:\\\\/', $envPath);
  if (!$isAbs) {
    $path = $webRoot . '/' . ltrim($envPath, './');
  }

  $dir = dirname($path);
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

  if (!file_exists($path)) {
    $pdoTmp = new PDO('sqlite:' . $path);
    $pdoTmp->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdoTmp->setAttribute(PDO::ATTR_TIMEOUT, (int)env('DB_BUSY_TIMEOUT', '8'));
    $pdoTmp->exec('PRAGMA foreign_keys = ON;');
    $pdoTmp->exec('PRAGMA journal_mode = WAL;');
    $pdoTmp->exec('PRAGMA busy_timeout = 5000;');
    $pdoTmp->exec('PRAGMA synchronous = NORMAL;');
    $lock = migrate_lock_acquire();
    try {
      schema_install($pdoTmp, 'sqlite');
      schema_seed_defaults($pdoTmp, 'sqlite');
    } finally {
      migrate_lock_release($lock);
    }
  }

  $pdo = new PDO('sqlite:' . $path);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_TIMEOUT, (int)env('DB_BUSY_TIMEOUT', '8'));
  $pdo->exec('PRAGMA foreign_keys = ON;');
  $pdo->exec('PRAGMA journal_mode = WAL;');
  $pdo->exec('PRAGMA busy_timeout = 5000;');
  $pdo->exec('PRAGMA synchronous = NORMAL;');
  // Auto-upgrade schema (can be disabled via AUTO_MIGRATE=0).
  // NOTE: do not silently swallow migration errors; otherwise the UI will break JSON and show vague messages.
  static $migrated = false;
  // Prevent heavy install/seed from running on every PHP-FPM process start (shared hosting).
  // We still need upgrades when the code schema changes, so we store a schema version marker.
  $marker = __DIR__ . '/../data/.schema_version';
  $markerVer = file_exists($marker) ? trim((string)@file_get_contents($marker)) : '';
  $needsUpgrade = ($markerVer !== $schemaVer);
  // Fallback: if marker file can't be written/read reliably, trust DB-stored schema version.
  if ($needsUpgrade) {
    try {
      $dbVer = (string)(schema_setting_get($pdo, 'sqlite', 'META_SCHEMA_VER', '') ?: '');
      if ($dbVer !== '' && $dbVer === $schemaVer) {
        $needsUpgrade = false;
        @file_put_contents($marker, $schemaVer);
      }
    } catch (Throwable $e) {
      // ignore
    }
  }


  if (!$migrated && (env('AUTO_MIGRATE', '1') !== '0' || defined('FORCE_MIGRATE')) && ($needsUpgrade || defined('FORCE_MIGRATE'))) {
    $migrated = true;
    try {
      $drv = db_driver();
      $lock = migrate_lock_acquire();
      try {
        // Run migrations/seeding with retry on SQLite locks
        $tries = 0;
        while (true) {
          try {
            // Acquire an early write lock so other processes wait (reduces 'database is locked')
            if ($drv === 'sqlite') { $pdo->exec('BEGIN IMMEDIATE'); }
            schema_install($pdo, $drv);
            schema_upgrade($pdo, $drv);
            vp_feature_bootstrap($pdo, $drv);
            schema_seed_defaults($pdo, $drv);
            if ($drv === 'sqlite') { $pdo->exec('COMMIT'); }
            break;
          } catch (PDOException $e) {
            if ($drv === 'sqlite') { try { $pdo->exec('ROLLBACK'); } catch (Throwable $_) {} }
            $msg = $e->getMessage();
            if (strpos($msg, 'database is locked') !== false && $tries < 8) {
              $tries++;
              usleep(200000 * $tries); // 0.2s, 0.4s, ... up to 1.6s
              continue;
            }
            throw $e;
          } catch (Throwable $e) {
            if ($drv === 'sqlite') { try { $pdo->exec('ROLLBACK'); } catch (Throwable $_) {} }
            throw $e;
          }
        }
        @file_put_contents($marker, $schemaVer);

      } finally {
        migrate_lock_release($lock);
      }
    } catch (Throwable $e) {
      $msg = '['.date('c').'] MIGRATE_FAIL '.$e->getMessage()."\n".$e->getTraceAsString()."\n\n";
      @file_put_contents(__DIR__.'/../data/migrate.log', $msg, FILE_APPEND);
      throw $e;
    }
  }

  return $pdo;
}

function now_ts(): int { return time(); }

function bearer_token(): string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
    return trim($m[1]);
  }
  return '';
}

function tp_session_cookie_name(): string { return 'tp_session'; }
function tp_legacy_uid_cookie_name(): string { return 'tp_uid'; }

function tp_cookie_options(int $expires): array {
  $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
  return [
    'expires' => $expires,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => $https ? 'None' : 'Lax',
  ];
}

function tp_clear_legacy_uid_cookie(): void {
  setcookie(tp_legacy_uid_cookie_name(), '', tp_cookie_options(time() - 3600));
}

function tp_session_client_ip(): string {
  foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
    $raw = trim((string)($_SERVER[$k] ?? ''));
    if ($raw === '') continue;
    if ($k === 'HTTP_X_FORWARDED_FOR') {
      $raw = trim(explode(',', $raw)[0] ?? '');
    }
    return substr($raw, 0, 64);
  }
  return '';
}

function tp_session_user_agent(): string {
  return substr(trim((string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 255);
}

function tp_parse_session_cookie(?string $raw = null): array {
  $raw = $raw ?? (string)($_COOKIE[tp_session_cookie_name()] ?? '');
  if (!preg_match('/^([a-f0-9]{16,64})\.([a-f0-9]{32,128})$/i', $raw, $m)) {
    return ['selector'=>'', 'validator'=>''];
  }
  return ['selector'=>strtolower($m[1]), 'validator'=>strtolower($m[2])];
}

function tp_revoke_web_session_selector(string $selector): void {
  $selector = strtolower(trim($selector));
  if ($selector === '') return;
  try {
    $pdo = db();
    $pdo->prepare('UPDATE web_sessions SET revoked_at=? WHERE selector=? AND revoked_at IS NULL')->execute([time(), $selector]);
  } catch (Throwable $e) {}
}

function tp_create_web_session(int $uid, string $provider = 'web'): string {
  $pdo = db();
  $selector = bin2hex(random_bytes(9));
  $validator = bin2hex(random_bytes(32));
  $now = time();
  $exp = $now + 60*60*24*30;
  $hash = hash('sha256', $validator);
  $pdo->prepare('INSERT INTO web_sessions(user_id,selector,validator_hash,provider,user_agent,ip_address,created_at,last_used_at,expires_at,revoked_at) VALUES (?,?,?,?,?,?,?,?,?,NULL)')
      ->execute([$uid, $selector, $hash, substr($provider,0,16), tp_session_user_agent(), tp_session_client_ip(), $now, $now, $exp]);
  return $selector . '.' . $validator;
}

function session_user_id(): int {
  // 1) Bearer token (API / bot)
  $tok = bearer_token();
  if ($tok !== '') {
    $hash = hash('sha256', $tok);
    $pdo = db();
    $stmt = $pdo->prepare('SELECT user_id FROM api_tokens WHERE token_hash = ?');
    $stmt->execute([$hash]);
    $uid = (int)($stmt->fetchColumn() ?: 0);
    if ($uid > 0) {
      if (mt_rand(1,10) === 1) {
        $tries = 0;
        while (true) {
          try {
            $pdo->prepare('UPDATE api_tokens SET last_used_at=? WHERE token_hash=?')->execute([time(), $hash]);
            break;
          } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (strpos($msg, 'database is locked') !== false && $tries < 6) {
              $tries++;
              usleep(120000 * $tries);
              continue;
            }
            break;
          }
        }
      }
      return $uid;
    }
  }

  // 2) Secure web session cookie
  $parsed = tp_parse_session_cookie();
  if ($parsed['selector'] !== '' && $parsed['validator'] !== '') {
    try {
      $pdo = db();
      $st = $pdo->prepare('SELECT user_id, validator_hash, expires_at, revoked_at FROM web_sessions WHERE selector=? LIMIT 1');
      $st->execute([$parsed['selector']]);
      $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      $now = time();
      if ($row && (int)($row['revoked_at'] ?? 0) <= 0 && (int)($row['expires_at'] ?? 0) >= $now) {
        $calc = hash('sha256', $parsed['validator']);
        if (hash_equals((string)($row['validator_hash'] ?? ''), $calc)) {
          if (mt_rand(1,8) === 1) {
            try {
              $pdo->prepare('UPDATE web_sessions SET last_used_at=? WHERE selector=?')->execute([$now, $parsed['selector']]);
            } catch (Throwable $e) {}
          }
          tp_clear_legacy_uid_cookie();
          return (int)($row['user_id'] ?? 0);
        }
      }
      tp_revoke_web_session_selector($parsed['selector']);
    } catch (Throwable $e) {}
    setcookie(tp_session_cookie_name(), '', tp_cookie_options(time() - 3600));
  }

  // 3) Legacy uid cookie migration (older builds)
  $legacy = (int)($_COOKIE[tp_legacy_uid_cookie_name()] ?? 0);
  if ($legacy > 0) {
    try {
      $pdo = db();
      $st = $pdo->prepare('SELECT 1 FROM users WHERE id=? LIMIT 1');
      $st->execute([$legacy]);
      if ((int)($st->fetchColumn() ?: 0) === 1) {
        set_session_user_id($legacy, 'legacy');
        tp_clear_legacy_uid_cookie();
        return $legacy;
      }
    } catch (Throwable $e) {}
    tp_clear_legacy_uid_cookie();
  }

  return 0;
}

function set_session_user_id(int $uid, string $provider = 'web'): void {
  $parsed = tp_parse_session_cookie();
  if ($parsed['selector'] !== '') {
    tp_revoke_web_session_selector($parsed['selector']);
  }
  tp_clear_legacy_uid_cookie();
  $cookie = tp_create_web_session($uid, $provider);
  setcookie(tp_session_cookie_name(), $cookie, tp_cookie_options(time() + 60*60*24*30));
}

function clear_session_user_id(): void {
  $parsed = tp_parse_session_cookie();
  if ($parsed['selector'] !== '') {
    tp_revoke_web_session_selector($parsed['selector']);
  }
  setcookie(tp_session_cookie_name(), '', tp_cookie_options(time() - 3600));
  tp_clear_legacy_uid_cookie();
}

function require_auth(): int {
  $uid = session_user_id();
  if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);

  // After DB reset, user cookie may point to a deleted user. Validate existence to avoid FK failures.
  try {
    $pdo = db();
    $st = $pdo->prepare('SELECT 1 FROM users WHERE id=? LIMIT 1');
    $st->execute([$uid]);
    $ok = (int)($st->fetchColumn() ?: 0);
    if ($ok === 0) {
      clear_session_user_id();
      json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
    }
  } catch (Throwable $e) {
    clear_session_user_id();
    json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
  }

  return $uid;
}


// ===================== Account flags (freeze/disable) =====================

function user_account_flags(int $uid): array {
  $out = [
    'manager_id' => 0,
    'is_frozen' => 0,
    'frozen_reason' => '',
    'deposit_disabled' => 0,
    'withdraw_disabled' => 0,
    'trade_disabled' => 0,
  ];
  if ($uid <= 0) return $out;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT manager_id,is_frozen,frozen_reason,deposit_disabled,withdraw_disabled,trade_disabled FROM users WHERE id=? LIMIT 1');
    $st->execute([$uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
    foreach ($out as $k => $_) {
      if (array_key_exists($k, $r)) $out[$k] = $r[$k];
    }
  } catch (Throwable $e) {
    // old schema: ignore
  }
  // normalize
  $out['manager_id'] = (int)($out['manager_id'] ?? 0);
  $out['is_frozen'] = (int)($out['is_frozen'] ?? 0);
  $out['deposit_disabled'] = (int)($out['deposit_disabled'] ?? 0);
  $out['withdraw_disabled'] = (int)($out['withdraw_disabled'] ?? 0);
  $out['trade_disabled'] = (int)($out['trade_disabled'] ?? 0);
  $out['frozen_reason'] = (string)($out['frozen_reason'] ?? '');
  return $out;
}

function require_account_active(int $uid): array {
  $f = user_account_flags($uid);
  if (($f['is_frozen'] ?? 0) == 1) {
    json_response([
      'ok' => false,
      'error' => 'account_frozen',
      'reason' => (string)($f['frozen_reason'] ?? ''),
    ], 403);
  }
  return $f;
}

function require_deposit_allowed(int $uid): void {
  $f = require_account_active($uid);
  if (($f['deposit_disabled'] ?? 0) == 1) {
    json_response(['ok'=>false,'error'=>'deposit_disabled'], 403);
  }
}

function require_withdraw_allowed(int $uid): void {
  $f = require_account_active($uid);
  if (($f['withdraw_disabled'] ?? 0) == 1) {
    json_response(['ok'=>false,'error'=>'withdraw_disabled'], 403);
  }
}

function require_trade_allowed(int $uid): void {
  $f = require_account_active($uid);
  if (($f['trade_disabled'] ?? 0) == 1) {
    json_response(['ok'=>false,'error'=>'trade_disabled'], 403);
  }
}

function latest_kyc_status(int $uid): string {
  try { $pdo = db(); $st = $pdo->prepare('SELECT status FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1'); $st->execute([$uid]); return strtolower(trim((string)($st->fetchColumn() ?: 'none'))); } catch (Throwable $e) { return 'none'; }
}

function require_approved_kyc(int $uid, string $action = 'live_access'): void {
  $status = latest_kyc_status($uid);
  if ($status !== 'approved') { json_response(['ok'=>false,'error'=>'kyc_required','action'=>$action,'kyc_status'=>$status], 403); }
}
function clamp(float $x, float $min, float $max): float { return max($min, min($max, $x)); }
