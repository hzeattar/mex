<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/funding_showcase_seed.php';
require_method('GET');

$kind = strtolower(trim((string)($_GET['kind'] ?? 'deposit')));
$currency = strtoupper(trim((string)($_GET['currency'] ?? '*')));
$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
$scope = strtolower(trim((string)($_GET['scope'] ?? 'real')));
if (!in_array($kind, ['deposit','withdraw'], true)) $kind = 'deposit';
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
if (!in_array($scope, ['real','demo','both'], true)) $scope = 'real';

// --- Response cache -----------------------------------------------------------
// Payment methods are global (not per-user) and change rarely. Serving a fresh
// copy required a cross-region DB connection + ~6 queries + the showcase seed
// probe on EVERY wallet/funding page load, which made the payments panel slow.
// A short server-side file cache (keyed by the public inputs only) lets cache
// hits skip the DB entirely.
$pmCacheDir = __DIR__ . '/../data/cache';
if (!is_dir($pmCacheDir)) @mkdir($pmCacheDir, 0777, true);
$pmCacheTtl = max(0, min(300, (int)((string)env('PAYMENT_METHODS_CACHE_TTL', '90'))));
$pmBrowserTtl = 20;
$pmCacheFile = $pmCacheDir . '/paymethods_v1_' . preg_replace('/[^a-z0-9_\-]/i', '_', $kind . '_' . $currency . '_' . $lang . '_' . $scope) . '.json';
if ($pmCacheTtl > 0 && is_file($pmCacheFile)) {
  $pmAge = time() - (int)@filemtime($pmCacheFile);
  if ($pmAge >= 0 && $pmAge < $pmCacheTtl) {
    $pmCached = (string)@file_get_contents($pmCacheFile);
    if ($pmCached !== '') {
      http_response_code(200);
      header('Content-Type: application/json; charset=utf-8');
      header("Cache-Control: public, max-age={$pmBrowserTtl}, s-maxage={$pmBrowserTtl}");
      header('X-MEX-Cache: hit');
      echo $pmCached;
      exit;
    }
  }
}

$pdo = db();
// Showcase seed only fills missing demo/QA rows; its "is it needed?" probe costs
// several DB round-trips, so throttle it to at most once per few minutes per
// container instead of running it on every request.
$pmSeedFlag = sys_get_temp_dir() . '/mex_funding_seed_ok';
if (!is_file($pmSeedFlag) || (time() - (int)@filemtime($pmSeedFlag)) >= 300) {
  try { funding_showcase_seed_methods($pdo); @touch($pmSeedFlag); }
  catch (Throwable $e) { error_log('[payment_methods/list] showcase seed failed: ' . $e->getMessage()); }
}

function payment_methods_field_value($fields, array $keys): string {
  $keys = array_map(static fn($k) => strtolower((string)$k), $keys);
  $pick = static function($label, $value) use ($keys): string {
    $label = strtolower((string)$label);
    if (!in_array($label, $keys, true)) return '';
    if (is_array($value)) {
      foreach (['value','text','default','url'] as $k) {
        if (isset($value[$k]) && trim((string)$value[$k]) !== '') return trim((string)$value[$k]);
      }
      return '';
    }
    return trim((string)$value);
  };
  if (is_array($fields)) {
    foreach ($fields as $key => $value) {
      if (is_string($key)) {
        $found = $pick($key, $value);
        if ($found !== '') return $found;
      }
      if (is_array($value)) {
        $label = $value['key'] ?? $value['name'] ?? $value['id'] ?? $value['label'] ?? '';
        $found = $pick($label, $value);
        if ($found !== '') return $found;
      }
    }
  }
  return '';
}

if ($currency === '' || $currency === '*' || $currency === 'ALL') {
  $rows = $pdo->prepare("SELECT id, kind, code, provider, currency, title_en, title_ar, title_ru, desc_en, desc_ar, desc_ru, image_url,
    instructions_en, instructions_ar, instructions_ru, min_amount, max_amount, sort_order, account_scope, fields_json, checkout_label,
    method_group, category_key, payment_address, payment_qr_url, proof_required, expires_hours
    FROM payment_methods WHERE kind=? AND status='active' ORDER BY sort_order ASC, id ASC");
  $rows->execute([$kind]);
} else {
  $rows = $pdo->prepare("SELECT id, kind, code, provider, currency, title_en, title_ar, title_ru, desc_en, desc_ar, desc_ru, image_url,
    instructions_en, instructions_ar, instructions_ru, min_amount, max_amount, sort_order, account_scope, fields_json, checkout_label,
    method_group, category_key, payment_address, payment_qr_url, proof_required, expires_hours
    FROM payment_methods WHERE kind=? AND currency=? AND status='active' ORDER BY sort_order ASC, id ASC");
  $rows->execute([$kind,$currency]);
}
$items = $rows->fetchAll(PDO::FETCH_ASSOC) ?: [];

$categories = [];
try {
  $st = $pdo->prepare("SELECT key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,image_url,sort_order FROM funding_categories WHERE kind=? AND status='active' ORDER BY sort_order ASC, id ASC");
  $st->execute([$kind]);
  $catRows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($catRows as $r) {
    $label = (string)($r['label_en'] ?? '');
    $hint = (string)($r['hint_en'] ?? '');
    if ($lang === 'ar') { $label = (string)($r['label_ar'] ?: $label); $hint = (string)(($r['hint_ar'] ?? '') ?: $hint); }
    if ($lang === 'ru') { $label = (string)($r['label_ru'] ?: $label); $hint = (string)(($r['hint_ru'] ?? '') ?: $hint); }
    $categories[] = [
      'key' => (string)$r['key_slug'],
      'label' => $label,
      'hint' => $hint,
      'icon' => (string)($r['icon'] ?? ''),
      'image_url' => (string)($r['image_url'] ?? ''),
      'sort_order' => (int)($r['sort_order'] ?? 0),
    ];
  }
} catch (Throwable $e) {
  $categories = [];
}

$out = [];
foreach ($items as $r) {
  $accountScope = strtolower((string)($r['account_scope'] ?? 'real'));
  if ($scope !== 'both' && !in_array($accountScope, [$scope, 'both'], true)) continue;
  $title = $r['title_en'];
  $ins = $r['instructions_en'] ?? '';
  $desc = $r['desc_en'] ?? '';
  if ($lang === 'ar') { $title = $r['title_ar'] ?: $title; $ins = ($r['instructions_ar'] ?? '') ?: $ins; $desc = ($r['desc_ar'] ?? '') ?: $desc; }
  if ($lang === 'ru') { $title = $r['title_ru'] ?: $title; $ins = ($r['instructions_ru'] ?? '') ?: $ins; $desc = ($r['desc_ru'] ?? '') ?: $desc; }
  $fields = [];
  $rawFields = trim((string)($r['fields_json'] ?? ''));
  if ($rawFields !== '') {
    $decoded = json_decode($rawFields, true);
    if (is_array($decoded)) $fields = $decoded;
  }
  $paymentAddress = trim((string)($r['payment_address'] ?? ''));
  if ($paymentAddress === '') {
    $paymentAddress = payment_methods_field_value($fields, ['payment_address','wallet_address','deposit_address','address','bank_account','account_number','iban']);
  }
  $paymentQr = trim((string)($r['payment_qr_url'] ?? ''));
  if ($paymentQr === '') {
    $paymentQr = payment_methods_field_value($fields, ['payment_qr_url','qr_url','qr_image','qr','payment_qr']);
  }
  $out[] = [
    'id' => (int)$r['id'],
    'code' => $r['code'],
    'provider' => $r['provider'],
    'currency' => $r['currency'],
    'title' => $title,
    'description' => $desc,
    'image_url' => $r['image_url'] ?? null,
    'instructions' => $ins,
    'min_amount' => (float)$r['min_amount'],
    'max_amount' => (float)$r['max_amount'],
    'account_scope' => $accountScope ?: 'real',
    'fields' => $fields,
    'checkout_label' => (string)($r['checkout_label'] ?? ''),
    'method_group' => (string)($r['method_group'] ?? ''),
    'category_key' => (string)($r['category_key'] ?? ''),
    'payment_address' => $paymentAddress,
    'payment_qr_url' => $paymentQr,
    'proof_required' => !empty($r['proof_required']),
    'expires_hours' => max(1, (int)($r['expires_hours'] ?? 24)),
  ];
}

$pmPayload = ['ok'=>true,'items'=>$out,'categories'=>$categories];
$pmJson = json_encode($pmPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($pmJson !== false && $pmCacheTtl > 0) { @file_put_contents($pmCacheFile, $pmJson, LOCK_EX); }
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: public, max-age={$pmBrowserTtl}, s-maxage={$pmBrowserTtl}");
header('X-MEX-Cache: miss');
echo $pmJson !== false ? $pmJson : json_encode($pmPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
