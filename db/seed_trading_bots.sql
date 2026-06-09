-- Seed data for AI Trading Bots (Copy Trading)
-- Bots with different strategies, performance metrics, and risk levels

-- Clear existing bot data
DELETE FROM trading_bots WHERE is_system = 1 OR created_by = 0;
DELETE FROM bot_signals WHERE bot_id IN (SELECT id FROM trading_bots WHERE is_system = 1);

-- Insert AI Trading Bots
INSERT INTO trading_bots (
  name, strategy, description, 
  win_rate, total_return, monthly_return,
  max_drawdown, sharpe_ratio, 
  trades_count, avg_trade_duration,
  min_copy_amount, max_copy_amount,
  leverage_max, risk_level,
  markets, assets,
  is_active, is_featured, is_ai,
  created_by, created_at
) VALUES
-- Bot 1: Scalping Pro
('Alpha Scalper', 'scalping', 
 'High-frequency scalping bot targeting 0.3-0.8% moves. Best for volatile markets. Uses AI to detect micro-trends.',
 78.5, 245.8, 18.2,
 12.5, 2.4,
 1250, '2-15 minutes',
 500, 50000,
 20, 'high',
 'crypto,futures', 'BTC,ETH,SOL,XRP',
 1, 1, 1,
 0, NOW()),

-- Bot 2: Swing Master
('Swing Master Pro', 'swing',
 'Medium-term swing trading with 4H-1D timeframe analysis. Balanced risk/reward with trend confirmation.',
 72.3, 189.4, 12.8,
 18.2, 1.9,
 380, '4 hours - 3 days',
 1000, 100000,
 10, 'medium',
 'crypto,forex,stocks', 'BTC,ETH,BNB,EURUSD,GBPUSD',
 1, 1, 1,
 0, NOW()),

-- Bot 3: Trend Follower
('Trend Hunter AI', 'trend',
 'Long-term trend following using moving average convergence. Low drawdown, steady growth.',
 68.9, 156.7, 9.4,
 8.5, 1.7,
 210, '1-7 days',
 2000, 200000,
 5, 'low',
 'crypto,commodities,indices', 'BTC,ETH,GOLD,SP500,NASDAQ',
 1, 1, 1,
 0, NOW()),

-- Bot 4: Arbitrage Expert
('Arbitrage King', 'arbitrage',
 'Cross-exchange arbitrage bot. Exploits price differences between markets. Near-zero risk.',
 95.2, 89.3, 4.2,
 2.1, 3.8,
 5200, '30 seconds - 5 minutes',
 10000, 500000,
 1, 'very_low',
 'crypto', 'BTC,ETH,USDT,BNB',
 1, 0, 1,
 0, NOW()),

-- Bot 5: Breakout Hunter
('Breakout Pro', 'breakout',
 'Detects and trades breakouts from consolidation patterns. High volatility capture.',
 64.7, 312.5, 24.6,
 28.4, 1.4,
 890, '30 minutes - 6 hours',
 500, 25000,
 25, 'very_high',
 'crypto,futures', 'BTC,ETH,SOL,AVAX,MATIC',
 1, 1, 1,
 0, NOW()),

-- Bot 6: Grid Trader
('Grid Master', 'grid',
 'Automated grid trading bot. Places buy/sell orders at set intervals. Profits from sideways markets.',
 71.2, 134.6, 7.8,
 6.2, 2.1,
 4500, 'ongoing',
 1000, 100000,
 3, 'low',
 'crypto', 'BTC,ETH,ADA,DOT',
 1, 0, 1,
 0, NOW()),

-- Bot 7: News Trader
('News Impact AI', 'news',
 'Trades high-impact news events. Uses NLP to analyze sentiment and predict market reaction.',
 58.4, 267.9, 21.3,
 35.6, 1.2,
 145, '5-30 minutes',
 2000, 100000,
 15, 'very_high',
 'crypto,forex,stocks,commodities', 'BTC,ETH,EURUSD,GBPUSD,GOLD,OIL',
 1, 1, 1,
 0, NOW()),

-- Bot 8: DCA Accumulator
('DCA Pro', 'dca',
 'Dollar-cost averaging bot. Automatically accumulates assets at optimal intervals.',
 82.1, 98.5, 5.2,
 4.8, 2.8,
 180, '1-30 days',
 100, 50000,
 1, 'very_low',
 'crypto', 'BTC,ETH',
 1, 0, 1,
 0, NOW());

-- Insert sample signals for bots
INSERT INTO bot_signals (
  bot_id, symbol, side, entry_price, 
  target_price, stop_loss, 
  confidence, timeframe,
  status, created_at
)
SELECT 
  id as bot_id,
  CASE WHEN RAND() > 0.5 THEN 'BTCUSDT' ELSE 'ETHUSDT' END as symbol,
  CASE WHEN RAND() > 0.5 THEN 'BUY' ELSE 'SELL' END as side,
  CASE WHEN RAND() > 0.5 THEN 65000 + RAND() * 5000 ELSE 3400 + RAND() * 400 END as entry_price,
  CASE WHEN RAND() > 0.5 THEN 70000 + RAND() * 5000 ELSE 3800 + RAND() * 400 END as target_price,
  CASE WHEN RAND() > 0.5 THEN 60000 + RAND() * 3000 ELSE 3000 + RAND() * 300 END as stop_loss,
  65 + RAND() * 30 as confidence,
  CASE 
    WHEN strategy = 'scalping' THEN '5m'
    WHEN strategy = 'swing' THEN '4h'
    WHEN strategy = 'trend' THEN '1d'
    ELSE '1h'
  END as timeframe,
  'active',
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 48) HOUR)
FROM trading_bots
WHERE is_system = 1 OR created_by = 0;

-- Insert sample copy relationships (user copying bots)
INSERT INTO copy_trading_relations (
  user_id, bot_id, amount, 
  is_active, started_at, 
  total_pnl, total_trades
) VALUES
(1, 1, 5000, 1, DATE_SUB(NOW(), INTERVAL 30 DAY), 1250.50, 45),
(1, 2, 10000, 1, DATE_SUB(NOW(), INTERVAL 45 DAY), 1890.25, 28),
(1, 3, 15000, 1, DATE_SUB(NOW(), INTERVAL 60 DAY), 980.75, 15);

-- Insert sample bot performance history
INSERT INTO bot_performance_history (
  bot_id, date, 
  daily_return, daily_pnl,
  trades_count, win_count
)
SELECT 
  b.id,
  DATE_SUB(CURDATE(), INTERVAL n.n DAY) as date,
  (RAND() - 0.35) * CASE 
    WHEN b.risk_level = 'very_high' THEN 15
    WHEN b.risk_level = 'high' THEN 8
    WHEN b.risk_level = 'medium' THEN 4
    ELSE 2
  END as daily_return,
  (RAND() - 0.35) * 1000 as daily_pnl,
  FLOOR(RAND() * 10) as trades_count,
  FLOOR(RAND() * 8) as win_count
FROM trading_bots b
CROSS JOIN (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
            UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
            UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
            UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) n
WHERE b.is_active = 1;
