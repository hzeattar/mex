-- Avalon Copy Trading System - Database Schema
-- نظام نسخ الصفقات Avalon

-- جدول متداولي Avalon (البوتات التي تظهر كـ متداولين)
CREATE TABLE IF NOT EXISTS avalon_traders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trader_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'كود المتداول مثل: AVALON_001',
  display_name VARCHAR(100) NOT NULL COMMENT 'الاسم الظاهر مثل: Alpha Trader',
  avatar_url VARCHAR(500) DEFAULT '/assets/img/avatars/default_trader.png',
  
  -- الإحصائيات (تتحكم من الأدمن)
  win_rate DECIMAL(5,2) DEFAULT 65.00 COMMENT 'نسبة النجاح %',
  total_return DECIMAL(10,2) DEFAULT 150.00 COMMENT 'إجمالي العائد %',
  monthly_return DECIMAL(10,2) DEFAULT 15.00 COMMENT 'العائد الشهري %',
  max_drawdown DECIMAL(5,2) DEFAULT 12.00 COMMENT 'أقصى تراجع %',
  sharpe_ratio DECIMAL(4,2) DEFAULT 2.50,
  
  -- عدد المتابعين والنشاط
  followers_count INT DEFAULT 0 COMMENT 'عدد المتابعين',
  active_copies INT DEFAULT 0 COMMENT 'عدد النسخ النشطة',
  total_trades INT DEFAULT 0 COMMENT 'إجمالي الصفقات',
  
  -- معلومات الاستراتيجية
  strategy VARCHAR(50) DEFAULT 'scalping' COMMENT 'scalping, swing, trend, grid',
  strategy_desc TEXT COMMENT 'وصف الاستراتيجية',
  risk_level ENUM('low', 'medium', 'high', 'very_high') DEFAULT 'medium',
  
  -- الأسواق والأصول
  markets VARCHAR(255) DEFAULT 'crypto' COMMENT 'crypto,forex,stocks,commodities',
  assets VARCHAR(500) DEFAULT 'BTC,ETH,SOL' COMMENT 'الأصول المتداولة',
  
  -- الحدود
  min_copy_amount DECIMAL(15,2) DEFAULT 500.00 COMMENT 'الحد الأدنى للنسخ',
  max_copy_amount DECIMAL(15,2) DEFAULT 50000.00 COMMENT 'الحد الأقصى للنسخ',
  leverage_max INT DEFAULT 10 COMMENT 'أقصى رافعة',
  
  -- الحالة
  is_active TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0 COMMENT 'يظهر في المميزين',
  is_ai TINYINT(1) DEFAULT 1 COMMENT 'هل هو AI/Bot',
  
  -- مدة النشاط
  started_at DATETIME DEFAULT NOW(),
  last_trade_at DATETIME,
  created_by INT DEFAULT 0 COMMENT '0 = System/Admin',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_active (is_active),
  INDEX idx_featured (is_featured),
  INDEX idx_win_rate (win_rate),
  INDEX idx_followers (followers_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- جدول إشارات Avalon (الصفقات التي يفتحها البوت)
CREATE TABLE IF NOT EXISTS avalon_signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trader_id INT NOT NULL,
  
  -- تفاصيل الصفقة
  symbol VARCHAR(50) NOT NULL COMMENT 'BTCUSDT, EURUSD, etc.',
  side ENUM('BUY', 'SELL') NOT NULL,
  type ENUM('market', 'limit', 'stop') DEFAULT 'market',
  
  -- الأسعار
  entry_price DECIMAL(18,8) NOT NULL,
  target_price DECIMAL(18,8),
  stop_loss DECIMAL(18,8),
  current_price DECIMAL(18,8),
  
  -- الحجم والرافعة
  size DECIMAL(18,8) DEFAULT 0.1,
  leverage INT DEFAULT 10,
  
  -- الثقة والأداء
  confidence INT DEFAULT 80 COMMENT 'نسبة الثقة %',
  pnl_percent DECIMAL(10,4) DEFAULT 0.00,
  pnl_usd DECIMAL(15,2) DEFAULT 0.00,
  
  -- الحالة
  status ENUM('active', 'closed', 'cancelled') DEFAULT 'active',
  close_reason ENUM('tp', 'sl', 'manual', 'expired') NULL,
  
  -- التوقيتات
  opened_at DATETIME DEFAULT NOW(),
  closed_at DATETIME,
  expires_at DATETIME,
  
  -- عدد الناسخين
  copy_count INT DEFAULT 0,
  total_copy_volume DECIMAL(15,2) DEFAULT 0.00,
  
  created_by INT DEFAULT 0,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  FOREIGN KEY (trader_id) REFERENCES avalon_traders(id) ON DELETE CASCADE,
  INDEX idx_trader (trader_id),
  INDEX idx_status (status),
  INDEX idx_symbol (symbol),
  INDEX idx_active_trader (trader_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- جدول علاقات النسخ (المستخدم ينسخ متداول)
CREATE TABLE IF NOT EXISTS avalon_copy_relations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  trader_id INT NOT NULL,
  
  -- إعدادات النسخ
  amount DECIMAL(15,2) NOT NULL COMMENT 'المبلغ المخصص للنسخ',
  leverage_limit INT DEFAULT 10 COMMENT 'حد الرافعة',
  stop_loss_percent DECIMAL(5,2) DEFAULT 10.00 COMMENT 'وقف الخسارة %',
  take_profit_percent DECIMAL(5,2) DEFAULT 20.00 COMMENT 'جني الأرباح %',
  
  -- الإحصائيات
  total_pnl DECIMAL(15,2) DEFAULT 0.00,
  total_trades INT DEFAULT 0,
  win_count INT DEFAULT 0,
  loss_count INT DEFAULT 0,
  
  -- الحالة
  is_active TINYINT(1) DEFAULT 1,
  started_at DATETIME DEFAULT NOW(),
  stopped_at DATETIME,
  
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  UNIQUE KEY unique_user_trader (user_id, trader_id),
  FOREIGN KEY (trader_id) REFERENCES avalon_traders(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- جدول صفقات النسخ (الصفقات المنفذة للمستخدمين)
CREATE TABLE IF NOT EXISTS avalon_copy_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  copy_relation_id INT NOT NULL,
  signal_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- تفاصيل الصفقة
  symbol VARCHAR(50) NOT NULL,
  side ENUM('BUY', 'SELL') NOT NULL,
  entry_price DECIMAL(18,8) NOT NULL,
  exit_price DECIMAL(18,8),
  size DECIMAL(18,8) NOT NULL,
  leverage INT DEFAULT 10,
  
  -- المبلغ والربح
  invested_amount DECIMAL(15,2) NOT NULL,
  pnl_amount DECIMAL(15,2) DEFAULT 0.00,
  pnl_percent DECIMAL(10,4) DEFAULT 0.00,
  
  -- الحالة
  status ENUM('open', 'closed') DEFAULT 'open',
  opened_at DATETIME DEFAULT NOW(),
  closed_at DATETIME,
  
  FOREIGN KEY (copy_relation_id) REFERENCES avalon_copy_relations(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- جدول أداء المتداولين (تاريخي)
CREATE TABLE IF NOT EXISTS avalon_trader_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trader_id INT NOT NULL,
  date DATE NOT NULL,
  
  daily_return DECIMAL(10,4) DEFAULT 0.00,
  daily_pnl DECIMAL(15,2) DEFAULT 0.00,
  trades_count INT DEFAULT 0,
  win_count INT DEFAULT 0,
  loss_count INT DEFAULT 0,
  
  UNIQUE KEY unique_trader_date (trader_id, date),
  FOREIGN KEY (trader_id) REFERENCES avalon_traders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- إدراج بيانات تجريبية لـ Avalon Traders
INSERT INTO avalon_traders (
  trader_code, display_name, avatar_url,
  win_rate, total_return, monthly_return, max_drawdown, sharpe_ratio,
  followers_count, active_copies, total_trades,
  strategy, strategy_desc, risk_level,
  markets, assets,
  min_copy_amount, max_copy_amount, leverage_max,
  is_active, is_featured, is_ai,
  started_at
) VALUES
-- متداول 1: نخبة
('AVA_001', 'Apex Predator', '/assets/img/avatars/trader_01.png',
 82.50, 450.80, 28.50, 15.20, 3.20,
 12580, 3420, 8920,
 'scalping', 'High-frequency scalping with AI-powered micro-trend detection', 'high',
 'crypto', 'BTC,ETH,SOL,XRP,DOGE',
 1000, 100000, 50,
 1, 1, 1,
 DATE_SUB(NOW(), INTERVAL 180 DAY)),

-- متداول 2: متوازن
('AVA_002', 'Zen Master', '/assets/img/avatars/trader_02.png',
 74.20, 289.50, 15.80, 8.50, 2.80,
 8930, 2150, 5640,
 'swing', 'Medium-term swing trading with trend confirmation', 'medium',
 'crypto,forex', 'BTC,ETH,EURUSD,GBPUSD',
 500, 50000, 20,
 1, 1, 1,
 DATE_SUB(NOW(), INTERVAL 365 DAY)),

-- متداول 3: محافظ
('AVA_003', 'Steady Growth', '/assets/img/avatars/trader_03.png',
 68.90, 156.40, 8.20, 4.20, 2.40,
 15230, 5680, 3240,
 'trend', 'Long-term trend following with low drawdown', 'low',
 'crypto,commodities,indices', 'BTC,ETH,GOLD,SP500',
 2000, 200000, 5,
 1, 1, 1,
 DATE_SUB(NOW(), INTERVAL 540 DAY)),

-- متداول 4: مراجحة
('AVA_004', 'Arbitrage King', '/assets/img/avatars/trader_04.png',
 94.50, 98.60, 4.50, 1.80, 4.20,
 4560, 890, 12500,
 'arbitrage', 'Cross-exchange arbitrage with near-zero risk', 'very_low',
 'crypto', 'BTC,ETH,USDT,BNB',
 10000, 500000, 1,
 1, 0, 1,
 DATE_SUB(NOW(), INTERVAL 270 DAY)),

-- متداول 5: اندلاع
('AVA_005', 'Breakout Hunter', '/assets/img/avatars/trader_05.png',
 66.80, 520.90, 35.60, 32.40, 1.60,
 6780, 1890, 4560,
 'breakout', 'Volatile breakout trading with high reward potential', 'very_high',
 'crypto,futures', 'BTC,ETH,SOL,AVAX,MATIC',
 500, 25000, 100,
 1, 1, 1,
 DATE_SUB(NOW(), INTERVAL 120 DAY)),

-- متداول 6: شبكة
('AVA_006', 'Grid Master', '/assets/img/avatars/trader_06.png',
 71.20, 134.80, 7.80, 5.40, 2.10,
 3210, 780, 8900,
 'grid', 'Automated grid trading for sideways markets', 'low',
 'crypto', 'BTC,ETH,ADA,DOT',
 1000, 100000, 3,
 1, 0, 1,
 DATE_SUB(NOW(), INTERVAL 210 DAY)),

-- متداول 7: أخبار
('AVA_007', 'News Impact', '/assets/img/avatars/trader_07.png',
 59.40, 378.90, 28.40, 38.60, 1.20,
 2340, 560, 1450,
 'news', 'High-impact news event trading with sentiment analysis', 'very_high',
 'crypto,forex,stocks,commodities', 'BTC,ETH,EURUSD,GBPUSD,GOLD,OIL',
 2000, 100000, 50,
 1, 0, 1,
 DATE_SUB(NOW(), INTERVAL 150 DAY)),

-- متداول 8: DCA
('AVA_008', 'DCA Pro', '/assets/img/avatars/trader_08.png',
 85.60, 98.50, 5.20, 3.80, 3.40,
 18900, 8920, 1800,
 'dca', 'Dollar-cost averaging with optimal timing', 'very_low',
 'crypto', 'BTC,ETH',
 100, 50000, 1,
 1, 0, 1,
 DATE_SUB(NOW(), INTERVAL 720 DAY));

-- إدراج إشارات نشطة
INSERT INTO avalon_signals (
  trader_id, symbol, side, type,
  entry_price, target_price, stop_loss, current_price,
  size, leverage, confidence,
  status, opened_at, expires_at
) VALUES
-- إشارات Apex Predator
(1, 'BTCUSDT', 'BUY', 'market', 67500.00, 72000.00, 64500.00, 67890.50, 0.5, 20, 88, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(1, 'ETHUSDT', 'SELL', 'market', 3520.00, 3200.00, 3750.00, 3480.00, 5, 15, 82, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(1, 'SOLUSDT', 'BUY', 'limit', 145.00, 175.00, 125.00, 145.50, 50, 10, 75, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR)),

-- إشارات Zen Master
(2, 'XAUUSD', 'BUY', 'market', 2345.50, 2450.00, 2280.00, 2350.00, 2, 10, 85, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 72 HOUR)),
(2, 'EURUSD', 'BUY', 'market', 1.08450, 1.09500, 1.07500, 1.08500, 100000, 20, 78, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR)),

-- إشارات Steady Growth
(3, 'BTCUSDT', 'BUY', 'market', 65000.00, 75000.00, 58000.00, 67890.50, 1, 3, 92, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 168 HOUR)),

-- إشارات Breakout Hunter
(5, 'AVAXUSDT', 'BUY', 'stop_market', 35.00, 45.00, 30.00, 34.50, 1000, 25, 70, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 12 HOUR));

-- تحديث عدد الإشارات النشطة للمتداولين
UPDATE avalon_traders SET 
  active_copies = (SELECT COUNT(*) FROM avalon_signals WHERE trader_id = avalon_traders.id AND status = 'active'),
  last_trade_at = NOW()
WHERE is_active = 1;
