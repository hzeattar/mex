# MEX Trading Platform

A complete trading platform with real-time price feeds, charts, and trade execution.

## Features

- **Crypto**: Live prices from Binance Futures API
- **Forex**: Free exchange rates from open.er-api.com (no API key required)
- **Stocks**: Simulated with realistic seed prices (can integrate Finnhub/AlphaVantage)
- **Commodities**: Gold, Silver, Oil with live-ish prices
- **Arab Markets**: Saudi stocks (Tadawul) with simulation
- **Futures**: E-mini S&P, Nasdaq, Crude Oil, Gold

## Architecture

```
api/
├── lib/
│   ├── common.php          # Database, helpers, config
│   ├── crypto_provider.php  # Binance prices
│   ├── forex_provider.php   # Exchange rate APIs
│   ├── stocks_provider.php  # Stocks & commodities
│   └── unified_price_provider.php  # Single interface
├── prices.php               # Main prices API endpoint
└── cron/
    └── update_prices.php    # Cron job to update all prices

assets/
├── js/
│   ├── app.js               # Main SPA application
│   └── ...
└── css/
    └── app.css
```

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/hzeattar/mex.git
cd mex
```

### 2. Local Development

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_NAME=mex
# DB_USER=root
# DB_PASS=yourpassword

# Start local server
php -S localhost:8080
```

### 3. Railway Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Connect your GitHub repository
2. Add environment variables:
   - `DB_HOST` - MySQL host
   - `DB_NAME` - Database name
   - `DB_USER` - Database user
   - `DB_PASS` - Database password
   - `CRON_KEY` - Secret key for cron jobs (optional)

3. Deploy!

### 4. Database Setup

Create the required tables:

```sql
CREATE TABLE IF NOT EXISTS market_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    provider VARCHAR(64) DEFAULT 'unknown',
    price DECIMAL(20,8) NOT NULL DEFAULT 0,
    change_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
    source VARCHAR(64) DEFAULT 'unknown',
    provider_ts INT DEFAULT 0,
    received_at INT DEFAULT 0,
    UNIQUE KEY unique_market_type (market, type),
    INDEX idx_type (type),
    INDEX idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS markets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) DEFAULT '',
    type VARCHAR(32) NOT NULL,
    seed_price DECIMAL(20,8) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5. API Endpoints

```
GET /api/prices.php?type=crypto              # All crypto prices
GET /api/prices.php?type=forex              # All forex pairs
GET /api/prices.php?type=stocks              # All stocks
GET /api/prices.php?type=commodities         # All commodities
GET /api/prices.php?type=arab                # Arab stocks
GET /api/prices.php?type=futures             # Futures

GET /api/prices.php?type=crypto&symbols=BTCUSDT,ETHUSDT
GET /api/prices.php?single=BTCUSDT&asset_type=crypto

POST /api/trade.php                          # Execute trade
GET /api/trade/candles.php?symbol=BTCUSDT&tf=1h
```

### 6. Cron Job Setup

Add to your crontab:

```bash
# Update prices every minute
* * * * * /usr/bin/php /path/to/cron_update_prices.php >> /var/log/prices.log 2>&1
```

Or call via HTTP:

```bash
curl "https://yourdomain.com/cron/update_prices.php?key=YOUR_CRON_KEY"
```

## Price Sources

| Asset Type | Source | Cost |
|------------|--------|------|
| Crypto | Binance Futures API | Free |
| Forex | open.er-api.com | Free |
| Stocks | Simulated (can use Finnhub) | Free |
| Commodities | Simulated | Free |
| Arab | Simulated | Free |
| Futures | Simulated | Free |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | Database host | localhost |
| DB_NAME | Database name | mex |
| DB_USER | Database user | root |
| DB_PASS | Database password | (empty) |
| EXCHANGERATE_API_KEY | exchangerate-api.com key | (optional) |
| FINNHUB_API_KEY | Finnhub API key | (optional) |
| ALPHA_VANTAGE_API_KEY | Alpha Vantage key | (optional) |
| CRON_KEY | Secret for cron HTTP calls | (optional) |

## License

MIT