<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/ledger.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/risk.php';

function tb_signal_market_type(array $signal, array $sub): string {
  $lev = max(1, (int)($sub['leverage'] ?? $signal['copy_leverage'] ?? 1));
  return $lev > 1 ? 'perp' : 'spot';
}

function tb_signal_entry_ready(array $signal, float $livePrice): bool {
  $entry = (float)($signal['entry_price'] ?? 0);
  if (!($entry > 0) || !($livePrice > 0)) return true;
  $side = strtoupper((string)($signal['direction'] ?? 'BUY'));
  if ($side === 'SELL') return $livePrice >= $entry;
  return $livePrice <= $entry;
}

function tb_quote_signal_live(array $signal, array $sub): float {
  $symbol = strtoupper(trim((string)($signal['market_symbol'] ?? '')));
  if ($symbol === '') return 0.0;
  $assetType = strtolower((string)($signal['market_type'] ?? 'crypto'));
  return (float)quote_price($symbol, tb_signal_market_type($signal, $sub), $assetType);
}

function tb_open_subscription(PDO $pdo, int $uid, array $signal, array $sub): array {
  if (in_array((string)($sub['status'] ?? ''), ['copied'], true) && (int)($sub['copied_position_id'] ?? 0) > 0) {
    throw new RuntimeException('This signal has already been copied for the selected wallet');
  }

  $assetType = strtolower((string)($signal['market_type'] ?? 'crypto'));
  $marketType = tb_signal_market_type($signal, $sub);
  $side = strtoupper((string)($signal['direction'] ?? 'BUY'));
  if (!in_array($side, ['BUY','SELL'], true)) $side = 'BUY';
  $symbol = strtoupper(trim((string)($signal['market_symbol'] ?? '')));
  if ($symbol === '') throw new RuntimeException('Signal market missing');

  $live = tb_quote_signal_live($signal, $sub);
  if (!($live > 0)) throw new RuntimeException('Price unavailable');
  $fill = (float)($signal['entry_price'] ?? 0);
  if (!($fill > 0)) $fill = $live;

  $usdReq = (float)($sub['reserved_amount'] ?? 0);
  $leverage = max(1, (int)($sub['leverage'] ?? $signal['copy_leverage'] ?? 1));
  $qty = 0.0;
  $cost = $usdReq;
  $notional = 0.0;
  if ($marketType === 'perp') {
    $qty = ($usdReq * $leverage) / $fill;
    $notional = $qty * $fill;
    $cost = $usdReq;
  } else {
    $qty = $usdReq / $fill;
    $notional = $usdReq;
    $leverage = 1;
  }
  if (!($qty > 0) || !($cost > 0)) throw new RuntimeException('Copy amount is invalid');

  $feeRate = trade_fee_rate($marketType, 'MARKET');
  $fee = trade_calc_fee($notional, $feeRate);
  $mode = strtolower((string)($sub['mode'] ?? 'real')) === 'demo' ? 'demo' : 'real';
  $currency = (string)($sub['currency'] ?? ($mode === 'demo' ? env('DEMO_CURRENCY', 'USDT_DEMO') : env('REAL_CURRENCY', 'USDT')));
  $isReal = $mode === 'real';
  $storeSymbol = $isReal ? ('@R@' . $symbol) : $symbol;
  $tp = (float)($signal['take_profit_1'] ?? 0);
  $sl = (float)($signal['stop_loss'] ?? 0);
  $liq = ($marketType === 'perp') ? perp_calc_liquidation_price($fill, $qty, $side, $leverage) : null;
  $copyShare = (float)($sub['profit_share_pct'] ?? $signal['copy_profit_share_pct'] ?? 0);
  $holdId = (int)($sub['hold_id'] ?? 0);

  $w = ensure_wallet($uid, $currency);
  $wid = (int)($w['id'] ?? 0);
  if ($wid <= 0) throw new RuntimeException('Bad wallet');
  if (db_driver() === 'mysql') {
    $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$wid]);
  }
  if ($holdId > 0) {
    $pdo->prepare("UPDATE holds SET status='released', updated_at=? WHERE id=? AND user_id=? AND status='active'")->execute([time(), $holdId, $uid]);
  }
  $avail = wallet_available($uid, $currency);
  if (($avail['available'] ?? 0) + 1e-9 < ($cost + $fee)) {
    throw new RuntimeException($isReal ? 'Insufficient balance' : 'Insufficient demo balance');
  }

  ledger_add($uid, $currency, -$cost, 'trade_open', 'trading_signal', (string)($signal['id'] ?? 0), [
    'symbol' => $symbol,
    'market_type' => $marketType,
    'side' => $side,
    'qty' => $qty,
    'price' => $fill,
    'leverage' => $leverage,
    'mode' => $mode,
    'source' => 'trading_bot',
  ]);
  if ($fee > 0) {
    ledger_add($uid, $currency, -$fee, 'trade_fee', 'trading_signal', (string)($signal['id'] ?? 0), [
      'symbol' => $symbol,
      'market_type' => $marketType,
      'order_type' => 'MARKET',
      'notional' => $notional,
      'fee_rate' => $feeRate,
      'fee' => $fee,
      'mode' => $mode,
      'source' => 'trading_bot',
    ]);
  }

  $ts = time();
  $ins = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,fees_paid,liquidation_price,tp_price,sl_price,source_signal_id,copy_subscription_id,copy_profit_share_pct,copied_from_admin,opened_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $ins->execute([$uid,$storeSymbol,$assetType,$marketType,$side,$qty,$fill,$leverage,'isolated',$cost,$fee,$liq,($tp>0?$tp:null),($sl>0?$sl:null),(int)($signal['id'] ?? 0),(int)$sub['id'],$copyShare,1,$ts,$ts,'open']);
  $positionId = (int)$pdo->lastInsertId();

  $meta = json_encode(['source'=>'trading_bot','signal_id'=>(int)($signal['id'] ?? 0),'subscription_id'=>(int)$sub['id']], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,fee_paid,meta,status,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $o->execute([$uid,$storeSymbol,$assetType,$marketType,$side,'MARKET',$qty,null,$fill,$cost,($tp>0?$tp:null),($sl>0?$sl:null),$leverage,0,null,$positionId,$fee,$meta,'filled',$ts]);
  $orderId = (int)$pdo->lastInsertId();

  $pdo->prepare("UPDATE trading_bot_subscriptions SET status='copied', copied_position_id=?, updated_at=?, hold_id=NULL, entry_price_snapshot=? WHERE id=? AND user_id=?")
      ->execute([$positionId, $ts, $fill, (int)$sub['id'], $uid]);

  return ['order_id'=>$orderId,'position_id'=>$positionId,'fill_price'=>$fill,'live_price'=>$live];
}
