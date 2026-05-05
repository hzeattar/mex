-- PHASE109: market_quotes authority cleanup
-- Run this in phpMyAdmin on the production database BEFORE deploying the code,
-- or immediately after deployment if the site is in maintenance mode.

START TRANSACTION;

-- 1) Normalize stored quote types against markets metadata.
UPDATE market_quotes mq
JOIN markets m ON m.symbol = mq.symbol
SET mq.type = (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END)
WHERE mq.type <> (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END);

-- 2) Remove poisoned fallback rows that have no trustworthy timestamp.
DELETE mq
FROM market_quotes mq
LEFT JOIN markets m ON m.symbol = mq.symbol
WHERE mq.updated_at <= 0
  AND LOWER(COALESCE(mq.source,'')) IN ('seed','seed_fallback','seed_price','cache','stale_cache','chart_seed','seed_candle','synthetic','aggs')
  AND LOWER(COALESCE(mq.type,'')) <> 'crypto';

-- 3) Drop the old symbol-only unique keys if they exist.
SET @drop1 := (
  SELECT IF(COUNT(*)>0, 'ALTER TABLE market_quotes DROP INDEX uniq_symbol', 'SELECT 1')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'market_quotes' AND index_name = 'uniq_symbol'
);
PREPARE stmt FROM @drop1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @drop2 := (
  SELECT IF(COUNT(*)>0, 'ALTER TABLE market_quotes DROP INDEX uq_market_quotes_symbol', 'SELECT 1')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'market_quotes' AND index_name = 'uq_market_quotes_symbol'
);
PREPARE stmt FROM @drop2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Add the correct composite unique key if missing.
SET @addComposite := (
  SELECT IF(COUNT(*)=0,
    'ALTER TABLE market_quotes ADD UNIQUE KEY uq_market_quotes_symbol_type (symbol, type)',
    'SELECT 1')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'market_quotes' AND index_name = 'uq_market_quotes_symbol_type'
);
PREPARE stmt FROM @addComposite; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Helpful indexes for fresh reads.
SET @addIdx1 := (
  SELECT IF(COUNT(*)=0,
    'ALTER TABLE market_quotes ADD KEY idx_mq_symbol_type_updated (symbol, type, updated_at)',
    'SELECT 1')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'market_quotes' AND index_name = 'idx_mq_symbol_type_updated'
);
PREPARE stmt FROM @addIdx1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
