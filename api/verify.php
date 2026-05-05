<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/telegram.php';
require_once __DIR__ . '/lib/schema.php';
require_once __DIR__ . '/lib/affiliates.php';
require_once __DIR__ . '/lib/settings.php';
require_once __DIR__ . '/lib/ledger.php';
require_once __DIR__ . '/auth/_common.php';

require_method('POST');
$body = read_json_body();
$initData = (string)($body['initData'] ?? '');
$lang = (string)($body['lang'] ?? 'en');
$startParam = (string)($body['start_param'] ?? '');
$deviceId = (string)($body['device_id'] ?? '');
$deviceId = preg_replace('/[^A-Za-z0-9_-]/', '', trim($deviceId));
if (strlen($deviceId) > 64) $deviceId = substr($deviceId, 0, 64);

$botToken = (string)env('TELEGRAM_BOT_TOKEN', '');
$requireTg = (env('REQUIRE_TG_INITDATA', '') !== '')
  ? ((string)env('REQUIRE_TG_INITDATA', '1') !== '0')
  : ($botToken !== '');
$allowGuest = ((string)env('ALLOW_GUEST', '0') === '1');

// Local dev/testing: allow guest sessions when not running inside Telegram
$appEnv = (string)env('APP_ENV','production');
if (strtolower($appEnv)==='local') { $allowGuest = true; $requireTg = false; }

$pdo = db();

// Ensure schema exists
try {
  $pdo->query('SELECT 1 FROM users LIMIT 1');
} catch (Throwable $e) {
  json_response(['ok'=>false,'error'=>'Database schema missing. Run /api/install.php'], 500);
}

$userPayload = null;
$tgAuthDate = 0;
$tgHash = '';

if ($initData !== '') {
  if ($botToken === '') {
    // initData provided but token missing => cannot verify
    if ($requireTg && !$allowGuest) {
      json_response(['ok'=>false,'error'=>'Server misconfigured: TELEGRAM_BOT_TOKEN missing'], 500);
    }
  } else {
    $vr = tg_verify_init_data($initData, $botToken);
    if (!$vr['ok']) {
      if ($requireTg && !$allowGuest) {
        json_response(['ok'=>false,'error'=>'Invalid initData: ' . ($vr['error'] ?? 'invalid')], 401);
      }
    } else {
      $userPayload = $vr['user'] ?? null;
      $tgAuthDate = (int)($vr['params']['auth_date'] ?? 0);
      $tgHash = (string)($vr['params']['hash'] ?? '');
    }
  }
} else {
  if ($requireTg && !$allowGuest) {
    json_response(['ok'=>false,'error'=>'Missing initData'], 401);
  }
}

$tg_id = $userPayload['id'] ?? null;
$username = $userPayload['username'] ?? null;
$first = $userPayload['first_name'] ?? 'Guest';
$last = $userPayload['last_name'] ?? '';

// Find/create user
$row = null;
if ($tg_id) {
  $stmt = $pdo->prepare('SELECT * FROM users WHERE tg_id = ? LIMIT 1');
  $stmt->execute([(string)$tg_id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

if (!$row) {
  $now = now_ts();
  // IMPORTANT: telegram_chat_id is required to allow admin/bot messages.
  // In private chats, chat_id equals tg_id. We set it at creation.
  $stmt = $pdo->prepare('INSERT INTO users(tg_id,telegram_chat_id,username,first_name,last_name,locale,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)');
  $stmt->execute([$tg_id ? (string)$tg_id : null, $tg_id ? (string)$tg_id : null, $username, $first, $last, $lang, $now, $now]);
  $uid = (int)$pdo->lastInsertId();
  $row = ['id'=>$uid,'tg_id'=>$tg_id,'username'=>$username,'first_name'=>$first,'last_name'=>$last];
} else {
  $uid = (int)$row['id'];
  // Backfill telegram_chat_id if missing.
  $pdo->prepare('UPDATE users SET username=?, first_name=?, last_name=?, locale=?, telegram_chat_id=COALESCE(NULLIF(telegram_chat_id,\'\'), ?), updated_at=? WHERE id=?')
      ->execute([$username, $first, $last, $lang, $tg_id ? (string)$tg_id : null, now_ts(), $uid]);
}

// Persist last seen device id (best effort)
if ($deviceId !== '' && $uid > 0) {
  try {
    $pdo->prepare('UPDATE users SET last_device_id=?, updated_at=? WHERE id=?')->execute([$deviceId, now_ts(), $uid]);
  } catch (Throwable $e) {}
}

// Anti-replay (best-effort): reject reused/old initData per user
if ($tgAuthDate > 0 && $tgHash !== '' && $tg_id) {
  try {
    $pdo->query('SELECT 1 FROM tg_sessions LIMIT 1');
  } catch (Throwable $e) {
    try { schema_install($pdo, db_driver()); } catch (Throwable $e2) {}
  }

  $sel = $pdo->prepare('SELECT last_auth_date, last_hash FROM tg_sessions WHERE user_id=? LIMIT 1');
  $sel->execute([$uid]);
  $sess = $sel->fetch(PDO::FETCH_ASSOC) ?: null;
  $lastAuth = (int)($sess['last_auth_date'] ?? 0);
  $lastHash = (string)($sess['last_hash'] ?? '');

  if ($lastHash !== '' && hash_equals($lastHash, $tgHash)) {
    json_response(['ok'=>false,'error'=>'Replay detected'], 401);
  }
  if ($lastAuth > 0 && $tgAuthDate <= $lastAuth) {
    json_response(['ok'=>false,'error'=>'Stale initData'], 401);
  }

  if (db_driver() === 'mysql') {
    $up = $pdo->prepare('INSERT INTO tg_sessions(user_id,last_auth_date,last_hash,updated_at) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE last_auth_date=VALUES(last_auth_date), last_hash=VALUES(last_hash), updated_at=VALUES(updated_at)');
  } else {
    $up = $pdo->prepare('INSERT INTO tg_sessions(user_id,last_auth_date,last_hash,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET last_auth_date=excluded.last_auth_date, last_hash=excluded.last_hash, updated_at=excluded.updated_at');
  }
  $up->execute([$uid, $tgAuthDate, $tgHash, now_ts()]);
}

// Issue bearer token for APIs/bot usage
$plain = bin2hex(random_bytes(24));
$hash = hash('sha256', $plain);
$pdo->prepare('INSERT INTO api_tokens(user_id, token_hash, name, last_used_at, created_at) VALUES (?,?,?,?,?)')
    ->execute([$uid, $hash, 'miniapp', now_ts(), now_ts()]);

// Ensure wallets exist
$realCur = (string)env('REAL_CURRENCY', 'USDT');
$demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
$demoSeed = (float)env('DEMO_START_BALANCE', 10000);

ensure_wallet($uid, $realCur);
$demoWalletId = ensure_wallet($uid, $demoCur);

// Seed demo funds once (ledger-based)
$demoBal = wallet_balance($uid, $demoCur);
if ($demoBal < 0.00000001 && $demoSeed > 0) {
  ledger_add($uid, $demoWalletId, $demoCur, $demoSeed, 'seed_demo', 'user', (string)$uid, ['note'=>'Initial demo balance'], now_ts());
}



// Freeze guard (blocks login / actions)
try {
  $fl = user_account_flags($uid);
  if ((int)($fl['is_frozen'] ?? 0) === 1) {
    json_response(['ok'=>false,'error'=>'account_frozen','reason'=>(string)($fl['frozen_reason'] ?? '')], 403);
  }
} catch (Throwable $e) {}

// Affiliate binding (optional):
// - from MiniApp start_param (aff_CODE)
// - or from pending code captured by bot /start aff_CODE
// Anti-fraud: if device_id is present, only the FIRST account on the same phone can be attributed.
try {
  $codeToBind = '';
  $sp = trim((string)$startParam);
  if ($sp !== '' && str_starts_with($sp, 'aff_')) {
    $codeToBind = trim(substr($sp, 4));
  }

  // If start_param is empty, check pending code stored by the bot.
  if ($codeToBind === '' && $uid > 0) {
    try {
      $stP = $pdo->prepare('SELECT pending_aff_code FROM users WHERE id=? LIMIT 1');
      $stP->execute([$uid]);
      $codeToBind = trim((string)($stP->fetchColumn() ?: ''));
    } catch (Throwable $e2) { $codeToBind = ''; }
  }

  if ($codeToBind !== '' && $uid > 0) {
    // Do the actual bind (device-aware if deviceId exists)
    $rBind = null;
    if (function_exists('aff_bind_user_by_code_device')) {
      $rBind = aff_bind_user_by_code_device($uid, $codeToBind, $deviceId, ($sp!=='' ? 'miniapp' : 'bot_start'));
    } else {
      $rBind = aff_bind_user_by_code($uid, $codeToBind, ($sp!=='' ? 'miniapp' : 'bot_start'));
    }

    // Notify manager only when it's a NEW successful bind
    if (is_array($rBind) && ($rBind['ok'] ?? false) && empty($rBind['already']) && empty($rBind['blocked'])) {
      try { aff_notify_manager_for_user($uid, 'client_joined', ['uid'=>$uid]); } catch (Throwable $e3) {}
    }

    // Clear pending regardless (prevents endless re-tries / spam)
    try {
      $pdo->prepare('UPDATE users SET pending_aff_code=NULL, pending_aff_set_at=NULL WHERE id=?')
          ->execute([$uid]);
    } catch (Throwable $e4) {}
  }
} catch (Throwable $e) {}
auth_ensure_platform_user($uid, ['telegram_id' => (string)($tg_id ?? ''), 'username' => (string)($username ?? '')]);
if (!empty($tg_id)) {
  try { auth_sync_identity($pdo, $uid, 'telegram', (string)$tg_id, $username ? (string)$username : null, null, ['source' => 'verify']); } catch (Throwable $e) {}
}
set_session_user_id($uid, 'telegram_verify');

// Leverage caps (global + optional per-user)
$globalMaxLev = (int)(setting_get('PERP_MAX_LEVERAGE', env('PERP_MAX_LEVERAGE','125')));
$globalMaxLev = max(1, min(1000, $globalMaxLev));
$userMaxLev = 0;
try {
  $st = $pdo->prepare('SELECT max_leverage FROM users WHERE id=?');
  $st->execute([$uid]);
  $userMaxLev = (int)($st->fetchColumn() ?: 0);
} catch (Throwable $e) { $userMaxLev = 0; }
$effectiveMaxLev = $globalMaxLev;
if ($userMaxLev > 0) $effectiveMaxLev = min($effectiveMaxLev, max(1, min(1000, $userMaxLev)));


json_response(['ok'=>true,'user'=>[
  'id'=>$uid,
  'tg_id'=>$tg_id,
  'username'=>$username,
  'first_name'=>$first,
  'last_name'=>$last,
  'lang'=>$lang
], 'token'=>$plain, 'currencies'=>['real'=>$realCur,'demo'=>$demoCur], 'leverage'=>['max_global'=>$globalMaxLev,'max_user'=>$userMaxLev,'max_effective'=>$effectiveMaxLev]]);
