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
    if ($sym !== '' && preg_match('/^[A-Z0-9:._\-]{2,32}$/', $sym)) $list[] = $sym;
  }
  return array_values(array_unique($list));
}

function qa_market_meta_by_symbols(array $symbols): array {
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  if (!$symbols) return [];
  $pdo = db();
  $in = implode(',', array_fill(0, count($symbols), '?'));
  $st = $pdo->prepare("SELECT symbol, type, seed_price, meta, name, sort_order, tv_symbol, status FROM markets WHERE symbol IN ($in)");
  $st->execute($symbols);
  $out = [];
  foreach (($st->fetchAll(PDO::FETCH_ASSOC) ?: []) as $row) {
    $sym = strtoupper((string)($row['symbol'] ?? ''));
    if ($sym === '') continue;
    $out[$sym] = [
      'symbol' => $sym,
      'type' => vp_normalize_asset_type((string)($row['type'] ?? '')),
      'seed_price' => (float)($row['seed_price'] ?? 0),
      'meta' => market_meta($row['meta'] ?? null),
      'name' => (string)($row['name'] ?? $sym),
      'sort_order' => (int)($row['sort_order'] ?? 0),
      'tv_symbol' => (string)($row['tv_symbol'] ?? ''),
      'status' => (string)($row['status'] ?? 'active'),
    ];
  }
  return $out;
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
    $sql .= " ORDER BY symbol ASC, updated_at DESC, id DESC";
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
    $row = quote_get($sym, $typeAlias ?: null);
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
