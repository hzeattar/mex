<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();

require_once __DIR__ . '/api/lib/settings.php';

$pdo = db();
$msg = '';
$err = '';

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function clampf($v, $min, $max): float {
  $f = (float)$v;
  if (!is_finite($f)) $f = 0.0;
  return max((float)$min, min((float)$max, $f));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $spotMaker = clampf($_POST['SPOT_MAKER_FEE'] ?? '0.0002', 0, 0.01);
    $spotTaker = clampf($_POST['SPOT_TAKER_FEE'] ?? '0.0004', 0, 0.01);
    $perpMaker = clampf($_POST['PERP_MAKER_FEE'] ?? '0.0002', 0, 0.01);
    $perpTaker = clampf($_POST['PERP_TAKER_FEE'] ?? '0.0004', 0, 0.01);
    $mmr = clampf($_POST['PERP_MAINTENANCE_MARGIN_RATE'] ?? '0.005', 0, 0.05);
    $maxLev = (int)($_POST['PERP_MAX_LEVERAGE'] ?? 125);
    $maxLev = max(1, min(1000, $maxLev));

    setting_set('SPOT_MAKER_FEE', (string)$spotMaker);
    setting_set('SPOT_TAKER_FEE', (string)$spotTaker);
    setting_set('PERP_MAKER_FEE', (string)$perpMaker);
    setting_set('PERP_TAKER_FEE', (string)$perpTaker);
    setting_set('PERP_MAINTENANCE_MARGIN_RATE', (string)$mmr);
    setting_set('PERP_MAX_LEVERAGE', (string)$maxLev);
    // Multiple positions per (user + symbol + side) is required (Binance-like).
    // Keep merge disabled regardless of UI.
    setting_set('TRADE_MERGE_POSITIONS', '0');

    // FX manual override (Iraq)
    $fxIqdRaw = trim((string)($_POST['FX_OVERRIDE_IQD'] ?? ''));
    if ($fxIqdRaw === '') {
      setting_set('FX_OVERRIDE_IQD', null);
    } else {
      $fxIqd = clampf($fxIqdRaw, 0, 1_000_000);
      // If user enters 0, treat as disabled
      setting_set('FX_OVERRIDE_IQD', $fxIqd > 0 ? (string)$fxIqd : null);
    }

    // Support contacts per language (username like @name or full URL)
    $scEn = trim((string)($_POST['SUPPORT_CONTACT_EN'] ?? ''));
    $scAr = trim((string)($_POST['SUPPORT_CONTACT_AR'] ?? ''));
    $scRu = trim((string)($_POST['SUPPORT_CONTACT_RU'] ?? ''));
    setting_set('support.contact.en', $scEn !== '' ? $scEn : null);
    setting_set('support.contact.ar', $scAr !== '' ? $scAr : null);
    setting_set('support.contact.ru', $scRu !== '' ? $scRu : null);

    $msg = 'Saved.';
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

$vals = [
  'SPOT_MAKER_FEE' => (string)setting_get('SPOT_MAKER_FEE', env('SPOT_MAKER_FEE', '0.0002')),
  'SPOT_TAKER_FEE' => (string)setting_get('SPOT_TAKER_FEE', env('SPOT_TAKER_FEE', '0.0004')),
  'PERP_MAKER_FEE' => (string)setting_get('PERP_MAKER_FEE', env('PERP_MAKER_FEE', '0.0002')),
  'PERP_TAKER_FEE' => (string)setting_get('PERP_TAKER_FEE', env('PERP_TAKER_FEE', '0.0004')),
  'PERP_MAINTENANCE_MARGIN_RATE' => (string)setting_get('PERP_MAINTENANCE_MARGIN_RATE', env('PERP_MAINTENANCE_MARGIN_RATE', '0.005')),
  'PERP_MAX_LEVERAGE' => (string)setting_get('PERP_MAX_LEVERAGE', env('PERP_MAX_LEVERAGE', '125')),
  'TRADE_MERGE_POSITIONS' => '0',
  'FX_OVERRIDE_IQD' => (string)setting_get('FX_OVERRIDE_IQD', env('FX_OVERRIDE_IQD', '')),
  // Support contacts (fallback to env)
  'SUPPORT_CONTACT_EN' => (string)setting_get('support.contact.en', env('SUPPORT_CONTACT_EN', '')),
  'SUPPORT_CONTACT_AR' => (string)setting_get('support.contact.ar', env('SUPPORT_CONTACT_AR', '')),
  'SUPPORT_CONTACT_RU' => (string)setting_get('support.contact.ru', env('SUPPORT_CONTACT_RU', '')),
];

$body = "";
if ($msg) $body .= "<div class='card ok'>".h($msg)."</div>";
if ($err) $body .= "<div class='card bad'>".h($err)."</div>";

$body .= "<div class='card'>
  <h2>Trading Settings</h2>
  <p class='muted' style='margin-top:6px'>These values are stored in the DB (settings table) so you can tune the demo exchange without touching env.</p>

  <form method='post' class='grid' style='grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end'>

    <div>
      <label>Spot Maker Fee</label>
      <input name='SPOT_MAKER_FEE' value='".h($vals['SPOT_MAKER_FEE'])."' placeholder='0.0002'>
      <div class='muted tiny' style='margin-top:6px'>Rate (e.g. 0.0002 = 0.02%)</div>
    </div>
    <div>
      <label>Spot Taker Fee</label>
      <input name='SPOT_TAKER_FEE' value='".h($vals['SPOT_TAKER_FEE'])."' placeholder='0.0004'>
    </div>
    <div>
      <label>Perp Max Leverage</label>
      <input type='number' min='1' max='1000' step='1' name='PERP_MAX_LEVERAGE' value='".h($vals['PERP_MAX_LEVERAGE'])."' placeholder='125'>
      <div class='muted tiny' style='margin-top:6px'>1 → 1000</div>
    </div>

    <div>
      <label>Perp Maker Fee</label>
      <input name='PERP_MAKER_FEE' value='".h($vals['PERP_MAKER_FEE'])."' placeholder='0.0002'>
    </div>
    <div>
      <label>Perp Taker Fee</label>
      <input name='PERP_TAKER_FEE' value='".h($vals['PERP_TAKER_FEE'])."' placeholder='0.0004'>
    </div>
    <div>
      <label>Maintenance Margin Rate</label>
      <input name='PERP_MAINTENANCE_MARGIN_RATE' value='".h($vals['PERP_MAINTENANCE_MARGIN_RATE'])."' placeholder='0.005'>
      <div class='muted tiny' style='margin-top:6px'>0.005 = 0.5% (used for liquidation price)</div>
    </div>

    <div style='grid-column:1/-1'>
      <label>FX Override — IQD (Iraq)</label>
      <input name='FX_OVERRIDE_IQD' value='".h($vals['FX_OVERRIDE_IQD'])."' placeholder='Example: 1310'>
      <div class='muted tiny' style='margin-top:6px'>Enter how many IQD equals 1 USD. Leave empty to use automatic FX.</div>
    </div>

    

    <div style='grid-column:1/-1'>
      <hr style='border:0;border-top:1px solid rgba(148,163,184,.15);margin:6px 0 2px'>
      <h3 style='margin:10px 0 6px'>Support Contacts</h3>
      <div class='muted tiny'>These are used by the <b>main bot support flow</b>. Enter @username or full URL (https://t.me/...)</div>
    </div>

    <div>
      <label>Support Contact (EN)</label>
      <input name='SUPPORT_CONTACT_EN' value='".h($vals['SUPPORT_CONTACT_EN'])."' placeholder='@support_en or https://t.me/support_en'>
    </div>
    <div>
      <label>Support Contact (AR)</label>
      <input name='SUPPORT_CONTACT_AR' value='".h($vals['SUPPORT_CONTACT_AR'])."' placeholder='@support_ar or https://t.me/support_ar'>
    </div>
    <div>
      <label>Support Contact (RU)</label>
      <input name='SUPPORT_CONTACT_RU' value='".h($vals['SUPPORT_CONTACT_RU'])."' placeholder='@support_ru or https://t.me/support_ru'>
    </div>
<div style='grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px'>
      <span class='muted tiny'>Positions are kept separate per entry (multiple positions per symbol/side is enabled).</span>
    </div>

    <div style='grid-column:1/-1;margin-top:8px'>
      <button class='btn'>Save</button>
    </div>

  </form>
</div>";

admin_layout('Trading Settings', $body);
