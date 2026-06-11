<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';

function cache_prime_token(): string {
  $h = $_SERVER['HTTP_X_CRON_KEY'] ?? $_SERVER['HTTP_X_INSTALL_KEY'] ?? '';
  if ($h) return (string)$h;
  return (string)($_GET['token'] ?? $_GET['key'] ?? '');
}

$expected = (string)env('CRON_KEY', env('INSTALL_KEY', ''));
if ($expected === '' || !hash_equals($expected, cache_prime_token())) {
  json_response(['ok' => false, 'error' => 'Forbidden'], 403);
}

function cache_prime_base_url(): string {
  $base = trim((string)env('APP_URL', env('SITE_URL', '')));
  if ($base !== '') return rtrim($base, '/');
  $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
  if ($host !== '') return 'https://' . $host;
  return '';
}

function cache_prime_fetch(string $url, int $timeoutMs): array {
  $started = microtime(true);
  $status = 0;
  $bytes = 0;
  $error = '';

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => false,
      CURLOPT_CONNECTTIMEOUT_MS => min($timeoutMs, 1500),
      CURLOPT_TIMEOUT_MS => $timeoutMs,
      CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    if ($body === false) $error = (string)curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $bytes = is_string($body) ? strlen($body) : 0;
    curl_close($ch);
  } else {
    $ctx = stream_context_create([
      'http' => [
        'timeout' => max(1, (int)ceil($timeoutMs / 1000)),
        'header' => "Accept: application/json\r\n",
      ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $bytes = is_string($body) ? strlen($body) : 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
      $status = (int)$m[1];
    }
    if ($body === false) $error = 'request_failed';
  }

  return [
    'status' => $status,
    'ms' => (int)round((microtime(true) - $started) * 1000),
    'bytes' => $bytes,
    'error' => $error,
  ];
}

$base = cache_prime_base_url();
if ($base === '') {
  json_response(['ok' => false, 'error' => 'APP_URL is not configured'], 500);
}

$endpoints = [
  '/api/markets.php?scope=home&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=crypto&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=forex&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=stocks&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=commodities&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=futures&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/markets.php?type=arab&scope=trade&supported=1&lite=1&with_quotes=1',
  '/api/quotes.php?symbols=BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT,DOGEUSDT&type=crypto&purpose=watchlist',
  '/api/quotes.php?symbols=EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD,USDCAD&type=forex&purpose=watchlist',
  '/api/quotes.php?symbols=AAPL,MSFT,NVDA,TSLA,AMZN,GOOGL&type=stocks&purpose=watchlist',
  '/api/quotes.php?symbols=XAUUSD,XAGUSD,USOIL,UKOIL,NGAS&type=commodities&purpose=watchlist',
  '/api/quotes.php?symbols=ES_F,NQ_F,YM_F,RTY_F,CL_F,GC_F,ZN_F,ZB_F&type=futures&purpose=watchlist',
  '/api/quotes.php?symbols=2222,1120,2010,7010,1211,1150,1180,2280&type=arab&purpose=watchlist',
];

$limit = max(1, min(count($endpoints), (int)($_GET['limit'] ?? count($endpoints))));
$timeoutMs = max(1200, min(8000, (int)($_GET['timeout_ms'] ?? 5000)));
$results = [];
$okCount = 0;
$startedAll = microtime(true);

foreach (array_slice($endpoints, 0, $limit) as $path) {
  $res = cache_prime_fetch($base . $path, $timeoutMs);
  $res['path'] = $path;
  $results[] = $res;
  if (($res['status'] ?? 0) >= 200 && ($res['status'] ?? 0) < 300) $okCount++;
}

$payload = [
  'ok' => $okCount === count($results),
  'primed_at' => time(),
  'count' => count($results),
  'ok_count' => $okCount,
  'ms' => (int)round((microtime(true) - $startedAll) * 1000),
  'results' => $results,
];
try { tp_status_write('cache_prime', $payload); } catch (Throwable $e) {}

json_response($payload);
