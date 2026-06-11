<?php
declare(strict_types=1);

function leadbot_schema_install(PDO $pdo, string $driver): void {
  $driver = strtolower($driver);

  // lead_bots
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS lead_bots (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(128) NOT NULL,
      bot_username VARCHAR(64) NULL,
      token_enc MEDIUMTEXT NOT NULL,
      webhook_key VARCHAR(64) NOT NULL,
      owner_chat_id VARCHAR(32) NULL,
      default_manager_id BIGINT UNSIGNED NULL,
      brand_name VARCHAR(128) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_leadbot_username (bot_username),
      UNIQUE KEY uniq_leadbot_key (webhook_key),
      KEY idx_leadbot_default_manager (default_manager_id),
      KEY idx_leadbot_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS lead_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bot_username TEXT,
      token_enc TEXT NOT NULL,
      webhook_key TEXT NOT NULL,
      owner_chat_id TEXT,
      default_manager_id INTEGER,
      brand_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_leadbot_username ON lead_bots(bot_username)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_leadbot_key ON lead_bots(webhook_key)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leadbot_default_manager ON lead_bots(default_manager_id)"); } catch (Throwable $e) {}
  }

  // lead_campaigns
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS lead_campaigns (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      bot_id BIGINT UNSIGNED NULL,
      name VARCHAR(128) NOT NULL,
      source_code VARCHAR(128) NOT NULL,
      platform VARCHAR(32) NULL,
      country VARCHAR(64) NULL,
      language VARCHAR(8) NULL,
      default_manager_id BIGINT UNSIGNED NULL,
      notes TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_lead_campaign_source (source_code),
      KEY idx_lead_campaign_bot (bot_id),
      KEY idx_lead_campaign_mgr (default_manager_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS lead_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER,
      name TEXT NOT NULL,
      source_code TEXT NOT NULL,
      platform TEXT,
      country TEXT,
      language TEXT,
      default_manager_id INTEGER,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_lead_campaign_source ON lead_campaigns(source_code)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_lead_campaign_bot ON lead_campaigns(bot_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_lead_campaign_mgr ON lead_campaigns(default_manager_id)"); } catch (Throwable $e) {}
  }

  // leadbot_states
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS leadbot_states (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      bot_id BIGINT UNSIGNED NOT NULL,
      chat_id VARCHAR(32) NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'lead',
      state VARCHAR(48) NOT NULL,
      data JSON NULL,
      updated_at INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_leadbot_state (bot_id, chat_id, role),
      KEY idx_leadbot_state_bot (bot_id),
      KEY idx_leadbot_state_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS leadbot_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'lead',
      state TEXT NOT NULL,
      data TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uniq_leadbot_state ON leadbot_states(bot_id, chat_id, role)"); } catch (Throwable $e) {}
  }

  // leads
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS leads (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      bot_id BIGINT UNSIGNED NOT NULL,
      campaign_id BIGINT UNSIGNED NULL,
      source_code VARCHAR(128) NULL,
      tg_user_id VARCHAR(32) NOT NULL,
      tg_chat_id VARCHAR(32) NOT NULL,
      tg_username VARCHAR(64) NULL,
      full_name VARCHAR(255) NULL,
      phone VARCHAR(64) NULL,
      country VARCHAR(128) NULL,
      age INT NULL,
      experience_level VARCHAR(64) NULL,
      interest_area VARCHAR(128) NULL,
      capital_range VARCHAR(128) NULL,
      contact_time VARCHAR(128) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      lead_score INT NOT NULL DEFAULT 0,
      temperature VARCHAR(16) NOT NULL DEFAULT 'cold',
      assigned_manager_id BIGINT UNSIGNED NULL,
      duplicate_count INT NOT NULL DEFAULT 0,
      assigned_at INT NULL,
      contacted_at INT NULL,
      converted_at INT NULL,
      next_follow_up_at INT NULL,
      last_manager_reply_at INT NULL,
      last_user_reply_at INT NULL,
      last_reminder_at INT NULL,
      notes TEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      updated_at INT NOT NULL DEFAULT 0,
      KEY idx_leads_bot (bot_id),
      KEY idx_leads_campaign (campaign_id),
      KEY idx_leads_manager (assigned_manager_id),
      KEY idx_leads_status (status),
      KEY idx_leads_temp (temperature),
      KEY idx_leads_follow (next_follow_up_at),
      KEY idx_leads_tg (tg_user_id),
      KEY idx_leads_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      campaign_id INTEGER,
      source_code TEXT,
      tg_user_id TEXT NOT NULL,
      tg_chat_id TEXT NOT NULL,
      tg_username TEXT,
      full_name TEXT,
      phone TEXT,
      country TEXT,
      age INTEGER,
      experience_level TEXT,
      interest_area TEXT,
      capital_range TEXT,
      contact_time TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      lead_score INTEGER NOT NULL DEFAULT 0,
      temperature TEXT NOT NULL DEFAULT 'cold',
      assigned_manager_id INTEGER,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      assigned_at INTEGER,
      contacted_at INTEGER,
      converted_at INTEGER,
      next_follow_up_at INTEGER,
      last_manager_reply_at INTEGER,
      last_user_reply_at INTEGER,
      last_reminder_at INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
        try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_bot ON leads(bot_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_manager ON leads(assigned_manager_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_temp ON leads(temperature)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_follow ON leads(next_follow_up_at)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_tg ON leads(tg_user_id)"); } catch (Throwable $e) {}
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)"); } catch (Throwable $e) {}
  }

  // lead events
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS lead_events (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      lead_id BIGINT UNSIGNED NOT NULL,
      actor_type VARCHAR(16) NOT NULL,
      actor_id VARCHAR(64) NULL,
      event_type VARCHAR(64) NOT NULL,
      payload_json MEDIUMTEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_lead_events_lead (lead_id),
      KEY idx_lead_events_type (event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS lead_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id)"); } catch (Throwable $e) {}
  }

  // lead messages
  $pdo->exec($driver === 'mysql' ?
    "CREATE TABLE IF NOT EXISTS lead_messages (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      lead_id BIGINT UNSIGNED NOT NULL,
      bot_id BIGINT UNSIGNED NOT NULL,
      sender_type VARCHAR(16) NOT NULL,
      sender_id VARCHAR(64) NULL,
      direction VARCHAR(16) NOT NULL DEFAULT 'inbound',
      msg_type VARCHAR(16) NOT NULL DEFAULT 'text',
      content MEDIUMTEXT NULL,
      created_at INT NOT NULL DEFAULT 0,
      KEY idx_lead_messages_lead (lead_id),
      KEY idx_lead_messages_bot (bot_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" :
    "CREATE TABLE IF NOT EXISTS lead_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      bot_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id TEXT,
      direction TEXT NOT NULL DEFAULT 'inbound',
      msg_type TEXT NOT NULL DEFAULT 'text',
      content TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );"
  );
  if ($driver !== 'mysql') {
    try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id)"); } catch (Throwable $e) {}
  }
}

function leadbot_schema_seed_defaults(PDO $pdo, string $driver): void {
  if (!function_exists('setting_get') || !function_exists('setting_set')) return;
  $defaults = [
    'leadbot.brand_name' => 'MEX Group',
    'leadbot.flow.welcome_text' => "مرحباً بك في MEX Group 🌟\nيسرّنا اهتمامك بخدماتنا الاستثمارية.\nلإتمام طلبك، يرجى الإجابة على بعض الأسئلة البسيطة، ولن يستغرق ذلك سوى دقيقة واحدة.",
    'leadbot.flow.welcome_button' => 'نعم، هيّا بنا 🚀',
    'leadbot.flow.ask_name' => 'يرجى إدخال اسمك الكامل:',
    'leadbot.flow.ask_phone' => "يرجى إدخال رقم هاتفك مع مفتاح الدولة:\n\nمثال:\n+34 XXXXXXXX",
    'leadbot.flow.ask_country' => 'ما هو بلد إقامتك الحالي؟',
    'leadbot.flow.ask_age' => 'كم عمرك؟',
    'leadbot.flow.ask_experience' => 'ما هو مستوى خبرتك في التداول أو الاستثمار؟',
    'leadbot.flow.ask_interest' => 'ما المجال الذي يهمك أكثر؟',
    'leadbot.flow.ask_capital' => 'ما هو المبلغ الذي تفكر بالبدء به؟',
    'leadbot.flow.ask_contact_time' => 'ما هو الوقت المناسب لتواصل مدير الحساب معك؟',
    'leadbot.flow.finish_text' => "شكراً لك، تم استلام طلبك بنجاح ✅\nسيتم تعيين مدير حساب خاص لك، وسيتواصل معك في أقرب وقت ممكن لمساعدتك وتزويدك بكامل التفاصيل",
    'leadbot.flow.invalid_phone' => 'من فضلك أدخل رقم هاتف صحيح يبدأ بمفتاح الدولة مثل +201234567890',
    'leadbot.flow.invalid_age' => 'من فضلك أدخل العمر بالأرقام فقط.',
    'leadbot.flow.options_experience' => "مبتدئ\nمتوسط\nمحترف",
    'leadbot.flow.options_interest' => "العملات الرقمية\nالفوركس\nالسلع\nالباقات الاستثمارية\nأحتاج استشارة من مدير حساب",
    'leadbot.flow.options_capital' => "أقل من 500$\n500$ - 1,000$\n1,000$ - 5,000$\n5,000$ - 10,000$\nأكثر من 10,000$",
    'leadbot.flow.options_common_countries' => "مصر\nالسعودية\nالإمارات\nالكويت\nقطر\nالمغرب",
    'leadbot.followup.default_hours' => '24',
    'leadbot.followup.reminder_text' => 'تذكير متابعة lead مستحق الآن.',
  ];
  foreach ($defaults as $k => $v) {
    $cur = (string)setting_get($k, '');
    if ($cur === '') setting_set($k, $v);
  }
}
