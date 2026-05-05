-- v35 cleanup: clear stale forex/commodity quotes and old candle caches after live-source reconciliation
-- Run the SQL part in phpMyAdmin, then clear the candle/cache files from the filesystem.

DELETE FROM market_quotes
WHERE symbol IN (
  'XAUUSD','XAGUSD','PLAT','PALL','COPPER','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','GAS',
  'GASOLINE','HEATOIL','ALUMINUM','CORN','WHEAT','SOY','SUGAR','COFFEE','COTTON','COCOA','RICE',
  'OAT','ORANGE','LUMBER','CATTLE','HOGS','GLD','SLV','URANIUM','COAL','FERT','WATER',
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD','EURJPY','GBPJPY'
);

UPDATE markets
SET meta = JSON_REMOVE(COALESCE(meta,'{}'), '$.polygon_ticker')
WHERE type='commodities'
  AND symbol IN ('XAUUSD','XAGUSD','PLAT','PALL','COPPER','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','GAS','GASOLINE','HEATOIL','ALUMINUM');
