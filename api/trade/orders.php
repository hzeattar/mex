<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/trade_mode.php';

require_method('GET');
$uid = require_auth();
$pdo = db();

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$side   = strtoupper(trim((string)($_GET['side'] ?? '')));
$mode   = trade_mode_for_user($pdo, $uid);
$limit  = (int)($_GET['limit'] ?? 60);
$limit  = max(1, min(200, $limit));

function orders_optional_select(PDO $pdo, string $table, array $columns): string {
  $driver = function_exists('db_driver') ? db_driver() : '';
  $parts = [];
  foreach ($columns as $col => $default) {
    $name = is_int($col) ? (string)$default : (string)$col;
    $fallback = is_int($col) ? "''" : (string)$default;
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

function order_copy_meta(array $row): array {
  $raw = trim((string)($row['meta'] ?? ''));
  if ($raw === '') return ['source'=>'','copy_subscription_id'=>0,'source_signal_id'=>0,'copied_from_admin'=>0];
  $meta = json_decode($raw, true);
  if (!is_array($meta)) return ['source'=>'','copy_subscription_id'=>0,'source_signal_id'=>0,'copied_from_admin'=>0];
  $source = strtolower((string)($meta['source'] ?? ''));
  $copySub = (int)($meta['subscription_id'] ?? $meta['copy_subscription_id'] ?? 0);
  $signalId = (int)($meta['signal_id'] ?? $meta['source_signal_id'] ?? 0);
  $isCopy = $copySub > 0 || $source === 'trading_bot';
  return [
    'source' => $isCopy ? 'trading_bot' : $source,
    'copy_subscription_id' => $isCopy ? $copySub : 0,
    'source_signal_id' => $isCopy ? $signalId : 0,
    'copied_from_admin' => $isCopy ? 1 : 0,
  ];
}

// Demo vs Real is differentiated by prefixing the stored symbol:
//   demo: @D@BTCUSDT
//   real: @R@BTCUSDT
// Some legacy rows may have no prefix.
$wantMode   = ($mode === 'real') ? 'real' : 'demo';

$where  = 'user_id=?';
$params = [$uid];

// Symbol filtering: UI passes clean symbols (BTCUSDT) while DB stores prefixed symbols.
if ($symbol !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $symbol)) {
  $where .= ' AND (symbol=? OR symbol=? OR symbol=?)';
  $params[] = $symbol;
  $params[] = '@R@' . $symbol;
  $params[] = '@D@' . $symbol;
} else {
  // Mode filtering by prefix
  if ($wantMode === 'real') {
    $where .= " AND symbol LIKE '@R@%'";
  } else {
    // demo: include @D@ rows + legacy rows (no prefix)
    $where .= " AND (symbol LIKE '@D@%' OR (symbol NOT LIKE '@R@%' AND symbol NOT LIKE '@D@%'))";
  }
}

if ($side === 'BUY' || $side === 'SELL') {
  $where .= ' AND side=?';
  $params[] = $side;
}

// Pull raw rows (including CLOSE rows) then collapse to one row per position.
$orderMetaSel = orders_optional_select($pdo, 'orders', ['meta' => "''"]);
$sql = "SELECT id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,fee_paid,position_id,pnl_usd,close_reason,closed_at,status,created_at{$orderMetaSel}
        FROM orders
        WHERE $where
        ORDER BY id DESC
        LIMIT " . ($limit * 3);

$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$byPos = [];
foreach ($rows as $r) {
  $pid = (int)($r['position_id'] ?? 0);
  if ($pid <= 0) $pid = (int)($r['id'] ?? 0);
  if (!isset($byPos[$pid])) $byPos[$pid] = ['open'=>null,'close'=>null,'last'=>null];
  $byPos[$pid]['last'] = $byPos[$pid]['last'] ?? $r;

  $s   = strtoupper((string)($r['side'] ?? ''));
  $stt = strtolower((string)($r['status'] ?? ''));

  if ($s !== 'CLOSE' && !$byPos[$pid]['open']) {
    $byPos[$pid]['open'] = $r;
  }
  // Prefer explicit CLOSE rows, otherwise accept updated open rows (status=closed)
  if ($s === 'CLOSE') {
    $byPos[$pid]['close'] = $byPos[$pid]['close'] ?: $r; // rows are DESC
  } elseif ($stt === 'closed' && !$byPos[$pid]['close']) {
    $byPos[$pid]['close'] = $r;
  }
}

$items = [];
foreach ($byPos as $pid => $pack) {
  $open = $pack['open'] ?: $pack['last'];
  if (!$open) continue;
  $close = $pack['close'];

  $rawSymbol = (string)($open['symbol'] ?? '');
  $cleanSymbol = $rawSymbol;
  if (str_starts_with($cleanSymbol, '@R@') || str_starts_with($cleanSymbol, '@D@')) {
    $cleanSymbol = substr($cleanSymbol, 3);
  }

  $accountMode = str_starts_with($rawSymbol, '@R@') ? 'real' : 'demo';
  if ($accountMode !== $wantMode) continue;

  $entryPrice = (float)($open['fill_price'] ?? 0);
  $usdAmount  = (float)($open['usd_amount'] ?? 0);
  $marketType = strtolower((string)($open['market_type'] ?? 'spot'));
  $lev        = (int)($open['leverage'] ?? 1);

  // For PERP, usd_amount is already the locked initial margin in current place_order.php.
  // Older legacy rows may store notional, so fallback still divides qty*entry by leverage when usd_amount is missing.
  $usedUsdt = 0.0;
  if ($marketType === 'perp') {
    if ($usdAmount > 0) {
      $usedUsdt = $usdAmount;
    } else {
      $q = (float)($open['qty'] ?? 0);
      if ($q > 0 && $entryPrice > 0) $usedUsdt = ($q * $entryPrice) / max(1,$lev);
    }
  } else {
    if ($usdAmount > 0) {
      $usedUsdt = $usdAmount;
    } else {
      $q = (float)($open['qty'] ?? 0);
      if ($q > 0 && $entryPrice > 0) $usedUsdt = ($q * $entryPrice);
    }
  }

  $exitPrice = null;
  if ($close) {
    // In this project schema:
    // - fill_price is the ENTRY price
    // - limit_price is used to store the EXIT price for closed rows
    // So for CLOSE/closed rows we must prefer limit_price (exit) first.
    $ep = (float)($close['limit_price'] ?? 0);
    if (!$ep) $ep = (float)($close['fill_price'] ?? 0);
    if ($ep > 0) $exitPrice = $ep;
  }

  $pnl = 0.0;
  if ($close) {
    $pnl = (float)($close['pnl_usd'] ?? 0);
    if ($pnl == 0.0) $pnl = (float)($open['pnl_usd'] ?? 0);
  } else {
    $pnl = (float)($open['pnl_usd'] ?? 0);
  }

  $feeTotal = (float)($open['fee_paid'] ?? 0);
  if ($close) $feeTotal += (float)($close['fee_paid'] ?? 0);

  $stt = strtolower((string)(($close['status'] ?? null) ?: ($open['status'] ?? '')));
  $isClosed = ($stt === 'closed' || ($close && (int)($close['closed_at'] ?? 0) > 0));
  $rawStatus = strtolower(trim((string)($open['status'] ?? '')));
  $copyMeta = order_copy_meta($open);
  $rawPositionId = (int)($open['position_id'] ?? 0);
  $rawFillPrice = (float)($open['fill_price'] ?? 0);
  $isPending = !$isClosed
    && in_array($rawStatus, ['open', 'pending', 'armed', 'submitted', 'new'], true)
    && $rawPositionId <= 0
    && $rawFillPrice <= 0;
  $closedAt = null;
  if ($isClosed) {
    $ca = (int)(($close['closed_at'] ?? null) ?: ($open['closed_at'] ?? null) ?: 0);
    $closedAt = $ca > 0 ? $ca : null;
  }

  $items[] = [
    'order_id'         => (int)($open['id'] ?? 0),
    'position_id'      => (int)$pid,
    'account_mode'     => $accountMode,
    'mode'             => $accountMode,
    'symbol'           => $cleanSymbol,
    'symbol_raw'       => $rawSymbol,
    'asset_type'       => (string)($open['asset_type'] ?? ''),
    'market_type'      => $marketType,
    'side'             => (string)($open['side'] ?? ''),
    'order_type'       => (string)($open['order_type'] ?? ''),
    'qty'              => (float)($open['qty'] ?? 0),
    'leverage'         => $lev,
    'limit_price'      => (float)($open['limit_price'] ?? 0),
    'tp_price'         => (float)($open['tp_price'] ?? 0),
    'sl_price'         => (float)($open['sl_price'] ?? 0),
    // usd_amount is notional (qty*entry). For PERP, the "money you entered with" is margin (notional/leverage).
    'usd_amount'       => $usdAmount,
    'used_usdt'        => $usedUsdt,
    'entry_price'      => $entryPrice,
    'exit_price'       => $exitPrice,
    'pnl_usd'          => $pnl,
    'total_value_usd'  => ($usdAmount > 0 ? ($usdAmount + $pnl) : null),
    'final_value_usdt' => ($isClosed && $marketType === 'perp') ? ($usedUsdt + $pnl - $feeTotal) : null,
    'fee_paid'         => $feeTotal,
    'status'           => $isClosed ? 'closed' : ($isPending ? ($rawStatus !== '' ? $rawStatus : 'pending') : 'open'),
    'raw_status'       => $rawStatus,
    'is_pending'       => $isPending,
    'can_edit'         => $isPending,
    'can_cancel'       => $isPending,
    'created_at'       => (int)($open['created_at'] ?? 0),
    'closed_at'        => $closedAt,
    'close_reason'     => (string)(($close['close_reason'] ?? null) ?: ($open['close_reason'] ?? '')),
    'source'           => $copyMeta['source'],
    'copy_subscription_id' => $copyMeta['copy_subscription_id'],
    'source_signal_id' => $copyMeta['source_signal_id'],
    'copied_from_admin'=> $copyMeta['copied_from_admin'],
  ];
}

usort($items, function($a,$b){
  $ta = (int)($a['created_at'] ?? 0);
  $tb = (int)($b['created_at'] ?? 0);
  if ($ta === $tb) return (int)$b['position_id'] <=> (int)$a['position_id'];
  return $tb <=> $ta;
});

$items = array_slice($items, 0, $limit);

json_response(['ok'=>true,'items'=>$items]);
