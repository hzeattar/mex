
<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$now = time();
$msg = '';
$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $action = trim((string)($_POST['action'] ?? 'save_note'));
    $note = trim((string)($_POST['note'] ?? ''));
    if ($id <= 0) throw new RuntimeException('Invalid KYC request id');
    if (!in_array($action, ['approve','reject','save_note'], true)) $action = 'save_note';

    $sets = ['admin_note = ?', 'updated_at = ?'];
    $params = [$note, $now];
    $summary = 'Admin note updated';
    if ($action === 'approve') { $sets[] = 'status = ?'; $params[] = 'approved'; $summary = 'KYC approved'; }
    elseif ($action === 'reject') { $sets[] = 'status = ?'; $params[] = 'rejected'; $summary = 'KYC rejected'; }
    $params[] = $id;

    $st = $pdo->prepare('UPDATE kyc_requests SET ' . implode(',', $sets) . ' WHERE id=?');
    $st->execute($params);
    admin_audit_log($action === 'save_note' ? 'save_kyc_note' : ($action . '_kyc'), 'kyc_request', $id, $summary, ['note' => $note]);
    $msg = $summary;
  } catch (Throwable $e) {
    $error = $e->getMessage();
  }
}

$q = trim((string)($_GET['q'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$limit = max(20, min(300, (int)($_GET['limit'] ?? 120)));
$where = [];
$params = [];
if ($q !== '') {
  $where[] = '(CAST(k.id AS CHAR) LIKE ? OR CAST(k.user_id AS CHAR) LIKE ? OR k.full_name LIKE ? OR k.country LIKE ? OR k.doc_number LIKE ? OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
  $needle = '%' . $q . '%';
  array_push($params, $needle, $needle, $needle, $needle, $needle, $needle, $needle, $needle);
}
if ($status !== '') { $where[] = 'k.status = ?'; $params[] = $status; }
$sql = "SELECT k.id,k.user_id,k.status,k.full_name,k.country,k.doc_type,k.doc_number,k.admin_note,k.created_at,k.updated_at,u.username,u.first_name,u.last_name FROM kyc_requests k LEFT JOIN users u ON u.id=k.user_id";
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY k.id DESC LIMIT ' . (int)$limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$items = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$stats = [
  'Queue size' => (string)count($items),
  'Pending' => (string)($pdo->query("SELECT COUNT(*) FROM kyc_requests WHERE status IN ('pending','under_review')")->fetchColumn() ?: 0),
  'Approved' => (string)($pdo->query("SELECT COUNT(*) FROM kyc_requests WHERE status='approved'")->fetchColumn() ?: 0),
  'Rejected' => (string)($pdo->query("SELECT COUNT(*) FROM kyc_requests WHERE status='rejected'")->fetchColumn() ?: 0),
];

$body = "<div class='split'><div><h1 class='section-title'>KYC Review Queue</h1><div class='muted small'>Approve, reject, or annotate identity verification submissions without leaving the backoffice.</div></div><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div>";
if ($msg !== '') $body .= "<div class='card'><span class='pill ok'>" . admin_h($msg) . "</span></div>";
if ($error !== '') $body .= "<div class='card'><span class='pill bad'>" . admin_h($error) . "</span></div>";
$body .= "<div class='stats-grid'>";
foreach ($stats as $label => $value) $body .= admin_stat_card($label, $value);
$body .= "</div>";
$body .= "<form class='card toolbar' method='get'>
  <label class='grow'>Search<input name='q' value='" . admin_h($q) . "' placeholder='user id, name, username, document'></label>
  <label>Status<select name='status'><option value=''>All</option><option value='pending'" . ($status==='pending'?' selected':'') . ">Pending</option><option value='approved'" . ($status==='approved'?' selected':'') . ">Approved</option><option value='rejected'" . ($status==='rejected'?' selected':'') . ">Rejected</option></select></label>
  <label>Limit<input type='number' min='20' max='300' name='limit' value='" . (int)$limit . "'></label>
  <button class='btn' type='submit'>Apply</button>
  <a class='btn' href='/admin/kyc.php'>Reset</a>
</form>";
if (!$items) {
  $body .= "<div class='card empty'>No KYC requests matched the current filters.</div>";
} else {
  $body .= "<div class='card table-wrap'><table><thead><tr><th>ID</th><th>User</th><th>Status</th><th>Identity</th><th>Documents</th><th>Files</th><th>Review</th></tr></thead><tbody>";
  foreach ($items as $it) {
    $id = (int)$it['id'];
    $body .= "<tr>
      <td>#{$id}<div class='muted small'>" . admin_format_ts($it['created_at']) . "</div></td>
      <td><strong>User #" . (int)$it['user_id'] . "</strong><div class='muted small'>" . admin_h(admin_name_for_row($it)) . "</div></td>
      <td>" . admin_status_pill((string)$it['status']) . "<div class='muted small'>Updated " . admin_format_ts($it['updated_at']) . "</div></td>
      <td><strong>" . admin_h($it['full_name']) . "</strong><div class='muted small'>" . admin_h($it['country']) . "</div></td>
      <td><div><strong>" . admin_h($it['doc_type']) . "</strong></div><div class='muted small'>" . admin_h($it['doc_number']) . "</div></td>
      <td><div class='inline-actions'><a class='btn' href='/admin/kyc_file.php?id={$id}&kind=front' target='_blank'>Front</a><a class='btn' href='/admin/kyc_file.php?id={$id}&kind=back' target='_blank'>Back</a><a class='btn' href='/admin/kyc_file.php?id={$id}&kind=selfie' target='_blank'>Selfie</a></div></td>
      <td style='min-width:320px'><form method='post' class='stack'>" . admin_csrf_input() . "<input type='hidden' name='id' value='{$id}'><textarea name='note' rows='3' placeholder='Admin note for this KYC request'>" . admin_h($it['admin_note']) . "</textarea><div class='inline-actions'><button class='btn' type='submit' name='action' value='approve'>Approve</button><button class='btn danger' type='submit' name='action' value='reject'>Reject</button><button class='btn' type='submit' name='action' value='save_note'>Save note</button></div></form></td>
    </tr>";
  }
  $body .= "</tbody></table></div>";
}
admin_layout('KYC Review Queue', $body);
