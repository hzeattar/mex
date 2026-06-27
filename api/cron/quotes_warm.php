<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/market_resolver.php';
require_once __DIR__ . '/../lib/quote_central.php';

function cron_input_token_qw(): string {
  $web = trim((string)($_GET['token'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $arg) {
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}

function cron_cli_arg_qw(string $name): string {
  if (PHP_SAPI !== 'cli') return '';
  global $argv;
  $name = trim($name);
  if ($name === '') return '';
  foreach ((array)($argv ?? []) as $arg) {
    $arg = trim((string)$arg);
    if ($arg === '') continue;
    if (str_starts_with($arg, $name . '=')) return trim(substr($arg, strlen($name) + 1));
    if (str_starts_with($arg, '--' . $name . '=')) return trim(substr($arg, strlen($name) + 3));
  }
  return '';
}

$token = cron_input_token_qw();
// Trusted in-container warmer bypass (CLI + CRON_LOCAL_RUN=1 set by the startup
// script). Local-only: external HTTP callers cannot set that env var.
$cliLocal = (PHP_SAPI === 'cli') && (trim((string)getenv('CRON_LOCAL_RUN')) === '1');
if (!$cliLocal && ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token))) {
  http_response_code(403);
  echo 'Forbidden';
  exit;
}
header('Content-Type: application/json; charset=utf-8');

try { $pdo = db(); } catch (Throwable $e) { json_response(['ok'=>false,'error'=>'DB not ready for cron','detail'=>$e->getMessage()], 500); }

function cron_market_key_qw(string $type, string $symbol): string {
  return vp_normalize_asset_type($type) . ':' . strtoupper(trim($symbol));
}

function cron_static_supported_defs_qw(array $types): array {
  $path = __DIR__ . '/../markets.php';
  $src = @file_get_contents($path);
  if (!is_string($src) || $src === '') return [];

  $fn = strpos($src, 'function vp_supported_market_defs');
  $ret = $fn === false ? false : strpos($src, 'return [', $fn);
  $start = $ret === false ? false : strpos($src, '[', $ret);
  if ($start === false) return [];

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
  if ($end === null) return [];

  $arrayCode = substr($src, $start, $end - $start + 1);
  try { $defs = eval('return ' . $arrayCode . ';'); } catch (Throwable $e) { return []; }
  if (!is_array($defs)) return [];

  $allowed = array_flip($types);
  $out = [];
  foreach ($defs as $def) {
    if (!is_array($def)) continue;
    $symbol = strtoupper(trim((string)($def['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($def['type'] ?? ''));
    if ($symbol === '' || !isset($allowed[$type])) continue;
    $def['symbol'] = $symbol;
    $def['type'] = $type;
    $def['_catalog_supported'] = true;
    $out[cron_market_key_qw($type, $symbol)] = $def;
  }
  return $out;
}

function cron_supported_quote_defs_qw(PDO $pdo, array $types): array {
  $defsByKey = cron_static_supported_defs_qw($types);
  $allowed = array_flip($types);

  try {
    $st = $pdo->query("SELECT symbol, type, meta, sort_order FROM markets WHERE status='active' ORDER BY sort_order ASC, symbol ASC");
    $rows = $st ? ($st->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
  } catch (Throwable $e) {
    $rows = [];
  }

  foreach ($rows as $row) {
    $symbol = strtoupper(trim((string)($row['symbol'] ?? '')));
    $type = vp_normalize_asset_type((string)($row['type'] ?? ''));
    if ($symbol === '' || !isset($allowed[$type])) continue;

    $key = cron_market_key_qw($type, $symbol);
    $base = $defsByKey[$key] ?? [];
    $def = array_merge($base, [
      'symbol' => $symbol,
      'type' => $type,
      'sort_order' => isset($row['sort_order']) ? (int)$row['sort_order'] : (int)($base['sort_order'] ?? 999999),
    ]);

    $meta = market_meta($row['meta'] ?? null);
    foreach ($meta as $metaKey => $metaValue) {
      if ($metaValue === null || $metaValue === '') continue;
      if ($metaKey === 'yahoo_ticker' && !empty($base['yahoo_ticker'])) continue;
      $def[$metaKey] = $metaValue;
    }
    $defsByKey[$key] = $def;
  }

  $grouped = array_fill_keys($types, []);
  foreach ($defsByKey as $def) {
    $type = vp_normalize_asset_type((string)($def['type'] ?? ''));
    $symbol = strtoupper(trim((string)($def['symbol'] ?? '')));
    if ($symbol === '' || !isset($grouped[$type])) continue;
    $def['symbol'] = $symbol;
    $def['type'] = $type;
    $grouped[$type][] = $def;
  }

  foreach ($grouped as $type => $defs) {
    usort($defs, static function(array $a, array $b): int {
      $catalog = (empty($a['_catalog_supported']) ? 1 : 0) <=> (empty($b['_catalog_supported']) ? 1 : 0);
      if ($catalog !== 0) return $catalog;
      $order = ((int)($a['sort_order'] ?? 999999)) <=> ((int)($b['sort_order'] ?? 999999));
      return $order !== 0 ? $order : strcmp((string)($a['symbol'] ?? ''), (string)($b['symbol'] ?? ''));
    });
    $grouped[$type] = $defs;
  }

  return $grouped;
}

$allTypes = ['crypto','forex','stocks','arab','commodities','futures'];
$requestedTypesRaw = trim((string)($_GET['types'] ?? $_GET['type'] ?? ''));
// Allow the in-container CLI warmer to target a single market type per cycle
// (e.g. `php quotes_warm.php types=forex`) so each run stays light instead of
// warming all six asset classes at once and starving the web container.
if ($requestedTypesRaw === '' && PHP_SAPI === 'cli') {
  $requestedTypesRaw = cron_cli_arg_qw('types') ?: cron_cli_arg_qw('type');
}
$types = $allTypes;
if ($requestedTypesRaw !== '') {
  $requested = [];
  foreach (preg_split('/\s*,\s*/', $requestedTypesRaw) as $rawType) {
    $t = vp_normalize_asset_type((string)$rawType);
    if ($t !== '' && in_array($t, $allTypes, true) && !in_array($t, $requested, true)) $requested[] = $t;
  }
  if ($requested) $types = $requested;
}
$deepRaw = trim((string)($_GET['deep'] ?? ''));
if ($deepRaw === '') $deepRaw = cron_cli_arg_qw('deep');
if ($deepRaw === '') $deepRaw = '0';
$perTypeRaw = trim((string)($_GET['per_type'] ?? ''));
if ($perTypeRaw === '') $perTypeRaw = cron_cli_arg_qw('per_type');
if ($perTypeRaw === '') $perTypeRaw = cron_cli_arg_qw('limit');
if ($perTypeRaw === '') $perTypeRaw = '150';
$deepWarm = ((int)$deepRaw === 1) || count($types) === 1;
$perType = max(6, min(300, (int)$perTypeRaw));
$results = [];
$totalUpserts = 0;
$centralWrites = 0;
$now = time();
$supportedDefs = cron_supported_quote_defs_qw($pdo, $types);

foreach ($types as $type) {
  $defs = array_slice($supportedDefs[$type] ?? [], 0, $perType);
  $symbols = [];
  $metaBySymbol = [];
  foreach ($defs as $def) {
    $sym = strtoupper(trim((string)($def['symbol'] ?? '')));
    if ($sym === '') continue;
    $symbols[] = $sym;
    $metaBySymbol[$sym] = $def;
  }
  if (!$symbols) { $results[$type] = ['count'=>0,'upserts'=>0]; continue; }
  $chartCap = match ($type) {
    'stocks', 'arab', 'commodities', 'futures' => $deepWarm ? min(60, count($symbols)) : min(18, count($symbols)),
    default => 0,
  };
  $chartBudgetMs = 0;
  if ($chartCap > 0) {
    $chartBudgetMs = $deepWarm
      ? max(3500, min(9500, 600 + ($chartCap * 220)))
      : max(1800, min(4200, 500 + ($chartCap * 160)));
  }
  $opts = [
    'ttl' => 1,
    'yahoo_ttl' => 1,
    'massive_ttl' => 1,
    'direct_budget' => count($symbols),
    'direct_yahoo_budget' => 0,
    'allow_direct_batch' => $chartCap > 0,
    'chart_budget' => $chartCap,
    'chart_budget_cap' => $chartCap,
    'chart_budget_ms' => $chartBudgetMs,
  ];
  $live = [];
  try { $live = quote_bulk_live(array_values(array_unique($symbols)), $type, $metaBySymbol, $opts); } catch (Throwable $e) { $live = []; }
  $upserts = 0;
  $centralBySymbol = [];
  foreach ($symbols as $sym) {
    $row = is_array($live[$sym] ?? null) ? $live[$sym] : null;
    $price = (float)($row['price'] ?? 0);
    if (!($price > 0)) continue;
    $change = (float)($row['change_pct'] ?? 0);
    $updated = (int)($row['updated_at'] ?? $now) ?: $now;
    $source = (string)($row['source'] ?? 'provider_live');
    try {
      quote_upsert($sym, $type, $price, $change, $updated, ['source'=>$source]);
      $upserts++;
      $totalUpserts++;
    } catch (Throwable $e) {}
    try {
      $entry = [
        'symbol' => $sym,
        'type' => $type,
        'price' => $price,
        'change_pct' => $change,
        'updated_at' => $updated,
        'source' => $source,
        'central_ts' => $now,
        'received_at' => (int)($row['received_at'] ?? $now),
        'ingested_at' => (int)($row['ingested_at'] ?? $now),
      ];
      quote_central_write($sym, $type, $entry);
      $centralBySymbol[$sym] = $entry;
      $centralWrites++;
    } catch (Throwable $e) {}
  }
  if ($centralBySymbol) {
    try { quote_central_bundle_write($type, $centralBySymbol); } catch (Throwable $e) {}
  }
  $results[$type] = ['count'=>count($symbols),'upserts'=>$upserts,'central_writes'=>count($centralBySymbol)];
}

try {
  $typeCounts = [];
  foreach ($results as $type => $res) $typeCounts[$type] = (int)($res['central_writes'] ?? 0);
  quote_central_manifest_write([
    'type_counts' => $typeCounts,
    'total_written' => $centralWrites,
    'total_upserted' => $totalUpserts,
    'fallback_cron' => true,
  ]);
} catch (Throwable $e) {}

$payload = [
  'ok' => true,
  'warmed_at' => $now,
  'types' => $types,
  'deep' => $deepWarm,
  'per_type' => $perType,
  'total_upserts' => $totalUpserts,
  'central_writes' => $centralWrites,
  'results' => $results,
  'hint' => 'Run every 30-60 seconds via cron using token=CRON_KEY when the feed worker daemon is unavailable'
];
try { tp_status_write('quotes_warm', $payload); } catch (Throwable $e) {}

json_response($payload);
