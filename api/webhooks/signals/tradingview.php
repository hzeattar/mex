<?php
/**
 * Webhook endpoint to ingest trading signals (e.g., TradingView alerts).
 *
 * Configure your alert webhook URL:
 *   https://YOUR_DOMAIN/api/webhooks/signals/tradingview.php?secret=SIGNAL_WEBHOOK_SECRET
 *
 * Security:
 * - Requires secret (query ?secret=... OR header X-Webhook-Secret)
 * - Rate limited by IP (lightweight)
 */
declare(strict_types=1);

require_once __DIR__ . '/../../lib/common.php';

if (!function_exists('rate_limit')) {
  function rate_limit(string $bucket, int $limit, int $windowSec): void {
    // Fallback no-op on deployments where lightweight limiter is absent.
  }
}

$secret = (string)($_GET['secret'] ?? '');
$hdr = (string)(getallheaders()['X-Webhook-Secret'] ?? '');
$expected = env('SIGNAL_WEBHOOK_SECRET', '');
if ($expected === '' || (($secret !== $expected) && ($hdr !== $expected))) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

rate_limit('signals_webhook', 30, 60); // 30/min per IP

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'GET') {
  json_response([
    'ok' => true,
    'message' => 'TradingView webhook ready. Send POST JSON alerts here.',
    'expects' => ['symbol','type','direction'],
    'allowed_types' => ['crypto','forex','stocks','commodities'],
  ]);
}

$raw = file_get_contents('php://input') ?: '';
$payload = [];
$ctype = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (str_contains($ctype, 'application/json')) {
  $payload = json_decode($raw, true) ?: [];
} else {
  // Try to parse JSON anyway (TradingView can send JSON with text/plain)
  $payload = json_decode($raw, true) ?: [];
  if (!$payload && $raw) {
    // fallback: key=value lines
    foreach (preg_split('/\r?\n/', $raw) as $line) {
      $line = trim($line);
      if ($line === '' || !str_contains($line, '=')) continue;
      [$k,$v] = array_map('trim', explode('=', $line, 2));
      $payload[$k] = $v;
    }
  }
}

$symbol = strtoupper(trim((string)($payload['symbol'] ?? $payload['market'] ?? '')));
$type = strtolower(trim((string)($payload['type'] ?? $payload['market_type'] ?? 'crypto')));
if ($type === 'fx') $type = 'forex';
$timeframe = trim((string)($payload['timeframe'] ?? $payload['tf'] ?? ''));
$direction = strtoupper(trim((string)($payload['direction'] ?? $payload['action'] ?? '')));
if ($direction === 'LONG') $direction = 'BUY';
if ($direction === 'SHORT') $direction = 'SELL';

$entry = $payload['entry'] ?? $payload['entry_price'] ?? null;
$sl = $payload['sl'] ?? $payload['stop_loss'] ?? null;
$tp1 = $payload['tp'] ?? $payload['take_profit_1'] ?? null;
$tp2 = $payload['tp2'] ?? $payload['take_profit_2'] ?? null;
$conf = (int)($payload['confidence'] ?? 60);

if ($symbol === '' || !in_array($type, ['crypto','forex','stocks','commodities'], true) || !in_array($direction, ['BUY','SELL'], true)) {
  json_response(['ok'=>false,'error'=>'Invalid payload'], 422);
}

$now = time();
$validUntil = $payload['valid_until'] ?? null;
$validUntilTs = null;
if ($validUntil !== null && $validUntil !== '') {
  $v = (int)$validUntil;
  if ($v > 0) $validUntilTs = $v;
}
if ($validUntilTs === null) $validUntilTs = $now + 86400; // default 24h

$pdo = db();

// verify market exists (optional)
$st = $pdo->prepare("SELECT COUNT(*) FROM markets WHERE symbol=? AND type=? AND status='active'");
$st->execute([$symbol, $type]);
if ((int)$st->fetchColumn() === 0) {
  // allow unknown markets, but keep type/symbol as given
}

// Dedupe: if an identical signal was inserted very recently, ignore
$chk = $pdo->prepare("SELECT id FROM trading_signals
  WHERE market_symbol=? AND market_type=? AND timeframe=? AND direction=? AND created_at>=?
  ORDER BY id DESC LIMIT 1");
$chk->execute([$symbol,$type,$timeframe,$direction,$now-120]);
$existing = $chk->fetch(PDO::FETCH_ASSOC);
if ($existing) {
  json_response(['ok'=>true,'skipped'=>true,'reason'=>'duplicate_recent','id'=>(int)$existing['id']]);
}

$note_en = trim((string)($payload['note_en'] ?? $payload['note'] ?? ''));
$note_ar = trim((string)($payload['note_ar'] ?? ''));
$note_ru = trim((string)($payload['note_ru'] ?? ''));

$stmt = $pdo->prepare("INSERT INTO trading_signals
  (market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,raw_payload,note_en,note_ar,note_ru,status,valid_until,created_by,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
$stmt->execute([
  $symbol,
  $type,
  $timeframe !== '' ? $timeframe : null,
  $direction,
  $entry !== null && $entry !== '' ? (float)$entry : null,
  $sl !== null && $sl !== '' ? (float)$sl : null,
  $tp1 !== null && $tp1 !== '' ? (float)$tp1 : null,
  $tp2 !== null && $tp2 !== '' ? (float)$tp2 : null,
  max(0, min(100, $conf)),
  'tradingview',
  json_encode($payload, JSON_UNESCAPED_UNICODE),
  $note_en !== '' ? $note_en : null,
  $note_ar !== '' ? $note_ar : null,
  $note_ru !== '' ? $note_ru : null,
  'active',
  $validUntilTs,
  null,
  $now,
  $now
]);

json_response(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
