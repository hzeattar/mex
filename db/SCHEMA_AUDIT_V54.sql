-- Verify the critical schema/data needed by v54.

SHOW COLUMNS FROM markets;
SHOW COLUMNS FROM market_quotes;
SHOW COLUMNS FROM market_ticks;
SHOW COLUMNS FROM news_articles;
SHOW COLUMNS FROM news_article_votes;

SHOW INDEX FROM markets;
SHOW INDEX FROM market_quotes;
SHOW INDEX FROM market_ticks;
SHOW INDEX FROM news_articles;
SHOW INDEX FROM news_article_votes;

SELECT m.symbol, m.type, q.price, q.change_pct, q.updated_at,
       JSON_EXTRACT(m.meta, '$.force_live_source') AS force_live_source,
       JSON_EXTRACT(m.meta, '$.history_source') AS history_source,
       JSON_EXTRACT(m.meta, '$.polygon_ticker') AS polygon_ticker,
       JSON_EXTRACT(m.meta, '$.yahoo_ticker') AS yahoo_ticker
FROM markets m
LEFT JOIN market_quotes q ON q.symbol = m.symbol
WHERE m.symbol IN ('BTCUSDT','XAUUSD','XAGUSD','EURUSD','USOIL','AAPL')
ORDER BY FIELD(m.symbol,'BTCUSDT','XAUUSD','XAGUSD','EURUSD','USOIL','AAPL');

SELECT symbol, COUNT(*) AS ticks_count,
       FROM_UNIXTIME(MIN(ts)) AS first_tick,
       FROM_UNIXTIME(MAX(ts)) AS last_tick
FROM market_ticks
WHERE symbol IN ('BTCUSDT','XAUUSD','XAGUSD','EURUSD','USOIL','AAPL')
GROUP BY symbol
ORDER BY symbol;
