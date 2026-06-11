<?php
declare(strict_types=1);

// Affiliate / Managers bot webhook (mexaff_bot)
// - Main admin approves managers
// - Each manager can manage ONLY their clients (scoped)

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';
require_once __DIR__ . '/api/lib/settings.php';
require_once __DIR__ . '/api/lib/ledger.php';
require_once __DIR__ . '/api/lib/quotes.php';
require_once __DIR__ . '/api/lib/risk.php';
require_once __DIR__ . '/api/lib/affiliates.php';

header('Content-Type: application/json; charset=utf-8');

// ---- Security ----
$pathToken = (string)env('AFF_BOT_PATH_TOKEN', '');
if ($pathToken !== '') {
  $got = (string)($_GET['token'] ?? '');
  if (!hash_equals($pathToken, $got)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$secret = (string)env('AFF_BOT_WEBHOOK_SECRET', '');
if ($secret !== '') {
  $hdr = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');
  if (!hash_equals($secret, $hdr)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$affToken = (string)env('AFF_BOT_TOKEN','');
if ($affToken === '') {
  echo json_encode(['ok'=>false,'error'=>'AFF_BOT_TOKEN missing']);
  exit;
}

$update = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
try {
  if (is_array($update) && $update) {
    tp_log('bot_aff','INFO','incoming', ['update_id'=>(int)($update['update_id'] ?? 0),'keys'=>array_keys($update)]);
  }
} catch (Throwable $e) {}

// Fast ACK to Telegram to avoid update backlog (shared hosting). We still continue processing.
$__aff_ack_sent = false;
function aff_webhook_fast_ack(): void {
  global $__aff_ack_sent;
  if ($__aff_ack_sent) return;
  $__aff_ack_sent = true;
  try {
    @ignore_user_abort(true);
    @http_response_code(200);
    $resp = json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($resp) || $resp === '') $resp = '{"ok":true}';
    header('Content-Type: application/json; charset=utf-8');
    header('Connection: close');
    header('Content-Length: ' . strlen($resp));
    while (ob_get_level() > 0) { @ob_end_flush(); }
    echo $resp;
    @flush();
    if (function_exists('fastcgi_finish_request')) {
      @fastcgi_finish_request();
    }
  } catch (Throwable $e) {
    // ignore
  }
}

aff_webhook_fast_ack();

function aff_tg_api(string $method, array $payload): array {
  $token = (string)env('AFF_BOT_TOKEN','');
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 14,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function pay_bot_token(): string {
  $t = (string)env('BOT_TOKEN','');
  if ($t !== '') return $t;
  // fallback: admin setting (main bot)
  try {
    $t = (string)setting_get('bot.token','');
    if ($t !== '') return $t;
  } catch (Throwable $e) {}
  return '';
}

function pay_tg_api(string $method, array $payload): array {
  $token = pay_bot_token();
  if ($token === '') return ['ok'=>false,'error'=>'PAY bot token missing'];
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 14,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function main_bot_token(): string {
  $t = (string)env('TELEGRAM_BOT_TOKEN','');
  if ($t !== '') return $t;
  return (string)env('BOT_TOKEN','');
}

function main_tg_api(string $method, array $payload): array {
  $token = main_bot_token();
  if ($token === '') return ['ok'=>false,'error'=>'MAIN bot token missing'];
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 14,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function app_url_aff(): string {
  $u = (string)env('SITE_URL', '');
  if ($u !== '') return rtrim($u,'/');
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  return $scheme . '://' . $host;
}

function mgr_state_get(string $chatId): ?array {
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT chat_id,tg_user_id,state,data FROM bot_states_aff WHERE chat_id=? LIMIT 1');
    $st->execute([$chatId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if (!$r) return null;
    $data = $r['data'] ?? null;
    if (is_string($data) && $data !== '') {
      $j = json_decode($data, true);
      $r['data'] = is_array($j) ? $j : [];
    } else {
      $r['data'] = [];
    }
    return $r;
  } catch (Throwable $e) {
    return null;
  }
}

function mgr_state_set(string $chatId, string $tgUserId, string $state, array $data): void {
  $pdo = db();
  $now = time();

  // Preserve chat language if already selected
  try {
    $cur = mgr_state_get($chatId);
    $curData = is_array($cur['data'] ?? null) ? $cur['data'] : [];
    if (isset($curData['lang']) && !isset($data['lang'])) {
      $data['lang'] = (string)$curData['lang'];
    }
  } catch (Throwable $e) {}

  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  try {
    if (db_driver() === 'mysql') {
      $pdo->prepare('INSERT INTO bot_states_aff(chat_id,tg_user_id,state,data,updated_at) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE tg_user_id=VALUES(tg_user_id), state=VALUES(state), data=VALUES(data), updated_at=VALUES(updated_at)')
        ->execute([$chatId, $tgUserId, $state, $json, $now]);
    } else {
      $pdo->prepare('INSERT INTO bot_states_aff(chat_id,tg_user_id,state,data,updated_at) VALUES (?,?,?,?,?)
        ON CONFLICT(chat_id) DO UPDATE SET tg_user_id=excluded.tg_user_id, state=excluded.state, data=excluded.data, updated_at=excluded.updated_at')
        ->execute([$chatId, $tgUserId, $state, $json, $now]);
    }
  } catch (Throwable $e) {}
}


function mgr_state_clear(string $chatId): void {
  $pdo = db();

  // IMPORTANT: do NOT delete the row completely, otherwise we lose the stored language
  // and the bot falls back to English on the next message.
  $lang = '';
  try {
    $cur = mgr_state_get($chatId);
    $curData = is_array($cur['data'] ?? null) ? $cur['data'] : [];
    $lang = (string)($curData['lang'] ?? '');
  } catch (Throwable $e) { $lang = ''; }

  $data = [];
  if (in_array($lang, ['en','ar','ru'], true)) $data['lang'] = $lang;
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $now = time();

  try {
    if (db_driver() === 'mysql') {
      $pdo->prepare('UPDATE bot_states_aff SET state="", data=?, updated_at=? WHERE chat_id=?')
          ->execute([$json, $now, $chatId]);
    } else {
      $pdo->prepare('UPDATE bot_states_aff SET state="", data=?, updated_at=? WHERE chat_id=?')
          ->execute([$json, $now, $chatId]);
    }
  } catch (Throwable $e) {
    // fallback: last resort delete
    try { $pdo->prepare('DELETE FROM bot_states_aff WHERE chat_id=?')->execute([$chatId]); } catch (Throwable $e2) {}
  }
}

function aff_send(int $chatId, string $text, ?array $kb = null): void {
  // Auto navigation row (Main menu + Commands)
  if (is_array($kb) && $kb) {
    $hasNav = false;
    foreach ($kb as $row) {
      if (!is_array($row)) continue;
      foreach ($row as $btn) {
        $cd = is_array($btn) ? (string)($btn['callback_data'] ?? '') : '';
        if ($cd === 'm:home' || $cd === 'm:help') { $hasNav = true; break 2; }
      }
    }
    if (!$hasNav) {
      try { $kb[] = kb_nav_row(aff_chat_lang($chatId)); } catch (Throwable $e) {}
    }
  }

  $p = ['chat_id'=>$chatId, 'text'=>$text, 'parse_mode'=>'HTML', 'disable_web_page_preview'=>true];
  if ($kb) $p['reply_markup'] = ['inline_keyboard'=>$kb];
  aff_tg_api('sendMessage', $p);
}

function aff_edit(int $chatId, int $msgId, string $text, ?array $kb=null): void {
  $p = ['chat_id'=>$chatId, 'message_id'=>$msgId, 'text'=>$text, 'parse_mode'=>'HTML', 'disable_web_page_preview'=>true];
  if ($kb) $p['reply_markup'] = ['inline_keyboard'=>$kb];
  aff_tg_api('editMessageText', $p);
}

function aff_answer_cb(string $cbId, string $text=''): void {
  $p = ['callback_query_id'=>$cbId];
  if ($text !== '') $p['text'] = $text;
  $p['show_alert'] = false;
  aff_tg_api('answerCallbackQuery', $p);
}

// ---- Affiliate bot i18n (AR / EN / RU) ----
function aff_lang_norm(string $lang): string {
  $lang = strtolower(trim($lang));
  return in_array($lang, ['ar','en','ru'], true) ? $lang : 'en';
}

function aff_tr(string $lang, string $key): string {
  $lang = aff_lang_norm($lang);
  static $T = null;
  if ($T === null) {
    $T = [
      'choose_lang_title' => ['ar'=>'🌐 اختر اللغة', 'en'=>'🌐 Choose language', 'ru'=>'🌐 Выберите язык'],
      'choose_lang_sub'   => ['ar'=>'يرجى اختيار اللغة التي تريد استخدام البوت بها.', 'en'=>'Please choose the language you want to use.', 'ru'=>'Пожалуйста, выберите язык для работы с ботом.'],
      'pending_review'    => ['ar'=>"✅ تم استلام طلبك.\n\n⏳ طلبك قيد المراجعة وسيتم تفعيله بعد الموافقة.", 'en'=>"✅ Your request has been received.\n\n⏳ Your request is under review and will be activated after approval.", 'ru'=>"✅ Заявка получена.\n\n⏳ Ваша заявка на рассмотрении и будет активирована после одобрения."],
      'blocked'           => ['ar'=>"⛔ حسابك موقوف. يرجى التواصل مع الإدارة.", 'en'=>"⛔ Your account is blocked. Please contact support.", 'ru'=>"⛔ Ваш аккаунт заблокирован. Обратитесь в поддержку."],

      'menu_welcome'      => ['ar'=>'👋 مرحبًا', 'en'=>'👋 Welcome', 'ru'=>'👋 Добро пожаловать'],
      'menu_choose'       => ['ar'=>'اختر من القائمة:', 'en'=>'Choose an option:', 'ru'=>'Выберите действие:'],

      'invite'            => ['ar'=>'🔗 رابط الدعوة', 'en'=>'🔗 Invite link', 'ru'=>'🔗 Пригласительная ссылка'],
      'clients'           => ['ar'=>'👥 العملاء', 'en'=>'👥 Clients', 'ru'=>'👥 Клиенты'],
      'deps'              => ['ar'=>'💰 إيداعات معلّقة', 'en'=>'💰 Pending deposits', 'ru'=>'💰 Ожидающие пополнения'],
      'wdrs'              => ['ar'=>'🏧 سحوبات معلّقة', 'en'=>'🏧 Pending withdrawals', 'ru'=>'🏧 Ожидающие выводы'],
      'kyc'               => ['ar'=>'🪪 توثيق (KYC) معلّق', 'en'=>'🪪 Pending KYC', 'ru'=>'🪪 KYC на проверке'],
      'language'          => ['ar'=>'🌐 تغيير اللغة', 'en'=>'🌐 Change language', 'ru'=>'🌐 Язык'],
      'back'              => ['ar'=>'⬅️ رجوع', 'en'=>'⬅️ Back', 'ru'=>'⬅️ Назад'],
      'cancel'            => ['ar'=>'✖️ إلغاء', 'en'=>'✖️ Cancel', 'ru'=>'✖️ Отмена'],

      'btn_confirm'        => ['ar'=>'✅ تأكيد', 'en'=>'✅ Confirm', 'ru'=>'✅ Подтвердить'],
      'btn_fail'           => ['ar'=>'❌ رفض', 'en'=>'❌ Fail', 'ru'=>'❌ Отклонить'],
      'btn_approve'        => ['ar'=>'✅ موافقة', 'en'=>'✅ Approve', 'ru'=>'✅ Одобрить'],
      'btn_reject'         => ['ar'=>'❌ رفض', 'en'=>'❌ Reject', 'ru'=>'❌ Отклонить'],
      'btn_complete'       => ['ar'=>'✅ إتمام', 'en'=>'✅ Complete', 'ru'=>'✅ Завершить'],
      'btn_adj_pnl'        => ['ar'=>'✏️ تعديل PNL', 'en'=>'✏️ Adjust PNL', 'ru'=>'✏️ Изменить PNL'],
      'btn_edit_trade'     => ['ar'=>'✏️ تعديل الصفقة', 'en'=>'✏️ Edit trade', 'ru'=>'✏️ Изменить сделку'],
      'btn_edit_entry_exit'=> ['ar'=>'✏️ تعديل الدخول/الخروج', 'en'=>'✏️ Edit entry/exit', 'ru'=>'✏️ Изменить вход/выход'],

      'err_dep_nf'         => ['ar'=>'الإيداع غير موجود.', 'en'=>'Deposit not found.', 'ru'=>'Депозит не найден.'],
      'err_wdr_nf'         => ['ar'=>'السحب غير موجود.', 'en'=>'Withdrawal not found.', 'ru'=>'Вывод не найден.'],
      'err_trade_nf'       => ['ar'=>'الصفقة غير موجودة.', 'en'=>'Trade not found.', 'ru'=>'Сделка не найдена.'],

      'lbl_user'           => ['ar'=>'العميل', 'en'=>'User', 'ru'=>'Клиент'],
      'lbl_amount'         => ['ar'=>'المبلغ', 'en'=>'Amount', 'ru'=>'Сумма'],
      'lbl_status'         => ['ar'=>'الحالة', 'en'=>'Status', 'ru'=>'Статус'],
      'lbl_created'        => ['ar'=>'التاريخ', 'en'=>'Created', 'ru'=>'Создано'],
      'lbl_method'         => ['ar'=>'الوسيلة', 'en'=>'Method', 'ru'=>'Метод'],
      'lbl_balance'        => ['ar'=>'الرصيد', 'en'=>'Balance', 'ru'=>'Баланс'],
      'lbl_available'      => ['ar'=>'المتاح', 'en'=>'Available', 'ru'=>'Доступно'],
      // Generic status labels (for deposit/withdraw requests)
      'status_pending'     => ['ar'=>'⏳ قيد الانتظار', 'en'=>'⏳ Pending', 'ru'=>'⏳ В ожидании'],
      'status_pinding'     => ['ar'=>'⏳ قيد الانتظار', 'en'=>'⏳ Pending', 'ru'=>'⏳ В ожидании'],
      'status_requested'   => ['ar'=>'⏳ قيد المراجعة', 'en'=>'⏳ Requested', 'ru'=>'⏳ Запрошено'],
      'status_confirmed'   => ['ar'=>'✅ مؤكد', 'en'=>'✅ Confirmed', 'ru'=>'✅ Подтверждено'],
      'status_approved'    => ['ar'=>'✅ تمت الموافقة', 'en'=>'✅ Approved', 'ru'=>'✅ Одобрено'],
      'status_rejected'    => ['ar'=>'❌ مرفوض', 'en'=>'❌ Rejected', 'ru'=>'❌ Отклонено'],
      'status_failed'      => ['ar'=>'❌ فشل', 'en'=>'❌ Failed', 'ru'=>'❌ Ошибка'],
      'status_completed'   => ['ar'=>'✅ مكتمل', 'en'=>'✅ Completed', 'ru'=>'✅ Завершено'],

      'status_active'      => ['ar'=>'✅ نشط', 'en'=>'✅ Active', 'ru'=>'✅ Активен'],

      'user_message'      => ['ar'=>'📩 مراسلة العميل', 'en'=>'📩 Message client', 'ru'=>'📩 Сообщение клиенту'],
      'user_depos'        => ['ar'=>'💰 الإيداعات', 'en'=>'💰 Deposits', 'ru'=>'💰 Пополнения'],
      'user_with'         => ['ar'=>'🏧 السحوبات', 'en'=>'🏧 Withdrawals', 'ru'=>'🏧 Выводы'],

      'deposit'           => ['ar'=>'إيداع', 'en'=>'Deposit', 'ru'=>'Депозит'],
      'withdrawal'        => ['ar'=>'سحب', 'en'=>'Withdrawal', 'ru'=>'Вывод'],
      'user_open'         => ['ar'=>'📈 صفقات مفتوحة', 'en'=>'📈 Open trades', 'ru'=>'📈 Открытые сделки'],
      'user_closed'       => ['ar'=>'🧾 صفقات مغلقة', 'en'=>'🧾 Closed trades', 'ru'=>'🧾 Закрытые сделки'],

      'no_closed_trades'   => ['ar'=>'لا يوجد صفقات مغلقة (REAL) لهذا العميل حالياً.', 'en'=>'No closed trades (REAL) for this client yet.', 'ru'=>'Пока нет закрытых сделок (REAL) для этого клиента.'],
      'ask_edit_entry_exit'=> ['ar'=>"✍️ ابعت Entry و Exit مفصولين بمسافة\nمثال: 42000 42500", 'en'=>"✍️ Send Entry and Exit separated by a space\nExample: 42000 42500", 'ru'=>"✍️ Отправьте Entry и Exit через пробел\nПример: 42000 42500"],

      'order'             => ['ar'=>'أمر', 'en'=>'Order', 'ru'=>'Ордер'],
      'symbol'            => ['ar'=>'الرمز', 'en'=>'Symbol', 'ru'=>'Символ'],
      'side'              => ['ar'=>'الاتجاه', 'en'=>'Side', 'ru'=>'Сторона'],
      'qty'               => ['ar'=>'الكمية', 'en'=>'Qty', 'ru'=>'Кол-во'],
      'entry'             => ['ar'=>'الدخول', 'en'=>'Entry', 'ru'=>'Вход'],
      'exit'              => ['ar'=>'الخروج', 'en'=>'Exit', 'ru'=>'Выход'],
      'pnl'               => ['ar'=>'الربح/الخسارة', 'en'=>'PnL', 'ru'=>'PnL'],
      'freeze'            => ['ar'=>'⛔ تجميد الحساب', 'en'=>'⛔ Freeze account', 'ru'=>'⛔ Заморозить'],
      'unfreeze'          => ['ar'=>'✅ فك التجميد', 'en'=>'✅ Unfreeze', 'ru'=>'✅ Разморозить'],
      'disable_deposit'   => ['ar'=>'🚫 تعطيل الإيداع', 'en'=>'🚫 Disable deposit', 'ru'=>'🚫 Запретить пополнение'],
      'enable_deposit'    => ['ar'=>'✅ تفعيل الإيداع', 'en'=>'✅ Enable deposit', 'ru'=>'✅ Разрешить пополнение'],
      'disable_withdraw'  => ['ar'=>'🚫 تعطيل السحب', 'en'=>'🚫 Disable withdrawal', 'ru'=>'🚫 Запретить вывод'],
      'enable_withdraw'   => ['ar'=>'✅ تفعيل السحب', 'en'=>'✅ Enable withdrawal', 'ru'=>'✅ Разрешить вывод'],
      'disable_trade'     => ['ar'=>'🚫 تعطيل التداول', 'en'=>'🚫 Disable trading', 'ru'=>'🚫 Запретить торговлю'],
      'enable_trade'      => ['ar'=>'✅ تفعيل التداول', 'en'=>'✅ Enable trading', 'ru'=>'✅ Разрешить торговлю'],

      'no_clients'        => ['ar'=>'👥 لا يوجد عملاء مرتبطون برابطك حتى الآن.', 'en'=>'👥 No clients linked to your invite yet.', 'ru'=>'👥 Пока нет клиентов, привязанных к вашей ссылке.'],
      'your_clients'      => ['ar'=>'👥 <b>عملاؤك</b>', 'en'=>'👥 <b>Your clients</b>', 'ru'=>'👥 <b>Ваши клиенты</b>'],

      'no_deps'            => ['ar'=>'لا يوجد إيداعات لهذا العميل.', 'en'=>'No deposits for this client.', 'ru'=>'Нет пополнений для этого клиента.'],
      'no_deps_pending'    => ['ar'=>'لا يوجد إيداعات معلّقة.', 'en'=>'No pending deposits.', 'ru'=>'Нет ожидающих пополнений.'],
      'no_wdrs'            => ['ar'=>'لا يوجد سحوبات لهذا العميل.', 'en'=>'No withdrawals for this client.', 'ru'=>'Нет выводов для этого клиента.'],
      'no_wdrs_pending'    => ['ar'=>'لا يوجد سحوبات معلّقة.', 'en'=>'No pending withdrawals.', 'ru'=>'Нет ожидающих выводов.'],
      'no_kyc'             => ['ar'=>'لا يوجد KYC معلّق.', 'en'=>'No pending KYC.', 'ru'=>'Нет KYC на проверке.'],

      'invite_title'      => ['ar'=>'🔗 <b>رابط الدعوة الخاص بك</b>', 'en'=>'🔗 <b>Your invite link</b>', 'ru'=>'🔗 <b>Ваша пригласительная ссылка</b>'],
      'invite_first_touch'=> ['ar'=>'أي عميل يستخدم هذا الرابط سيتم ربطه بك مرة واحدة.', 'en'=>'Any client who uses this link will be bound to you (first-touch).', 'ru'=>'Клиент, использующий ссылку, будет привязан к вам (первое касание).'],

      'send_text_only'    => ['ar'=>'⚠️ يرجى إرسال رسالة نصية فقط.', 'en'=>'⚠️ Please send text only.', 'ru'=>'⚠️ Пожалуйста, отправьте только текст.'],
      'msg_sent'          => ['ar'=>'✅ تم إرسال الرسالة إلى العميل.', 'en'=>'✅ Message sent to client.', 'ru'=>'✅ Сообщение отправлено клиенту.'],
      'not_allowed'       => ['ar'=>'غير مسموح.', 'en'=>'Not allowed.', 'ru'=>'Недоступно.'],

      'ask_msg'            => ['ar'=>'✍️ ابعت رسالة للعميل دلوقتي (هتتبعت له على البوت):', 'en'=>'✍️ Send the message text to the client now:', 'ru'=>'✍️ Отправьте текст сообщения клиенту:'],
      'ask_msg_cancel'     => ['ar'=>'تم الإلغاء.', 'en'=>'Cancelled.', 'ru'=>'Отменено.'],

      'ask_freeze_reason' => ['ar'=>'✍️ اكتب سبب التجميد:', 'en'=>'✍️ Enter freeze reason:', 'ru'=>'✍️ Укажите причину заморозки:'],
      'ask_adj_pnl'       => ['ar'=>'✍️ أرسل Target PNL بالدولار (مثال: 50 أو -20):', 'en'=>'✍️ Send target PNL in USD (e.g. 50 or -20):', 'ru'=>'✍️ Укажите целевой PNL в USD (например 50 или -20):'],
      'ask_edit_closed'   => ['ar'=>"✍️ أرسل سعر الدخول والخروج مفصولين بمسافة\nمثال: 42000 42500", 'en'=>"✍️ Send entry and exit separated by space\nExample: 42000 42500", 'ru'=>"✍️ Укажите вход и выход через пробел\nПример: 42000 42500"],
      'invalid_number'    => ['ar'=>'⚠️ رقم غير صحيح.', 'en'=>'⚠️ Invalid number.', 'ru'=>'⚠️ Неверное число.'],
      'invalid_format'    => ['ar'=>'⚠️ صيغة غير صحيحة. أرسل: entry exit', 'en'=>'⚠️ Invalid format. Send: entry exit', 'ru'=>'⚠️ Неверный формат. Отправьте: entry exit'],
    ];
  }
  return $T[$key][$lang] ?? $T[$key]['en'] ?? $key;
}

function aff_status_label(string $lang, string $status): string {
  $st = strtolower(trim((string)$status));
  if ($st === '') return '';
  $k = 'status_'.$st;
  $v = aff_tr($lang, $k);
  return ($v !== $k) ? $v : (string)$status;
}

function aff_kb_lang(): array {
  return [[
    ['text'=>'🇸🇦 العربية', 'callback_data'=>'lang:ar'],
    ['text'=>'🇬🇧 English', 'callback_data'=>'lang:en'],
    ['text'=>'🇷🇺 Русский', 'callback_data'=>'lang:ru'],
  ]];
}

function aff_chat_lang(int $chatId, ?array $manager = null): string {
  // priority: state lang -> manager.lang -> default
  $st = mgr_state_get((string)$chatId);
  if ($st && is_array($st['data'] ?? null) && isset($st['data']['lang'])) {
    return aff_lang_norm((string)$st['data']['lang']);
  }
  if ($manager && isset($manager['lang'])) {
    return aff_lang_norm((string)$manager['lang']);
  }
  return 'en';
}

function kb_main(string $lang='en'): array {
  $lang = aff_lang_norm($lang);
  return [
    [ ['text'=>aff_tr($lang,'invite'),'callback_data'=>'m:inv'], ['text'=>aff_tr($lang,'clients'),'callback_data'=>'m:clients'] ],
    [ ['text'=>aff_tr($lang,'deps'),'callback_data'=>'m:deps'], ['text'=>aff_tr($lang,'wdrs'),'callback_data'=>'m:wdrs'] ],
    [ ['text'=>aff_tr($lang,'kyc'),'callback_data'=>'m:kyc'] ],
    [ ['text'=>aff_tr($lang,'language'),'callback_data'=>'m:lang'] ],
  ];
}


function kb_nav_row(string $lang='en'): array {
  $lang = aff_lang_norm($lang);
  $home = ($lang==='ar') ? '🏠 القائمة الرئيسية' : (($lang==='ru') ? '🏠 Главное меню' : '🏠 Main menu');
  $cmd  = ($lang==='ar') ? '📋 الأوامر' : (($lang==='ru') ? '📋 Команды' : '📋 Commands');
  return [
    ['text'=>$home,'callback_data'=>'m:home'],
    ['text'=>$cmd,'callback_data'=>'m:help'],
  ];
}


function kb_user_menu(string $lang, int $uid, array $u): array {
  $lang = aff_lang_norm($lang);
  $frozen = (int)($u['is_frozen'] ?? 0) === 1;
  $depOff = (int)($u['deposit_disabled'] ?? 0) === 1;
  $wdrOff = (int)($u['withdraw_disabled'] ?? 0) === 1;
  $trdOff = (int)($u['trade_disabled'] ?? 0) === 1;
  return [
    [ ['text'=>aff_tr($lang,'user_message'),'callback_data'=>'u:'.$uid.':msg'] ],
    [ ['text'=>aff_tr($lang,'user_depos'),'callback_data'=>'u:'.$uid.':depos'], ['text'=>aff_tr($lang,'user_with'),'callback_data'=>'u:'.$uid.':with'] ],
    [ ['text'=>aff_tr($lang,'user_open'),'callback_data'=>'u:'.$uid.':openpos'], ['text'=>aff_tr($lang,'user_closed'),'callback_data'=>'u:'.$uid.':closed'] ],
    [ ['text'=>aff_tr($lang,'kyc'),'callback_data'=>'u:'.$uid.':kyc'] ],
    [ ['text'=>($frozen?aff_tr($lang,'unfreeze'):aff_tr($lang,'freeze')),'callback_data'=>'u:'.$uid.':freeze'] ],
    [
      ['text'=>($depOff?aff_tr($lang,'enable_deposit'):aff_tr($lang,'disable_deposit')),'callback_data'=>'u:'.$uid.':tdep'],
      ['text'=>($wdrOff?aff_tr($lang,'enable_withdraw'):aff_tr($lang,'disable_withdraw')),'callback_data'=>'u:'.$uid.':twdr'],
    ],
    [ ['text'=>($trdOff?aff_tr($lang,'enable_trade'):aff_tr($lang,'disable_trade')),'callback_data'=>'u:'.$uid.':ttrd'] ],
    [ ['text'=>aff_tr($lang,'back'),'callback_data'=>'m:clients'] ],
  ];
}


function format_user_row(array $u): string {
  $id = (int)($u['id'] ?? 0);
  $un = (string)($u['username'] ?? '');
  $name = trim((string)($u['first_name'] ?? '').' '.(string)($u['last_name'] ?? ''));
  $tg = (string)($u['tg_id'] ?? '');
  $frozen = (int)($u['is_frozen'] ?? 0) === 1 ? '⛔' : '';
  $who = $un ? ('@'.$un) : ($name ?: ('TG#'.$tg));
  return "{$frozen} UID {$id} • ".htmlspecialchars($who);
}

function require_manager_active(int $chatId, int $tgUserId, array $tgUser): ?array {
  // ensure schema upgraded
  try { schema_upgrade(db(), db_driver()); } catch (Throwable $e) {}

  if (aff_is_admin_chat($chatId)) {
    return ['role'=>'admin'];
  }

  $m = aff_manager_ensure($tgUserId, $tgUser, 'pending');
  $lang = aff_chat_lang($chatId, $m);

  // Ensure lang persisted for this chat
  try { mgr_state_set((string)$chatId, (string)$tgUserId, '', ['lang'=>$lang]); } catch (Throwable $e) {}

  $status = strtolower((string)($m['status'] ?? 'pending'));
  if ($status === 'blocked') {
    aff_send($chatId, aff_tr($lang,'blocked'), null);
    return null;
  }
  if ($status !== 'active') {
    aff_send($chatId, aff_tr($lang,'pending_review'), null);
    return null;
  }
  return $m;
}


function admin_panel(int $chatId): void {
  $pdo = db();
  $pend = [];
  try {
    $pend = $pdo->query("SELECT id,tg_id,username,first_name,last_name,status,created_at FROM managers WHERE status='pending' ORDER BY id DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) { $pend = []; }
  $txt = "👑 <b>لوحة الأدمن</b>\n\n";
  if (!$pend) {
    $txt .= "لا يوجد مسوقين/مديرين في الانتظار.";
    aff_send($chatId, $txt, null);
    return;
  }
  $txt .= "طلبات جديدة: ".count($pend)."\n\nاختار مسوق للموافقة/الحظر:";
  $kb = [];
  foreach ($pend as $m) {
    $name = trim((string)($m['first_name'] ?? '').' '.(string)($m['last_name'] ?? ''));
    $u = (string)($m['username'] ?? '');
    $label = ($u ? '@'.$u : ($name ?: ('TG#'.(string)$m['tg_id']))) . ' (ID '.(int)$m['id'].')';
    $kb[] = [
      ['text'=>'✅ '.$label, 'callback_data'=>'adm:appr:'.(int)$m['id']],
      ['text'=>'⛔ حظر', 'callback_data'=>'adm:block:'.(int)$m['id']],
    ];
    if (count($kb) >= 15) break;
  }
  aff_send($chatId, $txt, $kb);
}

function manager_menu(int $chatId, array $m): void {
  $lang = aff_chat_lang($chatId, $m);
  $name = trim((string)($m['first_name'] ?? '').' '.(string)($m['last_name'] ?? ''));
  $label = $name ?: ((string)$m['username'] ?: 'Manager');
  $txt = aff_tr($lang,'menu_welcome') . " <b>" . htmlspecialchars($label) . "</b>

" . aff_tr($lang,'menu_choose');
  aff_send($chatId, $txt, kb_main($lang));
}


function list_clients(int $chatId, int $managerId, int $limit=30): void {
  $lang = aff_chat_lang($chatId);
  $pdo = db();
  $rows = [];
  try {
    $st = $pdo->prepare('SELECT id,tg_id,username,first_name,last_name,is_frozen,deposit_disabled,withdraw_disabled,trade_disabled FROM users WHERE manager_id=? ORDER BY id DESC LIMIT '.(int)$limit);
    $st->execute([$managerId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) { $rows=[]; }
  if (!$rows) {
        aff_send($chatId, aff_tr($lang,'no_clients'), kb_main($lang));
    return;
  }
  $kb = [];
  foreach ($rows as $u) {
    $uid = (int)$u['id'];
    $label = preg_replace('/\s+/', ' ', strip_tags(format_user_row($u)));
    $kb[] = [ ['text'=>$label, 'callback_data'=>'u:'.$uid] ];
    if (count($kb) >= 40) break;
  }
  $kb[] = [ ['text'=>aff_tr($lang,'back'),'callback_data'=>'m:menu'] ];
  $pick = ($lang==='ar'?'اختر عميل:':($lang==='ru'?'Выберите клиента:':'Select a client:'));
  aff_send($chatId, aff_tr($lang,'your_clients')." (".count($rows).")\n".$pick, $kb);
}

function show_invite(int $chatId, int $managerId): void {
  $lang = aff_chat_lang($chatId);
  $inv = aff_invite_latest($managerId);
  if (!$inv) $inv = aff_invite_create($managerId);
  $code = (string)($inv['code'] ?? '');
  $link = aff_invite_link($code);
  $txt = aff_tr($lang,'invite_title')."\n\n".
         "Code: <code>aff_".htmlspecialchars($code)."</code>\n".
         "Link: " . htmlspecialchars($link) . "\n\n".
         aff_tr($lang,'invite_first_touch');
  // Localize labels (Code/Link) for AR/RU
  if ($lang==='ar') { $txt = aff_tr($lang,'invite_title')."\n\n"."الكود: <code>aff_".htmlspecialchars($code)."</code>\n"."الرابط: ".htmlspecialchars($link)."\n\n".aff_tr($lang,'invite_first_touch'); }
  if ($lang==='ru') { $txt = aff_tr($lang,'invite_title')."\n\n"."Код: <code>aff_".htmlspecialchars($code)."</code>\n"."Ссылка: ".htmlspecialchars($link)."\n\n".aff_tr($lang,'invite_first_touch'); }

  aff_send($chatId, $txt, kb_main($lang));
}

function show_user(int $chatId, int $managerId, int $uid): void {
  $lang = aff_chat_lang($chatId);
  $pdo = db();
  $st = $pdo->prepare('SELECT id,tg_id,telegram_chat_id,username,first_name,last_name,locale,manager_id,is_frozen,frozen_reason,deposit_disabled,withdraw_disabled,trade_disabled FROM users WHERE id=? LIMIT 1');
  $st->execute([$uid]);
  $u = $st->fetch(PDO::FETCH_ASSOC);
  if (!$u) { $nf = ($lang==='ar'?'المستخدم غير موجود.':($lang==='ru'?'Пользователь не найден.':'User not found.')); aff_send($chatId, $nf, kb_main($lang)); return; }
  if ((int)($u['manager_id'] ?? 0) !== $managerId) { aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang)); return; }

  $name = trim((string)($u['first_name'] ?? '').' '.(string)($u['last_name'] ?? ''));
  $uname = (string)($u['username'] ?? '');
  $who = $uname ? '@'.$uname : ($name ?: ('TG#'.(string)$u['tg_id']));

  // Balance (USDT real + demo)
  $realCur = strtoupper((string)env('REAL_CURRENCY','USDT'));
  $demoCur = strtoupper((string)env('DEMO_CURRENCY','USDT_DEMO'));
  try { ensure_wallet($uid, $realCur); ensure_wallet($uid, $demoCur); } catch (Throwable $e) {}
  $realBal = 0.0; $demoBal = 0.0; $realAvail = null;
  try { $realBal = (float)wallet_balance($uid, $realCur); } catch (Throwable $e) {}
  try { $demoBal = (float)wallet_balance($uid, $demoCur); } catch (Throwable $e) {}
  try {
    $av = wallet_available($uid, $realCur);
    if (is_array($av) && isset($av['available'])) $realAvail = (float)$av['available'];
  } catch (Throwable $e) {}

  $flags = [];
  if ((int)($u['is_frozen'] ?? 0) === 1) $flags[] = ($lang==='ar'?'⛔ مجمّد':($lang==='ru'?'⛔ Заморожен':'⛔ Frozen'));
  if ((int)($u['deposit_disabled'] ?? 0) === 1) $flags[] = ($lang==='ar'?'🚫 إيداع':($lang==='ru'?'🚫 Пополнение':'🚫 Deposit'));
  if ((int)($u['withdraw_disabled'] ?? 0) === 1) $flags[] = ($lang==='ar'?'🚫 سحب':($lang==='ru'?'🚫 Вывод':'🚫 Withdraw'));
  if ((int)($u['trade_disabled'] ?? 0) === 1) $flags[] = ($lang==='ar'?'🚫 تداول':($lang==='ru'?'🚫 Торговля':'🚫 Trade'));
  $flagsTxt = $flags ? implode(' • ', $flags) : aff_tr($lang,'status_active');

  $lblStatus = ($lang==='ar'?'الحالة':($lang==='ru'?'Статус':'Status'));
  $lblReason = ($lang==='ar'?'السبب':($lang==='ru'?'Причина':'Reason'));

  $balLine = aff_tr($lang,'lbl_balance').": <b>".number_format($realBal,2,'.','')." {$realCur}</b>";
  if ($realAvail !== null) {
    $balLine .= " · ".aff_tr($lang,'lbl_available').": <b>".number_format((float)$realAvail,2,'.','')." {$realCur}</b>";
  }
  $balLine .= "\n".aff_tr($lang,'lbl_balance')." (DEMO): <b>".number_format($demoBal,2,'.','')." {$demoCur}</b>";

  $txt = "👤 <b>".htmlspecialchars($who)."</b>\n".
         "UID: <code>".(int)$u['id']."</code>\n".
         "TG: <code>".htmlspecialchars((string)$u['tg_id'])."</code>\n".
         $balLine."\n".
         "{$lblStatus}: {$flagsTxt}";
  if ((int)($u['is_frozen'] ?? 0) === 1 && (string)($u['frozen_reason'] ?? '') !== '') {
    $txt .= "\n{$lblReason}: ".htmlspecialchars((string)$u['frozen_reason']);
  }

  $lang = aff_chat_lang($chatId);
  aff_send($chatId, $txt, kb_user_menu($lang, $uid, $u));
}

function toggle_flag(int $uid, string $col): void {
  $pdo = db();
  $col = trim($col);
  if (!in_array($col, ['deposit_disabled','withdraw_disabled','trade_disabled'], true)) return;
  $pdo->prepare("UPDATE users SET {$col}=CASE WHEN COALESCE({$col},0)=1 THEN 0 ELSE 1 END, updated_at=? WHERE id=?")
      ->execute([time(), $uid]);
}

function toggle_freeze(int $uid, int $byManagerId, bool $freeze, string $reason=''): void {
  $pdo = db();
  if ($freeze) {
    $pdo->prepare('UPDATE users SET is_frozen=1,frozen_reason=?,frozen_at=?,frozen_by=?,updated_at=? WHERE id=?')
        ->execute([$reason, time(), $byManagerId, time(), $uid]);
  } else {
    $pdo->prepare('UPDATE users SET is_frozen=0,frozen_reason=NULL,frozen_at=NULL,frozen_by=NULL,updated_at=? WHERE id=?')
        ->execute([time(), $uid]);
  }
}

function user_locale_by_uid(int $uid): string {
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT locale FROM users WHERE id=? LIMIT 1');
    $st->execute([$uid]);
    $l = strtolower((string)($st->fetchColumn() ?: 'en'));
    return in_array($l, ['en','ar','ru'], true) ? $l : 'en';
  } catch (Throwable $e) {
    return 'en';
  }
}

function notify_user(int $uid, string $text): void {
  $pdo = db();
  $st = $pdo->prepare('SELECT telegram_chat_id,tg_id FROM users WHERE id=?');
  $st->execute([$uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  $chat = $row ? (string)($row['telegram_chat_id'] ?? '') : '';
  if ($chat === '') {
    // fallback to tg_id
    $chat = $row ? (string)($row['tg_id'] ?? '') : '';
  }
  if ($chat === '') return;
  main_tg_api('sendMessage', ['chat_id'=>(int)$chat,'text'=>$text, 'parse_mode'=>'HTML', 'disable_web_page_preview'=>true]);
}

function notify_user_i18n(int $uid, string $en, string $ar, string $ru): void {
  $l = user_locale_by_uid($uid);
  $txt = ($l==='ar') ? $ar : (($l==='ru') ? $ru : $en);
  notify_user($uid, $txt);
}

function list_pending_deposits(int $chatId, int $managerId, ?int $uid = null): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  // If viewing a specific user: show full history. Otherwise: show pending only.
  if ($uid) {
    $sql = "SELECT d.id,d.user_id,d.currency,d.amount,d.status,d.external_ref,d.created_at,u.username,u.first_name,u.last_name FROM deposits d JOIN users u ON u.id=d.user_id WHERE u.manager_id=? AND d.user_id=? ORDER BY d.id DESC LIMIT 30";
    $args = [$managerId, $uid];
  } else {
    $sql = "SELECT d.id,d.user_id,d.currency,d.amount,d.status,d.external_ref,d.created_at,u.username,u.first_name,u.last_name FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.status IN ('pending','requested') AND u.manager_id=? ORDER BY d.id DESC LIMIT 30";
    $args = [$managerId];
  }
  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows) {
    $msg = $uid ? aff_tr($lang,'no_deps') : aff_tr($lang,'no_deps_pending');
    aff_send($chatId, $msg, kb_main($lang));
    return;
  }
  foreach ($rows as $r) {
    $who = $r['username'] ? '@'.$r['username'] : trim((string)$r['first_name'].' '.(string)$r['last_name']);
    $txt = "💰 <b>".aff_tr($lang,'deposit')." #".(int)$r['id']."</b>\n".
           aff_tr($lang,'lbl_user').": ".htmlspecialchars($who)." (UID ".(int)$r['user_id'].")\n".
           aff_tr($lang,'lbl_amount').": <b>".htmlspecialchars((string)$r['amount'])." ".htmlspecialchars((string)$r['currency'])."</b>\n".
           aff_tr($lang,'lbl_status').": ".htmlspecialchars(aff_status_label($lang, (string)$r['status']))."\n".
           aff_tr($lang,'lbl_created').": ".date('Y-m-d H:i',(int)$r['created_at']);

    // proof
    $ext = (string)($r['external_ref'] ?? '');
    if ($ext !== '' && (str_starts_with($ext,'tg_photo:') || str_starts_with($ext,'tg_doc:') || str_starts_with($ext,'TG:'))) {
      $fid = $ext;
      if (str_starts_with($fid,'tg_photo:')) $fid = substr($fid,9);
      if (str_starts_with($fid,'tg_doc:')) $fid = substr($fid,7);
      if (str_starts_with($fid,'TG:')) $fid = substr($fid,3);
      $fid = trim($fid);
      if ($fid !== '') {
        // fetch file_url via PAY bot and send as photo/document
        $token = pay_bot_token();
        if ($token !== '') {
          $res = pay_tg_api('getFile', ['file_id'=>$fid]);
          $path = (string)($res['result']['file_path'] ?? '');
          if (($res['ok'] ?? false) && $path !== '') {
            $dl = "https://api.telegram.org/file/bot{$token}/{$path}";
            // sendPhoto works for most proofs
            $cap = ($lang==='ar') ? '📎 إثبات للإيداع #' : (($lang==='ru') ? '📎 Подтверждение депозита #' : '📎 Proof for deposit #');
            aff_tg_api('sendPhoto', ['chat_id'=>$chatId,'photo'=>$dl,'caption'=>$cap.(int)$r['id']]);
          }
        }
      }
    }

    $kb = null;
    $stt = strtolower((string)($r['status'] ?? ''));
    if (in_array($stt, ['pending','requested'], true)) {
      $kb = [[
        ['text'=>aff_tr($lang,'btn_confirm'),'callback_data'=>'dep:'.(int)$r['id'].':c'],
        ['text'=>aff_tr($lang,'btn_fail'),'callback_data'=>'dep:'.(int)$r['id'].':f'],
      ]];
    } elseif ($uid) {
      $kb = [[['text'=>aff_tr($lang,'back'),'callback_data'=>'u:'.$uid]]];
    }
    aff_send($chatId, $txt, $kb ?: kb_main($lang));
  }
}

function deposit_action(int $chatId, int $managerId, int $depId, string $act): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  $pdo->beginTransaction();
  try {
    if (db_driver()==='mysql') {
      $st = $pdo->prepare('SELECT d.*, u.manager_id FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.id=? FOR UPDATE');
    } else {
      $st = $pdo->prepare('SELECT d.*, u.manager_id FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.id=?');
    }
    $st->execute([$depId]);
    $dep = $st->fetch(PDO::FETCH_ASSOC);
    if (!$dep) throw new RuntimeException(aff_tr($lang,'err_dep_nf'));
    if ((int)($dep['manager_id'] ?? 0) !== $managerId) throw new RuntimeException(aff_tr($lang,'not_allowed'));
    $status = (string)($dep['status'] ?? '');
    if (!in_array($status, ['pending','requested'], true)) {
      $pdo->commit();
      aff_send($chatId, ($lang==='ar'?'تمت معالجته بالفعل.':($lang==='ru'?'Уже обработано.':'Already processed.')), kb_main($lang));
      return;
    }
    $now = time();
    if ($act === 'f') {
      $pdo->prepare('UPDATE deposits SET status="failed", updated_at=? WHERE id=?')->execute([$now,$depId]);
      $pdo->commit();
      $amt = number_format((float)$dep['amount'], 2, '.', '');
      $cur = htmlspecialchars((string)$dep['currency']);
      notify_user_i18n((int)$dep['user_id'],
        "❌ <b>Deposit rejected</b>\nAmount: <b>{$amt} {$cur}</b>",
        "❌ <b>تم رفض الإيداع</b>\nالمبلغ: <b>{$amt} {$cur}</b>",
        "❌ <b>Депозит отклонён</b>\nСумма: <b>{$amt} {$cur}</b>"
      );
      aff_send($chatId, ($lang==='ar'?'✅ تم الرفض':($lang==='ru'?'✅ Отклонено':'✅ Marked failed')), kb_main($lang));
      return;
    }

    ledger_add((int)$dep['user_id'], (string)$dep['currency'], (float)$dep['amount'], 'deposit_credit', 'deposit', (string)$depId, ['manager'=>true,'manager_id'=>$managerId]);
    $pdo->prepare('UPDATE deposits SET status="confirmed", updated_at=?, confirmed_at=? WHERE id=?')->execute([$now,$now,$depId]);
    $pdo->commit();
    $amt = number_format((float)$dep['amount'], 2, '.', '');
    $cur = htmlspecialchars((string)$dep['currency']);
    notify_user_i18n((int)$dep['user_id'],
      "✅ <b>Deposit confirmed</b>\nAmount: <b>{$amt} {$cur}</b>",
      "✅ <b>تم تأكيد الإيداع</b>\nالمبلغ: <b>{$amt} {$cur}</b>",
      "✅ <b>Депозит подтверждён</b>\nСумма: <b>{$amt} {$cur}</b>"
    );
    aff_send($chatId, ($lang==='ar'?'✅ تم التأكيد':($lang==='ru'?'✅ Подтверждено':'✅ Confirmed')), kb_main($lang));
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    aff_send($chatId, ($lang==='ar'?'خطأ: ':($lang==='ru'?'Ошибка: ':'Error: ')).$e->getMessage(), kb_main($lang));
  }
}

function list_pending_withdrawals(int $chatId, int $managerId, ?int $uid=null): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  // If viewing a specific user: show full history. Otherwise: show actionable/pending.
  if ($uid) {
    $sql = "SELECT w.id,w.user_id,w.method,w.currency,w.amount,w.status,w.hold_id,w.created_at,u.username,u.first_name,u.last_name FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE u.manager_id=? AND w.user_id=? ORDER BY w.id DESC LIMIT 30";
    $args = [$managerId, $uid];
  } else {
    // Support both legacy and current statuses.
    $sql = "SELECT w.id,w.user_id,w.method,w.currency,w.amount,w.status,w.hold_id,w.created_at,u.username,u.first_name,u.last_name FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status IN ('pending','requested','review','approved','processing') AND u.manager_id=? ORDER BY w.id DESC LIMIT 30";
    $args = [$managerId];
  }
  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows) {
    $msg = $uid ? aff_tr($lang,'no_wdrs') : aff_tr($lang,'no_wdrs_pending');
    aff_send($chatId, $msg, kb_main($lang));
    return;
  }
  foreach ($rows as $r) {
    $who = $r['username'] ? '@'.$r['username'] : trim((string)$r['first_name'].' '.(string)$r['last_name']);
    $txt = "🏧 <b>".aff_tr($lang,'withdrawal')." #".(int)$r['id']."</b>\n".
      aff_tr($lang,'lbl_user').": ".htmlspecialchars($who)." (UID ".(int)$r['user_id'].")\n".
      aff_tr($lang,'lbl_amount').": <b>".htmlspecialchars((string)$r['amount'])." ".htmlspecialchars((string)$r['currency'])."</b>\n".
      aff_tr($lang,'lbl_method').": ".htmlspecialchars((string)$r['method'])."\n".
           aff_tr($lang,'lbl_status').": ".htmlspecialchars(aff_status_label($lang, (string)$r['status']))."\n".
      aff_tr($lang,'lbl_created').": ".date('Y-m-d H:i',(int)$r['created_at']);

    $kb = [];
    $st = strtolower((string)($r['status'] ?? ''));
    if (in_array($st, ['pending','requested','review'], true)) {
      $kb[] = [
        ['text'=>aff_tr($lang,'btn_approve'),'callback_data'=>'w:'.(int)$r['id'].':a'],
        ['text'=>aff_tr($lang,'btn_reject'),'callback_data'=>'w:'.(int)$r['id'].':r'],
      ];
    } elseif (in_array($st, ['approved','processing'], true)) {
      $kb[] = [ ['text'=>aff_tr($lang,'btn_complete'),'callback_data'=>'w:'.(int)$r['id'].':c'] ];
    } elseif ($uid) {
      $kb[] = [ ['text'=>aff_tr($lang,'back'),'callback_data'=>'u:'.$uid] ];
    }
    aff_send($chatId, $txt, $kb ?: kb_main($lang));
  }
}

function withdrawal_action(int $chatId, int $managerId, int $wid, string $act): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  $pdo->beginTransaction();
  try {
    if (db_driver()==='mysql') {
      $st = $pdo->prepare('SELECT w.*, u.manager_id FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.id=? FOR UPDATE');
    } else {
      $st = $pdo->prepare('SELECT w.*, u.manager_id FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.id=?');
    }
    $st->execute([$wid]);
    $w = $st->fetch(PDO::FETCH_ASSOC);
    if (!$w) throw new RuntimeException(aff_tr($lang,'err_wdr_nf'));
    if ((int)($w['manager_id'] ?? 0) !== $managerId) throw new RuntimeException(aff_tr($lang,'not_allowed'));

    $now = time();
    $status = strtolower((string)($w['status'] ?? ''));
    if ($act === 'r' && in_array($status, ['pending','requested','review'], true)) {
      hold_release((int)$w['hold_id'], 'released');
      $pdo->prepare('UPDATE withdrawals SET status="rejected", updated_at=?, admin_note=? WHERE id=?')->execute([$now,'Rejected by manager',$wid]);
      $pdo->commit();
      $amt = number_format((float)$w['amount'], 2, '.', '');
      $cur = htmlspecialchars((string)$w['currency']);
      notify_user_i18n((int)$w['user_id'],
        "❌ <b>Withdrawal rejected</b>\nAmount: <b>{$amt} {$cur}</b>",
        "❌ <b>تم رفض السحب</b>\nالمبلغ: <b>{$amt} {$cur}</b>",
        "❌ <b>Вывод отклонён</b>\nСумма: <b>{$amt} {$cur}</b>"
      );
      aff_send($chatId, ($lang==='ar'?'✅ تم الرفض':($lang==='ru'?'✅ Отклонено':'✅ Rejected')), kb_main($lang));
      return;
    }
    if ($act === 'a' && in_array($status, ['pending','requested','review'], true)) {
      // Legacy rows might not have hold_id (older pay bot builds). Create hold now.
      if ((int)($w['hold_id'] ?? 0) <= 0) {
        $hid = hold_create((int)$w['user_id'], (string)$w['currency'], (float)$w['amount'], 'withdraw_request', time() + 3600);
        $pdo->prepare('UPDATE withdrawals SET hold_id=? WHERE id=?')->execute([$hid, $wid]);
        $w['hold_id'] = $hid;
      }
      $pdo->prepare('UPDATE withdrawals SET status="approved", updated_at=?, admin_note=? WHERE id=?')->execute([$now,'Approved by manager',$wid]);
      $pdo->commit();
      $amt = number_format((float)$w['amount'], 2, '.', '');
      $cur = htmlspecialchars((string)$w['currency']);
      notify_user_i18n((int)$w['user_id'],
        "✅ <b>Withdrawal approved</b>\nAmount: <b>{$amt} {$cur}</b>",
        "✅ <b>تمت الموافقة على السحب</b>\nالمبلغ: <b>{$amt} {$cur}</b>",
        "✅ <b>Вывод одобрен</b>\nСумма: <b>{$amt} {$cur}</b>"
      );
      aff_send($chatId, ($lang==='ar'?'✅ تمت الموافقة':($lang==='ru'?'✅ Одобрено':'✅ Approved')), kb_main($lang));
      return;
    }
    if ($act === 'c' && in_array($status, ['approved','processing'], true)) {
      // Safety if hold_id is missing.
      if ((int)($w['hold_id'] ?? 0) <= 0) {
        $av = wallet_available((int)$w['user_id'], (string)$w['currency']);
        if (((float)($av['available'] ?? 0)) + 1e-9 < (float)$w['amount']) {
          throw new RuntimeException('Insufficient available balance to complete');
        }
      }
      ledger_add((int)$w['user_id'], (string)$w['currency'], -((float)$w['amount']), 'withdrawal_debit', 'withdrawal', (string)$wid, ['manager'=>true,'manager_id'=>$managerId]);
      hold_release((int)$w['hold_id'], 'released');
      $pdo->prepare('UPDATE withdrawals SET status="completed", updated_at=?, completed_at=? WHERE id=?')->execute([$now,$now,$wid]);
      $pdo->commit();
      $amt = number_format((float)$w['amount'], 2, '.', '');
      $cur = htmlspecialchars((string)$w['currency']);
      notify_user_i18n((int)$w['user_id'],
        "✅ <b>Withdrawal completed</b>\nAmount: <b>{$amt} {$cur}</b>",
        "✅ <b>تم تنفيذ السحب</b>\nالمبلغ: <b>{$amt} {$cur}</b>",
        "✅ <b>Вывод выполнен</b>\nСумма: <b>{$amt} {$cur}</b>"
      );
      aff_send($chatId, ($lang==='ar'?'✅ تم التنفيذ':($lang==='ru'?'✅ Завершено':'✅ Completed')), kb_main($lang));
      return;
    }

    $pdo->commit();
    aff_send($chatId, ($lang==='ar'?'لا يمكن تنفيذ الإجراء (حالة غير صحيحة).':($lang==='ru'?'Нельзя выполнить (неверное состояние).':'No action (invalid state)')), kb_main($lang));

  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    aff_send($chatId, ($lang==='ar'?'خطأ: ':($lang==='ru'?'Ошибка: ':'Error: ')).$e->getMessage(), kb_main($lang));
  }
}

function list_pending_kyc(int $chatId, int $managerId, ?int $uid=null): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  $sql = "SELECT k.*, u.username,u.first_name,u.last_name FROM kyc_requests k JOIN users u ON u.id=k.user_id WHERE k.status='pending' AND u.manager_id=?";
  $args = [$managerId];
  if ($uid) { $sql .= " AND k.user_id=?"; $args[]=$uid; }
  $sql .= " ORDER BY k.id DESC LIMIT 30";
  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows) {
    aff_send($chatId, aff_tr($lang,'no_kyc'), $uid ? [[['text'=>aff_tr($lang,'back'),'callback_data'=>'u:'.$uid]]] : kb_main($lang));
    return;
  }
  foreach ($rows as $k) {
    $who = $k['username'] ? '@'.$k['username'] : trim((string)$k['first_name'].' '.(string)$k['last_name']);
    $txt = "🪪 <b>KYC #".(int)$k['id']."</b>\n".
      "User: ".htmlspecialchars($who)." (UID ".(int)$k['user_id'].")\n".
      "Name: ".htmlspecialchars((string)$k['full_name'])."\n".
      "Country: ".htmlspecialchars((string)$k['country'])."\n".
      "Doc: ".htmlspecialchars((string)$k['doc_type'])." / ".htmlspecialchars((string)$k['doc_number']);

    $base = app_url_aff();
    $front = (string)($k['front_path'] ?? '');
    $back = (string)($k['back_path'] ?? '');
    $selfie = (string)($k['selfie_path'] ?? '');
    $links = [];
    if ($front !== '') $links[] = 'Front: '.$base.'/api/'.ltrim($front,'/');
    if ($back !== '') $links[] = 'Back: '.$base.'/api/'.ltrim($back,'/');
    if ($selfie !== '') $links[] = 'Selfie: '.$base.'/api/'.ltrim($selfie,'/');
    if ($links) $txt .= "\n\n".htmlspecialchars(implode("\n", $links));

    $kb = [[
      ['text'=>aff_tr($lang,'btn_approve'),'callback_data'=>'k:'.(int)$k['id'].':a'],
      ['text'=>aff_tr($lang,'btn_reject'),'callback_data'=>'k:'.(int)$k['id'].':r'],
    ]];
    if ($uid) $kb[] = [['text'=>aff_tr($lang,'back'),'callback_data'=>'u:'.$uid]];
    aff_send($chatId, $txt, $kb);
  }
}

function kyc_action(int $chatId, int $managerId, int $kycId, string $act, string $note=''): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  $st = $pdo->prepare('SELECT k.user_id,u.manager_id FROM kyc_requests k JOIN users u ON u.id=k.user_id WHERE k.id=? LIMIT 1');
  $st->execute([$kycId]);
  $r = $st->fetch(PDO::FETCH_ASSOC);
  if (!$r) { aff_send($chatId, ($lang==='ar'?'KYC غير موجود.':($lang==='ru'?'KYC не найден.':'KYC not found.')), kb_main($lang)); return; }
  if ((int)($r['manager_id'] ?? 0) !== $managerId) {         $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang)); return; }

  $now = time();
  if ($act === 'a') {
    $pdo->prepare('UPDATE kyc_requests SET status="approved", admin_note=?, updated_at=? WHERE id=?')->execute([$note, $now, $kycId]);
    notify_user_i18n((int)$r['user_id'],
      "✅ <b>KYC approved</b>",
      "✅ <b>تم قبول توثيق KYC</b>",
      "✅ <b>KYC одобрен</b>"
    );
    aff_send($chatId, ($lang==='ar'?'✅ تم القبول':($lang==='ru'?'✅ Одобрено':'✅ Approved')), kb_main($lang));
    return;
  }
  $pdo->prepare('UPDATE kyc_requests SET status="rejected", admin_note=?, updated_at=? WHERE id=?')->execute([$note, $now, $kycId]);
  $noteTxt = trim($note);
  notify_user_i18n((int)$r['user_id'],
    "❌ <b>KYC rejected</b>\nReason: ".htmlspecialchars($noteTxt),
    "❌ <b>تم رفض توثيق KYC</b>\nالسبب: ".htmlspecialchars($noteTxt),
    "❌ <b>KYC отклонён</b>\nПричина: ".htmlspecialchars($noteTxt)
  );
  aff_send($chatId, ($lang==='ar'?'❌ تم الرفض':($lang==='ru'?'❌ Отклонено':'❌ Rejected')), kb_main($lang));
}

function list_open_positions(int $chatId, int $managerId, int $uid): void {
  $pdo = db();
  $lang = aff_chat_lang($chatId);
  $st = $pdo->prepare("SELECT p.*, u.manager_id FROM positions p JOIN users u ON u.id=p.user_id WHERE p.user_id=? AND p.status='open' AND p.symbol LIKE '@R@%' ORDER BY p.id DESC LIMIT 20");
  $st->execute([$uid]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows) {
    $msg = ($lang==='ar') ? 'لا يوجد صفقات مفتوحة REAL لهذا العميل.' : (($lang==='ru') ? 'Нет открытых REAL сделок у клиента.' : 'No open REAL trades for this client.');
    aff_send($chatId, $msg, kb_main($lang));
    return;
  }
  foreach ($rows as $p) {
    if ((int)($p['manager_id'] ?? 0) !== $managerId) continue;
    $posId = (int)$p['id'];
    $sym = (string)$p['symbol'];
    if (str_starts_with($sym,'@R@')) $sym = substr($sym,3);
    $side = strtoupper((string)$p['side']);
    $qty = (float)$p['qty'];
    $entry = (float)$p['entry_price'];
    $lev = (int)($p['leverage'] ?? 1);
    $lblSymbol = ($lang==='ar')?'الرمز':(($lang==='ru')?'Символ':'Symbol');
    $lblSide   = ($lang==='ar')?'النوع':(($lang==='ru')?'Сторона':'Side');
    $lblQty    = ($lang==='ar')?'الكمية':(($lang==='ru')?'Кол-во':'Qty');
    $lblLev    = ($lang==='ar')?'رافعة':(($lang==='ru')?'Плечо':'Lev');
    $lblEntry  = ($lang==='ar')?'الدخول':(($lang==='ru')?'Вход':'Entry');
    $txt = "📈 <b>Position #{$posId}</b>\n".
      "{$lblSymbol}: <b>".htmlspecialchars($sym)."</b>\n".
      "{$lblSide}: {$side} • {$lblQty}: ".htmlspecialchars((string)$qty)." • {$lblLev}: ".htmlspecialchars((string)$lev)."\n".
      "{$lblEntry}: ".htmlspecialchars((string)$entry);

    $kb = [[ ['text'=>aff_tr($lang,'btn_adj_pnl'),'callback_data'=>'p:'.$posId.':adj'] ]];
    aff_send($chatId, $txt, $kb);
  }
}

function adjust_open_position(int $chatId, int $managerId, int $posId, float $targetPnl): void {
  $pdo = db();
  $st = $pdo->prepare("SELECT p.*, u.manager_id FROM positions p JOIN users u ON u.id=p.user_id WHERE p.id=? AND p.status='open' AND p.symbol LIKE '@R@%' LIMIT 1");
  $st->execute([$posId]);
  $p = $st->fetch(PDO::FETCH_ASSOC);
  if (!$p) { aff_send($chatId,'Position not found', kb_main(aff_chat_lang($chatId))); return; }
  if ((int)($p['manager_id'] ?? 0) !== $managerId) {         $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang)); return; }

  $symbolStored = (string)($p['symbol'] ?? '');
  $symbol = str_starts_with($symbolStored,'@R@') ? substr($symbolStored,3) : $symbolStored;
  $assetType = (string)($p['asset_type'] ?? 'crypto');
  $side = strtoupper((string)($p['side'] ?? 'BUY'));
  $qty = (float)($p['qty'] ?? 0);
  $lev = (int)($p['leverage'] ?? 1);
  $margin = (float)($p['margin_initial'] ?? 0);
  $oldEntry = (float)($p['entry_price'] ?? 0);
  $marketType = strtolower((string)($p['market_type'] ?? 'perp'));
  if (!in_array($marketType, ['perp','spot'], true)) $marketType='perp';

  if ($qty <= 0) { aff_send($chatId,'Invalid qty', kb_main(aff_chat_lang($chatId))); return; }

  $mark = quote_price($symbol, $marketType, $assetType);
  if ($mark <= 0) { aff_send($chatId,'Price unavailable', kb_main(aff_chat_lang($chatId))); return; }

  // entry for target pnl
  if ($side === 'SELL') $newEntry = $mark + ($targetPnl / $qty);
  else $newEntry = $mark - ($targetPnl / $qty);
  if ($newEntry <= 0) { aff_send($chatId,'Computed entry invalid', kb_main(aff_chat_lang($chatId))); return; }

  $newLiq = ($marketType === 'perp') ? perp_calc_liquidation_price((float)$newEntry, $qty, $side, $lev) : null;

  $pdo->beginTransaction();
  try {
    $ts = now_ts();
    $pdo->prepare('UPDATE positions SET entry_price=?, liquidation_price=?, updated_at=? WHERE id=?')
        ->execute([(float)$newEntry, $newLiq, $ts, $posId]);

    // update latest filled order for this position
    $st2 = $pdo->prepare("SELECT id, meta FROM orders WHERE position_id=? AND status='filled' ORDER BY id DESC LIMIT 1");
    $st2->execute([$posId]);
    $row = $st2->fetch(PDO::FETCH_ASSOC) ?: [];
    $oid = (int)($row['id'] ?? 0);
    $metaRaw = (string)($row['meta'] ?? '');
    if ($oid > 0) {
      $meta = [];
      if ($metaRaw !== '') {
        $tmp = json_decode($metaRaw, true);
        if (is_array($tmp)) $meta = $tmp;
      }
      $meta['manager_adjust_open'] = [
        'ts' => $ts,
        'by' => 'manager',
        'manager_id' => $managerId,
        'prev_entry' => $oldEntry,
        'new_entry' => (float)$newEntry,
        'target_pnl' => $targetPnl,
        'mark_used' => (float)$mark,
      ];
      $pdo->prepare('UPDATE orders SET fill_price=?, meta=?, updated_at=? WHERE id=?')
          ->execute([(float)$newEntry, json_encode($meta, JSON_UNESCAPED_UNICODE), $ts, $oid]);
    }

    $pdo->commit();
    // notify_user((int)$p['user_id'], "✅ تم تعديل الصفقة المفتوحة ({$symbol}) بواسطة المدير.");
    aff_send($chatId, "✅ تم تعديل Entry للصفقة المفتوحة.\nOld: {$oldEntry}\nNew: {$newEntry}", kb_main(aff_chat_lang($chatId)));
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    aff_send($chatId, 'Error: '.$e->getMessage(), kb_main(aff_chat_lang($chatId)));
  }
}

function list_closed_orders(int $chatId, int $managerId, int $uid): void {
  $lang = aff_chat_lang($chatId);
  if ($managerId <= 0 || $uid <= 0 || !aff_manager_can_access_user($managerId, $uid)) {
    aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang));
    return;
  }

  $pdo = db();
  $st = $pdo->prepare("SELECT o.*, u.manager_id FROM orders o JOIN users u ON u.id=o.user_id WHERE o.user_id=? AND o.status='closed' AND o.symbol LIKE '@R@%' ORDER BY o.id DESC LIMIT 20");
  $st->execute([$uid]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows) { aff_send($chatId, aff_tr($lang,'no_closed_trades'), kb_main($lang)); return; }
  $sentAny = false;
  foreach ($rows as $o) {
    if ((int)($o['manager_id'] ?? 0) !== $managerId) continue;
    $oid = (int)$o['id'];
    $sym = (string)$o['symbol'];
    if (str_starts_with($sym,'@R@')) $sym = substr($sym,3);
    $side = strtoupper((string)$o['side']);
    $qty = (float)$o['qty'];
    $entry = (float)($o['fill_price'] ?? 0);
    $exit = (float)($o['limit_price'] ?? 0);
    $pnl = (float)($o['pnl_usd'] ?? 0);
    $txt = "🧾 <b>".aff_tr($lang,'order')." #{$oid}</b>\n".
      aff_tr($lang,'symbol').": <b>".htmlspecialchars($sym)."</b>\n".
      aff_tr($lang,'side').": {$side} • ".aff_tr($lang,'qty').": {$qty}\n".
      aff_tr($lang,'entry').": {$entry} • ".aff_tr($lang,'exit').": {$exit}\n".
      aff_tr($lang,'pnl').": {$pnl}";
    $kb = [[ ['text'=>aff_tr($lang,'btn_edit_entry_exit'),'callback_data'=>'o:'.$oid.':edit'] ]];
    aff_send($chatId, $txt, $kb);
    $sentAny = true;
  }

  if (!$sentAny) {
    aff_send($chatId, aff_tr($lang,'no_closed_trades'), kb_main($lang));
  }
}

function edit_closed_order(int $chatId, int $managerId, int $orderId, float $entry, float $exit): void {
  $pdo = db();
  $st = $pdo->prepare("SELECT o.*, u.manager_id FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=? AND o.status='closed' AND o.symbol LIKE '@R@%' LIMIT 1");
  $st->execute([$orderId]);
  $o = $st->fetch(PDO::FETCH_ASSOC);
  if (!$o) { aff_send($chatId,'Order not found', kb_main(aff_chat_lang($chatId))); return; }
  if ((int)($o['manager_id'] ?? 0) !== $managerId) {         $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang)); return; }
  $qty = (float)($o['qty'] ?? 0);
  $side = strtoupper((string)($o['side'] ?? 'BUY'));
  if ($qty <= 0 || $entry<=0 || $exit<=0) { aff_send($chatId,'Entry/Exit invalid', kb_main(aff_chat_lang($chatId))); return; }
  $pnl = ($side === 'SELL') ? (($entry - $exit) * $qty) : (($exit - $entry) * $qty);

  $meta = [];
  $metaRaw = (string)($o['meta'] ?? '');
  if ($metaRaw !== '') {
    $tmp = json_decode($metaRaw, true);
    if (is_array($tmp)) $meta = $tmp;
  }
  $ts = now_ts();
  $meta['manager_edit_closed'] = [
    'ts'=>$ts,
    'by'=>'manager',
    'manager_id'=>$managerId,
    'prev_entry'=>(float)($o['fill_price'] ?? 0),
    'prev_exit'=>(float)($o['limit_price'] ?? 0),
    'new_entry'=>$entry,
    'new_exit'=>$exit,
    'new_pnl'=>$pnl,
  ];

  $pdo->prepare('UPDATE orders SET fill_price=?, limit_price=?, pnl_usd=?, meta=?, updated_at=? WHERE id=?')
      ->execute([$entry,$exit,$pnl,json_encode($meta, JSON_UNESCAPED_UNICODE),$ts,$orderId]);

  // notify_user((int)$o['user_id'], "✅ تم تعديل صفقة مغلقة بواسطة المدير.");
  aff_send($chatId, '✅ Updated closed order.', kb_main(aff_chat_lang($chatId)));
}

// ===================== Update handling =====================

$cb = $update['callback_query'] ?? null;
$msg = $update['message'] ?? null;

if ($cb) {
  $cbId = (string)($cb['id'] ?? '');
  $from = $cb['from'] ?? [];
  $data = (string)($cb['data'] ?? '');
  $chatId = (int)($cb['message']['chat']['id'] ?? 0);
  $tgUserId = (int)($from['id'] ?? 0);

  // Smooth UX: delete previous message on any button press
  $msgId = (int)($cb['message']['message_id'] ?? 0);
  if ($msgId > 0) {
    try { aff_tg_api('deleteMessage', ['chat_id'=>$chatId, 'message_id'=>$msgId]); } catch (Throwable $e) {}
  }

// Language selection
if (str_starts_with($data, 'lang:')) {
  $lang = aff_lang_norm(substr($data, 5));
  // Persist for chat
  mgr_state_set((string)$chatId, (string)$tgUserId, '', ['lang'=>$lang]);

  // Admin can go directly to admin panel
  if (aff_is_admin_chat($chatId)) {
    aff_answer_cb($cbId);
    admin_panel($chatId);
    exit;
  }

  // Ensure manager record exists and store preferred language
  $m0 = aff_manager_ensure($tgUserId, $from, 'pending');
  try { db()->prepare('UPDATE managers SET lang=?, updated_at=? WHERE tg_id=?')->execute([$lang, time(), (string)$tgUserId]); } catch (Throwable $e) {}
  $m = aff_manager_by_tg($tgUserId) ?: $m0;
  $status = strtolower((string)($m['status'] ?? 'pending'));
  if ($status === 'blocked') {
    aff_send($chatId, aff_tr($lang,'blocked'), null);
    aff_answer_cb($cbId);
    exit;
  }
  if ($status !== 'active') {
    aff_send($chatId, aff_tr($lang,'pending_review'), null);
    aff_answer_cb($cbId);
    exit;
  }
  aff_answer_cb($cbId);
  manager_menu($chatId, $m);
  exit;
}

  // Admin actions
  if (str_starts_with($data, 'adm:')) {
    if (!aff_is_admin_chat($chatId)) { aff_answer_cb($cbId,'Not admin'); exit; }
    $parts = explode(':', $data);
    $act = $parts[1] ?? '';
    $mid = isset($parts[2]) ? (int)$parts[2] : 0;
    if ($mid > 0 && in_array($act, ['appr','block'], true)) {
      aff_manager_set_status($mid, $act==='appr' ? 'active' : 'blocked');
      // Notify the manager (best effort)
      try {
        aff_notify_manager($mid, $act==='appr' ? 'manager_approved' : 'manager_blocked');
      } catch (Throwable $e) {}
      aff_answer_cb($cbId, 'Saved');
      admin_panel($chatId);
      exit;
    }
    aff_answer_cb($cbId);
    admin_panel($chatId);
    exit;
  }

  // Manager required
  $m = require_manager_active($chatId, $tgUserId, $from);
  if (!$m || isset($m['role'])) {
    aff_answer_cb($cbId);
    if (isset($m['role']) && $m['role']==='admin') admin_panel($chatId);
    exit;
  }
  $managerId = (int)($m['id'] ?? 0);

  // Menu
  if ($data === 'm:home') {
    aff_answer_cb($cbId);
    manager_menu($chatId, $m);
    exit;
  }

  if ($data === 'm:help') {
    $lang = aff_chat_lang($chatId, $m);
    aff_answer_cb($cbId);
    $txt = ($lang==='ar')
      ? "📋 الأوامر\n\n- 🔗 رابط الدعوة\n- 👥 العملاء\n- 💰 الإيداعات المعلقة\n- 🏧 السحوبات المعلقة\n- 🪪 KYC\n\nاستخدم الأزرار للتنقل."
      : (($lang==='ru')
        ? "📋 Команды\n\n- 🔗 Пригласительная ссылка\n- 👥 Клиенты\n- 💰 Ожидающие пополнения\n- 🏧 Ожидающие выводы\n- 🪪 KYC\n\nИспользуйте кнопки для навигации."
        : "📋 Commands\n\n- 🔗 Invite link\n- 👥 Clients\n- 💰 Pending deposits\n- 🏧 Pending withdrawals\n- 🪪 KYC\n\nUse the buttons to navigate.");
    aff_send($chatId, $txt, [[['text'=>aff_tr($lang,'back'), 'callback_data'=>'m:menu']]]);
    exit;
  }

  if ($data === 'm:lang') {
    $lang = aff_chat_lang($chatId, $m);
    aff_answer_cb($cbId);
    aff_send($chatId, aff_tr($lang,'choose_lang_title')."\n".aff_tr($lang,'choose_lang_sub'), aff_kb_lang());
    exit;
  }

  if ($data === 'm:menu') {
    aff_answer_cb($cbId);
    manager_menu($chatId, $m);
    exit;
  }
  if ($data === 'm:inv') {
    aff_answer_cb($cbId);
    show_invite($chatId, $managerId);
    exit;
  }
  if ($data === 'm:clients') {
    aff_answer_cb($cbId);
    list_clients($chatId, $managerId);
    exit;
  }
  if ($data === 'm:deps') {
    aff_answer_cb($cbId);
    list_pending_deposits($chatId, $managerId, null);
    exit;
  }
  if ($data === 'm:wdrs') {
    aff_answer_cb($cbId);
    list_pending_withdrawals($chatId, $managerId, null);
    exit;
  }
  if ($data === 'm:kyc') {
    aff_answer_cb($cbId);
    list_pending_kyc($chatId, $managerId, null);
    exit;
  }

  // Select user
  if (preg_match('/^u:(\d+)$/', $data, $mm)) {
    $uid = (int)$mm[1];
    aff_answer_cb($cbId);
    show_user($chatId, $managerId, $uid);
    exit;
  }

  // User actions
  if (preg_match('/^u:(\d+):([a-z]+)$/', $data, $mm)) {
    $uid = (int)$mm[1];
    $act = (string)$mm[2];
    if (!aff_manager_can_access_user($managerId, $uid)) {
      $langNA = aff_chat_lang($chatId, $m);
      aff_answer_cb($cbId, aff_tr($langNA,'not_allowed'));
      exit;
    }
    aff_answer_cb($cbId);

    if ($act === 'depos') { list_pending_deposits($chatId, $managerId, $uid); exit; }
    if ($act === 'with') { list_pending_withdrawals($chatId, $managerId, $uid); exit; }
    if ($act === 'openpos') { list_open_positions($chatId, $managerId, $uid); exit; }
    if ($act === 'closed') { list_closed_orders($chatId, $managerId, $uid); exit; }
    if ($act === 'kyc') { list_pending_kyc($chatId, $managerId, $uid); exit; }

    if ($act === 'msg') {
      mgr_state_set((string)$chatId, (string)$tgUserId, 'await_msg', ['uid'=>$uid]);
      $lang2 = aff_chat_lang($chatId, $m);
      aff_send($chatId, aff_tr($lang2,'ask_msg'), [[['text'=>aff_tr($lang2,'cancel'),'callback_data'=>'m:menu']]]);
      exit;
    }

    if ($act === 'tdep') { toggle_flag($uid,'deposit_disabled'); show_user($chatId,$managerId,$uid); exit; }
    if ($act === 'twdr') { toggle_flag($uid,'withdraw_disabled'); show_user($chatId,$managerId,$uid); exit; }
    if ($act === 'ttrd') { toggle_flag($uid,'trade_disabled'); show_user($chatId,$managerId,$uid); exit; }

    if ($act === 'freeze') {
      // toggle freeze and request reason if freezing
      $pdo = db();
      $st = $pdo->prepare('SELECT is_frozen FROM users WHERE id=?');
      $st->execute([$uid]);
      $is = (int)($st->fetchColumn() ?: 0);
      if ($is === 1) {
        toggle_freeze($uid, $managerId, false);
        notify_user_i18n($uid,
          "✅ <b>Your account has been unfrozen</b>",
          "✅ <b>تم فك تجميد حسابك</b>",
          "✅ <b>Ваш аккаунт разморожен</b>"
        );
        show_user($chatId,$managerId,$uid);
      } else {
        mgr_state_set((string)$chatId, (string)$tgUserId, 'await_freeze_reason', ['uid'=>$uid]);
              $lang = aff_chat_lang($chatId);
      aff_send($chatId, aff_tr($lang,'ask_freeze_reason'));
      }
      exit;
    }

    show_user($chatId, $managerId, $uid);
    exit;
  }

  // Deposit actions
  if (preg_match('/^dep:(\d+):([cf])$/', $data, $mm)) {
    $depId = (int)$mm[1];
    $act = (string)$mm[2];
    aff_answer_cb($cbId);
    deposit_action($chatId, $managerId, $depId, $act);
    exit;
  }

  // Withdrawal actions
  if (preg_match('/^w:(\d+):([arc])$/', $data, $mm)) {
    $wid = (int)$mm[1];
    $act = (string)$mm[2];
    aff_answer_cb($cbId);
    withdrawal_action($chatId, $managerId, $wid, $act);
    exit;
  }

  // KYC actions
  if (preg_match('/^k:(\d+):([ar])$/', $data, $mm)) {
    $kid = (int)$mm[1];
    $act = (string)$mm[2];
    aff_answer_cb($cbId);
    if ($act === 'a') {
      kyc_action($chatId, $managerId, $kid, 'a', 'Approved by manager');
      exit;
    }
    mgr_state_set((string)$chatId, (string)$tgUserId, 'await_kyc_reject', ['kyc_id'=>$kid]);
        $lang = aff_chat_lang($chatId);
    $p = ($lang==='ar'?'✍️ اكتب سبب الرفض (KYC):':($lang==='ru'?'✍️ Укажите причину отказа (KYC):':'✍️ Enter rejection reason (KYC):'));
    aff_send($chatId, $p);
    exit;
  }

  // Position adjust
  if (preg_match('/^p:(\d+):adj$/', $data, $mm)) {
    $posId = (int)$mm[1];
    aff_answer_cb($cbId);
    mgr_state_set((string)$chatId, (string)$tgUserId, 'await_adj_pnl', ['pos_id'=>$posId]);
        $lang = aff_chat_lang($chatId);
    aff_send($chatId, aff_tr($lang,'ask_adj_pnl'));
    exit;
  }

  // Closed order edit
  if (preg_match('/^o:(\d+):edit$/', $data, $mm)) {
    $oid = (int)$mm[1];
    aff_answer_cb($cbId);
    mgr_state_set((string)$chatId, (string)$tgUserId, 'await_edit_closed', ['order_id'=>$oid]);
    $lang = aff_chat_lang($chatId);
    aff_send($chatId, aff_tr($lang,'ask_edit_entry_exit'));
    exit;
  }

  aff_answer_cb($cbId);
  manager_menu($chatId, $m);
  exit;
}

if ($msg) {
  $chatId = (int)($msg['chat']['id'] ?? 0);
  $from = $msg['from'] ?? [];
  $tgUserId = (int)($from['id'] ?? 0);
  $text = trim((string)($msg['text'] ?? ''));


  // Check pending state inputs (manager only)
  $st = mgr_state_get((string)$chatId);
  if ($st && ($st['state'] ?? '') !== '') {
    $state = (string)$st['state'];
    $data = is_array($st['data'] ?? null) ? $st['data'] : [];

    // Manager must be active
    $m = require_manager_active($chatId, $tgUserId, $from);
    if (!$m || isset($m['role'])) { echo json_encode(['ok'=>true]); exit; }
    $managerId = (int)$m['id'];

    if ($state === 'await_msg') {
      $uid = (int)($data['uid'] ?? 0);
      if ($uid > 0 && aff_manager_can_access_user($managerId, $uid)) {
        if ($text === '' || str_starts_with($text,'/')) {
                    $lang = aff_chat_lang($chatId);
          aff_send($chatId, aff_tr($lang,'send_text_only'));
        } else {
          notify_user_i18n($uid,
            "📩 Message from your manager:\n\n".$text,
            "📩 رسالة من مدير حسابك:\n\n".$text,
            "📩 Сообщение от вашего менеджера:\n\n".$text
          );
          mgr_state_clear((string)$chatId);
                    $lang = aff_chat_lang($chatId);
          aff_send($chatId, aff_tr($lang,'msg_sent'), kb_main($lang));
        }
      } else {
        mgr_state_clear((string)$chatId);
                $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang));
      }
      echo json_encode(['ok'=>true]);
      exit;
    }

    if ($state === 'await_freeze_reason') {
      $uid = (int)($data['uid'] ?? 0);
      if ($uid > 0 && aff_manager_can_access_user($managerId, $uid)) {
        $reason = $text !== '' ? $text : 'Violation';
        toggle_freeze($uid, $managerId, true, $reason);
        notify_user_i18n($uid,
          "⛔ <b>Your account has been frozen</b>\nReason: ".htmlspecialchars($reason),
          "⛔ <b>تم تجميد حسابك</b>\nالسبب: ".htmlspecialchars($reason),
          "⛔ <b>Ваш аккаунт заморожен</b>\nПричина: ".htmlspecialchars($reason)
        );
        mgr_state_clear((string)$chatId);
        show_user($chatId, $managerId, $uid);
      } else {
        mgr_state_clear((string)$chatId);
                $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'not_allowed'), kb_main($lang));
      }
      echo json_encode(['ok'=>true]);
      exit;
    }

    if ($state === 'await_kyc_reject') {
      $kid = (int)($data['kyc_id'] ?? 0);
      $note = $text !== '' ? $text : 'Rejected';
      kyc_action($chatId, $managerId, $kid, 'r', $note);
      mgr_state_clear((string)$chatId);
      echo json_encode(['ok'=>true]);
      exit;
    }

    if ($state === 'await_adj_pnl') {
      $posId = (int)($data['pos_id'] ?? 0);
      $v = (float)str_replace(',', '.', $text);
      if ($posId > 0 && is_numeric($text)) {
        adjust_open_position($chatId, $managerId, $posId, $v);
      } else {
                $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'invalid_number'));
      }
      mgr_state_clear((string)$chatId);
      echo json_encode(['ok'=>true]);
      exit;
    }

    if ($state === 'await_edit_closed') {
      $oid = (int)($data['order_id'] ?? 0);
      $parts = preg_split('/\s+/', trim($text));
      if ($oid > 0 && $parts && count($parts) >= 2) {
        $entry = (float)str_replace(',', '.', (string)$parts[0]);
        $exit  = (float)str_replace(',', '.', (string)$parts[1]);
        edit_closed_order($chatId, $managerId, $oid, $entry, $exit);
      } else {
                $lang = aff_chat_lang($chatId);
        aff_send($chatId, aff_tr($lang,'invalid_format'));
      }
      mgr_state_clear((string)$chatId);
      echo json_encode(['ok'=>true]);
      exit;
    }
  }

  // /start: always ask for language first (AR/EN/RU)
  if ($text !== '' && str_starts_with($text, '/start')) {
    $prompt = "🌐 اختر اللغة / Choose language / Выберите язык\n\n".
      "اختر اللغة اللي هتستخدم البوت بيها.\n".
      "Please choose the language you want to use.\n".
      "Пожалуйста, выберите язык.";
    aff_send($chatId, $prompt, aff_kb_lang());
    echo json_encode(['ok'=>true]);
    exit;
  }

  // Fallback: show menu
  $m = require_manager_active($chatId, $tgUserId, $from);
  if (isset($m['role']) && $m['role']==='admin') {
    admin_panel($chatId);
  } elseif ($m) {
    manager_menu($chatId, $m);
  }

  echo json_encode(['ok'=>true]);
  exit;
}

echo json_encode(['ok'=>true]);
