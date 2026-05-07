<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/market_resolver.php';

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

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');


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

function vp_fallback_futures_markets(): array {
  return [
    ['symbol'=>'ES_F',  'name'=>'E-mini S&P 500 Future',     'tv_symbol'=>'CME_MINI:ES1!',   'yahoo_ticker'=>'ES=F',  'sort_order'=>10, 'seed_price'=>5200.0],
    ['symbol'=>'NQ_F',  'name'=>'E-mini Nasdaq 100 Future',  'tv_symbol'=>'CME_MINI:NQ1!',   'yahoo_ticker'=>'NQ=F',  'sort_order'=>12, 'seed_price'=>18250.0],
    ['symbol'=>'YM_F',  'name'=>'E-mini Dow Future',         'tv_symbol'=>'CBOT_MINI:YM1!',  'yahoo_ticker'=>'YM=F',  'sort_order'=>14, 'seed_price'=>39280.0],
    ['symbol'=>'RTY_F', 'name'=>'E-mini Russell 2000 Future','tv_symbol'=>'CME_MINI:RTY1!',  'yahoo_ticker'=>'RTY=F', 'sort_order'=>16, 'seed_price'=>2055.0],
    ['symbol'=>'NKD_F', 'name'=>'Nikkei 225 Future',         'tv_symbol'=>'OSE:NK2251!',     'yahoo_ticker'=>'NKD=F', 'sort_order'=>18, 'seed_price'=>38750.0],
    ['symbol'=>'CL_F',  'name'=>'WTI Crude Future',          'tv_symbol'=>'NYMEX:CL1!',      'yahoo_ticker'=>'CL=F',  'sort_order'=>20, 'seed_price'=>81.2],
    ['symbol'=>'BZ_F',  'name'=>'Brent Crude Future',        'tv_symbol'=>'ICEEUR:BRN1!',    'yahoo_ticker'=>'BZ=F',  'sort_order'=>22, 'seed_price'=>84.4],
    ['symbol'=>'GC_F',  'name'=>'Gold Future',               'tv_symbol'=>'COMEX:GC1!',      'yahoo_ticker'=>'GC=F',  'sort_order'=>24, 'seed_price'=>2350.0],
    ['symbol'=>'SI_F',  'name'=>'Silver Future',             'tv_symbol'=>'COMEX:SI1!',      'yahoo_ticker'=>'SI=F',  'sort_order'=>26, 'seed_price'=>27.0],
    ['symbol'=>'NG_F',  'name'=>'Natural Gas Future',        'tv_symbol'=>'NYMEX:NG1!',      'yahoo_ticker'=>'NG=F',  'sort_order'=>28, 'seed_price'=>2.1],
    ['symbol'=>'ZN_F',  'name'=>'10Y Treasury Note Future',  'tv_symbol'=>'CBOT:ZN1!',       'yahoo_ticker'=>'ZN=F',  'sort_order'=>30, 'seed_price'=>110.0],
    ['symbol'=>'ZB_F',  'name'=>'30Y Treasury Bond Future',  'tv_symbol'=>'CBOT:ZB1!',       'yahoo_ticker'=>'ZB=F',  'sort_order'=>32, 'seed_price'=>120.0],
  ];
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
      'yahoo_ticker' => (string)($def['yahoo_ticker'] ?? ''),
      'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    ]), JSON_UNESCAPED_SLASHES),
    'q_price' => null,
    'q_change' => 0,
    'q_updated' => 0,
  ];
}



function vp_fallback_commodities_markets(): array {
  return [
    ['symbol'=>'XAUUSD',   'name'=>'Gold Spot',          'tv_symbol'=>'OANDA:XAUUSD',      'yahoo_ticker'=>'GC=F',  'sort_order'=>10, 'seed_price'=>2350.0],
    ['symbol'=>'XAGUSD',   'name'=>'Silver Spot',        'tv_symbol'=>'OANDA:XAGUSD',      'yahoo_ticker'=>'SI=F',  'sort_order'=>12, 'seed_price'=>27.0],
    ['symbol'=>'USOIL',    'name'=>'WTI Crude Oil',      'tv_symbol'=>'TVC:USOIL',         'yahoo_ticker'=>'CL=F',  'sort_order'=>14, 'seed_price'=>78.0],
    ['symbol'=>'UKOIL',    'name'=>'Brent Crude Oil',    'tv_symbol'=>'TVC:UKOIL',         'yahoo_ticker'=>'BZ=F',  'sort_order'=>16, 'seed_price'=>82.0],
    ['symbol'=>'NGAS',     'name'=>'Natural Gas',        'tv_symbol'=>'FX:NGAS',           'yahoo_ticker'=>'NG=F',  'sort_order'=>18, 'seed_price'=>2.1],
    ['symbol'=>'COPPER',   'name'=>'Copper',             'tv_symbol'=>'CAPITALCOM:COPPER', 'yahoo_ticker'=>'HG=F',  'sort_order'=>20, 'seed_price'=>4.1],
    ['symbol'=>'PLAT',     'name'=>'Platinum',           'tv_symbol'=>'OANDA:XPTUSD',      'yahoo_ticker'=>'PL=F',  'sort_order'=>22, 'seed_price'=>970.0],
    ['symbol'=>'PALL',     'name'=>'Palladium',          'tv_symbol'=>'OANDA:XPDUSD',      'yahoo_ticker'=>'PA=F',  'sort_order'=>24, 'seed_price'=>1030.0],
    ['symbol'=>'CORN',     'name'=>'Corn',               'tv_symbol'=>'OANDA:CORNUSD',     'yahoo_ticker'=>'ZC=F',  'sort_order'=>26, 'seed_price'=>430.0],
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
    ['symbol'=>'4002', 'name'=>'Mouwasat Medical',      'tv_symbol'=>'TADAWUL:4002', 'yahoo_ticker'=>'4002.SR', 'sort_order'=>26, 'seed_price'=>90.0],
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
$cacheKey = 'markets_v3_' . preg_replace('/[^a-z0-9_\-]/i', '_', $typeAlias) . '_' . ($grouped ? 'g' : 'f') . '_' . ($withQuotes ? 'q' : 'n') . '_' . ($lite ? 'l' : 'n') . '_' . ($forceLive ? 'live' : 'cache') . '.json';
$cacheFile = $cacheDir . '/' . $cacheKey;
$cacheTtl = $withQuotes ? (int)env('MARKETS_CACHE_TTL_QUOTES', '2') : (int)env('MARKETS_CACHE_TTL', '10');
$cacheTtl = max(0, min(300, $cacheTtl));
if ($withQuotes && $typeAlias !== 'crypto') $cacheTtl = max($cacheTtl, 3);

if ($cacheTtl > 0 && is_file($cacheFile)) {
  $age = time() - (int)@filemtime($cacheFile);
  if ($age >= 0 && $age < $cacheTtl) {
    header('Content-Type: application/json; charset=utf-8');
    echo (string)@file_get_contents($cacheFile);
    exit;
  }
}

try {
  $pdo = db();
  $quoteFlags = function_exists('quote_cols_flags') ? quote_cols_flags() : [];
  $quoteMarketJoin = !empty($quoteFlags['market']) ? " AND q.market='spot'" : '';

  $sql = "SELECT
            m.id, m.symbol, m.name, m.type, m.status, m.sort_order,
            m.tv_symbol, m.seed_price, m.meta,
            q.price AS q_price, q.change_pct AS q_change, q.updated_at AS q_updated,
            q.source AS q_source
          FROM markets m
          LEFT JOIN market_quotes q ON q.symbol = m.symbol AND q.type = (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END){$quoteMarketJoin} AND q.updated_at > 0
          WHERE m.status='active'";
  $args = [];
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

  if ($lite && !$grouped && $typeAlias !== 'all' && count($rows) > 18) {
    $rows = array_slice($rows, 0, 18);
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

  $authoritativeQuotes = qa_overlay_market_rows($rows, [
    // Market lists are bootstrap/read paths. Live refresh is handled by
    // quotes.php focus/batch/cron so providers cannot block the whole list.
    'with_live' => false,
    'allow_crypto_seed' => false,
    'allow_noncrypto_seed' => false,
    'allow_stale_display' => $typeAlias !== 'crypto',
    'direct_budget' => $typeAlias === 'crypto' ? 24 : (in_array($typeAlias, ['arab','futures'], true) ? 18 : 8),
    'direct_yahoo_budget' => $typeAlias === 'crypto' ? 24 : (in_array($typeAlias, ['arab','futures'], true) ? 18 : 8),
    'chart_budget' => in_array($typeAlias, ['arab','futures'], true) ? 12 : 6,
  ]);

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
  json_response($out);
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
