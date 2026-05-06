<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

class UpstreamHttpException extends RuntimeException {
  public int $status;
  public function __construct(int $status, string $message) {
    parent::__construct($message, $status);
    $this->status = $status;
  }
}

function upstream_base(): string {
  $b = (string)env('POLYGON_API_BASE', 'https://api.massive.com');
  $b = rtrim($b, '/');
  return $b !== '' ? $b : 'https://api.massive.com';
}

function upstream_auth_headers(string $apiKey): array {
  $apiKey = trim($apiKey);
  $mode = strtolower((string)env('MASSIVE_AUTH_MODE', 'bearer'));
  $h = ['Accept: application/json'];
  if ($apiKey === '') return $h;
  if ($mode === 'query') {
    // no header, apiKey will be placed in query string
    return $h;
  }
  // default: Authorization Bearer
  $h[] = 'Authorization: Bearer ' . $apiKey;
  return $h;
}

function upstream_add_key_to_url(string $url, string $apiKey): string {
  $apiKey = trim($apiKey);
  $mode = strtolower((string)env('MASSIVE_AUTH_MODE', 'bearer'));
  if ($apiKey === '' || $mode !== 'query') return $url;
  $glue = (strpos($url, '?') !== false) ? '&' : '?';
  return $url . $glue . 'apiKey=' . urlencode($apiKey);
}

function upstream_slim_url(string $url): string {
  // avoid leaking api keys in logs/errors
  $p = parse_url($url);
  if (!is_array($p)) return 'unknown';
  $host = $p['host'] ?? '';
  $path = $p['path'] ?? '';
  $q = $p['query'] ?? '';
  // drop apiKey param
  if ($q !== '') {
    parse_str($q, $arr);
    unset($arr['apiKey'], $arr['apikey'], $arr['api_key'], $arr['key']);
    $q = http_build_query($arr);
  }
  $out = ($host ? ($host) : '') . ($path ?: '');
  if ($q) $out .= '?' . $q;
  return $out ?: 'unknown';
}


/**
 * HTTP GET JSON with:
 * - lightweight rate-limit (file token bucket; shared-hosting friendly)
 * - retries with exponential backoff for 429/5xx
 */
function http_get_json(string $url, array $headers = []): array {
  $host = (string)parse_url($url, PHP_URL_HOST);
  if ($host === '') $host = 'unknown';

  // Token bucket: default 8 req/sec/host, burst 16
  $rate = (int)env('UPSTREAM_RATE_PER_SEC', '8');
  $burst = (int)env('UPSTREAM_BURST', '16');
  $rate = max(1, min(25, $rate));
  $burst = max(1, min(50, $burst));

  $bucketFile = __DIR__ . '/../data/ratelimit_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $host) . '.json';

  $acquire = function() use ($bucketFile, $rate, $burst): void {
    $now = microtime(true);
    $state = ['tokens'=>$burst, 'ts'=>$now];

    $fp = @fopen($bucketFile, 'c+');
    if ($fp) {
      @flock($fp, LOCK_EX);
      $raw = stream_get_contents($fp);
      if (is_string($raw) && $raw !== '') {
        $tmp = json_decode($raw, true);
        if (is_array($tmp) && isset($tmp['tokens'], $tmp['ts'])) $state = $tmp;
      }
      $tokens = (float)($state['tokens'] ?? $burst);
      $ts = (float)($state['ts'] ?? $now);
      $elapsed = max(0.0, $now - $ts);
      $tokens = min((float)$burst, $tokens + $elapsed * (float)$rate);
      if ($tokens < 1.0) {
        $sleep = (1.0 - $tokens) / (float)$rate;
        // cap to keep PHP responsive
        usleep((int)min(400000, max(0, $sleep * 1000000)));
        $now2 = microtime(true);
        $elapsed2 = max(0.0, $now2 - $now);
        $tokens = min((float)$burst, $tokens + $elapsed2 * (float)$rate);
        $now = $now2;
      }
      $tokens = max(0.0, $tokens - 1.0);
      $state = ['tokens'=>$tokens, 'ts'=>$now];
      ftruncate($fp, 0);
      rewind($fp);
      fwrite($fp, json_encode($state));
      fflush($fp);
      @flock($fp, LOCK_UN);
      fclose($fp);
    }
  };

  $retries = (int)env('UPSTREAM_RETRIES', '1');
  $retries = max(0, min(4, $retries));
  $attempt = 0;
  $lastErr = '';

  while (true) {
    $attempt++;
    $acquire();

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $connectTimeout = (int)env('UPSTREAM_CONNECT_TIMEOUT','3');
    $requestTimeout = (int)env('UPSTREAM_TIMEOUT','5');
    if (str_contains($host, 'finance.yahoo.com') || str_contains($host, 'api.binance.com')) {
      $connectTimeout = min($connectTimeout, 2);
      $requestTimeout = min($requestTimeout, 4);
    } elseif (str_contains($host, 'api.massive.com') || str_contains($host, 'api.polygon.io')) {
      $connectTimeout = min($connectTimeout, 2);
      $requestTimeout = min($requestTimeout, 4);
    } elseif (str_contains($host, 'eodhd.com')) {
      $connectTimeout = max($connectTimeout, 3);
      $requestTimeout = max($requestTimeout, 8);
    }
    $connectTimeout = max(1, $connectTimeout);
    $requestTimeout = max($connectTimeout + 1, $requestTimeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $connectTimeout);
    curl_setopt($ch, CURLOPT_TIMEOUT, $requestTimeout);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 2);
    curl_setopt($ch, CURLOPT_USERAGENT, 'TradoxPlusMini/1.0');
    curl_setopt($ch, CURLOPT_ENCODING, '');
    if ($headers) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw !== false && $code > 0 && $code < 400) {
      $data = json_decode((string)$raw, true);
      if (!is_array($data)) throw new RuntimeException('Bad JSON response');
      return $data;
    }

    $lastErr = $err ?: ('HTTP ' . ($code ?: 0));

    $retryable = ($code === 429 || ($code >= 500 && $code <= 599) || $raw === false);
    if (!$retryable || $attempt > ($retries + 1)) {
      throw new UpstreamHttpException($code ?: 0, 'Upstream error: ' . $lastErr . ' url=' . upstream_slim_url($url));
    }

    // Exponential backoff: 200ms, 400ms, 800ms...
    $backoffMs = (int)(200 * pow(2, max(0, $attempt - 1)));
    usleep((int)min(1200000, $backoffMs * 1000));
  }
}

function binance_ticker_24h(array $symbols): array {
  // Public endpoint
  $items = binance_spot_json('/api/v3/ticker/24hr');
  $map = [];
  foreach ($items as $it) {
    if (!isset($it['symbol'])) continue;
    $map[$it['symbol']] = $it;
  }
  $out = [];
  foreach ($symbols as $sym) {
    $it = $map[$sym] ?? null;
    if (!$it) continue;
    $out[] = [
      'type' => 'crypto',
      'symbol' => $sym,
      'name' => $sym,
      'price' => (float)$it['lastPrice'],
      'change_pct' => (float)$it['priceChangePercent']
    ];
  }
  return $out;
}


function http_get_raw(string $url, array $headers = []): string {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
  curl_setopt($ch, CURLOPT_TIMEOUT, 12);
  if ($headers) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  $raw = curl_exec($ch);
  $err = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($raw === false || $code >= 400) {
    throw new RuntimeException("HTTP {$code}: {$err}");
  }
  return (string)$raw;
}

function binance_spot_api_bases(): array {
  $configured = trim((string)env('BINANCE_SPOT_API_BASE', env('BINANCE_API_BASE', 'https://api.binance.com')));
  $bases = [$configured, 'https://api.binance.com', 'https://api.binance.us'];
  $out = [];
  foreach ($bases as $base) {
    $base = rtrim(trim((string)$base), '/');
    if ($base === '' || !preg_match('~^https://~i', $base)) continue;
    if (!in_array($base, $out, true)) $out[] = $base;
  }
  return $out ?: ['https://api.binance.com', 'https://api.binance.us'];
}

function binance_spot_json(string $path, array $query = []): array {
  $path = '/' . ltrim($path, '/');
  $qs = $query ? ('?' . http_build_query($query)) : '';
  $last = null;
  foreach (binance_spot_api_bases() as $base) {
    try {
      return http_get_json($base . $path . $qs);
    } catch (Throwable $e) {
      $last = $e;
    }
  }
  if ($last instanceof Throwable) throw $last;
  throw new RuntimeException('No Binance endpoint configured');
}

function binance_price(string $symbol): float {
  $data = binance_spot_json('/api/v3/ticker/price', ['symbol' => $symbol]);
  if (!isset($data['price'])) throw new RuntimeException('No price');
  return (float)$data['price'];
}

/**
 * Cached Binance spot price.
 * File-based cache to stay friendly with shared hosting and prevent rate-limit spikes
 * when the UI polls fast.
 */
function binance_price_cached(string $symbol, int $ttl = 2): float {
  $ttl = max(1, min(30, (int)$ttl));
  $symbol = strtoupper(trim($symbol));

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) {
    @mkdir($dir, 0777, true);
  }

  $safe = preg_replace('/[^A-Z0-9_\-]/', '_', $symbol);
  $file = $dir . '/s_price_' . $safe . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d) && isset($d['price'])) return (float)$d['price'];
    }
  }

  // Normalize symbols like @R@BTCUSDT / RBTCUSDT / *_DEMO
  $p = binance_price(binance_norm_symbol($symbol));
  @file_put_contents($file, json_encode(['price' => (float)$p, 'ts' => $now], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);
  return (float)$p;
}

/**
 * Spot 24h ticker (single symbol) + cached wrapper.
 * MUCH lighter than downloading the full /ticker/24hr list every time.
 */
function binance_ticker_24hr_one(string $symbol): array {
  $d = binance_spot_json('/api/v3/ticker/24hr', ['symbol' => binance_norm_symbol($symbol)]);
  return [
    'price' => isset($d['lastPrice']) ? (float)$d['lastPrice'] : 0.0,
    'change_pct' => isset($d['priceChangePercent']) ? (float)$d['priceChangePercent'] : 0.0,
  ];
}

function binance_ticker_24hr_cached(string $symbol, int $ttl = 60): array {
  $ttl = max(5, min(600, (int)$ttl));
  $symbol = strtoupper(trim($symbol));

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) {
    @mkdir($dir, 0777, true);
  }

  $safe = preg_replace('/[^A-Z0-9_\-]/', '_', $symbol);
  $file = $dir . '/s_24h_' . $safe . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d) && isset($d['price'])) {
        return [
          'price' => (float)$d['price'],
          'change_pct' => (float)($d['change_pct'] ?? 0.0),
        ];
      }
    }
  }

  $r = binance_ticker_24hr_one($symbol);
  @file_put_contents($file, json_encode([
    'price' => (float)($r['price'] ?? 0.0),
    'change_pct' => (float)($r['change_pct'] ?? 0.0),
    'ts' => $now,
  ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);

  return [
    'price' => (float)($r['price'] ?? 0.0),
    'change_pct' => (float)($r['change_pct'] ?? 0.0),
  ];
}

/**
 * Fetch Binance 24hr tickers for many symbols (spot) with a single request per chunk.
 * Returns: map[symbol] => ['price'=>float,'change_pct'=>float]
 * File-cached to keep the UI snappy on shared hosting.
 */
function binance_ticker_24hr_many_cached(array $symbols, int $ttl = 1): array {
  $ttl = max(1, min(60, (int)$ttl));
  $symbols = array_values(array_unique(array_map(function($s){
    return strtoupper(trim((string)$s));
  }, $symbols)));

  // Basic sanitation
  $symbols = array_values(array_filter($symbols, function($s){
    return $s !== '' && preg_match('/^[A-Z0-9]{3,20}$/', $s);
  }));

  if (!$symbols) return [];
  sort($symbols);

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) {
    @mkdir($dir, 0777, true);
  }

  $hash = substr(sha1(json_encode($symbols)), 0, 16);
  $file = $dir . '/s_24h_many_' . $hash . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = $raw ? json_decode((string)$raw, true) : null;
      if (is_array($d) && isset($d['map']) && is_array($d['map'])) {
        return $d['map'];
      }
    }
  }

  $map = [];

  // Binance supports ?symbols=["BTCUSDT","ETHUSDT",...]
  $chunks = array_chunk($symbols, 80);
  foreach ($chunks as $chunk) {
    $items = binance_spot_json('/api/v3/ticker/24hr', ['symbols' => json_encode(array_values($chunk))]);

    // Error shape: {"code":-xxx,"msg":"..."}
    if (isset($items['code']) && isset($items['msg'])) {
      throw new RuntimeException('Binance error: ' . $items['msg']);
    }

    foreach ($items as $it) {
      if (!is_array($it) || !isset($it['symbol'])) continue;
      $sym = strtoupper((string)$it['symbol']);
      $map[$sym] = [
        'price' => isset($it['lastPrice']) ? (float)$it['lastPrice'] : 0.0,
        'change_pct' => isset($it['priceChangePercent']) ? (float)$it['priceChangePercent'] : 0.0,
      ];
    }
  }

  @file_put_contents($file, json_encode(['ts'=>$now,'map'=>$map], JSON_UNESCAPED_SLASHES), LOCK_EX);
  return $map;
}

// ---------- Binance Futures (Perp) ----------

function binance_norm_symbol(string $symbol): string {
  $s = strtoupper(trim($symbol));

  // Some internal symbols may include markers like @R@BTCUSDT
  // or demo suffixes like BTCUSDT_DEMO / USDT_DEMO.
  // Normalize known suffixes BEFORE stripping non-alphanumerics.
  $s = str_replace('USDT_DEMO', 'USDT', $s);
  $s = str_replace('USD_DEMO', 'USD', $s);
  if (str_ends_with($s, '_DEMO')) {
    $s = substr($s, 0, -5);
  }

  // Strip everything except A-Z0-9 (Binance expects plain symbols like BTCUSDT)
  $s = preg_replace('/[^A-Z0-9]/', '', $s);

  // Our UI sometimes prefixes real-market symbols with "R" (e.g. RBTCUSDT).
  // Binance endpoints do NOT accept that prefix.
  if (strlen($s) > 6 && $s[0] === 'R') {
    $cand = substr($s, 1);
    // Only strip if it still looks like a standard Binance symbol.
    if (preg_match('/^(?:[A-Z0-9]{3,})(?:USDT|USDC|BUSD|FDUSD|TUSD|BTC|ETH)$/', $cand)) {
      $s = $cand;
    }
  }

  return $s;
}


function binance_futures_mark_price(string $symbol): array {
  // https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT
  $d = http_get_json('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=' . urlencode(binance_norm_symbol($symbol)));
  // Response includes markPrice, indexPrice, lastFundingRate, nextFundingTime
  $mark = isset($d['markPrice']) ? (float)$d['markPrice'] : null;
  $index = isset($d['indexPrice']) ? (float)$d['indexPrice'] : null;
  if ($mark !== null && $mark > 0 && $index !== null && $index > 0) {
    $drift = abs($mark - $index) / max(1.0, abs($mark));
    if ($drift > 0.02) $index = $mark;
  }
  $nextFunding = isset($d['nextFundingTime']) ? (int)round(((float)$d['nextFundingTime'])/1000.0) : null;
  if ($nextFunding !== null && $nextFunding < (time() - 3600)) $nextFunding = null;
  return [
    'mark_price' => $mark,
    'index_price' => $index,
    'funding_rate' => isset($d['lastFundingRate']) ? (float)$d['lastFundingRate'] : null,
    'next_funding_time' => $nextFunding,
    'provider_time' => isset($d['time']) ? (int)round(((float)$d['time'])/1000.0) : time(),
  ];
}


/**
 * Cached Binance futures mark price (premiumIndex).
 * Shared-hosting friendly: avoids hammering Binance when UI polls fast.
 * Cache is per-symbol, file-based, TTL in seconds.
 */
function binance_futures_mark_price_cached(string $symbol, int $ttl = 2): array {
  $ttl = max(1, min(30, (int)$ttl));
  $symbol = strtoupper(trim($symbol));

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) {
    @mkdir($dir, 0777, true);
  }

  $safe = preg_replace('/[^A-Z0-9_\-]/', '_', $symbol);
  $file = $dir . '/f_mark_' . $safe . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      if ($raw !== false && $raw !== '') {
        $j = json_decode($raw, true);
        if (is_array($j) && isset($j['mark_price'])) {
          $mark = (float)($j['mark_price'] ?? 0);
          $index = isset($j['index_price']) ? (float)$j['index_price'] : null;
          if ($mark > 0 && $index !== null && $index > 0) {
            $drift = abs($mark - $index) / max(1.0, abs($mark));
            if ($drift > 0.02) $j['index_price'] = $mark;
          }
          if (isset($j['next_funding_time']) && (int)$j['next_funding_time'] < ($now - 3600)) {
            $j['next_funding_time'] = null;
          }
          return $j;
        }
      }
    }
  }

  $d = binance_futures_mark_price($symbol);
  if (is_array($d) && isset($d['mark_price'])) {
    @file_put_contents($file, json_encode($d, JSON_UNESCAPED_SLASHES), LOCK_EX);
  }
  return $d;
}

function binance_futures_depth(string $symbol, int $limit = 50): array {
  $limit = max(5, min(1000, $limit));
  $d = http_get_json('https://fapi.binance.com/fapi/v1/depth?symbol=' . urlencode(binance_norm_symbol($symbol)) . '&limit=' . $limit);
  // bids/asks are arrays of [price, qty]
  return [
    'last_update_id' => (int)($d['lastUpdateId'] ?? 0),
    'bids' => $d['bids'] ?? [],
    'asks' => $d['asks'] ?? [],
  ];
}



function binance_ticker_24hr_map(array $symbols): array {
  // Fetch once and filter to requested symbols
  $symbols = array_values(array_unique(array_map('strtoupper', $symbols)));
  if (!$symbols) return [];
  $wanted = array_fill_keys($symbols, true);
  $out = [];
  $data = http_get_json('https://api.binance.com/api/v3/ticker/24hr');
  if (!is_array($data)) return [];
  foreach ($data as $row) {
    $sym = strtoupper((string)($row['symbol'] ?? ''));
    if ($sym !== '' && isset($wanted[$sym])) {
      $out[$sym] = [
        'price' => (float)($row['lastPrice'] ?? 0),
        'change_pct' => (float)($row['priceChangePercent'] ?? 0),
      ];
    }
  }
  return $out;
}

function polygon_last_quote(string $ticker, string $apiKey): array {
  $base = upstream_base();
  $headers = upstream_auth_headers($apiKey);

  // Forex tickers like C:EURUSD — use /v1/last_quote/currencies/{from}/{to}
  if (str_starts_with($ticker, 'C:')) {
    $pair = substr($ticker, 2);
    $from = substr($pair, 0, 3);
    $to = substr($pair, 3, 3);
    $url = "{$base}/v1/last_quote/currencies/{$from}/{$to}";
    $url = upstream_add_key_to_url($url, $apiKey);
    $d = http_get_json($url, $headers);
    $p = $d['last']['bid'] ?? ($d['last']['ask'] ?? null);
    if ($p === null) throw new RuntimeException('No FX quote');
    return ['price'=>(float)$p];
  }

  // Stocks / ETFs / commodity proxies.
  // NOTE: Some upstreams (e.g. Massive) may return 403 for /v2/last/trade/*.
  $host = (string)parse_url($base, PHP_URL_HOST);
  $useAggsOnly = (stripos($host, 'massive.') !== false) || ((string)env('MASSIVE_AGGS_ONLY','') === '1');

  if (!$useAggsOnly) {
    try {
      $url = "{$base}/v2/last/trade/" . urlencode($ticker);
      $url = upstream_add_key_to_url($url, $apiKey);
      $d = http_get_json($url, $headers);
      $p = $d['results']['p'] ?? ($d['last']['p'] ?? null);
      if ($p !== null) return ['price'=>(float)$p];
    } catch (UpstreamHttpException $e) {
      // If forbidden/unauthorized, fall back to aggregates.
      if (!in_array((int)$e->status, [400,401,403,404], true)) throw $e;
    }
  }

  // Fallback: use latest aggregate close to avoid jumping back to previous session close.
  // Try 1-second aggregates first (if supported), then 1-minute, then /prev.
  try {
    $from = date('Y-m-d', time() - 7*86400);
    $to = date('Y-m-d');
    $url = "{$base}/v2/aggs/ticker/" . urlencode($ticker) . "/range/1/second/{$from}/{$to}?adjusted=true&sort=desc&limit=1";
    $url = upstream_add_key_to_url($url, $apiKey);
    $d = http_get_json($url, $headers);
    $rows = $d['results'] ?? null;
    if (is_array($rows) && isset($rows[0]) && is_array($rows[0])) {
      $p = $rows[0]['c'] ?? ($rows[0]['o'] ?? null);
      if ($p !== null) return ['price'=>(float)$p];
    }
  } catch (Throwable $e) {
    // ignore and try 1-minute
  }

  try {
    $from = date('Y-m-d', time() - 14*86400);
    $to = date('Y-m-d');
    $url = "{$base}/v2/aggs/ticker/" . urlencode($ticker) . "/range/1/minute/{$from}/{$to}?adjusted=true&sort=desc&limit=1";
    $url = upstream_add_key_to_url($url, $apiKey);
    $d = http_get_json($url, $headers);
    $rows = $d['results'] ?? null;
    if (is_array($rows) && isset($rows[0]) && is_array($rows[0])) {
      $p = $rows[0]['c'] ?? ($rows[0]['o'] ?? null);
      if ($p !== null) return ['price'=>(float)$p];
    }
  } catch (Throwable $e) {
    // ignore and try /prev
  }

  // Final fallback: session close (may be stale)
  $url = "{$base}/v2/aggs/ticker/" . urlencode($ticker) . "/prev?adjusted=true";
  $url = upstream_add_key_to_url($url, $apiKey);
  $d = http_get_json($url, $headers);
  $rows = $d['results'] ?? null;
  if (is_array($rows) && isset($rows[0]) && is_array($rows[0])) {
    $p = $rows[0]['c'] ?? ($rows[0]['o'] ?? null);
    if ($p !== null) return ['price'=>(float)$p];
  }

  throw new RuntimeException('No stock trade');
}


function polygon_price(string $ticker): float {
  $key = env('POLYGON_API_KEY', '');
  if (!$key) throw new RuntimeException('POLYGON_API_KEY missing');

  $ttl = (int)env('POLYGON_PRICE_TTL', '3');
  $ttl = max(1, min(60, $ttl));

  $t = strtoupper(trim($ticker));
  if ($t === '') throw new RuntimeException('Empty ticker');

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }

  $safe = preg_replace('/[^A-Z0-9_:\-]/', '_', $t);
  $file = $dir . '/p_price_' . $safe . '.json';

  $forbid = $dir . '/forbid_' . $safe . '.lock';

  // If the whole upstream host is forbidden (bad key/plan), avoid hammering it for every ticker.
  $baseHost = (string)parse_url(upstream_base(), PHP_URL_HOST);
  if ($baseHost === '') $baseHost = 'upstream';
  $forbidHost = $dir . '/forbid_host_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $baseHost) . '.lock';

  $now = time();
  $forbidTtl = (int)env('UPSTREAM_FORBIDDEN_TTL', '21600'); // 6h default
  $forbidTtl = max(600, min(172800, $forbidTtl));

  // Host-level forbidden lock
  if (is_file($forbidHost)) {
    $ageH = $now - (int)@filemtime($forbidHost);
    if ($ageH >= 0 && $ageH < $forbidTtl) {
      if (is_file($file)) {
        $raw = @file_get_contents($file);
        $d = json_decode((string)$raw, true);
        if (is_array($d) && isset($d['price']) && (float)$d['price'] > 0) return (float)$d['price'];
      }
      throw new RuntimeException('Upstream host forbidden');
    }
  }
  if (is_file($forbid)) {
    $ageF = $now - (int)@filemtime($forbid);
    if ($ageF >= 0 && $ageF < $forbidTtl) {
      // Don't hammer upstream if key/plan forbids this ticker
      if (is_file($file)) {
        $raw = @file_get_contents($file);
        $d = json_decode((string)$raw, true);
        if (is_array($d) && isset($d['price']) && (float)$d['price'] > 0) return (float)$d['price'];
      }
      throw new RuntimeException('Upstream forbidden for ticker');
    }
  }

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d) && isset($d['price']) && (float)$d['price'] > 0) {
        return (float)$d['price'];
      }
    }
  }

  try {
    $q = polygon_last_quote($t, $key);
  } catch (UpstreamHttpException $e) {
    if ($e->status === 401 || $e->status === 403) {
      @file_put_contents($forbid, (string)$now, LOCK_EX);
      @file_put_contents($forbidHost, (string)$now, LOCK_EX);
    }
    throw $e;
  }
  $price = (float)($q['price'] ?? 0);
  if ($price <= 0) throw new RuntimeException('Bad Polygon price');

  @file_put_contents($file, json_encode(['price'=>$price, 'ts'=>$now], JSON_UNESCAPED_UNICODE), LOCK_EX);
  return $price;
}


// ---------- Polygon Crypto (spot-ish) ----------

/**
 * Convert internal symbols like BTCUSDT / ETHUSDT / @R@BTCUSDT / BTCUSDT_DEMO
 * into Polygon crypto pair pieces.
 *
 * Polygon expects either:
 * - /v1/last/crypto/{from}/{to}  (e.g. BTC / USD)
 * - or {cryptoTicker} like X:BTCUSD for aggregates.
 */
function polygon_crypto_pair_from_symbol(string $symbol): array {
  $s = strtoupper(trim($symbol));

  // normalize wrappers used by the app
  $s = str_replace(['@R@','@D@'], '', $s);
  if (str_ends_with($s, '_DEMO')) $s = substr($s, 0, -5);
  if (preg_match('/^R[A-Z0-9]{6,}$/', $s)) $s = substr($s, 1); // RBTCUSDT etc

  $base = $s;
  $quote = 'USD';

  // Treat stable-quote pairs as USD for Polygon routing
  foreach (['USDT','USDC','BUSD','DAI'] as $q) {
    if (str_ends_with($s, $q)) {
      $base = substr($s, 0, -strlen($q));
      $quote = 'USD';
      break;
    }
  }

  // If not a stable-quote pair, try splitting last 3 chars
  if ($base === $s) {
    if (strlen($s) <= 3) throw new RuntimeException('Bad crypto symbol');
    $base = substr($s, 0, -3);
    $quote = substr($s, -3);
  }

  $base = preg_replace('/[^A-Z0-9]/', '', (string)$base);
  $quote = preg_replace('/[^A-Z0-9]/', '', (string)$quote);
  if ($base === '' || $quote === '') throw new RuntimeException('Bad crypto symbol');

  $ticker = 'X:' . $base . $quote;
  return ['from'=>$base, 'to'=>$quote, 'ticker'=>$ticker];
}

function polygon_crypto_last_trade(string $from, string $to, string $apiKey): array {
  $from = strtoupper(trim($from));
  $to = strtoupper(trim($to));
  if ($from==='' || $to==='') throw new RuntimeException('Bad pair');

  $base = upstream_base();
  $headers = upstream_auth_headers($apiKey);

  $url = "{$base}/v1/last/crypto/" . urlencode($from) . "/" . urlencode($to);
  $url = upstream_add_key_to_url($url, $apiKey);

  $d = http_get_json($url, $headers);

  $last = $d['last'] ?? null;
  $p = null;
  $ts = null;

  if (is_array($last)) {
    $p = $last['price'] ?? $last['p'] ?? null;
    $ts = $last['timestamp'] ?? $last['t'] ?? null;
  }

  // Fallback shapes (defensive)
  if ($p === null && isset($d['results']['p'])) $p = $d['results']['p'];
  if ($ts === null && isset($d['results']['t'])) $ts = $d['results']['t'];

  if ($p === null) throw new RuntimeException('No crypto trade');

  return [
    'price' => (float)$p,
    'ts_ms' => $ts !== null ? (int)$ts : 0,
  ];
}

function polygon_crypto_last_trade_cached(string $from, string $to, int $ttl = 1): array {
  $ttl = max(1, min(30, (int)$ttl));
  $key = env('POLYGON_API_KEY', '');
  if (!$key) throw new RuntimeException('POLYGON_API_KEY missing');

  $from = strtoupper(trim($from));
  $to = strtoupper(trim($to));

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }

  $safe = preg_replace('/[^A-Z0-9_\-]/', '_', $from . '_' . $to);
  $file = $dir . '/p_last_' . $safe . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d) && isset($d['price'])) {
        return ['price'=>(float)$d['price'], 'ts_ms'=>(int)($d['ts_ms'] ?? 0)];
      }
    }
  }

  $r = polygon_crypto_last_trade($from, $to, $key);
  @file_put_contents($file, json_encode(['price'=>(float)$r['price'], 'ts_ms'=>(int)($r['ts_ms'] ?? 0), 'ts'=>$now]), LOCK_EX);
  return ['price'=>(float)$r['price'], 'ts_ms'=>(int)($r['ts_ms'] ?? 0)];
}

function polygon_crypto_prev_close(string $cryptoTicker, string $apiKey): float {
  $t = strtoupper(trim($cryptoTicker));
  if ($t === '') throw new RuntimeException('Empty cryptoTicker');

  $base = upstream_base();
  $headers = upstream_auth_headers($apiKey);

  $url = "{$base}/v2/aggs/ticker/" . urlencode($t) . "/prev";
  $url = upstream_add_key_to_url($url, $apiKey);

  $d = http_get_json($url, $headers);

  $row = $d['results'][0] ?? null;
  if (!is_array($row)) throw new RuntimeException('No prev close');

  $c = $row['c'] ?? $row['close'] ?? null;
  if ($c === null) throw new RuntimeException('No prev close');
  return (float)$c;
}

function polygon_crypto_prev_close_cached(string $cryptoTicker, int $ttl = 300): float {
  $ttl = max(30, min(3600, (int)$ttl));
  $key = env('POLYGON_API_KEY', '');
  if (!$key) throw new RuntimeException('POLYGON_API_KEY missing');

  $t = strtoupper(trim($cryptoTicker));
  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }

  $safe = preg_replace('/[^A-Z0-9_\-]/', '_', $t);
  $file = $dir . '/p_prev_' . $safe . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d) && isset($d['close'])) return (float)$d['close'];
    }
  }

  $c = polygon_crypto_prev_close($t, $key);
  @file_put_contents($file, json_encode(['close'=>(float)$c, 'ts'=>$now]), LOCK_EX);
  return (float)$c;
}


/**
 * Free FX mid-rate via Frankfurter (ECB-based, not tick-by-tick).
 * Suitable as a no-key fallback when premium feeds are unavailable.
 */
function fx_rate_frankfurter(string $from, string $to): float {
  $from = strtoupper($from); $to = strtoupper($to);
  if (!preg_match('/^[A-Z]{3}$/', $from) || !preg_match('/^[A-Z]{3}$/', $to)) {
    throw new RuntimeException('Invalid FX pair');
  }
  if ($from === $to) return 1.0;
  $url = "https://api.frankfurter.app/latest?from=" . urlencode($from) . "&to=" . urlencode($to);
  $d = http_get_json($url);
  $rate = $d['rates'][$to] ?? null;
  if ($rate === null) throw new RuntimeException('No FX rate');
  return (float)$rate;
}

/**
 * Free stock/ETF last price via Stooq CSV.
 * Ticker examples: aapl.us, msft.us, uso.us, eurusd (for some FX)
 */
function stooq_last_price(string $ticker): float {
  $ticker = strtolower(trim($ticker));
  if ($ticker === '') throw new RuntimeException('Empty ticker');
  $url = "https://stooq.com/q/l/?s=" . urlencode($ticker) . "&f=sd2t2ohlcv&h&e=csv";
  $csv = http_get_raw($url);
  $lines = preg_split('/\r?\n/', trim($csv));
  if (count($lines) < 2) throw new RuntimeException('Stooq bad response');
  $cols = str_getcsv($lines[1]);
  // columns: Symbol,Date,Time,Open,High,Low,Close,Volume
  $close = $cols[6] ?? null;
  if ($close === null || !is_numeric($close)) throw new RuntimeException('No close price');
  return (float)$close;
}


/**
 * Yahoo Finance fallback (no-key) for stocks/ETFs and many commodities proxies.
 * Uses a single bulk request:
 *   https://query1.finance.yahoo.com/v7/finance/quote?symbols=...
 * Returns map[SYMBOL] => ['price'=>float,'change_pct'=>float]
 */
function yahoo_quote_many(array $symbols): array {
  $symbols = array_values(array_unique(array_filter(array_map(function($s){
    $s = strtoupper(trim((string)$s));
    // Keep it conservative: letters/numbers/dot/dash/equals
    if ($s === '' || !preg_match('/^[A-Z0-9.=\-]{1,15}$/', $s)) return '';
    return $s;
  }, $symbols))));

  if (!$symbols) return [];

  // Yahoo allows comma-separated list; keep request short
  $chunks = array_chunk($symbols, 30);
  $out = [];

  foreach ($chunks as $chunk) {
    $url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' . urlencode(implode(',', $chunk));
    $d = http_get_json($url);
    $rows = $d['quoteResponse']['result'] ?? [];
    if (!is_array($rows)) continue;
    foreach ($rows as $r) {
      if (!is_array($r)) continue;
      $sym = strtoupper((string)($r['symbol'] ?? ''));
      $p = $r['regularMarketPrice'] ?? null;
      if ($sym === '' || $p === null || !is_numeric($p)) continue;
      $chg = $r['regularMarketChangePercent'] ?? 0;
      $updatedAt = 0;
      foreach (['regularMarketTime','postMarketTime','preMarketTime'] as $tsKey) {
        if (isset($r[$tsKey]) && is_numeric($r[$tsKey])) {
          $updatedAt = (int)$r[$tsKey];
          if ($updatedAt > 1000000000000) $updatedAt = (int)floor($updatedAt / 1000);
          break;
        }
      }
      $out[$sym] = [
        'price' => (float)$p,
        'change_pct' => is_numeric($chg) ? (float)$chg : 0.0,
        'updated_at' => $updatedAt,
        'source' => 'yahoo',
      ];
    }
  }

  return $out;
}

function yahoo_quote_many_cached(array $symbols, int $ttl = 5): array {
  $ttl = max(1, min(120, (int)$ttl));
  $symbols = array_values(array_unique(array_map('strtoupper', array_map('trim', $symbols))));
  if (!$symbols) return [];

  sort($symbols);
  $key = md5(implode(',', $symbols));

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }
  $file = $dir . '/y_quote_' . $key . '.json';

  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = json_decode((string)$raw, true);
      if (is_array($d)) return $d;
    }
  }

  $d = yahoo_quote_many($symbols);
  if (is_array($d) && $d) {
    @file_put_contents($file, json_encode($d, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);
  }
  return is_array($d) ? $d : [];
}

function yahoo_last_price(string $symbol): float {
  $m = yahoo_quote_many_cached([$symbol], 6);
  $sym = strtoupper(trim($symbol));
  $r = $m[$sym] ?? null;
  if (is_array($r) && isset($r['price']) && (float)$r['price'] > 0) return (float)$r['price'];
  throw new RuntimeException('Yahoo price not available');
}

function yahoo_live_quote_or_chart(string $symbol, string $tf = '1m'): array {
  $symbol = strtoupper(trim($symbol));
  if ($symbol === '') throw new RuntimeException('Empty Yahoo symbol');

  try {
    $quotes = yahoo_quote_many_cached([$symbol], 1);
    $row = $quotes[$symbol] ?? null;
    $p = is_array($row) ? (float)($row['price'] ?? 0) : 0.0;
    if ($p > 0) {
      return [
        'price' => $p,
        'change_pct' => is_array($row) ? (float)($row['change_pct'] ?? 0.0) : 0.0,
        'updated_at' => is_array($row) ? (int)($row['updated_at'] ?? 0) : 0,
        'source' => (string)(is_array($row) ? ($row['source'] ?? 'yahoo') : 'yahoo'),
      ];
    }
  } catch (Throwable $e) {
    // fall through to chart fallback only when explicitly allowed
  }

  if ((int)env('YAHOO_ALLOW_CHART_QUOTE_FALLBACK', '1') !== 1) {
    throw new RuntimeException('Yahoo quote unavailable without chart fallback');
  }

  $candles = yahoo_chart_candles($symbol, $tf, 8);
  if (!$candles) throw new RuntimeException('Yahoo live chart unavailable');
  $last = end($candles);
  if (!is_array($last)) throw new RuntimeException('Yahoo live chart unavailable');
  $price = (float)($last['close'] ?? 0);
  if (!($price > 0)) throw new RuntimeException('Yahoo live chart unavailable');
  $prev = null;
  if (count($candles) >= 2) {
    $tmp = $candles;
    array_pop($tmp);
    $prev = end($tmp);
  }
  $prevClose = is_array($prev) ? (float)($prev['close'] ?? 0) : 0.0;
  $chg = ($prevClose > 0) ? (($price - $prevClose) / $prevClose) * 100.0 : 0.0;
  return [
    'price' => $price,
    'change_pct' => $chg,
    'updated_at' => (int)($last['time'] ?? 0),
    'source' => 'yahoo_chart_live',
  ];
}


function yahoo_interval_for_tf(string $tf): string {
  $tf = strtolower(trim($tf));
  return match($tf){
    '1m' => '1m',
    '3m' => '2m',
    '5m' => '5m',
    '15m' => '15m',
    '30m' => '30m',
    '1h', '2h', '4h', '6h', '8h', '12h' => '60m',
    '1d' => '1d',
    '1w' => '1wk',
    default => '1m',
  };
}

function yahoo_range_for_limit_tf(int $limit, string $tf): string {
  $tf = strtolower(trim($tf));
  $limit = max(10, min(1000, $limit));
  if (str_ends_with($tf, 'm')) {
    $mins = (int)substr($tf, 0, -1);
    $total = $mins * $limit;
    if ($total <= 60) return '1d';
    if ($total <= 60*24*7) return '5d';
    if ($total <= 60*24*30) return '1mo';
    return '3mo';
  }
  if (str_ends_with($tf, 'h')) {
    $hrs = (int)substr($tf, 0, -1);
    $total = $hrs * $limit;
    if ($total <= 24*7) return '1mo';
    if ($total <= 24*30) return '3mo';
    return '6mo';
  }
  if ($tf === '1d') return '1y';
  if ($tf === '1w') return '2y';
  return '3mo';
}

function yahoo_chart_candles(string $symbol, string $tf = '1m', int $limit = 240): array {
  $symbol = strtoupper(trim($symbol));
  if ($symbol === '') throw new RuntimeException('Empty Yahoo chart symbol');
  $interval = yahoo_interval_for_tf($tf);
  $range = yahoo_range_for_limit_tf($limit, $tf);
  $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode($symbol) . '?interval=' . rawurlencode($interval) . '&range=' . rawurlencode($range) . '&includePrePost=false&events=div%2Csplits';
  $d = http_get_json($url);
  $result = $d['chart']['result'][0] ?? null;
  if (!is_array($result)) return [];
  $ts = $result['timestamp'] ?? [];
  $quote = $result['indicators']['quote'][0] ?? [];
  $opens = $quote['open'] ?? [];
  $highs = $quote['high'] ?? [];
  $lows = $quote['low'] ?? [];
  $closes = $quote['close'] ?? [];
  $vols = $quote['volume'] ?? [];
  $out = [];
  $n = min(count($ts), count($opens), count($highs), count($lows), count($closes));
  for ($i = 0; $i < $n; $i++) {
    $t = (int)($ts[$i] ?? 0);
    $o = isset($opens[$i]) ? (float)$opens[$i] : null;
    $h = isset($highs[$i]) ? (float)$highs[$i] : null;
    $l = isset($lows[$i]) ? (float)$lows[$i] : null;
    $c = isset($closes[$i]) ? (float)$closes[$i] : null;
    if ($t <= 0 || $o === null || $h === null || $l === null || $c === null) continue;
    $out[] = [
      'time' => $t,
      'open' => $o,
      'high' => $h,
      'low' => $l,
      'close' => $c,
      'volume' => isset($vols[$i]) ? (float)$vols[$i] : 0.0,
    ];
  }
  if (count($out) > $limit) $out = array_slice($out, -$limit);
  return $out;
}

function massive_snapshot_ttl_for_type(string $assetType): int {
  $assetType = strtolower(trim($assetType));
  if ($assetType === 'forex' || $assetType === 'fx') {
    $ttl = (int)env('MASSIVE_FOREX_TTL', env('NONCRYPTO_PRICE_TTL', '2'));
  } elseif ($assetType === 'stocks') {
    $ttl = (int)env('MASSIVE_STOCKS_TTL', env('POLYGON_PRICE_TTL', '8'));
  } elseif ($assetType === 'commodities') {
    $ttl = (int)env('MASSIVE_COMMODITIES_TTL', env('POLYGON_PRICE_TTL', '6'));
  } else {
    $ttl = (int)env('MASSIVE_SNAPSHOT_TTL', '4');
  }
  return max(1, min(60, $ttl));
}

function vp_arab_yahoo_ticker(string $symbol, array $meta = []): ?string {
  $symbol = strtoupper(trim($symbol));
  $exchange = strtoupper(trim((string)($meta['exchange'] ?? '')));
  $rawYahoo = strtoupper(trim((string)($meta['yahoo_ticker'] ?? '')));
  if ($symbol === '' && $rawYahoo !== '') $symbol = $rawYahoo;
  if ($symbol === '') return null;

  if (preg_match('/^(TADAWUL|DFM|ADX)[:\-]([A-Z0-9.\-]{1,20})$/', $symbol, $m)) {
    if ($exchange === '') $exchange = strtoupper($m[1]);
    $symbol = strtoupper($m[2]);
  }

  if ($rawYahoo !== '' && preg_match('/^(TADAWUL|DFM|ADX)[:\-]([A-Z0-9.\-]{1,20})$/', $rawYahoo, $m)) {
    if ($exchange === '') $exchange = strtoupper($m[1]);
    $rawYahoo = strtoupper($m[2]);
  }

  if ($rawYahoo !== '' && preg_match('/^[A-Z0-9.\-]+\.(SR|DU|AD)$/', $rawYahoo)) return $rawYahoo;
  if (preg_match('/^[A-Z0-9.\-]+\.(SR|DU|AD)$/', $symbol)) return $symbol;

  if ($exchange === '') {
    $tv = strtoupper(trim((string)($meta['tv_symbol'] ?? '')));
    if ($tv !== '' && strpos($tv, ':') !== false) $exchange = substr($tv, 0, strpos($tv, ':'));
  }
  if ($exchange === '') {
    $provider = strtoupper(trim((string)($meta['provider_symbol'] ?? $meta['polygon_ticker'] ?? '')));
    if ($provider !== '' && strpos($provider, ':') !== false) $exchange = substr($provider, 0, strpos($provider, ':'));
  }

  $suffix = '.SR';
  if (in_array($exchange, ['DFM','DUBAI','XDFM','DU'], true)) $suffix = '.DU';
  elseif (in_array($exchange, ['ADX','ABUDHABI','ABU DHABI','XADS','AD'], true)) $suffix = '.AD';
  elseif (in_array($exchange, ['TADAWUL','SAUDI','SAU','XSAU','SR'], true)) $suffix = '.SR';

  if (preg_match('/^\d{4,6}$/', $symbol)) return $symbol . $suffix;
  if ($exchange !== '' && preg_match('/^[A-Z0-9.\-]{1,20}$/', $symbol) && strpos($symbol, '.') === false) return $symbol . $suffix;
  if (preg_match('/^[A-Z0-9.\-]{1,20}$/', $symbol)) return $symbol;
  return null;
}

function massive_market_ticker(string $symbol, string $type, array $meta = []): ?string {
  $symbol = strtoupper(trim($symbol));
  $type = strtolower(trim($type));
  if ($symbol === '') return null;

  $explicit = strtoupper(trim((string)($meta['polygon_ticker'] ?? '')));
  if ($explicit !== '') return $explicit;

  if ($type === 'stocks') {
    return preg_match('/^[A-Z0-9.\-]{1,15}$/', $symbol) ? $symbol : null;
  }

  if ($type === 'arab') {
    $provider = strtoupper(trim((string)($meta['provider_symbol'] ?? $meta['polygon_ticker'] ?? '')));
    if ($provider !== '') return $provider;
    return null;
  }

  if ($type === 'forex' || $type === 'fx') {
    if (str_starts_with($symbol, 'C:')) return $symbol;
    return preg_match('/^[A-Z]{6}$/', $symbol) ? ('C:' . $symbol) : null;
  }

  if ($type === 'commodities') {
    if (preg_match('/^X(?:AU|AG|PT|PD)USD$/', $symbol)) {
      return 'C:' . $symbol;
    }
    $proxyMap = [
      'USOIL' => 'USO', 'WTI' => 'USO', 'OIL' => 'USO',
      'UKOIL' => 'BNO', 'BRENT' => 'BNO',
      'NGAS' => 'UNG', 'GASOLINE' => 'UGA', 'HEATOIL' => 'UHN',
      'COPPER' => 'CPER', 'CORN' => 'CORN', 'WHEAT' => 'WEAT', 'SOY' => 'SOYB',
      'SUGAR' => 'CANE', 'COFFEE' => 'JO', 'COTTON' => 'BAL', 'COCOA' => 'NIB',
      'PLAT' => 'PPLT', 'PALL' => 'PALL',
    ];
    if (isset($proxyMap[$symbol])) return $proxyMap[$symbol];
    return preg_match('/^[A-Z0-9.\-]{1,15}$/', $symbol) ? $symbol : null;
  }

  return null;
}

function yahoo_ticker_for_market(string $symbol, string $type, array $meta = []): ?string {
  $symbol = strtoupper(trim($symbol));
  $type = strtolower(trim($type));
  if ($symbol === '') return null;

  $y = strtoupper(trim((string)($meta['yahoo_ticker'] ?? '')));
  if ($y !== '' && $type === 'stocks') return str_replace('.', '-', $y);
  if ($y !== '' && $type === 'arab') return vp_arab_yahoo_ticker($y, $meta) ?: $y;
  if ($y !== '' && ($type === 'forex' || $type === 'fx' || $type === 'commodities' || $type === 'futures')) return $y;

  if ($type === 'stocks') {
    return preg_match('/^[A-Z0-9.\-]{1,15}$/', $symbol) ? str_replace('.', '-', $symbol) : null;
  }

  if ($type === 'arab') {
    return vp_arab_yahoo_ticker($symbol, $meta);
  }

  if ($type === 'forex' || $type === 'fx') {
    if (preg_match('/^[A-Z]{6}$/', $symbol)) return $symbol . '=X';
    if (preg_match('/^[A-Z]{3}\/[A-Z]{3}$/', $symbol)) return str_replace('/', '', $symbol) . '=X';
    return null;
  }

  if ($type === 'commodities' || $type === 'futures') {
    $poly = strtoupper(trim((string)($meta['polygon_ticker'] ?? '')));
    if ($poly !== '' && strpos($poly, ':') === false) return $poly;

    $map = [
      'XAUUSD' => 'GC=F', 'XAGUSD' => 'SI=F', 'PLAT' => 'PL=F', 'PALL' => 'PA=F', 'COPPER' => 'HG=F',
      'USOIL' => 'CL=F', 'WTI' => 'CL=F', 'OIL' => 'CL=F', 'UKOIL' => 'BZ=F', 'BRENT' => 'BZ=F', 'NGAS' => 'NG=F',
      'CORN' => 'ZC=F', 'WHEAT' => 'ZW=F', 'SOY' => 'ZS=F', 'SUGAR' => 'SB=F', 'COFFEE' => 'KC=F',
      'COTTON' => 'CT=F', 'COCOA' => 'CC=F', 'RICE' => 'ZR=F', 'OAT' => 'ZO=F', 'ORANGE' => 'OJ=F',
      'GASOLINE' => 'RB=F', 'HEATOIL' => 'HO=F', 'LUMBER' => 'LB=F', 'CATTLE' => 'LE=F', 'HOGS' => 'HE=F',
      'ES_F' => 'ES=F', 'NQ_F' => 'NQ=F', 'YM_F' => 'YM=F', 'RTY_F' => 'RTY=F',
      'ZN_F' => 'ZN=F', 'ZB_F' => 'ZB=F', 'GC_F' => 'GC=F', 'SI_F' => 'SI=F', 'CL_F' => 'CL=F', 'NG_F' => 'NG=F',
      'HG_F' => 'HG=F', '6E_F' => 'EURUSD=X', '6J_F' => 'JPY=X', 'DX_F' => 'DX-Y.NYB',
    ];
    return $map[$symbol] ?? (preg_match('/^[A-Z0-9.=\-]{1,15}$/', $symbol) ? $symbol : null);
  }

  return null;
}

function massive_snapshot_price_from_result(array $row): float {
  $price = $row['price'] ?? null;
  if (is_numeric($price) && (float)$price > 0) return (float)$price;

  $lastTrade = $row['last_trade'] ?? ($row['lastTrade'] ?? null);
  if (is_array($lastTrade)) {
    foreach (['price','p','close','c'] as $k) {
      if (isset($lastTrade[$k]) && is_numeric($lastTrade[$k]) && (float)$lastTrade[$k] > 0) {
        return (float)$lastTrade[$k];
      }
    }
  }

  $lastQuote = $row['last_quote'] ?? ($row['lastQuote'] ?? null);
  if (is_array($lastQuote)) {
    $bid = null;
    $ask = null;
    foreach (['bid_price','bid','bp'] as $k) {
      if (isset($lastQuote[$k]) && is_numeric($lastQuote[$k]) && (float)$lastQuote[$k] > 0) { $bid = (float)$lastQuote[$k]; break; }
    }
    foreach (['ask_price','ask','ap'] as $k) {
      if (isset($lastQuote[$k]) && is_numeric($lastQuote[$k]) && (float)$lastQuote[$k] > 0) { $ask = (float)$lastQuote[$k]; break; }
    }
    if ($bid !== null && $ask !== null) return ($bid + $ask) / 2.0;
    if ($bid !== null) return $bid;
    if ($ask !== null) return $ask;
  }

  $session = $row['session'] ?? null;
  if (is_array($session)) {
    foreach (['close','c','last','price'] as $k) {
      if (isset($session[$k]) && is_numeric($session[$k]) && (float)$session[$k] > 0) {
        return (float)$session[$k];
      }
    }
  }

  return 0.0;
}



function eodhd_api_key(): string {
  return trim((string)env('EODHD_API_KEY', ''));
}

function eodhd_enabled(): bool {
  return eodhd_api_key() !== '';
}

function eodhd_base(): string {
  $b = trim((string)env('EODHD_API_BASE', 'https://eodhd.com/api'));
  $b = rtrim($b, '/');
  return $b !== '' ? $b : 'https://eodhd.com/api';
}

function vp_looks_like_eodhd_symbol(string $value, string $providerType = ''): bool {
  $value = strtoupper(trim($value));
  $providerType = vp_provider_asset_type(vp_normalize_asset_type($providerType));
  if ($value === '') return false;
  if (preg_match('/^[A-Z0-9._\-=]{2,32}\.(FOREX|US|SR|DFM|ADX|EGX|LSE|XETRA|TO|HK|AU|PA|F)$/', $value)) return true;
  if ($providerType === 'stocks' && preg_match('/^[A-Z0-9._\-]{1,16}\.[A-Z]{2,8}$/', $value)) return true;
  if ($providerType === 'arab' && preg_match('/^[A-Z0-9._\-]{1,16}\.(SR|DFM|ADX|EGX)$/', $value)) return true;
  if (in_array($providerType, ['forex','commodities'], true) && preg_match('/^[A-Z]{6}\.FOREX$/', $value)) return true;
  return false;
}

function vp_explicit_eodhd_symbol(array $meta, string $symbol = '', string $type = ''): string {
  $providerType = vp_provider_asset_type(vp_normalize_asset_type($type));
  foreach (['eodhd_symbol','provider_symbol_eodhd','provider_symbol'] as $key) {
    $cand = strtoupper(trim((string)($meta[$key] ?? '')));
    if ($cand !== '' && vp_looks_like_eodhd_symbol($cand, $providerType)) return $cand;
  }
  $symbol = strtoupper(trim($symbol));
  if ($symbol !== '' && vp_looks_like_eodhd_symbol($symbol, $providerType)) return $symbol;
  return '';
}

function eodhd_symbol_for_market(string $symbol, string $type, array $meta = []): ?string {
  $symbol = strtoupper(trim($symbol));
  $type = vp_normalize_asset_type($type);
  $providerType = vp_provider_asset_type($type);
  if ($symbol === '') return null;

  $explicit = vp_explicit_eodhd_symbol($meta, $symbol, $type);
  if ($explicit !== '') return $explicit;

  if (preg_match('/^[A-Z0-9._\-=]{2,32}\.[A-Z]{2,8}$/', $symbol)) return $symbol;

  if ($type === 'arab') {
    $exchange = strtoupper(trim((string)($meta['exchange'] ?? $meta['market'] ?? $meta['exchange_code'] ?? '')));
    if ($exchange === '' && preg_match('/^(TADAWUL|DFM|ADX)[:\-]/', $symbol, $m)) $exchange = strtoupper($m[1]);
    if (preg_match('/^[0-9]{3,6}$/', $symbol)) {
      if ($exchange === 'EGX' || $exchange === 'EG') return $symbol . '.EGX';
      return $symbol . '.SR';
    }
    if ($exchange === 'EGX' || $exchange === 'EG') return $symbol . '.EGX';
    if ($exchange === 'DFM') return $symbol . '.DFM';
    if ($exchange === 'ADX') return $symbol . '.ADX';
    return $symbol . '.SR';
  }

  if ($providerType === 'stocks') {
    if (preg_match('/^[A-Z0-9._\-]{1,16}$/', $symbol)) return $symbol . '.US';
    return null;
  }

  if ($providerType === 'forex') {
    if (preg_match('/^[A-Z]{6}$/', $symbol)) return $symbol . '.FOREX';
    return null;
  }

  if ($providerType === 'commodities' && vp_is_spot_metal_symbol($symbol, $type)) {
    if (preg_match('/^[A-Z]{6}$/', $symbol)) return $symbol . '.FOREX';
  }

  return null;
}

function eodhd_quote_normalize(array $row, string $ticker = ''): ?array {
  $ticker = strtoupper(trim((string)($row['code'] ?? $row['symbol'] ?? $row['ticker'] ?? $ticker)));
  $priceCandidates = [
    $row['close'] ?? null,
    $row['price'] ?? null,
    $row['last'] ?? null,
    $row['last_price'] ?? null,
    $row['previousClose'] ?? null,
    $row['previous_close'] ?? null,
    $row['prev_close'] ?? null,
  ];
  $price = 0.0;
  foreach ($priceCandidates as $cand) {
    if (is_numeric($cand) && (float)$cand > 0) { $price = (float)$cand; break; }
  }
  if (!($price > 0)) return null;

  $chgPct = 0.0;
  foreach (['change_p','change_percent','change_percentage'] as $k) {
    if (isset($row[$k]) && is_numeric($row[$k])) { $chgPct = (float)$row[$k]; break; }
  }
  if ($chgPct == 0.0) {
    $prev = null;
    foreach (['previousClose','previous_close','prev_close'] as $k) {
      if (isset($row[$k]) && is_numeric($row[$k])) { $prev = (float)$row[$k]; break; }
    }
    if ($prev && $prev > 0) $chgPct = (($price - $prev) / $prev) * 100.0;
  }

  $updatedAt = 0;
  foreach (['timestamp','ts','updated_at'] as $k) {
    if (isset($row[$k]) && is_numeric($row[$k])) {
      $updatedAt = (int)$row[$k];
      if ($updatedAt > 1000000000000) $updatedAt = (int)floor($updatedAt / 1000);
      break;
    }
  }
  if ($updatedAt <= 0) {
    foreach (['datetime','date'] as $k) {
      if (!empty($row[$k]) && is_string($row[$k])) {
        $parsed = strtotime((string)$row[$k]);
        if ($parsed !== false && $parsed > 0) { $updatedAt = (int)$parsed; break; }
      }
    }
  }

  $delayed = (bool)preg_match('/\.(US|SR|DFM|ADX|EGX)$/', $ticker);
  return [
    'ticker' => $ticker,
    'price' => $price,
    'change_pct' => $chgPct,
    'updated_at' => $updatedAt,
    'delayed' => $delayed,
    'raw' => $row,
  ];
}

function eodhd_quote_realtime(string $ticker): array {
  $ticker = strtoupper(trim($ticker));
  if ($ticker === '') throw new RuntimeException('Empty EODHD ticker');
  $apiKey = eodhd_api_key();
  if ($apiKey === '') throw new RuntimeException('EODHD_API_KEY missing');
  $url = eodhd_base() . '/real-time/' . rawurlencode($ticker) . '?api_token=' . urlencode($apiKey) . '&fmt=json';
  try {
    $d = http_get_json($url, ['Accept: application/json']);
    $n = eodhd_quote_normalize($d, $ticker);
    if ($n) {
      $n['source'] = 'eodhd';
      return $n;
    }
  } catch (Throwable $e) {
    // fall through to optional candle fallback below
  }

  if ((int)env('EODHD_ALLOW_CANDLE_QUOTE_FALLBACK', '0') === 1) {
    try {
      $candles = eodhd_intraday_candles($ticker, '1m', 3);
      if (is_array($candles) && $candles) {
        $last = $candles[count($candles) - 1] ?? null;
        $price = (float)($last['close'] ?? 0);
        $ts = (int)($last['time'] ?? 0);
        if ($price > 0 && $ts > 0) {
          return [
            'ticker' => $ticker,
            'price' => $price,
            'change_pct' => 0.0,
            'updated_at' => $ts,
            'source' => 'eodhd_intraday',
            'raw' => ['fallback' => 'intraday'],
          ];
        }
      }
    } catch (Throwable $e) {}
  }

  throw new RuntimeException('EODHD quote unavailable');
}

function eodhd_quote_realtime_cached(string $ticker, int $ttl = 3): array {
  $ttl = max(1, min(30, (int)$ttl));
  $ticker = strtoupper(trim($ticker));
  if ($ticker === '') throw new RuntimeException('Empty EODHD ticker');
  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);
  $safe = preg_replace('/[^A-Z0-9._=\-]/', '_', $ticker);
  $file = $dir . '/eod_rt_' . $safe . '.json';
  $now = time();
  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = $raw ? json_decode((string)$raw, true) : null;
      $src = strtolower(trim((string)($d['source'] ?? '')));
      $isCandleFallback = ($src === 'eodhd_intraday') || (!empty($d['raw']['fallback']) && (string)$d['raw']['fallback'] === 'intraday');
      if (is_array($d) && (float)($d['price'] ?? 0) > 0 && (!($isCandleFallback && (int)env('EODHD_ALLOW_CANDLE_QUOTE_FALLBACK', '0') !== 1))) return $d;
    }
  }
  try {
    $row = eodhd_quote_realtime($ticker);
    if (is_array($row) && (float)($row['price'] ?? 0) > 0) {
      @file_put_contents($file, json_encode($row, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);
      return $row;
    }
  } catch (Throwable $e) {
    if (is_file($file)) {
      $raw = @file_get_contents($file);
      $d = $raw ? json_decode((string)$raw, true) : null;
      $src = strtolower(trim((string)($d['source'] ?? '')));
      $isCandleFallback = ($src === 'eodhd_intraday') || (!empty($d['raw']['fallback']) && (string)$d['raw']['fallback'] === 'intraday');
      if (is_array($d) && (float)($d['price'] ?? 0) > 0 && (!($isCandleFallback && (int)env('EODHD_ALLOW_CANDLE_QUOTE_FALLBACK', '0') !== 1))) return $d;
    }
    throw $e;
  }
  throw new RuntimeException('EODHD quote unavailable');
}

function eodhd_quote_many(array $tickers): array {
  $out = [];
  $tickers = array_values(array_unique(array_filter(array_map(static function($t){
    $t = strtoupper(trim((string)$t));
    return preg_match('/^[A-Z0-9._\-=]{2,40}$/', $t) ? $t : '';
  }, $tickers))));
  if (!$tickers) return [];

  $primary = array_shift($tickers);
  if ($primary === null || $primary === '') return [];
  $query = '?api_token=' . urlencode(eodhd_api_key()) . '&fmt=json';
  if ($tickers) $query .= '&s=' . urlencode(implode(',', $tickers));
  $url = eodhd_base() . '/real-time/' . rawurlencode($primary) . $query;

  $append = static function(array &$carry, ?array $row, string $fallbackTicker = ''): void {
    if (!is_array($row)) return;
    $normalized = eodhd_quote_normalize($row, $fallbackTicker);
    if (!$normalized || (float)($normalized['price'] ?? 0) <= 0) return;
    $ticker = strtoupper(trim((string)($normalized['ticker'] ?? $fallbackTicker)));
    if ($ticker === '') return;
    $carry[$ticker] = $normalized;
  };

  try {
    $raw = http_get_json($url, ['Accept: application/json']);
    if (array_is_list($raw)) {
      foreach ($raw as $row) $append($out, is_array($row) ? $row : null, '');
    } else {
      $selfHandled = false;
      foreach (['code','symbol','ticker','close','price','last'] as $probe) {
        if (array_key_exists($probe, $raw)) { $append($out, $raw, $primary); $selfHandled = true; break; }
      }
      foreach ($raw as $key => $row) {
        if (!is_array($row)) continue;
        $append($out, $row, is_string($key) ? $key : '');
      }
      if (!$selfHandled && !isset($out[$primary]) && is_array($raw)) $append($out, $raw, $primary);
    }
  } catch (Throwable $e) {
    $out = [];
  }

  // Fallback per ticker for any missing symbols; keep the path deterministic.
  $all = array_merge([$primary], $tickers);
  foreach ($all as $ticker) {
    if (isset($out[$ticker]) && (float)($out[$ticker]['price'] ?? 0) > 0) continue;
    try {
      $row = eodhd_quote_realtime_cached($ticker, 3);
      if (is_array($row) && (float)($row['price'] ?? 0) > 0) $out[$ticker] = $row;
    } catch (Throwable $e) {}
  }
  return $out;
}

function eodhd_quote_many_cached(array $tickers, int $ttl = 3): array {
  $ttl = max(1, min(60, (int)$ttl));
  $tickers = array_values(array_unique(array_map('strtoupper', array_map('trim', $tickers))));
  $tickers = array_values(array_filter($tickers, fn($t) => $t !== '' && preg_match('/^[A-Z0-9._\-=]{2,40}$/', $t)));
  if (!$tickers) return [];
  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) @mkdir($dir, 0777, true);

  $now = time();
  $out = [];
  $missing = [];
  foreach ($tickers as $ticker) {
    $safe = preg_replace('/[^A-Z0-9._=\-]/', '_', $ticker);
    $file = $dir . '/eod_rt_' . $safe . '.json';
    if (is_file($file)) {
      $age = $now - (int)@filemtime($file);
      if ($age >= 0 && $age <= $ttl) {
        $raw = @file_get_contents($file);
        $d = $raw ? json_decode((string)$raw, true) : null;
        if (is_array($d) && (float)($d['price'] ?? 0) > 0) {
          $out[$ticker] = $d;
          continue;
        }
      }
    }
    $missing[] = $ticker;
  }

  if ($missing) {
    $chunks = array_chunk($missing, 15);
    foreach ($chunks as $chunk) {
      try {
        $rows = eodhd_quote_many($chunk);
        foreach ($chunk as $ticker) {
          $row = is_array($rows[$ticker] ?? null) ? $rows[$ticker] : null;
          if (!$row || (float)($row['price'] ?? 0) <= 0) continue;
          $out[$ticker] = $row;
          $safe = preg_replace('/[^A-Z0-9._=\-]/', '_', $ticker);
          $file = $dir . '/eod_rt_' . $safe . '.json';
          @file_put_contents($file, json_encode($row, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);
        }
      } catch (Throwable $e) {}
    }
  }
  return $out;
}


function eodhd_interval_for_tf(string $tf): ?string {
  $tf = strtolower(trim($tf));
  return match ($tf) {
    '1m' => '1m',
    '5m' => '5m',
    '15m' => '15m',
    '30m' => '30m',
    '1h' => '1h',
    '4h' => '1h',
    default => null,
  };
}

function eodhd_intraday_candles(string $ticker, string $tf = '1m', int $limit = 240): array {
  $ticker = strtoupper(trim($ticker));
  if ($ticker === '') throw new RuntimeException('Empty EODHD ticker');
  $apiKey = eodhd_api_key();
  if ($apiKey === '') throw new RuntimeException('EODHD_API_KEY missing');
  $interval = eodhd_interval_for_tf($tf);
  if ($interval === null) return [];
  $limit = max(10, min(1000, (int)$limit));
  $step = tf_seconds($tf);
  $to = time();
  $from = max(0, $to - (($limit + 12) * max(60, $step)));
  $url = eodhd_base() . '/intraday/' . rawurlencode($ticker)
    . '?api_token=' . urlencode($apiKey)
    . '&fmt=json&interval=' . rawurlencode($interval)
    . '&from=' . $from . '&to=' . $to;
  $rows = http_get_json($url, ['Accept: application/json']);
  if (!is_array($rows)) return [];
  $out = [];
  foreach ($rows as $r) {
    if (!is_array($r)) continue;
    $t = 0;
    if (isset($r['timestamp']) && is_numeric($r['timestamp'])) {
      $t = (int)$r['timestamp'];
      if ($t > 1000000000000) $t = (int)floor($t / 1000);
    } elseif (!empty($r['datetime'])) {
      $t = strtotime((string)$r['datetime']);
    }
    if ($t <= 0) continue;
    $o = (float)($r['open'] ?? 0);
    $h = (float)($r['high'] ?? 0);
    $l = (float)($r['low'] ?? 0);
    $c = (float)($r['close'] ?? 0);
    if (!($o > 0 || $c > 0 || $h > 0 || $l > 0)) continue;
    $out[] = [
      'time' => $t,
      'open' => $o > 0 ? $o : $c,
      'high' => $h > 0 ? $h : max($o, $c),
      'low' => $l > 0 ? $l : min($o > 0 ? $o : $c, $c),
      'close' => $c > 0 ? $c : $o,
      'volume' => (float)($r['volume'] ?? 0),
    ];
  }
  if ($tf === '4h' && $out) {
    $bucket = 4 * 3600;
    $agg = [];
    foreach ($out as $c) {
      $b = (int)(floor($c['time'] / $bucket) * $bucket);
      if (!isset($agg[$b])) {
        $agg[$b] = ['time'=>$b,'open'=>$c['open'],'high'=>$c['high'],'low'=>$c['low'],'close'=>$c['close'],'volume'=>(float)$c['volume']];
      } else {
        $agg[$b]['high'] = max($agg[$b]['high'], $c['high']);
        $agg[$b]['low'] = min($agg[$b]['low'], $c['low']);
        $agg[$b]['close'] = $c['close'];
        $agg[$b]['volume'] += (float)$c['volume'];
      }
    }
    $out = array_values($agg);
  }
  usort($out, fn($a,$b) => ((int)$a['time'] <=> (int)$b['time']));
  if (count($out) > $limit) $out = array_slice($out, -$limit);
  return $out;
}

function massive_snapshot_updated_at(array $row): int {
  $v = $row['last_updated'] ?? ($row['lastUpdated'] ?? 0);
  if (!is_numeric($v)) return 0;
  $n = (float)$v;
  if ($n > 1000000000000000) return (int)floor($n / 1000000000.0); // ns
  if ($n > 1000000000000) return (int)floor($n / 1000.0); // ms
  return (int)$n;
}

function massive_snapshot_change_pct(array $row): float {
  $session = $row['session'] ?? null;
  if (is_array($session)) {
    foreach (['change_percent','changePercent','percent_change'] as $k) {
      if (isset($session[$k]) && is_numeric($session[$k])) return (float)$session[$k];
    }
  }
  if (isset($row['change_percent']) && is_numeric($row['change_percent'])) return (float)$row['change_percent'];
  return 0.0;
}

function massive_snapshot_normalize(array $results): array {
  $out = [];
  foreach ($results as $row) {
    if (!is_array($row)) continue;
    $ticker = strtoupper(trim((string)($row['ticker'] ?? '')));
    if ($ticker === '') continue;
    $price = massive_snapshot_price_from_result($row);
    $out[$ticker] = [
      'ticker' => $ticker,
      'price' => $price,
      'change_pct' => massive_snapshot_change_pct($row),
      'updated_at' => massive_snapshot_updated_at($row),
      'market_status' => (string)($row['market_status'] ?? ''),
      'type' => (string)($row['type'] ?? ''),
      'raw' => $row,
    ];
  }
  return $out;
}

function massive_snapshot_many(array $tickers): array {
  $tickers = array_values(array_unique(array_filter(array_map(function($t){
    $t = strtoupper(trim((string)$t));
    if ($t === '' || !preg_match('/^[A-Z0-9:_\-.]{1,40}$/', $t)) return '';
    return $t;
  }, $tickers))));
  if (!$tickers) return [];

  $apiKey = (string)env('POLYGON_API_KEY', '');
  if ($apiKey === '') throw new RuntimeException('POLYGON_API_KEY missing');

  $base = upstream_base();
  $headers = upstream_auth_headers($apiKey);
  $query = http_build_query(['ticker.any_of' => implode(',', $tickers)], '', '&', PHP_QUERY_RFC3986);
  $paths = ['/v3/snapshot', '/v1/summaries'];
  $last = null;

  foreach ($paths as $path) {
    $url = rtrim($base, '/') . $path . '?' . $query;
    $url = upstream_add_key_to_url($url, $apiKey);
    try {
      $d = http_get_json($url, $headers);
      $results = $d['results'] ?? null;
      if (is_array($results)) return massive_snapshot_normalize($results);
      $last = new RuntimeException('Massive snapshot missing results');
    } catch (UpstreamHttpException $e) {
      $last = $e;
      if (in_array((int)$e->status, [404, 405], true)) continue;
      if (in_array((int)$e->status, [401, 403], true)) throw $e;
    } catch (Throwable $e) {
      $last = $e;
    }
  }

  if ($last) throw $last;
  return [];
}

function massive_snapshot_many_cached(array $tickers, int $ttl = 3): array {
  $ttl = max(1, min(120, (int)$ttl));
  $tickers = array_values(array_unique(array_map('strtoupper', array_map('trim', $tickers))));
  $tickers = array_values(array_filter($tickers, fn($t) => $t !== ''));
  if (!$tickers) return [];
  sort($tickers);

  $dir = __DIR__ . '/../data/cache';
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }

  $file = $dir . '/m_snap_' . substr(sha1(json_encode($tickers)), 0, 24) . '.json';
  $now = time();

  if (is_file($file)) {
    $age = $now - (int)@filemtime($file);
    if ($age >= 0 && $age <= $ttl) {
      $raw = @file_get_contents($file);
      $d = $raw ? json_decode((string)$raw, true) : null;
      if (is_array($d)) return $d;
    }
  }

  try {
    $d = massive_snapshot_many($tickers);
    if (is_array($d)) {
      @file_put_contents($file, json_encode($d, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE), LOCK_EX);
      return $d;
    }
  } catch (Throwable $e) {
    if (is_file($file)) {
      $raw = @file_get_contents($file);
      $d = $raw ? json_decode((string)$raw, true) : null;
      if (is_array($d)) return $d;
    }
    throw $e;
  }

  return [];
}
