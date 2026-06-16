<?php
declare(strict_types=1);

/**
 * Yahoo REST Fallback Worker — free no-key prices for stocks, commodities, futures, forex.
 *
 * Run as daemon:
 *   php api/ws/yahoo_fallback.php
 * Or via cron every 10-30 seconds.
 *
 * This worker is the fallback when paid credits (Twelve Data) run out.
 * It covers stocks, commodities, futures and forex proxies via Yahoo Finance.
 */

@set_time_limit(0);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quote_central.php';
require_once __DIR__ . '/../lib/marketdata.php';
require_once __DIR__ . '/../markets.php';

$POLL_INTERVAL = max(5, (int)(getenv('YAHOO_FALLBACK_INTERVAL') ?: '10'));
$MAX_RUNTIME   = (int)(getenv('YAHOO_FALLBACK_MAX_RUNTIME') ?: '3600');

function yahooSymbolMap(string $symbol, string $type, array $def): ?string {
  if (!empty($def['yahoo_ticker'])) return strtoupper($def['yahoo_ticker']);

  $commodityMap = [
    'XAUUSD' => 'GC=F', 'XAGUSD' => 'SI=F', 'XPTUSD' => 'PL=F', 'XPDUSD' => 'PA=F',
    'USOIL'  => 'CL=F', 'UKOIL'  => 'BZ=F', 'NGAS'   => 'NG=F', 'COPPER' => 'HG=F',
    'WHEAT'  => 'ZW=F', 'CORN'   => 'ZC=F', 'SOYBEAN'=> 'ZS=F', 'SUGAR'  => 'SB=F',
    'COTTON' => 'CT=F', 'COFFEE' => 'KC=F', 'COCOA'  => 'CC=F', 'LUMBER' => 'LB=F',
    'OJ'     => 'OJ=F', 'LEAN_HOGS' => 'HE=F',
  ];

  if ($type === 'commodities') return $commodityMap[$symbol] ?? null;
  if ($type === 'futures') return $symbol;
  if ($type === 'forex') {
    $s = str_replace('USDT', 'USD', $symbol);
    if (strlen($s) >= 6) return substr($s, 0, 3) . substr($s, 3, 3) . '=X';
  }
  if ($type === 'stocks' || $type === 'arab') return $symbol;

  return null;
}

function collectYahooSymbols(): array {
  if (!function_exists('vp_supported_market_defs')) return [];
  $defs = vp_supported_market_defs();
  $map = [];
  foreach ($defs as $d) {
    $sym = strtoupper(trim((string)($d['symbol'] ?? '')));
    $type = strtolower(trim((string)($d['type'] ?? '')));
    if (!$sym || !$type || $type === 'crypto') continue;
    $ysym = yahooSymbolMap($sym, $type, $d);
    if ($ysym) $map[$ysym] = ['original' => $sym, 'type' => $type];
  }
  return $map;
}

function writePrice(string $symbol, string $type, float $price, float $changePct = 0, float $open = 0, float $prevClose = 0, string $source = 'yahoo_rest'): void {
  if ($price <= 0) return;
  $now = time();
  $entry = [
    'symbol' => strtoupper($symbol),
    'type' => strtolower($type),
    'price' => $price,
    'change_pct' => $changePct,
    'open' => $open,
    'prev_close' => $prevClose,
    'updated_at' => $now,
    'source' => $source,
    'central_ts' => $now,
    'received_at' => $now,
    'ingested_at' => $now,
  ];
  quote_central_write_file(strtoupper($symbol), $type, $entry);
  try {
    quote_upsert(strtoupper($symbol), $type, $price, $changePct, $now, [
      'source' => $source,
      'as_of' => $now,
      'ingested_at' => $now,
    ]);
  } catch (Throwable $e) {}
}

echo "=== Yahoo Fallback Worker Starting (interval={$POLL_INTERVAL}s) ===\n";

$startTime = time();
while (true) {
  if ((time() - $startTime) >= $MAX_RUNTIME) {
    echo "Max runtime reached, exiting for restart...\n";
    break;
  }

  $map = collectYahooSymbols();
  if (empty($map)) {
    sleep($POLL_INTERVAL);
    continue;
  }

  $symbols = array_keys($map);
  $chunks = array_chunk($symbols, 30);
  $total = 0;

  foreach ($chunks as $chunk) {
    try {
      $quotes = yahoo_quote_many_cached($chunk, 5);
      foreach ($quotes as $ysym => $q) {
        $info = $map[$ysym] ?? null;
        if (!$info) continue;
        $price = (float)($q['price'] ?? 0);
        if ($price <= 0) continue;
        writePrice($info['original'], $info['type'], $price, (float)($q['change_pct'] ?? 0), (float)($q['open'] ?? 0), (float)($q['prev_close'] ?? 0), 'yahoo_rest');
        $total++;
      }
    } catch (Throwable $e) {}
  }

  if ($total > 0) {
    echo "[" . date('H:i:s') . "] Yahoo fallback updated {$total} symbols\n";
  }

  sleep($POLL_INTERVAL);
}

echo "=== Yahoo Fallback Worker Stopped ===\n";
