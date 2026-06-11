<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quotes.php';

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

$subscriptionIds = [];
$copiedPositionToSub = [];
foreach ($rows as $r) {
  $sid = (int)($r['id'] ?? 0);
  if ($sid > 0) $subscriptionIds[] = $sid;
  $pid = (int)($r['copied_position_id'] ?? 0);
  if ($sid > 0 && $pid > 0) $copiedPositionToSub[$pid] = $sid;
}
$subscriptionIds = array_values(array_unique($subscriptionIds));

$cleanSymbol = static function(string $symbol): string {
  if (str_starts_with($symbol, '@R@') || str_starts_with($symbol, '@D@')) return substr($symbol, 3);
  return $symbol;
};
$quoteMark = static function(string $symbol, string $type, string $marketType, float $entry): float {
  $symbol = strtoupper($symbol);
  $type = function_exists('vp_normalize_asset_type') ? vp_normalize_asset_type($type) : strtolower($type);
  $marketType = strtolower($marketType ?: 'spot');
  try {
    $q = quote_get($symbol, $type, $marketType);
    if (is_array($q)) {
      $p = $marketType === 'perp' ? (float)($q['mark_price'] ?? 0) : 0.0;
      if (!($p > 0)) $p = (float)($q['price'] ?? 0);
      if ($p > 0) return $p;
    }
  } catch (Throwable $e) {}
  return $entry > 0 ? $entry : 0.0;
};
$positionPnl = static function(string $side, float $entry, float $mark, float $qty): float {
  $side = strtoupper($side);
  if ($side === 'SELL') return ($entry - $mark) * $qty;
  return ($mark - $entry) * $qty;
};

$openPositionsBySub = [];
$closedPositionsBySub = [];
$positionToSub = $copiedPositionToSub;

if ($subscriptionIds && schema_table_exists($pdo, 'positions', $driver) && schema_column_exists($pdo, 'positions', 'copy_subscription_id', $driver)) {
  try {
    $in = implode(',', array_fill(0, count($subscriptionIds), '?'));
    $ps = $pdo->prepare("SELECT id,copy_subscription_id,symbol,asset_type,market_type,side,qty,entry_price,leverage,margin_initial,opened_at,updated_at,status FROM positions WHERE user_id=? AND status='open' AND copy_subscription_id IN ($in) ORDER BY id DESC");
    $ps->execute(array_merge([$uid], $subscriptionIds));
    foreach (($ps->fetchAll(PDO::FETCH_ASSOC) ?: []) as $p) {
      $sid = (int)($p['copy_subscription_id'] ?? 0);
      if ($sid <= 0) continue;
      $rawSymbol = (string)($p['symbol'] ?? '');
      $symbol = strtoupper($cleanSymbol($rawSymbol));
      $type = $normalizeType((string)($p['asset_type'] ?? ''), $symbol);
      $marketType = strtolower((string)($p['market_type'] ?? 'spot'));
      $entry = (float)($p['entry_price'] ?? 0);
      $qty = (float)($p['qty'] ?? 0);
      $mark = $quoteMark($symbol, $type, $marketType, $entry);
      $pnl = $positionPnl((string)($p['side'] ?? 'BUY'), $entry, $mark, $qty);
      $item = [
        'position_id' => (int)($p['id'] ?? 0),
        'symbol' => $symbol,
        'asset_type' => $type,
        'market_type' => $marketType,
        'side' => strtoupper((string)($p['side'] ?? 'BUY')),
        'qty' => $qty,
        'entry_price' => $entry,
        'mark_price' => $mark,
        'leverage' => max(1, (int)($p['leverage'] ?? 1)),
        'margin_initial' => (float)($p['margin_initial'] ?? 0),
        'unrealized_pnl' => $pnl,
        'status' => (string)($p['status'] ?? 'open'),
        'opened_at' => (int)($p['opened_at'] ?? 0),
      ];
      $openPositionsBySub[$sid][] = $item;
      $positionToSub[(int)$p['id']] = $sid;
    }
  } catch (Throwable $e) {}
}

if ($subscriptionIds && schema_table_exists($pdo, 'orders', $driver)) {
  try {
    $os = $pdo->prepare("SELECT id,position_id,symbol,asset_type,market_type,side,qty,limit_price,fill_price,usd_amount,leverage,fee_paid,pnl_usd,close_reason,closed_at,status,created_at,meta FROM orders WHERE user_id=? AND status='closed' ORDER BY id DESC LIMIT 500");
    $os->execute([$uid]);
    $subSet = array_fill_keys($subscriptionIds, true);
    foreach (($os->fetchAll(PDO::FETCH_ASSOC) ?: []) as $o) {
      $sid = 0;
      $meta = json_decode((string)($o['meta'] ?? ''), true);
      if (is_array($meta)) $sid = (int)($meta['subscription_id'] ?? 0);
      $pid = (int)($o['position_id'] ?? 0);
      if ($sid <= 0 && $pid > 0 && isset($positionToSub[$pid])) $sid = (int)$positionToSub[$pid];
      if ($sid <= 0 || !isset($subSet[$sid])) continue;
      $rawSymbol = (string)($o['symbol'] ?? '');
      $symbol = strtoupper($cleanSymbol($rawSymbol));
      $type = $normalizeType((string)($o['asset_type'] ?? ''), $symbol);
      $exit = (float)($o['limit_price'] ?? 0);
      if (!($exit > 0)) $exit = (float)($o['fill_price'] ?? 0);
      $closedPositionsBySub[$sid][] = [
        'order_id' => (int)($o['id'] ?? 0),
        'position_id' => $pid,
        'symbol' => $symbol,
        'asset_type' => $type,
        'market_type' => strtolower((string)($o['market_type'] ?? 'spot')),
        'side' => strtoupper((string)($o['side'] ?? 'BUY')),
        'qty' => (float)($o['qty'] ?? 0),
        'entry_price' => (float)($o['fill_price'] ?? 0),
        'exit_price' => $exit,
        'leverage' => max(1, (int)($o['leverage'] ?? 1)),
        'pnl_usd' => (float)($o['pnl_usd'] ?? 0),
        'fee_paid' => (float)($o['fee_paid'] ?? 0),
        'close_reason' => (string)($o['close_reason'] ?? ''),
        'created_at' => (int)($o['created_at'] ?? 0),
        'closed_at' => (int)($o['closed_at'] ?? 0),
        'status' => 'closed',
      ];
    }
  } catch (Throwable $e) {}
}

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
  $marketSymbol = strtoupper((string)($r['market_symbol'] ?? ''));
  $botName = trim((string)($r['bot_name_'.$lang] ?? ''));
  if ($botName === '') $botName = trim((string)($r['bot_name_en'] ?? ''));
  if ($botName === '') {
    $assetName = preg_replace('/(USDT|USD|_F)$/', '', $marketSymbol);
    $botName = 'Avalon ' . ($assetName ?: ($marketSymbol ?: 'AI')) . ' AI Bot';
  }
  $botBrief = trim((string)($r['bot_brief_'.$lang] ?? ''));
  if ($botBrief === '') $botBrief = trim((string)($r['bot_brief_en'] ?? ''));
  $sid = (int)($r['id'] ?? 0);
  $openPositions = $openPositionsBySub[$sid] ?? [];
  $closedPositions = $closedPositionsBySub[$sid] ?? [];
  $openCount = count($openPositions);
  $closedCount = count($closedPositions);
  $openPnl = 0.0;
  foreach ($openPositions as $p) $openPnl += (float)($p['unrealized_pnl'] ?? 0);
  $closedPnl = 0.0;
  foreach ($closedPositions as $p) $closedPnl += (float)($p['pnl_usd'] ?? 0);
  $statusLower = strtolower((string)($r['status'] ?? ''));
  $statusGroup = ($openCount > 0 || in_array($statusLower, ['active','armed','copied'], true)) ? 'active' : 'closed';
  if ($openCount === 0 && in_array($statusLower, ['canceled','cancelled','closed','expired'], true)) $statusGroup = 'closed';
  $direction = strtoupper(trim((string)($r['direction'] ?? 'BUY')));
  if (!in_array($direction, ['BUY','SELL','NEUTRAL'], true)) $direction = 'BUY';

  $items[] = [
    'id' => $sid,
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
    'position_status' => $openCount > 0 ? 'open' : (string)($r['position_status'] ?? ''),
    'open_positions' => $openPositions,
    'closed_positions' => $closedPositions,
    'open_count' => $openCount,
    'closed_count' => $closedCount,
    'pnl_total' => $openPnl + $closedPnl,
    'pnl_open' => $openPnl,
    'pnl_closed' => $closedPnl,
    'status_group' => $statusGroup,
    'bot_name' => $botName,
    'bot_brief' => $botBrief,
    'symbol' => (string)($r['market_symbol'] ?? ''),
    'type' => $normalizeType((string)($r['market_type'] ?? ''), (string)($r['market_symbol'] ?? '')),
    'direction' => $direction,
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
