<?php
require_once __DIR__ . '/../lib/common.php';
require_method('GET');
$pdo = db();

$kind = strtolower(trim((string)($_GET['kind'] ?? 'deposit')));
$currency = strtoupper(trim((string)($_GET['currency'] ?? '*')));
$lang = strtolower(trim((string)($_GET['lang'] ?? 'en')));
$scope = strtolower(trim((string)($_GET['scope'] ?? 'real')));
if (!in_array($kind, ['deposit','withdraw'], true)) $kind = 'deposit';
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
if (!in_array($scope, ['real','demo','both'], true)) $scope = 'real';

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
    'payment_address' => (string)($r['payment_address'] ?? ''),
    'payment_qr_url' => (string)($r['payment_qr_url'] ?? ''),
    'proof_required' => !empty($r['proof_required']),
    'expires_hours' => max(1, (int)($r['expires_hours'] ?? 24)),
  ];
}

json_response(['ok'=>true,'items'=>$out,'categories'=>$categories]);
