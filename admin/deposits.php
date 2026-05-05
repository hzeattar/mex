
<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/ledger.php';
admin_require();

$pdo = db();
$msg = '';
$error = '';
$hasAdminNote = false;
try { $hasAdminNote = schema_column_exists('deposits', 'admin_note'); } catch (Throwable $e) {}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $act = trim((string)($_POST['action'] ?? 'save_note'));
    $note = trim((string)($_POST['note'] ?? ''));
    if ($id <= 0) throw new RuntimeException('Invalid deposit id');
    if (!in_array($act, ['confirm','fail','save_note'], true)) $act = 'save_note';
    $pdo->beginTransaction();
    $st = db_driver() === 'mysql' ? $pdo->prepare('SELECT * FROM deposits WHERE id=? FOR UPDATE') : $pdo->prepare('SELECT * FROM deposits WHERE id=?');
    $st->execute([$id]);
    $dep = $st->fetch(PDO::FETCH_ASSOC);
    if (!$dep) throw new RuntimeException('Deposit not found');
    $status = strtolower((string)($dep['status'] ?? ''));
    $now = time();

    if ($act === 'save_note') {
      if ($hasAdminNote) {
        $pdo->prepare('UPDATE deposits SET admin_note=?, updated_at=? WHERE id=?')->execute([$note, $now, $id]);
      }
      $pdo->commit();
      admin_audit_log('save_deposit_note', 'deposit', $id, 'Deposit note saved', ['note' => $note]);
      $msg = 'Deposit note saved';
    } elseif (!in_array($status, ['pending','requested'], true)) {
      $pdo->commit();
      $msg = 'This deposit has already been processed';
    } elseif ($act === 'fail') {
      $sql = $hasAdminNote ? 'UPDATE deposits SET status="failed", updated_at=?, admin_note=? WHERE id=?' : 'UPDATE deposits SET status="failed", updated_at=? WHERE id=?';
      $params = $hasAdminNote ? [$now, $note, $id] : [$now, $id];
      $pdo->prepare($sql)->execute($params);
      $pdo->commit();
      admin_notify_deposit_status((int)$dep['user_id'], (float)$dep['amount'], (string)$dep['currency'], 'failed', $id);
      admin_audit_log('fail_deposit', 'deposit', $id, 'Deposit marked as failed', ['amount' => (float)$dep['amount'], 'currency' => (string)$dep['currency'], 'note' => $note]);
      $msg = 'Deposit marked as failed';
    } else {
      ledger_add((int)$dep['user_id'], (string)$dep['currency'], (float)$dep['amount'], 'deposit_credit', 'deposit', (string)$id, ['provider'=>$dep['provider'], 'admin'=>true]);
      $sql = $hasAdminNote ? 'UPDATE deposits SET status="confirmed", updated_at=?, confirmed_at=?, admin_note=? WHERE id=?' : 'UPDATE deposits SET status="confirmed", updated_at=?, confirmed_at=? WHERE id=?';
      $params = $hasAdminNote ? [$now, $now, $note, $id] : [$now, $now, $id];
      $pdo->prepare($sql)->execute($params);
      $pdo->commit();
      admin_notify_deposit_status((int)$dep['user_id'], (float)$dep['amount'], (string)$dep['currency'], 'confirmed', $id);
      admin_audit_log('confirm_deposit', 'deposit', $id, 'Deposit confirmed and credited', ['amount' => (float)$dep['amount'], 'currency' => (string)$dep['currency'], 'note' => $note]);
      $msg = 'Deposit confirmed and credited';
    }
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $error = $e->getMessage();
  }
}

$q = trim((string)($_GET['q'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$limit = max(20, min(300, (int)($_GET['limit'] ?? 120)));
$where = [];
$params = [];
if ($q !== '') {
  $where[] = '(CAST(d.id AS CHAR) LIKE ? OR CAST(d.user_id AS CHAR) LIKE ? OR d.method_code LIKE ? OR d.external_ref LIKE ? OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
  $needle = '%' . $q . '%';
  array_push($params, $needle, $needle, $needle, $needle, $needle, $needle, $needle);
}
if ($status !== '') { $where[] = 'd.status = ?'; $params[] = $status; }
$cols = ['d.id','d.user_id','d.provider','d.method_code','d.currency','d.amount','d.status','d.external_ref','d.details_json','d.created_at','d.updated_at','d.confirmed_at','u.username','u.first_name','u.last_name'];
if ($hasAdminNote) $cols[] = 'd.admin_note';
$sql = 'SELECT ' . implode(',', $cols) . ' FROM deposits d LEFT JOIN users u ON u.id=d.user_id';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY d.id DESC LIMIT ' . (int)$limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$stats = [
  'Queue size' => (string)count($rows),
  'Pending' => (string)($pdo->query("SELECT COUNT(*) FROM deposits WHERE status IN ('pending','requested')")->fetchColumn() ?: 0),
  'Confirmed' => (string)($pdo->query("SELECT COUNT(*) FROM deposits WHERE status='confirmed'")->fetchColumn() ?: 0),
  'Failed' => (string)($pdo->query("SELECT COUNT(*) FROM deposits WHERE status='failed'")->fetchColumn() ?: 0),
];

$body = "<div class='split'><div><h1 class='section-title'>Deposits Queue</h1><div class='muted small'>Review client funding requests, inspect details, and confirm only after operations verify the payment.</div></div><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div>";
if ($msg !== '') $body .= "<div class='card'><span class='pill ok'>" . admin_h($msg) . "</span></div>";
if ($error !== '') $body .= "<div class='card'><span class='pill bad'>" . admin_h($error) . "</span></div>";
$body .= "<div class='stats-grid'>";
foreach ($stats as $label => $value) $body .= admin_stat_card($label, $value);
$body .= "</div>";
$body .= "<form class='card toolbar' method='get'>
  <label class='grow'>Search<input name='q' value='" . admin_h($q) . "' placeholder='deposit id, user id, method, username, external ref'></label>
  <label>Status<select name='status'><option value=''>All</option><option value='pending'" . ($status==='pending'?' selected':'') . ">Pending</option><option value='confirmed'" . ($status==='confirmed'?' selected':'') . ">Confirmed</option><option value='failed'" . ($status==='failed'?' selected':'') . ">Failed</option></select></label>
  <label>Limit<input type='number' min='20' max='300' name='limit' value='" . (int)$limit . "'></label>
  <button class='btn' type='submit'>Apply</button>
  <a class='btn' href='/admin/deposits.php'>Reset</a>
</form>";
if (!$rows) {
  $body .= "<div class='card empty'>No deposits matched the current filters.</div>";
} else {
  $body .= "<div class='card table-wrap'><table><thead><tr><th>ID</th><th>User</th><th>Method</th><th>Amount</th><th>Status</th><th>Details</th><th>External / proof</th><th>Review</th></tr></thead><tbody>";
  foreach ($rows as $r) {
    $ext = trim((string)($r['external_ref'] ?? ''));
    $extHtml = $ext !== '' ? '<div class="muted small">' . admin_h($ext) . '</div>' : '—';
    if (str_starts_with($ext, 'tg_photo:')) {
      $fid = substr($ext, 9);
      if ($fid !== '') $extHtml = "<a class='btn' href='/admin/tg_file.php?file_id=" . rawurlencode($fid) . "' target='_blank'>View proof</a>";
    } elseif (str_starts_with($ext, 'tg_doc:')) {
      $fid = substr($ext, 7);
      if ($fid !== '') $extHtml = "<a class='btn' href='/admin/tg_file.php?file_id=" . rawurlencode($fid) . "' target='_blank'>View proof</a>";
    } elseif (str_starts_with($ext, 'TG:')) {
      $fid = substr($ext, 3);
      if ($fid !== '') $extHtml = "<a class='btn' href='/admin/tg_file.php?file_id=" . rawurlencode($fid) . "' target='_blank'>View proof</a>";
    }
    $reviewButtons = '';
    if (in_array(strtolower((string)$r['status']), ['pending','requested'], true)) {
      $reviewButtons = "<button class='btn' type='submit' name='action' value='confirm'>Confirm + credit</button><button class='btn danger' type='submit' name='action' value='fail'>Fail</button>";
    }
    $note = $hasAdminNote ? (string)($r['admin_note'] ?? '') : '';
    $body .= "<tr>
      <td>#" . (int)$r['id'] . "<div class='muted small'>" . admin_format_ts($r['created_at']) . "</div></td>
      <td><strong>User #" . (int)$r['user_id'] . "</strong><div class='muted small'>" . admin_h(admin_name_for_row($r)) . "</div></td>
      <td><strong>" . admin_h(($r['provider'] ?? '') . ' / ' . ($r['method_code'] ?? '')) . "</strong><div class='muted small'>" . admin_h((string)$r['currency']) . "</div></td>
      <td><strong>" . admin_h((string)$r['amount']) . "</strong><div class='muted small'>" . admin_h((string)$r['currency']) . "</div></td>
      <td>" . admin_status_pill((string)$r['status']) . ($r['confirmed_at'] ? "<div class='muted small'>Confirmed " . admin_format_ts($r['confirmed_at']) . "</div>" : '') . "</td>
      <td>" . admin_parse_json_pairs((string)($r['details_json'] ?? ''), 6) . "</td>
      <td>{$extHtml}</td>
      <td style='min-width:340px'><form method='post' class='stack'>" . admin_csrf_input() . "<input type='hidden' name='id' value='" . (int)$r['id'] . "'><textarea name='note' rows='3' placeholder='Operator note for this deposit'>" . admin_h($note) . "</textarea><div class='inline-actions'>" . $reviewButtons . "<button class='btn' type='submit' name='action' value='save_note'>Save note</button></div></form></td>
    </tr>";
  }
  $body .= "</tbody></table></div>";
}
admin_layout('Deposits Queue', $body);
