-- MEX Trading Platform - Seed Markets Data

INSERT INTO `markets` (`symbol`, `name`, `type`, `seed_price`, `price`, `change_pct`, `source`, `updated_at`, `status`) VALUES
-- Crypto
('BTCUSDT', 'Bitcoin', 'crypto', 67500.00, 67500.00, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('ETHUSDT', 'Ethereum', 'crypto', 3450.00, 3450.00, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('BNBUSDT', 'Binance Coin', 'crypto', 580.00, 580.00, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('SOLUSDT', 'Solana', 'crypto', 145.00, 145.00, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('XRPUSDT', 'Ripple', 'crypto', 0.62, 0.62, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('ADAUSDT', 'Cardano', 'crypto', 0.45, 0.45, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('DOGEUSDT', 'Dogecoin', 'crypto', 0.12, 0.12, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('AVAXUSDT', 'Avalanche', 'crypto', 35.00, 35.00, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('DOTUSDT', 'Polkadot', 'crypto', 7.20, 7.20, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
('LINKUSDT', 'Chainlink', 'crypto', 14.50, 14.50, 0.00, 'binance', UNIX_TIMESTAMP(), 'active'),
-- Forex
('EURUSD', 'Euro / US Dollar', 'forex', 1.0850, 1.0850, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('GBPUSD', 'British Pound / US Dollar', 'forex', 1.2650, 1.2650, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('USDJPY', 'US Dollar / Japanese Yen', 'forex', 149.50, 149.50, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('USDCHF', 'US Dollar / Swiss Franc', 'forex', 0.9010, 0.9010, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('AUDUSD', 'Australian Dollar / US Dollar', 'forex', 0.6550, 0.6550, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('USDCAD', 'US Dollar / Canadian Dollar', 'forex', 1.3650, 1.3650, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
-- Stocks
('AAPL', 'Apple Inc.', 'stocks', 178.00, 178.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('GOOGL', 'Alphabet Inc.', 'stocks', 140.00, 140.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('MSFT', 'Microsoft Corp.', 'stocks', 335.00, 335.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('AMZN', 'Amazon.com', 'stocks', 178.00, 178.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('NVDA', 'NVIDIA Corp.', 'stocks', 720.00, 720.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('TSLA', 'Tesla Inc.', 'stocks', 175.00, 175.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
-- Commodities
('XAUUSD', 'Gold / US Dollar', 'commodities', 2350.00, 2350.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('XAGUSD', 'Silver / US Dollar', 'commodities', 27.00, 27.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('USOIL', 'WTI Crude Oil', 'commodities', 78.00, 78.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('UKOIL', 'Brent Crude Oil', 'commodities', 82.00, 82.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
-- Arab Markets
('1120', 'Al Rajhi Bank', 'arab', 78.00, 78.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('2222', 'Saudi Aramco', 'arab', 30.00, 30.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('1010', 'SAB', 'arab', 180.00, 180.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
-- Futures
('ES', 'E-mini S&P 500', 'futures', 4500.00, 4500.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('NQ', 'E-mini Nasdaq', 'futures', 15000.00, 15000.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('CL', 'Crude Oil Futures', 'futures', 78.00, 78.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active'),
('GC', 'Gold Futures', 'futures', 2350.00, 2350.00, 0.00, 'simulated', UNIX_TIMESTAMP(), 'active')
ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `seed_price` = VALUES(`seed_price`);