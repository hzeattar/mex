<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/settings.php';

$lang = strtolower((string)($_GET['lang'] ?? 'en'));
if (!in_array($lang, ['en','ar','ru','hi'], true)) $lang = 'en';

$pdo = db();
$like = 'app.i18n.%.' . $lang;
$out = [];

try {
  $profile = settings_schema_profile($pdo);
  $selectKey = (!empty($profile['setting_key']) && !empty($profile['key']))
    ? "COALESCE(NULLIF(setting_key,''), `key`)"
    : (!empty($profile['setting_key']) ? 'setting_key' : (!empty($profile['key']) ? '`key`' : 'NULL'));
  $selectValue = (!empty($profile['setting_value']) && !empty($profile['value']))
    ? "COALESCE(NULLIF(setting_value,''), value)"
    : (!empty($profile['setting_value']) ? 'setting_value' : (!empty($profile['value']) ? 'value' : 'NULL'));
  $where = [];
  $params = [];
  if (!empty($profile['setting_key'])) { $where[] = 'setting_key LIKE ?'; $params[] = $like; }
  if (!empty($profile['key'])) { $where[] = '`key` LIKE ?'; $params[] = $like; }
  if ($where) {
    $sql = 'SELECT ' . $selectKey . ' AS setting_key, ' . $selectValue . ' AS setting_value FROM settings WHERE ' . implode(' OR ', $where);
    $st = $pdo->prepare($sql);
    $st->execute($params);
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
      $k = trim((string)($r['setting_key'] ?? ''));
      $v = trim((string)($r['setting_value'] ?? ''));
      if ($k === '' || $v === '' || !str_starts_with($k, 'app.i18n.')) continue;
      $base = substr($k, strlen('app.i18n.'));
      $suffix = '.' . $lang;
      if (str_ends_with($base, $suffix)) $base = substr($base, 0, -strlen($suffix));
      if ($base === '') continue;
      $out[$base] = $v;
    }
  }
} catch (Throwable $e) {
}

json_response(['ok'=>true,'lang'=>$lang,'dict'=>$out]);
