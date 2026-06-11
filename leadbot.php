<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/crypto.php';
require_once __DIR__ . '/leadbot_schema.php';

function leadbot_now(): int { return time(); }
function leadbot_h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function leadbot_setting(string $key, string $default=''): string {
  try { return (string)setting_get($key, $default); } catch (Throwable $e) { return $default; }
}

function leadbot_flow_texts(?array $bot=null): array {
  $brand = trim((string)($bot['brand_name'] ?? ''));
  if ($brand === '') $brand = trim(leadbot_setting('leadbot.brand_name', 'MEX Group')) ?: 'MEX Group';
  $welcome = leadbot_setting('leadbot.flow.welcome_text', '');
  $welcome = str_replace('MEX Group', $brand, $welcome);
  return [
    'brand' => $brand,
    'welcome_text' => $welcome,
    'welcome_button' => leadbot_setting('leadbot.flow.welcome_button', 'نعم، هيّا بنا 🚀'),
    'ask_name' => leadbot_setting('leadbot.flow.ask_name', 'يرجى إدخال اسمك الكامل:'),
    'ask_phone' => leadbot_setting('leadbot.flow.ask_phone', 'يرجى إدخال رقم هاتفك مع مفتاح الدولة:'),
    'ask_country' => leadbot_setting('leadbot.flow.ask_country', 'ما هو بلد إقامتك الحالي؟'),
    'ask_age' => leadbot_setting('leadbot.flow.ask_age', 'كم عمرك؟'),
    'ask_experience' => leadbot_setting('leadbot.flow.ask_experience', 'ما هو مستوى خبرتك في التداول أو الاستثمار؟'),
    'ask_interest' => leadbot_setting('leadbot.flow.ask_interest', 'ما المجال الذي يهمك أكثر؟'),
    'ask_capital' => leadbot_setting('leadbot.flow.ask_capital', 'ما هو المبلغ الذي تفكر بالبدء به؟'),
    'ask_contact_time' => leadbot_setting('leadbot.flow.ask_contact_time', 'ما هو الوقت المناسب لتواصل مدير الحساب معك؟'),
    'finish_text' => leadbot_setting('leadbot.flow.finish_text', 'شكراً لك، تم استلام طلبك بنجاح ✅'),
    'invalid_phone' => leadbot_setting('leadbot.flow.invalid_phone', 'من فضلك أدخل رقم هاتف صحيح يبدأ بمفتاح الدولة.'),
    'invalid_age' => leadbot_setting('leadbot.flow.invalid_age', 'من فضلك أدخل العمر بالأرقام فقط.'),
  ];
}

function leadbot_flow_options(string $key, array $fallback): array {
  $raw = trim(leadbot_setting($key, ''));
  if ($raw === '') return $fallback;
  $parts = preg_split('/\r\n|\r|\n/', $raw) ?: [];
  $parts = array_values(array_filter(array_map(static fn($v)=>trim((string)$v), $parts), static fn($v)=>$v!==''));
  return $parts ?: $fallback;
}

function leadbot_default_experience_options(): array {
  return leadbot_flow_options('leadbot.flow.options_experience', ['مبتدئ','متوسط','محترف']);
}
function leadbot_default_interest_options(): array {
  return leadbot_flow_options('leadbot.flow.options_interest', ['العملات الرقمية','الفوركس','السلع','الباقات الاستثمارية','أحتاج استشارة من مدير حساب']);
}
function leadbot_default_capital_options(): array {
  return leadbot_flow_options('leadbot.flow.options_capital', ['أقل من 500$','500$ - 1,000$','1,000$ - 5,000$','5,000$ - 10,000$','أكثر من 10,000$']);
}
function leadbot_default_country_options(): array {
  return leadbot_flow_options('leadbot.flow.options_common_countries', ['مصر','السعودية','الإمارات','الكويت','قطر','المغرب']);
}

function leadbot_random_key(int $len=24): string {
  try { return bin2hex(random_bytes($len)); } catch (Throwable $e) { return sha1((string)microtime(true) . rand()); }
}

function leadbot_get_bot(int $id, bool $withToken=false): ?array {
  $st = db()->prepare('SELECT * FROM lead_bots WHERE id=? LIMIT 1');
  $st->execute([$id]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if (!$row) return null;
  if ($withToken) {
    try { $row['bot_token'] = crypto_decrypt((string)$row['token_enc']); } catch (Throwable $e) { $row['bot_token'] = ''; }
  }
  return $row;
}

function leadbot_get_bot_by_webhook(int $id, string $key): ?array {
  $st = db()->prepare('SELECT * FROM lead_bots WHERE id=? AND webhook_key=? AND is_active=1 LIMIT 1');
  $st->execute([$id, $key]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if (!$row) return null;
  try { $row['bot_token'] = crypto_decrypt((string)$row['token_enc']); } catch (Throwable $e) { $row['bot_token'] = ''; }
  return $row;
}

function leadbot_get_campaign_by_source(string $source): ?array {
  if ($source === '') return null;
  $st = db()->prepare('SELECT * FROM lead_campaigns WHERE source_code=? AND is_active=1 LIMIT 1');
  $st->execute([$source]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_is_manager_active(int $managerId): bool {
  if ($managerId <= 0) return false;
  $st = db()->prepare("SELECT COUNT(*) FROM managers WHERE id=? AND COALESCE(status,'pending') NOT IN ('blocked','deleted')");
  $st->execute([$managerId]);
  return (int)$st->fetchColumn() > 0;
}

function leadbot_find_manager_by_tg(string $tgId): ?array {
  $st = db()->prepare("SELECT * FROM managers WHERE tg_id=? AND COALESCE(status,'pending') NOT IN ('blocked','deleted') LIMIT 1");
  $st->execute([$tgId]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_select_manager(array $bot, ?array $campaign=null): int {
  $pdo = db();
  $candidate = (int)($campaign['default_manager_id'] ?? 0);
  if ($candidate > 0 && leadbot_is_manager_active($candidate)) return $candidate;
  $candidate = (int)($bot['default_manager_id'] ?? 0);
  if ($candidate > 0 && leadbot_is_manager_active($candidate)) return $candidate;

  $sql = "SELECT m.id, COUNT(l.id) c
          FROM managers m
          LEFT JOIN leads l ON l.assigned_manager_id = m.id AND l.status NOT IN ('converted','rejected','not_interested')
          WHERE COALESCE(m.status,'pending') NOT IN ('blocked','deleted')
          GROUP BY m.id
          ORDER BY c ASC, m.id ASC";
  $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
  return (int)($rows[0]['id'] ?? 0);
}

function leadbot_bot_api(array $bot, string $method, array $payload): array {
  $token = (string)($bot['bot_token'] ?? '');
  if ($token === '') {
    try { $token = crypto_decrypt((string)($bot['token_enc'] ?? '')); } catch (Throwable $e) { $token = ''; }
  }
  if ($token === '') return ['ok'=>false,'error'=>'bot_token_missing'];
  $url = 'https://api.telegram.org/bot' . $token . '/' . $method;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 15,
  ]);
  $res = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  if ($res === false) return ['ok'=>false,'error'=>$err];
  $j = json_decode((string)$res, true);
  return is_array($j) ? $j : ['ok'=>false,'error'=>'bad_json','raw'=>$res];
}

function leadbot_remove_keyboard(): array {
  return ['remove_keyboard' => true];
}

function leadbot_reply_keyboard(array $options, int $cols=2): array {
  $rows = [];
  $row = [];
  foreach ($options as $opt) {
    $row[] = ['text' => (string)$opt];
    if (count($row) >= $cols) { $rows[] = $row; $row = []; }
  }
  if ($row) $rows[] = $row;
  return [
    'keyboard' => $rows,
    'resize_keyboard' => true,
    'one_time_keyboard' => true,
  ];
}

function leadbot_send_message(array $bot, string $chatId, string $text, ?array $replyMarkup=null): array {
  $payload = [
    'chat_id' => $chatId,
    'text' => $text,
    'disable_web_page_preview' => true,
  ];
  if ($replyMarkup) $payload['reply_markup'] = $replyMarkup;
  return leadbot_bot_api($bot, 'sendMessage', $payload);
}

function leadbot_answer_callback(array $bot, string $callbackId, string $text=''): void {
  leadbot_bot_api($bot, 'answerCallbackQuery', ['callback_query_id'=>$callbackId, 'text'=>$text]);
}

function leadbot_edit_message_reply_markup(array $bot, string $chatId, string $messageId, ?array $replyMarkup=null): void {
  $payload = ['chat_id'=>$chatId, 'message_id'=>(int)$messageId];
  $payload['reply_markup'] = $replyMarkup ?: ['inline_keyboard'=>[]];
  leadbot_bot_api($bot, 'editMessageReplyMarkup', $payload);
}

function leadbot_inline_keyboard_new_lead(int $leadId): array {
  return ['inline_keyboard' => [
    [
      ['text' => 'رد داخل البوت', 'callback_data' => 'ld:r:' . $leadId],
      ['text' => 'تم التواصل', 'callback_data' => 'ld:s:' . $leadId . ':contacted'],
    ],
    [
      ['text' => 'مؤهل', 'callback_data' => 'ld:s:' . $leadId . ':qualified'],
      ['text' => 'تحويل', 'callback_data' => 'ld:s:' . $leadId . ':converted'],
    ],
    [
      ['text' => 'بارد', 'callback_data' => 'ld:t:' . $leadId . ':cold'],
      ['text' => 'دافئ', 'callback_data' => 'ld:t:' . $leadId . ':warm'],
      ['text' => 'حار', 'callback_data' => 'ld:t:' . $leadId . ':hot'],
    ],
    [
      ['text' => 'متابعة +1 يوم', 'callback_data' => 'ld:f:' . $leadId . ':1'],
      ['text' => 'متابعة +3 أيام', 'callback_data' => 'ld:f:' . $leadId . ':3'],
    ],
  ]];
}

function leadbot_state_get(int $botId, string $chatId, string $role='lead'): ?array {
  $st = db()->prepare('SELECT * FROM leadbot_states WHERE bot_id=? AND chat_id=? AND role=? LIMIT 1');
  $st->execute([$botId, $chatId, $role]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if (!$row) return null;
  $row['data'] = $row['data'] ? (json_decode((string)$row['data'], true) ?: []) : [];
  return $row;
}

function leadbot_state_set(int $botId, string $chatId, string $role, string $state, array $data=[]): void {
  $pdo = db();
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $now = leadbot_now();
  if (db_driver() === 'mysql') {
    $st = $pdo->prepare('INSERT INTO leadbot_states(bot_id,chat_id,role,state,data,updated_at) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE state=VALUES(state), data=VALUES(data), updated_at=VALUES(updated_at)');
    $st->execute([$botId, $chatId, $role, $state, $json, $now]);
  } else {
    $st = $pdo->prepare('INSERT INTO leadbot_states(bot_id,chat_id,role,state,data,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(bot_id,chat_id,role) DO UPDATE SET state=excluded.state, data=excluded.data, updated_at=excluded.updated_at');
    $st->execute([$botId, $chatId, $role, $state, $json, $now]);
  }
}

function leadbot_state_clear(int $botId, string $chatId, string $role='lead'): void {
  $st = db()->prepare('DELETE FROM leadbot_states WHERE bot_id=? AND chat_id=? AND role=?');
  $st->execute([$botId, $chatId, $role]);
}

function leadbot_validate_phone(string $phone): bool {
  $phone = preg_replace('/\s+/', '', trim($phone));
  return (bool)preg_match('/^\+[0-9]{7,20}$/', $phone);
}

function leadbot_score_from_answers(array $answers): array {
  $score = 0;
  $cap = (string)($answers['capital_range'] ?? '');
  $exp = (string)($answers['experience_level'] ?? '');
  $interest = (string)($answers['interest_area'] ?? '');

  if (str_contains($cap, '10,000') || str_contains($cap, '10.000') || str_contains($cap, 'أكثر')) $score += 80;
  elseif (str_contains($cap, '5,000') || str_contains($cap, '5.000')) $score += 65;
  elseif (str_contains($cap, '1,000') || str_contains($cap, '1.000')) $score += 45;
  elseif (str_contains($cap, '500')) $score += 25;
  else $score += 10;

  if ($exp === 'محترف') $score += 20;
  elseif ($exp === 'متوسط') $score += 12;
  else $score += 5;

  if ($interest === 'أحتاج استشارة من مدير حساب') $score += 10;
  elseif ($interest === 'الباقات الاستثمارية') $score += 12;
  else $score += 8;

  $age = (int)($answers['age'] ?? 0);
  if ($age >= 25 && $age <= 55) $score += 5;

  $score = max(0, min(100, $score));
  $temperature = $score >= 80 ? 'hot' : ($score >= 45 ? 'warm' : 'cold');
  return ['score'=>$score, 'temperature'=>$temperature];
}

function leadbot_log_event(int $leadId, string $actorType, string $actorId, string $eventType, array $payload=[]): void {
  $st = db()->prepare('INSERT INTO lead_events(lead_id,actor_type,actor_id,event_type,payload_json,created_at) VALUES (?,?,?,?,?,?)');
  $st->execute([$leadId, $actorType, $actorId, $eventType, json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), leadbot_now()]);
}

function leadbot_log_message(int $leadId, int $botId, string $senderType, string $senderId, string $direction, string $content, string $msgType='text'): void {
  $st = db()->prepare('INSERT INTO lead_messages(lead_id,bot_id,sender_type,sender_id,direction,msg_type,content,created_at) VALUES (?,?,?,?,?,?,?,?)');
  $st->execute([$leadId, $botId, $senderType, $senderId, $direction, $msgType, $content, leadbot_now()]);
}

function leadbot_find_duplicate(int $botId, string $tgUserId, string $phone=''): ?array {
  $pdo = db();
  $st = $pdo->prepare('SELECT * FROM leads WHERE bot_id=? AND tg_user_id=? ORDER BY id DESC LIMIT 1');
  $st->execute([$botId, $tgUserId]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if ($row) return $row;
  if ($phone !== '') {
    $st = $pdo->prepare('SELECT * FROM leads WHERE bot_id=? AND phone=? ORDER BY id DESC LIMIT 1');
    $st->execute([$botId, $phone]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row) return $row;
  }
  return null;
}

function leadbot_create_or_update_lead(array $bot, array $answers, ?array $campaign, array $user): array {
  $pdo = db();
  $now = leadbot_now();
  $botId = (int)$bot['id'];
  $campaignId = (int)($campaign['id'] ?? 0) ?: null;
  $score = leadbot_score_from_answers($answers);
  $managerId = leadbot_select_manager($bot, $campaign);
  $followHours = max(1, (int)leadbot_setting('leadbot.followup.default_hours', '24'));
  $dup = leadbot_find_duplicate($botId, (string)$user['id'], (string)($answers['phone'] ?? ''));

  if ($dup) {
    $leadId = (int)$dup['id'];
    $newDup = (int)($dup['duplicate_count'] ?? 0) + 1;
    $st = $pdo->prepare('UPDATE leads SET campaign_id=?, source_code=?, tg_chat_id=?, tg_username=?, full_name=?, phone=?, country=?, age=?, experience_level=?, interest_area=?, capital_range=?, contact_time=?, status=?, lead_score=?, temperature=?, assigned_manager_id=?, duplicate_count=?, assigned_at=?, next_follow_up_at=?, updated_at=? WHERE id=?');
    $st->execute([
      $campaignId,
      (string)($campaign['source_code'] ?? ($answers['source_code'] ?? '')),
      (string)($user['chat_id'] ?? ''),
      (string)($user['username'] ?? ''),
      (string)($answers['full_name'] ?? ''),
      (string)($answers['phone'] ?? ''),
      (string)($answers['country'] ?? ''),
      (int)($answers['age'] ?? 0),
      (string)($answers['experience_level'] ?? ''),
      (string)($answers['interest_area'] ?? ''),
      (string)($answers['capital_range'] ?? ''),
      (string)($answers['contact_time'] ?? ''),
      'assigned',
      (int)$score['score'],
      (string)$score['temperature'],
      $managerId ?: null,
      $newDup,
      $managerId > 0 ? $now : null,
      $now + ($followHours * 3600),
      $now,
      $leadId,
    ]);
    leadbot_log_event($leadId, 'system', '0', 'lead_updated_duplicate', ['duplicate_count'=>$newDup]);
  } else {
    $st = $pdo->prepare('INSERT INTO leads(bot_id,campaign_id,source_code,tg_user_id,tg_chat_id,tg_username,full_name,phone,country,age,experience_level,interest_area,capital_range,contact_time,status,lead_score,temperature,assigned_manager_id,assigned_at,next_follow_up_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $st->execute([
      $botId,
      $campaignId,
      (string)($campaign['source_code'] ?? ($answers['source_code'] ?? '')),
      (string)$user['id'],
      (string)($user['chat_id'] ?? ''),
      (string)($user['username'] ?? ''),
      (string)($answers['full_name'] ?? ''),
      (string)($answers['phone'] ?? ''),
      (string)($answers['country'] ?? ''),
      (int)($answers['age'] ?? 0),
      (string)($answers['experience_level'] ?? ''),
      (string)($answers['interest_area'] ?? ''),
      (string)($answers['capital_range'] ?? ''),
      (string)($answers['contact_time'] ?? ''),
      $managerId > 0 ? 'assigned' : 'new',
      (int)$score['score'],
      (string)$score['temperature'],
      $managerId ?: null,
      $managerId > 0 ? $now : null,
      $now + ($followHours * 3600),
      $now,
      $now,
    ]);
    $leadId = (int)$pdo->lastInsertId();
    leadbot_log_event($leadId, 'system', '0', 'lead_created', ['source_code'=>(string)($campaign['source_code'] ?? ($answers['source_code'] ?? ''))]);
  }

  $st = $pdo->prepare('SELECT * FROM leads WHERE id=? LIMIT 1');
  $st->execute([$leadId]);
  $lead = $st->fetch(PDO::FETCH_ASSOC) ?: ['id'=>$leadId];
  return $lead;
}

function leadbot_compose_lead_summary(array $lead, array $bot, ?array $campaign=null): string {
  $tempMap = ['hot'=>'🔥 حار','warm'=>'🟡 دافئ','cold'=>'🔵 بارد'];
  $source = trim((string)($lead['source_code'] ?? ''));
  $campaignName = trim((string)($campaign['name'] ?? ''));
  $username = trim((string)($lead['tg_username'] ?? ''));
  $tgLine = $username !== '' ? ('@' . ltrim($username, '@')) : '—';
  $text = "📥 Lead جديد\n";
  $text .= "• الاسم: " . ((string)($lead['full_name'] ?? '—')) . "\n";
  $text .= "• الهاتف: " . ((string)($lead['phone'] ?? '—')) . "\n";
  $text .= "• تيليجرام: " . $tgLine . "\n";
  $text .= "• Telegram ID: " . ((string)($lead['tg_user_id'] ?? '—')) . "\n";
  $text .= "• البلد: " . ((string)($lead['country'] ?? '—')) . "\n";
  $text .= "• العمر: " . ((string)($lead['age'] ?? '—')) . "\n";
  $text .= "• الخبرة: " . ((string)($lead['experience_level'] ?? '—')) . "\n";
  $text .= "• الاهتمام: " . ((string)($lead['interest_area'] ?? '—')) . "\n";
  $text .= "• رأس المال: " . ((string)($lead['capital_range'] ?? '—')) . "\n";
  $text .= "• وقت التواصل: " . ((string)($lead['contact_time'] ?? '—')) . "\n";
  $text .= "• التقييم: " . (int)($lead['lead_score'] ?? 0) . "/100 - " . ($tempMap[(string)($lead['temperature'] ?? 'cold')] ?? '🔵 بارد') . "\n";
  if ($campaignName !== '') $text .= "• الحملة: {$campaignName}\n";
  if ($source !== '') $text .= "• المصدر: {$source}\n";
  if (!empty($lead['duplicate_count'])) $text .= "• مرات التكرار: " . (int)$lead['duplicate_count'] . "\n";
  $text .= "\nللتواصل خارج البوت استخدم رقم الهاتف أو يوزرنيم تيليجرام إن وجد.";
  return $text;
}

function leadbot_notify_new_lead(array $bot, array $lead): void {
  $campaign = !empty($lead['campaign_id']) ? leadbot_get_campaign_by_id((int)$lead['campaign_id']) : null;
  $summary = leadbot_compose_lead_summary($lead, $bot, $campaign);
  $keyboard = leadbot_inline_keyboard_new_lead((int)$lead['id']);
  $owner = trim((string)($bot['owner_chat_id'] ?? ''));
  if ($owner !== '') leadbot_send_message($bot, $owner, $summary, $keyboard);
  $mid = (int)($lead['assigned_manager_id'] ?? 0);
  if ($mid > 0) {
    $manager = leadbot_get_manager($mid);
    if ($manager && !empty($manager['tg_id'])) {
      leadbot_send_message($bot, (string)$manager['tg_id'], $summary, $keyboard);
    }
  }
}

function leadbot_get_campaign_by_id(int $id): ?array {
  $st = db()->prepare('SELECT * FROM lead_campaigns WHERE id=? LIMIT 1');
  $st->execute([$id]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_get_lead(int $id): ?array {
  $st = db()->prepare('SELECT * FROM leads WHERE id=? LIMIT 1');
  $st->execute([$id]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_get_manager(int $id): ?array {
  $st = db()->prepare('SELECT * FROM managers WHERE id=? LIMIT 1');
  $st->execute([$id]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_update_lead_status(int $leadId, string $status, string $actorType='system', string $actorId='0'): void {
  $now = leadbot_now();
  $fields = ['status'=>$status,'updated_at'=>$now];
  if ($status === 'contacted') $fields['contacted_at'] = $now;
  if ($status === 'converted') $fields['converted_at'] = $now;
  $sets = [];
  $vals = [];
  foreach ($fields as $k=>$v) { $sets[] = $k . '=?'; $vals[] = $v; }
  $vals[] = $leadId;
  $st = db()->prepare('UPDATE leads SET ' . implode(',', $sets) . ' WHERE id=?');
  $st->execute($vals);
  leadbot_log_event($leadId, $actorType, $actorId, 'status_changed', ['status'=>$status]);
}

function leadbot_update_lead_temperature(int $leadId, string $temperature, string $actorType='system', string $actorId='0'): void {
  $st = db()->prepare('UPDATE leads SET temperature=?, updated_at=? WHERE id=?');
  $st->execute([$temperature, leadbot_now(), $leadId]);
  leadbot_log_event($leadId, $actorType, $actorId, 'temperature_changed', ['temperature'=>$temperature]);
}

function leadbot_schedule_followup(int $leadId, int $days, string $actorType='system', string $actorId='0'): void {
  $ts = leadbot_now() + max(1, $days) * 86400;
  $st = db()->prepare('UPDATE leads SET next_follow_up_at=?, updated_at=? WHERE id=?');
  $st->execute([$ts, leadbot_now(), $leadId]);
  leadbot_log_event($leadId, $actorType, $actorId, 'followup_scheduled', ['days'=>$days,'at'=>$ts]);
}

function leadbot_set_assigned_manager(int $leadId, int $managerId, string $actorType='system', string $actorId='0'): void {
  $now = leadbot_now();
  $st = db()->prepare('UPDATE leads SET assigned_manager_id=?, assigned_at=?, status=?, updated_at=? WHERE id=?');
  $st->execute([$managerId ?: null, $managerId > 0 ? $now : null, $managerId > 0 ? 'assigned' : 'new', $now, $leadId]);
  leadbot_log_event($leadId, $actorType, $actorId, 'manager_assigned', ['manager_id'=>$managerId]);
}

function leadbot_active_lead_by_user(int $botId, string $tgUserId): ?array {
  $st = db()->prepare("SELECT * FROM leads WHERE bot_id=? AND tg_user_id=? ORDER BY id DESC LIMIT 1");
  $st->execute([$botId, $tgUserId]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function leadbot_forward_user_message(array $bot, array $lead, string $text): void {
  $clean = trim($text);
  if ($clean === '') return;
  leadbot_log_message((int)$lead['id'], (int)$bot['id'], 'lead', (string)$lead['tg_user_id'], 'inbound', $clean);
  $st = db()->prepare('UPDATE leads SET last_user_reply_at=?, updated_at=? WHERE id=?');
  $st->execute([leadbot_now(), leadbot_now(), (int)$lead['id']]);

  $prefix = "💬 رسالة جديدة من العميل #" . (int)$lead['id'] . "\n";
  $prefix .= "الاسم: " . (string)($lead['full_name'] ?? '—') . "\n";
  $prefix .= "النص:\n" . $clean;
  $keyboard = leadbot_inline_keyboard_new_lead((int)$lead['id']);
  $owner = trim((string)($bot['owner_chat_id'] ?? ''));
  if ($owner !== '') leadbot_send_message($bot, $owner, $prefix, $keyboard);
  $mid = (int)($lead['assigned_manager_id'] ?? 0);
  if ($mid > 0) {
    $manager = leadbot_get_manager($mid);
    if ($manager && !empty($manager['tg_id'])) leadbot_send_message($bot, (string)$manager['tg_id'], $prefix, $keyboard);
  }
}

function leadbot_send_manager_reply(array $bot, array $lead, string $senderType, string $senderId, string $text): array {
  $text = trim($text);
  if ($text === '') return ['ok'=>false,'error'=>'empty_reply'];
  $msg = "📨 رسالة من مدير الحساب\n\n" . $text;
  $res = leadbot_send_message($bot, (string)$lead['tg_chat_id'], $msg, leadbot_remove_keyboard());
  if (!empty($res['ok'])) {
    leadbot_log_message((int)$lead['id'], (int)$bot['id'], $senderType, $senderId, 'outbound', $text);
    $st = db()->prepare('UPDATE leads SET last_manager_reply_at=?, updated_at=?, status=? WHERE id=?');
    $st->execute([leadbot_now(), leadbot_now(), 'contacted', (int)$lead['id']]);
    leadbot_log_event((int)$lead['id'], $senderType, $senderId, 'manager_reply_sent', ['text'=>$text]);
  }
  return $res;
}

function leadbot_handle_manager_callback(array $bot, array $cb): void {
  $fromId = (string)($cb['from']['id'] ?? '');
  $data = (string)($cb['data'] ?? '');
  $callbackId = (string)($cb['id'] ?? '');
  $messageChatId = (string)($cb['message']['chat']['id'] ?? $fromId);
  $messageId = (string)($cb['message']['message_id'] ?? '0');
  $manager = leadbot_find_manager_by_tg($fromId);
  $isOwner = $fromId !== '' && $fromId === (string)($bot['owner_chat_id'] ?? '');
  if (!$manager && !$isOwner) {
    leadbot_answer_callback($bot, $callbackId, 'غير مصرح');
    return;
  }
  $actorType = $isOwner ? 'owner' : 'manager';
  $actorId = $isOwner ? $fromId : (string)($manager['id'] ?? '0');

  if ($data === 'lead:start') {
    leadbot_answer_callback($bot, $callbackId);
    return;
  }
  if (!preg_match('/^ld:([rstf]):(\d+)(?::([^\s]+))?$/', $data, $m)) {
    leadbot_answer_callback($bot, $callbackId);
    return;
  }
  $kind = $m[1];
  $leadId = (int)$m[2];
  $extra = (string)($m[3] ?? '');
  $lead = leadbot_get_lead($leadId);
  if (!$lead) { leadbot_answer_callback($bot, $callbackId, 'الـ lead غير موجود'); return; }

  if ($kind === 'r') {
    leadbot_state_set((int)$bot['id'], $fromId, 'manager', 'awaiting_reply', ['lead_id'=>$leadId, 'actor_type'=>$actorType, 'actor_id'=>$actorId]);
    leadbot_answer_callback($bot, $callbackId, 'اكتب الآن رسالتك للعميل');
    leadbot_send_message($bot, $messageChatId, 'اكتب الآن الرسالة التي تريد إرسالها للعميل.\nللإلغاء أرسل /cancel');
    return;
  }
  if ($kind === 's') {
    $allowed = ['new','assigned','contacted','qualified','follow_up','converted','not_interested','rejected'];
    if (!in_array($extra, $allowed, true)) $extra = 'contacted';
    leadbot_update_lead_status($leadId, $extra, $actorType, $actorId);
    leadbot_answer_callback($bot, $callbackId, 'تم تحديث الحالة');
    return;
  }
  if ($kind === 't') {
    if (!in_array($extra, ['cold','warm','hot'], true)) $extra = 'warm';
    leadbot_update_lead_temperature($leadId, $extra, $actorType, $actorId);
    leadbot_answer_callback($bot, $callbackId, 'تم تحديث الحرارة');
    return;
  }
  if ($kind === 'f') {
    $days = max(1, (int)$extra);
    leadbot_schedule_followup($leadId, $days, $actorType, $actorId);
    leadbot_update_lead_status($leadId, 'follow_up', $actorType, $actorId);
    leadbot_answer_callback($bot, $callbackId, 'تم جدولة المتابعة');
    return;
  }
}

function leadbot_start_user_flow(array $bot, array $message, string $sourceCode=''): void {
  $chatId = (string)($message['chat']['id'] ?? '');
  $userId = (string)($message['from']['id'] ?? '');
  $texts = leadbot_flow_texts($bot);
  $data = [
    'source_code' => $sourceCode,
    'user_id' => $userId,
    'chat_id' => $chatId,
    'username' => (string)($message['from']['username'] ?? ''),
  ];
  leadbot_state_set((int)$bot['id'], $chatId, 'lead', 'welcome', $data);
  $keyboard = ['inline_keyboard' => [ [ ['text'=>$texts['welcome_button'], 'callback_data'=>'lead:start'] ] ]];
  leadbot_send_message($bot, $chatId, $texts['welcome_text'], $keyboard);
}

function leadbot_advance_question(array $bot, string $chatId, array $state, string $nextState): void {
  $texts = leadbot_flow_texts($bot);
  $msg = '';
  $keyboard = null;
  switch ($nextState) {
    case 'awaiting_name': $msg = $texts['ask_name']; $keyboard = leadbot_remove_keyboard(); break;
    case 'awaiting_phone': $msg = $texts['ask_phone']; $keyboard = leadbot_remove_keyboard(); break;
    case 'awaiting_country': $msg = $texts['ask_country']; $keyboard = leadbot_reply_keyboard(leadbot_default_country_options(), 2); break;
    case 'awaiting_age': $msg = $texts['ask_age']; $keyboard = leadbot_remove_keyboard(); break;
    case 'awaiting_experience': $msg = $texts['ask_experience']; $keyboard = leadbot_reply_keyboard(leadbot_default_experience_options(), 2); break;
    case 'awaiting_interest': $msg = $texts['ask_interest']; $keyboard = leadbot_reply_keyboard(leadbot_default_interest_options(), 2); break;
    case 'awaiting_capital': $msg = $texts['ask_capital']; $keyboard = leadbot_reply_keyboard(leadbot_default_capital_options(), 1); break;
    case 'awaiting_contact_time': $msg = $texts['ask_contact_time']; $keyboard = leadbot_remove_keyboard(); break;
    default: $msg = ''; break;
  }
  leadbot_state_set((int)$bot['id'], $chatId, 'lead', $nextState, $state['data'] ?? []);
  if ($msg !== '') leadbot_send_message($bot, $chatId, $msg, $keyboard);
}

function leadbot_handle_lead_text(array $bot, array $message): void {
  $chatId = (string)($message['chat']['id'] ?? '');
  $userId = (string)($message['from']['id'] ?? '');
  $text = trim((string)($message['text'] ?? $message['caption'] ?? ''));
  if ($chatId === '') return;
  $state = leadbot_state_get((int)$bot['id'], $chatId, 'lead');

  if (!$state) {
    $lead = leadbot_active_lead_by_user((int)$bot['id'], $userId);
    if ($lead && $text !== '' && !str_starts_with($text, '/start')) {
      leadbot_forward_user_message($bot, $lead, $text);
      leadbot_send_message($bot, $chatId, 'تم استلام رسالتك، وسيتم الرد عليك في أقرب وقت.');
      return;
    }
    $source = '';
    if (preg_match('/^\/start(?:\s+(.+))?$/u', $text, $m)) $source = trim((string)($m[1] ?? ''));
    leadbot_start_user_flow($bot, $message, $source);
    return;
  }

  $data = is_array($state['data'] ?? null) ? $state['data'] : [];
  $texts = leadbot_flow_texts($bot);
  switch ((string)$state['state']) {
    case 'welcome':
      if (preg_match('/^\/start(?:\s+(.+))?$/u', $text, $m)) {
        $data['source_code'] = trim((string)($m[1] ?? ($data['source_code'] ?? '')));
      }
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_name');
      return;
    case 'awaiting_name':
      $data['full_name'] = $text;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_phone');
      return;
    case 'awaiting_phone':
      if (!leadbot_validate_phone($text)) {
        leadbot_send_message($bot, $chatId, $texts['invalid_phone']);
        return;
      }
      $data['phone'] = preg_replace('/\s+/', '', $text);
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_country');
      return;
    case 'awaiting_country':
      $data['country'] = $text;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_age');
      return;
    case 'awaiting_age':
      $age = (int)preg_replace('/\D+/', '', $text);
      if ($age <= 0) {
        leadbot_send_message($bot, $chatId, $texts['invalid_age']);
        return;
      }
      $data['age'] = $age;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_experience');
      return;
    case 'awaiting_experience':
      $data['experience_level'] = $text;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_interest');
      return;
    case 'awaiting_interest':
      $data['interest_area'] = $text;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_capital');
      return;
    case 'awaiting_capital':
      $data['capital_range'] = $text;
      leadbot_advance_question($bot, $chatId, ['data'=>$data], 'awaiting_contact_time');
      return;
    case 'awaiting_contact_time':
      $data['contact_time'] = $text;
      $campaign = leadbot_get_campaign_by_source((string)($data['source_code'] ?? ''));
      $lead = leadbot_create_or_update_lead($bot, $data, $campaign, [
        'id' => $userId,
        'chat_id' => $chatId,
        'username' => (string)($message['from']['username'] ?? ''),
      ]);
      leadbot_notify_new_lead($bot, $lead);
      leadbot_state_clear((int)$bot['id'], $chatId, 'lead');
      leadbot_send_message($bot, $chatId, $texts['finish_text'], leadbot_remove_keyboard());
      return;
    default:
      leadbot_state_clear((int)$bot['id'], $chatId, 'lead');
      leadbot_start_user_flow($bot, $message, (string)($data['source_code'] ?? ''));
      return;
  }
}

function leadbot_handle_manager_message(array $bot, array $message): bool {
  $fromId = (string)($message['from']['id'] ?? '');
  $chatId = (string)($message['chat']['id'] ?? $fromId);
  $text = trim((string)($message['text'] ?? $message['caption'] ?? ''));
  $manager = leadbot_find_manager_by_tg($fromId);
  $isOwner = $fromId !== '' && $fromId === (string)($bot['owner_chat_id'] ?? '');
  if (!$manager && !$isOwner) return false;

  if ($text === '/cancel') {
    leadbot_state_clear((int)$bot['id'], $chatId, 'manager');
    leadbot_send_message($bot, $chatId, 'تم الإلغاء.');
    return true;
  }
  if ($text === '/start') {
    leadbot_send_message($bot, $chatId, 'أهلاً بك. عند وصول Lead جديد ستصلك البيانات هنا مع أزرار الإدارة والرد.');
    return true;
  }

  $state = leadbot_state_get((int)$bot['id'], $chatId, 'manager');
  if (!$state || (string)$state['state'] !== 'awaiting_reply') return true;
  $data = is_array($state['data'] ?? null) ? $state['data'] : [];
  $lead = leadbot_get_lead((int)($data['lead_id'] ?? 0));
  if (!$lead) {
    leadbot_state_clear((int)$bot['id'], $chatId, 'manager');
    leadbot_send_message($bot, $chatId, 'الـ lead غير موجود.');
    return true;
  }
  $actorType = (string)($data['actor_type'] ?? ($isOwner ? 'owner' : 'manager'));
  $actorId = (string)($data['actor_id'] ?? ($isOwner ? $fromId : (string)($manager['id'] ?? '0')));
  $res = leadbot_send_manager_reply($bot, $lead, $actorType, $actorId, $text);
  if (!empty($res['ok'])) {
    leadbot_send_message($bot, $chatId, 'تم إرسال الرسالة للعميل ✅');
  } else {
    leadbot_send_message($bot, $chatId, 'تعذر إرسال الرسالة للعميل.');
  }
  leadbot_state_clear((int)$bot['id'], $chatId, 'manager');
  return true;
}

function leadbot_handle_update(array $bot, array $update): void {
  if (!empty($update['callback_query']) && is_array($update['callback_query'])) {
    $cb = $update['callback_query'];
    $fromId = (string)($cb['from']['id'] ?? '');
    $messageChatId = (string)($cb['message']['chat']['id'] ?? $fromId);
    $data = (string)($cb['data'] ?? '');
    if ($data === 'lead:start') {
      $state = leadbot_state_get((int)$bot['id'], $messageChatId, 'lead');
      $currentData = is_array($state['data'] ?? null) ? $state['data'] : [];
      leadbot_answer_callback($bot, (string)($cb['id'] ?? ''));
      leadbot_advance_question($bot, $messageChatId, ['data'=>$currentData], 'awaiting_name');
      return;
    }
    leadbot_handle_manager_callback($bot, $cb);
    return;
  }

  if (!empty($update['message']) && is_array($update['message'])) {
    $message = $update['message'];
    if (leadbot_handle_manager_message($bot, $message)) return;
    leadbot_handle_lead_text($bot, $message);
  }
}

function leadbot_run_followup_reminders(int $limit=50): array {
  $pdo = db();
  $now = leadbot_now();
  $sql = "SELECT l.*, b.name as bot_name, b.owner_chat_id, b.token_enc
          FROM leads l
          JOIN lead_bots b ON b.id=l.bot_id
          WHERE l.next_follow_up_at IS NOT NULL
            AND l.next_follow_up_at > 0
            AND l.next_follow_up_at <= ?
            AND COALESCE(l.status,'new') IN ('assigned','contacted','qualified','follow_up')
            AND (l.last_reminder_at IS NULL OR l.last_reminder_at < ?)
          ORDER BY l.next_follow_up_at ASC
          LIMIT " . (int)$limit;
  $st = $pdo->prepare($sql);
  $st->execute([$now, $now - 3600]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  $sent = 0;
  foreach ($rows as $lead) {
    $bot = $lead;
    try { $bot['bot_token'] = crypto_decrypt((string)$lead['token_enc']); } catch (Throwable $e) { $bot['bot_token'] = ''; }
    $text = "⏰ تذكير متابعة\n" . leadbot_compose_lead_summary($lead, $bot, !empty($lead['campaign_id']) ? leadbot_get_campaign_by_id((int)$lead['campaign_id']) : null);
    $keyboard = leadbot_inline_keyboard_new_lead((int)$lead['id']);
    $owner = trim((string)($lead['owner_chat_id'] ?? ''));
    if ($owner !== '') { leadbot_send_message($bot, $owner, $text, $keyboard); $sent++; }
    $mid = (int)($lead['assigned_manager_id'] ?? 0);
    if ($mid > 0) {
      $mgr = leadbot_get_manager($mid);
      if ($mgr && !empty($mgr['tg_id'])) { leadbot_send_message($bot, (string)$mgr['tg_id'], $text, $keyboard); $sent++; }
    }
    $up = $pdo->prepare('UPDATE leads SET last_reminder_at=?, updated_at=? WHERE id=?');
    $up->execute([$now, $now, (int)$lead['id']]);
    leadbot_log_event((int)$lead['id'], 'system', '0', 'followup_reminder_sent', []);
  }
  return ['ok'=>true, 'leads'=>count($rows), 'messages_sent'=>$sent];
}
