-- VertexPluse final review: runtime compatibility + performance indexes
SET @db := DATABASE();

-- Keep legacy and modern settings columns mirrored where possible.
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

-- settings(setting_key)
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

-- settings(key)
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

-- user_identities(provider, provider_user_id)
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

-- wallets(user_id,currency)
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

-- deposits(user_id,id)
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

-- withdrawals(user_id,id)
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

-- support_tickets(user_id,status,last_message_at,id)
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

-- support_messages(ticket_id,id,created_at)
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

-- orders(user_id,status,symbol,id)
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

-- positions(user_id,status,symbol,id)
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

-- payment_methods(kind,status,currency,sort_order,id)
SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='payment_methods' AND index_name='idx_payment_methods_kind_status_currency_sort'
);
SET @sql := IF(@c=0,
  'ALTER TABLE payment_methods ADD KEY idx_payment_methods_kind_status_currency_sort (kind,status,currency,sort_order,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- funding_categories(kind,status,sort_order,id)
SET @c := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema=@db AND table_name='funding_categories' AND index_name='idx_funding_categories_kind_status_sort'
);
SET @sql := IF(@c=0,
  'ALTER TABLE funding_categories ADD KEY idx_funding_categories_kind_status_sort (kind,status,sort_order,id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
