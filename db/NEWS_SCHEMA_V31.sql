CREATE TABLE IF NOT EXISTS news_articles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  body MEDIUMTEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  published_at INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at INT NOT NULL DEFAULT 0,
  updated_at INT NOT NULL DEFAULT 0,
  KEY idx_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
