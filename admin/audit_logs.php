<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$q = trim((string)($_GET['q'] ?? ''));
$action = trim((string)($_GET['action'] ?? ''));
$entity = trim((string)($_GET['entity'] ?? ''));
$expr = admin_audit_select_expr('l');
$where = [];
$params = [];
if ($q !== '') {
  $needle = '%' . $q . '%';
  $where[] = '(' . $expr['actor'] . ' LIKE ? OR ' . $expr['summary'] . ' LIKE ? OR ' . $expr['payload'] . ' LIKE ? OR CAST(' . $expr['entity_id'] . ' AS CHAR) LIKE ?)';
  array_push($params, $needle, $needle, $needle, $needle);
}
if ($action !== '') { $where[] = $expr['action'] . ' = ?'; $params[] = $action; }
if ($entity !== '') { $where[] = $expr['entity'] . ' = ?'; $params[] = $entity; }
$sql = 'SELECT l.id, ' . $expr['actor'] . ' AS admin_email, ' . $expr['action'] . ' AS action, ' . $expr['entity'] . ' AS entity, ' . $expr['entity_id'] . ' AS entity_id, ' . $expr['summary'] . ' AS summary, ' . $expr['payload'] . ' AS payload_json, ' . $expr['ip'] . ' AS ip, ' . $expr['created_at'] . ' AS created_at FROM admin_audit_logs l';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY l.id DESC LIMIT 300';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
$stats = [
  'Entries shown' => (string)count($rows),
  'Unique actors' => (string)count(array_unique(array_filter(array_map(fn($r)=>(string)$r['admin_email'], $rows)))),
  'Actions' => (string)count(array_unique(array_filter(array_map(fn($r)=>(string)$r['action'], $rows)))),
];
$body = "<div class='split'><div><h1 class='section-title'>Audit Logs</h1><div class='muted small'>Every important admin action is recorded here with actor, entity, summary, and timestamp.</div></div><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div>";
$body .= "<div class='stats-grid'>";
foreach ($stats as $label => $value) $body .= admin_stat_card($label, $value);
$body .= "</div>";
$body .= "<form class='card toolbar' method='get'>
  <label class='grow'>Search<input name='q' value='" . admin_h($q) . "' placeholder='email, summary, entity id'></label>
  <label>Action<input name='action' value='" . admin_h($action) . "' placeholder='confirm_deposit'></label>
  <label>Entity<input name='entity' value='" . admin_h($entity) . "' placeholder='deposit'></label>
  <button class='btn' type='submit'>Filter</button>
  <a class='btn' href='/admin/audit_logs.php'>Reset</a>
</form>";
if (!$rows) {
  $body .= "<div class='card empty'>No audit entries matched the current filters.</div>";
} else {
  $body .= "<div class='card table-wrap'><table><thead><tr><th>ID</th><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th><th>Source</th></tr></thead><tbody>";
  foreach ($rows as $r) {
    $summary = trim((string)($r['summary'] ?? ''));
    if ($summary === '') $summary = admin_parse_json_pairs((string)($r['payload_json'] ?? ''), 5);
    else $summary = '<div class="admin-note">' . nl2br(admin_h($summary)) . '</div>';
    $body .= "<tr>
      <td>#" . (int)$r['id'] . "</td>
      <td>" . admin_format_ts($r['created_at']) . "</td>
      <td>" . admin_h($r['admin_email']) . "</td>
      <td>" . admin_h($r['action']) . "</td>
      <td><strong>" . admin_h($r['entity']) . "</strong><div class='muted small'>#" . (int)$r['entity_id'] . "</div></td>
      <td>" . $summary . "</td>
      <td><div class='muted small'>IP: " . admin_h($r['ip']) . "</div></td>
    </tr>";
  }
  $body .= "</tbody></table></div>";
}
admin_layout('Audit Logs', $body);
