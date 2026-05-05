<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';

require_auth();
$lang = strtolower((string)($_GET['lang'] ?? 'en'));
if (!in_array($lang, ['en','ar','ru','hi'], true)) $lang = 'en';

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$type = strtolower(trim((string)($_GET['type'] ?? '')));
if ($type === 'fx') $type = 'forex';
$botOnly = (int)($_GET['bot'] ?? 0) === 1;
$homeOnly = (int)($_GET['home'] ?? 0) === 1;

$normalizeType = static function(string $t, string $sym = ''): string {
  $raw = strtolower(trim($t));
  if ($raw === 'fx') $raw = 'forex';
  $sym = strtoupper(trim($sym));
  if ($sym !== '') {
    if (preg_match('/(_F|1!)$/', $sym)) return 'futures';
    if (preg_match('/^(XAU|XAG|XPT|XPD|USOIL|UKOIL|BRENT|WTI|NGAS|COPPER)/', $sym)) return 'commodities';
    if (preg_match('/(USDT|USDC|BUSD|FDUSD|BTC|ETH)$/', $sym)) return 'crypto';
    if (preg_match('/^[A-Z]{6}$/', $sym) && !preg_match('/(USDT|USDC|BUSD|FDUSD)$/', $sym)) return 'forex';
    if (preg_match('/^\d{4}$/', $sym) || preg_match('/^(TADAWUL|DFM|ADX)/', $sym)) return 'arab';
  }
  if (in_array($raw, ['crypto','forex','stocks','commodities','indices','futures','arab'], true)) return $raw;
  if ($sym !== '' && preg_match('/^[A-Z]{1,5}$/', $sym)) return 'stocks';
  return 'crypto';
};
$providerType = static function(string $t): string {
  if ($t === 'arab') return 'stocks';
  if ($t === 'indices') return 'forex';
  return $t;
};

try {
  $pdo = db();
  $driver = db_driver();
  if (!schema_table_exists($pdo, 'trading_signals', $driver)) {
    json_response(['ok'=>true,'items'=>[]]);
  }

  $sigHas = static function(string $column) use ($pdo, $driver): bool {
    return schema_column_exists($pdo, 'trading_signals', $column, $driver);
  };
  $sigCol = static function(string $column, string $defaultSql = 'NULL') use ($sigHas): string {
    return $sigHas($column) ? "s.$column" : "$defaultSql AS $column";
  };

  $subsTable = schema_table_exists($pdo, 'trading_bot_subscriptions', $driver);
  $subsStatus = $subsTable && schema_column_exists($pdo, 'trading_bot_subscriptions', 'status', $driver);
  $subsSignal = $subsTable && schema_column_exists($pdo, 'trading_bot_subscriptions', 'signal_id', $driver);
  $subscribersJoin = ($subsTable && $subsStatus && $subsSignal)
    ? "LEFT JOIN ( SELECT signal_id, COUNT(*) AS subscribers FROM trading_bot_subscriptions WHERE status IN ('active','armed','copied') GROUP BY signal_id ) sb ON sb.signal_id = s.id"
    : "LEFT JOIN (SELECT NULL AS signal_id, 0 AS subscribers) sb ON 1=0";

  $where = [];
  $args = [];
  $statusFilter = $sigHas('status') ? "s.status='active'" : '1=1';
  $where[] = $statusFilter;
  if ($symbol !== '' && $sigHas('market_symbol')) {
    $symbols = array_values(array_filter(array_map('trim', explode(',', $symbol))));
    if (count($symbols) === 1) {
      $where[] = "s.market_symbol=?";
      $args[] = strtoupper($symbols[0]);
    } elseif ($symbols) {
      $marks = implode(',', array_fill(0, count($symbols), '?'));
      $where[] = "s.market_symbol IN ($marks)";
      foreach ($symbols as $symItem) $args[] = strtoupper($symItem);
    }
  }
  if ($type !== '' && $type !== 'all' && $sigHas('market_type')) {
    $where[] = "s.market_type=?";
    $args[] = $type;
  }
  if ($botOnly && $sigHas('bot_enabled')) $where[] = "COALESCE(s.bot_enabled,0)=1";
  if ($homeOnly && $sigHas('show_on_home')) $where[] = "COALESCE(s.show_on_home,1)=1";
  if ($sigHas('valid_until')) {
    $where[] = "(s.valid_until IS NULL OR s.valid_until=0 OR s.valid_until>=?)";
    $args[] = time();
  }

  $sql = "SELECT s.id,
                 {$sigCol('market_symbol', "''")},
                 {$sigCol('market_type', "''")},
                 {$sigCol('timeframe', "''")},
                 {$sigCol('direction', "'BUY'")},
                 {$sigCol('entry_price')},
                 {$sigCol('stop_loss')},
                 {$sigCol('take_profit_1')},
                 {$sigCol('take_profit_2')},
                 {$sigCol('confidence', '50')},
                 {$sigCol('note_en', "''")},
                 {$sigCol('note_ar', "''")},
                 {$sigCol('note_ru', "''")},
                 {$sigCol('valid_until')},
                 {$sigCol('created_at', '0')},
                 {$sigCol('source', "''")},
                 {$sigCol('bot_enabled', '0')},
                 {$sigCol('bot_name_en', "''")},
                 {$sigCol('bot_name_ar', "''")},
                 {$sigCol('bot_name_ru', "''")},
                 {$sigCol('bot_brief_en', "''")},
                 {$sigCol('bot_brief_ar', "''")},
                 {$sigCol('bot_brief_ru', "''")},
                 {$sigCol('copy_min_amount', '100')},
                 {$sigCol('copy_lock_days', '7')},
                 {$sigCol('copy_profit_share_pct', '0')},
                 {$sigCol('copy_leverage', '1')},
                 {$sigCol('show_on_home', '1')},
                 {$sigCol('recommend_count', '0')},
                 {$sigCol('comments_count', '0')},
                 COALESCE(sb.subscribers,0) AS subscribers
          FROM trading_signals s
          {$subscribersJoin}
          WHERE " . implode(' AND ', $where) . "
          ORDER BY s.id DESC LIMIT 50";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($args);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  if (!$rows && ($homeOnly || $botOnly)) {
    $fallbackWhere = array_values(array_filter($where, static function($clause){
      return strpos($clause, 'show_on_home') === false && strpos($clause, 'bot_enabled') === false;
    }));
    if (!$fallbackWhere) $fallbackWhere = [$statusFilter];
    $fallbackSql = "SELECT s.id,
                 {$sigCol('market_symbol', "''")},
                 {$sigCol('market_type', "''")},
                 {$sigCol('timeframe', "''")},
                 {$sigCol('direction', "'BUY'")},
                 {$sigCol('entry_price')},
                 {$sigCol('stop_loss')},
                 {$sigCol('take_profit_1')},
                 {$sigCol('take_profit_2')},
                 {$sigCol('confidence', '50')},
                 {$sigCol('note_en', "''")},
                 {$sigCol('note_ar', "''")},
                 {$sigCol('note_ru', "''")},
                 {$sigCol('valid_until')},
                 {$sigCol('created_at', '0')},
                 {$sigCol('source', "''")},
                 {$sigCol('bot_enabled', '0')},
                 {$sigCol('bot_name_en', "''")},
                 {$sigCol('bot_name_ar', "''")},
                 {$sigCol('bot_name_ru', "''")},
                 {$sigCol('bot_brief_en', "''")},
                 {$sigCol('bot_brief_ar', "''")},
                 {$sigCol('bot_brief_ru', "''")},
                 {$sigCol('copy_min_amount', '100')},
                 {$sigCol('copy_lock_days', '7')},
                 {$sigCol('copy_profit_share_pct', '0')},
                 {$sigCol('copy_leverage', '1')},
                 {$sigCol('show_on_home', '1')},
                 {$sigCol('recommend_count', '0')},
                 {$sigCol('comments_count', '0')},
                 COALESCE(sb.subscribers,0) AS subscribers
          FROM trading_signals s
          {$subscribersJoin}
          WHERE " . implode(' AND ', $fallbackWhere) . "
          ORDER BY s.id DESC LIMIT 50";
    $fallbackStmt = $pdo->prepare($fallbackSql);
    $fallbackStmt->execute($args);
    $rows = $fallbackStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }

  $liveBy = [];
  $isTrustedSignalQuote = static function(array $q, string $assetType): bool {
    $assetType = strtolower(trim($assetType));
    $source = strtolower(trim((string)($q['source'] ?? $q['provider'] ?? '')));
    $updatedAt = (int)($q['updated_at'] ?? 0);
    if ($updatedAt <= 0 || (time() - $updatedAt) > 12) return false;
    if ($assetType === 'commodities' && preg_match('/^X(?:AU|AG|PT|PD)USD$/', strtoupper((string)($q['symbol'] ?? '')))) {
      return in_array($source, ['massive','provider_live','provider_fallback','polygon'], true);
    }
    return (float)($q['price'] ?? 0) > 0 && !quote_source_is_untrusted($source);
  };

  $symbolsByType = [];
  $metaBySymbol = [];
  foreach ($rows as $sigRow) {
    $qSym = strtoupper((string)($sigRow['market_symbol'] ?? ''));
    if ($qSym === '') continue;
    $qType = $normalizeType((string)($sigRow['market_type'] ?? 'crypto'), $qSym);
    $symbolsByType[$qType][$qSym] = true;
  }

  if ($symbolsByType) {
    $allSymbols = [];
    foreach ($symbolsByType as $bucket) {
      foreach (array_keys($bucket) as $sym) $allSymbols[$sym] = true;
    }
    if ($allSymbols) {
      try {
        $marks = implode(',', array_fill(0, count($allSymbols), '?'));
        $mst = $pdo->prepare("SELECT symbol, meta FROM markets WHERE symbol IN ($marks)");
        $mst->execute(array_keys($allSymbols));
        foreach (($mst->fetchAll(PDO::FETCH_ASSOC) ?: []) as $mr) {
          $metaBySymbol[strtoupper((string)($mr['symbol'] ?? ''))] = market_meta($mr['meta'] ?? null);
        }
      } catch (Throwable $e) {
        $metaBySymbol = [];
      }
    }

    foreach ($symbolsByType as $assetType => $symbolMap) {
      $symbols = array_values(array_keys($symbolMap));
      if (!$symbols) continue;
      try {
        $liveRows = quote_bulk_live($symbols, $assetType, $metaBySymbol, [
          'ttl' => ($assetType === 'crypto' ? 1 : 1),
          'yahoo_ttl' => 1,
          'massive_ttl' => 1,
          'direct_budget' => in_array($assetType, ['stocks','arab','futures'], true) ? count($symbols) : min(8, count($symbols)),
          'direct_yahoo_budget' => in_array($assetType, ['stocks','arab','futures'], true) ? count($symbols) : min(8, count($symbols)),
        ]);
      } catch (Throwable $e) {
        $liveRows = [];
      }
      foreach ($symbols as $sym) {
        $row = is_array($liveRows[$sym] ?? null) ? $liveRows[$sym] : null;
        if (!$row || !((float)($row['price'] ?? 0) > 0)) continue;
        $liveBy[$sym] = [
          'price' => (float)($row['price'] ?? 0),
          'change_pct' => (float)($row['change_pct'] ?? 0),
          'source' => (string)($row['source'] ?? ''),
          'updated_at' => (int)($row['updated_at'] ?? time()),
        ];
        try {
          quote_upsert_from_read_path($sym, $assetType, (float)$row['price'], (float)($row['change_pct'] ?? 0), (int)($row['updated_at'] ?? time()), ['source' => (string)($row['source'] ?? 'provider_live')]);
        } catch (Throwable $e) {}
      }
    }
  }

  $items = [];
  foreach ($rows as $r) {
    $note = $r['note_'.$lang] ?? '';
    if ($note === '' || $note === null) $note = $r['note_en'] ?? '';
    $botName = trim((string)($r['bot_name_'.$lang] ?? ''));
    if ($botName === '') $botName = trim((string)($r['bot_name_en'] ?? ''));
    if ($botName === '') $botName = trim((string)($r['market_symbol'] ?? 'Trading Bot'));
    $botBrief = trim((string)($r['bot_brief_'.$lang] ?? ''));
    if ($botBrief === '') $botBrief = trim((string)($r['bot_brief_en'] ?? ''));
    if ($botBrief === '') $botBrief = $note;
    $items[] = [
      'id' => (int)($r['id'] ?? 0),
      'symbol' => (string)($r['market_symbol'] ?? ''),
      'type' => $normalizeType((string)($r['market_type'] ?? ''), (string)($r['market_symbol'] ?? '')),
      'timeframe' => (string)($r['timeframe'] ?? ''),
      'direction' => (string)($r['direction'] ?? 'BUY'),
      'entry' => $r['entry_price'] !== null ? (float)$r['entry_price'] : null,
      'sl' => $r['stop_loss'] !== null ? (float)$r['stop_loss'] : null,
      'tp1' => $r['take_profit_1'] !== null ? (float)$r['take_profit_1'] : null,
      'tp2' => $r['take_profit_2'] !== null ? (float)$r['take_profit_2'] : null,
      'confidence' => (int)($r['confidence'] ?? 0),
      'note' => (string)$note,
      'valid_until' => !empty($r['valid_until']) ? (int)$r['valid_until'] : null,
      'created_at' => (int)($r['created_at'] ?? 0),
      'source' => (string)($r['source'] ?? ''),
      'bot_enabled' => (int)($r['bot_enabled'] ?? 0),
      'bot_name' => $botName,
      'bot_brief' => $botBrief,
      'copy_min_amount' => (float)($r['copy_min_amount'] ?? 0),
      'copy_lock_days' => (int)($r['copy_lock_days'] ?? 0),
      'copy_profit_share_pct' => (float)($r['copy_profit_share_pct'] ?? 0),
      'copy_leverage' => max(1, (int)($r['copy_leverage'] ?? 1)),
      'show_on_home' => (int)($r['show_on_home'] ?? 1),
      'recommend_count' => (int)($r['recommend_count'] ?? 0),
      'comments_count' => (int)($r['comments_count'] ?? 0),
      'live_price' => (float)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['price'] ?? 0),
      'live_change_pct' => (float)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['change_pct'] ?? 0),
      'live_source' => (string)($liveBy[strtoupper((string)($r['market_symbol'] ?? ''))]['source'] ?? ''),
      'subscribers' => (int)($r['subscribers'] ?? 0),
    ];
  }

  json_response(['ok'=>true,'items'=>$items]);
} catch (Throwable $e) {
  json_response(['ok'=>true,'items'=>[], 'warning'=>$e->getMessage()]);
}
