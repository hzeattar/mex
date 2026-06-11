
<?php
require_once __DIR__ . '/admin/includes/auth.php';
require_once __DIR__ . '/api/lib/ledger.php';
admin_require();

$pdo = db();
$msg = '';
$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $act = trim((string)($_POST['action'] ?? 'save_note'));
    $note = trim((string)($_POST['note'] ?? ''));
    if ($id <= 0) throw new RuntimeException('Invalid withdrawal id');
    if (!in_array($act, ['approve','reject','complete','save_note'], true)) $act = 'save_note';
    $pdo->beginTransaction();
    $st = db_driver() === 'mysql' ? $pdo->prepare('SELECT * FROM withdrawals WHERE id=? FOR UPDATE') : $pdo->prepare('SELECT * FROM withdrawals WHERE id=?');
    $st->execute([$id]);
    $w = $st->fetch(PDO::FETCH_ASSOC);
    if (!$w) throw new RuntimeException('Withdrawal not found');
    $status = strtolower((string)($w['status'] ?? ''));
    $now = time();

    if ($act === 'save_note') {
      $pdo->prepare('UPDATE withdrawals SET admin_note=?, updated_at=? WHERE id=?')->execute([$note, $now, $id]);
      $pdo->commit();
      admin_audit_log('save_withdraw_note', 'withdrawal', $id, 'Withdrawal note saved', ['note' => $note]);
      $msg = 'Withdrawal note saved';
    } elseif ($act === 'reject' && in_array($status, ['requested','pending','review'], true)) {
      hold_release((int)$w['hold_id'], 'released');
      $pdo->prepare('UPDATE withdrawals SET status="rejected", updated_at=?, admin_note=? WHERE id=?')->execute([$now, $note !== '' ? $note : 'Rejected by admin', $id]);
      $pdo->commit();
      admin_notify_withdrawal_status((int)$w['user_id'], (float)$w['amount'], (string)$w['currency'], 'rejected', $id);
      admin_audit_log('reject_withdrawal', 'withdrawal', $id, 'Withdrawal rejected and hold released', ['amount' => (float)$w['amount'], 'currency' => (string)$w['currency'], 'note' => $note]);
      $msg = 'Withdrawal rejected and hold released';
    } elseif ($act === 'approve' && in_array($status, ['requested','pending','review'], true)) {
      if ((int)($w['hold_id'] ?? 0) <= 0) {
        $hid = hold_create((int)$w['user_id'], (string)$w['currency'], (float)$w['amount'], 'withdraw_request', time() + 3600);
        $pdo->prepare('UPDATE withdrawals SET hold_id=? WHERE id=?')->execute([$hid, $id]);
        $w['hold_id'] = $hid;
      }
      $pdo->prepare('UPDATE withdrawals SET status="approved", updated_at=?, admin_note=? WHERE id=?')->execute([$now, $note !== '' ? $note : 'Approved by admin', $id]);
      $pdo->commit();
      admin_notify_withdrawal_status((int)$w['user_id'], (float)$w['amount'], (string)$w['currency'], 'approved', $id);
      admin_audit_log('approve_withdrawal', 'withdrawal', $id, 'Withdrawal approved', ['amount' => (float)$w['amount'], 'currency' => (string)$w['currency'], 'note' => $note]);
      $msg = 'Withdrawal approved';
    } elseif ($act === 'complete' && in_array($status, ['approved','processing'], true)) {
      if ((int)($w['hold_id'] ?? 0) <= 0) {
        $av = wallet_available((int)$w['user_id'], (string)$w['currency']);
        if (((float)($av['available'] ?? 0)) + 1e-9 < (float)$w['amount']) {
          throw new RuntimeException('Insufficient available balance to complete this withdrawal');
        }
      }
      ledger_add((int)$w['user_id'], (string)$w['currency'], -((float)$w['amount']), 'withdrawal_debit', 'withdrawal', (string)$id, ['method'=>$w['method'], 'admin'=>true]);
      hold_release((int)$w['hold_id'], 'released');
      $pdo->prepare('UPDATE withdrawals SET status="completed", updated_at=?, completed_at=?, admin_note=? WHERE id=?')->execute([$now, $now, $note !== '' ? $note : (string)($w['admin_note'] ?? 'Completed by admin'), $id]);
      $pdo->commit();
      admin_notify_withdrawal_status((int)$w['user_id'], (float)$w['amount'], (string)$w['currency'], 'completed', $id);
      admin_audit_log('complete_withdrawal', 'withdrawal', $id, 'Withdrawal completed and ledger debited', ['amount' => (float)$w['amount'], 'currency' => (string)$w['currency'], 'note' => $note]);
      $msg = 'Withdrawal completed';
    } else {
      $pdo->commit();
      $msg = 'No valid transition for the current withdrawal state';
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
  $where[] = '(CAST(w.id AS CHAR) LIKE ? OR CAST(w.user_id AS CHAR) LIKE ? OR w.method LIKE ? OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR w.admin_note LIKE ?)';
  $needle = '%' . $q . '%';
  array_push($params, $needle, $needle, $needle, $needle, $needle, $needle, $needle);
}
if ($status !== '') { $where[] = 'w.status = ?'; $params[] = $status; }
$sql = 'SELECT w.id,w.user_id,w.method,w.currency,w.amount,w.status,w.hold_id,w.risk_score,w.admin_note,w.details_json,w.created_at,w.updated_at,w.completed_at,u.username,u.first_name,u.last_name FROM withdrawals w LEFT JOIN users u ON u.id=w.user_id';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY w.id DESC LIMIT ' . (int)$limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$stats = [
  'Queue size' => (string)count($rows),
  'Requested' => (string)($pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status IN ('requested','pending','review')")->fetchColumn() ?: 0),
  'Approved' => (string)($pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status IN ('approved','processing')")->fetchColumn() ?: 0),
  'Completed' => (string)($pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status='completed'")->fetchColumn() ?: 0),
];

$body = "<div class='split'><div><h1 class='section-title'>Withdrawals Queue</h1><div class='muted small'>Move withdrawal requests through approval, release, and completion with clearer notes and safer status transitions.</div></div><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div>";
if ($msg !== '') $body .= "<div class='card'><span class='pill ok'>" . admin_h($msg) . "</span></div>";
if ($error !== '') $body .= "<div class='card'><span class='pill bad'>" . admin_h($error) . "</span></div>";
$body .= "<div class='stats-grid'>";
foreach ($stats as $label => $value) $body .= admin_stat_card($label, $value);
$body .= "</div>";
$body .= "<form class='card toolbar' method='get'>
  <label class='grow'>Search<input name='q' value='" . admin_h($q) . "' placeholder='withdrawal id, user id, method, username, note'></label>
  <label>Status<select name='status'><option value=''>All</option><option value='requested'" . ($status==='requested'?' selected':'') . ">Requested</option><option value='approved'" . ($status==='approved'?' selected':'') . ">Approved</option><option value='completed'" . ($status==='completed'?' selected':'') . ">Completed</option><option value='rejected'" . ($status==='rejected'?' selected':'') . ">Rejected</option></select></label>
  <label>Limit<input type='number' min='20' max='300' name='limit' value='" . (int)$limit . "'></label>
  <button class='btn' type='submit'>Apply</button>
  <a class='btn' href='/admin/withdrawals.php'>Reset</a>
</form>";
if (!$rows) {
  $body .= "<div class='card empty'>No withdrawals matched the current filters.</div>";
} else {
  $body .= "<div class='card table-wrap'><table><thead><tr><th>ID</th><th>User</th><th>Method</th><th>Amount</th><th>Status</th><th>Details</th><th>Hold / risk</th><th>Review</th></tr></thead><tbody>";
  foreach ($rows as $r) {
    $statusLower = strtolower((string)$r['status']);
    $reviewButtons = "<button class='btn' type='submit' name='action' value='save_note'>Save note</button>";
    if (in_array($statusLower, ['pending','requested','review'], true)) {
      $reviewButtons = "<button class='btn' type='submit' name='action' value='approve'>Approve</button><button class='btn danger' type='submit' name='action' value='reject'>Reject</button><button class='btn' type='submit' name='action' value='save_note'>Save note</button>";
    } elseif (in_array($statusLower, ['approved','processing'], true)) {
      $reviewButtons = "<button class='btn' type='submit' name='action' value='complete'>Complete</button><button class='btn' type='submit' name='action' value='save_note'>Save note</button>";
    }
    $body .= "<tr>
      <td>#" . (int)$r['id'] . "<div class='muted small'>" . admin_format_ts($r['created_at']) . "</div></td>
      <td><strong>User #" . (int)$r['user_id'] . "</strong><div class='muted small'>" . admin_h(admin_name_for_row($r)) . "</div></td>
      <td><strong>" . admin_h((string)$r['method']) . "</strong><div class='muted small'>" . admin_h((string)$r['currency']) . "</div></td>
      <td><strong>" . admin_h((string)$r['amount']) . "</strong><div class='muted small'>" . admin_h((string)$r['currency']) . "</div></td>
      <td>" . admin_status_pill((string)$r['status']) . ($r['completed_at'] ? "<div class='muted small'>Completed " . admin_format_ts($r['completed_at']) . "</div>" : '') . "</td>
      <td>" . admin_parse_json_pairs((string)($r['details_json'] ?? ''), 6) . ($r['admin_note'] ? "<div class='admin-note' style='margin-top:8px'>" . nl2br(admin_h((string)$r['admin_note'])) . "</div>" : '') . "</td>
      <td><div><strong>Hold #" . admin_h((string)$r['hold_id']) . "</strong></div><div class='muted small'>Risk score: " . admin_h((string)$r['risk_score']) . "</div><div class='muted small'>Updated " . admin_format_ts($r['updated_at']) . "</div></td>
      <td style='min-width:340px'><form method='post' class='stack'>" . admin_csrf_input() . "<input type='hidden' name='id' value='" . (int)$r['id'] . "'><textarea name='note' rows='3' placeholder='Operator note for this withdrawal'>" . admin_h((string)$r['admin_note']) . "</textarea><div class='inline-actions'>" . $reviewButtons . "</div></form></td>
    </tr>";
  }
  $body .= "</tbody></table></div>";
}
admin_layout('Withdrawals Queue', $body);
