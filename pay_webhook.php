<?php
declare(strict_types=1);

/**
 * Payment bot webhook (deposit/withdraw).
 * FIXED: removed non-existing api/lib/db.php include.
 */

header('Content-Type: application/json; charset=utf-8');

function pay_log(string $msg): void {
  // Hostinger عادة بتسجل في error_log
  error_log('[pay_webhook] ' . $msg);
  try { if (function_exists('tp_log')) tp_log('bot_pay','INFO',$msg); } catch (Throwable $e) {}
}

try {
  // ✅ correct includes for this project structure
  require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/affiliates.php';
  require_once __DIR__ . '/api/lib/schema.php';
  require_once __DIR__ . '/api/lib/ledger.php';
  require_once __DIR__ . '/api/lib/crypto.php';
  require_once __DIR__ . '/api/lib/fx.php';
  require_once __DIR__ . '/api/lib/country_currency.php';
  require_once __DIR__ . '/api/lib/cryptopay.php';
  require_once __DIR__ . '/countries.php';
  // Schema migrations are already handled by db() in common.php (idempotent).
  $token = (string)env('BOT_TOKEN', '');
  if ($token === '') {
    echo json_encode(['ok' => true]); // always 200 for Telegram
    exit;
  }

  $updateRaw = file_get_contents('php://input') ?: '';
  $update = json_decode($updateRaw, true) ?: [];

  // Fast ACK to Telegram to avoid update backlog (shared hosting). We still continue processing.
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
  } catch (Throwable $e) {}
  pay_log('incoming ' . json_encode(['keys' => array_keys($update)], JSON_UNESCAPED_SLASHES));

  function tg_api_pay(string $method, array $payload): array {
    $token = (string)env('BOT_TOKEN','');
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

  function kb_lang(): array {
    return [[
      ['text'=>'English','callback_data'=>'lang:en'],
      ['text'=>'العربية','callback_data'=>'lang:ar'],
      ['text'=>'Русский','callback_data'=>'lang:ru'],
    ]];
  }

  function upsert_user_basic(int $tg_id, int $chat_id, array $u): void {
    $pdo = db();
    $driver = db_driver();
    $username = (string)($u['username'] ?? '');
    $first = (string)($u['first_name'] ?? '');
    $last  = (string)($u['last_name'] ?? '');

    if ($driver === 'sqlite') {
      $pdo->prepare("
        INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(tg_id) DO UPDATE SET
          telegram_chat_id=excluded.telegram_chat_id,
          username=excluded.username,
          first_name=excluded.first_name,
          last_name=excluded.last_name,
          updated_at=excluded.updated_at
      ")->execute([(string)$tg_id,(string)$chat_id,$username,$first,$last,'en', time(), time()]);
    } else {
      $pdo->prepare("
        INSERT INTO users (tg_id, telegram_chat_id, username, first_name, last_name, locale, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          telegram_chat_id=VALUES(telegram_chat_id),
          username=VALUES(username),
          first_name=VALUES(first_name),
          last_name=VALUES(last_name),
          updated_at=VALUES(updated_at)
      ")->execute([(string)$tg_id,(string)$chat_id,$username,$first,$last,'en', time(), time()]);
    }
  }

  function set_locale(int $tg_id, string $lang): void {
    $lang = in_array($lang,['en','ar','ru'], true) ? $lang : 'en';
    db()->prepare("UPDATE users SET locale=?, updated_at=? WHERE tg_id=?")
      ->execute([$lang, time(), (string)$tg_id]);
  }

  function user_locale(int $tg_id): string {
    $st = db()->prepare('SELECT locale FROM users WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tg_id]);
    $l = strtolower((string)($st->fetchColumn() ?: 'en'));
    return in_array($l,['en','ar','ru'], true) ? $l : 'en';
  }

  function bs_get(int $chat_id): array {
    $st = db()->prepare('SELECT state, data FROM bot_states WHERE chat_id=? LIMIT 1');
    $st->execute([(string)$chat_id]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if (!$r) return ['state'=>'idle','data'=>[]];
    $j = json_decode((string)($r['data'] ?? ''), true);
    return ['state'=>(string)($r['state'] ?? 'idle'), 'data'=> is_array($j)?$j:[]];
  }

  function bs_set(int $chat_id, string $state, array $data=[]): void {
    $pdo = db();
    $driver = db_driver();
    $now = time();
    $enc = json_encode($data, JSON_UNESCAPED_SLASHES);

    if ($driver==='sqlite') {
      $pdo->prepare('
        INSERT INTO bot_states(chat_id,state,data,updated_at)
        VALUES (?,?,?,?)
        ON CONFLICT(chat_id) DO UPDATE SET
          state=excluded.state, data=excluded.data, updated_at=excluded.updated_at
      ')->execute([(string)$chat_id,$state,$enc,$now]);
    } else {
      $pdo->prepare('
        INSERT INTO bot_states(chat_id,state,data,updated_at)
        VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE
          state=VALUES(state), data=VALUES(data), updated_at=VALUES(updated_at)
      ')->execute([(string)$chat_id,$state,$enc,$now]);
    }
  }

  function pay_text(string $key, string $lang): string {
    $en = [
      'about' => "This bot handles deposits and withdrawals.\n\nUse /deposit or /withdraw.",
      'choose_lang' => "Choose language:",
      'pick_method' => "Choose a payment method:",
      'send_proof' => "Send the transfer proof (photo or image file).",
      'received' => "✅ Received. Deposit request #{id} is under review.",
      'bad_payload' => "Invalid start payload.",
      'enter_amount' => "Send the amount in USD (example: 50)",
      'kyc_needed' => "Withdrawals require KYC approval in the app.",
      'send_payout' => "Send payout details (address / account / notes).",
      'done_w' => "Withdrawal request created ✅. Admin will review.",
    ];
    $ar = [
      'about' => "ده بوت الإيداع والسحب.\n\nاكتب /deposit أو /withdraw.",
      'choose_lang' => "اختر اللغة:",
      'pick_method' => "اختر وسيلة الدفع:",
      'send_proof' => "ابعت إثبات التحويل (صورة أو ملف صورة).",
      'received' => "✅ تم استلام طلب الإيداع #{id}. جاري مراجعة الطلب من الإدارة.",
      'bad_payload' => "بيانات البداية غير صالحة.",
      'enter_amount' => "اكتب المبلغ بالدولار (مثال: 50)",
      'kyc_needed' => "السحب يحتاج KYC موافق عليه داخل التطبيق.",
      'send_payout' => "ابعت بيانات الاستلام (عنوان/حساب/ملاحظات).",
      'done_w' => "تم إنشاء طلب السحب ✅. الأدمن هيراجع.",
    ];
    $ru = [
      'about' => "Бот для пополнения и вывода.\n\nКоманды: /deposit или /withdraw.",
      'choose_lang' => "Выберите язык:",
      'pick_method' => "Выберите способ оплаты:",
      'send_proof' => "Отправьте подтверждение (фото или файл изображения).",
      'received' => "✅ Получено. Заявка на пополнение #{id} на проверке.",
      'bad_payload' => "Неверный payload.",
      'enter_amount' => "Сумма в USD (пример: 50)",
      'kyc_needed' => "Для вывода нужен одобренный KYC.",
      'send_payout' => "Отправьте реквизиты для вывода.",
      'done_w' => "Заявка создана ✅. Админ проверит.",
    ];
    $dict = $lang==='ar' ? $ar : ($lang==='ru' ? $ru : $en);
    return $dict[$key] ?? ($en[$key] ?? $key);
  }

  function local_quote_line(string $cc, float $amountUsd, string $lang): string {
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
    if ($lang === 'ar') return "≈ {$localFmt} {$cur} (1 USD ≈ {$rateFmt} {$cur})";
    if ($lang === 'ru') return "≈ {$localFmt} {$cur} (1 USD ≈ {$rateFmt} {$cur})";
    return "≈ {$localFmt} {$cur} (1 USD ≈ {$rateFmt} {$cur})";
  }

  // --- Countries + country-scoped methods ---
function countries_list(string $lang): array {
  $lang = strtolower(trim($lang));
  if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';

  $rows = [];
  try {
    $st = db()->query("SELECT code,name_en,name_ar,name_ru FROM countries");
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    $rows = [];
  }

  $out = [];

  if ($rows) {
    foreach ($rows as $r) {
      $cc = strtoupper((string)($r['code'] ?? ''));
      if (!preg_match('/^[A-Z]{2}$/', $cc)) continue;

      if ($lang === 'ar') {
        $label = trim((string)($r['name_ar'] ?? ''));
        if ($label === '') $label = mex_country_label($cc, 'ar');
      } elseif ($lang === 'ru') {
        $label = trim((string)($r['name_ru'] ?? ''));
        if ($label === '') $label = mex_country_label($cc, 'ru');
      } else {
        $label = trim((string)($r['name_en'] ?? ''));
        if ($label === '') $label = mex_country_label($cc, 'en');
      }

      if ($label === '') $label = $cc;
      $out[] = ['code' => $cc, 'name' => $label];
    }
  } else {
    foreach (mex_countries_sorted($lang) as $it) {
      $out[] = ['code' => (string)$it['code'], 'name' => (string)$it['label']];
    }
  }

  usort($out, function($a, $b) use ($lang) {
    $ka = mex_sort_key((string)($a['name'] ?? ''), $lang);
    $kb = mex_sort_key((string)($b['name'] ?? ''), $lang);
    $cmp = strcmp($ka, $kb);
    if ($cmp !== 0) return $cmp;
    return strcmp((string)($a['code'] ?? ''), (string)($b['code'] ?? ''));
  });

  return $out;
}

  function kb_countries(array $countries): array {
    $rows = [];
    $row = [];
    foreach ($countries as $c) {
      $row[] = ['text'=>$c['name'], 'callback_data'=>'country:'.$c['code']];
      if (count($row) === 2) { $rows[] = $row; $row = []; }
    }
    if ($row) $rows[] = $row;
    return $rows ?: [[['text'=>'Global','callback_data'=>'country:GLOBAL']]];
  }

  function pm_list_for_country(string $kind, string $lang, ?string $countryCode): array {
    $countryCode = $countryCode ? strtoupper($countryCode) : null;
    $hasMap = false;
    try {
      $cnt = (int)(db()->query("SELECT COUNT(1) FROM payment_method_countries")->fetchColumn() ?: 0);
      $hasMap = $cnt > 0;
    } catch (Throwable $e) {
      $hasMap = false;
    }

    if ($hasMap && $countryCode) {
      $st = db()->prepare("
        SELECT pm.id, pm.code, pm.provider, pm.currency, pm.title_en, pm.title_ar, pm.title_ru,
               pm.instructions_en, pm.instructions_ar, pm.instructions_ru
        FROM payment_methods pm
        LEFT JOIN payment_method_countries mc ON mc.method_id = pm.id
        WHERE (pm.kind=? OR pm.kind='both' OR pm.kind='' OR pm.kind IS NULL) AND pm.status='active'
          AND (mc.country_code IS NULL OR mc.country_code = ?)
        GROUP BY pm.id
        ORDER BY pm.sort_order ASC, pm.id ASC
      ");
      $st->execute([$kind, $countryCode]);
    } else {
      $st = db()->prepare("
        SELECT id, code, provider, currency, title_en, title_ar, title_ru,
               instructions_en, instructions_ar, instructions_ru
        FROM payment_methods
        WHERE (kind=? OR kind='both' OR kind='' OR kind IS NULL) AND status='active'
        ORDER BY sort_order ASC, id ASC
      ");
      $st->execute([$kind]);
    }

    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $out = [];
    foreach ($rows as $r) {
      $title = $lang==='ar' ? ($r['title_ar'] ?? '') : ($lang==='ru' ? ($r['title_ru'] ?? '') : ($r['title_en'] ?? ''));
      if (!$title) $title = (string)($r['code'] ?? '');
      $out[] = [
        'id'=>(int)$r['id'],
        'code'=>(string)$r['code'],
        'provider'=>(string)($r['provider'] ?? 'dummy'),
        'currency'=>(string)$r['currency'],
        'title'=>$title,
        'inst'=> ($lang==='ar' ? ($r['instructions_ar'] ?? '') : ($lang==='ru' ? ($r['instructions_ru'] ?? '') : ($r['instructions_en'] ?? ''))),
      ];
    }
    return $out;
  }

  function pm_list(string $kind, string $lang): array {
    return pm_list_for_country($kind, $lang, null);
  }

  function kb_methods(array $methods): array {
    $kb = [];
    foreach ($methods as $m) {
      $kb[] = [[ 'text'=>$m['title'].' ('.$m['currency'].')', 'callback_data'=>'method:'.$m['id'] ]];
    }
    return $kb ?: [[['text'=>'No methods','callback_data'=>'noop']]];
  }

  function parse_intent(string $payload): ?array {
    // payload format: tp_<b64url>.<sig>
    if (!str_starts_with($payload,'tp_')) return null;
    $p = substr($payload, 3);
    $parts = explode('.', $p, 2);
    if (count($parts) !== 2) return null;
    [$b64,$sig] = $parts;

    $secret = (string)env('BOT_INTENT_SECRET','');
    if ($secret==='') return null;

    $calc = hash_hmac('sha256', $b64, $secret);
    if (!hash_equals($calc, $sig)) return null;

    $b64 = strtr($b64, '-_', '+/');
    // Restore missing padding (base64url without '=')
    $pad = strlen($b64) % 4;
    if ($pad) $b64 .= str_repeat('=', 4 - $pad);
    $json = base64_decode($b64);
    $arr = json_decode($json ?: '[]', true);
    return is_array($arr) ? $arr : null;
  }

  // ---- MESSAGE HANDLER ----
  if (isset($update['message'])) {
    $m = $update['message'];
    $chat_id = (int)($m['chat']['id'] ?? 0);
    $from = $m['from'] ?? [];
    $tg_id = (int)($from['id'] ?? 0);

    if ($chat_id && $tg_id) upsert_user_basic($tg_id, $chat_id, $from);
    $lang = $tg_id ? user_locale($tg_id) : 'en';

    $text = (string)($m['text'] ?? '');

    if (strpos($text, '/start') === 0) {
      $parts = explode(' ', trim($text), 2);
      $payload = $parts[1] ?? '';

      // Affiliate bind: /start aff_CODE
      if ($payload !== '' && str_starts_with($payload, 'aff_')) {
        $code = trim(substr($payload, 4));
        if ($code !== '') {
          try {
            $pdo2 = db();
            $stU = $pdo2->prepare('SELECT id FROM users WHERE tg_id=? LIMIT 1');
            $stU->execute([(string)$tg_id]);
            $uidLocal = (int)($stU->fetchColumn() ?: 0);
            if ($uidLocal > 0) {
              aff_bind_user_by_code($uidLocal, $code, 'bot_start');
            }
          } catch (Throwable $e) {}
        }
        $payload = "";

        // continue normal flow (no intent)
      }

      if ($payload !== '') {
        $intent = parse_intent($payload);
        if (!$intent) {
          tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('bad_payload',$lang)]);
          echo json_encode(['ok'=>true]); exit;
        }
        // Use language from intent (same as mini app) if present
        $lang = (string)($intent['lang'] ?? $lang);
        if (!in_array($lang, ['en','ar','ru'], true)) $lang = 'en';
        bs_set($chat_id, 'pick_country', ['intent'=>$intent, 'lang'=>$lang]);
        $kind = (string)($intent['kind'] ?? 'deposit');
        $amount = (float)($intent['amount'] ?? 0);
        $title = ($lang==='ar') ? 'اختر دولتك:' : (($lang==='ru') ? 'Выберите страну:' : 'Pick your country:');
        tg_api_pay('sendMessage', [
          'chat_id'=>$chat_id,
          'text'=>$title."\n\n".strtoupper($kind)." $".number_format($amount,2),
          'reply_markup'=>mex_countries_keyboard($lang, 0, 40),
        ]);
        echo json_encode(['ok'=>true]); exit;
      }

      tg_api_pay('sendMessage', [
        'chat_id'=>$chat_id,
        'text'=>pay_text('about',$lang),
        'reply_markup'=>['inline_keyboard'=>kb_lang()],
      ]);
      echo json_encode(['ok'=>true]); exit;
    }

    if (preg_match('~^/(help)\b~i', trim($text))) {
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('about',$lang)]);
      echo json_encode(['ok'=>true]); exit;
    }

    if (preg_match('~^/(deposit|withdraw)\b~i', trim($text), $mm)) {
      $kind = strtolower($mm[1]);
      bs_set($chat_id, 'await_amount', ['kind'=>$kind]);
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('enter_amount',$lang)]);
      echo json_encode(['ok'=>true]); exit;
    }

    $st = bs_get($chat_id);

    if ($st['state'] === 'await_amount') {
      $amt = (float)preg_replace('/[^0-9.]/','', $text);
      if (!($amt > 0)) {
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('enter_amount',$lang)]);
        echo json_encode(['ok'=>true]); exit;
      }
      $kind = (string)($st['data']['kind'] ?? 'deposit');
      $intent = ['v'=>1,'kind'=>$kind,'amount'=>$amt,'uid'=>null,'pu'=>null,'lang'=>$lang,'ts'=>time()];
      bs_set($chat_id, 'pick_country', ['intent'=>$intent, 'lang'=>$lang]);
      $title = ($lang==='ar') ? 'اختر دولتك:' : (($lang==='ru') ? 'Выберите страну:' : 'Pick your country:');
      tg_api_pay('sendMessage', [
        'chat_id'=>$chat_id,
        'text'=>$title."\n\n".strtoupper($kind)." $".number_format($amt,2),
        'reply_markup'=>mex_countries_keyboard($lang, 0, 40),
      ]);
      echo json_encode(['ok'=>true]); exit;
    }

    if ($st['state'] === 'await_proof') {
      // accept photo or image document
      $fileId = '';
      $extPrefix = '';

      $photos = $m['photo'] ?? null;
      if (is_array($photos) && !empty($photos)) {
        $best = end($photos);
        $fileId = (string)($best['file_id'] ?? '');
        $extPrefix = 'tg_photo:';
      } else {
        $doc = $m['document'] ?? null;
        if (is_array($doc)) {
          $mime = strtolower((string)($doc['mime_type'] ?? ''));
          $name = strtolower((string)($doc['file_name'] ?? ''));
          $isImg = (str_starts_with($mime,'image/')) || preg_match('/\.(png|jpe?g|webp|gif)$/', $name);
          if ($isImg) {
            $fileId = (string)($doc['file_id'] ?? '');
            $extPrefix = 'tg_doc:';
          }
        }
      }

      if ($fileId === '') {
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('send_proof',$lang)]);
        echo json_encode(['ok'=>true]); exit;
      }

      $intent = $st['data']['intent'] ?? [];
      $method_id = (int)($st['data']['method_id'] ?? 0);

      // Resolve user_id
      $uid = (int)($intent['uid'] ?? 0);
      if ($uid <= 0) {
        $q = db()->prepare('SELECT id FROM users WHERE tg_id=? LIMIT 1');
        $q->execute([(string)$tg_id]);
        $uid = (int)($q->fetchColumn() ?: 0);
      }

      $amount = (float)($intent['amount'] ?? 0);

      $pm = db()->prepare('SELECT code, provider, currency FROM payment_methods WHERE id=? LIMIT 1');
      $pm->execute([$method_id]);
      $row = $pm->fetch(PDO::FETCH_ASSOC);

      if (!$row) {
        bs_set($chat_id,'idle');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>'Method not found']);
        echo json_encode(['ok'=>true]); exit;
      }

      $provider = strtolower((string)($row['provider'] ?? 'dummy'));
      $code = strtolower((string)($row['code'] ?? ''));
      $currency = strtoupper((string)($row['currency'] ?? 'USDT'));

      $now = time();
      $cc = strtoupper((string)($intent['country'] ?? ''));
      $ext = $extPrefix . $fileId . ($cc!=='' ? ('|cc='.$cc) : '');

      $pdo = db();
      $stx = $pdo->prepare('
        INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,external_ref,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)
      ');
      $stx->execute([$uid,$provider,$code,$currency,$amount,'pending',$ext,$now,$now]);
      $rid = (int)$pdo->lastInsertId();

      // Notify manager (best effort)
      try {
        aff_notify_manager_for_user($uid, 'dep_created', [
          'id' => $rid,
          'amount' => number_format($amount, 2, '.', ''),
          'cur' => $currency,
        ]);
      } catch (Throwable $e2) {}

      bs_set($chat_id,'idle');
      $msg = str_replace('{id}', (string)$rid, pay_text('received',$lang));
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$msg]);
      echo json_encode(['ok'=>true]); exit;
    }

    if ($st['state'] === 'await_payout') {
      $intent = $st['data']['intent'] ?? [];
      $method_id = (int)($st['data']['method_id'] ?? 0);

      $uid = (int)($intent['uid'] ?? 0);
      if ($uid <= 0) {
        $q = db()->prepare('SELECT id FROM users WHERE tg_id=? LIMIT 1');
        $q->execute([(string)$tg_id]);
        $uid = (int)($q->fetchColumn() ?: 0);
      }

      $amount = (float)($intent['amount'] ?? 0);
      $dest = trim($text);

      if ($dest === '') {
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('send_payout',$lang)]);
        echo json_encode(['ok'=>true]); exit;
      }

      // KYC check
      $kyc = db()->prepare('SELECT status FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
      $kyc->execute([$uid]);
      $kycStatus = (string)($kyc->fetchColumn() ?: 'none');
      if ($kycStatus !== 'approved') {
        bs_set($chat_id,'idle');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('kyc_needed',$lang)]);
        echo json_encode(['ok'=>true]); exit;
      }

      $pm = db()->prepare('SELECT code, currency FROM payment_methods WHERE id=? LIMIT 1');
      $pm->execute([$method_id]);
      $row = $pm->fetch(PDO::FETCH_ASSOC);
      if (!$row) {
        bs_set($chat_id,'idle');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>'Method not found']);
        echo json_encode(['ok'=>true]); exit;
      }

      $code = strtolower((string)($row['code'] ?? ''));
      $currency = strtoupper((string)($row['currency'] ?? 'USDT'));
      $enc = crypto_encrypt($dest);

      // Reserve funds with a hold (same model as MiniApp withdrawals).
      $holdId = null;
      try {
        $holdId = hold_create($uid, $currency, $amount, 'withdraw_request', time() + 3600);
      } catch (Throwable $e) {
        // Insufficient balance or other error.
        $av = wallet_available($uid, $currency);
        $available = (float)($av['available'] ?? 0);
        $avFmt = number_format($available, 2, '.', ',');
        $txt = ($lang === 'ar')
          ? "❌ رصيدك المتاح غير كافي لتنفيذ السحب.\nالمتاح: {$avFmt} {$currency}"
          : (($lang === 'ru')
            ? "❌ Недостаточно средств для вывода.\nДоступно: {$avFmt} {$currency}"
            : "❌ Insufficient available balance for withdrawal.\nAvailable: {$avFmt} {$currency}");
        bs_set($chat_id, 'idle');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$txt]);
        echo json_encode(['ok'=>true]);
        exit;
      }

      $now = time();
      $stmtW = db()->prepare('
        INSERT INTO withdrawals(user_id,method,currency,amount,status,destination_enc,hold_id,risk_score,admin_note,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ');
      $stmtW->execute([$uid,$code,$currency,$amount,'requested',$enc,$holdId,0,'via pay bot',$now,$now]);
      $wid = (int)db()->lastInsertId();

      // Notify manager (best effort)
      try {
        aff_notify_manager_for_user($uid, 'wdr_created', [
          'id' => $wid,
          'amount' => number_format($amount, 2, '.', ''),
          'cur' => $currency,
        ]);
      } catch (Throwable $e2) {}

      bs_set($chat_id,'idle');
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('done_w',$lang)]);
      echo json_encode(['ok'=>true]); exit;
    }

    tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('about',$lang)]);
    echo json_encode(['ok'=>true]); exit;
  }

  // ---- CALLBACK HANDLER ----
  if (isset($update['callback_query'])) {
    $cq = $update['callback_query'];
    $data = (string)($cq['data'] ?? '');
    $from = $cq['from'] ?? [];
    $tg_id = (int)($from['id'] ?? 0);
    $chat_id = (int)($cq['message']['chat']['id'] ?? 0);

    if ($chat_id && $tg_id) upsert_user_basic($tg_id, $chat_id, $from);
    $lang = $tg_id ? user_locale($tg_id) : 'en';

    if (str_starts_with($data,'lang:')) {
      $l = substr($data,5);
      set_locale($tg_id, $l);
      tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('about', user_locale($tg_id))]);
      echo json_encode(['ok'=>true]); exit;
    }



if (str_starts_with($data,'countries:')) {
  $page = (int)substr($data, 10);
  $st = bs_get($chat_id);
  $lang2 = (string)($st['data']['lang'] ?? $lang);
  if (!in_array($lang2, ['en','ar','ru'], true)) $lang2 = 'en';
  $mid = (int)($cq['message']['message_id'] ?? 0);

  tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);

  if ($mid > 0) {
    tg_api_pay('editMessageReplyMarkup', [
      'chat_id' => $chat_id,
      'message_id' => $mid,
      'reply_markup' => mex_countries_keyboard($lang2, $page, 40),
    ]);
  }
  echo json_encode(['ok'=>true]); exit;
}

    if (str_starts_with($data,'country:')) {
      $cc = strtoupper(substr($data,8));
      $st = bs_get($chat_id);
      $intent = $st['data']['intent'] ?? null;
      $lang2 = (string)($st['data']['lang'] ?? $lang);
      if (!in_array($lang2, ['en','ar','ru'], true)) $lang2 = 'en';

      if (!$intent) {
        tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'No intent']);
        $txt = ($lang2==='ar') ? '⚠️ الجلسة انتهت. افتح طلب الإيداع من التطبيق تاني.' : (($lang2==='ru') ? '⚠️ Сессия истекла. Откройте заявку снова из приложения.' : '⚠️ Session expired. Open the deposit request again from the app.');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id, 'text'=>$txt]);
        echo json_encode(['ok'=>true]); exit;
      }

      $intent['country'] = $cc;
      $intent['lang'] = (string)($intent['lang'] ?? $lang2);

      $kind = (string)($intent['kind'] ?? 'deposit');
      $amount = (float)($intent['amount'] ?? 0);
      $methods = pm_list_for_country($kind, $lang2, $cc);

      $qLine = local_quote_line($cc, $amount, $lang2);

      tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);

      if (!$methods) {
        $txt = ($lang2==='ar') ? 'لا توجد وسائل متاحة لهذه الدولة حالياً.' : (($lang2==='ru') ? 'Нет доступных способов для этой страны.' : 'No payment methods for this country.');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$txt]);
        echo json_encode(['ok'=>true]); exit;
      }

      bs_set($chat_id, 'intent', ['intent'=>$intent, 'lang'=>$lang2]);
      tg_api_pay('sendMessage', [
        'chat_id'=>$chat_id,
        'text'=>pay_text('pick_method',$lang2)."\n\n".strtoupper($kind)." $".number_format($amount,2).($qLine?"\n".$qLine:''),
        'reply_markup'=>['inline_keyboard'=>kb_methods($methods)],
      ]);
      echo json_encode(['ok'=>true]); exit;
    }

    if (str_starts_with($data,'method:')) {
      $id = (int)substr($data,7);
      $st = bs_get($chat_id);
      $intent = $st['data']['intent'] ?? null;
      $lang2 = (string)($st['data']['lang'] ?? $lang);
      if (!in_array($lang2, ['en','ar','ru'], true)) $lang2 = 'en';
      if (!$intent) {
        tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'No intent']);
        $txt = ($lang2==='ar') ? '⚠️ الجلسة انتهت. افتح طلب الإيداع من التطبيق تاني.' : (($lang2==='ru') ? '⚠️ Сессия истекла. Откройте заявку снова из приложения.' : '⚠️ Session expired. Open the deposit request again from the app.');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id, 'text'=>$txt]);
        echo json_encode(['ok'=>true]); exit;
      }

      
      // If user reached method selection without choosing a country, force country step first
      $cc_missing = (string)($intent['country'] ?? '');
      if ($cc_missing === '') {
        $lang_force = (string)($intent['lang'] ?? $lang);
        if (!in_array($lang_force, ['en','ar','ru'], true)) $lang_force = 'en';
        bs_set($chat_id, 'pick_country', ['intent'=>$intent, 'lang'=>$lang_force]);
        $title = ($lang_force==='ar') ? 'اختر دولتك:' : (($lang_force==='ru') ? 'Выберите страну:' : 'Pick your country:');
        tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);
        tg_api_pay('sendMessage', [
          'chat_id'=>$chat_id,
          'text'=>$title,
          'reply_markup'=>mex_countries_keyboard($lang_force, 0, 40),
        ]);
        echo json_encode(['ok'=>true]); exit;
      }

$lang2 = (string)($intent['lang'] ?? $lang);
      if (!in_array($lang2, ['en','ar','ru'], true)) $lang2 = 'en';
      $kind = (string)($intent['kind'] ?? 'deposit');
      $cc = (string)($intent['country'] ?? '');
      $methods = pm_list_for_country($kind, $lang2, $cc!=='' ? $cc : null);

      $chosen = null;
      foreach ($methods as $m) if ((int)$m['id'] === $id) $chosen = $m;

      if (!$chosen) {
        tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'Not found']);
        $txt = ($lang2==='ar') ? '⚠️ الوسيلة غير متاحة الآن، اختار وسيلة تانية.' : (($lang2==='ru') ? '⚠️ Способ недоступен, выберите другой.' : '⚠️ Method not available, choose another.');
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id, 'text'=>$txt]);
        echo json_encode(['ok'=>true]); exit;
      }

      tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '', 'text'=>'OK']);

      if (!empty($chosen['inst'])) {
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$chosen['inst']]);
      }

      if ($kind === 'deposit') {
        $provider = strtolower((string)($chosen['provider'] ?? ''));
        $codeStr  = strtolower((string)($chosen['code'] ?? ''));
        $instStr  = strtolower((string)($chosen['inst'] ?? ''));

        // Robust Crypto Pay detection:
        // Some admins forget to set payment_methods.provider='cryptopay'.
        // If the method code/instructions clearly indicate Crypto Pay, treat it as cryptopay.
        if ($provider === '' || $provider === 'dummy') {
          if (
            in_array($codeStr, ['cryptopay','crypto_pay','crypto-pay','cryptobot','cryptobotpay','crypto'], true)
            || (is_string($instStr) && (str_contains($instStr, 'pay.crypt.bot') || str_contains($instStr, 'cryptopay') || str_contains($instStr, 'crypto pay')))
          ) {
            $provider = 'cryptopay';
          }
        }

        // CryptoPay (CryptoBot) instant invoice flow
        if ($provider === 'cryptopay') {
          $amount = (float)($intent['amount'] ?? 0);
          $currency = strtoupper((string)($chosen['currency'] ?? 'USDT'));
          $cc2 = strtoupper((string)($intent['country'] ?? ''));

          // Resolve user_id
          $uid = (int)($intent['uid'] ?? 0);
          if ($uid <= 0) {
            $q = db()->prepare('SELECT id FROM users WHERE tg_id=? LIMIT 1');
            $q->execute([(string)$tg_id]);
            $uid = (int)($q->fetchColumn() ?: 0);
          }
          if ($uid <= 0) {
            bs_set($chat_id,'idle');
            $txt = ($lang2==='ar') ? 'افتح التطبيق الأول علشان نربط حسابك، وبعدها جرب الإيداع.' : (($lang2==='ru') ? 'Сначала откройте приложение, чтобы привязать аккаунт, затем попробуйте снова.' : 'Open the app first to link your account, then try again.');
            tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$txt]);
            echo json_encode(['ok'=>true]); exit;
          }

          if (!($amount > 0)) {
            tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('enter_amount',$lang2)]);
            echo json_encode(['ok'=>true]); exit;
          }

          $pdo = db();
          $now = time();
          $meta = [
            'country' => $cc2,
            'tg_id' => $tg_id,
            'chat_id' => $chat_id,
            'lang' => $lang2,
            'provider' => 'cryptopay',
          ];

          // 1) create pending deposit
          $pdo->prepare('INSERT INTO deposits(user_id,provider,method_code,currency,amount,status,external_ref,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute([$uid,'cryptopay',(string)($chosen['code'] ?? ''),$currency,$amount,'pending',json_encode($meta, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$now,$now]);
          $depId = (int)$pdo->lastInsertId();

          // 2) create CryptoPay invoice
          $payload = 'dep:' . $depId;
          $desc = 'Deposit #' . $depId;
          $resp = cryptopay_create_invoice($amount, $currency, $payload, $desc);
          if (($resp['ok'] ?? false) !== true) {
            $pdo->prepare('UPDATE deposits SET status="failed", updated_at=? WHERE id=?')->execute([time(), $depId]);
            bs_set($chat_id,'idle');
            $txt = ($lang2==='ar') ? 'حصلت مشكلة في إنشاء فاتورة الدفع. جرّب تاني بعد شوية.' : (($lang2==='ru') ? 'Не удалось создать счёт. Попробуйте позже.' : 'Failed to create invoice. Please try again later.');
            tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$txt]);
            echo json_encode(['ok'=>true]); exit;
          }

          $invoice = $resp['result'] ?? [];
          $invoiceId = (int)($invoice['invoice_id'] ?? 0);
          $url = cryptopay_pick_invoice_url(is_array($invoice) ? $invoice : []);
          $meta['invoice_id'] = $invoiceId;
          $meta['invoice_url'] = $url;
          $meta['invoice'] = $invoice;
          $pdo->prepare('UPDATE deposits SET external_ref=?, updated_at=? WHERE id=?')
            ->execute([json_encode($meta, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), time(), $depId]);

          // 3) send pay button
          $qLine = local_quote_line($cc2, $amount, $lang2);
          $btnText = ($lang2==='ar') ? 'ادفع الآن عبر CryptoBot' : (($lang2==='ru') ? 'Оплатить через CryptoBot' : 'Pay via CryptoBot');
          $msg = ($lang2==='ar')
            ? "✅ تم إنشاء فاتورة الإيداع #{$depId}\nالمبلغ: {$amount} {$currency}".
              ($qLine?"\n{$qLine}":'').
              "\n\nاضغط زر الدفع وسيتم إضافة الرصيد تلقائيًا بعد الدفع." 
            : ($lang2==='ru'
              ? "✅ Счёт на пополнение #{$depId} создан\nСумма: {$amount} {$currency}".
                ($qLine?"\n{$qLine}":'').
                "\n\nНажмите кнопку оплаты — баланс обновится автоматически." 
              : "✅ Deposit invoice #{$depId} created\nAmount: {$amount} {$currency}".
                ($qLine?"\n{$qLine}":'').
                "\n\nTap Pay — balance will be credited automatically." 
            );

          $kb = $url ? ['inline_keyboard'=>[[['text'=>$btnText,'url'=>$url]]]] : null;
          tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>$msg] + ($kb?['reply_markup'=>$kb]:[]));

          bs_set($chat_id,'idle');
          echo json_encode(['ok'=>true]); exit;
        }

        // Default: proof-based deposit
        bs_set($chat_id,'await_proof',['intent'=>$intent,'method_id'=>$id]);
        tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('send_proof',$lang2)]);
        echo json_encode(['ok'=>true]); exit;
      }

      bs_set($chat_id,'await_payout',['intent'=>$intent,'method_id'=>$id]);
      tg_api_pay('sendMessage', ['chat_id'=>$chat_id,'text'=>pay_text('send_payout',$lang2)]);
      echo json_encode(['ok'=>true]); exit;
    }

    tg_api_pay('answerCallbackQuery', ['callback_query_id'=>$cq['id'] ?? '']);
    echo json_encode(['ok'=>true]); exit;
  }

  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  pay_log('FATAL: ' . $e->getMessage());
  // ✅ always answer 200 OK for Telegram
  echo json_encode(['ok'=>true]);
}
