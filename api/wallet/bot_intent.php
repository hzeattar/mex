<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/schema.php';
require_once __DIR__ . '/../lib/fx.php';
require_once __DIR__ . '/../lib/country_currency.php';
require_once __DIR__ . '/../../bot/countries.php';

require_method('POST');

$pdo = db();
$body = json_body();

$kind = strtolower(trim((string)($body['kind'] ?? 'deposit')));
$amount = (float)($body['amount'] ?? 0);
$currency = strtoupper(trim((string)($body['currency'] ?? 'USDT')));
$method = trim((string)($body['method_code'] ?? ''));
$country = strtoupper(trim((string)($body['country'] ?? '')));
if ($country !== '' && !preg_match('/^[A-Z]{2}$/', $country)) $country = '';


if (!in_array($kind, ['deposit','withdraw'], true)) json_response(['ok'=>false,'error'=>'Invalid kind'], 400);
if (!($amount > 0)) json_response(['ok'=>false,'error'=>'Invalid amount'], 422);
if ($currency === '') $currency = 'USDT';
if ($country === '') json_response(['ok'=>false,'error'=>'Country required'], 422);


// Auth (same JWT flow as the rest of the API)
$userId = (int)require_auth();

// Early guard for deposits (block BEFORE opening bot flow)
if ($kind === 'deposit') {
  require_deposit_allowed($userId);
}

// Early guard for withdrawals
if ($kind === 'withdraw') {
  require_withdraw_allowed($userId);
  $av = wallet_available($userId, $currency);
  $available = (float)($av['available'] ?? 0);
  if ($available + 1e-9 < $amount) {
    json_response(['ok'=>false,'error'=>'insufficient_funds','code'=>'INSUFFICIENT_BALANCE','available'=>$available,'currency'=>$currency], 400);
  }
}

$st = $pdo->prepare('SELECT id,tg_id,telegram_chat_id,locale FROM users WHERE id=? LIMIT 1');
$st->execute([$userId]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);

$lang = strtolower((string)($user['locale'] ?? 'en'));
if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

$secret = (string)env('BOT_INTENT_SECRET','');
if ($secret === '') $secret = 'change_me';

// Build intent payload (base64url WITHOUT padding)
$data = [
  'v' => 1,
  'kind' => $kind,
  'amount' => (float)$amount,
  'currency' => $currency,
  'lang' => $lang,
  'uid' => (int)$user['id'],
  'method_code' => ($method !== '') ? $method : null,
  'country' => $country,

  'ts' => time(),
];

$json = json_encode($data, JSON_UNESCAPED_SLASHES);
$b64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
$sig = hash_hmac('sha256', $b64, $secret);
$token = 'tp_' . $b64 . '.' . $sig;

$botUser = trim((string)env('MINIAPP_BOT_USERNAME',''));
if ($botUser === '') $botUser = trim((string)env('TELEGRAM_BOT_USERNAME',''));
if ($botUser === '') $botUser = 'Tradeoxplus_bot';
$botUser = ltrim($botUser, '@');
$deepLink = 'https://t.me/' . $botUser;

// Main bot token (used to push the flow to the user even if they already started the bot before)
$mainToken = (string)setting_get('bot.token','');
if ($mainToken === '') $mainToken = (string)env('TELEGRAM_BOT_TOKEN','');

// If we already know the user's chat_id (they started the main bot before),
// we can push the methods immediately so they don't depend on Telegram deep-link payload behavior.
$chatId = (string)($user['telegram_chat_id'] ?? '');
if ($chatId === '' || $chatId === '0') $chatId = (string)($user['tg_id'] ?? '');

// Whether we successfully pushed the next-step message to the user in the MAIN bot chat.
$pushed = false;

function tg_api_main_local(string $method, array $payload): array {
  $token = (string)setting_get('bot.token','');
  if ($token === '') $token = (string)env('TELEGRAM_BOT_TOKEN','');
  if ($token === '') return ['ok'=>false,'error'=>'TELEGRAM_BOT_TOKEN missing'];
  $url = 'https://api.telegram.org/bot'.$token.'/'.$method;
  $ch = curl_init($url);
  curl_setopt_array($ch,[
    CURLOPT_RETURNTRANSFER=>true,
    CURLOPT_POST=>true,
    CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER=>['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT=>8,
    CURLOPT_TIMEOUT=>14,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode($res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'Bad JSON'];
}

function kb_methods_main_local(array $methods, string $kind): array {
  $rows = [];
  foreach ($methods as $m) {
    $mk = strtolower((string)($m['kind'] ?? ''));
    if ($mk !== $kind && $mk !== 'both') continue;
    $code = (string)($m['code'] ?? '');
    if ($code === '') continue;
    $label = (string)($m['label'] ?? $code);
    $cur = (string)($m['currency'] ?? '');
    $rows[] = [[
      'text' => trim($label . ' ' . ($cur !== '' ? "({$cur})" : '')),
      'callback_data' => 'm:' . strtolower($code),
    ]];
    if (count($rows) >= 20) break;
  }
  return $rows ?: [[['text'=>'No methods','callback_data'=>'noop']]];
}

// Methods list (country-scoped). If a method has NO rows in payment_method_countries, it is treated as GLOBAL.
function pm_list_main_local(?string $countryCode, string $lang): array {
  $pdo = db();
  $countryCode = $countryCode ? strtoupper(trim($countryCode)) : null;
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';

  $hasMap = false;
  try {
    $cnt = (int)($pdo->query("SELECT COUNT(1) FROM payment_method_countries")->fetchColumn() ?: 0);
    $hasMap = $cnt > 0;
  } catch (Throwable $e) { $hasMap = false; }

  if ($countryCode && $hasMap) {
    $sql = "
      SELECT pm.id, pm.code, pm.kind, pm.currency,
             pm.title_en, pm.title_ar, pm.title_ru,
             pm.instructions_en, pm.instructions_ar, pm.instructions_ru,
             pm.image_url
      FROM payment_methods pm
      LEFT JOIN payment_method_countries pmc
        ON pmc.method_id = pm.id AND pmc.country_code = ?
      WHERE pm.status='active'
        AND (
          pmc.method_id IS NOT NULL
          OR NOT EXISTS (SELECT 1 FROM payment_method_countries x WHERE x.method_id = pm.id)
        )
      ORDER BY pm.sort_order ASC, pm.id ASC
      LIMIT 200
    ";
    $st = $pdo->prepare($sql);
    $st->execute([$countryCode]);
  } else {
    $st = $pdo->prepare("SELECT id,code,kind,currency,title_en,title_ar,title_ru,instructions_en,instructions_ar,instructions_ru,image_url FROM payment_methods WHERE status='active' ORDER BY sort_order ASC, id ASC LIMIT 200");
    $st->execute();
  }

  $out = [];
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $r) {
    $label = (string)($r['title_en'] ?? '');
    $inst  = (string)($r['instructions_en'] ?? '');
    if ($lang === 'ar') { $label = (string)($r['title_ar'] ?? $label); $inst = (string)($r['instructions_ar'] ?? $inst); }
    if ($lang === 'ru') { $label = (string)($r['title_ru'] ?? $label); $inst = (string)($r['instructions_ru'] ?? $inst); }
    if ($label === '') $label = (string)($r['code'] ?? '');
    $out[] = [
      'id'=>(int)($r['id'] ?? 0),
      'code'=>(string)($r['code'] ?? ''),
      'kind'=>(string)($r['kind'] ?? ''),
      'currency'=>(string)($r['currency'] ?? ''),
      'label'=>$label,
      'instructions'=>$inst,
      'image_url'=>$r['image_url'] ?? null,
    ];
  }
  return $out;
}

function local_quote_line_local(string $cc, float $amountUsd, string $lang): string {
  $cc = strtoupper(trim($cc));
  if (!preg_match('/^[A-Z]{2}$/', $cc) || !($amountUsd > 0)) return '';
  $cur = country_currency($cc);
  if (!preg_match('/^[A-Z]{3}$/', $cur) || $cur === 'USD') return '';
  $fx = fx_usd_to($cur);
  $rate = (float)($fx['rate'] ?? 0);
  if (!($rate > 0)) return '';
  $local = $amountUsd * $rate;
  $localFmt = number_format($local, 2, '.', ',');
  $rateFmt  = number_format($rate, 4, '.', ',');
  return "≈ {$localFmt} {$cur} (1 USD ≈ {$rateFmt} {$cur})";
}

try {
  if ($chatId !== '' && $mainToken !== '') {
    // store state in bot_states so callbacks can continue the flow inside the MAIN bot webhook
    $now = time();
    $payload = json_encode([
      'kind'=>$kind,
      'amount'=>$amount,
      'currency'=>$currency,
      'user_id'=>(int)$user['id'],
      'country'=>$country,
      'payload'=>$b64,
      'sig'=>$sig,
    ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);

    if (db_driver() === 'mysql') {
      $pdo->prepare("INSERT INTO bot_states(chat_id,tg_user_id,state,data,updated_at) VALUES(?,?,?,?,?)
        ON DUPLICATE KEY UPDATE tg_user_id=VALUES(tg_user_id), state=VALUES(state), data=VALUES(data), updated_at=VALUES(updated_at)")
        ->execute([$chatId,(string)($user['tg_id'] ?? ''),'await_method',$payload,$now]);
    } else {
      $pdo->prepare("INSERT INTO bot_states(chat_id,tg_user_id,state,data,updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(chat_id) DO UPDATE SET tg_user_id=excluded.tg_user_id, state=excluded.state, data=excluded.data, updated_at=excluded.updated_at")
        ->execute([$chatId,(string)($user['tg_id'] ?? ''),'await_method',$payload,$now]);
    }

    $methods = pm_list_main_local($country, $lang);
    $kb = kb_methods_main_local($methods, $kind);

    $title = $kind==='deposit'
      ? ($lang==='ar'?'✅ طلب إيداع':($lang==='ru'?'✅ Запрос депозита':'✅ Deposit request'))
      : ($lang==='ar'?'✅ طلب سحب':($lang==='ru'?'✅ Запрос вывода':'✅ Withdraw request'));

    $hdr = "Amount: " . rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.') . " {$currency}";
    $ccName = mex_country_label($country, $lang);
    $ccFlag = mex_flag_emoji($country);
    $ccLine = ($lang==='ar') ? ('الدولة: '.$ccFlag.' '.$ccName) : (($lang==='ru') ? ('Страна: '.$ccFlag.' '.$ccName) : ('Country: '.$ccFlag.' '.$ccName));
    $qLine = local_quote_line_local($country, $amount, $lang);
    $pick = ($lang==='ar'?'اختار وسيلة الدفع:':($lang==='ru'?'Выберите способ оплаты:':'Select a payment method:'));

    $resp = tg_api_main_local('sendMessage', [
      'chat_id'=>(int)$chatId,
      'text'=>$title."\n".$hdr."\n".$ccLine.($qLine?("\n".$qLine):'')."\n\n".$pick,
      'reply_markup'=>['inline_keyboard'=>$kb],
    ]);
    $pushed = (bool)($resp['ok'] ?? false);
  }
} catch (Throwable $e) {
  // ignore: we still return deep link fallback
}

json_response([
  'ok' => true,
  // Deep-link with start payload for users who haven't opened the bot before.
  'url' => $deepLink . '?start=' . $token,
  'token' => $token,
  'pushed' => $pushed,
]);
