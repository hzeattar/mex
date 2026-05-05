<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/ledger.php';

require_method('GET');
$uid = require_auth();

$realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
$demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));

ensure_wallet($uid, $realCur);
ensure_wallet($uid, $demoCur);

$realBal = wallet_balance($uid, $realCur);
$realAvail = wallet_available($uid, $realCur);

$demoBal = wallet_balance($uid, $demoCur);
$demoAvail = wallet_available($uid, $demoCur);

json_response([
  'ok' => true,
  'real' => [
    'currency' => $realCur,
    'balance' => (float)$realBal,
    'available' => (float)($realAvail['available'] ?? $realBal),
    'holds' => (float)($realAvail['holds'] ?? 0),
  ],
  'demo' => [
    'currency' => $demoCur,
    'balance' => (float)$demoBal,
    'available' => (float)($demoAvail['available'] ?? $demoBal),
    'holds' => (float)($demoAvail['holds'] ?? 0),
  ],
]);
