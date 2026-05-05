<?php
/**
 * Risk tick for DEMO perps only (liquidation + TP/SL auto-close).
 * Run via cron every 5-15 seconds if desired.
 *
 * IMPORTANT:
 * - REAL positions (symbol prefixed with @R@) are NOT auto-closed here.
 *   This prevents accidental closures on refresh / wrong-wallet credits.
 *
 * Usage: /api/cron/risk_tick.php?token=CRON_KEY
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';

// Single-instance lock (prevents overlapping runs)
$locksDir = __DIR__ . '/../data/locks';
if (!is_dir($locksDir)) @mkdir($locksDir, 0775, true);
$lockFp = @fopen($locksDir . '/risk_tick.lock', 'c+');
if ($lockFp) {
  if (!flock($lockFp, LOCK_EX | LOCK_NB)) {
    exit;
  }
}

require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/risk.php';
require_once __DIR__ . '/../lib/trading_bot_engine.php';

function cron_input_token_rt(): string {
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

$token = cron_input_token_rt();
if ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token)) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

$pdo = db();
$now = time();
$demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');

$armedOpened = 0;
try {
  $armedStmt = $pdo->prepare("SELECT sbs.*, ts.* FROM trading_bot_subscriptions sbs JOIN trading_signals ts ON ts.id=sbs.signal_id WHERE sbs.status IN ('active','armed') AND COALESCE(sbs.copied_position_id,0)=0 AND ts.status='active' ORDER BY sbs.id ASC LIMIT 100");
  $armedStmt->execute();
  foreach (($armedStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) as $sub) {
    $uid2 = (int)($sub['user_id'] ?? 0);
    if ($uid2 <= 0) continue;
    try {
      $live = tb_quote_signal_live($sub, $sub);
      if ((float)($sub['entry_price'] ?? 0) > 0 && !tb_signal_entry_ready($sub, $live)) continue;
      $pdo->beginTransaction();
      tb_open_subscription($pdo, $uid2, $sub, $sub);
      $pdo->commit();
      $armedOpened++;
    } catch (Throwable $armedErr) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      continue;
    }
  }
} catch (Throwable $e) {}

$rows = $pdo->query("SELECT * FROM positions WHERE status='open' AND market_type='perp' AND symbol NOT LIKE '@R@%'")
  ->fetchAll(PDO::FETCH_ASSOC) ?: [];

$liquidated = 0;
$tpClosed = 0;
$slClosed = 0;
$skippedNoPrice = 0;

foreach ($rows as $pos) {
  $id = (int)($pos['id'] ?? 0);
  $uid = (int)($pos['user_id'] ?? 0);
  if ($id <= 0 || $uid <= 0) continue;

  $symbol = strtoupper((string)($pos['symbol'] ?? ''));
  $assetType = strtolower((string)($pos['asset_type'] ?? 'crypto'));
  $side = strtoupper((string)($pos['side'] ?? 'BUY'));
  $qty = (float)($pos['qty'] ?? 0);
  $entry = (float)($pos['entry_price'] ?? 0);
  $leverage = (int)($pos['leverage'] ?? 1);
  $marginInitial = (float)($pos['margin_initial'] ?? 0);

  if ($symbol === '' || $qty <= 0 || $entry <= 0 || $marginInitial <= 0) continue;

  // Mark price (never liquidate on missing price)
  $mark = 0.0;
  try {
    $q = quote_get($symbol, $assetType);
    $mp = $q ? (float)($q['mark_price'] ?? 0) : 0.0;
    $mark = ($mp > 0) ? $mp : (float)quote_price($symbol, 'perp', $assetType);
  } catch (Throwable $e) {
    $mark = 0.0;
  }
  if ($mark <= 0) { $skippedNoPrice++; continue; }

  $liq = (float)($pos['liquidation_price'] ?? 0);
  if ($liq <= 0) {
    $calc = perp_calc_liquidation_price($entry, $qty, $side, $leverage);
    $liq = $calc ? (float)$calc : 0.0;
  }

  $tp = (float)($pos['tp_price'] ?? 0.0);
  $sl = (float)($pos['sl_price'] ?? 0.0);

  $hitLiq = false;
  if ($liq > 0) $hitLiq = ($side === 'BUY') ? ($mark <= $liq) : ($mark >= $liq);
  $hitTP = ($tp > 0) ? (($side === 'BUY') ? ($mark >= $tp) : ($mark <= $tp)) : false;
  $hitSL = ($sl > 0) ? (($side === 'BUY') ? ($mark <= $sl) : ($mark >= $sl)) : false;

  $reason = null;
  if ($hitLiq) $reason = 'liquidation';
  elseif ($hitTP) $reason = 'take_profit';
  elseif ($hitSL) $reason = 'stop_loss';
  if (!$reason) continue;

  $pnl = perp_calc_pnl($entry, $mark, $qty, $side);

  // Isolated: loss cannot exceed initial margin
  $maxLoss = -abs($marginInitial);
  if ($pnl < $maxLoss) $pnl = $maxLoss;

  $copySharePct = (float)($pos['copy_profit_share_pct'] ?? 0);
  $copyCommission = ((int)($pos['copied_from_admin'] ?? 0) === 1 && $pnl > 0 && $copySharePct > 0) ? ($pnl * ($copySharePct / 100.0)) : 0.0;
  if ($copyCommission > $pnl) $copyCommission = $pnl;
  $credit = $marginInitial + $pnl - $copyCommission;
  if ($credit < 0) $credit = 0.0;

  $closedAt = now_ts();

  $pdo->beginTransaction();
  try {
    $w = ensure_wallet($uid, $demoCur);
    $wid = (int)($w['id'] ?? 0);
    if ($wid <= 0) { throw new RuntimeException('Bad wallet'); }
    if (db_driver() === 'mysql') {
      $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$wid]);
    }

    if ($credit > 0) {
      ledger_add($uid, $wid, $demoCur, $credit, 'trade_close', 'position', (string)$id, [
        'reason'=>$reason,
        'symbol'=>$symbol,
        'asset_type'=>$assetType,
        'side'=>$side,
        'qty'=>$qty,
        'entry'=>$entry,
        'exit'=>$mark,
        'pnl'=>$pnl,
        'margin_initial'=>$marginInitial,
        'leverage'=>$leverage,
      ]);
    }

    if ($copyCommission > 0) {
      $pdo->prepare('INSERT INTO trading_bot_commissions(user_id,subscription_id,signal_id,position_id,pnl_gross,share_pct,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
          ->execute([$uid, (int)($pos['copy_subscription_id'] ?? 0) ?: null, (int)($pos['source_signal_id'] ?? 0) ?: null, $id, $pnl, $copySharePct, $copyCommission, 'pending', $closedAt]);
    }

    // Update open order if present
    $st = $pdo->prepare("SELECT id FROM orders WHERE position_id=? AND status='filled' ORDER BY id DESC LIMIT 1");
    $st->execute([$id]);
    $openOrderId = (int)($st->fetchColumn() ?: 0);

    if ($openOrderId > 0) {
      $pdo->prepare("UPDATE orders SET status='closed', close_reason=?, pnl_usd=?, limit_price=?, closed_at=?, updated_at=? WHERE id=?")
          ->execute([$reason, $pnl, $mark, $closedAt, $closedAt, $openOrderId]);
    } else {
      // Fallback close row
      $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,pnl_usd,close_reason,closed_at,fee_paid,meta,updated_at,status,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      $o->execute([
        $uid,$symbol,$assetType,'perp','CLOSE','MARKET',$qty,$mark,$mark,null,null,null,$leverage,1,null,$id,$pnl,$reason,$closedAt,0,null,$closedAt,'closed',$closedAt
      ]);
    }

    $pdo->prepare('DELETE FROM positions WHERE id=?')->execute([$id]);

    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    continue;
  }

  if ($reason === 'liquidation') $liquidated++;
  elseif ($reason === 'take_profit') $tpClosed++;
  else $slClosed++;
}

$payload = [
  'ok'=>true,
  'ts'=>$now,
  'checked'=>count($rows),
  'liquidated'=>$liquidated,
  'tp_closed'=>$tpClosed,
  'sl_closed'=>$slClosed,
  'skipped_no_price'=>$skippedNoPrice,
  'armed_opened'=>$armedOpened,
];
try { tp_status_write('risk_tick', $payload); } catch (Throwable $e) {}
try { tp_log('cron','INFO','risk_tick', $payload); } catch (Throwable $e) {}
json_response($payload);
