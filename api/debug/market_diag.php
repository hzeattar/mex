<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/marketdata.php';

$key = (string)($_GET['key'] ?? '');
$expected = (string)env('CRON_KEY', '');
if ($expected !== '' && !hash_equals($expected, $key)) {
  json_response(['ok' => false, 'error' => 'Forbidden'], 403);
}

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$type = strtolower(trim((string)($_GET['type'] ?? '')));
$market = strtolower(trim((string)($_GET['market'] ?? 'spot')));
if (!in_array($market, ['spot','perp'], true)) $market = 'spot';
$tf = strtolower(trim((string)($_GET['tf'] ?? '1m')));
$limit = max(5, min(50, (int)($_GET['limit'] ?? 10)));

$pdo = db();
$params = [];
$sql = 'SELECT symbol,type,seed_price,meta,updated_at FROM markets WHERE status=\'active\'';
if ($symbol !== '') {
  $sql .= ' AND symbol=?';
  $params[] = $symbol;
} elseif ($type !== '' && $type !== 'all') {
  $sql .= ' AND type=?';
  $params[] = $type;
}
$sql .= ' ORDER BY type, sort_order, id LIMIT ' . $limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$markets = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$symbols = array_values(array_unique(array_map(static fn($r) => strtoupper((string)($r['symbol'] ?? '')), $markets)));
$qMap = quote_snapshot_many($symbols, ['market' => $market, 'refresh_budget' => 0]);

$tfMap = ['1m' => 60, '5m' => 300, '15m' => 900, '30m' => 1800, '1h' => 3600, '4h' => 14400, '1d' => 86400];
$tfSec = $tfMap[$tf] ?? 60;
$now = time();
$out = [];

foreach ($markets as $mr) {
  $sym = strtoupper((string)($mr['symbol'] ?? ''));
  $assetType = strtolower((string)($mr['type'] ?? 'crypto'));
  $meta = market_meta($mr['meta'] ?? null);
  $snap = $qMap[$sym] ?? null;
  $lastCandle = null;
  $stC = $pdo->prepare('SELECT ts, price FROM market_ticks WHERE symbol=? ORDER BY ts DESC LIMIT 200');
  $stC->execute([$sym]);
  $ticks = array_reverse($stC->fetchAll(PDO::FETCH_ASSOC) ?: []);
  if ($ticks) {
    $bucket = [];
    foreach ($ticks as $t) {
      $ts = (int)($t['ts'] ?? 0);
      $p = (float)($t['price'] ?? 0);
      if ($p <= 0 || $ts <= 0) continue;
      $bt = intdiv($ts, $tfSec) * $tfSec;
      if (!isset($bucket[$bt])) {
        $bucket[$bt] = ['time' => $bt, 'open' => $p, 'high' => $p, 'low' => $p, 'close' => $p];
      } else {
        $bucket[$bt]['high'] = max($bucket[$bt]['high'], $p);
        $bucket[$bt]['low'] = min($bucket[$bt]['low'], $p);
        $bucket[$bt]['close'] = $p;
      }
    }
    if ($bucket) {
      ksort($bucket);
      $lastCandle = array_values($bucket);
      $lastCandle = end($lastCandle) ?: null;
    }
  }

  $display = $snap ? (float)($snap['display_price'] ?? $snap['price'] ?? 0) : 0.0;
  $delta = ($snap && $lastCandle) ? abs($display - (float)$lastCandle['close']) : null;
  $massiveTicker = massive_market_ticker($sym, $assetType, $meta);
  $yahooTicker = yahoo_ticker_for_market($sym, $assetType, $meta);

  $out[] = [
    'symbol' => $sym,
    'type' => $assetType,
    'market' => $market,
    'quote' => $snap,
    'seed_price' => (float)($mr['seed_price'] ?? 0),
    'mapping' => [
      'massive_ticker' => $massiveTicker,
      'yahoo_ticker' => $yahooTicker,
      'polygon_ticker' => $meta['polygon_ticker'] ?? null,
    ],
    'last_candle' => $lastCandle,
    'quote_to_candle_delta' => $delta,
    'flags' => [
      'stale_quote' => $snap ? ((int)($snap['source_age_sec'] ?? 999999) > max(30, $tfSec * 2)) : true,
      'weak_source' => $snap ? in_array(strtolower((string)($snap['source'] ?? '')), ['seed','synthetic'], true) : true,
      'scale_risk' => $delta !== null && $display > 0 ? ($delta / max($display, 0.0000001) > 0.25) : false,
      'missing_history' => !$lastCandle,
    ],
    'now' => $now,
  ];
}

json_response(['ok' => true, 'items' => $out, 'tf' => $tf, 'tf_sec' => $tfSec]);
