<?php
/**
 * Local test helper.
 * - Loads test env vars (NEVER touches the real .env).
 * - Creates a fresh SQLite DB at api/data/test.sqlite.
 * - Boots the schema + seeds a rich dataset (users, wallets, positions, orders,
 *   bot subscriptions, copy trades, deposits, withdrawals, signals, contracts).
 *
 * Run from project root:
 *   php scripts/test_bootstrap.php
 *
 * It prints credentials and dataset stats. The DB is then ready for ad-hoc
 * requests via scripts/test_http.php.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
chdir($root);

// Make sure api/data exists
@mkdir($root . '/api/data', 0775, true);
@mkdir($root . '/api/data/cache', 0775, true);
@mkdir($root . '/api/data/logs', 0775, true);

// Load test env
$envFile = $root . '/ops/test_env.ini';
if (!is_file($envFile)) {
  fwrite(STDERR, "Missing $envFile\n");
  exit(1);
}
$envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($envLines as $line) {
  $line = trim($line);
  if ($line === '' || str_starts_with($line, '#')) continue;
  $pos = strpos($line, '=');
  if ($pos === false) continue;
  $key = trim(substr($line, 0, $pos));
  $val = trim(substr($line, $pos + 1));
  if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
      (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
    $val = substr($val, 1, -1);
  }
  putenv("$key=$val");
  $_ENV[$key] = $val;
}

// Force APP_ENV=local so the bootstrap.php skip-mode kicks in
putenv('APP_ENV=local');
$_ENV['APP_ENV'] = 'local';

// Wipe the test DB so we start clean
$dbFile = $root . '/api/data/test.sqlite';
foreach ([$dbFile, $dbFile . '-wal', $dbFile . '-shm'] as $f) {
  if (is_file($f)) @unlink($f);
}

require_once $root . '/api/lib/common.php';
require_once $root . '/api/lib/schema.php';
require_once $root . '/api/lib/ledger.php';
require_once $root . '/api/lib/quotes.php';
require_once $root . '/api/lib/risk.php';
require_once $root . '/api/lib/trade_mode.php';
require_once $root . '/api/lib/levels.php';
require_once $root . '/api/lib/affiliates.php';
require_once $root . '/api/lib/settings.php';
require_once $root . '/api/auth/_common.php';
require_once $root . '/api/lib/trade_close.php';

$pdo = db();
$drv = db_driver();
echo "Driver: $drv\n";
if ($drv !== 'sqlite') {
  fwrite(STDERR, "FATAL: test_bootstrap must run on sqlite. Got: $drv\n");
  exit(1);
}

// Force full install + seed (ignore META markers)
schema_install($pdo, $drv);
schema_upgrade($pdo, $drv);
schema_seed_defaults($pdo, $drv);
vp_feature_bootstrap($pdo, $drv);

echo "Schema installed. Version: " . (defined('SCHEMA_VERSION') ? SCHEMA_VERSION : 'n/a') . "\n";

// =========================================================================
// Seed quotes (so trade placement and order open/close work offline)
// =========================================================================
$now = time();
$seedQuotes = [
  // crypto
  ['BTCUSDT', 'crypto', 68000, 2.1,  $now],
  ['ETHUSDT', 'crypto', 3500,  1.5,  $now],
  ['SOLUSDT', 'crypto', 170,   3.2,  $now],
  ['XRPUSDT', 'crypto', 1.5,   0.5,  $now],
  ['BNBUSDT', 'crypto', 600,   1.0,  $now],
  ['DOGEUSDT','crypto', 0.12,  0.8,  $now],
  ['ADAUSDT', 'crypto', 0.45,  1.1,  $now],
  ['AVAXUSDT','crypto', 25,    2.3,  $now],
  // forex
  ['EURUSD',  'forex',  1.084, 0.1,  $now],
  ['GBPUSD',  'forex',  1.268, 0.05, $now],
  ['USDJPY',  'forex',  155.2, 0.0,  $now],
  // stocks
  ['AAPL',    'stocks', 195.0, 0.7,  $now],
  ['TSLA',    'stocks', 220.0, 1.2,  $now],
  // commodities
  ['XAUUSD',  'commodities', 2400.0, 0.3, $now],
  ['XAGUSD',  'commodities', 28.0,   0.4, $now],
  ['USOIL',   'commodities', 78.0,   0.6, $now],
  // futures
  ['ES_F',    'futures', 5200, 0.2,  $now],
  // arab
  ['2222',    'arab',   28.0, 0.0,  $now],
];

$cols = [];
try {
  $info = $pdo->query('PRAGMA table_info(market_quotes)')->fetchAll(PDO::FETCH_ASSOC);
  foreach ($info as $c) $cols[strtolower($c['name'])] = true;
} catch (Throwable $e) { /* ignore */ }

$insertCols = ['symbol', 'type', 'price', 'change_pct', 'updated_at'];
$selectCols = ['symbol', 'type', 'price', 'change_pct', 'updated_at'];
$ph         = implode(',', array_fill(0, count($insertCols), '?'));

$extraCols = [];
if (!empty($cols['mark_price']))        $extraCols['mark_price'] = 'price';
if (!empty($cols['index_price']))       $extraCols['index_price'] = 'price';
if (!empty($cols['source']))            $extraCols['source'] = "'seed_test'";
if (!empty($cols['provider']))          $extraCols['provider'] = "'seed_test'";
if (!empty($cols['is_stale']))          $extraCols['is_stale'] = 0;
if (!empty($cols['as_of']))             $extraCols['as_of'] = $now;
if (!empty($cols['ingested_at']))       $extraCols['ingested_at'] = $now;
if (!empty($cols['provider_ts']))       $extraCols['provider_ts'] = $now;
if (!empty($cols['received_at']))       $extraCols['received_at'] = $now;

$insertCols = array_merge($insertCols, array_keys($extraCols));
$ph         = implode(',', array_fill(0, count($insertCols), '?'));

$ins = $pdo->prepare("INSERT OR REPLACE INTO market_quotes(" . implode(',', $insertCols) . ") VALUES ($ph)");

// also seed markets
try {
  $pdo->exec("DELETE FROM markets");
  $marketIns = $pdo->prepare("INSERT INTO markets(symbol,name,type,status,sort_order,seed_price,tv_symbol,meta,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)");
  $markets = [
    ['BTCUSDT','Bitcoin','crypto','active',10,68000,'BINANCE:BTCUSDT','{"icon_url":"/assets/img/btc.svg"}'],
    ['ETHUSDT','Ethereum','crypto','active',12,3500,'BINANCE:ETHUSDT','{"icon_url":"/assets/img/eth.svg"}'],
    ['SOLUSDT','Solana','crypto','active',14,170,'BINANCE:SOLUSDT','{"icon_url":"/assets/img/sol.svg"}'],
    ['XRPUSDT','XRP','crypto','active',16,1.5,'BINANCE:XRPUSDT','{"icon_url":"/assets/img/xrp.svg"}'],
    ['BNBUSDT','BNB','crypto','active',18,600,'BINANCE:BNBUSDT','{"icon_url":"/assets/img/bnb.svg"}'],
    ['DOGEUSDT','Dogecoin','crypto','active',20,0.12,'BINANCE:DOGEUSDT','{"icon_url":"/assets/img/doge.svg"}'],
    ['ADAUSDT','Cardano','crypto','active',22,0.45,'BINANCE:ADAUSDT','{"icon_url":"/assets/img/ada.svg"}'],
    ['AVAXUSDT','Avalanche','crypto','active',24,25,'BINANCE:AVAXUSDT','{"icon_url":"/assets/img/avax.svg"}'],
    ['EURUSD','Euro / USD','forex','active',100,1.084,'FX:EURUSD','{"icon_url":"/assets/img/forex.svg"}'],
    ['GBPUSD','Pound / USD','forex','active',102,1.268,'FX:GBPUSD','{"icon_url":"/assets/img/forex.svg"}'],
    ['USDJPY','USD / Yen','forex','active',104,155.2,'FX:USDJPY','{"icon_url":"/assets/img/forex.svg"}'],
    ['AAPL','Apple','stocks','active',200,195.0,'NASDAQ:AAPL','{"icon_url":"/assets/img/apple.svg"}'],
    ['TSLA','Tesla','stocks','active',202,220.0,'NASDAQ:TSLA','{"icon_url":"/assets/img/tsla.svg"}'],
    ['XAUUSD','Gold Spot','commodities','active',300,2400,'TVC:GOLD','{"icon_url":"/assets/img/metal.svg"}'],
    ['XAGUSD','Silver Spot','commodities','active',302,28.0,'TVC:SILVER','{"icon_url":"/assets/img/metal.svg"}'],
    ['USOIL','WTI Crude','commodities','active',304,78.0,'TVC:USOIL','{"icon_url":"/assets/img/oil.svg"}'],
    ['ES_F','E-mini S&P','futures','active',400,5200,'CME_MINI:ES1!','{"icon_url":"/assets/img/future.svg"}'],
    ['2222','Saudi Aramco','arab','active',500,28.0,'TADAWUL:2222','{"icon_url":"/assets/img/arab.svg"}'],
  ];
  foreach ($markets as $i => $m) {
    $marketIns->execute([$m[0],$m[1],$m[2],$m[3],$m[4],$m[5],$m[6],$m[7],$now,$now]);
  }
  echo "Seeded " . count($markets) . " markets\n";
} catch (Throwable $e) {
  echo "markets seed skipped: " . $e->getMessage() . "\n";
}

foreach ($seedQuotes as $q) {
  $vals = [$q[0], $q[1], $q[2], $q[3], $q[4]];
  foreach ($extraCols as $k => $v) {
    $vals[] = is_int($v) ? $v : trim((string)$v, "'");
  }
  try { $ins->execute($vals); } catch (Throwable $e) { /* ignore */ }
}
echo "Seeded " . count($seedQuotes) . " quotes\n";

// =========================================================================
// Seed users
// =========================================================================
$users = [
  // email, password, first, last, role
  ['admin@mex.local',  'TestAdmin123!@#', 'Admin',  'Owner',  'admin'],
  ['trader@mex.local', 'TestUser123!',    'Hassan', 'Trades', 'user'],
  ['whale@mex.local',  'TestUser123!',    'Layla',  'Whale',  'user'],
  ['beginner@mex.local','TestUser123!',   'Omar',   'New',    'user'],
];

$userIds = [];
$ins = $pdo->prepare("INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,manager_id,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
foreach ($users as $u) {
  $email    = $u[0];
  $pass     = $u[1];
  $first    = $u[2];
  $last     = $u[3];
  $role     = $u[4];
  $hash     = password_hash($pass, PASSWORD_BCRYPT);
  $display  = trim("$first $last");
  $force    = null;
  $manager  = $role === 'admin' ? 0 : 1;
  try {
    $ins->execute([$email, $hash, $first, $last, $display, 'en', 'active', 'web', $manager, $now, $now, $now]);
    $uid = (int)$pdo->lastInsertId();
    $userIds[$email] = $uid;
  } catch (Throwable $e) {
    fwrite(STDERR, "User insert failed: $email " . $e->getMessage() . "\n");
  }
}
echo "Seeded " . count($userIds) . " users: " . json_encode(array_map(fn($e,$i)=>"$e=>$i", array_keys($userIds), $userIds)) . "\n";

// =========================================================================
// Seed wallets + initial balances (DEMO + REAL)
// =========================================================================
$demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
$realCur = (string)env('REAL_CURRENCY', 'USDT');

$balances = [
  'trader@mex.local'    => ['demo' => 10000, 'real' => 5000],
  'whale@mex.local'     => ['demo' => 25000, 'real' => 50000],
  'beginner@mex.local'  => ['demo' => 2000,  'real' => 0],
  'admin@mex.local'     => ['demo' => 1000,  'real' => 1000],
];

foreach ($balances as $email => $b) {
  $uid = $userIds[$email] ?? 0;
  if ($uid <= 0) continue;
  // ensure wallets
  ensure_wallet($uid, $realCur);
  ensure_wallet($uid, $demoCur);
  ledger_add($uid, $demoCur, $b['demo'], 'seed_test', 'user', (string)$uid, ['note' => 'test seed'], $now);
  if ($b['real'] > 0) {
    ledger_add($uid, $realCur, $b['real'], 'seed_test', 'user', (string)$uid, ['note' => 'test seed'], $now);
  }
  auth_ensure_trading_accounts($uid);
  auth_sync_identity($pdo, $uid, 'email', $email, null, $email, ['source' => 'test_seed']);
}
echo "Seeded wallets for " . count($balances) . " users\n";

// =========================================================================
// Helper: place a trade via place_order logic (bypass HTTP for seeding speed)
// =========================================================================
function seed_place(PDO $pdo, int $uid, string $symbol, string $assetType, string $marketType, string $side, float $qty, float $price, int $lev, float $tp, float $sl, bool $isReal, string $reason): int {
  $demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
  $realCur = (string)env('REAL_CURRENCY', 'USDT');
  $cur = $isReal ? $realCur : $demoCur;
  $storeSymbol = $isReal ? ('@R@' . $symbol) : $symbol;

  $pdo->beginTransaction();
  try {
    $w = ensure_wallet($uid, $cur);
    $wid = (int)$w['id'];
    if ($marketType === 'perp') {
      $cost = ($qty * $price) / max(1, $lev);
    } else {
      $cost = $qty * $price;
    }
    $avail = wallet_available($uid, $cur);
    if ($avail['available'] + 1e-9 < $cost) {
      throw new RuntimeException("seed: insufficient $cur for $reason (need $cost, have " . $avail['available'] . ")");
    }
    ledger_add($uid, $wid, $cur, -$cost, 'trade_open', 'order', null, [
      'symbol'=>$symbol,'market_type'=>$marketType,'side'=>$side,'qty'=>$qty,
      'price'=>$price,'leverage'=>$lev,'mode'=>$isReal?'real':'demo','seed'=>true
    ]);
    $liq = ($marketType === 'perp') ? perp_calc_liquidation_price($price, $qty, $side, $lev) : null;
    $ts = time();
    $ins = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,fees_paid,liquidation_price,tp_price,sl_price,opened_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $ins->execute([$uid,$storeSymbol,$assetType,$marketType,$side,$qty,$price,$lev,'isolated',$cost,0,$liq,($tp>0?$tp:null),($sl>0?$sl:null),$ts,$ts,'open']);
    $pid = (int)$pdo->lastInsertId();
    $notional = $qty * $price;
    $usd = ($marketType==='perp') ? $cost : $notional;
    $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,fee_paid,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $o->execute([$uid,$storeSymbol,$assetType,$marketType,$side,'MARKET',$qty,null,$price,$usd,($tp>0?$tp:null),($sl>0?$sl:null),$lev,0,null,$pid,0,'filled',$ts]);
    $pdo->commit();
    return $pid;
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
}

// =========================================================================
// Seed open positions for trader & whale
// =========================================================================
$trader = $userIds['trader@mex.local'];
$whale  = $userIds['whale@mex.local'];
$beginner = $userIds['beginner@mex.local'];

// Trader: 2 spot + 1 perp (demo + real mix)
$open = [];
try {
  $open[] = ['pid'=>seed_place($pdo, $trader, 'BTCUSDT', 'crypto', 'spot',  'BUY',  0.05, 68000, 1, 75000, 60000, false, 'BTC spot long demo'), 'user'=>'trader','mode'=>'demo','sym'=>'BTCUSDT','side'=>'BUY'];
  $open[] = ['pid'=>seed_place($pdo, $trader, 'ETHUSDT', 'crypto', 'spot',  'SELL', 1.2,  3500,  1, 3000,  3800,  false, 'ETH spot short demo'), 'user'=>'trader','mode'=>'demo','sym'=>'ETHUSDT','side'=>'SELL'];
  $open[] = ['pid'=>seed_place($pdo, $trader, 'XAUUSD', 'commodities','spot','BUY', 5, 2400, 1, 2500, 2350, false, 'Gold long demo'),'user'=>'trader','mode'=>'demo','sym'=>'XAUUSD','side'=>'BUY'];
  $open[] = ['pid'=>seed_place($pdo, $trader, 'BTCUSDT', 'crypto', 'spot',  'BUY',  0.01, 68000, 1, 75000, 60000, true,  'BTC real spot long'),    'user'=>'trader','mode'=>'real','sym'=>'BTCUSDT','side'=>'BUY'];
} catch (Throwable $e) { fwrite(STDERR, "Trader open seed: " . $e->getMessage() . "\n"); }

try {
  $open[] = ['pid'=>seed_place($pdo, $whale, 'BTCUSDT', 'crypto', 'perp', 'BUY', 1.0,  68000, 10, 75000, 60000, false, 'Whale BTC 10x long'),'user'=>'whale','mode'=>'demo','sym'=>'BTCUSDT','side'=>'BUY','lev'=>10];
  $open[] = ['pid'=>seed_place($pdo, $whale, 'ETHUSDT', 'crypto', 'perp', 'SELL',5.0, 3500,  5,  3000,  4000,  false, 'Whale ETH 5x short'),'user'=>'whale','mode'=>'demo','sym'=>'ETHUSDT','side'=>'SELL','lev'=>5];
  $open[] = ['pid'=>seed_place($pdo, $whale, 'SOLUSDT','crypto', 'spot', 'BUY',  10,  170,   1, 200,    150,   false, 'Whale SOL long'),       'user'=>'whale','mode'=>'demo','sym'=>'SOLUSDT','side'=>'BUY'];
  $open[] = ['pid'=>seed_place($pdo, $whale, 'BTCUSDT','crypto', 'perp', 'BUY',  0.5,  68000, 5, 72000, 65000, true,  'Whale BTC real perp'),'user'=>'whale','mode'=>'real','sym'=>'BTCUSDT','side'=>'BUY','lev'=>5];
} catch (Throwable $e) { fwrite(STDERR, "Whale open seed: " . $e->getMessage() . "\n"); }

try {
  $open[] = ['pid'=>seed_place($pdo, $beginner, 'BTCUSDT','crypto', 'spot', 'BUY', 0.005, 68000, 1, 72000, 65000, false, 'Beginner tiny BTC'),'user'=>'beginner','mode'=>'demo','sym'=>'BTCUSDT','side'=>'BUY'];
} catch (Throwable $e) { fwrite(STDERR, "Beginner open seed: " . $e->getMessage() . "\n"); }

echo "Seeded " . count($open) . " open positions\n";

// =========================================================================
// Seed closed positions (realized PnL history)
// =========================================================================
function seed_close(PDO $pdo, int $uid, string $symbol, string $assetType, string $marketType, string $side, float $qty, float $entry, float $exit, int $lev, bool $isReal, float $pnl): void {
  $demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
  $realCur = (string)env('REAL_CURRENCY', 'USDT');
  $cur = $isReal ? $realCur : $demoCur;
  $storeSymbol = $isReal ? ('@R@' . $symbol) : $symbol;
  $pdo->beginTransaction();
  try {
    $notional = $qty * $exit;
    $cost = ($marketType === 'perp') ? (($qty*$entry)/max(1,$lev)) : ($qty*$entry);
    $credit = $cost + $pnl;
    $w = ensure_wallet($uid, $cur);
    ledger_add($uid, $w['id'], $cur, $credit, 'trade_close', 'position', null, [
      'symbol'=>$symbol,'asset_type'=>$assetType,'side'=>$side,'qty'=>$qty,
      'entry'=>$entry,'exit'=>$exit,'pnl'=>$pnl,'seed'=>true
    ]);
    $ts = time() - 86400 * mt_rand(1, 5);
    $o = $pdo->prepare("INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,pnl_usd,close_reason,closed_at,fee_paid,meta,updated_at,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $o->execute([$uid,$storeSymbol,$assetType,$marketType,$side,'MARKET',$qty,$exit,$entry,$notional,null,null,$lev,0,null,0,$pnl,'seed_close',$ts,0,'{"seed":true}',$ts,'closed',$ts - 3600]);
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
}

$closedCount = 0;
$seededClosed = [
  // trader
  [$trader, 'BTCUSDT', 'crypto', 'spot',  'BUY',  0.02, 67000, 69000, 1, false,  40],
  [$trader, 'ETHUSDT', 'crypto', 'spot',  'BUY',  0.5,  3400,  3550,  1, false,  75],
  [$trader, 'BTCUSDT', 'crypto', 'perp',  'BUY',  0.1,  67000, 70000, 10, false, 30],
  [$trader, 'BNBUSDT','crypto', 'spot',  'SELL', 2,    600,   580,   1, false,  40],
  // whale
  [$whale, 'BTCUSDT','crypto', 'perp', 'BUY', 0.5, 66000, 69000, 20, false, 75],
  [$whale, 'ETHUSDT','crypto', 'spot', 'SELL',5, 3600, 3500, 1, false,  500],
  [$whale, 'SOLUSDT','crypto', 'perp', 'BUY', 30, 160, 180, 5, false,  120],
  [$whale, 'BTCUSDT','crypto', 'spot', 'SELL',0.1, 69000, 67000, 1, true, -200],
  // beginner
  [$beginner, 'BTCUSDT','crypto','spot','BUY', 0.002, 67000, 66500, 1, false, -1],
  [$beginner, 'ADAUSDT','crypto','spot','BUY', 50, 0.45, 0.50, 1, false, 2.5],
];
foreach ($seededClosed as $c) {
  try { seed_close($pdo, $c[0], $c[1], $c[2], $c[3], $c[4], $c[5], $c[6], $c[7], $c[8], $c[9], $c[10]); $closedCount++; }
  catch (Throwable $e) { fwrite(STDERR, "Closed seed: " . $e->getMessage() . "\n"); }
}
echo "Seeded $closedCount closed positions\n";

// =========================================================================
// Seed deposits & withdrawals (pending/approved mix)
// =========================================================================
$seedDeposits = [
  [$trader,    'USDT', 1000, 'approved', 'trx_hash_seed_1'],
  [$trader,    'USDT', 500,  'pending',  'trx_hash_seed_2'],
  [$whale,     'USDT', 5000, 'approved', 'trx_hash_seed_3'],
  [$whale,     'USDT', 2000, 'pending',  'trx_hash_seed_4'],
  [$beginner,  'USDT', 100,  'pending',  'trx_hash_seed_5'],
];
$depCols = [];
try {
  $info = $pdo->query('PRAGMA table_info(deposits)')->fetchAll(PDO::FETCH_ASSOC);
  foreach ($info as $c) $depCols[strtolower($c['name'])] = true;
} catch (Throwable $e) { $depCols = []; }
if (!empty($depCols)) {
  $depInsertCols = ['user_id', 'currency', 'amount', 'status', 'external_ref', 'created_at', 'updated_at'];
  $ph = implode(',', array_fill(0, count($depInsertCols), '?'));
  $sql = "INSERT INTO deposits(" . implode(',', $depInsertCols) . ") VALUES ($ph)";
  $st = $pdo->prepare($sql);
  foreach ($depVals as $v) {
    $row = [$v[0], $v[1], $v[2], $v[3], $v[4], $v[5], $v[6]];
    try { $st->execute($row); } catch (Throwable $e) { /* ignore */ }
  }
}

$seedWithdrawals = [
  [$trader,   'USDT', 200, 'approved', 'approved'],
  [$trader,   'USDT', 300, 'pending',  'pending'],
  [$whale,    'USDT', 1000,'approved', 'approved'],
  [$beginner, 'USDT', 50,  'rejected', 'kyc_required'],
];
$wdCols = [];
try {
  $info = $pdo->query('PRAGMA table_info(withdrawals)')->fetchAll(PDO::FETCH_ASSOC);
  foreach ($info as $c) $wdCols[strtolower($c['name'])] = true;
} catch (Throwable $e) { $wdCols = []; }

if (!empty($wdCols)) {
  $wdInsertCols = ['user_id','currency','amount','status','admin_note','created_at','updated_at'];
  $ph = implode(',', array_fill(0, count($wdInsertCols), '?'));
  $st = $pdo->prepare("INSERT INTO withdrawals(" . implode(',', $wdInsertCols) . ") VALUES ($ph)");
  foreach ($seedWithdrawals as $w) {
    try { $st->execute([$w[0], $w[1], $w[2], $w[3], $w[4], time() - 86400, time()]); } catch (Throwable $e) { /* ignore */ }
  }
}

// =========================================================================
// Seed trading bot subscriptions & copy trades
// =========================================================================
$botTableExists = false;
try {
  $botTableExists = schema_table_exists($pdo, 'trading_bots', $drv)
                  || schema_table_exists($pdo, 'trading_bot_subscriptions', $drv);
} catch (Throwable $e) { $botTableExists = false; }

if ($botTableExists) {
  try {
    $ts = time();
    // subscription for trader
    $pdo->prepare("INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,profit_share_pct,leverage,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        ->execute([$trader, 1, 'demo', 'USDT', 1000, 20, 5, 'active', $now - 86400*7, $now]);

    // subscription for beginner
    $pdo->prepare("INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,profit_share_pct,leverage,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        ->execute([$beginner, 1, 'demo', 'USDT', 200, 15, 3, 'active', $now - 86400*3, $now]);

    // copy bot positions
    $copyRows = [
      [1, 0.2, 67000, 10, 1, $ts-86400*2],
      [2, 2, 3550, 5, 1, $ts-86400],
    ];
    $copy = 0;
    foreach ($copyRows as $cr) {
      try {
        $qty = $cr[1];
        $entry = $cr[2];
        $lev = $cr[3];
        $cost = ($qty * $entry) / max(1, $lev);
        $liq = perp_calc_liquidation_price($entry, $qty, 'BUY', $lev);
        $pdo->prepare("INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,fees_paid,liquidation_price,tp_price,sl_price,opened_at,updated_at,status,source_signal_id,copy_subscription_id,copied_from_admin,copy_profit_share_pct) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$trader,'BTCUSDT','crypto','perp','BUY',$qty,$entry,$lev,'isolated',$cost,0,$liq,null,null,$cr[5],$cr[5],'open',$cr[0],$cr[4],1,20]);
        $copy++;
      } catch (Throwable $e) { fwrite(STDERR, "copy pos: " . $e->getMessage() . "\n"); }
    }
    echo "Copy positions: $copy\n";
  } catch (Throwable $e) {
    fwrite(STDERR, "Bot seed partial: " . $e->getMessage() . "\n");
  }
  echo "Seeded bot subscriptions + copy positions\n";
}

// =========================================================================
// Seed signals (skip if table missing columns we need)
// =========================================================================
$signalsTable = schema_table_exists($pdo, 'signals', $drv);
if ($signalsTable) {
  try {
    $sigCols = [];
    $info = $pdo->query('PRAGMA table_info(signals)')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($info as $c) $sigCols[strtolower($c['name'])] = true;
  } catch (Throwable $e) { $sigCols = []; }
  if (empty($sigCols)) {
    echo "Signals table has 0 columns (placeholder) — skipping signals seed\n";
  } else {
    try {
      $insCols = [];
      $insVals = [];
      $signalData = [
        ['BTCUSDT','crypto','BUY', 68000, 72000, 64000, 'active', time(), time()],
        ['ETHUSDT','crypto','SELL', 3500,  3000,  3800,  'active', time(), time()],
        ['XAUUSD','commodities','BUY', 2400, 2500, 2350, 'active', time(), time()],
      ];
      $colMap = [
        'symbol'=>0, 'asset_type'=>1, 'side'=>2, 'entry'=>3, 'tp'=>4, 'sl'=>5,
        'status'=>6, 'created_at'=>7, 'updated_at'=>8,
      ];
      $avail = array_intersect_key($colMap, $sigCols);
      $insertCols = array_keys($avail);
      $ph = implode(',', array_fill(0, count($insertCols), '?'));
      $st = $pdo->prepare("INSERT INTO signals(" . implode(',', $insertCols) . ") VALUES ($ph)");
      foreach ($signalData as $sd) {
        $vals = [];
        foreach ($insertCols as $c) $vals[] = $sd[$avail[$c]];
        try { $st->execute($vals); } catch (Throwable $e) { fwrite(STDERR, "signal: " . $e->getMessage() . "\n"); }
      }
    } catch (Throwable $e) { fwrite(STDERR, "Signals seed: " . $e->getMessage() . "\n"); }
    echo "Seeded signals\n";
  }
}

// =========================================================================
// Seed investment plans + 1 active investment
// =========================================================================
try {
  $pdo->exec("DELETE FROM invest_plans");
  $ins = $pdo->prepare("INSERT INTO invest_plans(id,name,name_en,name_ar,name_ru,term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,early_exit_allowed,sort_order,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  $ins->execute(['plan_starter',  'Starter',  'Starter',  'Starter',  'Starter',  7,  4.0,  100,    1000,  'low',    'end',  0, 1, 'active', $now, $now]);
  $ins->execute(['plan_pro',      'Pro',      'Pro',      'Pro',      'Pro',      14, 7.5,  1000,   10000, 'medium', 'end',  0, 2, 'active', $now, $now]);
  $ins->execute(['plan_premium',  'Premium',  'Premium',  'Premium',  'Premium',  30, 12.0, 5000,   100000,'medium', 'end',  0, 3, 'active', $now, $now]);
  $ins->execute(['plan_whale',    'Whale',    'Whale',    'Whale',    'Whale',    60, 20.0, 25000,  1000000,'high',  'end',  0, 4, 'active', $now, $now]);
} catch (Throwable $e) { fwrite(STDERR, "Plans seed: " . $e->getMessage() . "\n"); }
echo "Seeded investment plans\n";

try {
  $pdo->prepare("INSERT INTO investments(user_id,plan_id,amount,expected_return,status,start_at,end_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      ->execute([$trader, 'plan_pro',     1000, 75,  'active', time() - 86400*5, time() + 86400*9,  time()-86400*5, time()]);
  $pdo->prepare("INSERT INTO investments(user_id,plan_id,amount,expected_return,status,start_at,end_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      ->execute([$whale,  'plan_premium', 10000, 1200,'active', time() - 86400*10, time() + 86400*20, time()-86400*10, time()]);
} catch (Throwable $e) { fwrite(STDERR, "Investments seed: " . $e->getMessage() . "\n"); }
echo "Seeded active investments\n";

// =========================================================================
// Seed KYC requests
// =========================================================================
try {
  $pdo->prepare("INSERT INTO kyc_requests(user_id,status,full_name,country,doc_type,doc_number,admin_note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      ->execute([$trader, 'approved', 'Hassan Trades', 'EG', 'passport', 'A123456', 'Verified by admin', time()-86400*30, time()-86400*29]);
  $pdo->prepare("INSERT INTO kyc_requests(user_id,status,full_name,country,doc_type,doc_number,admin_note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      ->execute([$beginner, 'pending', 'Omar New', 'EG', 'id_card', 'EG987654', null, time()-86400*2, time()-86400*1]);
} catch (Throwable $e) { fwrite(STDERR, "KYC seed: " . $e->getMessage() . "\n"); }
echo "Seeded KYC requests\n";

// =========================================================================
// Final stats
// =========================================================================
echo "\n========================================\n";
echo "TEST ENVIRONMENT READY\n";
echo "========================================\n";
echo "SQLite: $dbFile\n";
echo "Users:\n";
foreach ($userIds as $email => $uid) {
  echo sprintf("  uid=%d  %-30s  password=%s\n", $uid, $email, $users[array_search($email, array_column($users, 0))][1]);
}
echo "\n";
echo "Wallets:\n";
$st = $pdo->query("SELECT u.email, w.currency, w.balance_cache FROM wallets w JOIN users u ON u.id=w.user_id ORDER BY u.id, w.currency");
foreach ($st as $r) {
  echo sprintf("  %-30s %-12s %.4f\n", $r['email'], $r['currency'], $r['balance_cache']);
}
echo "\n";
echo "Open positions: " . (int)$pdo->query("SELECT COUNT(*) FROM positions WHERE status='open'")->fetchColumn() . "\n";
echo "Closed positions: " . (int)$pdo->query("SELECT COUNT(*) FROM positions WHERE status='closed'")->fetchColumn() . "\n";
echo "Orders: " . (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn() . "\n";
echo "Quotes: " . (int)$pdo->query("SELECT COUNT(*) FROM market_quotes")->fetchColumn() . "\n";
echo "Markets: " . (int)$pdo->query("SELECT COUNT(*) FROM markets")->fetchColumn() . "\n";
echo "Done.\n";
