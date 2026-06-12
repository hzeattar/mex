<?php
declare(strict_types=1);

require_once __DIR__ . '/schema.php';

function vp_feature_bootstrap(PDO $pdo, string $driver): void {
  static $done = [];
  $key = spl_object_id($pdo) . ':' . $driver;
  if (isset($done[$key])) return;
  $done[$key] = true;

  $isMysql = ($driver === 'mysql');

  $createLevels = $isMysql
    ? "CREATE TABLE IF NOT EXISTS customer_levels (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        level_code VARCHAR(64) NOT NULL,
        name_en VARCHAR(128) NULL,
        name_ar VARCHAR(128) NULL,
        name_ru VARCHAR(128) NULL,
        perks_en MEDIUMTEXT NULL,
        perks_ar MEDIUMTEXT NULL,
        perks_ru MEDIUMTEXT NULL,
        feat_trading TINYINT(1) NOT NULL DEFAULT 1,
        feat_copy_bot TINYINT(1) NOT NULL DEFAULT 0,
        feat_contracts TINYINT(1) NOT NULL DEFAULT 0,
        feat_support TINYINT(1) NOT NULL DEFAULT 0,
        feat_portfolio_manager TINYINT(1) NOT NULL DEFAULT 0,
        min_deposit_total DECIMAL(20,8) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at BIGINT UNSIGNED NULL,
        updated_at BIGINT UNSIGNED NULL,
        UNIQUE KEY uq_customer_level_code (level_code),
        KEY idx_customer_level_status (status, sort_order, min_deposit_total)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    : "CREATE TABLE IF NOT EXISTS customer_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_code TEXT NOT NULL UNIQUE,
        name_en TEXT,
        name_ar TEXT,
        name_ru TEXT,
        perks_en TEXT,
        perks_ar TEXT,
        perks_ru TEXT,
        feat_trading INTEGER NOT NULL DEFAULT 1,
        feat_copy_bot INTEGER NOT NULL DEFAULT 0,
        feat_contracts INTEGER NOT NULL DEFAULT 0,
        feat_support INTEGER NOT NULL DEFAULT 0,
        feat_portfolio_manager INTEGER NOT NULL DEFAULT 0,
        min_deposit_total REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER,
        updated_at INTEGER
      )";
  $pdo->exec($createLevels);
  try {
    if (!$isMysql) $pdo->exec("CREATE INDEX IF NOT EXISTS idx_customer_level_status ON customer_levels(status, sort_order, min_deposit_total)");
  } catch (Throwable $e) {}

  // Migrate level feature columns if table already exists
  if (schema_table_exists($pdo, 'customer_levels', $driver)) {
    foreach (['feat_trading','feat_copy_bot','feat_contracts','feat_support','feat_portfolio_manager'] as $featCol) {
      if (!schema_column_exists($pdo, 'customer_levels', $featCol, $driver)) {
        schema_add_column($pdo, 'customer_levels', "{$featCol} TINYINT(1) NOT NULL DEFAULT 0", "{$featCol} INTEGER NOT NULL DEFAULT 0", $driver);
      }
    }
  }

  if (schema_table_exists($pdo, 'invest_plans', $driver)) {
    if (!schema_column_exists($pdo, 'invest_plans', 'product_kind', $driver)) {
      schema_add_column($pdo, 'invest_plans', "product_kind VARCHAR(16) NOT NULL DEFAULT 'plan'", "product_kind TEXT NOT NULL DEFAULT 'plan'", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'required_level_id', $driver)) {
      schema_add_column($pdo, 'invest_plans', "required_level_id BIGINT UNSIGNED NULL", "required_level_id INTEGER", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'is_perpetual', $driver)) {
      schema_add_column($pdo, 'invest_plans', "is_perpetual TINYINT(1) NOT NULL DEFAULT 0", "is_perpetual INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'features_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "features_en MEDIUMTEXT NULL", "features_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'features_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "features_ar MEDIUMTEXT NULL", "features_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'features_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "features_ru MEDIUMTEXT NULL", "features_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'badge_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "badge_en VARCHAR(128) NULL", "badge_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'badge_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "badge_ar VARCHAR(128) NULL", "badge_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'badge_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "badge_ru VARCHAR(128) NULL", "badge_ru TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'headline_en', $driver)) {
      schema_add_column($pdo, 'invest_plans', "headline_en MEDIUMTEXT NULL", "headline_en TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'headline_ar', $driver)) {
      schema_add_column($pdo, 'invest_plans', "headline_ar MEDIUMTEXT NULL", "headline_ar TEXT", $driver);
    }
    if (!schema_column_exists($pdo, 'invest_plans', 'headline_ru', $driver)) {
      schema_add_column($pdo, 'invest_plans', "headline_ru MEDIUMTEXT NULL", "headline_ru TEXT", $driver);
    }
    if (schema_table_exists($pdo, 'investments', $driver)) {
      if (!schema_column_exists($pdo, 'investments', 'product_kind', $driver)) {
        schema_add_column($pdo, 'investments', "product_kind VARCHAR(16) NOT NULL DEFAULT 'plan'", "product_kind TEXT NOT NULL DEFAULT 'plan'", $driver);
      }
      if (!schema_column_exists($pdo, 'investments', 'is_perpetual', $driver)) {
        schema_add_column($pdo, 'investments', "is_perpetual TINYINT(1) NOT NULL DEFAULT 0", "is_perpetual INTEGER NOT NULL DEFAULT 0", $driver);
      }
      if (!schema_column_exists($pdo, 'investments', 'cycle_roi_percent', $driver)) {
        schema_add_column($pdo, 'investments', "cycle_roi_percent DECIMAL(10,4) NOT NULL DEFAULT 0", "cycle_roi_percent REAL NOT NULL DEFAULT 0", $driver);
      }
      if (!schema_column_exists($pdo, 'investments', 'required_level_id', $driver)) {
        schema_add_column($pdo, 'investments', "required_level_id BIGINT UNSIGNED NULL", "required_level_id INTEGER", $driver);
      }
    }
    if (schema_table_exists($pdo, 'trading_bot_subscriptions', $driver) && !schema_column_exists($pdo, 'trading_bot_subscriptions', 'entry_price_snapshot', $driver)) {
      schema_add_column($pdo, 'trading_bot_subscriptions', "entry_price_snapshot DECIMAL(20,8) NULL", "entry_price_snapshot REAL", $driver);
    }
  }

  if (schema_table_exists($pdo, 'trading_signals', $driver)) {
    if (!schema_column_exists($pdo, 'trading_signals', 'recommend_count', $driver)) {
      schema_add_column($pdo, 'trading_signals', "recommend_count INT NOT NULL DEFAULT 0", "recommend_count INTEGER NOT NULL DEFAULT 0", $driver);
    }
    if (!schema_column_exists($pdo, 'trading_signals', 'comments_count', $driver)) {
      schema_add_column($pdo, 'trading_signals', "comments_count INT NOT NULL DEFAULT 0", "comments_count INTEGER NOT NULL DEFAULT 0", $driver);
    }
  }

  if (schema_table_exists($pdo, 'markets', $driver)) {
    if (!schema_column_exists($pdo, 'markets', 'source', $driver)) {
      schema_add_column($pdo, 'markets', "source VARCHAR(32) NULL", "source TEXT", $driver);
    }
  }

  $now = time();
  // Seed: [code, name_en, name_ar, name_ru, min_deposit, sort_order, perks_en, perks_ar, perks_ru, feat_trading, feat_copy_bot, feat_contracts, feat_support, feat_portfolio_manager]
  $seed = [
    ['starter',  'Starter',  'المبتدئ',      'Starter',   0,      10, "Trading only\nBasic signals\nDemo workspace", "تداول فقط\nإشارات أساسية\nحساب تجريبي", "Trading only\nBasic signals\nDemo workspace",            1,0,0,0,0],
    ['silver',   'Silver',   'فضي',          'Silver',    5000,   20, "Trading\nCopy trading bot\nStandard support", "تداول\nبوت نسخ الصفقات\nدعم قياسي", "Trading\nCopy trading bot\nStandard support",              1,1,0,0,0],
    ['gold',     'Gold',     'ذهبي',          'Gold',      25000,  30, "Trading\nCopy bot\nAdvanced contracts\nPriority support", "تداول\nبوت نسخ\nعقود متقدمة\nدعم أولوي", "Trading\nCopy bot\nAdvanced contracts\nPriority support",   1,1,1,1,0],
    ['platinum', 'Platinum', 'بلاتيني',      'Platinum',  75000,  40, "Trading\nCopy bot\nContracts\nDedicated support\nPortfolio manager", "تداول\nبوت نسخ\nعقود\nدعم مخصص\nمدير محفظة", "Trading\nCopy bot\nContracts\nDedicated support\nPortfolio manager", 1,1,1,1,1],
    ['vip',      'VIP',      'كبار العملاء', 'VIP',       150000, 50, "All features\nVIP contracts\nPrivate desk\nCustom limits", "جميع المزايا\nعقود VIP\nمنصة خاصة\nحدود مخصصة", "All features\nVIP contracts\nPrivate desk\nCustom limits",       1,1,1,1,1],
  ];
  $existingLevels = 0;
  try { $existingLevels = (int)($pdo->query("SELECT COUNT(*) FROM customer_levels")->fetchColumn() ?: 0); } catch (Throwable $e) { $existingLevels = 0; }
  if ($existingLevels === 0) {
    foreach ($seed as [$code,$en,$ar,$ru,$min,$sort,$perksEn,$perksAr,$perksRu,$ft,$fcb,$fc,$fs,$fpm]) {
      try {
        $sql = "INSERT INTO customer_levels(level_code,name_en,name_ar,name_ru,perks_en,perks_ar,perks_ru,feat_trading,feat_copy_bot,feat_contracts,feat_support,feat_portfolio_manager,min_deposit_total,sort_order,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        $pdo->prepare($sql)->execute([$code,$en,$ar,$ru,$perksEn,$perksAr,$perksRu,$ft,$fcb,$fc,$fs,$fpm,$min,$sort,'active',$now,$now]);
      } catch (Throwable $e) {}
    }
  }
}
