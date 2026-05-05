<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();

$pdo = db();
$uid = (int)($_GET['user_id'] ?? 0);
$where = '';
$params = [];
if ($uid > 0) {
  $where = 'WHERE user_id=?';
  $params[] = $uid;
}

$stmt = $pdo->prepare("SELECT id,user_id,currency,amount,type,ref_type,ref_id,created_at FROM ledger_entries {$where} ORDER BY id DESC LIMIT 300");
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$filter = "<form method='get' style='display:flex;gap:8px;align-items:center'>
  <input name='user_id' placeholder='Filter user_id' value='".htmlspecialchars((string)$uid, ENT_QUOTES)."'>
  <button class='btn' type='submit'>Filter</button>
  <a class='btn' href='/admin/ledger.php'>Reset</a>
</form>";

$body = "<div class='card'><h2>Ledger</h2>{$filter}<div style='height:10px'></div><table><thead><tr>
<th>ID</th><th>User</th><th>Cur</th><th>Amount</th><th>Type</th><th>Ref</th><th>Created</th>
</tr></thead><tbody>";
foreach ($rows as $r) {
  $pill = ((float)$r['amount'] >= 0) ? "<span class='pill ok'>+".htmlspecialchars((string)$r['amount'])."</span>" : "<span class='pill bad'>".htmlspecialchars((string)$r['amount'])."</span>";
  $ref = htmlspecialchars((string)$r['ref_type']).":".htmlspecialchars((string)$r['ref_id']);
  $body .= "<tr><td>{$r['id']}</td><td><a href='/admin/ledger.php?user_id={$r['user_id']}'>".(int)$r['user_id']."</a></td><td>".htmlspecialchars((string)$r['currency'])."</td><td>{$pill}</td><td>".htmlspecialchars((string)$r['type'])."</td><td>{$ref}</td><td>".date('Y-m-d H:i', (int)$r['created_at'])."</td></tr>";
}
$body .= "</tbody></table></div>";

admin_layout('Ledger', $body);
