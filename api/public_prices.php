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
  'EURUSD'=>1.154,'GBPUSD'=>1.336,'USDJPY'=>144.2,'USDCHF'=>0.796,
  'AUDUSD'=>0.653,'USDCAD'=>1.373,'NZDUSD'=>0.584,'EURGBP'=>0.863,
  'EURJPY'=>166.4,'GBPJPY'=>192.8,'EURCAD'=>1.583,'EURAUD'=>1.766,
  'EURCHF'=>0.918,'GBPCHF'=>1.064,'AUDCHF'=>0.520,'CADJPY'=>105.1,
  'CHFJPY'=>181.2,'NZDJPY'=>84.2,'AUDNZD'=>1.118,'AUDCAD'=>0.896,
  'GBPAUD'=>2.045,'USDMXN'=>18.9,'USDSEK'=>9.8,'USDNOK'=>10.4,
  'USDPLN'=>3.85,'USDTRY'=>38.2,'USDSGD'=>1.29,'USDHKD'=>7.82,
  'USDCNH'=>7.24,'USDBRL'=>5.55,'USDZAR'=>17.9,'USDILS'=>3.62,
  'USDTHB'=>33.5,'USDINR'=>83.8,'USDPHP'=>56.2,'EURHUF'=>405.0,
  'EURPLN'=>4.42,'EURTRY'=>44.1,'GBPTRY'=>51.1,'USDDKK'=>6.62,
];

const COMMODITY_SEEDS = [
  'XAUUSD'=>4330,'XAGUSD'=>38.5,'XPTUSD'=>1080,'XPDUSD'=>1030,
  'USOIL'=>62.5,'UKOIL'=>65.2,'NGAS'=>2.85,'BRENT'=>65.2,
  'COPPER'=>4.72,'WHEAT'=>540,'CORN'=>420,'SOYBEAN'=>1050,
  'SUGAR'=>18.2,'COTTON'=>68.0,'COFFEE'=>340,'COCOA'=>8500,
  'NATGAS'=>2.85,'LUMBER'=>520,'NICKEL'=>15800,'ZINC'=>2650,
  'ALUMINIUM'=>2420,'LEAD'=>2050,'TIN'=>31000,'HEATING_OIL'=>2.15,
  'RBOB_GAS'=>2.05,'OJ'=>450,'LEAN_HOGS'=>82,'LIVE_CATTLE'=>185,
];

const STOCK_SEEDS = [
  'AAPL'=>205,'TSLA'=>285,'NVDA'=>135,'MSFT'=>440,'GOOGL'=>175,
  'META'=>620,'AMZN'=>195,'NFLX'=>1180,'AMD'=>120,'INTC'=>22,
  'ORCL'=>165,'CRM'=>285,'PYPL'=>72,'V'=>310,'MA'=>530,
  'JPM'=>240,'BAC'=>42,'UNH'=>490,'JNJ'=>160,'PFE'=>26,
  'MRK'=>90,'CVX'=>155,'XOM'=>108,'WMT'=>92,'COST'=>960,
  'HD'=>380,'DIS'=>105,'BABA'=>125,'NKE'=>75,'SBUX'=>82,
  'GS'=>580,'MS'=>125,'SHOP'=>85,'SNAP'=>28,'PLTR'=>120,
  'COIN'=>265,'SQ'=>55,'ADBE'=>430,'UBER'=>80,'LYFT'=>14,
  'ZOOM'=>65,'RIVN'=>15,'GME'=>25,'SOFI'=>14,'DKNG'=>48,
  'RBLX'=>55,'HOOD'=>65,'LCID'=>3,'AMC'=>4,'OPEN'=>2,
];

const FUTURES_SEEDS = [
  'ES_F'=>5950,'NQ_F'=>21500,'YM_F'=>43000,'RTY_F'=>2100,
  'CL_F'=>62,'GC_F'=>4380,'ZN_F'=>112,'ZB_F'=>122,
  'ZC_F'=>420,'ZS_F'=>1050,'ZW_F'=>540,'SI_F'=>39,
  'HG_F'=>4.72,'NG_F'=>2.85,'RB_F'=>2.05,'HO_F'=>2.15,
  'VX_F'=>18,'BTC_F'=>69500,'ETH_F'=>2600,'DX_F'=>98,
  '6E_F'=>1.154,'6B_F'=>1.336,'6J_F'=>0.0069,'6C_F'=>0.729,
  '6A_F'=>0.653,'PA_F'=>1030,'PL_F'=>1080,'LE_F'=>185,'HE_F'=>82,
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
foreach (['commodities','stocks','futures'] as $t) {
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
$allSeeds = array_merge(FX_SEEDS, COMMODITY_SEEDS, STOCK_SEEDS, FUTURES_SEEDS);
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

echo json_encode(
  ['ok'=>true,'items'=>$items,'source'=>'public_prices','ts'=>time()],
  JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
