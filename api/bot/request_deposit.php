<?php
require_once __DIR__ . '/_common.php';

bot_require_token();
$pdo = db();

$telegramId = $_POST['telegram_id'] ?? ($_GET['telegram_id'] ?? '');
$amount = (float)($_POST['amount'] ?? ($_GET['amount'] ?? 0));
$currency = strtoupper(trim((string)($_POST['currency'] ?? ($_GET['currency'] ?? 'USDT'))));
$method = trim((string)($_POST['method'] ?? ($_GET['method'] ?? 'BOT')));
$note = trim((string)($_POST['note'] ?? ($_GET['note'] ?? '')));
$mode = strtolower(trim((string)($_POST['mode'] ?? ($_GET['mode'] ?? 'real'))));
if (!in_array($mode, ['demo','real'], true)) $mode = 'real';

if ($amount <= 0) json_response(['ok'=>false,'error'=>'Invalid amount'], 422);

$u = bot_user_by_telegram_id($pdo, (string)$telegramId);
if (!$u) json_response(['ok'=>false,'error'=>'User not found'], 404);

$uid = (int)$u['id'];
$ref = 'BOT-' . bin2hex(random_bytes(8));

$st = $pdo->prepare("INSERT INTO deposits (user_id,amount,currency,method,status,reference,meta_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))");
$meta = json_encode([
  'source'=>'telegram-bot',
  'telegram_id'=>$u['telegram_id'],
  'telegram_username'=>$u['telegram_username'] ?? null,
  'note'=>$note,
  'mode'=>$mode,
], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
$st->execute([$uid, $amount, $currency, $method, 'pending', $ref, $meta]);

json_response(['ok'=>true,'reference'=>$ref,'status'=>'pending']);


// --- Added by reviewer: country selection flow ---
if (isset($step) && $step === 'amount_entered') {
    $countries = ['Russia','UAE','Saudi Arabia','Egypt','USA'];
    $keyboard = [];
    foreach ($countries as $c) {
        $keyboard[] = [['text' => $c]];
    }
    sendMessage($chat_id, "اختر دولتك:", $keyboard);
    updateStep($user_id, 'select_country');
    exit;
}

if (isset($step) && $step === 'select_country' && isset($message_text)) {
    $selectedCountry = trim($message_text);
    // fetch methods for country - placeholder function
    $methods = getPaymentMethodsByCountry($selectedCountry);
    if (empty($methods)) {
        sendMessage($chat_id, "لا توجد وسائل دفع لهذه الدولة. الرجاء الاتصال بالدعم.");
        exit;
    }
    $keyboard = [];
    foreach ($methods as $m) {
        $keyboard[] = [['text' => $m['name']]];
    }
    sendMessage($chat_id, "اختر وسيلة الدفع:", $keyboard);
    // store selected country in user's session (placeholder)
    updateUserMeta($user_id, 'deposit_country', $selectedCountry);
    updateStep($user_id, 'select_payment_method');
    exit;
}

if (isset($step) && $step === 'select_payment_method' && isset($message_text)) {
    $method = trim($message_text);
    $methodData = getPaymentMethodByName($method);
    if (!$methodData) {
        sendMessage($chat_id, "وسيلة غير موجودة.");
        exit;
    }
    // send payment instructions and request proof upload
    sendMessage($chat_id, "تعليمات الدفع:\n" . $methodData['instructions'] . "\n\nأرسل صورة إثبات التحويل.");
    updateStep($user_id, 'upload_proof');
    exit;
}

if (isset($step) && $step === 'upload_proof' && isset($message_type) && $message_type === 'photo') {
    // Save proof logic placeholder
    $ref = saveDepositProof($user_id, $message_photo_id);
    updateStatus($ref, 'under_review');
    sendMessage($chat_id, "تم استلام إثبات التحويل وجاري المراجعة.");
    // Notify admins if needed
    notifyAdmins("New deposit proof uploaded for user {$user_id}, ref {$ref}");
    exit;
}

// placeholder helper functions (minimal stubs) - adapt to project's existing functions
function getPaymentMethodsByCountry($country) {
    // This should query DB mapping table 'country_payment_methods' to payment_methods
    return [ ['name'=>'Bank Transfer','instructions'=>'ارسل المبلغ إلى الحساب التالي ...'] ];
}
function getPaymentMethodByName($name) {
    return ['name'=>$name,'instructions'=>'تعليمات عامة للدفع'];
}
function saveDepositProof($user_id, $photo_id) {
    // implement saving and return a reference id
    return uniqid('dep_');
}

// --- end bot flow additions ---
