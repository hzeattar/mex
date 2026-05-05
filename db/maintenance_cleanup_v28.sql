-- Optional maintenance cleanup after deploying v28
-- Run in phpMyAdmin on the selected database.

-- 1) Remove orphan quotes for symbols no longer present in markets
DELETE q
FROM market_quotes q
LEFT JOIN markets m ON m.symbol = q.symbol
WHERE m.symbol IS NULL;

-- 2) Remove cached quotes for unsupported commodities that should not be displayed/runtime-priced
DELETE FROM market_quotes
WHERE symbol IN (
  'NICKEL','ZINC','LEAD','TIN','IRON','ETHANOL','POTASH','RUBBER','PALMOIL','OLIVEOIL','MILK','CHEESE','BUTTER','SILK','WOOL','PAPER'
);

-- 3) Clear obviously synthetic fallback prices for non-crypto markets so the next quote refresh repopulates them from upstream
DELETE q FROM market_quotes q
JOIN markets m ON m.symbol = q.symbol
WHERE m.type IN ('forex','stocks','commodities')
  AND (
    (m.type = 'forex' AND q.price = 1.0)
    OR (m.type = 'stocks' AND q.price = 100.0)
    OR (m.type = 'commodities' AND q.price = 50.0)
  );

-- 4) Normalize NULL change values
UPDATE market_quotes SET change_pct = 0 WHERE change_pct IS NULL;
