<?php
declare(strict_types=1);
require_once __DIR__ . '/../../api/lib/common.php';
require_once __DIR__ . '/../../api/lib/schema.php';
require_once __DIR__ . '/../../api/lib/crypto.php';
require_once __DIR__ . '/../../api/lib/affiliates.php';

function admin_request_is_secure(): bool {
  $https = strtolower((string)($_SERVER['HTTPS'] ?? ''));
  $proto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
  return $https === 'on' || $https === '1' || $proto === 'https';
}

function admin_session_lifetime(): int {
  $ttl = (int)(env('ADMIN_SESSION_TTL', '86400') ?? 86400);
  return max(3600, min(604800, $ttl));
}

function admin_cookie_options(int $expires = 0, bool $httpOnly = true): array {
  return [
    'expires' => $expires,
    'path' => '/admin',
    'secure' => admin_request_is_secure(),
    'httponly' => $httpOnly,
    'samesite' => 'Lax',
  ];
}

function admin_session_cookie_options(): array {
  return [
    'lifetime' => admin_session_lifetime(),
    'path' => '/admin',
    'secure' => admin_request_is_secure(),
    'httponly' => true,
    'samesite' => 'Lax',
  ];
}

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_name('MEXADMINSESSID');
  session_set_cookie_params(admin_session_cookie_options());
  session_start();
}

// Auto-upgrade schema (safe for shared hosting)
$pdo = null;
try {
  $pdo = db();
  schema_install($pdo, db_driver());
  schema_seed_defaults($pdo, db_driver());
} catch (Throwable $e) {
  // ignore
}


// Admin extras: lightweight audit trail + CSRF helpers
try {
  $pdo = $pdo instanceof PDO ? $pdo : db();
  $driver = db_driver();
  if ($driver === 'mysql') {
    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      admin_email VARCHAR(190) NOT NULL DEFAULT '',
      action VARCHAR(64) NOT NULL,
      entity VARCHAR(64) NOT NULL,
      entity_id BIGINT NOT NULL DEFAULT 0,
      summary TEXT NULL,
      payload_json LONGTEXT NULL,
      ip VARCHAR(64) NOT NULL DEFAULT '',
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_created (created_at),
      KEY idx_entity (entity, entity_id),
      KEY idx_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    try { $pdo->exec("ALTER TABLE deposits ADD COLUMN admin_note TEXT NULL"); } catch (Throwable $e) {}
  } else {
    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      payload_json TEXT,
      ip TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0
    )");
    try { $pdo->exec("ALTER TABLE deposits ADD COLUMN admin_note TEXT"); } catch (Throwable $e) {}
  }
} catch (Throwable $e) {
  // ignore admin extras bootstrap failures
}

function admin_csrf_token(): string {
  $cookieName = admin_csrf_cookie_name();
  $token = (string)($_COOKIE[$cookieName] ?? '');
  if (!preg_match('/^[a-f0-9]{48}$/', $token)) {
    $token = bin2hex(random_bytes(24));
  }
  $_SESSION['admin_csrf'] = $token;
  setcookie($cookieName, $token, admin_cookie_options(time() + admin_session_lifetime(), true));
  return $token;
}

function admin_csrf_input(): string {
  return '<input type="hidden" name="csrf" value="' . htmlspecialchars(admin_csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}

function admin_verify_csrf(): void {
  $posted = (string)($_POST['csrf'] ?? '');
  $token = (string)($_COOKIE[admin_csrf_cookie_name()] ?? ($_SESSION['admin_csrf'] ?? ''));
  if ($posted === '' || $token === '' || !hash_equals($token, $posted)) {
    throw new RuntimeException('Security token mismatch. Refresh the page and try again.');
  }
}

function admin_actor_email(): string {
  return (string)($_SESSION['admin_email'] ?? env('ADMIN_EMAIL', 'admin@example.com') ?? 'admin@example.com');
}

function admin_client_ip(): string {
  foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
    $v = trim((string)($_SERVER[$k] ?? ''));
    if ($v !== '') return explode(',', $v)[0];
  }
  return '';
}

function admin_audit_schema_profile(?PDO $pdo = null): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  $pdo = $pdo ?: db();
  $driver = db_driver();
  $cols = [
    'admin_email'=>false,'admin_actor'=>false,
    'action'=>false,'action_key'=>false,
    'entity'=>false,'entity_type'=>false,
    'entity_id'=>false,'summary'=>false,'payload_json'=>false,'meta_json'=>false,
    'ip'=>false,'ip_address'=>false,'created_at'=>false
  ];
  foreach (array_keys($cols) as $col) {
    try { $cols[$col] = schema_column_exists($pdo, 'admin_audit_logs', $col, $driver); } catch (Throwable $e) { $cols[$col] = false; }
  }
  return $cache = $cols;
}

function admin_audit_select_expr(string $alias = 'l'): array {
  $p = admin_audit_schema_profile();
  $a = trim($alias) !== '' ? trim($alias) . '.' : '';
  $pick = function(array $candidates, string $fallback = "''") use ($p, $a): string {
    foreach ($candidates as $col) if (!empty($p[$col])) return $a . $col;
    return $fallback;
  };
  return [
    'actor' => $pick(['admin_email','admin_actor']),
    'action' => $pick(['action','action_key']),
    'entity' => $pick(['entity','entity_type']),
    'summary' => $pick(['summary']),
    'payload' => $pick(['payload_json','meta_json']),
    'ip' => $pick(['ip','ip_address']),
    'created_at' => $pick(['created_at'], '0'),
    'entity_id' => $pick(['entity_id'], '0'),
  ];
}

function admin_audit_log(string $action, string $entity, int $entityId = 0, string $summary = '', array $payload = []): void {
  try {
    $pdo = db();
    $profile = admin_audit_schema_profile($pdo);
    $json = $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
    $cols = [];
    $vals = [];
    $push = function(string $col, $val) use (&$cols, &$vals, $profile): void {
      if (!empty($profile[$col])) { $cols[] = $col; $vals[] = $val; }
    };
    $push('admin_email', admin_actor_email());
    $push('admin_actor', admin_actor_email());
    $push('action', trim($action));
    $push('action_key', trim($action));
    $push('entity', trim($entity));
    $push('entity_type', trim($entity));
    $push('entity_id', $entityId);
    $push('summary', $summary);
    $push('payload_json', $json);
    $push('meta_json', $json);
    $push('ip', admin_client_ip());
    $push('ip_address', admin_client_ip());
    $push('created_at', time());
    if (!$cols) return;
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $sql = 'INSERT INTO admin_audit_logs(' . implode(',', $cols) . ') VALUES (' . $ph . ')';
    $pdo->prepare($sql)->execute($vals);
  } catch (Throwable $e) {
    // best effort only
  }
}

function admin_stat_card(string $label, string $value, string $sub = ''): string {
  return "<div class='stat-card'><div class='stat-label'>" . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . "</div><div class='stat-value'>" . htmlspecialchars($value, ENT_QUOTES, 'UTF-8') . "</div>" . ($sub !== '' ? "<div class='stat-sub'>" . htmlspecialchars($sub, ENT_QUOTES, 'UTF-8') . "</div>" : '') . "</div>";
}

function admin_h(?string $v): string {
  return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

function admin_status_pill(string $status): string {
  $raw = trim($status);
  $st = strtolower($raw);
  $cls = 'pill';
  if (in_array($st, ['approved','completed','confirmed','done','active'], true)) $cls .= ' ok';
  elseif (in_array($st, ['rejected','cancelled','failed'], true)) $cls .= ' bad';
  elseif (in_array($st, ['pending','requested','review','under_review'], true)) $cls .= ' warn';
  return "<span class='{$cls}'>" . admin_h($raw !== '' ? $raw : 'pending') . "</span>";
}

function admin_parse_json_pairs($raw, int $limit = 8): string {
  $txt = trim((string)$raw);
  if ($txt === '') return '&mdash;';
  $decoded = json_decode($txt, true);
  if (!is_array($decoded)) { $clip = strlen($txt) > 220 ? substr($txt, 0, 217) . '...' : $txt; return admin_h($clip); }
  $pairs = [];
  foreach ($decoded as $k => $v) {
    if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pairs[] = '<div><strong>' . admin_h(str_replace('_', ' ', (string)$k)) . ':</strong> ' . admin_h((string)$v) . '</div>';
    if (count($pairs) >= $limit) break;
  }
  if (!$pairs) return '&mdash;';
  return implode('', $pairs);
}

function admin_format_ts($ts): string {
  $n = (int)$ts;
  if ($n <= 0) return '&mdash;';
  return date('Y-m-d H:i', $n);
}

function admin_store_uploaded_image(string $field, string $subdir = 'misc', string $prefix = 'img_'): array {
  if (empty($_FILES[$field]) || !is_array($_FILES[$field])) {
    return ['ok' => false, 'path' => '', 'error' => ''];
  }
  $f = $_FILES[$field];
  if (($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE || empty($f['tmp_name'])) {
    return ['ok' => false, 'path' => '', 'error' => ''];
  }
  if (($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file((string)$f['tmp_name'])) {
    return ['ok' => false, 'path' => '', 'error' => 'Upload failed'];
  }
  $maxBytes = 3 * 1024 * 1024;
  $size = (int)($f['size'] ?? 0);
  if ($size <= 0 || $size > $maxBytes) {
    return ['ok' => false, 'path' => '', 'error' => 'Image must be smaller than 3MB'];
  }
  $info = @getimagesize((string)$f['tmp_name']);
  $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
  if ($mime === '' && function_exists('finfo_open')) {
    try {
      $fi = finfo_open(FILEINFO_MIME_TYPE);
      if ($fi) {
        $detected = (string)finfo_file($fi, (string)$f['tmp_name']);
        if ($detected !== '') $mime = $detected;
        finfo_close($fi);
      }
    } catch (Throwable $e) {}
  }
  $origExt = strtolower(pathinfo((string)($f['name'] ?? ''), PATHINFO_EXTENSION));
  $ext = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'image/svg+xml', 'text/plain', 'text/xml', 'application/xml' => ($origExt === 'svg' ? 'svg' : ''),
    default => '',
  };
  if ($ext === '' && in_array($origExt, ['jpg','jpeg','png','webp','gif','svg'], true)) {
    $ext = $origExt === 'jpeg' ? 'jpg' : $origExt;
  }
  if ($ext === '') {
    return ['ok' => false, 'path' => '', 'error' => 'Unsupported image format'];
  }
  $subdir = trim(preg_replace('~[^a-z0-9/_-]+~i', '', $subdir), '/');
  $prefix = preg_replace('~[^a-z0-9_-]+~i', '_', $prefix);
  $root = realpath(__DIR__ . '/../../assets/img');
  if (!$root) $root = __DIR__ . '/../../assets/img';
  if (!is_dir($root)) @mkdir($root, 0775, true);
  $destDir = rtrim($root, '/\\') . ($subdir !== '' ? ('/' . $subdir) : '');
  if (!is_dir($destDir)) @mkdir($destDir, 0775, true);
  if (!is_dir($destDir) || !is_writable($destDir)) {
    return ['ok' => false, 'path' => '', 'error' => 'Upload folder is not writable'];
  }
  $name = $prefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
  $dst = $destDir . '/' . $name;
  if (!@move_uploaded_file((string)$f['tmp_name'], $dst)) {
    return ['ok' => false, 'path' => '', 'error' => 'Failed to save uploaded image'];
  }
  @chmod($dst, 0644);
  $url = '/assets/img/' . ($subdir !== '' ? ($subdir . '/') : '') . $name;
  return ['ok' => true, 'path' => $url, 'error' => ''];
}

function admin_delete_uploaded_asset(?string $urlPath): void {
  $urlPath = trim((string)$urlPath);
  if ($urlPath === '' || !str_starts_with($urlPath, '/assets/img/')) return;
  $root = realpath(__DIR__ . '/../../assets/img');
  if (!$root) return;
  $candidate = realpath(__DIR__ . '/../..' . $urlPath);
  if (!$candidate || !str_starts_with($candidate, $root)) return;
  if (is_file($candidate)) @unlink($candidate);
}

function admin_name_for_row(array $row): string {
  $name = trim((string)($row['first_name'] ?? '') . ' ' . (string)($row['last_name'] ?? ''));
  $username = trim((string)($row['username'] ?? ''));
  if ($username !== '') $name = trim($name . ' @' . $username);
  return trim($name) !== '' ? trim($name) : ('User #' . (int)($row['user_id'] ?? $row['id'] ?? 0));
}

function admin_recent_audit(int $limit = 8): array {
  try {
    $st = db()->prepare('SELECT id,admin_email,action,entity,entity_id,summary,created_at FROM admin_audit_logs ORDER BY id DESC LIMIT ' . (int)$limit);
    $st->execute();
    return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    return [];
  }
}


function admin_auth_cookie_name(): string {
  return 'MEX_ADMIN_AUTH';
}

function admin_csrf_cookie_name(): string {
  return 'MEX_ADMIN_CSRF';
}

function admin_base64url(string $raw): string {
  return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function admin_base64url_decode(string $raw): string {
  $pad = strlen($raw) % 4;
  if ($pad) $raw .= str_repeat('=', 4 - $pad);
  $decoded = base64_decode(strtr($raw, '-_', '+/'), true);
  return $decoded === false ? '' : $decoded;
}

function admin_auth_secret(): string {
  $secret = (string)(env('ADMIN_SESSION_SECRET', '') ?: env('APP_KEY', '') ?: env('JWT_SECRET', '') ?: env('ADMIN_PASSWORD', '') ?: 'mex-admin-session');
  return hash('sha256', $secret);
}

function admin_auth_sign(string $payload): string {
  return hash_hmac('sha256', $payload, admin_auth_secret());
}

function admin_issue_auth_cookie(string $email): void {
  $now = time();
  $payload = admin_base64url(json_encode([
    'email' => $email,
    'iat' => $now,
    'exp' => $now + admin_session_lifetime(),
  ], JSON_UNESCAPED_SLASHES));
  $token = $payload . '.' . admin_auth_sign($payload);
  setcookie(admin_auth_cookie_name(), $token, admin_cookie_options($now + admin_session_lifetime(), true));
}

function admin_clear_auth_cookie(): void {
  setcookie(admin_auth_cookie_name(), '', admin_cookie_options(time() - 3600, true));
  setcookie(admin_csrf_cookie_name(), '', admin_cookie_options(time() - 3600, true));
}

function admin_restore_from_cookie(): bool {
  $token = (string)($_COOKIE[admin_auth_cookie_name()] ?? '');
  if ($token === '' || !str_contains($token, '.')) return false;
  [$payload, $sig] = explode('.', $token, 2);
  if ($payload === '' || $sig === '' || !hash_equals(admin_auth_sign($payload), $sig)) return false;
  $data = json_decode(admin_base64url_decode($payload), true);
  if (!is_array($data)) return false;
  $email = trim((string)($data['email'] ?? ''));
  $exp = (int)($data['exp'] ?? 0);
  $cfgEmail = trim((string)(env('ADMIN_EMAIL', '') ?? ''));
  if ($email === '' || $exp < time()) return false;
  if ($cfgEmail !== '' && !hash_equals($cfgEmail, $email)) return false;
  $_SESSION['admin_ok'] = true;
  $_SESSION['admin_email'] = $email;
  $_SESSION['admin_last_seen'] = time();
  admin_issue_auth_cookie($email);
  admin_csrf_token();
  return true;
}

function admin_login_success(string $email): void {
  if (session_status() === PHP_SESSION_ACTIVE) {
    @session_regenerate_id(true);
  }
  $_SESSION['admin_ok'] = true;
  $_SESSION['admin_email'] = $email;
  $_SESSION['admin_last_seen'] = time();
  unset($_SESSION['admin_csrf']);
  admin_issue_auth_cookie($email);
  admin_csrf_token();
}

function admin_logout_now(): void {
  $_SESSION = [];
  admin_clear_auth_cookie();
  if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
  }
}

function admin_is_logged_in(): bool {
  if (isset($_SESSION['admin_ok']) && $_SESSION['admin_ok'] === true) return true;
  return admin_restore_from_cookie();
}

function admin_require(): void {
  if (!admin_is_logged_in()) {
    $next = (string)($_SERVER['REQUEST_URI'] ?? '/admin/dashboard.php');
    if (!str_starts_with($next, '/admin/')) $next = '/admin/dashboard.php';
    header('Location: /admin/login.php?next=' . rawurlencode($next));
    exit;
  }
  $_SESSION['admin_last_seen'] = time();
  admin_issue_auth_cookie((string)($_SESSION['admin_email'] ?? admin_actor_email()));
  admin_csrf_token();
}

// Backwards-compatible alias used by some admin pages
function admin_require_login(): void {
  admin_require();
}

// Basic HTML shell helpers (some admin pages expect these)
function admin_header(string $title = 'Admin'): void {
  header('Content-Type: text/html; charset=utf-8');
  echo "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">";
  echo "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  echo "<title>" . htmlspecialchars($title, ENT_QUOTES) . "</title>";
  echo "<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:1100px;margin:20px auto;padding:0 14px}a{color:#0ea5e9}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}input,select,button{padding:8px;border-radius:10px;border:1px solid #e5e7eb}button{cursor:pointer}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.badge{display:inline-block;padding:2px 10px;border-radius:999px;background:#0ea5e91a;border:1px solid #0ea5e933}</style>";
  echo "</head><body><header><div><strong>MEX Group Admin</strong> <span class=\"badge\">PHP</span></div><nav>";
  echo "<a href=\"/admin/index.php\">Home</a> · <a href=\"/admin/users.php\">Users</a> · <a href=\"/admin/managers.php\">Managers</a> · <a href=\"/admin/trading_settings.php\">Trading Settings</a> · <a href=\"/admin/deposit_methods.php\">Deposit Methods</a> · <a href=\"/admin/balance_adjust.php\">Adjust Balance</a> · <a href=\"/admin/deposits.php\">Deposits</a> · <a href=\"/admin/withdrawals.php\">Withdrawals</a> · <a href=\"/admin/invest_plans.php\">Invest Plans</a>";
  echo "</nav></header>";
}

function admin_footer(): void {
  echo "</body></html>";
}

function admin_credentials_ok(string $email, string $pass): bool {
  $cfgEmail = trim((string)(env('ADMIN_EMAIL', '') ?? ''));
  $cfgPass = (string)(env('ADMIN_PASSWORD', '') ?? '');
  if ($cfgEmail === '' || $cfgPass === '') return false;
  if ($email !== $cfgEmail) return false;
  // If ADMIN_PASSWORD is plain, compare; if starts with $2y$ assume bcrypt hash
  if (str_starts_with($cfgPass, '$2y$') || str_starts_with($cfgPass, '$2b$')) {
    return password_verify($pass, $cfgPass);
  }
  return hash_equals($cfgPass, $pass);
}

function admin_layout(string $title, string $body): void {
  $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
  $currentPath = (string)($_SERVER['SCRIPT_NAME'] ?? $_SERVER['PHP_SELF'] ?? '');
  $navPrimary = [
    '/admin/dashboard.php' => 'Dashboard',
    '/admin/users.php' => 'Users',
    '/admin/managers.php' => 'Managers',
    '/admin/trades.php' => 'Trades',
    '/admin/deposits.php' => 'Deposits',
    '/admin/withdrawals.php' => 'Withdrawals',
    '/admin/payment_methods.php' => 'Funding',
    '/admin/kyc.php' => 'KYC',
    '/admin/markets.php' => 'Markets',
    '/admin/trading_settings.php' => 'Trading',
    '/admin/site_settings.php' => 'Site Settings',
  ];
  $navSecondary = [
    '/admin/ledger.php' => 'Ledger',
    '/admin/balance_adjust.php' => 'Balance Adjust',
    '/admin/invest_plans.php' => 'Invest Plans',
    '/admin/contracts.php' => 'Contracts',
    '/admin/customer_levels.php' => 'Customer Levels',
    '/admin/signals.php' => 'Signal Desk',
    '/admin/support_tickets.php' => 'Support Tickets',
    '/admin/news.php' => 'News',
    '/admin/news_settings.php' => 'News Controls',
    '/admin/notifications.php' => 'Notifications',
    '/admin/support_contacts.php' => 'Support Contacts',
    '/admin/bot_content.php' => 'Bot Content',
    '/admin/flags.php' => 'Feature Flags',
    '/admin/monitor.php' => 'Monitor',
    '/admin/errors.php' => 'Errors',
    '/admin/audit_logs.php' => 'Audit Logs',
  ];
  echo "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
  <title>{$t}</title>
  <style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto; background:#0b1220; color:#e5e7eb; margin:0}
  a{color:#93c5fd; text-decoration:none}
  .top{position:sticky; top:0; z-index:30; background:linear-gradient(180deg,rgba(8,14,28,.97),rgba(10,18,33,.94)); backdrop-filter:blur(18px); border-bottom:1px solid rgba(148,163,184,.12); box-shadow:0 16px 34px rgba(2,8,24,.22); padding:12px 16px; display:flex; flex-direction:column; gap:10px}
  .top-row{display:flex; gap:12px; align-items:center}
  .top-brand{display:flex; align-items:center; gap:10px; font-weight:900}
  .top-badge{display:inline-flex; align-items:center; justify-content:center; min-width:34px; height:34px; border-radius:12px; background:linear-gradient(180deg,#1d4ed8,#1e40af); color:#fff; font-size:12px; font-weight:900}
  .top-title{display:flex; flex-direction:column; gap:2px}
  .top-title small{color:#8ba1c3; font-weight:600}
  .top-nav{display:flex; flex-wrap:wrap; gap:8px}
  .top-nav-row{display:flex;flex-direction:column;gap:8px}
  .top-nav-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7f94b9;font-weight:800;padding-inline:2px}
  .top-nav a{display:inline-flex; align-items:center; min-height:38px; padding:0 13px; border-radius:13px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); color:#d8e4fb; transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease}
  .top-nav a:hover{background:rgba(255,255,255,.06); border-color:rgba(148,163,184,.28); transform:translateY(-1px)}
  .top-nav a.active{background:linear-gradient(180deg,rgba(54,89,201,.28),rgba(23,41,105,.36)); border-color:rgba(96,138,255,.52); box-shadow:0 12px 24px rgba(23,41,105,.18), inset 0 1px 0 rgba(255,255,255,.06); color:#fff}
  .top-nav.secondary a{color:#a8bbdc; background:rgba(255,255,255,.015)}
  .top-spacer{flex:1}
  .wrap{max-width:1280px; margin:0 auto; padding:18px}
  .grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; align-items:end}
  .grid textarea{width:100%}
  @media(max-width:1200px){.grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}
  @media(max-width:760px){.grid{grid-template-columns:1fr !important}}
  @media(max-width:860px){
    .top{padding:12px}
    .top-row{align-items:flex-start;flex-wrap:wrap}
    .top-nav{flex-wrap:nowrap;overflow:auto hidden;scrollbar-width:none;padding-bottom:2px}
    .top-nav::-webkit-scrollbar{display:none}
    .top-nav a{flex:0 0 auto;white-space:nowrap}
    .wrap{padding:14px}
  }
  .card{background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(10,17,31,.99)); border:1px solid rgba(148,163,184,.10); border-radius:18px; padding:16px; margin-bottom:14px; box-shadow:0 18px 36px rgba(2,8,24,.16)}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:14px}
  .stat-card{background:radial-gradient(circle at top right,rgba(96,138,255,.18),transparent 40%),linear-gradient(180deg,rgba(30,41,59,.92),rgba(15,23,42,.98));border:1px solid rgba(125,154,255,.14);border-radius:18px;padding:14px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
  .stat-label{font-size:12px;letter-spacing:.3px;color:#93a4be;text-transform:uppercase}
  .stat-value{font-size:28px;font-weight:800;margin-top:6px;color:#f8fafc}
  .stat-sub{margin-top:6px;font-size:12px;color:#8aa0bf;line-height:1.5}
  .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:14px}
  .toolbar .grow{flex:1 1 220px}
  .toolbar label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#9db0ca}
  .stack{display:flex;flex-direction:column;gap:6px}
  .muted{color:#94a3b8}.small{font-size:12px}.danger-text{color:#fca5a5}.good-text{color:#86efac}.warn-text{color:#fde68a}
  .pill.warn{border-color:#7c5c14;color:#fde68a}
  textarea{background:#0b1220; border:1px solid #334155; color:#e5e7eb; border-radius:10px; padding:10px; width:100%}
  .table-wrap{overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}
  .table-wrap table{min-width:920px}
  .inline-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .inline-actions > *{flex:0 0 auto}
  .admin-two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
  .admin-three-col{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .stat-card:hover{transform:translateY(-2px);border-color:rgba(125,154,255,.28);box-shadow:0 22px 40px rgba(2,8,24,.22)}
  .split{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
  .section-title{margin:0 0 6px;font-size:20px}
  .empty{padding:20px;border:1px dashed #334155;border-radius:14px;color:#94a3b8;text-align:center}
  .admin-note{white-space:pre-wrap;line-height:1.5;color:#d7e2f2}
  table{width:100%; border-collapse:collapse; font-size:14px}
  tbody tr:hover{background:rgba(255,255,255,.025)}
  th,td{border-bottom:1px solid #1f2937; padding:10px 8px; text-align:left}
  .btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:9px 13px; border-radius:12px; border:1px solid rgba(148,163,184,.16); background:linear-gradient(180deg,#111827,#0c1324); color:#e5e7eb; cursor:pointer; transition:transform .16s ease, border-color .16s ease, box-shadow .16s ease}
  .btn:hover{transform:translateY(-1px);border-color:rgba(125,154,255,.26);box-shadow:0 14px 26px rgba(2,8,24,.18)}
  .btn.danger{border-color:#7f1d1d; background:linear-gradient(180deg,#2a1010,#1c0c0c)}
  .pill{display:inline-block; padding:2px 8px; border-radius:999px; border:1px solid #334155; font-size:12px}
  .ok{border-color:#065f46; color:#6ee7b7}
  .bad{border-color:#7f1d1d; color:#fecaca}
  input,select{background:#0b1220; border:1px solid #334155; color:#e5e7eb; border-radius:10px; padding:10px}
  .form-note{color:#8aa0bf;font-size:12px;line-height:1.6}
  .admin-media-preview{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 0}
  .admin-media-preview img{max-height:76px;max-width:160px;border-radius:14px;border:1px solid #334155;background:#081121}
  code{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);padding:2px 6px;border-radius:8px;color:#e5efff}
  .wrap{position:relative}
  .wrap::before{content:'';position:fixed;inset:-10% auto auto -10%;width:42vw;height:42vw;pointer-events:none;background:radial-gradient(circle,rgba(37,99,235,.10),rgba(37,99,235,0) 62%);filter:blur(12px)}
  .card{position:relative;overflow:hidden}
  .card::after{content:'';position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(96,138,255,.22),rgba(255,255,255,0))}
  .top-nav-row{padding:10px 12px;border-radius:18px;background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.05)}
  .stats-grid .stat-card:nth-child(3n+1){background:radial-gradient(circle at top right,rgba(96,138,255,.22),transparent 40%),linear-gradient(180deg,rgba(30,41,59,.92),rgba(15,23,42,.98))}
  .stats-grid .stat-card:nth-child(3n+2){background:radial-gradient(circle at top right,rgba(16,185,129,.18),transparent 40%),linear-gradient(180deg,rgba(30,41,59,.92),rgba(15,23,42,.98))}
  .stats-grid .stat-card:nth-child(3n){background:radial-gradient(circle at top right,rgba(251,191,36,.16),transparent 40%),linear-gradient(180deg,rgba(30,41,59,.92),rgba(15,23,42,.98))}
  .table-wrap{border:1px solid rgba(148,163,184,.08);border-radius:16px;background:rgba(6,11,23,.62)}
  .table-wrap table{min-width:920px}
  .table-wrap thead th{backdrop-filter:blur(12px);box-shadow:0 1px 0 rgba(255,255,255,.03) inset}
  th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8fa7cc;background:rgba(255,255,255,.02);position:sticky;top:0;z-index:1}
  tbody tr:nth-child(even){background:rgba(255,255,255,.012)}
  .btn{font-weight:700}
  input:focus,select:focus,textarea:focus{outline:none;border-color:rgba(96,138,255,.45);box-shadow:0 0 0 4px rgba(59,130,246,.10)}
  .toolbar,.grid{padding:12px;border-radius:18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)}
  .toolbar{margin-top:6px}
  .toolbar .btn,.grid .btn{min-height:42px}
  .table-wrap{padding:6px}
  tbody tr{transition:background .16s ease, transform .16s ease}
  tbody tr:hover{transform:translateY(-1px)}
  .top{padding-bottom:14px}
  .top-row .btn{min-height:42px;padding-inline:15px;border-radius:14px}
  .top-nav-row{box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
  @media (min-width:1100px){
    .top{padding-inline:22px}
    .wrap{max-width:1360px;padding-top:20px}
  }
  @media (max-width:860px){
    .top-nav-row{padding:8px 10px}
    .card{padding:14px;border-radius:16px}
    .section-title{font-size:18px}
    .toolbar,.grid{padding:10px;border-radius:16px}
    .admin-two-col,.admin-three-col{grid-template-columns:1fr !important}
    .inline-actions > *{flex:1 1 160px}
  }
  @media (max-width:1040px){
    .table-wrap table{min-width:760px}
    th,td{padding:9px 7px}
    .split > .inline-actions,.split > .row,.split > form{width:100%}
  }
  @media (max-width:760px){
    .table-wrap{padding:4px}
    .table-wrap table{min-width:680px}
    .split > *{width:100%}
    .toolbar .grow{flex-basis:100%}
  }
  .top-nav-row{position:relative;overflow:hidden}
  .table-wrap{box-shadow:inset 0 1px 0 rgba(255,255,255,.02)}
  .table-wrap thead th{top:0;background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(10,17,31,.96))}
  .toolbar .btn,.inline-actions .btn{white-space:nowrap}
  .card .section-title{letter-spacing:-.02em}
  .stats-grid .stat-card{min-height:118px}
  .table-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:2px 2px 10px}
  .table-tools-left,.table-tools-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .admin-table-filter{min-width:220px;max-width:360px}
  .admin-density-toggle{min-width:112px}
  .table-tools .pill{background:rgba(255,255,255,.03)}
  .admin-density-compact .card{padding:14px;border-radius:16px}
  .admin-density-compact .stats-grid{gap:10px}
  .admin-density-compact .stats-grid .stat-card{min-height:102px;padding:12px}
  .admin-density-compact .stat-value{font-size:24px}
  .admin-density-compact th,.admin-density-compact td{padding:8px 6px;font-size:13px}
  .admin-density-compact .toolbar,.admin-density-compact .grid{padding:10px;border-radius:16px}
  .admin-density-compact .btn{min-height:40px;padding:8px 12px}
  @media (max-width:860px){
    .table-tools{padding-bottom:8px}
    .admin-table-filter{min-width:180px;max-width:100%}
    .table-tools-left,.table-tools-right{width:100%}
  }
  .admin-login-shell{min-height:calc(100vh - 80px);display:grid;place-items:center;padding:28px}
  .admin-login-card{width:min(980px,100%);display:grid;grid-template-columns:1.05fr .95fr;overflow:hidden;border-radius:28px;background:linear-gradient(135deg,rgba(13,28,52,.98),rgba(6,12,24,.99));border:1px solid rgba(125,154,255,.18);box-shadow:0 30px 80px rgba(0,0,0,.36)}
  .admin-login-hero{padding:34px;background:radial-gradient(circle at 20% 10%,rgba(31,208,146,.22),transparent 36%),linear-gradient(160deg,rgba(78,124,255,.18),rgba(12,24,45,.72));border-right:1px solid rgba(255,255,255,.08)}
  .admin-login-mark{display:inline-flex;align-items:center;gap:10px;font-weight:900;color:#fff}
  .admin-login-logo{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#4f7cff,#18d1a4);box-shadow:0 14px 28px rgba(24,209,164,.18)}
  .admin-login-hero h1{font-size:clamp(34px,5vw,58px);line-height:.95;margin:62px 0 16px;letter-spacing:-.05em}
  .admin-login-hero p{max-width:460px;color:#b9c9e8;line-height:1.7;margin:0}
  .admin-login-points{display:grid;gap:10px;margin-top:30px}
  .admin-login-points span{display:inline-flex;align-items:center;gap:10px;color:#dce8ff}
  .admin-login-points span::before{content:'';width:9px;height:9px;border-radius:99px;background:#18d1a4;box-shadow:0 0 0 5px rgba(24,209,164,.10)}
  .admin-login-form{padding:34px;display:flex;flex-direction:column;justify-content:center;gap:16px}
  .admin-login-form h2{margin:0;font-size:28px}
  .admin-login-form p{margin:0;color:#94a3b8;line-height:1.6}
  .admin-login-form form{display:grid;gap:12px;margin-top:10px}
  .admin-login-form input{min-height:48px;border-radius:14px}
  .admin-login-form .btn{min-height:50px;border-radius:15px;background:linear-gradient(135deg,#4f7cff,#2563eb);border-color:rgba(125,154,255,.44);box-shadow:0 18px 34px rgba(37,99,235,.20)}
  .admin-login-error{width:min(980px,100%);margin:0 auto 14px}
  @media(max-width:820px){.admin-login-card{grid-template-columns:1fr}.admin-login-hero{border-right:0;border-bottom:1px solid rgba(255,255,255,.08);padding:28px}.admin-login-hero h1{margin-top:36px}.admin-login-form{padding:26px}.admin-login-shell{padding:16px;place-items:start center}}
  </style></head><body>";
  if (admin_is_logged_in()) {
    echo "<div class='top'><div class='top-row'><div class='top-brand'><span class='top-badge'>MEX</span><div class='top-title'><span>MEX Group Admin</span><small>Operations console</small></div></div><span class='top-spacer'></span><a class='btn' href='/admin/logout.php'>Logout</a></div>";
    echo "<div class='top-nav-row'><div class='top-nav-label'>Core control</div><div class='top-nav'>";
    foreach ($navPrimary as $href => $label) {
      $active = ($currentPath === $href) ? ' active' : '';
      echo "<a class='" . trim($active) . "' href='" . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . "'>" . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . "</a>";
    }
    echo "</div></div><div class='top-nav-row'><div class='top-nav-label'>Operations + content</div><div class='top-nav secondary'>";
    foreach ($navSecondary as $href => $label) {
      $active = ($currentPath === $href) ? ' active' : '';
      echo "<a class='" . trim($active) . "' href='" . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . "'>" . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . "</a>";
    }
    echo "</div></div></div>";
  }
  $adminEnhanceScript = <<<'HTML'
<script>
(function(){
  const root = document.documentElement;
  const densityKey = 'vp_admin_density';
  const getRows = (table)=>Array.from(table.tBodies || []).flatMap(tb=>Array.from(tb.rows || []));
  const applyDensity = (mode)=>{
    const compact = String(mode || '') === 'compact';
    root.classList.toggle('admin-density-compact', compact);
    try{ localStorage.setItem(densityKey, compact ? 'compact' : 'comfortable'); }catch(e){}
    document.querySelectorAll('.admin-density-toggle').forEach(btn=>{ btn.textContent = compact ? 'Comfortable density' : 'Compact density'; });
  };
  let savedDensity = 'comfortable';
  try{ savedDensity = localStorage.getItem(densityKey) || 'comfortable'; }catch(e){}
  applyDensity(savedDensity);

  document.querySelectorAll('.table-wrap').forEach((wrap)=>{
    if(!wrap || wrap.dataset.enhanced === '1') return;
    const table = wrap.querySelector('table');
    if(!table) return;
    wrap.dataset.enhanced = '1';

    const tools = document.createElement('div');
    tools.className = 'table-tools';
    const left = document.createElement('div');
    left.className = 'table-tools-left';
    const right = document.createElement('div');
    right.className = 'table-tools-right';

    const count = document.createElement('span');
    count.className = 'pill';
    count.textContent = '0 rows';
    left.appendChild(count);

    const filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'admin-table-filter';
    filter.placeholder = 'Filter rows';
    filter.autocomplete = 'off';
    filter.spellcheck = false;
    left.appendChild(filter);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', ()=>{ filter.value=''; update(); filter.focus(); });
    right.appendChild(clearBtn);

    const densityBtn = document.createElement('button');
    densityBtn.type = 'button';
    densityBtn.className = 'btn admin-density-toggle';
    densityBtn.addEventListener('click', ()=>{
      applyDensity(root.classList.contains('admin-density-compact') ? 'comfortable' : 'compact');
    });
    right.appendChild(densityBtn);

    tools.appendChild(left);
    tools.appendChild(right);
    wrap.parentNode.insertBefore(tools, wrap);

    const update = ()=>{
      const rows = getRows(table);
      const q = String(filter.value || '').trim().toLowerCase();
      let total = 0;
      let visible = 0;
      rows.forEach((row)=>{
        total += 1;
        const text = String(row.innerText || row.textContent || '').toLowerCase();
        const show = !q || text.indexOf(q) !== -1;
        row.style.display = show ? '' : 'none';
        if(show) visible += 1;
      });
      count.textContent = q ? `${visible} / ${total} rows` : `${total} rows`;
    };

    filter.addEventListener('input', update, {passive:true});
    applyDensity(root.classList.contains('admin-density-compact') ? 'compact' : 'comfortable');
    update();
  });
})();
</script>
HTML;
  echo "<div class='wrap'>{$body}</div>" . $adminEnhanceScript . "</body></html>";
}

// --- Telegram notifications (deposit/withdraw admin actions) ---
function admin_bot_token(): string {
  $t = (string)(env('BOT_TOKEN','') ?: '');
  if ($t !== '') return $t;
  $t = (string)(env('TELEGRAM_BOT_TOKEN','') ?: '');
  return $t;
}

function admin_tg_api(string $method, array $payload): array {
  $token = admin_bot_token();
  if ($token === '') return ['ok'=>false,'error'=>'no_token'];
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 8,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'bad_json'];
}

function admin_user_chat_id(int $user_id): string {
  $st = db()->prepare('SELECT telegram_chat_id, tg_id FROM users WHERE id=? LIMIT 1');
  $st->execute([$user_id]);
  $r = $st->fetch(PDO::FETCH_ASSOC);
  if (!$r) return '';
  $chat = (string)($r['telegram_chat_id'] ?? '');
  if ($chat !== '') return $chat;
  // fallback: many users only have tg_id, which is a valid chat_id in 1:1 bots
  return (string)($r['tg_id'] ?? '');
}

function admin_user_locale(int $user_id): string {
  $st = db()->prepare('SELECT locale FROM users WHERE id=? LIMIT 1');
  $st->execute([$user_id]);
  $l = strtolower((string)($st->fetchColumn() ?: 'en'));
  return in_array($l, ['en','ar','ru'], true) ? $l : 'en';
}

function admin_notify_user(int $user_id, string $text): void {
  $chat = admin_user_chat_id($user_id);
  if ($chat === '') return;
  admin_tg_api('sendMessage', [
    'chat_id' => $chat,
    'text' => $text,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true,
  ]);
}

function admin_tpl_text(string $baseKey, string $lang, string $defaultTpl, array $vars = []): string {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $tpl = trim((string)setting_get($baseKey.'.'.$lang, ''));
  if ($tpl === '') $tpl = $defaultTpl;
  foreach ($vars as $k => $v) {
    $tpl = str_replace('{'.$k.'}', (string)$v, $tpl);
  }
  return $tpl;
}

function admin_notify_deposit_status(int $user_id, float $amount, string $currency, string $status, int $deposit_id = 0): void {
  $l = admin_user_locale($user_id);
  $amt = number_format($amount, 2, '.', '');
  $cur = htmlspecialchars($currency, ENT_QUOTES);
  $id  = ($deposit_id > 0) ? (string)$deposit_id : '';

  if ($status === 'confirmed') {
    $def = ($l==='ar') ? "✅ <b>تم تأكيد الإيداع</b>\nالمبلغ: <b>{amount} {currency}</b>"
         : (($l==='ru') ? "✅ <b>Депозит подтверждён</b>\nСумма: <b>{amount} {currency}</b>"
         : "✅ <b>Deposit confirmed</b>\nAmount: <b>{amount} {currency}</b>");
    $text = admin_tpl_text('bot.notify.deposit_confirmed', $l, $def, ['amount'=>$amt,'currency'=>$cur,'id'=>$id]);
  } else {
    $def = ($l==='ar') ? "❌ <b>تم رفض الإيداع</b>\nالمبلغ: <b>{amount} {currency}</b>"
         : (($l==='ru') ? "❌ <b>Депозит отклонён</b>\nСумма: <b>{amount} {currency}</b>"
         : "❌ <b>Deposit rejected</b>\nAmount: <b>{amount} {currency}</b>");
    $text = admin_tpl_text('bot.notify.deposit_rejected', $l, $def, ['amount'=>$amt,'currency'=>$cur,'id'=>$id]);
  }

  admin_notify_user($user_id, $text);

  // Also notify the marketer/manager (best effort)
  try {
    $key = ($status === 'confirmed') ? 'dep_confirmed' : 'dep_failed';
    aff_notify_manager_for_user($user_id, $key, [
      'id' => ($deposit_id > 0 ? $deposit_id : '?'),
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => $currency,
    ]);
  } catch (Throwable $e) {}
}

function admin_notify_withdrawal_status(int $user_id, float $amount, string $currency, string $status, int $withdrawal_id = 0): void {
  $l = admin_user_locale($user_id);
  $amt = number_format($amount, 2, '.', '');
  $cur = htmlspecialchars($currency, ENT_QUOTES);
  $id  = ($withdrawal_id > 0) ? (string)$withdrawal_id : '';

  if ($status === 'approved') {
    $def = ($l==='ar') ? "✅ <b>تمت الموافقة على السحب</b>
المبلغ: <b>{amount} {currency}</b>"
         : (($l==='ru') ? "✅ <b>Заявка на вывод одобрена</b>
Сумма: <b>{amount} {currency}</b>"
         : "✅ <b>Withdrawal approved</b>
Amount: <b>{amount} {currency}</b>");
    $text = admin_tpl_text('bot.notify.withdraw_approved', $l, $def, ['amount'=>$amt,'currency'=>$cur,'id'=>$id]);
  } elseif ($status === 'rejected') {
    $def = ($l==='ar') ? "❌ <b>تم رفض السحب</b>
المبلغ: <b>{amount} {currency}</b>"
         : (($l==='ru') ? "❌ <b>Заявка на вывод отклонена</b>
Сумма: <b>{amount} {currency}</b>"
         : "❌ <b>Withdrawal rejected</b>
Amount: <b>{amount} {currency}</b>");
    $text = admin_tpl_text('bot.notify.withdraw_rejected', $l, $def, ['amount'=>$amt,'currency'=>$cur,'id'=>$id]);
  } else {
    $def = ($l==='ar') ? "✅ <b>تم تنفيذ السحب</b>
المبلغ: <b>{amount} {currency}</b>"
         : (($l==='ru') ? "✅ <b>Вывод выполнен</b>
Сумма: <b>{amount} {currency}</b>"
         : "✅ <b>Withdrawal completed</b>
Amount: <b>{amount} {currency}</b>");
    $text = admin_tpl_text('bot.notify.withdraw_completed', $l, $def, ['amount'=>$amt,'currency'=>$cur,'id'=>$id]);
  }

  admin_notify_user($user_id, $text);

  // Also notify the marketer/manager (best effort)
  try {
    $key = ($status === 'approved') ? 'wdr_approved' : (($status === 'rejected') ? 'wdr_rejected' : 'wdr_completed');
    aff_notify_manager_for_user($user_id, $key, [
      'id' => ($withdrawal_id > 0 ? $withdrawal_id : '?'),
      'amount' => number_format($amount, 2, '.', ''),
      'cur' => $currency,
    ]);
  } catch (Throwable $e) {}
}
