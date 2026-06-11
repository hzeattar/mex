<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/feature.php';

// Public endpoint (no auth) — used by UI bootstrap

$flags = feature_all();

// Extra public config (non-sensitive)
$flags['pay_bot_username'] = (string)env('PAY_BOT_USERNAME', '');

json_response([
  'ok' => true,
  'flags' => $flags,
]);
