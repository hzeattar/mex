-- Core schema extract for the trading/news/markets parts used by the Mini App.
-- Canonical source remains: api/lib/schema.php

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

CREATE TABLE IF NOT EXISTS market_quotes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(32) NOT NULL,
  type VARCHAR(16) NOT NULL,
  price DECIMAL(20,8) NOT NULL DEFAULT 0,
  change_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
  mark_price DECIMAL(20,8) NULL,
  index_price DECIMAL(20,8) NULL,
  funding_rate DECIMAL(20,12) NULL,
  next_funding_time BIGINT NULL,
  updated_at INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_symbol (symbol),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS market_ticks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(32) NOT NULL,
  price DECIMAL(20,8) NOT NULL DEFAULT 0,
  volume DECIMAL(20,8) NULL,
  ts INT NOT NULL,
  KEY idx_symbol_ts (symbol, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_articles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  body MEDIUMTEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  published_at INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  like_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  dislike_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT NOT NULL DEFAULT 0,
  updated_at INT NOT NULL DEFAULT 0,
  KEY idx_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_article_votes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  vote TINYINT NOT NULL DEFAULT 1,
  created_at INT NOT NULL DEFAULT 0,
  updated_at INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_article_user (article_id, user_id),
  KEY idx_article_vote (article_id, vote),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
