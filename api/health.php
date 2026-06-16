<?php
declare(strict_types=1);

/**
 * Health Monitoring Endpoint — checks all data sources and aggregator status.
 * GET /api/health.php
 */

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_central.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store');

$status = [
  'timestamp' => date('c'),
  'status' => 'ok',
  'checks' => [],
];

$now = time();
$warnings = 0;
$errors = 0;

// ── 1. Central Cache Freshness ──────────────────────────────────────────

try {
  $defs = function_exists('vp_supported_market_defs') ? vp_supported_market_defs() : [];
  $byType = [];
  foreach ($defs as $d) {
    $type = strtolower($d['type'] ?? 'unknown');
    $byType[$type] = ($byType[$type] ?? 0) + 1;
  }

  $freshByType = [];
  $staleByType = [];
  $freshThreshold = 60; // seconds — data older than this is "stale"

  foreach ($defs as $d) {
    $sym = strtoupper($d['symbol'] ?? '');
    $type = strtolower($d['type'] ?? 'unknown');
    if (!$sym) continue;

    $row = quote_central_get($sym, $type);
    $age = $row ? ($now - (int)($row['central_ts'] ?? 0)) : null;

    if ($age !== null && $age < $freshThreshold) {
      $freshByType[$type] = ($freshByType[$type] ?? 0) + 1;
    } else {
      $staleByType[$type] = ($staleByType[$type] ?? 0) + 1;
    }
  }

  $totalFresh = array_sum($freshByType);
  $totalStale = array_sum($staleByType);
  $total = $totalFresh + $totalStale;
  $pct = $total > 0 ? round(($totalFresh / $total) * 100, 1) : 0;

  $status['checks']['cache'] = [
    'total_symbols' => $total,
    'fresh' => $totalFresh,
    'stale' => $totalStale,
    'freshness_pct' => $pct,
    'by_type' => [],
  ];

  foreach ($byType as $type => $count) {
    $fresh = $freshByType[$type] ?? 0;
    $status['checks']['cache']['by_type'][$type] = [
      'total' => $count,
      'fresh' => $fresh,
      'stale' => $count - $fresh,
    ];
  }

  if ($pct < 30) { $errors++; $status['status'] = 'error'; }
  elseif ($pct < 70) { $warnings++; if ($status['status'] === 'ok') $status['status'] = 'warning'; }

} catch (Throwable $e) {
  $status['checks']['cache'] = ['error' => $e->getMessage()];
  $errors++;
  $status['status'] = 'error';
}

// ── 2. Aggregator Process ───────────────────────────────────────────────

$aggLog = __DIR__ . '/data/logs/aggregator.log';
if (file_exists($aggLog)) {
  $mtime = filemtime($aggLog);
  $age = $now - $mtime;
  $size = filesize($aggLog);
  $lastLines = '';
  if ($size > 0 && $size < 5_000_000) {
    $content = file_get_contents($aggLog);
    $lines = array_slice(array_filter(explode("\n", $content)), -5);
    $lastLines = implode("\n", $lines);
  }
  $aggRunning = $age < 120; // log written in last 2 min = likely running
  $status['checks']['aggregator'] = [
    'log_exists' => true,
    'log_age_seconds' => $age,
    'likely_running' => $aggRunning,
    'last_lines' => $lastLines,
  ];
  if (!$aggRunning && $errors === 0) { $warnings++; if ($status['status'] === 'ok') $status['status'] = 'warning'; }
} else {
  $status['checks']['aggregator'] = [
    'log_exists' => false,
    'likely_running' => false,
    'note' => 'Aggregator log not found — aggregator may not be enabled',
  ];
}

// ── 3. Database Connection ──────────────────────────────────────────────

try {
  $pdo = db();
  $st = $pdo->query("SELECT 1");
  $dbOk = $st !== false;
  $status['checks']['database'] = ['connected' => $dbOk];
} catch (Throwable $e) {
  $status['checks']['database'] = ['connected' => false, 'error' => $e->getMessage()];
  $errors++;
  $status['status'] = 'error';
}

// ── 4. API Key Availability ─────────────────────────────────────────────

$keys = [
  'QUOTES_TWELVEDATA_KEY' => !empty(trim((string)getenv('QUOTES_TWELVEDATA_KEY'))),
  'FINNHUB_KEY' => !empty(trim((string)getenv('FINNHUB_KEY'))),
  'TIINGO_KEY' => !empty(trim((string)getenv('TIINGO_KEY'))),
  'EODHD_KEY' => !empty(trim((string)getenv('EODHD_KEY'))),
];
$status['checks']['api_keys'] = $keys;

// ── 5. File Cache Stats ────────────────────────────────────────────────

$cacheDir = __DIR__ . '/data/cache';
if (is_dir($cacheDir)) {
  $files = glob($cacheDir . '/*.json');
  $status['checks']['file_cache'] = [
    'files' => count($files),
    'dir_writable' => is_writable($cacheDir),
  ];
}

// ── Summary ─────────────────────────────────────────────────────────────

$status['summary'] = [
  'errors' => $errors,
  'warnings' => $warnings,
];

$httpStatus = $status['status'] === 'ok' ? 200 : ($status['status'] === 'warning' ? 200 : 503);
http_response_code($httpStatus);

echo json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
