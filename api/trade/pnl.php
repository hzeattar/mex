<?php
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

$uid = require_auth();
$pdo = db();
$mode = isset($_GET['mode']) ? strtolower(trim((string)$_GET['mode'])) : 'demo';
$mode = ($mode === 'real') ? 'real' : 'demo';
$since = time() - 86400;
$cacheDir = __DIR__ . '/../cache';
if (!is_dir($cacheDir)) { @mkdir($cacheDir, 0777, true); }
$cacheFile = $cacheDir . '/pnl_' . $uid . '_' . $mode . '.json';
$cacheTtl = 5;
if (is_file($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
  readfile($cacheFile);
  exit;
}


try {
  // Real trades are stored with @R@ prefix on symbol.
  $prefix = '@R@%';

  if ($mode === 'real') {
    $sql = "SELECT COALESCE(SUM(pnl_usd),0) AS s
            FROM orders
            WHERE user_id=?
              AND status='closed'
              AND pnl_usd IS NOT NULL
              AND closed_at >= ?
              AND symbol LIKE ?";
    $st = $pdo->prepare($sql);
    $st->execute([$uid, $since, $prefix]);
  } else {
    $sql = "SELECT COALESCE(SUM(pnl_usd),0) AS s
            FROM orders
            WHERE user_id=?
              AND status='closed'
              AND pnl_usd IS NOT NULL
              AND closed_at >= ?
              AND symbol NOT LIKE ?";
    $st = $pdo->prepare($sql);
    $st->execute([$uid, $since, $prefix]);
  }

  $realized24 = (float)($st->fetchColumn() ?: 0);

  // NOTE:
  // - realized_24h = closed trades pnl in last 24h
  // - pnl_24h is kept for backward-compat (dashboard adds live unrealized on top)
  echo json_encode([
    'ok' => true,
    'mode' => $mode,
    'since' => $since,
    'realized_24h' => $realized24,
    'pnl_24h' => $realized24,
  ]);
} catch (Throwable $e) {
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
