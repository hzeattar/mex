<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/lang.php';

function news_lang_resolve(string $lang): string {
  return tp_normalize_lang($lang, tp_project_langs(), 'en');
}
function news_i18n_pick(array $row, string $baseField, string $lang): string {
  $lang = news_lang_resolve($lang);
  $base = trim((string)($row[$baseField] ?? ''));
  $raw = trim((string)($row[$baseField . '_i18n'] ?? ''));
  if ($raw !== '') {
    $map = json_decode($raw, true);
    if (is_array($map)) {
      foreach ([$lang, 'en', 'ar'] as $cand) {
        if (!isset($map[$cand])) continue;
        $item = $map[$cand];
        if (is_array($item)) {
          $v = trim((string)($item[$baseField] ?? ''));
          if ($v !== '') return $v;
        } else {
          $v = trim((string)$item);
          if ($v !== '') return $v;
        }
      }
    }
  }
  return $base;
}
$uid = require_auth();
$lang = news_lang_resolve((string)($_GET['lang'] ?? 'en'));
$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid article id'], 422);
$pdo = db();
$driver = db_driver();
$voteAggSql = "SELECT article_id,
                      SUM(CASE WHEN vote=1 THEN 1 ELSE 0 END) AS likes_votes,
                      SUM(CASE WHEN vote=-1 THEN 1 ELSE 0 END) AS dislikes_votes
                 FROM news_article_votes
             GROUP BY article_id";
$sql = "SELECT a.*,
               (COALESCE(a.like_count,0) + COALESCE(v.likes_votes,0)) AS likes_total,
               (COALESCE(a.dislike_count,0) + COALESCE(v.dislikes_votes,0)) AS dislikes_total,
               COALESCE(uv.vote, 0) AS user_vote
          FROM news_articles a
     LEFT JOIN ($voteAggSql) v ON v.article_id = a.id
     LEFT JOIN news_article_votes uv ON uv.article_id = a.id AND uv.user_id = ?
         WHERE a.id=?
         LIMIT 1";
$st = $pdo->prepare($sql);
$st->execute([$uid, $id]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row || (int)($row['is_published'] ?? 0) !== 1) json_response(['ok'=>false,'error'=>'Article not found'], 404);
$row['like_count'] = (int)($row['likes_total'] ?? 0);
$row['dislike_count'] = (int)($row['dislikes_total'] ?? 0);
$row['user_vote'] = (int)($row['user_vote'] ?? 0);
$row['title'] = news_i18n_pick($row, 'title', $lang);
$row['summary'] = news_i18n_pick($row, 'summary', $lang);
$row['body'] = news_i18n_pick($row, 'body', $lang);
unset($row['title_i18n'], $row['summary_i18n'], $row['body_i18n'], $row['likes_total'], $row['dislikes_total']);
json_response(['ok'=>true,'item'=>$row]);
