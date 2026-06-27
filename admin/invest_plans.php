<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  admin_verify_csrf();
  $action = (string)($_POST['action'] ?? '');
  $now = time();

  if ($action === 'save') {
    $id = strtolower(trim((string)($_POST['id'] ?? '')));
    $isEdit = (int)($_POST['is_edit'] ?? 0) === 1;

    // Auto-generate plan id when creating new plan
    if (!$isEdit && $id==='') {
      try {
        $id = 'plan_' . bin2hex(random_bytes(6));
      } catch (Throwable $e) {
        $id = 'plan_' . substr(md5((string)microtime(true)), 0, 12);
      }
    }


    $term_days = (int)($_POST['term_days'] ?? 0);
    $roi_percent = (float)($_POST['roi_percent'] ?? 0);
    $min_amount = (float)($_POST['min_amount'] ?? 0);
    $max_amount = (float)($_POST['max_amount'] ?? 0);
    $risk = trim((string)($_POST['risk'] ?? 'Low'));

    $payout_schedule = strtolower(trim((string)($_POST['payout_schedule'] ?? 'end')));
    if (!in_array($payout_schedule, ['daily','weekly','end'], true)) $payout_schedule = 'end';

    $early_exit_allowed = isset($_POST['early_exit_allowed']) ? 1 : 0;
    $early_exit_penalty_percent = (float)($_POST['early_exit_penalty_percent'] ?? 0);

    $sort_order = (int)($_POST['sort_order'] ?? 0);
    $status = isset($_POST['enabled']) ? 'active' : 'disabled';

    $name_en = trim((string)($_POST['name_en'] ?? ''));
    $name_ar = trim((string)($_POST['name_ar'] ?? ''));
    $name_ru = trim((string)($_POST['name_ru'] ?? ''));

    $desc_en = trim((string)($_POST['desc_en'] ?? ''));
    $desc_ar = trim((string)($_POST['desc_ar'] ?? ''));
    $desc_ru = trim((string)($_POST['desc_ru'] ?? ''));

    $details_en = trim((string)($_POST['details_en'] ?? ''));
    $details_ar = trim((string)($_POST['details_ar'] ?? ''));
    $details_ru = trim((string)($_POST['details_ru'] ?? ''));

    if ($id === '' || !preg_match('/^[a-z0-9_\-]{3,64}$/', $id)) {
      $msg = 'Invalid ID (use a-z, 0-9, dash/underscore).';
    } elseif ($term_days <= 0 || $roi_percent <= 0 || $min_amount <= 0) {
      $msg = 'term_days, roi_percent, min_amount must be > 0.';
    } elseif ($name_en==='' || $name_ar==='' || $name_ru==='') {
      $msg = 'Please fill plan name in EN/AR/RU.';
    } else {
      if ($max_amount <= 0) $max_amount = 0; // 0 = no max
      if ($early_exit_penalty_percent < 0) $early_exit_penalty_percent = 0;

      if ($isEdit) {
        $stmt = $pdo->prepare("UPDATE invest_plans SET 
          product_kind='plan',
          name=?, name_en=?, name_ar=?, name_ru=?,
          desc_en=?, desc_ar=?, desc_ru=?,
          details_en=?, details_ar=?, details_ru=?,
          term_days=?, roi_percent=?, min_amount=?, max_amount=?, risk=?,
          payout_schedule=?, early_exit_allowed=?, early_exit_penalty_percent=?,
          sort_order=?, status=?, updated_at=?
          WHERE id=?");
        $stmt->execute([
          $name_en,
          $name_en,$name_ar,$name_ru,
          $desc_en,$desc_ar,$desc_ru,
          $details_en,$details_ar,$details_ru,
          $term_days,$roi_percent,$min_amount,$max_amount,$risk,
          $payout_schedule,$early_exit_allowed,$early_exit_penalty_percent,
          $sort_order,$status,$now,
          $id
        ]);
        $msg = 'Updated';
      } else {
        $stmt = $pdo->prepare("INSERT INTO invest_plans(
          id,name,name_en,name_ar,name_ru,product_kind,
          desc_en,desc_ar,desc_ru,
          details_en,details_ar,details_ru,
          term_days,roi_percent,min_amount,max_amount,risk,
          payout_schedule,early_exit_allowed,early_exit_penalty_percent,
          sort_order,status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
          $id,$name_en,$name_en,$name_ar,$name_ru,'plan',
          $desc_en,$desc_ar,$desc_ru,
          $details_en,$details_ar,$details_ru,
          $term_days,$roi_percent,$min_amount,$max_amount,$risk,
          $payout_schedule,$early_exit_allowed,$early_exit_penalty_percent,
          $sort_order,$status,$now,$now
        ]);
        $msg = 'Created';
      }
    }
  }

  if ($action === 'toggle') {
    $id = (string)($_POST['id'] ?? '');
    $cur = (string)($_POST['cur'] ?? 'disabled');
    $next = ($cur === 'active') ? 'disabled' : 'active';
    $pdo->prepare("UPDATE invest_plans SET status=?, updated_at=? WHERE id=?")->execute([$next, time(), $id]);
    $msg = 'Toggled';
  }
}

$editId = (string)($_GET['edit'] ?? '');
$edit = null;
if ($editId !== '') {
  $st = $pdo->prepare("SELECT * FROM invest_plans WHERE id=? AND COALESCE(product_kind,'plan')='plan'");
  $st->execute([$editId]);
  $edit = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

$rows = $pdo->query("SELECT * FROM invest_plans WHERE COALESCE(product_kind,'plan')='plan' ORDER BY sort_order ASC, term_days ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];

$body = "<div class='card'><h2>Investment Plans</h2><p class='muted'>This screen manages classic investment plans only. Contracts have a separate screen.</p>";
$body .= "<p style='opacity:.85'>Manage plans shown in the Mini App. Names + descriptions support EN/AR/RU. Keep plans disabled instead of deleting (audit-safe).</p>";
if ($msg) $body .= "<p><span class='pill'>".h($msg)."</span></p>";

$body .= "<h3>".($edit ? "Edit Plan" : "Add Plan")."</h3>";
$body .= "<form method='post' class='grid'>";
$body .= "<input type='hidden' name='action' value='save'>";
$body .= "<input type='hidden' name='is_edit' value='".($edit?1:0)."'>";

$idVal = $edit['id'] ?? '';
$body .= "<label>ID (slug)<br><input name='id' value='".h($idVal)."' ".($edit?"readonly":"placeholder='e.g. starter_14'")."></label>";

$body .= "<label>Sort Order<br><input name='sort_order' type='number' value='".h($edit['sort_order'] ?? 0)."'></label>";
$body .= "<label>Risk label<br><input name='risk' value='".h($edit['risk'] ?? 'Low')."' placeholder='Low / Medium / High'></label>";

$body .= "<label>Term (days)<br><input name='term_days' type='number' value='".h($edit['term_days'] ?? 14)."'></label>";
$body .= "<label>ROI % (total)<br><input name='roi_percent' type='number' step='0.01' value='".h($edit['roi_percent'] ?? 6)."'></label>";
$body .= "<label>Min Amount<br><input name='min_amount' type='number' step='0.01' value='".h($edit['min_amount'] ?? 50)."'></label>";
$body .= "<label>Max Amount (0 = none)<br><input name='max_amount' type='number' step='0.01' value='".h($edit['max_amount'] ?? 0)."'></label>";

$ps = $edit['payout_schedule'] ?? 'end';
$body .= "<label>Payout schedule<br><select name='payout_schedule'>";
$body .= "<option value='daily' ".($ps==='daily'?'selected':'').">daily</option>";
$body .= "<option value='weekly' ".($ps==='weekly'?'selected':'').">weekly</option>";
$body .= "<option value='end' ".($ps==='end'?'selected':'').">end</option>";
$body .= "</select></label>";

$ee = (int)($edit['early_exit_allowed'] ?? 0) === 1;
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='early_exit_allowed' ".($ee?'checked':'')."> Early exit allowed</label>";
$body .= "<label>Early exit penalty %<br><input name='early_exit_penalty_percent' type='number' step='0.01' value='".h($edit['early_exit_penalty_percent'] ?? 0)."'></label>";

$enabled = (($edit['status'] ?? 'active') === 'active');
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='enabled' ".($enabled?'checked':'')."> Enabled</label>";

$body .= "<label>Name (EN)<br><input name='name_en' value='".h($edit['name_en'] ?? $edit['name'] ?? '')."'></label>";
$body .= "<label>Name (AR)<br><input name='name_ar' value='".h($edit['name_ar'] ?? '')."'></label>";
$body .= "<label>Name (RU)<br><input name='name_ru' value='".h($edit['name_ru'] ?? '')."'></label>";

$body .= "<label style='grid-column:1/-1'>Short description (EN)<br><textarea name='desc_en' rows='2'>".h($edit['desc_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Short description (AR)<br><textarea name='desc_ar' rows='2'>".h($edit['desc_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Short description (RU)<br><textarea name='desc_ru' rows='2'>".h($edit['desc_ru'] ?? '')."</textarea></label>";

$body .= "<label style='grid-column:1/-1'>Details (EN)<br><textarea name='details_en' rows='4'>".h($edit['details_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Details (AR)<br><textarea name='details_ar' rows='4'>".h($edit['details_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Details (RU)<br><textarea name='details_ru' rows='4'>".h($edit['details_ru'] ?? '')."</textarea></label>";

$body .= "<div style='grid-column:1/-1; display:flex; gap:10px; align-items:center; margin-top:10px'>";
$body .= "<button class='btn' type='submit'>Save</button>";
$body .= "<a class='btn' href='/admin/invest_plans.php' style='background:#111827;border-color:#334155'>Clear</a>";
$body .= "</div>";
$body .= "</form></div>";

$body .= "<div class='card'><h3>Current Plans</h3>";
$body .= "<table><thead><tr><th>ID</th><th>Name</th><th>Term</th><th>ROI</th><th>Min</th><th>Max</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead><tbody>";
foreach ($rows as $r) {
  $body .= "<tr>";
  $body .= "<td><code>".h($r['id'])."</code></td>";
  $body .= "<td>".h($r['name_en'] ?? $r['name'] ?? '')."</td>";
  $body .= "<td>".h($r['term_days'])."d</td>";
  $body .= "<td>".h($r['roi_percent'])."%</td>";
  $body .= "<td>$".h($r['min_amount'])."</td>";
  $body .= "<td>".( (float)$r['max_amount']>0 ? '$'.h($r['max_amount']) : '—' )."</td>";
  $body .= "<td>".h($r['payout_schedule'] ?? 'end')."</td>";
  $body .= "<td>".h($r['status'])."</td>";
  $body .= "<td style='white-space:nowrap'>
      <a class='btn' href='/admin/invest_plans.php?edit=".h($r['id'])."'>Edit</a>
      <form method='post' style='display:inline'>
        <input type='hidden' name='action' value='toggle'>
        <input type='hidden' name='id' value='".h($r['id'])."'>
        <input type='hidden' name='cur' value='".h($r['status'])."'>
        <button class='btn' type='submit'>".($r['status']==='active'?'Disable':'Enable')."</button>
      </form>
    </td>";
  $body .= "</tr>";
}
$body .= "</tbody></table></div>";

admin_layout('Investment Plans', $body);
