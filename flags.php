<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();

$pdo = db();
$msg = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $key = trim((string)($_POST['key'] ?? ''));
  $enabled = isset($_POST['enabled']) ? 1 : 0;
  if ($key !== '') {
    $stmt = $pdo->prepare('UPDATE feature_flags SET enabled=?, updated_at=? WHERE flag_key=?');
    $stmt->execute([$enabled, time(), $key]);
    if ($stmt->rowCount() === 0) {
      $pdo->prepare('INSERT INTO feature_flags(flag_key,enabled,updated_at) VALUES (?,?,?)')->execute([$key, $enabled, time()]);
    }
    $msg = 'Updated';
  }
}

$rows = $pdo->query('SELECT flag_key,enabled,updated_at FROM feature_flags ORDER BY flag_key')->fetchAll(PDO::FETCH_ASSOC) ?: [];

$body = "<div class='card'><h2>Feature Flags</h2>";
if ($msg) $body .= "<p><span class='pill'>".htmlspecialchars($msg)."</span></p>";
$body .= "<table><thead><tr><th>Key</th><th>Enabled</th><th>Updated</th><th>Action</th></tr></thead><tbody>";
foreach ($rows as $r) {
  $k = htmlspecialchars((string)$r['flag_key']);
  $enabled = (int)$r['enabled'] === 1;
  $checked = $enabled ? 'checked' : '';
  $pill = $enabled ? "<span class='pill ok'>ON</span>" : "<span class='pill bad'>OFF</span>";
  $body .= "<tr><td>{$k}</td><td>{$pill}</td><td>".date('Y-m-d H:i', (int)$r['updated_at'])."</td><td>
    <form method='post' style='display:flex;gap:10px;align-items:center'>
      <input type='hidden' name='key' value='{$k}'>
      <label style='display:flex;gap:6px;align-items:center'>
        <input type='checkbox' name='enabled' value='1' {$checked}>
        <span>enabled</span>
      </label>
      <button class='btn' type='submit'>Save</button>
    </form>
  </td></tr>";
}
$body .= "</tbody></table></div>";

admin_layout('Feature Flags', $body);
