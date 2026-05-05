<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/lib/settings.php';
admin_require();

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$langs = [
  'en' => 'English',
  'ar' => 'العربية',
  'ru' => 'Русский',
  'fr' => 'Français',
  'de' => 'Deutsch',
  'zh' => '中文',
];

$msg = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  // Entry router (support bot)
  $entry = trim((string)($_POST['support_entry'] ?? ''));
  if ($entry !== '' && !preg_match('~^https?://~i', $entry)) {
    $entry = ltrim($entry, "@ \t\n\r\0\x0B");
  }
  setting_set('support.entry', $entry);

  foreach ($langs as $code => $label) {
    $val = trim((string)($_POST['support_'.$code] ?? ''));
    // allow empty (clear)
    if ($val !== '' && !preg_match('~^https?://~i', $val)) {
      $val = ltrim($val, "@ \t\n\r\0\x0B");
    }
    setting_set('support.username.' . $code, $val);
  }
  $msg = 'Saved ✅';
}

$entryCurrent = (string)setting_get('support.entry', '');

$current = [];
foreach ($langs as $code => $label) {
  $current[$code] = (string)setting_get('support.username.' . $code, '');
}

ob_start();
?>
<div class="card">
  <h2 style="margin:0 0 10px">Support Contacts (by language)</h2>
  <p style="margin:0 0 10px;color:#94a3b8">
    Flow used by the Mini App:
    <b>(1)</b> user selects support language inside the Mini App,
    <b>(2)</b> Mini App opens the <b>Support Entry (router bot)</b>,
    <b>(3)</b> router bot shows suggested questions and finally redirects the user to the configured contact for that language.
  </p>
  <?php if($msg): ?>
    <div class="pill ok" style="margin-bottom:10px"><?=h($msg)?></div>
  <?php endif; ?>

  <form method="post" class="grid">
    <div style="grid-column:1/-1">
      <label>Support Entry (router bot username / URL)</label><br>
      <input name="support_entry" value="<?=h($entryCurrent)?>" placeholder="@vertexpluse_support_bot">
      <div class="muted small" style="margin-top:6px">Key: <code>support.entry</code> (the Mini App opens this first)</div>
    </div>

    <?php foreach($langs as $code=>$label): ?>
      <div>
        <label><?=h($label)?> Username / URL</label><br>
        <input name="support_<?=h($code)?>" value="<?=h($current[$code] ?? '')?>" placeholder="@support_username">
        <div class="muted small" style="margin-top:6px">Key: <code>support.username.<?=h($code)?></code></div>
      </div>
    <?php endforeach; ?>
    <div>
      <button class="btn" type="submit">Save</button>
    </div>
  </form>
</div>

<div class="card">
  <h3 style="margin:0 0 10px">Notes</h3>
  <ul style="margin:0; padding-left:18px; color:#cbd5e1">
    <li><b>Support Entry</b> should usually be a bot (router), with webhook pointing to <code>/bot/support_webhook.php</code>.</li>
    <li>Per-language contacts can be a bot or a human username. If it's a bot, it will include a <code>?start=</code> payload with reason.</li>
    <li>Managers will receive a notification via the configured manager bot when a user chooses a support reason.</li>
  </ul>
</div>
<?php
$body = ob_get_clean();
admin_layout('Support Contacts', $body);
