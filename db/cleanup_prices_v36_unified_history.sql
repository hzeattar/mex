-- v36: remove stale commodity/forex quotes and disable legacy commodity polygon_ticker mappings.
START TRANSACTION;
DELETE FROM market_quotes
WHERE symbol IN (
  'XAUUSD','XAGUSD','PLAT','PALL','COPPER','USOIL','WTI','OIL','UKOIL','BRENT','NGAS','GAS',
  'GASOLINE','HEATOIL','ALUMINUM','CORN','WHEAT','SOY','SUGAR','COFFEE','COTTON','COCOA','RICE',
  'OAT','ORANGE','LUMBER','CATTLE','HOGS',
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD','EURJPY','GBPJPY'
);
UPDATE markets
SET meta = JSON_REMOVE(COALESCE(meta,'{}'), '$.polygon_ticker')
WHERE type='commodities';
UPDATE markets
SET meta = JSON_SET(
  JSON_REMOVE(COALESCE(meta,'{}'), '$.polygon_ticker'),
  '$.history_source', 'yahoo',
  '$.force_live_source', 'yahoo'
)
WHERE type='commodities';
COMMIT;
