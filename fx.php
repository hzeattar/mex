<?php
declare(strict_types=1);

/**
 * FX helper (USD -> XXX) with:
 * - shared-hosting friendly caching
 * - fallback providers
 * - manual overrides via Settings table or .env
 *
 * Manual override example:
 *   settings: FX_OVERRIDE_IQD = 1310
 *   or env:   FX_OVERRIDE_IQD=1310
 */

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/marketdata.php';
require_once __DIR__ . '/settings.php';

function fx_safe_ccy(string $x): string {
  $x = strtoupper(trim($x));
  $x = preg_replace('/[^A-Z]/', '', $x);
  return preg_match('/^[A-Z]{3}$/', $x) ? $x : '';
}

/**
 * Free FX provider (broad coverage): open.er-api.com
 * Response: { result: "success", rates: { "SAR": 3.75, ... } }
 */
function fx_rate_erapi(string $base, string $to): float {
  $base = fx_safe_ccy($base);
  $to   = fx_safe_ccy($to);
  if ($base === '' || $to === '') return 0.0;
  if ($base === $to) return 1.0;
  $url = 'https://open.er-api.com/v6/latest/' . rawurlencode($base);
  $j = http_get_json($url);
  if (!is_array($j)) return 0.0;
  if (($j['result'] ?? '') !== 'success') return 0.0;
  $rates = $j['rates'] ?? null;
  if (!is_array($rates)) return 0.0;
  $v = $rates[$to] ?? null;
  $r = is_numeric($v) ? (float)$v : 0.0;
  return $r > 0 ? $r : 0.0;
}

/**
 * Manual override:
 * - Settings: FX_OVERRIDE_<CCY>
 * - Env:      FX_OVERRIDE_<CCY>
 */
function fx_override_rate(string $to): float {
  $to = fx_safe_ccy($to);
  if ($to === '' || $to === 'USD') return 0.0;

  $key = 'FX_OVERRIDE_' . $to;
  $v = setting_get($key, null);
  if ($v === null || $v === '') {
    $v = env($key, '');
  }
  if (is_numeric($v)) {
    $r = (float)$v;
    return $r > 0 ? $r : 0.0;
  }
  return 0.0;
}

/**
 * Get USD -> TO rate with caching & overrides.
 * Returns: ['rate'=>float,'updated_at'=>int,'source'=>string]
 */
function fx_usd_to(string $to): array {
  $to = fx_safe_ccy($to);
  if ($to === '') return ['rate'=>0.0,'updated_at'=>time(),'source'=>'invalid'];
  if ($to === 'USD') return ['rate'=>1.0,'updated_at'=>time(),'source'=>'identity'];

  $ov = fx_override_rate($to);
  if ($ov > 0) {
    return ['rate'=>$ov, 'updated_at'=>time(), 'source'=>'override'];
  }

  $ttl = (int)env('FX_TTL', '900');
  $ttl = max(60, min(86400, $ttl));

  $cacheDir = __DIR__ . '/../data/cache';
  if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
  $cacheFile = $cacheDir . '/fx_usd_' . $to . '.json';

  $now = time();
  if (is_file($cacheFile)) {
    $age = $now - (int)@filemtime($cacheFile);
    if ($age >= 0 && $age < $ttl) {
      $raw = @file_get_contents($cacheFile);
      $d = $raw ? json_decode($raw, true) : null;
      if (is_array($d) && isset($d['rate']) && is_numeric($d['rate'])) {
        return [
          'rate' => (float)$d['rate'],
          'updated_at' => (int)($d['ts'] ?? $now),
          'source' => (string)($d['source'] ?? 'cache'),
        ];
      }
    }
  }

  $rate = 0.0;
  $source = 'none';

  // 1) Frankfurter (ECB) – stable but limited coverage
  try {
    $r1 = (float)fx_rate_frankfurter('USD', $to);
    if ($r1 > 0) { $rate = $r1; $source = 'frankfurter'; }
  } catch (Throwable $e) {}

  // 2) er-api – broader coverage
  if (!($rate > 0)) {
    try {
      $r2 = (float)fx_rate_erapi('USD', $to);
      if ($r2 > 0) { $rate = $r2; $source = 'er-api'; }
    } catch (Throwable $e) {}
  }

  if ($rate > 0) {
    @file_put_contents($cacheFile, json_encode(['rate'=>$rate,'ts'=>$now,'source'=>$source], JSON_UNESCAPED_SLASHES), LOCK_EX);
  }

  return ['rate'=>$rate,'updated_at'=>$now,'source'=>$source];
}
