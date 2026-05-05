<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/levels.php';
admin_require();
$pdo = db();
vp_feature_bootstrap($pdo, db_driver());
$msg = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$levels = vp_get_customer_levels($pdo, 'en', false);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $action = (string)($_POST['action'] ?? '');
  $now = time();
  if ($action === 'save') {
    $id = strtolower(trim((string)($_POST['id'] ?? '')));
    $isEdit = (int)($_POST['is_edit'] ?? 0) === 1;
    if (!$isEdit && $id === '') {
      try { $id = 'contract_' . bin2hex(random_bytes(6)); }
      catch (Throwable $e) { $id = 'contract_' . substr(md5((string)microtime(true)), 0, 12); }
    }
    $termDays = (int)($_POST['term_days'] ?? 0);
    $roi = (float)($_POST['roi_percent'] ?? 0);
    $minAmount = (float)($_POST['min_amount'] ?? 0);
    $maxAmount = (float)($_POST['max_amount'] ?? 0);
    $risk = trim((string)($_POST['risk'] ?? 'Medium'));
    $schedule = strtolower(trim((string)($_POST['payout_schedule'] ?? 'monthly')));
    if (!in_array($schedule, ['daily','weekly','monthly','end'], true)) $schedule = 'monthly';
    $sort = (int)($_POST['sort_order'] ?? 0);
    $status = isset($_POST['enabled']) ? 'active' : 'disabled';
    $isPerpetual = isset($_POST['is_perpetual']) ? 1 : 0;
    $requiredLevelId = (int)($_POST['required_level_id'] ?? 0);
    $nameEn = trim((string)($_POST['name_en'] ?? ''));
    $nameAr = trim((string)($_POST['name_ar'] ?? ''));
    $nameRu = trim((string)($_POST['name_ru'] ?? ''));
    $descEn = trim((string)($_POST['desc_en'] ?? ''));
    $descAr = trim((string)($_POST['desc_ar'] ?? ''));
    $descRu = trim((string)($_POST['desc_ru'] ?? ''));
    $detailsEn = trim((string)($_POST['details_en'] ?? ''));
    $detailsAr = trim((string)($_POST['details_ar'] ?? ''));
    $detailsRu = trim((string)($_POST['details_ru'] ?? ''));
    $featuresEn = trim((string)($_POST['features_en'] ?? ''));
    $featuresAr = trim((string)($_POST['features_ar'] ?? ''));
    $featuresRu = trim((string)($_POST['features_ru'] ?? ''));
    $badgeEn = trim((string)($_POST['badge_en'] ?? ''));
    $badgeAr = trim((string)($_POST['badge_ar'] ?? ''));
    $badgeRu = trim((string)($_POST['badge_ru'] ?? ''));
    $headlineEn = trim((string)($_POST['headline_en'] ?? ''));
    $headlineAr = trim((string)($_POST['headline_ar'] ?? ''));
    $headlineRu = trim((string)($_POST['headline_ru'] ?? ''));

    if ($id === '' || !preg_match('/^[a-z0-9_\-]{3,64}$/', $id)) {
      $msg = 'Invalid ID (use a-z, 0-9, dash/underscore).';
    } elseif ($nameEn==='' || $nameAr==='' || $nameRu==='') {
      $msg = 'Please fill the contract name in EN/AR/RU.';
    } elseif ($roi <= 0 || $minAmount <= 0) {
      $msg = 'ROI and minimum amount must be greater than zero.';
    } elseif (!$isPerpetual && $termDays <= 0) {
      $msg = 'Duration is required for non-perpetual contracts.';
    } else {
      if ($isEdit) {
        $stmt = $pdo->prepare("UPDATE invest_plans SET
          product_kind='contract', name=?, name_en=?, name_ar=?, name_ru=?,
          desc_en=?, desc_ar=?, desc_ru=?, details_en=?, details_ar=?, details_ru=?,
          features_en=?, features_ar=?, features_ru=?, badge_en=?, badge_ar=?, badge_ru=?, headline_en=?, headline_ar=?, headline_ru=?,
          term_days=?, roi_percent=?, min_amount=?, max_amount=?, risk=?, payout_schedule=?,
          required_level_id=?, is_perpetual=?, sort_order=?, status=?, updated_at=? WHERE id=?");
        $stmt->execute([
          $nameEn,$nameEn,$nameAr,$nameRu,
          $descEn,$descAr,$descRu,$detailsEn,$detailsAr,$detailsRu,
          $featuresEn,$featuresAr,$featuresRu,$badgeEn,$badgeAr,$badgeRu,$headlineEn,$headlineAr,$headlineRu,
          $termDays,$roi,$minAmount,$maxAmount,$risk,$schedule,
          $requiredLevelId ?: null,$isPerpetual,$sort,$status,$now,$id
        ]);
        $msg = 'Updated';
      } else {
        $stmt = $pdo->prepare("INSERT INTO invest_plans(
          id,name,name_en,name_ar,name_ru,product_kind,
          desc_en,desc_ar,desc_ru,details_en,details_ar,details_ru,
          features_en,features_ar,features_ru,badge_en,badge_ar,badge_ru,headline_en,headline_ar,headline_ru,
          term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,required_level_id,is_perpetual,sort_order,status,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
          $id,$nameEn,$nameEn,$nameAr,$nameRu,'contract',
          $descEn,$descAr,$descRu,$detailsEn,$detailsAr,$detailsRu,
          $featuresEn,$featuresAr,$featuresRu,$badgeEn,$badgeAr,$badgeRu,$headlineEn,$headlineAr,$headlineRu,
          $termDays,$roi,$minAmount,$maxAmount,$risk,$schedule,$requiredLevelId ?: null,$isPerpetual,$sort,$status,$now,$now
        ]);
        $msg = 'Created';
      }
    }
  }
  if ($action === 'toggle') {
    $id = (string)($_POST['id'] ?? '');
    $cur = (string)($_POST['cur'] ?? 'disabled');
    $next = ($cur === 'active') ? 'disabled' : 'active';
    $pdo->prepare("UPDATE invest_plans SET status=?, updated_at=? WHERE id=? AND COALESCE(product_kind,'plan')='contract'")->execute([$next, time(), $id]);
    $msg = 'Toggled';
  }
}

$editId = (string)($_GET['edit'] ?? '');
$edit = null;
if ($editId !== '') {
  $st = $pdo->prepare("SELECT * FROM invest_plans WHERE id=? AND COALESCE(product_kind,'plan')='contract'");
  $st->execute([$editId]);
  $edit = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
$rows = $pdo->query("SELECT p.*, l.name_en AS level_name FROM invest_plans p LEFT JOIN customer_levels l ON l.id=p.required_level_id WHERE COALESCE(product_kind,'plan')='contract' ORDER BY sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
$activeCount = count(array_filter($rows, fn($row)=>($row['status'] ?? 'disabled') === 'active'));
$perpetualCount = count(array_filter($rows, fn($row)=>(int)($row['is_perpetual'] ?? 0) === 1));
$gatedCount = count(array_filter($rows, fn($row)=>!empty($row['required_level_id'])));
$avgRoi = 0.0;
if ($rows) { foreach ($rows as $row) { $avgRoi += (float)($row['roi_percent'] ?? 0); } $avgRoi /= count($rows); }

$body = "<div class='split'><div><h1 class='section-title'>Premium Contracts</h1><div class='muted small'>Build the premium contract shelf shown in Earn, with level gates, payout cycles, and long-form content.</div></div><div class='inline-actions'><a class='btn' href='/admin/customer_levels.php'>Customer levels</a><a class='btn' href='/admin/invest_plans.php'>Legacy invest plans</a></div></div>";
$body .= "<div class='stats-grid'>";
$body .= admin_stat_card('Published contracts', (string)count($rows), 'All contract products available in this environment.');
$body .= admin_stat_card('Active contracts', (string)$activeCount, 'Contracts currently visible to clients in Earn.');
$body .= admin_stat_card('Perpetual contracts', (string)$perpetualCount, 'Always-on contracts that keep paying by cycle.');
$body .= admin_stat_card('Average ROI', number_format($avgRoi, 2) . '%', 'Simple average ROI per contract payout cycle.');
$body .= admin_stat_card('Level-gated', (string)$gatedCount, 'Contracts restricted by customer level.');
$body .= "</div>";

$body .= "<div class='card'><h2>Contract editor</h2><p class='muted small'>Contracts are shown in the Earn page under the Contracts tab. Use the required level to gate premium contracts by confirmed deposit total.</p>";
if ($msg) $body .= "<p><span class='pill'>".h($msg)."</span></p>";
$body .= "<h3>".($edit ? 'Edit Contract' : 'Add Contract')."</h3><form method='post' class='grid'>";
$body .= "<input type='hidden' name='action' value='save'><input type='hidden' name='is_edit' value='".($edit?1:0)."'>";
$body .= "<label>ID (slug)<br><input name='id' value='".h($edit['id'] ?? '')."' ".($edit?"readonly":"placeholder='e.g. contract_growth_30'")."></label>";
$body .= "<label>Sort Order<br><input name='sort_order' type='number' value='".h($edit['sort_order'] ?? 0)."'></label>";
$body .= "<label>Risk label<br><input name='risk' value='".h($edit['risk'] ?? 'Medium')."'></label>";
$body .= "<label>Duration (days, 0 if perpetual)<br><input name='term_days' type='number' value='".h($edit['term_days'] ?? 30)."'></label>";
$body .= "<label>ROI % per cycle<br><input name='roi_percent' type='number' step='0.01' value='".h($edit['roi_percent'] ?? 4)."'></label>";
$body .= "<label>Min Amount<br><input name='min_amount' type='number' step='0.01' value='".h($edit['min_amount'] ?? 1000)."'></label>";
$body .= "<label>Max Amount (0 = no cap)<br><input name='max_amount' type='number' step='0.01' value='".h($edit['max_amount'] ?? 0)."'></label>";
$ps = $edit['payout_schedule'] ?? 'monthly';
$body .= "<label>Payout schedule<br><select name='payout_schedule'><option value='daily' ".($ps==='daily'?'selected':'').">daily</option><option value='weekly' ".($ps==='weekly'?'selected':'').">weekly</option><option value='monthly' ".($ps==='monthly'?'selected':'').">monthly</option><option value='end' ".($ps==='end'?'selected':'').">end</option></select></label>";
$body .= "<label>Required level<br><select name='required_level_id'><option value='0'>Open to all</option>";
foreach ($levels as $lvl) {
  $sel = ((int)($edit['required_level_id'] ?? 0) === (int)$lvl['id']) ? 'selected' : '';
  $body .= "<option value='".h($lvl['id'])."' {$sel}>".h($lvl['name'])." (from $".h($lvl['min_deposit_total']).")</option>";
}
$body .= "</select></label>";
$enabled = (($edit['status'] ?? 'active') === 'active');
$isPerp = (int)($edit['is_perpetual'] ?? 0) === 1;
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='is_perpetual' ".($isPerp?'checked':'')."> Perpetual contract</label>";
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='enabled' ".($enabled?'checked':'')."> Enabled</label>";
$body .= "<label>Name (EN)<br><input name='name_en' value='".h($edit['name_en'] ?? '')."'></label>";
$body .= "<label>Name (AR)<br><input name='name_ar' value='".h($edit['name_ar'] ?? '')."'></label>";
$body .= "<label>Name (RU)<br><input name='name_ru' value='".h($edit['name_ru'] ?? '')."'></label>";
$body .= "<label>Badge (EN)<br><input name='badge_en' value='".h($edit['badge_en'] ?? '')."' placeholder='Premium'></label>";
$body .= "<label>Badge (AR)<br><input name='badge_ar' value='".h($edit['badge_ar'] ?? '')."'></label>";
$body .= "<label>Badge (RU)<br><input name='badge_ru' value='".h($edit['badge_ru'] ?? '')."'></label>";
$body .= "<label style='grid-column:1/-1'>Headline (EN)<br><textarea name='headline_en' rows='2'>".h($edit['headline_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Headline (AR)<br><textarea name='headline_ar' rows='2'>".h($edit['headline_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Headline (RU)<br><textarea name='headline_ru' rows='2'>".h($edit['headline_ru'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Short description (EN)<br><textarea name='desc_en' rows='2'>".h($edit['desc_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Short description (AR)<br><textarea name='desc_ar' rows='2'>".h($edit['desc_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Short description (RU)<br><textarea name='desc_ru' rows='2'>".h($edit['desc_ru'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Features (EN, one per line)<br><textarea name='features_en' rows='4'>".h($edit['features_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Features (AR, one per line)<br><textarea name='features_ar' rows='4'>".h($edit['features_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Features (RU, one per line)<br><textarea name='features_ru' rows='4'>".h($edit['features_ru'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Details (EN)<br><textarea name='details_en' rows='4'>".h($edit['details_en'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Details (AR)<br><textarea name='details_ar' rows='4'>".h($edit['details_ar'] ?? '')."</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Details (RU)<br><textarea name='details_ru' rows='4'>".h($edit['details_ru'] ?? '')."</textarea></label>";
$body .= "<div style='grid-column:1/-1; display:flex; gap:10px; align-items:center; margin-top:10px'><button class='btn' type='submit'>Save</button><a class='btn' href='/admin/contracts.php'>Clear</a></div></form></div>";

$body .= "<div class='card'><h3>Current Contracts</h3><table><thead><tr><th>ID</th><th>Name</th><th>Level</th><th>Cycle</th><th>ROI</th><th>Status</th><th>Actions</th></tr></thead><tbody>";
foreach ($rows as $r) {
  $body .= "<tr><td><code>".h($r['id'])."</code></td><td>".h($r['name_en'] ?? $r['name'] ?? '')."</td><td>".h($r['level_name'] ?? 'All')."</td><td>".h($r['payout_schedule']).($r['is_perpetual'] ? ' • perpetual' : (' • '.h($r['term_days']).'d'))."</td><td>".h($r['roi_percent'])."%</td><td>".h($r['status'])."</td><td style='white-space:nowrap'><a class='btn' href='/admin/contracts.php?edit=".h($r['id'])."'>Edit</a><form method='post' style='display:inline'><input type='hidden' name='action' value='toggle'><input type='hidden' name='id' value='".h($r['id'])."'><input type='hidden' name='cur' value='".h($r['status'])."'><button class='btn' type='submit'>".($r['status']==='active'?'Disable':'Enable')."</button></form></td></tr>";
}
$body .= "</tbody></table></div>";

admin_layout('Contracts', $body);
