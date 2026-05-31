<?php
declare(strict_types=1);
/**
 * api/public_prices.php
 * Dedicated price endpoint for public landing pages.
 * Supports mixed-type symbols (crypto + forex + commodities + stocks)
 * without relying on DB type lookup or purpose-based live restrictions.
 */
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ── Static symbol→type map ──────────────────────────────────────
$SYMBOL_TYPES = [
  'BTCUSDT'=>'crypto','ETHUSDT'=>'crypto','BNBUSDT'=>'crypto','SOLUSDT'=>'crypto',
  'XRPUSDT'=>'crypto','ADAUSDT'=>'crypto','DOGEUSDT'=>'crypto','LTCUSDT'=>'crypto',
  'DOTUSDT'=>'crypto','ATOMUSDT'=>'crypto','LINKUSDT'=>'crypto','MATICUSDT'=>'crypto',
  'SHIBUSDT'=>'crypto','AVAXUSDT'=>'crypto','UNIUSDT'=>'crypto','AAVEUSDT'=>'crypto',

  'EURUSD'=>'forex','GBPUSD'=>'forex','USDJPY'=>'forex','USDCHF'=>'forex',
  'AUDUSD'=>'forex','USDCAD'=>'forex','NZDUSD'=>'forex','EURGBP'=>'forex',
  'EURJPY'=>'forex','GBPJPY'=>'forex','EURCAD'=>'forex','EURCHF'=>'forex',

  'XAUUSD'=>'commodities','XAGUSD'=>'commodities','USOIL'=>'commodities',
  'NATGAS'=>'commodities','BRENT'=>'commodities','XPTUSD'=>'commodities',

  'AAPL'=>'stocks','TSLA'=>'stocks','NVDA'=>'stocks','MSFT'=>'stocks',
  'GOOGL'=>'stocks','META'=>'stocks','AMZN'=>'stocks','NFLX'=>'stocks',
  'AMD'=>'stocks','INTC'=>'stocks',

  'ES_F'=>'futures','NQ_F'=>'futures','YM_F'=>'futures',
];

// ── Parse requested symbols ─────────────────────────────────────
$raw = trim((string)($_GET['symbols'] ?? $_GET['symbol'] ?? ''));
$requested = array_values(array_unique(array_filter(
  array_map('strtoupper', explode(',', $raw))
)));

if (!$requested) {
  echo json_encode(['ok'=>true,'items'=>[],'source'=>'public_prices']);
  exit;
}

// ── Group by type ───────────────────────────────────────────────
$byType = [];
foreach ($requested as $sym) {
  $t = $SYMBOL_TYPES[$sym] ?? 'crypto';
  $byType[$t][] = $sym;
}

$priceMap = [];

// ── Fetch crypto (Binance live, fast) ───────────────────────────
if (!empty($byType['crypto'])) {
  try {
    $opts = [
      'allow_live'          => true,
      'allow_stale_display' => true,
      'allow_crypto_seed'   => false,
      'allow_noncrypto_seed'=> false,
      'direct_budget'       => count($byType['crypto']),
    ];
    $pl = qa_quote_payload('crypto', $byType['crypto'], $opts);
    foreach ($pl['items'] ?? [] as $item) {
      $priceMap[$item['symbol']] = $item;
    }
  } catch (Throwable $e) {}
}

// ── Fetch non-crypto (DB cache + Yahoo stale) ───────────────────
foreach (['forex','commodities','stocks','futures'] as $t) {
  if (empty($byType[$t])) continue;
  $syms = $byType[$t];
  try {
    $opts = [
      'allow_live'           => true,
      'allow_stale_display'  => true,
      'allow_noncrypto_seed' => false,
      'allow_crypto_seed'    => false,
      'direct_budget'        => 0,
      'direct_yahoo_budget'  => min(count($syms), 3),
      'chart_budget'         => min(count($syms), 2),
      'chart_budget_ms'      => 2500,
      'allow_direct_batch'   => true,
    ];
    $pl = qa_quote_payload($t, $syms, $opts);
    foreach ($pl['items'] ?? [] as $item) {
      $priceMap[$item['symbol']] = $item;
    }
  } catch (Throwable $e) {
    // If qa_quote_payload fails, try DB-only stale
    try {
      $pl2 = qa_quote_payload($t, $syms, [
        'allow_live'          => false,
        'allow_stale_display' => true,
      ]);
      foreach ($pl2['items'] ?? [] as $item) {
        if (!isset($priceMap[$item['symbol']])) {
          $priceMap[$item['symbol']] = $item;
        }
      }
    } catch (Throwable $e2) {}
  }
}

// ── Build unified response ──────────────────────────────────────
$items = [];
foreach ($requested as $sym) {
  $type   = $SYMBOL_TYPES[$sym] ?? 'crypto';
  $d      = is_array($priceMap[$sym] ?? null) ? $priceMap[$sym] : null;
  $price  = $d ? (float)($d['price'] ?? 0) : 0.0;
  $change = $d ? (float)($d['change_pct'] ?? 0) : 0.0;
  $source = $d ? (string)($d['source'] ?? 'unavailable') : 'unavailable';
  $live   = $price > 0 && !in_array(strtolower(trim($source)), ['unavailable','stale','seed','']);
  $items[] = [
    'symbol'     => $sym,
    'price'      => $price,
    'change_pct' => $change,
    'type'       => $type,
    'source'     => $source,
    'live'       => $live,
  ];
}

echo json_encode(
  ['ok' => true, 'items' => $items, 'source' => 'public_prices', 'ts' => time()],
  JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
