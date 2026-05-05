-- v41 DB cleanup for price-source mismatches
-- Run in phpMyAdmin on the production database.

SET @now := UNIX_TIMESTAMP();

INSERT INTO markets (symbol, name, type, status, sort_order, tv_symbol, seed_price, created_at, updated_at)
VALUES
('XAUUSD','Gold Spot','commodities','active',10,'OANDA:XAUUSD',4495.00,@now,@now),
('XAGUSD','Silver Spot','commodities','active',12,'OANDA:XAGUSD',69.00,@now,@now),
('USOIL','WTI Crude Oil','commodities','active',14,'TVC:USOIL',68.00,@now,@now),
('EURUSD','EUR/USD','forex','active',10,'OANDA:EURUSD',1.10,@now,@now),
('AAPL','Apple Inc.','stocks','active',10,'NASDAQ:AAPL',180.00,@now,@now)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  type=VALUES(type),
  status='active',
  tv_symbol=VALUES(tv_symbol),
  updated_at=@now;

UPDATE markets
SET type='commodities',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'yahoo_ticker','XAUUSD=X',
      'history_source','yahoo',
      'force_live_source','yahoo'
    )),
    tv_symbol='OANDA:XAUUSD',
    updated_at=@now
WHERE symbol='XAUUSD';

UPDATE markets
SET type='commodities',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'yahoo_ticker','XAGUSD=X',
      'history_source','yahoo',
      'force_live_source','yahoo'
    )),
    tv_symbol='OANDA:XAGUSD',
    updated_at=@now
WHERE symbol='XAGUSD';

UPDATE markets
SET type='commodities',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'yahoo_ticker','CL=F',
      'history_source','yahoo',
      'force_live_source','yahoo'
    )),
    updated_at=@now
WHERE symbol IN ('USOIL','WTI','OIL');

UPDATE markets
SET type='commodities',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'yahoo_ticker','BZ=F',
      'history_source','yahoo',
      'force_live_source','yahoo'
    )),
    updated_at=@now
WHERE symbol IN ('UKOIL','BRENT');

UPDATE markets
SET type='commodities',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'yahoo_ticker','NG=F',
      'history_source','yahoo',
      'force_live_source','yahoo'
    )),
    updated_at=@now
WHERE symbol='NGAS';

UPDATE markets
SET type='forex',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'polygon_ticker','C:EURUSD',
      'yahoo_ticker','EURUSD=X',
      'history_source','massive',
      'force_live_source','massive'
    )),
    tv_symbol='OANDA:EURUSD',
    updated_at=@now
WHERE symbol='EURUSD';

UPDATE markets
SET type='stocks',
    status='active',
    meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), JSON_OBJECT(
      'polygon_ticker','AAPL',
      'yahoo_ticker','AAPL',
      'history_source','massive',
      'force_live_source','massive'
    )),
    tv_symbol='NASDAQ:AAPL',
    updated_at=@now
WHERE symbol='AAPL';

DELETE FROM market_quotes WHERE symbol IN ('XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','EURUSD','AAPL');
DELETE FROM market_ticks  WHERE symbol IN ('XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','EURUSD','AAPL');
DELETE FROM market_ticks WHERE ts < UNIX_TIMESTAMP() - (14 * 86400);

SELECT symbol, type, status, tv_symbol, seed_price, meta
FROM markets
WHERE symbol IN ('XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','EURUSD','AAPL')
ORDER BY FIELD(symbol,'XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','EURUSD','AAPL');

SELECT symbol, type, price, change_pct, updated_at
FROM market_quotes
WHERE symbol IN ('XAUUSD','XAGUSD','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','EURUSD','AAPL')
ORDER BY updated_at DESC;
