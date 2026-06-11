<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();

$pdo = db();
function esc($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$mid = (int)($_GET['id'] ?? 0);

// Ensure schema is upgraded (creates managers/users.manager_id etc.).
try { schema_install($pdo, db_driver()); schema_seed_defaults($pdo, db_driver()); } catch (Throwable $e) {}

// If the managers table doesn't exist yet, show a helpful message.
try {
  $pdo->query('SELECT 1 FROM managers LIMIT 1');
} catch (Throwable $e) {
  admin_layout('Managers', "<div class='card'><h2>Managers</h2><p>Managers table not found yet. Open the main site once to run the auto-migration, then refresh this page.</p></div>");
  exit;
}

// --- Actions (block/unblock/delete) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $act = (string)($_POST['action'] ?? '');
  $id = (int)($_POST['id'] ?? 0);
  if ($id > 0 && in_array($act, ['block','unblock','delete'], true)) {
    $now = time();
    try {
      if ($act === 'block') {
        $pdo->prepare("UPDATE managers SET status='blocked', updated_at=? WHERE id=?")->execute([$now, $id]);
      } elseif ($act === 'unblock') {
        $pdo->prepare("UPDATE managers SET status='active', updated_at=? WHERE id=?")->execute([$now, $id]);
      } elseif ($act === 'delete') {
        // Safe delete: mark as deleted, revoke invites, and detach clients.
        $pdo->prepare("UPDATE managers SET status='deleted', updated_at=? WHERE id=?")->execute([$now, $id]);
        try { $pdo->prepare('UPDATE manager_invites SET revoked_at=? WHERE manager_id=?')->execute([$now, $id]); } catch (Throwable $e) {}
        try { $pdo->prepare('UPDATE users SET manager_id=0, updated_at=? WHERE manager_id=?')->execute([$now, $id]); } catch (Throwable $e) {}
      }
    } catch (Throwable $e) {
      // ignore
    }
  }
  header('Location: /admin/managers.php'.($mid>0?('?id='.$mid):''));
  exit;
}

// --- Aggregate helpers ---
function money_by_currency(array $rows, string $idKey='manager_id'): array {
  $out = [];
  foreach ($rows as $r) {
    $id = (int)($r[$idKey] ?? 0);
    if (!$id) continue;
    $cur = (string)($r['currency'] ?? '');
    $amt = (float)($r['amt'] ?? 0);
    if (!isset($out[$id])) $out[$id] = [];
    if ($cur === '') $cur = 'UNK';
    $out[$id][$cur] = ($out[$id][$cur] ?? 0) + $amt;
  }
  return $out;
}

function fmt_money_map(?array $m): string {
  if (!$m) return '—';
  ksort($m);
  $parts = [];
  foreach ($m as $cur => $amt) {
    $parts[] = esc($cur) . ': ' . number_format((float)$amt, 2, '.', '');
  }
  return implode(' · ', $parts);
}

if ($mid > 0) {
  // --- Manager details ---
  $st = $pdo->prepare('SELECT * FROM managers WHERE id=? LIMIT 1');
  $st->execute([$mid]);
  $m = $st->fetch(PDO::FETCH_ASSOC);
  if (!$m) {
    admin_layout('Manager', "<div class='card'><h2>Manager</h2><p>Not found.</p></div>");
    exit;
  }

  $st = $pdo->prepare('SELECT id,tg_id,username,first_name,last_name,locale,is_frozen,deposit_disabled,withdraw_disabled,trade_disabled,created_at FROM users WHERE manager_id=? ORDER BY id DESC LIMIT 500');
  $st->execute([$mid]);
  $clients = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $body = "<div class='card'><h2>Manager #".esc($m['id'])."</h2>";
  $body .= "<p><b>Telegram:</b> ".esc($m['tg_id'])." · <b>Username:</b> ".esc($m['username'] ?? '')." · <b>Status:</b> ".esc($m['status'] ?? '')." · <b>Lang:</b> ".esc($m['lang'] ?? 'en')."</p>";
  $stt = strtolower((string)($m['status'] ?? ''));
  $body .= "<div style='display:flex;gap:10px;flex-wrap:wrap;margin:10px 0'>";
  $body .= "<a class='btn' href='/admin/managers.php'>⬅️ Back to managers</a>";
  if ($stt !== 'deleted') {
    if ($stt === 'blocked') {
      $body .= "<form method='post' style='display:inline'><input type='hidden' name='id' value='".esc($m['id'])."'><input type='hidden' name='action' value='unblock'><button class='btn ok' type='submit'>Unblock</button></form>";
    } else {
      $body .= "<form method='post' style='display:inline'><input type='hidden' name='id' value='".esc($m['id'])."'><input type='hidden' name='action' value='block'><button class='btn danger' type='submit'>Block</button></form>";
    }
    $body .= "<form method='post' style='display:inline' onsubmit=\"return confirm('Delete this manager? This will detach their clients.');\"><input type='hidden' name='id' value='".esc($m['id'])."'><input type='hidden' name='action' value='delete'><button class='btn danger' type='submit'>Delete</button></form>";
  }
  $body .= "</div></div>";

  $body .= "<div class='card'><h3>Clients (".count($clients).")</h3>";
  $body .= "<table><thead><tr><th>ID</th><th>Telegram</th><th>Name</th><th>Username</th><th>Locale</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>";
  foreach ($clients as $u) {
    $uid = (int)$u['id'];
    $name = trim((string)($u['first_name'] ?? '').' '.(string)($u['last_name'] ?? ''));
    $flags = [];
    if ((int)($u['is_frozen'] ?? 0) === 1) $flags[] = 'frozen';
    if ((int)($u['deposit_disabled'] ?? 0) === 1) $flags[] = 'dep off';
    if ((int)($u['withdraw_disabled'] ?? 0) === 1) $flags[] = 'wdr off';
    if ((int)($u['trade_disabled'] ?? 0) === 1) $flags[] = 'trade off';
    $status = $flags ? "<span class='pill bad'>".esc(implode(' • ', $flags))."</span>" : "<span class='pill ok'>active</span>";
    $body .= "<tr>".
      "<td>".esc($uid)."</td>".
      "<td>".esc($u['tg_id'] ?? '')."</td>".
      "<td>".esc($name)."</td>".
      "<td>".esc($u['username'] ?? '')."</td>".
      "<td>".esc($u['locale'] ?? '')."</td>".
      "<td>{$status}</td>".
      "<td>".date('Y-m-d H:i', (int)($u['created_at'] ?? 0))."</td>".
      "<td><a class='btn' href='/admin/balance_adjust.php?user_id={$uid}'>Adjust</a> <a class='btn' href='/admin/message_user.php?user_id={$uid}'>Message</a></td>".
    "</tr>";
  }
  $body .= "</tbody></table></div>";

  admin_layout('Manager', $body);
  exit;
}

// --- Managers overview ---
$managers = $pdo->query('SELECT id,tg_id,username,first_name,last_name,status,lang,created_at,updated_at,approved_at FROM managers ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC) ?: [];

// Clients count
$clientCounts = [];
try {
  $rows = $pdo->query('SELECT manager_id, COUNT(*) c FROM users WHERE COALESCE(manager_id,0)<>0 GROUP BY manager_id')->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $r) $clientCounts[(int)$r['manager_id']] = (int)$r['c'];
} catch (Throwable $e) {}

// Deposits confirmed per currency
$depByMgr = [];
try {
  $rows = $pdo->query("SELECT u.manager_id, d.currency, SUM(d.amount) amt
    FROM deposits d
    JOIN users u ON u.id=d.user_id
    WHERE COALESCE(u.manager_id,0)<>0 AND d.status='confirmed'
    GROUP BY u.manager_id, d.currency")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  $depByMgr = money_by_currency($rows, 'manager_id');
} catch (Throwable $e) {}

// Withdrawals completed per currency
$wdrByMgr = [];
try {
  $rows = $pdo->query("SELECT u.manager_id, w.currency, SUM(w.amount) amt
    FROM withdrawals w
    JOIN users u ON u.id=w.user_id
    WHERE COALESCE(u.manager_id,0)<>0 AND w.status IN ('completed','done')
    GROUP BY u.manager_id, w.currency")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  $wdrByMgr = money_by_currency($rows, 'manager_id');
} catch (Throwable $e) {}

// Pending withdrawals count
$wdrPending = [];
try {
  $rows = $pdo->query("SELECT u.manager_id, SUM(CASE WHEN w.status IN ('pending','requested','review') THEN 1 ELSE 0 END) c
    FROM withdrawals w
    JOIN users u ON u.id=w.user_id
    WHERE COALESCE(u.manager_id,0)<>0
    GROUP BY u.manager_id")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $r) $wdrPending[(int)$r['manager_id']] = (int)$r['c'];
} catch (Throwable $e) {}

// Trading volume (USD) based on orders.usd_amount for closed orders
$volUsd = [];
try {
  $rows = $pdo->query("SELECT u.manager_id, SUM(CASE WHEN COALESCE(o.closed_at,0)>0 THEN COALESCE(o.usd_amount,0) ELSE 0 END) vol
    FROM orders o
    JOIN users u ON u.id=o.user_id
    WHERE COALESCE(u.manager_id,0)<>0
    GROUP BY u.manager_id")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $r) $volUsd[(int)$r['manager_id']] = (float)$r['vol'];
} catch (Throwable $e) {}

// KYC pending/approved/rejected
$kycStats = [];
try {
  $rows = $pdo->query("SELECT u.manager_id,
      SUM(CASE WHEN k.status='pending' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN k.status='approved' THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN k.status='rejected' THEN 1 ELSE 0 END) rejected
    FROM kyc_requests k
    JOIN users u ON u.id=k.user_id
    WHERE COALESCE(u.manager_id,0)<>0
    GROUP BY u.manager_id")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $r) {
    $kycStats[(int)$r['manager_id']] = [
      'pending' => (int)$r['pending'],
      'approved' => (int)$r['approved'],
      'rejected' => (int)$r['rejected'],
    ];
  }
} catch (Throwable $e) {}

$body = "<div class='card'><h2>Managers</h2><p>هنا تقدر تتابع أداء كل مسوق/مدير: عدد العملاء + الإيداعات المؤكدة + السحوبات المنفذة + حجم التداول + حالة طلبات KYC.</p></div>";

$body .= "<div class='card'><table><thead><tr>".
  "<th>ID</th><th>Telegram</th><th>Username</th><th>Status</th><th>Lang</th><th>Clients</th><th>Deposits (confirmed)</th><th>Withdrawals (completed)</th><th>Wdr pending</th><th>Trade vol (USD)</th><th>KYC</th><th>Actions</th>".
  "</tr></thead><tbody>";

foreach ($managers as $m) {
  $id = (int)$m['id'];
  $tg = esc($m['tg_id'] ?? '');
  $un = esc($m['username'] ?? '');
  $st = esc($m['status'] ?? '');
  $lang = esc($m['lang'] ?? 'en');
  $clients = (int)($clientCounts[$id] ?? 0);
  $deps = fmt_money_map($depByMgr[$id] ?? null);
  $wdrs = fmt_money_map($wdrByMgr[$id] ?? null);
  $wdrP = (int)($wdrPending[$id] ?? 0);
  $vol = number_format((float)($volUsd[$id] ?? 0), 2, '.', '');
  $k = $kycStats[$id] ?? ['pending'=>0,'approved'=>0,'rejected'=>0];
  $kyc = "P:".(int)$k['pending']." · A:".(int)$k['approved']." · R:".(int)$k['rejected'];

  $stLower = strtolower((string)($m['status'] ?? ''));
  $actions = "<a class='btn' href='/admin/managers.php?id={$id}'>View</a>";
  if ($stLower !== 'deleted') {
    if ($stLower === 'blocked') {
      $actions .= " <form method='post' style='display:inline'><input type='hidden' name='id' value='{$id}'><input type='hidden' name='action' value='unblock'><button class='btn ok' type='submit'>Unblock</button></form>";
    } else {
      $actions .= " <form method='post' style='display:inline'><input type='hidden' name='id' value='{$id}'><input type='hidden' name='action' value='block'><button class='btn danger' type='submit'>Block</button></form>";
    }
    $actions .= " <form method='post' style='display:inline' onsubmit=\"return confirm('Delete this manager? This will detach their clients.');\"><input type='hidden' name='id' value='{$id}'><input type='hidden' name='action' value='delete'><button class='btn danger' type='submit'>Delete</button></form>";
  }

  $body .= "<tr>".
    "<td>{$id}</td>".
    "<td>{$tg}</td>".
    "<td>{$un}</td>".
    "<td>{$st}</td>".
    "<td>{$lang}</td>".
    "<td>{$clients}</td>".
    "<td>{$deps}</td>".
    "<td>{$wdrs}</td>".
    "<td>{$wdrP}</td>".
    "<td>{$vol}</td>".
    "<td>".esc($kyc)."</td>".
    "<td>{$actions}</td>".
  "</tr>";
}

$body .= "</tbody></table></div>";

admin_layout('Managers', $body);
