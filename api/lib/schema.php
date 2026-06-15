<?php
declare(strict_types=1);

// Bump this when schema.php changes in a way that requires running schema_upgrade once.
// common.php stores this value into /api/data/.schema_version after a successful migration.
// Use a monotonic, human-readable value.
// Bump when schema_upgrade adds new columns so existing installs auto-upgrade.
const SCHEMA_VERSION = '2026-06-14.2';

/**
 * Schema installer for MySQL (production) or SQLite (local/demo).
 * NOTE: This project is intentionally framework-less to run on shared hosting.
 */

/**
 * Shared-hosting safe lock to prevent concurrent schema/seed writes (SQLite "database is locked").
 */
function schema_lock_path(): string {
  $base = dirname(__DIR__) . '/data';
  if (!is_dir($base)) {
    @mkdir($base, 0775, true);
  }
  if (!is_dir($base) || !is_writable($base)) {
    $base = sys_get_temp_dir();
  }
  return rtrim($base, '/\\') . '/.schema_lock';
}

function schema_with_lock(string $name, callable $fn, int $timeoutMs = 2500) {
  $path = schema_lock_path();
  $fh = @fopen($path, 'c+');
  if (!$fh) return $fn();

  $start = microtime(true);
  $locked = false;

  while ((microtime(true) - $start) * 1000 < $timeoutMs) {
    if (@flock($fh, LOCK_EX | LOCK_NB)) { $locked = true; break; }
    usleep(50_000); // 50ms
  }

  // If we couldn't lock quickly, don't block the request/cron forever.
  if (!$locked) {
    @fclose($fh);
    return $fn();
  }

  try {
    @ftruncate($fh, 0);
    @fwrite($fh, json_encode([
      'name' => $name,
      'pid'  => function_exists('getmypid') ? getmypid() : null,
      'time' => time(),
    ], JSON_UNESCAPED_UNICODE));
    @fflush($fh);
    return $fn();
  } finally {
    try { @flock($fh, LOCK_UN); } catch (Throwable $e) {}
    @fclose($fh);
  }
}

/** SQLite pragmas to reduce lock errors on shared hosting */
function schema_apply_sqlite_pragmas(PDO $pdo): void {
  try { $pdo->exec("PRAGMA busy_timeout = 8000;"); } catch (Throwable $e) {}
  try { $pdo->exec("PRAGMA journal_mode = WAL;"); } catch (Throwable $e) {}
  try { $pdo->exec("PRAGMA synchronous = NORMAL;"); } catch (Throwable $e) {}
  try { $pdo->exec("PRAGMA temp_store = MEMORY;"); } catch (Throwable $e) {}
  try { $pdo->exec("PRAGMA foreign_keys = ON;"); } catch (Throwable $e) {}
}

/** env fallback (framework-less) */
function schema_env(string $key, string $default = ''): string {
  if (function_exists('env')) {
    try { return (string)env($key, $default); } catch (Throwable $e) {}
  }
  $v = getenv($key);
  return ($v === false || $v === null || $v === '') ? $default : (string)$v;
}

/** schema helpers for upgrades (shared hosting safe) */
function schema_table_exists(PDO $pdo, string $table, string $driver): bool {
  static $cache = [];
  $cacheKey = $table . ':' . strtolower($driver);
  if (isset($cache[$cacheKey])) return $cache[$cacheKey];
  // File-based cross-request cache (10 min TTL, avoids repeated information_schema queries)
  $fileCacheDir = __DIR__ . '/../data/cache/schema';
  if (!is_dir($fileCacheDir)) @mkdir($fileCacheDir, 0777, true);
  $fileCacheKey = 'tbl_' . $table . '_' . strtolower($driver);
  $fileCachePath = $fileCacheDir . '/' . $fileCacheKey . '.json';
  if (is_file($fileCachePath)) {
    $age = time() - (int)@filemtime($fileCachePath);
    if ($age < 600) {
      $raw = @file_get_contents($fileCachePath);
      if ($raw !== false) {
        $d = json_decode($raw, true);
        if (is_array($d) && isset($d['v'])) { $cache[$cacheKey] = (bool)$d['v']; return (bool)$d['v']; }
      }
    }
  }
  $driver = strtolower($driver);
  if ($driver === 'mysql') {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
    $stmt->execute([$table]);
    $result = (int)$stmt->fetchColumn() > 0;
  } else {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?");
    $stmt->execute([$table]);
    $result = (int)$stmt->fetchColumn() > 0;
  }
  $cache[$cacheKey] = $result;
  @file_put_contents($fileCachePath, json_encode(['v' => $result]), LOCK_EX);
  return $result;
}

function schema_column_exists(PDO $pdo, string $table, string $column, string $driver): bool {
  static $cache = [];
  $cacheKey = $table . '.' . $column . ':' . strtolower($driver);
  if (isset($cache[$cacheKey])) return $cache[$cacheKey];
  // File-based cross-request cache — uses bulk table introspection for efficiency
  $fileCacheDir = __DIR__ . '/../data/cache/schema';
  if (!is_dir($fileCacheDir)) @mkdir($fileCacheDir, 0777, true);
  $bulkCachePath = $fileCacheDir . '/cols_' . $table . '_' . strtolower($driver) . '.json';
  $bulkCache = null;
  if (is_file($bulkCachePath)) {
    $age = time() - (int)@filemtime($bulkCachePath);
    if ($age < 600) {
      $raw = @file_get_contents($bulkCachePath);
      if ($raw !== false) { $bulkCache = json_decode($raw, true); }
    }
  }
  if (!is_array($bulkCache)) {
    $driver = strtolower($driver);
    if ($driver === 'mysql') {
      $stmt = $pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?");
      $stmt->execute([$table]);
      $bulkCache = array_flip(array_map('strtolower', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
    } else {
      $stmt = $pdo->query("PRAGMA table_info(" . $table . ")");
      $cols = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
      $bulkCache = [];
      foreach ($cols as $c) { $bulkCache[strtolower((string)($c['name'] ?? ''))] = true; }
    }
    @file_put_contents($bulkCachePath, json_encode($bulkCache), LOCK_EX);
  }
  $result = isset($bulkCache[strtolower($column)]);
  $cache[$cacheKey] = $result;
  return $result;
}

function schema_add_column(PDO $pdo, string $table, string $columnDefMySQL, string $columnDefSQLite, string $driver): void {
  $driver = strtolower($driver);
  try {
    if ($driver === 'mysql') {
      $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$columnDefMySQL}");
    } else {
      $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$columnDefSQLite}");
    }
  } catch (Throwable $e) {
    // ignore (already exists / locked / incompatible)
  }
}

function schema_settings_profile(PDO $pdo, string $driver): array {
  static $cache = [];
  $cacheKey = spl_object_id($pdo) . ':' . strtolower($driver);
  if (isset($cache[$cacheKey])) return $cache[$cacheKey];
  $cols = ['key'=>false,'value'=>false,'setting_key'=>false,'setting_value'=>false,'updated_at'=>false];
  foreach (array_keys($cols) as $col) {
    try { $cols[$col] = schema_column_exists($pdo, 'settings', $col, $driver); }
    catch (Throwable $e) { $cols[$col] = false; }
  }
  $cache[$cacheKey] = $cols;
  return $cols;
}

function schema_setting_get(PDO $pdo, string $driver, string $key, ?string $default = null): ?string {
  try {
    if (!schema_table_exists($pdo, 'settings', $driver)) return $default;
    $profile = schema_settings_profile($pdo, $driver);
    $selectValue = ($profile['setting_value'] && $profile['value'])
      ? "COALESCE(NULLIF(setting_value,''), value)"
      : ($profile['setting_value'] ? 'setting_value' : ($profile['value'] ? 'value' : 'NULL'));
    $where = [];
    $params = [];
    if (!empty($profile['setting_key'])) { $where[] = 'setting_key=?'; $params[] = $key; }
    if (!empty($profile['key'])) { $where[] = '`key`=?'; $params[] = $key; }
    if (!$where) return $default;
    $order = !empty($profile['setting_key']) ? ' ORDER BY CASE WHEN setting_key=? THEN 0 ELSE 1 END' : '';
    if ($order !== '') $params[] = $key;
    $st = $pdo->prepare('SELECT ' . $selectValue . ' FROM settings WHERE ' . implode(' OR ', $where) . $order . ' LIMIT 1');
    $st->execute($params);
    $v = $st->fetchColumn();
    if ($v === false || $v === null || $v === '') return $default;
    return (string)$v;
  } catch (Throwable $e) {
    return $default;
  }
}

function schema_setting_set(PDO $pdo, string $driver, string $key, ?string $value, ?int $updatedAt = null): void {
  $now = $updatedAt ?? time();
  if (!schema_table_exists($pdo, 'settings', $driver)) return;
  $profile = schema_settings_profile($pdo, $driver);
  $hasLegacy = !empty($profile['key']) && !empty($profile['value']);
  $hasModern = !empty($profile['setting_key']) && !empty($profile['setting_value']);
  if (!$hasLegacy && !$hasModern) return;

  $errors = [];

  if ($hasModern) {
    try {
      $set = ['setting_value=?'];
      $params = [$value];
      if (!empty($profile['updated_at'])) { $set[] = 'updated_at=?'; $params[] = $now; }
      $params[] = $key;
      $st = $pdo->prepare('UPDATE settings SET ' . implode(', ', $set) . ' WHERE setting_key=?');
      $st->execute($params);
      if ($st->rowCount() === 0) {
        $cols = ['setting_key','setting_value'];
        $vals = [$key,$value];
        if (!empty($profile['updated_at'])) { $cols[] = 'updated_at'; $vals[] = $now; }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $pdo->prepare('INSERT INTO settings(' . implode(',', $cols) . ') VALUES (' . $ph . ')')->execute($vals);
      }
    } catch (Throwable $e) { $errors[] = $e; }
  }

  if ($hasLegacy) {
    try {
      $set = ['value=?'];
      $params = [$value];
      if (!empty($profile['updated_at'])) { $set[] = 'updated_at=?'; $params[] = $now; }
      $params[] = $key;
      $st = $pdo->prepare('UPDATE settings SET ' . implode(', ', $set) . ' WHERE `key`=?');
      $st->execute($params);
      if ($st->rowCount() === 0) {
        $cols = ['`key`','value'];
        $vals = [$key,$value];
        if (!empty($profile['updated_at'])) { $cols[] = 'updated_at'; $vals[] = $now; }
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $pdo->prepare('INSERT INTO settings(' . implode(',', $cols) . ') VALUES (' . $ph . ')')->execute($vals);
      }
    } catch (Throwable $e) { $errors[] = $e; }
  }

  if ($errors && count($errors) >= (($hasModern ? 1 : 0) + ($hasLegacy ? 1 : 0))) {
    throw $errors[0];
  }
}

function schema_install(PDO $pdo, string $driver): void {
  $driver = strtolower($driver);

  if ($driver === 'mysql') {
    $pdo->exec("SET sql_mode='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  } else {
    schema_apply_sqlite_pragmas($pdo);
  }

  // Users
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      tg_id VARCHAR(32) NULL,
      telegram_chat_id VARCHAR(32) NULL,
      username VARCHAR(64) NULL,
      first_name VARCHAR(128) NULL,
      last_name VARCHAR(128) NULL,
      country_code VARCHAR(2) NULL,
      country_name VARCHAR(128) NULL,
      phone_dial_code VARCHAR(8) NULL,
      phone_number VARCHAR(32) NULL,
      phone_e164 VARCHAR(32) NULL,
      birth_date DATE NULL,
      locale VARCHAR(8) NOT NULL DEFAULT 'en',
      support_locale VARCHAR(8) NULL DEFAULT NULL,
      max_leverage INT NULL DEFAULT NULL,
      force_mode VARCHAR(10) NULL DEFAULT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_tg_id (tg_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT,
      telegram_chat_id TEXT,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      country_code TEXT,
      country_name TEXT,
      phone_dial_code TEXT,
      phone_number TEXT,
      phone_e164 TEXT,
      birth_date TEXT,
      locale TEXT NOT NULL DEFAULT 'en',
      support_locale TEXT,
      max_leverage INTEGER,
      force_mode TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      source TEXT
    );"
  );

  // SQLite: enforce uniqueness for tg_id to support ON CONFLICT(tg_id) in bot upserts
  if ($driver !== "mysql") {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_tg_id ON users(tg_id)"); } catch (Throwable $e) {}
  }

  // Bot states
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS bot_states (
      chat_id VARCHAR(32) PRIMARY KEY,
      tg_user_id VARCHAR(32) NULL,
      state VARCHAR(32) NOT NULL,
      data JSON NULL,
      updated_at INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS bot_states (
      chat_id TEXT PRIMARY KEY,
      tg_user_id TEXT,
      state TEXT NOT NULL,
      data TEXT,
      updated_at INTEGER NOT NULL
    );"
  );

  // Support tickets (inside the MAIN bot)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS support_tickets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      tg_id VARCHAR(32) NULL,
      chat_id VARCHAR(32) NULL,
      lang VARCHAR(8) NOT NULL DEFAULT 'en',
      reason_code VARCHAR(24) NOT NULL DEFAULT 'other',
      agent_username VARCHAR(64) NULL,
      agent_tg_id VARCHAR(32) NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'open',
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_user (user_id),
      KEY idx_status (status),
      KEY idx_agent (agent_tg_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tg_id TEXT,
      chat_id TEXT,
      lang TEXT NOT NULL DEFAULT 'en',
      reason_code TEXT NOT NULL DEFAULT 'other',
      agent_username TEXT,
      agent_tg_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS support_messages (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      ticket_id BIGINT UNSIGNED NOT NULL,
      sender VARCHAR(16) NOT NULL,
      sender_tg_id VARCHAR(32) NULL,
      msg_type VARCHAR(16) NOT NULL DEFAULT 'text',
      content MEDIUMTEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_ticket (ticket_id),
      KEY idx_sender (sender_tg_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      sender_tg_id TEXT,
      msg_type TEXT NOT NULL DEFAULT 'text',
      content TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // API tokens
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS api_tokens (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      name VARCHAR(64) NOT NULL DEFAULT 'miniapp',
      last_used_at INT NULL,
      created_at INT NOT NULL,
      UNIQUE KEY uniq_token_hash (token_hash),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'miniapp',
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      UNIQUE(token_hash)
    );"
  );

  // Wallets
  // NOTE: include available_cache in new installs to avoid ALTER later.
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS wallets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      balance_cache DECIMAL(20,8) NOT NULL DEFAULT 0,
      available_cache DECIMAL(20,8) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL,
      UNIQUE KEY uniq_user_currency (user_id, currency),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      balance_cache REAL NOT NULL DEFAULT 0,
      available_cache REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, currency)
    );"
  );

  // Ledger entries
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS ledger_entries (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      wallet_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      type VARCHAR(32) NOT NULL,
      ref_type VARCHAR(32) NULL,
      ref_id VARCHAR(64) NULL,
      metadata JSON NULL,
      created_at INT NOT NULL,
      KEY idx_wallet (wallet_id),
      KEY idx_user (user_id),
      KEY idx_created (created_at),
      CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );"
  );

  // Holds
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS holds (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      wallet_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      reason VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      expires_at INT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_wallet (wallet_id),
      KEY idx_user (user_id),
      CONSTRAINT fk_holds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_holds_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS holds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // Idempotency keys
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      idem_key VARCHAR(128) NOT NULL,
      scope VARCHAR(64) NOT NULL,
      request_hash CHAR(64) NOT NULL,
      response_body MEDIUMTEXT NULL,
      created_at INT NOT NULL,
      expires_at INT NOT NULL,
      UNIQUE KEY uniq_idem (user_id, idem_key, scope),
      KEY idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS idempotency_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      idem_key TEXT NOT NULL,
      scope TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_body TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      UNIQUE(user_id, idem_key, scope)
    );"
  );

  // Feature flags
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS feature_flags (
      flag_key VARCHAR(64) PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS feature_flags (
      flag_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );"
  );

  // Payment methods
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS payment_methods (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      kind VARCHAR(16) NOT NULL,
      code VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL DEFAULT 'dummy',
      currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
      title_en VARCHAR(120) NOT NULL,
      title_ar VARCHAR(120) NOT NULL,
      title_ru VARCHAR(120) NOT NULL,
      desc_en TEXT NULL,
      desc_ar TEXT NULL,
      desc_ru TEXT NULL,
      image_url TEXT NULL,
      instructions_en TEXT NULL,
      instructions_ar TEXT NULL,
      instructions_ru TEXT NULL,
      min_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      max_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      category_key VARCHAR(64) NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_kind_code (kind, code),
      KEY idx_kind_status (kind, status),
      KEY idx_currency (currency)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      code TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'dummy',
      currency TEXT NOT NULL DEFAULT 'USDT',
      title_en TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      desc_en TEXT,
      desc_ar TEXT,
      desc_ru TEXT,
      image_url TEXT,
      instructions_en TEXT,
      instructions_ar TEXT,
      instructions_ru TEXT,
      min_amount REAL NOT NULL DEFAULT 0,
      max_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      category_key TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      UNIQUE(kind, code)
    );"
  );

  // Funding categories (admin-managed deposit/withdraw sections)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS funding_categories (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      kind VARCHAR(16) NOT NULL,
      key_slug VARCHAR(64) NOT NULL,
      label_en VARCHAR(120) NOT NULL,
      label_ar VARCHAR(120) NOT NULL,
      label_ru VARCHAR(120) NOT NULL,
      hint_en TEXT NULL,
      hint_ar TEXT NULL,
      hint_ru TEXT NULL,
      icon VARCHAR(32) NULL,
      image_url TEXT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_kind_key_slug (kind, key_slug),
      KEY idx_kind_status_sort (kind, status, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS funding_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      key_slug TEXT NOT NULL,
      label_en TEXT NOT NULL,
      label_ar TEXT NOT NULL,
      label_ru TEXT NOT NULL,
      hint_en TEXT,
      hint_ar TEXT,
      hint_ru TEXT,
      icon TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      UNIQUE(kind, key_slug)
    );"
  );



  // Payment method visibility by country (used by Telegram deposit/withdraw bot)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS payment_method_countries (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      method_id BIGINT UNSIGNED NOT NULL,
      country_code VARCHAR(16) NOT NULL,
      created_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_method_country (method_id, country_code),
      KEY idx_country (country_code),
      KEY idx_method (method_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS payment_method_countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method_id INTEGER NOT NULL,
      country_code TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0,
      UNIQUE(method_id, country_code)
    );"
  );

  // Payment method bonuses (admin-managed deposit bonuses per method/category)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS payment_method_bonuses (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      method_id BIGINT UNSIGNED NULL,
      method_key VARCHAR(32) NULL,
      type VARCHAR(16) NOT NULL DEFAULT 'percent',
      amount DECIMAL(18,8) NOT NULL DEFAULT 0,
      min_deposit DECIMAL(18,8) NOT NULL DEFAULT 0,
      max_bonus DECIMAL(18,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_status (status),
      KEY idx_method (method_id, method_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS payment_method_bonuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method_id INTEGER NULL,
      method_key TEXT NULL,
      type TEXT NOT NULL DEFAULT 'percent',
      amount DECIMAL(18,8) NOT NULL DEFAULT 0,
      min_deposit DECIMAL(18,8) NOT NULL DEFAULT 0,
      max_bonus DECIMAL(18,8) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // Deposits
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS deposits (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(32) NOT NULL,
      method_code VARCHAR(64) NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      status VARCHAR(16) NOT NULL,
      external_ref TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      confirmed_at INT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      method_code TEXT,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      external_ref TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      confirmed_at INTEGER
    );"
  );

  // Withdrawals
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS withdrawals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      method VARCHAR(32) NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      status VARCHAR(16) NOT NULL,
      destination_enc MEDIUMTEXT NOT NULL,
      hold_id BIGINT UNSIGNED NULL,
      risk_score INT NOT NULL DEFAULT 0,
      admin_note TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      completed_at INT NULL,
      KEY idx_user (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      destination_enc TEXT NOT NULL,
      hold_id INTEGER,
      risk_score INTEGER NOT NULL DEFAULT 0,
      admin_note TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER
    );"
  );

  // Deposit / withdrawal details upgrades
  if (schema_table_exists($pdo, 'deposits', $driver)) {
    if (!schema_column_exists($pdo, 'deposits', 'details_json', $driver)) {
      schema_add_column($pdo, 'deposits', "details_json MEDIUMTEXT NULL", "details_json TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'deposits', 'admin_note', $driver)) {
      schema_add_column($pdo, 'deposits', "admin_note TEXT NULL", "admin_note TEXT", $driver);
    }
  }
  if (schema_table_exists($pdo, 'withdrawals', $driver)) {
    if (!schema_column_exists($pdo, 'withdrawals', 'details_json', $driver)) {
      schema_add_column($pdo, 'withdrawals', "details_json MEDIUMTEXT NULL", "details_json TEXT", $driver);
    }
  }

  // Markets
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS markets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      name VARCHAR(128) NULL,
      type VARCHAR(16) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      meta JSON NULL,
      tv_symbol VARCHAR(64) NULL,
      seed_price DECIMAL(20,8) NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      source VARCHAR(32) NULL,
      UNIQUE KEY uniq_symbol (symbol),
      KEY idx_type (type),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      meta TEXT,
      tv_symbol TEXT,
      seed_price REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // Market quotes
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS market_quotes (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      type VARCHAR(16) NOT NULL,
      price DECIMAL(20,8) NOT NULL DEFAULT 0,
      change_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      source VARCHAR(32) NULL,
      as_of INT NULL,
      ingested_at INT NULL,
      source_priority INT NOT NULL DEFAULT 0,
      market VARCHAR(16) NOT NULL DEFAULT 'spot',
      provider VARCHAR(32) NULL,
      provider_ts INT NULL,
      received_at INT NULL,
      source_strength INT NOT NULL DEFAULT 0,
      is_stale TINYINT(1) NOT NULL DEFAULT 0,
      debug_meta JSON NULL,
      UNIQUE KEY uniq_symbol_type_market (symbol, type, market),
      KEY idx_type (type),
      KEY idx_type_market_updated (type, market, updated_at),
      KEY idx_symbol_type_market_updated (symbol, type, market, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS market_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      change_pct REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      source TEXT,
      as_of INTEGER,
      ingested_at INTEGER,
      source_priority INTEGER NOT NULL DEFAULT 0,
      market TEXT NOT NULL DEFAULT 'spot',
      provider TEXT,
      provider_ts INTEGER,
      received_at INTEGER,
      source_strength INTEGER NOT NULL DEFAULT 0,
      is_stale INTEGER NOT NULL DEFAULT 0,
      debug_meta TEXT
    );"
  );


  // Market ticks (optional)
  // Used by /api/trade/stream.php when candles=1 (tick->OHLC aggregation).
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS market_ticks (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      type VARCHAR(16) NULL,
      market VARCHAR(16) NOT NULL DEFAULT 'spot',
      price DECIMAL(20,8) NOT NULL DEFAULT 0,
      volume DECIMAL(20,8) NULL,
      ts INT NOT NULL,
      source VARCHAR(32) NULL,
      KEY idx_symbol_ts (symbol, ts),
      KEY idx_type_market_ts (type, market, ts)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS market_ticks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT,
      market TEXT NOT NULL DEFAULT 'spot',
      price REAL NOT NULL DEFAULT 0,
      volume REAL,
      ts INTEGER NOT NULL,
      source TEXT
    );"
  );
  try {
    if ($driver !== 'mysql') {
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_market_ticks_symbol_ts ON market_ticks(symbol, ts)");
    }
  } catch (Throwable $e) {}

  // Market candles (durable OHLC history used by /api/trade/candles.php).
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS market_candles (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      type VARCHAR(16) NOT NULL,
      market VARCHAR(16) NOT NULL DEFAULT 'spot',
      tf VARCHAR(8) NOT NULL,
      time INT UNSIGNED NOT NULL,
      open DECIMAL(20,8) NOT NULL DEFAULT 0,
      high DECIMAL(20,8) NOT NULL DEFAULT 0,
      low DECIMAL(20,8) NOT NULL DEFAULT 0,
      close DECIMAL(20,8) NOT NULL DEFAULT 0,
      volume DECIMAL(24,8) NOT NULL DEFAULT 0,
      source VARCHAR(48) NOT NULL DEFAULT '',
      provider_ts INT UNSIGNED NULL,
      ingested_at INT UNSIGNED NOT NULL DEFAULT 0,
      quality VARCHAR(16) NOT NULL DEFAULT 'real',
      UNIQUE KEY uniq_market_candle (symbol, type, market, tf, time),
      KEY idx_market_candles_lookup (symbol, type, market, tf, time),
      KEY idx_market_candles_type_tf (type, tf, time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS market_candles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      market TEXT NOT NULL DEFAULT 'spot',
      tf TEXT NOT NULL,
      time INTEGER NOT NULL,
      open REAL NOT NULL DEFAULT 0,
      high REAL NOT NULL DEFAULT 0,
      low REAL NOT NULL DEFAULT 0,
      close REAL NOT NULL DEFAULT 0,
      volume REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      provider_ts INTEGER,
      ingested_at INTEGER NOT NULL DEFAULT 0,
      quality TEXT NOT NULL DEFAULT 'real'
    );"
  );
  try {
    if ($driver !== 'mysql') {
      $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_market_candle ON market_candles(symbol, type, market, tf, time)");
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_market_candles_lookup ON market_candles(symbol, type, market, tf, time)");
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_market_candles_type_tf ON market_candles(type, tf, time)");
    }
  } catch (Throwable $e) {}

  // Trading Signals
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS trading_signals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      market_symbol VARCHAR(32) NOT NULL,
      market_type VARCHAR(16) NOT NULL,
      timeframe VARCHAR(16) NULL,
      direction VARCHAR(8) NOT NULL,
      entry_price DECIMAL(20,8) NULL,
      stop_loss DECIMAL(20,8) NULL,
      take_profit_1 DECIMAL(20,8) NULL,
      take_profit_2 DECIMAL(20,8) NULL,
      confidence INT NOT NULL DEFAULT 50,
      source VARCHAR(32) NULL,
      raw_payload JSON NULL,
      note_en TEXT NULL,
      note_ar TEXT NULL,
      note_ru TEXT NULL,
      bot_enabled TINYINT(1) NOT NULL DEFAULT 0,
      bot_name_en VARCHAR(128) NULL,
      bot_name_ar VARCHAR(128) NULL,
      bot_name_ru VARCHAR(128) NULL,
      bot_brief_en TEXT NULL,
      bot_brief_ar TEXT NULL,
      bot_brief_ru TEXT NULL,
      copy_min_amount DECIMAL(20,8) NOT NULL DEFAULT 100,
      copy_lock_days INT NOT NULL DEFAULT 7,
      copy_profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      copy_leverage INT NOT NULL DEFAULT 1,
      show_on_home TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      valid_until INT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_symbol (market_symbol),
      KEY idx_type (market_type),
      KEY idx_status (status),
      KEY idx_bot_enabled (bot_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS trading_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_symbol TEXT NOT NULL,
      market_type TEXT NOT NULL,
      timeframe TEXT,
      direction TEXT NOT NULL,
      entry_price REAL,
      stop_loss REAL,
      take_profit_1 REAL,
      take_profit_2 REAL,
      confidence INTEGER NOT NULL DEFAULT 50,
      source TEXT,
      raw_payload TEXT,
      note_en TEXT,
      note_ar TEXT,
      note_ru TEXT,
      bot_enabled INTEGER NOT NULL DEFAULT 0,
      bot_name_en TEXT,
      bot_name_ar TEXT,
      bot_name_ru TEXT,
      bot_brief_en TEXT,
      bot_brief_ar TEXT,
      bot_brief_ru TEXT,
      copy_min_amount REAL NOT NULL DEFAULT 100,
      copy_lock_days INTEGER NOT NULL DEFAULT 7,
      copy_profit_share_pct REAL NOT NULL DEFAULT 0,
      copy_leverage INTEGER NOT NULL DEFAULT 1,
      show_on_home INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      valid_until INTEGER,
      created_by INTEGER,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // Trading Bot subscriptions / commissions
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS trading_bot_subscriptions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      signal_id BIGINT UNSIGNED NOT NULL,
      mode VARCHAR(16) NOT NULL DEFAULT 'real',
      currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
      reserved_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      hold_id BIGINT UNSIGNED NULL,
      lock_until INT NULL,
      profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      leverage INT NOT NULL DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      copied_position_id BIGINT UNSIGNED NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_tbs_user_status (user_id, status),
      KEY idx_tbs_signal_status (signal_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS trading_bot_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      signal_id INTEGER NOT NULL,
      mode TEXT NOT NULL DEFAULT 'real',
      currency TEXT NOT NULL DEFAULT 'USDT',
      reserved_amount REAL NOT NULL DEFAULT 0,
      hold_id INTEGER,
      lock_until INTEGER,
      profit_share_pct REAL NOT NULL DEFAULT 0,
      leverage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      copied_position_id INTEGER,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  try {
    if ($driver !== 'mysql') {
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbs_user_status ON trading_bot_subscriptions(user_id, status)");
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbs_signal_status ON trading_bot_subscriptions(signal_id, status)");
    }
  } catch (Throwable $e) {}

  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS trading_bot_commissions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      subscription_id BIGINT UNSIGNED NULL,
      signal_id BIGINT UNSIGNED NULL,
      position_id BIGINT UNSIGNED NULL,
      pnl_gross DECIMAL(20,8) NOT NULL DEFAULT 0,
      share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_tbc_user (user_id),
      KEY idx_tbc_subscription (subscription_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS trading_bot_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subscription_id INTEGER,
      signal_id INTEGER,
      position_id INTEGER,
      pnl_gross REAL NOT NULL DEFAULT 0,
      share_pct REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  try {
    if ($driver !== 'mysql') {
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbc_user ON trading_bot_commissions(user_id)");
      $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbc_subscription ON trading_bot_commissions(subscription_id)");
    }
  } catch (Throwable $e) {}

  // Orders
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      symbol VARCHAR(32) NOT NULL,
      asset_type VARCHAR(16) NOT NULL,
      market_type VARCHAR(16) NOT NULL DEFAULT 'spot',
      side VARCHAR(8) NOT NULL,
      order_type VARCHAR(16) NOT NULL,
      qty DECIMAL(20,8) NOT NULL,
      limit_price DECIMAL(20,8) NULL,
      fill_price DECIMAL(20,8) NULL,
      usd_amount DECIMAL(20,8) NULL,
      tp_price DECIMAL(20,8) NULL,
      sl_price DECIMAL(20,8) NULL,
      leverage INT NOT NULL DEFAULT 1,
      reduce_only TINYINT(1) NOT NULL DEFAULT 0,
      client_order_id VARCHAR(64) NULL,
      position_id BIGINT UNSIGNED NULL,
      pnl_usd DECIMAL(20,8) NULL,
      close_reason VARCHAR(16) NULL,
      closed_at INT NULL,
      fee_paid DECIMAL(20,8) NOT NULL DEFAULT 0,
      meta JSON NULL,
      updated_at INT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL,
      created_at INT NOT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      market_type TEXT NOT NULL DEFAULT 'spot',
      side TEXT NOT NULL,
      order_type TEXT NOT NULL,
      qty REAL NOT NULL,
      limit_price REAL,
      fill_price REAL,
      usd_amount REAL,
      tp_price REAL,
      sl_price REAL,
      leverage INTEGER NOT NULL DEFAULT 1,
      reduce_only INTEGER NOT NULL DEFAULT 0,
      client_order_id TEXT,
      position_id INTEGER,
      pnl_usd REAL,
      close_reason TEXT,
      closed_at INTEGER,
      fee_paid REAL NOT NULL DEFAULT 0,
      meta TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );"
  );

  // Positions
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS positions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      symbol VARCHAR(32) NOT NULL,
      asset_type VARCHAR(16) NOT NULL,
      market_type VARCHAR(16) NOT NULL DEFAULT 'spot',
      side VARCHAR(8) NOT NULL,
      qty DECIMAL(20,8) NOT NULL,
      entry_price DECIMAL(20,8) NOT NULL,
      leverage INT NOT NULL DEFAULT 1,
      margin_mode VARCHAR(16) NOT NULL DEFAULT 'isolated',
      margin_initial DECIMAL(20,8) NOT NULL DEFAULT 0,
      liquidation_price DECIMAL(20,8) NULL,
      tp_price DECIMAL(20,8) NULL,
      sl_price DECIMAL(20,8) NULL,
      unrealized_pnl_usd DECIMAL(20,8) NOT NULL DEFAULT 0,
      fees_paid DECIMAL(20,8) NOT NULL DEFAULT 0,
      funding_accrued DECIMAL(20,8) NOT NULL DEFAULT 0,
      last_funding_at INT NULL,
      source_signal_id BIGINT UNSIGNED NULL,
      copy_subscription_id BIGINT UNSIGNED NULL,
      copy_profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      copied_from_admin TINYINT(1) NOT NULL DEFAULT 0,
      opened_at INT NOT NULL,
      updated_at INT NULL,
      closed_at INT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'open',
      KEY idx_pos_user_status (user_id, status),
      KEY idx_pos_user_symbol (user_id, symbol, market_type, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      market_type TEXT NOT NULL DEFAULT 'spot',
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      leverage INTEGER NOT NULL DEFAULT 1,
      margin_mode TEXT NOT NULL DEFAULT 'isolated',
      margin_initial REAL NOT NULL DEFAULT 0,
      liquidation_price REAL,
      tp_price REAL,
      sl_price REAL,
      unrealized_pnl_usd REAL NOT NULL DEFAULT 0,
      fees_paid REAL NOT NULL DEFAULT 0,
      funding_accrued REAL NOT NULL DEFAULT 0,
      last_funding_at INTEGER,
      source_signal_id INTEGER,
      copy_subscription_id INTEGER,
      copy_profit_share_pct REAL NOT NULL DEFAULT 0,
      copied_from_admin INTEGER NOT NULL DEFAULT 0,
      opened_at INTEGER NOT NULL,
      updated_at INTEGER,
      closed_at INTEGER,
      status TEXT NOT NULL DEFAULT 'open'
    );"
  );

  // Orders upgrades (backward compatible)
  if (schema_table_exists($pdo, 'orders', $driver)) {
    if (!schema_column_exists($pdo, 'orders', 'market_type', $driver)) {
      schema_add_column($pdo, 'orders', "market_type VARCHAR(16) NOT NULL DEFAULT 'spot'", "market_type TEXT NOT NULL DEFAULT 'spot'", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'leverage', $driver)) {
      schema_add_column($pdo, 'orders', "leverage INT NOT NULL DEFAULT 1", "leverage INTEGER NOT NULL DEFAULT 1", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'reduce_only', $driver)) {
      schema_add_column($pdo, 'orders', "reduce_only TINYINT(1) NOT NULL DEFAULT 0", "reduce_only INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'client_order_id', $driver)) {
      schema_add_column($pdo, 'orders', "client_order_id VARCHAR(64) NULL", "client_order_id TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'fee_paid', $driver)) {
      schema_add_column($pdo, 'orders', "fee_paid DECIMAL(20,8) NOT NULL DEFAULT 0", "fee_paid REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'usd_amount', $driver)) {
      schema_add_column($pdo, 'orders', "usd_amount DECIMAL(20,8) NULL", "usd_amount REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'tp_price', $driver)) {
      schema_add_column($pdo, 'orders', "tp_price DECIMAL(20,8) NULL", "tp_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'orders', 'sl_price', $driver)) {
      schema_add_column($pdo, 'orders', "sl_price DECIMAL(20,8) NULL", "sl_price REAL", $driver);
    }
  }

  // Backward-compatible upgrades (install.php can be re-run safely)
  if (schema_table_exists($pdo, 'positions', $driver)) {
    if (!schema_column_exists($pdo, 'positions', 'market_type', $driver)) {
      schema_add_column($pdo, 'positions', "market_type VARCHAR(16) NOT NULL DEFAULT 'spot'", "market_type TEXT NOT NULL DEFAULT 'spot'", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'leverage', $driver)) {
      schema_add_column($pdo, 'positions', "leverage INT NOT NULL DEFAULT 1", "leverage INTEGER NOT NULL DEFAULT 1", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'margin_mode', $driver)) {
      schema_add_column($pdo, 'positions', "margin_mode VARCHAR(16) NOT NULL DEFAULT 'isolated'", "margin_mode TEXT NOT NULL DEFAULT 'isolated'", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'margin_initial', $driver)) {
      schema_add_column($pdo, 'positions', "margin_initial DECIMAL(20,8) NOT NULL DEFAULT 0", "margin_initial REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'liquidation_price', $driver)) {
      schema_add_column($pdo, 'positions', "liquidation_price DECIMAL(20,8) NULL", "liquidation_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'tp_price', $driver)) {
      schema_add_column($pdo, 'positions', "tp_price DECIMAL(20,8) NULL", "tp_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'sl_price', $driver)) {
      schema_add_column($pdo, 'positions', "sl_price DECIMAL(20,8) NULL", "sl_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'fees_paid', $driver)) {
      schema_add_column($pdo, 'positions', "fees_paid DECIMAL(20,8) NOT NULL DEFAULT 0", "fees_paid REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'funding_accrued', $driver)) {
      schema_add_column($pdo, 'positions', "funding_accrued DECIMAL(20,8) NOT NULL DEFAULT 0", "funding_accrued REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'last_funding_at', $driver)) {
      schema_add_column($pdo, 'positions', "last_funding_at INT NULL", "last_funding_at INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'positions', 'status', $driver)) {
      schema_add_column($pdo, 'positions', "status VARCHAR(16) NOT NULL DEFAULT 'open'", "status TEXT NOT NULL DEFAULT 'open'", $driver);
    }
  }

  // Users upgrades (backward compatible)
  if (schema_table_exists($pdo, 'users', $driver)) {
    if (!schema_column_exists($pdo, 'users', 'telegram_chat_id', $driver)) {
      schema_add_column($pdo, 'users', "telegram_chat_id VARCHAR(32) NULL", "telegram_chat_id TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'locale', $driver)) {
      schema_add_column($pdo, 'users', "locale VARCHAR(16) NOT NULL DEFAULT 'en'", "locale TEXT NOT NULL DEFAULT 'en'", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'support_locale', $driver)) {
      schema_add_column($pdo, 'users', "support_locale VARCHAR(16) NULL", "support_locale TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'first_name', $driver)) {
      schema_add_column($pdo, 'users', "first_name VARCHAR(64) NULL", "first_name TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'last_name', $driver)) {
      schema_add_column($pdo, 'users', "last_name VARCHAR(64) NULL", "last_name TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'username', $driver)) {
      schema_add_column($pdo, 'users', "username VARCHAR(64) NULL", "username TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'email', $driver)) {
      schema_add_column($pdo, 'users', "email VARCHAR(190) NULL", "email TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'password_hash', $driver)) {
      schema_add_column($pdo, 'users', "password_hash VARCHAR(255) NULL", "password_hash TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'account_status', $driver)) {
      schema_add_column($pdo, 'users', "account_status VARCHAR(16) NOT NULL DEFAULT 'active'", "account_status TEXT NOT NULL DEFAULT 'active'", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'login_provider', $driver)) {
      schema_add_column($pdo, 'users', "login_provider VARCHAR(16) NOT NULL DEFAULT 'telegram'", "login_provider TEXT NOT NULL DEFAULT 'telegram'", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'last_login_at', $driver)) {
      schema_add_column($pdo, 'users', "last_login_at INT NULL", "last_login_at INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'display_name', $driver)) {
      schema_add_column($pdo, 'users', "display_name VARCHAR(191) NULL", "display_name TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'country_code', $driver)) {
      schema_add_column($pdo, 'users', "country_code VARCHAR(2) NULL", "country_code TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'country_name', $driver)) {
      schema_add_column($pdo, 'users', "country_name VARCHAR(128) NULL", "country_name TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'phone_dial_code', $driver)) {
      schema_add_column($pdo, 'users', "phone_dial_code VARCHAR(8) NULL", "phone_dial_code TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'phone_number', $driver)) {
      schema_add_column($pdo, 'users', "phone_number VARCHAR(32) NULL", "phone_number TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'phone_e164', $driver)) {
      schema_add_column($pdo, 'users', "phone_e164 VARCHAR(32) NULL", "phone_e164 TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'users', 'birth_date', $driver)) {
      schema_add_column($pdo, 'users', "birth_date DATE NULL", "birth_date TEXT", $driver);
    }
    try {
      if ($driver === 'mysql') {
        $pdo->exec("ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)");
      } else {
        $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users(email) WHERE email IS NOT NULL AND email <> ''");
      }
    } catch (Throwable $e) {}
  }

  // Wallets upgrades (backward compatible)
  if (schema_table_exists($pdo, 'wallets', $driver)) {
    if (!schema_column_exists($pdo, 'wallets', 'balance_cache', $driver)) {
      schema_add_column($pdo, 'wallets', "balance_cache DECIMAL(20,8) NOT NULL DEFAULT 0", "balance_cache REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'wallets', 'available_cache', $driver)) {
      schema_add_column($pdo, 'wallets', "available_cache DECIMAL(20,8) NOT NULL DEFAULT 0", "available_cache REAL NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'wallets', 'currency', $driver)) {
      schema_add_column($pdo, 'wallets', "currency VARCHAR(24) NOT NULL DEFAULT 'USDT'", "currency TEXT NOT NULL DEFAULT 'USDT'", $driver);
    }
  }

  // Feature flags upgrades (backward compatible)
  if (schema_table_exists($pdo, 'feature_flags', $driver)) {
    if (!schema_column_exists($pdo, 'feature_flags', 'updated_at', $driver)) {
      schema_add_column($pdo, 'feature_flags', 'updated_at BIGINT NOT NULL DEFAULT 0', 'updated_at INTEGER NOT NULL DEFAULT 0', $driver);
    }
  }

  // Payment methods upgrades (backward compatible)
  if (schema_table_exists($pdo, 'payment_methods', $driver)) {
    if (!schema_column_exists($pdo, 'payment_methods', 'image_url', $driver)) {
      schema_add_column($pdo, 'payment_methods', "image_url TEXT NULL", "image_url TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'desc_en', $driver)) {
      schema_add_column($pdo, 'payment_methods', "desc_en TEXT NULL", "desc_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'desc_ar', $driver)) {
      schema_add_column($pdo, 'payment_methods', "desc_ar TEXT NULL", "desc_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'desc_ru', $driver)) {
      schema_add_column($pdo, 'payment_methods', "desc_ru TEXT NULL", "desc_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'account_scope', $driver)) {
      schema_add_column($pdo, 'payment_methods', "account_scope VARCHAR(16) NOT NULL DEFAULT 'real'", "account_scope TEXT NOT NULL DEFAULT 'real'", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'fields_json', $driver)) {
      schema_add_column($pdo, 'payment_methods', "fields_json MEDIUMTEXT NULL", "fields_json TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'checkout_label', $driver)) {
      schema_add_column($pdo, 'payment_methods', "checkout_label VARCHAR(120) NULL", "checkout_label TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'method_group', $driver)) {
      schema_add_column($pdo, 'payment_methods', "method_group VARCHAR(32) NULL", "method_group TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'payment_address', $driver)) {
      schema_add_column($pdo, 'payment_methods', "payment_address TEXT NULL", "payment_address TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'payment_qr_url', $driver)) {
      schema_add_column($pdo, 'payment_methods', "payment_qr_url TEXT NULL", "payment_qr_url TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'proof_required', $driver)) {
      schema_add_column($pdo, 'payment_methods', "proof_required TINYINT(1) NOT NULL DEFAULT 0", "proof_required INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'expires_hours', $driver)) {
      schema_add_column($pdo, 'payment_methods', "expires_hours INT NOT NULL DEFAULT 24", "expires_hours INTEGER NOT NULL DEFAULT 24", $driver);
    }
    if (!schema_column_exists($pdo, 'payment_methods', 'category_key', $driver)) {
      schema_add_column($pdo, 'payment_methods', "category_key VARCHAR(64) NULL", "category_key TEXT", $driver);
    }
  }

  if (schema_table_exists($pdo, 'funding_categories', $driver)) {
    if (!schema_column_exists($pdo, 'funding_categories', 'image_url', $driver)) {
      schema_add_column($pdo, 'funding_categories', "image_url TEXT NULL", "image_url TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'funding_categories', 'icon', $driver)) {
      schema_add_column($pdo, 'funding_categories', "icon VARCHAR(32) NULL", "icon TEXT", $driver);
    }
  }


  if (!schema_table_exists($pdo, 'web_sessions', $driver)) {
    $pdo->exec($driver === 'mysql' ?
      "CREATE TABLE IF NOT EXISTS web_sessions (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        selector VARCHAR(64) NOT NULL,
        validator_hash VARCHAR(64) NOT NULL,
        provider VARCHAR(16) NOT NULL DEFAULT 'web',
        user_agent VARCHAR(255) NULL,
        ip_address VARCHAR(64) NULL,
        created_at INT NOT NULL DEFAULT 0,
        last_used_at INT NOT NULL DEFAULT 0,
        expires_at INT NOT NULL DEFAULT 0,
        revoked_at INT NULL DEFAULT NULL,
        UNIQUE KEY uq_web_sessions_selector (selector),
        KEY idx_web_sessions_user (user_id),
        KEY idx_web_sessions_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
      :
      "CREATE TABLE IF NOT EXISTS web_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        selector TEXT NOT NULL,
        validator_hash TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'web',
        user_agent TEXT NULL,
        ip_address TEXT NULL,
        created_at INTEGER NOT NULL DEFAULT 0,
        last_used_at INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL DEFAULT 0,
        revoked_at INTEGER NULL
      );"
    );
  }
  if (!schema_table_exists($pdo, 'user_identities', $driver)) {
    $pdo->exec($driver === 'mysql' ?
      "CREATE TABLE IF NOT EXISTS user_identities (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        provider VARCHAR(32) NOT NULL,
        provider_user_id VARCHAR(191) NOT NULL,
        provider_username VARCHAR(191) NULL,
        provider_email VARCHAR(191) NULL,
        meta_json LONGTEXT NULL,
        created_at INT NOT NULL DEFAULT 0,
        updated_at INT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_user_identity_provider (provider, provider_user_id),
        KEY idx_user_identity_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
      :
      "CREATE TABLE IF NOT EXISTS user_identities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        provider_username TEXT NULL,
        provider_email TEXT NULL,
        meta_json TEXT NULL,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );"
    );
  }
  if (!schema_table_exists($pdo, 'trading_accounts', $driver)) {
    $pdo->exec($driver === 'mysql' ?
      "CREATE TABLE IF NOT EXISTS trading_accounts (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        account_no VARCHAR(32) NOT NULL,
        mode VARCHAR(16) NOT NULL DEFAULT 'live',
        label VARCHAR(64) NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        base_currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        created_at INT NOT NULL DEFAULT 0,
        updated_at INT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_trading_accounts_no (account_no),
        UNIQUE KEY uq_trading_accounts_user_mode (user_id, mode),
        KEY idx_trading_accounts_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
      :
      "CREATE TABLE IF NOT EXISTS trading_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_no TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'live',
        label TEXT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        base_currency TEXT NOT NULL DEFAULT 'USDT',
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );"
    );
  }

  // Invest plans upgrades (backward compatible)
  if (schema_table_exists($pdo, 'invest_plans', $driver)) {
    if (!schema_column_exists($pdo, 'invest_plans', 'name_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "name_en VARCHAR(128) NULL", "name_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'name_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "name_ar VARCHAR(128) NULL", "name_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'name_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "name_ru VARCHAR(128) NULL", "name_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'desc_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "desc_en TEXT NULL", "desc_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'desc_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "desc_ar TEXT NULL", "desc_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'desc_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "desc_ru TEXT NULL", "desc_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'details_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "details_en MEDIUMTEXT NULL", "details_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'details_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "details_ar MEDIUMTEXT NULL", "details_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'details_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "details_ru MEDIUMTEXT NULL", "details_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'sort_order', $driver)) {
      schema_add_column($pdo, 'invest_plans', "sort_order INT NOT NULL DEFAULT 0", "sort_order INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'status', $driver)) {
      schema_add_column($pdo, 'invest_plans', "status VARCHAR(16) NOT NULL DEFAULT 'active'", "status TEXT NOT NULL DEFAULT 'active'", $driver);
    }

    // New plan fields used by the frontend/admin
    if (!schema_column_exists($pdo, 'invest_plans', 'term_days', $driver)) {
      schema_add_column($pdo, 'invest_plans', "term_days INT NOT NULL DEFAULT 30", "term_days INTEGER NOT NULL DEFAULT 30", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'roi_percent', $driver)) {
      schema_add_column($pdo, 'invest_plans', "roi_percent DECIMAL(10,4) NOT NULL DEFAULT 5", "roi_percent REAL NOT NULL DEFAULT 5", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'min_amount', $driver)) {
      schema_add_column($pdo, 'invest_plans', "min_amount DECIMAL(20,8) NOT NULL DEFAULT 50", "min_amount REAL NOT NULL DEFAULT 50", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'max_amount', $driver)) {
      schema_add_column($pdo, 'invest_plans', "max_amount DECIMAL(20,8) NOT NULL DEFAULT 10000", "max_amount REAL NOT NULL DEFAULT 10000", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'risk', $driver)) {
      schema_add_column($pdo, 'invest_plans', "risk VARCHAR(16) NOT NULL DEFAULT 'medium'", "risk TEXT NOT NULL DEFAULT 'medium'", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'payout_schedule', $driver)) {
      schema_add_column($pdo, 'invest_plans', "payout_schedule VARCHAR(16) NOT NULL DEFAULT 'end'", "payout_schedule TEXT NOT NULL DEFAULT 'end'", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'early_exit_allowed', $driver)) {
      schema_add_column($pdo, 'invest_plans', "early_exit_allowed TINYINT(1) NOT NULL DEFAULT 1", "early_exit_allowed INTEGER NOT NULL DEFAULT 1", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'early_exit_penalty_percent', $driver)) {
      schema_add_column($pdo, 'invest_plans', "early_exit_penalty_percent DECIMAL(10,4) NOT NULL DEFAULT 0", "early_exit_penalty_percent REAL NOT NULL DEFAULT 0", $driver);
    }
  }

  // Perp/Depth snapshots (optional; safe on shared hosting)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS orderbook_snapshots (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      bids MEDIUMTEXT NULL,
      asks MEDIUMTEXT NULL,
      source VARCHAR(16) NOT NULL DEFAULT 'binance',
      updated_at INT NOT NULL,
      KEY idx_symbol (symbol),
      KEY idx_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS orderbook_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      bids TEXT,
      asks TEXT,
      source TEXT NOT NULL DEFAULT 'binance',
      updated_at INTEGER NOT NULL
    );"
  );

  // Extra quote fields + authority columns for market quote arbitration
  if (schema_table_exists($pdo, 'market_quotes', $driver)) {
    if (!schema_column_exists($pdo, 'market_quotes', 'mark_price', $driver)) {
      schema_add_column($pdo, 'market_quotes', "mark_price DECIMAL(20,8) NULL", "mark_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'index_price', $driver)) {
      schema_add_column($pdo, 'market_quotes', "index_price DECIMAL(20,8) NULL", "index_price REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'funding_rate', $driver)) {
      schema_add_column($pdo, 'market_quotes', "funding_rate DECIMAL(20,12) NULL", "funding_rate REAL", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'next_funding_time', $driver)) {
      schema_add_column($pdo, 'market_quotes', "next_funding_time BIGINT NULL", "next_funding_time INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'source', $driver)) {
      schema_add_column($pdo, 'market_quotes', "source VARCHAR(32) NULL", "source TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'as_of', $driver)) {
      schema_add_column($pdo, 'market_quotes', "as_of INT NULL", "as_of INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'ingested_at', $driver)) {
      schema_add_column($pdo, 'market_quotes', "ingested_at INT NULL", "ingested_at INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'source_priority', $driver)) {
      schema_add_column($pdo, 'market_quotes', "source_priority INT NOT NULL DEFAULT 0", "source_priority INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'market', $driver)) {
      schema_add_column($pdo, 'market_quotes', "market VARCHAR(16) NOT NULL DEFAULT 'spot'", "market TEXT NOT NULL DEFAULT 'spot'", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'provider', $driver)) {
      schema_add_column($pdo, 'market_quotes', "provider VARCHAR(32) NULL", "provider TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'provider_ts', $driver)) {
      schema_add_column($pdo, 'market_quotes', "provider_ts INT NULL", "provider_ts INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'received_at', $driver)) {
      schema_add_column($pdo, 'market_quotes', "received_at INT NULL", "received_at INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'source_strength', $driver)) {
      schema_add_column($pdo, 'market_quotes', "source_strength INT NOT NULL DEFAULT 0", "source_strength INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'is_stale', $driver)) {
      schema_add_column($pdo, 'market_quotes', "is_stale TINYINT(1) NOT NULL DEFAULT 0", "is_stale INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'market_quotes', 'debug_meta', $driver)) {
      schema_add_column($pdo, 'market_quotes', "debug_meta JSON NULL", "debug_meta TEXT", $driver);
    }
    try { schema_upgrade_market_quotes_authority($pdo, $driver); } catch (Throwable $e) {}
  }

  // Invest plans
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS invest_plans (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      name_en VARCHAR(128) NULL,
      name_ar VARCHAR(128) NULL,
      name_ru VARCHAR(128) NULL,
      desc_en TEXT NULL,
      desc_ar TEXT NULL,
      desc_ru TEXT NULL,
      details_en MEDIUMTEXT NULL,
      details_ar MEDIUMTEXT NULL,
      details_ru MEDIUMTEXT NULL,
      term_days INT NOT NULL,
      roi_percent DECIMAL(10,4) NOT NULL,
      min_amount DECIMAL(20,8) NOT NULL,
      max_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      risk VARCHAR(32) NOT NULL,
      payout_schedule VARCHAR(16) NOT NULL DEFAULT 'end',
      early_exit_allowed TINYINT(1) NOT NULL DEFAULT 0,
      early_exit_penalty_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at INT NULL,
      updated_at INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS invest_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      name_ar TEXT,
      name_ru TEXT,
      desc_en TEXT,
      desc_ar TEXT,
      desc_ru TEXT,
      details_en TEXT,
      details_ar TEXT,
      details_ru TEXT,
      term_days INTEGER NOT NULL,
      roi_percent REAL NOT NULL,
      min_amount REAL NOT NULL,
      max_amount REAL NOT NULL DEFAULT 0,
      risk TEXT NOT NULL,
      payout_schedule TEXT NOT NULL DEFAULT 'end',
      early_exit_allowed INTEGER NOT NULL DEFAULT 0,
      early_exit_penalty_percent REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );"
  );

  // Investments
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS investments (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      plan_id VARCHAR(64) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      expected_return DECIMAL(20,8) NOT NULL,
      debit_ledger_id BIGINT UNSIGNED NULL,
      payout_ledger_id BIGINT UNSIGNED NULL,
      payout_schedule VARCHAR(16) NOT NULL DEFAULT 'end',
      last_accrual_at INT NULL,
      paid_total DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL,
      start_at INT NOT NULL,
      end_at INT NOT NULL,
      created_at INT NOT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      expected_return REAL NOT NULL,
      debit_ledger_id INTEGER,
      payout_ledger_id INTEGER,
      payout_schedule TEXT NOT NULL DEFAULT 'end',
      last_accrual_at INTEGER,
      paid_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );"
  );

  // Investment accruals
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS investment_accruals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      investment_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      ledger_id BIGINT UNSIGNED NULL,
      run_at INT NOT NULL,
      created_at INT NOT NULL,
      UNIQUE KEY uq_inv_run (investment_id, run_at),
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS investment_accruals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      ledger_id INTEGER,
      run_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(investment_id, run_at)
    );"
  );

  // Telegram session anti-replay (prevents re-using old initData on the API)
  if (!schema_table_exists($pdo, 'tg_sessions', $driver)) {
    $pdo->exec($driver === 'mysql' ?
      "CREATE TABLE IF NOT EXISTS tg_sessions (
        user_id BIGINT PRIMARY KEY,
        last_auth_date BIGINT NOT NULL DEFAULT 0,
        last_hash VARCHAR(128) NULL,
        updated_at BIGINT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
      :
      "CREATE TABLE IF NOT EXISTS tg_sessions (
        user_id INTEGER PRIMARY KEY,
        last_auth_date INTEGER NOT NULL DEFAULT 0,
        last_hash TEXT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0
      );"
    );
  }


  // Secure browser sessions (web-first auth layer)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS web_sessions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      selector VARCHAR(64) NOT NULL,
      validator_hash VARCHAR(64) NOT NULL,
      provider VARCHAR(16) NOT NULL DEFAULT 'web',
      user_agent VARCHAR(255) NULL,
      ip_address VARCHAR(64) NULL,
      created_at INT NOT NULL DEFAULT 0,
      last_used_at INT NOT NULL DEFAULT 0,
      expires_at INT NOT NULL DEFAULT 0,
      revoked_at INT NULL DEFAULT NULL,
      UNIQUE KEY uq_web_sessions_selector (selector),
      KEY idx_web_sessions_user (user_id),
      KEY idx_web_sessions_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS web_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      selector TEXT NOT NULL,
      validator_hash TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'web',
      user_agent TEXT NULL,
      ip_address TEXT NULL,
      created_at INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL DEFAULT 0,
      revoked_at INTEGER NULL
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_web_sessions_selector ON web_sessions(selector)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(user_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at)"); } catch (Throwable $e) {}
  }

  // External login identities (email / telegram / future oauth providers)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS user_identities (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(32) NOT NULL,
      provider_user_id VARCHAR(191) NOT NULL,
      provider_username VARCHAR(191) NULL,
      provider_email VARCHAR(191) NULL,
      meta_json LONGTEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_user_identity_provider (provider, provider_user_id),
      KEY idx_user_identity_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS user_identities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      provider_username TEXT NULL,
      provider_email TEXT NULL,
      meta_json TEXT NULL,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_identity_provider ON user_identities(provider, provider_user_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_identity_user ON user_identities(user_id)"); } catch (Throwable $e) {}
  }

  // Trading accounts (web platform model: live + demo accounts distinct from wallets)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS trading_accounts (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      account_no VARCHAR(32) NOT NULL,
      mode VARCHAR(16) NOT NULL DEFAULT 'live',
      label VARCHAR(64) NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      base_currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_trading_accounts_no (account_no),
      UNIQUE KEY uq_trading_accounts_user_mode (user_id, mode),
      KEY idx_trading_accounts_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS trading_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_no TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'live',
      label TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      base_currency TEXT NOT NULL DEFAULT 'USDT',
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_trading_accounts_no ON trading_accounts(account_no)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_trading_accounts_user_mode ON trading_accounts(user_id, mode)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON trading_accounts(user_id)"); } catch (Throwable $e) {}
  }

  // Settings / content (editable bot & app text)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value LONGTEXT NULL,
      updated_at INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  // KYC requests (basic identity verification flow)
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS kyc_requests (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      full_name VARCHAR(200) NULL,
      country VARCHAR(80) NULL,
      phone_e164 VARCHAR(32) NULL,
      birth_date DATE NULL,
      doc_type VARCHAR(40) NULL,
      doc_number VARCHAR(120) NULL,
      front_path VARCHAR(255) NULL,
      back_path VARCHAR(255) NULL,
      selfie_path VARCHAR(255) NULL,
      contract_path VARCHAR(255) NULL,
      extra_paths_json MEDIUMTEXT NULL,
      admin_note TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_user (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    :
    "CREATE TABLE IF NOT EXISTS kyc_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      full_name TEXT,
      country TEXT,
      phone_e164 TEXT,
      birth_date TEXT,
      doc_type TEXT,
      doc_number TEXT,
      front_path TEXT,
      back_path TEXT,
      selfie_path TEXT,
      contract_path TEXT,
      extra_paths_json TEXT,
      admin_note TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );

  if (schema_table_exists($pdo, 'kyc_requests', $driver)) {
    if (!schema_column_exists($pdo, 'kyc_requests', 'phone_e164', $driver)) {
      schema_add_column($pdo, 'kyc_requests', "phone_e164 VARCHAR(32) NULL", "phone_e164 TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'kyc_requests', 'birth_date', $driver)) {
      schema_add_column($pdo, 'kyc_requests', "birth_date DATE NULL", "birth_date TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'kyc_requests', 'contract_path', $driver)) {
      schema_add_column($pdo, 'kyc_requests', "contract_path VARCHAR(255) NULL", "contract_path TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'kyc_requests', 'extra_paths_json', $driver)) {
      schema_add_column($pdo, 'kyc_requests', "extra_paths_json MEDIUMTEXT NULL", "extra_paths_json TEXT", $driver);
    }
  }

  // Normalize fx->forex (if any old rows)
  try { $pdo->exec("UPDATE markets SET type='forex' WHERE type='fx'"); } catch (Throwable $e) {}

  // Auto-upgrade for already-existing installations (adds missing columns/indexes).
  // This keeps shared-hosting deployments stable when code is updated over an older DB.
  schema_upgrade($pdo, $driver);
}

function tv_symbol_guess(string $symbol, string $type): string {
  $sym = strtoupper(trim($symbol));
  $type = strtolower(trim($type));
  if ($type === 'crypto') return 'BINANCE:' . $sym;
  if ($type === 'forex') return 'FX:' . $sym;
  if ($type === 'stocks') return preg_match('/^[A-Z]+$/', $sym) ? ('NASDAQ:' . $sym) : ('NYSE:' . $sym);
  if ($type === 'commodities') {
    $commodityAlias = [
      'XAUUSD' => 'OANDA:XAUUSD',
      'GOLD' => 'OANDA:XAUUSD',
      'XAGUSD' => 'OANDA:XAGUSD',
      'SILVER' => 'OANDA:XAGUSD',
      'XPTUSD' => 'OANDA:XPTUSD',
      'XPDUSD' => 'OANDA:XPDUSD',
      'USOIL' => 'TVC:USOIL',
      'WTI' => 'TVC:USOIL',
      'OIL' => 'TVC:USOIL',
      'UKOIL' => 'TVC:UKOIL',
      'BRENT' => 'TVC:UKOIL',
      'NGAS' => 'FX:NGAS',
      'NATGAS' => 'FX:NGAS',
      'COPPER' => 'CAPITALCOM:COPPER',
      'CORN' => 'OANDA:CORNUSD',
      'WHEAT' => 'CAPITALCOM:WHEAT',
      'SOY' => 'CBOT:ZS1!',
      'SOYBEAN' => 'CBOT:ZS1!',
      'SUGAR' => 'ICEUS:SB1!',
      'COFFEE' => 'ICEUS:KC1!',
      'COCOA' => 'ICEUS:CC1!',
      'COTTON' => 'ICEUS:CT1!',
      'RICE' => 'CBOT:ZR1!',
      'OAT' => 'CBOT:ZO1!',
      'GASOLINE' => 'NYMEX:RB1!',
      'HEATOIL' => 'NYMEX:HO1!',
      'LUMBER' => 'CME:LBR1!',
      'CATTLE' => 'CME:LE1!',
      'HOGS' => 'CME:HE1!',
      'ORANGE' => 'ICEUS:OJ1!',
      'GLD' => 'AMEX:GLD',
      'SLV' => 'AMEX:SLV',
    ];
    return $commodityAlias[$sym] ?? '';
  }
  return $sym;
}

function seed_price_guess(string $type): float {
  $type = strtolower($type);
  return match($type){
    'crypto' => 1.0,
    'forex' => 1.0,
    'stocks' => 100.0,
    'commodities' => 10.0,
    'futures' => 1000.0,
    default => 0.0,
  };
}

function schema_seed_defaults(PDO $pdo, string $driver): void {
  $driver = strtolower($driver);

  schema_with_lock('schema_seed_defaults', function() use ($pdo, $driver) {
    $now = time();
    if ($driver !== 'mysql') schema_apply_sqlite_pragmas($pdo);

    // If settings table isn't there yet, don't seed (avoid noisy errors)
    try {
      if (!schema_table_exists($pdo, 'settings', $driver)) return;
    } catch (Throwable $e) { return; }

    // Seed once guard (avoid extra writes on every cold PHP start)
    try {
      $v = (string)(schema_setting_get($pdo, $driver, 'META_SEED_DONE', '') ?: '');
      if ($v === '1') return;
    } catch (Throwable $e) {
      // continue (we'll try seeding best-effort)
    }

    $txStarted = false;
    if ($driver !== 'mysql') {
      try { $pdo->beginTransaction(); $txStarted = true; } catch (Throwable $e) {}
    }

    try {
      // Feature flags
      $stmt = $pdo->prepare($driver === 'mysql'
        ? "INSERT IGNORE INTO feature_flags(flag_key, enabled, updated_at) VALUES (?,?,?)"
        : "INSERT OR IGNORE INTO feature_flags(flag_key, enabled, updated_at) VALUES (?,?,?)"
      );
      $stmt->execute(['demo_trading', 1, $now]);
      $stmt->execute(['real_trading', 0, $now]);
      $stmt->execute(['real_payouts', 0, $now]);
      $stmt->execute(['kyc_required_withdraw', 0, $now]);

      // Trading settings (stored in DB so admin can change without touching env)
      try {
        $defaultsS = [
          ['SPOT_MAKER_FEE', '0.0002'],
          ['SPOT_TAKER_FEE', '0.0004'],
          ['PERP_MAKER_FEE', '0.0002'],
          ['PERP_TAKER_FEE', '0.0004'],
          ['PERP_MAINTENANCE_MARGIN_RATE', '0.005'],
          ['PERP_MAX_LEVERAGE', (string)(schema_env('PERP_MAX_LEVERAGE','125'))],
          // 0 = keep each position separate (user requested); 1 = merge by (symbol+side)
          ['TRADE_MERGE_POSITIONS', '0'],
        ];
        foreach ($defaultsS as $row) {
          schema_setting_set($pdo, $driver, (string)$row[0], (string)$row[1], $now);
        }
      } catch (Throwable $e) {
        // ignore
      }

      // Invest plans seed (safe)
      try {
        if (schema_table_exists($pdo, 'invest_plans', $driver)) {
          $ins = $pdo->prepare($driver === 'mysql'
            ? 'INSERT IGNORE INTO invest_plans(id,name,name_en,name_ar,name_ru,desc_en,desc_ar,desc_ru,details_en,details_ar,details_ru,term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,early_exit_allowed,early_exit_penalty_percent,sort_order,status,created_at,updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            : 'INSERT OR IGNORE INTO invest_plans(id,name,name_en,name_ar,name_ru,desc_en,desc_ar,desc_ru,details_en,details_ar,details_ru,term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,early_exit_allowed,early_exit_penalty_percent,sort_order,status,created_at,updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          );
          $ins->execute([
            'starter_14','Starter 14D','Starter 14D','باقة المبتدئ 14 يوم','Старт 14 дней',
            'Low-risk plan for beginners.','خطة منخفضة المخاطر للمبتدئين.','Низкорисковый план для начинающих.',
            "Term: 14 days\nROI: 6% (total)\nPayout: end of term\nEarly exit: not allowed",
            "المدة: 14 يوم\nالعائد: 6% (إجمالي)\nالصرف: نهاية المدة\nالخروج المبكر: غير متاح",
            "Срок: 14 дней\nДоходность: 6% (итого)\nВыплата: в конце срока\nДосрочный выход: недоступен",
            14,6.0,50,0,'Low','end',0,0,10,'active',$now,$now
          ]);
        }
      } catch (Throwable $e) {}

      // Payment methods seed (safe)
      try {
        $insPm = $pdo->prepare($driver === 'mysql'
          ? 'INSERT IGNORE INTO payment_methods(kind,code,provider,currency,title_en,title_ar,title_ru,instructions_en,instructions_ar,instructions_ru,min_amount,max_amount,status,sort_order,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          : 'INSERT OR IGNORE INTO payment_methods(kind,code,provider,currency,title_en,title_ar,title_ru,instructions_en,instructions_ar,instructions_ru,min_amount,max_amount,status,sort_order,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $pmSeeds = [
          ['deposit','usdt_trc20','dummy','USDT','USDT (TRC20)','USDT (TRC20)','USDT (TRC20)','Send USDT TRC20 to the provided address.','أرسل USDT عبر شبكة TRC20 إلى العنوان المعروض.','Отправьте USDT (TRC20) на указанный адрес.',10,0,'active',10,$now,$now],
          ['withdraw','usdt_trc20','dummy','USDT','USDT (TRC20)','USDT (TRC20)','USDT (TRC20)','Withdrawal requires admin approval.','السحب يتطلب موافقة الإدارة.','Вывод требует одобрения администратора.',10,0,'active',10,$now,$now],
          ['deposit','usdt_erc20','dummy','USDT','USDT (ERC20)','USDT (ERC20)','USDT (ERC20)','Send USDT ERC20 to the provided address.','أرسل USDT عبر شبكة ERC20 إلى العنوان المعروض.','Отправьте USDT (ERC20) на указанный адрес.',10,0,'active',20,$now,$now],
          ['withdraw','usdt_erc20','dummy','USDT','USDT (ERC20)','USDT (ERC20)','USDT (ERC20)','Withdrawal request will be reviewed by admin.','طلب السحب يتم مراجعته من الإدارة.','Заявка на вывод будет рассмотрена администратором.',10,0,'active',20,$now,$now],
        ];
        foreach ($pmSeeds as $row) { $insPm->execute($row); }
      } catch (Throwable $e) {}

      // Funding categories seed (safe)
      try {
        $insCat = $pdo->prepare($driver === 'mysql'
          ? 'INSERT IGNORE INTO funding_categories(kind,key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,status,sort_order,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
          : 'INSERT OR IGNORE INTO funding_categories(kind,key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,status,sort_order,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $catSeeds = [
          ['deposit','crypto','Crypto','كريبتو','Крипто','Wallet and stablecoin routes','مسارات المحافظ والعملات المستقرة','Криптовалютные и stablecoin маршруты','₿','active',10,$now,$now],
          ['deposit','bank','Bank','بنك','Банк','Wire and local banking routes','مسارات التحويل البنكي والمحلي','Банковские и локальные переводы','🏦','active',20,$now,$now],
          ['deposit','card','Card','بطاقة','Карта','Visa, MasterCard, and card processors','فيزا وماستركارد ومعالجات البطاقات','Visa, MasterCard и карточные процессоры','💳','active',30,$now,$now],
          ['deposit','crypto_bot','Crypto Bot','بوت كريبتو','Крипто бот','Telegram-assisted checkout route','مسار إتمام عبر تيليجرام','Маршрут оплаты через Telegram','🤖','active',40,$now,$now],
          ['withdraw','crypto','Crypto','كريبتو','Крипто','Wallet payout routes','مسارات السحب إلى المحافظ','Маршруты вывода на кошельки','₿','active',10,$now,$now],
          ['withdraw','bank','Bank','بنك','Банк','Wire and local bank payouts','مسارات السحب البنكي والمحلي','Банковские выплаты','🏦','active',20,$now,$now],
          ['withdraw','card','Card','بطاقة','Карта','Card payout processors','معالجات السحب إلى البطاقات','Карточные выплаты','💳','active',30,$now,$now],
          ['withdraw','crypto_bot','Crypto Bot','بوت كريبتو','Крипто бот','Telegram-assisted payout route','مسار سحب عبر تيليجرام','Маршрут вывода через Telegram','🤖','active',40,$now,$now],
        ];
        foreach ($catSeeds as $row) { $insCat->execute($row); }
      } catch (Throwable $e) {}

      // Markets seed
      try {
        $mcount = (int)$pdo->query("SELECT COUNT(*) FROM markets")->fetchColumn();
      } catch (Throwable $e) { $mcount = 0; }
      if ($mcount === 0) {
        $insm = $pdo->prepare('INSERT INTO markets(symbol,name,type,status,sort_order,tv_symbol,seed_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
        $insm->execute(['BTCUSDT','Bitcoin / USDT','crypto','active',10,'BINANCE:BTCUSDT',45000,$now,$now]);
        $insm->execute(['ETHUSDT','Ethereum / USDT','crypto','active',20,'BINANCE:ETHUSDT',2500,$now,$now]);
        $insm->execute(['EURUSD','Euro / US Dollar','forex','active',10,'FX:EURUSD',1.09,$now,$now]);
        $insm->execute(['AAPL','Apple Inc.','stocks','active',10,'NASDAQ:AAPL',185,$now,$now]);
        $insm->execute(['XAUUSD','Gold Spot','commodities','active',10,'OANDA:XAUUSD',2050,$now,$now]);
      }

      // ✅ Safe upsert defaults list
      $insm2 = $pdo->prepare($driver === 'mysql'
        ? 'INSERT IGNORE INTO markets(symbol,name,type,status,sort_order,tv_symbol,seed_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
        : 'INSERT OR IGNORE INTO markets(symbol,name,type,status,sort_order,tv_symbol,seed_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
      );

      // Expanded defaults: ~50 symbols per market type (user request)
      $defaults = [
        // CRYPTO
        ['BNBUSDT','BNB / USDT','crypto',30],
        ['SOLUSDT','Solana / USDT','crypto',40],
        ['XRPUSDT','XRP / USDT','crypto',50],
        ['ADAUSDT','Cardano / USDT','crypto',55],
        ['DOGEUSDT','Dogecoin / USDT','crypto',60],
        ['MATICUSDT','Polygon / USDT','crypto',65],
        ['AVAXUSDT','Avalanche / USDT','crypto',70],
        ['LINKUSDT','Chainlink / USDT','crypto',75],
        ['TRXUSDT','TRON / USDT','crypto',80],
        ['DOTUSDT','Polkadot / USDT','crypto',85],
        ['LTCUSDT','Litecoin / USDT','crypto',90],
        ['BCHUSDT','Bitcoin Cash / USDT','crypto',95],
        ['SHIBUSDT','Shiba Inu / USDT','crypto',100],
        ['UNIUSDT','Uniswap / USDT','crypto',105],
        ['ETCUSDT','Ethereum Classic / USDT','crypto',110],
        ['ATOMUSDT','Cosmos / USDT','crypto',115],
        ['NEARUSDT','NEAR / USDT','crypto',120],
        ['APTUSDT','Aptos / USDT','crypto',125],
        ['OPUSDT','Optimism / USDT','crypto',130],
        ['ARBUSDT','Arbitrum / USDT','crypto',135],
        ['FTMUSDT','Fantom / USDT','crypto',140],
        ['INJUSDT','Injective / USDT','crypto',145],
        ['SEIUSDT','Sei / USDT','crypto',150],
        ['SUIUSDT','Sui / USDT','crypto',155],
        ['ICPUSDT','Internet Computer / USDT','crypto',160],
        ['FILUSDT','Filecoin / USDT','crypto',165],
        ['HBARUSDT','Hedera / USDT','crypto',170],
        ['VETUSDT','VeChain / USDT','crypto',175],
        ['ALGOUSDT','Algorand / USDT','crypto',180],
        ['EGLDUSDT','MultiversX / USDT','crypto',185],
        ['AAVEUSDT','Aave / USDT','crypto',190],
        ['XLMUSDT','Stellar / USDT','crypto',195],
        ['THETAUSDT','Theta / USDT','crypto',200],
        ['XTZUSDT','Tezos / USDT','crypto',205],
        ['MKRUSDT','Maker / USDT','crypto',210],
        ['COMPUSDT','Compound / USDT','crypto',215],
        ['SANDUSDT','The Sandbox / USDT','crypto',220],
        ['MANAUSDT','Decentraland / USDT','crypto',225],
        ['GALAUSDT','Gala / USDT','crypto',230],
        ['AXSUSDT','Axie / USDT','crypto',235],
        ['RUNEUSDT','THORChain / USDT','crypto',240],
        ['NEOUSDT','NEO / USDT','crypto',245],
        ['CAKEUSDT','PancakeSwap / USDT','crypto',250],
        ['STXUSDT','Stacks / USDT','crypto',255],
        ['KASUSDT','Kaspa / USDT','crypto',260],
        ['PEPEUSDT','Pepe / USDT','crypto',265],
        ['WIFUSDT','WIF / USDT','crypto',270],
        ['BONKUSDT','Bonk / USDT','crypto',275],

        // FOREX
        ['AUDUSD','Australian Dollar / US Dollar','forex',10],
        ['EURUSD','Euro / US Dollar','forex',12],
        ['GBPUSD','British Pound / US Dollar','forex',14],
        ['USDJPY','US Dollar / Japanese Yen','forex',16],
        ['USDCHF','US Dollar / Swiss Franc','forex',18],
        ['USDCAD','US Dollar / Canadian Dollar','forex',20],
        ['NZDUSD','New Zealand Dollar / US Dollar','forex',22],
        ['EURJPY','Euro / Japanese Yen','forex',24],
        ['GBPJPY','Pound / Japanese Yen','forex',26],
        ['EURGBP','Euro / Pound','forex',28],
        ['EURCHF','Euro / Swiss Franc','forex',30],
        ['EURAUD','Euro / Australian Dollar','forex',32],
        ['EURCAD','Euro / Canadian Dollar','forex',34],
        ['AUDJPY','Australian Dollar / Japanese Yen','forex',36],
        ['AUDCAD','Australian Dollar / Canadian Dollar','forex',38],
        ['AUDCHF','Australian Dollar / Swiss Franc','forex',40],
        ['CADJPY','Canadian Dollar / Japanese Yen','forex',42],
        ['CHFJPY','Swiss Franc / Japanese Yen','forex',44],
        ['GBPAUD','Pound / Australian Dollar','forex',46],
        ['GBPCAD','Pound / Canadian Dollar','forex',48],
        ['GBPCHF','Pound / Swiss Franc','forex',50],
        ['NZDJPY','NZ Dollar / Japanese Yen','forex',52],
        ['NZDCAD','NZ Dollar / Canadian Dollar','forex',54],
        ['NZDCHF','NZ Dollar / Swiss Franc','forex',56],
        ['USDSEK','US Dollar / Swedish Krona','forex',58],
        ['USDNOK','US Dollar / Norwegian Krone','forex',60],
        ['USDDKK','US Dollar / Danish Krone','forex',62],
        ['USDMXN','US Dollar / Mexican Peso','forex',64],
        ['USDZAR','US Dollar / South African Rand','forex',66],
        ['USDTRY','US Dollar / Turkish Lira','forex',68],
        ['USDRUB','US Dollar / Russian Ruble','forex',70],
        ['USDSGD','US Dollar / Singapore Dollar','forex',72],
        ['USDHKD','US Dollar / Hong Kong Dollar','forex',74],
        ['USDPLN','US Dollar / Polish Zloty','forex',76],
        ['USDCZK','US Dollar / Czech Koruna','forex',78],
        ['USDHUF','US Dollar / Hungarian Forint','forex',80],
        ['EURPLN','Euro / Polish Zloty','forex',82],
        ['EURTRY','Euro / Turkish Lira','forex',84],
        ['EURZAR','Euro / South African Rand','forex',86],
        ['GBPNZD','Pound / NZ Dollar','forex',88],
        ['EURNZD','Euro / NZ Dollar','forex',90],
        ['AUDNZD','AUD / NZD','forex',92],
        ['CADCHF','CAD / CHF','forex',94],
        ['EURNOK','EUR / NOK','forex',96],
        ['EURSEK','EUR / SEK','forex',98],
        ['GBPSEK','GBP / SEK','forex',100],
        ['GBPNOK','GBP / NOK','forex',102],
        ['AUDSGD','AUD / SGD','forex',104],
        ['EURSGD','EUR / SGD','forex',106],

        // STOCKS
        ['MSFT','Microsoft Corp.','stocks',10],
        ['AAPL','Apple Inc.','stocks',12],
        ['NVDA','NVIDIA Corp.','stocks',14],
        ['AMZN','Amazon.com Inc.','stocks',16],
        ['GOOGL','Alphabet (Class A)','stocks',18],
        ['META','Meta Platforms','stocks',20],
        ['TSLA','Tesla Inc.','stocks',22],
        ['BRK.B','Berkshire Hathaway B','stocks',24],
        ['JPM','JPMorgan Chase','stocks',26],
        ['V','Visa Inc.','stocks',28],
        ['MA','Mastercard Inc.','stocks',30],
        ['UNH','UnitedHealth','stocks',32],
        ['XOM','Exxon Mobil','stocks',34],
        ['LLY','Eli Lilly','stocks',36],
        ['AVGO','Broadcom','stocks',38],
        ['COST','Costco','stocks',40],
        ['NFLX','Netflix','stocks',42],
        ['ADBE','Adobe','stocks',44],
        ['CRM','Salesforce','stocks',46],
        ['INTC','Intel','stocks',48],
        ['AMD','AMD','stocks',50],
        ['ORCL','Oracle','stocks',52],
        ['CSCO','Cisco','stocks',54],
        ['PEP','PepsiCo','stocks',56],
        ['KO','Coca-Cola','stocks',58],
        ['MCD','McDonald\'s','stocks',60],
        ['NKE','Nike','stocks',62],
        ['DIS','Disney','stocks',64],
        ['BA','Boeing','stocks',66],
        ['GE','GE Aerospace','stocks',68],
        ['CAT','Caterpillar','stocks',70],
        ['WMT','Walmart','stocks',72],
        ['T','AT&T','stocks',74],
        ['VZ','Verizon','stocks',76],
        ['PFE','Pfizer','stocks',78],
        ['MRNA','Moderna','stocks',80],
        ['BABA','Alibaba','stocks',82],
        ['SHOP','Shopify','stocks',84],
        ['UBER','Uber','stocks',86],
        ['SNAP','Snap','stocks',88],
        ['PLTR','Palantir','stocks',90],
        ['COIN','Coinbase','stocks',92],
        ['SQ','Block','stocks',94],
        ['PYPL','PayPal','stocks',96],
        ['TMO','Thermo Fisher','stocks',98],
        ['ABT','Abbott','stocks',100],
        ['SAP','SAP','stocks',102],
        ['SONY','Sony','stocks',104],
        ['NIO','NIO','stocks',106],

        // FUTURES / PERPETUAL (non-crypto contracts)
        ['ES_F','E-mini S&P 500 Future','futures',108],
        ['NQ_F','E-mini Nasdaq 100 Future','futures',110],
        ['YM_F','E-mini Dow Future','futures',112],
        ['RTY_F','E-mini Russell 2000 Future','futures',114],
        ['NKD_F','Nikkei 225 Future','futures',116],
        ['CL_F','WTI Crude Future','futures',118],
        ['BZ_F','Brent Crude Future','futures',120],
        ['GC_F','Gold Future','futures',122],
        ['SI_F','Silver Future','futures',124],
        ['NG_F','Natural Gas Future','futures',126],
        ['ZN_F','10Y Treasury Note Future','futures',128],
        ['ZB_F','30Y Treasury Bond Future','futures',130],

        // COMMODITIES
        ['XAUUSD','Gold Spot','commodities',10],
        ['XAGUSD','Silver Spot','commodities',12],
        ['USOIL','WTI Crude Oil','commodities',14],
        ['UKOIL','Brent Crude Oil','commodities',16],
        ['NGAS','Natural Gas','commodities',18],
        ['COPPER','Copper','commodities',20],
        ['WTI','WTI Oil','commodities',22],
        ['BRENT','Brent Oil','commodities',24],
        ['PALL','Palladium','commodities',26],
        ['PLAT','Platinum','commodities',28],
        ['CORN','Corn','commodities',30],
        ['WHEAT','Wheat','commodities',32],
        ['SOY','Soybeans','commodities',34],
        ['SUGAR','Sugar','commodities',36],
        ['COFFEE','Coffee','commodities',38],
        ['COTTON','Cotton','commodities',40],
        ['COCOA','Cocoa','commodities',42],
        ['RICE','Rice','commodities',44],
        ['OAT','Oats','commodities',46],
        ['ALUMINUM','Aluminum','commodities',48],
        ['NICKEL','Nickel','commodities',50],
        ['ZINC','Zinc','commodities',52],
        ['LEAD','Lead','commodities',54],
        ['TIN','Tin','commodities',56],
        ['IRON','Iron Ore','commodities',58],
        ['GASOLINE','Gasoline','commodities',60],
        ['HEATOIL','Heating Oil','commodities',62],
        ['LUMBER','Lumber','commodities',64],
        ['CATTLE','Live Cattle','commodities',66],
        ['HOGS','Lean Hogs','commodities',68],
        ['OIL','Oil Basket','commodities',70],
        ['GLD','Gold ETF','commodities',72],
        ['SLV','Silver ETF','commodities',74],
        ['URANIUM','Uranium','commodities',76],
        ['COAL','Coal','commodities',78],
        ['ETHANOL','Ethanol','commodities',80],
        ['POTASH','Potash','commodities',82],
        ['FERT','Fertilizer','commodities',84],
        ['RUBBER','Rubber','commodities',86],
        ['PALMOIL','Palm Oil','commodities',88],
        ['OLIVEOIL','Olive Oil','commodities',90],
        ['MILK','Milk','commodities',92],
        ['CHEESE','Cheese','commodities',94],
        ['BUTTER','Butter','commodities',96],
        ['ORANGE','Orange Juice','commodities',98],
        ['SILK','Silk','commodities',100],
        ['WOOL','Wool','commodities',102],
        ['PAPER','Pulp','commodities',104],
        ['WATER','Water Index','commodities',106],
      ];

      foreach ($defaults as $d) {
        $sym = $d[0]; $name = $d[1]; $type = $d[2]; $sort = (int)$d[3];
        $tv = tv_symbol_guess($sym, $type);
        $seed = seed_price_guess($type);
        $insm2->execute([$sym,$name,$type,'active',$sort,$tv,$seed,$now,$now]);
      }

      // Ensure futures/perpetual rows exist on upgraded installs too
      try {
        $defaultsFutures = [
          ['ES_F','E-mini S&P 500 Future',108,'CME_MINI:ES1!',5200.0,'ES=F'],
          ['NQ_F','E-mini Nasdaq 100 Future',110,'CME_MINI:NQ1!',18250.0,'NQ=F'],
          ['YM_F','E-mini Dow Future',112,'CBOT_MINI:YM1!',39280.0,'YM=F'],
          ['RTY_F','E-mini Russell 2000 Future',114,'CME_MINI:RTY1!',2055.0,'RTY=F'],
          ['NKD_F','Nikkei 225 Future',116,'OSE:NK2251!',38750.0,'NKD=F'],
          ['CL_F','WTI Crude Future',118,'NYMEX:CL1!',81.2,'CL=F'],
          ['BZ_F','Brent Crude Future',120,'ICEEUR:BRN1!',84.4,'BZ=F'],
          ['GC_F','Gold Future',122,'COMEX:GC1!',2350.0,'GC=F'],
          ['SI_F','Silver Future',124,'COMEX:SI1!',27.0,'SI=F'],
          ['NG_F','Natural Gas Future',126,'NYMEX:NG1!',2.1,'NG=F'],
          ['ZN_F','10Y Treasury Note Future',128,'CBOT:ZN1!',110.0,'ZN=F'],
          ['ZB_F','30Y Treasury Bond Future',130,'CBOT:ZB1!',120.0,'ZB=F'],
        ];
        $selFuture = $pdo->prepare("SELECT COUNT(*) FROM markets WHERE symbol=? LIMIT 1");
        $insFuture = $pdo->prepare("INSERT INTO markets(symbol,name,type,status,sort_order,tv_symbol,seed_price,meta,created_at,updated_at) VALUES(?,?,'futures','active',?,?,?,?,?,?)");
        foreach ($defaultsFutures as $df) {
          $selFuture->execute([$df[0]]);
          if ((int)$selFuture->fetchColumn() > 0) continue;
          $insFuture->execute([$df[0],$df[1],$df[2],$df[3],$df[4],json_encode(['yahoo_ticker'=>$df[5],'tv_symbol'=>$df[3]], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$now,$now]);
        }
      } catch (Throwable $e) {}

      // Helpful meta for free fallbacks (do not overwrite admin edits)
      $metaMap = [
        'USOIL' => ['stooq_ticker'=>'uso.us','polygon_ticker'=>'USO'],
        'UKOIL' => ['stooq_ticker'=>'bno.us','polygon_ticker'=>'BNO'],
        'NGAS'  => ['stooq_ticker'=>'ung.us','polygon_ticker'=>'UNG'],
        'COPPER'=> ['stooq_ticker'=>'cper.us','polygon_ticker'=>'CPER'],
        'OIL'   => ['stooq_ticker'=>'uso.us','polygon_ticker'=>'USO'],
        'GLD'   => ['stooq_ticker'=>'gld.us'],
        'SLV'   => ['stooq_ticker'=>'slv.us'],
        'ES_F'  => ['yahoo_ticker'=>'ES=F','tv_symbol'=>'CME_MINI:ES1!'],
        'NQ_F'  => ['yahoo_ticker'=>'NQ=F','tv_symbol'=>'CME_MINI:NQ1!'],
        'YM_F'  => ['yahoo_ticker'=>'YM=F','tv_symbol'=>'CBOT_MINI:YM1!'],
        'RTY_F' => ['yahoo_ticker'=>'RTY=F','tv_symbol'=>'CME_MINI:RTY1!'],
        'NKD_F' => ['yahoo_ticker'=>'NKD=F','tv_symbol'=>'OSE:NK2251!'],
        'CL_F'  => ['yahoo_ticker'=>'CL=F','tv_symbol'=>'NYMEX:CL1!'],
        'BZ_F'  => ['yahoo_ticker'=>'BZ=F','tv_symbol'=>'ICEEUR:BRN1!'],
        'GC_F'  => ['yahoo_ticker'=>'GC=F','tv_symbol'=>'COMEX:GC1!'],
        'SI_F'  => ['yahoo_ticker'=>'SI=F','tv_symbol'=>'COMEX:SI1!'],
        'NG_F'  => ['yahoo_ticker'=>'NG=F','tv_symbol'=>'NYMEX:NG1!'],
        'ZN_F'  => ['yahoo_ticker'=>'ZN=F','tv_symbol'=>'CBOT:ZN1!'],
        'ZB_F'  => ['yahoo_ticker'=>'ZB=F','tv_symbol'=>'CBOT:ZB1!'],
      ];

      $selMeta = $pdo->prepare("SELECT meta FROM markets WHERE symbol=? LIMIT 1");
      $updMeta = $pdo->prepare("UPDATE markets SET meta=? , updated_at=? WHERE symbol=?");

      foreach ($metaMap as $sym=>$m) {
        try {
          $selMeta->execute([$sym]);
          $cur = (string)($selMeta->fetchColumn() ?: '');
          $curTrim = trim($cur);
          if ($curTrim !== '' && $curTrim !== '{}' && $curTrim !== 'null') continue;
          $updMeta->execute([json_encode($m, JSON_UNESCAPED_UNICODE), $now, $sym]);
        } catch (Throwable $e) {}
      }

      // Ensure seed_price if missing
      try {
        $pdo->exec("UPDATE markets SET seed_price = CASE
          WHEN type='forex' THEN 1.0
          WHEN type='stocks' THEN 100.0
          WHEN type='commodities' THEN 50.0
          WHEN type='futures' THEN 1000.0
          ELSE seed_price
        END
        WHERE (seed_price IS NULL OR seed_price=0)");
      } catch (Throwable $e) {}

      // Default payment method bonuses
      try {
        $insBonus = $pdo->prepare($driver === 'mysql'
          ? "INSERT IGNORE INTO payment_method_bonuses (method_key, type, amount, min_deposit, max_bonus, status, created_at, updated_at) VALUES (?,?,?,?,?,'active',?,?)"
          : "INSERT OR IGNORE INTO payment_method_bonuses (method_key, type, amount, min_deposit, max_bonus, status, created_at, updated_at) VALUES (?,?,?,?,?,'active',?,?)"
        );
        $insBonus->execute(['crypto', 'percent', 10.00, 100, 5000, $now, $now]);
      } catch (Throwable $e) {}

      // Mark seed done
      try {
        schema_setting_set($pdo, $driver, 'META_SEED_DONE', '1', $now);
      } catch (Throwable $e) {}

      if ($txStarted) { try { $pdo->commit(); } catch (Throwable $e) {} }
    } catch (Throwable $e) {
      if ($txStarted) { try { $pdo->rollBack(); } catch (Throwable $ee) {} }
      // swallow to keep cron stable
    }
  });
}

// Backwards-compatibility: older bundles called schema_upgrade() from install.php/schema_install().
// Safe to call multiple times.
function schema_upgrade(PDO $pdo, string $driver = 'sqlite') {
  $driver = strtolower($driver);

  return schema_with_lock('schema_upgrade', function() use ($pdo, $driver) {
    if ($driver !== 'mysql') schema_apply_sqlite_pragmas($pdo);

    $columnExists = function(string $table, string $col) use ($pdo, $driver): bool {
      try {
        if ($driver === 'sqlite') {
          $st = $pdo->prepare("PRAGMA table_info($table)");
          $st->execute();
          foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if (isset($r['name']) && strtolower((string)$r['name']) === strtolower($col)) return true;
          }
          return false;
        }
        $st = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
        $st->execute([$table, $col]);
        return ((int)$st->fetchColumn()) > 0;
      } catch (Throwable $e) {
        return false;
      }
    };

    $addColumn = function(string $table, string $col, string $sqlType, string $default = '') use ($pdo, $columnExists) {
      if ($columnExists($table, $col)) return;
      try {
        $ddl = "ALTER TABLE $table ADD COLUMN $col $sqlType";
        if ($default !== '') $ddl .= " DEFAULT $default";
        $pdo->exec($ddl);
      } catch (Throwable $e) {}
    };

    // Columns that were missing in several Hostinger installs
    $addColumn('users', 'locale', 'VARCHAR(8)', "'en'");
    $addColumn('users', 'created_at', 'INTEGER');
    $addColumn('users', 'updated_at', 'INTEGER');
    $addColumn('users', 'max_leverage', 'INTEGER');
    $addColumn('users', 'force_mode', 'VARCHAR(10)');
    $addColumn('users', 'country_code', 'VARCHAR(2)');
    $addColumn('users', 'country_name', 'VARCHAR(128)');
    $addColumn('users', 'phone_dial_code', 'VARCHAR(8)');
    $addColumn('users', 'phone_number', 'VARCHAR(32)');
    $addColumn('users', 'phone_e164', 'VARCHAR(32)');
    $addColumn('users', 'birth_date', $driver === 'mysql' ? 'DATE' : 'TEXT');
    $addColumn('tg_sessions', 'updated_at', 'INTEGER');

    // Ensure UNIQUE index on users.tg_id for SQLite
    try {
      if ($driver === "sqlite") {
        $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_tg_id ON users(tg_id)");
      }
    } catch (Throwable $e) {}

    $addColumn('wallets', 'currency', 'VARCHAR(16)', "'USDT'");
    $addColumn('wallets', 'balance_cache', 'REAL', '0');
    $addColumn('wallets', 'available_cache', 'REAL', '0');
    $addColumn('wallets', 'updated_at', 'INTEGER');

    $addColumn('invest_plans', 'payout_schedule', 'VARCHAR(32)', "'end'");
    $addColumn('invest_plans', 'created_at', 'INTEGER');
    $addColumn('invest_plans', 'updated_at', 'INTEGER');

    // Investments: older DBs may miss columns
    $addColumn('investments', 'payout_schedule', 'VARCHAR(16)', "'end'");
    $addColumn('investments', 'debit_ledger_id', 'INTEGER');
    $addColumn('investments', 'payout_ledger_id', 'INTEGER');
    $addColumn('investments', 'paid_total', 'REAL', '0');
    $addColumn('investments', 'last_accrual_at', 'INTEGER');


    // Trading signals / bot settings
    $addColumn('trading_signals', 'bot_enabled', 'INTEGER', '0');
    $addColumn('trading_signals', 'bot_name_en', 'LONGTEXT');
    $addColumn('trading_signals', 'bot_name_ar', 'LONGTEXT');
    $addColumn('trading_signals', 'bot_name_ru', 'LONGTEXT');
    $addColumn('trading_signals', 'bot_brief_en', 'LONGTEXT');
    $addColumn('trading_signals', 'bot_brief_ar', 'LONGTEXT');
    $addColumn('trading_signals', 'bot_brief_ru', 'LONGTEXT');
    $addColumn('trading_signals', 'copy_min_amount', 'REAL', '100');
    $addColumn('trading_signals', 'copy_lock_days', 'INTEGER', '7');
    $addColumn('trading_signals', 'copy_profit_share_pct', 'REAL', '0');
    $addColumn('trading_signals', 'copy_leverage', 'INTEGER', '1');
    $addColumn('trading_signals', 'show_on_home', 'INTEGER', '1');

    // Unique constraint on trading_signals to prevent duplicate rows on re-seed
    try {
      if ($driver === 'mysql') {
        // Check if unique key already exists
        $st = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trading_signals' AND INDEX_NAME = 'uq_ts_symbol_type_tf'");
        $st->execute();
        if ((int)$st->fetchColumn() === 0) {
          $pdo->exec("ALTER TABLE trading_signals ADD UNIQUE KEY uq_ts_symbol_type_tf (market_symbol, market_type, COALESCE(timeframe, ''))");
        }
      } else {
        $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_ts_symbol_type_tf ON trading_signals(market_symbol, market_type, COALESCE(timeframe, ''))");
      }
    } catch (Throwable $e) {}

    // Add indexes for performance
    try {
      if ($driver === 'mysql') {
        $st = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'market_quotes' AND INDEX_NAME = 'idx_quotes_symbol_type'");
        $st->execute();
        if ((int)$st->fetchColumn() === 0) {
          $pdo->exec("ALTER TABLE market_quotes ADD INDEX idx_quotes_symbol_type (symbol, type)");
        }
        $st = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'positions' AND INDEX_NAME = 'idx_positions_user_status'");
        $st->execute();
        if ((int)$st->fetchColumn() === 0) {
          $pdo->exec("ALTER TABLE positions ADD INDEX idx_positions_user_status (user_id, status)");
        }
      } else {
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_quotes_symbol_type ON market_quotes(symbol, type)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)");
      }
    } catch (Throwable $e) {}

    try {
      $pdo->exec($driver === 'mysql'
        ? "CREATE TABLE IF NOT EXISTS trading_bot_subscriptions (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            signal_id BIGINT UNSIGNED NOT NULL,
            mode VARCHAR(16) NOT NULL DEFAULT 'real',
            currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
            reserved_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
            hold_id BIGINT UNSIGNED NULL,
            lock_until INT NULL,
            profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
            leverage INT NOT NULL DEFAULT 1,
            status VARCHAR(16) NOT NULL DEFAULT 'active',
            copied_position_id BIGINT UNSIGNED NULL,
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            KEY idx_tbs_user_status (user_id, status),
            KEY idx_tbs_signal_status (signal_id, status)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        : "CREATE TABLE IF NOT EXISTS trading_bot_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            signal_id INTEGER NOT NULL,
            mode TEXT NOT NULL DEFAULT 'real',
            currency TEXT NOT NULL DEFAULT 'USDT',
            reserved_amount REAL NOT NULL DEFAULT 0,
            hold_id INTEGER,
            lock_until INTEGER,
            profit_share_pct REAL NOT NULL DEFAULT 0,
            leverage INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'active',
            copied_position_id INTEGER,
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0
          )");
      if ($driver !== 'mysql') {
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbs_user_status ON trading_bot_subscriptions(user_id, status)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbs_signal_status ON trading_bot_subscriptions(signal_id, status)");
      }
    } catch (Throwable $e) {}

    try {
      $pdo->exec($driver === 'mysql'
        ? "CREATE TABLE IF NOT EXISTS trading_bot_commissions (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            subscription_id BIGINT UNSIGNED NULL,
            signal_id BIGINT UNSIGNED NULL,
            position_id BIGINT UNSIGNED NULL,
            pnl_gross DECIMAL(20,8) NOT NULL DEFAULT 0,
            share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
            amount DECIMAL(20,8) NOT NULL DEFAULT 0,
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            created_at INT NOT NULL DEFAULT 0,
            KEY idx_tbc_user (user_id),
            KEY idx_tbc_subscription (subscription_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        : "CREATE TABLE IF NOT EXISTS trading_bot_commissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subscription_id INTEGER,
            signal_id INTEGER,
            position_id INTEGER,
            pnl_gross REAL NOT NULL DEFAULT 0,
            share_pct REAL NOT NULL DEFAULT 0,
            amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL DEFAULT 0
          )");
      if ($driver !== 'mysql') {
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbc_user ON trading_bot_commissions(user_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tbc_subscription ON trading_bot_commissions(subscription_id)");
      }
    } catch (Throwable $e) {}

    // Orders: history/audit fields
    $addColumn('orders', 'fee_paid', 'REAL', '0');
    $addColumn('orders', 'position_id', 'INTEGER');
    $addColumn('orders', 'pnl_usd', 'REAL');
    $addColumn('orders', 'close_reason', 'VARCHAR(16)');
    $addColumn('orders', 'closed_at', 'INTEGER');
    $addColumn('orders', 'meta', 'LONGTEXT');
    $addColumn('orders', 'updated_at', 'INTEGER', '0');

    // Positions
    $addColumn('positions', 'updated_at', 'INTEGER');
    $addColumn('positions', 'unrealized_pnl_usd', 'REAL', '0');
    $addColumn('positions', 'source_signal_id', 'INTEGER');
    $addColumn('positions', 'copy_subscription_id', 'INTEGER');
    $addColumn('positions', 'copy_profit_share_pct', 'REAL', '0');
    $addColumn('positions', 'copied_from_admin', 'INTEGER', '0');

    // Deposits / Withdrawals: older installs may miss admin_note & timestamps
    $addColumn('deposits', 'admin_note', 'LONGTEXT');
    $addColumn('withdrawals', 'admin_note', 'LONGTEXT');
    $addColumn('withdrawals', 'completed_at', 'INTEGER');
    $addColumn('withdrawals', 'updated_at', 'INTEGER', '0');

    // KYC: signed contract and profile fields collected from registration.
    $addColumn('kyc_requests', 'phone_e164', 'VARCHAR(32)');
    $addColumn('kyc_requests', 'birth_date', $driver === 'mysql' ? 'DATE' : 'TEXT');
    $addColumn('kyc_requests', 'contract_path', 'VARCHAR(255)');
    $addColumn('kyc_requests', 'extra_paths_json', 'LONGTEXT');

    // best-effort backfill
    try {
      if ($columnExists('users', 'created_at')) {
        $now = time();
        $pdo->exec("UPDATE users SET created_at = COALESCE(created_at, $now) WHERE created_at IS NULL");
        $pdo->exec("UPDATE users SET updated_at = COALESCE(updated_at, created_at, $now) WHERE updated_at IS NULL");
      }
    } catch (Throwable $e) {}

    
    // deposits.external_ref: Telegram file_id can exceed 64 chars (MySQL 1406).
    // Upgrade older installs safely.
    try {
      if ($driver === 'mysql' && schema_table_exists($pdo, 'deposits', $driver)) {
        $st = $pdo->prepare("SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='deposits' AND COLUMN_NAME='external_ref'");
        $st->execute();
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: [];
        $dt = strtolower((string)($row['DATA_TYPE'] ?? ''));
        $len = (int)($row['CHARACTER_MAXIMUM_LENGTH'] ?? 0);
        if ($dt === 'varchar' && $len > 0 && $len < 255) {
          $pdo->exec("ALTER TABLE deposits MODIFY COLUMN external_ref TEXT NULL");
        }
      }
    } catch (Throwable $e) {}


    // ---- Affiliates / Managers (scoped admins) ----
    $addColumn('users', 'manager_id', 'INTEGER');
    $addColumn('users', 'pending_aff_code', 'VARCHAR(64)');
    $addColumn('users', 'pending_aff_set_at', 'INTEGER');
    $addColumn('users', 'last_device_id', 'VARCHAR(64)');
    $addColumn('users', 'is_frozen', 'INTEGER', '0');
    $addColumn('users', 'frozen_reason', 'TEXT');
    $addColumn('users', 'frozen_at', 'INTEGER');
    $addColumn('users', 'frozen_by', 'INTEGER');
    $addColumn('users', 'deposit_disabled', 'INTEGER', '0');
    $addColumn('users', 'withdraw_disabled', 'INTEGER', '0');
    $addColumn('users', 'trade_disabled', 'INTEGER', '0');

    try {
      // Managers
      if (!schema_table_exists($pdo, 'managers', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS managers (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            tg_id VARCHAR(32) NOT NULL,
            username VARCHAR(64) NULL,
            first_name VARCHAR(128) NULL,
            last_name VARCHAR(128) NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            approved_at INT NULL,
            UNIQUE KEY uniq_mgr_tg (tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS managers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tg_id TEXT NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0,
            approved_at INTEGER
          );"
        );
      }
      if ($driver !== 'mysql') {
        try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_mgr_tg ON managers(tg_id)"); } catch (Throwable $e) {}
      }

      // Managers: preferred language
      $addColumn('managers', 'lang', 'VARCHAR(8)', "'en'");


      // Invites
      if (!schema_table_exists($pdo, 'manager_invites', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS manager_invites (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            manager_id BIGINT UNSIGNED NOT NULL,
            code VARCHAR(32) NOT NULL,
            created_at INT NOT NULL DEFAULT 0,
            revoked_at INT NULL,
            UNIQUE KEY uniq_inv_code (code),
            KEY idx_inv_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS manager_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            manager_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT 0,
            revoked_at INTEGER
          );"
        );
      }
      if ($driver !== 'mysql') {
        try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_inv_code ON manager_invites(code)"); } catch (Throwable $e) {}
        try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_inv_mgr ON manager_invites(manager_id)"); } catch (Throwable $e) {}
      }

      // User referrals (first-touch audit)
      if (!schema_table_exists($pdo, 'user_referrals', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS user_referrals (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            manager_id BIGINT UNSIGNED NOT NULL,
            invite_id BIGINT UNSIGNED NULL,
            bound_at INT NOT NULL DEFAULT 0,
            source VARCHAR(32) NULL,
            UNIQUE KEY uniq_ref_user (user_id),
            KEY idx_ref_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS user_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            manager_id INTEGER NOT NULL,
            invite_id INTEGER,
            bound_at INTEGER NOT NULL DEFAULT 0,
            source TEXT
          );"
        );
      }
      if ($driver !== 'mysql') {
        try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_ref_user ON user_referrals(user_id)"); } catch (Throwable $e) {}
        try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_ref_mgr ON user_referrals(manager_id)"); } catch (Throwable $e) {}
      }

      // Device referrals (anti-fraud): only one attributed account per device_id
      if (!schema_table_exists($pdo, 'device_referrals', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS device_referrals (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            device_id VARCHAR(64) NOT NULL,
            manager_id BIGINT UNSIGNED NOT NULL,
            first_user_id BIGINT UNSIGNED NOT NULL,
            bound_at INT NOT NULL DEFAULT 0,
            UNIQUE KEY uniq_device (device_id),
            KEY idx_device_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS device_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            manager_id INTEGER NOT NULL,
            first_user_id INTEGER NOT NULL,
            bound_at INTEGER NOT NULL DEFAULT 0
          );"
        );
      }
      if ($driver !== 'mysql') {
        try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_device ON device_referrals(device_id)"); } catch (Throwable $e) {}
        try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_device_mgr ON device_referrals(manager_id)"); } catch (Throwable $e) {}
      }

      // Separate bot state storage for affiliate bot
      if (!schema_table_exists($pdo, 'bot_states_aff', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS bot_states_aff (
            chat_id VARCHAR(32) PRIMARY KEY,
            tg_user_id VARCHAR(32) NULL,
            state VARCHAR(32) NOT NULL,
            data JSON NULL,
            updated_at INT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS bot_states_aff (
            chat_id TEXT PRIMARY KEY,
            tg_user_id TEXT,
            state TEXT NOT NULL,
            data TEXT,
            updated_at INTEGER NOT NULL
          );"
        );
      }

    } catch (Throwable $e) {
      // ignore (shared hosting / permissions)
    }

    // ---- Support tickets (main bot) ----
    try {
      if (!schema_table_exists($pdo, 'support_tickets', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS support_tickets (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            tg_id VARCHAR(32) NULL,
            chat_id VARCHAR(32) NULL,
            lang VARCHAR(8) NOT NULL DEFAULT 'en',
            reason_code VARCHAR(24) NOT NULL DEFAULT 'other',
            agent_username VARCHAR(64) NULL,
            agent_tg_id VARCHAR(32) NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'open',
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            KEY idx_user (user_id),
            KEY idx_status (status),
            KEY idx_agent (agent_tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tg_id TEXT,
            chat_id TEXT,
            lang TEXT NOT NULL DEFAULT 'en',
            reason_code TEXT NOT NULL DEFAULT 'other',
            agent_username TEXT,
            agent_tg_id TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0
          );"
        );
      }

      if (!schema_table_exists($pdo, 'support_messages', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS support_messages (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            ticket_id BIGINT UNSIGNED NOT NULL,
            sender VARCHAR(16) NOT NULL,
            sender_tg_id VARCHAR(32) NULL,
            msg_type VARCHAR(16) NOT NULL DEFAULT 'text',
            content MEDIUMTEXT NULL,
            created_at INT NOT NULL DEFAULT 0,
            KEY idx_ticket (ticket_id),
            KEY idx_sender (sender_tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS support_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            sender_tg_id TEXT,
            msg_type TEXT NOT NULL DEFAULT 'text',
            content TEXT,
            created_at INTEGER NOT NULL DEFAULT 0
          );"
        );
      }

      $addColumn('support_tickets', 'subject', 'VARCHAR(190)');
      $addColumn('support_tickets', 'priority', 'VARCHAR(16)', "'normal'");
      $addColumn('support_tickets', 'admin_note', 'LONGTEXT');
      $addColumn('support_tickets', 'last_message_at', 'INTEGER', '0');
      $addColumn('support_tickets', 'customer_last_viewed_at', 'INTEGER', '0');
      $addColumn('support_tickets', 'admin_last_viewed_at', 'INTEGER', '0');

      if (!schema_table_exists($pdo, 'announcements', $driver)) {
        $pdo->exec($driver === 'mysql' ?
          "CREATE TABLE IF NOT EXISTS announcements (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            slug VARCHAR(190) NULL,
            title_en VARCHAR(190) NOT NULL DEFAULT '',
            title_ar VARCHAR(190) NOT NULL DEFAULT '',
            title_ru VARCHAR(190) NOT NULL DEFAULT '',
            body_en MEDIUMTEXT NULL,
            body_ar MEDIUMTEXT NULL,
            body_ru MEDIUMTEXT NULL,
            image_url TEXT NULL,
            cta_url TEXT NULL,
            source_label VARCHAR(80) NOT NULL DEFAULT '',
            status VARCHAR(16) NOT NULL DEFAULT 'draft',
            pinned TINYINT(1) NOT NULL DEFAULT 0,
            published_at INT NOT NULL DEFAULT 0,
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            KEY idx_status_pub (status, published_at),
            KEY idx_pinned (pinned)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
          "CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT,
            title_en TEXT NOT NULL DEFAULT '',
            title_ar TEXT NOT NULL DEFAULT '',
            title_ru TEXT NOT NULL DEFAULT '',
            body_en TEXT,
            body_ar TEXT,
            body_ru TEXT,
            image_url TEXT,
            cta_url TEXT,
            source_label TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'draft',
            pinned INTEGER NOT NULL DEFAULT 0,
            published_at INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0
          );"
        );
      }
      $addColumn('announcements', 'image_url', 'TEXT');
      $addColumn('announcements', 'cta_url', 'TEXT');
      $addColumn('announcements', 'source_label', 'VARCHAR(80)', "''");
      try {
        $newsCount = (int)$pdo->query("SELECT COUNT(*) FROM announcements")->fetchColumn();
        if ($newsCount === 0) {
          $now = time();
          $seedNews = [
            [
              'market-volatility-room',
              'Market pulse room is now live',
              'غرفة نبض السوق أصبحت متاحة الآن',
              'Комната рыночного пульса уже доступна',
              'Track the new market pulse room from the dashboard. It highlights the most active symbols, fresh platform alerts, and faster follow-up into trade.',
              'تابع غرفة نبض السوق الجديدة من الداشبورد. تعرض أكثر الرموز نشاطًا والتنبيهات الجديدة مع انتقال أسرع إلى صفحة التداول.',
              'Следите за новой комнатой рыночного пульса прямо из панели. Она показывает самые активные инструменты, свежие уведомления платформы и быстрый переход к сделке.',
              '/assets/img/news/news-market-pulse.svg',
              '#/trade',
              'Trading Desk',
              'published',
              1,
              $now - 1800
            ],
            [
              'gold-coverage-upgrade',
              'Gold pricing path has been stabilized',
              'تم تثبيت مسار تسعير الذهب',
              'Путь ценообразования золота стабилизирован',
              'Spot metals now use the cleaner unified feed path, reducing the old price flicker between quote and chart views.',
              'المعادن الفورية أصبحت تستخدم مسار تغذية موحدًا أنظف، مما يقلل رجوع السعر القديم بين الكوت والشارت.',
              'Спотовые металлы теперь используют более чистый единый путь данных, что уменьшает старые скачки цены между котировкой и графиком.',
              '/assets/img/news/news-gold-feed.svg',
              '#/trade',
              'Market Infrastructure',
              'published',
              0,
              $now - 3600
            ],
            [
              'copy-signals-history',
              'Copy signal history is visible in Invest',
              'سجل صفقات النسخ أصبح ظاهرًا في صفحة الاستثمار',
              'История копирования сигналов теперь видна в разделе Invest',
              'Invest now shows copy history with open, pending, and closed states so clients can review what is armed and what has already closed.',
              'أصبحت صفحة الاستثمار تعرض سجل النسخ بحالات المفتوح والمعلق والمغلق حتى يراجع العميل ما تم تفعيله وما أُغلق بالفعل.',
              'Раздел Invest теперь показывает историю копирования со статусами open, pending и closed, чтобы клиент видел вооружённые и уже закрытые сигналы.',
              '/assets/img/news/news-copy-history.svg',
              '#/invest',
              'Invest Workspace',
              'published',
              0,
              $now - 7200
            ],
            [
              'news-center-enabled',
              'The in-app news center is enabled',
              'تم تفعيل مركز الأخبار داخل المنصة',
              'Встроенный центр новостей активирован',
              'Open the new news page from the main menu to read announcements with images, pinned updates, and client-facing operations notes.',
              'افتح صفحة الأخبار الجديدة من القائمة الرئيسية لقراءة الإعلانات مع الصور والتحديثات المثبتة وملاحظات التشغيل الموجهة للعملاء.',
              'Откройте новую страницу новостей из главного меню, чтобы читать объявления с изображениями, закреплённые обновления и операционные заметки для клиентов.',
              '/assets/img/news/news-center.svg',
              '#/news',
              'Platform Updates',
              'published',
              0,
              $now - 10800
            ],
          ];
          $ins = $pdo->prepare('INSERT INTO announcements(slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
          foreach ($seedNews as $item) {
            $row = array_values($item);
            $row[] = $now;
            $row[] = $now;
            $ins->execute($row);
          }
        }
      } catch (Throwable $e) {}
    } catch (Throwable $e) {
      // ignore
    }

// Ensure positions unique/indexes
    try { schema_upgrade_positions_unique($pdo, $driver); } catch (Throwable $e) {}

    return null;
  });
}

// Backward compatibility: some older bot scripts call schema_migrate().
function schema_migrate(PDO $pdo, string $driver = 'sqlite') {
  return schema_upgrade($pdo, $driver);
}

/**
 * Upgrade positions indexes.
 * Goal: allow multiple open positions (no UNIQUE constraint) and keep lookup fast.
 * - MySQL: drop legacy uniq_pos (if present) and ensure lookup indexes exist.
 * - SQLite: rebuild the table if any UNIQUE index exists, then add indexes.
 */
function schema_upgrade_market_quotes_authority(PDO $pdo, string $driver = 'sqlite'): void {
  $driver = strtolower($driver);
  if (!schema_table_exists($pdo, 'market_quotes', $driver)) return;

  if ($driver === 'mysql') {
    try { $pdo->exec("UPDATE market_quotes SET market='spot' WHERE market IS NULL OR TRIM(market)=''"); } catch (Throwable $e) {}
    try { $pdo->exec("UPDATE market_quotes SET market='perp' WHERE LOWER(market)='perpetual'"); } catch (Throwable $e) {}
    try { $pdo->exec("UPDATE market_quotes SET provider=COALESCE(NULLIF(provider,''), NULLIF(source,''))"); } catch (Throwable $e) {}
    try { $pdo->exec("UPDATE market_quotes SET provider_ts=COALESCE(provider_ts, as_of, updated_at), received_at=COALESCE(received_at, ingested_at, UNIX_TIMESTAMP())"); } catch (Throwable $e) {}
    try {
      $pdo->exec("
        UPDATE market_quotes
        SET source_strength = CASE LOWER(COALESCE(NULLIF(source,''), NULLIF(provider,''), ''))
          WHEN 'binance' THEN 100
          WHEN 'trade_stream' THEN 96
          WHEN 'stream' THEN 96
          WHEN 'provider_live' THEN 92
          WHEN 'eodhd' THEN 91
          WHEN 'eodhd_rest' THEN 91
          WHEN 'finnhub' THEN 89
          WHEN 'tiingo' THEN 87
          WHEN 'yahoo' THEN 72
          WHEN 'yahoo_chart_live' THEN 72
          WHEN 'massive' THEN 20
          WHEN 'polygon' THEN 20
          WHEN 'provider_fallback' THEN 20
          WHEN 'fx_fallback' THEN 20
          WHEN 'frankfurter' THEN 20
          WHEN 'stooq' THEN 20
          WHEN 'eodhd_intraday' THEN 12
          WHEN 'cache' THEN 12
          WHEN 'stale_cache' THEN 12
          WHEN 'seed' THEN 4
          WHEN 'seed_price' THEN 4
          WHEN 'seed_fallback' THEN 4
          ELSE source_strength
        END
      ");
    } catch (Throwable $e) {}
    try { $pdo->exec("DELETE q1 FROM market_quotes q1 JOIN market_quotes q2 ON q1.symbol=q2.symbol AND q1.type=q2.type AND q1.market=q2.market AND (COALESCE(q1.provider_ts,q1.as_of,q1.updated_at,0) < COALESCE(q2.provider_ts,q2.as_of,q2.updated_at,0) OR (COALESCE(q1.provider_ts,q1.as_of,q1.updated_at,0) = COALESCE(q2.provider_ts,q2.as_of,q2.updated_at,0) AND COALESCE(q1.source_strength,0) < COALESCE(q2.source_strength,0)) OR (COALESCE(q1.provider_ts,q1.as_of,q1.updated_at,0) = COALESCE(q2.provider_ts,q2.as_of,q2.updated_at,0) AND COALESCE(q1.source_strength,0) = COALESCE(q2.source_strength,0) AND q1.id < q2.id))"); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes DROP INDEX uniq_symbol'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes DROP INDEX uniq_symbol_type'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes DROP INDEX uq_market_quotes_symbol_type'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes ADD UNIQUE KEY uniq_symbol_type_market (symbol, type, market)'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes ADD INDEX idx_type_market_updated (type, market, updated_at)'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE market_quotes ADD INDEX idx_symbol_type_market_updated (symbol, type, market, updated_at)'); } catch (Throwable $e) {}
    return;
  }

  // SQLite: best effort. New installs use the correct schema; existing installs keep working
  // because reads are already type-aware and writes are arbitrated in PHP before upsert.
  try { $pdo->exec('CREATE INDEX IF NOT EXISTS idx_market_quotes_type_updated ON market_quotes(type, updated_at)'); } catch (Throwable $e) {}
  try { $pdo->exec('CREATE INDEX IF NOT EXISTS idx_market_quotes_symbol_type_updated ON market_quotes(symbol, type, updated_at)'); } catch (Throwable $e) {}
}

function schema_upgrade_positions_unique(PDO $pdo, string $driver = 'sqlite'): void {
  $driver = strtolower($driver);
  if (!schema_table_exists($pdo, 'positions', $driver)) return;

  if ($driver === 'mysql') {
    try { $pdo->exec('ALTER TABLE positions DROP INDEX uniq_pos'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE positions ADD INDEX idx_pos_user_status (user_id, status)'); } catch (Throwable $e) {}
    try { $pdo->exec('ALTER TABLE positions ADD INDEX idx_pos_user_symbol (user_id, symbol, market_type, status)'); } catch (Throwable $e) {}
    return;
  }

  // SQLite
  $hasUnique = false;
  try {
    $st = $pdo->query("PRAGMA index_list('positions')");
    $rows = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
    foreach ($rows as $r) {
      $unique = (int)($r['unique'] ?? 0);
      if ($unique === 1) { $hasUnique = true; break; }
    }
  } catch (Throwable $e) {}

  if ($hasUnique) {
    $pdo->exec('PRAGMA foreign_keys = OFF;');
    $pdo->beginTransaction();
    try {
      $pdo->exec('CREATE TABLE IF NOT EXISTS positions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        market_type TEXT NOT NULL DEFAULT \'spot\',
        side TEXT NOT NULL,
        qty REAL NOT NULL,
        entry_price REAL NOT NULL,
        leverage INTEGER NOT NULL DEFAULT 1,
        margin_mode TEXT NOT NULL DEFAULT \'isolated\',
        margin_initial REAL NOT NULL DEFAULT 0,
        liquidation_price REAL,
        tp_price REAL,
        sl_price REAL,
        fees_paid REAL NOT NULL DEFAULT 0,
        funding_accrued REAL NOT NULL DEFAULT 0,
        last_funding_at INTEGER,
        opened_at INTEGER NOT NULL,
        updated_at INTEGER,
        closed_at INTEGER,
        status TEXT NOT NULL DEFAULT \'open\'
      );');

      $colsOld = [];
      $st = $pdo->query('PRAGMA table_info(positions)');
      foreach (($st ? $st->fetchAll(PDO::FETCH_ASSOC) : []) as $r) {
        $colsOld[] = strtolower((string)($r['name'] ?? ''));
      }
      $colsNew = [];
      $st = $pdo->query('PRAGMA table_info(positions_new)');
      foreach (($st ? $st->fetchAll(PDO::FETCH_ASSOC) : []) as $r) {
        $colsNew[] = strtolower((string)($r['name'] ?? ''));
      }
      $common = array_values(array_intersect($colsNew, $colsOld));

      if ($common) {
        $colList = implode(',', array_map(fn($c)=>'"'.$c.'"', $common));
        $pdo->exec("INSERT INTO positions_new ($colList) SELECT $colList FROM positions");
      }

      $pdo->exec('DROP TABLE positions');
      $pdo->exec('ALTER TABLE positions_new RENAME TO positions');
      $pdo->commit();
    } catch (Throwable $e) {
      $pdo->rollBack();
      try { $pdo->exec('DROP TABLE IF EXISTS positions_new'); } catch (Throwable $ee) {}
      throw $e;
    } finally {
      try { $pdo->exec('PRAGMA foreign_keys = ON;'); } catch (Throwable $e) {}
    }
  }

  try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pos_user_status ON positions(user_id, status)"); } catch (Throwable $e) {}
  try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pos_user_symbol ON positions(user_id, symbol, market_type, status)"); } catch (Throwable $e) {}
}

if (!function_exists('schema_seed')) {
  function schema_seed(PDO $pdo, string $driver): void {
    if (function_exists('schema_seed_defaults')) {
      schema_seed_defaults($pdo, $driver);
    }
  }
}
