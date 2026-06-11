<?php
declare(strict_types=1);

// Support bot webhook (router)
// - Supports 6 languages: ar,en,ru,fr,de,zh
// - Flow:
//   1) User picks language
//   2) User picks a reason
//   3) Bot shows a button to contact the language-specific support username (configured from Admin)
//      and includes the selected reason.

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/settings.php';
require_once __DIR__ . '/api/lib/affiliates.php';

// ---- Optional security (recommended) ----
$pathToken = (string)env('SUPPORT_BOT_PATH_TOKEN', '');
if ($pathToken !== '') {
  $got = (string)($_GET['token'] ?? '');
  if (!hash_equals($pathToken, $got)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$secret = (string)env('SUPPORT_BOT_WEBHOOK_SECRET', '');
if ($secret !== '') {
  $hdr = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');
  if (!hash_equals($secret, $hdr)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$token = (string)env('SUPPORT_BOT_TOKEN', '');
if ($token === '') {
  // Always 200 for Telegram
  echo json_encode(['ok'=>true,'note'=>'SUPPORT_BOT_TOKEN not set']);
  exit;
}

$updateRaw = file_get_contents('php://input') ?: '';
$update = json_decode($updateRaw, true) ?: [];
try {
  if (is_array($update) && $update) {
    tp_log('bot_support','INFO','incoming', ['update_id'=>(int)($update['update_id'] ?? 0),'keys'=>array_keys($update)]);
  }
} catch (Throwable $e) {}

// Fast ACK to Telegram to avoid update backlog (shared hosting). We still continue processing.
$__sup_ack_sent = false;
function support_webhook_fast_ack(): void {
  global $__sup_ack_sent;
  if ($__sup_ack_sent) return;
  $__sup_ack_sent = true;
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

support_webhook_fast_ack();

function tg_api_support(string $method, array $payload): array {
  $token = (string)env('SUPPORT_BOT_TOKEN','');
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_TIMEOUT => 10,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function upsert_user_basic(int $tg_id, int $chat_id, array $u): void {
  // Never let DB errors break the support bot.
  try {
    $pdo = db();
    $driver = db_driver();
    $username = (string)($u['username'] ?? '');
    $first = (string)($u['first_name'] ?? '');
    $last  = (string)($u['last_name'] ?? '');
    $now = time();

    if ($driver === 'sqlite') {
      $sql = <<<SQL
INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
VALUES (?,?,?,?,?,?,?,?)
ON CONFLICT(tg_id) DO UPDATE SET
  telegram_chat_id=excluded.telegram_chat_id,
  username=excluded.username,
  first_name=excluded.first_name,
  last_name=excluded.last_name,
  updated_at=excluded.updated_at
SQL;
      $pdo->prepare($sql)->execute([(string)$tg_id,(string)$chat_id,$username,$first,$last,'en', $now, $now]);
    } else {
      $sql = <<<SQL
INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
VALUES (?,?,?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
  telegram_chat_id=VALUES(telegram_chat_id),
  username=VALUES(username),
  first_name=VALUES(first_name),
  last_name=VALUES(last_name),
  updated_at=VALUES(updated_at)
SQL;
      $pdo->prepare($sql)->execute([(string)$tg_id,(string)$chat_id,$username,$first,$last,'en', $now, $now]);
    }
  } catch (Throwable $e) {
    error_log('[support_webhook] upsert_user_basic failed: ' . $e->getMessage());
  }
}

function support_allowed_langs(): array {
  return ['en','ar','ru','fr','de','zh'];
}

function support_set_locale(int $tg_id, string $lang): void {
  $lang = strtolower($lang);
  if (!in_array($lang, support_allowed_langs(), true)) $lang = 'en';
  try {
    // Use dedicated column to NOT affect the main app locale.
    db()->prepare('UPDATE users SET support_locale=?, updated_at=? WHERE tg_id=?')->execute([$lang, time(), (string)$tg_id]);
  } catch (Throwable $e) {
    // If column doesn't exist (older DB) fallback to locale.
    try {
      db()->prepare('UPDATE users SET locale=?, updated_at=? WHERE tg_id=?')->execute([$lang, time(), (string)$tg_id]);
    } catch (Throwable $e2) {
      error_log('[support_webhook] support_set_locale failed: ' . $e2->getMessage());
    }
  }
}

function support_user_locale(int $tg_id): string {
  try {
    $st = db()->prepare('SELECT support_locale, locale FROM users WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tg_id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    $sl = strtolower((string)($row['support_locale'] ?? ''));
    if (in_array($sl, support_allowed_langs(), true)) return $sl;

    $l = strtolower((string)($row['locale'] ?? 'en'));
    // main app historically supports en/ar/ru
    if (in_array($l, ['en','ar','ru'], true)) return $l;
    return 'en';
  } catch (Throwable $e) {
    return 'en';
  }
}

function kb_lang_support(): array {
  return [
    [
      ['text'=>'English','callback_data'=>'support_lang:en'],
      ['text'=>'العربية','callback_data'=>'support_lang:ar'],
      ['text'=>'Русский','callback_data'=>'support_lang:ru'],
    ],
    [
      ['text'=>'Français','callback_data'=>'support_lang:fr'],
      ['text'=>'Deutsch','callback_data'=>'support_lang:de'],
      ['text'=>'中文','callback_data'=>'support_lang:zh'],
    ]
  ];
}

function kb_reasons(string $lang): array {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  return [
    [
      ['text'=>t_support('reason.pay', $lang), 'callback_data'=>'support_reason:pay'],
      ['text'=>t_support('reason.wd', $lang),  'callback_data'=>'support_reason:wd'],
    ],
    [
      ['text'=>t_support('reason.trade', $lang), 'callback_data'=>'support_reason:trade'],
      ['text'=>t_support('reason.account', $lang),'callback_data'=>'support_reason:account'],
    ],
    [
      ['text'=>t_support('reason.other', $lang), 'callback_data'=>'support_reason:other'],
    ],
    [
      ['text'=>t_support('btn.change_lang', $lang), 'callback_data'=>'support_show_lang'],
    ]
  ];
}

function support_contact_raw(string $lang): string {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';

  // NEW preferred key (username)
  $v = trim((string)setting_get('support.username.' . $lang, ''));

  // Backwards compatible older key
  if ($v === '') {
    $v = trim((string)setting_get('support.contact.' . $lang, ''));
  }

  // Env fallback
  if ($v === '') {
    $envKey = 'SUPPORT_CONTACT_' . strtoupper($lang);
    $v = trim((string)env($envKey, ''));
    if ($v === '' && $lang !== 'en') {
      // old env fallback names
      $v = trim((string)env($lang==='ar'?'SUPPORT_CONTACT_AR':($lang==='ru'?'SUPPORT_CONTACT_RU':'SUPPORT_CONTACT_EN'), ''));
    }
  }

  return $v;
}

function support_contact_url(string $lang, string $reasonCode = ''): string {
  $val = trim(support_contact_raw($lang));
  if ($val === '') return '';

  // Already URL
  if (preg_match('~^https?://~i', $val)) return $val;

  $u = ltrim($val, "@ \t\n\r\0\x0B");
  if ($u === '') return '';

  $url = 'https://t.me/' . $u;

  // If it looks like a bot username, add /start payload with reason
  if ($reasonCode !== '' && preg_match('~bot$~i', $u)) {
    $payload = 's_' . strtolower($lang) . '_' . strtolower($reasonCode);
    $url .= '?start=' . urlencode($payload);
  }

  return $url;
}

function support_internal_user_id(int $tg_id): int {
  if ($tg_id <= 0) return 0;
  try {
    $st = db()->prepare('SELECT id FROM users WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tg_id]);
    return (int)($st->fetchColumn() ?: 0);
  } catch (Throwable $e) {
    return 0;
  }
}

function t_support(string $key, string $lang, array $vars=[]): string {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  $name = (string)($vars['name'] ?? '');
  $reason = (string)($vars['reason'] ?? '');

  $map = [
    'start_greet' => [
      'en' => "Hi {$name} 👋\n\nChoose your support language.",
      'ar' => "أهلاً {$name} 👋\n\nاختر لغة الدعم.",
      'ru' => "Привет, {$name} 👋\n\nВыберите язык поддержки.",
      'fr' => "Salut {$name} 👋\n\nChoisissez la langue du support.",
      'de' => "Hallo {$name} 👋\n\nWähle die Support-Sprache.",
      'zh' => "你好 {$name} 👋\n\n请选择客服语言。",
    ],
    'choose_reason' => [
      'en' => "Choose the reason for contacting support:",
      'ar' => "اختر سبب التواصل مع الدعم:",
      'ru' => "Выберите причину обращения в поддержку:",
      'fr' => "Choisissez la raison de contacter le support :",
      'de' => "Wähle den Grund für den Support:",
      'zh' => "请选择联系支持的原因：",
    ],
    'contact_missing' => [
      'en' => "Support username is not configured yet. Please ask admin to set it.",
      'ar' => "يوزر الدعم غير مُعدّ بعد. اطلب من الأدمن إضافته.",
      'ru' => "Юзер поддержки ещё не настроен. Попросите админа добавить его.",
      'fr' => "Le compte du support n'est pas encore configuré. Demandez à l'admin de l'ajouter.",
      'de' => "Der Support-Username ist noch nicht eingestellt. Bitte den Admin hinzufügen lassen.",
      'zh' => "客服账号尚未配置，请联系管理员设置。",
    ],
    'open_support' => [
      'en' => "Open support and send your message.",
      'ar' => "افتح الدعم وابعت رسالتك.",
      'ru' => "Откройте поддержку и отправьте сообщение.",
      'fr' => "Ouvrez le support et envoyez votre message.",
      'de' => "Öffne den Support und sende deine Nachricht.",
      'zh' => "打开客服并发送你的消息。",
    ],
    'msg_template' => [
      'en' => "Reason: {$reason}",
      'ar' => "السبب: {$reason}",
      'ru' => "Причина: {$reason}",
      'fr' => "Raison : {$reason}",
      'de' => "Grund: {$reason}",
      'zh' => "原因：{$reason}",
    ],
    'btn.support' => [
      'en' => 'Support',
      'ar' => 'الدعم',
      'ru' => 'Поддержка',
      'fr' => 'Support',
      'de' => 'Support',
      'zh' => '客服',
    ],
    'btn.change_lang' => [
      'en' => 'Change language',
      'ar' => 'تغيير اللغة',
      'ru' => 'Сменить язык',
      'fr' => 'Changer la langue',
      'de' => 'Sprache ändern',
      'zh' => '更改语言',
    ],
    'reason.pay' => [
      'en' => 'Payment problem',
      'ar' => 'مشكلة في الدفع',
      'ru' => 'Проблема с оплатой',
      'fr' => 'Problème de paiement',
      'de' => 'Problem bei der Zahlung',
      'zh' => '支付问题',
    ],
    'reason.wd' => [
      'en' => 'Withdrawal problem',
      'ar' => 'مشكلة في السحب',
      'ru' => 'Проблема с выводом',
      'fr' => 'Problème de retrait',
      'de' => 'Problem bei der Auszahlung',
      'zh' => '提现问题',
    ],
    'reason.trade' => [
      'en' => 'Complaint about a specific trade',
      'ar' => 'شكوى بخصوص صفقة معيّنة',
      'ru' => 'Жалоба по конкретной сделке',
      'fr' => 'Plainte concernant une opération',
      'de' => 'Beschwerde zu einem Trade',
      'zh' => '关于某笔交易的投诉',
    ],
    'reason.account' => [
      'en' => 'Account issue',
      'ar' => 'مشكلة بخصوص الحساب',
      'ru' => 'Проблемы с аккаунтом',
      'fr' => 'Problème de compte',
      'de' => 'Kontoproblem',
      'zh' => '账户问题',
    ],
    'reason.other' => [
      'en' => 'Other',
      'ar' => 'سبب آخر',
      'ru' => 'Другое',
      'fr' => 'Autre',
      'de' => 'Andere',
      'zh' => '其他',
    ],
    'lang_changed' => [
      'en' => 'Language set ✅',
      'ar' => 'تم اختيار اللغة ✅',
      'ru' => 'Язык выбран ✅',
      'fr' => 'Langue définie ✅',
      'de' => 'Sprache gesetzt ✅',
      'zh' => '语言已设置 ✅',
    ],
  ];

  $out = (string)(($map[$key] ?? [])[$lang] ?? (($map[$key] ?? [])['en'] ?? $key));
  return $out;
}

// ---- Handlers ----

if (isset($update['message'])) {
  $m = $update['message'];
  $chat_id = (int)($m['chat']['id'] ?? 0);
  $from = $m['from'] ?? [];
  $tg_id = (int)($from['id'] ?? 0);
  if ($chat_id && $tg_id) upsert_user_basic($tg_id, $chat_id, $from);

  $text = trim((string)($m['text'] ?? ''));

  // Detect /start payload
  if (str_starts_with($text, '/start')) {
    $payload = '';
    $parts = explode(' ', $text, 2);
    if (count($parts) === 2) $payload = trim((string)$parts[1]);

    $lang = support_user_locale($tg_id);
    if (preg_match('~^lang_(en|ar|ru|fr|de|zh)$~i', $payload, $mm)) {
      $lang = strtolower($mm[1]);
      support_set_locale($tg_id, $lang);
    }

    $name = (string)($from['first_name'] ?? ($from['username'] ?? ''));
    if ($name === '') $name = 'there';

    // If language is provided, go directly to reasons.
    if (preg_match('~^lang_(en|ar|ru|fr|de|zh)$~i', $payload)) {
      tg_api_support('sendMessage', [
        'chat_id' => $chat_id,
        'text' => t_support('choose_reason', $lang),
        'reply_markup' => ['inline_keyboard' => kb_reasons($lang)],
      ]);
      echo json_encode(['ok'=>true]);
      exit;
    }

    // Otherwise ask to choose language first.
    tg_api_support('sendMessage', [
      'chat_id' => $chat_id,
      'text' => t_support('start_greet', $lang, ['name'=>$name]),
      'reply_markup' => ['inline_keyboard' => kb_lang_support()],
    ]);

    echo json_encode(['ok'=>true]);
    exit;
  }

  // Default: show language chooser
  $lang = support_user_locale($tg_id);
  tg_api_support('sendMessage', [
    'chat_id' => $chat_id,
    'text' => t_support('start_greet', $lang, ['name'=>(string)($from['first_name'] ?? '')]),
    'reply_markup' => ['inline_keyboard' => kb_lang_support()],
  ]);

  echo json_encode(['ok'=>true]);
  exit;
}

if (isset($update['callback_query'])) {
  $cq = $update['callback_query'];
  $data = (string)($cq['data'] ?? '');
  $from = $cq['from'] ?? [];
  $tg_id = (int)($from['id'] ?? 0);
  $chat_id = (int)($cq['message']['chat']['id'] ?? 0);
  if ($chat_id && $tg_id) upsert_user_basic($tg_id, $chat_id, $from);

  if ($data === 'support_show_lang') {
    $lang = support_user_locale($tg_id);
    tg_api_support('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);
    tg_api_support('sendMessage', [
      'chat_id' => $chat_id,
      'text' => t_support('start_greet', $lang, ['name'=>(string)($from['first_name'] ?? '')]),
      'reply_markup' => ['inline_keyboard' => kb_lang_support()],
    ]);
    echo json_encode(['ok'=>true]);
    exit;
  }

  if (str_starts_with($data, 'support_lang:')) {
    $lang = strtolower(substr($data, 13));
    if (!in_array($lang, support_allowed_langs(), true)) $lang = 'en';
    support_set_locale($tg_id, $lang);

    tg_api_support('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>t_support('lang_changed', $lang)]);

    tg_api_support('sendMessage', [
      'chat_id' => $chat_id,
      'text' => t_support('choose_reason', $lang),
      'reply_markup' => ['inline_keyboard' => kb_reasons($lang)],
    ]);

    echo json_encode(['ok'=>true]);
    exit;
  }

  if (str_starts_with($data, 'support_reason:')) {
    $lang = support_user_locale($tg_id);
    $reasonCode = strtolower(substr($data, 15));
    if (!in_array($reasonCode, ['pay','wd','trade','account','other'], true)) $reasonCode = 'other';

    tg_api_support('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);

    $url = support_contact_url($lang, $reasonCode);
    if ($url === '') {
      tg_api_support('sendMessage', [
        'chat_id' => $chat_id,
        'text' => t_support('contact_missing', $lang),
        'reply_markup' => ['inline_keyboard' => kb_lang_support()],
      ]);
      echo json_encode(['ok'=>true]);
      exit;
    }

    $reasonText = t_support('reason.' . $reasonCode, $lang);
    $uName = (string)($from['username'] ?? '');
    $who = ($uName !== '') ? ('@' . $uName) : ('tg:' . (string)$tg_id);

    // Notify the account manager (mexaff_bot) if the user is linked to a manager.
    try {
      $uid = support_internal_user_id($tg_id);
      if ($uid > 0) {
        aff_notify_manager_for_user($uid, 'support_request', [
          'reason' => $reasonText,
          'lang' => strtoupper($lang),
        ]);
      }
    } catch (Throwable $e) {}

    $msg = t_support('open_support', $lang) . "\n\n" .
      t_support('msg_template', $lang, ['reason'=>$reasonText]) . "\n" .
      "User: {$who}";

    tg_api_support('sendMessage', [
      'chat_id' => $chat_id,
      'text' => $msg,
      'reply_markup' => ['inline_keyboard' => [
        [ ['text'=>t_support('btn.support', $lang), 'url'=>$url] ],
        [ ['text'=>t_support('choose_reason', $lang), 'callback_data'=>'support_lang:' . $lang] ],
        [ ['text'=>t_support('btn.change_lang', $lang), 'callback_data'=>'support_show_lang'] ],
      ]],
      'disable_web_page_preview' => true,
    ]);

    echo json_encode(['ok'=>true]);
    exit;
  }

  tg_api_support('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '']);
  echo json_encode(['ok'=>true]);
  exit;
}

echo json_encode(['ok'=>true]);
