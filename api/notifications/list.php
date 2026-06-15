<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';
require_once __DIR__ . '/../lib/user_notifications.php';

$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
$limit = max(1, min(20, (int)($_GET['limit'] ?? 8)));
$markRead = (string)($_GET['mark_read'] ?? '') === '1';
$pdo = db();
$items = [];
$userNotificationIds = [];
$now = time();
try {
  user_notifications_ensure_schema($pdo);
  $ust = $pdo->prepare('SELECT id,kind,title,message,url,read_at,created_at FROM user_notifications WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT ?');
  $ust->bindValue(1, $uid, PDO::PARAM_INT);
  $ust->bindValue(2, $limit, PDO::PARAM_INT);
  $ust->execute();
  foreach (($ust->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $ts = (int)($row['created_at'] ?? 0);
    $read = ((int)($row['read_at'] ?? 0)) > 0;
    if (!$read) $userNotificationIds[] = (int)($row['id'] ?? 0);
    $items[] = [
      'id' => 'u-' . (int)($row['id'] ?? 0),
      'title' => (string)($row['title'] ?? ''),
      'message' => (string)($row['message'] ?? ''),
      'url' => (string)(($row['url'] ?? '') ?: '#/wallet?action=history'),
      'source_label' => 'Account',
      'kind' => (string)($row['kind'] ?? 'info'),
      'read' => $read,
      'created_at' => $ts > 0 ? date('M d, H:i', $ts) : '',
      'created_ts' => $ts,
      'pinned' => 0,
    ];
  }
} catch (Throwable $e) {
  // Keep announcements available even if a legacy database cannot create the notification table.
}
$unread = 0;
foreach ($items as $row) {
  if (empty($row['read'])) $unread++;
}
try {
  $annLimit = max(1, $limit - count($items));
  $st = $pdo->prepare("SELECT id,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,pinned,published_at,updated_at FROM announcements WHERE status='published' AND (published_at=0 OR published_at<=?) ORDER BY pinned DESC, published_at DESC, id DESC LIMIT {$annLimit}");
  $st->execute([$now]);
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $title = trim((string)($row['title_'.$lang] ?? '')) ?: (string)($row['title_en'] ?? 'Platform update');
    $body = trim((string)($row['body_'.$lang] ?? '')) ?: (string)($row['body_en'] ?? '');
    $ts = (int)(($row['published_at'] ?? 0) ?: ($row['updated_at'] ?? 0));
    $items[] = [
      'id' => 'a-' . (int)($row['id'] ?? 0),
      'title' => $title,
      'text' => mb_substr(trim((string)preg_replace('~\s+~u', ' ', $body)), 0, 160),
      'url' => (string)($row['cta_url'] ?? '#/news'),
      'image_url' => (string)($row['image_url'] ?? ''),
      'source_label' => (string)($row['source_label'] ?? 'Platform'),
      'pinned' => (int)($row['pinned'] ?? 0),
      'published_at' => (int)($row['published_at'] ?? 0),
      'created_at' => $ts > 0 ? date('M d, H:i', $ts) : '',
      'created_ts' => $ts,
      'read' => false,
    ];
  }
} catch (Throwable $e) {
}
usort($items, static function(array $a, array $b): int {
  $pin = ((int)($b['pinned'] ?? 0)) <=> ((int)($a['pinned'] ?? 0));
  if ($pin !== 0) return $pin;
  return ((int)($b['created_ts'] ?? 0)) <=> ((int)($a['created_ts'] ?? 0));
});
$items = array_slice($items, 0, $limit);
if ($markRead && $userNotificationIds) {
  try {
    $ids = array_values(array_filter(array_map('intval', $userNotificationIds), static fn($id) => $id > 0));
    if ($ids) {
      $placeholders = implode(',', array_fill(0, count($ids), '?'));
      $params = array_merge([time(), $uid], $ids);
      $upd = $pdo->prepare("UPDATE user_notifications SET read_at=? WHERE user_id=? AND read_at=0 AND id IN ({$placeholders})");
      $upd->execute($params);
    }
  } catch (Throwable $e) {}
}
json_response(['ok'=>true,'items'=>$items,'unread'=>$unread]);
