<?php
require_once __DIR__ . '/includes/auth.php';
admin_require();
require_once __DIR__ . '/../api/lib/funding_showcase_seed.php';
$pdo = db();
try { funding_showcase_seed_methods($pdo); } catch (Throwable $e) { error_log('[admin/payment_methods] showcase seed failed: ' . $e->getMessage()); }
$msg = '';
$err = '';

function load_countries(PDO $pdo): array {
  try {
    return $pdo->query("SELECT code,name_en,name_ar,name_ru FROM countries WHERE status='active' ORDER BY sort_order ASC, code ASC")
      ->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    return [];
  }
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function slugify_key(string $s): string {
  $s = strtolower(trim($s));
  $s = preg_replace('~[^a-z0-9]+~', '_', $s);
  return trim((string)$s, '_');
}
function load_funding_categories(PDO $pdo, string $kind = ''): array {
  try {
    if ($kind !== '') {
      $st = $pdo->prepare("SELECT * FROM funding_categories WHERE kind=? ORDER BY sort_order ASC, id ASC");
      $st->execute([$kind]);
      return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
    return $pdo->query("SELECT * FROM funding_categories ORDER BY kind ASC, sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    return [];
  }
}
function method_has_visible_fields(array $row): bool {
  $raw = trim((string)($row['fields_json'] ?? ''));
  if ($raw === '') return false;
  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) return false;
  foreach ($decoded as $k => $v) {
    if (is_string($k) && trim((string)$k) !== '') return true;
    if (is_array($v) && trim((string)($v['value'] ?? $v['default'] ?? $v['text'] ?? $v['label'] ?? $v['name'] ?? $v['key'] ?? '')) !== '') return true;
  }
  return false;
}
function method_category_key(array $row): string {
  $direct = slugify_key((string)($row['category_key'] ?? ''));
  if ($direct !== '') return $direct;
  $group = slugify_key((string)($row['method_group'] ?? ''));
  if ($group !== '') return $group;
  $raw = strtolower(implode(' ', array_filter([
    (string)($row['provider'] ?? ''),
    (string)($row['code'] ?? ''),
    (string)($row['title_en'] ?? ''),
  ])));
  if (preg_match('~stripe|card|visa|master~', $raw)) return 'card';
  if (preg_match('~bank|wire|iban|swift|ach|fedwire~', $raw)) return 'bank';
  if (preg_match('~crypto|usdt|btc|eth|trc|erc|bep|wallet|blockchain~', $raw)) return 'crypto';
  if (preg_match('~bot|telegram~', $raw)) return 'crypto_bot';
  return 'manual';
}
function method_setup_badges(array $row): string {
  $badges = [];
  $hasDetails = trim((string)($row['payment_address'] ?? '')) !== '' || method_has_visible_fields($row);
  $badges[] = !empty($row['image_url']) ? "<span class='pill ok'>Logo</span>" : "<span class='pill warn'>No logo</span>";
  $badges[] = !empty($row['payment_qr_url']) ? "<span class='pill ok'>QR</span>" : ($hasDetails ? "<span class='pill ok'>Auto QR</span>" : "<span class='pill warn'>No QR</span>");
  $badges[] = $hasDetails ? "<span class='pill ok'>Details</span>" : "<span class='pill bad'>No address/details</span>";
  return "<div class='inline-actions' style='gap:5px'>" . implode('', $badges) . "</div>";
}
function clean_media_url(string $value): string {
  $value = trim($value);
  if ($value === '') return '';
  if (preg_match('~^https?://~i', $value)) {
    if (filter_var($value, FILTER_VALIDATE_URL)) return $value;
    throw new RuntimeException('Image/QR URL must be a valid http or https URL.');
  }
  if (preg_match('~^/?(assets|uploads|storage)/[a-z0-9_./%+\-]+$~i', $value)) {
    return str_starts_with($value, '/') ? $value : '/' . $value;
  }
  throw new RuntimeException('Image/QR URL must start with https:// or an allowed local path like /assets/...');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  try {
    admin_verify_csrf();
    $action = (string)($_POST['action'] ?? '');
    $now = time();

    if ($action === 'seed_showcase_methods') {
      funding_showcase_setting_set($pdo, 'FUNDING_SHOWCASE_SEED_V3', '0');
      funding_showcase_seed_methods($pdo);
      $msg = 'Funding showcase methods, logos, QR images, Stripe card, and route details were filled.';
    } elseif ($action === 'save_category') {
      $id = (int)($_POST['category_id'] ?? 0);
      $kind = strtolower(trim((string)($_POST['category_kind'] ?? 'deposit')));
      if (!in_array($kind, ['deposit','withdraw'], true)) $kind = 'deposit';
      $key = slugify_key((string)($_POST['category_key'] ?? ''));
      $labelEn = trim((string)($_POST['category_label_en'] ?? ''));
      $labelAr = trim((string)($_POST['category_label_ar'] ?? ''));
      $labelRu = trim((string)($_POST['category_label_ru'] ?? ''));
      $hintEn = trim((string)($_POST['category_hint_en'] ?? ''));
      $hintAr = trim((string)($_POST['category_hint_ar'] ?? ''));
      $hintRu = trim((string)($_POST['category_hint_ru'] ?? ''));
      $icon = trim((string)($_POST['category_icon'] ?? ''));
      $sort = (int)($_POST['category_sort_order'] ?? 0);
      $status = isset($_POST['category_enabled']) ? 'active' : 'disabled';
      if ($key === '' || $labelEn === '' || $labelAr === '' || $labelRu === '') {
        throw new RuntimeException('Category key and EN/AR/RU labels are required.');
      }
      $current = null;
      if ($id > 0) {
        $st = $pdo->prepare('SELECT * FROM funding_categories WHERE id=?');
        $st->execute([$id]);
        $current = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      }
      $imageUrl = (string)($current['image_url'] ?? '');
      $postedImageUrl = clean_media_url((string)($_POST['category_image_url'] ?? ''));
      if (!empty($_POST['category_remove_image']) && $imageUrl !== '') {
        admin_delete_uploaded_asset($imageUrl);
        $imageUrl = '';
      }
      if ($postedImageUrl !== '' && $postedImageUrl !== $imageUrl) {
        if ($imageUrl !== '') admin_delete_uploaded_asset($imageUrl);
        $imageUrl = $postedImageUrl;
      }
      $up = admin_store_uploaded_image('category_image_file', 'funding_categories', 'cat_');
      if (!empty($up['error'])) throw new RuntimeException((string)$up['error']);
      if (!empty($up['ok']) && !empty($up['path'])) {
        if ($imageUrl !== '' && $imageUrl !== $up['path']) admin_delete_uploaded_asset($imageUrl);
        $imageUrl = (string)$up['path'];
      }
      if ($id > 0) {
        $st = $pdo->prepare('UPDATE funding_categories SET kind=?, key_slug=?, label_en=?, label_ar=?, label_ru=?, hint_en=?, hint_ar=?, hint_ru=?, icon=?, image_url=?, status=?, sort_order=?, updated_at=? WHERE id=?');
        $st->execute([$kind,$key,$labelEn,$labelAr,$labelRu,$hintEn,$hintAr,$hintRu,$icon ?: null,$imageUrl ?: null,$status,$sort,$now,$id]);
        admin_audit_log('update', 'funding_category', $id, 'Updated funding category', ['kind'=>$kind,'key'=>$key]);
        $msg = 'Funding category updated';
      } else {
        $st = $pdo->prepare('INSERT INTO funding_categories(kind,key_slug,label_en,label_ar,label_ru,hint_en,hint_ar,hint_ru,icon,image_url,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $st->execute([$kind,$key,$labelEn,$labelAr,$labelRu,$hintEn,$hintAr,$hintRu,$icon ?: null,$imageUrl ?: null,$status,$sort,$now,$now]);
        $newId = (int)$pdo->lastInsertId();
        admin_audit_log('create', 'funding_category', $newId, 'Created funding category', ['kind'=>$kind,'key'=>$key]);
        $msg = 'Funding category created';
      }
    }

    if ($action === 'delete_category') {
      $id = (int)($_POST['category_id'] ?? 0);
      $st = $pdo->prepare('SELECT * FROM funding_categories WHERE id=?');
      $st->execute([$id]);
      $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      if ($row) {
        admin_delete_uploaded_asset((string)($row['image_url'] ?? ''));
        $pdo->prepare('UPDATE payment_methods SET category_key=NULL WHERE kind=? AND category_key=?')->execute([(string)$row['kind'], (string)$row['key_slug']]);
        $pdo->prepare('DELETE FROM funding_categories WHERE id=?')->execute([$id]);
        admin_audit_log('delete', 'funding_category', $id, 'Deleted funding category', ['kind'=>$row['kind'],'key'=>$row['key_slug']]);
        $msg = 'Funding category deleted';
      }
    }

    if ($action === 'save_method') {
      $id = (int)($_POST['id'] ?? 0);
      $kind = strtolower(trim((string)($_POST['kind'] ?? 'deposit')));
      $code = slugify_key((string)($_POST['code'] ?? ''));
      $provider = strtolower(trim((string)($_POST['provider'] ?? 'dummy')));
      $currency = strtoupper(trim((string)($_POST['currency'] ?? 'USDT')));
      $title_en = trim((string)($_POST['title_en'] ?? ''));
      $title_ar = trim((string)($_POST['title_ar'] ?? ''));
      $title_ru = trim((string)($_POST['title_ru'] ?? ''));
      $desc_en = trim((string)($_POST['desc_en'] ?? ''));
      $desc_ar = trim((string)($_POST['desc_ar'] ?? ''));
      $desc_ru = trim((string)($_POST['desc_ru'] ?? ''));
      $ins_en = trim((string)($_POST['instructions_en'] ?? ''));
      $ins_ar = trim((string)($_POST['instructions_ar'] ?? ''));
      $ins_ru = trim((string)($_POST['instructions_ru'] ?? ''));
      $min = (float)($_POST['min_amount'] ?? 0);
      $max = (float)($_POST['max_amount'] ?? 0);
      $sort = (int)($_POST['sort_order'] ?? 0);
      $status = isset($_POST['enabled']) ? 'active' : 'disabled';
      $account_scope = strtolower(trim((string)($_POST['account_scope'] ?? 'real')));
      if (!in_array($account_scope, ['real','demo','both'], true)) $account_scope = 'real';
      $fields_json = trim((string)($_POST['fields_json'] ?? ''));
      $checkout_label = trim((string)($_POST['checkout_label'] ?? ''));
      $category_key = slugify_key((string)($_POST['category_key'] ?? ''));
      $method_group = strtolower(trim((string)($_POST['method_group'] ?? '')));
      if (!in_array($method_group, ['crypto','bank','card','crypto_bot',''], true)) $method_group = '';
      $payment_address = trim((string)($_POST['payment_address'] ?? ''));
      $proof_required = isset($_POST['proof_required']) ? 1 : 0;
      $expires_hours = max(1, min(168, (int)($_POST['expires_hours'] ?? 24)));
      if ($fields_json !== '') {
        json_decode($fields_json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
          throw new RuntimeException('fields_json must be valid JSON.');
        }
      }
      if (!in_array($kind, ['deposit','withdraw'], true)) $kind = 'deposit';
      if ($code === '' || $title_en === '' || $title_ar === '' || $title_ru === '') {
        throw new RuntimeException('Code and EN/AR/RU titles are required.');
      }
      $current = null;
      if ($id > 0) {
        $st = $pdo->prepare('SELECT * FROM payment_methods WHERE id=?');
        $st->execute([$id]);
        $current = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      }
      $image_url = (string)($current['image_url'] ?? '');
      $payment_qr_url = (string)($current['payment_qr_url'] ?? '');
      $posted_image_url = clean_media_url((string)($_POST['image_url'] ?? ''));
      $posted_qr_url = clean_media_url((string)($_POST['payment_qr_url'] ?? ''));
      if (!empty($_POST['remove_image']) && $image_url !== '') {
        admin_delete_uploaded_asset($image_url);
        $image_url = '';
      }
      if (!empty($_POST['remove_qr']) && $payment_qr_url !== '') {
        admin_delete_uploaded_asset($payment_qr_url);
        $payment_qr_url = '';
      }
      if ($posted_image_url !== '' && $posted_image_url !== $image_url) {
        if ($image_url !== '') admin_delete_uploaded_asset($image_url);
        $image_url = $posted_image_url;
      }
      if ($posted_qr_url !== '' && $posted_qr_url !== $payment_qr_url) {
        if ($payment_qr_url !== '') admin_delete_uploaded_asset($payment_qr_url);
        $payment_qr_url = $posted_qr_url;
      }
      $imgUpload = admin_store_uploaded_image('image_file', 'payment_methods', 'pm_');
      if (!empty($imgUpload['error'])) throw new RuntimeException((string)$imgUpload['error']);
      if (!empty($imgUpload['ok']) && !empty($imgUpload['path'])) {
        if ($image_url !== '' && $image_url !== $imgUpload['path']) admin_delete_uploaded_asset($image_url);
        $image_url = (string)$imgUpload['path'];
      }
      $qrUpload = admin_store_uploaded_image('payment_qr_file', 'payment_methods/qr', 'pm_qr_');
      if (!empty($qrUpload['error'])) throw new RuntimeException((string)$qrUpload['error']);
      if (!empty($qrUpload['ok']) && !empty($qrUpload['path'])) {
        if ($payment_qr_url !== '' && $payment_qr_url !== $qrUpload['path']) admin_delete_uploaded_asset($payment_qr_url);
        $payment_qr_url = (string)$qrUpload['path'];
      }

      if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE payment_methods SET kind=?, code=?, provider=?, currency=?, title_en=?, title_ar=?, title_ru=?, desc_en=?, desc_ar=?, desc_ru=?, image_url=?, instructions_en=?, instructions_ar=?, instructions_ru=?, min_amount=?, max_amount=?, status=?, sort_order=?, account_scope=?, fields_json=?, checkout_label=?, method_group=?, category_key=?, payment_address=?, payment_qr_url=?, proof_required=?, expires_hours=?, updated_at=? WHERE id=?");
        $stmt->execute([$kind,$code,$provider,$currency,$title_en,$title_ar,$title_ru,$desc_en,$desc_ar,$desc_ru,$image_url ?: null,$ins_en,$ins_ar,$ins_ru,$min,$max,$status,$sort,$account_scope,$fields_json ?: null,$checkout_label ?: null,$method_group ?: null,$category_key ?: null,$payment_address ?: null,$payment_qr_url ?: null,$proof_required,$expires_hours,$now,$id]);
        $savedId = $id;
        admin_audit_log('update', 'payment_method', $id, 'Updated payment method', ['kind'=>$kind,'code'=>$code]);
        $msg = 'Payment method updated';
      } else {
        $stmt = $pdo->prepare("INSERT INTO payment_methods(kind,code,provider,currency,title_en,title_ar,title_ru,desc_en,desc_ar,desc_ru,image_url,instructions_en,instructions_ar,instructions_ru,min_amount,max_amount,status,sort_order,account_scope,fields_json,checkout_label,method_group,category_key,payment_address,payment_qr_url,proof_required,expires_hours,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$kind,$code,$provider,$currency,$title_en,$title_ar,$title_ru,$desc_en,$desc_ar,$desc_ru,$image_url ?: null,$ins_en,$ins_ar,$ins_ru,$min,$max,$status,$sort,$account_scope,$fields_json ?: null,$checkout_label ?: null,$method_group ?: null,$category_key ?: null,$payment_address ?: null,$payment_qr_url ?: null,$proof_required,$expires_hours,$now,$now]);
        $savedId = (int)$pdo->lastInsertId();
        admin_audit_log('create', 'payment_method', $savedId, 'Created payment method', ['kind'=>$kind,'code'=>$code]);
        $msg = 'Payment method created';
      }

      try {
        $pdo->query('SELECT 1 FROM payment_method_countries LIMIT 1');
        $selected = $_POST['countries'] ?? [];
        if (!is_array($selected)) $selected = [];
        $codes = [];
        foreach ($selected as $c) {
          $c = strtoupper(trim((string)$c));
          if ($c !== '' && preg_match('/^[A-Z0-9_\-]{2,16}$/', $c)) $codes[] = $c;
        }
        $codes = array_values(array_unique($codes));
        $pdo->prepare('DELETE FROM payment_method_countries WHERE method_id=?')->execute([$savedId]);
        if ($codes) {
          $ins = $pdo->prepare('INSERT INTO payment_method_countries(method_id,country_code) VALUES(?,?)');
          foreach ($codes as $c) $ins->execute([$savedId, $c]);
        }
      } catch (Throwable $e) {
      }
    }

    if ($action === 'toggle_method') {
      $id = (int)($_POST['id'] ?? 0);
      $cur = (string)($_POST['cur'] ?? 'disabled');
      $next = ($cur === 'active') ? 'disabled' : 'active';
      $pdo->prepare("UPDATE payment_methods SET status=?, updated_at=? WHERE id=?")->execute([$next, time(), $id]);
      admin_audit_log('toggle', 'payment_method', $id, 'Toggled payment method', ['status'=>$next]);
      $msg = 'Payment method status changed';
    }

    if ($action === 'delete_method') {
      $id = (int)($_POST['id'] ?? 0);
      $st = $pdo->prepare('SELECT * FROM payment_methods WHERE id=?');
      $st->execute([$id]);
      $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
      if ($row) {
        admin_delete_uploaded_asset((string)($row['image_url'] ?? ''));
        admin_delete_uploaded_asset((string)($row['payment_qr_url'] ?? ''));
        try { $pdo->prepare('DELETE FROM payment_method_countries WHERE method_id=?')->execute([$id]); } catch (Throwable $e) {}
        $pdo->prepare('DELETE FROM payment_methods WHERE id=?')->execute([$id]);
        admin_audit_log('delete', 'payment_method', $id, 'Deleted payment method', ['kind'=>$row['kind'],'code'=>$row['code']]);
        $msg = 'Payment method deleted';
      }
    }
  } catch (Throwable $e) {
    $err = $e->getMessage();
  }
}

$editId = (int)($_GET['edit'] ?? 0);
$editCategoryId = (int)($_GET['edit_category'] ?? 0);
$edit = null;
if ($editId > 0) {
  $st = $pdo->prepare("SELECT * FROM payment_methods WHERE id=?");
  $st->execute([$editId]);
  $edit = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
$editCategory = null;
if ($editCategoryId > 0) {
  $st = $pdo->prepare("SELECT * FROM funding_categories WHERE id=?");
  $st->execute([$editCategoryId]);
  $editCategory = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

$countries = load_countries($pdo);
$editCountries = [];
if ($editId > 0) {
  try {
    $st = $pdo->prepare('SELECT country_code FROM payment_method_countries WHERE method_id=?');
    $st->execute([$editId]);
    $editCountries = array_map('strtoupper', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
  } catch (Throwable $e) {
    $editCountries = [];
  }
}

$rows = $pdo->query("SELECT * FROM payment_methods ORDER BY kind, sort_order ASC, id DESC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
$categories = load_funding_categories($pdo);
$categoriesByKind = ['deposit' => [], 'withdraw' => []];
foreach ($categories as $cat) {
  $k = (string)($cat['kind'] ?? 'deposit');
  if (!isset($categoriesByKind[$k])) $categoriesByKind[$k] = [];
  $categoriesByKind[$k][] = $cat;
}
$pmCountries = [];
try {
  $st = $pdo->query('SELECT method_id, country_code FROM payment_method_countries');
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $r) {
    $mid = (int)$r['method_id'];
    $cc  = strtoupper((string)$r['country_code']);
    if (!isset($pmCountries[$mid])) $pmCountries[$mid] = [];
    $pmCountries[$mid][] = $cc;
  }
  foreach ($pmCountries as $mid => $arr) {
    $pmCountries[$mid] = array_values(array_unique($arr));
  }
} catch (Throwable $e) {
  $pmCountries = [];
}

$methodKind = (string)($edit['kind'] ?? 'deposit');
$methodKind = in_array($methodKind, ['deposit','withdraw'], true) ? $methodKind : 'deposit';
$currentCategoryImage = (string)($editCategory['image_url'] ?? '');
$currentMethodImage = (string)($edit['image_url'] ?? '');
$currentMethodQr = (string)($edit['payment_qr_url'] ?? '');
$activeMethodCount = count(array_filter($rows, static fn($r) => (string)($r['status'] ?? '') === 'active'));
$logoReadyCount = count(array_filter($rows, static fn($r) => trim((string)($r['image_url'] ?? '')) !== ''));
$qrReadyCount = count(array_filter($rows, static fn($r) => trim((string)($r['payment_qr_url'] ?? '')) !== ''));
$detailsReadyCount = count(array_filter($rows, static fn($r) => trim((string)($r['payment_address'] ?? '')) !== '' || method_has_visible_fields($r)));

$body = "<div class='card'><div class='split'><div><h2 class='section-title'>Funding Workspace</h2><p class='muted'>Manage category sections, local images, QR uploads, and payment routes from one cleaner page. Categories control the deposit and withdrawal sections shown to users inside the funding flow.</p></div><span class='pill'>Funding Admin</span></div>";
if ($msg) $body .= "<p><span class='pill ok'>" . h($msg) . "</span></p>";
if ($err) $body .= "<p><span class='pill bad'>" . h($err) . "</span></p>";
$body .= "<div class='stats-grid' style='margin-top:14px'>";
$body .= admin_stat_card('Active methods', (string)$activeMethodCount, 'Shown in Deposit / Withdraw when scope and category match.');
$body .= admin_stat_card('Logos ready', $logoReadyCount . ' / ' . count($rows), 'Method icon or uploaded logo shown in the app cards.');
$body .= admin_stat_card('QR ready', $qrReadyCount . ' / ' . count($rows), 'QR image shown for wallet or bank transfer flows.');
$body .= admin_stat_card('Transfer details', $detailsReadyCount . ' / ' . count($rows), 'Wallet address, bank destination, or visible fields_json.');
$body .= "</div>";
$body .= "<form method='post' style='margin-top:14px;display:flex;gap:10px;flex-wrap:wrap'>" . admin_csrf_input() . "<input type='hidden' name='action' value='seed_showcase_methods'><button class='btn' type='submit'>Fill complete demo methods</button><span class='form-note'>Adds logos, QR images, Stripe card route, crypto wallets, and bank transfer details when missing.</span></form>";
$body .= "</div>";

$body .= "<div class='card'><h3 class='section-title'>Funding Categories</h3><p class='form-note'>Create the visible deposit and withdrawal sections. Each category can have its own image, icon, name, hint text, and sort order.</p>";
$body .= "<form method='post' class='grid' enctype='multipart/form-data'>" . admin_csrf_input();
$body .= "<input type='hidden' name='action' value='save_category'><input type='hidden' name='category_id' value='" . h($editCategory['id'] ?? 0) . "'>";
$catKind = (string)($editCategory['kind'] ?? 'deposit');
$body .= "<label>Kind<br><select name='category_kind'><option value='deposit' " . ($catKind === 'deposit' ? 'selected' : '') . ">deposit</option><option value='withdraw' " . ($catKind === 'withdraw' ? 'selected' : '') . ">withdraw</option></select></label>";
$body .= "<label>Category key<br><input name='category_key' value='" . h($editCategory['key_slug'] ?? '') . "' placeholder='crypto, bank, card, local_transfer'></label>";
$body .= "<label>Icon (optional)<br><input name='category_icon' value='" . h($editCategory['icon'] ?? '') . "' placeholder='₿ / 🏦 / 💳'></label>";
$body .= "<label>Sort Order<br><input name='category_sort_order' type='number' value='" . h($editCategory['sort_order'] ?? 0) . "'></label>";
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='category_enabled' " . ((($editCategory['status'] ?? 'active') === 'active') ? 'checked' : '') . "> Enabled</label>";
$body .= "<label>Label (EN)<br><input name='category_label_en' value='" . h($editCategory['label_en'] ?? '') . "'></label>";
$body .= "<label>Label (AR)<br><input name='category_label_ar' value='" . h($editCategory['label_ar'] ?? '') . "'></label>";
$body .= "<label>Label (RU)<br><input name='category_label_ru' value='" . h($editCategory['label_ru'] ?? '') . "'></label>";
$body .= "<label style='grid-column:1/-1'>Hint (EN)<br><textarea name='category_hint_en' rows='2'>" . h($editCategory['hint_en'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Hint (AR)<br><textarea name='category_hint_ar' rows='2'>" . h($editCategory['hint_ar'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Hint (RU)<br><textarea name='category_hint_ru' rows='2'>" . h($editCategory['hint_ru'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Category image URL (optional, recommended on Railway)<br><input name='category_image_url' value='" . h($currentCategoryImage) . "' placeholder='https://... or /assets/img/...'></label>";
$body .= "<label style='grid-column:1/-1'>Category image upload (optional)<br><input type='file' name='category_image_file' accept='image/*'></label>";
$body .= "<div class='form-note' style='grid-column:1/-1'>Paste a stable URL, or upload an image. Uploaded category images appear in the deposit/withdraw section selector directly inside the app.</div>";
if ($currentCategoryImage !== '') {
  $body .= "<div style='grid-column:1/-1' class='admin-media-preview'><img src='" . h($currentCategoryImage) . "' alt='Category image'><label style='display:flex;gap:8px;align-items:center'><input type='checkbox' name='category_remove_image' value='1'><span>Remove current category image</span></label></div>";
}
$body .= "<div style='grid-column:1/-1;display:flex;gap:10px;align-items:center'><button class='btn' type='submit'>Save category</button><a class='btn' href='/admin/payment_methods.php'>Clear</a></div></form>";
$body .= "<div class='table-wrap' style='margin-top:16px'><table><thead><tr><th>ID</th><th>Kind</th><th>Key</th><th>Image</th><th>Label</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>";
foreach ($categories as $cat) {
  $img = !empty($cat['image_url']) ? "<img src='" . h($cat['image_url']) . "' style='max-height:38px;border-radius:10px;border:1px solid #334155'>" : "<span class='muted'>—</span>";
  $body .= "<tr><td>" . h($cat['id']) . "</td><td>" . h($cat['kind']) . "</td><td><code>" . h($cat['key_slug']) . "</code></td><td>" . $img . "</td><td>" . h($cat['label_en']) . "</td><td>" . admin_status_pill((string)$cat['status']) . "</td><td>" . h($cat['sort_order']) . "</td><td class='inline-actions'><a class='btn' href='/admin/payment_methods.php?edit_category=" . h($cat['id']) . "'>Edit</a><form method='post' onsubmit=\"return confirm('Delete this category? Methods assigned to it will be detached.');\">" . admin_csrf_input() . "<input type='hidden' name='action' value='delete_category'><input type='hidden' name='category_id' value='" . h($cat['id']) . "'><button class='btn danger' type='submit'>Delete</button></form></td></tr>";
}
$body .= "</tbody></table></div></div>";

$body .= "<div class='card'><h3 class='section-title'>Payment Methods</h3><p class='form-note'>Methods now use direct image uploads for logos and QR codes. The address/destination and visible fields below are the exact transfer details clients see inside Funds after selecting a method.</p>";
$body .= "<form method='post' class='grid' enctype='multipart/form-data'>" . admin_csrf_input();
$body .= "<input type='hidden' name='action' value='save_method'><input type='hidden' name='id' value='" . h($edit['id'] ?? 0) . "'>";
$body .= "<label>Kind<br><select name='kind' id='methodKindSel'><option value='deposit' " . ($methodKind === 'deposit' ? 'selected' : '') . ">deposit</option><option value='withdraw' " . ($methodKind === 'withdraw' ? 'selected' : '') . ">withdraw</option></select></label>";
$body .= "<label>Code<br><input name='code' value='" . h($edit['code'] ?? '') . "' placeholder='e.g. usdt_trc20'></label>";
$body .= "<label>Provider<br><input name='provider' value='" . h($edit['provider'] ?? 'dummy') . "'></label>";
$body .= "<label>Currency<br><input name='currency' value='" . h($edit['currency'] ?? 'USDT') . "'></label>";
$accScope = $edit['account_scope'] ?? 'real';
$body .= "<label>Account scope<br><select name='account_scope'><option value='real' " . ($accScope==='real'?'selected':'') . ">real</option><option value='demo' " . ($accScope==='demo'?'selected':'') . ">demo</option><option value='both' " . ($accScope==='both'?'selected':'') . ">both</option></select></label>";
$body .= "<label>Checkout button label<br><input name='checkout_label' value='" . h($edit['checkout_label'] ?? '') . "' placeholder='Proceed to payment'></label>";
$body .= "<label>Fallback group<br><select name='method_group'><option value='' " . ((($edit['method_group'] ?? '') === '') ? 'selected' : '') . ">auto</option><option value='crypto' " . ((($edit['method_group'] ?? '') === 'crypto') ? 'selected' : '') . ">crypto</option><option value='bank' " . ((($edit['method_group'] ?? '') === 'bank') ? 'selected' : '') . ">bank</option><option value='card' " . ((($edit['method_group'] ?? '') === 'card') ? 'selected' : '') . ">card</option><option value='crypto_bot' " . ((($edit['method_group'] ?? '') === 'crypto_bot') ? 'selected' : '') . ">crypto bot</option></select></label>";
$body .= "<label>Visible category<br><select name='category_key' id='methodCategorySel'><option value=''>auto</option>";
foreach (($categoriesByKind[$methodKind] ?? []) as $cat) {
  $sel = (($edit['category_key'] ?? '') === ($cat['key_slug'] ?? '')) ? 'selected' : '';
  $body .= "<option value='" . h($cat['key_slug']) . "' $sel>" . h($cat['label_en']) . "</option>";
}
$body .= "</select></label>";
$body .= "<label>Expires in hours<br><input name='expires_hours' type='number' min='1' max='168' value='" . h($edit['expires_hours'] ?? 24) . "'></label>";
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='proof_required' " . (!empty($edit['proof_required']) ? 'checked' : '') . "> Proof required before confirm</label>";
$body .= "<label>Title (EN)<br><input name='title_en' value='" . h($edit['title_en'] ?? '') . "'></label>";
$body .= "<label>Title (AR)<br><input name='title_ar' value='" . h($edit['title_ar'] ?? '') . "'></label>";
$body .= "<label>Title (RU)<br><input name='title_ru' value='" . h($edit['title_ru'] ?? '') . "'></label>";
if (!empty($countries)) {
  $body .= "<div style='grid-column:1/-1'><div class='form-note' style='margin-bottom:8px'>Countries where this method is visible. Leave empty to keep it global.</div><div style='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px'>";
  foreach ($countries as $c) {
    $code = strtoupper((string)$c['code']);
    $checked = in_array($code, $editCountries, true) ? 'checked' : '';
    $body .= "<label style='display:flex;gap:8px;align-items:center'><input type='checkbox' name='countries[]' value='" . h($code) . "' $checked><span>" . h($code) . "</span></label>";
  }
  $body .= "</div></div>";
}
$body .= "<label style='grid-column:1/-1'>Method logo URL (optional, recommended on Railway)<br><input name='image_url' value='" . h($currentMethodImage) . "' placeholder='https://... or /assets/img/...'></label>";
$body .= "<label style='grid-column:1/-1'>Method logo upload<br><input type='file' name='image_file' accept='image/*'></label>";
$body .= "<div class='form-note' style='grid-column:1/-1'>Use a stable URL when possible. Upload still works, and the app will show the method logo in category cards and method cards.</div>";
if ($currentMethodImage !== '') {
  $body .= "<div style='grid-column:1/-1' class='admin-media-preview'><img src='" . h($currentMethodImage) . "' alt='Method image'><label style='display:flex;gap:8px;align-items:center'><input type='checkbox' name='remove_image' value='1'><span>Remove current method image</span></label></div>";
}
$body .= "<div style='grid-column:1/-1;padding:12px;border:1px solid rgba(24,201,143,.18);border-radius:14px;background:rgba(24,201,143,.06)'><strong>Client transfer details</strong><div class='form-note'>Fill these for Bank/Crypto methods. Card/Visa should use provider=stripe and does not need address, QR, or proof.</div></div>";
$body .= "<label style='grid-column:1/-1'>Wallet address / bank destination shown to client<br><textarea name='payment_address' rows='3' placeholder='USDT wallet address, IBAN/SWIFT, bank account, beneficiary name, or full funding destination'>" . h($edit['payment_address'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Payment QR URL (optional)<br><input name='payment_qr_url' value='" . h($currentMethodQr) . "' placeholder='https://... or /assets/img/payment_methods/qr/...'></label>";
$body .= "<label style='grid-column:1/-1'>Payment QR upload<br><input type='file' name='payment_qr_file' accept='image/*'></label>";
$body .= "<div class='form-note' style='grid-column:1/-1'>Paste a QR image URL or upload one. If no QR is added but an address exists, Funds will auto-generate a scannable QR from the address.</div>";
if ($currentMethodQr !== '') {
  $body .= "<div style='grid-column:1/-1' class='admin-media-preview'><img src='" . h($currentMethodQr) . "' alt='QR image'><label style='display:flex;gap:8px;align-items:center'><input type='checkbox' name='remove_qr' value='1'><span>Remove current QR image</span></label></div>";
}
$body .= "<label style='grid-column:1/-1'>Description (EN)<br><textarea name='desc_en' rows='2'>" . h($edit['desc_en'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Description (AR)<br><textarea name='desc_ar' rows='2'>" . h($edit['desc_ar'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Description (RU)<br><textarea name='desc_ru' rows='2'>" . h($edit['desc_ru'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Instructions (EN)<br><textarea name='instructions_en' rows='2'>" . h($edit['instructions_en'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Instructions (AR)<br><textarea name='instructions_ar' rows='2'>" . h($edit['instructions_ar'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>Instructions (RU)<br><textarea name='instructions_ru' rows='2'>" . h($edit['instructions_ru'] ?? '') . "</textarea></label>";
$body .= "<label style='grid-column:1/-1'>fields_json (optional visible details or withdrawal inputs)<br><textarea name='fields_json' rows='5' placeholder='[{&quot;key&quot;:&quot;network&quot;,&quot;label&quot;:&quot;Network&quot;,&quot;value&quot;:&quot;TRC20&quot;},{&quot;key&quot;:&quot;wallet_address&quot;,&quot;label&quot;:&quot;Wallet address&quot;,&quot;value&quot;:&quot;PUT_WALLET_ADDRESS_HERE&quot;}]'>" . h($edit['fields_json'] ?? '') . "</textarea></label>";
$body .= "<label>Min Amount<br><input name='min_amount' type='number' step='0.00000001' value='" . h($edit['min_amount'] ?? 0) . "'></label>";
$body .= "<label>Max Amount (0 = none)<br><input name='max_amount' type='number' step='0.00000001' value='" . h($edit['max_amount'] ?? 0) . "'></label>";
$body .= "<label>Sort Order<br><input name='sort_order' type='number' value='" . h($edit['sort_order'] ?? 0) . "'></label>";
$enabled = (($edit['status'] ?? 'active') === 'active');
$body .= "<label style='display:flex;gap:10px;align-items:center;margin-top:22px'><input type='checkbox' name='enabled' " . ($enabled ? 'checked' : '') . "> Enabled</label>";
$body .= "<div style='grid-column:1/-1;display:flex;gap:10px;align-items:center;margin-top:10px'><button class='btn' type='submit'>Save method</button><a class='btn' href='/admin/payment_methods.php'>Clear</a></div></form>";

$catJson = json_encode(array_map(static function($items){
  return array_values(array_map(static function($cat){
    return ['key'=>(string)($cat['key_slug'] ?? ''), 'label'=>(string)($cat['label_en'] ?? '')];
  }, $items));
}, $categoriesByKind), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$body .= "<script>(function(){const map=" . ($catJson ?: '{}') . ";try{const kindSel=document.getElementById('methodKindSel');const catSel=document.getElementById('methodCategorySel');if(!kindSel||!catSel) return;const currentValue=catSel.value;const renderOptions=(kind)=>{const rows=Array.isArray(map[kind])?map[kind]:[];const wanted=catSel.dataset.current||catSel.value||'';catSel.innerHTML='';const auto=document.createElement('option');auto.value='';auto.textContent='auto';catSel.appendChild(auto);rows.forEach(row=>{const opt=document.createElement('option');opt.value=String(row.key||'');opt.textContent=String(row.label||row.key||'');if(opt.value===wanted) opt.selected=true;catSel.appendChild(opt);});};catSel.dataset.current=currentValue;kindSel.addEventListener('change',()=>{catSel.dataset.current='';renderOptions(kindSel.value);});renderOptions(kindSel.value);}catch(e){}})();</script>";

$body .= "<div style='margin-top:16px;padding:14px;border:1px solid rgba(125,154,255,.14);border-radius:16px;background:linear-gradient(180deg,rgba(8,14,28,.74),rgba(6,11,23,.82))'>";
$body .= "<div class='split'><div><h3 class='section-title' style='font-size:16px'>User app preview</h3><p class='form-note'>Fast check for how active sections and payment methods will group inside Deposit and Withdraw tabs.</p></div><span class='pill ok'>Live mapping</span></div>";
$body .= "<div style='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px'>";
foreach (['deposit' => 'Deposit tab', 'withdraw' => 'Withdraw tab'] as $previewKind => $previewTitle) {
  $body .= "<div style='border:1px solid rgba(148,163,184,.10);border-radius:14px;padding:12px;background:rgba(5,10,22,.62)'><strong style='display:block;margin-bottom:10px'>" . h($previewTitle) . "</strong><div style='display:grid;gap:8px'>";
  $visibleCats = array_values(array_filter($categoriesByKind[$previewKind] ?? [], static fn($cat) => (($cat['status'] ?? 'active') === 'active')));
  if (!$visibleCats) {
    $body .= "<div class='empty' style='padding:12px'>No active categories</div>";
  }
  foreach ($visibleCats as $cat) {
    $key = (string)($cat['key_slug'] ?? '');
    $matches = array_values(array_filter($rows, static function($r) use ($previewKind, $key) {
      if (($r['kind'] ?? '') !== $previewKind || ($r['status'] ?? '') !== 'active') return false;
      return method_category_key($r) === $key;
    }));
    $label = (string)($cat['label_en'] ?? $key);
    $img = !empty($cat['image_url']) ? "<img src='" . h($cat['image_url']) . "' style='width:30px;height:30px;object-fit:cover;border-radius:10px;border:1px solid #334155'>" : "<span style='display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:rgba(96,138,255,.12);border:1px solid rgba(96,138,255,.20)'>" . h($cat['icon'] ?: strtoupper(substr($label, 0, 1))) . "</span>";
    $body .= "<div style='display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(148,163,184,.10);border-radius:12px;padding:10px;background:rgba(15,23,42,.58)'>" . $img . "<div style='min-width:0;flex:1'><div style='display:flex;justify-content:space-between;gap:8px'><b>" . h($label) . "</b><small class='muted'>" . count($matches) . " methods</small></div><small class='muted' style='display:block;margin-top:2px'>" . h($cat['hint_en'] ?? '') . "</small>";
    if ($matches) {
      $names = array_map(static fn($r) => (string)($r['title_en'] ?? $r['code'] ?? 'Method'), array_slice($matches, 0, 4));
      $body .= "<div style='display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'>" . implode('', array_map(static fn($name) => "<span class='pill'>" . h($name) . "</span>", $names)) . (count($matches) > 4 ? "<span class='pill'>+" . (count($matches) - 4) . "</span>" : "") . "</div>";
    } else {
      $body .= "<small class='warn-text' style='display:block;margin-top:8px'>No active methods assigned</small>";
    }
    $body .= "</div></div>";
  }
  $body .= "</div></div>";
}
$body .= "</div></div>";

$body .= "<div class='table-wrap' style='margin-top:16px'><table><thead><tr><th>ID</th><th>Kind</th><th>Code</th><th>Logo</th><th>QR</th><th>Category</th><th>Title</th><th>Setup</th><th>Countries</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>";
foreach ($rows as $r) {
  $img = !empty($r['image_url']) ? "<img src='" . h($r['image_url']) . "' style='max-height:34px;border-radius:10px;border:1px solid #334155'>" : "<span class='muted'>—</span>";
  $qr = !empty($r['payment_qr_url']) ? "<img src='" . h($r['payment_qr_url']) . "' style='max-height:34px;border-radius:10px;border:1px solid #334155'>" : "<span class='muted'>—</span>";
  $ccs = $pmCountries[(int)$r['id']] ?? [];
  $body .= "<tr><td>" . h($r['id']) . "</td><td>" . h($r['kind']) . "</td><td><code>" . h($r['code']) . "</code></td><td>" . $img . "</td><td>" . $qr . "</td><td>" . h(method_category_key($r)) . "</td><td>" . h($r['title_en'] ?? '') . "</td><td>" . method_setup_badges($r) . "</td><td>" . (empty($ccs) ? "<span class='muted'>global</span>" : h(implode(', ', $ccs))) . "</td><td>" . admin_status_pill((string)$r['status']) . "</td><td>" . h($r['sort_order']) . "</td><td class='inline-actions'><a class='btn' href='/admin/payment_methods.php?edit=" . h($r['id']) . "'>Edit</a><form method='post'>" . admin_csrf_input() . "<input type='hidden' name='action' value='toggle_method'><input type='hidden' name='id' value='" . h($r['id']) . "'><input type='hidden' name='cur' value='" . h($r['status']) . "'><button class='btn' type='submit'>" . (($r['status'] === 'active') ? 'Disable' : 'Enable') . "</button></form><form method='post' onsubmit=\"return confirm('Delete this payment method?');\">" . admin_csrf_input() . "<input type='hidden' name='action' value='delete_method'><input type='hidden' name='id' value='" . h($r['id']) . "'><button class='btn danger' type='submit'>Delete</button></form></td></tr>";
}
$body .= "</tbody></table></div></div>";

admin_layout('Funding', $body);
