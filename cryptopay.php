<?php
declare(strict_types=1);

/**
 * Crypto Pay API (CryptoBot) client.
 * Docs: https://help.send.tg/en/articles/10279948-crypto-pay-api
 */

require_once __DIR__ . '/common.php';

function cryptopay_base(): string {
  $base = (string)env('CRYPTO_PAY_BASE', 'https://pay.crypt.bot');
  $base = rtrim($base, '/');
  if (!preg_match('~^https://~i', $base)) $base = 'https://pay.crypt.bot';
  return $base;
}

function cryptopay_token(): string {
  return (string)env('CRYPTO_PAY_API_TOKEN', '');
}

function cryptopay_request(string $method, array $params = []): array {
  $token = cryptopay_token();
  if ($token === '') return ['ok'=>false,'error'=>'CRYPTO_PAY_API_TOKEN missing'];

  $url = cryptopay_base() . '/api/' . rawurlencode($method);

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'Crypto-Pay-API-Token: ' . $token,
    ],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 15,
  ]);
  $raw = curl_exec($ch);
  $err = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($raw === false) return ['ok'=>false,'error'=>$err ?: 'Network error'];
  $j = json_decode((string)$raw, true);
  if (!is_array($j)) return ['ok'=>false,'error'=>'Bad JSON from CryptoPay'];
  if (($j['ok'] ?? false) !== true) {
    $e = (string)($j['error'] ?? 'CryptoPay error');
    return ['ok'=>false,'error'=>$e,'http'=>$code,'raw'=>$raw];
  }
  return $j;
}

function cryptopay_create_invoice(
  float $amount,
  string $asset,
  string $payload,
  string $description = '',
  ?int $expiresIn = null
): array {
  $asset = strtoupper(trim($asset ?: 'USDT'));

  // Mainnet supported crypto assets (per docs): USDT, TON, BTC, ETH, LTC, BNB, TRX, USDC.
  // If admin accidentally sets a fiat currency (e.g. RUB), fallback to USDT to avoid hard failures.
  $supported = ['USDT','TON','BTC','ETH','LTC','BNB','TRX','USDC'];
  if (!in_array($asset, $supported, true)) $asset = 'USDT';

  $expires = ($expiresIn !== null) ? (int)$expiresIn : (int)env('CRYPTO_PAY_EXPIRES_IN', '1800');
  $expires = max(60, min(2678400, $expires));

  // Crypto Pay API expects amount as a string float; keep precision safe.
  $amt = rtrim(rtrim(number_format($amount, 8, '.', ''), '0'), '.');
  if ($amt === '') $amt = '0';

  $params = [
    'currency_type' => 'crypto',
    'asset' => $asset,
    'amount' => $amt,
    'payload' => $payload,
    'expires_in' => $expires,
  ];
  if ($description !== '') $params['description'] = $description;

  return cryptopay_request('createInvoice', $params);
}

/**
 * Verify webhook signature.
 * Header: crypto-pay-api-signature
 * Signature = HMAC-SHA256(raw_body, sha256(token)) in hex.
 */
function cryptopay_verify_signature(string $rawBody, array $serverHeaders): bool {
  $token = cryptopay_token();
  if ($token === '') return false;

  // Normalize header lookup
  $sig = '';
  foreach ($serverHeaders as $k => $v) {
    $kk = strtolower((string)$k);
    if ($kk === 'crypto-pay-api-signature' || $kk === 'http_crypto_pay_api_signature' || $kk === 'http_crypto-pay-api-signature') {
      $sig = (string)$v;
      break;
    }
  }
  if ($sig === '') {
    // PHP puts headers into $_SERVER as HTTP_*
    $sig = (string)($_SERVER['HTTP_CRYPTO_PAY_API_SIGNATURE'] ?? '');
  }
  $sig = trim($sig);
  if ($sig === '') return false;

  $secret = hash('sha256', $token, true); // binary
  $calc = hash_hmac('sha256', $rawBody, $secret);
  return hash_equals($calc, $sig);
}

/**
 * Pick an invoice URL field that works in Telegram.
 */
function cryptopay_pick_invoice_url(array $invoice): string {
  foreach (['bot_invoice_url','mini_app_invoice_url','web_app_invoice_url','pay_url'] as $k) {
    $u = (string)($invoice[$k] ?? '');
    if ($u !== '' && preg_match('~^https?://~i', $u)) return $u;
  }
  return '';
}
