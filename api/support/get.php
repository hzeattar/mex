<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) json_response(['ok'=>false,'error'=>'Ticket id required'], 422);
$pdo = db();
$st = $pdo->prepare('SELECT * FROM support_tickets WHERE id=? AND user_id=? LIMIT 1');
$st->execute([$id, $uid]);
$ticket = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$ticket) json_response(['ok'=>false,'error'=>'Ticket not found'], 404);
$ms = $pdo->prepare('SELECT id,sender,msg_type,content,created_at FROM support_messages WHERE ticket_id=? ORDER BY id ASC LIMIT 500');
$ms->execute([$id]);
$messages = $ms->fetchAll(PDO::FETCH_ASSOC) ?: [];
$now = time();
try {
  $pdo->prepare('UPDATE support_tickets SET customer_last_viewed_at=?, updated_at=CASE WHEN updated_at<? THEN ? ELSE updated_at END WHERE id=? AND user_id=?')->execute([$now,$now,$now,$id,$uid]);
  $ticket['customer_last_viewed_at'] = $now;
} catch (Throwable $e) {
  // ignore best-effort view mark
}
$ticket['unread_count'] = 0;
json_response(['ok'=>true,'ticket'=>$ticket,'messages'=>$messages]);
