<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/schema.php';
require_once __DIR__ . '/../lib/ledger.php';
require_once __DIR__ . '/../lib/levels.php';

function auth_bootstrap_schema(): PDO {
  $pdo = db();
  try {
    schema_install($pdo, db_driver());
    schema_upgrade($pdo, db_driver());
    schema_seed_defaults($pdo, db_driver());
  } catch (Throwable $e) {
    // db() already performs upgrades best-effort; ignore here
  }
  return $pdo;
}

function auth_issue_token(int $uid, string $name = 'web'): string {
  $pdo = db();
  $plain = bin2hex(random_bytes(24));
  $hash = hash('sha256', $plain);
  $pdo->prepare('INSERT INTO api_tokens(user_id, token_hash, name, last_used_at, created_at) VALUES (?,?,?,?,?)')
      ->execute([$uid, $hash, $name, now_ts(), now_ts()]);
  return $plain;
}

function auth_ensure_wallets(int $uid): void {
  $realCur = (string)env('REAL_CURRENCY', 'USDT');
  $demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
  $demoSeed = (float)env('DEMO_START_BALANCE', 10000);

  ensure_wallet($uid, $realCur);
  $demoWalletId = ensure_wallet($uid, $demoCur);
  $demoBal = wallet_balance($uid, $demoCur);
  if ($demoBal < 0.00000001 && $demoSeed > 0) {
    ledger_add($uid, $demoWalletId, $demoCur, $demoSeed, 'seed_demo', 'user', (string)$uid, ['note'=>'Initial demo balance'], now_ts());
  }
}

function auth_user_payload(array $row): array {
  $first = trim((string)($row['first_name'] ?? ''));
  $last  = trim((string)($row['last_name'] ?? ''));
  $username = trim((string)($row['username'] ?? ''));
  $tgId = trim((string)($row['tg_id'] ?? ''));
  $display = trim((string)($row['display_name'] ?? ''));
  if ($display === '') $display = trim($first . ' ' . $last);
  if ($display === '') $display = $username !== '' ? ('@' . ltrim($username, '@')) : '';
  if ($display === '') $display = (string)($row['email'] ?? 'User');

  $accounts = ['live' => null, 'demo' => null];
  try {
    $pdo = db();
    $st = $pdo->prepare('SELECT mode, account_no, label, status, base_currency, is_primary FROM trading_accounts WHERE user_id=? ORDER BY is_primary DESC, id ASC');
    $st->execute([(int)($row['id'] ?? 0)]);
    foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $acc) {
      $mode = strtolower((string)($acc['mode'] ?? ''));
      if ($mode !== 'live' && $mode !== 'demo') continue;
      $accounts[$mode] = [
        'account_no' => (string)($acc['account_no'] ?? ''),
        'label' => (string)($acc['label'] ?? ''),
        'status' => (string)($acc['status'] ?? 'active'),
        'base_currency' => (string)($acc['base_currency'] ?? ''),
        'is_primary' => (int)($acc['is_primary'] ?? 0),
      ];
    }
  } catch (Throwable $e) {}

  $levelInfo = ['confirmed_deposit_total'=>0,'current'=>null,'next'=>null];
  try { $levelInfo = vp_resolve_user_level(db(), (int)($row['id'] ?? 0), (string)($row['locale'] ?? 'en')); } catch (Throwable $e) {}

  return [
    'id' => (int)($row['id'] ?? 0),
    'uid' => (int)($row['id'] ?? 0),
    'email' => (string)($row['email'] ?? ''),
    'username' => $username,
    'telegram_id' => $tgId,
    'tg_id' => $tgId,
    'telegram_username' => $username,
    'first_name' => $first,
    'last_name' => $last,
    'display_name' => $display,
    'name' => $display,
    'telegram_first_name' => $first,
    'telegram_last_name' => $last,
    'locale' => (string)($row['locale'] ?? 'en'),
    'lang' => (string)($row['locale'] ?? 'en'),
    'login_provider' => (string)($row['login_provider'] ?? 'web'),
    'force_mode' => in_array(strtolower((string)($row['force_mode'] ?? '')), ['demo','real'], true) ? strtolower((string)$row['force_mode']) : null,
    'accounts' => $accounts,
    'live_account' => $accounts['live'],
    'demo_account' => $accounts['demo'],
    'confirmed_deposit_total' => (float)($levelInfo['confirmed_deposit_total'] ?? 0),
    'user_level' => $levelInfo['current'],
    'next_level' => $levelInfo['next'],
  ];
}

function auth_find_user(PDO $pdo, int $uid): ?array {
  $st = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
  $st->execute([$uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}


function auth_sync_identity(PDO $pdo, int $uid, string $provider, string $providerUserId, ?string $username = null, ?string $email = null, array $meta = []): void {
  $provider = strtolower(trim($provider));
  $providerUserId = trim($providerUserId);
  if ($provider === '' || $providerUserId === '') return;
  $now = now_ts();
  $metaJson = $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
  if (db_driver() === 'mysql') {
    $sql = 'INSERT INTO user_identities(user_id,provider,provider_user_id,provider_username,provider_email,meta_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) '
         . 'ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), provider_username=VALUES(provider_username), provider_email=VALUES(provider_email), meta_json=VALUES(meta_json), updated_at=VALUES(updated_at)';
  } else {
    $sql = 'INSERT INTO user_identities(user_id,provider,provider_user_id,provider_username,provider_email,meta_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) '
         . 'ON CONFLICT(provider, provider_user_id) DO UPDATE SET user_id=excluded.user_id, provider_username=excluded.provider_username, provider_email=excluded.provider_email, meta_json=excluded.meta_json, updated_at=excluded.updated_at';
  }
  $pdo->prepare($sql)->execute([$uid, $provider, $providerUserId, $username, $email, $metaJson, $now, $now]);
}

function auth_generate_account_no(int $uid, string $mode): string {
  $prefix = strtolower($mode) === 'demo' ? '90' : '10';
  return $prefix . str_pad((string)$uid, 8, '0', STR_PAD_LEFT);
}

function auth_ensure_trading_accounts(int $uid): void {
  $pdo = db();
  $now = now_ts();
  $modes = [
    'live' => ['label' => 'Standard', 'base_currency' => (string)env('REAL_CURRENCY', 'USDT'), 'is_primary' => 1],
    'demo' => ['label' => 'Demo', 'base_currency' => (string)env('DEMO_CURRENCY', 'USDT_DEMO'), 'is_primary' => 0],
  ];
  foreach ($modes as $mode => $cfg) {
    $st = $pdo->prepare('SELECT id FROM trading_accounts WHERE user_id=? AND mode=? LIMIT 1');
    $st->execute([$uid, $mode]);
    if ((int)($st->fetchColumn() ?: 0) > 0) continue;
    $pdo->prepare('INSERT INTO trading_accounts(user_id,account_no,mode,label,status,base_currency,is_primary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([$uid, auth_generate_account_no($uid, $mode), $mode, $cfg['label'], 'active', $cfg['base_currency'], $cfg['is_primary'], $now, $now]);
  }
}

function auth_ensure_platform_user(int $uid, array $opts = []): void {
  auth_ensure_wallets($uid);
  auth_ensure_trading_accounts($uid);
  $pdo = db();
  $email = trim((string)($opts['email'] ?? ''));
  $telegramId = trim((string)($opts['telegram_id'] ?? ''));
  $username = trim((string)($opts['username'] ?? ''));
  if ($email !== '') {
    auth_sync_identity($pdo, $uid, 'email', strtolower($email), $username !== '' ? $username : null, strtolower($email), ['source' => 'web']);
  }
  if ($telegramId !== '') {
    auth_sync_identity($pdo, $uid, 'telegram', $telegramId, $username !== '' ? $username : null, $email !== '' ? strtolower($email) : null, ['source' => 'telegram']);
  }
}
