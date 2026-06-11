<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/lang.php';

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
$limit = max(1, min(10, (int)($_GET['limit'] ?? 5)));
$lang = news_lang_resolve((string)($_GET['lang'] ?? 'en'));
$pdo = db();
$now = time();
$st = $pdo->prepare('SELECT id,title,title_i18n,published_at FROM news_articles WHERE is_published=1 AND published_at<=? ORDER BY published_at DESC, id DESC LIMIT ?');
$st->bindValue(1, $now, PDO::PARAM_INT);
$st->bindValue(2, $limit, PDO::PARAM_INT);
$st->execute();
$items = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
foreach ($items as &$it) {
  $it['title'] = news_i18n_pick($it, 'title', $lang);
  unset($it['title_i18n']);
}
unset($it);
json_response(['ok'=>true,'items'=>$items]);
