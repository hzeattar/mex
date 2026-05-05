<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/levels.php';

$uid = require_auth();
$pdo = db();
$lang = strtolower(trim((string)($_GET['lang'] ?? '')));
if (!in_array($lang, ['en','ar','ru'], true)) {
  try {
    $st = $pdo->prepare('SELECT locale FROM users WHERE id=? LIMIT 1');
    $st->execute([$uid]);
    $lang = strtolower((string)($st->fetchColumn() ?: 'en'));
  } catch (Throwable $e) {
    $lang = 'en';
  }
}
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
json_response(['ok'=>true,'lang'=>$lang] + vp_resolve_user_level($pdo, $uid, $lang));
