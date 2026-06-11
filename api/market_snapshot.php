<?php
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quotes.php';
require_once __DIR__ . '/lib/quote_central.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/market_resolver.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: application/json; charset=utf-8');

$route = strtolower(trim((string)($_GET['route'] ?? 'home')));
$preferred = vp_normalize_asset_type((string)($_GET['preferred'] ?? 'crypto'));
$force = ((int)($_GET['force'] ?? 0) === 1);
$forceLive = ((int)($_GET['force_live'] ?? 0) === 1);
$typesRaw = trim((string)($_GET['types'] ?? ''));
$cacheDir = __DIR__ . '/data/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);

$allowedTypes = ['crypto','forex','stocks','arab','commodities','futures'];
$types = [];
if ($typesRaw !== '') {
  foreach (preg_split('/\s*,\s*/', $typesRaw) as $raw) {
    $norm = vp_normalize_asset_type($raw);
    if ($norm && in_array($norm, $allowedTypes, true) && !in_array($norm, $types, true)) $types[] = $norm;
  }
}
if (!$types) {
  $ordered = [$preferred, 'crypto','forex','stocks','arab','commodities','futures'];
  foreach ($ordered as $raw) {
    $norm = vp_normalize_asset_type($raw);
    if ($norm && in_array($norm, $allowedTypes, true) && !in_array($norm, $types, true)) $types[] = $norm;
  }
}

$cacheKey = sha1(json_encode([$route, $preferred, $types, $forceLive ? 'live' : 'warm'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
$cacheFile = $cacheDir . '/market_snapshot_' . $cacheKey . '.json';
$cacheTtl = ($route === 'trade') ? 3 : 5;
if (!$force && is_file($cacheFile)) {
  $age = time() - (int)@filemtime($cacheFile);
  if ($age >= 0 && $age <= $cacheTtl) {
    $raw = @file_get_contents($cacheFile);
    if ($raw !== false && $raw !== '') {
      echo $raw;
      exit;
    }
  }
}

function vp_snapshot_limit_for(string $route, string $type, string $preferred): int {
  if ($route === 'trade') {
    if ($type === $preferred) return ($type === 'crypto') ? 24 : 18;
    return in_array($type, ['crypto','futures'], true) ? 14 : 12;
  }
  if ($route === 'home') {
    if ($type === $preferred) return ($type === 'crypto') ? 14 : 10;
    return in_array($type, ['crypto','futures'], true) ? 8 : 6;
  }
  return 12;
}

function vp_snapshot_quote_usable(array $row, string $assetType, bool $strict = false): bool {
  $assetType = vp_normalize_asset_type($assetType);
  $price = (float)($row['price'] ?? 0);
  if (!($price > 0)) return false;
  $src = strtolower(trim((string)($row['source'] ?? $row['provider'] ?? '')));
  if (!quote_source_is_liveish($src, $assetType)) return false;
  $updatedAt = (int)($row['updated_at'] ?? 0);
  if ($updatedAt <= 0) return false;
  $age = max(0, time() - $updatedAt);
  if ($assetType === 'crypto') return $age <= ($strict ? 6 : 12);
  if ($strict) {
    $maxAge = in_array($assetType, ['stocks','arab'], true) ? 8 : (in_array($assetType, ['commodities','futures'], true) ? 6 : 6);
  } else {
    $maxAge = in_array($assetType, ['stocks','arab'], true) ? 18 : (in_array($assetType, ['commodities','futures'], true) ? 10 : 10);
  }
  return $age <= $maxAge;
}

try {
  $pdo = db();
  $flags = function_exists('quote_cols_flags') ? quote_cols_flags() : ['source' => false];
  $selSource = !empty($flags['source']) ? 'q.source AS q_source' : "'' AS q_source";
  $quoteMarketJoin = !empty($flags['market']) ? " AND COALESCE(q.market,'spot')='spot'" : '';

  $rowsByType = [];
  // Single query for all types instead of per-type queries
  $allQueryTypes = [];
  foreach ($types as $type) {
    $qt = $type === 'commodities' ? ['commodities','metals'] : [$type];
    $allQueryTypes = array_merge($allQueryTypes, $qt);
  }
  $allQueryTypes = array_unique($allQueryTypes);
  $placeholders = implode(',', array_fill(0, count($allQueryTypes), '?'));
  $sql = "SELECT m.id, m.symbol, m.name, m.type, m.status, m.sort_order, m.tv_symbol, m.seed_price, m.meta,
                 q.price AS q_price, q.change_pct AS q_change, q.updated_at AS q_updated, {$selSource}
          FROM markets m
          LEFT JOIN market_quotes q ON q.symbol = m.symbol AND q.type = (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END) {$quoteMarketJoin} AND q.updated_at > 0
          WHERE m.status='active' AND m.type IN ({$placeholders})
          ORDER BY m.sort_order ASC, m.id ASC";
  $st = $pdo->prepare($sql);
  $st->execute($allQueryTypes);
  $allRows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  // Partition rows by type
  foreach ($types as $type) {
    $rowsByType[$type] = [];
  }
  foreach ($allRows as $row) {
    $rowType = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($rowType === 'metals') $rowType = 'commodities';
    if (isset($rowsByType[$rowType])) {
      $rowsByType[$rowType][] = $row;
    }
  }

  $pools = [];
  $merged = [];
  foreach ($types as $type) {
    $rows = $rowsByType[$type] ?? [];
    $rows = array_values(array_filter($rows, static function($row) use ($type) {
      $rowType = vp_normalize_asset_type((string)($row['type'] ?? ''));
      if ($type === 'commodities') return in_array($rowType, ['commodities','metals'], true);
      return $rowType === $type;
    }));
    $limit = vp_snapshot_limit_for($route, $type, $preferred);
    if ($limit > 0) $rows = array_slice($rows, 0, $limit);

    $symbols = [];
    $metaBySymbol = [];
    foreach ($rows as $row) {
      $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
      if ($sym === '') continue;
      $symbols[] = $sym;
      $metaBySymbol[$sym] = market_meta($row['meta'] ?? null);
    }
    $authoritativeQuotes = [];
    // ── Central cache path: read from feed worker's cache, no upstream ──
    $centralWarmSnapshot = quote_central_is_warm($type);
    if ($centralWarmSnapshot && !$forceLive) {
      $centralBundle = quote_central_bundle_read($type, 60);
      foreach ($symbols as $sym) {
        if (isset($centralBundle[$sym])) {
          $authoritativeQuotes[$sym] = $centralBundle[$sym];
        }
      }
    }
    if (!$authoritativeQuotes) {
    $authoritativeQuotes = qa_overlay_market_rows($rows, [
      // Snapshot is a hydration/read path. Keep it cache-first for all groups;
      // the focus quote endpoints own live escalation and provider churn.
      'with_live' => false,
      'allow_crypto_seed' => false,
      'allow_noncrypto_seed' => false,
      'allow_stale_display' => $type !== 'crypto',
      'direct_budget' => ($type === 'crypto') ? (($route === 'trade') ? 18 : 12) : ((in_array($type, ['stocks','arab'], true) && $route === 'trade') ? 2 : (($route === 'trade') ? 1 : 0)),
      'direct_yahoo_budget' => ($type === 'crypto') ? (($route === 'trade') ? 18 : 12) : ((in_array($type, ['stocks','arab'], true) && $route === 'trade') ? 2 : (($route === 'trade') ? 1 : 0)),
      'chart_budget' => ($type === 'crypto') ? (($route === 'trade') ? 6 : 4) : (in_array($type, ['stocks','arab'], true) ? 0 : 1),
    ]);
    } // end else (central cache miss)

    $items = [];
    foreach ($rows as $row) {
      $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
      if ($sym === '') continue;
      $assetType = $type;
      $use = is_array($authoritativeQuotes[$sym] ?? null) ? $authoritativeQuotes[$sym] : null;

      $price = 0.0;
      $change = 0.0;
      $updatedAt = 0;
      $source = 'unavailable';
      if ($use) {
        $price = (float)($use['price'] ?? 0);
        $change = (float)($use['change_pct'] ?? 0);
        $updatedAt = (int)($use['updated_at'] ?? 0);
        $source = (string)($use['source'] ?? $use['provider'] ?? '');
      }
      $isStale = !empty($use['is_stale']);
      $timingClass = (string)($use['timing_class'] ?? ($isStale ? 'stale' : ($price > 0 ? 'live' : 'unavailable')));
      $item = [
        'id' => (int)($row['id'] ?? 0),
        'symbol' => $sym,
        'name' => (string)($row['name'] ?? $sym),
        'type' => $assetType,
        'market' => in_array($assetType, ['crypto','futures'], true) ? 'perp' : 'spot',
        'sort_order' => (int)($row['sort_order'] ?? 0),
        'tv_symbol' => (string)($row['tv_symbol'] ?? ''),
        'seed_price' => (float)($row['seed_price'] ?? 0),
        'meta' => $metaBySymbol[$sym] ?? [],
        'price' => $price,
        'change_pct' => $change,
        'updated_at' => $updatedAt,
        'source' => $source,
        'is_stale' => $isStale,
        'timing_class' => $timingClass,
      ];
      $items[] = $item;
      $merged[] = $item;
    }
    $pools[$type] = $items;
  }

  $out = [
    'ok' => true,
    'route' => $route,
    'preferred' => $preferred,
    'generated_at' => time(),
    'pools' => $pools,
    'items' => $merged,
  ];
  $json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json !== false) @file_put_contents($cacheFile, $json, LOCK_EX);
  echo $json !== false ? $json : '{"ok":false,"error":"encode_failed"}';
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
