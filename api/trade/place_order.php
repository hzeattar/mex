<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/risk.php';
require_once __DIR__ . '/../lib/trade_mode.php';
require_once __DIR__ . '/../lib/affiliates.php';
require_once __DIR__ . '/../lib/quote_snapshot.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();
$body = read_json_body();

$symbol = strtoupper(trim((string)($body['symbol'] ?? '')));
$assetType = vp_normalize_asset_type((string)($body['asset_type'] ?? 'crypto'));
if ($assetType === '') $assetType = 'crypto';
$marketType = strtolower((string)($body['market_type'] ?? 'spot'));
$marginMode = strtolower((string)($body['margin_mode'] ?? 'isolated'));
$leverage = (int)($body['leverage'] ?? 1);
$tp = (float)($body['tp'] ?? 0);
$sl = (float)($body['sl'] ?? 0);
$side = strtoupper((string)($body['side'] ?? 'BUY'));
$orderType = strtoupper((string)($body['order_type'] ?? 'MARKET'));
$qty = (float)($body['qty'] ?? 0);
$usdReq = (float)($body['usd'] ?? ($body['usd_amount'] ?? ($body['amount'] ?? 0)));
$limit = (float)($body['price'] ?? 0);
$clientPrice = (float)($body['price'] ?? $body['client_price'] ?? 0);
// Demo/Real mode affects: which wallet currency is used + symbol prefix storage.
// Portfolio endpoint filters Real positions by @R@ prefix.
$mode = trade_mode_for_user($pdo, $uid, $body);
$isReal = ($mode === 'real');

// Allow placing by USD amount (preferred). If qty is missing/0 but USD is provided, we will derive qty from fill.
if ($symbol === '' || (!($qty > 0) && !($usdReq > 0))) json_response(['ok'=>false,'error'=>'Invalid order'], 422);
if (!in_array($side, ['BUY','SELL'], true)) json_response(['ok'=>false,'error'=>'Invalid side'], 422);
if (!in_array($orderType, ['MARKET','LIMIT'], true)) json_response(['ok'=>false,'error'=>'Invalid type'], 422);

$marketType = in_array($marketType, ['spot','perp'], true) ? $marketType : 'spot';
$marginMode = ($marginMode === 'isolated') ? 'isolated' : 'isolated';
$globalMaxLev = (int)(setting_get('PERP_MAX_LEVERAGE', env('PERP_MAX_LEVERAGE','125')));
$globalMaxLev = max(1, min(1000, $globalMaxLev));

// Optional per-user cap (users.max_leverage). If null/0 => use global.
$userMaxLev = 0;
try {
  $st = $pdo->prepare('SELECT max_leverage FROM users WHERE id=?');
  $st->execute([$uid]);
  $userMaxLev = (int)($st->fetchColumn() ?: 0);
} catch (Throwable $e) { $userMaxLev = 0; }

$effectiveMaxLev = $globalMaxLev;
if ($userMaxLev > 0) $effectiveMaxLev = min($effectiveMaxLev, max(1, min(1000, $userMaxLev)));

$leverage = ($marketType === 'perp') ? clamp_int($leverage, 1, $effectiveMaxLev) : 1;
if ($tp <= 0) $tp = 0.0;
if ($sl <= 0) $sl = 0.0;

// Multiple Positions Mode (ON): always create a NEW position for each open order.
// (No merge by symbol/side; each position is independent.)
$mergePositions = false;

$quoteSnapshot = qs_snapshot($symbol, $assetType, $marketType, ['mode' => 'execution']);
$mark = !empty($quoteSnapshot['execution_allowed']) ? qs_execution_price($quoteSnapshot, $side) : 0.0;
$cachedPriceForSanity = (float)($quoteSnapshot['price'] ?? 0);

if ($isReal && (empty($quoteSnapshot['execution_allowed']) || !($mark > 0))) {
  json_response([
    'ok' => false,
    'error' => 'Live executable price unavailable. Please wait for the quote to refresh and try again.',
    'code' => 'price_not_executable',
    'quote' => qs_public_item($quoteSnapshot),
  ], 409);
}

if ($mark <= 0 && !$isReal && $clientPrice > 0) {
  $allowedDrift = in_array($assetType, ['forex'], true) ? 0.03 : 0.08;
  $driftOk = $cachedPriceForSanity <= 0 || abs($clientPrice - $cachedPriceForSanity) / max($cachedPriceForSanity, 0.00000001) <= $allowedDrift;
  if ($driftOk) $mark = $clientPrice;
}

try {
  if ($mark <= 0 && !$isReal) {
    $mark = quote_price($symbol, (string)$marketType ?: 'spot', (string)$assetType ?: 'crypto');
    if ($mark > 0) {
      $quoteSnapshot = qs_snapshot_from_row($symbol, $assetType, $marketType, [
        'symbol' => $symbol,
        'type' => $assetType,
        'market' => $marketType,
        'price' => $mark,
        'change_pct' => 0,
        'updated_at' => time(),
        'source' => 'demo_live_fallback',
      ], ['mode' => 'display']);
    }
  }
} catch (Throwable $e) {
  json_response(['ok'=>false,'error'=>'Price unavailable. Please wait for the live quote to refresh and try again.'], 503);
}
if (!($mark > 0)) {
  json_response(['ok'=>false,'error'=>'Price unavailable. Please wait for the live quote to refresh and try again.','code'=>'price_unavailable'], 503);
}

$fill = $mark;
if ($orderType === 'LIMIT') {
  if ($limit <= 0) json_response(['ok'=>false,'error'=>'Limit price required'], 422);
  // Limit fills only when it crosses the executable side price.
  $canFill = ($side === 'BUY') ? ($limit >= $mark) : ($limit <= $mark);
  if (!$canFill) json_response(['ok'=>false,'error'=>'Limit not reached (demo rule)'], 409);
  $fill = $mark;
}

// Derive sizing.
// If client sends usdReq, we lock EXACTLY that USD value (no drift from UI price vs fill price).
// This fixes cases where user inputs e.g. 1000 but sees 998/1003 due to quote timing.
$notional = $qty * $fill;
$cost = $notional;
if ($usdReq > 0) {
  if ($marketType === 'perp') {
    $lev = max(1, (int)$leverage);
    $qty = ($usdReq * $lev) / $fill;
    $notional = $qty * $fill;
    $cost = $usdReq; // initial margin locked
    $usdAmount = $cost;
  } else {
    $qty = $usdReq / $fill;
    $notional = $usdReq;
    $cost = $usdReq;
  }
} else {
  if ($marketType === 'perp') {
    $cost = perp_calc_initial_margin($qty, $fill, $leverage);
    // Store usd_amount as the *margin used* (Bybit-style) so history is correct.
    $usdAmount = $cost;
  }
}

// Fees (demo realism)
$feeRate = trade_fee_rate($marketType, $orderType);
$fee = trade_calc_fee($notional, $feeRate);

// Feature flag: demo trading must be enabled. Real trading must not be blocked by demo flag.
if (!$isReal) {
  $flag = $pdo->prepare('SELECT enabled FROM feature_flags WHERE flag_key=?');
  $flag->execute(['demo_trading']);
  $demoEnabled = (int)($flag->fetchColumn() ?: 1);
  if ($demoEnabled !== 1) {
    json_response(['ok'=>false,'error'=>'Demo trading disabled'], 403);
  }
}

$demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
$realCur = (string)env('REAL_CURRENCY', 'USDT');
$cur = $isReal ? $realCur : $demoCur;

// Store Real symbols with a prefix so they don't mix with demo positions/orders.
$storeSymbol = $isReal ? ('@R@' . $symbol) : $symbol;

$pdo->beginTransaction();
try {
  // Lock wallet
  $w = ensure_wallet($uid, $cur);
  $wid = (int)($w['id'] ?? 0);
  if ($wid <= 0) throw new RuntimeException('Bad wallet');
  if (db_driver() === 'mysql') {
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$wid]);
  }
  $avail = wallet_available($uid, $cur);
  if ($avail['available'] + 1e-9 < ($cost + $fee)) {
    throw new RuntimeException($isReal ? 'Insufficient balance' : 'Insufficient demo balance');
  }
  // Debit margin/cost from ledger
  ledger_add($uid, $wid, $cur, -$cost, 'trade_open', 'order', null, [
    'symbol'=>$symbol,
    'market_type'=>$marketType,
    'side'=>$side,
    'qty'=>$qty,
    'price'=>$fill,
    'leverage'=>$leverage,
    'mode'=>$mode,
    'quote_snapshot'=>qs_meta($quoteSnapshot),
  ]);

  if ($fee > 0) {
    ledger_add($uid, $wid, $cur, -$fee, 'trade_fee', 'order', null, [
      'symbol'=>$symbol,
      'market_type'=>$marketType,
      'order_type'=>$orderType,
      'notional'=>$notional,
      'fee_rate'=>$feeRate,
      'fee'=>$fee,
      'mode'=>$mode,
    ]);
  }

  // positions:
  // - Default: each order creates its own position row (so opening a 2nd position won't auto-merge/"replace" the first).
  // - Optional: if TRADE_MERGE_POSITIONS=1, merge same (symbol+side+market_type).
  // Multiple Positions Mode (ON): always insert a NEW position (no merge).
  $liq = ($marketType === 'perp') ? perp_calc_liquidation_price($fill, $qty, $side, $leverage) : null;
  $ins = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,fees_paid,liquidation_price,tp_price,sl_price,opened_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $ts = now_ts();
  $ins->execute([$uid,$storeSymbol,$assetType,$marketType,$side,$qty,$fill,$leverage,$marginMode,$cost,$fee,$liq, ($tp>0?$tp:null), ($sl>0?$sl:null), $ts, $ts, 'open']);
  $positionId = (int)$pdo->lastInsertId();
  // Record order
  $orderMeta = json_encode([
    'source' => 'trade_open',
    'mode' => $mode,
    'quote_snapshot' => qs_meta($quoteSnapshot),
    'requested_limit_price' => $orderType === 'LIMIT' ? $limit : null,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,fee_paid,meta,status,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $o->execute([$uid,$storeSymbol,$assetType,$marketType,$side,$orderType,$qty,$orderType==='LIMIT'?$limit:null,$fill,($marketType==='perp'?($usdAmount ?? $notional):$notional),($tp>0?$tp:null),($sl>0?$sl:null),$leverage,0,null,$positionId,$fee,$orderMeta,'filled', now_ts()]);
  $orderId = (int)$pdo->lastInsertId();

  $pdo->commit();
  // Notify manager (REAL + DEMO)
  try {
    aff_notify_manager_for_user($uid, 'trade_open', [
      'id' => $orderId,
      'symbol' => $symbol,
      'side' => $side,
      'lev' => (int)$leverage,
      'mode' => $mode,
      'mkt' => $marketType,
    ]);
  } catch (Throwable $e2) {}

  json_response(['ok'=>true,'order_id'=>$orderId,'position_id'=>$positionId,'fill_price'=>$fill,'market_type'=>$marketType,'asset_type'=>$assetType,'mode'=>$mode]);
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 400);
}
