<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';

require_method('GET');
$uid = require_auth();
$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) json_response(['ok'=>false,'error'=>'Invalid deposit id'], 422);

$pdo = db();
$cols = ['id','provider','method_code','currency','amount','status','external_ref','created_at','updated_at'];
foreach (['confirmed_at','admin_note','details_json'] as $c) {
  try { if (schema_column_exists('deposits', $c)) $cols[] = $c; } catch (Throwable $e) {}
}
$stmt = $pdo->prepare('SELECT '.implode(',', $cols).' FROM deposits WHERE id=? AND user_id=? LIMIT 1');
$stmt->execute([$id, $uid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$row) json_response(['ok'=>false,'error'=>'Deposit not found'], 404);

$details = [];
$raw = trim((string)($row['details_json'] ?? ''));
if ($raw !== '') {
  $decoded = json_decode($raw, true);
  if (is_array($decoded)) $details = $decoded;
}
$proofAvailable = !empty($details['proof_path']);
$details['proof_view_url'] = $proofAvailable ? ('/api/deposits/proof.php?id=' . (int)$row['id']) : '';

$method = null;
$methodCode = trim((string)($row['method_code'] ?? ''));
if ($methodCode !== '') {
  $st = $pdo->prepare("SELECT code, provider, currency, title_en, title_ar, title_ru, desc_en, desc_ar, desc_ru, instructions_en, instructions_ar, instructions_ru, min_amount, max_amount, account_scope, checkout_label, fields_json, method_group, payment_address, payment_qr_url, proof_required, expires_hours FROM payment_methods WHERE kind='deposit' AND code=? LIMIT 1");
  $st->execute([$methodCode]);
  $pm = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  if ($pm) {
    $lang = 'en';
    try { $u = $pdo->prepare('SELECT locale FROM users WHERE id=? LIMIT 1'); $u->execute([$uid]); $lang = strtolower((string)($u->fetchColumn() ?: 'en')); } catch (Throwable $e) {}
    if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
    $title = (string)($pm['title_en'] ?? $methodCode);
    $description = (string)($pm['desc_en'] ?? '');
    $instructions = (string)($pm['instructions_en'] ?? '');
    if ($lang === 'ar') { $title = (string)(($pm['title_ar'] ?? '') ?: $title); $description = (string)(($pm['desc_ar'] ?? '') ?: $description); $instructions = (string)(($pm['instructions_ar'] ?? '') ?: $instructions); }
    if ($lang === 'ru') { $title = (string)(($pm['title_ru'] ?? '') ?: $title); $description = (string)(($pm['desc_ru'] ?? '') ?: $description); $instructions = (string)(($pm['instructions_ru'] ?? '') ?: $instructions); }
    $fields = [];
    $fieldsRaw = trim((string)($pm['fields_json'] ?? ''));
    if ($fieldsRaw !== '') { $decoded = json_decode($fieldsRaw, true); if (is_array($decoded)) $fields = $decoded; }
    $method = [
      'code' => (string)($pm['code'] ?? ''),
      'provider' => (string)($pm['provider'] ?? ''),
      'currency' => (string)($pm['currency'] ?? ''),
      'title' => $title,
      'description' => $description,
      'instructions' => $instructions,
      'min_amount' => (float)($pm['min_amount'] ?? 0),
      'max_amount' => (float)($pm['max_amount'] ?? 0),
      'account_scope' => (string)($pm['account_scope'] ?? 'real'),
      'checkout_label' => (string)($pm['checkout_label'] ?? ''),
      'fields' => $fields,
      'method_group' => (string)($pm['method_group'] ?? ''),
      'payment_address' => (string)($pm['payment_address'] ?? ''),
      'payment_qr_url' => (string)($pm['payment_qr_url'] ?? ''),
      'proof_required' => !empty($pm['proof_required']),
      'expires_hours' => max(1, (int)($pm['expires_hours'] ?? 24)),
    ];
  }
}

json_response(['ok'=>true,'deposit'=>[
  'id'=>(int)$row['id'],
  'provider'=>(string)($row['provider'] ?? ''),
  'method_code'=>$methodCode,
  'currency'=>(string)($row['currency'] ?? ''),
  'amount'=>(float)($row['amount'] ?? 0),
  'status'=>(string)($row['status'] ?? ''),
  'external_ref'=>(string)($row['external_ref'] ?? ''),
  'created_at'=>(int)($row['created_at'] ?? 0),
  'updated_at'=>(int)($row['updated_at'] ?? 0),
  'confirmed_at'=>(int)($row['confirmed_at'] ?? 0),
  'admin_note'=>(string)($row['admin_note'] ?? ''),
  'details'=>$details,
  'proof_available'=>$proofAvailable,
  'method'=>$method,
]]);
