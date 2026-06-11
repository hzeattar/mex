<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';

require_method('POST');
$pdo = db();
$body = json_body();

$tg_id = (string)($body['tg_id'] ?? '');
$lang = strtolower(trim((string)($body['lang'] ?? 'en')));
$sig  = (string)($body['sig'] ?? '');

if($tg_id==='' || $sig==='') json_response(['ok'=>false,'error'=>'Missing'], 400);
if(!in_array($lang,['en','ar','ru'],true)) $lang='en';

$secret = (string)env('BOT_INTENT_SECRET','change_me');
$calc = hash_hmac('sha256', $tg_id.'|'.$lang, $secret);
if(!hash_equals($calc, $sig)) json_response(['ok'=>false,'error'=>'Bad signature'], 403);

try{
  // Persist language in the same field used by the bot + admin notifications
  // (users.locale). Keep backward-compat by also trying users.lang if it exists.
  $now = time();
  try {
    $st=$pdo->prepare("UPDATE users SET locale=?, updated_at=? WHERE tg_id=?");
    $st->execute([$lang, $now, $tg_id]);
  } catch (Throwable $e) {
    // ignore
  }
  try {
    $st=$pdo->prepare("UPDATE users SET lang=? WHERE tg_id=?");
    $st->execute([$lang, $tg_id]);
  } catch (Throwable $e) {
    // ignore
  }
}catch(Exception $e){}

json_response(['ok'=>true,'lang'=>$lang]);
