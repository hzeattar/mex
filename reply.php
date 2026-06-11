<?php
declare(strict_types=1);
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';
require_method('POST');
$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$body = read_json_body();
$ticketId = (int)($body['ticket_id'] ?? 0);
$content = trim((string)($body['message'] ?? ''));
if ($ticketId <= 0) json_response(['ok'=>false,'error'=>'Ticket id required'], 422);
if ($content === '') json_response(['ok'=>false,'error'=>'Message is required'], 422);
if (mb_strlen($content) > 4000) $content = mb_substr($content, 0, 4000);
$pdo = db();
$st = $pdo->prepare('SELECT id,status FROM support_tickets WHERE id=? AND user_id=? LIMIT 1');
$st->execute([$ticketId, $uid]);
$ticket = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$ticket) json_response(['ok'=>false,'error'=>'Ticket not found'], 404);
$now = time();
$pdo->prepare('INSERT INTO support_messages(ticket_id,sender,msg_type,content,created_at) VALUES (?,?,?,?,?)')
    ->execute([$ticketId,'user','text',$content,$now]);
$newStatus = in_array(strtolower((string)($ticket['status'] ?? 'open')), ['closed','resolved'], true) ? 'open' : (string)$ticket['status'];
$pdo->prepare('UPDATE support_tickets SET status=?, updated_at=?, last_message_at=?, customer_last_viewed_at=? WHERE id=?')->execute([$newStatus,$now,$now,$now,$ticketId]);
json_response(['ok'=>true]);
