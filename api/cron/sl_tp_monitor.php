<?php
/**
 * SL/TP Monitor — runs as cron every 5-10 seconds.
 * Checks all open positions with tp_price or sl_price set,
 * fetches current price, and triggers automatic close when hit.
 *
 * Cron example: * * * * * php /var/www/api/cron/sl_tp_monitor.php >> /tmp/sltp.log 2>&1
 */
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/trade_close.php';
require_once __DIR__ . '/../lib/quotes.php';

// Single-instance guard: skip if another instance is still running
$lockDir = __DIR__ . '/../data/locks';
if (!is_dir($lockDir)) @mkdir($lockDir, 0775, true);
$lockFp = @fopen($lockDir . '/sl_tp_monitor.lock', 'c+');
if ($lockFp && !flock($lockFp, LOCK_EX | LOCK_NB)) {
  // Another instance is running
  if ($lockFp) @fclose($lockFp);
  exit(0);
}

$pdo = db();
$now = time();
$triggered = 0;
$checked = 0;

try {
  // Fetch all open positions that have at least one of tp_price / sl_price set
  $st = $pdo->query(
    "SELECT id, user_id, symbol, asset_type, market_type, side, qty, entry_price,
            tp_price, sl_price, leverage
     FROM positions
     WHERE (tp_price > 0 OR sl_price > 0)
     LIMIT 500"
  );
  $positions = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Throwable $e) {
  error_log('[sl_tp_monitor] DB fetch error: ' . $e->getMessage());
  if ($lockFp) { @flock($lockFp, LOCK_UN); @fclose($lockFp); }
  exit(1);
}

foreach ($positions as $pos) {
  $checked++;
  $posId   = (int)$pos['id'];
  $uid     = (int)$pos['user_id'];
  $symDb   = (string)$pos['symbol'];
  $symUi   = strtoupper(str_replace(['@R@','@D@'], '', $symDb));
  $assetType  = (string)($pos['asset_type'] ?? 'crypto');
  $marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
  $side       = strtoupper((string)$pos['side']);
  $entry      = (float)$pos['entry_price'];
  $tp         = (float)($pos['tp_price'] ?? 0);
  $sl         = (float)($pos['sl_price'] ?? 0);

  // Get current mark price from DB cache
  try {
    $q = quote_get($symUi, $assetType, $marketType);
    if (!is_array($q)) continue;
    $mark = ($marketType === 'perp')
      ? (float)($q['mark_price'] ?? $q['price'] ?? 0)
      : (float)($q['price'] ?? 0);
    if (!($mark > 0)) continue;
  } catch (Throwable $e) {
    continue;
  }

  $reason = null;

  if ($side === 'BUY') {
    if ($tp > 0 && $mark >= $tp) $reason = 'tp_triggered';
    elseif ($sl > 0 && $mark <= $sl) $reason = 'sl_triggered';
  } elseif ($side === 'SELL') {
    if ($tp > 0 && $mark <= $tp) $reason = 'tp_triggered';
    elseif ($sl > 0 && $mark >= $sl) $reason = 'sl_triggered';
  }

  if ($reason === null) continue;

  // Trigger close
  try {
    trade_close_position($pdo, $uid, $posId, [
      'qty'          => (float)$pos['qty'],
      'reason'       => $reason,
      'client_price' => $mark,
    ]);
    $triggered++;
    tp_log('trade', 'INFO', 'sl_tp_triggered', [
      'position_id' => $posId,
      'user_id'     => $uid,
      'symbol'      => $symUi,
      'side'        => $side,
      'reason'      => $reason,
      'mark'        => $mark,
      'tp'          => $tp,
      'sl'          => $sl,
    ]);
  } catch (TradeCloseException $e) {
    error_log("[sl_tp_monitor] close failed pos={$posId}: " . $e->getMessage());
  } catch (Throwable $e) {
    error_log("[sl_tp_monitor] unexpected error pos={$posId}: " . $e->getMessage());
  }
}

$summary = "[sl_tp_monitor] checked={$checked} triggered={$triggered} ts=" . date('Y-m-d H:i:s') . "\n";
echo $summary;
if ($triggered > 0) error_log($summary);

if ($lockFp) { @flock($lockFp, LOCK_UN); @fclose($lockFp); }
