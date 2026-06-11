<?php
declare(strict_types=1);
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();

$pdo = db();
$now = time();

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$driver = db_driver();
$phpv = PHP_VERSION;

// Quotes freshness
$quotes = [];
try {
  $st = $pdo->query("SELECT symbol, price, mark_price, updated_at FROM market_quotes ORDER BY updated_at DESC LIMIT 25");
  $quotes = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) {
  $quotes = [];
}

$quotesHtml = "<div class='card'><h2 style='margin:0 0 10px'>Quotes Freshness</h2>";
if (!$quotes) {
  $quotesHtml .= "<div class='pill bad'>No quotes yet</div>";
} else {
  $quotesHtml .= "<table><thead><tr><th>Symbol</th><th>Price</th><th>Mark</th><th>Updated</th><th>Age</th></tr></thead><tbody>";
  foreach ($quotes as $q) {
    $sym = h($q['symbol'] ?? '');
    $px = h($q['price'] ?? '');
    $mk = h($q['mark_price'] ?? '');
    $upd = (int)($q['updated_at'] ?? 0);
    $age = $upd ? max(0, $now - $upd) : 999999;
    $agePill = $age <= 3 ? "<span class='pill ok'>{$age}s</span>" : "<span class='pill bad'>{$age}s</span>";
    $quotesHtml .= "<tr><td><strong>{$sym}</strong></td><td>{$px}</td><td>{$mk}</td><td>" . ($upd ? date('Y-m-d H:i:s', $upd) : '-') . "</td><td>{$agePill}</td></tr>";
  }
  $quotesHtml .= "</tbody></table>";
}
$quotesHtml .= "<div style='margin-top:10px; font-size:13px; opacity:.85'>If ages stay high, your cron quotes_tick isn't running.</div></div>";

// Cron status
$cronNames = ['quotes_tick','risk_tick','invest_tick','holds_expire','market_ingest','markets_sync'];
$statusRows = [];
foreach ($cronNames as $n) {
  $s = null;
  try { $s = tp_status_read($n); } catch (Throwable $e) { $s = null; }
  $statusRows[$n] = $s;
}

$cronHtml = "<div class='card'><h2 style='margin:0 0 10px'>Cron Status</h2>";
$cronHtml .= "<div style='display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px'>
  <a class='btn' href='/admin/errors.php?log=cron'>Open cron log</a>
  <a class='btn' href='/admin/errors.php?log=php'>Open php log</a>
  <a class='btn' href='/admin/errors.php'>All logs</a>
</div>";

$cronHtml .= "<table><thead><tr><th>Name</th><th>Last run</th><th>Age</th><th>OK</th><th>Info</th></tr></thead><tbody>";
foreach ($statusRows as $name=>$s) {
  if (!$s) {
    $cronHtml .= "<tr><td><b>".h($name)."</b></td><td>-</td><td>-</td><td><span class='pill bad'>No data</span></td><td><span style='opacity:.75'>Run the cron once to see status.</span></td></tr>";
    continue;
  }
  $ts = (int)($s['ts'] ?? 0);
  $age = $ts ? max(0, $now - $ts) : 999999;
  $ok = ($s['ok'] ?? null);
  $pill = ($ok === true || $ok === 1 || $ok === '1') ? "<span class='pill ok'>OK</span>" : "<span class='pill bad'>BAD</span>";
  $info = $s;
  unset($info['name'],$info['ts'],$info['iso'],$info['env']);
  $cronHtml .= "<tr><td><b>".h($name)."</b></td><td>".h((string)($s['iso'] ?? ''))."</td><td>".h((string)$age)."s</td><td>{$pill}</td><td><code>".h(json_encode($info, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))."</code></td></tr>";
}
$cronHtml .= "</tbody></table>";
$cronHtml .= "<div style='margin-top:10px; font-size:13px; opacity:.85'>Tip: Set cron to call <code>/api/cron/quotes_tick.php?token=CRON_KEY</code> every 1 minute.</div>";
$cronHtml .= "</div>";

$body = "<div class='card'>
  <h1 style='margin:0 0 8px'>Monitor</h1>
  <div style='display:flex; gap:10px; flex-wrap:wrap'>
    <span class='pill'>DB: <strong>" . h($driver) . "</strong></span>
    <span class='pill'>PHP: <strong>" . h($phpv) . "</strong></span>
    <span class='pill'>Server time: <strong>" . date('Y-m-d H:i:s') . "</strong></span>
  </div>
  <div style='margin-top:10px; opacity:.9'>Realtime checks: quotes freshness + cron status + logs.</div>
</div>";

$body .= $cronHtml;
$body .= $quotesHtml;

admin_layout('Monitor', $body);
