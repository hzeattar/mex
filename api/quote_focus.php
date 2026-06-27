<?php
declare(strict_types=1);
// Ultra-light cache-only quote endpoint. When type is omitted, each symbol is
// resolved to its known static market type so XAUUSD/AAPL/etc. do not fall
// back to crypto and become unavailable.
require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/market_resolver.php';
require_once __DIR__ . '/lib/quote_store.php';
require_once __DIR__ . '/lib/quote_central.php';
require_once __DIR__ . '/lib/quote_snapshot.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=1');

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));
$typeParam = strtolower(trim((string)($_GET['type'] ?? '')));
$type = vp_normalize_asset_type($typeParam);

$defsBySym = qa_static_supported_defs_by_symbol();
$list = [];
foreach (explode(',', $symbolsRaw) as $sym) {
  $sym = strtoupper(trim($sym));
  if ($sym !== '' && preg_match('/^[A-Z0-9:._^=\/\-]{1,32}$/', $sym)) {
    $list[] = $sym;
  }
}
$list = array_slice(array_values(array_unique($list)), 0, 40);
if (!$list) {
  json_response(['ok' => false, 'error' => 'symbols required'], 400);
}

// Resolve per-symbol target type. If a type is explicitly supplied, use it
// for all symbols. Otherwise, look up each symbol's static market type.
$typesForSymbol = [];
foreach ($list as $sym) {
  $targetType = $type;
  if ($typeParam === '') {
    $inferred = vp_normalize_asset_type((string)($defsBySym[$sym]['type'] ?? ''));
    if ($inferred !== '') $targetType = $inferred;
  }
  $typesForSymbol[$sym] = $targetType;
}

// Build empty snapshots so every requested symbol always appears in output.
$items = [];
foreach ($list as $sym) {
  $items[$sym] = qs_empty_snapshot($sym, $typesForSymbol[$sym], 'spot');
}

// Group by resolved type and fetch snapshots per type.
$byType = [];
foreach ($list as $sym) {
  $byType[$typesForSymbol[$sym]][] = $sym;
}

foreach ($byType as $groupType => $syms) {
  $freshAge = match ($groupType) {
    'crypto' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_CRYPTO', '5')),
    'forex' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_FOREX', '4')),
    'commodities' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_COMMODITIES', '4')),
    'futures' => max(2, (int)env('QUOTE_FOCUS_FRESH_AGE_FUTURES', '4')),
    'stocks' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_STOCKS', '5')),
    'arab' => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_ARAB', '5')),
    default => max(3, (int)env('QUOTE_FOCUS_FRESH_AGE_DEFAULT', '10')),
  };

  $centralItems = qs_public_items(qs_snapshots($syms, $groupType, 'spot', ['mode' => 'display']));

  $stale = [];
  foreach ($centralItems as $i => $it) {
    $age = isset($it['age_sec']) && is_numeric($it['age_sec']) ? (int)$it['age_sec'] : null;
    if (!((float)($it['price'] ?? 0) > 0) || ($age !== null && $age > $freshAge)) {
      $stale[(string)($it['symbol'] ?? '')] = $i;
    } else {
      $items[(string)($it['symbol'] ?? '')] = $it;
    }
  }

  if ($stale) {
    $maxAge = max($freshAge, (int)env('QUOTE_FOCUS_MAX_AGE', '900'));
    $lastKnown = quote_central_items(array_keys($stale), $groupType, $maxAge);
    foreach ($lastKnown as $lk) {
      $sym = (string)($lk['symbol'] ?? '');
      if ($sym !== '' && isset($stale[$sym]) && (float)($lk['price'] ?? 0) > 0) {
        $items[$sym] = qs_public_item(qs_snapshot_from_row($sym, $groupType, 'spot', $lk, ['mode' => 'display']));
        unset($stale[$sym]);
      }
    }
  }

  $missing = [];
  foreach ($centralItems as $i => $it) {
    $sym = (string)($it['symbol'] ?? '');
    if ($sym === '') continue;
    if (!((float)($it['price'] ?? 0) > 0)) $missing[] = $sym;
  }
  // Also include symbols that never produced a central item.
  foreach ($syms as $sym) {
    if (!isset($items[$sym]) || !((float)($items[$sym]['price'] ?? 0) > 0)) {
      if (!in_array($sym, $missing, true)) $missing[] = $sym;
    }
  }

  if ($missing) {
    require_once __DIR__ . '/lib/quotes.php';
    foreach ($missing as $sym) {
      try {
        $q = quote_get($sym, $groupType);
      } catch (Throwable $e) {
        $q = null;
      }
      if (is_array($q) && (float)($q['price'] ?? 0) > 0) {
        $items[$sym] = qs_public_item(qs_snapshot_from_row($sym, $groupType, 'spot', $q, ['mode' => 'display']));
      }
    }
  }
}

// Preserve request order.
$orderedItems = [];
foreach ($list as $sym) {
  if (isset($items[$sym])) $orderedItems[] = $items[$sym];
}

json_response([
  'ok' => true,
  'items' => $orderedItems,
  'authority' => 'central',
  'mode' => 'focus_central',
  'source' => 'central',
]);
