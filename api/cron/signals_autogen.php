<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/marketdata.php';
require_once __DIR__ . '/../lib/market_resolver.php';

function cron_input_token_sa(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $arg) {
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}
$token = cron_input_token_sa();
if ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token)) {
  http_response_code(403);
  echo 'Forbidden';
  exit;
}
header('Content-Type: application/json; charset=utf-8');

function sig_map_klines(array $kl): array {
  $out = [];
  foreach ($kl as $k) {
    if (!is_array($k) || count($k) < 6) continue;
    $t = (int)floor(((int)$k[0]) / 1000);
    $out[] = ['time'=>$t,'open'=>(float)$k[1],'high'=>(float)$k[2],'low'=>(float)$k[3],'close'=>(float)$k[4],'volume'=>(float)($k[5] ?? 0)];
  }
  return $out;
}
function sig_crypto_candles(string $symbol, string $tf='15m', int $limit=120): array {
  $symbol = strtoupper(trim($symbol));
  if ($symbol === '') return [];
  $url = 'https://api.binance.com/api/v3/klines?symbol=' . urlencode($symbol) . '&interval=' . urlencode($tf) . '&limit=' . max(20, min(500, $limit));
  try { $rows = http_get_json($url); } catch (Throwable $e) { $rows = []; }
  return is_array($rows) ? sig_map_klines($rows) : [];
}
function sig_series_ema(array $values, int $period): array {
  $out = [];
  if ($period <= 1) return $values;
  $k = 2 / ($period + 1);
  $ema = null;
  foreach ($values as $v) {
    $v = (float)$v;
    if ($ema === null) $ema = $v; else $ema = ($v * $k) + ($ema * (1 - $k));
    $out[] = $ema;
  }
  return $out;
}
function sig_series_rsi(array $values, int $period=14): array {
  $n = count($values); if ($n < 2) return array_fill(0, $n, 50.0);
  $gains=[]; $losses=[];
  for($i=1;$i<$n;$i++){ $d=(float)$values[$i]-(float)$values[$i-1]; $gains[] = max($d,0); $losses[] = max(-$d,0); }
  $avgGain = array_sum(array_slice($gains,0,$period)) / max(1,min($period,count($gains)));
  $avgLoss = array_sum(array_slice($losses,0,$period)) / max(1,min($period,count($losses)));
  $out = array_fill(0, $n, 50.0);
  for($i=$period;$i<count($gains);$i++){
    $avgGain = (($avgGain * ($period - 1)) + $gains[$i]) / $period;
    $avgLoss = (($avgLoss * ($period - 1)) + $losses[$i]) / $period;
    $rs = $avgLoss > 0 ? ($avgGain / $avgLoss) : 0;
    $out[$i+1] = $avgLoss > 0 ? (100 - (100 / (1 + $rs))) : 100.0;
  }
  return $out;
}
function sig_build_signal(array $candles): ?array {
  if (count($candles) < 40) return null;
  $closes = array_map(fn($c)=>(float)($c['close'] ?? 0), $candles);
  $emaFast = sig_series_ema($closes, 9);
  $emaSlow = sig_series_ema($closes, 21);
  $rsi = sig_series_rsi($closes, 14);
  $i = count($closes)-1; $p = $i-1;
  if ($p < 1) return null;
  $buyCross = $emaFast[$p] <= $emaSlow[$p] && $emaFast[$i] > $emaSlow[$i];
  $sellCross = $emaFast[$p] >= $emaSlow[$p] && $emaFast[$i] < $emaSlow[$i];
  $last = (float)$closes[$i];
  if (!($last > 0)) return null;
  if ($buyCross && $rsi[$i] >= 50 && $rsi[$i] <= 78) {
    $risk = max(0.0001, abs($last - (float)$candles[$p]['low']));
    return ['direction'=>'BUY','entry'=>$last,'sl'=>max(0,$last - $risk),'tp1'=>$last + ($risk * 1.5),'tp2'=>$last + ($risk * 2.5),'confidence'=>min(92, max(62, (int)round(60 + min(20, $rsi[$i] - 50)))),'rsi'=>round($rsi[$i],2)];
  }
  if ($sellCross && $rsi[$i] >= 22 && $rsi[$i] <= 50) {
    $risk = max(0.0001, abs((float)$candles[$p]['high'] - $last));
    return ['direction'=>'SELL','entry'=>$last,'sl'=>$last + $risk,'tp1'=>max(0,$last - ($risk * 1.5)),'tp2'=>max(0,$last - ($risk * 2.5)),'confidence'=>min(92, max(62, (int)round(60 + min(20, 50 - $rsi[$i])))),'rsi'=>round($rsi[$i],2)];
  }
  return null;
}
function sig_fetch_market_candles(string $symbol, string $type, array $meta, string $tf='15m', int $limit=120): array {
  $type = vp_normalize_asset_type($type);
  if ($type === 'crypto') return sig_crypto_candles($symbol, $tf, $limit);
  if ($type === 'stocks') {
    try {
      if (strtolower((string)env('PRICE_PROVIDER', 'eodhd')) === 'eodhd') {
        $e = eodhd_symbol_for_market($symbol, $type, $meta);
        if ($e) {
          $rows = eodhd_intraday_candles($e, $tf, $limit);
          if ($rows) return $rows;
        }
      }
    } catch (Throwable $e) {}
  }
  try {
    if (function_exists('twelvedata_enabled') && twelvedata_enabled()) {
      $td = twelvedata_symbol_for_market($symbol, $type, $meta) ?: twelvedata_symbol_for_market($symbol, vp_provider_asset_type($type), $meta);
      if ($td) {
        $rows = twelvedata_time_series_candles_cached($td, $tf, $limit, 0, max(30, min(3600, (int)env('TWELVEDATA_CANDLES_TTL', '60'))));
        if ($rows) return $rows;
      }
    }
  } catch (Throwable $e) {}
  if (!function_exists('quote_yahoo_enabled') || !quote_yahoo_enabled()) return [];
  try {
    $y = yahoo_ticker_for_market($symbol, $type, $meta) ?: yahoo_ticker_for_market($symbol, vp_provider_asset_type($type), $meta);
    if ($y) {
      $rows = yahoo_chart_candles($y, $tf, $limit);
      if ($rows) return $rows;
    }
  } catch (Throwable $e) {}
  return [];
}

$pdo = db();
$tf = (string)($_GET['tf'] ?? '15m');
$perType = max(2, min(10, (int)($_GET['per_type'] ?? 4)));
$types = ['crypto','forex','stocks','arab','commodities','futures'];
$now = time();
$inserted = []; $scanned = 0;
foreach ($types as $type) {
  $sql = "SELECT symbol,name,type,meta FROM markets WHERE status='active' AND type" . ($type === 'commodities' ? " IN ('commodities','metals')" : "=?") . " ORDER BY sort_order ASC, id ASC LIMIT " . (int)$perType;
  $st = $type === 'commodities' ? $pdo->query($sql) : (function() use ($pdo,$sql,$type){ $s=$pdo->prepare($sql); $s->execute([$type]); return $s; })();
  $rows = $st ? ($st->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
  foreach ($rows as $row) {
    $symbol = strtoupper(trim((string)($row['symbol'] ?? ''))); if ($symbol === '') continue;
    $meta = market_meta($row['meta'] ?? null);
    $candles = sig_fetch_market_candles($symbol, $type, $meta, $tf, 120);
    $scanned++;
    $sig = sig_build_signal($candles);
    if (!$sig) continue;
    $chk = $pdo->prepare("SELECT id FROM trading_signals WHERE market_symbol=? AND market_type=? AND timeframe=? AND direction=? AND created_at>=? ORDER BY id DESC LIMIT 1");
    $chk->execute([$symbol,$type,$tf,$sig['direction'],$now-21600]);
    if ($chk->fetch(PDO::FETCH_ASSOC)) continue;
    $noteEn = 'Auto signal engine • EMA9/EMA21 crossover • RSI ' . $sig['rsi'];
    $noteAr = 'إشارة تلقائية من محرك المنصة • تقاطع EMA9/EMA21 • RSI ' . $sig['rsi'];
    $stmt = $pdo->prepare("INSERT INTO trading_signals (market_symbol,market_type,timeframe,direction,entry_price,stop_loss,take_profit_1,take_profit_2,confidence,source,raw_payload,note_en,note_ar,status,valid_until,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $payload = json_encode(['engine'=>'internal_autogen','symbol'=>$symbol,'type'=>$type,'tf'=>$tf,'rsi'=>$sig['rsi']], JSON_UNESCAPED_UNICODE);
    $stmt->execute([$symbol,$type,$tf,$sig['direction'],$sig['entry'],$sig['sl'],$sig['tp1'],$sig['tp2'],$sig['confidence'],'internal_autogen',$payload,$noteEn,$noteAr,'active',$now + 86400,null,$now,$now]);
    $inserted[] = ['symbol'=>$symbol,'type'=>$type,'direction'=>$sig['direction'],'confidence'=>$sig['confidence']];
  }
}
echo json_encode(['ok'=>true,'scanned'=>$scanned,'inserted'=>$inserted,'hint'=>'Run this via cron every 5 minutes with token=CRON_KEY'], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
