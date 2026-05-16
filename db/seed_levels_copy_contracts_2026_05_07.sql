-- VertexPluse visual/product seed: customer levels, copy signals, and contracts.
-- Idempotent and non-destructive: updates/inserts known demo/product rows only.
START TRANSACTION;

CREATE TABLE IF NOT EXISTS customer_levels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  level_code VARCHAR(64) NOT NULL,
  name_en VARCHAR(128) NULL,
  name_ar VARCHAR(128) NULL,
  name_ru VARCHAR(128) NULL,
  perks_en MEDIUMTEXT NULL,
  perks_ar MEDIUMTEXT NULL,
  perks_ru MEDIUMTEXT NULL,
  min_deposit_total DECIMAL(20,8) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at BIGINT UNSIGNED NULL,
  updated_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_customer_level_code (level_code),
  KEY idx_customer_level_status (status, sort_order, min_deposit_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO customer_levels(level_code,name_en,name_ar,name_ru,perks_en,perks_ar,perks_ru,min_deposit_total,sort_order,status,created_at,updated_at) VALUES
('starter','Starter','المبتدئ','Starter','Market dashboard\nBasic signals\nDemo trading workspace','لوحة الأسواق\nإشارات أساسية\nحساب تجريبي','Market dashboard\nBasic signals\nDemo trading workspace',0,10,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('silver','Silver','فضي','Silver','Copy trading access\nStandard contracts\nPriority funding queue','نسخ صفقات\nعقود قياسية\nأولوية تمويل','Copy trading access\nStandard contracts\nPriority funding queue',5000,20,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('gold','Gold','ذهبي','Gold','Premium copy desk\nHigher contract caps\nDedicated account guidance','منصة نسخ بريميوم\nحدود عقود أعلى\nإرشاد حساب مخصص','Premium copy desk\nHigher contract caps\nDedicated account guidance',25000,30,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('platinum','Platinum','بلاتيني','Platinum','Advanced contracts\nReduced profit share\nFast KYC and withdrawal review','عقود متقدمة\nنسبة مشاركة أقل\nمراجعة أسرع','Advanced contracts\nReduced profit share\nFast KYC and withdrawal review',75000,40,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('vip','VIP','كبار العملاء','VIP','Private desk\nVIP contracts\nCustom risk limits','منصة خاصة\nعقود VIP\nحدود مخاطر مخصصة','Private desk\nVIP contracts\nCustom risk limits',150000,50,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en),name_ar=VALUES(name_ar),name_ru=VALUES(name_ru),perks_en=VALUES(perks_en),perks_ar=VALUES(perks_ar),perks_ru=VALUES(perks_ru),min_deposit_total=VALUES(min_deposit_total),sort_order=VALUES(sort_order),status='active',updated_at=UNIX_TIMESTAMP();

INSERT INTO invest_plans(id,name,name_en,name_ar,name_ru,desc_en,desc_ar,desc_ru,details_en,details_ar,details_ru,term_days,roi_percent,min_amount,max_amount,risk,payout_schedule,early_exit_allowed,early_exit_penalty_percent,sort_order,status,created_at,updated_at,product_kind,required_level_id,is_perpetual,features_en,features_ar,features_ru,badge_en,badge_ar,badge_ru,headline_en,headline_ar,headline_ru) VALUES
('vp_contract_starter_30','Starter Contract','Starter Contract','عقد المبتدئ','Starter Contract','A conservative 30-day managed trading contract for new funded accounts.','عقد تداول محافظ لمدة 30 يومًا للحسابات الجديدة.','A conservative 30-day managed trading contract for new funded accounts.','Daily risk monitoring, diversified major markets, end-of-term payout.','متابعة مخاطر يومية، تنويع في الأسواق الرئيسية، عائد في نهاية المدة.','Daily risk monitoring, diversified major markets, end-of-term payout.',30,4.5000,250,5000,'low','end',1,1.5000,10,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'contract',(SELECT id FROM customer_levels WHERE level_code='starter' LIMIT 1),0,'Low volatility\nMajor markets\nManual review','تقلب منخفض\nأسواق رئيسية\nمراجعة يدوية','Low volatility\nMajor markets\nManual review','Starter','المبتدئ','Starter','Low-risk managed contract','عقد مُدار منخفض المخاطر','Low-risk managed contract'),
('vp_contract_silver_45','Silver Copy Contract','Silver Copy Contract','عقد النسخ الفضي','Silver Copy Contract','Balanced copy-trading allocation for verified Silver clients.','تخصيص نسخ صفقات متوازن لعملاء Silver.','Balanced copy-trading allocation for verified Silver clients.', 'Signal basket, risk cap, weekly desk review.','سلة إشارات، حد مخاطر، مراجعة أسبوعية.','Signal basket, risk cap, weekly desk review.',45,7.2500,1000,15000,'medium','end',1,2.0000,20,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'contract',(SELECT id FROM customer_levels WHERE level_code='silver' LIMIT 1),0,'Copy basket\nWeekly review\nMedium risk','سلة نسخ\nمراجعة أسبوعية\nمخاطر متوسطة','Copy basket\nWeekly review\nMedium risk','Silver','فضي','Silver','Balanced copy desk contract','عقد نسخ متوازن','Balanced copy desk contract'),
('vp_contract_gold_90','Gold Growth Contract','Gold Growth Contract','عقد النمو الذهبي','Gold Growth Contract','Premium 90-day multi-asset contract with higher caps.','عقد بريميوم لمدة 90 يومًا متعدد الأصول.','Premium 90-day multi-asset contract with higher caps.', 'Crypto, FX, gold and indices exposure with controlled drawdown.','تعرض للكريبتو والعملات والذهب والمؤشرات مع ضبط السحب.','Crypto, FX, gold and indices exposure with controlled drawdown.',90,13.5000,5000,50000,'medium','monthly',1,3.0000,30,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'contract',(SELECT id FROM customer_levels WHERE level_code='gold' LIMIT 1),0,'Multi asset\nMonthly payout\nPriority desk','أصول متعددة\nعائد شهري\nمنصة أولوية','Multi asset\nMonthly payout\nPriority desk','Gold','ذهبي','Gold','Premium multi-asset growth','نمو بريميوم متعدد الأصول','Premium multi-asset growth'),
('vp_contract_vip_private','VIP Private Desk','VIP Private Desk','منصة VIP الخاصة','VIP Private Desk','Private perpetual allocation for VIP accounts with custom limits.','تخصيص خاص مستمر لحسابات VIP بحدود مخصصة.','Private perpetual allocation for VIP accounts with custom limits.', 'Private desk monitoring, negotiated caps, custom risk profile.','متابعة خاصة، حدود متفق عليها، ملف مخاطر مخصص.','Private desk monitoring, negotiated caps, custom risk profile.',0,2.2000,25000,0,'custom','monthly',0,0.0000,40,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'contract',(SELECT id FROM customer_levels WHERE level_code='vip' LIMIT 1),1,'Private desk\nCustom limits\nMonthly cycle','منصة خاصة\nحدود مخصصة\nدورة شهرية','Private desk\nCustom limits\nMonthly cycle','VIP','VIP','VIP','Private perpetual contract','عقد خاص مستمر','Private perpetual contract')
ON DUPLICATE KEY UPDATE name=VALUES(name),name_en=VALUES(name_en),name_ar=VALUES(name_ar),name_ru=VALUES(name_ru),desc_en=VALUES(desc_en),desc_ar=VALUES(desc_ar),desc_ru=VALUES(desc_ru),details_en=VALUES(details_en),details_ar=VALUES(details_ar),details_ru=VALUES(details_ru),term_days=VALUES(term_days),roi_percent=VALUES(roi_percent),min_amount=VALUES(min_amount),max_amount=VALUES(max_amount),risk=VALUES(risk),payout_schedule=VALUES(payout_schedule),early_exit_allowed=VALUES(early_exit_allowed),early_exit_penalty_percent=VALUES(early_exit_penalty_percent),sort_order=VALUES(sort_order),status='active',updated_at=UNIX_TIMESTAMP(),product_kind=VALUES(product_kind),required_level_id=VALUES(required_level_id),is_perpetual=VALUES(is_perpetual),features_en=VALUES(features_en),features_ar=VALUES(features_ar),features_ru=VALUES(features_ru),badge_en=VALUES(badge_en),badge_ar=VALUES(badge_ar),badge_ru=VALUES(badge_ru),headline_en=VALUES(headline_en),headline_ar=VALUES(headline_ar),headline_ru=VALUES(headline_ru);

INSERT INTO markets(symbol,name,type,status,sort_order,meta,tv_symbol,seed_price,created_at,updated_at,source) VALUES
('BTCUSDT','Bitcoin / Tether','crypto','active',10,'{"yahoo_ticker":"BTC-USD","icon":"./assets/img/markets/btc.svg"}','BINANCE:BTCUSDT',68000,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('ETHUSDT','Ethereum / Tether','crypto','active',20,'{"yahoo_ticker":"ETH-USD","icon":"./assets/img/markets/eth.svg"}','BINANCE:ETHUSDT',2300,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('SOLUSDT','Solana / Tether','crypto','active',30,'{"yahoo_ticker":"SOL-USD","icon":"./assets/img/markets/sol.svg"}','BINANCE:SOLUSDT',145,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('USDCUSDT','USD Coin / Tether','crypto','active',40,'{"yahoo_ticker":"USDC-USD","icon":"./assets/img/markets/usdc.svg"}','BINANCE:USDCUSDT',1,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('EURUSD','Euro / US Dollar','forex','active',110,'{"yahoo_ticker":"EURUSD=X","icon":"./assets/img/markets/forex.svg"}','FX:EURUSD',1.08,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('GBPUSD','British Pound / US Dollar','forex','active',120,'{"yahoo_ticker":"GBPUSD=X","icon":"./assets/img/markets/forex.svg"}','FX:GBPUSD',1.25,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('USDJPY','US Dollar / Japanese Yen','forex','active',130,'{"yahoo_ticker":"JPY=X","icon":"./assets/img/markets/forex.svg"}','FX:USDJPY',155,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('AAPL','Apple Inc.','stocks','active',210,'{"yahoo_ticker":"AAPL","icon":"./assets/img/markets/apple.svg"}','NASDAQ:AAPL',280,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('MSFT','Microsoft Corp.','stocks','active',220,'{"yahoo_ticker":"MSFT","icon":"./assets/img/markets/microsoft.svg"}','NASDAQ:MSFT',410,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('TSLA','Tesla Inc.','stocks','active',230,'{"yahoo_ticker":"TSLA","icon":"./assets/img/markets/stock.svg"}','NASDAQ:TSLA',180,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('NVDA','NVIDIA Corp.','stocks','active',240,'{"yahoo_ticker":"NVDA","icon":"./assets/img/markets/stock.svg"}','NASDAQ:NVDA',920,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('SPX500','S&P 500 Index','stocks','active',250,'{"yahoo_ticker":"^GSPC","icon":"./assets/img/markets/stock.svg"}','SP:SPX',5200,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('NAS100','Nasdaq 100 Index','stocks','active',260,'{"yahoo_ticker":"^NDX","icon":"./assets/img/markets/stock.svg"}','NASDAQ:NDX',18500,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('XAUUSD','Gold Spot','commodities','active',310,'{"yahoo_ticker":"GC=F","icon":"./assets/img/markets/metal.svg"}','OANDA:XAUUSD',2350,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('XAGUSD','Silver Spot','commodities','active',320,'{"yahoo_ticker":"SI=F","icon":"./assets/img/markets/metal.svg"}','OANDA:XAGUSD',28,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('USOIL','WTI Crude Oil','commodities','active',330,'{"yahoo_ticker":"CL=F","icon":"./assets/img/markets/oil.svg"}','TVC:USOIL',78,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('UKOIL','Brent Crude Oil','commodities','active',340,'{"yahoo_ticker":"BZ=F","icon":"./assets/img/markets/oil.svg"}','TVC:UKOIL',82,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('NGAS','Natural Gas','commodities','active',350,'{"yahoo_ticker":"NG=F","icon":"./assets/img/markets/oil.svg"}','TVC:NATGAS',2.3,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('ES_F','E-mini S&P 500 Future','futures','active',410,'{"yahoo_ticker":"ES=F","icon":"./assets/img/markets/future.svg"}','CME_MINI:ES1!',5200,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('NQ_F','E-mini Nasdaq Future','futures','active',420,'{"yahoo_ticker":"NQ=F","icon":"./assets/img/markets/future.svg"}','CME_MINI:NQ1!',18500,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('ZN_F','10Y Treasury Note Future','futures','active',430,'{"yahoo_ticker":"ZN=F","icon":"./assets/img/markets/future.svg"}','CBOT:ZN1!',110,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('ZB_F','30Y Treasury Bond Future','futures','active',440,'{"yahoo_ticker":"ZB=F","icon":"./assets/img/markets/future.svg"}','CBOT:ZB1!',118,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('CL_F','WTI Crude Future','futures','active',450,'{"yahoo_ticker":"CL=F","icon":"./assets/img/markets/oil.svg"}','NYMEX:CL1!',78,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('GC_F','Gold Future','futures','active',460,'{"yahoo_ticker":"GC=F","icon":"./assets/img/markets/metal.svg"}','COMEX:GC1!',2350,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('2222','Saudi Aramco','arab','active',510,'{"yahoo_ticker":"2222.SR","icon":"./assets/img/markets/arab.svg"}','TADAWUL:2222',29,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('1120','Al Rajhi Bank','arab','active',520,'{"yahoo_ticker":"1120.SR","icon":"./assets/img/markets/arab.svg"}','TADAWUL:1120',88,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('2010','SABIC','arab','active',530,'{"yahoo_ticker":"2010.SR","icon":"./assets/img/markets/arab.svg"}','TADAWUL:2010',75,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('7010','stc','arab','active',540,'{"yahoo_ticker":"7010.SR","icon":"./assets/img/markets/arab.svg"}','TADAWUL:7010',43,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed'),
('1211','Maaden','arab','active',550,'{"yahoo_ticker":"1211.SR","icon":"./assets/img/markets/arab.svg"}','TADAWUL:1211',50,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),'seed')
ON DUPLICATE KEY UPDATE name=VALUES(name),type=VALUES(type),status='active',sort_order=VALUES(sort_order),meta=VALUES(meta),tv_symbol=VALUES(tv_symbol),seed_price=VALUES(seed_price),updated_at=UNIX_TIMESTAMP(),source=VALUES(source);

CREATE TEMPORARY TABLE vp_seed_trading_signals AS
SELECT market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,note_en,note_ar,note_ru,bot_enabled,bot_name_en,bot_name_ar,bot_name_ru,bot_brief_en,bot_brief_ar,bot_brief_ru,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,valid_until,created_at,updated_at,recommend_count,comments_count
FROM trading_signals WHERE 1=0;

INSERT INTO vp_seed_trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,note_en,note_ar,note_ru,bot_enabled,bot_name_en,bot_name_ar,bot_name_ru,bot_brief_en,bot_brief_ar,bot_brief_ru,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,valid_until,created_at,updated_at,recommend_count,comments_count) VALUES
('BTCUSDT','crypto','1h','BUY',0,0,0,0,88,'desk','Momentum continuation setup with controlled trailing stop.','إعداد استمرار زخم مع وقف متحرك مضبوط.','Momentum continuation setup with controlled trailing stop.',1,'Atlas BTC Momentum','أطلس BTC','Atlas BTC Momentum','Follows BTC liquidity zones and momentum candles.','يتابع مناطق سيولة BTC وشموع الزخم.','Follows BTC liquidity zones and momentum candles.',250,7,8.0000,3,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),128,17),
('ETHUSDT','crypto','4h','BUY',0,0,0,0,84,'desk','Swing basket signal for Ethereum trend continuation.','إشارة سوينج لاستمرار اتجاه إيثريوم.','Swing basket signal for Ethereum trend continuation.',1,'Orion ETH Swing','أوريون ETH','Orion ETH Swing','Blends ETH trend, volume and risk filters.','يمزج اتجاه ETH والحجم وفلاتر المخاطر.','Blends ETH trend, volume and risk filters.',300,10,10.0000,2,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),94,11),
('XAUUSD','commodities','1h','BUY',0,0,0,0,81,'desk','Gold breakout watch with delayed/live source labeling.','متابعة اختراق الذهب مع توضيح مصدر السعر.','Gold breakout watch with delayed/live source labeling.',1,'Aurum Gold Desk','منصة الذهب','Aurum Gold Desk','Tracks gold volatility and macro risk windows.','يتابع تذبذب الذهب ونوافذ المخاطر.','Tracks gold volatility and macro risk windows.',500,14,12.0000,1,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),76,8),
('EURUSD','forex','4h','SELL',0,0,0,0,79,'desk','FX mean reversion setup for euro dollar.','إعداد عودة متوسط لزوج اليورو دولار.','FX mean reversion setup for euro dollar.',1,'FX Alpha Desk','منصة FX Alpha','FX Alpha Desk','Uses majors basket and volatility filters.','يستخدم سلة العملات الرئيسية وفلاتر التذبذب.','Uses majors basket and volatility filters.',400,7,9.0000,5,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),61,6);

INSERT INTO vp_seed_trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,note_en,note_ar,note_ru,bot_enabled,bot_name_en,bot_name_ar,bot_name_ru,bot_brief_en,bot_brief_ar,bot_brief_ru,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,valid_until,created_at,updated_at,recommend_count,comments_count) VALUES
('AAPL','stocks','1d','BUY',0,0,0,0,73,'desk','Equity momentum basket signal for Apple.','Equity momentum basket signal for Apple.','Equity momentum basket signal for Apple.',1,'Equity Pulse Apple','Equity Pulse Apple','Equity Pulse Apple','Tracks delayed equity momentum and risk bands.','Tracks delayed equity momentum and risk bands.','Tracks delayed equity momentum and risk bands.',500,10,11.0000,1,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),43,5),
('USOIL','commodities','1h','SELL',0,0,0,0,77,'desk','Oil range rejection setup with controlled risk.','Oil range rejection setup with controlled risk.','Oil range rejection setup with controlled risk.',1,'Energy Desk WTI','Energy Desk WTI','Energy Desk WTI','Uses crude oil momentum, inventory risk and price bands.','Uses crude oil momentum, inventory risk and price bands.','Uses crude oil momentum, inventory risk and price bands.',450,7,10.0000,2,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),58,7),
('ZN_F','futures','4h','BUY',0,0,0,0,71,'desk','Treasury futures continuation signal for contract clients.','Treasury futures continuation signal for contract clients.','Treasury futures continuation signal for contract clients.',1,'Rates Futures Desk','Rates Futures Desk','Rates Futures Desk','Tracks rates futures with wider delayed-market tolerance.','Tracks rates futures with wider delayed-market tolerance.','Tracks rates futures with wider delayed-market tolerance.',650,14,13.0000,1,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),32,4),
('2222','arab','1d','BUY',0,0,0,0,69,'desk','Arab equities watch signal with delayed market label.','Arab equities watch signal with delayed market label.','Arab equities watch signal with delayed market label.',1,'Gulf Equity Desk','Gulf Equity Desk','Gulf Equity Desk','Tracks regional liquidity and price confirmation.','Tracks regional liquidity and price confirmation.','Tracks regional liquidity and price confirmation.',350,7,8.0000,1,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),24,3),
('ES_F','futures','1h','BUY',0,0,0,0,74,'desk','Index futures breakout watch for verified Real accounts.','Index futures breakout watch for verified Real accounts.','Index futures breakout watch for verified Real accounts.',1,'Index Futures Desk','Index Futures Desk','Index Futures Desk','Tracks US index futures momentum and range breaks.','Tracks US index futures momentum and range breaks.','Tracks US index futures momentum and range breaks.',700,10,12.0000,2,1,'active',UNIX_TIMESTAMP()+604800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),39,5);

UPDATE trading_signals t
JOIN vp_seed_trading_signals s ON t.market_symbol=s.market_symbol AND t.market_type=s.market_type AND t.timeframe=s.timeframe AND t.source=s.source AND t.bot_name_en=s.bot_name_en
SET t.direction=s.direction,t.entry_price=s.entry_price,t.stop_loss=s.stop_loss,t.take_profit_1=s.take_profit_1,t.take_profit_2=s.take_profit_2,t.confidence=s.confidence,t.note_en=s.note_en,t.note_ar=s.note_ar,t.note_ru=s.note_ru,t.bot_enabled=s.bot_enabled,t.bot_name_ar=s.bot_name_ar,t.bot_name_ru=s.bot_name_ru,t.bot_brief_en=s.bot_brief_en,t.bot_brief_ar=s.bot_brief_ar,t.bot_brief_ru=s.bot_brief_ru,t.copy_min_amount=s.copy_min_amount,t.copy_lock_days=s.copy_lock_days,t.copy_profit_share_pct=s.copy_profit_share_pct,t.copy_leverage=s.copy_leverage,t.show_on_home=s.show_on_home,t.status=s.status,t.valid_until=s.valid_until,t.updated_at=UNIX_TIMESTAMP(),t.recommend_count=s.recommend_count,t.comments_count=s.comments_count;

INSERT INTO trading_signals(market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,note_en,note_ar,note_ru,bot_enabled,bot_name_en,bot_name_ar,bot_name_ru,bot_brief_en,bot_brief_ar,bot_brief_ru,copy_min_amount,copy_lock_days,copy_profit_share_pct,copy_leverage,show_on_home,status,valid_until,created_at,updated_at,recommend_count,comments_count)
SELECT s.market_symbol,s.market_type,s.timeframe,s.direction,s.entry_price,s.stop_loss,s.take_profit_1,s.take_profit_2,s.confidence,s.source,s.note_en,s.note_ar,s.note_ru,s.bot_enabled,s.bot_name_en,s.bot_name_ar,s.bot_name_ru,s.bot_brief_en,s.bot_brief_ar,s.bot_brief_ru,s.copy_min_amount,s.copy_lock_days,s.copy_profit_share_pct,s.copy_leverage,s.show_on_home,s.status,s.valid_until,s.created_at,s.updated_at,s.recommend_count,s.comments_count
FROM vp_seed_trading_signals s
LEFT JOIN trading_signals t ON t.market_symbol=s.market_symbol AND t.market_type=s.market_type AND t.timeframe=s.timeframe AND t.source=s.source AND t.bot_name_en=s.bot_name_en
WHERE t.id IS NULL;

DROP TEMPORARY TABLE vp_seed_trading_signals;

UPDATE customer_levels
SET name_ar=name_en,
    name_ru=name_en,
    perks_ar=perks_en,
    perks_ru=perks_en
WHERE level_code IN ('starter','silver','gold','platinum','vip');

UPDATE invest_plans
SET name_ar=name_en,
    name_ru=name_en,
    desc_ar=desc_en,
    desc_ru=desc_en,
    details_ar=details_en,
    details_ru=details_en,
    features_ar=features_en,
    features_ru=features_en,
    badge_ar=badge_en,
    badge_ru=badge_en,
    headline_ar=headline_en,
    headline_ru=headline_en
WHERE id IN ('vp_contract_starter_30','vp_contract_silver_45','vp_contract_gold_90','vp_contract_vip_private');

UPDATE trading_signals
SET note_ar=note_en,
    note_ru=note_en,
    bot_name_ar=bot_name_en,
    bot_name_ru=bot_name_en,
    bot_brief_ar=bot_brief_en,
    bot_brief_ru=bot_brief_en
WHERE source='desk'
  AND market_symbol IN ('BTCUSDT','ETHUSDT','XAUUSD','EURUSD','AAPL','USOIL','ZN_F','2222','ES_F');

CREATE TEMPORARY TABLE vp_seed_announcements AS
SELECT slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at
FROM announcements WHERE 1=0;

INSERT INTO vp_seed_announcements(slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at) VALUES
('vertexpluse-mobile-desk-ready','Mobile trading desk upgraded','Mobile trading desk upgraded','Mobile trading desk upgraded','The new mobile trading workspace now includes cleaner order controls, compact position cards, and faster focus pricing for supported markets.','The new mobile trading workspace now includes cleaner order controls, compact position cards, and faster focus pricing for supported markets.','The new mobile trading workspace now includes cleaner order controls, compact position cards, and faster focus pricing for supported markets.','/assets/img/news/news-market-pulse.svg','#/trade','Trading Desk','published',1,UNIX_TIMESTAMP()-900,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('copy-desk-real-only','Copy desk is ready for verified Real accounts','Copy desk is ready for verified Real accounts','Copy desk is ready for verified Real accounts','Approved clients can review curated copy signals across crypto, FX, stocks, commodities, futures, and Arab markets. Demo accounts keep the desk visible with a Real account gate.','Approved clients can review curated copy signals across crypto, FX, stocks, commodities, futures, and Arab markets. Demo accounts keep the desk visible with a Real account gate.','Approved clients can review curated copy signals across crypto, FX, stocks, commodities, futures, and Arab markets. Demo accounts keep the desk visible with a Real account gate.','/assets/img/news/news-copy-history.svg','#/invest','Copy Desk','published',1,UNIX_TIMESTAMP()-1800,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('level-contracts-live','Level contracts connected to account tiers','Level contracts connected to account tiers','Level contracts connected to account tiers','Starter, Silver, Gold, Platinum, and VIP levels now unlock managed contract products with clear minimums, terms, and eligibility badges.','Starter, Silver, Gold, Platinum, and VIP levels now unlock managed contract products with clear minimums, terms, and eligibility badges.','Starter, Silver, Gold, Platinum, and VIP levels now unlock managed contract products with clear minimums, terms, and eligibility badges.','/assets/img/news/news-center.svg','#/invest','Contracts','published',0,UNIX_TIMESTAMP()-3600,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('funding-review-desk','Funding review flow has been refreshed','Funding review flow has been refreshed','Funding review flow has been refreshed','Deposits and withdrawals now show clearer payment rails, proof requirements, manual admin review states, and ledger history for each client.','Deposits and withdrawals now show clearer payment rails, proof requirements, manual admin review states, and ledger history for each client.','Deposits and withdrawals now show clearer payment rails, proof requirements, manual admin review states, and ledger history for each client.','/assets/img/news/news-gold-feed.svg','#/wallet','Funding Desk','published',0,UNIX_TIMESTAMP()-5400,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('market-coverage-pack','Curated market coverage expanded','Curated market coverage expanded','Curated market coverage expanded','The default workspace now highlights supported crypto, forex, stocks, commodities, futures, and Arab symbols with icon metadata and clearer live or delayed status labels.','The default workspace now highlights supported crypto, forex, stocks, commodities, futures, and Arab symbols with icon metadata and clearer live or delayed status labels.','The default workspace now highlights supported crypto, forex, stocks, commodities, futures, and Arab symbols with icon metadata and clearer live or delayed status labels.','/assets/img/news/news-market-pulse.svg','#/home','Market Coverage','published',0,UNIX_TIMESTAMP()-7200,UNIX_TIMESTAMP(),UNIX_TIMESTAMP());

UPDATE announcements a
JOIN vp_seed_announcements s ON a.slug=s.slug
SET a.title_en=s.title_en,
    a.title_ar=s.title_ar,
    a.title_ru=s.title_ru,
    a.body_en=s.body_en,
    a.body_ar=s.body_ar,
    a.body_ru=s.body_ru,
    a.image_url=s.image_url,
    a.cta_url=s.cta_url,
    a.source_label=s.source_label,
    a.status=s.status,
    a.pinned=s.pinned,
    a.published_at=s.published_at,
    a.updated_at=UNIX_TIMESTAMP();

INSERT INTO announcements(slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at)
SELECT s.slug,s.title_en,s.title_ar,s.title_ru,s.body_en,s.body_ar,s.body_ru,s.image_url,s.cta_url,s.source_label,s.status,s.pinned,s.published_at,s.created_at,s.updated_at
FROM vp_seed_announcements s
LEFT JOIN announcements a ON a.slug=s.slug
WHERE a.id IS NULL;

DROP TEMPORARY TABLE vp_seed_announcements;

COMMIT;
