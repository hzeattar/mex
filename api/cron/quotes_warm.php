<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/market_resolver.php';

function cron_input_token_qw(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $arg) {
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}

$token = cron_input_token_qw();
if ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token)) {
  http_response_code(403);
  echo 'Forbidden';
  exit;
}
header('Content-Type: application/json; charset=utf-8');

try { $pdo = db(); } catch (Throwable $e) { json_response(['ok'=>false,'error'=>'DB not ready for cron','detail'=>$e->getMessage()], 500); }

function cron_supported_quote_defs_qw(): array {
  return [
    'crypto' => [
      ['symbol'=>'BTCUSDT'], ['symbol'=>'ETHUSDT'], ['symbol'=>'SOLUSDT'], ['symbol'=>'XRPUSDT'], ['symbol'=>'BNBUSDT'], ['symbol'=>'DOGEUSDT'], ['symbol'=>'ADAUSDT'], ['symbol'=>'AVAXUSDT'], ['symbol'=>'LINKUSDT'], ['symbol'=>'DOTUSDT'],
    ],
    'forex' => [
      ['symbol'=>'EURUSD'], ['symbol'=>'GBPUSD'], ['symbol'=>'USDJPY'], ['symbol'=>'USDCHF'], ['symbol'=>'AUDUSD'], ['symbol'=>'USDCAD'],
    ],
    'stocks' => [
      ['symbol'=>'AAPL','yahoo_ticker'=>'AAPL'], ['symbol'=>'MSFT','yahoo_ticker'=>'MSFT'], ['symbol'=>'NVDA','yahoo_ticker'=>'NVDA'], ['symbol'=>'TSLA','yahoo_ticker'=>'TSLA'], ['symbol'=>'AMZN','yahoo_ticker'=>'AMZN'], ['symbol'=>'GOOGL','yahoo_ticker'=>'GOOGL'],
    ],
    'commodities' => [
      ['symbol'=>'XAUUSD','yahoo_ticker'=>'GC=F'], ['symbol'=>'XAGUSD','yahoo_ticker'=>'SI=F'], ['symbol'=>'USOIL','yahoo_ticker'=>'CL=F'], ['symbol'=>'UKOIL','yahoo_ticker'=>'BZ=F'], ['symbol'=>'NGAS','yahoo_ticker'=>'NG=F'],
    ],
    'futures' => [
      ['symbol'=>'ES_F','yahoo_ticker'=>'ES=F'], ['symbol'=>'NQ_F','yahoo_ticker'=>'NQ=F'], ['symbol'=>'YM_F','yahoo_ticker'=>'YM=F'], ['symbol'=>'RTY_F','yahoo_ticker'=>'RTY=F'], ['symbol'=>'CL_F','yahoo_ticker'=>'CL=F'], ['symbol'=>'GC_F','yahoo_ticker'=>'GC=F'], ['symbol'=>'ZN_F','yahoo_ticker'=>'ZN=F'], ['symbol'=>'ZB_F','yahoo_ticker'=>'ZB=F'],
    ],
    'arab' => [
      ['symbol'=>'2222','yahoo_ticker'=>'2222.SR'], ['symbol'=>'1120','yahoo_ticker'=>'1120.SR'], ['symbol'=>'2010','yahoo_ticker'=>'2010.SR'], ['symbol'=>'7010','yahoo_ticker'=>'7010.SR'], ['symbol'=>'1211','yahoo_ticker'=>'1211.SR'], ['symbol'=>'1150','yahoo_ticker'=>'1150.SR'], ['symbol'=>'1180','yahoo_ticker'=>'1180.SR'], ['symbol'=>'2280','yahoo_ticker'=>'2280.SR'],
      ['symbol'=>'1010','yahoo_ticker'=>'1010.SR'], ['symbol'=>'1020','yahoo_ticker'=>'1020.SR'], ['symbol'=>'1030','yahoo_ticker'=>'1030.SR'], ['symbol'=>'1050','yahoo_ticker'=>'1050.SR'], ['symbol'=>'2050','yahoo_ticker'=>'2050.SR'], ['symbol'=>'2080','yahoo_ticker'=>'2080.SR'], ['symbol'=>'7020','yahoo_ticker'=>'7020.SR'], ['symbol'=>'7030','yahoo_ticker'=>'7030.SR'],
      ['symbol'=>'2040','yahoo_ticker'=>'2040.SR'], ['symbol'=>'2060','yahoo_ticker'=>'2060.SR'], ['symbol'=>'2090','yahoo_ticker'=>'2090.SR'], ['symbol'=>'2100','yahoo_ticker'=>'2100.SR'], ['symbol'=>'4001','yahoo_ticker'=>'4001.SR'], ['symbol'=>'4002','yahoo_ticker'=>'4002.SR'], ['symbol'=>'4190','yahoo_ticker'=>'4190.SR'], ['symbol'=>'4200','yahoo_ticker'=>'4200.SR'],
      ['symbol'=>'4210','yahoo_ticker'=>'4210.SR'], ['symbol'=>'4240','yahoo_ticker'=>'4240.SR'], ['symbol'=>'4260','yahoo_ticker'=>'4260.SR'], ['symbol'=>'4280','yahoo_ticker'=>'4280.SR'], ['symbol'=>'4300','yahoo_ticker'=>'4300.SR'], ['symbol'=>'4321','yahoo_ticker'=>'4321.SR'], ['symbol'=>'2150','yahoo_ticker'=>'2150.SR'], ['symbol'=>'2160','yahoo_ticker'=>'2160.SR'],
      ['symbol'=>'2170','yahoo_ticker'=>'2170.SR'], ['symbol'=>'2180','yahoo_ticker'=>'2180.SR'],
    ],
  ];
}

$types = ['crypto','forex','stocks','arab','commodities','futures'];
$perType = max(6, min(250, (int)($_GET['per_type'] ?? 120)));
$results = [];
$totalUpserts = 0;
$now = time();

// Pull ALL active supported symbols straight from the markets table so the
// warm cache covers the full tradable universe (not just a hardcoded subset).
// quote_bulk_live() resolves the right provider per symbol (Binance for
// crypto, Frankfurter/Yahoo for forex, Yahoo for stocks/commodities/futures/
// arab), so secondary cryptos, minor/exotic FX pairs and Saudi equities all
// receive real prices instead of seed placeholders.
$symbolsByType = [];
$metaByTypeSymbol = [];
try {
  $allStmt = $pdo->query("SELECT symbol, type, meta FROM markets WHERE status='active'");
  foreach (($allStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if ($sym === '') continue;
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if (!in_array($type, $types, true)) continue;
    if (!isset($symbolsByType[$type])) { $symbolsByType[$type] = []; $metaByTypeSymbol[$type] = []; }
    if (isset($metaByTypeSymbol[$type][$sym])) continue;
    $symbolsByType[$type][] = $sym;
    $metaByTypeSymbol[$type][$sym] = market_meta($row['meta'] ?? null);
  }
} catch (Throwable $e) {}

// Supplement with the static catalog (cron_supported_quote_defs_qw): some
// markets (notably the Saudi/arab equities) are served by markets.php from a
// hardcoded catalog and are not stored in the `markets` table, so the DB pass
// above misses them. Merge any catalog symbol not already collected so the
// warm cache covers them too.
$staticDefs = cron_supported_quote_defs_qw();
foreach ($types as $type) {
  foreach (($staticDefs[$type] ?? []) as $def) {
    $sym = strtoupper(trim((string)($def['symbol'] ?? '')));
    if ($sym === '') continue;
    if (!isset($symbolsByType[$type])) { $symbolsByType[$type] = []; $metaByTypeSymbol[$type] = []; }
    if (isset($metaByTypeSymbol[$type][$sym])) continue;
    $symbolsByType[$type][] = $sym;
    $metaByTypeSymbol[$type][$sym] = $def;
  }
}

foreach ($types as $type) {
  $symbols = array_slice($symbolsByType[$type] ?? [], 0, $perType);
  if (!$symbols) { $results[$type] = ['count'=>0,'upserts'=>0]; continue; }
  $metaBySymbol = [];
  foreach ($symbols as $sym) { $metaBySymbol[$sym] = $metaByTypeSymbol[$type][$sym] ?? []; }
  $count = count($symbols);
  $opts = [
    'ttl' => 1,
    'yahoo_ttl' => 1,
    'massive_ttl' => 1,
    'direct_budget' => $count,
    'direct_yahoo_budget' => $count,
    'chart_budget' => in_array($type, ['arab','forex','commodities','futures'], true) ? min($count, 16) : 8,
  ];
  $live = [];
  try { $live = quote_bulk_live(array_values(array_unique($symbols)), $type, $metaBySymbol, $opts); } catch (Throwable $e) { $live = []; }
  $upserts = 0;
  foreach ($symbols as $sym) {
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    $price = (float)($row['price'] ?? 0);
    if (!($price > 0)) continue;
    $change = (float)($row['change_pct'] ?? 0);
    $updated = (int)($row['updated_at'] ?? $now) ?: $now;
    $source = (string)($row['source'] ?? 'provider_live');
    try {
      quote_upsert($sym, $type, $price, $change, $updated, ['source'=>$source]);
      $upserts++;
      $totalUpserts++;
    } catch (Throwable $e) {}
  }
  $results[$type] = ['count'=>$count,'upserts'=>$upserts];
}

$payload = [
  'ok' => true,
  'warmed_at' => $now,
  'per_type' => $perType,
  'total_upserts' => $totalUpserts,
  'results' => $results,
  'hint' => 'Run every minute via cron using token=CRON_KEY'
];
try { tp_status_write('quotes_warm', $payload); } catch (Throwable $e) {}

json_response($payload);
