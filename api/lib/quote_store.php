<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quotes.php';

function qa_parse_symbols(string $symbolsRaw): array {
  $list = [];
  if (trim($symbolsRaw) === '') return $list;
  foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $sym) {
    $sym = strtoupper(trim((string)$sym));
    if ($sym !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $sym)) $list[] = $sym;
  }
  return array_values(array_unique($list));
}

function qa_static_supported_defs_by_symbol(): array {
  static $cached = null;
  if (is_array($cached)) return $cached;

  $cached = [];
  $path = dirname(__DIR__) . '/markets.php';
  $src = @file_get_contents($path);
  if (!is_string($src) || $src === '') return $cached;

  $fn = strpos($src, 'function vp_supported_market_defs');
  $ret = $fn === false ? false : strpos($src, 'return [', $fn);
  $start = $ret === false ? false : strpos($src, '[', $ret);
  if ($start === false) return $cached;

  $depth = 0;
  $inSingle = false;
  $inDouble = false;
  $escape = false;
  $end = null;
  $len = strlen($src);
  for ($i = $start; $i < $len; $i++) {
    $ch = $src[$i];
    if ($escape) { $escape = false; continue; }
    if (($inSingle || $inDouble) && $ch === '\\') { $escape = true; continue; }
    if (!$inDouble && $ch === "'") { $inSingle = !$inSingle; continue; }
    if (!$inSingle && $ch === '"') { $inDouble = !$inDouble; continue; }
    if ($inSingle || $inDouble) continue;
    if ($ch === '[') $depth++;
    elseif ($ch === ']') {
      $depth--;
      if ($depth === 0) { $end = $i; break; }
    }
  }
  if ($end === null) return $cached;

  $arrayCode = substr($src, $start, $end - $start + 1);
  try { $defs = eval('return ' . $arrayCode . ';'); } catch (Throwable $e) { $defs = []; }
  if (!is_array($defs)) return $cached;

  foreach ($defs as $def) {
    if (!is_array($def)) continue;
    $sym = strtoupper(trim((string)($def['symbol'] ?? '')));
    if ($sym === '') continue;
    $def['symbol'] = $sym;
    $def['type'] = vp_normalize_asset_type((string)($def['type'] ?? ''));
    $cached[$sym] = $def;
  }
  return $cached;
}

function qa_market_meta_from_supported_def(array $def): array {
  $meta = [
    'supported' => true,
    'icon' => (string)($def['icon'] ?? ''),
    'icon_url' => !empty($def['icon']) ? '/assets/img/markets/' . preg_replace('/[^a-z0-9_-]/i', '', (string)$def['icon']) . '.svg' : '',
    'yahoo_ticker' => (string)($def['yahoo_ticker'] ?? ''),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
  ];
  foreach (['polygon_ticker','eodhd_symbol','provider_symbol_eodhd','provider_symbol','twelvedata_ticker','fcsapi_ticker','exchange','market','exchange_code'] as $key) {
    if (array_key_exists($key, $def) && $def[$key] !== null && $def[$key] !== '') {
      $meta[$key] = $def[$key];
    }
  }
  return array_filter($meta, static fn($value) => $value !== null && $value !== '');
}

function qa_market_row_from_supported_def(array $def): array {
  $sym = strtoupper(trim((string)($def['symbol'] ?? '')));
  return [
    'symbol' => $sym,
    'type' => vp_normalize_asset_type((string)($def['type'] ?? '')),
    'seed_price' => (float)($def['seed_price'] ?? 0),
    'meta' => qa_market_meta_from_supported_def($def),
    'name' => (string)($def['name'] ?? $sym),
    'sort_order' => (int)($def['sort_order'] ?? 0),
    'tv_symbol' => (string)($def['tv_symbol'] ?? ''),
    'status' => 'active',
  ];
}

function qa_market_meta_by_symbols(array $symbols): array {
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  if (!$symbols) return [];
  $out = [];
  $staticDefs = qa_static_supported_defs_by_symbol();
  foreach ($symbols as $sym) {
    if (isset($staticDefs[$sym])) $out[$sym] = qa_market_row_from_supported_def($staticDefs[$sym]);
  }

  try {
    $pdo = db();
    $in = implode(',', array_fill(0, count($symbols), '?'));
    $st = $pdo->prepare("SELECT symbol, type, seed_price, meta, name, sort_order, tv_symbol, status FROM markets WHERE symbol IN ($in)");
    $st->execute($symbols);
    foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
      $sym = strtoupper((string)($row['symbol'] ?? ''));
      if ($sym === '') continue;
      $base = is_array($out[$sym] ?? null) ? $out[$sym] : [];
      $baseMeta = is_array($base['meta'] ?? null) ? $base['meta'] : [];
      $dbMeta = market_meta($row['meta'] ?? null);
      $baseSeed = (float)($base['seed_price'] ?? 0);
      $dbSeed = (float)($row['seed_price'] ?? 0);
      $cleanDbMeta = array_filter($dbMeta, static fn($value) => $value !== null && $value !== '');
      $out[$sym] = [
        'symbol' => $sym,
        'type' => vp_normalize_asset_type((string)($row['type'] ?? ($base['type'] ?? ''))),
        'seed_price' => $baseSeed > 0 ? $baseSeed : $dbSeed,
        'meta' => array_merge($cleanDbMeta, $baseMeta),
        'name' => (string)($row['name'] ?? ($base['name'] ?? $sym)),
        'sort_order' => (int)($row['sort_order'] ?? ($base['sort_order'] ?? 0)),
        'tv_symbol' => (string)($row['tv_symbol'] ?? ($base['tv_symbol'] ?? '')),
        'status' => (string)($row['status'] ?? 'active'),
      ];
    }
    return $out;
  } catch (Throwable $e) {
    return $out;
  }
}

function qa_quote_rows_by_symbols(array $symbols, ?string $typeAlias = null): array {
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  if (!$symbols) return [];

  try {
    $pdo = db();
    $flags = quote_cols_flags();
    $sel = "symbol,type,price,change_pct";
    $sel .= $flags['mark_price']        ? ",mark_price"        : ",NULL AS mark_price";
    $sel .= $flags['index_price']       ? ",index_price"       : ",NULL AS index_price";
    $sel .= $flags['funding_rate']      ? ",funding_rate"      : ",NULL AS funding_rate";
    $sel .= $flags['next_funding_time'] ? ",next_funding_time" : ",NULL AS next_funding_time";
    $sel .= $flags['source']            ? ",source"            : ",'' AS source";
    $sel .= $flags['market']            ? ",market"            : ",'spot' AS market";
    $sel .= $flags['provider']          ? ",provider"          : ",NULL AS provider";
    $sel .= $flags['provider_ts']       ? ",provider_ts"       : ",0 AS provider_ts";
    $sel .= $flags['received_at']       ? ",received_at"       : ",0 AS received_at";
    $sel .= $flags['source_strength']   ? ",source_strength"   : ",0 AS source_strength";
    $sel .= $flags['is_stale']          ? ",is_stale"          : ",0 AS is_stale";
    $sel .= $flags['as_of']             ? ",as_of"             : ",0 AS as_of";
    $sel .= $flags['ingested_at']       ? ",ingested_at"       : ",0 AS ingested_at";
    $sel .= $flags['source_priority']   ? ",source_priority"   : ",0 AS source_priority";
    $sel .= ",updated_at";

    $placeholders = implode(',', array_fill(0, count($symbols), '?'));
    $args = $symbols;
    $typeAlias = $typeAlias !== null ? vp_normalize_asset_type($typeAlias) : null;
    $sql = "SELECT {$sel} FROM market_quotes WHERE symbol IN ({$placeholders})";
    if ($typeAlias !== null && $typeAlias !== '' && $typeAlias !== 'all') {
      $sql .= " AND type=?";
      $args[] = $typeAlias;
    }
    $rankExpr = "0";
    if (!empty($flags['source'])) {
      $rankExpr = "CASE LOWER(source)
        WHEN 'binance' THEN 100
        WHEN 'trade_stream' THEN 96
        WHEN 'stream' THEN 96
        WHEN 'provider_live' THEN 92
        WHEN 'eodhd' THEN 91
        WHEN 'eodhd_rest' THEN 91
        WHEN 'finnhub' THEN 89
        WHEN 'tiingo' THEN 87
        WHEN 'fcsapi' THEN 85
        WHEN 'polygon' THEN 84
        WHEN 'currencyfreaks' THEN 82
        WHEN 'yahoo' THEN 72
        WHEN 'yahoo_chart_live' THEN 72
        WHEN 'massive' THEN 20
        WHEN 'provider_fallback' THEN 20
        WHEN 'fx_fallback' THEN 20
        WHEN 'frankfurter' THEN 20
        WHEN 'stooq' THEN 20
        WHEN 'eodhd_intraday' THEN 12
        WHEN 'cache' THEN 12
        WHEN 'stale_cache' THEN 12
        WHEN 'seed' THEN 4
        WHEN 'seed_fallback' THEN 4
        WHEN 'seed_price' THEN 4
        WHEN 'chart_seed' THEN 4
        WHEN 'seed_candle' THEN 4
        WHEN 'synthetic' THEN 4
        WHEN 'aggs' THEN 4
        ELSE 40 END";
    }
    if (!empty($flags['source_priority'])) {
      $rankExpr = "CASE WHEN source_priority > 0 THEN source_priority ELSE {$rankExpr} END";
    }
    $sql .= " ORDER BY symbol ASC, {$rankExpr} DESC, updated_at DESC, id DESC";
    $st = $pdo->prepare($sql);
    $st->execute($args);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $out = [];
    foreach ($rows as $row) {
      $sym = strtoupper((string)($row['symbol'] ?? ''));
      if ($sym === '' || isset($out[$sym])) continue;
      $out[$sym] = $row;
    }
    return $out;
  } catch (Throwable $e) {
    // Fall back to the single-row path on older DBs or partial imports.
  }

  $rows = [];
  foreach ($symbols as $sym) {
    try {
      $row = quote_get($sym, $typeAlias ?: null);
    } catch (Throwable $e) {
      $row = null;
    }
    if (is_array($row)) $rows[$sym] = $row;
  }
  return $rows;
}

function qa_cached_quote_from_market_row(array $row, string $assetType): array {
  $price = array_key_exists('q_price', $row) ? (float)($row['q_price'] ?? 0) : (float)($row['price'] ?? 0);
  $change = array_key_exists('q_change', $row) ? (float)($row['q_change'] ?? 0) : (float)($row['change_pct'] ?? 0);
  $updated = array_key_exists('q_updated', $row) ? (int)($row['q_updated'] ?? 0) : (int)($row['updated_at'] ?? 0);
  $source = array_key_exists('q_source', $row) ? (string)($row['q_source'] ?? '') : (string)($row['source'] ?? '');
  return [
    'symbol' => strtoupper((string)($row['symbol'] ?? '')),
    'type' => $assetType,
    'price' => $price,
    'change_pct' => $change,
    'updated_at' => $updated,
    'source' => $source,
  ];
}
