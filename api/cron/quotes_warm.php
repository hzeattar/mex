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
    ],
  ];
}

$types = ['crypto','forex','stocks','arab','commodities','futures'];
$perType = max(6, min(30, (int)($_GET['per_type'] ?? 18)));
$results = [];
$totalUpserts = 0;
$now = time();
$supportedDefs = cron_supported_quote_defs_qw();

foreach ($types as $type) {
  $defs = array_slice($supportedDefs[$type] ?? [], 0, $perType);
  $wantedSymbols = array_values(array_unique(array_map(static fn($d) => strtoupper((string)($d['symbol'] ?? '')), $defs)));
  $rows = [];
  if ($wantedSymbols) {
    $placeholders = implode(',', array_fill(0, count($wantedSymbols), '?'));
    $sql = "SELECT symbol, type, meta FROM markets WHERE status='active' AND UPPER(symbol) IN ($placeholders)";
    $st = $pdo->prepare($sql);
    $st->execute($wantedSymbols);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }
  $rowMetaBySymbol = [];
  foreach ($rows as $row) {
    $rowMetaBySymbol[strtoupper((string)($row['symbol'] ?? ''))] = market_meta($row['meta'] ?? null);
  }
  $symbols = [];
  $metaBySymbol = [];
  foreach ($defs as $def) {
    $sym = strtoupper(trim((string)($def['symbol'] ?? '')));
    if ($sym === '') continue;
    $symbols[] = $sym;
    $metaBySymbol[$sym] = array_merge($def, $rowMetaBySymbol[$sym] ?? []);
  }
  if (!$symbols) { $results[$type] = ['count'=>0,'upserts'=>0]; continue; }
  $opts = [
    'ttl' => 1,
    'yahoo_ttl' => 1,
    'massive_ttl' => 1,
    'direct_budget' => count($symbols),
    'direct_yahoo_budget' => count($symbols),
    'chart_budget' => in_array($type, ['arab','forex','commodities','futures'], true) ? max(8, count($symbols)) : 8,
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
  $results[$type] = ['count'=>count($symbols),'upserts'=>$upserts];
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
