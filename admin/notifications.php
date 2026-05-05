<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/settings.php';
admin_require();

function fkey(string $k): string { return str_replace('.', '_', $k); }

// --- Key groups ---
$groups = [
  'User notifications (Main Bot)' => [
    'bot.notify.deposit_confirmed',
    'bot.notify.deposit_rejected',
    'bot.notify.withdraw_approved',
    'bot.notify.withdraw_rejected',
    'bot.notify.withdraw_completed',
  ],
  'Affiliate notifications (Managers bot)' => [
    'aff.notify.client_joined',
    'aff.notify.kyc_submitted',
    'aff.notify.dep_created',
    'aff.notify.dep_confirmed',
    'aff.notify.dep_failed',
    'aff.notify.wdr_created',
    'aff.notify.wdr_approved',
    'aff.notify.wdr_rejected',
    'aff.notify.wdr_completed',
    'aff.notify.trade_open',
    'aff.notify.trade_closed',
    'aff.notify.invest_subscribed',
    'aff.notify.manager_approved',
    'aff.notify.manager_blocked',
  ],
  'Affiliate admin alerts (New manager request)' => [
    'aff.admin.lang',
    'aff.admin.new_manager',
    'aff.admin.btn_approve',
    'aff.admin.btn_block',
  ],
  'Mini App toasts (Overrides)' => [
    // stored as app.i18n.<key>.<lang>
    'app.i18n.common.failed',
    'app.i18n.common.failed_load',
    'app.i18n.common.failed_clear',
    'app.i18n.common.failed_save',
    'app.i18n.common.network_error',
    'app.i18n.common.request_timeout',
    'app.i18n.wallet.deposit_failed',
    'app.i18n.wallet.withdraw_failed',
    'app.i18n.kyc.failed',
    'app.i18n.trade.chart_loading',
    'app.i18n.trade.close_failed',
    'app.i18n.trade.failed_load_deals',
    'app.i18n.trade.failed_place_order',
  ],
];

$msg = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  foreach ($groups as $title => $keys) {
    foreach ($keys as $baseKey) {
      if ($baseKey === 'aff.admin.lang') {
        $v = strtolower(trim((string)($_POST[fkey($baseKey)] ?? '')));
        if (!in_array($v, ['en','ar','ru'], true)) $v = 'ar';
        setting_set($baseKey, $v);
        continue;
      }

      // tri-language values
      foreach (['en','ar','ru'] as $lang) {
        $k = $baseKey . '.' . $lang;
        $postKey = fkey($k);
        $v = (string)($_POST[$postKey] ?? '');
        setting_set($k, $v);
      }
    }
  }
  $msg = "<div class='card'><span class='pill ok'>Saved</span></div>";
}

function val(string $k): string {
  return htmlspecialchars((string)setting_get($k, ''), ENT_QUOTES, 'UTF-8');
}

// render
$body = $msg . "<div class='card'><h2 style='margin:0 0 8px'>Notifications</h2>
<div class='muted small'>Edit Telegram notifications and mini-app toast texts. Placeholders: <code>{amount}</code>, <code>{currency}</code>, <code>{id}</code>, <code>{client}</code>, <code>{uid}</code>… depending on the message.</div>
<div class='muted small' style='margin-top:6px'>Mini app overrides are optional; leave empty to use the built-in language files.</div>
</div>";

$body .= "<form method='post'>";

foreach ($groups as $title => $keys) {
  $body .= "<div class='card'>";
  $body .= "<h3 style='margin:0 0 10px'>".htmlspecialchars($title,ENT_QUOTES,'UTF-8')."</h3>";

  foreach ($keys as $baseKey) {
    $esc = htmlspecialchars($baseKey, ENT_QUOTES,'UTF-8');

    if ($baseKey === 'aff.admin.lang') {
      $cur = strtolower(trim((string)setting_get('aff.admin.lang', 'ar')));
      if (!in_array($cur, ['en','ar','ru'], true)) $cur = 'ar';
      $body .= "<div style='border:1px solid #334155; border-radius:12px; padding:12px; margin-bottom:12px'>";
      $body .= "<div class='muted small' style='margin-bottom:6px'><code>{$esc}</code> (Admin language for affiliate alerts)</div>";
      $body .= "<select name='".fkey('aff.admin.lang')."' class='input'>";
      $body .= "<option value='ar' ".($cur==='ar'?'selected':'').">AR</option>";
      $body .= "<option value='ru' ".($cur==='ru'?'selected':'').">RU</option>";
      $body .= "<option value='en' ".($cur==='en'?'selected':'').">EN</option>";
      $body .= "</select></div>";
      continue;
    }

    $body .= "<div style='border:1px solid #334155; border-radius:12px; padding:12px; margin-bottom:12px'>";
    $body .= "<div class='muted small' style='margin-bottom:6px'><code>{$esc}</code></div>";
    $body .= "<div class='grid' style='grid-template-columns:1fr 1fr 1fr; gap:10px'>";

    foreach (['en'=>'EN','ar'=>'AR','ru'=>'RU'] as $lang => $lbl) {
      $k = $baseKey.'.'.$lang;
      $body .= "<div><div class='muted small'>{$lbl}</div><textarea name='".fkey($k)."' rows='3'>".val($k)."</textarea></div>";
    }

    $body .= "</div></div>";
  }

  $body .= "</div>";
}

$body .= "<div class='card'><button class='btn primary' type='submit'>Save</button></div>";
$body .= "</form>";

admin_layout('Notifications', $body);
