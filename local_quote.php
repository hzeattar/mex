<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/fx.php';
require_once __DIR__ . '/api/lib/country_currency.php';
require_once __DIR__ . '/../../bot/countries.php';

require_method('GET');

$cc = strtoupper(trim((string)($_GET['cc'] ?? '')));
$cc = preg_replace('/[^A-Z]/', '', $cc);
if (!preg_match('/^[A-Z]{2}$/', $cc)) {
  json_response(['ok'=>false,'error'=>'Invalid country'], 422);
}

$amount = (float)($_GET['amount'] ?? 0);
if (!($amount > 0)) {
  json_response(['ok'=>false,'error'=>'Invalid amount'], 422);
}

$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

$currency = country_currency($cc);
if (!preg_match('/^[A-Z]{3}$/', $currency)) $currency = 'USD';

$fx = fx_usd_to($currency);
$rate = (float)($fx['rate'] ?? 0);

$local = ($rate > 0) ? ($amount * $rate) : 0;

json_response([
  'ok' => true,
  'country' => $cc,
  'country_name' => mex_country_label($cc, $lang),
  'currency' => $currency,
  'amount_usd' => $amount,
  'rate' => $rate,
  'local_amount' => $local,
  'rate_source' => (string)($fx['source'] ?? 'none'),
  'updated_at' => (int)($fx['updated_at'] ?? time()),
]);
