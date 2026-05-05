-- VertexPluse runtime/admin funding upgrade
-- Safe for MySQL / MariaDB

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS category_key VARCHAR(64) NULL AFTER method_group;

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

UPDATE payment_methods
SET category_key = method_group
WHERE (category_key IS NULL OR category_key = '')
  AND method_group IS NOT NULL
  AND method_group <> '';

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

UPDATE markets SET tv_symbol='OANDA:XAUUSD' WHERE type='commodities' AND UPPER(symbol) IN ('XAUUSD','GOLD');
UPDATE markets SET tv_symbol='OANDA:XAGUSD' WHERE type='commodities' AND UPPER(symbol) IN ('XAGUSD','SILVER');
UPDATE markets SET tv_symbol='TVC:USOIL' WHERE type='commodities' AND UPPER(symbol) IN ('USOIL','WTI','OIL');
UPDATE markets SET tv_symbol='TVC:UKOIL' WHERE type='commodities' AND UPPER(symbol) IN ('UKOIL','BRENT');
UPDATE markets SET tv_symbol='AMEX:GLD' WHERE type='commodities' AND UPPER(symbol)='GLD';
UPDATE markets SET tv_symbol='AMEX:SLV' WHERE type='commodities' AND UPPER(symbol)='SLV';
