<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/asset_reference.php';

/**
 * Markets list for Mini App.
 * Supports:
 *   ?type=crypto|forex|stocks|commodities|all
 *   ?grouped=1  => returns groups + items
 *   ?with_quotes=1 => overlay cached live quotes (bulk, shared-hosting friendly)
 */
$type = strtolower((string)($_GET['type'] ?? 'all'));
$typeAlias = ($type === 'all' || $type === '') ? 'all' : vp_normalize_asset_type($type);
$typeProvider = ($typeAlias === 'all') ? 'all' : vp_provider_asset_type($typeAlias);
$grouped = isset($_GET['grouped']);
$withQuotes = (int)($_GET['with_quotes'] ?? 0) === 1;
$lite = (int)($_GET['lite'] ?? 0) === 1;
$forceLive = ((int)($_GET['force_live'] ?? 0) === 1);
$scope = strtolower((string)($_GET['scope'] ?? ''));
$requestLimit = (int)($_GET['limit'] ?? 0);
$requestLimit = $requestLimit > 0 ? max(6, min(80, $requestLimit)) : 0;
$supportedOnly = ((int)($_GET['supported'] ?? 0) === 1) || in_array($scope, ['home', 'trade'], true);
$supportedInteractive = $withQuotes && $supportedOnly && in_array($scope, ['home', 'trade'], true);
$disableSupportedRescue = ((int)($_GET['no_rescue'] ?? 0) === 1)
  || ((int)env('MARKETS_SUPPORTED_RESCUE_DISABLED', '0') === 1);
$allowListRescue = $forceLive
  || ($supportedInteractive && !$disableSupportedRescue)
  || ((int)($_GET['rescue'] ?? env('MARKETS_RESCUE_LIVE_ON_MISS', '0')) === 1);

header('Cache-Control: public, max-age=5, s-maxage=5');
header('Pragma: no-cache');
header('X-MEX-Markets-Build: price-ref-v20');

$GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
  'connect_timeout' => max(1, min(2, (int)env('MARKETS_UPSTREAM_CONNECT_TIMEOUT', '1'))),
  'timeout' => max(1, min(3, (int)env('MARKETS_UPSTREAM_TIMEOUT', '2'))),
  'retries' => 0,
];

function vp_supported_market_defs(): array {
  return [
    // ── CRYPTO (50+) ────────────────────────────────────────────────────────
    ['symbol'=>'BTCUSDT', 'name'=>'Bitcoin / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:BTCUSDT', 'sort_order'=>10, 'seed_price'=>69500,   'icon'=>'btc'],
    ['symbol'=>'ETHUSDT', 'name'=>'Ethereum / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:ETHUSDT', 'sort_order'=>12, 'seed_price'=>2600,    'icon'=>'eth'],
    ['symbol'=>'SOLUSDT', 'name'=>'Solana / Tether',         'type'=>'crypto','tv_symbol'=>'BINANCE:SOLUSDT', 'sort_order'=>14, 'seed_price'=>2.15,     'icon'=>'sol'],
    ['symbol'=>'XRPUSDT', 'name'=>'XRP / Tether',            'type'=>'crypto','tv_symbol'=>'BINANCE:XRPUSDT', 'sort_order'=>16, 'seed_price'=>2.15,     'icon'=>'xrp'],
    ['symbol'=>'BNBUSDT', 'name'=>'BNB / Tether',            'type'=>'crypto','tv_symbol'=>'BINANCE:BNBUSDT', 'sort_order'=>18, 'seed_price'=>650,     'icon'=>'bnb'],
    ['symbol'=>'DOGEUSDT','name'=>'Dogecoin / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:DOGEUSDT','sort_order'=>20, 'seed_price'=>0.19,    'icon'=>'doge'],
    ['symbol'=>'ADAUSDT', 'name'=>'Cardano / Tether',         'type'=>'crypto','tv_symbol'=>'BINANCE:ADAUSDT', 'sort_order'=>22, 'seed_price'=>0.72,    'icon'=>'ada'],
    ['symbol'=>'AVAXUSDT','name'=>'Avalanche / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:AVAXUSDT','sort_order'=>24, 'seed_price'=>122,      'icon'=>'avax'],
    ['symbol'=>'LINKUSDT','name'=>'Chainlink / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:LINKUSDT','sort_order'=>26, 'seed_price'=>18,      'icon'=>'link'],
    ['symbol'=>'DOTUSDT', 'name'=>'Polkadot / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:DOTUSDT', 'sort_order'=>28, 'seed_price'=>4.2,       'icon'=>'dot'],
    ['symbol'=>'LTCUSDT', 'name'=>'Litecoin / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:LTCUSDT', 'sort_order'=>30, 'seed_price'=>95,      'icon'=>'ltc'],
    ['symbol'=>'MATICUSDT','name'=>'Polygon / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:MATICUSDT','sort_order'=>32,'seed_price'=>0.12,    'icon'=>'matic'],
    ['symbol'=>'UNIUSDT', 'name'=>'Uniswap / Tether',         'type'=>'crypto','tv_symbol'=>'BINANCE:UNIUSDT', 'sort_order'=>34, 'seed_price'=>6.5,       'icon'=>'uni'],
    ['symbol'=>'ATOMUSDT','name'=>'Cosmos / Tether',           'type'=>'crypto','tv_symbol'=>'BINANCE:ATOMUSDT','sort_order'=>36, 'seed_price'=>8.5,       'icon'=>'atom'],
    ['symbol'=>'ETCUSDT', 'name'=>'Ethereum Classic / Tether','type'=>'crypto','tv_symbol'=>'BINANCE:ETCUSDT', 'sort_order'=>38, 'seed_price'=>122,      'icon'=>'etc'],
    ['symbol'=>'XLMUSDT', 'name'=>'Stellar / Tether',         'type'=>'crypto','tv_symbol'=>'BINANCE:XLMUSDT', 'sort_order'=>40, 'seed_price'=>0.19,    'icon'=>'xlm'],
    ['symbol'=>'TRXUSDT', 'name'=>'TRON / Tether',            'type'=>'crypto','tv_symbol'=>'BINANCE:TRXUSDT', 'sort_order'=>42, 'seed_price'=>0.19,    'icon'=>'trx'],
    ['symbol'=>'SHIBUSDT','name'=>'Shiba Inu / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:SHIBUSDT','sort_order'=>44, 'seed_price'=>0.000013,'icon'=>'shib'],
    ['symbol'=>'NEARUSDT','name'=>'NEAR Protocol / Tether',   'type'=>'crypto','tv_symbol'=>'BINANCE:NEARUSDT','sort_order'=>46, 'seed_price'=>3.2,     'icon'=>'near'],
    ['symbol'=>'VETUSDT', 'name'=>'VeChain / Tether',         'type'=>'crypto','tv_symbol'=>'BINANCE:VETUSDT', 'sort_order'=>48, 'seed_price'=>0.025,   'icon'=>'vet'],
    ['symbol'=>'SANDUSDT','name'=>'The Sandbox / Tether',     'type'=>'crypto','tv_symbol'=>'BINANCE:SANDUSDT','sort_order'=>50, 'seed_price'=>0.72,    'icon'=>'sand'],
    ['symbol'=>'MANAUSDT','name'=>'Decentraland / Tether',    'type'=>'crypto','tv_symbol'=>'BINANCE:MANAUSDT','sort_order'=>52, 'seed_price'=>0.40,    'icon'=>'mana'],
    ['symbol'=>'ALGOUSDT','name'=>'Algorand / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:ALGOUSDT','sort_order'=>54, 'seed_price'=>0.2,    'icon'=>'algo'],
    ['symbol'=>'AAVEUSDT','name'=>'Aave / Tether',            'type'=>'crypto','tv_symbol'=>'BINANCE:AAVEUSDT','sort_order'=>56, 'seed_price'=>95,      'icon'=>'aave'],
    ['symbol'=>'ICPUSDT', 'name'=>'Internet Computer / Tether','type'=>'crypto','tv_symbol'=>'BINANCE:ICPUSDT','sort_order'=>58,'seed_price'=>5.8,      'icon'=>'icp'],
    ['symbol'=>'FILUSDT', 'name'=>'Filecoin / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:FILUSDT', 'sort_order'=>60, 'seed_price'=>3.2,     'icon'=>'fil'],
    ['symbol'=>'APTUSDT', 'name'=>'Aptos / Tether',           'type'=>'crypto','tv_symbol'=>'BINANCE:APTUSDT', 'sort_order'=>62, 'seed_price'=>5.5,      'icon'=>'apt'],
    ['symbol'=>'ARBUSDT', 'name'=>'Arbitrum / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:ARBUSDT', 'sort_order'=>64, 'seed_price'=>0.38,     'icon'=>'arb'],
    ['symbol'=>'OPUSDT',  'name'=>'Optimism / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:OPUSDT',  'sort_order'=>66, 'seed_price'=>2.0,     'icon'=>'op'],
    ['symbol'=>'INJUSDT', 'name'=>'Injective / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:INJUSDT', 'sort_order'=>68, 'seed_price'=>122,      'icon'=>'inj'],
    ['symbol'=>'SUIUSDT', 'name'=>'Sui / Tether',             'type'=>'crypto','tv_symbol'=>'BINANCE:SUIUSDT', 'sort_order'=>70, 'seed_price'=>1.0,     'icon'=>'sui'],
    ['symbol'=>'GRTUSDT', 'name'=>'The Graph / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:GRTUSDT', 'sort_order'=>72, 'seed_price'=>0.12,    'icon'=>'grt'],
    ['symbol'=>'CRVUSDT', 'name'=>'Curve DAO / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:CRVUSDT', 'sort_order'=>74, 'seed_price'=>0.40,    'icon'=>'crv'],
    ['symbol'=>'MKRUSDT', 'name'=>'Maker / Tether',           'type'=>'crypto','tv_symbol'=>'BINANCE:MKRUSDT', 'sort_order'=>76, 'seed_price'=>1850,    'icon'=>'mkr'],
    ['symbol'=>'FETUSDT', 'name'=>'Fetch.ai / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:FETUSDT', 'sort_order'=>78, 'seed_price'=>1.6,     'icon'=>'fet'],
    ['symbol'=>'STXUSDT', 'name'=>'Stacks / Tether',          'type'=>'crypto','tv_symbol'=>'BINANCE:STXUSDT', 'sort_order'=>80, 'seed_price'=>1.6,     'icon'=>'stx'],
    ['symbol'=>'COMPUSDT','name'=>'Compound / Tether',        'type'=>'crypto','tv_symbol'=>'BINANCE:COMPUSDT','sort_order'=>82, 'seed_price'=>48,      'icon'=>'comp'],
    ['symbol'=>'ZECUSDT', 'name'=>'Zcash / Tether',           'type'=>'crypto','tv_symbol'=>'BINANCE:ZECUSDT', 'sort_order'=>84, 'seed_price'=>42,      'icon'=>'zec'],
    ['symbol'=>'DASHUSDT','name'=>'Dash / Tether',            'type'=>'crypto','tv_symbol'=>'BINANCE:DASHUSDT','sort_order'=>86, 'seed_price'=>28,      'icon'=>'dash'],
    ['symbol'=>'SNXUSDT', 'name'=>'Synthetix / Tether',       'type'=>'crypto','tv_symbol'=>'BINANCE:SNXUSDT', 'sort_order'=>88, 'seed_price'=>1.5,     'icon'=>'snx'],

    // ── FOREX (50+) ─────────────────────────────────────────────────────────
    ['symbol'=>'EURUSD','name'=>'Euro / US Dollar',               'type'=>'forex','tv_symbol'=>'FX:EURUSD','sort_order'=>100,'seed_price'=>1.154,'icon'=>'forex'],
    ['symbol'=>'GBPUSD','name'=>'British Pound / US Dollar',      'type'=>'forex','tv_symbol'=>'FX:GBPUSD','sort_order'=>102,'seed_price'=>1.336,'icon'=>'forex'],
    ['symbol'=>'USDJPY','name'=>'US Dollar / Japanese Yen',       'type'=>'forex','tv_symbol'=>'FX:USDJPY','sort_order'=>104,'seed_price'=>184.2,'icon'=>'forex'],
    ['symbol'=>'USDCHF','name'=>'US Dollar / Swiss Franc',        'type'=>'forex','tv_symbol'=>'FX:USDCHF','sort_order'=>106,'seed_price'=>0.796,'icon'=>'forex'],
    ['symbol'=>'AUDUSD','name'=>'Australian Dollar / US Dollar',  'type'=>'forex','tv_symbol'=>'FX:AUDUSD','sort_order'=>108,'seed_price'=>0.653,'icon'=>'forex'],
    ['symbol'=>'USDCAD','name'=>'US Dollar / Canadian Dollar',    'type'=>'forex','tv_symbol'=>'FX:USDCAD','sort_order'=>110,'seed_price'=>1.373,'icon'=>'forex'],
    ['symbol'=>'NZDUSD','name'=>'NZ Dollar / US Dollar',          'type'=>'forex','tv_symbol'=>'FX:NZDUSD','sort_order'=>112,'seed_price'=>0.584,'icon'=>'forex'],
    ['symbol'=>'EURGBP','name'=>'Euro / British Pound',           'type'=>'forex','tv_symbol'=>'FX:EURGBP','sort_order'=>114,'seed_price'=>0.863,'icon'=>'forex'],
    ['symbol'=>'EURJPY','name'=>'Euro / Japanese Yen',            'type'=>'forex','tv_symbol'=>'FX:EURJPY','sort_order'=>116,'seed_price'=>166.4,'icon'=>'forex'],
    ['symbol'=>'GBPJPY','name'=>'British Pound / Japanese Yen',   'type'=>'forex','tv_symbol'=>'FX:GBPJPY','sort_order'=>118,'seed_price'=>192.8,'icon'=>'forex'],
    ['symbol'=>'EURCAD','name'=>'Euro / Canadian Dollar',         'type'=>'forex','tv_symbol'=>'FX:EURCAD','sort_order'=>120,'seed_price'=>1.583,'icon'=>'forex'],
    ['symbol'=>'EURAUD','name'=>'Euro / Australian Dollar',       'type'=>'forex','tv_symbol'=>'FX:EURAUD','sort_order'=>122,'seed_price'=>1.766,'icon'=>'forex'],
    ['symbol'=>'EURCHF','name'=>'Euro / Swiss Franc',             'type'=>'forex','tv_symbol'=>'FX:EURCHF','sort_order'=>124,'seed_price'=>0.918,'icon'=>'forex'],
    ['symbol'=>'EURNZD','name'=>'Euro / NZ Dollar',               'type'=>'forex','tv_symbol'=>'FX:EURNZD','sort_order'=>126,'seed_price'=>1.98,'icon'=>'forex'],
    ['symbol'=>'GBPAUD','name'=>'British Pound / Australian Dollar','type'=>'forex','tv_symbol'=>'FX:GBPAUD','sort_order'=>128,'seed_price'=>2.045,'icon'=>'forex'],
    ['symbol'=>'GBPCAD','name'=>'British Pound / Canadian Dollar','type'=>'forex','tv_symbol'=>'FX:GBPCAD','sort_order'=>130,'seed_price'=>1.8330,'icon'=>'forex'],
    ['symbol'=>'GBPCHF','name'=>'British Pound / Swiss Franc',    'type'=>'forex','tv_symbol'=>'FX:GBPCHF','sort_order'=>132,'seed_price'=>1.064,'icon'=>'forex'],
    ['symbol'=>'GBPNZD','name'=>'British Pound / NZ Dollar',      'type'=>'forex','tv_symbol'=>'FX:GBPNZD','sort_order'=>134,'seed_price'=>2.291,'icon'=>'forex'],
    ['symbol'=>'AUDCAD','name'=>'Australian Dollar / Canadian Dollar','type'=>'forex','tv_symbol'=>'FX:AUDCAD','sort_order'=>136,'seed_price'=>0.896,'icon'=>'forex'],
    ['symbol'=>'AUDCHF','name'=>'Australian Dollar / Swiss Franc','type'=>'forex','tv_symbol'=>'FX:AUDCHF','sort_order'=>138,'seed_price'=>0.52,'icon'=>'forex'],
    ['symbol'=>'AUDNZD','name'=>'Australian Dollar / NZ Dollar',  'type'=>'forex','tv_symbol'=>'FX:AUDNZD','sort_order'=>140,'seed_price'=>1.118,'icon'=>'forex'],
    ['symbol'=>'AUDJPY','name'=>'Australian Dollar / Japanese Yen','type'=>'forex','tv_symbol'=>'FX:AUDJPY','sort_order'=>142,'seed_price'=>84.2,'icon'=>'forex'],
    ['symbol'=>'CADJPY','name'=>'Canadian Dollar / Japanese Yen', 'type'=>'forex','tv_symbol'=>'FX:CADJPY','sort_order'=>144,'seed_price'=>105.1,'icon'=>'forex'],
    ['symbol'=>'CHFJPY','name'=>'Swiss Franc / Japanese Yen',     'type'=>'forex','tv_symbol'=>'FX:CHFJPY','sort_order'=>146,'seed_price'=>181.2,'icon'=>'forex'],
    ['symbol'=>'NZDJPY','name'=>'NZ Dollar / Japanese Yen',       'type'=>'forex','tv_symbol'=>'FX:NZDJPY','sort_order'=>148,'seed_price'=>84.2,'icon'=>'forex'],
    ['symbol'=>'CADCHF','name'=>'Canadian Dollar / Swiss Franc',  'type'=>'forex','tv_symbol'=>'FX:CADCHF','sort_order'=>150,'seed_price'=>0.58,'icon'=>'forex'],
    ['symbol'=>'NZDCAD','name'=>'NZ Dollar / Canadian Dollar',    'type'=>'forex','tv_symbol'=>'FX:NZDCAD','sort_order'=>152,'seed_price'=>0.801,'icon'=>'forex'],
    ['symbol'=>'USDMXN','name'=>'US Dollar / Mexican Peso',       'type'=>'forex','tv_symbol'=>'FX:USDMXN','sort_order'=>160,'seed_price'=>18.9,'icon'=>'forex'],
    ['symbol'=>'USDSEK','name'=>'US Dollar / Swedish Krona',      'type'=>'forex','tv_symbol'=>'FX:USDSEK','sort_order'=>162,'seed_price'=>9.8,'icon'=>'forex'],
    ['symbol'=>'USDNOK','name'=>'US Dollar / Norwegian Krone',    'type'=>'forex','tv_symbol'=>'FX:USDNOK','sort_order'=>164,'seed_price'=>10.4,'icon'=>'forex'],
    ['symbol'=>'USDPLN','name'=>'US Dollar / Polish Zloty',       'type'=>'forex','tv_symbol'=>'FX:USDPLN','sort_order'=>166,'seed_price'=>3.85,'icon'=>'forex'],
    ['symbol'=>'USDTRY','name'=>'US Dollar / Turkish Lira',       'type'=>'forex','tv_symbol'=>'FX:USDTRY','sort_order'=>168,'seed_price'=>38.2,'icon'=>'forex'],
    ['symbol'=>'USDSGD','name'=>'US Dollar / Singapore Dollar',   'type'=>'forex','tv_symbol'=>'FX:USDSGD','sort_order'=>170,'seed_price'=>1.29,'icon'=>'forex'],
    ['symbol'=>'USDHKD','name'=>'US Dollar / Hong Kong Dollar',   'type'=>'forex','tv_symbol'=>'FX:USDHKD','sort_order'=>172,'seed_price'=>7.82,'icon'=>'forex'],
    ['symbol'=>'USDDKK','name'=>'US Dollar / Danish Krone',       'type'=>'forex','tv_symbol'=>'FX:USDDKK','sort_order'=>174,'seed_price'=>6.62,'icon'=>'forex'],
    ['symbol'=>'USDBRL','name'=>'US Dollar / Brazilian Real',     'type'=>'forex','tv_symbol'=>'FX:USDBRL','sort_order'=>176,'seed_price'=>5.55,'icon'=>'forex'],
    ['symbol'=>'USDZAR','name'=>'US Dollar / South African Rand', 'type'=>'forex','tv_symbol'=>'FX:USDZAR','sort_order'=>178,'seed_price'=>17.9,'icon'=>'forex'],
    ['symbol'=>'USDCNH','name'=>'US Dollar / Chinese Yuan Offshore','type'=>'forex','tv_symbol'=>'FX:USDCNH','sort_order'=>180,'seed_price'=>7.24,'icon'=>'forex'],
    ['symbol'=>'USDILS','name'=>'US Dollar / Israeli Shekel',     'type'=>'forex','tv_symbol'=>'FX:USDILS','sort_order'=>182,'seed_price'=>3.62,'icon'=>'forex'],
    ['symbol'=>'USDINR','name'=>'US Dollar / Indian Rupee',       'type'=>'forex','tv_symbol'=>'FX:USDINR','sort_order'=>184,'seed_price'=>83.8,'icon'=>'forex'],
    ['symbol'=>'EURPLN','name'=>'Euro / Polish Zloty',            'type'=>'forex','tv_symbol'=>'FX:EURPLN','sort_order'=>186,'seed_price'=>4.42,'icon'=>'forex'],
    ['symbol'=>'EURHUF','name'=>'Euro / Hungarian Forint',        'type'=>'forex','tv_symbol'=>'FX:EURHUF','sort_order'=>188,'seed_price'=>405,'icon'=>'forex'],
    ['symbol'=>'EURTRY','name'=>'Euro / Turkish Lira',            'type'=>'forex','tv_symbol'=>'FX:EURTRY','sort_order'=>190,'seed_price'=>44.1,'icon'=>'forex'],
    ['symbol'=>'GBPTRY','name'=>'British Pound / Turkish Lira',   'type'=>'forex','tv_symbol'=>'FX:GBPTRY','sort_order'=>192,'seed_price'=>51.1,'icon'=>'forex'],

    // ── STOCKS (50+) ─────────────────────────────────────────────────────────
    ['symbol'=>'AAPL', 'name'=>'Apple Inc.',         'type'=>'stocks','tv_symbol'=>'NASDAQ:AAPL', 'yahoo_ticker'=>'AAPL', 'sort_order'=>200,'seed_price'=>205,'icon'=>'apple'],
    ['symbol'=>'MSFT', 'name'=>'Microsoft Corp.',    'type'=>'stocks','tv_symbol'=>'NASDAQ:MSFT', 'yahoo_ticker'=>'MSFT', 'sort_order'=>202,'seed_price'=>420,'icon'=>'microsoft'],
    ['symbol'=>'NVDA', 'name'=>'NVIDIA Corp.',       'type'=>'stocks','tv_symbol'=>'NASDAQ:NVDA', 'yahoo_ticker'=>'NVDA', 'sort_order'=>204,'seed_price'=>135,'icon'=>'nvda'],
    ['symbol'=>'TSLA', 'name'=>'Tesla Inc.',         'type'=>'stocks','tv_symbol'=>'NASDAQ:TSLA', 'yahoo_ticker'=>'TSLA', 'sort_order'=>206,'seed_price'=>285,'icon'=>'tsla'],
    ['symbol'=>'AMZN', 'name'=>'Amazon.com Inc.',    'type'=>'stocks','tv_symbol'=>'NASDAQ:AMZN', 'yahoo_ticker'=>'AMZN', 'sort_order'=>208,'seed_price'=>1.6,'icon'=>'amzn'],
    ['symbol'=>'GOOGL','name'=>'Alphabet Inc.',      'type'=>'stocks','tv_symbol'=>'NASDAQ:GOOGL','yahoo_ticker'=>'GOOGL','sort_order'=>210,'seed_price'=>2.15,'icon'=>'googl'],
    ['symbol'=>'META', 'name'=>'Meta Platforms',     'type'=>'stocks','tv_symbol'=>'NASDAQ:META', 'yahoo_ticker'=>'META', 'sort_order'=>212,'seed_price'=>620,'icon'=>'meta'],
    ['symbol'=>'NFLX', 'name'=>'Netflix Inc.',       'type'=>'stocks','tv_symbol'=>'NASDAQ:NFLX', 'yahoo_ticker'=>'NFLX', 'sort_order'=>214,'seed_price'=>1050,'icon'=>'nflx'],
    ['symbol'=>'AMD',  'name'=>'AMD Inc.',           'type'=>'stocks','tv_symbol'=>'NASDAQ:AMD',  'yahoo_ticker'=>'AMD',  'sort_order'=>216,'seed_price'=>1.6,'icon'=>'amd'],
    ['symbol'=>'INTC', 'name'=>'Intel Corp.',        'type'=>'stocks','tv_symbol'=>'NASDAQ:INTC', 'yahoo_ticker'=>'INTC', 'sort_order'=>218,'seed_price'=>122, 'icon'=>'intc'],
    ['symbol'=>'ORCL', 'name'=>'Oracle Corp.',       'type'=>'stocks','tv_symbol'=>'NYSE:ORCL',   'yahoo_ticker'=>'ORCL', 'sort_order'=>220,'seed_price'=>165,'icon'=>'stock'],
    ['symbol'=>'CRM',  'name'=>'Salesforce Inc.',    'type'=>'stocks','tv_symbol'=>'NYSE:CRM',    'yahoo_ticker'=>'CRM',  'sort_order'=>222,'seed_price'=>285,'icon'=>'stock'],
    ['symbol'=>'PYPL', 'name'=>'PayPal Holdings',    'type'=>'stocks','tv_symbol'=>'NASDAQ:PYPL', 'yahoo_ticker'=>'PYPL', 'sort_order'=>224,'seed_price'=>55, 'icon'=>'stock'],
    ['symbol'=>'V',    'name'=>'Visa Inc.',          'type'=>'stocks','tv_symbol'=>'NYSE:V',      'yahoo_ticker'=>'V',    'sort_order'=>226,'seed_price'=>1.5,'icon'=>'stock'],
    ['symbol'=>'MA',   'name'=>'Mastercard Inc.',    'type'=>'stocks','tv_symbol'=>'NYSE:MA',     'yahoo_ticker'=>'MA',   'sort_order'=>228,'seed_price'=>620,'icon'=>'stock'],
    ['symbol'=>'JPM',  'name'=>'JPMorgan Chase',     'type'=>'stocks','tv_symbol'=>'NYSE:JPM',    'yahoo_ticker'=>'JPM',  'sort_order'=>230,'seed_price'=>2.15,'icon'=>'stock'],
    ['symbol'=>'BAC',  'name'=>'Bank of America',    'type'=>'stocks','tv_symbol'=>'NYSE:BAC',    'yahoo_ticker'=>'BAC',  'sort_order'=>232,'seed_price'=>42, 'icon'=>'stock'],
    ['symbol'=>'UNH',  'name'=>'UnitedHealth Group', 'type'=>'stocks','tv_symbol'=>'NYSE:UNH',    'yahoo_ticker'=>'UNH',  'sort_order'=>234,'seed_price'=>490,'icon'=>'stock'],
    ['symbol'=>'JNJ',  'name'=>'Johnson & Johnson',  'type'=>'stocks','tv_symbol'=>'NYSE:JNJ',    'yahoo_ticker'=>'JNJ',  'sort_order'=>236,'seed_price'=>160,'icon'=>'stock'],
    ['symbol'=>'PFE',  'name'=>'Pfizer Inc.',        'type'=>'stocks','tv_symbol'=>'NYSE:PFE',    'yahoo_ticker'=>'PFE',  'sort_order'=>238,'seed_price'=>26, 'icon'=>'stock'],
    ['symbol'=>'MRK',  'name'=>'Merck & Co.',        'type'=>'stocks','tv_symbol'=>'NYSE:MRK',    'yahoo_ticker'=>'MRK',  'sort_order'=>240,'seed_price'=>1.6,'icon'=>'stock'],
    ['symbol'=>'CVX',  'name'=>'Chevron Corp.',      'type'=>'stocks','tv_symbol'=>'NYSE:CVX',    'yahoo_ticker'=>'CVX',  'sort_order'=>242,'seed_price'=>155,'icon'=>'stock'],
    ['symbol'=>'XOM',  'name'=>'ExxonMobil Corp.',   'type'=>'stocks','tv_symbol'=>'NYSE:XOM',    'yahoo_ticker'=>'XOM',  'sort_order'=>244,'seed_price'=>2.15,'icon'=>'stock'],
    ['symbol'=>'WMT',  'name'=>'Walmart Inc.',       'type'=>'stocks','tv_symbol'=>'NYSE:WMT',    'yahoo_ticker'=>'WMT',  'sort_order'=>246,'seed_price'=>92, 'icon'=>'stock'],
    ['symbol'=>'COST', 'name'=>'Costco Wholesale',   'type'=>'stocks','tv_symbol'=>'NASDAQ:COST', 'yahoo_ticker'=>'COST', 'sort_order'=>248,'seed_price'=>1080,'icon'=>'stock'],
    ['symbol'=>'HD',   'name'=>'Home Depot Inc.',    'type'=>'stocks','tv_symbol'=>'NYSE:HD',     'yahoo_ticker'=>'HD',   'sort_order'=>250,'seed_price'=>380,'icon'=>'stock'],
    ['symbol'=>'DIS',  'name'=>'Walt Disney Co.',    'type'=>'stocks','tv_symbol'=>'NYSE:DIS',    'yahoo_ticker'=>'DIS',  'sort_order'=>252,'seed_price'=>2.15,'icon'=>'stock'],
    ['symbol'=>'BABA', 'name'=>'Alibaba Group',      'type'=>'stocks','tv_symbol'=>'NYSE:BABA',   'yahoo_ticker'=>'BABA', 'sort_order'=>254,'seed_price'=>125, 'icon'=>'stock'],
    ['symbol'=>'NKE',  'name'=>'Nike Inc.',          'type'=>'stocks','tv_symbol'=>'NYSE:NKE',    'yahoo_ticker'=>'NKE',  'sort_order'=>256,'seed_price'=>75, 'icon'=>'stock'],
    ['symbol'=>'SBUX', 'name'=>'Starbucks Corp.',    'type'=>'stocks','tv_symbol'=>'NASDAQ:SBUX', 'yahoo_ticker'=>'SBUX', 'sort_order'=>258,'seed_price'=>82, 'icon'=>'stock'],
    ['symbol'=>'GS',   'name'=>'Goldman Sachs',      'type'=>'stocks','tv_symbol'=>'NYSE:GS',     'yahoo_ticker'=>'GS',   'sort_order'=>260,'seed_price'=>520,'icon'=>'stock'],
    ['symbol'=>'MS',   'name'=>'Morgan Stanley',     'type'=>'stocks','tv_symbol'=>'NYSE:MS',     'yahoo_ticker'=>'MS',   'sort_order'=>262,'seed_price'=>125, 'icon'=>'stock'],
    ['symbol'=>'PLTR', 'name'=>'Palantir Tech.',     'type'=>'stocks','tv_symbol'=>'NYSE:PLTR',   'yahoo_ticker'=>'PLTR', 'sort_order'=>264,'seed_price'=>122, 'icon'=>'stock'],
    ['symbol'=>'COIN', 'name'=>'Coinbase Global',    'type'=>'stocks','tv_symbol'=>'NASDAQ:COIN', 'yahoo_ticker'=>'COIN', 'sort_order'=>266,'seed_price'=>265,'icon'=>'stock'],
    ['symbol'=>'SQ',   'name'=>'Block Inc.',         'type'=>'stocks','tv_symbol'=>'NYSE:XYZ',    'yahoo_ticker'=>'XYZ',  'sort_order'=>268,'seed_price'=>55, 'icon'=>'stock'],
    ['symbol'=>'ADBE', 'name'=>'Adobe Inc.',         'type'=>'stocks','tv_symbol'=>'NASDAQ:ADBE', 'yahoo_ticker'=>'ADBE', 'sort_order'=>270,'seed_price'=>450,'icon'=>'stock'],
    ['symbol'=>'UBER', 'name'=>'Uber Technologies',  'type'=>'stocks','tv_symbol'=>'NYSE:UBER',   'yahoo_ticker'=>'UBER', 'sort_order'=>272,'seed_price'=>80, 'icon'=>'stock'],
    ['symbol'=>'SNAP', 'name'=>'Snap Inc.',          'type'=>'stocks','tv_symbol'=>'NYSE:SNAP',   'yahoo_ticker'=>'SNAP', 'sort_order'=>274,'seed_price'=>28, 'icon'=>'stock'],
    ['symbol'=>'SHOP', 'name'=>'Shopify Inc.',       'type'=>'stocks','tv_symbol'=>'NYSE:SHOP',   'yahoo_ticker'=>'SHOP', 'sort_order'=>276,'seed_price'=>85, 'icon'=>'stock'],
    ['symbol'=>'RBLX', 'name'=>'Roblox Corp.',       'type'=>'stocks','tv_symbol'=>'NYSE:RBLX',   'yahoo_ticker'=>'RBLX', 'sort_order'=>278,'seed_price'=>28, 'icon'=>'stock'],
    ['symbol'=>'DKNG', 'name'=>'DraftKings Inc.',    'type'=>'stocks','tv_symbol'=>'NASDAQ:DKNG', 'yahoo_ticker'=>'DKNG', 'sort_order'=>280,'seed_price'=>48, 'icon'=>'stock'],
    ['symbol'=>'SOFI', 'name'=>'SoFi Technologies',  'type'=>'stocks','tv_symbol'=>'NASDAQ:SOFI', 'yahoo_ticker'=>'SOFI', 'sort_order'=>282,'seed_price'=>8.5,  'icon'=>'stock'],
    ['symbol'=>'RIVN', 'name'=>'Rivian Automotive',  'type'=>'stocks','tv_symbol'=>'NASDAQ:RIVN', 'yahoo_ticker'=>'RIVN', 'sort_order'=>284,'seed_price'=>5.8, 'icon'=>'stock'],
    ['symbol'=>'GME',  'name'=>'GameStop Corp.',     'type'=>'stocks','tv_symbol'=>'NYSE:GME',    'yahoo_ticker'=>'GME',  'sort_order'=>286,'seed_price'=>28, 'icon'=>'stock'],

    // ── COMMODITIES (30+) ───────────────────────────────────────────────────
    ['symbol'=>'XAUUSD','name'=>'Gold Spot',          'type'=>'commodities','tv_symbol'=>'OANDA:XAUUSD','yahoo_ticker'=>'GC=F', 'sort_order'=>300,'seed_price'=>4330,'icon'=>'metal'],
    ['symbol'=>'XAGUSD','name'=>'Silver Spot',        'type'=>'commodities','tv_symbol'=>'OANDA:XAGUSD','yahoo_ticker'=>'SI=F', 'sort_order'=>302,'seed_price'=>38.5,'icon'=>'metal'],
    ['symbol'=>'XPTUSD','name'=>'Platinum Spot',      'type'=>'commodities','tv_symbol'=>'OANDA:XPTUSD','yahoo_ticker'=>'PL=F', 'sort_order'=>304,'seed_price'=>1080, 'icon'=>'metal'],
    ['symbol'=>'XPDUSD','name'=>'Palladium Spot',     'type'=>'commodities','tv_symbol'=>'OANDA:XPDUSD','yahoo_ticker'=>'PA=F', 'sort_order'=>306,'seed_price'=>1030,'icon'=>'metal'],
    ['symbol'=>'USOIL', 'name'=>'WTI Crude Oil',      'type'=>'commodities','tv_symbol'=>'TVC:USOIL',  'yahoo_ticker'=>'CL=F', 'sort_order'=>310,'seed_price'=>62.5,'icon'=>'oil'],
    ['symbol'=>'UKOIL', 'name'=>'Brent Crude Oil',    'type'=>'commodities','tv_symbol'=>'TVC:UKOIL',  'yahoo_ticker'=>'BZ=F', 'sort_order'=>312,'seed_price'=>65.2,'icon'=>'oil'],
    ['symbol'=>'NGAS',  'name'=>'Natural Gas',        'type'=>'commodities','tv_symbol'=>'FX:NGAS',   'yahoo_ticker'=>'NG=F', 'sort_order'=>314,'seed_price'=>2.85,'icon'=>'oil'],
    ['symbol'=>'GAUUSD','name'=>'Gold Gram / US Dollar','type'=>'commodities','tv_symbol'=>'TVC:GAUUSD','yahoo_ticker'=>'', 'sort_order'=>317,'seed_price'=>139.2,'icon'=>'metal'],
    ['symbol'=>'GAUIDR','name'=>'Gold Gram / Indonesian Rupiah','type'=>'commodities','tv_symbol'=>'TVC:GAUIDR','yahoo_ticker'=>'', 'sort_order'=>318,'seed_price'=>2310000,'icon'=>'metal'],
    ['symbol'=>'XAUEUR','name'=>'Gold Spot / Euro',    'type'=>'commodities','tv_symbol'=>'TVC:XAUEUR', 'yahoo_ticker'=>'', 'sort_order'=>318,'seed_price'=>3980,'icon'=>'metal'],
    ['symbol'=>'XAUGBP','name'=>'Gold Spot / Pound',   'type'=>'commodities','tv_symbol'=>'TVC:XAUGBP', 'yahoo_ticker'=>'', 'sort_order'=>319,'seed_price'=>3400,'icon'=>'metal'],
    ['symbol'=>'XAUJPY','name'=>'Gold Spot / Yen',     'type'=>'commodities','tv_symbol'=>'TVC:XAUJPY', 'yahoo_ticker'=>'', 'sort_order'=>320,'seed_price'=>680000,'icon'=>'metal'],
    ['symbol'=>'XAUAUD','name'=>'Gold Spot / Australian Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAUAUD','yahoo_ticker'=>'', 'sort_order'=>321,'seed_price'=>6600,'icon'=>'metal'],
    ['symbol'=>'XAUCAD','name'=>'Gold Spot / Canadian Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAUCAD','yahoo_ticker'=>'', 'sort_order'=>322,'seed_price'=>5900,'icon'=>'metal'],
    ['symbol'=>'XAUCHF','name'=>'Gold Spot / Swiss Franc','type'=>'commodities','tv_symbol'=>'TVC:XAUCHF','yahoo_ticker'=>'', 'sort_order'=>323,'seed_price'=>3450,'icon'=>'metal'],
    ['symbol'=>'XAUHKD','name'=>'Gold Spot / Hong Kong Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAUHKD','yahoo_ticker'=>'', 'sort_order'=>324,'seed_price'=>33800,'icon'=>'metal'],
    ['symbol'=>'XAUNZD','name'=>'Gold Spot / New Zealand Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAUNZD','yahoo_ticker'=>'', 'sort_order'=>325,'seed_price'=>7200,'icon'=>'metal'],
    ['symbol'=>'XAUSGD','name'=>'Gold Spot / Singapore Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAUSGD','yahoo_ticker'=>'', 'sort_order'=>326,'seed_price'=>5600,'icon'=>'metal'],
    ['symbol'=>'XAUXAG','name'=>'Gold / Silver Ratio', 'type'=>'commodities','tv_symbol'=>'TVC:XAUXAG','yahoo_ticker'=>'', 'sort_order'=>327,'seed_price'=>75,'icon'=>'metal'],
    ['symbol'=>'XAGEUR','name'=>'Silver Spot / Euro',  'type'=>'commodities','tv_symbol'=>'TVC:XAGEUR', 'yahoo_ticker'=>'', 'sort_order'=>327,'seed_price'=>35.4,'icon'=>'metal'],
    ['symbol'=>'XAGGBP','name'=>'Silver Spot / Pound', 'type'=>'commodities','tv_symbol'=>'TVC:XAGGBP', 'yahoo_ticker'=>'', 'sort_order'=>328,'seed_price'=>30.2,'icon'=>'metal'],
    ['symbol'=>'XAGAUD','name'=>'Silver Spot / Australian Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAGAUD','yahoo_ticker'=>'', 'sort_order'=>329,'seed_price'=>58,'icon'=>'metal'],
    ['symbol'=>'XAGCAD','name'=>'Silver Spot / Canadian Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAGCAD','yahoo_ticker'=>'', 'sort_order'=>330,'seed_price'=>52,'icon'=>'metal'],
    ['symbol'=>'XAGCHF','name'=>'Silver Spot / Swiss Franc','type'=>'commodities','tv_symbol'=>'TVC:XAGCHF','yahoo_ticker'=>'', 'sort_order'=>331,'seed_price'=>34,'icon'=>'metal'],
    ['symbol'=>'XAGTRY','name'=>'Silver Spot / Turkish Lira','type'=>'commodities','tv_symbol'=>'TVC:XAGTRY','yahoo_ticker'=>'', 'sort_order'=>332,'seed_price'=>1600,'icon'=>'metal'],
    ['symbol'=>'GAUEUR','name'=>'Gold Gram / Euro',    'type'=>'commodities','tv_symbol'=>'TVC:GAUEUR','yahoo_ticker'=>'', 'sort_order'=>333,'seed_price'=>128,'icon'=>'metal'],
    ['symbol'=>'GAUGBP','name'=>'Gold Gram / Pound',   'type'=>'commodities','tv_symbol'=>'TVC:GAUGBP','yahoo_ticker'=>'', 'sort_order'=>334,'seed_price'=>109,'icon'=>'metal'],
    ['symbol'=>'GAUTRY','name'=>'Gold Gram / Turkish Lira','type'=>'commodities','tv_symbol'=>'TVC:GAUTRY','yahoo_ticker'=>'', 'sort_order'=>335,'seed_price'=>5600,'icon'=>'metal'],
    ['symbol'=>'XAGGUSD','name'=>'Silver Gram / US Dollar','type'=>'commodities','tv_symbol'=>'TVC:XAGGUSD','yahoo_ticker'=>'', 'sort_order'=>336,'seed_price'=>1.24,'icon'=>'metal'],
    ['symbol'=>'XAGGEUR','name'=>'Silver Gram / Euro', 'type'=>'commodities','tv_symbol'=>'TVC:XAGGEUR','yahoo_ticker'=>'', 'sort_order'=>337,'seed_price'=>1.14,'icon'=>'metal'],
    ['symbol'=>'XAGGTRY','name'=>'Silver Gram / Turkish Lira','type'=>'commodities','tv_symbol'=>'TVC:XAGGTRY','yahoo_ticker'=>'', 'sort_order'=>338,'seed_price'=>52,'icon'=>'metal'],
    ['symbol'=>'URALS','name'=>'Urals Crude Oil Spot', 'type'=>'commodities','tv_symbol'=>'TVC:URALS',  'yahoo_ticker'=>'', 'sort_order'=>339,'seed_price'=>58,'icon'=>'oil'],
    ['symbol'=>'WHEAT', 'name'=>'Wheat',               'type'=>'commodities','tv_symbol'=>'CBOT:ZW1!', 'yahoo_ticker'=>'ZW=F', 'sort_order'=>350,'seed_price'=>520, 'icon'=>'commodity'],
    ['symbol'=>'CORN',  'name'=>'Corn',                'type'=>'commodities','tv_symbol'=>'CBOT:ZC1!', 'yahoo_ticker'=>'ZC=F', 'sort_order'=>352,'seed_price'=>420, 'icon'=>'commodity'],
    ['symbol'=>'SOYBEAN','name'=>'Soybeans',           'type'=>'commodities','tv_symbol'=>'CBOT:ZS1!', 'yahoo_ticker'=>'ZS=F', 'sort_order'=>354,'seed_price'=>1050,'icon'=>'commodity'],
    ['symbol'=>'SUGAR', 'name'=>'Sugar #11',           'type'=>'commodities','tv_symbol'=>'ICEUS:SB1!','yahoo_ticker'=>'SB=F', 'sort_order'=>326,'seed_price'=>18.2,'icon'=>'commodity'],
    ['symbol'=>'COTTON','name'=>'Cotton #2',           'type'=>'commodities','tv_symbol'=>'ICEUS:CT1!','yahoo_ticker'=>'CT=F', 'sort_order'=>328,'seed_price'=>68,  'icon'=>'commodity'],
    ['symbol'=>'COFFEE','name'=>'Coffee "C"',          'type'=>'commodities','tv_symbol'=>'ICEUS:KC1!','yahoo_ticker'=>'KC=F', 'sort_order'=>330,'seed_price'=>2.15, 'icon'=>'commodity'],
    ['symbol'=>'COCOA', 'name'=>'Cocoa',               'type'=>'commodities','tv_symbol'=>'ICEUS:CC1!','yahoo_ticker'=>'CC=F', 'sort_order'=>332,'seed_price'=>8500,'icon'=>'commodity'],
    ['symbol'=>'LUMBER','name'=>'Lumber',              'type'=>'commodities','tv_symbol'=>'CME:LBS1!', 'yahoo_ticker'=>'LB=F', 'sort_order'=>334,'seed_price'=>520, 'icon'=>'commodity'],
    ['symbol'=>'NICKEL','name'=>'Nickel',              'type'=>'commodities','tv_symbol'=>'LME:NICKEL','yahoo_ticker'=>'NI=F', 'sort_order'=>336,'seed_price'=>15800,'icon'=>'metal'],
    ['symbol'=>'ZINC',  'name'=>'Zinc',                'type'=>'commodities','tv_symbol'=>'LME:ZINC',  'yahoo_ticker'=>'ZI=F', 'sort_order'=>338,'seed_price'=>1850,'icon'=>'metal'],
    ['symbol'=>'ALUMINIUM','name'=>'Aluminium',        'type'=>'commodities','tv_symbol'=>'LME:ALUMINUM','yahoo_ticker'=>'ALI=F','sort_order'=>340,'seed_price'=>2420,'icon'=>'metal'],
    ['symbol'=>'LEAD',  'name'=>'Lead',                'type'=>'commodities','tv_symbol'=>'LME:LEAD',  'yahoo_ticker'=>'',     'sort_order'=>342,'seed_price'=>2100,'icon'=>'metal'],
    ['symbol'=>'TIN',   'name'=>'Tin',                 'type'=>'commodities','tv_symbol'=>'LME:TIN',   'yahoo_ticker'=>'',     'sort_order'=>344,'seed_price'=>31000,'icon'=>'metal'],
    ['symbol'=>'OJ',    'name'=>'Orange Juice',        'type'=>'commodities','tv_symbol'=>'ICEUS:OJ1!','yahoo_ticker'=>'OJ=F', 'sort_order'=>346,'seed_price'=>450, 'icon'=>'commodity'],
    ['symbol'=>'LEAN_HOGS','name'=>'Lean Hogs',        'type'=>'commodities','tv_symbol'=>'CME:HE1!',  'yahoo_ticker'=>'HE=F', 'sort_order'=>348,'seed_price'=>95,  'icon'=>'commodity'],
    ['symbol'=>'LIVE_CATTLE','name'=>'Live Cattle',    'type'=>'commodities','tv_symbol'=>'CME:LE1!',  'yahoo_ticker'=>'LE=F', 'sort_order'=>350,'seed_price'=>17.55, 'icon'=>'commodity'],
    ['symbol'=>'HEATING_OIL','name'=>'Heating Oil',    'type'=>'commodities','tv_symbol'=>'NYMEX:HO1!','yahoo_ticker'=>'HO=F','sort_order'=>352,'seed_price'=>2.15,'icon'=>'oil'],
    ['symbol'=>'RBOB', 'name'=>'RBOB Gasoline',          'type'=>'commodities','tv_symbol'=>'NYMEX:RB1!','yahoo_ticker'=>'RB=F','sort_order'=>354,'seed_price'=>2.05,'icon'=>'oil'],
    ['symbol'=>'OATS', 'name'=>'Oats',                   'type'=>'commodities','tv_symbol'=>'CBOT:ZO1!','yahoo_ticker'=>'ZO=F','sort_order'=>356,'seed_price'=>340,'icon'=>'commodity'],
    ['symbol'=>'RICE', 'name'=>'Rough Rice',             'type'=>'commodities','tv_symbol'=>'CBOT:ZR1!','yahoo_ticker'=>'ZR=F','sort_order'=>358,'seed_price'=>16.5,'icon'=>'commodity'],
    ['symbol'=>'MILK', 'name'=>'Class III Milk',         'type'=>'commodities','tv_symbol'=>'CME:DC1!', 'yahoo_ticker'=>'DC=F','sort_order'=>360,'seed_price'=>17.5,'icon'=>'commodity'],
    ['symbol'=>'FEEDER_CATTLE','name'=>'Feeder Cattle',  'type'=>'commodities','tv_symbol'=>'CME:GF1!', 'yahoo_ticker'=>'GF=F','sort_order'=>362,'seed_price'=>260,'icon'=>'commodity'],

    // ── FUTURES (30+) ───────────────────────────────────────────────────────
    ['symbol'=>'ES_F', 'name'=>'E-mini S&P 500 Future',      'type'=>'futures','tv_symbol'=>'CME_MINI:ES1!', 'yahoo_ticker'=>'ES=F', 'sort_order'=>400,'seed_price'=>5950, 'icon'=>'future'],
    ['symbol'=>'NQ_F', 'name'=>'E-mini Nasdaq 100 Future',   'type'=>'futures','tv_symbol'=>'CME_MINI:NQ1!', 'yahoo_ticker'=>'NQ=F', 'sort_order'=>402,'seed_price'=>34000,'icon'=>'future'],
    ['symbol'=>'YM_F', 'name'=>'E-mini Dow Future',          'type'=>'futures','tv_symbol'=>'CBOT_MINI:YM1!','yahoo_ticker'=>'YM=F', 'sort_order'=>404,'seed_price'=>43000,'icon'=>'future'],
    ['symbol'=>'RTY_F','name'=>'E-mini Russell 2000 Future', 'type'=>'futures','tv_symbol'=>'CME_MINI:RTY1!','yahoo_ticker'=>'RTY=F','sort_order'=>406,'seed_price'=>2100, 'icon'=>'future'],
    ['symbol'=>'CL_F', 'name'=>'WTI Crude Future',           'type'=>'futures','tv_symbol'=>'NYMEX:CL1!',   'yahoo_ticker'=>'CL=F', 'sort_order'=>408,'seed_price'=>125,   'icon'=>'oil'],
    ['symbol'=>'GC_F', 'name'=>'Gold Future',                'type'=>'futures','tv_symbol'=>'COMEX:GC1!',   'yahoo_ticker'=>'GC=F', 'sort_order'=>410,'seed_price'=>4330, 'icon'=>'metal'],
    ['symbol'=>'ZN_F', 'name'=>'10Y Treasury Note Future',   'type'=>'futures','tv_symbol'=>'CBOT:ZN1!',    'yahoo_ticker'=>'ZN=F', 'sort_order'=>412,'seed_price'=>112,  'icon'=>'future'],
    ['symbol'=>'ZB_F', 'name'=>'30Y Treasury Bond Future',   'type'=>'futures','tv_symbol'=>'CBOT:ZB1!',    'yahoo_ticker'=>'ZB=F', 'sort_order'=>414,'seed_price'=>122,  'icon'=>'future'],
    ['symbol'=>'ZC_F', 'name'=>'Corn Future',                'type'=>'futures','tv_symbol'=>'CBOT:ZC1!',    'yahoo_ticker'=>'ZC=F', 'sort_order'=>416,'seed_price'=>420,  'icon'=>'future'],
    ['symbol'=>'ZS_F', 'name'=>'Soybean Future',             'type'=>'futures','tv_symbol'=>'CBOT:ZS1!',    'yahoo_ticker'=>'ZS=F', 'sort_order'=>418,'seed_price'=>1050, 'icon'=>'future'],
    ['symbol'=>'ZW_F', 'name'=>'Wheat Future',               'type'=>'futures','tv_symbol'=>'CBOT:ZW1!',    'yahoo_ticker'=>'ZW=F', 'sort_order'=>420,'seed_price'=>520,  'icon'=>'future'],
    ['symbol'=>'SI_F', 'name'=>'Silver Future',              'type'=>'futures','tv_symbol'=>'COMEX:SI1!',   'yahoo_ticker'=>'SI=F', 'sort_order'=>422,'seed_price'=>39,   'icon'=>'metal'],
    ['symbol'=>'HG_F', 'name'=>'Copper Future',              'type'=>'futures','tv_symbol'=>'COMEX:HG1!',   'yahoo_ticker'=>'HG=F', 'sort_order'=>424,'seed_price'=>4.72, 'icon'=>'metal'],
    ['symbol'=>'NG_F', 'name'=>'Natural Gas Future',         'type'=>'futures','tv_symbol'=>'NYMEX:NG1!',   'yahoo_ticker'=>'NG=F', 'sort_order'=>426,'seed_price'=>2.85, 'icon'=>'oil'],
    ['symbol'=>'RB_F', 'name'=>'RBOB Gasoline Future',       'type'=>'futures','tv_symbol'=>'NYMEX:RB1!',   'yahoo_ticker'=>'RB=F', 'sort_order'=>428,'seed_price'=>2.05, 'icon'=>'oil'],
    ['symbol'=>'HO_F', 'name'=>'Heating Oil Future',         'type'=>'futures','tv_symbol'=>'NYMEX:HO1!',   'yahoo_ticker'=>'HO=F', 'sort_order'=>430,'seed_price'=>2.15, 'icon'=>'oil'],
    ['symbol'=>'VX_F', 'name'=>'VIX Future (CBOE)',          'type'=>'futures','tv_symbol'=>'CBOE:VX1!',    'yahoo_ticker'=>'^VIX', 'sort_order'=>432,'seed_price'=>18,   'icon'=>'future'],
    ['symbol'=>'BTC_F','name'=>'Bitcoin CME Future',         'type'=>'futures','tv_symbol'=>'CME:BTC1!',    'yahoo_ticker'=>'BTC=F','sort_order'=>434,'seed_price'=>69500,'icon'=>'btc'],
    ['symbol'=>'ETH_F','name'=>'Ether CME Future',           'type'=>'futures','tv_symbol'=>'CME:ETH1!',    'yahoo_ticker'=>'ETH=F','sort_order'=>436,'seed_price'=>2600, 'icon'=>'eth'],
    ['symbol'=>'DX_F', 'name'=>'US Dollar Index Future',     'type'=>'futures','tv_symbol'=>'CAPITALCOM:DXY','yahoo_ticker'=>'DX=F','sort_order'=>438,'seed_price'=>104,  'icon'=>'future'],
    ['symbol'=>'6E_F', 'name'=>'Euro FX Future',             'type'=>'futures','tv_symbol'=>'CME:6E1!',     'yahoo_ticker'=>'6E=F', 'sort_order'=>440,'seed_price'=>1.154,'icon'=>'future'],
    ['symbol'=>'6B_F', 'name'=>'British Pound Future',       'type'=>'futures','tv_symbol'=>'CME:6B1!',     'yahoo_ticker'=>'6B=F', 'sort_order'=>442,'seed_price'=>1.336,'icon'=>'future'],
    ['symbol'=>'6J_F', 'name'=>'Japanese Yen Future',        'type'=>'futures','tv_symbol'=>'CME:6J1!',     'yahoo_ticker'=>'6J=F', 'sort_order'=>444,'seed_price'=>0.0069,'icon'=>'future'],
    ['symbol'=>'PA_F', 'name'=>'Palladium Future',           'type'=>'futures','tv_symbol'=>'COMEX:PA1!',   'yahoo_ticker'=>'PA=F', 'sort_order'=>446,'seed_price'=>1080,  'icon'=>'metal'],
    ['symbol'=>'PL_F', 'name'=>'Platinum Future',            'type'=>'futures','tv_symbol'=>'COMEX:PL1!',   'yahoo_ticker'=>'PL=F', 'sort_order'=>448,'seed_price'=>1080,  'icon'=>'metal'],
    ['symbol'=>'LE_F', 'name'=>'Live Cattle Future',         'type'=>'futures','tv_symbol'=>'CME:LE1!',     'yahoo_ticker'=>'LE=F', 'sort_order'=>450,'seed_price'=>17.55,  'icon'=>'future'],
    ['symbol'=>'HE_F', 'name'=>'Lean Hog Future',            'type'=>'futures','tv_symbol'=>'CME:HE1!',     'yahoo_ticker'=>'HE=F', 'sort_order'=>452,'seed_price'=>95,   'icon'=>'future'],
    ['symbol'=>'NKD_F','name'=>'Nikkei 225 Future',          'type'=>'futures','tv_symbol'=>'OSE:NK2251!',   'yahoo_ticker'=>'NKD=F','sort_order'=>454,'seed_price'=>38750,'icon'=>'future'],
    ['symbol'=>'BZ_F', 'name'=>'Brent Crude Future',         'type'=>'futures','tv_symbol'=>'ICEEUR:BRN1!',  'yahoo_ticker'=>'BZ=F', 'sort_order'=>456,'seed_price'=>65.2, 'icon'=>'oil'],
    ['symbol'=>'EMD_F','name'=>'E-mini MidCap 400 Future',   'type'=>'futures','tv_symbol'=>'CME_MINI:EMD1!','yahoo_ticker'=>'EMD=F','sort_order'=>458,'seed_price'=>3950, 'icon'=>'future'],

    // ── ARAB (40+) ──────────────────────────────────────────────────────────
    ['symbol'=>'2222','name'=>'Saudi Aramco',       'type'=>'arab','tv_symbol'=>'TADAWUL:2222','yahoo_ticker'=>'2222.SR','sort_order'=>500,'seed_price'=>30,'icon'=>'arab'],
    ['symbol'=>'1120','name'=>'Al Rajhi Bank',      'type'=>'arab','tv_symbol'=>'TADAWUL:1120','yahoo_ticker'=>'1120.SR','sort_order'=>502,'seed_price'=>95,'icon'=>'arab'],
    ['symbol'=>'2010','name'=>'SABIC',              'type'=>'arab','tv_symbol'=>'TADAWUL:2010','yahoo_ticker'=>'2010.SR','sort_order'=>504,'seed_price'=>75,'icon'=>'arab'],
    ['symbol'=>'7010','name'=>'STC',                'type'=>'arab','tv_symbol'=>'TADAWUL:7010','yahoo_ticker'=>'7010.SR','sort_order'=>506,'seed_price'=>40,'icon'=>'arab'],
    ['symbol'=>'1211','name'=>'Maaden',             'type'=>'arab','tv_symbol'=>'TADAWUL:1211','yahoo_ticker'=>'1211.SR','sort_order'=>508,'seed_price'=>50,'icon'=>'arab'],
    ['symbol'=>'1150','name'=>'Alinma Bank',        'type'=>'arab','tv_symbol'=>'TADAWUL:1150','yahoo_ticker'=>'1150.SR','sort_order'=>510,'seed_price'=>122,'icon'=>'arab'],
    ['symbol'=>'1180','name'=>'Saudi National Bank','type'=>'arab','tv_symbol'=>'TADAWUL:1180','yahoo_ticker'=>'1180.SR','sort_order'=>512,'seed_price'=>36,'icon'=>'arab'],
    ['symbol'=>'2280','name'=>'Almarai',            'type'=>'arab','tv_symbol'=>'TADAWUL:2280','yahoo_ticker'=>'2280.SR','sort_order'=>514,'seed_price'=>58,'icon'=>'arab'],
    ['symbol'=>'1010','name'=>'Riyad Bank',         'type'=>'arab','tv_symbol'=>'TADAWUL:1010','yahoo_ticker'=>'1010.SR','sort_order'=>516,'seed_price'=>122,'icon'=>'arab'],
    ['symbol'=>'1020','name'=>'Bank AlJazira',      'type'=>'arab','tv_symbol'=>'TADAWUL:1020','yahoo_ticker'=>'1020.SR','sort_order'=>518,'seed_price'=>122,'icon'=>'arab'],
    ['symbol'=>'1030','name'=>'Saudi Hollandi Bank','type'=>'arab','tv_symbol'=>'TADAWUL:1030','yahoo_ticker'=>'1030.SR','sort_order'=>520,'seed_price'=>24,'icon'=>'arab'],
    ['symbol'=>'1050','name'=>'Saudi British Bank', 'type'=>'arab','tv_symbol'=>'TADAWUL:1050','yahoo_ticker'=>'1050.SR','sort_order'=>522,'seed_price'=>42,'icon'=>'arab'],
    ['symbol'=>'2050','name'=>'Savola Group',       'type'=>'arab','tv_symbol'=>'TADAWUL:2050','yahoo_ticker'=>'2050.SR','sort_order'=>524,'seed_price'=>122,'icon'=>'arab'],
    ['symbol'=>'2080','name'=>'Sisco',              'type'=>'arab','tv_symbol'=>'TADAWUL:2080','yahoo_ticker'=>'2080.SR','sort_order'=>526,'seed_price'=>48,'icon'=>'arab'],
    ['symbol'=>'7020','name'=>'Zain KSA',           'type'=>'arab','tv_symbol'=>'TADAWUL:7020','yahoo_ticker'=>'7020.SR','sort_order'=>528,'seed_price'=>18,'icon'=>'arab'],
    ['symbol'=>'7030','name'=>'Etihad Etisalat',    'type'=>'arab','tv_symbol'=>'TADAWUL:7030','yahoo_ticker'=>'7030.SR','sort_order'=>530,'seed_price'=>17.5,'icon'=>'arab'],
    ['symbol'=>'2040','name'=>'Saudi Cable',        'type'=>'arab','tv_symbol'=>'TADAWUL:2040','yahoo_ticker'=>'2040.SR','sort_order'=>532,'seed_price'=>5.8,'icon'=>'arab'],
    ['symbol'=>'2060','name'=>'Al Qassim Cement',  'type'=>'arab','tv_symbol'=>'TADAWUL:2060','yahoo_ticker'=>'2060.SR','sort_order'=>534,'seed_price'=>20,'icon'=>'arab'],
    ['symbol'=>'2090','name'=>'National Cement',    'type'=>'arab','tv_symbol'=>'TADAWUL:2090','yahoo_ticker'=>'2090.SR','sort_order'=>536,'seed_price'=>16,'icon'=>'arab'],
    ['symbol'=>'2100','name'=>'Yanbu Cement',       'type'=>'arab','tv_symbol'=>'TADAWUL:2100','yahoo_ticker'=>'2100.SR','sort_order'=>538,'seed_price'=>17.5,'icon'=>'arab'],
    ['symbol'=>'4001','name'=>'Kingdom Holding',    'type'=>'arab','tv_symbol'=>'TADAWUL:4001','yahoo_ticker'=>'4001.SR','sort_order'=>540,'seed_price'=>5.8,'icon'=>'arab'],
    ['symbol'=>'4002','name'=>'MBC Group',          'type'=>'arab','tv_symbol'=>'TADAWUL:4002','yahoo_ticker'=>'4002.SR','sort_order'=>542,'seed_price'=>28,'icon'=>'arab'],
    ['symbol'=>'4190','name'=>'Jarir Marketing',    'type'=>'arab','tv_symbol'=>'TADAWUL:4190','yahoo_ticker'=>'4190.SR','sort_order'=>544,'seed_price'=>2.15,'icon'=>'arab'],
    ['symbol'=>'4200','name'=>'Saudi Telecom',      'type'=>'arab','tv_symbol'=>'TADAWUL:4200','yahoo_ticker'=>'4200.SR','sort_order'=>546,'seed_price'=>42,'icon'=>'arab'],
    ['symbol'=>'4210','name'=>'Al Hassan Ghazi',    'type'=>'arab','tv_symbol'=>'TADAWUL:4210','yahoo_ticker'=>'4210.SR','sort_order'=>548,'seed_price'=>17.5,'icon'=>'arab'],
    ['symbol'=>'4240','name'=>'Saudi Food & Drug',  'type'=>'arab','tv_symbol'=>'TADAWUL:4240','yahoo_ticker'=>'4240.SR','sort_order'=>550,'seed_price'=>18,'icon'=>'arab'],
    ['symbol'=>'4260','name'=>'Dallah Healthcare',  'type'=>'arab','tv_symbol'=>'TADAWUL:4260','yahoo_ticker'=>'4260.SR','sort_order'=>552,'seed_price'=>88,'icon'=>'arab'],
    ['symbol'=>'4280','name'=>'Al Moammar Info.',   'type'=>'arab','tv_symbol'=>'TADAWUL:4280','yahoo_ticker'=>'4280.SR','sort_order'=>554,'seed_price'=>48,'icon'=>'arab'],
    ['symbol'=>'4300','name'=>'SABIC Agri-Nutrients','type'=>'arab','tv_symbol'=>'TADAWUL:4300','yahoo_ticker'=>'4300.SR','sort_order'=>556,'seed_price'=>112,'icon'=>'arab'],
    ['symbol'=>'4321','name'=>'Al Khaleej Training','type'=>'arab','tv_symbol'=>'TADAWUL:4321','yahoo_ticker'=>'4321.SR','sort_order'=>558,'seed_price'=>122,'icon'=>'arab'],
    ['symbol'=>'2150','name'=>'Hail Cement',        'type'=>'arab','tv_symbol'=>'TADAWUL:2150','yahoo_ticker'=>'2150.SR','sort_order'=>560,'seed_price'=>18,'icon'=>'arab'],
    ['symbol'=>'2160','name'=>'Arabian Cement',     'type'=>'arab','tv_symbol'=>'TADAWUL:2160','yahoo_ticker'=>'2160.SR','sort_order'=>562,'seed_price'=>16,'icon'=>'arab'],
    ['symbol'=>'2170','name'=>'Southern Cement',    'type'=>'arab','tv_symbol'=>'TADAWUL:2170','yahoo_ticker'=>'2170.SR','sort_order'=>564,'seed_price'=>75,'icon'=>'arab'],
    ['symbol'=>'2180','name'=>'Eastern Cement',     'type'=>'arab','tv_symbol'=>'TADAWUL:2180','yahoo_ticker'=>'2180.SR','sort_order'=>566,'seed_price'=>122,'icon'=>'arab'],
  ];
}

function vp_supported_market_limit(string $typeAlias): ?int {
  return match (vp_normalize_asset_type($typeAlias)) {
    'crypto' => 50,
    'forex' => 30,
    'stocks' => 20,
    'commodities' => 30,
    'arab' => 30,
    default => null,
  };
}

function vp_supported_market_bootstrap_limit(string $typeAlias, string $scope): int {
  $typeAlias = vp_normalize_asset_type($typeAlias);
  $scope = strtolower(trim($scope));
  if ($scope === 'home') {
    return match ($typeAlias) {
      'crypto' => 50,
      'forex' => 30,
      'stocks' => 20,
      'commodities' => 20,
      'arab' => 12,
      default => 20,
    };
  }

  if ($scope === 'trade') {
    return match ($typeAlias) {
      'crypto' => 50,
      'forex' => 30,
      'stocks' => 20,
      'commodities' => 30,
      'arab' => 30,
      default => 20,
    };
  }

  return match ($typeAlias) {
    'crypto' => 50,
    'forex' => 30,
    'stocks' => 20,
    'commodities' => 30,
    'arab' => 30,
    default => 20,
  };
}

function vp_supported_home_symbols(): array {
  return ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','XAUUSD','XAGUSD','USOIL','UKOIL','2222','1120'];
}

function vp_supported_market_key(string $type, string $symbol): string {
  return vp_normalize_asset_type($type) . ':' . strtoupper(trim($symbol));
}

function vp_supported_defs_for(string $typeAlias, string $scope = ''): array {
  $defs = vp_supported_market_defs();
  if ($scope === 'home') {
    $home = array_flip(vp_supported_home_symbols());
    $defs = array_values(array_filter($defs, static fn($d) => isset($home[strtoupper((string)$d['symbol'])])));
  } elseif ($typeAlias !== '' && $typeAlias !== 'all' && $typeAlias !== 'favorites') {
    $defs = array_values(array_filter($defs, static fn($d) => vp_normalize_asset_type((string)$d['type']) === $typeAlias));
  }
  usort($defs, static fn($a, $b) => ((int)($a['sort_order'] ?? 999)) <=> ((int)($b['sort_order'] ?? 999)));
  $counts = ['crypto' => 0, 'forex' => 0, 'stocks' => 0, 'commodities' => 0, 'arab' => 0];
  $out = [];
  foreach ($defs as $def) {
    $defType = vp_normalize_asset_type((string)($def['type'] ?? ''));
    if ($defType === '') continue;
    if (function_exists('vp_asset_trade_supported') && !vp_asset_trade_supported((string)($def['symbol'] ?? ''), $defType, $def)) continue;
    $limit = vp_supported_market_bootstrap_limit($defType, $scope);
    if ($limit !== null) {
      $counts[$defType] = ($counts[$defType] ?? 0) + 1;
      if ($counts[$defType] > $limit) continue;
    }
    $out[] = $def;
  }
  return $out;
}

function vp_build_supported_market_row(array $def, int $idBase = 970000): array {
  static $seq = 0;
  $seq++;
  $meta = array_filter([
    'supported' => true,
    'icon' => (string)($def['icon'] ?? ''),
    'icon_url' => !empty($def['icon']) ? '/assets/img/markets/' . preg_replace('/[^a-z0-9_-]/i', '', (string)$def['icon']) . '.svg' : '',
    'yahoo_ticker' => (string)($def['yahoo_ticker'] ?? ''),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
  ]);
  return [
    'id' => $idBase + $seq,
    'symbol' => strtoupper((string)($def['symbol'] ?? '')),
    'name' => (string)($def['name'] ?? ($def['symbol'] ?? 'Market')),
    'type' => vp_normalize_asset_type((string)($def['type'] ?? 'crypto')),
    'status' => 'active',
    'sort_order' => (int)($def['sort_order'] ?? ($seq * 2)),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    'seed_price' => (float)($def['seed_price'] ?? 0),
    'meta' => json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    'q_price' => null,
    'q_change' => 0,
    'q_updated' => 0,
    'q_source' => null,
  ];
}

function vp_curated_supported_rows(array $rows, string $typeAlias, string $scope): array {
  $defs = vp_supported_defs_for($typeAlias, $scope);
  if (!$defs) {
    return ($typeAlias !== '' && $typeAlias !== 'all' && $typeAlias !== 'favorites') ? [] : $rows;
  }

  $wanted = [];
  foreach ($defs as $def) {
    $wanted[vp_supported_market_key((string)$def['type'], (string)$def['symbol'])] = $def;
  }

  $rowByKey = [];
  foreach ($rows as $row) {
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    $symbol = strtoupper((string)($row['symbol'] ?? ''));
    $key = vp_supported_market_key($type, $symbol);
    if (!isset($wanted[$key]) || isset($rowByKey[$key])) continue;
    $rowByKey[$key] = $row;
  }

  $out = [];
  foreach ($defs as $def) {
    $key = vp_supported_market_key((string)$def['type'], (string)$def['symbol']);
    $row = $rowByKey[$key] ?? vp_build_supported_market_row($def);
    $row['sort_order'] = (int)($def['sort_order'] ?? ($row['sort_order'] ?? 0));
    if (empty($row['tv_symbol']) && !empty($def['tv_symbol'])) $row['tv_symbol'] = (string)$def['tv_symbol'];
    if (!empty($def['seed_price'])) $row['seed_price'] = (float)$def['seed_price'];
    $out[] = $row;
  }
  return $out;
}

function vp_supported_rescue_limits(string $scope, string $type): array {
  $scope = strtolower(trim($scope));
  $type = vp_normalize_asset_type($type);
  $isHome = ($scope === 'home');
  return match ($type) {
    'crypto' => [
      'batch' => $isHome ? 6 : 8,
      'direct_budget' => $isHome ? 6 : 8,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'ttl' => 1,
    ],
    'forex' => [
      'batch' => $isHome ? 2 : 3,
      'direct_budget' => $isHome ? 2 : 3,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 1,
      'ttl' => 2,
    ],
    'stocks' => [
      'batch' => $isHome ? 3 : 4,
      'direct_budget' => $isHome ? 3 : 4,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'ttl' => 2,
    ],
    'commodities' => [
      'batch' => $isHome ? 4 : 12,
      'direct_budget' => $isHome ? 4 : 12,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'ttl' => 2,
    ],
    'arab' => [
      'batch' => $isHome ? 8 : 30,
      'direct_budget' => $isHome ? 8 : 30,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'ttl' => 2,
    ],
    'futures' => [
      'batch' => $isHome ? 2 : 3,
      'direct_budget' => $isHome ? 2 : 3,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'ttl' => 2,
    ],
    default => [
      'batch' => 2,
      'direct_budget' => 2,
      'direct_yahoo_budget' => 0,
      'chart_budget' => 1,
      'ttl' => 2,
    ],
  };
}

function vp_rescue_supported_market_quotes(array $items, string $scope): array {
  if (!$items || !in_array($scope, ['home', 'trade'], true)) return $items;
  $started = microtime(true);
  $budgetMs = max(300, min(5000, (int)env('MARKETS_RESCUE_BUDGET_MS', $scope === 'home' ? '3000' : '1500')));
  $requestType = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
  $defaultNonCryptoRescue = ($scope === 'trade' && in_array($requestType, ['arab','commodities'], true)) ? '1' : '0';
  $allowNonCryptoRescue = ((int)($_GET['rescue_noncrypto'] ?? env('MARKETS_RESCUE_NONCRYPTO', $defaultNonCryptoRescue)) === 1);

  $defsByKey = [];
  foreach (vp_supported_defs_for('all', $scope) as $def) {
    $defsByKey[vp_supported_market_key((string)($def['type'] ?? ''), (string)($def['symbol'] ?? ''))] = $def;
  }

  $groups = [];
  foreach ($items as $idx => $item) {
    $price = (float)($item['price'] ?? 0);
    if ($price > 0) continue;
    $symbol = strtoupper(trim((string)($item['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($item['type'] ?? ''));
    if ($symbol === '' || $type === '') continue;
    if (!isset($groups[$type])) $groups[$type] = [];
    $groups[$type][] = ['index' => $idx, 'symbol' => $symbol, 'item' => $item];
  }

  if (!$groups) return $items;

  $orderedGroups = [];
  $groupOrder = $scope === 'home'
    ? ['crypto', 'forex', 'commodities', 'futures', 'arab', 'stocks']
    : ['crypto', 'forex', 'stocks', 'commodities', 'futures', 'arab'];
  foreach ($groupOrder as $orderedType) {
    if (isset($groups[$orderedType])) $orderedGroups[$orderedType] = $groups[$orderedType];
  }
  foreach ($groups as $type => $entries) {
    if (!isset($orderedGroups[$type])) $orderedGroups[$type] = $entries;
  }

  foreach ($orderedGroups as $type => $entries) {
    if (((microtime(true) - $started) * 1000) >= $budgetMs) break;
    if ($type !== 'crypto' && !$allowNonCryptoRescue) continue;
    $limits = vp_supported_rescue_limits($scope, $type);
    $batch = max(1, (int)($limits['batch'] ?? 2));
    $slice = array_slice($entries, 0, $batch);
    $symbols = [];
    $metaBySymbol = [];
    foreach ($slice as $entry) {
      $symbols[] = $entry['symbol'];
      $meta = market_meta($entry['item']['meta'] ?? null);
      $defKey = vp_supported_market_key($type, $entry['symbol']);
      $defMeta = $defsByKey[$defKey] ?? [];
      $metaBySymbol[$entry['symbol']] = array_merge($defMeta, $meta);
    }
    if (!$symbols) continue;

    try {
      $live = quote_bulk_live($symbols, $type, $metaBySymbol, [
        'ttl' => (int)($limits['ttl'] ?? 2),
        'yahoo_ttl' => (int)($limits['ttl'] ?? 2),
        'massive_ttl' => (int)($limits['ttl'] ?? 2),
        // List endpoints must remain read/paint fast even when MySQL is
        // reconnecting. Cron warmers are responsible for durable persistence.
        'persist' => ((int)env('MARKETS_RESCUE_PERSIST_QUOTES', '0') === 1),
        'direct_budget' => (int)($limits['direct_budget'] ?? $batch),
        'direct_yahoo_budget' => (int)($limits['direct_yahoo_budget'] ?? $batch),
        'chart_budget' => (int)($limits['chart_budget'] ?? 0),
        'chart_budget_ms' => 600,
      ]);
    } catch (Throwable $e) {
      $live = [];
    }

    if (!$live) continue;

    foreach ($slice as $entry) {
      $symbol = $entry['symbol'];
      $row = is_array($live[$symbol] ?? null) ? $live[$symbol] : null;
      if (!$row) continue;
      $price = (float)($row['price'] ?? 0);
      if (!($price > 0)) continue;
      $src = (string)($row['source'] ?? 'provider_live');
      if (vp_market_quote_source_blocked($symbol, $type, $src)) continue;
      $items[$entry['index']]['price'] = $price;
      $items[$entry['index']]['change_pct'] = (float)($row['change_pct'] ?? 0);
      $items[$entry['index']]['open'] = (float)($row['open'] ?? 0);
      $items[$entry['index']]['prev_close'] = (float)($row['prev_close'] ?? $row['previous_close'] ?? 0);
      $items[$entry['index']]['updated_at'] = (int)($row['updated_at'] ?? time());
      $items[$entry['index']]['source'] = $src;
      $items[$entry['index']]['is_stale'] = !empty($row['is_stale']);
      $items[$entry['index']]['timing_class'] = function_exists('qa_quote_timing_class')
        ? qa_quote_timing_class($row, $type)
        : (string)($row['timing_class'] ?? 'live');
      $items[$entry['index']]['age_sec'] = 0;
      $items[$entry['index']]['delayed'] = ($items[$entry['index']]['timing_class'] === 'delayed');
    }
  }

  return $items;
}


function vp_overlay_cached_quotes_fast(array $items): array {
  if (!$items) return $items;
  $symbols = [];
  $cryptoSymbols = [];
  foreach ($items as $item) {
    $sym = strtoupper(trim((string)($item['symbol'] ?? '')));
    if ($sym !== '' && preg_match('/^[A-Z0-9:._-]{1,32}$/', $sym)) {
      $symbols[$sym] = true;
      if (vp_normalize_asset_type((string)($item['type'] ?? '')) === 'crypto') $cryptoSymbols[$sym] = true;
    }
  }
  if (!$symbols) return $items;
  if ($cryptoSymbols && function_exists('quote_central_get_many')) {
    try {
      $centralRows = quote_central_get_many(array_keys($cryptoSymbols), 'crypto', 15);
      foreach ($items as &$item) {
        $sym = strtoupper((string)($item['symbol'] ?? ''));
        if ($sym === '' || vp_normalize_asset_type((string)($item['type'] ?? '')) !== 'crypto') continue;
        $row = is_array($centralRows[$sym] ?? null) ? $centralRows[$sym] : null;
        if (!$row && function_exists('quote_central_get')) $row = quote_central_get($sym, 'crypto', 15);
        if (!is_array($row)) continue;
        if (function_exists('quote_enrich_change_from_reference')) {
          $row = quote_enrich_change_from_reference($sym, 'crypto', $row);
        }
        $price = (float)($row['price'] ?? 0);
        if (!($price > 0)) continue;
        $source = (string)($row['source'] ?? 'central');
        if (vp_market_quote_source_blocked($sym, 'crypto', $source)) continue;
        $ts = (int)($row['updated_at'] ?? $row['central_ts'] ?? $row['received_at'] ?? 0);
        $item['price'] = $price;
        $item['change_pct'] = (float)($row['change_pct'] ?? 0);
        $item['change_basis'] = (string)($row['change_basis'] ?? '');
        $item['open'] = (float)($row['open'] ?? 0);
        $item['updated_at'] = $ts;
        $item['source'] = $source;
        $item['is_stale'] = false;
        $item['timing_class'] = 'live';
        $item['delayed'] = false;
      }
      unset($item);
    } catch (Throwable $e) {}
  }
  try {
    $pdo = db();
    $driver = db_driver();
    if (function_exists('schema_table_exists') && !schema_table_exists($pdo, 'market_quotes', $driver)) return $items;
    $hasSource = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'source', $driver) : true;
    $hasTiming = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'timing_class', $driver) : false;
    $hasStale = function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_quotes', 'is_stale', $driver) : false;
    $marks = implode(',', array_fill(0, count($symbols), '?'));
    $sel = 'symbol,type,price,change_pct,updated_at';
    $sel .= $hasSource ? ',source' : ",'' AS source";
    $sel .= $hasTiming ? ',timing_class' : ",'' AS timing_class";
    $sel .= $hasStale ? ',is_stale' : ',0 AS is_stale';
    $st = $pdo->prepare("SELECT {$sel} FROM market_quotes WHERE symbol IN ($marks)");
    $st->execute(array_keys($symbols));
    $by = [];
    foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
      $sym = strtoupper((string)($row['symbol'] ?? ''));
      $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
      if ($sym === '' || $type === '') continue;
      $key = $type . ':' . $sym;
      $price = (float)($row['price'] ?? 0);
      if (!($price > 0)) continue;
      $by[$key] = $row;
    }
    foreach ($items as &$item) {
      $sym = strtoupper((string)($item['symbol'] ?? ''));
      $type = vp_normalize_asset_type((string)($item['type'] ?? ''));
      $row = $by[$type . ':' . $sym] ?? null;
      if (!$row && $type === 'arab') $row = $by['stocks:' . $sym] ?? null;
      if (!$row) continue;
      $currentSource = strtolower((string)($item['source'] ?? ''));
      $currentUpdated = (int)($item['updated_at'] ?? 0);
      if ($type === 'crypto' && $currentUpdated > 0 && (time() - $currentUpdated) <= 15 && quote_source_is_liveish($currentSource, 'crypto')) {
        continue;
      }
      $price = (float)($row['price'] ?? 0);
      if (!($price > 0)) continue;
      $source = (string)($row['source'] ?? 'cache');
      if (vp_market_quote_source_blocked($sym, $type, $source)) continue;
      $item['price'] = $price;
      $item['change_pct'] = (float)($row['change_pct'] ?? 0);
      $item['updated_at'] = (int)($row['updated_at'] ?? 0);
      $item['source'] = $source;
      $item['is_stale'] = !empty($row['is_stale']);
      $timing = (string)($row['timing_class'] ?? '');
      if ($timing === '') $timing = (in_array($type, ['stocks','arab'], true) ? 'delayed' : 'live');
      $item['timing_class'] = $timing;
      $item['delayed'] = ($timing === 'delayed');
    }
    unset($item);
  } catch (Throwable $e) {}
  return $items;
}

function vp_filter_priced_supported_items(array $items, string $scope, bool $withQuotes, bool $supportedOnly): array {
  if (!$supportedOnly || !$withQuotes || !in_array($scope, ['home', 'trade'], true)) return $items;
  $defaultHide = $scope === 'trade' ? '1' : '0';
  if ($scope !== 'trade' && (int)env('MARKETS_HIDE_UNPRICED_SUPPORTED', $defaultHide) !== 1) return $items;
  $pricedItems = array_values(array_filter($items, static function(array $it) use ($scope): bool {
    $price = (float)($it['price'] ?? 0);
    $source = strtolower(trim((string)($it['source'] ?? '')));
    $timing = strtolower(trim((string)($it['timing_class'] ?? '')));
    $quality = strtolower(trim((string)($it['quality'] ?? '')));
    if ($price <= 0 || $source === '' || $source === 'unavailable' || $timing === 'unavailable' || $timing === 'seed') return false;
    if (!empty($it['is_stale']) || in_array($quality, ['stale', 'unavailable', 'unsupported'], true)) return false;
    if ($scope === 'trade') {
      $assetType = vp_normalize_asset_type((string)($it['type'] ?? ''));
      $allowedTiming = ['live', 'realtime', 'cached_executable', 'market_closed'];
      if (in_array($assetType, ['stocks','arab'], true)) $allowedTiming[] = 'delayed';
      if (!in_array($timing, $allowedTiming, true)) return false;
      $updatedAt = 0;
      foreach (['provider_updated_at', 'cache_updated_at', 'received_at', 'updated_at'] as $tsKey) {
        if (isset($it[$tsKey]) && is_numeric($it[$tsKey])) $updatedAt = max($updatedAt, (int)$it[$tsKey]);
      }
      if ($updatedAt > 1000000000000) $updatedAt = (int)floor($updatedAt / 1000);
      $maxAge = function_exists('qs_execution_max_age') ? qs_execution_max_age($assetType) : 180;
      if ($updatedAt <= 0 || (time() - $updatedAt) > $maxAge) return false;
    }
    if (function_exists('quote_source_is_untrusted') && quote_source_is_untrusted($source)) return false;
    return true;
  }));
  return $pricedItems;
}

function vp_overlay_supported_live_quotes(array $items, string $typeAlias, string $scope): array {
  $typeAlias = vp_normalize_asset_type($typeAlias);
  if (!$items || $scope !== 'trade' || !in_array($typeAlias, ['arab','commodities'], true)) return $items;

  $symbols = [];
  $metaBySymbol = [];
  foreach ($items as $item) {
    $sym = strtoupper(trim((string)($item['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($item['type'] ?? $typeAlias));
    if ($sym === '' || $type !== $typeAlias) continue;
    $meta = market_meta($item['meta'] ?? null);
    if (function_exists('vp_asset_reference')) {
      $ref = vp_asset_reference($sym, $type, $meta);
      foreach (['twelvedata_ticker','eodhd_symbol','tv_symbol'] as $key) {
        if (!empty($ref[$key]) && empty($meta[$key])) $meta[$key] = $ref[$key];
      }
    }
    $symbols[] = $sym;
    $metaBySymbol[$sym] = $meta;
  }
  $symbols = array_values(array_unique($symbols));
  if ($typeAlias === 'commodities') {
    $commodityOverlayLimit = max(6, min(30, (int)env('MARKETS_COMMODITIES_LIVE_OVERLAY_LIMIT', '22')));
    if (count($symbols) > $commodityOverlayLimit) $symbols = array_slice($symbols, 0, $commodityOverlayLimit);
  }
  if (!$symbols) return $items;

  try {
    $live = quote_bulk_live($symbols, $typeAlias, $metaBySymbol, [
      'ttl' => 2,
      'persist' => false,
      'direct_budget' => count($symbols),
      'direct_yahoo_budget' => 0,
      'chart_budget' => 0,
      'chart_budget_ms' => 500,
    ]);
  } catch (Throwable $e) {
    $live = [];
  }
  if (!$live) return $items;

  foreach ($items as &$item) {
    $sym = strtoupper(trim((string)($item['symbol'] ?? '')));
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    if (!$row) continue;
    $price = (float)($row['price'] ?? 0);
    if (!($price > 0)) continue;
    $source = (string)($row['source'] ?? 'provider_live');
    if (vp_market_quote_source_blocked($sym, $typeAlias, $source)) continue;
    $item['price'] = $price;
    $item['change_pct'] = (float)($row['change_pct'] ?? 0);
    $item['open'] = (float)($row['open'] ?? 0);
    $item['prev_close'] = (float)($row['prev_close'] ?? $row['previous_close'] ?? 0);
    $item['updated_at'] = (int)($row['updated_at'] ?? time());
    $item['source'] = $source;
    $item['is_stale'] = !empty($row['is_stale']);
    $item['timing_class'] = function_exists('qa_quote_timing_class')
      ? qa_quote_timing_class($row + ['delayed' => in_array($typeAlias, ['stocks','arab'], true)], $typeAlias)
      : (string)($row['timing_class'] ?? (in_array($typeAlias, ['stocks','arab'], true) ? 'delayed' : 'live'));
    $item['delayed'] = in_array($typeAlias, ['stocks','arab'], true);
  }
  unset($item);

  return $items;
}


function vp_markets_quote_is_usable(string $assetType, float $price, int $updatedAt, string $source): bool {
  if (!($price > 0)) return false;
  $assetType = vp_normalize_asset_type($assetType);
  if (!quote_source_is_liveish($source, $assetType)) return false;
  if ($updatedAt <= 0) return false;
  $age = max(0, time() - $updatedAt);
  if ($assetType === 'crypto') return $age <= 12;
  $maxAge = function_exists('qa_quote_max_age')
    ? qa_quote_max_age($assetType, false)
    : (in_array($assetType, ['stocks','arab'], true) ? 7200 : (in_array($assetType, ['commodities','futures'], true) ? 1800 : 360));
  return $age <= $maxAge;
}

function vp_reference_quote_from_market_row(array $row, string $assetType): ?array {
  $assetType = vp_normalize_asset_type($assetType);
  if ($assetType === 'crypto') return null;
  if ((int)env('MARKETS_REFERENCE_SEED_FALLBACK', '0') !== 1) return null;
  $seed = (float)($row['seed_price'] ?? 0);
  if (!($seed > 0)) return null;
  return [
    'price' => $seed,
    'change_pct' => 0.0,
    'updated_at' => time(),
    'source' => 'seed_price',
    'is_stale' => false,
    'timing_class' => 'seed',
  ];
}

function vp_market_quote_source_blocked(string $symbol, string $assetType, string $source): bool {
  $src = strtolower(trim($source));
  if ($src === '' || $src === 'unavailable') return true;
  if (function_exists('quote_source_disabled_by_config') && quote_source_disabled_by_config($src)) return true;
  if (function_exists('quote_source_is_untrusted') && quote_source_is_untrusted($src)) return true;
  return function_exists('quote_source_blocked_for_symbol')
    && quote_source_blocked_for_symbol($symbol, $assetType, $src);
}

function vp_apply_reference_quotes_to_items(array $items, array $rows, string $scope, bool $withQuotes, bool $supportedOnly): array {
  if (!$items || !$rows || !$withQuotes || !$supportedOnly || !in_array($scope, ['home', 'trade'], true)) return $items;

  $rowsByKey = [];
  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($sym === '' || $type === '') continue;
    $rowsByKey[$type . ':' . $sym] = $row;
    $rowsByKey[$sym] = $row;
  }

  foreach ($items as &$item) {
    $sym = strtoupper(trim((string)($item['symbol'] ?? '')));
    $assetType = vp_normalize_asset_type((string)($item['type'] ?? ''));
    if ($sym === '' || $assetType === '') continue;

    $price = (float)($item['price'] ?? 0);
    $source = (string)($item['source'] ?? '');
    $needsReference = $price <= 0
      || $source === ''
      || strtolower($source) === 'unavailable'
      || vp_market_quote_source_blocked($sym, $assetType, $source);

    if (!$needsReference) continue;

    $row = $rowsByKey[$assetType . ':' . $sym] ?? $rowsByKey[$sym] ?? null;
    if (!is_array($row)) continue;

    $reference = vp_reference_quote_from_market_row($row, $assetType);
    if (!is_array($reference)) continue;

    $item['price'] = (float)$reference['price'];
    $item['change_pct'] = (float)$reference['change_pct'];
    $item['updated_at'] = (int)$reference['updated_at'];
    $item['source'] = (string)$reference['source'];
    $item['is_stale'] = !empty($reference['is_stale']);
    $item['timing_class'] = (string)$reference['timing_class'];
    $item['delayed'] = false;
  }
  unset($item);

  return $items;
}

function normalize_tv_symbol(string $symbol, string $type, string $tvSymbol=''): string {
  $sym = strtoupper(trim($symbol));
  $kind = strtolower(trim($type));
  $raw = strtoupper(trim($tvSymbol));

  $commodityAlias = [
    'XAUUSD' => 'OANDA:XAUUSD',
    'GOLD' => 'OANDA:XAUUSD',
    'XAGUSD' => 'OANDA:XAGUSD',
    'SILVER' => 'OANDA:XAGUSD',
    'XPTUSD' => 'OANDA:XPTUSD',
    'PLAT' => 'OANDA:XPTUSD',
    'PLATINUM' => 'OANDA:XPTUSD',
    'XPDUSD' => 'OANDA:XPDUSD',
    'PALL' => 'OANDA:XPDUSD',
    'PALLADIUM' => 'OANDA:XPDUSD',
    'USOIL' => 'TVC:USOIL',
    'WTI' => 'TVC:USOIL',
    'OIL' => 'TVC:USOIL',
    'UKOIL' => 'TVC:UKOIL',
    'BRENT' => 'TVC:UKOIL',
    'NGAS' => 'FX:NGAS',
    'NATGAS' => 'FX:NGAS',
    'COPPER' => 'CAPITALCOM:COPPER',
    'CORN' => 'OANDA:CORNUSD',
    'WHEAT' => 'CAPITALCOM:WHEAT',
    'SOY' => 'CBOT:ZS1!',
    'SOYBEAN' => 'CBOT:ZS1!',
    'SUGAR' => 'ICEUS:SB1!',
    'COFFEE' => 'ICEUS:KC1!',
    'COCOA' => 'ICEUS:CC1!',
    'COTTON' => 'ICEUS:CT1!',
    'RICE' => 'CBOT:ZR1!',
    'OAT' => 'CBOT:ZO1!',
    'GASOLINE' => 'NYMEX:RB1!',
    'HEATOIL' => 'NYMEX:HO1!',
    'LUMBER' => 'CME:LBR1!',
    'CATTLE' => 'CME:LE1!',
    'HOGS' => 'CME:HE1!',
    'ORANGE' => 'ICEUS:OJ1!',
    'GLD' => 'AMEX:GLD',
    'SLV' => 'AMEX:SLV',
  ];

  if ($kind === 'commodities') {
    if ($raw !== '') {
      if (preg_match('/^TVC:(WTI|OIL)$/i', $raw)) return 'TVC:USOIL';
      if (preg_match('/^TVC:BRENT$/i', $raw)) return 'TVC:UKOIL';
      if (preg_match('/^TVC:(XAGUSD|XPTUSD|XPDUSD|NGAS|COPPER|CORN|WHEAT|SOY|SUGAR|COFFEE|COCOA|COTTON|RICE|OAT|GASOLINE|HEATOIL|LUMBER|CATTLE|HOGS|ORANGE)$/i', $raw)) {
        $stripped = substr($raw, strpos($raw, ':') + 1);
        return $commodityAlias[$stripped] ?? $stripped;
      }
      if (preg_match('/^[A-Z0-9._-]+:[A-Z0-9!._-]+$/', $raw)) return $raw;
      if (isset($commodityAlias[$raw])) return $commodityAlias[$raw];
    }
    if (isset($commodityAlias[$sym])) return $commodityAlias[$sym];
    return '';
  }

  if ($raw !== '' && preg_match('/^[A-Z0-9._-]+:[A-Z0-9!._-]+$/', $raw)) return $raw;
  if ($kind === 'arab') return $raw !== '' ? $raw : (preg_match('/^\d{4}$/', $sym) ? 'TADAWUL:' . $sym : $sym);
  if ($kind === 'futures') {
    $futuresAlias = [
      'ES_F' => 'CME_MINI:ES1!', 'NQ_F' => 'CME_MINI:NQ1!', 'YM_F' => 'CBOT_MINI:YM1!', 'RTY_F' => 'CME_MINI:RTY1!',
      'NKD_F' => 'OSE:NK2251!', 'CL_F' => 'NYMEX:CL1!', 'BZ_F' => 'ICEEUR:BRN1!', 'GC_F' => 'COMEX:GC1!',
      'SI_F' => 'COMEX:SI1!', 'NG_F' => 'NYMEX:NG1!', 'ZN_F' => 'CBOT:ZN1!', 'ZB_F' => 'CBOT:ZB1!'
    ];
    return $raw !== '' ? $raw : ($futuresAlias[$sym] ?? $sym);
  }
  if ($kind === 'crypto') return 'BINANCE:' . $sym;
  if ($kind === 'forex') return 'FX:' . $sym;
  if ($kind === 'stocks') return (preg_match('/^[A-Z]+$/', $sym) ? 'NASDAQ:' : 'NYSE:') . $sym;
  return $raw !== '' ? $raw : $sym;
}

function vp_market_items_from_rows(array $rows, string $typeAlias, string $scope, bool $withQuotes, bool $supportedOnly, array $sigMap = [], bool $allowRescue = true): array {
  $quoteBaseOpts = [
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => true,
    'direct_budget' => $typeAlias === 'crypto' ? 24 : (in_array($typeAlias, ['arab','futures'], true) ? 18 : 8),
    'direct_yahoo_budget' => 0,
    'chart_budget' => $typeAlias === 'crypto' ? 0 : 0,
    'only_twelvedata_for_noncrypto' => $typeAlias !== 'crypto',
  ];

  $authoritativeQuotes = [];
  if ($withQuotes) {
    $cryptoRows = [];
    $otherRows = [];
    foreach ($rows as $quoteRow) {
      if (vp_normalize_asset_type((string)($quoteRow['type'] ?? '')) === 'crypto') $cryptoRows[] = $quoteRow;
      else $otherRows[] = $quoteRow;
    }
    if ($otherRows) {
      try {
        $authoritativeQuotes = array_replace(
          $authoritativeQuotes,
          qa_overlay_market_rows($otherRows, array_merge($quoteBaseOpts, ['with_live' => false]))
        );
      } catch (Throwable $e) {}
    }
    if ($cryptoRows) {
      try {
        $authoritativeQuotes = array_replace(
          $authoritativeQuotes,
          qa_overlay_market_rows($cryptoRows, array_merge($quoteBaseOpts, [
            'with_live' => false,
            'direct_yahoo_budget' => 0,
            'chart_budget' => 0,
          ]))
        );
      } catch (Throwable $e) {}
    }
  }

  $items = [];
  foreach ($rows as $r) {
    $sym = strtoupper((string)($r['symbol'] ?? ''));
    $assetType = vp_normalize_asset_type((string)($r['type'] ?? ''));
    if ($sym === '' || $assetType === '') continue;
    $sourceType = vp_provider_asset_type($assetType);
    $quote = is_array($authoritativeQuotes[$sym] ?? null) ? $authoritativeQuotes[$sym] : null;
    $price = (float)($quote['price'] ?? 0);
    $chg = (float)($quote['change_pct'] ?? 0);
    $upd = (int)($quote['updated_at'] ?? 0);
    $src = (string)($quote['source'] ?? 'unavailable');
    $isStale = !empty($quote['is_stale']);
    $timingClass = (string)($quote['timing_class'] ?? ($isStale ? 'stale' : ($price > 0 ? 'live' : 'unavailable')));
    if ($price > 0 && vp_market_quote_source_blocked($sym, $assetType, $src)) {
      $price = 0.0;
      $chg = 0.0;
      $upd = 0;
      $src = 'unavailable';
      $isStale = false;
      $timingClass = 'unavailable';
    }
    if ($price <= 0 && $withQuotes && $supportedOnly && in_array($scope, ['home', 'trade'], true)) {
      $reference = vp_reference_quote_from_market_row($r, $assetType);
      if (is_array($reference)) {
        $price = (float)$reference['price'];
        $chg = (float)$reference['change_pct'];
        $upd = (int)$reference['updated_at'];
        $src = (string)$reference['source'];
        $isStale = !empty($reference['is_stale']);
        $timingClass = (string)$reference['timing_class'];
      }
    }

    $metaRow = market_meta($r['meta'] ?? null);
    $metaVolume = (float)($metaRow['quote_volume'] ?? $metaRow['quoteVolume'] ?? $metaRow['volume'] ?? $metaRow['turnover'] ?? $metaRow['qv'] ?? 0);
    $metaCap = (float)($metaRow['market_cap'] ?? $metaRow['marketCap'] ?? $metaRow['cap'] ?? 0);
    $metaRank = (int)($metaRow['market_rank'] ?? $metaRow['rank'] ?? $metaRow['cmc_rank'] ?? $metaRow['marketCapRank'] ?? 0);
    $iconUrl = '';
    foreach (['icon_url','image_url','logo_url','icon','image','logo'] as $iconKey) {
      if (!empty($metaRow[$iconKey])) {
        $iconUrl = trim((string)$metaRow[$iconKey]);
        break;
      }
    }

    $items[] = [
      'symbol' => $sym,
      'name' => (string)($r['name'] ?? $sym),
      'type' => $assetType,
      'tv_symbol' => normalize_tv_symbol($sym, $sourceType, (string)($r['tv_symbol'] ?? '')),
      'price' => $price,
      'change_pct' => $chg,
      'updated_at' => $upd,
      'source' => $src,
      'is_stale' => $isStale,
      'timing_class' => $timingClass,
      'signal_count' => (int)($sigMap[$sym] ?? 0),
      'sort_order' => (int)($r['sort_order'] ?? 0),
      'market_rank' => $metaRank,
      'volume' => $metaVolume,
      'market_cap' => $metaCap,
      'icon_url' => $iconUrl !== '' ? $iconUrl : null,
    ];
  }

  if ($allowRescue && $supportedOnly && $withQuotes && in_array($scope, ['home', 'trade'], true)) {
    $items = vp_rescue_supported_market_quotes($items, $scope);
  }

  $items = vp_filter_priced_supported_items($items, $scope, $withQuotes, $supportedOnly);

  return $items;
}

function vp_fallback_futures_markets(): array {
  return [];
}

function vp_build_fallback_market_row(array $def, int $idBase = 900000): array {
  static $seq = 0;
  $seq++;
  return [
    'id' => $idBase + $seq,
    'symbol' => strtoupper((string)($def['symbol'] ?? '')),
    'name' => (string)($def['name'] ?? ($def['symbol'] ?? 'Future')),
    'type' => 'futures',
    'status' => 'active',
    'sort_order' => (int)($def['sort_order'] ?? ($seq * 2)),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    'seed_price' => (float)($def['seed_price'] ?? 100.0),
    'meta' => json_encode(array_filter([
      'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    ]), JSON_UNESCAPED_SLASHES),
    'q_price' => null,
    'q_change' => 0,
    'q_updated' => 0,
  ];
}



function vp_fallback_commodities_markets(): array {
  return [
    ['symbol'=>'XAUUSD',   'name'=>'Gold Spot',          'tv_symbol'=>'OANDA:XAUUSD',      'yahoo_ticker'=>'GC=F',  'sort_order'=>10, 'seed_price'=>4330.0],
    ['symbol'=>'XAGUSD',   'name'=>'Silver Spot',        'tv_symbol'=>'OANDA:XAGUSD',      'yahoo_ticker'=>'SI=F',  'sort_order'=>12, 'seed_price'=>27.0],
    ['symbol'=>'USOIL',    'name'=>'WTI Crude Oil',      'tv_symbol'=>'TVC:USOIL',         'yahoo_ticker'=>'CL=F',  'sort_order'=>14, 'seed_price'=>62.0],
    ['symbol'=>'UKOIL',    'name'=>'Brent Crude Oil',    'tv_symbol'=>'TVC:UKOIL',         'yahoo_ticker'=>'BZ=F',  'sort_order'=>16, 'seed_price'=>82.0],
    ['symbol'=>'NGAS',     'name'=>'Natural Gas',        'tv_symbol'=>'FX:NGAS',           'yahoo_ticker'=>'NG=F',  'sort_order'=>18, 'seed_price'=>2.1],
    ['symbol'=>'PLAT',     'name'=>'Platinum',           'tv_symbol'=>'OANDA:XPTUSD',      'yahoo_ticker'=>'PL=F',  'sort_order'=>22, 'seed_price'=>970.0],
    ['symbol'=>'PALL',     'name'=>'Palladium',          'tv_symbol'=>'OANDA:XPDUSD',      'yahoo_ticker'=>'PA=F',  'sort_order'=>24, 'seed_price'=>1030.0],
    ['symbol'=>'CORN',     'name'=>'Corn',               'tv_symbol'=>'OANDA:CORNUSD',     'yahoo_ticker'=>'ZC=F',  'sort_order'=>26, 'seed_price'=>450.0],
    ['symbol'=>'WHEAT',    'name'=>'Wheat',              'tv_symbol'=>'CAPITALCOM:WHEAT',  'yahoo_ticker'=>'ZW=F',  'sort_order'=>28, 'seed_price'=>560.0],
    ['symbol'=>'SOY',      'name'=>'Soybeans',           'tv_symbol'=>'CBOT:ZS1!',         'yahoo_ticker'=>'ZS=F',  'sort_order'=>30, 'seed_price'=>1010.0],
    ['symbol'=>'SUGAR',    'name'=>'Sugar',              'tv_symbol'=>'ICEUS:SB1!',        'yahoo_ticker'=>'SB=F',  'sort_order'=>32, 'seed_price'=>19.0],
    ['symbol'=>'COFFEE',   'name'=>'Coffee',             'tv_symbol'=>'ICEUS:KC1!',        'yahoo_ticker'=>'KC=F',  'sort_order'=>34, 'seed_price'=>190.0],
    ['symbol'=>'COCOA',    'name'=>'Cocoa',              'tv_symbol'=>'ICEUS:CC1!',        'yahoo_ticker'=>'CC=F',  'sort_order'=>36, 'seed_price'=>8200.0],
    ['symbol'=>'COTTON',   'name'=>'Cotton',             'tv_symbol'=>'ICEUS:CT1!',        'yahoo_ticker'=>'CT=F',  'sort_order'=>38, 'seed_price'=>67.0],
    ['symbol'=>'GLD',      'name'=>'Gold ETF',           'tv_symbol'=>'AMEX:GLD',          'yahoo_ticker'=>'GLD',   'sort_order'=>40, 'seed_price'=>215.0],
    ['symbol'=>'SLV',      'name'=>'Silver ETF',         'tv_symbol'=>'AMEX:SLV',          'yahoo_ticker'=>'SLV',   'sort_order'=>42, 'seed_price'=>24.0],
  ];
}

function vp_build_fallback_commodity_row(array $def, int $idBase = 920000): array {
  static $seq = 0;
  $seq++;
  return [
    'id' => $idBase + $seq,
    'symbol' => strtoupper((string)($def['symbol'] ?? '')),
    'name' => (string)($def['name'] ?? ($def['symbol'] ?? 'Commodity')),
    'type' => 'commodities',
    'status' => 'active',
    'sort_order' => (int)($def['sort_order'] ?? ($seq * 2)),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    'seed_price' => (float)($def['seed_price'] ?? 50.0),
    'meta' => json_encode(array_filter([
      'yahoo_ticker' => (string)($def['yahoo_ticker'] ?? ''),
      'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    ]), JSON_UNESCAPED_SLASHES),
    'q_price' => null,
    'q_change' => 0,
    'q_updated' => 0,
  ];
}

function vp_fallback_arab_markets(): array {
  return [
    ['symbol'=>'2222', 'name'=>'Saudi Aramco',          'tv_symbol'=>'TADAWUL:2222', 'yahoo_ticker'=>'2222.SR', 'sort_order'=>10, 'seed_price'=>30.0],
    ['symbol'=>'1120', 'name'=>'Al Rajhi Bank',         'tv_symbol'=>'TADAWUL:1120', 'yahoo_ticker'=>'1120.SR', 'sort_order'=>12, 'seed_price'=>95.0],
    ['symbol'=>'2010', 'name'=>'SABIC',                 'tv_symbol'=>'TADAWUL:2010', 'yahoo_ticker'=>'2010.SR', 'sort_order'=>14, 'seed_price'=>75.0],
    ['symbol'=>'7010', 'name'=>'stc',                   'tv_symbol'=>'TADAWUL:7010', 'yahoo_ticker'=>'7010.SR', 'sort_order'=>16, 'seed_price'=>40.0],
    ['symbol'=>'1211', 'name'=>'Maaden',                'tv_symbol'=>'TADAWUL:1211', 'yahoo_ticker'=>'1211.SR', 'sort_order'=>18, 'seed_price'=>50.0],
    ['symbol'=>'1150', 'name'=>'Alinma Bank',           'tv_symbol'=>'TADAWUL:1150', 'yahoo_ticker'=>'1150.SR', 'sort_order'=>20, 'seed_price'=>34.0],
    ['symbol'=>'1180', 'name'=>'Saudi National Bank',   'tv_symbol'=>'TADAWUL:1180', 'yahoo_ticker'=>'1180.SR', 'sort_order'=>22, 'seed_price'=>36.0],
    ['symbol'=>'2280', 'name'=>'Almarai',               'tv_symbol'=>'TADAWUL:2280', 'yahoo_ticker'=>'2280.SR', 'sort_order'=>24, 'seed_price'=>58.0],
    ['symbol'=>'4002', 'name'=>'Mouwasat Medical',      'tv_symbol'=>'TADAWUL:4002', 'yahoo_ticker'=>'4002.SR', 'sort_order'=>26, 'seed_price'=>82.0],
    ['symbol'=>'4300', 'name'=>'Dar Al Arkan',          'tv_symbol'=>'TADAWUL:4300', 'yahoo_ticker'=>'4300.SR', 'sort_order'=>28, 'seed_price'=>15.0],
  ];
}

function vp_build_fallback_arab_row(array $def, int $idBase = 940000): array {
  static $seq = 0;
  $seq++;
  return [
    'id' => $idBase + $seq,
    'symbol' => strtoupper((string)($def['symbol'] ?? '')),
    'name' => (string)($def['name'] ?? ($def['symbol'] ?? 'Arab Market')),
    'type' => 'arab',
    'status' => 'active',
    'sort_order' => (int)($def['sort_order'] ?? ($seq * 2)),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    'seed_price' => (float)($def['seed_price'] ?? 10.0),
    'meta' => json_encode(array_filter([
      'exchange' => 'tadawul',
      'yahoo_ticker' => (string)($def['yahoo_ticker'] ?? ''),
      'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    ]), JSON_UNESCAPED_SLASHES),
    'q_price' => null,
    'q_change' => 0,
    'q_updated' => 0,
  ];
}



$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
$cacheKey = 'markets_v21_' . preg_replace('/[^a-z0-9_\-]/i', '_', $typeAlias) . '_' . preg_replace('/[^a-z0-9_\-]/i', '_', $scope ?: 'default') . '_' . ($supportedOnly ? 'supported' : 'all') . '_' . ($grouped ? 'g' : 'f') . '_' . ($withQuotes ? 'q' : 'n') . '_' . ($lite ? 'l' : 'n') . '_' . ($forceLive ? 'live' : 'cache') . '_' . ($allowListRescue ? 'rescue' : 'cacheonly') . '.json';
$cacheFile = $cacheDir . '/' . $cacheKey;
$cacheTtl = $withQuotes ? (int)env('MARKETS_CACHE_TTL_QUOTES', '18') : (int)env('MARKETS_CACHE_TTL', '60');
$cacheTtl = max(0, min(300, $cacheTtl));
if ($withQuotes && in_array($scope, ['home', 'trade'], true)) {
  $interactiveTtl = (int)env('MARKETS_CACHE_TTL_INTERACTIVE', '12');
  $cacheTtl = max(3, min(60, $interactiveTtl));
  if ($scope === 'trade' && in_array($typeAlias, ['arab','commodities'], true)) $cacheTtl = min($cacheTtl, 3);
} elseif ($withQuotes && $typeAlias === 'crypto') {
  $cacheTtl = max(6, min($cacheTtl, 15));
} elseif ($withQuotes) {
  $cacheTtl = max(10, min($cacheTtl, 30));
}
if ($forceLive) $cacheTtl = 0;

if ($cacheTtl > 0 && is_file($cacheFile)) {
  $age = time() - (int)@filemtime($cacheFile);
  if ($age >= 0 && $age < $cacheTtl) {
    header('Content-Type: application/json; charset=utf-8');
    echo (string)@file_get_contents($cacheFile);
    exit;
  }
}

$fastSupported = $supportedOnly
  && in_array($scope, ['home', 'trade'], true)
  && ((int)env('MARKETS_SUPPORTED_FAST_PATH', '1') === 1);
if ($fastSupported) {
  $rows = [];
  foreach (vp_supported_defs_for($typeAlias, $scope) as $def) {
    $rows[] = vp_build_supported_market_row($def, 970000);
  }

  $fastLiteLimit = $requestLimit > 0 ? $requestLimit : ($scope === 'home' ? 16 : 18);
  if ($lite && !$grouped && !$withQuotes) {
    $limit = $requestLimit > 0 ? $requestLimit : ($scope === 'home' ? 16 : 18);
    if (count($rows) > $limit) $rows = array_slice($rows, 0, $limit);
  }

  // Supported first-screen lists are deliberately DB-free/cache-free here:
  // the UI hydrates missing rows through quotes.php batch requests, while
  // this endpoint always returns a stable curated list immediately.
  $items = vp_market_items_from_rows($rows, $typeAlias, $scope, false, true, [], false);
  if ($withQuotes) $items = vp_overlay_cached_quotes_fast($items);
  if ($withQuotes && $allowListRescue) {
    $items = vp_overlay_supported_live_quotes($items, $typeAlias, $scope);
  }
  if ($withQuotes && $allowListRescue) {
    $items = vp_rescue_supported_market_quotes($items, $scope);
  }
  $items = vp_apply_reference_quotes_to_items($items, $rows, $scope, $withQuotes, true);
  $items = vp_filter_priced_supported_items($items, $scope, $withQuotes, true);
  if ($lite && !$grouped && count($items) > $fastLiteLimit) {
    $items = array_slice($items, 0, $fastLiteLimit);
  }

  if ($grouped) {
    $groups = ['crypto' => [], 'forex' => [], 'stocks' => [], 'commodities' => [], 'futures' => [], 'arab' => []];
    foreach ($items as $it) {
      if (!isset($groups[$it['type']])) $groups[$it['type']] = [];
      $groups[$it['type']][] = $it;
    }
    $out = ['ok' => true, 'groups' => $groups, 'items' => $items, 'fast_path' => true];
  } else {
    $out = ['ok' => true, 'items' => $items, 'fast_path' => true];
  }

  @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
  json_cacheable_response($out, 5);
}

try {
  $pdo = db();
  $quoteFlags = function_exists('quote_cols_flags') ? quote_cols_flags() : [];
  $supportedDefsForQuery = $supportedOnly ? vp_supported_defs_for($typeAlias, $scope) : [];
  $supportedSymbolsForQuery = array_values(array_unique(array_filter(array_map(
    static fn($d) => strtoupper(trim((string)($d['symbol'] ?? ''))),
    $supportedDefsForQuery
  ))));
  $quoteMarketJoin = !empty($quoteFlags['market']) ? " AND (q.market IS NULL OR q.market='' OR q.market='spot')" : '';

  if ($supportedOnly) {
    $sql = "SELECT
              m.id, m.symbol, m.name, m.type, m.status, m.sort_order,
              m.tv_symbol, m.seed_price, m.meta,
              NULL AS q_price, 0 AS q_change, 0 AS q_updated, NULL AS q_source
            FROM markets m
            WHERE m.status='active'";
  } else {
    $sql = "SELECT
              m.id, m.symbol, m.name, m.type, m.status, m.sort_order,
              m.tv_symbol, m.seed_price, m.meta,
              q.price AS q_price, q.change_pct AS q_change, q.updated_at AS q_updated,
              q.source AS q_source
            FROM markets m
            LEFT JOIN market_quotes q ON q.symbol = m.symbol AND q.type = (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END){$quoteMarketJoin} AND q.updated_at > 0
            WHERE m.status='active'";
  }
  $args = [];
  if ($supportedOnly && $supportedSymbolsForQuery) {
    $sql .= ' AND m.symbol IN (' . implode(',', array_fill(0, count($supportedSymbolsForQuery), '?')) . ')';
    $args = array_merge($args, $supportedSymbolsForQuery);
  }
  if ($typeAlias !== '' && $typeAlias !== 'all') {
    if ($typeAlias === 'commodities') {
      $sql .= " AND m.type IN ('commodities','metals')";
    } else {
      $sql .= " AND m.type = ?";
      $args[] = $typeAlias;
    }
  }
  if (db_driver() === 'mysql') {
    $sql .= " ORDER BY FIELD(m.type,'crypto','forex','stocks','commodities','futures','arab'), m.sort_order, m.id";
  } else {
    $sql .= " ORDER BY CASE m.type WHEN 'crypto' THEN 0 WHEN 'forex' THEN 1 WHEN 'stocks' THEN 2 WHEN 'commodities' THEN 3 WHEN 'futures' THEN 4 WHEN 'arab' THEN 5 ELSE 9 END, m.sort_order, m.id";
  }

  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

  if ($typeAlias === 'futures' && !$rows) {
    foreach (vp_fallback_futures_markets() as $def) {
      $rows[] = vp_build_fallback_market_row($def);
    }
  }
  if ($typeAlias === 'all') {
    $hasFutures = false;
    $hasCommodities = false;
    $hasArab = false;
    foreach ($rows as $rowCheck) {
      $rowType = vp_normalize_asset_type((string)($rowCheck['type'] ?? ''));
      if ($rowType === 'futures') $hasFutures = true;
      if ($rowType === 'commodities') $hasCommodities = true;
      if ($rowType === 'arab') $hasArab = true;
      if ($hasFutures && $hasCommodities && $hasArab) break;
    }
    if (!$hasFutures) {
      foreach (vp_fallback_futures_markets() as $def) {
        $rows[] = vp_build_fallback_market_row($def, 910000);
      }
    }
    if (!$hasCommodities) {
      foreach (vp_fallback_commodities_markets() as $def) {
        $rows[] = vp_build_fallback_commodity_row($def, 930000);
      }
    }
    if (!$hasArab) {
      foreach (vp_fallback_arab_markets() as $def) {
        $rows[] = vp_build_fallback_arab_row($def, 950000);
      }
    }
  }
  if ($typeAlias === 'commodities' && !$rows) {
    foreach (vp_fallback_commodities_markets() as $def) {
      $rows[] = vp_build_fallback_commodity_row($def);
    }
  }

  if ($typeAlias === 'arab' && !$rows) {
    $sigStmtArab = $pdo->prepare("SELECT market_symbol, COALESCE(MAX(entry_price),0) AS seed_price, COALESCE(MAX(bot_name_en), MAX(market_symbol)) AS nm
                                  FROM trading_signals
                                  WHERE status='active' AND market_type='arab'
                                    AND (valid_until IS NULL OR valid_until=0 OR valid_until>=?)
                                  GROUP BY market_symbol
                                  ORDER BY market_symbol");
    $sigStmtArab->execute([time()]);
    foreach (($sigStmtArab->fetchAll(PDO::FETCH_ASSOC) ?: []) as $ix => $ar) {
      $rows[] = [
        'id' => 100000 + $ix,
        'symbol' => strtoupper((string)($ar['market_symbol'] ?? '')),
        'name' => (string)($ar['nm'] ?? ($ar['market_symbol'] ?? 'Arab Market')),
        'type' => 'arab',
        'status' => 'active',
        'sort_order' => $ix + 1,
        'tv_symbol' => '',
        'seed_price' => (float)($ar['seed_price'] ?? 0),
        'meta' => json_encode(['source' => 'signal_seed', 'exchange' => 'tadawul'], JSON_UNESCAPED_SLASHES),
        'q_price' => null,
        'q_change' => 0,
        'q_updated' => 0,
      ];
    }
    if (!$rows) {
      foreach (vp_fallback_arab_markets() as $def) {
        $rows[] = vp_build_fallback_arab_row($def);
      }
    }
  }

  if ($supportedOnly) {
    $rows = vp_curated_supported_rows($rows, $typeAlias, $scope);
  }

  if ($lite && !$grouped) {
    $limit = $scope === 'home' ? 24 : 60;
    if ($typeAlias !== 'all' && $typeAlias !== 'favorites' && count($rows) > $limit) {
      $rows = array_slice($rows, 0, $limit);
    } elseif ($scope === 'home' && count($rows) > $limit) {
      $rows = array_slice($rows, 0, $limit);
    }
  }

  $sigMap = [];
  $sigSql = "SELECT market_symbol, COUNT(*) c
             FROM trading_signals
             WHERE status='active'
               AND (valid_until IS NULL OR valid_until=0 OR valid_until>=?)";
  $sigArgs = [$now = time()];
  if ($typeAlias !== '' && $typeAlias !== 'all') {
    if ($typeAlias === 'commodities') {
      $sigSql .= " AND market_type IN ('commodities','metals')";
    } else {
      $sigSql .= " AND market_type=?";
      $sigArgs[] = $typeAlias;
    }
  }
  $sigSql .= " GROUP BY market_symbol";
  $sigStmt = $pdo->prepare($sigSql);
  $sigStmt->execute($sigArgs);
  $sigRows = $sigStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  foreach ($sigRows as $r) $sigMap[strtoupper((string)$r['market_symbol'])] = (int)$r['c'];

  $now = time();

  $quoteBaseOpts = [
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => true,
    'direct_budget' => $typeAlias === 'crypto' ? 24 : (in_array($typeAlias, ['arab','futures'], true) ? 18 : 8),
    'direct_yahoo_budget' => 0,
    'chart_budget' => 0,
    'only_twelvedata_for_noncrypto' => $typeAlias !== 'crypto',
  ];

  $cryptoRows = [];
  $otherRows = [];
  foreach ($rows as $quoteRow) {
    if (vp_normalize_asset_type((string)($quoteRow['type'] ?? '')) === 'crypto') $cryptoRows[] = $quoteRow;
    else $otherRows[] = $quoteRow;
  }

  $authoritativeQuotes = [];
  if ($otherRows) {
    // Non-crypto lists stay cache-first; live escalation belongs to focused
    // quote endpoints and background warmers, not the list bootstrap path.
    $authoritativeQuotes = array_replace(
      $authoritativeQuotes,
      qa_overlay_market_rows($otherRows, array_merge($quoteBaseOpts, ['with_live' => false]))
    );
  }
  if ($cryptoRows) {
    // Crypto is the only group that may use live escalation here, and only
    // when the caller explicitly asks for a live market bootstrap.
    $authoritativeQuotes = array_replace(
      $authoritativeQuotes,
      qa_overlay_market_rows($cryptoRows, array_merge($quoteBaseOpts, [
        'with_live' => $forceLive && !$lite,
        'direct_budget' => 24,
        'direct_yahoo_budget' => 0,
        'chart_budget' => 0,
      ]))
    );
  }

  $items = [];

  foreach ($rows as $r) {
    $sym = strtoupper((string)($r['symbol'] ?? ''));
    $assetType = vp_normalize_asset_type((string)($r['type'] ?? ''));
    $sourceType = vp_provider_asset_type($assetType);
    $quote = is_array($authoritativeQuotes[$sym] ?? null) ? $authoritativeQuotes[$sym] : null;
    $price = (float)($quote['price'] ?? 0);
    $chg = (float)($quote['change_pct'] ?? 0);
    $upd = (int)($quote['updated_at'] ?? 0);
    $src = (string)($quote['source'] ?? 'unavailable');
    $isStale = !empty($quote['is_stale']);
    $timingClass = (string)($quote['timing_class'] ?? ($isStale ? 'stale' : 'live'));
    if ($price > 0 && vp_market_quote_source_blocked($sym, $assetType, $src)) {
      $price = 0.0;
      $chg = 0.0;
      $upd = 0;
      $src = 'unavailable';
      $isStale = false;
      $timingClass = 'unavailable';
    }
    if ($price <= 0 && $withQuotes && $supportedOnly && in_array($scope, ['home', 'trade'], true)) {
      $reference = vp_reference_quote_from_market_row($r, $assetType);
      if (is_array($reference)) {
        $price = (float)$reference['price'];
        $chg = (float)$reference['change_pct'];
        $upd = (int)$reference['updated_at'];
        $src = (string)$reference['source'];
        $isStale = !empty($reference['is_stale']);
        $timingClass = (string)$reference['timing_class'];
      }
    }

    $metaRow = market_meta($r['meta'] ?? null);
    $metaVolume = (float)($metaRow['quote_volume'] ?? $metaRow['quoteVolume'] ?? $metaRow['volume'] ?? $metaRow['turnover'] ?? $metaRow['qv'] ?? 0);
    $metaCap = (float)($metaRow['market_cap'] ?? $metaRow['marketCap'] ?? $metaRow['cap'] ?? 0);
    $metaRank = (int)($metaRow['market_rank'] ?? $metaRow['rank'] ?? $metaRow['cmc_rank'] ?? $metaRow['marketCapRank'] ?? 0);
    $iconUrl = '';
    foreach (['icon_url','image_url','logo_url','icon','image','logo'] as $iconKey) {
      if (!empty($metaRow[$iconKey])) {
        $iconUrl = trim((string)$metaRow[$iconKey]);
        break;
      }
    }

    $items[] = [
      'symbol' => $sym,
      'name' => (string)($r['name'] ?? $sym),
      'type' => $assetType,
      'tv_symbol' => normalize_tv_symbol((string)($r['symbol'] ?? ''), $sourceType, (string)($r['tv_symbol'] ?? '')),
      'price' => $price,
      'change_pct' => $chg,
      'updated_at' => $upd,
      'source' => $src,
      'is_stale' => $isStale,
      'timing_class' => $timingClass,
      'signal_count' => (int)($sigMap[$sym] ?? 0),
      'sort_order' => (int)($r['sort_order'] ?? 0),
      'market_rank' => $metaRank,
      'volume' => $metaVolume,
      'market_cap' => $metaCap,
      'icon_url' => $iconUrl !== '' ? $iconUrl : null,
    ];
  }

  if ($allowListRescue && $supportedOnly && $withQuotes && in_array($scope, ['home', 'trade'], true)) {
    $items = vp_rescue_supported_market_quotes($items, $scope);
  }

  $items = vp_filter_priced_supported_items($items, $scope, $withQuotes, $supportedOnly);

  if ($grouped) {
    $groups = ['crypto' => [], 'forex' => [], 'stocks' => [], 'commodities' => [], 'futures' => [], 'arab' => []];
    foreach ($items as $it) {
      if (!isset($groups[$it['type']])) $groups[$it['type']] = [];
      $groups[$it['type']][] = $it;
    }
    $out = ['ok' => true, 'groups' => $groups, 'items' => $items];
  } else {
    $out = ['ok' => true, 'items' => $items];
  }

  @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
  json_cacheable_response($out, 5);
} catch (Throwable $e) {
  $fallbackScope = $scope ?: 'home';
  $fallbackDefs = vp_supported_defs_for($typeAlias, $fallbackScope);
  if (!$fallbackDefs) $fallbackDefs = vp_supported_defs_for($typeAlias, '');
  if (!$fallbackDefs) $fallbackDefs = vp_supported_defs_for('all', 'home');

  $rows = [];
  foreach ($fallbackDefs as $def) {
    $rows[] = vp_build_supported_market_row($def, 980000);
  }

  if ($lite && !$grouped) {
    $limit = $requestLimit > 0 ? $requestLimit : ($fallbackScope === 'home' ? 16 : 18);
    if (count($rows) > $limit) $rows = array_slice($rows, 0, $limit);
  }

  $items = vp_market_items_from_rows($rows, $typeAlias, $fallbackScope, false, true, [], false);
  if ($withQuotes && $allowListRescue && in_array($fallbackScope, ['home', 'trade'], true)) {
    $items = vp_rescue_supported_market_quotes($items, $fallbackScope);
  }
  $items = vp_filter_priced_supported_items($items, $fallbackScope, $withQuotes, true);
  if ($grouped) {
    $groups = ['crypto' => [], 'forex' => [], 'stocks' => [], 'commodities' => [], 'futures' => [], 'arab' => []];
    foreach ($items as $it) {
      if (!isset($groups[$it['type']])) $groups[$it['type']] = [];
      $groups[$it['type']][] = $it;
    }
    $out = ['ok' => true, 'groups' => $groups, 'items' => $items, 'degraded' => true];
  } else {
    $out = ['ok' => true, 'items' => $items, 'degraded' => true];
  }

  @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
  json_cacheable_response($out, 5);
}
