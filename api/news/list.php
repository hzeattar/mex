<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';
require_once __DIR__ . '/../lib/settings.php';
$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
$enabled = (string)setting_get('news.enabled', '1') === '1';
$menuEnabled = (string)setting_get('news.menu_enabled', '1') === '1';
$tickerEnabled = (string)setting_get('news.dashboard_ticker_enabled', '1') === '1';
$toastEnabled = (string)setting_get('news.toast_enabled', '1') === '1';
$homeLimit = max(1, min(20, (int)setting_get('news.max_items_home', '8')));
$pageLimit = max(1, min(40, (int)setting_get('news.max_items_page', '12')));
$limit = max(1, min($pageLimit, (int)($_GET['limit'] ?? $pageLimit)));
$pdo = db();
$now = time();
$out = [];
if ($enabled) {
  $st = $pdo->prepare("SELECT * FROM announcements WHERE status='published' AND (published_at=0 OR published_at<=?) ORDER BY pinned DESC, published_at DESC, id DESC LIMIT {$limit}");
  $st->execute([$now]);
  $items = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($items as $row) {
    $title = trim((string)($row['title_'.$lang] ?? ''));
    $body = trim((string)($row['body_'.$lang] ?? ''));
    if ($title === '') $title = trim((string)($row['title_en'] ?? ''));
    if ($body === '') $body = trim((string)($row['body_en'] ?? ''));
    $excerpt = mb_substr(trim((string)preg_replace('~\s+~u', ' ', $body)), 0, 200);
    $out[] = [
      'id' => (int)($row['id'] ?? 0),
      'slug' => (string)($row['slug'] ?? ''),
      'title' => $title,
      'body' => $body,
      'excerpt' => $excerpt,
      'status' => (string)($row['status'] ?? 'draft'),
      'pinned' => (int)($row['pinned'] ?? 0),
      'published_at' => (int)($row['published_at'] ?? 0),
      'updated_at' => (int)($row['updated_at'] ?? 0),
      'image_url' => (string)($row['image_url'] ?? ''),
      'cta_url' => (string)($row['cta_url'] ?? ''),
      'source_label' => (string)($row['source_label'] ?? ''),
    ];
  }
}
json_response(['ok'=>true,'items'=>$out,'config'=>[
  'enabled'=>$enabled,
  'menu_enabled'=>$menuEnabled,
  'dashboard_ticker_enabled'=>$tickerEnabled,
  'toast_enabled'=>$toastEnabled,
  'max_items_home'=>$homeLimit,
  'max_items_page'=>$pageLimit,
]]);
