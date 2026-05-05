<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/marketdata.php';
require_once __DIR__ . '/../lib/schema.php';

// Hostinger/shared-friendly: allow running from browser/cron using ?key=CRON_KEY
// or from CLI using token=CRON_KEY, plus authenticated admin sessions.
function cron_input_token_ms(): string {
  $web = trim((string)($_GET['token'] ?? $_GET['key'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      if (str_starts_with($arg, 'key=')) return trim(substr($arg, 4));
      if (str_starts_with($arg, '--key=')) return trim(substr($arg, 6));
      return $arg;
    }
  }
  return '';
}
cron_or_admin();

$pdo = db();

// Ensure tables exist
schema_upgrade($pdo, db_driver());

// Pull top symbols by quoteVolume (USDT pairs) for Spot
function top_spot_usdt(int $n=80): array {
  $tick = http_get_json('https://api.binance.com/api/v3/ticker/24hr');
  $items = [];
  foreach ($tick as $t) {
    if (!is_array($t)) continue;
    $sym = (string)($t['symbol'] ?? '');
    if ($sym==='' || substr($sym,-4)!=='USDT') continue;
    $qv = (float)($t['quoteVolume'] ?? 0);
    if ($qv<=0) continue;
    $items[] = ['symbol'=>$sym,'qv'=>$qv,'chg'=>(float)($t['priceChangePercent'] ?? 0)];
  }
  usort($items, fn($a,$b)=> $b['qv'] <=> $a['qv']);
  return array_slice($items,0,$n);
}

// Pull top perp symbols from fapi
function top_perp_usdt(int $n=80): array {
  $tick = http_get_json('https://fapi.binance.com/fapi/v1/ticker/24hr');
  $items = [];
  foreach ($tick as $t) {
    if (!is_array($t)) continue;
    $sym = (string)($t['symbol'] ?? '');
    if ($sym==='' || substr($sym,-4)!=='USDT') continue;
    $qv = (float)($t['quoteVolume'] ?? 0);
    if ($qv<=0) continue;
    $items[] = ['symbol'=>$sym,'qv'=>$qv,'chg'=>(float)($t['priceChangePercent'] ?? 0)];
  }
  usort($items, fn($a,$b)=> $b['qv'] <=> $a['qv']);
  return array_slice($items,0,$n);
}

$spot = top_spot_usdt(80);
$perp = top_perp_usdt(80);

// Upsert into markets table
$driver = db_driver();
$now = time();

function upsert_market(PDO $pdo, string $symbol, string $name, string $type, int $sort): void {
  $meta = json_encode(['source'=>'binance','ts'=>time()], JSON_UNESCAPED_SLASHES);
  if (db_driver()==='sqlite') {
    $pdo->prepare("INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, type=excluded.type, status='active', sort_order=excluded.sort_order, meta=excluded.meta, updated_at=excluded.updated_at")
      ->execute([$symbol,$name,$type,'active',$sort,$symbol,0,$meta,time()]);
  } else {
    $pdo->prepare("INSERT INTO markets (symbol,name,type,status,sort_order,tv_symbol,seed_price,meta,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), status='active', sort_order=VALUES(sort_order), meta=VALUES(meta), updated_at=VALUES(updated_at)")
      ->execute([$symbol,$name,$type,'active',$sort,$symbol,0,$meta,time()]);
  }
}

// Spot type=crypto
$sort=1;
foreach ($spot as $it) {
  $sym=$it['symbol'];
  upsert_market($pdo,$sym,$sym,'crypto',$sort++);
}

echo "<pre>OK\nSpot: ".count($spot)."\nPerp: ".count($perp)."\n</pre>";

try { tp_status_write('markets_sync', ['ok'=>true,'spot'=>count($spot),'perp'=>count($perp),'ts'=>time()]); } catch (Throwable $e) {}
try { tp_log('cron','INFO','markets_sync', ['spot'=>count($spot),'perp'=>count($perp)]); } catch (Throwable $e) {}


function cron_or_admin(): void {
  // admin session
  session_start();
  if (!empty($_SESSION['admin_id'])) return;

  $key = cron_input_token_ms();
  $cronKey = (string)env('CRON_KEY', '');
  $installKey = (string)env('INSTALL_KEY', '');
  if ($key !== '' && ($key === $cronKey || $key === $installKey)) return;

  http_response_code(403);
  echo "Forbidden";
  exit;
}
