<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/ledger.php';

header('Content-Type: application/json; charset=utf-8');

function bot_require_token() {
  $expected = (string)env('BOT_API_TOKEN', '');
  if ($expected === '') {
    json_response(['ok'=>false,'error'=>'BOT_API_TOKEN not configured'], 500);
  }
  $got = $_SERVER['HTTP_X_BOT_TOKEN'] ?? '';
  if (!hash_equals($expected, (string)$got)) {
    json_response(['ok'=>false,'error'=>'Unauthorized'], 401);
  }
}

function bot_user_by_telegram_id(PDO $pdo, string $telegramId) {
  $telegramId = trim($telegramId);
  if ($telegramId === '') return null;
  $st = $pdo->prepare('SELECT * FROM users WHERE telegram_id = ? LIMIT 1');
  $st->execute([$telegramId]);
  return $st->fetch() ?: null;
}
