<?php
declare(strict_types=1);

// Telegram Bot webhook (PHP, shared-hosting friendly)
// Features:
require_once __DIR__ . '/../api/lib/affiliates.php';
// - Secure webhook (path token + secret header)
// - Language selection
// - Manual deposits/withdrawals via bot (admin approval)
// - Proof upload (photo) stored as tg_photo:<file_id>
// - Conversation state persisted in DB (bot_states)

require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/settings.php';
require_once __DIR__ . '/../api/lib/schema.php';
require_once __DIR__ . '/../api/lib/ledger.php';
require_once __DIR__ . '/../api/lib/crypto.php';
require_once __DIR__ . '/../api/lib/cryptopay.php';
require_once __DIR__ . '/../api/lib/fx.php';
require_once __DIR__ . '/../api/lib/country_currency.php';
require_once __DIR__ . '/countries.php';

header('Content-Type: application/json; charset=utf-8');

// ---- Security ----
$pathToken = (string)env('BOT_PATH_TOKEN', '');
if ($pathToken !== '') {
  $got = (string)($_GET['token'] ?? '');
  if (!hash_equals($pathToken, $got)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$secret = (string)env('BOT_WEBHOOK_SECRET', '');
if ($secret !== '') {
  // Telegram header name: X-Telegram-Bot-Api-Secret-Token
  $hdr = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');
  if (!hash_equals($secret, $hdr)) {
    http_response_code(403);
    echo json_encode(['ok'=>false,'error'=>'Forbidden']);
    exit;
  }
}

$botToken = (string)setting_get('bot.token','');
if ($botToken==='') $botToken = (string)env('TELEGRAM_BOT_TOKEN','');
if ($botToken==='') { echo json_encode(['ok'=>false,'error'=>'Main bot token missing (set bot.token or TELEGRAM_BOT_TOKEN)']); exit; }
$GLOBALS['__MAIN_BOT_TOKEN'] = $botToken;

$update = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
// Structured logs (admin can view in /admin/errors.php)
try {
  if (is_array($update) && $update) {
    $uid = (int)($update['update_id'] ?? 0);
    $keys = array_keys($update);
    tp_log('bot_main','INFO','incoming', ['update_id'=>$uid,'keys'=>$keys]);
  }
} catch (Throwable $e) {}
// Minimal debug log: helps confirm THIS endpoint is receiving updates
try {
  if (is_array($update) && $update) {
    error_log("[main_webhook] incoming " . json_encode(["keys"=>array_keys($update)], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
  }
} catch (Throwable $e) {}


// Fast ACK to Telegram to avoid update backlog (shared hosting). We still continue processing.
$__tp_ack_sent = false;
function tp_webhook_fast_ack(): void {
  global $__tp_ack_sent;
  if ($__tp_ack_sent) return;
  $__tp_ack_sent = true;

  // Robust fast-ACK on shared hosting even when output buffering is enabled.
  try {
    @ignore_user_abort(true);
    @http_response_code(200);

    $resp = json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($resp) || $resp === '') $resp = '{"ok":true}';

    header('Content-Type: application/json; charset=utf-8');
    header('Connection: close');
    header('Content-Length: ' . strlen($resp));

    // Flush all buffers so Telegram receives 200 immediately.
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

tp_webhook_fast_ack();

function tg_api(string $method, array $payload): array {
  $token = (string)($GLOBALS['__MAIN_BOT_TOKEN'] ?? '');
  if ($token === '') $token = (string)setting_get('bot.token','');
  if ($token === '') $token = (string)env('TELEGRAM_BOT_TOKEN','');
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_TIMEOUT => 8,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function app_url(): string {
  $u = (string)setting_get('app.url','');
  if ($u!=='') return rtrim($u,'/').'/';
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off') ? 'https' : 'https';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  return "{$scheme}://{$host}/";
}

function upsert_user(int $tg_id, int $chat_id, array $u): void {
  $pdo = db();
  $driver = db_driver();
  $username = (string)($u["username"] ?? "");
  $first = (string)($u["first_name"] ?? "");
  $last  = (string)($u["last_name"] ?? "");
  $now = time();

  // users schema uses tg_id + username fields (not telegram_id).
  if ($driver === "sqlite") {
    $pdo->prepare("INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(tg_id) DO UPDATE SET
        telegram_chat_id=excluded.telegram_chat_id,
        username=excluded.username,
        first_name=excluded.first_name,
        last_name=excluded.last_name,
        updated_at=excluded.updated_at")
      ->execute([(string)$tg_id, (string)$chat_id, $username, $first, $last, "en", $now, $now]);
  } else {
    $pdo->prepare("INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        telegram_chat_id=VALUES(telegram_chat_id),
        username=VALUES(username),
        first_name=VALUES(first_name),
        last_name=VALUES(last_name),
        updated_at=VALUES(updated_at)")
      ->execute([(string)$tg_id, (string)$chat_id, $username, $first, $last, "en", $now, $now]);
  }
}

function user_id_by_tg(int $tg_id): int {
  $pdo = db();
  $st = $pdo->prepare("SELECT id FROM users WHERE tg_id=? LIMIT 1");
  $st->execute([(string)$tg_id]);
  return (int)($st->fetchColumn() ?: 0);
}

// Store affiliate code as pending until the user actually logs into the Mini App.
// This enables device-level anti-fraud checks inside /api/verify.php.
function aff_set_pending_code(int $userId, string $code): void {
  $code = trim($code);
  if ($userId <= 0 || $code === '') return;
  // keep it short & safe
  $code = preg_replace('/[^A-Za-z0-9_-]/', '', $code);
  if ($code === '') return;
  if (strlen($code) > 64) $code = substr($code, 0, 64);

  try {
    $pdo = db();
    // Only set pending if user is not already bound to a manager.
    $pdo->prepare('UPDATE users SET pending_aff_code=CASE WHEN (manager_id IS NULL OR manager_id=0) THEN ? ELSE pending_aff_code END, pending_aff_set_at=? , updated_at=? WHERE id=?')
        ->execute([$code, time(), time(), $userId]);
  } catch (Throwable $e) {
    // ignore
  }
}

function set_locale(int $tg_id, string $lang): void {
  $lang = in_array($lang,["en","ar","ru"], true) ? $lang : "en";
  $pdo = db();
  $pdo->prepare("UPDATE users SET locale=?, updated_at=? WHERE tg_id=?")->execute([$lang, time(), (string)$tg_id]);
}

function user_locale(int $tg_id): string {
  $pdo = db();
  $st = $pdo->prepare("SELECT locale FROM users WHERE tg_id=? LIMIT 1");
  $st->execute([(string)$tg_id]);
  $l = strtolower((string)($st->fetchColumn() ?: "en"));
  return in_array($l,["en","ar","ru"], true) ? $l : "en";
}

function t(string $key, string $lang): string {
  $v = (string)setting_get($key.'.'.$lang, '');
  if ($v!=='') return $v;
  $v = (string)setting_get($key.'.en', '');
  return $v!=='' ? $v : $key;
}


// Editable bot texts (settings-backed) with safe fallbacks.
function bt(string $baseKey, string $lang, string $fallback): string {
  $lang = in_array($lang,["en","ar","ru"], true) ? $lang : 'en';
  $v = (string)setting_get($baseKey.'.'.$lang, '');
  if ($v !== '') return $v;
  $v = (string)setting_get($baseKey.'.en', '');
  return ($v !== '') ? $v : $fallback;
}

// Simple template replace: {var}
function tpl(string $text, array $vars): string {
  foreach ($vars as $k => $v) {
    $text = str_replace('{'.$k.'}', (string)$v, $text);
  }
  return $text;
}

// ---- Bot state (DB) ----
function bs_get(string $chat_id): ?array {
  $pdo = db();
  $st = $pdo->prepare('SELECT chat_id, tg_user_id, state, data FROM bot_states WHERE chat_id=? LIMIT 1');
  $st->execute([$chat_id]);
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
}

function bs_set(string $chat_id, string $tg_user_id, string $state, array $data): void {
  $pdo = db();
  $driver = db_driver();
  $now = time();
  $json = json_encode($data, JSON_UNESCAPED_UNICODE);
  if ($driver === 'sqlite') {
    $pdo->prepare('INSERT INTO bot_states(chat_id,tg_user_id,state,data,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(chat_id) DO UPDATE SET tg_user_id=excluded.tg_user_id, state=excluded.state, data=excluded.data, updated_at=excluded.updated_at')
      ->execute([$chat_id, $tg_user_id, $state, $json, $now]);
  } else {
    $pdo->prepare('INSERT INTO bot_states(chat_id,tg_user_id,state,data,updated_at) VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE tg_user_id=VALUES(tg_user_id), state=VALUES(state), data=VALUES(data), updated_at=VALUES(updated_at)')
      ->execute([$chat_id, $tg_user_id, $state, $json, $now]);
  }
}

function bs_clear(string $chat_id): void {
  $pdo = db();
  $pdo->prepare('DELETE FROM bot_states WHERE chat_id=?')->execute([$chat_id]);
}

// ---- Intent parsing (tp_<payload>.<sig>) ----
function intent_parse(string $text): ?array {
  $m = [];
  if (!preg_match('/tp_([A-Za-z0-9+\/_=-]+)\.([a-f0-9]{64})/i', $text, $m)) return null;
  $payload = $m[1];
  $sig = strtolower($m[2]);
  $secret = (string)env('BOT_INTENT_SECRET','change_me');
  $calc = hash_hmac('sha256', $payload, $secret);
  if (!hash_equals($calc, $sig)) return null;
  $raw = base64_decode($payload, true);
  if ($raw === false) return null;
  $data = json_decode($raw, true);
  if (!is_array($data)) return null;
  return ['payload'=>$payload, 'sig'=>$sig, 'data'=>$data];
}

function kb_lang(): array {
  return [[
    ['text'=>'English','callback_data'=>'lang:en'],
    ['text'=>'العربية','callback_data'=>'lang:ar'],
    ['text'=>'Русский','callback_data'=>'lang:ru'],
  ]];
}

function kb_menu(string $lang): array {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $url = app_url();
  $t = function(string $k) use ($lang): string {
    $m = [
      'open_app' => ['en'=>'Open App',      'ar'=>'فتح التطبيق', 'ru'=>'Открыть приложение'],
      'balance'  => ['en'=>'Balance',       'ar'=>'الرصيد',     'ru'=>'Баланс'],
      'trades'   => ['en'=>'Open Trades',   'ar'=>'الصفقات',    'ru'=>'Сделки'],
      'invest'   => ['en'=>'Investments',   'ar'=>'استثمارات',  'ru'=>'Инвестиции'],
      'support'  => ['en'=>'Support',       'ar'=>'الدعم',      'ru'=>'Поддержка'],
    ];
    return $m[$k][$lang] ?? ($m[$k]['en'] ?? $k);
  };
  return [
    [[ 'text' => $t('open_app'), 'web_app' => ['url'=>$url.'?lang='.$lang] ]],
    [
      ['text'=>$t('balance'), 'callback_data'=>'q:bal'],
      ['text'=>$t('trades'),  'callback_data'=>'q:pos'],
    ],
    [[ 'text'=>$t('invest'), 'callback_data'=>'q:inv' ]],
    [[ 'text'=>$t('support'), 'callback_data'=>'sup:start' ]],
  ];
}

// -----------------------------
// Support flow (inside MAIN bot)
// -----------------------------
function support_allowed_langs(): array { return ['en','ar','ru','fr','de','zh']; }

function support_set_locale(int $tg_id, string $lang): void {
  $lang = strtolower(trim($lang));
  if (!in_array($lang, support_allowed_langs(), true)) $lang = 'en';
  try {
    db()->prepare('UPDATE users SET support_locale=?, updated_at=? WHERE tg_id=?')->execute([$lang, time(), (string)$tg_id]);
  } catch (Throwable $e) {
    // ignore
  }
}

function support_user_locale(int $tg_id, string $fallbackMain = 'en'): string {
  try {
    $st = db()->prepare('SELECT support_locale, locale FROM users WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tg_id]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: [];
    $sl = strtolower((string)($row['support_locale'] ?? ''));
    if (in_array($sl, support_allowed_langs(), true)) return $sl;
    $ml = strtolower((string)($row['locale'] ?? $fallbackMain));
    if (in_array($ml, ['en','ar','ru'], true)) return $ml;
    return $fallbackMain;
  } catch (Throwable $e) {
    return $fallbackMain;
  }
}

function support_saved_locale(int $tg_id): string {
  try {
    $st = db()->prepare('SELECT support_locale FROM users WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tg_id]);
    $v = strtolower(trim((string)($st->fetchColumn() ?: '')));
    return in_array($v, support_allowed_langs(), true) ? $v : '';
  } catch (Throwable $e) {
    return '';
  }
}


function support_text(string $key, string $lang, array $vars=[]): string {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  $name = (string)($vars['name'] ?? '');
  $id   = (string)($vars['id'] ?? '');
  $reason = (string)($vars['reason'] ?? '');

  $map = [
    'start' => [
      'en' => "Hi {$name} 👋\n\nChoose your support language.",
      'ar' => "أهلاً {$name} 👋\n\nاختر لغة الدعم.",
      'ru' => "Привет, {$name} 👋\n\nВыберите язык поддержки.",
      'fr' => "Salut {$name} 👋\n\nChoisissez la langue du support.",
      'de' => "Hallo {$name} 👋\n\nWähle die Support-Sprache.",
      'zh' => "你好 {$name} 👋\n\n请选择客服语言。",
    ],
    'choose_reason' => [
      'en' => 'Choose the reason for contacting support:',
      'ar' => 'اختر سبب التواصل مع الدعم:',
      'ru' => 'Выберите причину обращения в поддержку:',
      'fr' => 'Choisissez la raison de contacter le support :',
      'de' => 'Wähle den Grund für den Support:',
      'zh' => '请选择联系支持的原因：',
    ],
    'ask_msg' => [
      'en' => 'Write your message now (you can send a photo too).',
      'ar' => 'اكتب رسالتك الآن (وينفع تبعت صورة كمان).',
      'ru' => 'Напишите сообщение (можно отправить фото).',
      'fr' => 'Écrivez votre message (vous pouvez aussi envoyer une photo).',
      'de' => 'Schreibe deine Nachricht (du kannst auch ein Foto senden).',
      'zh' => '请发送你的消息（也可以发送图片）。',
    ],
    'sent' => [
      'en' => "✅ Sent to support. Ticket #{$id}",
      'ar' => "✅ تم إرسالها للدعم. رقم التذكرة #{$id}",
      'ru' => "✅ Отправлено в поддержку. Тикет #{$id}",
      'fr' => "✅ Envoyé au support. Ticket #{$id}",
      'de' => "✅ An Support gesendet. Ticket #{$id}",
      'zh' => "✅ 已发送给客服。工单 #{$id}",
    ],
    'closed' => [
      'en' => "✅ Ticket closed. #{$id}",
      'ar' => "✅ تم إغلاق التذكرة. #{$id}",
      'ru' => "✅ Тикет закрыт. #{$id}",
      'fr' => "✅ Ticket fermé. #{$id}",
      'de' => "✅ Ticket geschlossen. #{$id}",
      'zh' => "✅ 工单已关闭。#{$id}",
    ],
    'agent_missing' => [
      'en' => 'Support is not configured yet for this language. Ask admin to set support.username.<lang>.',
      'ar' => 'يوزر/حساب الدعم للغة دي مش متظبط لسه. اطلب من الأدمن يحدده من لوحة التحكم.',
      'ru' => 'Поддержка для этого языка ещё не настроена. Попросите админа настроить.',
      'fr' => "Le support pour cette langue n'est pas encore configuré.",
      'de' => 'Support für diese Sprache ist noch nicht eingestellt.',
      'zh' => '该语言的客服尚未配置。',
    ],
    'agent_need_start' => [
      'en' => 'Note: the support account must press Start with this bot once to receive tickets.',
      'ar' => 'ملاحظة: حساب الدعم لازم يعمل Start للبوت مرة واحدة عشان يستقبل التذاكر.',
      'ru' => 'Примечание: аккаунт поддержки должен один раз нажать Start у этого бота, чтобы получать тикеты.',
      'fr' => "Note : le support doit appuyer sur Start une fois avec ce bot pour recevoir les tickets.",
      'de' => 'Hinweis: Der Support-Account muss einmal Start bei diesem Bot drücken, um Tickets zu erhalten.',
      'zh' => '提示：客服账号需要先在此机器人里点一次 Start 才能收到工单。',
    ],
    'btn.change_lang' => [
      'en' => 'Change language',
      'ar' => 'تغيير اللغة',
      'ru' => 'Сменить язык',
      'fr' => 'Changer la langue',
      'de' => 'Sprache ändern',
      'zh' => '更改语言',
    ],
    'btn.open_agent' => [
      'en' => 'Chat with support',
      'ar' => 'فتح محادثة الدعم',
      'ru' => 'Открыть поддержку',
      'fr' => 'Ouvrir le support',
      'de' => 'Support öffnen',
      'zh' => '打开客服',
    ],
    'btn.close' => [
      'en' => 'Close ticket',
      'ar' => 'إغلاق التذكرة',
      'ru' => 'Закрыть тикет',
      'fr' => 'Fermer le ticket',
      'de' => 'Ticket schließen',
      'zh' => '关闭工单',
    ],
    'btn.reply' => [
      'en' => 'Reply',
      'ar' => 'رد',
      'ru' => 'Ответить',
      'fr' => 'Répondre',
      'de' => 'Antworten',
      'zh' => '回复',
    ],
    'received' => [
      'en' => "✅ Ticket received. #{$id}",
      'ar' => "✅ تم استلام الشكوى. رقم التذكرة #{$id}",
      'ru' => "✅ Запрос принят. Тикет #{$id}",
      'fr' => "✅ Ticket reçu. #{$id}",
      'de' => "✅ Ticket erhalten. #{$id}",
      'zh' => "✅ 已收到。工单 #{$id}",
    ],
    'btn.back' => [
      'en' => 'Back',
      'ar' => 'رجوع',
      'ru' => 'Назад',
      'fr' => 'Retour',
      'de' => 'Zurück',
      'zh' => '返回',
    ],
    'btn.cancel' => [
      'en' => 'Cancel',
      'ar' => 'إلغاء',
      'ru' => 'Отмена',
      'fr' => 'Annuler',
      'de' => 'Abbrechen',
      'zh' => '取消',
    ],
    'btn.support_menu' => [
      'en' => 'Support menu',
      'ar' => 'قائمة الدعم',
      'ru' => 'Меню поддержки',
      'fr' => 'Menu support',
      'de' => 'Support-Menü',
      'zh' => '客服菜单',
    ],
    'btn.main_menu' => [
      'en' => 'Main menu',
      'ar' => 'القائمة الرئيسية',
      'ru' => 'Главное меню',
      'fr' => 'Menu principal',
      'de' => 'Hauptmenü',
      'zh' => '主菜单',
    ],
    'btn.cancel_request' => [
      'en' => 'Cancel request',
      'ar' => 'إلغاء الطلب',
      'ru' => 'Отменить запрос',
      'fr' => 'Annuler la demande',
      'de' => 'Anfrage abbrechen',
      'zh' => '取消请求',
    ],
    'cancelled' => [
      'en' => '✅ Cancelled.',
      'ar' => '✅ تم الإلغاء.',
      'ru' => '✅ Отменено.',
      'fr' => '✅ Annulé.',
      'de' => '✅ Abgebrochen.',
      'zh' => '✅ 已取消。',
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
    'agent_new_ticket' => [
      'en' => "📩 New support ticket #{$id}\nReason: {$reason}",
      'ar' => "📩 تذكرة دعم جديدة #{$id}\nالسبب: {$reason}",
      'ru' => "📩 Новый тикет #{$id}\nПричина: {$reason}",
      'fr' => "📩 Nouveau ticket #{$id}\nRaison : {$reason}",
      'de' => "📩 Neues Ticket #{$id}\nGrund: {$reason}",
      'zh' => "📩 新工单 #{$id}\n原因：{$reason}",
    ],
  ];

  $out = (string)(($map[$key] ?? [])[$lang] ?? (($map[$key] ?? [])['en'] ?? $key));
  return $out;
}

function support_kb_langs(): array {
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

function support_kb_reasons(string $lang): array {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  return [
    [
      ['text'=>support_text('reason.pay', $lang), 'callback_data'=>'support_reason:pay'],
      ['text'=>support_text('reason.wd',  $lang), 'callback_data'=>'support_reason:wd'],
    ],
    [
      ['text'=>support_text('reason.trade', $lang), 'callback_data'=>'support_reason:trade'],
      ['text'=>support_text('reason.account', $lang), 'callback_data'=>'support_reason:account'],
    ],
    [
      ['text'=>support_text('reason.other', $lang), 'callback_data'=>'support_reason:other'],
    ],
    [
      ['text'=>support_text('btn.change_lang', $lang), 'callback_data'=>'support_show_lang'],
    ],
  ];
}


function support_kb_details(string $lang): array {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  return [
    [
      ['text'=>support_text('btn.back', $lang), 'callback_data'=>'support_back_reasons'],
      ['text'=>support_text('btn.change_lang', $lang), 'callback_data'=>'support_show_lang'],
    ],
    [
      ['text'=>support_text('btn.cancel', $lang), 'callback_data'=>'support_cancel'],
    ],
  ];
}

function support_kb_after_ticket(string $lang, string $agentUser, int $ticketId): array {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  $agentUser = trim($agentUser);
  $agentUser = ltrim($agentUser, '@');
  $url = ($agentUser !== '') ? ('https://t.me/' . $agentUser) : '';

  $row1 = [
    ['text'=>support_text('btn.support_menu', $lang), 'callback_data'=>'sup:start'],
    ['text'=>support_text('btn.main_menu', $lang), 'callback_data'=>'main:menu'],
  ];

  $row2 = [];
  if ($url !== '') $row2[] = ['text'=>support_text('btn.open_agent', $lang), 'url'=>$url];
  $row2[] = ['text'=>support_text('btn.cancel_request', $lang), 'callback_data'=>'sup_user_close:' . (string)$ticketId];

  return [$row1, $row2];
}

function support_agent_username(string $lang): string {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  $u = trim((string)setting_get('support.username.' . $lang, ''));
  if ($u === '') $u = trim((string)setting_get('support.contact.' . $lang, ''));
  if ($u === '') {
    $envKey = 'SUPPORT_CONTACT_' . strtoupper($lang);
    $u = trim((string)env($envKey, ''));
  }
  $u = trim($u);
  if ($u === '') return '';
  if (preg_match('~^https?://~i', $u)) {
    // convert URL -> username when possible
    if (preg_match('~t\.me/([^/?#]+)~i', $u, $m)) $u = (string)$m[1];
  }
  $u = ltrim($u, '@');
  $u = preg_replace('/[^A-Za-z0-9_]/', '', $u);
  return $u;
}

function support_agent_tg_id_by_username(string $username): int {
  $username = trim($username);
  $username = ltrim($username, '@');
  $username = preg_replace('/[^A-Za-z0-9_]/', '', $username);
  if ($username === '') return 0;
  try {
    $pdo = db();
    $st = $pdo->prepare('SELECT tg_id FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1');
    $st->execute([$username]);
    return (int)($st->fetchColumn() ?: 0);
  } catch (Throwable $e) {
    try {
      $pdo = db();
      $st = $pdo->prepare('SELECT tg_id FROM users WHERE username=? LIMIT 1');
      $st->execute([$username]);
      return (int)($st->fetchColumn() ?: 0);
    } catch (Throwable $e2) {
      return 0;
    }
  }
}

function support_ticket_create(int $userId, int $tgId, int $chatId, string $lang, string $reasonCode, string $agentUsername, int $agentTgId): int {
  $lang = in_array($lang, support_allowed_langs(), true) ? $lang : 'en';
  if (!in_array($reasonCode, ['pay','wd','trade','account','other'], true)) $reasonCode = 'other';
  $now = time();
  try {
    $pdo = db();
    $pdo->prepare('INSERT INTO support_tickets(user_id,tg_id,chat_id,lang,reason_code,agent_username,agent_tg_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,"open",?,?)')
        ->execute([$userId, (string)$tgId, (string)$chatId, $lang, $reasonCode, $agentUsername, $agentTgId ? (string)$agentTgId : null, $now, $now]);
    return (int)$pdo->lastInsertId();
  } catch (Throwable $e) {
    return 0;
  }
}

function support_ticket_get(int $ticketId): ?array {
  if ($ticketId <= 0) return null;
  try {
    $st = db()->prepare('SELECT * FROM support_tickets WHERE id=? LIMIT 1');
    $st->execute([$ticketId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
  } catch (Throwable $e) {
    return null;
  }
}

function support_ticket_add_msg(int $ticketId, string $sender, int $senderTgId, string $msgType, string $content): void {
  if ($ticketId <= 0) return;
  $sender = ($sender === 'agent') ? 'agent' : 'user';
  $msgType = ($msgType === 'photo') ? 'photo' : 'text';
  $now = time();
  try {
    db()->prepare('INSERT INTO support_messages(ticket_id,sender,sender_tg_id,msg_type,content,created_at) VALUES (?,?,?,?,?,?)')
        ->execute([$ticketId, $sender, (string)$senderTgId, $msgType, $content, $now]);
    db()->prepare('UPDATE support_tickets SET updated_at=? WHERE id=?')->execute([$now, $ticketId]);
  } catch (Throwable $e) {
    // ignore
  }
}

function support_ticket_close(int $ticketId): void {
  if ($ticketId <= 0) return;
  try {
    db()->prepare("UPDATE support_tickets SET status='closed', updated_at=? WHERE id=?")->execute([time(), $ticketId]);
  } catch (Throwable $e) {
    // ignore
  }
}

function support_start_flow(int $chat_id, int $tg_id, array $from, string $preferredLang = ''): void {
  $name = (string)($from['first_name'] ?? ($from['username'] ?? ''));
  $preferredLang = strtolower(trim($preferredLang));
  if ($preferredLang !== '' && in_array($preferredLang, support_allowed_langs(), true)) {
    support_set_locale($tg_id, $preferredLang);
    send_text($chat_id, support_text('choose_reason', $preferredLang, ['name'=>$name]), support_kb_reasons($preferredLang));
    return;
  }

  $saved = support_saved_locale($tg_id);
  if ($saved !== '') {
    send_text($chat_id, support_text('choose_reason', $saved, ['name'=>$name]), support_kb_reasons($saved));
    return;
  }

  $lang = support_user_locale($tg_id, 'en');
  send_text($chat_id, support_text('start', $lang, ['name'=>$name]), support_kb_langs());
}

function kb_methods(array $methods, string $kind): array {
  $rows = [];
  foreach ($methods as $m) {
    $k = strtolower((string)($m['kind'] ?? ''));
    if ($k !== $kind && $k !== 'both') continue;
    $code = (string)($m['code'] ?? '');
    if ($code==='') continue;
    $label = (string)($m['label'] ?? $code);
    $cur = (string)($m['currency'] ?? '');
    $rows[] = [[ 'text' => trim($label.' '.($cur!==''?"({$cur})":'')), 'callback_data' => 'm:'.$code ]];
    if (count($rows) >= 20) break;
  }
  return $rows ?: [[['text'=>'No methods','callback_data'=>'noop']]];
}

// Show approximate amount in user's local currency (based on country) e.g. "≈ 1,250 EGP"
function local_quote_line_local(string $cc, float $amountUsd, string $lang): string {
  $cc = strtoupper(trim($cc));
  if (!preg_match('/^[A-Z]{2}$/', $cc) || !($amountUsd > 0)) return '';
  try {
    $cur = country_currency($cc);
    if (!preg_match('/^[A-Z]{3}$/', $cur) || $cur === 'USD') return '';
    $fx = fx_usd_to($cur);
    $rate = (float)($fx['rate'] ?? 0);
    if (!($rate > 0)) return '';
    $local = $amountUsd * $rate;
    $localFmt = number_format($local, 2, '.', ',');
    $rateFmt  = number_format($rate, 4, '.', ',');
    // Keep it compact for Telegram messages
    return "≈ {$localFmt} {$cur} (1 USD ≈ {$rateFmt} {$cur})";
  } catch (Throwable $e) {
    return '';
  }
}

function send_text(int $chat_id, string $text, ?array $kb=null): void {
  $p = ['chat_id'=>$chat_id, 'text'=>$text, 'parse_mode'=>'HTML'];
  if ($kb) $p['reply_markup'] = ['inline_keyboard'=>$kb];
  tg_api('sendMessage', $p);
}

// Edit the same menu message (keeps chat clean). Fallback to send_text if edit fails.
function edit_text(int $chat_id, int $message_id, string $text, ?array $kb=null): bool {
  if ($chat_id <= 0 || $message_id <= 0) return false;
  $p = ['chat_id'=>$chat_id, 'message_id'=>$message_id, 'text'=>$text, 'parse_mode'=>'HTML'];
  if ($kb) $p['reply_markup'] = ['inline_keyboard'=>$kb];
  else $p['reply_markup'] = ['inline_keyboard'=>[]];
  $res = tg_api('editMessageText', $p);
  return (bool)($res['ok'] ?? false);
}

function edit_or_send(int $chat_id, int $message_id, string $text, ?array $kb=null): void {
  if (!edit_text($chat_id, $message_id, $text, $kb)) {
    send_text($chat_id, $text, $kb);
  }
}


function abs_url(string $u): string {
  $u = trim($u);
  if ($u === '') return '';
  if (preg_match('~^https?://~i', $u)) return $u;
  $base = rtrim(app_url(), '/');
  if (str_starts_with($u, '/')) return $base . $u;
  return $base . '/' . $u;
}

function send_photo(int $chat_id, string $photoUrl, string $caption = '', ?array $kb=null): void {
  $photoUrl = abs_url($photoUrl);
  if ($photoUrl === '') { if ($caption !== '') send_text($chat_id, $caption, $kb); return; }
  $p = ['chat_id'=>$chat_id, 'photo'=>$photoUrl];
  if ($caption !== '') { $p['caption'] = $caption; $p['parse_mode'] = 'HTML'; }
  if ($kb) $p['reply_markup'] = ['inline_keyboard'=>$kb];
  tg_api('sendPhoto', $p);
}

function answer_cb(string $id, string $text=''): void {
  $p = ['callback_query_id'=>$id];
  if ($text!=='') $p['text'] = $text;
  tg_api('answerCallbackQuery', $p);
}

function payment_methods_public(?string $countryCode = null, string $lang = 'en'): array {
  $pdo = db();
  $countryCode = $countryCode ? strtoupper(trim($countryCode)) : null;
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';

  $drv = db_driver();
  $hasTitle = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'title_en', $drv) : true;
  $hasLabel = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'label', $drv) : false;
  $hasInsLang = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'instructions_en', $drv) : true;
  $hasIns = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'instructions', $drv) : false;
  $hasImg = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'image_url', $drv) : true;
  $hasProvider = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'payment_methods', 'provider', $drv) : true;

  $cols = ['pm.id','pm.code','pm.kind','pm.currency','pm.status'];
  if ($hasProvider) { $cols[]='pm.provider'; }
  if ($hasTitle) { $cols[]='pm.title_en'; $cols[]='pm.title_ar'; $cols[]='pm.title_ru'; }
  if ($hasLabel) { $cols[]='pm.label'; }
  if ($hasInsLang) { $cols[]='pm.instructions_en'; $cols[]='pm.instructions_ar'; $cols[]='pm.instructions_ru'; }
  if ($hasIns) { $cols[]='pm.instructions'; }
  if ($hasImg) { $cols[]='pm.image_url'; }

  $select = implode(',', $cols);

  // Country-scoped mapping table is optional.
  $hasMap = false;
  try {
    if (function_exists('schema_table_exists')) {
      $hasMap = schema_table_exists($pdo, 'payment_method_countries', $drv);
    } else {
      $pdo->query('SELECT 1 FROM payment_method_countries LIMIT 1');
      $hasMap = true;
    }
  } catch (Throwable $e) { $hasMap = false; }

  $rows = [];
  try {
    if ($countryCode && $hasMap) {
      $st = $pdo->prepare("SELECT {$select} FROM payment_methods pm LEFT JOIN payment_method_countries pmc ON pmc.method_id = pm.id AND pmc.country_code = ? WHERE pm.status='active' AND (pmc.method_id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM payment_method_countries x WHERE x.method_id = pm.id)) ORDER BY pm.sort_order ASC, pm.id ASC LIMIT 200");
      $st->execute([$countryCode]);
      $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } else {
      $st = $pdo->query("SELECT {$select} FROM payment_methods pm WHERE pm.status='active' ORDER BY pm.sort_order ASC, pm.id ASC LIMIT 200");
      $rows = $st ? ($st->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }
  } catch (Throwable $e) {
    $rows = [];
  }

  $out = [];
  foreach ($rows as $r) {
    $label = '';
    if ($hasTitle) {
      $label = (string)($r['title_'.$lang] ?? '');
      if ($label === '') $label = (string)($r['title_en'] ?? '');
    }
    if ($label === '' && $hasLabel) $label = (string)($r['label'] ?? '');
    if ($label === '') $label = (string)($r['code'] ?? '');

    $ins = '';
    if ($hasInsLang) {
      $ins = (string)($r['instructions_'.$lang] ?? '');
      if ($ins === '') $ins = (string)($r['instructions_en'] ?? '');
    }
    if ($ins === '' && $hasIns) $ins = (string)($r['instructions'] ?? '');

    $out[] = [
      'id' => (int)($r['id'] ?? 0),
      'code' => (string)($r['code'] ?? ''),
      'label' => $label,
      'kind' => (string)($r['kind'] ?? ''),
      'currency' => (string)($r['currency'] ?? ''),
      'instructions' => $ins,
      'image_url' => $hasImg ? ($r['image_url'] ?? null) : null,
      'status' => (string)($r['status'] ?? ''),
      'provider' => $hasProvider ? (string)($r['provider'] ?? '') : '',
    ];
  }

  return $out;
}

// ---- Quick info endpoints (using DB directly to avoid extra auth complexity) ----
function bot_balances(int $user_id): array {
  $realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
  $demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
  ensure_wallet($user_id, $realCur);
  ensure_wallet($user_id, $demoCur);
  $realBal = (float)wallet_balance($user_id, $realCur);
  $demoBal = (float)wallet_balance($user_id, $demoCur);
  return [
    'real_currency' => $realCur,
    'demo_currency' => $demoCur,
    'real_balance' => $realBal,
    'demo_balance' => $demoBal,
  ];
}

function bot_open_positions(int $user_id): array {
  $pdo = db();
  $st = $pdo->prepare('SELECT id,symbol,market_type,side,qty,leverage FROM positions WHERE user_id=? AND status="open" ORDER BY id DESC LIMIT 12');
  $st->execute([$user_id]);
  return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function bot_investments(int $user_id): array {
  $pdo = db();
  $plans = $pdo->query('SELECT id,name,term_days,roi_percent,min_amount FROM invest_plans WHERE status="active" ORDER BY sort_order ASC, id ASC LIMIT 10')->fetchAll(PDO::FETCH_ASSOC) ?: [];
  $st = $pdo->prepare('SELECT i.id,i.amount,i.status,p.name AS plan_name FROM investments i LEFT JOIN invest_plans p ON p.id=i.plan_id WHERE i.user_id=? ORDER BY i.id DESC LIMIT 10');
  $st->execute([$user_id]);
  $mine = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  return ['plans'=>$plans,'mine'=>$mine];
}

// ---- Message handler ----
if (isset($update['message'])) {
  $m = $update['message'];
  $chat_id = (int)($m['chat']['id'] ?? 0);
  $from = $m['from'] ?? [];
  $tg_id = (int)($from['id'] ?? 0);
  if ($chat_id && $tg_id) upsert_user($tg_id, $chat_id, $from);

  $lang = $tg_id ? user_locale($tg_id) : 'en';

  // WebApp sendData handler (Support button inside Mini App)
  if (isset($m['web_app_data']) && isset($m['web_app_data']['data'])) {
    $raw = (string)($m['web_app_data']['data'] ?? '');
    $payload = null;
    if ($raw !== '') {
      $tmp = json_decode($raw, true);
      if (is_array($tmp)) $payload = $tmp;
    }
    $action = is_array($payload) ? (string)($payload['action'] ?? '') : '';
    if ($action === 'support') {
      $pl = is_array($payload) ? (string)($payload['lang'] ?? '') : '';
      support_start_flow($chat_id, $tg_id, $from, $pl);
      exit;
    }
  }

  // Support: agent reply mode (agent types the reply text)
  $stPre = bs_get((string)$chat_id);
  if ($stPre && ($stPre['state'] ?? '') === 'support_agent_reply' && isset($m['text'])) {
    $d = (array)($stPre['data'] ?? []);
    $ticketId = (int)($d['ticket_id'] ?? 0);
    $ticket = support_ticket_get($ticketId);
    if ($ticket) {
      $agentTg = (int)($ticket['agent_tg_id'] ?? 0);
      // Only the assigned agent can reply
      if ($agentTg > 0 && $agentTg === $tg_id) {
        $userChat = (int)($ticket['chat_id'] ?? 0);
        $sl = (string)($ticket['lang'] ?? 'en');
        $textReply = trim((string)($m['text'] ?? ''));
        if ($textReply !== '') {
          support_ticket_add_msg($ticketId, 'agent', $tg_id, 'text', $textReply);
          if ($userChat > 0) {
            send_text($userChat, $textReply);
          }
          bs_clear((string)$chat_id);
          send_text($chat_id, support_text('sent', $sl, ['id'=>(string)$ticketId]));
          echo json_encode(['ok'=>true]); exit;
        }
      }
    }
    // If invalid, just clear state
    bs_clear((string)$chat_id);
  }

  // Photo proof (deposit only)
  if (isset($m['photo'])) {
    $st = bs_get((string)$chat_id);



    // Support: user sent photo while we are collecting initial details (before creating ticket)
    if ($st && ($st['state'] ?? '') === 'support_user_details') {
      $d = (array)($st['data'] ?? []);
      $sl = (string)($d['lang'] ?? support_user_locale($tg_id, 'en'));
      $reason = (string)($d['reason'] ?? 'other');
      if (!in_array($reason, ['pay','wd','trade','account','other'], true)) $reason = 'other';
      $agentUser = (string)($d['agent_username'] ?? support_agent_username($sl));
      $agentTg = (int)($d['agent_tg_id'] ?? 0);

      $uid = user_id_by_tg($tg_id);
      if ($uid <= 0) {
        bs_clear((string)$chat_id);
        send_text($chat_id, ($lang==='ar'?'افتح التطبيق مرة وبعدين جرّب تاني.':($lang==='ru'?'Откройте приложение один раз и попробуйте снова.':'Open the app once, then try again.')));
        echo json_encode(['ok'=>true]); exit;
      }

      $photos = $m['photo'] ?? [];
      $best = end($photos);
      $fileId = (string)($best['file_id'] ?? '');
      if ($fileId === '') {
        send_text($chat_id, support_text('ask_msg', $sl), support_kb_details($sl));
        echo json_encode(['ok'=>true]); exit;
      }

      $ticketId = support_ticket_create($uid, $tg_id, $chat_id, $sl, $reason, $agentUser, $agentTg);
      if ($ticketId <= 0) {
        bs_clear((string)$chat_id);
        send_text($chat_id, ($lang==='ar'?'❌ حصل خطأ. حاول تاني.':($lang==='ru'?'❌ Ошибка. Попробуйте ещё раз.':'❌ Error. Try again.')));
        echo json_encode(['ok'=>true]); exit;
      }

      support_ticket_add_msg($ticketId, 'user', $tg_id, 'photo', 'tg_photo:' . $fileId);

      // Notify manager
      try {
        $reasonText = support_text('reason.' . $reason, $sl);
        aff_notify_manager_for_user($uid, 'support_ticket', ['id'=>(string)$ticketId, 'reason'=>$reasonText]);
      } catch (Throwable $e) { /* ignore */ }

      // Notify agent
      if ($agentTg > 0) {
        $reasonText = support_text('reason.' . $reason, $sl);
        $uName = (string)($from['username'] ?? '');
        $who = ($uName !== '') ? ('@'.$uName) : ('tg:' . (string)$tg_id);
        tg_api('sendPhoto', [
          'chat_id' => $agentTg,
          'photo' => $fileId,
          'caption' => support_text('agent_new_ticket', $sl, ['id'=>(string)$ticketId, 'reason'=>$reasonText]) . "
User: {$who}",
          'reply_markup' => ['inline_keyboard' => [
            [[ 'text' => support_text('btn.reply', $sl), 'callback_data' => 'sup_reply:'.$ticketId ]],
            [[ 'text' => support_text('btn.close', $sl), 'callback_data' => 'sup_close:'.$ticketId ]],
          ]],
        ]);
      }

      // Move to open ticket state for further messages
      bs_set((string)$chat_id, (string)$tg_id, 'support_user_msg', ['ticket_id'=>$ticketId, 'lang'=>$sl]);

      send_text($chat_id, support_text('received', $sl, ['id'=>(string)$ticketId]), support_kb_after_ticket($sl, $agentUser, $ticketId));
      echo json_encode(['ok'=>true]); exit;
    }
    // Support: user sent photo inside an open ticket
    if ($st && ($st['state'] ?? '') === 'support_user_msg') {
      $d = (array)($st['data'] ?? []);
      $ticketId = (int)($d['ticket_id'] ?? 0);
      $sl = (string)($d['lang'] ?? support_user_locale($tg_id, 'en'));
      $ticket = support_ticket_get($ticketId);
      $photos = $m['photo'] ?? [];
      $best = end($photos);
      $fileId = (string)($best['file_id'] ?? '');
      if ($ticketId > 0 && $fileId !== '') {
        support_ticket_add_msg($ticketId, 'user', $tg_id, 'photo', 'tg_photo:' . $fileId);
        try {
          $uidLocal = (int)($ticket['user_id'] ?? 0);
          if ($uidLocal > 0) {
            $reasonText = support_text('reason.' . (string)($ticket['reason_code'] ?? 'other'), $sl);
            aff_notify_manager_for_user($uidLocal, 'support_msg', ['id'=>(string)$ticketId, 'reason'=>$reasonText, 'text'=>'[photo]']);
          }
        } catch (Throwable $e) { /* ignore */ }


        $agentTg = (int)($ticket['agent_tg_id'] ?? 0);
        if ($agentTg > 0) {
          $reasonText = support_text('reason.' . (string)($ticket['reason_code'] ?? 'other'), $sl);
          $uName = (string)($from['username'] ?? '');
          $who = ($uName !== '') ? ('@'.$uName) : ('tg:' . (string)$tg_id);
          tg_api('sendPhoto', [
            'chat_id' => $agentTg,
            'photo' => $fileId,
            'caption' => support_text('agent_new_ticket', $sl, ['id'=>(string)$ticketId, 'reason'=>$reasonText]) . "\nUser: {$who}",
            'reply_markup' => ['inline_keyboard' => [
              [[ 'text' => support_text('btn.reply', $sl), 'callback_data' => 'sup_reply:'.$ticketId ]],
              [[ 'text' => support_text('btn.close', $sl), 'callback_data' => 'sup_close:'.$ticketId ]],
            ]],
          ]);
        }
        send_text($chat_id, support_text('sent', $sl, ['id'=>(string)$ticketId]), [[['text'=>support_text('btn.close',$sl),'callback_data'=>'sup_user_close:'.$ticketId]]]);
        echo json_encode(['ok'=>true]); exit;
      }

      send_text($chat_id, support_text('ask_msg', $sl));
      echo json_encode(['ok'=>true]); exit;
    }

    // If user is in withdrawal destination step, do NOT accept photo.
    if ($st && ($st['state'] ?? '') === 'await_destination') {
      send_text($chat_id,
        ($lang==='ar') ? 'السحب مش محتاج صورة إثبات. ابعت عنوان الاستلام نص.'
        : (($lang==='ru') ? 'Для вывода не нужен скриншот. Отправьте адрес получения текстом.'
          : 'Withdrawal does not require a proof screenshot. Please send the destination address as text.'
        )
      );
      echo json_encode(['ok'=>true]); exit;
    }

    if (!$st || ($st['state'] ?? '') !== 'await_proof') {
      send_text($chat_id, bt('bot.flow.proof_no_session', $lang, $lang==='ar' ? 'ابعت /start وابدأ طلب إيداع الأول.' : ($lang==='ru'?'Отправьте /start и начните заявку на депозит сначала.':'Send /start and start a deposit request first.')));
      echo json_encode(['ok'=>true]); exit;
    }

    $photos = $m['photo'] ?? [];
    $best = end($photos);
    $fileId = (string)($best['file_id'] ?? '');
    if ($fileId==='') {
      send_text($chat_id, bt('bot.flow.proof_bad_photo', $lang, $lang==='ar' ? 'الصورة مش واضحة. جرّب تاني.' : ($lang==='ru'?'Не удалось прочитать фото. Попробуйте еще раз.':'Could not read photo. Try again.')));
      echo json_encode(['ok'=>true]); exit;
    }
    $data = (array)($st['data'] ?? []);
    $kind = strtolower((string)($data['kind'] ?? ''));
    $user_id = (int)($data['user_id'] ?? 0);
    $amount = (float)($data['amount'] ?? 0);
    $currency = strtoupper((string)($data['currency'] ?? 'USDT'));
    $method = strtolower((string)($data['method_code'] ?? ''));
    $destination = trim((string)($data['destination'] ?? ''));
    // Proof flow is deposit-only. If something set withdraw here (legacy), reject safely.
    if ($kind !== 'deposit' || $user_id<=0 || !($amount>0) || $method==='') {
      bs_clear((string)$chat_id);
      send_text($chat_id, bt('bot.flow.session_invalid', $lang, $lang==='ar'?'الجلسة غير صالحة. ابدأ من جديد /start.':($lang==='ru'?'Сессия недействительна. Начните заново: /start.':'Session invalid. Please /start again.')));
      echo json_encode(['ok'=>true]); exit;
    }

    $pdo = db();
    $now = time();

    try {
      $pdo->beginTransaction();
      // deposit
      $ext = 'tg_photo:'.$fileId;
      $pdo->prepare("INSERT INTO deposits (user_id,provider,method_code,currency,amount,status,external_ref,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?,?)")
        ->execute([$user_id,'bot',$method,$currency,$amount,$ext,$now,$now]);
      $id = (int)$pdo->lastInsertId();
      $pdo->commit();
      // Notify manager (best effort)
      try {
        aff_notify_manager_for_user($user_id, 'dep_created', [
          'id' => $id,
          'amount' => number_format($amount, 2, '.', ''),
          'cur' => $currency,
        ]);
      } catch (Throwable $e2) {}
      bs_clear((string)$chat_id);
      send_text($chat_id, tpl(bt('bot.flow.deposit_submitted', $lang, $lang==='ar' ? "✅ تم استلام إثبات التحويل. الإيداع قيد المراجعة. رقم الطلب: #{id}
الأدمن هيراجعه ويوافق." : ($lang==='ru'?"✅ Подтверждение оплаты получено. Депозит на проверке. №: #{id}
Админ проверит и подтвердит.":"✅ Payment proof received. Deposit is under review. Ref: #{id}
Admin will review and approve.")), ['id'=>$id]));
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      // Best-effort: release hold if created but insert failed (rare)
      try { if (!empty($holdId)) hold_release((int)$holdId, 'released'); } catch(Throwable $ignored) {}
      bs_clear((string)$chat_id);
      send_text($chat_id, bt('bot.flow.internal_error', $lang, $lang==='ar'?'❌ حصل خطأ داخلي. حاول تاني.':($lang==='ru'?'❌ Внутренняя ошибка. Попробуйте ещё раз.':'❌ Internal error. Please try again.')));
    }

    echo json_encode(['ok'=>true]); exit;
  }

  $text = trim((string)($m['text'] ?? ''));

  // /support command (works anytime)
  if (preg_match('/^\/(support|help)(?:@\w+)?\b/i', $text)) {
    bs_clear((string)$chat_id);
    support_start_flow($chat_id, $tg_id, $from);
    echo json_encode(['ok'=>true]); exit;
  }

  // Support: initial details stage (user types message before ticket is created)
  $stTmp = bs_get((string)$chat_id);
  if ($stTmp && ($stTmp['state'] ?? '') === 'support_user_details' && $text !== '') {
    $d = (array)($stTmp['data'] ?? []);
    $sl = (string)($d['lang'] ?? support_user_locale($tg_id, 'en'));
    $reason = (string)($d['reason'] ?? 'other');
    if (!in_array($reason, ['pay','wd','trade','account','other'], true)) $reason = 'other';
    $agentUser = (string)($d['agent_username'] ?? support_agent_username($sl));
    $agentTg = (int)($d['agent_tg_id'] ?? 0);

    $uid = user_id_by_tg($tg_id);
    if ($uid <= 0) {
      bs_clear((string)$chat_id);
      send_text($chat_id, ($lang==='ar'?'افتح التطبيق مرة وبعدين جرّب تاني.':($lang==='ru'?'Откройте приложение один раз и попробуйте снова.':'Open the app once, then try again.')));
      echo json_encode(['ok'=>true]); exit;
    }

    $ticketId = support_ticket_create($uid, $tg_id, $chat_id, $sl, $reason, $agentUser, $agentTg);
    if ($ticketId <= 0) {
      bs_clear((string)$chat_id);
      send_text($chat_id, ($lang==='ar'?'❌ حصل خطأ. حاول تاني.':($lang==='ru'?'❌ Ошибка. Попробуйте ещё раз.':'❌ Error. Try again.')));
      echo json_encode(['ok'=>true]); exit;
    }

    support_ticket_add_msg($ticketId, 'user', $tg_id, 'text', $text);

    // Notify manager
    try {
      $reasonText = support_text('reason.' . $reason, $sl);
      $snip = mb_substr($text, 0, 220);
      aff_notify_manager_for_user($uid, 'support_ticket', ['id'=>(string)$ticketId, 'reason'=>$reasonText]);
      aff_notify_manager_for_user($uid, 'support_msg', ['id'=>(string)$ticketId, 'reason'=>$reasonText, 'text'=>$snip]);
    } catch (Throwable $e) { /* ignore */ }

    // Notify agent
    if ($agentTg > 0) {
      $reasonText = support_text('reason.' . $reason, $sl);
      $uName = (string)($from['username'] ?? '');
      $who = ($uName !== '') ? ('@'.$uName) : ('tg:' . (string)$tg_id);
      tg_api('sendMessage', [
        'chat_id' => $agentTg,
        'text' => support_text('agent_new_ticket', $sl, ['id'=>(string)$ticketId, 'reason'=>$reasonText]) . "
User: {$who}

" . $text,
        'reply_markup' => ['inline_keyboard' => [
          [[ 'text' => support_text('btn.reply', $sl), 'callback_data' => 'sup_reply:'.$ticketId ]],
          [[ 'text' => support_text('btn.close', $sl), 'callback_data' => 'sup_close:'.$ticketId ]],
        ]],
        'disable_web_page_preview' => true,
      ]);
    }

    // Move to open ticket state for further messages
    bs_set((string)$chat_id, (string)$tg_id, 'support_user_msg', ['ticket_id'=>$ticketId, 'lang'=>$sl]);

    send_text($chat_id, support_text('received', $sl, ['id'=>(string)$ticketId]), support_kb_after_ticket($sl, $agentUser, $ticketId));
    echo json_encode(['ok'=>true]); exit;
  }

  // Support: user message while ticket is open
  $stNow = bs_get((string)$chat_id);
  if ($stNow && ($stNow['state'] ?? '') === 'support_user_msg' && $text !== '') {
    $d = (array)($stNow['data'] ?? []);
    $ticketId = (int)($d['ticket_id'] ?? 0);
    $sl = (string)($d['lang'] ?? support_user_locale($tg_id, 'en'));
    $ticket = support_ticket_get($ticketId);
    if (!$ticket) {
      bs_clear((string)$chat_id);
      support_start_flow($chat_id, $tg_id, $from);
      echo json_encode(['ok'=>true]); exit;
    }

    // User requested close
    if (in_array(strtolower($text), ['close','/close','end','/end','اغلاق','إغلاق','قفل'], true)) {
      support_ticket_close($ticketId);
      bs_clear((string)$chat_id);
      send_text($chat_id, support_text('closed', $sl, ['id'=>(string)$ticketId]));
      echo json_encode(['ok'=>true]); exit;
    }

    support_ticket_add_msg($ticketId, 'user', $tg_id, 'text', $text);
    try {
      $uidLocal = (int)($ticket['user_id'] ?? 0);
      if ($uidLocal > 0) {
        $reasonText = support_text('reason.' . (string)($ticket['reason_code'] ?? 'other'), $sl);
        $snip = mb_substr($text, 0, 220);
        aff_notify_manager_for_user($uidLocal, 'support_msg', ['id'=>(string)$ticketId, 'reason'=>$reasonText, 'text'=>$snip]);
      }
    } catch (Throwable $e) { /* ignore */ }

    $agentTg = (int)($ticket['agent_tg_id'] ?? 0);
    if ($agentTg > 0) {
      $reasonText = support_text('reason.' . (string)($ticket['reason_code'] ?? 'other'), $sl);
      $uName = (string)($from['username'] ?? '');
      $who = ($uName !== '') ? ('@'.$uName) : ('tg:' . (string)$tg_id);
      tg_api('sendMessage', [
        'chat_id' => $agentTg,
        'text' => support_text('agent_new_ticket', $sl, ['id'=>(string)$ticketId, 'reason'=>$reasonText]) . "\nUser: {$who}\n\n" . $text,
        'reply_markup' => ['inline_keyboard' => [
          [[ 'text' => support_text('btn.reply', $sl), 'callback_data' => 'sup_reply:'.$ticketId ]],
          [[ 'text' => support_text('btn.close', $sl), 'callback_data' => 'sup_close:'.$ticketId ]],
        ]],
        'disable_web_page_preview' => true,
      ]);
    }
    send_text($chat_id, support_text('sent', $sl, ['id'=>(string)$ticketId]), [[['text'=>support_text('btn.close',$sl),'callback_data'=>'sup_user_close:'.$ticketId]]]);
    echo json_encode(['ok'=>true]); exit;
  }

  // /start
  if (strpos($text, '/start') === 0) {
    // Affiliate bind: /start aff_CODE (deep-link: ?start=aff_CODE)
    // Bind immediately so the manager sees the client as soon as the user presses Start.
    // First-touch rules are enforced in aff_bind_user_by_code().
    $payload = '';
    if (preg_match('/^\/start(?:@\w+)?(?:\s+(.+))?$/i', trim($text), $mm)) {
      $payload = trim((string)($mm[1] ?? ''));
    }

    // Support deep-link: /start support or /start support_ar
    if ($payload !== '' && preg_match('/^support(?:_([a-z]{2}))?$/i', $payload, $mmSup)) {
      $pl = strtolower((string)($mmSup[1] ?? ''));
      bs_clear((string)$chat_id);
      support_start_flow($chat_id, $tg_id, $from, $pl);
      echo json_encode(['ok'=>true]); exit;
    }

    if ($payload !== '' && str_starts_with($payload, 'aff_')) {
      $code = trim(substr($payload, 4));
      if ($code !== '') {
        try {
          $uidLocal = user_id_by_tg($tg_id);
          if ($uidLocal > 0) {
            $resBind = aff_bind_user_by_code($uidLocal, $code, 'start');
            // We bind immediately, so keep pending empty.
            try { db()->prepare('UPDATE users SET pending_aff_code=NULL, pending_aff_set_at=NULL WHERE id=?')->execute([$uidLocal]); } catch (Throwable $e2) {}
            error_log('[main_webhook][aff] tg_id='.(string)$tg_id.' uid='.(string)$uidLocal.' payload='.$payload.' res='.json_encode($resBind));

            // Notify manager instantly when a NEW client joins via referral link.
            try {
              if (is_array($resBind) && ($resBind['ok'] ?? false) && empty($resBind['already'])) {
                aff_notify_manager_for_user($uidLocal, 'client_joined', []);
              }
            } catch (Throwable $e3) {
              error_log('[main_webhook][aff] notify_error: '.$e3->getMessage());
            }
          } else {
            error_log('[main_webhook][aff] tg_id='.(string)$tg_id.' user_not_found payload='.$payload);
          }
        } catch (Throwable $e) {
          error_log('[main_webhook][aff] exception: '.$e->getMessage());
        }
      }
    } else {
      // Trace: if user already started the bot before, Telegram may send plain "/start" without payload.
      if ($payload === '') {
        error_log('[main_webhook][aff] start no_payload tg_id='.(string)$tg_id.' text='.$text);
      } else {
        error_log('[main_webhook][aff] start payload_no_aff payload='.$payload.' tg_id='.(string)$tg_id);
      }
    }

    $intent = intent_parse($text);
    if (!$intent) {
      send_text($chat_id, bt('bot.flow.choose_language', $lang, "Choose language / اختر اللغة / Выберите язык:"), kb_lang());
      echo json_encode(['ok'=>true]); exit;
    }

    $d = $intent['data'];
    $kind = strtolower((string)($d['kind'] ?? ''));
    $amount = (float)($d['amount'] ?? 0);
    $currency = strtoupper((string)($d['currency'] ?? 'USDT'));
    $user_id = (int)($d['user_id'] ?? 0);
    $ts = (int)($d['ts'] ?? 0);
    if ($ts>0 && abs(time()-$ts) > 3600) {
      send_text($chat_id, bt('bot.flow.intent_expired', $lang, $lang==='ar'?'انتهت صلاحية الطلب. جرّب تاني من داخل التطبيق.':($lang==='ru'?'Запрос истёк. Повторите из приложения.':'Expired request. Please try again from the app.')));
      echo json_encode(['ok'=>true]); exit;
    }
    if (!in_array($kind,['deposit','withdraw'], true) || !($amount>0) || $user_id<=0) {
      send_text($chat_id, bt('bot.flow.intent_invalid', $lang, $lang==='ar'?'طلب غير صالح.':($lang==='ru'?'Неверные данные запроса.':'Invalid request payload.')));
      echo json_encode(['ok'=>true]); exit;
    }

    $country = strtoupper((string)($d['country'] ?? ''));

    // If the mini app already provided the country, skip the country step and go straight to methods.
    if ($country !== '' && preg_match('/^[A-Z]{2}$/', $country)) {
      $methods = payment_methods_public($country, $lang);
      bs_set((string)$chat_id, (string)$tg_id, 'await_method', [
        'kind'=>$kind,
        'amount'=>$amount,
        'currency'=>$currency,
        'user_id'=>$user_id,
        'country'=>$country,
        'payload'=>$intent['payload'],
        'sig'=>$intent['sig'],
      ]);

      $kb = kb_methods($methods, $kind);
      $title = $kind==='deposit' ? ($lang==='ar'?'✅ طلب إيداع':($lang==='ru'?'✅ Заявка на депозит':'✅ Deposit request')) : ($lang==='ar'?'✅ طلب سحب':($lang==='ru'?'✅ Заявка на вывод':'✅ Withdraw request'));
      $hdrLabel = ($lang==='ar')?'المبلغ: ':(($lang==='ru')?'Сумма: ':'Amount: ');
      $hdr = $hdrLabel . rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . " {$currency}";
      $ccName = mex_country_label($country, $lang);
      $ccFlag = mex_flag_emoji($country);
      $ccLine = ($lang==='ar') ? ('الدولة: '.$ccFlag.' '.$ccName) : (($lang==='ru') ? ('Страна: '.$ccFlag.' '.$ccName) : ('Country: '.$ccFlag.' '.$ccName));
      $qLine = local_quote_line_local($country, $amount, $lang);
      $pick = ($lang==='ar'?'اختار وسيلة الدفع:':($lang==='ru'?'Выберите способ оплаты:':'Select a payment method:'));
      $msg = $title."\n".$hdr."\n".$ccLine.($qLine?"\n".$qLine:'')."\n\n".$pick;
      send_text($chat_id, $msg, $kb);
      echo json_encode(['ok'=>true]); exit;
    }

    // Otherwise: store state & ask country first (paginated list)
    bs_set((string)$chat_id, (string)$tg_id, 'await_country', [
      'kind'=>$kind,
      'amount'=>$amount,
      'currency'=>$currency,
      'user_id'=>$user_id,
      'payload'=>$intent['payload'],
      'sig'=>$intent['sig'],
      'page'=>0,
    ]);

    $title = $kind==='deposit' ? ($lang==='ar'?'✅ طلب إيداع':($lang==='ru'?'✅ Заявка на депозит':'✅ Deposit request')) : ($lang==='ar'?'✅ طلب سحب':($lang==='ru'?'✅ Заявка на вывод':'✅ Withdraw request'));
    $hdrLabel = ($lang==='ar')?'المبلغ: ':(($lang==='ru')?'Сумма: ':'Amount: ');
    $msg = $title."\n".$hdrLabel.rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.')." {$currency}\n\n".($lang==='ar'?'اختر دولتك:':($lang==='ru'?'Выберите страну:':'Choose your country:'));
    send_text($chat_id, $msg, mex_countries_keyboard($lang, 0, 40));
    echo json_encode(['ok'=>true]); exit;
  }

  // State-driven text steps (destination for withdraw)
  $st = bs_get((string)$chat_id);
  if ($st && ($st['state'] ?? '') === 'await_amount') {
    $data = (array)($st['data'] ?? []);
    $kind = strtolower((string)($data['kind'] ?? ''));
    $uid = (int)($data['user_id'] ?? 0);
    $amount = (float)$text;
    if (!($amount>0) || $uid<=0 || !in_array($kind,['deposit','withdraw'], true)) {
      send_text($chat_id, bt('bot.flow.invalid_amount', $lang, $lang==='ar'?'رقم غير صحيح. جرّب تاني (مثال: 50).':($lang==='ru'?'Неверная сумма. Попробуйте снова (пример: 50).':'Invalid amount. Try again (example: 50).')));
      echo json_encode(['ok'=>true]); exit;
    }
    $data['amount'] = $amount;
    // Ask country first unless already set
    $country = strtoupper((string)($data['country'] ?? ''));
    if ($country !== '' && preg_match('/^[A-Z]{2}$/', $country)) {
      $methods = payment_methods_public($country, $lang);
      bs_set((string)$chat_id, (string)$tg_id, 'await_method', $data);
      $kb = kb_methods($methods, $kind);
      send_text($chat_id, bt('bot.flow.choose_method', $lang, $lang==='ar'?'اختار وسيلة الدفع:':($lang==='ru'?'Выберите способ оплаты:':'Select a payment method:')), $kb);
    } else {
      $data['page'] = 0;
      bs_set((string)$chat_id, (string)$tg_id, 'await_country', $data);
      send_text($chat_id, bt('bot.flow.choose_country', $lang, $lang==='ar'?'اختر دولتك:':($lang==='ru'?'Выберите страну:':'Choose your country:')), mex_countries_keyboard($lang, 0, 40));
    }
    echo json_encode(['ok'=>true]); exit;
  }

  if ($st && ($st['state'] ?? '') === 'await_destination') {
    // Withdrawal flow: destination is the final required input. No proof photo required.
    $data = (array)($st['data'] ?? []);
    $kind = strtolower((string)($data['kind'] ?? ''));
    $user_id = (int)($data['user_id'] ?? 0);
    $amount = (float)($data['amount'] ?? 0);
    $currency = strtoupper((string)($data['currency'] ?? 'USDT'));
    $method = strtolower((string)($data['method_code'] ?? ''));
    $destination = trim($text);

    if ($kind !== 'withdraw' || $user_id<=0 || !($amount>0) || $method==='' || $destination==='') {
      bs_clear((string)$chat_id);
      send_text($chat_id, bt('bot.flow.session_invalid', $lang, $lang==='ar'?'الجلسة غير صالحة. ابدأ من جديد /start.':($lang==='ru'?'Сессия недействительна. Начните заново: /start.':'Session invalid. Please /start again.')));
      echo json_encode(['ok'=>true]); exit;
    }

    $pdo = db();
    $now = time();
    $holdId = 0;
    try {
      $pdo->beginTransaction();
      $holdId = hold_create($user_id, $currency, $amount, 'withdraw_request', time()+3600);
      $encDest = crypto_encrypt($destination);
      $pdo->prepare("INSERT INTO withdrawals (user_id,method,currency,amount,status,destination_enc,hold_id,risk_score,created_at,updated_at) VALUES (?,?,?,?, 'requested', ?, ?, 0, ?, ?)")
        ->execute([$user_id, $method, $currency, $amount, $encDest, $holdId, $now, $now]);
      $id = (int)$pdo->lastInsertId();
      $pdo->commit();

      // Notify manager (best effort)
      try {
        aff_notify_manager_for_user($user_id, 'wdr_created', [
          'id' => $id,
          'amount' => number_format($amount, 2, '.', ''),
          'cur' => $currency,
        ]);
      } catch (Throwable $e2) {}

      bs_clear((string)$chat_id);
      send_text($chat_id, tpl(bt('bot.flow.withdraw_submitted', $lang, $lang==='ar' ? "✅ تم إرسال طلب السحب. رقم الطلب: #{id}
الأدمن هيراجعه ويوافق." : ($lang==='ru'?"✅ Заявка на вывод отправлена. №: #{id}
Админ проверит и подтвердит.":"✅ Withdrawal requested. Ref: #{id}
Admin will review and approve.")), ['id'=>$id]));
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      try { if ($holdId>0) hold_release((int)$holdId, 'released'); } catch(Throwable $ignored) {}
      bs_clear((string)$chat_id);
      send_text($chat_id, bt('bot.flow.internal_error', $lang, $lang==='ar'?'❌ حصل خطأ داخلي. حاول تاني.':($lang==='ru'?'❌ Внутренняя ошибка. Попробуйте ещё раз.':'❌ Internal error. Please try again.')));
    }
    echo json_encode(['ok'=>true]); exit;
  }

  // Default
  send_text($chat_id, bt('bot.flow.default_start', $lang, $lang==='ar'?'اكتب /start عشان تظهر لك القائمة.':($lang==='ru'?'Напишите /start чтобы открыть меню.':'Type /start to show the menu.')));
  echo json_encode(['ok'=>true]); exit;
}

// ---- Callback handler ----
if (isset($update['callback_query'])) {
  $cq = $update['callback_query'];
  $data = (string)($cq['data'] ?? '');
  $from = $cq['from'] ?? [];
  $tg_id = (int)($from['id'] ?? 0);
  $chat_id = (int)($cq['message']['chat']['id'] ?? 0);
  $msg_id = (int)($cq['message']['message_id'] ?? 0);
  if ($chat_id && $tg_id) upsert_user($tg_id, $chat_id, $from);
  $lang = $tg_id ? user_locale($tg_id) : 'en';

  // NOTE: web_app_data exists only on message updates (handled above).
  // In callback_query context, referencing "$m" can emit warnings on some hosts.

  // ---- Support flow (inside main bot) ----
  if ($data === 'sup:start') {
    answer_cb((string)($cq['id'] ?? ''));
    bs_clear((string)$chat_id);
    support_start_flow($chat_id, $tg_id, $from);
    echo json_encode(['ok'=>true]); exit;
  }

  if ($data === 'support_show_lang') {
    answer_cb((string)($cq['id'] ?? ''));
    bs_clear((string)$chat_id);
    $sl = support_user_locale($tg_id, 'en');
    $nm = (string)($from['first_name'] ?? '');
    edit_or_send($chat_id, $msg_id, support_text('start', $sl, ['name'=>$nm]), support_kb_langs());
    echo json_encode(['ok'=>true]); exit;
  }


  if (str_starts_with($data, 'support_lang:')) {
    $sl = strtolower(substr($data, 13));
    if (!in_array($sl, support_allowed_langs(), true)) $sl = 'en';
    support_set_locale($tg_id, $sl);
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    edit_or_send($chat_id, $msg_id, support_text('choose_reason', $sl), support_kb_reasons($sl));
    echo json_encode(['ok'=>true]); exit;
  }

  if (str_starts_with($data, 'support_reason:')) {
    $reason = strtolower(substr($data, 15));
    if (!in_array($reason, ['pay','wd','trade','account','other'], true)) $reason = 'other';
    $sl = support_user_locale($tg_id, 'en');
    answer_cb((string)($cq['id'] ?? ''), 'OK');

    $agentUser = support_agent_username($sl);
    if ($agentUser === '') {
      edit_or_send($chat_id, $msg_id, support_text('agent_missing', $sl), support_kb_langs());
      echo json_encode(['ok'=>true]); exit;
    }
    $agentTg = support_agent_tg_id_by_username($agentUser);

    $uid = user_id_by_tg($tg_id);
    if ($uid <= 0) {
      send_text($chat_id, ($lang==='ar'?'افتح التطبيق مرة وبعدين جرّب تاني.':($lang==='ru'?'Откройте приложение один раз и попробуйте снова.':'Open the app once, then try again.')));
      echo json_encode(['ok'=>true]); exit;
    }

    // Stage: ask for details first (do NOT create ticket yet)
    bs_set((string)$chat_id, (string)$tg_id, 'support_user_details', [
      'lang' => $sl,
      'reason' => $reason,
      'agent_username' => $agentUser,
      'agent_tg_id' => $agentTg,
    ]);

    $msg = support_text('ask_msg', $sl);
    if ($agentTg <= 0) $msg .= "

" . support_text('agent_need_start', $sl);
    edit_or_send($chat_id, $msg_id, $msg, support_kb_details($sl));
    echo json_encode(['ok'=>true]); exit;
  }

  if ($data === 'support_back_reasons') {
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    $sl = support_user_locale($tg_id, 'en');
    edit_or_send($chat_id, $msg_id, support_text('choose_reason', $sl), support_kb_reasons($sl));
    echo json_encode(['ok'=>true]); exit;
  }

  if ($data === 'support_cancel') {
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    bs_clear((string)$chat_id);
    $ml = $tg_id ? user_locale($tg_id) : 'en';
    $title = ($ml==='ar') ? 'القائمة:' : (($ml==='ru') ? 'Меню:' : 'Menu:');
    edit_or_send($chat_id, $msg_id, support_text('cancelled', support_user_locale($tg_id, 'en')) . "\n\n" . $title, kb_menu($ml));
    echo json_encode(['ok'=>true]); exit;
  }

  if ($data === 'main:menu') {
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    $ml = $tg_id ? user_locale($tg_id) : 'en';
    $title = ($ml==='ar') ? 'القائمة:' : (($ml==='ru') ? 'Меню:' : 'Menu:');
    edit_or_send($chat_id, $msg_id, $title, kb_menu($ml));
    echo json_encode(['ok'=>true]); exit;
  }

  if (str_starts_with($data, 'sup_user_close:')) {
    $ticketId = (int)substr($data, 15);
    $tkt = support_ticket_get($ticketId);
    $sl = $tkt ? (string)($tkt['lang'] ?? 'en') : 'en';
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    support_ticket_close($ticketId);
    bs_clear((string)$chat_id);
    // User requested "Cancel request" should close the ticket and return to main menu.
    $ml = $tg_id ? user_locale($tg_id) : 'en';
    $title = ($ml==='ar') ? 'القائمة:' : (($ml==='ru') ? 'Меню:' : 'Menu:');
    edit_or_send($chat_id, $msg_id, support_text('closed', $sl, ['id'=>(string)$ticketId]) . "\n\n" . $title, kb_menu($ml));
    echo json_encode(['ok'=>true]); exit;
  }

  if (str_starts_with($data, 'sup_reply:')) {
    $ticketId = (int)substr($data, 10);
    $tkt = support_ticket_get($ticketId);
    if (!$tkt) { answer_cb((string)($cq['id'] ?? ''), ''); echo json_encode(['ok'=>true]); exit; }
    $sl = (string)($tkt['lang'] ?? 'en');
    $agentTg = (int)($tkt['agent_tg_id'] ?? 0);
    if ($agentTg > 0 && $agentTg !== $tg_id) {
      answer_cb((string)($cq['id'] ?? ''), '');
      echo json_encode(['ok'=>true]); exit;
    }
    // If agent_tg_id is missing, allow any account matching configured username (after it starts bot)
    if ($agentTg <= 0) {
      $cfgUser = (string)($tkt['agent_username'] ?? '');
      $cfgId = $cfgUser ? support_agent_tg_id_by_username($cfgUser) : 0;
      if ($cfgId > 0 && $cfgId !== $tg_id) {
        answer_cb((string)($cq['id'] ?? ''), '');
        echo json_encode(['ok'=>true]); exit;
      }
      // attach now
      if ($cfgId === $tg_id) {
        try { db()->prepare('UPDATE support_tickets SET agent_tg_id=?, updated_at=? WHERE id=?')->execute([(string)$tg_id, time(), $ticketId]); } catch(Throwable $e) {}
      }
    }

    answer_cb((string)($cq['id'] ?? ''), 'OK');
    bs_set((string)$chat_id, (string)$tg_id, 'support_agent_reply', ['ticket_id'=>$ticketId]);
    send_text($chat_id, support_text('btn.reply', $sl) . '…');
    echo json_encode(['ok'=>true]); exit;
  }

  if (str_starts_with($data, 'sup_close:')) {
    $ticketId = (int)substr($data, 10);
    $tkt = support_ticket_get($ticketId);
    if (!$tkt) { answer_cb((string)($cq['id'] ?? ''), ''); echo json_encode(['ok'=>true]); exit; }
    $sl = (string)($tkt['lang'] ?? 'en');
    $agentTg = (int)($tkt['agent_tg_id'] ?? 0);
    if ($agentTg > 0 && $agentTg !== $tg_id) {
      answer_cb((string)($cq['id'] ?? ''), '');
      echo json_encode(['ok'=>true]); exit;
    }
    answer_cb((string)($cq['id'] ?? ''), 'OK');
    support_ticket_close($ticketId);
    $userChat = (int)($tkt['chat_id'] ?? 0);
    if ($userChat > 0) {
      send_text($userChat, support_text('closed', $sl, ['id'=>(string)$ticketId]));
    }
    send_text($chat_id, support_text('closed', $sl, ['id'=>(string)$ticketId]));
    echo json_encode(['ok'=>true]); exit;
  }

  if (strpos($data,'lang:')===0) {
    $lng = substr($data,5);
    set_locale($tg_id, $lng);
    $lang = user_locale($tg_id);
    $ack = ($lang==='ar') ? 'تم ✅' : (($lang==='ru') ? 'Сохранено ✅' : 'Saved ✅');
    $title = ($lang==='ar') ? 'القائمة:' : (($lang==='ru') ? 'Меню:' : 'Menu:');
    answer_cb((string)($cq['id'] ?? ''), $ack);
    send_text($chat_id, $title, kb_menu($lang));
    echo json_encode(['ok'=>true]); exit;
  }

  // Menu actions
  if ($data === 'q:bal' || $data === 'q:pos' || $data === 'q:inv') {
    answer_cb((string)($cq['id'] ?? ''));
    $uid = $tg_id ? user_id_by_tg($tg_id) : 0;
    if ($uid<=0) { send_text($chat_id, bt('bot.flow.user_not_found', $lang, $lang==='ar'?'المستخدم غير موجود. افتح التطبيق مرة وبعدين جرّب تاني.':($lang==='ru'?'Пользователь не найден. Откройте приложение один раз и попробуйте снова.':'User not found. Open the app once, then try again.'))); echo json_encode(['ok'=>true]); exit; }

    if ($data === 'q:bal') {
      $b = bot_balances($uid);
      $real = (float)($b['real_balance'] ?? 0);
      $demo = (float)($b['demo_balance'] ?? 0);
      $rc = (string)($b['real_currency'] ?? 'USDT');
      $dc = (string)($b['demo_currency'] ?? 'USDT_DEMO');
      send_text($chat_id, "Balances\n\nPrimary ({$rc}): $".number_format($real,2,'.','')."\nDemo ({$dc}): $".number_format($demo,2,'.',''));
      echo json_encode(['ok'=>true]); exit;
    }

    if ($data === 'q:pos') {
      $pos = bot_open_positions($uid);
      if (!$pos) { send_text($chat_id, ($lang==='ar'?'مفيش صفقات مفتوحة.':($lang==='ru'?'Нет открытых позиций.':'No open positions.'))); echo json_encode(['ok'=>true]); exit; }
      $lines = [];
      foreach ($pos as $p) {
        $lines[] = "#{$p['id']} {$p['symbol']} ".strtoupper((string)$p['market_type'])."/REAL ".strtoupper((string)$p['side'])." x".(int)$p['leverage']." | qty ".$p['qty'];
      }
      send_text($chat_id, "Open positions\n\n".implode("\n", $lines));
      echo json_encode(['ok'=>true]); exit;
    }

    if ($data === 'q:inv') {
      $r = bot_investments($uid);
      $lines = ["Active Plans:"]; 
      foreach (($r['plans'] ?? []) as $p) {
        $lines[] = "#{$p['id']} {$p['name']} | {$p['term_days']}d | ROI {$p['roi_percent']}% | min $".$p['min_amount'];
      }
      $lines[] = "\nYour Investments:";
      foreach (($r['mine'] ?? []) as $i) {
        $lines[] = "#{$i['id']} ".($i['plan_name'] ?? '')." | $".$i['amount']." | {$i['status']}";
      }
      send_text($chat_id, implode("\n", $lines));
      echo json_encode(['ok'=>true]); exit;
    }
  }

  // Deposit/withdraw are MiniApp-only (compat for old buttons)
  if ($data === 'q:dep' || $data === 'q:wdr') {
    answer_cb((string)($cq['id'] ?? ''));
    bs_clear((string)$chat_id);
    $url = app_url();
    $kb = [[[ 'text' => ($lang==='ar'?'فتح التطبيق':($lang==='ru'?'Открыть приложение':'Open App')), 'web_app' => ['url'=>$url.'?lang='.$lang] ]]];
    $txt = ($lang==='ar')
      ? "الإيداع والسحب من داخل التطبيق فقط.\nاضغط فتح التطبيق."
      : "Deposit & withdrawal are available only inside the app.\nTap Open App.";
    send_text($chat_id, $txt, $kb);
    echo json_encode(['ok'=>true]); exit;
  }

  // Countries pagination
  if (strpos($data, 'countries:') === 0) {
    answer_cb((string)($cq['id'] ?? ''));
    $page = (int)substr($data, 10);
    $st = bs_get((string)$chat_id);
    if ($st && ($st['state'] ?? '') === 'await_country') {
      $d = (array)($st['data'] ?? []);
      $d['page'] = $page;
      bs_set((string)$chat_id, (string)$tg_id, 'await_country', $d);
      // Update keyboard in-place
      $msgId = (int)($cq['message']['message_id'] ?? 0);
      if ($msgId>0) {
        tg_api('editMessageReplyMarkup', [
          'chat_id'=>$chat_id,
          'message_id'=>$msgId,
          'reply_markup'=> mex_countries_keyboard($lang, $page, 40)
        ]);
      }
    }
    echo json_encode(['ok'=>true]); exit;
  }

  // Country chosen
  if (strpos($data, 'country:') === 0) {
    answer_cb((string)($cq['id'] ?? ''));
    $cc = strtoupper(substr($data, 8));
    if (!preg_match('/^[A-Z]{2}$/', $cc)) { echo json_encode(['ok'=>true]); exit; }
    $st = bs_get((string)$chat_id);
    if (!$st || ($st['state'] ?? '') !== 'await_country') {
      // Ignore stale buttons
      send_text($chat_id, bt('bot.flow.session_expired', $lang, $lang==='ar'?'الجلسة انتهت. ابدأ من جديد.':($lang==='ru'?'Сессия истекла. Начните заново.':'Session expired. Start again.')));
      echo json_encode(['ok'=>true]); exit;
    }
    $d = (array)($st['data'] ?? []);
    $d['country'] = $cc;
    $kind = strtolower((string)($d['kind'] ?? 'deposit'));
    $methods = payment_methods_public($cc, $lang);
    if (!$methods) {
      send_text($chat_id, bt('bot.flow.no_methods', $lang, $lang==='ar'?'لا توجد وسائل دفع متاحة لهذه الدولة حالياً. اختر دولة أخرى.':($lang==='ru'?'Для этой страны пока нет доступных способов оплаты. Выберите другую страну.':'No payment methods available for this country yet. Choose another country.')), mex_countries_keyboard($lang, (int)($d['page'] ?? 0), 40));
      echo json_encode(['ok'=>true]); exit;
    }
    bs_set((string)$chat_id, (string)$tg_id, 'await_method', $d);
    $amount = (float)($d['amount'] ?? 0);
    $currency = strtoupper((string)($d['currency'] ?? 'USDT'));
    $title = $kind==='deposit' ? ($lang==='ar'?'✅ طلب إيداع':($lang==='ru'?'✅ Заявка на депозит':'✅ Deposit request')) : ($lang==='ar'?'✅ طلب سحب':($lang==='ru'?'✅ Заявка на вывод':'✅ Withdraw request'));
    $hdrLabel = ($lang==='ar')?'المبلغ: ':(($lang==='ru')?'Сумма: ':'Amount: ');
    $hdr = $hdrLabel . rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . " {$currency}";
    $ccName = mex_country_label($cc, $lang);
    $ccFlag = mex_flag_emoji($cc);
    $ccLine = ($lang==='ar') ? ('الدولة: '.$ccFlag.' '.$ccName) : (($lang==='ru') ? ('Страна: '.$ccFlag.' '.$ccName) : ('Country: '.$ccFlag.' '.$ccName));
    $qLine = local_quote_line_local($cc, $amount, $lang);
    $pick = bt('bot.flow.choose_method', $lang, $lang==='ar'?'اختار وسيلة الدفع:':($lang==='ru'?'Выберите способ оплаты:':'Choose payment method:'));
    $msg = $title."\n".$hdr."\n".$ccLine.($qLine?"\n".$qLine:'')."\n\n".$pick;
    send_text($chat_id, $msg, kb_methods($methods, $kind));
    echo json_encode(['ok'=>true]); exit;
  }

  // Payment method selection for intent flow
  if (strpos($data, 'm:') === 0) {
    answer_cb((string)($cq['id'] ?? ''));
    $code = strtolower(substr($data, 2));
    $st = bs_get((string)$chat_id);
    if (!$st || ($st['state'] ?? '') !== 'await_method') {
      send_text($chat_id, bt('bot.flow.session_expired_app', $lang, $lang==='ar'?'الجلسة انتهت. افتح الطلب من التطبيق تاني.':($lang==='ru'?'Сессия истекла. Начните снова из приложения.':'Session expired. Start again from the app.')));
      echo json_encode(['ok'=>true]); exit;
    }
    $d = (array)($st['data'] ?? []);
    $d['method_code'] = $code;
    $kind = strtolower((string)($d['kind'] ?? ''));
    $user_id = (int)($d['user_id'] ?? 0);
    $amount = (float)($d['amount'] ?? 0);
    $currency = strtoupper((string)($d['currency'] ?? 'USDT'));

    // Show instructions (if any) — use country-filtered methods when available
    $methods = payment_methods_public(isset($d['country']) ? (string)$d['country'] : null, $lang);
    $method = null;
    foreach ($methods as $m) {
      $mc = strtolower((string)($m['code'] ?? ''));
      $mk = strtolower((string)($m['kind'] ?? ''));
      if ($mc === $code && ($mk === $kind || $mk === 'both' || $mk === '')) { $method = $m; break; }
    }
    $instr = trim((string)($method['instructions'] ?? ''));

    if ($kind === 'withdraw') {
      bs_set((string)$chat_id, (string)$tg_id, 'await_destination', $d);
      $instrBlock = ($instr !== '') ? ("\n\n".($lang==='ar'?'تعليمات:':($lang==='ru'?'Инструкции:':'Instructions:'))."\n".$instr) : '';
      $msgTpl = bt('bot.flow.withdraw_method_selected', $lang,
        $lang==='ar'
          ? "✅ تم اختيار الوسيلة.\n\nابعت عنوان الاستلام (مثال: TRC20:... أو العنوان فقط).{instructions}"
          : ($lang==='ru'
            ? "✅ Способ выбран.\n\nОтправьте адрес получения (СЕТЬ:АДРЕС или только адрес).{instructions}"
            : "✅ Method selected.\n\nSend destination address (NETWORK:ADDRESS or just address).{instructions}"
          )
      );
      $msg = tpl($msgTpl, ['instructions'=>$instrBlock]);
      if (!empty($method['image_url'])) {
        send_photo($chat_id, (string)$method['image_url'], $msg);
      } else {
        send_text($chat_id, $msg);
      }
      echo json_encode(['ok'=>true]); exit;
    }

    // Deposit: Crypto Pay (instant) vs manual proof.
    // If method is Crypto Pay, create invoice and send payment link instead of asking for screenshot.
    $provider = strtolower(trim((string)($method['provider'] ?? '')));
    $codeLc   = strtolower(trim((string)$code));
    $instLc   = strtolower($instr);
    $isCryptoPay = (
      $provider === 'cryptopay'
      || in_array($codeLc, ['cryptopay','crypto_pay','crypto-pay','cryptobot','cryptobotpay','crypto'], true)
      || (is_string($instLc) && (str_contains($instLc, 'pay.crypt.bot') || str_contains($instLc, 'cryptopay') || str_contains($instLc, 'crypto pay')))
    );

    if ($isCryptoPay) {
      $pdo = db();
      $now = time();
      $depId = 0;
      try {
        // 1) Create DB record (pending)
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO deposits (user_id,provider,method_code,currency,amount,status,external_ref,created_at,updated_at) VALUES (?,?,?,?,?,'pending','',?,?)")
            ->execute([$user_id, 'cryptopay', $codeLc, $currency, $amount, $now, $now]);
        $depId = (int)$pdo->lastInsertId();
        $pdo->commit();

	      // 2) Create invoice on Crypto Pay
	      $expires = (int)env('CRYPTO_PAY_EXPIRES_IN', 1800);
	      $resp = cryptopay_create_invoice($amount, $currency, 'dep:'.$depId, 'Deposit #'.$depId, $expires);
	      if (!is_array($resp) || !($resp['ok'] ?? false)) {
	        $err = (string)($resp['error'] ?? 'Crypto Pay error');
          try { $pdo->prepare("UPDATE deposits SET status='failed', updated_at=? WHERE id=?")->execute([$now, $depId]); } catch (Throwable $e2) {}
          bs_clear((string)$chat_id);
          send_text($chat_id, ($lang==='ar') ? ('❌ تعذر إنشاء فاتورة Crypto Pay. جرّب تاني أو اختار وسيلة تانية.\n\n'.$err) : (($lang==='ru') ? ('❌ Не удалось создать счёт Crypto Pay. Попробуйте снова или выберите другой способ.\n\n'.$err) : ('❌ Failed to create Crypto Pay invoice. Please try again or choose another method.\n\n'.$err)));
          echo json_encode(['ok'=>true]); exit;
        }

	      $invoice = (array)($resp['result'] ?? []);
	      $invoiceId = (int)($invoice['invoice_id'] ?? 0);
	      $payUrl = cryptopay_pick_invoice_url($invoice);
	      if ($payUrl === '') $payUrl = (string)($invoice['pay_url'] ?? '');

	      // Store invoice info for webhook fallback search + user notification
	      try {
	        $meta = [
	          'invoice_id' => $invoiceId,
	          'invoice_url' => $payUrl,
	          'chat_id' => $chat_id,
	          'tg_id' => $tg_id,
	          'lang' => $lang,
	        ];
          $pdo->prepare('UPDATE deposits SET external_ref=?, updated_at=? WHERE id=?')
              ->execute([json_encode($meta, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), $now, $depId]);
        } catch (Throwable $e3) {}

        // Notify manager (best effort)
        try {
          aff_notify_manager_for_user($user_id, 'dep_created', [
            'id' => $depId,
            'amount' => number_format($amount, 2, '.', ''),
            'cur' => $currency,
          ]);
        } catch (Throwable $e4) {}

        // Send payment link
        $btnText = ($lang==='ar') ? 'ادفع عبر Crypto Pay' : (($lang==='ru') ? 'Оплатить через Crypto Pay' : 'Pay via Crypto Pay');
        $txt = ($lang==='ar')
          ? "💳 الدفع عبر Crypto Pay\n\nاضغط الزر للدفع. بعد الدفع الرصيد هيتضاف تلقائيًا.\nرقم الطلب: #{$depId}"
          : (($lang==='ru')
            ? "💳 Оплата через Crypto Pay\n\nНажмите кнопку для оплаты. После оплаты баланс обновится автоматически.\nЗаявка: #{$depId}"
            : "💳 Pay with Crypto Pay\n\nTap the button to pay. After payment your balance will update automatically.\nRequest: #{$depId}"
          );
	      $kb = ($payUrl !== '') ? [[['text'=>$btnText, 'url'=>$payUrl]]] : null;
	      if ($payUrl === '') {
	        $txt .= ($lang==='ar')
	          ? "\n\n⚠️ رابط الدفع غير متاح حاليًا. تواصل مع الدعم واذكر رقم الفاتورة: {$invoiceId}"
	          : (($lang==='ru')
	            ? "\n\n⚠️ Ссылка на оплату недоступна. Свяжитесь с поддержкой и укажите Invoice: {$invoiceId}"
	            : "\n\n⚠️ Payment link unavailable. Please contact support and mention Invoice: {$invoiceId}"
	          );
	      }
        bs_clear((string)$chat_id);
        if (!empty($method['image_url'])) {
          send_photo($chat_id, (string)$method['image_url'], $txt, $kb);
        } else {
          send_text($chat_id, $txt, $kb);
        }
        echo json_encode(['ok'=>true]); exit;
      } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        bs_clear((string)$chat_id);
        send_text($chat_id, ($lang==='ar') ? ('❌ حصل خطأ أثناء تجهيز الدفع. جرّب تاني.') : (($lang==='ru') ? ('❌ Ошибка при подготовке оплаты. Попробуйте снова.') : ('❌ Payment setup failed. Please try again.')));
        echo json_encode(['ok'=>true]); exit;
      }
    }

    bs_set((string)$chat_id, (string)$tg_id, 'await_proof', $d);
    $instrBlock = ($instr !== '') ? ("\n\n".($lang==='ar'?'تعليمات:':($lang==='ru'?'Инструкции:':'Instructions:'))."\n".$instr) : '';
    $msgTpl = bt('bot.flow.deposit_method_selected', $lang,
      $lang==='ar'
        ? "✅ تم اختيار الوسيلة.\n\nدلوقتي ابعت صورة إثبات التحويل (Screenshot).{instructions}"
        : ($lang==='ru'
          ? "✅ Способ выбран.\n\nТеперь отправьте скриншот/фото подтверждения.{instructions}"
          : "✅ Method selected.\n\nNow send the transfer proof screenshot/photo.{instructions}"
        )
    );
    $msg = tpl($msgTpl, ['instructions'=>$instrBlock]);
    if (!empty($method['image_url'])) {
      send_photo($chat_id, (string)$method['image_url'], $msg);
    } else {
      send_text($chat_id, $msg);
    }
    echo json_encode(['ok'=>true]); exit;
  }

  answer_cb((string)($cq['id'] ?? ''));
  echo json_encode(['ok'=>true]); exit;
}

echo json_encode(['ok'=>true]);
