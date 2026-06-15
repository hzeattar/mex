<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/risk.php';
require_once __DIR__ . '/../lib/trade_mode.php';
require_once __DIR__ . '/../lib/quote_snapshot.php';

$uid = require_auth();
$fast = ((int)($_GET['fast'] ?? 1) === 1);
$cacheTtl = $fast ? 1 : 2; // short TTL: 1-2 seconds
$cacheKey = 'portfolio_' . (int)$uid . '_' . ($fast ? 'fast' : 'full') . '_' . (trade_mode_for_user(db(), $uid) ?? 'demo');
$cacheDir = dirname(__DIR__) . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
$cacheFile = $cacheDir . '/' . sha1($cacheKey) . '.json';
if (is_file($cacheFile)) {
  $age = time() - (int)@filemtime($cacheFile);
  if ($age >= 0 && $age <= $cacheTtl) {
    $raw = @file_get_contents($cacheFile);
    if ($raw !== false && $raw !== '') {
      $cached = json_decode($raw, true);
      if (is_array($cached)) {
        header('Content-Type: application/json; charset=utf-8');
        // Allow short client-side freshness; stale-while-revalidate for 5s
        header('Cache-Control: private, max-age=' . $cacheTtl . ', stale-while-revalidate=5');
        echo $raw;
        exit;
      }
    }
  }
}

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

function trade_optional_select(PDO $pdo, string $table, array $columns): string {
  $driver = function_exists('db_driver') ? db_driver() : '';
  $parts = [];
  foreach ($columns as $col => $default) {
    $name = is_int($col) ? (string)$default : (string)$col;
    $fallback = is_int($col) ? '0' : (string)$default;
    try {
      $exists = function_exists('schema_column_exists')
        ? schema_column_exists($pdo, $table, $name, $driver)
        : true;
    } catch (Throwable $e) {
      $exists = true;
    }
    $parts[] = $exists ? $name : ($fallback . ' AS ' . $name);
  }
  return $parts ? ', ' . implode(', ', $parts) : '';
}

$posCopySel = trade_optional_select($pdo, 'positions', [
  'source_signal_id' => '0',
  'copy_subscription_id' => '0',
  'copied_from_admin' => '0',
]);
$orderMetaSel = trade_optional_select($pdo, 'orders', [
  'meta' => "''",
  'entry_price' => '0',
]);

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
  $ps = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,liquidation_price,tp_price,sl_price,status,{$posTimeSel},closed_at{$posCopySel} FROM positions WHERE user_id=? AND status='open' AND symbol LIKE ?");
  $ps->execute([$uid, $realPrefix.'%']);
} else {
  $ps = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,liquidation_price,tp_price,sl_price,status,{$posTimeSel},closed_at{$posCopySel} FROM positions WHERE user_id=? AND status='open' AND symbol NOT LIKE ?");
  $ps->execute([$uid, $realPrefix.'%']);
}
$positions = $ps->fetchAll(PDO::FETCH_ASSOC) ?: [];

// Prefetch quote snapshots grouped by asset type/market so PnL uses the same
// authority as order execution and live lists.
$symbolsByCtx = [];
foreach ($positions as $p) {
  $symUi = strtoupper(sym_strip_prefix((string)($p['symbol'] ?? '')));
  if ($symUi === '' || !preg_match('/^[A-Z0-9:._-]{1,32}$/', $symUi)) continue;
  $assetType = vp_normalize_asset_type((string)($p['asset_type'] ?? 'crypto')) ?: 'crypto';
  $marketType = strtolower((string)($p['market_type'] ?? 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';
  $ctxKey = $assetType . '|' . $marketType;
  $symbolsByCtx[$ctxKey]['type'] = $assetType;
  $symbolsByCtx[$ctxKey]['market'] = $marketType;
  $symbolsByCtx[$ctxKey]['symbols'][] = $symUi;
}

$qMap = [];
foreach ($symbolsByCtx as $ctx) {
  $snapshots = qs_snapshots(array_values(array_unique($ctx['symbols'] ?? [])), (string)$ctx['type'], (string)$ctx['market'], ['mode' => 'display']);
  foreach ($snapshots as $snap) {
    $key = strtoupper((string)($snap['symbol'] ?? '')) . '|' . (string)($snap['type'] ?? '') . '|' . (string)($snap['market'] ?? '');
    if ($key !== '||') $qMap[$key] = $snap;
  }
}

$unreal = 0.0;
$openMargin = 0.0;
$outPos = [];
foreach ($positions as $p) {
  $symbolRaw = (string)($p['symbol'] ?? '');
  $symUi = strtoupper(sym_strip_prefix($symbolRaw));

  $assetType = vp_normalize_asset_type((string)($p['asset_type'] ?? 'crypto')) ?: 'crypto';
  $marketType = strtolower((string)($p['market_type'] ?? 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';

  $quoteKey = $symUi . '|' . $assetType . '|' . $marketType;
  $quoteSnapshot = is_array($qMap[$quoteKey] ?? null) ? $qMap[$quoteKey] : null;
  $mark = is_array($quoteSnapshot) ? (float)($quoteSnapshot['mark'] ?? $quoteSnapshot['price'] ?? 0) : 0.0;
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
    'quote'=> is_array($quoteSnapshot) ? qs_public_item($quoteSnapshot) : null,
    'unrealized_pnl'=>$pnl,
    'roe_pct'=>$roe,
    'created_at'=>$p['created_at'] ?? null,
    'closed_at'=>$p['closed_at'] ?? null,
    'source_signal_id'=>(int)($p['source_signal_id'] ?? 0),
    'copy_subscription_id'=>(int)($p['copy_subscription_id'] ?? 0),
    'copied_from_admin'=>(int)($p['copied_from_admin'] ?? 0),
    'source'=>((int)($p['copy_subscription_id'] ?? 0) > 0 || (int)($p['copied_from_admin'] ?? 0) > 0) ? 'trading_bot' : ''
  ];
}

// orders
if ($mode === 'real') {
  $os = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,fee_paid,status,created_at,pnl_usd,close_reason,closed_at{$orderMetaSel} FROM orders WHERE user_id = ? AND symbol LIKE ? ORDER BY id DESC LIMIT 200");
  $os->execute([$uid, $realPrefix.'%']);
} else {
  $os = $pdo->prepare("SELECT id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,fee_paid,status,created_at,pnl_usd,close_reason,closed_at{$orderMetaSel} FROM orders WHERE user_id = ? AND symbol NOT LIKE ? ORDER BY id DESC LIMIT 200");
  $os->execute([$uid, $realPrefix.'%']);
}
$orders = $os->fetchAll(PDO::FETCH_ASSOC) ?: [];
foreach ($orders as &$orow) {
  $meta = [];
  $rawMeta = trim((string)($orow['meta'] ?? ''));
  if ($rawMeta !== '') {
    $decoded = json_decode($rawMeta, true);
    if (is_array($decoded)) $meta = $decoded;
  }
  $copySub = (int)($meta['subscription_id'] ?? $meta['copy_subscription_id'] ?? 0);
  $sourceSignal = (int)($meta['signal_id'] ?? $meta['source_signal_id'] ?? 0);
  if ($copySub > 0 || strtolower((string)($meta['source'] ?? '')) === 'trading_bot') {
    $orow['copy_subscription_id'] = $copySub;
    $orow['source_signal_id'] = $sourceSignal;
    $orow['copied_from_admin'] = 1;
    $orow['source'] = 'trading_bot';
  }
}
unset($orow);

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
// In-use reflects funds locked INSIDE the trading wallet (pending-withdrawal holds + open
// position margin). Active Earn/Invest contracts are funded by debiting the wallet balance,
// so that principal already left the wallet and must NOT be re-added here — doing so inflated
// the dashboard "Total balance" above the real wallet balance shown in the header. The
// invested principal is surfaced separately via `active_contract_amount` and the Earn page.
$inUseBalance = $walletHolds + $openMargin;
$pnlTotalLive = $realized + $unreal;
$pnl24Live = $realized24 + $unreal;
// Total balance == trading wallet equity == cash balance (available + holds) + open-margin + unrealised PnL.
// This now equals bootstrap wallet balance (+ live PnL), keeping the header and dashboard consistent.
$totalBalance = $availableBalance + $inUseBalance + $unreal;

$plans = $pdo->query('SELECT id,name,term_days,roi_percent,min_amount,max_amount,risk FROM invest_plans ORDER BY roi_percent DESC LIMIT 2')->fetchAll(PDO::FETCH_ASSOC) ?: [];

$response = [
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
];

$jsonPayload = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($jsonPayload !== false) {
  @file_put_contents($cacheFile, $jsonPayload, LOCK_EX);
}

json_response($response);
