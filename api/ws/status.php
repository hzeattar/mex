<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';

header('Content-Type: application/json');

try {
  $statusFile = __DIR__ . '/../data/status/ws_aggregator.json';
  $status = [];
  if (is_file($statusFile)) {
    $raw = @file_get_contents($statusFile);
    if ($raw !== false) {
      $status = json_decode($raw, true) ?: [];
    }
  }
  foreach ($status as $feed => &$st) {
    if (!empty($st['error'])) {
      $st['error_full'] = (string)$st['error'];
    }
  }
  unset($st);

  $centralRows = [];
  $centralPath = __DIR__ . '/../data/central';
  if (is_dir($centralPath)) {
    foreach (glob($centralPath . '/*.json') as $f) {
      $raw = @file_get_contents($f);
      if (!$raw) continue;
      $d = json_decode($raw, true);
      if (!$d || empty($d['symbol']) || empty($d['type'])) continue;
      if (empty($d['price']) || (float)$d['price'] <= 0) continue;
      $k = $d['symbol'] . ':' . $d['type'];
      if (!isset($centralRows[$k]) || ((int)($d['updated_at'] ?? 0) > (int)($centralRows[$k]['updated_at'] ?? 0))) {
        $centralRows[$k] = [
          'symbol' => $d['symbol'],
          'type' => $d['type'],
          'price' => (float)$d['price'],
          'source' => (string)($d['source'] ?? 'unknown'),
          'change_pct' => (float)($d['change_pct'] ?? 0),
          'updated_at' => (int)($d['updated_at'] ?? 0),
          'age_sec' => time() - (int)($d['updated_at'] ?? 0),
        ];
      }
    }
  }

  usort($centralRows, static fn($a,$b) => ($b['updated_at'] ?? 0) <=> ($a['updated_at'] ?? 0));

  echo json_encode([
    'ok' => true,
    'ws_status' => $status,
    'central_count' => count($centralRows),
    'central_recent' => array_slice($centralRows, 0, 100),
  ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
