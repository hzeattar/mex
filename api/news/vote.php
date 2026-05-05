<?php
require_once __DIR__ . '/../lib/common.php';
$uid = require_auth();
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
  json_response(['ok'=>false,'error'=>'Method not allowed'], 405);
}
$body = json_body();
$id = (int)($body['id'] ?? $_POST['id'] ?? 0);
$voteIn = $body['vote'] ?? $_POST['vote'] ?? 0;
$voteMap = ['like' => 1, 'dislike' => -1, 'clear' => 0, '1' => 1, '-1' => -1, '0' => 0];
$key = is_string($voteIn) ? strtolower(trim($voteIn)) : (string)(int)$voteIn;
$vote = array_key_exists($key, $voteMap) ? (int)$voteMap[$key] : (int)$voteIn;
if (!in_array($vote, [-1,0,1], true)) $vote = 0;
if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid article id'], 422);
$pdo = db();
$now = time();
$article = $pdo->prepare('SELECT id,is_published FROM news_articles WHERE id=? LIMIT 1');
$article->execute([$id]);
$ar = $article->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$ar || (int)($ar['is_published'] ?? 0) !== 1) json_response(['ok'=>false,'error'=>'Article not found'], 404);
$currentVote = 0;
$st = $pdo->prepare('SELECT vote FROM news_article_votes WHERE article_id=? AND user_id=? LIMIT 1');
$st->execute([$id, $uid]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if ($row) $currentVote = (int)($row['vote'] ?? 0);
// toggle same vote => clear
if ($currentVote !== 0 && $vote === $currentVote) $vote = 0;
if ($vote === 0) {
  $pdo->prepare('DELETE FROM news_article_votes WHERE article_id=? AND user_id=?')->execute([$id, $uid]);
} elseif ($currentVote === 0) {
  $pdo->prepare('INSERT INTO news_article_votes(article_id,user_id,vote,created_at,updated_at) VALUES (?,?,?,?,?)')->execute([$id, $uid, $vote, $now, $now]);
} else {
  $pdo->prepare('UPDATE news_article_votes SET vote=?, updated_at=? WHERE article_id=? AND user_id=?')->execute([$vote, $now, $id, $uid]);
}
$agg = $pdo->prepare("SELECT 
  SUM(CASE WHEN vote=1 THEN 1 ELSE 0 END) AS likes_votes,
  SUM(CASE WHEN vote=-1 THEN 1 ELSE 0 END) AS dislikes_votes
  FROM news_article_votes WHERE article_id=?");
$agg->execute([$id]);
$votes = $agg->fetch(PDO::FETCH_ASSOC) ?: [];
$seed = $pdo->prepare('SELECT COALESCE(like_count,0) AS seed_likes, COALESCE(dislike_count,0) AS seed_dislikes FROM news_articles WHERE id=? LIMIT 1');
$seed->execute([$id]);
$base = $seed->fetch(PDO::FETCH_ASSOC) ?: ['seed_likes'=>0,'seed_dislikes'=>0];
json_response([
  'ok' => true,
  'item' => [
    'id' => $id,
    'user_vote' => $vote,
    'like_count' => (int)($base['seed_likes'] ?? 0) + (int)($votes['likes_votes'] ?? 0),
    'dislike_count' => (int)($base['seed_dislikes'] ?? 0) + (int)($votes['dislikes_votes'] ?? 0),
  ]
]);
