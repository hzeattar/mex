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
