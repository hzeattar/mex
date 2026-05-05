-- VertexPluse / المنصة
-- Project integrity + runtime repair patch
-- Safe for MySQL / MariaDB, intended to be run inside phpMyAdmin on the ALREADY selected database.
-- Focus:
--   1) mixed schema compatibility
--   2) market quote/runtime columns required by the current build
--   3) indexes for heavy runtime paths
--   4) funding/admin compatibility bits used by the current UI

SET @db := DATABASE();

-- =============================
-- settings bridge / compatibility
-- =============================
UPDATE settings
SET setting_key = COALESCE(NULLIF(setting_key,''), `key`),
    setting_value = CASE
      WHEN (setting_value IS NULL OR setting_value='') AND value IS NOT NULL THEN value
      ELSE setting_value
    END,
    value = CASE
      WHEN (value IS NULL OR value='') AND setting_value IS NOT NULL THEN setting_value
      ELSE value
    END,
    updated_at = CASE WHEN updated_at IS NULL THEN UNIX_TIMESTAMP() ELSE updated_at END;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='settings' AND index_name='idx_settings_setting_key'
);
SET @sql := IF(@c=0,
  'ALTER TABLE settings ADD KEY idx_settings_setting_key (setting_key)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='settings' AND index_name='idx_settings_key'
);
SET @sql := IF(@c=0,
  'ALTER TABLE settings ADD KEY idx_settings_key (`key`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================
-- markets / quotes runtime columns
-- =============================
SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='markets' AND column_name='tv_symbol'
);
SET @sql := IF(@c=0,
  'ALTER TABLE markets ADD COLUMN tv_symbol VARCHAR(120) NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='markets' AND column_name='seed_price'
);
SET @sql := IF(@c=0,
  'ALTER TABLE markets ADD COLUMN seed_price DECIMAL(20,8) NOT NULL DEFAULT 0 AFTER tv_symbol',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='markets' AND column_name='meta'
);
SET @sql := IF(@c=0,
  'ALTER TABLE markets ADD COLUMN meta LONGTEXT NULL AFTER seed_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='market_quotes' AND column_name='mark_price'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD COLUMN mark_price DECIMAL(20,8) NULL AFTER price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='market_quotes' AND column_name='index_price'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD COLUMN index_price DECIMAL(20,8) NULL AFTER mark_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='market_quotes' AND column_name='funding_rate'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD COLUMN funding_rate DECIMAL(20,12) NULL AFTER index_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='market_quotes' AND column_name='next_funding_time'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD COLUMN next_funding_time BIGINT NULL AFTER funding_rate',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='market_quotes' AND index_name='uq_market_quotes_symbol'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD UNIQUE KEY uq_market_quotes_symbol (symbol)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='market_quotes' AND index_name='idx_market_quotes_type_updated'
);
SET @sql := IF(@c=0,
  'ALTER TABLE market_quotes ADD KEY idx_market_quotes_type_updated (type,updated_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='markets' AND index_name='idx_markets_type_status_sort'
);
SET @sql := IF(@c=0,
  'ALTER TABLE markets ADD KEY idx_markets_type_status_sort (type,status,sort_order,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Useful tv_symbol normalization for common commodities.
UPDATE markets SET tv_symbol='OANDA:XAUUSD' WHERE type='commodities' AND UPPER(symbol) IN ('XAUUSD','GOLD') AND (tv_symbol IS NULL OR tv_symbol='');
UPDATE markets SET tv_symbol='OANDA:XAGUSD' WHERE type='commodities' AND UPPER(symbol) IN ('XAGUSD','SILVER') AND (tv_symbol IS NULL OR tv_symbol='');
UPDATE markets SET tv_symbol='TVC:USOIL'    WHERE type='commodities' AND UPPER(symbol) IN ('USOIL','WTI','OIL') AND (tv_symbol IS NULL OR tv_symbol='');
UPDATE markets SET tv_symbol='TVC:UKOIL'    WHERE type='commodities' AND UPPER(symbol) IN ('UKOIL','BRENT') AND (tv_symbol IS NULL OR tv_symbol='');

-- =============================
-- runtime-heavy indexes
-- =============================
SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='user_identities' AND index_name='idx_identity_provider_user'
);
SET @sql := IF(@c=0,
  'ALTER TABLE user_identities ADD KEY idx_identity_provider_user (provider,provider_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='wallets' AND index_name='idx_wallet_user_currency'
);
SET @sql := IF(@c=0,
  'ALTER TABLE wallets ADD KEY idx_wallet_user_currency (user_id,currency)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='deposits' AND index_name='idx_deposits_user_id_desc'
);
SET @sql := IF(@c=0,
  'ALTER TABLE deposits ADD KEY idx_deposits_user_id_desc (user_id,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='withdrawals' AND index_name='idx_withdrawals_user_id_desc'
);
SET @sql := IF(@c=0,
  'ALTER TABLE withdrawals ADD KEY idx_withdrawals_user_id_desc (user_id,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='support_tickets' AND index_name='idx_support_tickets_user_status_last'
);
SET @sql := IF(@c=0,
  'ALTER TABLE support_tickets ADD KEY idx_support_tickets_user_status_last (user_id,status,last_message_at,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='support_messages' AND index_name='idx_support_messages_ticket_created'
);
SET @sql := IF(@c=0,
  'ALTER TABLE support_messages ADD KEY idx_support_messages_ticket_created (ticket_id,id,created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='orders' AND index_name='idx_orders_user_status_symbol'
);
SET @sql := IF(@c=0,
  'ALTER TABLE orders ADD KEY idx_orders_user_status_symbol (user_id,status,symbol,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='positions' AND index_name='idx_positions_user_status_symbol'
);
SET @sql := IF(@c=0,
  'ALTER TABLE positions ADD KEY idx_positions_user_status_symbol (user_id,status,symbol,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================
-- funding/admin compatibility
-- =============================
SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='payment_methods' AND column_name='category_key'
);
SET @sql := IF(@c=0,
  'ALTER TABLE payment_methods ADD COLUMN category_key VARCHAR(64) NULL AFTER method_group',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE payment_methods
SET category_key = method_group
WHERE (category_key IS NULL OR category_key='')
  AND method_group IS NOT NULL
  AND method_group <> '';

CREATE TABLE IF NOT EXISTS funding_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(16) NOT NULL,
  key_slug VARCHAR(64) NOT NULL,
  label_en VARCHAR(120) NOT NULL,
  label_ar VARCHAR(120) NOT NULL,
  label_ru VARCHAR(120) NOT NULL,
  hint_en TEXT NULL,
  hint_ar TEXT NULL,
  hint_ru TEXT NULL,
  icon VARCHAR(32) NULL,
  image_url TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at INT NOT NULL DEFAULT 0,
  updated_at INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kind_key_slug (kind, key_slug),
  KEY idx_kind_status_sort (kind, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO funding_categories
(kind,key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,status,sort_order,created_at,updated_at)
VALUES
('deposit','crypto','Crypto','كريبتو','Крипто','Wallet and stablecoin routes','مسارات المحافظ والعملات المستقرة','Криптовалютные и stablecoin маршруты','₿','active',10,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('deposit','bank','Bank','بنك','Банк','Wire and local banking routes','مسارات التحويل البنكي والمحلي','Банковские и локальные переводы','🏦','active',20,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('deposit','card','Card','بطاقة','Карта','Visa, MasterCard, and card processors','فيزا وماستركارد ومعالجات البطاقات','Visa, MasterCard и карточные процессоры','💳','active',30,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('deposit','crypto_bot','Crypto Bot','بوت كريبتو','Крипто бот','Telegram-assisted checkout route','مسار إتمام عبر تيليجرام','Маршрут оплаты через Telegram','🤖','active',40,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('withdraw','crypto','Crypto','كريبتو','Крипто','Wallet payout routes','مسارات السحب إلى المحافظ','Маршруты вывода на кошельки','₿','active',10,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('withdraw','bank','Bank','بنك','Банк','Wire and local bank payouts','مسارات السحب البنكي والمحلي','Банковские выплаты','🏦','active',20,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('withdraw','card','Card','بطاقة','Карта','Card payout processors','معالجات السحب إلى البطاقات','Карточные выплаты','💳','active',30,UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('withdraw','crypto_bot','Crypto Bot','بوت كريبتو','Крипто бот','Telegram-assisted payout route','مسار سحب عبر تيليجرام','Маршрут вывода через Telegram','🤖','active',40,UNIX_TIMESTAMP(),UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  label_en = VALUES(label_en),
  label_ar = VALUES(label_ar),
  label_ru = VALUES(label_ru),
  hint_en = VALUES(hint_en),
  hint_ar = VALUES(hint_ar),
  hint_ru = VALUES(hint_ru),
  icon = VALUES(icon),
  status = VALUES(status),
  sort_order = VALUES(sort_order),
  updated_at = VALUES(updated_at);

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='admin_audit_logs' AND column_name='action'
);
SET @sql := IF(@c=0,
  'ALTER TABLE admin_audit_logs ADD COLUMN action VARCHAR(120) NULL AFTER admin_email',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='admin_audit_logs' AND column_name='entity'
);
SET @sql := IF(@c=0,
  'ALTER TABLE admin_audit_logs ADD COLUMN entity VARCHAR(80) NULL AFTER action',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1) FROM information_schema.columns
  WHERE table_schema=@db AND table_name='admin_audit_logs' AND column_name='ip'
);
SET @sql := IF(@c=0,
  "ALTER TABLE admin_audit_logs ADD COLUMN ip VARCHAR(64) NOT NULL DEFAULT '' AFTER payload_json",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='admin_audit_logs' AND index_name='idx_admin_audit_action'
);
SET @sql := IF(@c=0,
  'CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='admin_audit_logs' AND index_name='idx_admin_audit_entity'
);
SET @sql := IF(@c=0,
  'CREATE INDEX idx_admin_audit_entity ON admin_audit_logs(entity, entity_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE admin_audit_logs
SET action = COALESCE(NULLIF(action,''), action_key)
WHERE (action IS NULL OR action='') AND action_key IS NOT NULL AND action_key <> '';

UPDATE admin_audit_logs
SET entity = COALESCE(NULLIF(entity,''), entity_type)
WHERE (entity IS NULL OR entity='') AND entity_type IS NOT NULL AND entity_type <> '';

UPDATE admin_audit_logs
SET admin_email = COALESCE(NULLIF(admin_email,''), admin_actor)
WHERE (admin_email IS NULL OR admin_email='') AND admin_actor IS NOT NULL AND admin_actor <> '';

UPDATE admin_audit_logs
SET payload_json = COALESCE(NULLIF(payload_json,''), meta_json)
WHERE (payload_json IS NULL OR payload_json='') AND meta_json IS NOT NULL AND meta_json <> '';

UPDATE admin_audit_logs
SET ip = COALESCE(NULLIF(ip,''), ip_address)
WHERE (ip IS NULL OR ip='') AND ip_address IS NOT NULL AND ip_address <> '';
