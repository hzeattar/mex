<?php
require_once __DIR__ . '/../auth/_common.php';

require_method('GET');
$pdo = auth_bootstrap_schema();
$uid = require_auth();
$row = auth_find_user($pdo, $uid);
if (!$row) json_response(['ok'=>false,'error'=>'Unauthorized'], 401);

auth_ensure_platform_user($uid, [
  'email' => (string)($row['email'] ?? ''),
  'telegram_id' => (string)($row['tg_id'] ?? ''),
  'username' => (string)($row['username'] ?? ''),
  'sync_identity' => false,
]);

$user = auth_user_payload($row);
$identities = ['email'=>false,'telegram'=>false];
try {
  $st = $pdo->prepare('SELECT provider FROM user_identities WHERE user_id=?');
  $st->execute([$uid]);
  foreach (($st->fetchAll(PDO::FETCH_COLUMN) ?: []) as $provider) {
    $provider = strtolower((string)$provider);
    if (array_key_exists($provider, $identities)) $identities[$provider] = true;
  }
} catch (Throwable $e) {
  $identities['email'] = trim((string)($row['email'] ?? '')) !== '';
  $identities['telegram'] = trim((string)($row['tg_id'] ?? '')) !== '';
}
$identities['email'] = $identities['email'] || trim((string)($row['email'] ?? '')) !== '';
$identities['telegram'] = $identities['telegram'] || trim((string)($row['tg_id'] ?? '')) !== '';

$kycStatus = 'none';
$kycCountry = '';
$kycUpdatedAt = 0;
try {
  $st = $pdo->prepare('SELECT status,country,updated_at FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
  $st->execute([$uid]);
  $kycRow = $st->fetch(PDO::FETCH_ASSOC) ?: null;
  if ($kycRow) {
    $kycStatus = strtolower((string)($kycRow['status'] ?? 'none'));
    $kycCountry = strtoupper(trim((string)($kycRow['country'] ?? '')));
    $kycUpdatedAt = (int)($kycRow['updated_at'] ?? 0);
  }
} catch (Throwable $e) {}

$depositCount = 0;
$withdrawCount = 0;
try { $st = $pdo->prepare('SELECT COUNT(*) FROM deposits WHERE user_id=?'); $st->execute([$uid]); $depositCount = (int)($st->fetchColumn() ?: 0); } catch (Throwable $e) {}
try { $st = $pdo->prepare('SELECT COUNT(*) FROM withdrawals WHERE user_id=?'); $st->execute([$uid]); $withdrawCount = (int)($st->fetchColumn() ?: 0); } catch (Throwable $e) {}

$live = $user['live_account'] ?? null;
$demo = $user['demo_account'] ?? null;
$hasLive = is_array($live) && !empty($live['account_no']);
$hasFunding = ($depositCount + $withdrawCount) > 0;
$profileComplete = trim((string)($row['first_name'] ?? '')) !== '' && trim((string)($row['last_name'] ?? '')) !== '' && trim((string)($row['email'] ?? '')) !== '';

$steps = [
  ['key'=>'profile','title'=>'Complete profile','status'=>$profileComplete ? 'done' : 'todo'],
  ['key'=>'verify','title'=>'Verify account','status'=>($kycStatus === 'approved' ? 'done' : ($kycStatus === 'pending' ? 'pending' : 'todo'))],
  ['key'=>'fund','title'=>'Fund live account','status'=>$hasFunding ? 'done' : 'todo'],
  ['key'=>'trade','title'=>'Start trading','status'=>$hasFunding ? 'ready' : 'locked'],
];
$next = 'verify';
foreach ($steps as $step) {
  if (!in_array($step['status'], ['done','ready'], true)) { $next = $step['key']; break; }
}
if (!$profileComplete) $next = 'profile';
elseif ($kycStatus !== 'approved') $next = 'verify';
elseif (!$hasFunding) $next = 'fund';
else $next = 'trade';

json_response([
  'ok' => true,
  'user' => [
    'id' => (int)$uid,
    'name' => (string)($user['display_name'] ?? ''),
    'email' => (string)($row['email'] ?? ''),
    'identities' => $identities,
  ],
  'accounts' => [
    'live' => $live,
    'demo' => $demo,
  ],
  'kyc' => ['status' => $kycStatus, 'country' => $kycCountry, 'updated_at' => $kycUpdatedAt],
  'funding' => [
    'deposit_count' => $depositCount,
    'withdrawal_count' => $withdrawCount,
    'has_activity' => $hasFunding,
  ],
  'steps' => $steps,
  'next_step' => $next,
]);
