-- Seed data for trading history (positions and orders)
-- Creates realistic trading history for testing

-- Clear existing demo data
DELETE FROM positions WHERE user_id = 1 AND symbol LIKE '@R@%';
DELETE FROM orders WHERE user_id = 1 AND symbol LIKE '@R@%';

-- Insert sample positions (Real mode with @R@ prefix)
INSERT INTO positions (
  user_id, symbol, side, 
  entry_price, mark_price, size,
  leverage, margin, 
  unrealized_pnl, realized_pnl,
  opened_at, updated_at
) VALUES
-- BTC Long
(1, '@R@BTCUSDT', 'BUY',
  64500.00, 67890.50, 0.5,
  10, 3225.00,
  1694.75, 0,
  DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),

-- ETH Short
(1, '@R@ETHUSDT', 'SELL',
  3520.00, 3410.25, 5,
  5, 3520.00,
  548.75, 0,
  DATE_SUB(NOW(), INTERVAL 2 DAY), NOW()),

-- SOL Long
(1, '@R@SOLUSDT', 'BUY',
  145.50, 167.80, 50,
  8, 727.50,
  1115.00, 0,
  DATE_SUB(NOW(), INTERVAL 5 DAY), NOW()),

-- XRP Long
(1, '@R@XRPUSDT', 'BUY',
  0.5420, 0.5890, 10000,
  3, 1806.67,
  470.00, 0,
  DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),

-- GOLD Short
(1, '@R@XAUUSD', 'SELL',
  2345.50, 2298.75, 2,
  10, 469.10,
  93.50, 0,
  DATE_SUB(NOW(), INTERVAL 4 DAY), NOW()),

-- EUR/USD Long
(1, '@R@EURUSD', 'BUY',
  1.08450, 1.09230, 100000,
  20, 542.25,
  780.00, 0,
  DATE_SUB(NOW(), INTERVAL 6 DAY), NOW());

-- Insert sample closed orders (history)
INSERT INTO orders (
  user_id, symbol, side, type,
  entry_price, exit_price, 
  size, leverage,
  margin, pnl_usd, pnl_percent,
  fee_usd, status,
  opened_at, closed_at
) VALUES
-- Profitable BTC trade
(1, '@R@BTCUSDT', 'BUY', 'market',
  62800.00, 66500.00,
  0.3, 10,
  1884.00, 1110.00, 58.9,
  22.15, 'closed',
  DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY)),

-- Losing ETH trade
(1, '@R@ETHUSDT', 'BUY', 'limit',
  3650.00, 3480.00,
  2, 5,
  1460.00, -340.00, -23.3,
  14.60, 'closed',
  DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY)),

-- Profitable SOL trade
(1, '@R@SOLUSDT', 'BUY', 'market',
  132.50, 158.00,
  30, 8,
  496.88, 765.00, 153.9,
  12.42, 'closed',
  DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),

-- Small BTC scalp
(1, '@R@BTCUSDT', 'SELL', 'market',
  68200.00, 67800.00,
  0.1, 20,
  341.00, 40.00, 11.7,
  6.82, 'closed',
  DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY)),

-- Profitable Forex trade
(1, '@R@EURUSD', 'BUY', 'market',
  1.07200, 1.08800,
  50000, 50,
  107.20, 800.00, 746.3,
  8.00, 'closed',
  DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY)),

-- Gold trade
(1, '@R@XAUUSD', 'SELL', 'limit',
  2380.00, 2320.00,
  1, 15,
  158.67, 60.00, 37.8,
  4.75, 'closed',
  DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY)),

-- Another BTC trade
(1, '@R@BTCUSDT', 'BUY', 'market',
  59800.00, 64200.00,
  0.4, 10,
  2392.00, 1760.00, 73.6,
  28.10, 'closed',
  DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY)),

-- Losing SOL trade
(1, '@R@SOLUSDT', 'SELL', 'market',
  175.00, 182.50,
  20, 5,
  700.00, -150.00, -21.4,
  10.50, 'closed',
  DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY));

-- Insert pending orders
INSERT INTO orders (
  user_id, symbol, side, type,
  entry_price, 
  size, leverage,
  margin, 
  status,
  opened_at
) VALUES
(1, '@R@BTCUSDT', 'BUY', 'limit',
  62000.00,
  0.5, 10,
  3100.00,
  'pending',
  DATE_SUB(NOW(), INTERVAL 2 HOUR)),

(1, '@R@ETHUSDT', 'SELL', 'stop_market',
  3800.00,
  3, 8,
  1425.00,
  'pending',
  DATE_SUB(NOW(), INTERVAL 5 HOUR));

-- Update wallet balance to reflect trading activity
UPDATE wallets 
SET balance = 75000.00, 
    available = 65000.00,
    holds = 10000.00,
    updated_at = NOW()
WHERE user_id = 1 AND currency = 'USDT';

-- Insert ledger entries for deposits/withdrawals
INSERT INTO wallet_ledger (
  user_id, wallet_id, currency,
  type, amount, balance_after,
  reference_type, reference_id,
  description, created_at
)
SELECT 
  1, w.id, w.currency,
  'deposit', 50000.00, 50000.00,
  'seed', 'initial',
  'Initial seed deposit',
  DATE_SUB(NOW(), INTERVAL 30 DAY)
FROM wallets w 
WHERE w.user_id = 1 AND w.currency = 'USDT';

-- Add more ledger entries
INSERT INTO wallet_ledger (
  user_id, wallet_id, currency,
  type, amount, balance_after,
  reference_type, description, created_at
) VALUES
(1, (SELECT id FROM wallets WHERE user_id = 1 AND currency = 'USDT'), 'USDT',
 'deposit', 25000.00, 75000.00,
 'seed', 'Additional funding', DATE_SUB(NOW(), INTERVAL 15 DAY)),

(1, (SELECT id FROM wallets WHERE user_id = 1 AND currency = 'USDT'), 'USDT',
 'withdraw', 10000.00, 65000.00,
 'seed', 'Profit withdrawal', DATE_SUB(NOW(), INTERVAL 5 DAY)),

(1, (SELECT id FROM wallets WHERE user_id = 1 AND currency = 'USDT'), 'USDT',
 'pnl', 12500.00, 77500.00,
 'trade', 'Trading profits', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- Update user level based on activity
UPDATE users 
SET user_level = 3,
    level_progress = 75.5,
    updated_at = NOW()
WHERE id = 1;
