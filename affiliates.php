<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/settings.php';

/**
 * Affiliates / Managers (Marketers) helper layer.
 * - managers: TG users who can manage their referred clients
 * - manager_invites: invite codes
 * - users.manager_id: first-touch binding
 */

function aff_admin_ids(): array {
  $raw = (string)env('AFF_ADMIN_CHAT_IDS', env('BOT_ADMIN_CHAT_IDS', ''));
  $ids = [];
  foreach (preg_split('/[\s,]+/', trim($raw)) as $p) {
    if ($p === '') continue;
    if (ctype_digit($p)) $ids[] = (int)$p;
  }
  return array_values(array_unique(array_filter($ids, fn($x)=>$x>0)));
}

function aff_is_admin_chat(int $chatId): bool {
  $ids = aff_admin_ids();
  return in_array((int)$chatId, $ids, true);
}

function aff_admin_lang(): string {
  $l = strtolower(trim((string)(env('AFF_ADMIN_LANG', '') ?: '')));
  if ($l === '') $l = strtolower(trim((string)setting_get('aff.admin.lang', 'ar')));
  return in_array($l, ['en','ar','ru'], true) ? $l : 'ar';
}

function aff_manager_by_tg(int $tgId): ?array {
  if ($tgId <= 0) return null;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT * FROM managers WHERE tg_id=? LIMIT 1');
    $st->execute([(string)$tgId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
  } catch (Throwable $e) {
    return null;
  }
}

function aff_manager_by_id(int $id): ?array {
  if ($id <= 0) return null;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT * FROM managers WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
  } catch (Throwable $e) {
    return null;
  }
}

function aff_manager_ensure(int $tgId, array $tgUser, string $status = 'pending'): array {
  $tgId = (int)$tgId;
  $pdo = db();
  $username = (string)($tgUser['username'] ?? '');
  $first = (string)($tgUser['first_name'] ?? '');
  $last  = (string)($tgUser['last_name'] ?? '');
  $now = time();

  $existing = aff_manager_by_tg($tgId);
  if ($existing) {
    // Best-effort update profile
    try {
      $pdo->prepare('UPDATE managers SET username=?, first_name=?, last_name=?, updated_at=? WHERE id=?')
          ->execute([$username, $first, $last, $now, (int)$existing['id']]);
    } catch (Throwable $e) {}
    return aff_manager_by_tg($tgId) ?: $existing;
  }

  $newId = 0;
  try {
    if (db_driver() === 'sqlite') {
      $pdo->prepare('INSERT INTO managers(tg_id,username,first_name,last_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
          ->execute([(string)$tgId, $username, $first, $last, $status, $now, $now]);
    } else {
      $pdo->prepare('INSERT INTO managers(tg_id,username,first_name,last_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
          ->execute([(string)$tgId, $username, $first, $last, $status, $now, $now]);
    }
    try { $newId = (int)$pdo->lastInsertId(); } catch (Throwable $e2) { $newId = 0; }
  } catch (Throwable $e) {
    // ignore
  }

  // Notify super admins about a NEW manager request (best-effort; only on first creation).
  try {
    if (strtolower($status) === 'pending' && !in_array($tgId, aff_admin_chat_ids(), true)) {
      if ($newId <= 0) {
        $row0 = aff_manager_by_tg($tgId);
        $newId = (int)($row0['id'] ?? 0);
      }
      if ($newId > 0) aff_notify_admin_new_manager($newId, $tgId, $username, $first, $last);
    }
  } catch (Throwable $e) {
    // ignore
  }

  return aff_manager_by_tg($tgId) ?: [
    'id'=>0,
    'tg_id'=>(string)$tgId,
    'username'=>$username,
    'first_name'=>$first,
    'last_name'=>$last,
    'status'=>$status,
  ];
}

// Notify the main admins in mexaff_bot when a NEW manager request is created.
// Uses the affiliate bot token so the buttons work inside the affiliate bot chat.
function aff_notify_admin_new_manager(int $managerId, int $tgId, string $username='', string $first='', string $last=''): void {
  $admins = aff_admin_chat_ids();
  if (!$admins) return;
  $token = aff_bot_token();
  if ($token === '') return;

  $name = trim(trim($first).' '.trim($last));
  if ($name === '') $name = '—';
  $u = trim($username);
  if ($u !== '' && $u[0] !== '@') $u = '@'.$u;

    $lang = aff_admin_lang();

  $defaultTpl = ($lang==='ar')
    ? "🆕 طلب مسوّق جديد\n\nID: {id}\nName: {name}\nUsername: {username}\nTG: {tg}\n\nاختر الإجراء:"
    : (($lang==='ru')
      ? "🆕 Новый запрос маркетолога\n\nID: {id}\nИмя: {name}\nUsername: {username}\nTG: {tg}\n\nВыберите действие:"
      : "🆕 New manager request\n\nID: {id}\nName: {name}\nUsername: {username}\nTG: {tg}\n\nApprove or block:");

  $tpl = trim((string)setting_get('aff.admin.new_manager.'.$lang, ''));
  if ($tpl === '') $tpl = $defaultTpl;
  $txt = strtr($tpl, [
    '{id}' => (string)$managerId,
    '{name}' => htmlspecialchars($name, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8'),
    '{username}' => htmlspecialchars($u ?: '—', ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8'),
    '{tg}' => (string)$tgId,
  ]);

  $btnApprove = trim((string)setting_get('aff.admin.btn_approve.'.$lang, ''));
  $btnBlock   = trim((string)setting_get('aff.admin.btn_block.'.$lang, ''));
  if ($btnApprove === '') $btnApprove = ($lang==='ar')?'✅ موافقة':(($lang==='ru')?'✅ Одобрить':'✅ Approve');
  if ($btnBlock === '') $btnBlock = ($lang==='ar')?'⛔ حظر':(($lang==='ru')?'⛔ Заблокировать':'⛔ Block');

  $kb = [[
    ['text' => $btnApprove, 'callback_data' => 'adm:appr:'.$managerId],
    ['text' => $btnBlock,   'callback_data' => 'adm:block:'.$managerId],
  ]];

  foreach ($admins as $chatId) {
    try {
      aff_tg_api('sendMessage', [
        'chat_id' => (int)$chatId,
        'text' => $txt,
        'parse_mode' => 'HTML',
        'reply_markup' => ['inline_keyboard' => $kb],
      ], $token);
    } catch (Throwable $e) {
      // ignore
    }
  }
}

function aff_manager_set_status(int $managerId, string $status): void {
  $status = strtolower(trim($status));
  if (!in_array($status, ['pending','active','blocked'], true)) $status = 'pending';
  $pdo = db();
  $now = time();
  try {
    $pdo->prepare('UPDATE managers SET status=?, approved_at=CASE WHEN ?="active" THEN ? ELSE approved_at END, updated_at=? WHERE id=?')
        ->execute([$status, $status, $now, $now, $managerId]);
  } catch (Throwable $e) {}
}

function aff_random_code(int $len = 10): string {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz';
  $out = '';
  for ($i=0;$i<$len;$i++) {
    $out .= $alphabet[random_int(0, strlen($alphabet)-1)];
  }
  return $out;
}

function aff_invite_create(int $managerId): array {
  $pdo = db();
  $now = time();
  for ($i=0;$i<5;$i++) {
    $code = aff_random_code(12);
    try {
      $pdo->prepare('INSERT INTO manager_invites(manager_id,code,created_at) VALUES (?,?,?)')
          ->execute([$managerId, $code, $now]);
      $id = (int)$pdo->lastInsertId();
      return ['id'=>$id,'code'=>$code];
    } catch (Throwable $e) {
      // try again
    }
  }
  // fallback: pick latest
  try {
    $st = $pdo->prepare('SELECT id,code FROM manager_invites WHERE manager_id=? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1');
    $st->execute([$managerId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if ($r) return ['id'=>(int)$r['id'],'code'=>(string)$r['code']];
  } catch (Throwable $e) {}
  return ['id'=>0,'code'=>''];
}

function aff_invite_latest(int $managerId): ?array {
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT id,code FROM manager_invites WHERE manager_id=? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1');
    $st->execute([$managerId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
  } catch (Throwable $e) {
    return null;
  }
}

/** Detect bot username from token (cached by caller). */
function aff_detect_bot_username(string $token): string {
  $token = trim($token);
  if ($token === '') return '';
  $url = "https://api.telegram.org/bot{$token}/getMe";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 2,
    CURLOPT_TIMEOUT => 5,
  ]);
  $res = curl_exec($ch);
  curl_close($ch);
  $j = is_string($res) ? json_decode($res, true) : null;
  if (is_array($j) && ($j['ok'] ?? false) && isset($j['result']['username'])) {
    return (string)$j['result']['username'];
  }
  return '';
}

function aff_client_bot_username(): string {
  // IMPORTANT:
  // Affiliate invite MUST point to the MAIN Mini App bot (trading bot),
  // NOT the deposit/withdraw bot.
  // We therefore treat .env as authoritative and only use settings/auto-detect as fallback.

  // 1) Env preferred (explicit override)
  $envU = trim((string)env('MINIAPP_BOT_USERNAME', env('TELEGRAM_BOT_USERNAME', '')));
  if ($envU !== '') {
    // keep settings in sync (best effort)
    try {
      $cur = trim((string)setting_get('bot.username', ''));
      if ($cur === '' || strcasecmp($cur, $envU) !== 0) {
        setting_set('bot.username', ltrim($envU, '@'));
      }
    } catch (Throwable $e) {}
    return ltrim($envU, '@');
  }

  // 2) Stored setting (if present)
  $u = trim((string)setting_get('bot.username', ''));

  // 3) Auto-detect from MAIN bot token (and cache) if still empty
  if ($u === '') {
    $tok = trim((string)env('TELEGRAM_BOT_TOKEN', ''));
    if ($tok === '') $tok = trim((string)setting_get('bot.token', ''));
    if ($tok !== '') {
      $det = aff_detect_bot_username($tok);
      if ($det !== '') {
        $u = $det;
        try { setting_set('bot.username', $u); } catch (Throwable $e) {}
      }
    }
  }

  // 4) Last env fallbacks (do NOT prefer pay bot)
  if ($u === '') {
    $u = trim((string)env('BOT_USERNAME', env('CLIENT_BOT_USERNAME', '')));
  }
  if ($u === '') $u = 'Tradeoxplus_bot';
  return ltrim($u, '@');
}

function aff_invite_link(string $code): string {
  $bot = aff_client_bot_username();
  return 'https://t.me/' . $bot . '?start=aff_' . urlencode($code);
}

function aff_bind_user_by_code(int $userId, string $code, string $source = 'start'): array {
  $pdo = db();
  $code = trim($code);
  if ($userId<=0 || $code==='') return ['ok'=>false,'error'=>'invalid'];

  // already bound?
  try {
    $st = $pdo->prepare('SELECT manager_id FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $mid = (int)($st->fetchColumn() ?: 0);
    if ($mid > 0) return ['ok'=>true,'already'=>true,'manager_id'=>$mid];
  } catch (Throwable $e) {}

  // find invite
  $inv = null;
  try {
    $st = $pdo->prepare('SELECT i.id as invite_id, i.manager_id, m.status FROM manager_invites i JOIN managers m ON m.id=i.manager_id WHERE i.code=? AND i.revoked_at IS NULL LIMIT 1');
    $st->execute([$code]);
    $inv = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  } catch (Throwable $e) { $inv=null; }
  if (!$inv) return ['ok'=>false,'error'=>'invite_not_found'];
  if (strtolower((string)$inv['status']) !== 'active') return ['ok'=>false,'error'=>'manager_not_active'];

  $managerId = (int)$inv['manager_id'];
  $inviteId = (int)$inv['invite_id'];

  // prevent self-referral if manager is also a user
  try {
    $st = $pdo->prepare('SELECT tg_id FROM managers WHERE id=?');
    $st->execute([$managerId]);
    $mTg = (string)($st->fetchColumn() ?: '');
    $st2 = $pdo->prepare('SELECT tg_id FROM users WHERE id=?');
    $st2->execute([$userId]);
    $uTg = (string)($st2->fetchColumn() ?: '');
    if ($mTg !== '' && $uTg !== '' && $mTg === $uTg) {
      return ['ok'=>false,'error'=>'self_referral'];
    }
  } catch (Throwable $e) {}

  $pdo->beginTransaction();
  try {
    // first-touch, safe update
    $pdo->prepare('UPDATE users SET manager_id=COALESCE(NULLIF(manager_id,0), ?), updated_at=? WHERE id=?')
        ->execute([$managerId, time(), $userId]);

    // user_referrals unique by user_id
    if (db_driver()==='mysql') {
      $pdo->prepare('INSERT INTO user_referrals(user_id,manager_id,invite_id,bound_at,source) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE manager_id=manager_id')
        ->execute([$userId,$managerId,$inviteId,time(),$source]);
    } else {
      $pdo->prepare('INSERT INTO user_referrals(user_id,manager_id,invite_id,bound_at,source) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO NOTHING')
        ->execute([$userId,$managerId,$inviteId,time(),$source]);
    }

    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    return ['ok'=>false,'error'=>$e->getMessage()];
  }

  return ['ok'=>true,'manager_id'=>$managerId,'invite_id'=>$inviteId];
}


/**
 * Device-aware affiliate binding.
 * If deviceId is set, ONLY the first account on that device can be attributed.
 */
function aff_bind_user_by_code_device(int $userId, string $code, string $deviceId, string $source = 'start'): array {
  $deviceId = trim((string)$deviceId);
  $deviceId = preg_replace('/[^A-Za-z0-9_-]/', '', $deviceId);
  if (strlen($deviceId) > 64) $deviceId = substr($deviceId, 0, 64);

  // No device id -> fallback to normal first-touch (cannot enforce same-phone anti-fraud)
  if ($deviceId === '') {
    return aff_bind_user_by_code($userId, $code, $source);
  }

  $pdo = db();
  $code = trim($code);
  if ($userId<=0 || $code==='') return ['ok'=>false,'error'=>'invalid'];

  // already bound?
  try {
    $st = $pdo->prepare('SELECT manager_id FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $mid = (int)($st->fetchColumn() ?: 0);
    if ($mid > 0) return ['ok'=>true,'already'=>true,'manager_id'=>$mid];
  } catch (Throwable $e) {}

  // find invite
  $inv = null;
  try {
    $st = $pdo->prepare('SELECT i.id as invite_id, i.manager_id, m.status FROM manager_invites i JOIN managers m ON m.id=i.manager_id WHERE i.code=? AND i.revoked_at IS NULL LIMIT 1');
    $st->execute([$code]);
    $inv = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  } catch (Throwable $e) { $inv=null; }
  if (!$inv) return ['ok'=>false,'error'=>'invite_not_found'];
  if (strtolower((string)$inv['status']) !== 'active') return ['ok'=>false,'error'=>'manager_not_active'];

  $managerId = (int)$inv['manager_id'];
  $inviteId  = (int)$inv['invite_id'];

  // prevent self-referral
  try {
    $st = $pdo->prepare('SELECT tg_id FROM managers WHERE id=?');
    $st->execute([$managerId]);
    $mTg = (string)($st->fetchColumn() ?: '');
    $st2 = $pdo->prepare('SELECT tg_id FROM users WHERE id=?');
    $st2->execute([$userId]);
    $uTg = (string)($st2->fetchColumn() ?: '');
    if ($mTg !== '' && $uTg !== '' && $mTg === $uTg) {
      return ['ok'=>false,'error'=>'self_referral'];
    }
  } catch (Throwable $e) {}

  $pdo->beginTransaction();
  try {
    // Device anti-fraud: if device already attributed to ANY user (not the same user), block.
    try {
      $stD = $pdo->prepare('SELECT manager_id, first_user_id FROM device_referrals WHERE device_id=? LIMIT 1');
      $stD->execute([$deviceId]);
      $d = $stD->fetch(PDO::FETCH_ASSOC) ?: null;
      if ($d) {
        $firstUid = (int)($d['first_user_id'] ?? 0);
        if ($firstUid > 0 && $firstUid !== $userId) {
          $pdo->rollBack();
          return ['ok'=>false,'blocked'=>true,'error'=>'device_already_referred','manager_id'=>(int)($d['manager_id'] ?? 0)];
        }
      } else {
        // Reserve device for this user
        $pdo->prepare('INSERT INTO device_referrals(device_id, manager_id, first_user_id, bound_at) VALUES (?,?,?,?)')
            ->execute([$deviceId, $managerId, $userId, time()]);
      }
    } catch (Throwable $eD) {
      // If insert failed due to dup key (race), treat as blocked.
      try {
        $stD = $pdo->prepare('SELECT manager_id, first_user_id FROM device_referrals WHERE device_id=? LIMIT 1');
        $stD->execute([$deviceId]);
        $d = $stD->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($d) {
          $firstUid = (int)($d['first_user_id'] ?? 0);
          if ($firstUid > 0 && $firstUid !== $userId) {
            $pdo->rollBack();
            return ['ok'=>false,'blocked'=>true,'error'=>'device_already_referred','manager_id'=>(int)($d['manager_id'] ?? 0)];
          }
        }
      } catch (Throwable $ignored) {}
    }

    // first-touch update
    $pdo->prepare('UPDATE users SET manager_id=COALESCE(NULLIF(manager_id,0), ?), updated_at=? WHERE id=?')
        ->execute([$managerId, time(), $userId]);

    if (db_driver()==='mysql') {
      $pdo->prepare('INSERT INTO user_referrals(user_id,manager_id,invite_id,bound_at,source) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE manager_id=manager_id')
        ->execute([$userId,$managerId,$inviteId,time(),$source]);
    } else {
      $pdo->prepare('INSERT INTO user_referrals(user_id,manager_id,invite_id,bound_at,source) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO NOTHING')
        ->execute([$userId,$managerId,$inviteId,time(),$source]);
    }

    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    return ['ok'=>false,'error'=>$e->getMessage()];
  }

  return ['ok'=>true,'manager_id'=>$managerId,'invite_id'=>$inviteId];
}

function aff_manager_can_access_user(int $managerId, int $userId): bool {
  if ($managerId<=0 || $userId<=0) return false;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT manager_id FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $mid = (int)($st->fetchColumn() ?: 0);
    return $mid === $managerId;
  } catch (Throwable $e) {
    return false;
  }
}

function aff_set_user_flags(int $userId, array $flags): void {
  $pdo = db();
  $cols = [];
  $vals = [];
  $allowed = ['is_frozen','deposit_disabled','withdraw_disabled','trade_disabled','frozen_reason','frozen_at','frozen_by'];
  foreach ($allowed as $k) {
    if (!array_key_exists($k, $flags)) continue;
    $cols[] = "$k=?";
    $vals[] = $flags[$k];
  }
  if (!$cols) return;
  $cols[] = 'updated_at=?';
  $vals[] = time();
  $vals[] = $userId;
  try {
    $pdo->prepare('UPDATE users SET '.implode(',', $cols).' WHERE id=?')->execute($vals);
  } catch (Throwable $e) {}
}

// ===================== Affiliate Notifications =====================

function aff_notify_enabled(): bool {
  $v = strtolower(trim((string)env('AFF_NOTIFY_ENABLED', '1')));
  return !in_array($v, ['0','false','no','off'], true);
}

function aff_tg_send(string $token, string $method, array $payload, int $timeout = 4): void {
  if ($token === '') return;
  $url = "https://api.telegram.org/bot{$token}/{$method}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 2,
    CURLOPT_TIMEOUT => max(2, $timeout),
  ]);
  @curl_exec($ch);
  @curl_close($ch);
}

function aff_bot_token(): string {
  return (string)env('AFF_BOT_TOKEN', '');
}

function aff_manager_tg_id(int $managerId): int {
  if ($managerId <= 0) return 0;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT tg_id FROM managers WHERE id=? LIMIT 1');
    $st->execute([$managerId]);
    return (int)($st->fetchColumn() ?: 0);
  } catch (Throwable $e) {
    return 0;
  }
}

function aff_manager_lang(int $managerId): string {
  if ($managerId <= 0) return 'en';
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT lang FROM managers WHERE id=? LIMIT 1');
    $st->execute([$managerId]);
    $l = strtolower((string)($st->fetchColumn() ?: 'en'));
    return in_array($l, ['en','ar','ru'], true) ? $l : 'en';
  } catch (Throwable $e) {
    return 'en';
  }
}

function aff_user_manager_id(int $userId): int {
  if ($userId <= 0) return 0;
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT manager_id FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    return (int)($st->fetchColumn() ?: 0);
  } catch (Throwable $e) {
    return 0;
  }
}

/** @return array{0:string,1:int,2:string} [label,tg_id,username] */
function aff_user_brief(int $userId): array {
  $pdo = db();
  try {
    $st = $pdo->prepare('SELECT id,tg_id,username,first_name,last_name FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if (!$u) return ['User#'.$userId, 0, ''];
    $name = trim((string)($u['first_name'] ?? '') . ' ' . (string)($u['last_name'] ?? ''));
    $un = (string)($u['username'] ?? '');
    $label = $un ? ('@'.$un) : ($name !== '' ? $name : ('TG#'.(string)($u['tg_id'] ?? '')));
    return [$label, (int)($u['tg_id'] ?? 0), $un];
  } catch (Throwable $e) {
    return ['User#'.$userId, 0, ''];
  }
}

function aff_tr_notify(string $lang, string $key, array $vars = []): string {
  $lang = in_array($lang, ['en','ar','ru'], true) ? $lang : 'en';
  $custom = trim((string)setting_get('aff.notify.'.$key.'.'.$lang, ''));
  if ($custom !== '') {
    foreach ($vars as $k => $v) {
      $custom = str_replace('{'.$k.'}', (string)$v, $custom);
    }
    return $custom;
  }
  $T = [
    'client_joined' => [
      'en' => '👤 New client joined: {client} (UID {uid})',
      'ar' => '👤 عميل جديد دخل برابطك: {client} (UID {uid})',
      'ru' => '👤 Новый клиент по вашей ссылке: {client} (UID {uid})',
    ],
    'kyc_submitted' => [
      'en' => '🪪 KYC submitted: {client} (UID {uid}) (#{id})',
      'ar' => '🪪 طلب توثيق KYC جديد: {client} (UID {uid}) (#{id})',
      'ru' => '🪪 Новый KYC: {client} (UID {uid}) (#{id})',
    ],
    'dep_created' => [
      'en' => '💰 Deposit request: {client} {amount} {cur} (#{id})',
      'ar' => '💰 طلب إيداع: {client} {amount} {cur} (#{id})',
      'ru' => '💰 Заявка на депозит: {client} {amount} {cur} (#{id})',
    ],
    'dep_confirmed' => [
      'en' => '✅ Deposit confirmed: {client} {amount} {cur} (#{id})',
      'ar' => '✅ تم تأكيد الإيداع: {client} {amount} {cur} (#{id})',
      'ru' => '✅ Депозит подтверждён: {client} {amount} {cur} (#{id})',
    ],
    'dep_failed' => [
      'en' => '❌ Deposit failed: {client} {amount} {cur} (#{id})',
      'ar' => '❌ تم رفض/فشل الإيداع: {client} {amount} {cur} (#{id})',
      'ru' => '❌ Депозит отклонён: {client} {amount} {cur} (#{id})',
    ],
    'wdr_created' => [
      'en' => '🏧 Withdrawal request: {client} {amount} {cur} (#{id})',
      'ar' => '🏧 طلب سحب: {client} {amount} {cur} (#{id})',
      'ru' => '🏧 Заявка на вывод: {client} {amount} {cur} (#{id})',
    ],
    'wdr_approved' => [
      'en' => '✅ Withdrawal approved: {client} {amount} {cur} (#{id})',
      'ar' => '✅ تمت الموافقة على السحب: {client} {amount} {cur} (#{id})',
      'ru' => '✅ Вывод одобрен: {client} {amount} {cur} (#{id})',
    ],
    'wdr_rejected' => [
      'en' => '❌ Withdrawal rejected: {client} {amount} {cur} (#{id})',
      'ar' => '❌ تم رفض السحب: {client} {amount} {cur} (#{id})',
      'ru' => '❌ Вывод отклонён: {client} {amount} {cur} (#{id})',
    ],
    'wdr_completed' => [
      'en' => '✅ Withdrawal completed: {client} {amount} {cur} (#{id})',
      'ar' => '✅ تم تنفيذ السحب: {client} {amount} {cur} (#{id})',
      'ru' => '✅ Вывод выполнен: {client} {amount} {cur} (#{id})',
    ],
        'support_ticket' => [
      'en' => '🆘 Support ticket: {client} (UID {uid}) (#{id}) Reason: {reason}',
      'ar' => '🆘 تذكرة دعم: {client} (UID {uid}) (#{id}) السبب: {reason}',
      'ru' => '🆘 Тикет поддержки: {client} (UID {uid}) (#{id}) Причина: {reason}',
    ],
    'support_msg' => [
      'en' => '💬 Support update: {client} (UID {uid}) (#{id})\n{reason}\n{text}',
      'ar' => '💬 تحديث دعم: {client} (UID {uid}) (#{id})\n{reason}\n{text}',
      'ru' => '💬 Обновление поддержки: {client} (UID {uid}) (#{id})\n{reason}\n{text}',
    ],
'trade_open' => [
      'en' => '📈 Trade opened: {client} {symbol} {side} x{lev} ({mode}/{mkt}) (order #{id})',
      'ar' => '📈 صفقة جديدة: {client} {symbol} {side} x{lev} ({mode}/{mkt}) (#{id})',
      'ru' => '📈 Открыта сделка: {client} {symbol} {side} x{lev} ({mode}/{mkt}) (#{id})',
    ],
    'trade_closed' => [
      'en' => '🧾 Trade closed: {client} {symbol} PNL {pnl} ({mode}/{mkt}) (#{id})',
      'ar' => '🧾 إغلاق صفقة: {client} {symbol} ربح/خسارة {pnl} ({mode}/{mkt}) (#{id})',
      'ru' => '🧾 Сделка закрыта: {client} {symbol} PNL {pnl} ({mode}/{mkt}) (#{id})',
    ],
    'invest_subscribed' => [
      'en' => '💼 Plan subscribed: {client} {plan} {amount} {cur} (#{id})',
      'ar' => '💼 اشتراك في خطة: {client} {plan} {amount} {cur} (#{id})',
      'ru' => '💼 Подписка на план: {client} {plan} {amount} {cur} (#{id})',
    ],

    'support_request' => [
      'en' => '🆘 Support request: {client} — {reason} (Lang {lang})',
      'ar' => '🆘 طلب دعم: {client} — {reason} (لغة {lang})',
      'ru' => '🆘 Запрос в поддержку: {client} — {reason} (Язык {lang})',
    ],

    'manager_approved' => [
      'en' => '✅ Your marketer account has been approved. Use /start then open Menu.',
      'ar' => '✅ تم تفعيل حساب المسوّق بتاعك. اعمل /start وهتلاقي القايمة.',
      'ru' => '✅ Ваш аккаунт маркетолога одобрен. Нажмите /start и откройте меню.',
    ],
    'manager_blocked' => [
      'en' => '⛔ Your marketer account has been blocked. Contact admin.',
      'ar' => '⛔ تم إيقاف حساب المسوّق. تواصل مع الإدارة.',
      'ru' => '⛔ Ваш аккаунт маркетолога заблокирован. Свяжитесь с админом.',
    ],
  ];
  $txt = $T[$key][$lang] ?? ($T[$key]['en'] ?? $key);
  foreach ($vars as $k => $v) {
    $txt = str_replace('{'.$k.'}', (string)$v, $txt);
  }
  return $txt;
}

function aff_btn_open_client(string $lang): string {
  return ($lang === 'ar') ? '👤 فتح العميل'
    : (($lang === 'ru') ? '👤 Открыть клиента' : '👤 Open client');
}

function aff_norm_vars_for_lang(string $lang, array $vars): array {
  // Normalize common dynamic placeholders so RU/AR do not show raw EN tokens.
  $side = strtoupper((string)($vars['side'] ?? ''));
  if ($side !== '') {
    if ($lang === 'ar') {
      if (in_array($side, ['BUY','LONG'], true)) $vars['side'] = 'شراء';
      if (in_array($side, ['SELL','SHORT'], true)) $vars['side'] = 'بيع';
    } elseif ($lang === 'ru') {
      if (in_array($side, ['BUY','LONG'], true)) $vars['side'] = 'Покупка';
      if (in_array($side, ['SELL','SHORT'], true)) $vars['side'] = 'Продажа';
    } else {
      if (in_array($side, ['LONG'], true)) $vars['side'] = 'BUY';
      if (in_array($side, ['SHORT'], true)) $vars['side'] = 'SELL';
    }
  }
  return $vars;
}

function aff_notify_manager(int $managerId, string $key, array $vars = [], ?array $replyMarkup = null): void {
  if (!aff_notify_enabled()) return;
  $token = aff_bot_token();
  if ($token === '') return;
  $chatId = aff_manager_tg_id($managerId);
  if ($chatId <= 0) return;
  $lang = aff_manager_lang($managerId);
  $vars = aff_norm_vars_for_lang($lang, $vars);
  $text = aff_tr_notify($lang, $key, $vars);
  $payload = [
    'chat_id' => $chatId,
    'text' => $text,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true,
  ];
  if ($replyMarkup) $payload['reply_markup'] = $replyMarkup;
  aff_tg_send($token, 'sendMessage', $payload, 4);
}

function aff_notify_manager_for_user(int $userId, string $key, array $vars = []): void {
  $mid = aff_user_manager_id($userId);
  if ($mid <= 0) return;
  if (!isset($vars['uid'])) $vars['uid'] = $userId;
  if (!isset($vars['client'])) {
    $b = aff_user_brief($userId);
    $vars['client'] = $b[0];
  }
  $lang = aff_manager_lang($mid);
  // Always attach a quick button to open the client in mexaff_bot.
  $rm = [
    'inline_keyboard' => [[
      ['text' => aff_btn_open_client($lang), 'callback_data' => 'u:'.$userId],
    ]],
  ];
  aff_notify_manager($mid, $key, $vars, $rm);
}

