-- v38: align precious spot metals with Massive forex feed and clear stale cached quotes

UPDATE markets
SET meta = JSON_SET(
  COALESCE(NULLIF(meta, ''), JSON_OBJECT()),
  '$.polygon_ticker', 'C:XAUUSD'
), updated_at = UNIX_TIMESTAMP()
WHERE symbol = 'XAUUSD' AND type = 'commodities';

UPDATE markets
SET meta = JSON_SET(
  COALESCE(NULLIF(meta, ''), JSON_OBJECT()),
  '$.polygon_ticker', 'C:XAGUSD'
), updated_at = UNIX_TIMESTAMP()
WHERE symbol = 'XAGUSD' AND type = 'commodities';

UPDATE markets
SET meta = JSON_REMOVE(
  COALESCE(NULLIF(meta, ''), JSON_OBJECT()),
  '$.force_live_source',
  '$.history_source'
), updated_at = UNIX_TIMESTAMP()
WHERE symbol IN ('XAUUSD','XAGUSD') AND type = 'commodities';

DELETE FROM market_quotes
WHERE symbol IN ('XAUUSD','XAGUSD','USOIL','UKOIL','NGAS','COPPER','WTI','BRENT','OIL');
