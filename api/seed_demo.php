<?php
chdir(dirname(__DIR__, 2));
require_once __DIR__ . '/../api/lib/common.php';
header('Content-Type: application/json; charset=utf-8');
$pdo = db();
$now = time();
$email = 'trader@mixgroup.com';
$password = 'Trader@2026';
$hash = password_hash($password, PASSWORD_BCRYPT);

$tables = ['ledger_entries','holds','deposits','withdrawals','orders','positions','kyc_requests','wallets','trading_accounts','trading_bot_subscriptions','investments','web_sessions','api_tokens'];
try { $ou = $pdo->prepare('SELECT id FROM users WHERE email=?'); $ou->execute([$email]); $oid = (int)$ou->fetchColumn(); } catch(Throwable $e) { $oid = 0; }
if ($oid > 0) { foreach ($tables as $t) { try { $pdo->prepare("DELETE FROM $t WHERE user_id=?")->execute([$oid]); } catch(Throwable $e) {} } try { $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$oid]); } catch(Throwable $e) {} }

$ins = $pdo->prepare('INSERT INTO users(email,password_hash,first_name,last_name,display_name,locale,account_status,login_provider,created_at,updated_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$ins->execute([$email, $hash, 'Ahmed', 'Al-Trader', 'Ahmed Al-Trader', 'ar', 'active', 'web', $now-86400*60, $now, $now]);
$userId = (int)$pdo->lastInsertId();

$insW = $pdo->prepare('INSERT INTO wallets(user_id,currency,balance_cache,available_cache,updated_at) VALUES (?,?,?,?,?)');
$insW->execute([$userId, 'USDT', 24750.50, 22350.75, $now]);
$walletId = (int)$pdo->lastInsertId();
$insW->execute([$userId, 'USDT_DEMO', 10000.00, 10000.00, $now]);

$insTA = $pdo->prepare('INSERT INTO trading_accounts(user_id,account_no,mode,label,status,base_currency,is_primary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
$insTA->execute([$userId, 'LIVE-'.str_pad((string)$userId,6,'0',STR_PAD_LEFT), 'live', 'Real Account', 'active', 'USDT', 1, $now-86400*55, $now]);
$insTA->execute([$userId, 'DEMO-'.str_pad((string)$userId,6,'0',STR_PAD_LEFT), 'demo', 'Demo Account', 'active', 'USDT', 0, $now-86400*55, $now]);

$insKYC = $pdo->prepare('INSERT INTO kyc_requests(user_id,status,full_name,country,doc_type,doc_number,front_path,back_path,selfie_path,admin_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
$insKYC->execute([$userId, 'approved', 'Ahmed Al-Trader', 'AE', 'passport', 'A12345678', '/kyc/'.$userId.'/front.jpg', '/kyc/'.$userId.'/back.jpg', '/kyc/'.$userId.'/selfie.jpg', 'Verified via admin', $now-86400*50, $now-86400*49]);

$insDep = $pdo->prepare('INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,created_at,updated_at,confirmed_at) VALUES (?,?,?,?,?,?,?,?,?)');
$deps = [
  ['stripe','card','USDT',5000.00,'confirmed',$now-86400*55,$now-86400*55,$now-86400*55],
  ['crypto','usdt_trc20','USDT',10000.00,'confirmed',$now-86400*40,$now-86400*40,$now-86400*40],
  ['crypto','usdt_trc20','USDT',5000.00,'confirmed',$now-86400*25,$now-86400*25,$now-86400*25],
  ['stripe','card','USDT',2500.00,'confirmed',$now-86400*10,$now-86400*10,$now-86400*10],
  ['bank','wire','USDT',7500.00,'confirmed',$now-86400*3,$now-86400*3,$now-86400*3],
  ['crypto','usdt_trc20','USDT',1000.00,'pending',$now-3600,$now-3600,null],
];
foreach ($deps as $d) { $insDep->execute([$userId,$d[0],$d[1],$d[2],$d[3],$d[4],$d[5],$d[6],$d[7]]); }

$insWd = $pdo->prepare('INSERT INTO withdrawals(user_id,method,currency,amount,status,destination_enc,risk_score,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
$wds = [
  ['crypto','USDT',2000.00,'completed',base64_encode('TXrkABC123'),0,$now-86400*30,$now-86400*30,$now-86400*29],
  ['crypto','USDT',1500.00,'completed',base64_encode('TXrkDEF456'),0,$now-86400*15,$now-86400*15,$now-86400*14],
  ['bank','USDT',1750.00,'pending',base64_encode('IBAN:AE07...'),1,$now-7200,$now-7200,null],
];
foreach ($wds as $w) { $insWd->execute([$userId,$w[0],$w[1],$w[2],$w[3],$w[4],$w[5],$w[6],$w[7],$w[8]]); }

$insL = $pdo->prepare('INSERT INTO ledger_entries(user_id,wallet_id,currency,amount,type,ref_type,ref_id,created_at) VALUES (?,?,?,?,?,?,?,?)');
$ledgers = [
  [5000.00,'deposit','deposit','1',$now-86400*55],
  [-2000.00,'withdrawal','withdrawal','1',$now-86400*30],
  [10000.00,'deposit','deposit','2',$now-86400*40],
  [1250.00,'trade_pnl','position','1',$now-86400*35],
  [-1500.00,'withdrawal','withdrawal','2',$now-86400*15],
  [5000.00,'deposit','deposit','3',$now-86400*25],
  [-3000.00,'trade_pnl','position','5',$now-86400*20],
  [890.50,'trade_pnl','position','8',$now-86400*12],
  [2500.00,'deposit','deposit','4',$now-86400*10],
  [7500.00,'deposit','deposit','5',$now-86400*3],
  [1000.00,'deposit','deposit','6',$now-3600],
  [-1750.00,'withdrawal','withdrawal','3',$now-7200],
  [460.00,'trade_pnl','position','10',$now-86400*5],
  [200.00,'invest_payout','investment','1',$now-86400*8],
];
foreach ($ledgers as $l) { $insL->execute([$userId,$walletId,'USDT',$l[0],$l[1],$l[2],$l[3],$l[4]]); }

$insP = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,unrealized_pnl_usd,fees_paid,opened_at,updated_at,closed_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$closedPos = [
  ['BTCUSDT','crypto','spot','buy',0.05,68000.00,5,'isolated',680.00,1250.00,8.50,$now-86400*52,$now-86400*50,$now-86400*50,'closed'],
  ['ETHUSDT','crypto','spot','sell',2.0,3200.00,3,'isolated',2133.33,-480.00,4.20,$now-86400*48,$now-86400*47,$now-86400*47,'closed'],
  ['XAUUSD','commodities','spot','buy',1.0,2350.00,10,'isolated',235.00,1250.00,6.00,$now-86400*45,$now-86400*42,$now-86400*42,'closed'],
  ['EURUSD','forex','spot','buy',10000.0,1.0850,20,'isolated',542.50,-300.00,12.00,$now-86400*38,$now-86400*37,$now-86400*37,'closed'],
  ['SOLUSDT','crypto','spot','buy',50.0,145.00,5,'isolated',1450.00,890.50,3.50,$now-86400*35,$now-86400*33,$now-86400*33,'closed'],
  ['BNBUSDT','crypto','spot','sell',5.0,580.00,5,'isolated',580.00,325.00,2.80,$now-86400*28,$now-86400*26,$now-86400*26,'closed'],
  ['AAPL','stocks','spot','buy',10.0,185.00,1,'isolated',1850.00,-250.00,5.50,$now-86400*22,$now-86400*20,$now-86400*20,'closed'],
  ['BTCUSDT','crypto','perp','buy',0.02,72000.00,10,'isolated',144.00,-3000.00,3.20,$now-86400*18,$now-86400*16,$now-86400*16,'closed'],
  ['ETHUSDT','crypto','spot','buy',3.0,3100.00,3,'isolated',3100.00,460.00,5.10,$now-86400*12,$now-86400*8,$now-86400*8,'closed'],
  ['DOGEUSDT','crypto','spot','buy',5000.0,0.1650,5,'isolated',1650.00,750.00,4.80,$now-86400*7,$now-86400*5,$now-86400*5,'closed'],
];
foreach ($closedPos as $p) { $insP->execute(array_merge([$userId], $p)); }

$insPO = $pdo->prepare('INSERT INTO positions(user_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_mode,margin_initial,unrealized_pnl_usd,fees_paid,tp_price,sl_price,opened_at,updated_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$openPos = [
  ['BTCUSDT','crypto','spot','buy',0.08,104500.00,5,'isolated',1672.00,880.00,5.20,110000.00,100000.00,$now-86400*2,$now,'open'],
  ['ETHUSDT','crypto','perp','sell',5.0,2650.00,10,'isolated',1325.00,-420.00,3.80,2400.00,2800.00,$now-86400*1,$now,'open'],
  ['XAUUSD','commodities','spot','buy',2.0,3280.00,10,'isolated',656.00,340.00,4.00,3400.00,3200.00,$now-86400*3,$now,'open'],
  ['SOLUSDT','crypto','spot','buy',100.0,172.00,5,'isolated',3440.00,560.00,2.50,185.00,160.00,$now-3600*12,$now,'open'],
];
foreach ($openPos as $p) { $insPO->execute(array_merge([$userId], $p)); }

$insO = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,fill_price,usd_amount,leverage,pnl_usd,close_reason,closed_at,fee_paid,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$closedOrds = [
  ['BTCUSDT','crypto','spot','buy','market',0.05,68000.00,3400.00,5,1250.00,'tp',$now-86400*50,8.50,'filled',$now-86400*52],
  ['ETHUSDT','crypto','spot','sell','market',2.0,3200.00,6400.00,3,-480.00,'sl',$now-86400*47,4.20,'filled',$now-86400*48],
  ['XAUUSD','commodities','spot','buy','limit',1.0,2350.00,2350.00,10,1250.00,'tp',$now-86400*42,6.00,'filled',$now-86400*45],
  ['EURUSD','forex','spot','buy','market',10000.0,1.0850,10850.00,20,-300.00,'manual',$now-86400*37,12.00,'filled',$now-86400*38],
  ['SOLUSDT','crypto','spot','buy','market',50.0,145.00,7250.00,5,890.50,'tp',$now-86400*33,3.50,'filled',$now-86400*35],
  ['BNBUSDT','crypto','spot','sell','market',5.0,580.00,2900.00,5,325.00,'tp',$now-86400*26,2.80,'filled',$now-86400*28],
  ['AAPL','stocks','spot','buy','market',10.0,185.00,1850.00,1,-250.00,'sl',$now-86400*20,5.50,'filled',$now-86400*22],
  ['BTCUSDT','crypto','perp','buy','market',0.02,72000.00,1440.00,10,-3000.00,'liq',$now-86400*16,3.20,'filled',$now-86400*18],
  ['ETHUSDT','crypto','spot','buy','market',3.0,3100.00,9300.00,3,460.00,'tp',$now-86400*8,5.10,'filled',$now-86400*12],
  ['DOGEUSDT','crypto','spot','buy','market',5000.0,0.1650,825.00,5,750.00,'tp',$now-86400*5,4.80,'filled',$now-86400*7],
];
foreach ($closedOrds as $o) { $insO->execute(array_merge([$userId], $o)); }

$insOO = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,leverage,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$insOO->execute([$userId,'BNBUSDT','crypto','spot','buy','limit',10.0,650.00,3,'pending',$now-3600*6]);
$insOO->execute([$userId,'AAPL','stocks','spot','buy','limit',20.0,190.00,1,'pending',$now-3600*3]);

$insSig = $pdo->prepare('INSERT INTO trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,bot_enabled,bot_name_en,bot_name_ar,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
$signals = [
  ['BTCUSDT','crypto','4h','buy',104000.00,100000.00,110000.00,115000.00,85,'analyst',1,'BTC Momentum Bot','روبوت زخم البيتكوين',500,7,15.0,5,1,'active',$now-86400*5,$now],
  ['ETHUSDT','crypto','1h','sell',2680.00,2800.00,2450.00,2350.00,72,'analyst',1,'ETH Scalper Pro','سكالبير الإيثيريوم',300,5,10.0,3,1,'active',$now-86400*3,$now],
  ['XAUUSD','commodities','1d','buy',3250.00,3150.00,3400.00,3500.00,90,'analyst',1,'Gold Trend Master','ماستر ترند الذهب',1000,14,20.0,10,1,'active',$now-86400*1,$now],
];
$sigIds = [];
foreach ($signals as $s) { $insSig->execute($s); $sigIds[] = (int)$pdo->lastInsertId(); }

if (count($sigIds) >= 2) {
  $insSub = $pdo->prepare('INSERT INTO trading_bot_subscriptions(user_id,signal_id,mode,currency,reserved_amount,lock_until,profit_share_pct,leverage,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  $insSub->execute([$userId,$sigIds[0],'real','USDT',1500.00,$now+86400*5,15.0,5,'active',$now-86400*4,$now]);
  $insSub->execute([$userId,$sigIds[1],'real','USDT',800.00,$now+86400*3,10.0,3,'active',$now-86400*2,$now]);
}

$insInv = $pdo->prepare('INSERT INTO investments(user_id,plan_id,amount,expected_return,payout_schedule,status,start_at,end_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
$insInv->execute([$userId,'starter_14',1000.00,1060.00,'end','completed',$now-86400*30,$now-86400*16,$now-86400*30]);
$insInv->execute([$userId,'starter_14',2500.00,2650.00,'end','active',$now-86400*7,$now+86400*7,$now-86400*7]);

$insH = $pdo->prepare('INSERT INTO holds(user_id,wallet_id,currency,amount,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)');
$insH->execute([$userId,$walletId,'USDT',2399.75,'position_margin','active',$now-86400*2,$now]);

echo json_encode([
  'ok' => true,
  'email' => $email,
  'password' => $password,
  'user_id' => $userId,
  'balance_usdt' => 24750.50,
  'available_usdt' => 22350.75,
  'kyc' => 'approved',
  'closed_positions' => count($closedPos),
  'open_positions' => count($openPos),
  'closed_orders' => count($closedOrds),
  'pending_orders' => 2,
  'deposits' => count($deps),
  'withdrawals' => count($wds),
  'copy_subscriptions' => 2,
  'investments' => 2,
  'signals' => count($sigIds),
], JSON_PRETTY_PRINT);