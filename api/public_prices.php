<?php
declare(strict_types=1);
/**
 * api/public_prices.php
 * Dedicated mixed-type price endpoint for public landing pages.
 * Forex: Frankfurter ECB (free, reliable) → qa_quote_payload fallback
 * Crypto: Binance live via qa_quote_payload
 * Commodities/Stocks: qa_quote_payload with stale display allowed
 */
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_frankfurter.php';

header('Cache-Control: public, max-age=3, s-maxage=3');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ── Hardcoded symbol seed prices (absolute fallback) ──────────────────────────
const FX_SEEDS = [
  'EURUSD'=>1.135,'GBPUSD'=>1.336,'USDJPY'=>144.2,'USDCHF'=>0.822,
  'AUDUSD'=>0.653,'USDCAD'=>1.365,'NZDUSD'=>0.596,'EURGBP'=>0.850,
  'EURJPY'=>163.7,'GBPJPY'=>192.5,'EURCAD'=>1.549,'EURAUD'=>1.737,
  'EURCHF'=>0.934,'GBPCHF'=>1.098,'AUDCHF'=>0.537,'CADJPY'=>105.7,
  'CHFJPY'=>175.5,'NZDJPY'=>85.9,'AUDNZD'=>1.095,'AUDCAD'=>0.892,
  'GBPAUD'=>2.043,'USDMXN'=>19.2,'USDSEK'=>9.8,'USDNOK'=>10.4,
  'USDPLN'=>3.82,'USDTRY'=>38.5,'USDSGD'=>1.29,'USDHKD'=>7.82,
  'USDCNH'=>7.24,'USDBRL'=>5.65,'USDZAR'=>18.2,'USDILS'=>3.62,
  'USDTHB'=>33.5,'USDINR'=>83.5,'USDPHP'=>56.2,'EURHUF'=>405.0,
  'EURPLN'=>4.33,'EURTRY'=>43.7,'GBPTRY'=>51.4,'USDDKK'=>6.72,
];

const COMMODITY_SEEDS = [
  'XAUUSD'=>3315,'XAGUSD'=>33.5,'XPTUSD'=>1080,'XPDUSD'=>1010,
  'USOIL'=>62.5,'UKOIL'=>65.8,'NGAS'=>3.45,'BRENT'=>65.8,
  'COPPER'=>4.72,'WHEAT'=>525,'CORN'=>435,'SOYBEAN'=>1055,
  'SUGAR'=>18.8,'COTTON'=>68.0,'COFFEE'=>320,'COCOA'=>8500,
  'NATGAS'=>3.45,'LUMBER'=>560,'NICKEL'=>15500,'ZINC'=>2650,
  'ALUMINIUM'=>2480,'LEAD'=>2050,'TIN'=>30200,'HEATING_OIL'=>2.15,
  'RBOB_GAS'=>2.05,'RBOB'=>2.05,'OJ'=>450,'OATS'=>340,'RICE'=>17.5,
  'MILK'=>17.0,'LEAN_HOGS'=>85,'LIVE_CATTLE'=>198,'FEEDER_CATTLE'=>260,
];

const STOCK_SEEDS = [
  'AAPL'=>232,'TSLA'=>342,'NVDA'=>135,'MSFT'=>452,'GOOGL'=>178,
  'META'=>625,'AMZN'=>205,'NFLX'=>1080,'AMD'=>118,'INTC'=>22,
  'ORCL'=>175,'CRM'=>285,'PYPL'=>72,'V'=>335,'MA'=>575,
  'JPM'=>245,'BAC'=>42,'UNH'=>315,'JNJ'=>162,'PFE'=>27,
  'MRK'=>90,'CVX'=>155,'XOM'=>108,'WMT'=>92,'COST'=>1010,
  'HD'=>385,'DIS'=>112,'BABA'=>125,'NKE'=>78,'SBUX'=>88,
  'GS'=>580,'MS'=>125,'SHOP'=>95,'SNAP'=>28,'PLTR'=>125,
  'COIN'=>265,'SQ'=>62,'ADBE'=>455,'UBER'=>85,'LYFT'=>15,
  'ZOOM'=>72,'RIVN'=>28,'GME'=>28,'SOFI'=>14,'DKNG'=>48,
  'RBLX'=>75,'HOOD'=>62,'LCID'=>22,'AMC'=>5,'OPEN'=>12,
];

const FUTURES_SEEDS = [
  'ES_F'=>5950,'NQ_F'=>21500,'YM_F'=>42800,'RTY_F'=>2350,
  'CL_F'=>62,'GC_F'=>3315,'ZN_F'=>111,'ZB_F'=>120,
  'ZC_F'=>435,'ZS_F'=>1055,'ZW_F'=>525,'SI_F'=>33.5,
  'HG_F'=>4.72,'NG_F'=>3.45,'RB_F'=>2.05,'HO_F'=>2.15,
  'VX_F'=>18,'BTC_F'=>104000,'ETH_F'=>2550,'DX_F'=>99,
  '6E_F'=>1.135,'6B_F'=>1.336,'6J_F'=>0.0069,'6C_F'=>0.733,
  '6A_F'=>0.653,'PA_F'=>1010,'PL_F'=>1080,'LE_F'=>198,'HE_F'=>85,
  'NKD_F'=>38750,'BZ_F'=>65.8,'EMD_F'=>3200,
];

const ARAB_SEEDS = [
  '2222'=>30,'1120'=>95,'2010'=>75,'7010'=>40,'1211'=>50,'1150'=>34,
  '1180'=>36,'2280'=>58,'1010'=>28,'1020'=>22,'1030'=>24,'1050'=>32,
  '2050'=>28,'2080'=>45,'7020'=>15,'7030'=>18,'2040'=>12,'2060'=>20,
  '2090'=>16,'2100'=>18,'4001'=>12,'4002'=>35,'4190'=>145,'4200'=>42,
  '4210'=>18,'4240'=>15,'4260'=>88,'4280'=>60,'4300'=>110,'4321'=>28,
  '2150'=>14,'2160'=>16,'2170'=>75,'2180'=>22,
];

// ── Static symbol→type map ──────────────────────────────────────────────────
$SYMBOL_TYPES = [
  // Crypto
  'BTCUSDT'=>'crypto','ETHUSDT'=>'crypto','BNBUSDT'=>'crypto','SOLUSDT'=>'crypto',
  'XRPUSDT'=>'crypto','ADAUSDT'=>'crypto','DOGEUSDT'=>'crypto','LTCUSDT'=>'crypto',
  'DOTUSDT'=>'crypto','ATOMUSDT'=>'crypto','LINKUSDT'=>'crypto','MATICUSDT'=>'crypto',
  'SHIBUSDT'=>'crypto','AVAXUSDT'=>'crypto','UNIUSDT'=>'crypto','AAVEUSDT'=>'crypto',
  'TRXUSDT'=>'crypto','XLMUSDT'=>'crypto','ETCUSDT'=>'crypto','NEARUSDT'=>'crypto',
  'VETUSDT'=>'crypto','SANDUSDT'=>'crypto','MANAUSDT'=>'crypto','ALGOUSDT'=>'crypto',
  'ICPUSDT'=>'crypto','FILUSDT'=>'crypto','APTUSDT'=>'crypto','ARBUSDT'=>'crypto',
  'OPUSDT'=>'crypto','INJUSDT'=>'crypto','SUIUSDT'=>'crypto','GRTUSDT'=>'crypto',
  'CRVUSDT'=>'crypto','COMPUSDT'=>'crypto','SNXUSDT'=>'crypto','ZECUSDT'=>'crypto',
  'DASHUSDT'=>'crypto','MKRUSDT'=>'crypto','FETUSDT'=>'crypto','STXUSDT'=>'crypto',
  // Forex
  'EURUSD'=>'forex','GBPUSD'=>'forex','USDJPY'=>'forex','USDCHF'=>'forex',
  'AUDUSD'=>'forex','USDCAD'=>'forex','NZDUSD'=>'forex','EURGBP'=>'forex',
  'EURJPY'=>'forex','GBPJPY'=>'forex','EURCAD'=>'forex','EURAUD'=>'forex',
  'EURCHF'=>'forex','EURNZD'=>'forex','GBPAUD'=>'forex','GBPCAD'=>'forex',
  'GBPCHF'=>'forex','GBPNZD'=>'forex','AUDCAD'=>'forex','AUDCHF'=>'forex',
  'AUDNZD'=>'forex','AUDJPY'=>'forex','CADJPY'=>'forex','CHFJPY'=>'forex',
  'NZDJPY'=>'forex','CADCHF'=>'forex','NZDCAD'=>'forex','USDMXN'=>'forex',
  'USDSEK'=>'forex','USDNOK'=>'forex','USDPLN'=>'forex','USDTRY'=>'forex',
  'USDSGD'=>'forex','USDHKD'=>'forex','USDDKK'=>'forex','USDBRL'=>'forex',
  'USDZAR'=>'forex','USDCNH'=>'forex','USDILS'=>'forex','USDTHB'=>'forex',
  'USDINR'=>'forex','USDPHP'=>'forex','EURHUF'=>'forex','EURPLN'=>'forex',
  'EURTRY'=>'forex','GBPTRY'=>'forex',
  // Commodities
  'XAUUSD'=>'commodities','XAGUSD'=>'commodities','XPTUSD'=>'commodities','XPDUSD'=>'commodities',
  'USOIL'=>'commodities','UKOIL'=>'commodities','NGAS'=>'commodities','BRENT'=>'commodities',
  'NATGAS'=>'commodities','COPPER'=>'commodities','WHEAT'=>'commodities','CORN'=>'commodities',
  'SOYBEAN'=>'commodities','SUGAR'=>'commodities','COTTON'=>'commodities','COFFEE'=>'commodities',
  'COCOA'=>'commodities','LUMBER'=>'commodities','NICKEL'=>'commodities','ZINC'=>'commodities',
  'ALUMINIUM'=>'commodities','LEAD'=>'commodities','TIN'=>'commodities','OJ'=>'commodities',
  'LEAN_HOGS'=>'commodities','LIVE_CATTLE'=>'commodities','HEATING_OIL'=>'commodities',
  'RBOB'=>'commodities','OATS'=>'commodities','RICE'=>'commodities','MILK'=>'commodities',
  'FEEDER_CATTLE'=>'commodities',
  // Stocks
  'AAPL'=>'stocks','TSLA'=>'stocks','NVDA'=>'stocks','MSFT'=>'stocks','GOOGL'=>'stocks',
  'META'=>'stocks','AMZN'=>'stocks','NFLX'=>'stocks','AMD'=>'stocks','INTC'=>'stocks',
  'ORCL'=>'stocks','CRM'=>'stocks','PYPL'=>'stocks','V'=>'stocks','MA'=>'stocks',
  'JPM'=>'stocks','BAC'=>'stocks','UNH'=>'stocks','JNJ'=>'stocks','PFE'=>'stocks',
  'MRK'=>'stocks','CVX'=>'stocks','XOM'=>'stocks','WMT'=>'stocks','COST'=>'stocks',
  'HD'=>'stocks','DIS'=>'stocks','BABA'=>'stocks','NKE'=>'stocks','SBUX'=>'stocks',
  'GS'=>'stocks','MS'=>'stocks','SHOP'=>'stocks','SNAP'=>'stocks','PLTR'=>'stocks',
  'COIN'=>'stocks','SQ'=>'stocks','ADBE'=>'stocks','UBER'=>'stocks','LYFT'=>'stocks',
  'ZOOM'=>'stocks','RIVN'=>'stocks','GME'=>'stocks','SOFI'=>'stocks','DKNG'=>'stocks',
  'RBLX'=>'stocks','HOOD'=>'stocks','LCID'=>'stocks','AMC'=>'stocks',
  // Futures
  'ES_F'=>'futures','NQ_F'=>'futures','YM_F'=>'futures','RTY_F'=>'futures',
  'CL_F'=>'futures','GC_F'=>'futures','ZN_F'=>'futures','ZB_F'=>'futures',
  'ZC_F'=>'futures','ZS_F'=>'futures','ZW_F'=>'futures','SI_F'=>'futures',
  'HG_F'=>'futures','NG_F'=>'futures','RB_F'=>'futures','HO_F'=>'futures',
  'VX_F'=>'futures','BTC_F'=>'futures','ETH_F'=>'futures','DX_F'=>'futures',
  '6E_F'=>'futures','6B_F'=>'futures','6J_F'=>'futures','6C_F'=>'futures',
  '6A_F'=>'futures','PA_F'=>'futures','PL_F'=>'futures','LE_F'=>'futures','HE_F'=>'futures',
  'NKD_F'=>'futures','BZ_F'=>'futures','EMD_F'=>'futures',
  // Arab equities
  '2222'=>'arab','1120'=>'arab','2010'=>'arab','7010'=>'arab','1211'=>'arab','1150'=>'arab',
  '1180'=>'arab','2280'=>'arab','1010'=>'arab','1020'=>'arab','1030'=>'arab','1050'=>'arab',
  '2050'=>'arab','2080'=>'arab','7020'=>'arab','7030'=>'arab','2040'=>'arab','2060'=>'arab',
  '2090'=>'arab','2100'=>'arab','4001'=>'arab','4002'=>'arab','4190'=>'arab','4200'=>'arab',
  '4210'=>'arab','4240'=>'arab','4260'=>'arab','4280'=>'arab','4300'=>'arab','4321'=>'arab',
  '2150'=>'arab','2160'=>'arab','2170'=>'arab','2180'=>'arab',
];

// ── Parse request ───────────────────────────────────────────────────────────
$raw = trim((string)($_GET['symbols'] ?? $_GET['symbol'] ?? ''));
$requested = array_values(array_unique(array_filter(
  array_map('strtoupper', explode(',', $raw))
)));

if (!$requested) {
  echo json_encode(['ok'=>true,'items'=>[],'source'=>'public_prices']);
  exit;
}

// ── Server-side cache (serve-stale-while-revalidate) ─────────────────────────
// Upstream live fetches (Binance / Frankfurter / Yahoo) are slow & variable.
// Strategy: serve a fresh cache instantly; if stale, serve the stale copy
// immediately and refresh in the background (FPM) so users never wait.
$_pp_keybase = $requested;
sort($_pp_keybase);
$_pp_cacheDir  = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR;
$_pp_cacheFile = $_pp_cacheDir . '/pubprices_' . substr(sha1(implode(',', $_pp_keybase)), 0, 20) . '.json';
$_pp_ttl        = 12;   // considered fresh (seconds)
$_pp_maxStale   = 180;  // serve stale up to this age when background refresh is unavailable
$_pp_refreshOnly = false;

$_pp_cached = is_file($_pp_cacheFile) ? @file_get_contents($_pp_cacheFile) : false;
$_pp_age    = is_file($_pp_cacheFile) ? (time() - (int)@filemtime($_pp_cacheFile)) : PHP_INT_MAX;
if (is_string($_pp_cached) && $_pp_cached !== '') {
  if ($_pp_age < $_pp_ttl) {
    echo $_pp_cached;                 // fresh → done
    exit;
  }
  if (function_exists('fastcgi_finish_request')) {
    echo $_pp_cached;                 // stale → serve now, refresh in background
    @ob_flush(); @flush();
    @fastcgi_finish_request();
    $_pp_refreshOnly = true;
  } elseif ($_pp_age < $_pp_maxStale) {
    echo $_pp_cached;                 // stale but acceptable; skip blocking refresh
    exit;
  }
}

// ── Group by type ──────────────────────────────────────────────────────────
$byType = [];
foreach ($requested as $sym) {
  $t = $SYMBOL_TYPES[$sym] ?? 'crypto';
  $byType[$t][] = $sym;
}

$priceMap = [];

// ── Fetch crypto (Binance) ──────────────────────────────────────────────────
if (!empty($byType['crypto'])) {
  try {
    $pl = qa_quote_payload('crypto', $byType['crypto'], [
      'allow_live'=>true,'allow_stale_display'=>true,
      'allow_crypto_seed'=>false,'direct_budget'=>count($byType['crypto']),
    ]);
    foreach ($pl['items'] ?? [] as $item) {
      if (($item['price'] ?? 0) > 0) $priceMap[$item['symbol']] = $item;
    }
  } catch (Throwable $e) {}
}

// ── Fetch forex via Frankfurter ────────────────────────────────────────────
if (!empty($byType['forex'])) {
  $fxSymbols = $byType['forex'];
  $fxData    = [];
  try {
    $fxData = fx_fetch_frankfurter($fxSymbols);
  } catch (Throwable $e) {}

  foreach ($fxSymbols as $sym) {
    if (isset($fxData[$sym]) && ($fxData[$sym]['price'] ?? 0) > 0) {
      $priceMap[$sym] = [
        'symbol'     => $sym,
        'price'      => $fxData[$sym]['price'],
        'change_pct' => $fxData[$sym]['change_pct'] ?? 0,
        'source'     => 'frankfurter',
      ];
    }
  }

  // Fallback: qa_quote_payload for any still missing
  $missingFx = array_filter($fxSymbols, fn($s) => !isset($priceMap[$s]));
  if ($missingFx) {
    try {
      $pl2 = qa_quote_payload('forex', array_values($missingFx), [
        'allow_live'=>true,'allow_stale_display'=>true,
        'allow_noncrypto_seed'=>false,'direct_yahoo_budget'=>2,
      ]);
      foreach ($pl2['items'] ?? [] as $item) {
        if (($item['price'] ?? 0) > 0 && !isset($priceMap[$item['symbol']])) {
          $priceMap[$item['symbol']] = $item;
        }
      }
    } catch (Throwable $e) {}
  }
}

// ── Fetch commodities & stocks ──────────────────────────────────────────────
foreach (['commodities','stocks','futures','arab'] as $t) {
  if (empty($byType[$t])) continue;
  try {
    $pl = qa_quote_payload($t, $byType[$t], [
      'allow_live'=>true,'allow_stale_display'=>true,
      'allow_noncrypto_seed'=>false,'direct_yahoo_budget'=>min(count($byType[$t]),3),
      'chart_budget'=>min(count($byType[$t]),2),'chart_budget_ms'=>2500,'allow_direct_batch'=>true,
    ]);
    foreach ($pl['items'] ?? [] as $item) {
      if (($item['price'] ?? 0) > 0) $priceMap[$item['symbol']] = $item;
    }
  } catch (Throwable $e) {}
}

// ── Build response with seed fallbacks ─────────────────────────────────────
$allSeeds = FX_SEEDS + COMMODITY_SEEDS + STOCK_SEEDS + FUTURES_SEEDS + ARAB_SEEDS;
$items = [];
foreach ($requested as $sym) {
  $type  = $SYMBOL_TYPES[$sym] ?? 'crypto';
  $d     = is_array($priceMap[$sym] ?? null) ? $priceMap[$sym] : null;
  $price = $d ? (float)($d['price'] ?? 0) : 0.0;
  $chg   = $d ? (float)($d['change_pct'] ?? 0) : 0.0;
  $src   = $d ? (string)($d['source'] ?? 'unavailable') : 'unavailable';

  if ($price <= 0 && isset($allSeeds[$sym])) {
    $price = (float)$allSeeds[$sym];
    $src   = 'seed';
    $chg   = 0;
  }

  $items[] = [
    'symbol'     => $sym,
    'price'      => $price,
    'change_pct' => $chg,
    'type'       => $type,
    'source'     => $src,
    'live'       => $price > 0 && $src !== 'seed' && $src !== 'unavailable',
  ];
}

$_pp_out = json_encode(
  ['ok'=>true,'items'=>$items,'source'=>'public_prices','ts'=>time()],
  JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
if (!is_dir($_pp_cacheDir)) { @mkdir($_pp_cacheDir, 0775, true); }
@file_put_contents($_pp_cacheFile, $_pp_out, LOCK_EX);
if (!$_pp_refreshOnly) { echo $_pp_out; }
