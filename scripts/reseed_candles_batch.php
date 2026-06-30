<?php
declare(strict_types=1);

/**
 * Safe candle reseed for a fixed validation batch.
 * Archives only matching local candles_v4 cache files and warms candles.php via HTTP.
 */

$root = dirname(__DIR__);
$symbols = [
  ['EURUSD', 'forex'],
  ['GBPUSD', 'forex'],
  ['XAUUSD', 'commodities'],
  ['USOIL', 'commodities'],
  ['BTCUSDT', 'crypto'],
  ['AAPL', 'stocks'],
];
$frames = ['1m', '3m', '5m', '15m'];

$base = '';
foreach ($argv as $arg) {
  if (str_starts_with($arg, '--base=')) $base = rtrim(substr($arg, 7), '/');
}
if ($base === '') $base = rtrim((string)(getenv('APP_URL') ?: 'http://127.0.0.1:8000'), '/');

$archiveRoot = $root . '/api/data/archive';
if (!is_dir($archiveRoot)) mkdir($archiveRoot, 0777, true);
$archiveDir = $archiveRoot . '/candles_batch_' . gmdate('Ymd_His');
mkdir($archiveDir, 0777, true);

function candle_cache_glob(string $root, string $symbol, string $type, string $tf): array {
  $safe = strtolower(preg_replace('/[^A-Z0-9_]/', '_', strtoupper($symbol)));
  $safeType = strtolower(preg_replace('/[^a-z0-9_]/', '_', strtolower($type)));
  return glob($root . "/api/data/candles_v4_*_{$safeType}_{$safe}_" . strtolower($tf) . '.json') ?: [];
}

function http_json(string $url, int $timeout = 20): array {
  $ctx = stream_context_create([
    'http' => [
      'method' => 'GET',
      'timeout' => $timeout,
      'header' => "Accept: application/json\r\n",
    ],
  ]);
  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false || $raw === '') return ['ok' => false, 'error' => 'request_failed'];
  $json = json_decode($raw, true);
  return is_array($json) ? $json : ['ok' => false, 'error' => 'bad_json'];
}

$archived = 0;
foreach ($symbols as [$symbol, $type]) {
  foreach ($frames as $tf) {
    foreach (candle_cache_glob($root, $symbol, $type, $tf) as $file) {
      $target = $archiveDir . '/' . basename($file);
      if (@rename($file, $target)) $archived++;
    }
  }
}

$results = [];
foreach ($symbols as [$symbol, $type]) {
  foreach ($frames as $tf) {
    $url = $base . '/api/trade/candles.php?' . http_build_query([
      'symbol' => $symbol,
      'type' => $type,
      'tf' => $tf,
      'limit' => 180,
      'refresh' => 1,
    ]);
    $started = microtime(true);
    $json = http_json($url);
    $elapsed = (int)round((microtime(true) - $started) * 1000);
    $source = (string)($json['source'] ?? '');
    $items = is_array($json['items'] ?? null) ? count($json['items']) : 0;
    $synthetic = !empty($json['synthetic']);
    $ok = !empty($json['ok']) && !$synthetic && !in_array($source, ['seed','synthetic','synthetic_error_fallback','yahoo','yahoo_chart','yahoo_chart_fallback'], true);
    $results[] = compact('symbol', 'type', 'tf', 'source', 'items', 'synthetic', 'ok', 'elapsed');
    echo sprintf("%-8s %-12s %-3s ok=%s source=%s items=%d synthetic=%s %dms\n", $symbol, $type, $tf, $ok ? 'yes' : 'no', $source, $items, $synthetic ? 'yes' : 'no', $elapsed);
  }
}

$report = [
  'base' => $base,
  'archived_files' => $archived,
  'archive_dir' => $archiveDir,
  'checked_at' => time(),
  'results' => $results,
];
$reportFile = $archiveDir . '/reseed_report.json';
file_put_contents($reportFile, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
echo "archived={$archived}\nreport={$reportFile}\n";
