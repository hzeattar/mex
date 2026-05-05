-- Extracted MySQL schema from public_html/api/lib/schema.php

-- Project: TradoxPlus Mini App

-- Note: This is the install/base schema. upgrade.php may apply additional ALTER statements on existing deployments.


-- Table: users
CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      tg_id VARCHAR(32) NULL,
      telegram_chat_id VARCHAR(32) NULL,
      username VARCHAR(64) NULL,
      first_name VARCHAR(128) NULL,
      last_name VARCHAR(128) NULL,
      locale VARCHAR(8) NOT NULL DEFAULT 'en',
      support_locale VARCHAR(8) NULL DEFAULT NULL,
      max_leverage INT NULL DEFAULT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_tg_id (tg_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: bot_states
CREATE TABLE IF NOT EXISTS bot_states (
      chat_id VARCHAR(32) PRIMARY KEY,
      tg_user_id VARCHAR(32) NULL,
      state VARCHAR(32) NOT NULL,
      data JSON NULL,
      updated_at INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            tg_id VARCHAR(32) NULL,
            chat_id VARCHAR(32) NULL,
            lang VARCHAR(8) NOT NULL DEFAULT 'en',
            reason_code VARCHAR(24) NOT NULL DEFAULT 'other',
            agent_username VARCHAR(64) NULL,
            agent_tg_id VARCHAR(32) NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'open',
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            KEY idx_user (user_id),
            KEY idx_status (status),
            KEY idx_agent (agent_tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: support_messages
CREATE TABLE IF NOT EXISTS support_messages (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            ticket_id BIGINT UNSIGNED NOT NULL,
            sender VARCHAR(16) NOT NULL,
            sender_tg_id VARCHAR(32) NULL,
            msg_type VARCHAR(16) NOT NULL DEFAULT 'text',
            content MEDIUMTEXT NULL,
            created_at INT NOT NULL DEFAULT 0,
            KEY idx_ticket (ticket_id),
            KEY idx_sender (sender_tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: api_tokens
CREATE TABLE IF NOT EXISTS api_tokens (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      name VARCHAR(64) NOT NULL DEFAULT 'miniapp',
      last_used_at INT NULL,
      created_at INT NOT NULL,
      UNIQUE KEY uniq_token_hash (token_hash),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: wallets
CREATE TABLE IF NOT EXISTS wallets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      balance_cache DECIMAL(20,8) NOT NULL DEFAULT 0,
      available_cache DECIMAL(20,8) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL,
      UNIQUE KEY uniq_user_currency (user_id, currency),
      KEY idx_user_id (user_id),
      CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: ledger_entries
CREATE TABLE IF NOT EXISTS ledger_entries (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      wallet_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      type VARCHAR(32) NOT NULL,
      ref_type VARCHAR(32) NULL,
      ref_id VARCHAR(64) NULL,
      metadata JSON NULL,
      created_at INT NOT NULL,
      KEY idx_wallet (wallet_id),
      KEY idx_user (user_id),
      KEY idx_created (created_at),
      CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: holds
CREATE TABLE IF NOT EXISTS holds (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      wallet_id BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      reason VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      expires_at INT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_wallet (wallet_id),
      KEY idx_user (user_id),
      CONSTRAINT fk_holds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_holds_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: idempotency_keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      idem_key VARCHAR(128) NOT NULL,
      scope VARCHAR(64) NOT NULL,
      request_hash CHAR(64) NOT NULL,
      response_body MEDIUMTEXT NULL,
      created_at INT NOT NULL,
      expires_at INT NOT NULL,
      UNIQUE KEY uniq_idem (user_id, idem_key, scope),
      KEY idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
      flag_key VARCHAR(64) PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      kind VARCHAR(16) NOT NULL,
      code VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL DEFAULT 'dummy',
      currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
      title_en VARCHAR(120) NOT NULL,
      title_ar VARCHAR(120) NOT NULL,
      title_ru VARCHAR(120) NOT NULL,
      desc_en TEXT NULL,
      desc_ar TEXT NULL,
      desc_ru TEXT NULL,
      image_url TEXT NULL,
      instructions_en TEXT NULL,
      instructions_ar TEXT NULL,
      instructions_ru TEXT NULL,
      min_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      max_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_kind_code (kind, code),
      KEY idx_kind_status (kind, status),
      KEY idx_currency (currency)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: payment_method_countries
CREATE TABLE IF NOT EXISTS payment_method_countries (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      method_id BIGINT UNSIGNED NOT NULL,
      country_code VARCHAR(16) NOT NULL,
      created_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_method_country (method_id, country_code),
      KEY idx_country (country_code),
      KEY idx_method (method_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: deposits
CREATE TABLE IF NOT EXISTS deposits (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(32) NOT NULL,
      method_code VARCHAR(64) NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      status VARCHAR(16) NOT NULL,
      external_ref TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      confirmed_at INT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      method VARCHAR(32) NOT NULL,
      currency VARCHAR(16) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      status VARCHAR(16) NOT NULL,
      destination_enc MEDIUMTEXT NOT NULL,
      hold_id BIGINT UNSIGNED NULL,
      risk_score INT NOT NULL DEFAULT 0,
      admin_note TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      completed_at INT NULL,
      KEY idx_user (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: markets
CREATE TABLE IF NOT EXISTS markets (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      name VARCHAR(128) NULL,
      type VARCHAR(16) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      meta JSON NULL,
      tv_symbol VARCHAR(64) NULL,
      seed_price DECIMAL(20,8) NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_symbol (symbol),
      KEY idx_type (type),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: market_quotes
CREATE TABLE IF NOT EXISTS market_quotes (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      type VARCHAR(16) NOT NULL,
      price DECIMAL(20,8) NOT NULL DEFAULT 0,
      change_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_symbol (symbol),
      KEY idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: market_ticks
CREATE TABLE IF NOT EXISTS market_ticks (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      price DECIMAL(20,8) NOT NULL DEFAULT 0,
      volume DECIMAL(20,8) NULL,
      ts INT NOT NULL,
      KEY idx_symbol_ts (symbol, ts)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: trading_signals
CREATE TABLE IF NOT EXISTS trading_signals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      market_symbol VARCHAR(32) NOT NULL,
      market_type VARCHAR(16) NOT NULL,
      timeframe VARCHAR(16) NULL,
      direction VARCHAR(8) NOT NULL,
      entry_price DECIMAL(20,8) NULL,
      stop_loss DECIMAL(20,8) NULL,
      take_profit_1 DECIMAL(20,8) NULL,
      take_profit_2 DECIMAL(20,8) NULL,
      confidence INT NOT NULL DEFAULT 50,
      source VARCHAR(32) NULL,
      raw_payload JSON NULL,
      note_en TEXT NULL,
      note_ar TEXT NULL,
      note_ru TEXT NULL,
      bot_enabled TINYINT(1) NOT NULL DEFAULT 0,
      bot_name_en VARCHAR(128) NULL,
      bot_name_ar VARCHAR(128) NULL,
      bot_name_ru VARCHAR(128) NULL,
      bot_brief_en TEXT NULL,
      bot_brief_ar TEXT NULL,
      bot_brief_ru TEXT NULL,
      copy_min_amount DECIMAL(20,8) NOT NULL DEFAULT 100,
      copy_lock_days INT NOT NULL DEFAULT 7,
      copy_profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      copy_leverage INT NOT NULL DEFAULT 1,
      show_on_home TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      valid_until INT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_symbol (market_symbol),
      KEY idx_type (market_type),
      KEY idx_status (status),
      KEY idx_bot_enabled (bot_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: trading_bot_subscriptions
CREATE TABLE IF NOT EXISTS trading_bot_subscriptions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      signal_id BIGINT UNSIGNED NOT NULL,
      mode VARCHAR(16) NOT NULL DEFAULT 'real',
      currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
      reserved_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      hold_id BIGINT UNSIGNED NULL,
      lock_until INT NULL,
      profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      leverage INT NOT NULL DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      copied_position_id BIGINT UNSIGNED NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_tbs_user_status (user_id, status),
      KEY idx_tbs_signal_status (signal_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: trading_bot_commissions
CREATE TABLE IF NOT EXISTS trading_bot_commissions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      subscription_id BIGINT UNSIGNED NULL,
      signal_id BIGINT UNSIGNED NULL,
      position_id BIGINT UNSIGNED NULL,
      pnl_gross DECIMAL(20,8) NOT NULL DEFAULT 0,
      share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_tbc_user (user_id),
      KEY idx_tbc_subscription (subscription_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      symbol VARCHAR(32) NOT NULL,
      asset_type VARCHAR(16) NOT NULL,
      market_type VARCHAR(16) NOT NULL DEFAULT 'spot',
      side VARCHAR(8) NOT NULL,
      order_type VARCHAR(16) NOT NULL,
      qty DECIMAL(20,8) NOT NULL,
      limit_price DECIMAL(20,8) NULL,
      fill_price DECIMAL(20,8) NULL,
      usd_amount DECIMAL(20,8) NULL,
      tp_price DECIMAL(20,8) NULL,
      sl_price DECIMAL(20,8) NULL,
      leverage INT NOT NULL DEFAULT 1,
      reduce_only TINYINT(1) NOT NULL DEFAULT 0,
      client_order_id VARCHAR(64) NULL,
      position_id BIGINT UNSIGNED NULL,
      pnl_usd DECIMAL(20,8) NULL,
      close_reason VARCHAR(16) NULL,
      closed_at INT NULL,
      fee_paid DECIMAL(20,8) NOT NULL DEFAULT 0,
      meta JSON NULL,
      updated_at INT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL,
      created_at INT NOT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: positions
CREATE TABLE IF NOT EXISTS positions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      symbol VARCHAR(32) NOT NULL,
      asset_type VARCHAR(16) NOT NULL,
      market_type VARCHAR(16) NOT NULL DEFAULT 'spot',
      side VARCHAR(8) NOT NULL,
      qty DECIMAL(20,8) NOT NULL,
      entry_price DECIMAL(20,8) NOT NULL,
      leverage INT NOT NULL DEFAULT 1,
      margin_mode VARCHAR(16) NOT NULL DEFAULT 'isolated',
      margin_initial DECIMAL(20,8) NOT NULL DEFAULT 0,
      liquidation_price DECIMAL(20,8) NULL,
      tp_price DECIMAL(20,8) NULL,
      sl_price DECIMAL(20,8) NULL,
      unrealized_pnl_usd DECIMAL(20,8) NOT NULL DEFAULT 0,
      fees_paid DECIMAL(20,8) NOT NULL DEFAULT 0,
      funding_accrued DECIMAL(20,8) NOT NULL DEFAULT 0,
      last_funding_at INT NULL,
      source_signal_id BIGINT UNSIGNED NULL,
      copy_subscription_id BIGINT UNSIGNED NULL,
      copy_profit_share_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      copied_from_admin TINYINT(1) NOT NULL DEFAULT 0,
      opened_at INT NOT NULL,
      updated_at INT NULL,
      closed_at INT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'open',
      KEY idx_pos_user_status (user_id, status),
      KEY idx_pos_user_symbol (user_id, symbol, market_type, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: orderbook_snapshots
CREATE TABLE IF NOT EXISTS orderbook_snapshots (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      symbol VARCHAR(32) NOT NULL,
      bids MEDIUMTEXT NULL,
      asks MEDIUMTEXT NULL,
      source VARCHAR(16) NOT NULL DEFAULT 'binance',
      updated_at INT NOT NULL,
      KEY idx_symbol (symbol),
      KEY idx_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: invest_plans
CREATE TABLE IF NOT EXISTS invest_plans (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      name_en VARCHAR(128) NULL,
      name_ar VARCHAR(128) NULL,
      name_ru VARCHAR(128) NULL,
      desc_en TEXT NULL,
      desc_ar TEXT NULL,
      desc_ru TEXT NULL,
      details_en MEDIUMTEXT NULL,
      details_ar MEDIUMTEXT NULL,
      details_ru MEDIUMTEXT NULL,
      term_days INT NOT NULL,
      roi_percent DECIMAL(10,4) NOT NULL,
      min_amount DECIMAL(20,8) NOT NULL,
      max_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
      risk VARCHAR(32) NOT NULL,
      payout_schedule VARCHAR(16) NOT NULL DEFAULT 'end',
      early_exit_allowed TINYINT(1) NOT NULL DEFAULT 0,
      early_exit_penalty_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at INT NULL,
      updated_at INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: investments
CREATE TABLE IF NOT EXISTS investments (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      plan_id VARCHAR(64) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      expected_return DECIMAL(20,8) NOT NULL,
      debit_ledger_id BIGINT UNSIGNED NULL,
      payout_ledger_id BIGINT UNSIGNED NULL,
      payout_schedule VARCHAR(16) NOT NULL DEFAULT 'end',
      last_accrual_at INT NULL,
      paid_total DECIMAL(20,8) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL,
      start_at INT NOT NULL,
      end_at INT NOT NULL,
      created_at INT NOT NULL,
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: investment_accruals
CREATE TABLE IF NOT EXISTS investment_accruals (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      investment_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      ledger_id BIGINT UNSIGNED NULL,
      run_at INT NOT NULL,
      created_at INT NOT NULL,
      UNIQUE KEY uq_inv_run (investment_id, run_at),
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: tg_sessions
CREATE TABLE IF NOT EXISTS tg_sessions (
        user_id BIGINT PRIMARY KEY,
        last_auth_date BIGINT NOT NULL DEFAULT 0,
        last_hash VARCHAR(128) NULL,
        updated_at BIGINT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(64) PRIMARY KEY,
      setting_value LONGTEXT NULL,
      updated_at INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: kyc_requests
CREATE TABLE IF NOT EXISTS kyc_requests (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      full_name VARCHAR(200) NULL,
      country VARCHAR(80) NULL,
      doc_type VARCHAR(40) NULL,
      doc_number VARCHAR(120) NULL,
      front_path VARCHAR(255) NULL,
      back_path VARCHAR(255) NULL,
      selfie_path VARCHAR(255) NULL,
      admin_note TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_user (user_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: managers
CREATE TABLE IF NOT EXISTS managers (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            tg_id VARCHAR(32) NOT NULL,
            username VARCHAR(64) NULL,
            first_name VARCHAR(128) NULL,
            last_name VARCHAR(128) NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            created_at INT NOT NULL DEFAULT 0,
            updated_at INT NOT NULL DEFAULT 0,
            approved_at INT NULL,
            UNIQUE KEY uniq_mgr_tg (tg_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: manager_invites
CREATE TABLE IF NOT EXISTS manager_invites (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            manager_id BIGINT UNSIGNED NOT NULL,
            code VARCHAR(32) NOT NULL,
            created_at INT NOT NULL DEFAULT 0,
            revoked_at INT NULL,
            UNIQUE KEY uniq_inv_code (code),
            KEY idx_inv_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: user_referrals
CREATE TABLE IF NOT EXISTS user_referrals (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            manager_id BIGINT UNSIGNED NOT NULL,
            invite_id BIGINT UNSIGNED NULL,
            bound_at INT NOT NULL DEFAULT 0,
            source VARCHAR(32) NULL,
            UNIQUE KEY uniq_ref_user (user_id),
            KEY idx_ref_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: device_referrals
CREATE TABLE IF NOT EXISTS device_referrals (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            device_id VARCHAR(64) NOT NULL,
            manager_id BIGINT UNSIGNED NOT NULL,
            first_user_id BIGINT UNSIGNED NOT NULL,
            bound_at INT NOT NULL DEFAULT 0,
            UNIQUE KEY uniq_device (device_id),
            KEY idx_device_mgr (manager_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: bot_states_aff
CREATE TABLE IF NOT EXISTS bot_states_aff (
            chat_id VARCHAR(32) PRIMARY KEY,
            tg_user_id VARCHAR(32) NULL,
            state VARCHAR(32) NOT NULL,
            data JSON NULL,
            updated_at INT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Optional performance indexes from db/add_indexes_if_missing.sql

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
