<?php

declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';
$err = '';
$fields = [
  'site.brand' => 'Brand name',
  'site.tagline' => 'Tagline',
  'site.hero_title' => 'Landing hero title',
  'site.hero_subtitle' => 'Landing hero subtitle',
  'site.hero_primary_text' => 'Primary CTA text',
  'site.hero_primary_url' => 'Primary CTA URL',
  'site.hero_secondary_text' => 'Secondary CTA text',
  'site.hero_secondary_url' => 'Secondary CTA URL',
  'site.support_email' => 'Support email',
  'bot.username' => 'Telegram login bot username (without @)',
  'site.public_footer_note' => 'Footer note',
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    foreach ($fields as $key => $label) {
      $val = trim((string)($_POST[$key] ?? ''));
      setting_set($key, $val);
    }

    if (!empty($_POST['remove_logo'])) {
      $old = (string)setting_get('site.app_logo_url', '');
      if ($old !== '') admin_delete_uploaded_asset($old);
      setting_set('site.app_logo_url', '');
    }

    $upload = admin_store_uploaded_image('app_logo_file', 'site', 'site_logo_');
    if (!empty($upload['error'])) {
      $err = (string)$upload['error'];
    } elseif (!empty($upload['ok']) && !empty($upload['path'])) {
      $old = (string)setting_get('site.app_logo_url', '');
      if ($old !== '' && $old !== $upload['path']) admin_delete_uploaded_asset($old);
      setting_set('site.app_logo_url', (string)$upload['path']);
    }

    if ($err === '') {
      $msg = 'Saved';
      admin_audit_log('update', 'site_settings', 0, 'Updated public site settings and branding');
    }
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

$logoUrl = (string)setting_get('site.app_logo_url', '');
$body = "<div class='card'><div class='split'><div><h2 class='section-title'>Site Settings</h2><p class='muted'>Manage the public branding and app shell text from one clean screen. The app header logo is now uploaded directly from admin instead of pasting a URL. Telegram login can use the bot username stored here together with the bot token from the server environment.</p></div><span class='pill'>Branding</span></div>";
if ($msg) $body .= "<p><span class='pill ok'>" . admin_h($msg) . "</span></p>";
if ($err) $body .= "<p><span class='pill bad'>" . admin_h($err) . "</span></p>";
$body .= "<form method='post' class='grid' enctype='multipart/form-data'>" . admin_csrf_input();
foreach ($fields as $key => $label) {
  $val = (string)setting_get($key, '');
  $isLong = str_contains($key, 'subtitle') || str_contains($key, 'footer_note');
  $body .= "<label style='grid-column:1/-1'>" . admin_h($label) . "<br>";
  if ($isLong) {
    $body .= "<textarea name='" . admin_h($key) . "' rows='4'>" . admin_h($val) . "</textarea>";
  } else {
    $body .= "<input name='" . admin_h($key) . "' value='" . admin_h($val) . "'>";
  }
  $body .= "</label>";
}
$body .= "<label style='grid-column:1/-1'>App header logo image<br><input type='file' name='app_logo_file' accept='image/*'></label>";
$body .= "<div class='form-note' style='grid-column:1/-1'>Upload a PNG, JPG, WEBP, GIF, or SVG image. The logo will be stored locally under assets and used in the mobile app header automatically.</div>";
if ($logoUrl !== '') {
  $body .= "<div style='grid-column:1/-1' class='admin-media-preview'><img src='" . admin_h($logoUrl) . "' alt='Current logo'><label style='display:flex;gap:8px;align-items:center'><input type='checkbox' name='remove_logo' value='1'><span>Remove current logo</span></label></div>";
}
$body .= "<div style='grid-column:1/-1;display:flex;gap:10px;align-items:center'><button class='btn' type='submit'>Save settings</button></div></form></div>";
admin_layout('Site Settings', $body);
