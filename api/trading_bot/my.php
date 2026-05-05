<?php
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';

$uid = require_auth();
$pdo = db();
$driver = db_driver();
$lang = strtolower((string)($_GET['lang'] ?? 'en'));
if (!in_array($lang, ['en','ar','ru','hi'], true)) $lang = 'en';

$normalizeType = static function(string $rawType, string $symbol): string {
  $raw = strtolower(trim($rawType));
  if ($raw === 'fx') $raw = 'forex';
  $sym = strtoupper(trim($symbol));
  if ($sym !== '') {
    if (preg_match('/(_F|1!)$/', $sym)) return 'futures';
    if (preg_match('/^(XAU|XAG|XPT|XPD|USOIL|UKOIL|BRENT|WTI|NGAS|COPPER)/', $sym)) return 'commodities';
    if (preg_match('/(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/', $sym)) return 'crypto';
    if (preg_match('/^[A-Z]{6}$/', $sym) && !preg_match('/(USDT|USDC|BUSD|FDUSD)$/', $sym)) return 'forex';
    if (preg_match('/^\d{4}$/', $sym) || preg_match('/^(TADAWUL|DFM|ADX)/', $sym)) return 'arab';
  }
  if (in_array($raw, ['crypto','forex','stocks','commodities','futures','arab'], true)) return $raw;
  if ($sym !== '' && preg_match('/^[A-Z]{1,5}$/', $sym)) return 'stocks';
  return 'crypto';
};

if (!schema_table_exists($pdo, 'trading_bot_subscriptions', $driver) || !schema_table_exists($pdo, 'trading_signals', $driver)) {
  json_response(['ok'=>true,'items'=>[]]);
}

$tsHas = static function(string $column) use ($pdo, $driver): bool {
  return schema_column_exists($pdo, 'trading_signals', $column, $driver);
};
$tsCol = static function(string $column, string $defaultSql = 'NULL') use ($tsHas): string {
  return $tsHas($column) ? "ts.$column" : "$defaultSql AS $column";
};
$posJoin = schema_table_exists($pdo, 'positions', $driver)
  ? 'LEFT JOIN positions p ON p.id=sbs.copied_position_id'
  : 'LEFT JOIN (SELECT NULL AS id, NULL AS status) p ON 1=0';

$sql = "SELECT sbs.*, 
               {$tsCol('market_symbol', "''")},
               {$tsCol('market_type', "''")},
               {$tsCol('direction', "'BUY'")},
               {$tsCol('timeframe', "''")},
               {$tsCol('entry_price')},
               {$tsCol('stop_loss')},
               {$tsCol('take_profit_1')},
               {$tsCol('take_profit_2')},
               {$tsCol('bot_name_en', "''")},
               {$tsCol('bot_name_ar', "''")},
               {$tsCol('bot_name_ru', "''")},
               {$tsCol('bot_brief_en', "''")},
               {$tsCol('bot_brief_ar', "''")},
               {$tsCol('bot_brief_ru', "''")},
               p.status AS position_status
        FROM trading_bot_subscriptions sbs
        JOIN trading_signals ts ON ts.id=sbs.signal_id
        {$posJoin}
        WHERE sbs.user_id=?
        ORDER BY sbs.id DESC
        LIMIT 100";
$st = $pdo->prepare($sql);
$st->execute([$uid]);
$rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
$items = [];

$liveBy = [];
$seen = [];
$isTrustedCopyQuote = static function(array $q, string $assetType, string $symbol): bool {
  $assetType = strtolower(trim($assetType));
  $source = strtolower(trim((string)($q['source'] ?? $q['provider'] ?? '')));
  $updatedAt = (int)($q['updated_at'] ?? 0);
  if ($updatedAt <= 0 || (time() - $updatedAt) > 15) return false;
  if ($assetType === 'commodities' && preg_match('/^X(?:AU|AG|PT|PD)USD$/', strtoupper($symbol))) {
    return in_array($source, ['massive','provider_live','provider_fallback'], true);
  }
  return (float)($q['price'] ?? 0) > 0;
};
foreach ($rows as $r) {
  $symbol = strtoupper(trim((string)($r['market_symbol'] ?? '')));
  if ($symbol === '' || isset($seen[$symbol])) continue;
  $seen[$symbol] = true;
  $type = $normalizeType((string)($r['market_type'] ?? ''), $symbol);
  try {
    $price = (float)quote_price_fresh($symbol, $type);
    $quote = quote_get($symbol, $type);
    $trustedQuote = (is_array($quote) && $isTrustedCopyQuote($quote, $type, $symbol)) ? $quote : null;
    $resolvedPrice = 0.0;
    $resolvedSource = (string)($trustedQuote['source'] ?? $trustedQuote['provider'] ?? '');
    if ($price > 0) {
      $resolvedPrice = $price;
      if ($resolvedSource === '') {
        $resolvedSource = ($type === 'crypto') ? 'binance' : 'provider_live';
      }
    } elseif ($trustedQuote && (float)($trustedQuote['price'] ?? 0) > 0) {
      $resolvedPrice = (float)$trustedQuote['price'];
    }
    if ($resolvedPrice <= 0 && $type !== 'crypto') {
      try {
        $direct = quote_fetch_external($symbol, $type);
        if ($direct !== null && (float)$direct > 0) {
          $resolvedPrice = (float)$direct;
          if ($resolvedSource === '') $resolvedSource = 'provider_live';
        }
      } catch (Throwable $e) {
        // ignore
      }
    }
    if ($resolvedPrice > 0 || $trustedQuote) {
      $liveBy[$symbol] = [
        'price' => $resolvedPrice,
        'change_pct' => (float)($trustedQuote['change_pct'] ?? 0),
        'source' => $resolvedSource,
        'updated_at' => (int)($trustedQuote['updated_at'] ?? time()),
      ];
    }
  } catch (Throwable $e) {
    // keep history visible even if live lookup fails
  }
}

foreach ($rows as $r) {
  $botName = trim((string)($r['bot_name_'.$lang] ?? ''));
  if ($botName === '') $botName = trim((string)($r['bot_name_en'] ?? ''));
  if ($botName === '') $botName = trim((string)($r['market_symbol'] ?? 'Trading Bot'));
  $botBrief = trim((string)($r['bot_brief_'.$lang] ?? ''));
  if ($botBrief === '') $botBrief = trim((string)($r['bot_brief_en'] ?? ''));
  $items[] = [
    'id' => (int)($r['id'] ?? 0),
    'signal_id' => (int)($r['signal_id'] ?? 0),
    'mode' => (string)($r['mode'] ?? 'real'),
    'currency' => (string)($r['currency'] ?? ''),
    'reserved_amount' => (float)($r['reserved_amount'] ?? 0),
    'lock_until' => !empty($r['lock_until']) ? (int)$r['lock_until'] : null,
    'profit_share_pct' => (float)($r['profit_share_pct'] ?? 0),
    'leverage' => max(1, (int)($r['leverage'] ?? 1)),
    'status' => (string)($r['status'] ?? ''),
    'entry_price_snapshot' => array_key_exists('entry_price_snapshot', $r) && $r['entry_price_snapshot'] !== null ? (float)$r['entry_price_snapshot'] : null,
    'copied_position_id' => !empty($r['copied_position_id']) ? (int)$r['copied_position_id'] : null,
    'position_status' => (string)($r['position_status'] ?? ''),
    'bot_name' => $botName,
    'bot_brief' => $botBrief,
    'symbol' => (string)($r['market_symbol'] ?? ''),
    'type' => $normalizeType((string)($r['market_type'] ?? ''), (string)($r['market_symbol'] ?? '')),
    'direction' => (string)($r['direction'] ?? 'BUY'),
    'timeframe' => (string)($r['timeframe'] ?? ''),
    'entry' => $r['entry_price'] !== null ? (float)$r['entry_price'] : null,
    'sl' => $r['stop_loss'] !== null ? (float)$r['stop_loss'] : null,
    'tp1' => $r['take_profit_1'] !== null ? (float)$r['take_profit_1'] : null,
    'tp2' => $r['take_profit_2'] !== null ? (float)$r['take_profit_2'] : null,
    'created_at' => (int)($r['created_at'] ?? 0),
    'live_price' => (float)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['price'] ?? 0),
    'live_change_pct' => (float)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['change_pct'] ?? 0),
    'live_source' => (string)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['source'] ?? ''),
    'live_updated_at' => (int)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['updated_at'] ?? 0),
  ];
}
json_response(['ok'=>true,'items'=>$items]);
