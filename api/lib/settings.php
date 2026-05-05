<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function settings_schema_profile(?PDO $pdo = null): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  $pdo = $pdo ?: db();
  $cols = ['key'=>false,'value'=>false,'setting_key'=>false,'setting_value'=>false,'updated_at'=>false];
  try {
    $driver = db_driver();
    foreach (array_keys($cols) as $col) {
      try { $cols[$col] = schema_column_exists($pdo, 'settings', $col, $driver); } catch (Throwable $e) { $cols[$col] = false; }
    }
  } catch (Throwable $e) {}
  $cache = $cols;
  return $cache;
}

function setting_get(string $key, mixed $default = null): mixed {
  $pdo = db();
  try {
    $profile = settings_schema_profile($pdo);
    $selectValue = ($profile['setting_value'] && $profile['value'])
      ? "COALESCE(NULLIF(setting_value,''), value)"
      : ($profile['setting_value'] ? 'setting_value' : ($profile['value'] ? 'value' : 'NULL'));
    $whereParts = [];
    $params = [];
    if ($profile['setting_key']) { $whereParts[] = 'setting_key=?'; $params[] = $key; }
    if ($profile['key']) { $whereParts[] = '`key`=?'; $params[] = $key; }
    if (!$whereParts) return $default;
    $hasModernKey = !empty($profile['setting_key']);
    $orderBy = $hasModernKey ? ' ORDER BY CASE WHEN setting_key=? THEN 0 ELSE 1 END' : '';
    $sql = 'SELECT ' . $selectValue . ' FROM settings WHERE ' . implode(' OR ', $whereParts) . $orderBy . ' LIMIT 1';
    if ($hasModernKey) $params[] = $key;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $v = $stmt->fetchColumn();
    if ($v === false || $v === null) return $default;
    return $v;
  } catch (Throwable $e) {
    return $default;
  }
}

function setting_set(string $key, ?string $value): void {
  $pdo = db();
  $now = time();
  $profile = settings_schema_profile($pdo);

  $hasLegacy = !empty($profile['key']) && !empty($profile['value']);
  $hasModern = !empty($profile['setting_key']) && !empty($profile['setting_value']);
  if (!$hasLegacy && !$hasModern) return;

  $updateLegacy = function() use ($pdo, $profile, $key, $value, $now, $hasLegacy): bool {
    if (!$hasLegacy) return false;
    $set = ['value=?'];
    $params = [$value];
    if (!empty($profile['updated_at'])) { $set[] = 'updated_at=?'; $params[] = $now; }
    $params[] = $key;
    $st = $pdo->prepare('UPDATE settings SET ' . implode(', ', $set) . ' WHERE `key`=?');
    $st->execute($params);
    if ($st->rowCount() > 0) return true;
    $cols = ['`key`','value'];
    $vals = [$key, $value];
    if (!empty($profile['updated_at'])) { $cols[] = 'updated_at'; $vals[] = $now; }
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $pdo->prepare('INSERT INTO settings(' . implode(',', $cols) . ') VALUES (' . $ph . ')')->execute($vals);
    return true;
  };

  $updateModern = function() use ($pdo, $profile, $key, $value, $now, $hasModern): bool {
    if (!$hasModern) return false;
    $set = ['setting_value=?'];
    $params = [$value];
    if (!empty($profile['updated_at'])) { $set[] = 'updated_at=?'; $params[] = $now; }
    $params[] = $key;
    $st = $pdo->prepare('UPDATE settings SET ' . implode(', ', $set) . ' WHERE setting_key=?');
    $st->execute($params);
    if ($st->rowCount() > 0) return true;
    $cols = ['setting_key','setting_value'];
    $vals = [$key, $value];
    if (!empty($profile['updated_at'])) { $cols[] = 'updated_at'; $vals[] = $now; }
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $pdo->prepare('INSERT INTO settings(' . implode(',', $cols) . ') VALUES (' . $ph . ')')->execute($vals);
    return true;
  };

  $errors = [];
  if ($hasLegacy) { try { $updateLegacy(); } catch (Throwable $e) { $errors[] = $e; } }
  if ($hasModern) { try { $updateModern(); } catch (Throwable $e) { $errors[] = $e; } }
  if (count($errors) >= (($hasLegacy ? 1 : 0) + ($hasModern ? 1 : 0)) && $errors) throw $errors[0];
}

