<?php
/**
 * Local HTTP smoke test for MEX API endpoints.
 * Usage: php scripts/test_http.php
 */

$base = 'http://127.0.0.1:8081';

function http($method, $url, $body = null, $headers = []) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  $hdr = array_merge(['Accept: application/json', 'Content-Type: application/json'], $headers);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
  if ($method !== 'GET') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
  }
  $resp = curl_exec($ch);
  $info = curl_getinfo($ch);
  $hsize = $info['header_size'];
  $hdrs = substr($resp, 0, $hsize);
  $body = substr($resp, $hsize);
  curl_close($ch);
  return ['code' => $info['http_code'], 'headers' => $hdrs, 'body' => $body, 'json' => @json_decode($body, true)];
}

function step($name, $ok, $extra = '') {
  printf("[%s] %-50s %s\n", $ok ? 'OK' : 'FAIL', $name, $extra);
  return $ok;
}

echo "=== PING ===\n";
$r = http('GET', "$base/ping.php?diag=1");
step('ping.php (diag=1)', $r['code'] === 200 && ($r['json']['ok'] ?? false) === true, 'driver=' . ($r['json']['runtime']['db_driver'] ?? 'n/a') . ' db=' . ($r['json']['db_status'] ?? 'n/a'));

echo "\n=== PUBLIC MARKETS ===\n";
$r = http('GET', "$base/api/markets.php?type=all&grouped=1&fast_list=1");
step('markets.php (grouped, fast)', $r['code'] === 200, 'code=' . $r['code']);
$groups = $r['json']['groups'] ?? $r['json']['items'] ?? [];
$total = 0;
if (is_array($groups)) foreach ($groups as $g) $total += is_array($g) ? count($g) : 0;
step('  -> has market data', $total > 0, 'total=' . $total);

echo "\n=== PUBLIC PRICES ===\n";
$r = http('GET', "$base/api/public_prices.php?symbols=BTCUSDT,ETHUSDT,EURUSD,XAUUSD");
step('public_prices.php', $r['code'] === 200, 'code=' . $r['code']);
$items = $r['json']['items'] ?? [];
$prices = [];
foreach ($items as $it) $prices[$it['symbol']] = $it['price'] ?? 0;
step('  -> has BTC', isset($prices['BTCUSDT']) && $prices['BTCUSDT'] > 0, 'BTC=' . ($prices['BTCUSDT'] ?? 'null'));
step('  -> has EUR', isset($prices['EURUSD']) && $prices['EURUSD'] > 0, 'EUR=' . ($prices['EURUSD'] ?? 'null'));
step('  -> has XAU', isset($prices['XAUUSD']) && $prices['XAUUSD'] > 0, 'XAU=' . ($prices['XAUUSD'] ?? 'null'));

echo "\n=== AUTH ===\n";
$email = 'trader@mex.local';
$pass  = 'TestUser123!';
$r = http('POST', "$base/api/auth/login.php", ['email' => $email, 'password' => $pass]);
step('login.php (trader)', $r['code'] === 200 && !empty($r['json']['token']), 'code=' . $r['code']);
$token = $r['json']['token'] ?? '';
$uid   = $r['json']['user']['id'] ?? 0;
step('  -> got user', $uid > 0, 'uid=' . $uid);

// Extract cookies from response (tp_session)
$cookies = [];
foreach (explode("\n", $r['headers']) as $h) {
  if (stripos($h, 'Set-Cookie:') === 0) {
    $parts = explode(';', trim(substr($h, 11)));
    $cookies[] = $parts[0];
  }
}
$cookieHdr = implode('; ', $cookies);

echo "\n=== AUTHENTICATED ENDPOINTS ===\n";
$r = http('GET', "$base/api/auth/me.php", null, ["Authorization: Bearer $token", "Cookie: $cookieHdr"]);
step('me.php (auth)', $r['code'] === 200 && !empty($r['json']['user']), 'code=' . $r['code']);
$me = $r['json']['user'] ?? [];
$meEmail = $me['email'] ?? '';
step('  -> email matches', $meEmail === $email, "got=$meEmail want=$email");

$r = http('GET', "$base/api/bootstrap.php", null, ["Authorization: Bearer $token", "Cookie: $cookieHdr"]);
step('bootstrap.php', $r['code'] === 200 && !empty($r['json']['user']), 'code=' . $r['code']);
$wallets = $r['json']['wallet'] ?? [];
step('  -> has real wallet', isset($wallets['real']['balance']), 'balance=' . ($wallets['real']['balance'] ?? 'null'));
step('  -> has demo wallet', isset($wallets['demo']['balance']), 'balance=' . ($wallets['demo']['balance'] ?? 'null'));

echo "\n=== PORTFOLIO ===\n";
$r = http('GET', "$base/api/trade/portfolio.php?fast=1", null, ["Authorization: Bearer $token", "Cookie: $cookieHdr"]);
step('portfolio.php', $r['code'] === 200, 'code=' . $r['code']);
$positions = $r['json']['positions'] ?? [];
$orders = $r['json']['orders'] ?? [];
$realized = $r['json']['realized_pnl'] ?? 0;
$unreal = $r['json']['unrealized_pnl'] ?? 0;
step('  -> has positions', is_array($positions) && count($positions) > 0, 'count=' . count($positions));
step('  -> has orders', is_array($orders) && count($orders) > 0, 'count=' . count($orders));
step('  -> has realized_pnl', is_numeric($realized), 'realized=' . number_format($realized, 2));
step('  -> has unrealized_pnl', is_numeric($unreal), 'unreal=' . number_format($unreal, 2));
$metrics = $r['json']['metrics'] ?? [];
step('  -> has metrics.total_balance', isset($metrics['total_balance']), 'total=' . ($metrics['total_balance'] ?? 'null'));

echo "\n=== PLACE ORDER ===\n";
$demoBalance = (float)($wallets['demo']['balance'] ?? 0);
$placeUsd = min(100, $demoBalance);
$r = http('POST', "$base/api/trade/place_order.php", [
  'symbol' => 'BTCUSDT',
  'asset_type' => 'crypto',
  'market_type' => 'spot',
  'side' => 'BUY',
  'order_type' => 'MARKET',
  'usd' => $placeUsd,
], ["Authorization: Bearer $token", "Cookie: $cookieHdr"]);
step("place_order.php BUY $placeUsd USD BTC", $r['code'] === 200 && !empty($r['json']['order_id']),
   'code=' . $r['code'] . ' err=' . ($r['json']['error'] ?? ''));
$orderId = $r['json']['order_id'] ?? 0;
$positionId = $r['json']['position_id'] ?? 0;
step('  -> got order_id', $orderId > 0, "id=$orderId");
step('  -> got position_id', $positionId > 0, "id=$positionId");

echo "\n=== CLOSE POSITION ===\n";
if ($positionId > 0) {
  $r = http('POST', "$base/api/trade/close_position.php?id=$positionId", [], ["Authorization: Bearer $token", "Cookie: $cookieHdr"]);
  step("close_position.php #$positionId", $r['code'] === 200 && !empty($r['json']['closed']),
       'code=' . $r['code'] . ' pnl=' . ($r['json']['closed']['pnl_usd'] ?? 'null'));
  step('  -> has closed.pnl_usd', isset($r['json']['closed']['pnl_usd']));
}

echo "\n=== ADMIN LOGIN ===\n";
$r = http('POST', "$base/api/auth/login.php", ['email' => 'admin@mex.local', 'password' => 'TestAdmin123!@#']);
step('login.php (admin)', $r['code'] === 200, 'code=' . $r['code']);

echo "\n=== DONE ===\n";
