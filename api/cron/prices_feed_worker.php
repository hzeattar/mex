<?php
/**
 * Central Price Feed Worker — SINGLE SOURCE OF TRUTH for upstream access.
 *
 * This is the ONLY process that should hit upstream providers (Binance, EODHD,
 * Yahoo, TwelveData, etc.). All user-facing endpoints read from the central
 * cache that this worker writes to.
 *
 * Run modes:
 *   1. Long-running daemon:  php api/cron/prices_feed_worker.php --daemon
 *   2. Single cycle (cron):  php api/cron/prices_feed_worker.php --token=CRON_KEY
 *   3. Web-triggered cycle:  GET /api/cron/prices_feed_worker.php?token=CRON_KEY
 *
 * Scheduling:
 *   - Daemon mode: runs continuously, cycling through asset types
 *   - Cron mode: run every 30-60 seconds via Railway cron or external scheduler
 */
declare(strict_types=1);

@ignore_user_abort(true);
// Daemon mode must run with NO execution-time cap. The 120s cap is only meant for
// the single-cycle (cron/web) invocation; applying it to the long-running daemon
// caused a fatal "Maximum execution time exceeded" (exit 255) every couple of
// minutes -> the Railway crash-loop. Detect --daemon from argv up front.
$__feedArgv = (array)($_SERVER['argv'] ?? []);
$__feedDaemonRequested = in_array('--daemon', $__feedArgv, true) || strtolower(trim((string)getenv('WORKER_MODE'))) === 'feed';
@set_time_limit($__feedDaemonRequested ? 0 : (int)max(30, (int)(getenv('FEED_WORKER_MAX_EXEC') ?: '120')));
// Headroom so the soft memory break (in the daemon loop) always fires BEFORE
// PHP's hard limit -> avoids fatal "Allowed memory size exhausted" (exit 255)
// crash-loops that eventually exhaust Railway's restart retries.
@ini_set('memory_limit', (string)(getenv('FEED_WORKER_PHP_MEM') ?: '512M'));

// Flush output immediately in daemon mode for Railway logs
if (PHP_SAPI === 'cli') {
  @ini_set('output_buffering', '0');
  @ini_set('implicit_flush', '1');
}

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/quote_central.php';
require_once __DIR__ . '/../lib/market_resolver.php';

// Clear any output buffering from common.php
while (ob_get_level() > 0) @ob_end_flush();

echo "[feed-worker] Libs loaded, initializing...\n"; flush();

// ── Auth ──────────────────────────────────────────────────────────────────
function feed_worker_input_token(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      if ($arg === '--daemon') continue;
      if (str_starts_with($arg, 'types=') || str_starts_with($arg, '--types=')) continue;
      if (str_starts_with($arg, 'type=') || str_starts_with($arg, '--type=')) continue;
      if (str_starts_with($arg, 'per_type=') || str_starts_with($arg, '--per_type=')) continue;
      if (str_starts_with($arg, 'limit=') || str_starts_with($arg, '--limit=')) continue;
      return $arg;
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}

function feed_worker_arg(string $name): string {
  $web = trim((string)($_GET[$name] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI !== 'cli') return '';
  global $argv;
  foreach ((array)($argv ?? []) as $arg) {
    $arg = trim((string)$arg);
    if ($arg === '') continue;
    if (str_starts_with($arg, $name . '=')) return trim(substr($arg, strlen($name) + 1));
    if (str_starts_with($arg, '--' . $name . '=')) return trim(substr($arg, strlen($name) + 3));
  }
  return '';
}

$isDaemon = false;
if (PHP_SAPI === 'cli') {
  global $argv;
  foreach ((array)($argv ?? []) as $arg) {
    if (trim((string)$arg) === '--daemon') { $isDaemon = true; break; }
  }
  if (!$isDaemon && strtolower(trim((string)getenv('WORKER_MODE'))) === 'feed') $isDaemon = true;
}

// Single-instance lock (prevents overlapping runs)
$locksDir = __DIR__ . '/../data/locks';
if (!is_dir($locksDir)) @mkdir($locksDir, 0775, true);
$lockFp = @fopen($locksDir . '/feed_worker.lock', 'c+');
if ($lockFp) {
  if (!flock($lockFp, LOCK_EX | LOCK_NB)) {
    echo "[feed-worker] Lock busy, another instance is running. Waiting...\n"; flush();
    flock($lockFp, LOCK_EX);
    echo "[feed-worker] Lock acquired.\n"; flush();
  } else {
    echo "[feed-worker] Lock acquired immediately.\n"; flush();
  }
}

echo "[feed-worker] isDaemon=" . ($isDaemon ? 'true' : 'false') . "\n"; flush();

// ── Cycle intervals (seconds) ─────────────────────────────────────────────
$intervals = [
  'crypto'      => max(1, min(5, (int)env('FEED_INTERVAL_CRYPTO', '2'))),
  'forex'       => max(5, min(120, (int)env('FEED_INTERVAL_FOREX', '30'))),
  'stocks'      => max(15, min(180, (int)env('FEED_INTERVAL_STOCKS', '60'))),
  'arab'        => max(30, min(300, (int)env('FEED_INTERVAL_ARAB', '120'))),
  'commodities' => max(10, min(120, (int)env('FEED_INTERVAL_COMMODITIES', '30'))),
  'futures'     => max(10, min(120, (int)env('FEED_INTERVAL_FUTURES', '30'))),
];

$types = ['crypto', 'forex', 'commodities', 'futures', 'stocks', 'arab'];
$requestedTypesRaw = trim(feed_worker_arg('types') ?: feed_worker_arg('type') ?: (string)getenv('FEED_TYPES'));
if ($requestedTypesRaw !== '') {
  $requestedTypes = [];
  foreach (preg_split('/\s*,\s*/', $requestedTypesRaw) as $rawType) {
    $t = vp_normalize_asset_type((string)$rawType);
    if ($t !== '' && in_array($t, $types, true) && !in_array($t, $requestedTypes, true)) $requestedTypes[] = $t;
  }
  if ($requestedTypes) $types = $requestedTypes;
}
$feedPerTypeLimit = (int)(feed_worker_arg('per_type') ?: feed_worker_arg('limit') ?: getenv('FEED_PER_TYPE_LIMIT') ?: 200);
$feedPerTypeLimit = max(1, min(300, $feedPerTypeLimit));

// ── Collect all active symbols — cached 30s to avoid full scan every tick ─
function feed_worker_collect_symbols(): array {
  static $cache = null;
  static $cacheTime = 0;
  $now = time();
  if ($cache !== null && ($now - $cacheTime) < 30) return $cache;

  $pdo = db();
  $symbolsByType = [];
  $metaByTypeSymbol = [];

  $st = $pdo->query("SELECT symbol, type, meta, seed_price FROM markets WHERE status='active'");
  $rows = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];

  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;
    if (!isset($symbolsByType[$type])) { $symbolsByType[$type] = []; $metaByTypeSymbol[$type] = []; }
    if (isset($metaByTypeSymbol[$type][$sym])) continue;
    $symbolsByType[$type][] = $sym;
    $metaByTypeSymbol[$type][$sym] = [
      'meta' => market_meta($row['meta'] ?? null),
      'seed_price' => (float)($row['seed_price'] ?? 0),
    ];
  }

  if (empty($symbolsByType['arab'])) {
    $fallbackArab = [
      '2222','1120','2010','7010','1211','1150','1180','2280','1010','1020',
      '1030','1050','2050','2080','7020','7030','2040','2060','2090','2100',
      '4001','4002','4190','4200','4210','4240','4260','4280','4300','4321',
      '2150','2160','2170','2180',
    ];
    $symbolsByType['arab'] = [];
    $metaByTypeSymbol['arab'] = [];
    foreach ($fallbackArab as $sym) {
      $symbolsByType['arab'][] = $sym;
      $metaByTypeSymbol['arab'][$sym] = ['meta' => [], 'seed_price' => 0.0];
    }
  }

  $result = [$symbolsByType, $metaByTypeSymbol];
  $cache = $result;
  $cacheTime = time();
  return $result;
}

// ── Fetch prices for one type and write to central cache ──────────────────
function feed_worker_fetch_type(string $type, array $symbols, array $metaBySymbol): array {
  $type = vp_normalize_asset_type($type);
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  if (!$symbols) return ['count' => 0, 'written' => 0, 'upserted' => 0];

  $now = time();
  global $feedPerTypeLimit;
  $perType = max(1, min(300, (int)($feedPerTypeLimit ?? env('FEED_PER_TYPE_LIMIT', '200'))));
  $symbols = array_slice($symbols, 0, $perType);

  $metaForProvider = [];
  foreach ($symbols as $sym) {
    $metaForProvider[$sym] = is_array($metaBySymbol[$sym]['meta'] ?? null) ? $metaBySymbol[$sym]['meta'] : [];
  }

  $live = [];
  try {
    $isCrypto = ($type === 'crypto');
    $count = count($symbols);
    // Ensure non-crypto feeds do not hit Yahoo/EODHD when they are disabled.
    // TwelveData handles forex/stocks/commodities; Binance handles crypto.
    $allowYahoo = quote_yahoo_enabled();
    $live = quote_bulk_live($symbols, $type, $metaForProvider, [
      'ttl' => 1,
      'yahoo_ttl' => $allowYahoo ? 1 : 0,
      'eodhd_ttl' => 0,
      'massive_ttl' => 0,
      'persist' => true,
      'direct_budget' => $count,
      'direct_yahoo_budget' => 0,
      'chart_budget' => $isCrypto ? 8 : min($count, 16),
      'allow_direct_batch' => true,
      'only_twelvedata_for_noncrypto' => !$isCrypto,
    ]);
  } catch (Throwable $e) {
    $live = [];
  }

  $written = 0;
  $upserted = 0;
  $bySymbol = [];

  foreach ($symbols as $sym) {
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    $price = (float)($row['price'] ?? 0);

    if ($price > 0) {
      $entry = [
        'symbol' => $sym,
        'type' => $type,
        'price' => $price,
        'change_pct' => (float)($row['change_pct'] ?? 0),
        'open' => (float)($row['open'] ?? 0),
        'prev_close' => (float)($row['prev_close'] ?? $row['previous_close'] ?? 0),
        'updated_at' => (int)($row['updated_at'] ?? $now),
        'source' => (string)($row['source'] ?? 'provider_live'),
        'central_ts' => $now,
        'received_at' => (int)($row['received_at'] ?? $now),
        'ingested_at' => (int)($row['ingested_at'] ?? $now),
      ];

      // Write to central cache (per-symbol file)
      quote_central_write($sym, $type, $entry);
      $bySymbol[$sym] = $entry;
      $written++;

      // Also persist to DB for durability
      try {
        quote_upsert($sym, $type, $price, (float)($row['change_pct'] ?? 0), (int)($row['updated_at'] ?? $now), [
          'source' => (string)($row['source'] ?? 'provider_live'),
          'as_of' => (int)($row['updated_at'] ?? $now),
          'ingested_at' => $now,
        ]);
        $upserted++;
      } catch (Throwable $e) {}
    }
  }

  // Write bundle for bulk reads
  if ($bySymbol) {
    quote_central_bundle_write($type, $bySymbol);
  }

  return ['count' => count($symbols), 'written' => $written, 'upserted' => $upserted];
}

// ── Single cycle ──────────────────────────────────────────────────────────
function feed_worker_cycle(): array {
  $now = time();
  [$symbolsByType, $metaByTypeSymbol] = feed_worker_collect_symbols();

  $results = [];
  $totalWritten = 0;
  $totalUpserted = 0;
  $typeCounts = [];

  global $types;
  foreach ($types as $type) {
    $symbols = $symbolsByType[$type] ?? [];
    $meta = $metaByTypeSymbol[$type] ?? [];
    $res = feed_worker_fetch_type($type, $symbols, $meta);
    $results[$type] = $res;
    $totalWritten += $res['written'];
    $totalUpserted += $res['upserted'];
    $typeCounts[$type] = $res['written'];
  }

  // Update manifest
  quote_central_manifest_write([
    'type_counts' => $typeCounts,
    'total_written' => $totalWritten,
    'total_upserted' => $totalUpserted,
  ]);

  $payload = [
    'ok' => true,
    'cycle_at' => $now,
    'total_written' => $totalWritten,
    'total_upserted' => $totalUpserted,
    'results' => $results,
  ];

  try { tp_status_write('feed_worker', $payload); } catch (Throwable $e) {}
  try { tp_log('cron', 'INFO', 'feed_worker_cycle', $payload); } catch (Throwable $e) {}

  return $payload;
}

// ── Main ──────────────────────────────────────────────────────────────────
if ($isDaemon) {
  // Daemon mode: run cycles continuously
  echo "[feed-worker] Entering daemon mode...\n"; flush();
  $cycleCount = 0;
  $maxCycles = (int)env('FEED_WORKER_MAX_CYCLES', '0'); // 0 = unlimited
  $lastCycleByType = [];
  $lastHotCycle = 0;
  $cycleErrBackoff = 2; // start at 2s, doubles on each error, capped at 32s

  while (true) {
    if ($maxCycles > 0 && $cycleCount >= $maxCycles) break;

    // Soft memory ceiling: when exceeded, break for a clean restart (the
    // process manager relaunches us). Default 384MB sits well under the PHP
    // hard limit (512M) so we never trip a fatal "memory exhausted" (exit 255).
    $mem = memory_get_usage(true);
    $memLimit = (int)env('FEED_WORKER_MEM_LIMIT', '402653184'); // 384MB
    if ($mem > $memLimit) {
      echo "[feed-worker] mem soft-limit reached ($mem > $memLimit), exiting for clean restart\n"; flush();
      break;
    }

    try {
    $now = time();

    // Only fetch types whose interval has elapsed
    [$symbolsByType, $metaByTypeSymbol] = feed_worker_collect_symbols();
    echo "[feed-worker] Collected symbols: " . json_encode(array_map('count', $symbolsByType)) . "\n"; flush();
    $typesToFetch = [];

    $hotInterval = max(0, min(60, (int)env('FEED_HOT_INTERVAL', '10')));
    $hotPerType = max(1, min(10, (int)env('FEED_HOT_PER_TYPE', '2')));
    if ($hotInterval > 0 && ($now - $lastHotCycle) >= $hotInterval) {
      $lastHotCycle = $now;
      foreach (['forex', 'stocks', 'commodities', 'futures', 'arab'] as $hotType) {
        $hotSymbols = array_slice($symbolsByType[$hotType] ?? [], 0, $hotPerType);
        if (!$hotSymbols) continue;
        $r = feed_worker_fetch_type($hotType, $hotSymbols, $metaByTypeSymbol[$hotType] ?? []);
        echo "[feed-worker] hot $hotType: {$r['written']}/{$r['count']} written\n"; flush();
      }
    }

    foreach ($types as $type) {
      $lastCycle = $lastCycleByType[$type] ?? 0;
      $interval = $intervals[$type] ?? 15;
      if (($now - $lastCycle) >= $interval) {
        $typesToFetch[] = $type;
        $lastCycleByType[$type] = $now;
      }
    }

    if ($typesToFetch) {
      echo "[feed-worker] Fetching types: " . implode(',', $typesToFetch) . "\n"; flush();
      $cycleResults = [];
      $totalWritten = 0;
      $totalUpserted = 0;
      $typeCounts = [];

      // Fast types must never starve behind slow EODHD passes.
      $fastTypes = ['crypto', 'forex', 'commodities'];
      $runFastDue = function (string $currentType) use (
        &$lastCycleByType, $intervals, $symbolsByType, $metaByTypeSymbol,
        &$totalWritten, &$totalUpserted, &$typeCounts, $fastTypes
      ): void {
        foreach ($fastTypes as $ft) {
          if ($ft === $currentType || empty($symbolsByType[$ft])) continue;
          if ((time() - ($lastCycleByType[$ft] ?? 0)) < ($intervals[$ft] ?? 15)) continue;
          $r = feed_worker_fetch_type($ft, $symbolsByType[$ft], $metaByTypeSymbol[$ft] ?? []);
          $lastCycleByType[$ft] = time();
          echo "[feed-worker] $ft (interleaved): {$r['written']}/{$r['count']} written\n"; flush();
          $totalWritten += $r['written'];
          $totalUpserted += $r['upserted'];
          $typeCounts[$ft] = $r['written'];
        }
      };

      foreach ($typesToFetch as $type) {
        $symbols = $symbolsByType[$type] ?? [];
        $meta = $metaByTypeSymbol[$type] ?? [];
        // Chunk slow non-crypto passes (120-symbol EODHD batches can take
        // 30-60s) so crypto/forex stay near-real-time between chunks.
        $chunkSize = max(5, (int)env('FEED_CHUNK_SIZE', '25'));
        $chunks = ($type === 'crypto' || count($symbols) <= $chunkSize)
          ? [$symbols]
          : array_chunk($symbols, $chunkSize);
        $res = ['count' => 0, 'written' => 0, 'upserted' => 0];
        foreach ($chunks as $chunk) {
          $r = feed_worker_fetch_type($type, $chunk, $meta);
          $res['count'] += $r['count'];
          $res['written'] += $r['written'];
          $res['upserted'] += $r['upserted'];
          $runFastDue($type);
        }
        echo "[feed-worker] $type: {$res['written']}/{$res['count']} written\n"; flush();
        $cycleResults[$type] = $res;
        $totalWritten += $res['written'];
        $totalUpserted += $res['upserted'];
        $typeCounts[$type] = $res['written'];
      }

      quote_central_manifest_write([
        'type_counts' => $typeCounts,
        'total_written' => $totalWritten,
        'total_upserted' => $totalUpserted,
        'daemon' => true,
      ]);

      try {
        tp_status_write('feed_worker', [
          'ok' => true, 'daemon' => true, 'cycle' => $cycleCount,
          'types_fetched' => $typesToFetch,
          'total_written' => $totalWritten, 'ts' => time(),
        ]);
      } catch (Throwable $e) {}
      $cycleErrBackoff = 2; // reset backoff on successful cycle
    }

    } catch (Throwable $cycleErr) {
      // A transient DB/upstream error must NOT kill the daemon. Log and keep
      // cycling (previously these bubbled to the global handler -> exit 255 ->
      // crash-loop that eventually exhausted Railway's restart retries).
      try { tp_log('cron', 'ERROR', 'feed_worker_cycle_error', ['err' => $cycleErr->getMessage(), 'file' => $cycleErr->getFile(), 'line' => $cycleErr->getLine()]); } catch (Throwable $ignored) {}
      try { error_log('[feed-worker] cycle error (continuing): ' . $cycleErr->getMessage() . ' @ ' . $cycleErr->getFile() . ':' . $cycleErr->getLine()); } catch (Throwable $ignored) {}
      echo "[feed-worker] cycle error (continuing): " . $cycleErr->getMessage() . "\n"; flush();
      try { if (function_exists('gc_collect_cycles')) gc_collect_cycles(); } catch (Throwable $ignored) {}
      // Exponential backoff: 2s → 4s → 8s → max 32s to avoid tight error loops on DB outages
      sleep($cycleErrBackoff);
      $cycleErrBackoff = min(32, $cycleErrBackoff * 2);
    }

    $cycleCount++;
    sleep(1); // Base tick: 1 second
  }

} else {
  // Single-cycle mode (cron or web trigger)
  $token = feed_worker_input_token();
  if ($token === '' || !hash_equals((string)env('CRON_KEY', ''), $token)) {
    http_response_code(403);
    echo 'Forbidden';
    if ($lockFp) { @flock($lockFp, LOCK_UN); @fclose($lockFp); }
    exit;
  }

  $payload = feed_worker_cycle();
  json_response($payload);
}

if ($lockFp) { @flock($lockFp, LOCK_UN); @fclose($lockFp); }
