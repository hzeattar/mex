<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/risk.php';
require_once __DIR__ . '/../lib/trade_mode.php';

header('Cache-Control: private, max-age=5, no-store');

$uid = require_auth();
$realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
$demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
$pdo = db();

$mode = trade_mode_for_user($pdo, $uid);
$realPrefix = '@R@';
$fast = ((int)($_GET['fast'] ?? 1) === 1);
$allowLiveFetch = !$fast && ((int)($_GET['live'] ?? 0) === 1);

// Backward-compatible timestamp column for positions.
// New schema uses opened_at; older installs may still have created_at.
function positions_time_select(PDO $pdo): string {
  try {
    $drv = strtolower((string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
    if ($drv === 'mysql') {
      $st = $pdo->query("SHOW COLUMNS FROM positions");
      $cols = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
      $names = [];
      foreach ($cols as $c) { $names[strtolower((string)($c['Field'] ?? ''))] = true; }
      if (isset($names['opened_at'])) return 'opened_at AS created_at';
      if (isset($names['created_at'])) return 'created_at';
      return '0 AS created_at';
    }
    $st = $pdo->query('PRAGMA table_info(positions)');
    $cols = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
    $names = [];
    foreach ($cols as $c) { $names[strtolower((string)($c['name'] ?? ''))] = true; }
    if (isset($names['opened_at'])) return 'opened_at AS created_at';
    if (isset($names['created_at'])) return 'created_at';
    return '0 AS created_at';
  } catch (Throwable $e) {
    return '0 AS created_at';
  }
}

$posTimeSel = positions_time_select($pdo);

function sym_strip_prefix(string $s): string {
  if (str_starts_with($s, '@R@') || str_starts_with($s, '@D@')) return substr($s, 3);
  return $s;
}

// wallet (ledger-based)
$wallet = [];
$stmtW = $pdo->prepare('SELECT currency FROM wallets WHERE user_id=?');
$stmtW->execute([$uid]);
$rowsW = $stmtW->fetchAll(PDO::FETCH_ASSOC) ?: [];
if (!$rowsW) {
  // ensure default wallets exist
  ensure_wallet($uid, $realCur);
  ensure_wallet($uid, $demoCur);
  $stmtW->execute([$uid]);
  $rowsW = $stmtW->fetchAll(PDO::FETCH_ASSOC) ?: [];
}
foreach ($rowsW as $row) {
  $cur = strtoupper((string)($row['currency'] ?? ''));
  if ($cur === '') continue;
  $b = wallet_available($uid, $cur);
  $wallet[$cur] = ['balance'=>$b['balance'], 'available'=>$b['available'], 'holds'=>$b['holds']];
}

// positions (open only)
if ($mode === 'real') {
  $ps = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,liquidation_price,tp_price,sl_price,status,{$posTimeSel},closed_at FROM positions WHERE user_id=? AND status='open' AND symbol LIKE ?");
  $ps->execute([$uid, $realPrefix.'%']);
} else {
  $ps = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,liquidation_price,tp_price,sl_price,status,{$posTimeSel},closed_at FROM positions WHERE user_id=? AND status='open' AND symbol NOT LIKE ?");
  $ps->execute([$uid, $realPrefix.'%']);
}
$positions = $ps->fetchAll(PDO::FETCH_ASSOC) ?: [];

// Prefetch quotes for all position symbols in one DB query (avoid N+1).
$posSymbols = [];
foreach ($positions as $p) {
  $symUi = strtoupper(sym_strip_prefix((string)($p['symbol'] ?? '')));
  if ($symUi !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $symUi)) $posSymbols[] = $symUi;
}
$posSymbols = array_values(array_unique($posSymbols));

$qMap = [];
if ($posSymbols) {
  $in = implode(',', array_fill(0, count($posSymbols), '?'));
  $drv = db_driver();
  $hasMark = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'mark_price', $drv) : true;
  $sel = $hasMark ? 'symbol,price,mark_price,updated_at' : 'symbol,price,price AS mark_price,updated_at';
  $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol IN ($in)");
  $st->execute($posSymbols);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($rows as $r) {
    $sym = (string)$r['symbol'];
    $qMap[$sym] = [
      'price' => (float)($r['price'] ?? 0),
      'mark_price' => isset($r['mark_price']) ? (float)$r['mark_price'] : 0.0,
      'updated_at' => (int)($r['updated_at'] ?? 0),
    ];
  }
}

$unreal = 0.0;
$openMargin = 0.0;
$outPos = [];
foreach ($positions as $p) {
  $symbolRaw = (string)($p['symbol'] ?? '');
  $symUi = strtoupper(sym_strip_prefix($symbolRaw));

  $assetType = (string)($p['asset_type'] ?? 'crypto');
  $marketType = strtolower((string)($p['market_type'] ?? 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';

  $mark = 0.0;
  if (isset($qMap[$symUi])) {
    $q = $qMap[$symUi];
    if ($marketType === 'perp') {
      $mark = ($q['mark_price'] > 0) ? (float)$q['mark_price'] : (float)$q['price'];
    } else {
      $mark = (float)$q['price'];
    }
  }
  $qty = (float)($p['qty'] ?? 0);
  $entry = (float)($p['entry_price'] ?? 0);
  if ($mark <= 0 && $allowLiveFetch) {
    try { $mark = (float)quote_price($symUi, $marketType, $assetType); } catch (Throwable $e) { $mark = 0.0; }
  }
  if ($mark <= 0 && $entry > 0) {
    // Fast dashboard/portfolio reads must never block on upstream prices.
    // Use entry as neutral mark until quotes.php/quote_active.php hydrates cache.
    $mark = $entry;
  }

  $side = strtolower((string)($p['side'] ?? 'buy'));
  $status = strtolower(trim((string)($p['status'] ?? 'open')));
  $lev = (int)($p['leverage'] ?? 1);
  $margin = (float)($p['margin_initial'] ?? 0);
  $liq = isset($p['liquidation_price']) ? (float)$p['liquidation_price'] : null;
  $positionMargin = $margin > 0 ? $margin : (($qty > 0 && $entry > 0) ? ($qty * $entry) : 0.0);
  $openMargin += $positionMargin;

  $pnl = perp_calc_pnl($entry, $mark, $qty, $side);
  $unreal += $pnl;
  $principal = ($margin>0) ? $margin : ($qty*$entry);
  $roe = ($principal>0) ? ($pnl/$principal)*100.0 : 0.0;

  $outPos[] = [
    'id'=>(int)($p['id'] ?? 0),
    'mode'=>$mode,
    'status'=>$status,
    'symbol'=>$symUi,
    'asset_type'=>$assetType,
    'market_type'=>$marketType,
    'side'=>$side,
    'qty'=>$qty,
    'entry_price'=>$entry,
    'leverage'=>$lev,
    'margin_initial'=>$margin,
    'liquidation_price'=>$liq,
    'tp_price'=> isset($p['tp_price']) ? (float)$p['tp_price'] : null,
    'sl_price'=> isset($p['sl_price']) ? (float)$p['sl_price'] : null,
    'mark_price'=>$mark,
    'unrealized_pnl'=>$pnl,
    'roe_pct'=>$roe,
    'created_at'=>$p['created_at'] ?? null,
    'closed_at'=>$p['closed_at'] ?? null
  ];
}

// orders
if ($mode === 'real') {
  $os = $pdo->prepare('SELECT id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,fee_paid,status,created_at,pnl_usd,close_reason,closed_at FROM orders WHERE user_id = ? AND symbol LIKE ? ORDER BY id DESC LIMIT 50');
  $os->execute([$uid, $realPrefix.'%']);
} else {
  $os = $pdo->prepare('SELECT id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,fee_paid,status,created_at,pnl_usd,close_reason,closed_at FROM orders WHERE user_id = ? AND symbol NOT LIKE ? ORDER BY id DESC LIMIT 50');
  $os->execute([$uid, $realPrefix.'%']);
}
$orders = $os->fetchAll(PDO::FETCH_ASSOC) ?: [];

// realized pnl (closed orders)
if ($mode === 'real') {
  $stP = $pdo->prepare("SELECT COALESCE(SUM(pnl_usd),0) FROM orders WHERE user_id=? AND status='closed' AND pnl_usd IS NOT NULL AND symbol LIKE ?");
  $stP->execute([$uid, $realPrefix.'%']);
} else {
  $stP = $pdo->prepare("SELECT COALESCE(SUM(pnl_usd),0) FROM orders WHERE user_id=? AND status='closed' AND pnl_usd IS NOT NULL AND symbol NOT LIKE ?");
  $stP->execute([$uid, $realPrefix.'%']);
}
$realized = (float)($stP->fetchColumn() ?: 0);

$since24 = time() - 86400;
if ($mode === 'real') {
  $stP24 = $pdo->prepare("SELECT COALESCE(SUM(pnl_usd),0) FROM orders WHERE user_id=? AND status='closed' AND pnl_usd IS NOT NULL AND COALESCE(closed_at,created_at,0)>=? AND symbol LIKE ?");
  $stP24->execute([$uid, $since24, $realPrefix.'%']);
} else {
  $stP24 = $pdo->prepare("SELECT COALESCE(SUM(pnl_usd),0) FROM orders WHERE user_id=? AND status='closed' AND pnl_usd IS NOT NULL AND COALESCE(closed_at,created_at,0)>=? AND symbol NOT LIKE ?");
  $stP24->execute([$uid, $since24, $realPrefix.'%']);
}
$realized24 = (float)($stP24->fetchColumn() ?: 0);

$bal = ($mode === 'real') ? (float)($wallet[$realCur]['balance'] ?? 0.0) : (float)($wallet[$demoCur]['balance'] ?? 0.0);
$equity = $bal + $unreal;

// Investments principal currently locked (REAL wallet concept; investments are not demo).
$investInUse = 0.0;
try {
  $inv = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM investments WHERE user_id=? AND status='active'");
  $inv->execute([$uid]);
  $investInUse = (float)($inv->fetchColumn() ?: 0);
} catch (Throwable $e) {
  $investInUse = 0.0;
}

$activeWallet = ($mode === 'real') ? ($wallet[$realCur] ?? []) : ($wallet[$demoCur] ?? []);
$availableBalance = (float)($activeWallet['available'] ?? $bal);
$walletHolds = (float)($activeWallet['holds'] ?? 0.0);
$activeContractAmount = $mode === 'real' ? $investInUse : 0.0;
$inUseBalance = $walletHolds + $openMargin + $activeContractAmount;
$pnlTotalLive = $realized + $unreal;
$pnl24Live = $realized24 + $unreal;
$totalBalance = $availableBalance + $inUseBalance + $unreal;

$plans = $pdo->query('SELECT id,name,term_days,roi_percent,min_amount,max_amount,risk FROM invest_plans ORDER BY roi_percent DESC LIMIT 2')->fetchAll(PDO::FETCH_ASSOC) ?: [];

json_response([
  'ok'=>true,
  'mode'=>$mode,
  'wallet'=>$wallet,
  'positions'=>$outPos,
  'orders'=>$orders,
  'unrealized_pnl'=>$unreal,
  'realized_pnl'=>$realized,
  'equity'=>$equity,
  'invest_in_use'=>$investInUse,
  'metrics'=>[
    'total_balance'=>$totalBalance,
    'pnl_24_live'=>$pnl24Live,
    'pnl_total_live'=>$pnlTotalLive,
    'available_balance'=>$availableBalance,
    'in_use_balance'=>$inUseBalance,
    'open_margin'=>$openMargin,
    'realized_pnl_24h'=>$realized24,
    'wallet_holds'=>$walletHolds,
    'active_contract_amount'=>$activeContractAmount,
  ],
  'top_plans'=>$plans
]);
