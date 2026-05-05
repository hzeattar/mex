<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/levels.php';
admin_require();
$pdo = db();
vp_feature_bootstrap($pdo, db_driver());
$msg = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $action = (string)($_POST['action'] ?? '');
  $now = time();
  if ($action === 'save') {
    $id = (int)($_POST['id'] ?? 0);
    $code = strtolower(trim((string)($_POST['level_code'] ?? '')));
    $nameEn = trim((string)($_POST['name_en'] ?? ''));
    $nameAr = trim((string)($_POST['name_ar'] ?? ''));
    $nameRu = trim((string)($_POST['name_ru'] ?? ''));
    $perksEn = trim((string)($_POST['perks_en'] ?? ''));
    $perksAr = trim((string)($_POST['perks_ar'] ?? ''));
    $perksRu = trim((string)($_POST['perks_ru'] ?? ''));
    $min = (float)($_POST['min_deposit_total'] ?? 0);
    $sort = (int)($_POST['sort_order'] ?? 0);
    $status = isset($_POST['enabled']) ? 'active' : 'disabled';
    if ($code === '' || !preg_match('/^[a-z0-9_\-]{2,64}$/', $code)) {
      $msg = 'Level code must use a-z, 0-9, dash or underscore.';
    } elseif ($nameEn === '' || $nameAr === '' || $nameRu === '') {
      $msg = 'Please fill the level name in EN/AR/RU.';
    } else {
      if ($id > 0) {
        $pdo->prepare("UPDATE customer_levels SET level_code=?, name_en=?, name_ar=?, name_ru=?, perks_en=?, perks_ar=?, perks_ru=?, min_deposit_total=?, sort_order=?, status=?, updated_at=? WHERE id=?")
          ->execute([$code,$nameEn,$nameAr,$nameRu,$perksEn,$perksAr,$perksRu,$min,$sort,$status,$now,$id]);
        $msg = 'Updated';
      } else {
        $pdo->prepare("INSERT INTO customer_levels(level_code,name_en,name_ar,name_ru,perks_en,perks_ar,perks_ru,min_deposit_total,sort_order,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
          ->execute([$code,$nameEn,$nameAr,$nameRu,$perksEn,$perksAr,$perksRu,$min,$sort,$status,$now,$now]);
        $msg = 'Created';
      }
    }
  }
  if ($action === 'toggle') {
    $id = (int)($_POST['id'] ?? 0);
    $cur = (string)($_POST['cur'] ?? 'disabled');
    $next = $cur === 'active' ? 'disabled' : 'active';
    $pdo->prepare('UPDATE customer_levels SET status=?, updated_at=? WHERE id=?')->execute([$next, $now, $id]);
    $msg = 'Toggled';
  }
}

$editId = (int)($_GET['edit'] ?? 0);
$edit = null;
if ($editId > 0) {
  $st = $pdo->prepare('SELECT * FROM customer_levels WHERE id=?');
  $st->execute([$editId]);
  $edit = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
$rows = $pdo->query("SELECT * FROM customer_levels ORDER BY min_deposit_total ASC, sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
$activeCount = count(array_filter($rows, fn($row)=>($row['status'] ?? 'disabled') === 'active'));
$highestUnlock = 0.0;
foreach ($rows as $row) { $highestUnlock = max($highestUnlock, (float)($row['min_deposit_total'] ?? 0)); }
$gatedContracts = 0;
try { $gatedContracts = (int)$pdo->query("SELECT COUNT(*) FROM invest_plans WHERE COALESCE(product_kind,'plan')='contract' AND required_level_id IS NOT NULL")->fetchColumn(); } catch (Throwable $e) {}

$body = "<div class='split'><div><h1 class='section-title'>Customer Levels</h1><div class='muted small'>Design the premium access ladder used across Earn, contracts, and copy-signal eligibility.</div></div><div class='inline-actions'><a class='btn' href='/admin/contracts.php'>Open contracts</a><a class='btn' href='/admin/signals.php'>Open signal desk</a></div></div>";
$body .= "<div class='stats-grid'>";
$body .= admin_stat_card('Published levels', (string)count($rows), 'All configured deposit tiers in the current environment.');
$body .= admin_stat_card('Active levels', (string)$activeCount, 'Tiers that are currently used in level calculations.');
$body .= admin_stat_card('Top unlock', '$' . number_format($highestUnlock, 0), 'Highest confirmed-deposit threshold currently published.');
$body .= admin_stat_card('Gated contracts', (string)$gatedContracts, 'Contracts that require a customer level before subscription.');
$body .= "</div>";

$body .= "<div class='card'><h2>Level editor</h2><p class='muted small'>Levels are calculated from each user\'s confirmed deposits total. Contracts can require a minimum level before they become available.</p>";
if ($msg) $body .= "<p><span class='pill'>".h($msg)."</span></p>";
$body .= "<h3>".($edit ? 'Edit Level' : 'Add Level')."</h3><form method='post' class='grid'>";
$body .= "<input type='hidden' name='action' value='save'><input type='hidden' name='id' value='".h($edit['id'] ?? 0)."'>";
$body .= "<label>Level code<br><input name='level_code' value='".h($edit['level_code'] ?? '')."' placeholder='level1'></label>";
$body .= "<label>Min confirmed deposits (USDT)<br><input type='number' step='0.01' name='min_deposit_total' value='".h($edit['min_deposit_total'] ?? 0)."'></label>";
$body .= "<label>Sort order<br><input type='number' name='sort_order' value='".h($edit['sort_order'] ?? 0)."'></label>";
$enabled = (($edit['status'] ?? 'active') === 'active');
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='enabled' ".($enabled?'checked':'')."> Enabled</label>";
$body .= "<label>Name (EN)<br><input name='name_en' value='".h($edit['name_en'] ?? '')."'></label>";
$body .= "<label>Name (AR)<br><input name='name_ar' value='".h($edit['name_ar'] ?? '')."'></label>";
$body .= "<label>Name (RU)<br><input name='name_ru' value='".h($edit['name_ru'] ?? '')."'></label>";
$body .= "<label style='grid-column:1/-1'>Perks (EN, one per line)<br><textarea name='perks_en' rows='4'>".h($edit['perks_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Perks (AR, one per line)<br><textarea name='perks_ar' rows='4'>".h($edit['perks_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Perks (RU, one per line)<br><textarea name='perks_ru' rows='4'>".h($edit['perks_ru'] ?? '')."</textarea></label>";
$body .= "<div style='grid-column:1/-1;display:flex;gap:10px;align-items:center;margin-top:10px'><button class='btn' type='submit'>Save</button><a class='btn' href='/admin/customer_levels.php'>Clear</a></div></form></div>";

$body .= "<div class='card'><h3>Current Levels</h3><table><thead><tr><th>ID</th><th>Code</th><th>Name</th><th>Min deposits</th><th>Status</th><th>Actions</th></tr></thead><tbody>";
foreach ($rows as $r) {
  $body .= "<tr><td>".h($r['id'])."</td><td><code>".h($r['level_code'])."</code></td><td>".h($r['name_en'])."</td><td>$".h($r['min_deposit_total'])."</td><td>".h($r['status'])."</td><td style='white-space:nowrap'><a class='btn' href='/admin/customer_levels.php?edit=".h($r['id'])."'>Edit</a> <form method='post' style='display:inline'><input type='hidden' name='action' value='toggle'><input type='hidden' name='id' value='".h($r['id'])."'><input type='hidden' name='cur' value='".h($r['status'])."'><button class='btn' type='submit'>".($r['status']==='active'?'Disable':'Enable')."</button></form></td></tr>";
}
$body .= "</tbody></table></div>";

admin_layout('Customer Levels', $body);
