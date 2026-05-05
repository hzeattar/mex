<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
admin_require();

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Build available log map
$logs = [];
$phpLog = (string)(ini_get('error_log') ?: (defined('TP_PHP_ERROR_LOG') ? TP_PHP_ERROR_LOG : (__DIR__ . '/../api/data/php_errors.log')));
$logs['php'] = $phpLog;

$logsDir = __DIR__ . '/../api/data/logs';
if (is_dir($logsDir)) {
  foreach (glob($logsDir . '/*.log') ?: [] as $p) {
    $k = basename($p, '.log');
    if ($k !== '') $logs[$k] = $p;
  }
}
$migrate = __DIR__ . '/../api/data/migrate.log';
if (is_file($migrate)) $logs['migrate'] = $migrate;

ksort($logs);

$logKey = strtolower(trim((string)($_GET['log'] ?? 'php')));
if (!isset($logs[$logKey])) $logKey = 'php';
$logPath = (string)$logs[$logKey];

// Download
if ((int)($_GET['download'] ?? 0) === 1) {
  if (!is_file($logPath) || !is_readable($logPath)) {
    http_response_code(404);
    echo 'Not found';
    exit;
  }
  header('Content-Type: text/plain; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . basename($logPath) . '"');
  header('Cache-Control: no-store');
  readfile($logPath);
  exit;
}

function tail_lines_file(string $path, int $lines): string {
  if (!is_file($path) || !is_readable($path)) return '';
  $fp = fopen($path, 'rb');
  if (!$fp) return '';
  $buf = '';
  $chunk = 8192;
  fseek($fp, 0, SEEK_END);
  $pos = ftell($fp);
  $need = $lines + 1;
  while ($pos > 0 && $need > 0) {
    $read = ($pos - $chunk) < 0 ? $pos : $chunk;
    $pos -= $read;
    fseek($fp, $pos);
    $data = fread($fp, $read);
    if ($data === false) break;
    $buf = $data . $buf;
    $need = $lines - substr_count($buf, "\n");
  }
  fclose($fp);
  $arr = preg_split('/\r?\n/', trim($buf));
  if (!$arr) return '';
  $arr = array_slice($arr, -$lines);
  return implode("\n", $arr);
}

$msg = '';
$action = (string)($_POST['action'] ?? '');
if ($action === 'clear') {
  if (is_file($logPath) && is_writable($logPath)) {
    file_put_contents($logPath, '');
    $msg = 'Log cleared.';
  } else {
    $msg = 'Cannot clear log (not writable).';
  }
}

$lines = (int)($_GET['lines'] ?? 400);
$lines = max(50, min(4000, $lines));
$content = tail_lines_file($logPath, $lines);

// Status snapshots
$statuses = [];
try { $statuses = function_exists('tp_status_list') ? tp_status_list() : []; } catch (Throwable $e) { $statuses = []; }

// Quick health
$health = [];
try {
  $pdo = db();
  $drv = db_driver();
  $health['db'] = 'OK (' . $drv . ')';
  $health['market_quotes.mark_price'] = function_exists('schema_column_exists') ? (schema_column_exists($pdo,'market_quotes','mark_price',$drv) ? 'yes' : 'no') : 'n/a';
  $health['market_ticks table'] = function_exists('schema_table_exists') ? (schema_table_exists($pdo,'market_ticks',$drv) ? 'yes' : 'no') : 'n/a';
} catch (Throwable $e) {
  $health['db'] = 'ERROR: ' . $e->getMessage();
}

$body = '';
if ($msg) {
  $body .= "<div class='card'><span class='pill ok'>" . h($msg) . "</span></div>";
}

// Log selector
$body .= "<div class='card'>
  <h2 style='margin:0 0 8px 0'>Error Explorer</h2>
  <div style='opacity:.85'>Selected: <b>".h($logKey)."</b> · Path: <code>".h($logPath)."</code></div>
  <div style='margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center'>
    <form method='get' style='margin:0; display:flex; gap:10px; flex-wrap:wrap; align-items:center'>
      <select name='log'>";
foreach ($logs as $k=>$p) {
  $sel = ($k===$logKey) ? 'selected' : '';
  $body .= "<option value='".h($k)."' {$sel}>".h($k)."</option>";
}
$body .= "</select>
      <select name='lines'>
        <option value='400'" . ($lines===400?' selected':'') . ">Last 400</option>
        <option value='1500'" . ($lines===1500?' selected':'') . ">Last 1500</option>
        <option value='4000'" . ($lines===4000?' selected':'') . ">Last 4000</option>
      </select>
      <button class='btn' type='submit'>View</button>
      <a class='btn' href='?log=".h($logKey)."&lines=".$lines."&download=1'>Download</a>
    </form>

    <form method='post' style='margin:0'>
      <input type='hidden' name='action' value='clear'>
      <button class='btn danger' type='submit' onclick=\"return confirm('Clear this log?')\">Clear</button>
    </form>
  </div>
</div>";

$body .= "<div class='card'><h3 style='margin-top:0'>Quick Health</h3><table><tbody>";
foreach ($health as $k=>$v) {
  $body .= "<tr><th>".h($k)."</th><td>".h($v)."</td></tr>";
}
$body .= "</tbody></table></div>";

// Status table
$body .= "<div class='card'><h3 style='margin-top:0'>Cron / Status snapshots</h3>";
if (!$statuses) {
  $body .= "<div class='pill'>No status snapshots yet. (Run cron endpoints once.)</div>";
} else {
  $body .= "<table><thead><tr><th>Name</th><th>When</th><th>Age</th><th>OK</th><th>Info</th></tr></thead><tbody>";
  $now = time();
  foreach ($statuses as $s) {
    $name = (string)($s['name'] ?? '');
    $ts = (int)($s['ts'] ?? 0);
    $age = $ts ? max(0, $now - $ts) : 999999;
    $ok = ($s['ok'] ?? null);
    $pill = ($ok === true || $ok === 1 || $ok === '1') ? "<span class='pill ok'>OK</span>" : "<span class='pill bad'>BAD</span>";
    $info = $s;
    unset($info['name'],$info['ts'],$info['iso'],$info['env']);
    $body .= "<tr><td><b>".h($name)."</b></td><td>".h((string)($s['iso'] ?? ''))."</td><td>".h((string)$age)."s</td><td>{$pill}</td><td><code>".h(json_encode($info, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE))."</code></td></tr>";
  }
  $body .= "</tbody></table>";
}
$body .= "</div>";

$body .= "<div class='card'>
  <h3 style='margin-top:0'>Recent lines</h3>
  <pre style='white-space:pre-wrap; word-break:break-word; background:#0b1220; border:1px solid #334155; border-radius:12px; padding:12px; max-height:70vh; overflow:auto'>".
  h($content ?: '(no lines yet)')."</pre>
</div>";

admin_layout('Errors', $body);
