<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$pdo = db();
$status = strtolower(trim((string)($_GET['status'] ?? 'all')));
$params = [$uid];
$sql = 'SELECT t.* FROM support_tickets t WHERE t.user_id=?';
if ($status !== '' && $status !== 'all') { $sql .= ' AND LOWER(t.status)=?'; $params[] = $status; }
$sql .= ' ORDER BY COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC, t.id DESC LIMIT 100';
$st = $pdo->prepare($sql);
$st->execute($params);
$items = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
$lastStmt = $pdo->prepare('SELECT content, created_at, sender FROM support_messages WHERE ticket_id=? ORDER BY id DESC LIMIT 1');
$unreadStmt = $pdo->prepare('SELECT COUNT(*) FROM support_messages WHERE ticket_id=? AND sender=? AND created_at>?');
foreach ($items as &$row) {
  try {
    $ticketId = (int)($row['id'] ?? 0);
    $lastStmt->execute([$ticketId]);
    $m = $lastStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    $row['last_message_preview'] = $m ? mb_substr(trim((string)($m['content'] ?? '')), 0, 180) : '';
    $row['last_message_sender'] = $m ? (string)($m['sender'] ?? '') : '';
    $row['last_message_created_at'] = $m ? (int)($m['created_at'] ?? 0) : 0;

    $customerSeenAt = (int)($row['customer_last_viewed_at'] ?? 0);
    $unreadStmt->execute([$ticketId, 'admin', $customerSeenAt]);
    $row['unread_count'] = (int)$unreadStmt->fetchColumn();
    $row['has_unread'] = ((int)$row['unread_count']) > 0;
    $row['waiting_on_client'] = ($row['last_message_sender'] ?? '') === 'admin';
    $row['waiting_on_staff'] = ($row['last_message_sender'] ?? '') === 'user';
  } catch (Throwable $e) {
    $row['last_message_preview'] = '';
    $row['last_message_sender'] = '';
    $row['last_message_created_at'] = 0;
    $row['unread_count'] = 0;
    $row['has_unread'] = false;
    $row['waiting_on_client'] = false;
    $row['waiting_on_staff'] = false;
  }
}
unset($row);
json_response(['ok'=>true,'items'=>$items]);
