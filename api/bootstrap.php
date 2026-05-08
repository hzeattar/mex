<?php
declare(strict_types=1);

require_once __DIR__ . '/auth/_common.php';
require_once __DIR__ . '/lib/feature.php';
require_once __DIR__ . '/lib/ledger.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/settings.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/levels.php';

require_method('GET');

$pdo = auth_bootstrap_schema();
$uid = require_auth();
$row = auth_find_user($pdo, $uid);
if (!$row) {
  clear_session_user_id();
  json_response(['ok' => false, 'error' => 'Unauthorized'], 401);
}

auth_ensure_platform_user($uid, [
  'email' => (string)($row['email'] ?? ''),
  'telegram_id' => (string)($row['tg_id'] ?? ''),
  'username' => (string)($row['username'] ?? ''),
]);
$row = auth_find_user($pdo, $uid) ?: $row;

function vp_boot_setting(string $key, string $default = ''): string {
  try {
    $value = setting_get($key, $default);
    return is_string($value) && $value !== '' ? $value : $default;
  } catch (Throwable $e) {
    return $default;
  }
}

function vp_boot_wallet(int $uid): array {
  $realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
  $demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
  ensure_wallet($uid, $realCur);
  ensure_wallet($uid, $demoCur);

  $realBal = wallet_balance($uid, $realCur);
  $realAvail = wallet_available($uid, $realCur);
  $demoBal = wallet_balance($uid, $demoCur);
  $demoAvail = wallet_available($uid, $demoCur);

  return [
    'real' => [
      'currency' => $realCur,
      'balance' => (float)$realBal,
      'available' => (float)($realAvail['available'] ?? $realBal),
      'holds' => (float)($realAvail['holds'] ?? 0),
    ],
    'demo' => [
      'currency' => $demoCur,
      'balance' => (float)$demoBal,
      'available' => (float)($demoAvail['available'] ?? $demoBal),
      'holds' => (float)($demoAvail['holds'] ?? 0),
    ],
  ];
}

function vp_boot_kyc(PDO $pdo, int $uid): ?array {
  try {
    $stmt = $pdo->prepare('SELECT id,status,full_name,country,doc_type,doc_number,admin_note,created_at,updated_at FROM kyc_requests WHERE user_id=? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  } catch (Throwable $e) {
    return null;
  }
}

function vp_boot_level(PDO $pdo, int $uid): array {
  try {
    return vp_resolve_user_level($pdo, $uid, 'en');
  } catch (Throwable $e) {
    return [
      'current' => null,
      'next' => null,
      'levels' => [],
      'confirmed_deposit_total' => 0,
    ];
  }
}

function vp_boot_market_groups(PDO $pdo): array {
  $groups = ['crypto' => [], 'forex' => [], 'stocks' => [], 'commodities' => [], 'futures' => [], 'arab' => []];
  $limits = ['crypto' => 12, 'forex' => 8, 'stocks' => 8, 'commodities' => 8, 'futures' => 8, 'arab' => 8];

  try {
    $flags = function_exists('quote_cols_flags') ? quote_cols_flags() : [];
    $quoteMarketJoin = !empty($flags['market']) ? " AND q.market='spot'" : '';
    $selectSource = !empty($flags['source']) ? 'q.source AS q_source,' : "'' AS q_source,";
    $sql = "SELECT
              m.symbol, m.name, m.type, m.sort_order, m.tv_symbol, m.seed_price, m.meta,
              q.price AS q_price, q.change_pct AS q_change, q.updated_at AS q_updated,
              {$selectSource} q.type AS q_type
            FROM markets m
            LEFT JOIN market_quotes q ON q.symbol=m.symbol AND q.type=(CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END){$quoteMarketJoin}
            WHERE m.status='active'";
    if (db_driver() === 'mysql') {
      $sql .= " ORDER BY FIELD(m.type,'crypto','forex','stocks','commodities','metals','futures','arab'), m.sort_order, m.id";
    } else {
      $sql .= " ORDER BY CASE m.type WHEN 'crypto' THEN 0 WHEN 'forex' THEN 1 WHEN 'stocks' THEN 2 WHEN 'commodities' THEN 3 WHEN 'metals' THEN 3 WHEN 'futures' THEN 4 WHEN 'arab' THEN 5 ELSE 9 END, m.sort_order, m.id";
    }
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
  } catch (Throwable $e) {
    $rows = [];
  }

  foreach ($rows as $row) {
    $type = vp_normalize_asset_type((string)($row['type'] ?? 'crypto'));
    if ($type === 'metals') $type = 'commodities';
    if (!isset($groups[$type]) || count($groups[$type]) >= ($limits[$type] ?? 8)) continue;
    $meta = market_meta($row['meta'] ?? null);
    $iconUrl = '';
    foreach (['icon_url','image_url','logo_url','icon','image','logo'] as $iconKey) {
      if (!empty($meta[$iconKey])) {
        $iconUrl = trim((string)$meta[$iconKey]);
        break;
      }
    }
    $groups[$type][] = [
      'symbol' => strtoupper((string)($row['symbol'] ?? '')),
      'name' => (string)($row['name'] ?? ($row['symbol'] ?? 'Market')),
      'type' => $type,
      'market' => $type === 'futures' ? 'perp' : 'spot',
      'tv_symbol' => (string)($row['tv_symbol'] ?? ''),
      'price' => (float)($row['q_price'] ?? 0),
      'change_pct' => (float)($row['q_change'] ?? 0),
      'updated_at' => (int)($row['q_updated'] ?? 0),
      'source' => (string)($row['q_source'] ?? 'cache'),
      'icon_url' => $iconUrl !== '' ? $iconUrl : null,
    ];
  }

  $fallback = [
    'crypto' => [
      ['BTCUSDT','Bitcoin'], ['ETHUSDT','Ethereum'], ['BNBUSDT','BNB'], ['SOLUSDT','Solana'], ['XRPUSDT','XRP'], ['DOGEUSDT','Dogecoin'],
    ],
    'forex' => [
      ['EURUSD','Euro / US Dollar'], ['GBPUSD','British Pound / US Dollar'], ['USDJPY','US Dollar / Japanese Yen'], ['AUDUSD','Australian Dollar / US Dollar'],
      ['USDCAD','US Dollar / Canadian Dollar'], ['USDCHF','US Dollar / Swiss Franc'], ['NZDUSD','New Zealand Dollar / US Dollar'], ['EURJPY','Euro / Japanese Yen'],
    ],
    'stocks' => [
      ['AAPL','Apple'], ['MSFT','Microsoft'], ['TSLA','Tesla'], ['NVDA','NVIDIA'],
    ],
    'commodities' => [
      ['XAUUSD','Gold Spot'], ['XAGUSD','Silver Spot'], ['USOIL','WTI Crude Oil'], ['UKOIL','Brent Crude Oil'],
      ['NGAS','Natural Gas'], ['COPPER','Copper'], ['PLAT','Platinum'], ['PALL','Palladium'],
    ],
    'futures' => [
      ['ES_F','E-mini S&P 500 Future'], ['NQ_F','E-mini Nasdaq 100 Future'], ['YM_F','E-mini Dow Future'], ['RTY_F','E-mini Russell 2000 Future'],
      ['CL_F','WTI Crude Future'], ['GC_F','Gold Future'], ['ZN_F','10Y Treasury Note Future'], ['ZB_F','30Y Treasury Bond Future'],
    ],
    'arab' => [
      ['2222','Saudi Aramco'], ['1120','Al Rajhi Bank'], ['2010','SABIC'], ['7010','stc'],
      ['1211','Maaden'], ['1150','Alinma Bank'], ['1180','Saudi National Bank'], ['2280','Almarai'],
    ],
  ];
  foreach ($fallback as $type => $items) {
    if (!empty($groups[$type])) continue;
    foreach ($items as $item) {
      $groups[$type][] = [
        'symbol' => $item[0],
        'name' => $item[1],
        'type' => $type,
        'market' => $type === 'futures' ? 'perp' : 'spot',
        'price' => 0.0,
        'change_pct' => 0.0,
        'updated_at' => 0,
        'source' => 'unavailable',
        'icon_url' => null,
      ];
    }
  }

  return $groups;
}

json_response([
  'ok' => true,
  'user' => auth_user_payload($row),
  'brand' => [
    'name' => vp_boot_setting('site.brand', 'VertexPluse'),
    'tagline' => vp_boot_setting('site.tagline', 'Professional trading & investment platform'),
    'support_email' => vp_boot_setting('site.support_email', 'support@vertexpluse.com'),
    'logo_url' => vp_boot_setting('site.app_logo_url', './assets/img/vertexpluse-logo.svg'),
  ],
  'wallet' => vp_boot_wallet($uid),
  'kyc' => vp_boot_kyc($pdo, $uid),
  'level' => vp_boot_level($pdo, $uid),
  'markets' => vp_boot_market_groups($pdo),
  'feature_flags' => feature_all(),
]);
