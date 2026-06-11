<?php
declare(strict_types=1);

// Root endpoints share the same bootstrap as /api/auth.
require_once __DIR__ . '/api/auth/_common.php';

// Load bot helpers (bot_require_token, bot_user_by_telegram_id) for root bot endpoints.
if (file_exists(__DIR__ . '/api/bot/_common.php')) {
  require_once __DIR__ . '/api/bot/_common.php';
}
