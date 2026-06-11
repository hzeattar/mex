<?php
$base = 'http://127.0.0.1:8081';
$eps = [
  'api/auth/me.php' => 'GET',
  'api/auth/logout.php' => 'GET',
  'deposits.php' => 'GET',
  'withdrawals.php' => 'GET',
  'balances.php' => 'GET',
  'orders.php' => 'GET',
  'balance.php' => 'GET',
  'open_positions.php' => 'GET',
  'support_tickets.php' => 'GET',
  'investments.php' => 'GET',
  'trading_settings.php' => 'GET',
  'signals.php' => 'GET',
  'trading_bot_engine.php' => 'GET',
  'tradingview.php' => 'GET',
  'trades.php' => 'GET',
  'pnl.php' => 'GET',
  'summary.php' => 'GET',
  'dashboard.php' => 'GET',
  'levels.php' => 'GET',
  'kyc.php' => 'GET',
  'profile.php' => 'GET',
  'my.php' => 'GET',
  'me.php' => 'GET',
  'balances.php' => 'GET',
  'deposits/list.php' => 'GET',
  'deposits/get.php' => 'GET',
  'withdrawals/list.php' => 'GET',
  'withdrawals/get.php' => 'GET',
  'api/wallet/balances.php' => 'GET',
  'api/wallet/transactions.php' => 'GET',
  'api/perp/positions.php' => 'GET',
  'api/perp/mark.php' => 'GET',
  'api/cron/quotes_tick.php' => 'GET',
  'api/cron/markets_sync.php' => 'GET',
];

$cookie = 'C:\Users\AM\Documents\Codex\2026-05-06\files-mentioned-by-the-user-vertexpluse\mex\ops\cookies.txt';

// Refresh cookies
$ch = curl_init("$base/api/auth/login.php");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['email'=>'trader@mex.local','password'=>'TestUser123!']),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_COOKIEJAR => $cookie,
  CURLOPT_COOKIEFILE => $cookie,
]);
curl_exec($ch);
curl_close($ch);

foreach ($eps as $ep => $method) {
  $ch = curl_init("$base/$ep");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_COOKIEFILE => $cookie,
    CURLOPT_COOKIEJAR => $cookie,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_FOLLOWLOCATION => false,
  ]);
  if ($method === 'POST') curl_setopt($ch, CURLOPT_POST, true);
  $resp = curl_exec($ch);
  $info = curl_getinfo($ch);
  $body = substr($resp, $info['header_size']);
  curl_close($ch);
  $code = $info['http_code'];
  $size = strlen($body);
  $isJson = ($info['content_type'] ?? '') && stripos($info['content_type'] ?? '', 'json') !== false;
  $first = substr(trim($body), 0, 80);
  printf("[%d] %-30s %5db %s  %s\n", $code, $ep, $size, $isJson ? 'JSON' : '   ', $first);
}
