<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_central.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$statusFile = __DIR__ . '/data/status/ws_aggregator.json';
$ws = [];
if (is_file($statusFile)) {
  $raw = @file_get_contents($statusFile);
  $decoded = $raw ? json_decode($raw, true) : null;
  if (is_array($decoded)) $ws = $decoded;
}

$sources = [];
$manifest = [];
try {
  quote_central_ensure_table();
  $pdo = db();
  $rows = $pdo->query("SELECT type, source, COUNT(*) AS count, MAX(central_ts) AS latest_ts FROM central_quotes GROUP BY type, source ORDER BY type, count DESC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $row) {
    $type = (string)($row['type'] ?? '');
    if ($type === '') continue;
    $sources[$type][] = [
      'source' => (string)($row['source'] ?? ''),
      'count' => (int)($row['count'] ?? 0),
      'latest_ts' => (int)($row['latest_ts'] ?? 0),
      'age_sec' => (int)($row['latest_ts'] ?? 0) > 0 ? max(0, time() - (int)$row['latest_ts']) : null,
    ];
  }
  $manifest = quote_central_manifest_read();
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => 'health_unavailable', 'ws' => $ws, 'sources' => $sources], 200);
}

json_response([
  'ok' => true,
  'ts' => time(),
  'ws' => $ws,
  'manifest' => $manifest,
  'sources' => $sources,
]);
