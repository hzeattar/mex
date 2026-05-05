<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';
require_method('POST');
$uid = session_user_id();
if ($uid <= 0) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
$body = read_json_body();
$reason = preg_replace('~[^a-z0-9_\-]~i', '', (string)($body['reason_code'] ?? 'general')) ?: 'general';
$subject = trim((string)($body['subject'] ?? ''));
$content = trim((string)($body['message'] ?? ''));
$lang = strtolower(trim((string)($body['lang'] ?? 'en')));
$priority = strtolower(trim((string)($body['priority'] ?? 'normal')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
if (!in_array($priority, ['low','normal','high','urgent'], true)) $priority = 'normal';
if ($subject === '') $subject = ucfirst(str_replace('_', ' ', $reason));
if ($content === '') json_response(['ok'=>false,'error'=>'Message is required'], 422);
if (mb_strlen($subject) > 190) $subject = mb_substr($subject, 0, 190);
if (mb_strlen($content) > 4000) $content = mb_substr($content, 0, 4000);
$pdo = db();
$now = time();
$me = null;
try { $s = $pdo->prepare('SELECT tg_id, telegram_chat_id FROM users WHERE id=? LIMIT 1'); $s->execute([$uid]); $me = $s->fetch(PDO::FETCH_ASSOC) ?: null; } catch (Throwable $e) {}
$tgId = (string)($me['tg_id'] ?? '');
$chatId = (string)($me['telegram_chat_id'] ?? '');
$pdo->prepare('INSERT INTO support_tickets(user_id,tg_id,chat_id,lang,reason_code,subject,priority,status,created_at,updated_at,last_message_at,customer_last_viewed_at,admin_last_viewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$uid,$tgId,$chatId,$lang,$reason,$subject,$priority,'open',$now,$now,$now,$now,0]);
$ticketId = (int)$pdo->lastInsertId();
$pdo->prepare('INSERT INTO support_messages(ticket_id,sender,msg_type,content,created_at) VALUES (?,?,?,?,?)')
    ->execute([$ticketId,'user','text',$content,$now]);
json_response(['ok'=>true,'ticket_id'=>$ticketId]);
