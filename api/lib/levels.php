<?php
declare(strict_types=1);

require_once __DIR__ . '/feature_bootstrap.php';

function vp_pick_lang_value(array $row, string $base, string $lang = 'en'): string {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $key = $base . '_' . $lang;
  $v = trim((string)($row[$key] ?? ''));
  if ($v !== '') return $v;
  $v = trim((string)($row[$base . '_en'] ?? ''));
  if ($v !== '') return $v;
  return trim((string)($row[$base] ?? ''));
}

function vp_user_confirmed_deposit_total(PDO $pdo, int $uid): float {
  try {
    $st = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM deposits WHERE user_id=? AND status='confirmed'");
    $st->execute([$uid]);
    return (float)($st->fetchColumn() ?: 0);
  } catch (Throwable $e) {
    return 0.0;
  }
}

function vp_get_customer_levels(PDO $pdo, string $lang = 'en', bool $activeOnly = true): array {
  vp_feature_bootstrap($pdo, db_driver());
  $sql = "SELECT * FROM customer_levels" . ($activeOnly ? " WHERE status='active'" : '') . " ORDER BY min_deposit_total ASC, sort_order ASC, id ASC";
  $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
  return array_map(function(array $r) use ($lang): array {
    return [
      'id' => (int)($r['id'] ?? 0),
      'level_code' => (string)($r['level_code'] ?? ''),
      'name' => vp_pick_lang_value($r, 'name', $lang),
      'name_en' => (string)($r['name_en'] ?? ''),
      'name_ar' => (string)($r['name_ar'] ?? ''),
      'name_ru' => (string)($r['name_ru'] ?? ''),
      'perks' => vp_pick_lang_value($r, 'perks', $lang),
      'min_deposit_total' => (float)($r['min_deposit_total'] ?? 0),
      'sort_order' => (int)($r['sort_order'] ?? 0),
      'status' => (string)($r['status'] ?? 'active'),
      'features' => [
        'trading' => (bool)(($r['feat_trading'] ?? 1) ? true : false),
        'copy_bot' => (bool)(($r['feat_copy_bot'] ?? 0) ? true : false),
        'contracts' => (bool)(($r['feat_contracts'] ?? 0) ? true : false),
        'support' => (bool)(($r['feat_support'] ?? 0) ? true : false),
        'portfolio_manager' => (bool)(($r['feat_portfolio_manager'] ?? 0) ? true : false),
      ],
    ];
  }, $rows);
}

function vp_resolve_user_level(PDO $pdo, int $uid, string $lang = 'en'): array {
  $levels = vp_get_customer_levels($pdo, $lang, true);
  $total = vp_user_confirmed_deposit_total($pdo, $uid);
  $current = null;
  $next = null;
  foreach ($levels as $lvl) {
    if ($total + 1e-9 >= (float)$lvl['min_deposit_total']) {
      $current = $lvl;
      continue;
    }
    $next = $lvl;
    break;
  }
  if (!$current && $levels) { $current = $levels[0]; $next = $levels[1] ?? null; }
  if ($current && $next && (((int)($current['id'] ?? 0) === (int)($next['id'] ?? 0)) || ((string)($current['level_code'] ?? '') === (string)($next['level_code'] ?? '')))) {
    $currentIndex = 0;
    foreach ($levels as $idx => $lvl) {
      if (((int)($lvl['id'] ?? 0) === (int)($current['id'] ?? 0)) || ((string)($lvl['level_code'] ?? '') === (string)($current['level_code'] ?? ''))) { $currentIndex = $idx; break; }
    }
    $next = $levels[$currentIndex + 1] ?? null;
  }
  return [
    'confirmed_deposit_total' => $total,
    'current' => $current,
    'next' => $next,
    'levels' => $levels,
  ];
}

function vp_level_row_by_id(PDO $pdo, int $levelId, string $lang = 'en'): ?array {
  if ($levelId <= 0) return null;
  $rows = vp_get_customer_levels($pdo, $lang, false);
  foreach ($rows as $row) {
    if ((int)$row['id'] === $levelId) return $row;
  }
  return null;
}
