<?php
/**
 * Risk tick for open trading positions (liquidation + TP/SL auto-close).
 * Run via cron every 5-15 seconds if desired.
 *
 * REAL positions are closed only when QuoteSnapshot marks the price executable.
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
require_once __DIR__ . '/../lib/trade_close.php';

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

$armedOpened = 0;
try {
  $armedStmt = $pdo->prepare("SELECT
      sbs.id AS sbs_id, sbs.user_id AS sbs_user_id, sbs.mode AS sbs_mode, sbs.currency AS sbs_currency,
      sbs.reserved_amount AS sbs_reserved_amount, sbs.hold_id AS sbs_hold_id, sbs.lock_until AS sbs_lock_until,
      sbs.profit_share_pct AS sbs_profit_share_pct, sbs.leverage AS sbs_leverage, sbs.status AS sbs_status,
      sbs.copied_position_id AS sbs_copied_position_id, sbs.entry_price_snapshot AS sbs_entry_price_snapshot,
      ts.*
    FROM trading_bot_subscriptions sbs
    JOIN trading_signals ts ON ts.id=sbs.signal_id
    WHERE sbs.status IN ('active','armed') AND COALESCE(sbs.copied_position_id,0)=0 AND ts.status='active'
    ORDER BY sbs.id ASC LIMIT 100");
  $armedStmt->execute();
  foreach (($armedStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $uid2 = (int)($row['sbs_user_id'] ?? 0);
    if ($uid2 <= 0) continue;
    $signal = $row;
    $sub = $row;
    $sub['id'] = (int)($row['sbs_id'] ?? 0);
    $sub['user_id'] = $uid2;
    $sub['mode'] = (string)($row['sbs_mode'] ?? 'real');
    $sub['currency'] = (string)($row['sbs_currency'] ?? 'USDT');
    $sub['reserved_amount'] = (float)($row['sbs_reserved_amount'] ?? 0);
    $sub['hold_id'] = (int)($row['sbs_hold_id'] ?? 0);
    $sub['lock_until'] = $row['sbs_lock_until'] ?? null;
    $sub['profit_share_pct'] = (float)($row['sbs_profit_share_pct'] ?? 0);
    $sub['leverage'] = max(1, (int)($row['sbs_leverage'] ?? 1));
    $sub['status'] = (string)($row['sbs_status'] ?? 'active');
    $sub['copied_position_id'] = (int)($row['sbs_copied_position_id'] ?? 0);
    $sub['entry_price_snapshot'] = $row['sbs_entry_price_snapshot'] ?? null;
    try {
      $live = tb_quote_signal_live($signal, $sub);
      if ((float)($signal['entry_price'] ?? 0) > 0 && !tb_signal_entry_ready($signal, $live)) continue;
      $pdo->beginTransaction();
      tb_open_subscription($pdo, $uid2, $signal, $sub);
      $pdo->commit();
      $armedOpened++;
    } catch (Throwable $armedErr) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      continue;
    }
  }
} catch (Throwable $e) {}

$rows = $pdo->query("SELECT * FROM positions
  WHERE status='open'
    AND (
      COALESCE(tp_price,0) > 0
      OR COALESCE(sl_price,0) > 0
      OR (market_type='perp' AND COALESCE(liquidation_price,0) > 0)
    )
  ORDER BY id ASC
  LIMIT 500")
  ->fetchAll(PDO::FETCH_ASSOC) ?: [];

$liquidated = 0;
$tpClosed = 0;
$slClosed = 0;
$skippedNoPrice = 0;
$skippedRealNotExecutable = 0;
$closeFailed = 0;

foreach ($rows as $pos) {
  $id = (int)($pos['id'] ?? 0);
  $uid = (int)($pos['user_id'] ?? 0);
  if ($id <= 0 || $uid <= 0) continue;

  $symbolDb = (string)($pos['symbol'] ?? '');
  $symbol = strtoupper(trade_close_strip_symbol_prefix($symbolDb));
  $assetType = strtolower((string)($pos['asset_type'] ?? 'crypto'));
  $marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
  if (!in_array($marketType, ['spot', 'perp'], true)) $marketType = 'spot';
  $mode = str_starts_with($symbolDb, '@R@') ? 'real' : 'demo';
  $side = strtoupper((string)($pos['side'] ?? 'BUY'));
  $qty = (float)($pos['qty'] ?? 0);
  $entry = (float)($pos['entry_price'] ?? 0);
  $leverage = (int)($pos['leverage'] ?? 1);

  if ($symbol === '' || $qty <= 0 || $entry <= 0) continue;

  try {
    $priceInfo = trade_close_resolve_price($symbol, $assetType, $marketType, $mode, $side);
    $mark = (float)($priceInfo['price'] ?? 0);
  } catch (TradeCloseException $e) {
    $skippedNoPrice++;
    if ($mode === 'real' && $e->publicCode === 'price_not_executable') $skippedRealNotExecutable++;
    continue;
  } catch (Throwable $e) {
    $skippedNoPrice++;
    continue;
  }
  if ($mark <= 0) { $skippedNoPrice++; continue; }

  $liq = (float)($pos['liquidation_price'] ?? 0);
  if ($marketType === 'perp' && $liq <= 0) {
    $calc = perp_calc_liquidation_price($entry, $qty, $side, $leverage);
    $liq = $calc ? (float)$calc : 0.0;
  }

  $tp = (float)($pos['tp_price'] ?? 0.0);
  $sl = (float)($pos['sl_price'] ?? 0.0);

  $hitLiq = false;
  if ($marketType === 'perp' && $liq > 0) $hitLiq = ($side === 'BUY') ? ($mark <= $liq) : ($mark >= $liq);
  $hitTP = ($tp > 0) ? (($side === 'BUY') ? ($mark >= $tp) : ($mark <= $tp)) : false;
  $hitSL = ($sl > 0) ? (($side === 'BUY') ? ($mark <= $sl) : ($mark >= $sl)) : false;

  $reason = null;
  if ($hitLiq) $reason = 'liquidation';
  elseif ($hitTP) $reason = 'take_profit';
  elseif ($hitSL) $reason = 'stop_loss';
  if (!$reason) continue;

  try {
    trade_close_position($pdo, $uid, $id, ['reason' => $reason]);
  } catch (Throwable $e) {
    $closeFailed++;
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
  'skipped_real_not_executable'=>$skippedRealNotExecutable,
  'close_failed'=>$closeFailed,
  'armed_opened'=>$armedOpened,
];
try { tp_status_write('risk_tick', $payload); } catch (Throwable $e) {}
try { tp_log('cron','INFO','risk_tick', $payload); } catch (Throwable $e) {}
json_response($payload);
