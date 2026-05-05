-- v39: clear old wrong precious-metal routing/caches influence
-- MySQL-safe cleanup for XAUUSD / XAGUSD.

UPDATE market_quotes
SET price = 0,
    change_pct = 0,
    mark_price = NULL,
    index_price = NULL,
    funding_rate = NULL,
    next_funding_time = NULL,
    updated_at = UNIX_TIMESTAMP()
WHERE symbol IN ('XAUUSD','XAGUSD','XPTUSD','XPDUSD');

-- If meta is valid JSON, remove old massive-routing keys and pin Yahoo spot.
UPDATE markets
SET meta = CASE
  WHEN JSON_VALID(meta) THEN
    CASE symbol
      WHEN 'XAUUSD' THEN JSON_SET(JSON_REMOVE(CAST(meta AS JSON), '$.polygon_ticker', '$.force_live_source', '$.history_source'), '$.yahoo_ticker', 'XAUUSD=X')
      WHEN 'XAGUSD' THEN JSON_SET(JSON_REMOVE(CAST(meta AS JSON), '$.polygon_ticker', '$.force_live_source', '$.history_source'), '$.yahoo_ticker', 'XAGUSD=X')
      WHEN 'XPTUSD' THEN JSON_SET(JSON_REMOVE(CAST(meta AS JSON), '$.polygon_ticker', '$.force_live_source', '$.history_source'), '$.yahoo_ticker', 'XPTUSD=X')
      WHEN 'XPDUSD' THEN JSON_SET(JSON_REMOVE(CAST(meta AS JSON), '$.polygon_ticker', '$.force_live_source', '$.history_source'), '$.yahoo_ticker', 'XPDUSD=X')
      ELSE CAST(meta AS JSON)
    END
  ELSE
    CASE symbol
      WHEN 'XAUUSD' THEN '{"yahoo_ticker":"XAUUSD=X"}'
      WHEN 'XAGUSD' THEN '{"yahoo_ticker":"XAGUSD=X"}'
      WHEN 'XPTUSD' THEN '{"yahoo_ticker":"XPTUSD=X"}'
      WHEN 'XPDUSD' THEN '{"yahoo_ticker":"XPDUSD=X"}'
      ELSE meta
    END
END
WHERE symbol IN ('XAUUSD','XAGUSD','XPTUSD','XPDUSD');
