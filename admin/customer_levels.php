<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/levels.php';
admin_require();
$pdo = db();
vp_feature_bootstrap($pdo, db_driver());
$msg = '';
$msgOk = true;

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$FEATS = [
  'feat_trading'           => ['label' => 'Trading',           'icon' => '📊', 'desc' => 'Spot & futures trading'],
  'feat_copy_bot'          => ['label' => 'Copy Bot',          'icon' => '🤖', 'desc' => 'AI copy-trading / Avalon bots'],
  'feat_contracts'         => ['label' => 'Contracts',         'icon' => '📄', 'desc' => 'Investment contracts & plans'],
  'feat_support'           => ['label' => 'Priority Support',  'icon' => '🎧', 'desc' => 'Dedicated account manager'],
  'feat_portfolio_manager' => ['label' => 'Portfolio Manager', 'icon' => '🏦', 'desc' => 'Managed portfolio service'],
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $action = (string)($_POST['action'] ?? '');
  $now    = time();

  // ── Save (create or update) ──────────────────────────────────────────────
  if ($action === 'save') {
    $id      = (int)($_POST['id'] ?? 0);
    $code    = strtolower(trim((string)($_POST['level_code'] ?? '')));
    $nameEn  = trim((string)($_POST['name_en'] ?? ''));
    $nameAr  = trim((string)($_POST['name_ar'] ?? ''));
    $nameRu  = trim((string)($_POST['name_ru'] ?? ''));
    $perksEn = trim((string)($_POST['perks_en'] ?? ''));
    $perksAr = trim((string)($_POST['perks_ar'] ?? ''));
    $perksRu = trim((string)($_POST['perks_ru'] ?? ''));
    $min     = max(0.0, (float)($_POST['min_deposit_total'] ?? 0));
    $sort    = (int)($_POST['sort_order'] ?? 0);
    $status  = isset($_POST['enabled']) ? 'active' : 'disabled';
    // Feature flags from checkboxes
    $ft  = isset($_POST['feat_trading'])           ? 1 : 0;
    $fcb = isset($_POST['feat_copy_bot'])           ? 1 : 0;
    $fc  = isset($_POST['feat_contracts'])          ? 1 : 0;
    $fs  = isset($_POST['feat_support'])            ? 1 : 0;
    $fpm = isset($_POST['feat_portfolio_manager'])  ? 1 : 0;

    if ($code === '' || !preg_match('/^[a-z0-9_\-]{2,64}$/', $code)) {
      $msg = 'Level code must be 2–64 chars: a-z 0-9 _ -'; $msgOk = false;
    } elseif ($nameEn === '' || $nameAr === '') {
      $msg = 'Name (EN) and Name (AR) are required.'; $msgOk = false;
    } else {
      try {
        if ($id > 0) {
          $pdo->prepare("UPDATE customer_levels SET
              level_code=?, name_en=?, name_ar=?, name_ru=?,
              perks_en=?, perks_ar=?, perks_ru=?,
              feat_trading=?, feat_copy_bot=?, feat_contracts=?,
              feat_support=?, feat_portfolio_manager=?,
              min_deposit_total=?, sort_order=?, status=?, updated_at=?
            WHERE id=?")
            ->execute([$code,$nameEn,$nameAr,$nameRu ?: $nameEn,
                       $perksEn,$perksAr,$perksRu ?: $perksEn,
                       $ft,$fcb,$fc,$fs,$fpm,$min,$sort,$status,$now,$id]);
          $msg = "Level #{$id} updated successfully.";
        } else {
          $pdo->prepare("INSERT INTO customer_levels
              (level_code,name_en,name_ar,name_ru,perks_en,perks_ar,perks_ru,
               feat_trading,feat_copy_bot,feat_contracts,feat_support,feat_portfolio_manager,
               min_deposit_total,sort_order,status,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$code,$nameEn,$nameAr,$nameRu ?: $nameEn,
                       $perksEn,$perksAr,$perksRu ?: $perksEn,
                       $ft,$fcb,$fc,$fs,$fpm,$min,$sort,$status,$now,$now]);
          $msg = "Level '{$nameEn}' created.";
        }
      } catch (Throwable $e) {
        $msg = 'DB error: ' . h($e->getMessage()); $msgOk = false;
      }
    }
  }

  // ── Toggle level active/disabled ─────────────────────────────────────────
  if ($action === 'toggle') {
    $id   = (int)($_POST['id'] ?? 0);
    $cur  = (string)($_POST['cur'] ?? 'disabled');
    $next = $cur === 'active' ? 'disabled' : 'active';
    $pdo->prepare('UPDATE customer_levels SET status=?, updated_at=? WHERE id=?')->execute([$next,$now,$id]);
    $msg = 'Level ' . ($next === 'active' ? 'enabled' : 'disabled') . '.';
  }

  // ── Quick-toggle a single feature for a level ─────────────────────────────
  if ($action === 'toggle_feat') {
    $id      = (int)($_POST['id'] ?? 0);
    $feat    = preg_replace('/[^a-z_]/', '', (string)($_POST['feat'] ?? ''));
    $curVal  = (int)($_POST['cur_val'] ?? 0);
    $newVal  = $curVal ? 0 : 1;
    if (array_key_exists($feat, $FEATS) && $id > 0) {
      $pdo->prepare("UPDATE customer_levels SET {$feat}=?, updated_at=? WHERE id=?")->execute([$newVal,$now,$id]);
      $msg = "'{$feat}' " . ($newVal ? 'enabled' : 'disabled') . " for level #{$id}.";
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if ($action === 'delete') {
    $id = (int)($_POST['id'] ?? 0);
    if ($id > 0) {
      try { $pdo->prepare('DELETE FROM customer_levels WHERE id=?')->execute([$id]); $msg = "Deleted level #{$id}."; }
      catch (Throwable $e) { $msg = 'Cannot delete (may be referenced by contracts): ' . h($e->getMessage()); $msgOk = false; }
    }
  }
}

// ── Load rows ─────────────────────────────────────────────────────────────
$editId = (int)($_GET['edit'] ?? 0);
$edit = null;
if ($editId > 0) {
  $st = $pdo->prepare('SELECT * FROM customer_levels WHERE id=?');
  $st->execute([$editId]);
  $edit = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
$rows = $pdo->query("SELECT * FROM customer_levels ORDER BY min_deposit_total ASC, sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
$activeCount   = count(array_filter($rows, fn($r) => ($r['status'] ?? '') === 'active'));
$highestUnlock = 0.0;
foreach ($rows as $r) { $highestUnlock = max($highestUnlock, (float)($r['min_deposit_total'] ?? 0)); }
$gatedContracts = 0;
try { $gatedContracts = (int)$pdo->query("SELECT COUNT(*) FROM invest_plans WHERE COALESCE(product_kind,'plan')='contract' AND required_level_id IS NOT NULL")->fetchColumn(); } catch (Throwable $e) {}

// ── Build HTML ───────────────────────────────────────────────────────────
ob_start(); ?>
<div class='split'>
  <div>
    <h1 class='section-title'>Customer Levels</h1>
    <div class='muted small'>Control which features each tier unlocks. Users level up automatically when confirmed deposits reach the minimum threshold.</div>
  </div>
  <div class='inline-actions'>
    <a class='btn' href='/admin/contracts.php'>Contracts</a>
    <a class='btn' href='/admin/signals.php'>Signal Desk</a>
  </div>
</div>

<?php if ($msg): ?>
<p style='margin:10px 0'><span class='pill <?= $msgOk ? "" : "pill-red" ?>'><?= h($msg) ?></span></p>
<?php endif; ?>

<div class='stats-grid'>
  <?= admin_stat_card('Published levels', (string)count($rows), 'All configured deposit tiers') ?>
  <?= admin_stat_card('Active levels', (string)$activeCount, 'Currently used in level calculations') ?>
  <?= admin_stat_card('Top unlock', '$' . number_format($highestUnlock, 0), 'Highest confirmed-deposit threshold') ?>
  <?= admin_stat_card('Gated contracts', (string)$gatedContracts, 'Contracts requiring a level') ?>
</div>

<!-- FEATURE MATRIX ──────────────────────────────────────────────────────── -->
<div class='card' style='overflow-x:auto'>
  <h2>Feature Matrix &amp; Quick Toggle</h2>
  <p class='muted small' style='margin-bottom:12px'>Click any ✓/✗ button to instantly toggle that feature for a level. Use the full editor below for names, perks, and thresholds.</p>
  <table style='width:100%;border-collapse:collapse;font-size:13px'>
    <thead>
      <tr style='border-bottom:1px solid var(--color-line,#2a2f3d)'>
        <th style='text-align:left;padding:8px 12px'>Level</th>
        <th style='text-align:right;padding:8px 12px'>Min Deposit</th>
        <?php foreach ($FEATS as $fk => $f): ?>
        <th style='text-align:center;padding:8px 6px;min-width:68px' title='<?= h($f['desc']) ?>'>
          <div><?= h($f['icon']) ?></div>
          <div style='font-size:10px;font-weight:500;color:var(--color-muted,#777)'><?= h($f['label']) ?></div>
        </th>
        <?php endforeach; ?>
        <th style='text-align:center;padding:8px 12px'>Status</th>
        <th style='padding:8px 12px'>Actions</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $r): ?>
      <tr style='border-bottom:1px solid var(--color-line,#2a2f3d);<?= ($r['status'] ?? '') !== 'active' ? 'opacity:.45' : '' ?>'>
        <td style='padding:10px 12px'>
          <code style='font-weight:700'><?= h($r['level_code'] ?? '') ?></code><br>
          <small style='color:var(--color-muted,#777)'><?= h($r['name_en'] ?? '') ?> / <?= h($r['name_ar'] ?? '') ?></small>
        </td>
        <td style='text-align:right;padding:10px 12px;font-family:monospace'>
          $<?= number_format((float)($r['min_deposit_total'] ?? 0), 0) ?>
        </td>
        <?php foreach ($FEATS as $fk => $f):
          $v = (int)($r[$fk] ?? 0); ?>
        <td style='text-align:center;padding:8px 4px'>
          <form method='post' style='display:inline'>
            <input type='hidden' name='action'  value='toggle_feat'>
            <input type='hidden' name='id'      value='<?= (int)$r['id'] ?>'>
            <input type='hidden' name='feat'    value='<?= h($fk) ?>'>
            <input type='hidden' name='cur_val' value='<?= $v ?>'>
            <button type='submit' style='
              display:inline-flex;align-items:center;justify-content:center;
              width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;
              font-weight:700;font-size:14px;transition:all .15s;
              background:<?= $v ? "var(--color-green,#22c55e)" : "var(--color-surface-2,#1a1f2e)" ?>;
              color:<?= $v ? "#fff" : "var(--color-muted,#555)" ?>;
              <?= $v ? "" : "border:1px solid var(--color-line,#2a2f3d)" ?>;
            ' title='<?= $v ? "Enabled — click to disable" : "Disabled — click to enable" ?>'>
              <?= $v ? '✓' : '✗' ?>
            </button>
          </form>
        </td>
        <?php endforeach; ?>
        <td style='text-align:center;padding:10px 12px'>
          <form method='post' style='display:inline'>
            <input type='hidden' name='action' value='toggle'>
            <input type='hidden' name='id'     value='<?= (int)$r['id'] ?>'>
            <input type='hidden' name='cur'    value='<?= h($r['status'] ?? 'disabled') ?>'>
            <button type='submit' class='pill' style='cursor:pointer;background:<?= ($r['status'] ?? '') === 'active' ? "var(--color-green,#22c55e)" : "var(--color-surface-2,#1a1f2e)" ?>'>
              <?= ($r['status'] ?? '') === 'active' ? 'Active' : 'Disabled' ?>
            </button>
          </form>
        </td>
        <td style='padding:10px 12px;white-space:nowrap'>
          <a class='btn' href='/admin/customer_levels.php?edit=<?= (int)$r['id'] ?>'>Edit</a>
          <form method='post' style='display:inline' onsubmit='return confirm("Delete level <?= h($r['level_code'] ?? '') ?>? This cannot be undone.")'>
            <input type='hidden' name='action' value='delete'>
            <input type='hidden' name='id'     value='<?= (int)$r['id'] ?>'>
            <button type='submit' class='btn' style='color:var(--color-red,#ef4444)'>Del</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<!-- FULL EDITOR ─────────────────────────────────────────────────────────── -->
<div class='card'>
  <h2><?= $edit ? 'Edit Level #' . (int)$edit['id'] . ' — ' . h($edit['name_en'] ?? '') : 'Add New Level' ?></h2>
  <form method='post' class='grid'>
    <input type='hidden' name='action' value='save'>
    <input type='hidden' name='id'     value='<?= (int)($edit['id'] ?? 0) ?>'>

    <label>Level code<br>
      <input name='level_code' value='<?= h($edit['level_code'] ?? '') ?>' placeholder='e.g. gold' required pattern='[a-z0-9_\-]{2,64}'>
    </label>
    <label>Min confirmed deposits (USD)<br>
      <input type='number' step='500' min='0' name='min_deposit_total' value='<?= h((string)(float)($edit['min_deposit_total'] ?? 0)) ?>'>
    </label>
    <label>Sort order<br>
      <input type='number' name='sort_order' value='<?= (int)($edit['sort_order'] ?? 0) ?>'>
    </label>
    <label style='display:flex;gap:10px;align-items:center;margin-top:22px'>
      <input type='checkbox' name='enabled' <?= (($edit['status'] ?? 'active') === 'active') ? 'checked' : '' ?>> Active (visible)
    </label>

    <label>Name (EN)<br><input name='name_en' value='<?= h($edit['name_en'] ?? '') ?>' placeholder='Gold' required></label>
    <label>Name (AR)<br><input name='name_ar' value='<?= h($edit['name_ar'] ?? '') ?>' placeholder='ذهبي' dir='rtl' required></label>
    <label>Name (RU)<br><input name='name_ru' value='<?= h($edit['name_ru'] ?? '') ?>' placeholder='Золотой'></label>

    <label style='grid-column:1/-1'>Perks (EN — one per line)<br>
      <textarea name='perks_en' rows='4'><?= h($edit['perks_en'] ?? '') ?></textarea>
    </label>
    <label style='grid-column:1/-1'>Perks (AR — one per line)<br>
      <textarea name='perks_ar' rows='4' dir='rtl'><?= h($edit['perks_ar'] ?? '') ?></textarea>
    </label>
    <label style='grid-column:1/-1'>Perks (RU — one per line)<br>
      <textarea name='perks_ru' rows='4'><?= h($edit['perks_ru'] ?? '') ?></textarea>
    </label>

    <!-- ── FEATURE CHECKBOXES ─────────────────────────────────────────── -->
    <div style='grid-column:1/-1'>
      <div style='font-weight:600;font-size:13px;margin-bottom:10px'>Feature Access — what this tier unlocks</div>
      <div style='display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px'>
        <?php foreach ($FEATS as $fk => $f):
          $chk = (bool)(int)($edit[$fk] ?? ($fk === 'feat_trading' ? 1 : 0)); ?>
        <label id='lbl_<?= $fk ?>' style='
          display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:8px;
          border:1px solid <?= $chk ? "var(--color-accent,#4f8ef7)" : "var(--color-line,#2a2f3d)" ?>;
          background:<?= $chk ? "color-mix(in srgb,var(--color-accent,#4f8ef7) 8%,transparent)" : "transparent" ?>;
          cursor:pointer;transition:border-color .15s,background .15s;
        '>
          <input type='checkbox' name='<?= h($fk) ?>' <?= $chk ? 'checked' : '' ?>
            onchange='var l=document.getElementById("lbl_<?= $fk ?>");l.style.borderColor=this.checked?"var(--color-accent,#4f8ef7)":"var(--color-line,#2a2f3d)";l.style.background=this.checked?"color-mix(in srgb,var(--color-accent,#4f8ef7) 8%,transparent)":"transparent"'>
          <span style='font-size:22px;flex-shrink:0'><?= h($f['icon']) ?></span>
          <span style='display:flex;flex-direction:column;gap:2px'>
            <strong style='font-size:13px'><?= h($f['label']) ?></strong>
            <small style='font-size:11px;color:var(--color-muted,#777)'><?= h($f['desc']) ?></small>
          </span>
        </label>
        <?php endforeach; ?>
      </div>
    </div>

    <div style='grid-column:1/-1;display:flex;gap:10px;margin-top:10px'>
      <button class='btn' type='submit'>💾 Save Level</button>
      <a class='btn' href='/admin/customer_levels.php'>Clear</a>
    </div>
  </form>
</div>
<?php
$body = ob_get_clean();
admin_layout('Customer Levels', $body);
