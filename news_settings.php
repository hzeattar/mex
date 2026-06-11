<?php
require_once __DIR__ . '/admin/includes/auth.php';
admin_require();
$pdo = db();
$msg = '';
$err = '';

$boolFields = [
  'news.enabled' => 'Enable client news center',
  'news.menu_enabled' => 'Show News in the main hamburger menu',
  'news.dashboard_ticker_enabled' => 'Show latest-news ticker on the dashboard',
  'news.toast_enabled' => 'Show in-app toast when a new announcement is published',
];
$textFields = [
  'news.default_source_label' => 'Default source label',
];
$intFields = [
  'news.max_items_home' => ['label' => 'Maximum items in dashboard/ticker', 'min' => 1, 'max' => 20, 'default' => 8],
  'news.max_items_page' => ['label' => 'Maximum items in the News page feed', 'min' => 1, 'max' => 40, 'default' => 12],
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    foreach ($boolFields as $key => $label) {
      setting_set($key, isset($_POST[$key]) ? '1' : '0');
    }
    foreach ($textFields as $key => $label) {
      setting_set($key, trim((string)($_POST[$key] ?? '')));
    }
    foreach ($intFields as $key => $meta) {
      $v = (int)($_POST[$key] ?? $meta['default']);
      $v = max((int)$meta['min'], min((int)$meta['max'], $v));
      setting_set($key, (string)$v);
    }
    admin_audit_log('news_settings_update', 'settings', 0, 'Updated news center settings');
    $msg = 'News settings saved';
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

$published = 0;
$drafts = 0;
$pinned = 0;
try {
  $published = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='published'")->fetchColumn();
  $drafts = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE status='draft'")->fetchColumn();
  $pinned = (int)$pdo->query("SELECT COUNT(*) FROM announcements WHERE pinned=1 AND status='published'")->fetchColumn();
} catch (Throwable $e) {}

$body = "<div class='split'><div><h1 class='section-title'>News Center Controls</h1><div class='muted small'>Control where client-facing news appears: the main menu, dashboard ticker, and in-app toast. These settings now write into the shared <code>settings</code> table used by the app shell.</div></div><div class='inline-actions'><a class='btn' href='/admin/news.php'>Manage announcements</a><a class='btn' href='/admin/dashboard.php'>Back to dashboard</a></div></div>";
if ($msg) $body .= "<div class='card'><span class='pill ok'>" . admin_h($msg) . "</span></div>";
if ($err) $body .= "<div class='card'><span class='pill bad'>" . admin_h($err) . "</span></div>";
$body .= "<div class='stats-grid'>";
$body .= admin_stat_card('Published', (string)$published, 'Currently visible to clients in the app feed.');
$body .= admin_stat_card('Drafts', (string)$drafts, 'Prepared announcements not yet visible.');
$body .= admin_stat_card('Pinned', (string)$pinned, 'Pinned items that stay above the rest.');
$body .= "</div>";
$body .= "<form method='post' class='card stack'>" . admin_csrf_input();
$body .= "<div class='admin-two-col'>";
foreach ($boolFields as $key => $label) {
  $checked = (string)setting_get($key, '1') === '1' ? ' checked' : '';
  $body .= "<label class='card' style='margin:0;padding:14px;display:flex;align-items:flex-start;gap:10px'><input type='checkbox' name='" . admin_h($key) . "' value='1'" . $checked . "><span><strong>" . admin_h($label) . "</strong><br><span class='muted small'>";
  if ($key === 'news.enabled') $body .= 'Master switch for the entire client news center.';
  elseif ($key === 'news.menu_enabled') $body .= 'Controls the main menu link inside the app shell.';
  elseif ($key === 'news.dashboard_ticker_enabled') $body .= 'Shows or hides the live latest-news ribbon on the dashboard.';
  elseif ($key === 'news.toast_enabled') $body .= 'Shows a short toast when a new announcement appears.';
  $body .= "</span></span></label>";
}
$body .= "<label><span class='muted small'>" . admin_h($textFields['news.default_source_label']) . "</span><input name='news.default_source_label' value='" . admin_h((string)setting_get('news.default_source_label', 'Trading Desk')) . "' placeholder='Trading Desk'></label>";
foreach ($intFields as $key => $meta) {
  $body .= "<label><span class='muted small'>" . admin_h($meta['label']) . "</span><input type='number' min='" . (int)$meta['min'] . "' max='" . (int)$meta['max'] . "' name='" . admin_h($key) . "' value='" . admin_h((string)setting_get($key, (string)$meta['default'])) . "'></label>";
}
$body .= "</div><div class='inline-actions' style='margin-top:12px'><button class='btn' type='submit'>Save controls</button></div></form>";
$body .= "<div class='card'><h2 style='margin:0 0 8px'>Operational notes</h2><div class='muted small'>If you imported the manual SQL patch and saw an error for <code>site_settings</code>, that happened because this project stores global options in the <code>settings</code> table, not <code>site_settings</code>. The updated SQL patch included in this pass writes to the correct table.</div></div>";
admin_layout('News Center Controls', $body);
