<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/levels.php';

$uid = require_auth();
$pdo = db();
$driver = db_driver();
$lang = strtolower(trim((string)($_GET['lang'] ?? '')));
if (!in_array($lang, ['en','ar','ru'], true)) {
  try {
    $st = $pdo->prepare('SELECT locale FROM users WHERE id=?');
    $st->execute([$uid]);
    $lang = strtolower((string)($st->fetchColumn() ?: 'en'));
  } catch (Throwable $e) {
    $lang = 'en';
  }
  if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
}

if (!schema_table_exists($pdo, 'investments', $driver) || !schema_table_exists($pdo, 'invest_plans', $driver)) {
  json_response(['ok'=>true,'lang'=>$lang,'items'=>[]]);
}

$hasInv = static function(string $column) use ($pdo, $driver): bool {
  return schema_column_exists($pdo, 'investments', $column, $driver);
};
$hasPlan = static function(string $column) use ($pdo, $driver): bool {
  return schema_column_exists($pdo, 'invest_plans', $column, $driver);
};
$invCol = static function(string $column, string $defaultSql = 'NULL') use ($hasInv): string {
  return $hasInv($column) ? "i.$column" : "$defaultSql AS $column";
};
$planCol = static function(string $column, string $defaultSql = 'NULL') use ($hasPlan): string {
  return $hasPlan($column) ? "p.$column" : "$defaultSql AS $column";
};
$levelJoin = schema_table_exists($pdo, 'customer_levels', $driver)
  ? 'LEFT JOIN customer_levels l ON l.id=COALESCE(i.required_level_id,p.required_level_id)'
  : 'LEFT JOIN (SELECT NULL AS id, NULL AS level_code, NULL AS name_en, NULL AS name_ar, NULL AS name_ru, NULL AS min_deposit_total) l ON 1=0';

$stmt = $pdo->prepare("SELECT i.*, 
                              {$planCol('name', "''")},
                              {$planCol('name_en', "''")},
                              {$planCol('name_ar', "''")},
                              {$planCol('name_ru', "''")},
                              COALESCE({$planCol('product_kind', "'plan'")}, 'plan') AS plan_product_kind,
                              COALESCE({$planCol('is_perpetual', '0')}, 0) AS plan_is_perpetual,
                              {$planCol('required_level_id', 'NULL')} AS plan_required_level_id,
                              l.level_code,l.name_en AS level_name_en,l.name_ar AS level_name_ar,l.name_ru AS level_name_ru,l.min_deposit_total
  FROM investments i
  JOIN invest_plans p ON p.id=i.plan_id
  {$levelJoin}
  WHERE i.user_id=?
  ORDER BY i.id DESC LIMIT 100");
$stmt->execute([$uid]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

$items = array_map(function($r) use ($lang) {
  $paid = (float)($r['paid_total'] ?? 0);
  $expected = (float)($r['expected_return'] ?? 0);
  $status = (string)($r['status'] ?? 'active');
  $end = (int)($r['end_at'] ?? 0);
  $now = time();
  $matured = ($status === 'active' && $end > 0 && $end <= $now);
  $productKind = strtolower((string)($r['product_kind'] ?? $r['plan_product_kind'] ?? 'plan'));
  $isPerpetual = (int)($r['is_perpetual'] ?? $r['plan_is_perpetual'] ?? 0) === 1;
  $remaining = $isPerpetual ? null : max(0, $expected - $paid);
  $requiredLevelId = (int)($r['required_level_id'] ?? $r['plan_required_level_id'] ?? 0);
  return [
    'id'=>(int)($r['id'] ?? 0),
    'plan_id'=>(string)($r['plan_id'] ?? ''),
    'plan_name'=>vp_pick_lang_value($r, 'name', $lang),
    'amount'=>(float)($r['amount'] ?? 0),
    'expected_return'=>$expected,
    'paid_total'=>$paid,
    'remaining'=>$remaining,
    'payout_schedule'=>(string)($r['payout_schedule'] ?? 'end'),
    'status'=>$status,
    'matured'=>$matured,
    'start_at'=>(int)($r['start_at'] ?? 0),
    'end_at'=>$end,
    'product_kind'=>$productKind,
    'is_perpetual'=>$isPerpetual ? 1 : 0,
    'cycle_roi_percent'=>(float)($r['cycle_roi_percent'] ?? 0),
    'required_level'=>$requiredLevelId > 0 ? [
      'id'=>$requiredLevelId,
      'code'=>(string)($r['level_code'] ?? ''),
      'name'=>vp_pick_lang_value(['name_en'=>$r['level_name_en'] ?? '', 'name_ar'=>$r['level_name_ar'] ?? '', 'name_ru'=>$r['level_name_ru'] ?? ''], 'name', $lang),
      'min_deposit_total'=>(float)($r['min_deposit_total'] ?? 0),
    ] : null,
  ];
}, $rows);

json_response(['ok'=>true,'lang'=>$lang,'items'=>$items]);
