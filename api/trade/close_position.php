<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/risk.php';
require_once __DIR__ . '/../lib/trade_mode.php';
require_once __DIR__ . '/../lib/affiliates.php';

require_method('POST');
$uid = require_auth();
require_trade_allowed($uid);

$pdo = db();

$body = read_json_body();

// Accept id from query OR JSON body (frontend can POST without ?id=)
// Frontend sends `position_id`; older callers use `id`. Accept all of them.
$id = (int)($_GET['id'] ?? $_GET['position_id'] ?? ($body['id'] ?? ($body['position_id'] ?? 0)));
if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid position id'], 422);

// demo/real (affects wallet currency). default demo for safety.
$mode = trade_mode_for_user($pdo, $uid, $body);

$stmt = $pdo->prepare('SELECT * FROM positions WHERE id=? AND user_id=?');
$stmt->execute([$id, $uid]);
$pos = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$pos) {
  // Idempotency: if position row was already removed, try to return the last closed order instead of hard-failing.
  $st = $pdo->prepare("SELECT pnl_usd, limit_price, fill_price, closed_at FROM orders WHERE user_id=? AND position_id=? AND status='closed' ORDER BY id DESC LIMIT 1");
  $st->execute([$uid, $id]);
  $o = $st->fetch(PDO::FETCH_ASSOC);
  if ($o) {
    $pnlUsd = (float)($o['pnl_usd'] ?? 0);
    $exitPx = (float)($o['limit_price'] ?? 0);
    $closedAt = (int)($o['closed_at'] ?? 0);
    json_response([
      'ok'=>true,
      'exit_price'=>$exitPx,
      'pnl_usd'=>$pnlUsd,
      'closed_qty'=>0,
      'remaining_qty'=>0,
      'order_id'=>null,
      'closed'=>[
        'position_id'=>$id,
        'close_price'=>$exitPx,
        'pnl_usd'=>$pnlUsd,
        'roe_pct'=>null,
        'remaining_qty'=>0,
        'order_id'=>null,
        'closed_at'=>$closedAt>0?$closedAt:null,
      ],
      'note'=>'already_closed'
    ]);
  }
  json_response(['ok'=>false,'error'=>'Position not found'], 404);
}

$symbolDb = (string)$pos['symbol'];
$symbol = $symbolDb;

// Determine mode from the stored symbol (safer than trusting client input).
$mode = str_starts_with($symbolDb, '@R@') ? 'real' : 'demo';

// Strip @R@/@D@ prefix for upstream price sources.
$symbolUi = (str_starts_with($symbolDb,'@R@') || str_starts_with($symbolDb,'@D@')) ? substr($symbolDb,3) : $symbolDb;
$assetType = (string)$pos['asset_type'];
$marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
$side = strtoupper((string)$pos['side']);
$qty = (float)$pos['qty'];
$entry = (float)$pos['entry_price'];
$leverage = (int)($pos['leverage'] ?? 1);
$marginInitial = (float)($pos['margin_initial'] ?? 0);
if ($qty <= 0) json_response(['ok'=>false,'error'=>'Invalid position'], 422);

$qtyClose = (float)($body['qty'] ?? 0);
if ($qtyClose <= 0) $qtyClose = $qty;
if ($qtyClose - 1e-12 > $qty) json_response(['ok'=>false,'error'=>'Close qty exceeds position'], 422);

try {
  // IMPORTANT: price source depends on market type (spot vs perp)
  $mark = quote_price($symbolUi, $marketType ?: 'spot', $assetType ?: 'crypto');
} catch (Throwable $e) {
  json_response(['ok'=>false,'error'=>'Price unavailable: '.$e->getMessage()], 502);
}

if (!($mark > 0)) json_response(['ok'=>false,'error'=>'Price unavailable'], 502);

$pnl = 0.0;
if ($side === 'BUY') {
  $pnl = ($mark - $entry) * $qtyClose;
} elseif ($side === 'SELL') {
  $pnl = ($entry - $mark) * $qtyClose;
} else {
  $side = 'BUY';
  $pnl = ($mark - $entry) * $qtyClose;
}

$ratio = $qty > 0 ? ($qtyClose / $qty) : 1.0;
$openCostTotal = ($marginInitial > 0) ? $marginInitial : ($qty * $entry);
$openCost = $openCostTotal * $ratio;
$exitNotional = $qtyClose * $mark;
$closeFeeRate = trade_fee_rate($marketType, 'MARKET');
$closeFee = trade_calc_fee($exitNotional, $closeFeeRate);
$maxLoss = -$openCost;
if ($pnl < $maxLoss) $pnl = $maxLoss;
$copySharePct = (float)($pos['copy_profit_share_pct'] ?? 0);
$copyCommission = ((int)($pos['copied_from_admin'] ?? 0) === 1 && $pnl > 0 && $copySharePct > 0) ? ($pnl * ($copySharePct / 100.0)) : 0.0;
if ($copyCommission > $pnl) $copyCommission = $pnl;
$credit = $openCost + $pnl - $copyCommission; // return margin/principal + pnl minus copy-trading share

// values for response (must be defined even on full-close)
$pnlUsd = 0.0;
$newQty = 0.0;
$orderId = null;
$roe = null;

$demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
$realCur = (string)env('REAL_CURRENCY', 'USDT');
$walletCur = ($mode === 'real') ? $realCur : $demoCur;

$pdo->beginTransaction();
try {
  $closedAt = now_ts();
  // Lock correct wallet (demo vs real)
  $w = ensure_wallet($uid, $walletCur);
  $wid = (int)($w['id'] ?? 0);
  if ($wid <= 0) throw new RuntimeException('Bad wallet');
  if (db_driver() === 'mysql') {
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$wid]);
  }

  ledger_add($uid, $wid, $walletCur, $credit, 'trade_close', 'position', (string)$id, [
    'symbol'=>$symbolUi,
    'asset_type'=>$assetType,
    'side'=>$side,
    'qty'=>$qtyClose,
    'entry'=>$entry,
    'exit'=>$mark,
    'pnl'=>$pnl,
  ]);

  if ($closeFee > 0) {
    ledger_add($uid, $wid, $walletCur, -$closeFee, 'trade_fee', 'position', (string)$id, [
      'symbol'=>$symbol,
      'market_type'=>$marketType,
      'order_type'=>'MARKET',
      'notional'=>$exitNotional,
      'fee_rate'=>$closeFeeRate,
      'fee'=>$closeFee,
    ]);
  }

  if ($copyCommission > 0) {
    $pdo->prepare('INSERT INTO trading_bot_commissions(user_id,subscription_id,signal_id,position_id,pnl_gross,share_pct,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([$uid, (int)($pos['copy_subscription_id'] ?? 0) ?: null, (int)($pos['source_signal_id'] ?? 0) ?: null, $id, $pnl, $copySharePct, $copyCommission, 'pending', $closedAt]);
  }

  // Update the ORIGINAL order instead of inserting a second "CLOSE" order.
  // This prevents duplicated rows in Deals/History (open + close).
  $pnlUsd = $pnl - $closeFee;
  $updO = $pdo->prepare("UPDATE orders
    SET status='closed',
        pnl_usd=?,
        close_reason='manual',
        closed_at=?,
        fee_paid=COALESCE(fee_paid,0)+?,
        -- Store exit price in limit_price for market orders (open market has NULL limit_price).
        limit_price=CASE WHEN limit_price IS NULL THEN ? ELSE limit_price END,
        updated_at=?
    WHERE user_id=? AND position_id=? AND side <> 'CLOSE'");
  $updO->execute([$pnlUsd, $closedAt, $closeFee, $mark, $closedAt, $uid, $id]);

  // Fallback for very old data (if no matching order was found): insert a closed order (non-CLOSE side).
  if ($updO->rowCount() === 0) {
    $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,pnl_usd,close_reason,closed_at,fee_paid,meta,updated_at,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $o->execute([$uid,$symbol,$assetType,$marketType,$side,'MARKET',$qtyClose,$mark,$entry,null,null,null,$leverage,1,null,$id,$pnlUsd,'manual',$closedAt,$closeFee,null,$closedAt,'closed',$closedAt]);
  }

  // Reduce or remove position (demo)
  if ($qtyClose + 1e-12 >= $qty) {
    $newQty = 0.0;
    $pdo->prepare('DELETE FROM positions WHERE id=? AND user_id=?')->execute([$id,$uid]);
  } else {
    $newQty = $qty - $qtyClose;
    $newMargin = ($marginInitial > 0) ? ($marginInitial - $openCost) : null;
    $liq = ($marketType === 'perp') ? perp_calc_liquidation_price($entry, $newQty, $side, $leverage) : null;
    $upd = $pdo->prepare('UPDATE positions SET qty=?, margin_initial=?, liquidation_price=?, updated_at=? WHERE id=? AND user_id=?');
    $upd->execute([$newQty, $newMargin, $liq, now_ts(), $id, $uid]);
  }

  $pdo->commit();
  // Notify manager (REAL + DEMO)
  try {
    aff_notify_manager_for_user($uid, 'trade_closed', [
      'id' => $id, // position id
      'symbol' => $symbolUi,
      'pnl' => number_format($pnlUsd, 2, '.', ''),
      'mode' => $mode,
      'mkt' => $marketType,
    ]);
  } catch (Throwable $e2) {}
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok'=>false,'error'=>$e->getMessage()], 500);
}

// Backward-compatible fields + structured `closed` object for frontend.
json_response([
  'ok'=>true,
  'exit_price'=>$mark,
  'pnl_usd'=>$pnlUsd,
  'closed_qty'=>$qtyClose,
  'remaining_qty'=>$newQty,
  'order_id'=>$orderId,
  'copy_commission_usd'=>$copyCommission,
  'closed'=>[
    'position_id'=>$id,
    'close_price'=>$mark,
    'pnl_usd'=>$pnlUsd,
    'roe_pct'=>$roe,
    'remaining_qty'=>$newQty,
    'order_id'=>$orderId,
  ],
]);