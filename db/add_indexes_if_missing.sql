-- Optional: add helpful indexes (safe to run multiple times)

SET @db := DATABASE();

-- markets: (type,status,sort_order,id)
SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='markets' AND index_name='idx_type_status_sort'
);
SET @sql := IF(@c=0,
  'ALTER TABLE markets ADD KEY idx_type_status_sort (type,status,sort_order,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- market_quotes: (type,updated_at)
SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='market_quotes' AND index_name='idx_type_updated'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD KEY idx_type_updated (type,updated_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
