<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/settings.php';
require_once __DIR__ . '/../lib/leadbot_schema.php';
require_once __DIR__ . '/../lib/leadbot.php';

$token = (string)($_GET['token'] ?? $_POST['token'] ?? '');
if ($token === '' && PHP_SAPI === 'cli' && !empty($argv)) {
  foreach ((array)$argv as $arg) {
    if (str_starts_with((string)$arg, 'token=')) { $token = substr((string)$arg, 6); break; }
  }
}
$cronKey = (string)(env('CRON_KEY', '') ?: '');
if ($cronKey === '' || !hash_equals($cronKey, $token)) {
  json_response(['ok'=>false,'error'=>'forbidden'], 403);
}
$pdo = db();
leadbot_schema_install($pdo, db_driver());
leadbot_schema_seed_defaults($pdo, db_driver());
$res = leadbot_run_followup_reminders(100);
json_response($res);
