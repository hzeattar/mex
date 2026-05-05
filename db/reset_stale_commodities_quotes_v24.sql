DELETE q FROM market_quotes q
JOIN markets m ON m.symbol = q.symbol
WHERE m.type = 'commodities';
