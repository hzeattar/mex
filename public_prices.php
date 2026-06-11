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
  'EURUSD'=>1.084,'GBPUSD'=>1.268,'USDJPY'=>155.2,'USDCHF'=>0.906,
  'AUDUSD'=>0.654,'USDCAD'=>1.365,'NZDUSD'=>0.606,'EURGBP'=>0.855,
  'EURJPY'=>168.2,'GBPJPY'=>196.8,'EURCAD'=>1.479,'EURAUD'=>1.657,
  'EURCHF'=>0.981,'GBPCHF'=>1.148,'AUDCHF'=>0.592,'CADJPY'=>113.7,
  'CHFJPY'=>171.2,'NZDJPY'=>94.0,'AUDNZD'=>1.079,'AUDCAD'=>0.894,
  'GBPAUD'=>1.939,'USDMXN'=>17.2,'USDSEK'=>10.6,'USDNOK'=>10.8,
  'USDPLN'=>4.02,'USDTRY'=>32.5,'USDSGD'=>1.35,'USDHKD'=>7.82,
  'USDCNH'=>7.25,'USDBRL'=>5.05,'USDZAR'=>18.8,'USDILS'=>3.72,
  'USDTHB'=>35.8,'USDINR'=>83.5,'USDPHP'=>58.2,'EURHUF'=>393.0,
  'EURPLN'=>4.26,'EURTRY'=>35.2,'GBPTRY'=>41.2,'USDDKK'=>6.89,
];

const COMMODITY_SEEDS = [
  'XAUUSD'=>3380,'XAGUSD'=>34.2,'XPTUSD'=>1020,'XPDUSD'=>980,
  'USOIL'=>78.5,'UKOIL'=>83.2,'NGAS'=>2.15,'BRENT'=>83.2,
  'COPPER'=>4.55,'WHEAT'=>580,'CORN'=>440,'SOYBEAN'=>1180,
  'SUGAR'=>19.5,'COTTON'=>77.0,'COFFEE'=>185,'COCOA'=>9200,
  'NATGAS'=>2.15,'LUMBER'=>540,'NICKEL'=>17800,'ZINC'=>2800,
  'ALUMINIUM'=>2680,'LEAD'=>2100,'TIN'=>29500,'HEATING_OIL'=>2.45,
  'RBOB_GAS'=>2.35,'RBOB'=>2.35,'OJ'=>430,'OATS'=>360,'RICE'=>18.5,
  'MILK'=>18.0,'LEAN_HOGS'=>90,'LIVE_CATTLE'=>192,'FEEDER_CATTLE'=>255,
];

const STOCK_SEEDS = [
  'AAPL'=>187,'TSLA'=>172,'NVDA'=>875,'MSFT'=>410,'GOOGL'=>165,
  'META'=>470,'AMZN'=>178,'NFLX'=>640,'AMD'=>168,'INTC'=>34,
  'ORCL'=>122,'CRM'=>275,'PYPL'=>66,'V'=>278,'MA'=>470,
  'JPM'=>195,'BAC'=>38,'UNH'=>510,'JNJ'=>156,'PFE'=>27,
  'MRK'=>128,'CVX'=>162,'XOM'=>115,'WMT'=>68,'COST'=>820,
  'HD'=>345,'DIS'=>115,'BABA'=>78,'NKE'=>96,'SBUX'=>76,
  'GS'=>456,'MS'=>98,'SHOP'=>73,'SNAP'=>17,'PLTR'=>22,
  'COIN'=>230,'SQ'=>72,'ADBE'=>475,'UBER'=>74,'LYFT'=>18,
  'ZOOM'=>65,'RIVN'=>12,'GME'=>17,'SOFI'=>9,'DKNG'=>41,
  'RBLX'=>35,'HOOD'=>18,'LCID'=>3,'AMC'=>4,'OPEN'=>2,
];

const FUTURES_SEEDS = [
  'ES_F'=>5200,'NQ_F'=>18500,'YM_F'=>39000,'RTY_F'=>2050,
  'CL_F'=>78,'GC_F'=>2350,'ZN_F'=>110,'ZB_F'=>120,
  'ZC_F'=>440,'ZS_F'=>1185,'ZW_F'=>580,'SI_F'=>29,
  'HG_F'=>4.55,'NG_F'=>2.15,'RB_F'=>2.35,'HO_F'=>2.45,
  'VX_F'=>14,'BTC_F'=>68000,'ETH_F'=>3500,'DX_F'=>104,
  '6E_F'=>1.084,'6B_F'=>1.268,'6J_F'=>0.0064,'6C_F'=>0.733,
  '6A_F'=>0.654,'PA_F'=>960,'PL_F'=>950,'LE_F'=>192,'HE_F'=>90,
  'NKD_F'=>38750,'BZ_F'=>83.2,'EMD_F'=>2950,
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

echo json_encode(
  ['ok'=>true,'items'=>$items,'source'=>'public_prices','ts'=>time()],
  JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
