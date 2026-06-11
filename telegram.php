<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

// Verify Telegram initData according to Telegram Web Apps
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

function tg_verify_init_data(string $initData, string $botToken): array {
  if ($initData === '') return ['ok'=>false,'error'=>'Missing initData'];

  parse_str($initData, $params);
  if (!is_array($params) || !isset($params['hash'])) return ['ok'=>false,'error'=>'Invalid initData'];

  $hash = $params['hash'];
  unset($params['hash']);

  // Build data_check_string
  ksort($params);
  $pairs = [];
  foreach ($params as $k => $v) {
    $pairs[] = $k . '=' . $v;
  }
  $dataCheckString = implode("\n", $pairs);

  $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
  $calcHash = hash_hmac('sha256', $dataCheckString, $secretKey);

  if (!hash_equals($calcHash, $hash)) return ['ok'=>false,'error'=>'Hash mismatch'];

  // Freshness check (prevent replay)
  $maxAge = (int)(env('TG_INITDATA_MAX_AGE', '86400') ?? '86400');
  $authDate = isset($params['auth_date']) ? (int)$params['auth_date'] : 0;
  if ($authDate > 0 && $maxAge > 0) {
    if (time() - $authDate > $maxAge) {
      return ['ok'=>false,'error'=>'initData expired'];
    }
  }

  $user = null;
  if (isset($params['user'])) {
    $user = json_decode($params['user'], true);
  }

  return ['ok'=>true,'user'=>$user, 'params'=>$params];
}
