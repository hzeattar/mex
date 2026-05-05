-- Markets / Trade / Chart audit SQL
-- Review before executing in production.

-- 1) Check for orphan quote rows
SELECT q.symbol, q.type, q.updated_at
FROM market_quotes q
LEFT JOIN markets m ON m.symbol = q.symbol
WHERE m.symbol IS NULL;

-- 2) Check for orphan ticks
SELECT t.symbol, COUNT(*) AS ticks_count
FROM market_ticks t
LEFT JOIN markets m ON m.symbol = t.symbol
WHERE m.symbol IS NULL
GROUP BY t.symbol;

-- 3) Check stale quote rows that should not drive trading
SELECT symbol, type, price, updated_at, FROM_UNIXTIME(updated_at) AS updated_at_utc
FROM market_quotes
WHERE updated_at < UNIX_TIMESTAMP() - 120
ORDER BY updated_at ASC
LIMIT 200;

-- 4) Optional cleanup for orphan ticks
-- DELETE t FROM market_ticks t LEFT JOIN markets m ON m.symbol = t.symbol WHERE m.symbol IS NULL;

-- 5) Optional cleanup for orphan quote rows
-- DELETE q FROM market_quotes q LEFT JOIN markets m ON m.symbol = q.symbol WHERE m.symbol IS NULL;

-- 6) Helpful index audit (market_ticks already has idx_symbol_ts / idx_ts in the supplied schema dump)
-- market_ticks schema reference came from the uploaded SQL dump.
