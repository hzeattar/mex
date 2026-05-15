<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/market_resolver.php';

function qa_live_map(array $symbols, string $assetType, array $metaBySymbol = [], array $opts = []): array {
  $symbols = array_values(array_unique(array_filter(array_map('strtoupper', $symbols))));
  $assetType = vp_normalize_asset_type($assetType);
  if (!$symbols || $assetType === '' || $assetType === 'all') return [];
  $budget = array_key_exists('direct_budget', $opts)
    ? (int)$opts['direct_budget']
    : (in_array($assetType, ['arab','futures'], true) ? count($symbols) : min(8, count($symbols)));
  $chartBudget = array_key_exists('chart_budget', $opts)
    ? (int)$opts['chart_budget']
    : (in_array($assetType, ['arab','futures'], true) ? max(8, min(count($symbols), 20)) : 6);
  try {
    return quote_bulk_live($symbols, $assetType, $metaBySymbol, [
      'ttl' => (int)($opts['ttl'] ?? 1),
      'yahoo_ttl' => (int)($opts['yahoo_ttl'] ?? 1),
      'massive_ttl' => (int)($opts['massive_ttl'] ?? 1),
      'direct_budget' => $budget,
      'direct_yahoo_budget' => (int)($opts['direct_yahoo_budget'] ?? $budget),
      'chart_budget' => $chartBudget,
      'chart_budget_ms' => (int)($opts['chart_budget_ms'] ?? 3000),
      'allow_direct_batch' => !empty($opts['allow_direct_batch']),
    ]);
  } catch (Throwable $e) {
    return [];
  }
}

function qa_live_map_grouped(array $symbolsByType, array $metaBySymbol = [], array $opts = []): array {
  $out = [];
  foreach ($symbolsByType as $assetType => $symbols) {
    $subsetMeta = [];
    foreach ((array)$symbols as $sym) {
      $sym = strtoupper((string)$sym);
      $subsetMeta[$sym] = is_array($metaBySymbol[$sym] ?? null) ? $metaBySymbol[$sym] : [];
    }
    $live = qa_live_map((array)$symbols, (string)$assetType, $subsetMeta, $opts);
    foreach ($live as $sym => $row) {
      if (is_array($row) && (float)($row['price'] ?? 0) > 0) $out[strtoupper((string)$sym)] = $row;
    }
  }
  return $out;
}
