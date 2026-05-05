-- MEX Trading Platform - Core Database Schema
-- Simplified for Railway deployment

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL DEFAULT '',
    `phone` VARCHAR(50) DEFAULT NULL,
    `country` VARCHAR(10) DEFAULT NULL,
    `role` ENUM('user', 'admin', 'manager') DEFAULT 'user',
    `status` ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `refresh_token` VARCHAR(255) DEFAULT NULL,
    `device` VARCHAR(255) DEFAULT NULL,
    `ip_address` VARCHAR(50) DEFAULT NULL,
    `expires_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_token` (`token`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallets table
CREATE TABLE IF NOT EXISTS `wallets` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `currency` VARCHAR(20) NOT NULL,
    `balance` DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    `hold` DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_user_currency` (`user_id`, `currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Markets table
CREATE TABLE IF NOT EXISTS `markets` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(32) NOT NULL,
    `name` VARCHAR(255) NOT NULL DEFAULT '',
    `type` ENUM('crypto', 'forex', 'stocks', 'commodities', 'arab', 'futures') NOT NULL,
    `seed_price` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `price` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `change_pct` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    `source` VARCHAR(32) DEFAULT 'binance',
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_symbol` (`symbol`),
    KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trades table
CREATE TABLE IF NOT EXISTS `trades` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `symbol` VARCHAR(32) NOT NULL,
    `type` ENUM('buy', 'sell') NOT NULL,
    `side` ENUM('long', 'short') NOT NULL,
    `amount` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `entry_price` DECIMAL(20,8) NOT NULL,
    `current_price` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `leverage` INT NOT NULL DEFAULT 1,
    `liquidation_price` DECIMAL(20,8) DEFAULT NULL,
    `pnl` DECIMAL(20,8) DEFAULT 0,
    `pnl_pct` DECIMAL(10,4) DEFAULT 0,
    `status` ENUM('open', 'closed', 'liquidated') DEFAULT 'open',
    `opened_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `closed_at` INT UNSIGNED DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deposits table
CREATE TABLE IF NOT EXISTS `deposits` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `currency` VARCHAR(20) NOT NULL DEFAULT 'USDT',
    `method` VARCHAR(50) NOT NULL,
    `proof` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `notes` TEXT DEFAULT NULL,
    `created_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Withdrawals table
CREATE TABLE IF NOT EXISTS `withdrawals` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `currency` VARCHAR(20) NOT NULL DEFAULT 'USDT',
    `method` VARCHAR(50) NOT NULL,
    `wallet_address` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `notes` TEXT DEFAULT NULL,
    `created_at` INT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market quotes (for live prices cache)
CREATE TABLE IF NOT EXISTS `market_quotes` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `market` VARCHAR(64) NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `provider` VARCHAR(64) DEFAULT 'binance',
    `price` DECIMAL(20,8) NOT NULL DEFAULT 0,
    `change_pct` DECIMAL(10,4) NOT NULL DEFAULT 0,
    `source` VARCHAR(64) DEFAULT 'binance',
    `provider_ts` INT UNSIGNED NOT NULL DEFAULT 0,
    `received_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_market_type` (`market`, `type`),
    KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT DEFAULT NULL,
    `updated_at` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Insert default settings
INSERT INTO `settings` (`key`, `value`, `updated_at`) VALUES
('site_name', 'MEX Trading', UNIX_TIMESTAMP()),
('site_url', 'https://mex-production.up.railway.app', UNIX_TIMESTAMP()),
('min_deposit', '10', UNIX_TIMESTAMP()),
('min_withdrawal', '10', UNIX_TIMESTAMP()),
('max_leverage', '100', UNIX_TIMESTAMP()),
('default_leverage', '10', UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);