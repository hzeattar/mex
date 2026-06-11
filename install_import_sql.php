<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/schema.php';

@set_time_limit((int)max(60, (int)env('SQL_IMPORT_TIME_LIMIT', '240')));
@ini_set('memory_limit', (string)env('SQL_IMPORT_MEMORY_LIMIT', '512M'));

function import_json(array $payload, int $code = 200): void {
  if (PHP_SAPI === 'cli') {
    fwrite($code >= 400 ? STDERR : STDOUT, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit($code >= 400 ? 1 : 0);
  }
  json_response($payload, $code);
}

function import_bool_env(string $key, bool $default = false): bool {
  $v = strtolower(trim((string)env($key, $default ? '1' : '0')));
  return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

function import_cli_option(string $name, string $default = ''): string {
  global $argv;
  if (!is_array($argv)) return $default;
  $prefix = '--' . $name . '=';
  foreach ($argv as $arg) {
    if ($arg === '--' . $name) return '1';
    if (str_starts_with((string)$arg, $prefix)) return substr((string)$arg, strlen($prefix));
  }
  return $default;
}

function import_request_value(string $name, string $default = ''): string {
  if (PHP_SAPI === 'cli') return import_cli_option($name, $default);
  $headerName = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  if (isset($_POST[$name])) return (string)$_POST[$name];
  if (isset($_GET[$name])) return (string)$_GET[$name];
  if (isset($_SERVER[$headerName])) return (string)$_SERVER[$headerName];
  return $default;
}

function import_authorize(): void {
  if (PHP_SAPI === 'cli') return;
  require_method('POST');

  $installKey = (string)env('INSTALL_KEY', '');
  $key = import_request_value('key');
  if ($key === '') $key = (string)($_SERVER['HTTP_X_INSTALL_KEY'] ?? '');

  if ($installKey === '' || $key === '' || !hash_equals($installKey, $key)) {
    import_json(['ok' => false, 'error' => 'Forbidden'], 403);
  }
  if (!import_bool_env('ALLOW_SQL_IMPORT', false)) {
    import_json(['ok' => false, 'error' => 'SQL import is disabled'], 403);
  }
}

function import_read_sql(int $maxBytes): string {
  if (PHP_SAPI === 'cli') {
    $file = import_cli_option('file');
    if ($file === '') {
      global $argv;
      $file = (string)($argv[1] ?? '');
    }
    if ($file === '' || !is_file($file)) {
      import_json(['ok' => false, 'error' => 'Usage: php api/install_import_sql.php --file=/path/dump.sql'], 422);
    }
    $size = (int)filesize($file);
    if ($size > $maxBytes) {
      import_json(['ok' => false, 'error' => 'SQL file is larger than SQL_IMPORT_MAX_BYTES', 'bytes' => $size, 'max_bytes' => $maxBytes], 413);
    }
    $raw = file_get_contents($file);
    return is_string($raw) ? $raw : '';
  }

  if (isset($_FILES['dump']) && is_array($_FILES['dump'])) {
    $upload = $_FILES['dump'];
    $err = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
      import_json(['ok' => false, 'error' => 'Upload failed', 'upload_error' => $err], 400);
    }
    $tmp = (string)($upload['tmp_name'] ?? '');
    $size = (int)($upload['size'] ?? 0);
    if ($tmp === '' || !is_uploaded_file($tmp)) {
      import_json(['ok' => false, 'error' => 'Invalid upload'], 400);
    }
    if ($size > $maxBytes) {
      import_json(['ok' => false, 'error' => 'SQL file is larger than SQL_IMPORT_MAX_BYTES', 'bytes' => $size, 'max_bytes' => $maxBytes], 413);
    }
    $raw = file_get_contents($tmp);
    return is_string($raw) ? $raw : '';
  }

  $raw = file_get_contents('php://input');
  if (!is_string($raw) || $raw === '') {
    import_json(['ok' => false, 'error' => 'Send the SQL dump as multipart field "dump" or as raw request body'], 422);
  }
  if (strlen($raw) > $maxBytes) {
    import_json(['ok' => false, 'error' => 'SQL body is larger than SQL_IMPORT_MAX_BYTES', 'bytes' => strlen($raw), 'max_bytes' => $maxBytes], 413);
  }
  return $raw;
}

function import_strip_leading_comments(string $sql): string {
  $s = ltrim($sql);
  while ($s !== '') {
    if (str_starts_with($s, '/*')) {
      $end = strpos($s, '*/');
      if ($end === false) return '';
      $s = ltrim(substr($s, $end + 2));
      continue;
    }
    if (preg_match('/^(--[^\r\n]*|#[^\r\n]*)(\r?\n|\r|$)/', $s, $m)) {
      $s = ltrim(substr($s, strlen($m[0])));
      continue;
    }
    break;
  }
  return $s;
}

function import_normalize_sql(string $sql): string {
  if (substr($sql, 0, 3) === "\xEF\xBB\xBF") {
    $sql = substr($sql, 3);
  }
  $sql = str_replace(["\r\n", "\r"], "\n", $sql);
  return $sql;
}

function import_split_sql(string $sql): array {
  $sql = import_normalize_sql($sql);
  $len = strlen($sql);
  $out = [];
  $buf = '';
  $quote = '';
  $lineComment = false;
  $blockComment = false;
  $delimiter = ';';

  for ($i = 0; $i < $len; $i++) {
    $ch = $sql[$i];
    $next = ($i + 1 < $len) ? $sql[$i + 1] : '';

    if (!$lineComment && !$blockComment && $quote === '' && ($i === 0 || $sql[$i - 1] === "\n")) {
      $rest = substr($sql, $i);
      if (preg_match('/^\s*DELIMITER\s+(\S+)\s*(?:\n|$)/i', $rest, $m)) {
        $delimiter = (string)$m[1];
        $i += strlen($m[0]) - 1;
        continue;
      }
    }

    if ($lineComment) {
      $buf .= $ch;
      if ($ch === "\n") $lineComment = false;
      continue;
    }

    if ($blockComment) {
      $buf .= $ch;
      if ($ch === '*' && $next === '/') {
        $buf .= $next;
        $i++;
        $blockComment = false;
      }
      continue;
    }

    if ($quote !== '') {
      $buf .= $ch;
      if ($quote !== '`' && $ch === '\\' && $next !== '') {
        $buf .= $next;
        $i++;
        continue;
      }
      if ($ch === $quote) {
        if ($next === $quote && $quote !== '`') {
          $buf .= $next;
          $i++;
          continue;
        }
        $quote = '';
      }
      continue;
    }

    if ($ch === '-' && $next === '-' && ($i + 2 >= $len || preg_match('/\s/', $sql[$i + 2]) === 1)) {
      $buf .= $ch . $next;
      $i++;
      $lineComment = true;
      continue;
    }
    if ($ch === '#') {
      $buf .= $ch;
      $lineComment = true;
      continue;
    }
    if ($ch === '/' && $next === '*') {
      $buf .= $ch . $next;
      $i++;
      $blockComment = true;
      continue;
    }
    if ($ch === "'" || $ch === '"' || $ch === '`') {
      $buf .= $ch;
      $quote = $ch;
      continue;
    }
    if ($delimiter !== '' && substr($sql, $i, strlen($delimiter)) === $delimiter) {
      $stmt = trim($buf);
      if (import_strip_leading_comments($stmt) !== '') $out[] = $stmt;
      $buf = '';
      $i += strlen($delimiter) - 1;
      continue;
    }
    $buf .= $ch;
  }

  $stmt = trim($buf);
  if (import_strip_leading_comments($stmt) !== '') $out[] = $stmt;
  return $out;
}

function import_dangerous_statement(string $stmt): string {
  $lead = import_strip_leading_comments($stmt);
  if ($lead === '') return '';
  $checks = [
    '/^\s*DROP\b/i' => 'DROP',
    '/^\s*TRUNCATE\b/i' => 'TRUNCATE',
    '/^\s*DELETE\b/i' => 'DELETE',
    '/^\s*(CREATE|ALTER|DROP)\s+DATABASE\b/i' => 'DATABASE_DDL',
    '/^\s*USE\s+/i' => 'USE_DATABASE',
  ];
  foreach ($checks as $rx => $label) {
    if (preg_match($rx, $lead)) return $label;
  }
  return '';
}

function import_mysql_table_count(PDO $pdo): int {
  $rows = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM) ?: [];
  return count($rows);
}

function import_apply_schema_upgrades(PDO $pdo): void {
  $driver = 'mysql';
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  if (function_exists('vp_feature_bootstrap')) {
    vp_feature_bootstrap($pdo, $driver);
  }
  schema_seed_defaults($pdo, $driver);
  @file_put_contents(__DIR__ . '/data/.schema_version', defined('SCHEMA_VERSION') ? SCHEMA_VERSION : '1');
  try {
    schema_setting_set($pdo, $driver, 'META_SCHEMA_VER', defined('SCHEMA_VERSION') ? SCHEMA_VERSION : '1', time());
  } catch (Throwable $e) {
    // Best effort only.
  }
}

try {
  import_authorize();

  $maxBytes = (int)env('SQL_IMPORT_MAX_BYTES', (string)(64 * 1024 * 1024));
  $maxBytes = max(1024 * 1024, $maxBytes);
  $sql = import_read_sql($maxBytes);
  if (trim($sql) === '') {
    import_json(['ok' => false, 'error' => 'SQL dump is empty'], 422);
  }

  $statements = import_split_sql($sql);
  $createTableCount = (int)preg_match_all('/\bCREATE\s+TABLE\b/i', $sql);
  $dryRun = import_request_value('dry-run', import_request_value('dry_run', '0')) === '1';
  $confirmNonempty = import_request_value('confirm-nonempty', import_request_value('confirm_nonempty', '0')) === '1';
  $allowDangerous = import_bool_env('ALLOW_SQL_DANGEROUS', false);

  $dangerous = [];
  foreach ($statements as $idx => $stmt) {
    $kind = import_dangerous_statement($stmt);
    if ($kind !== '') {
      $dangerous[] = [
        'index' => $idx + 1,
        'kind' => $kind,
        'snippet' => substr(preg_replace('/\s+/', ' ', import_strip_leading_comments($stmt)) ?? '', 0, 160),
      ];
    }
  }
  if ($dangerous && !$allowDangerous) {
    import_json([
      'ok' => false,
      'error' => 'SQL dump contains destructive statements. Backup first, then set ALLOW_SQL_DANGEROUS=1 if you really need them.',
      'dangerous' => array_slice($dangerous, 0, 10),
    ], 409);
  }

  $driver = db_driver();
  if ($dryRun && $driver !== 'mysql') {
    import_json([
      'ok' => true,
      'dry_run' => true,
      'mysql_ready' => false,
      'db_driver' => $driver,
      'statements' => count($statements),
      'create_table_count' => $createTableCount,
      'dangerous_count' => count($dangerous),
    ]);
  }
  if ($driver !== 'mysql') {
    import_json([
      'ok' => false,
      'error' => 'SQL import is allowed only when db_driver=mysql',
      'db_driver' => $driver,
      'statements' => count($statements),
      'create_table_count' => $createTableCount,
    ], 409);
  }

  $pdo = db();
  $tablesBefore = import_mysql_table_count($pdo);
  if ($tablesBefore > 0 && !$confirmNonempty) {
    import_json([
      'ok' => false,
      'error' => 'Target MySQL database is not empty. Take a backup, then pass confirm_nonempty=1 to import.',
      'tables_before' => $tablesBefore,
      'statements' => count($statements),
      'create_table_count' => $createTableCount,
    ], 409);
  }

  if ($dryRun) {
    import_json([
      'ok' => true,
      'dry_run' => true,
      'db_driver' => $driver,
      'tables_before' => $tablesBefore,
      'statements' => count($statements),
      'create_table_count' => $createTableCount,
      'dangerous_count' => count($dangerous),
    ]);
  }

  $executed = 0;
  $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
  try {
    foreach ($statements as $idx => $stmt) {
      $lead = import_strip_leading_comments($stmt);
      if ($lead === '') continue;
      try {
        $pdo->exec($stmt);
        $executed++;
      } catch (Throwable $e) {
        import_json([
          'ok' => false,
          'error' => 'SQL import failed',
          'statement_index' => $idx + 1,
          'executed' => $executed,
          'message' => $e->getMessage(),
          'snippet' => substr(preg_replace('/\s+/', ' ', $lead) ?? '', 0, 220),
        ], 500);
      }
    }
  } finally {
    try { $pdo->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $e) {}
  }

  import_apply_schema_upgrades($pdo);
  $tablesAfter = import_mysql_table_count($pdo);

  import_json([
    'ok' => true,
    'dry_run' => false,
    'db_driver' => $driver,
    'tables_before' => $tablesBefore,
    'tables_after' => $tablesAfter,
    'statements' => count($statements),
    'executed' => $executed,
    'create_table_count' => $createTableCount,
    'schema' => defined('SCHEMA_VERSION') ? SCHEMA_VERSION : '1',
    'ts' => time(),
  ]);
} catch (Throwable $e) {
  import_json(['ok' => false, 'error' => $e->getMessage()], 500);
}
