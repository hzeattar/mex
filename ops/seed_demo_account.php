<?php
// Seed a fully activated demo account with trades, positions, deposits, KYC, etc.
chdir(dirname(__DIR__));
require_once __DIR__ . '/../api/lib/common.php';

$pdo = db();
$driver = strtolower($pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
$now = time();

// Account details
$email = 'trader@mixgroup.com';
$password = 'Trader@2026';
$hash = password_hash($password, PASSWORD_BCRYPT);
$displayName = 'Ahmed Al-Trader';

echo "=== Creating Demo Account: $email ===\n";

// 1. Create user
try {
    $pdo->prepare('DELETE FROM users WHERE email = ?')->execute([$email]);
} catch(Throwable $e) {}

$ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$ins->execute([$email, $hash, 'Ahmed', 'Al-Trader', $displayName, 'ar', 'active', 'web', $now - 86400*60, $now, $now]);
$userId = (int)$pdo->lastInsertId();
echo "User ID: $userId\n";

// 2. Create wallet with real balance
$pdo->prepare('DELETE FROM wallets WHERE user_id = ?')->execute([$userId]);
$insW = $pdo->prepare('INSERT INTO wallets(user_id,currency,balance_cache,available_cache,updated_at) VALUES (?,?,?,?,?)');
$insW->execute([$userId, 'USDT', 24750.50, 22350.75, $now]);
$walletId = (int)$pdo->lastInsertId();
echo "Wallet ID: $walletId (Balance: 24,750.50 USDT, Available: 22,350.75)\n";

// Demo wallet
$insW->execute([$userId, 'USDT_DEMO', 10000.00, 10000.00, $now]);

// 3. Create trading accounts
$pdo->prepare('DELETE FROM trading_accounts WHERE user_id = ?')->execute([$userId]);
$insTA = $pdo->prepare('INSERT INTO trading_accounts(user_id,account_no,mode,label,status,base_currency,is_primary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
$insTA->execute([$userId, 'LIVE-' . str_pad($userId, 6, '0', STR_PAD_LEFT), 'live', 'Real Account', 'active', 'USDT', 1, $now - 86400*55, $now]);
$insTA->execute([$userId, 'DEMO-' . str_pad($userId, 6, '0', STR_PAD_LEFT), 'demo', 'Demo Account', 'active', 'USDT', 0, $now - 86400*55, $now]);

// 4. KYC - Approved
$pdo->prepare('DELETE FROM kyc_requests WHERE user_id = ?')->execute([$userId]);
$insKYC = $pdo->prepare('INSERT INTO kyc_requests(user_id,status,full_name,country,doc_type,doc_number,front_path,back_path,selfie_path,admin_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
$insKYC->execute([$userId, 'approved', 'Ahmed Al-Trader', 'AE', 'passport', 'A12345678', '/kyc/'.$userId.'/front.jpg', '/kyc/'.$userId.'/back.jpg', '/kyc/'.$userId.'/selfie.jpg', 'Verified via admin', $now - 86400*50, $now - 86400*49]);
echo "KYC: Approved\n";

// 5. Deposits (history of real deposits)
$insDep = $pdo->prepare('INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,created_at,updated_at,confirmed_at) VALUES (?,?,?,?,?,?,?,?,?)');
$deposits = [
    ['stripe', 'card', 'USDT', 5000.00, 'confirmed', $now - 86400*55, $now - 86400*55, $now - 86400*55],
    ['crypto', 'usdt_trc20', 'USDT', 10000.00, 'confirmed', $now - 86400*40, $now - 86400*40, $now - 86400*40],
    ['crypto', 'usdt_trc20', 'USDT', 5000.00, 'confirmed', $now - 86400*25, $now - 86400*25, $now - 86400*25],
    ['stripe', 'card', 'USDT', 2500.00, 'confirmed', $now - 86400*10, $now - 86400*10, $now - 86400*10],
    ['bank', 'wire', 'USDT', 7500.00, 'confirmed', $now - 86400*3, $now - 86400*3, $now - 86400*3],
    ['crypto', 'usdt_trc20', 'USDT', 1000.00, 'pending', $now - 3600, $now - 3600, null],
];
foreach ($deposits as $d) {
    $insDep->execute([$userId, $d[0], $d[1], $d[2], $d[3], $d[4], $d[5], $d[6], $d[7]]);
}
echo "Deposits: " . count($deposits) . " entries\n";

// 6. Withdrawals
$insWith = $pdo->prepare('INSERT INTO withdrawals(user_id,method,currency,amount,status,destination_enc,risk_score,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
$withdrawals = [
    ['crypto', 'USDT', 2000.00, 'completed', base64_encode('TXrk...abc123'), 0, $now - 86400*30, $now - 86400*30, $now - 86400*29],
    ['crypto', 'USDT', 1500.00, 'completed', base64_encode('TXrk...def456'), 0, $now - 86400*15, $now - 86400*15, $now - 86400*14],
    ['bank', 'USDT', 1750.00, 'pending', base64_encode('IBAN:AE07...'), 1, $now - 7200, $now - 7200, null],
];
foreach ($withdrawals as $w) {
    $insWith->execute([$userId, $w[0], $w[1], $w[2], $w[3], $w[4], $w[5], $w[6], $w[7], $w[8]]);
}
echo "Withdrawals: " . count($withdrawals) . " entries\n";

// 7. Ledger entries (transaction history)
$insLedger = $pdo->prepare('INSERT INTO ledger_entries(user_id,wallet_id,currency,amount,type,ref_type,ref_id,created_at) VALUES (?,?,?,?,?,?,?,?)');
$ledgerEntries = [
    [$userId, $walletId, 'USDT', 5000.00, 'deposit', 'deposit', '1', $now - 86400*55],
    [$userId, $walletId, 'USDT', -2000.00, 'withdrawal', 'withdrawal', '1', $now - 86400*30],
    [$userId, $walletId, 'USDT', 10000.00, 'deposit', 'deposit', '2', $now - 86400*40],
    [$userId, $walletId, 'USDT', 1250.00, 'trade_pnl', 'position', '1', $now - 86400*35],
    [$userId, $walletId, 'USDT', -1500.00, 'withdrawal', 'withdrawal', '2', $now - 86400*15],
    [$userId, $walletId, 'USDT', 5000.00, 'deposit', 'deposit', '3', $now - 86400*25],
    [$userId, $walletId, 'USDT', -3000.00, 'trade_pnl', 'position', '5', $now - 86400*20],
    [$userId, $walletId, 'USDT', 890.50, 'trade_pnl', 'position', '8', $now - 86400*12],
    [$userId, $walletId, 'USDT', 2500.00, 'deposit', 'deposit', '4', $now - 86400*10],
    [$userId, $walletId, 'USDT', 7500.00, 'deposit', 'deposit', '5', $now - 86400*3],
    [$userId, $walletId, 'USDT', 1000.00, 'deposit', 'deposit', '6', $now - 3600],
    [$userId, $walletId, 'USDT', -1750.00, 'withdrawal', 'withdrawal', '3', $now - 7200],
    [$userId, $walletId, 'USDT', 460.00, 'trade_pnl', 'position', '10', $now - 86400*5],
    [$userId, $walletId, 'USDT', 200.00, 'invest_payout', 'investment', '1', $now - 86400*8],
];
foreach ($ledgerEntries as $l) {
    $insLedger->execute($l);
}
echo "Ledger entries: " . count($ledgerEntries) . "\n";

// 8. Closed positions (trade history)
$insPos = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,unrealized_pnl_usd,fees_paid,opened_at,updated_at,closed_at,status,pnl_usd,close_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$closedPositions = [
    ['BTCUSDT','crypto','spot','buy',0.05,68000.00,5,'isolated',680.00,1250.00,8.50,$now-86400*52,$now-86400*50,$now-86400*50,'closed',1250.00,'tp'],
    ['ETHUSDT','crypto','spot','sell',2.0,3200.00,3,'isolated',2133.33,-480.00,4.20,$now-86400*48,$now-86400*47,$now-86400*47,'closed',-480.00,'sl'],
    ['XAUUSD','commodities','spot','buy',1.0,2350.00,10,'isolated',235.00,1250.00,6.00,$now-86400*45,$now-86400*42,$now-86400*42,'closed',1250.00,'tp'],
    ['EURUSD','forex','spot','buy',10000.0,1.0850,20,'isolated',542.50,-300.00,12.00,$now-86400*38,$now-86400*37,$now-86400*37,'closed',-300.00,'manual'],
    ['SOLUSDT','crypto','spot','buy',50.0,145.00,5,'isolated',1450.00,890.50,3.50,$now-86400*35,$now-86400*33,$now-86400*33,'closed',890.50,'tp'],
    ['BNBUSDT','crypto','spot','sell',5.0,580.00,5,'isolated',580.00,325.00,2.80,$now-86400*28,$now-86400*26,$now-86400*26,'closed',325.00,'tp'],
    ['AAPL','stocks','spot','buy',10.0,185.00,1,'isolated',1850.00,-250.00,5.50,$now-86400*22,$now-86400*20,$now-86400*20,'closed',-250.00,'sl'],
    ['BTCUSDT','crypto','perp','buy',0.02,72000.00,10,'isolated',144.00,-3000.00,3.20,$now-86400*18,$now-86400*16,$now-86400*16,'closed',-3000.00,'liq'],
    ['ETHUSDT','crypto','spot','buy',3.0,3100.00,3,'isolated',3100.00,460.00,5.10,$now-86400*12,$now-86400*8,$now-86400*8,'closed',460.00,'tp'],
    ['DOGEUSDT','crypto','spot','buy',5000.0,0.1650,5,'isolated',1650.00,750.00,4.80,$now-86400*7,$now-86400*5,$now-86400*5,'closed',750.00,'tp'],
];
foreach ($closedPositions as $p) {
    $insPos->execute(array_merge([$userId], $p));
}
echo "Closed positions: " . count($closedPositions) . "\n";

// 9. Open positions
$insPosOpen = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,unrealized_pnl_usd,fees_paid,tp_price,sl_price,opened_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$openPositions = [
    ['BTCUSDT','crypto','spot','buy',0.08,104500.00,5,'isolated',1672.00,880.00,5.20,110000.00,100000.00,$now-86400*2,$now,'open'],
    ['ETHUSDT','crypto','perp','sell',5.0,2650.00,10,'isolated',1325.00,-420.00,3.80,2400.00,2800.00,$now-86400*1,$now,'open'],
    ['XAUUSD','commodities','spot','buy',2.0,3280.00,10,'isolated',656.00,340.00,4.00,3400.00,3200.00,$now-86400*3,$now,'open'],
    ['SOLUSDT','crypto','spot','buy',100.0,172.00,5,'isolated',3440.00,560.00,2.50,185.00,160.00,$now-3600*12,$now,'open'],
];
foreach ($openPositions as $p) {
    $insPosOpen->execute(array_merge([$userId], $p));
}
echo "Open positions: " . count($openPositions) . "\n";

// 10. Closed orders (history)
$insOrd = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,fill_price,usd_amount,leverage,pnl_usd,close_reason,closed_at,fee_paid,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$closedOrders = [
    ['BTCUSDT','crypto','spot','buy','market',0.05,68000.00,3400.00,5,1250.00,'tp',$now-86400*50,8.50,'filled',$now-86400*52],
    ['ETHUSDT','crypto','spot','sell','market',2.0,3200.00,6400.00,3,-480.00,'sl',$now-86400*47,4.20,'filled',$now-86400*48],
    ['XAUUSD','commodities','spot','buy','limit',1.0,2350.00,2350.00,10,1250.00,'tp',$now-86400*42,6.00,'filled',$now-86400*45],
    ['EURUSD','forex','spot','buy','market',10000.0,1.0850,10850.00,20,-300.00,'manual',$now-86400*37,12.00,'filled',$now-86400*38],
    ['SOLUSDT','crypto','spot','buy','market',50.0,145.00,7250.00,5,890.50,'tp',$now-86400*33,3.50,'filled',$now-86400*35],
];
foreach ($closedOrders as $o) {
    $insOrd->execute(array_merge([$userId], $o));
}
echo "Closed orders: " . count($closedOrders) . "\n";

// 11. Open orders (pending)
$insOrdOpen = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,leverage,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$openOrders = [
    ['BNBUSDT','crypto','spot','buy','limit',10.0,650.00,3,'pending',$now-3600*6],
    ['AAPL','stocks','spot','buy','limit',20.0,190.00,1,'pending',$now-3600*3],
];
foreach ($openOrders as $o) {
    $insOrdOpen->execute(array_merge([$userId], $o));
}
echo "Open orders: " . count($openOrders) . "\n";

// 12. Trading signals (copy trading subscriptions)
// First create a signal to subscribe to
$insSignal = $pdo->prepare('INSERT INTO trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,bot_enabled,bot_name_en,bot_name_ar,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$signals = [
    ['BTCUSDT','crypto','4h','buy',104000.00,100000.00,110000.00,115000.00,85,'analyst',1,'BTC Momentum Bot','روبوت زخم البيتكوين',500,7,15.0,5,1,'active',$now-86400*5,$now],
    ['ETHUSDT','crypto','1h','sell',2680.00,2800.00,2450.00,2350.00,72,'analyst',1,'ETH Scalper Pro','سكالبير الإيثيريوم',300,5,10.0,3,1,'active',$now-86400*3,$now],
    ['XAUUSD','commodities','1d','buy',3250.00,3150.00,3400.00,3500.00,90,'analyst',1,'Gold Trend Master','ماستر ترند الذهب',1000,14,20.0,10,1,'active',$now-86400*1,$now],
];
$signalIds = [];
foreach ($signals as $s) {
    $insSignal->execute($s);
    $signalIds[] = (int)$pdo->lastInsertId();
}
echo "Trading signals: " . count($signals) . " (IDs: " . implode(',', $signalIds) . ")\n";

// 13. Copy trading subscriptions
if (count($signalIds) >= 2) {
    $insSub = $pdo->prepare('INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,lock_until,profit_share_pct,leverage,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $insSub->execute([$userId, $signalIds[0], 'real', 'USDT', 1500.00, $now + 86400*5, 15.0, 5, 'active', $now - 86400*4, $now]);
    $insSub->execute([$userId, $signalIds[1], 'real', 'USDT', 800.00, $now + 86400*3, 10.0, 3, 'active', $now - 86400*2, $now]);
    echo "Copy subscriptions: 2\n";
}

// 14. Investments (subscribed to plans)
$insInv = $pdo->prepare('INSERT INTO investments(user_id,plan_id,amount,expected_return,payout_schedule,status,start_at,end_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
$investments = [
    ['starter_14', 1000.00, 1060.00, 'end', 'completed', $now - 86400*30, $now - 86400*16, $now - 86400*30],
    ['starter_14', 2500.00, 2650.00, 'end', 'active', $now - 86400*7, $now + 86400*7, $now - 86400*7],
];
foreach ($investments as $i) {
    $insInv->execute(array_merge([$userId], $i));
}
echo "Investments: " . count($investments) . "\n";

// 15. Holds (margin for open positions)
$insHold = $pdo->prepare('INSERT INTO holds(user_id,wallet_id,currency,amount,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)');
$insHold->execute([$userId, $walletId, 'USDT', 2399.75, 'position_margin', 'active', $now - 86400*2, $now]);
echo "Holds: 1\n";

// Done
echo "\n=== ACCOUNT CREATED SUCCESSFULLY ===\n";
echo "Email: $email\n";
echo "Password: $password\n";
echo "User ID: $userId\n";
echo "Balance: 24,750.50 USDT\n";
echo "Available: 22,350.75 USDT\n";
echo "KYC: Approved\n";
echo "Closed positions: " . count($closedPositions) . "\n";
echo "Open positions: " . count($openPositions) . "\n";
echo "Copy subscriptions: 2\n";
echo "Investments: 2\n";