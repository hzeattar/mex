<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/levels.php';

$pdo = db();
$driver = db_driver();

$lang = strtolower(trim((string)($_GET['lang'] ?? '')));
if (!in_array($lang, ['en','ar','ru'], true)) {
  $lang = '';
}
$uid = session_user_id();
if ($lang === '' && $uid > 0) {
  try {
    $st = $pdo->prepare('SELECT locale FROM users WHERE id=?');
    $st->execute([$uid]);
    $l = strtolower((string)($st->fetchColumn() ?: ''));
    if (in_array($l, ['en','ar','ru'], true)) $lang = $l;
  } catch (Throwable $e) {}
}
if ($lang === '') $lang = 'en';

$kind = strtolower(trim((string)($_GET['kind'] ?? 'plan')));
if (!in_array($kind, ['plan','contract','all'], true)) $kind = 'plan';

if (!schema_table_exists($pdo, 'invest_plans', $driver)) {
  json_response(['ok'=>true,'lang'=>$lang,'kind'=>$kind,'user_level'=>null,'next_level'=>null,'confirmed_deposit_total'=>0,'items'=>[]]);
}

$hasPlan = static function(string $column) use ($pdo, $driver): bool {
  return schema_column_exists($pdo, 'invest_plans', $column, $driver);
};
$planCol = static function(string $column, string $defaultSql = 'NULL') use ($hasPlan): string {
  return $hasPlan($column) ? "p.$column" : "$defaultSql AS $column";
};
$levelsTable = schema_table_exists($pdo, 'customer_levels', $driver);
$where = ["COALESCE({$planCol('status', "'active'")}, 'active')='active'"];
$args = [];
if ($kind !== 'all') {
  $where[] = "COALESCE({$planCol('product_kind', "'plan'")}, 'plan')=?";
  $args[] = $kind;
}

$levelJoin = $levelsTable
  ? "LEFT JOIN customer_levels l ON l.id={$planCol('required_level_id', 'NULL')}"
  : "LEFT JOIN (SELECT NULL AS id, NULL AS level_code, NULL AS name_en, NULL AS name_ar, NULL AS name_ru, NULL AS min_deposit_total) l ON 1=0";

$sql = "SELECT p.id,
               {$planCol('name', "''")}, {$planCol('name_en', "''")}, {$planCol('name_ar', "''")}, {$planCol('name_ru', "''")},
               {$planCol('desc_en', "''")}, {$planCol('desc_ar', "''")}, {$planCol('desc_ru', "''")},
               {$planCol('details_en', "''")}, {$planCol('details_ar', "''")}, {$planCol('details_ru', "''")},
               {$planCol('features_en', "''")}, {$planCol('features_ar', "''")}, {$planCol('features_ru', "''")},
               {$planCol('badge_en', "''")}, {$planCol('badge_ar', "''")}, {$planCol('badge_ru', "''")},
               {$planCol('headline_en', "''")}, {$planCol('headline_ar', "''")}, {$planCol('headline_ru', "''")},
               {$planCol('term_days', '0')}, {$planCol('roi_percent', '0')}, {$planCol('min_amount', '0')}, {$planCol('max_amount', '0')},
               {$planCol('risk', "'medium'")}, {$planCol('payout_schedule', "'end'")},
               {$planCol('early_exit_allowed', '0')}, {$planCol('early_exit_penalty_percent', '0')},
               {$planCol('status', "'active'")}, {$planCol('sort_order', '0')},
               COALESCE({$planCol('product_kind', "'plan'")}, 'plan') AS product_kind,
               COALESCE({$planCol('is_perpetual', '0')}, 0) AS is_perpetual,
               {$planCol('required_level_id', 'NULL')} AS required_level_id,
               l.level_code,l.name_en AS level_name_en,l.name_ar AS level_name_ar,l.name_ru AS level_name_ru,l.min_deposit_total
        FROM invest_plans p
        {$levelJoin}
        WHERE " . implode(' AND ', $where) . "
        ORDER BY COALESCE({$planCol('sort_order', '0')},0) ASC, COALESCE({$planCol('term_days', '0')},0) ASC, p.id ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute($args);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$userLevel = $uid > 0 ? vp_resolve_user_level($pdo, $uid, $lang) : ['confirmed_deposit_total'=>0,'current'=>null,'next'=>null];
$totalDeposits = (float)($userLevel['confirmed_deposit_total'] ?? 0);
$currentLevelId = (int)($userLevel['current']['id'] ?? 0);

$items = array_map(function($r) use ($lang, $totalDeposits, $currentLevelId) {
  $max = isset($r['max_amount']) ? (float)$r['max_amount'] : 0.0;
  $requiredLevelId = (int)($r['required_level_id'] ?? 0);
  $requiredLevel = $requiredLevelId > 0 ? [
    'id' => $requiredLevelId,
    'code' => (string)($r['level_code'] ?? ''),
    'name' => vp_pick_lang_value(['name_en'=>$r['level_name_en'] ?? '', 'name_ar'=>$r['level_name_ar'] ?? '', 'name_ru'=>$r['level_name_ru'] ?? ''], 'name', $lang),
    'min_deposit_total' => (float)($r['min_deposit_total'] ?? 0),
  ] : null;
  $eligible = !$requiredLevel || $totalDeposits + 1e-9 >= (float)$requiredLevel['min_deposit_total'];
  return [
    'id' => (string)($r['id'] ?? ''),
    'name' => vp_pick_lang_value($r, 'name', $lang),
    'desc' => vp_pick_lang_value($r, 'desc', $lang),
    'details' => vp_pick_lang_value($r, 'details', $lang),
    'features' => vp_pick_lang_value($r, 'features', $lang),
    'badge' => vp_pick_lang_value($r, 'badge', $lang),
    'headline' => vp_pick_lang_value($r, 'headline', $lang),
    'term_days' => (int)($r['term_days'] ?? 0),
    'roi_percent' => (float)($r['roi_percent'] ?? 0),
    'min_amount' => (float)($r['min_amount'] ?? 0),
    'max_amount' => $max,
    'risk' => (string)($r['risk'] ?? 'medium'),
    'payout_schedule' => (string)($r['payout_schedule'] ?? 'end'),
    'early_exit_allowed' => (int)($r['early_exit_allowed'] ?? 0),
    'early_exit_penalty_percent' => (float)($r['early_exit_penalty_percent'] ?? 0),
    'product_kind' => (string)($r['product_kind'] ?? 'plan'),
    'is_perpetual' => (int)($r['is_perpetual'] ?? 0),
    'required_level' => $requiredLevel,
    'eligible' => $eligible,
    'user_level_id' => $currentLevelId,
  ];
}, $rows);

json_response(['ok'=>true,'lang'=>$lang,'kind'=>$kind,'user_level'=>$userLevel['current'] ?? null,'next_level'=>$userLevel['next'] ?? null,'confirmed_deposit_total'=>$totalDeposits,'items'=>$items]);
