<?php
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

function envv($k, $d = '') {
  $v = getenv($k);
  return ($v === false || $v === '') ? $d : $v;
}
function json_ok($a = []) {
  echo json_encode(array_merge(['ok' => true], $a), JSON_UNESCAPED_UNICODE);
  exit;
}
function json_err($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['ok' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}
function admin_body(): array {
  $raw = file_get_contents('php://input');
  $json = json_decode((string)$raw, true);
  if (is_array($json)) return $json;
  return $_POST ?: [];
}
function clean_choice($value, array $allowed, string $fallback): string {
  $v = strtolower(trim((string)$value));
  return in_array($v, $allowed, true) ? $v : $fallback;
}
function clean_decimal($value): float {
  $n = (float)$value;
  return $n > 0 ? $n : 0.0;
}
function clean_fields_json($value): ?string {
  if (is_array($value)) {
    return json_encode($value, JSON_UNESCAPED_UNICODE);
  }
  $raw = trim((string)$value);
  if ($raw === '') return null;
  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) json_err('fields_json must be valid JSON');
  return json_encode($decoded, JSON_UNESCAPED_UNICODE);
}
function funding_categories(PDO $db, string $kind = ''): array {
  try {
    if ($kind !== '') {
      $st = $db->prepare("SELECT id, kind, key_slug, label_en, label_ar, label_ru, hint_en, hint_ar, hint_ru, icon, image_url, status, sort_order, created_at, updated_at FROM funding_categories WHERE kind=? ORDER BY sort_order ASC, id ASC");
      $st->execute([$kind]);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
    return $db->query("SELECT id, kind, key_slug, label_en, label_ar, label_ru, hint_en, hint_ar, hint_ru, icon, image_url, status, sort_order, created_at, updated_at FROM funding_categories ORDER BY kind ASC, sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    return [];
  }
}

$secret = $_SERVER['HTTP_X_ADMIN_KEY'] ?? ($_GET['key'] ?? '');
if ($secret === '' || $secret !== envv('BOT_ADMIN_SECRET', 'master')) json_err('Unauthorized', 401);

$db = db();
$action = strtolower(trim((string)($_GET['action'] ?? 'list')));

if ($action === 'list') {
  $kind = clean_choice($_GET['kind'] ?? '', ['deposit', 'withdraw', ''], '');
  $where = '';
  $args = [];
  if ($kind !== '') {
    $where = 'WHERE kind=?';
    $args[] = $kind;
  }
  $sql = "SELECT id, kind, code, provider, currency, title_en, title_ar, title_ru, desc_en, desc_ar, desc_ru, image_url,
    instructions_en, instructions_ar, instructions_ru, min_amount, max_amount, status, sort_order, account_scope, fields_json,
    checkout_label, method_group, category_key, payment_address, payment_qr_url, proof_required, expires_hours, created_at, updated_at
    FROM payment_methods $where ORDER BY kind ASC, sort_order ASC, id DESC";
  $st = $db->prepare($sql);
  $st->execute($args);
  json_ok(['items' => $st->fetchAll(PDO::FETCH_ASSOC) ?: [], 'categories' => funding_categories($db, $kind)]);
}

if ($action === 'categories') {
  $kind = clean_choice($_GET['kind'] ?? '', ['deposit', 'withdraw', ''], '');
  json_ok(['items' => funding_categories($db, $kind)]);
}

if ($action === 'upsert') {
  $body = admin_body();
  $id = (int)($body['id'] ?? 0);
  $kind = clean_choice($body['kind'] ?? 'deposit', ['deposit', 'withdraw'], 'deposit');
  $code = trim((string)($body['code'] ?? ''));
  $provider = trim((string)($body['provider'] ?? 'dummy'));
  $currency = strtoupper(trim((string)($body['currency'] ?? 'USDT')));
  $titleEn = trim((string)($body['title_en'] ?? ($body['title'] ?? '')));
  $titleAr = trim((string)($body['title_ar'] ?? ''));
  $titleRu = trim((string)($body['title_ru'] ?? ''));
  $descEn = trim((string)($body['desc_en'] ?? ($body['description'] ?? '')));
  $descAr = trim((string)($body['desc_ar'] ?? ''));
  $descRu = trim((string)($body['desc_ru'] ?? ''));
  $imageUrl = trim((string)($body['image_url'] ?? ''));
  $insEn = trim((string)($body['instructions_en'] ?? ($body['instructions'] ?? '')));
  $insAr = trim((string)($body['instructions_ar'] ?? ''));
  $insRu = trim((string)($body['instructions_ru'] ?? ''));
  $min = clean_decimal($body['min_amount'] ?? 0);
  $max = clean_decimal($body['max_amount'] ?? 0);
  $status = clean_choice($body['status'] ?? 'active', ['active', 'disabled'], 'active');
  $sort = (int)($body['sort_order'] ?? ($body['sort'] ?? 0));
  $accountScope = clean_choice($body['account_scope'] ?? 'both', ['real', 'demo', 'both'], 'both');
  $fieldsJson = clean_fields_json($body['fields_json'] ?? ($body['fields'] ?? null));
  $checkoutLabel = trim((string)($body['checkout_label'] ?? ''));
  $methodGroup = clean_choice($body['method_group'] ?? '', ['crypto', 'bank', 'card', 'crypto_bot', 'cash', 'manual', ''], '');
  $categoryKey = trim((string)($body['category_key'] ?? ''));
  $paymentAddress = trim((string)($body['payment_address'] ?? ''));
  $paymentQrUrl = trim((string)($body['payment_qr_url'] ?? ''));
  $proofRequired = !empty($body['proof_required']) ? 1 : 0;
  $expiresHours = max(1, (int)($body['expires_hours'] ?? 24));
  $now = time();

  if ($code === '') json_err('code required');
  if ($titleEn === '') json_err('title_en required');
  if ($provider === '') $provider = 'dummy';
  if ($currency === '') $currency = 'USDT';
  if ($max > 0 && $min > 0 && $max < $min) json_err('max_amount must be greater than min_amount');

  if ($id > 0) {
    $st = $db->prepare("UPDATE payment_methods SET kind=?, code=?, provider=?, currency=?, title_en=?, title_ar=?, title_ru=?, desc_en=?, desc_ar=?, desc_ru=?, image_url=?, instructions_en=?, instructions_ar=?, instructions_ru=?, min_amount=?, max_amount=?, status=?, sort_order=?, account_scope=?, fields_json=?, checkout_label=?, method_group=?, category_key=?, payment_address=?, payment_qr_url=?, proof_required=?, expires_hours=?, updated_at=? WHERE id=?");
    $st->execute([$kind, $code, $provider, $currency, $titleEn, $titleAr, $titleRu, $descEn, $descAr, $descRu, $imageUrl ?: null, $insEn, $insAr, $insRu, $min, $max, $status, $sort, $accountScope, $fieldsJson, $checkoutLabel ?: null, $methodGroup ?: null, $categoryKey ?: null, $paymentAddress ?: null, $paymentQrUrl ?: null, $proofRequired, $expiresHours, $now, $id]);
    json_ok(['id' => $id]);
  }

  $st = $db->prepare("INSERT INTO payment_methods(kind, code, provider, currency, title_en, title_ar, title_ru, desc_en, desc_ar, desc_ru, image_url, instructions_en, instructions_ar, instructions_ru, min_amount, max_amount, status, sort_order, account_scope, fields_json, checkout_label, method_group, category_key, payment_address, payment_qr_url, proof_required, expires_hours, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  $st->execute([$kind, $code, $provider, $currency, $titleEn, $titleAr, $titleRu, $descEn, $descAr, $descRu, $imageUrl ?: null, $insEn, $insAr, $insRu, $min, $max, $status, $sort, $accountScope, $fieldsJson, $checkoutLabel ?: null, $methodGroup ?: null, $categoryKey ?: null, $paymentAddress ?: null, $paymentQrUrl ?: null, $proofRequired, $expiresHours, $now, $now]);
  json_ok(['id' => (int)$db->lastInsertId()]);
}

if ($action === 'delete') {
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) json_err('id required');
  $st = $db->prepare("DELETE FROM payment_methods WHERE id=?");
  $st->execute([$id]);
  json_ok();
}

json_err('Unknown action');
