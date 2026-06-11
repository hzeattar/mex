<?php
declare(strict_types=1);

/**
 * Country (ISO2) -> Currency (ISO3)
 *
 * - Uses a small built-in map for reliability
 * - Falls back to restcountries.com (cached) for full world coverage
 */

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/marketdata.php';

function country_safe_cc(string $cc): string {
  $cc = strtoupper(trim($cc));
  $cc = preg_replace('/[^A-Z]/', '', $cc);
  return preg_match('/^[A-Z]{2}$/', $cc) ? $cc : '';
}

function country_currency_builtin(string $cc): string {
  // Key coverage: Arabs + Russia + Europe (+ some common)
  static $m = [
    // MENA
    'EG'=>'EGP','SA'=>'SAR','AE'=>'AED','KW'=>'KWD','QA'=>'QAR','BH'=>'BHD','OM'=>'OMR','JO'=>'JOD','IQ'=>'IQD','LB'=>'LBP','SY'=>'SYP','YE'=>'YER',
    'MA'=>'MAD','DZ'=>'DZD','TN'=>'TND','LY'=>'LYD','SD'=>'SDG','SS'=>'SSP','SO'=>'SOS','DJ'=>'DJF','MR'=>'MRU','PS'=>'ILS',
    // Russia/CIS
    'RU'=>'RUB','BY'=>'BYN','UA'=>'UAH','KZ'=>'KZT','UZ'=>'UZS','GE'=>'GEL','AM'=>'AMD','AZ'=>'AZN','TR'=>'TRY',
    // Europe
    'GB'=>'GBP','CH'=>'CHF','SE'=>'SEK','NO'=>'NOK','DK'=>'DKK','PL'=>'PLN','CZ'=>'CZK','HU'=>'HUF','RO'=>'RON','BG'=>'BGN',
    'IS'=>'ISK','RS'=>'RSD','UA'=>'UAH','MD'=>'MDL','AL'=>'ALL','MK'=>'MKD','BA'=>'BAM','ME'=>'EUR',
    // Default euro-zone (best-effort)
    'DE'=>'EUR','FR'=>'EUR','IT'=>'EUR','ES'=>'EUR','PT'=>'EUR','NL'=>'EUR','BE'=>'EUR','AT'=>'EUR','IE'=>'EUR','FI'=>'EUR','GR'=>'EUR','CY'=>'EUR','MT'=>'EUR',
    'EE'=>'EUR','LV'=>'EUR','LT'=>'EUR','SI'=>'EUR','SK'=>'EUR','HR'=>'EUR','LU'=>'EUR',
    // Americas/common
    'US'=>'USD','CA'=>'CAD','MX'=>'MXN','BR'=>'BRL','AR'=>'ARS',
    // Asia/common
    'CN'=>'CNY','JP'=>'JPY','IN'=>'INR','PK'=>'PKR','ID'=>'IDR','MY'=>'MYR','TH'=>'THB','VN'=>'VND','PH'=>'PHP','KR'=>'KRW',
  ];
  return $m[$cc] ?? '';
}

function country_currency_from_restcountries(string $cc): string {
  $url = 'https://restcountries.com/v3.1/alpha/' . rawurlencode(strtolower($cc));
  $j = http_get_json($url);
  if (!is_array($j) || empty($j)) return '';
  $item = is_array($j[0] ?? null) ? $j[0] : (is_array($j) ? $j : null);
  if (!is_array($item)) return '';
  $cur = $item['currencies'] ?? null;
  if (!is_array($cur) || empty($cur)) return '';
  $keys = array_keys($cur);
  $code = strtoupper((string)($keys[0] ?? ''));
  return preg_match('/^[A-Z]{3}$/', $code) ? $code : '';
}

function country_currency(string $cc): string {
  $cc = country_safe_cc($cc);
  if ($cc === '') return 'USD';

  $builtin = country_currency_builtin($cc);
  if ($builtin !== '') return $builtin;

  // Cached remote fallback
  $ttl = (int)env('COUNTRY_CURRENCY_TTL', '2592000'); // 30 days
  $ttl = max(86400, min(31536000, $ttl));

  $cacheDir = __DIR__ . '/../data/cache';
  if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
  $cacheFile = $cacheDir . '/country_cur_' . $cc . '.json';

  $now = time();
  if (is_file($cacheFile)) {
    $age = $now - (int)@filemtime($cacheFile);
    if ($age >= 0 && $age < $ttl) {
      $raw = @file_get_contents($cacheFile);
      $d = $raw ? json_decode($raw, true) : null;
      $code = strtoupper((string)($d['currency'] ?? ''));
      if (preg_match('/^[A-Z]{3}$/', $code)) return $code;
    }
  }

  $remote = '';
  try { $remote = country_currency_from_restcountries($cc); } catch (Throwable $e) { $remote = ''; }
  if ($remote !== '') {
    @file_put_contents($cacheFile, json_encode(['currency'=>$remote,'ts'=>$now], JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $remote;
  }

  return 'USD';
}
