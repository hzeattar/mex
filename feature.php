<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function feature_enabled(string $key): bool {
  try {
    $pdo = db();
    $st = $pdo->prepare("SELECT enabled FROM feature_flags WHERE flag_key=? LIMIT 1");
    $st->execute([$key]);
    return (int)($st->fetchColumn() ?: 0) === 1;
  } catch (Throwable $e) {
    return false;
  }
}

function feature_all(): array {
  try {
    $pdo = db();
    $rows = $pdo->query("SELECT flag_key, enabled FROM feature_flags")->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $out = [];
    foreach ($rows as $r) {
      $out[(string)$r['flag_key']] = (int)($r['enabled'] ?? 0);
    }
    return $out;
  } catch (Throwable $e) {
    return [];
  }
}
