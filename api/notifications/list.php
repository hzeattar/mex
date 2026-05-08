<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
$limit = max(1, min(20, (int)($_GET['limit'] ?? 8)));
$pdo = db();
$items = [];
$now = time();
try {
  $st = $pdo->prepare("SELECT id,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,pinned,published_at,updated_at FROM announcements WHERE status='published' AND (published_at=0 OR published_at<=?) ORDER BY pinned DESC, published_at DESC, id DESC LIMIT {$limit}");
  $st->execute([$now]);
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $title = trim((string)($row['title_'.$lang] ?? '')) ?: (string)($row['title_en'] ?? 'Platform update');
    $body = trim((string)($row['body_'.$lang] ?? '')) ?: (string)($row['body_en'] ?? '');
    $items[] = [
      'id' => (int)($row['id'] ?? 0),
      'title' => $title,
      'text' => mb_substr(trim((string)preg_replace('~\s+~u', ' ', $body)), 0, 160),
      'url' => (string)($row['cta_url'] ?? '#/news'),
      'image_url' => (string)($row['image_url'] ?? ''),
      'source_label' => (string)($row['source_label'] ?? 'Platform'),
      'pinned' => (int)($row['pinned'] ?? 0),
      'published_at' => (int)($row['published_at'] ?? 0),
      'created_at' => (int)(($row['published_at'] ?? 0) ?: ($row['updated_at'] ?? 0)),
    ];
  }
} catch (Throwable $e) {
  $items = [];
}
json_response(['ok'=>true,'items'=>$items,'unread'=>count($items)]);
