<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/common.php';
require_once __DIR__ . '/../lib/quotes.php';
require_once __DIR__ . '/../lib/market_resolver.php';

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

$token = cron_input_token_qw();
if ($token === '' || !hash_equals((string)env('CRON_KEY',''), $token)) {
  http_response_code(403);
  echo 'Forbidden';
  exit;
}
header('Content-Type: application/json; charset=utf-8');

try { $pdo = db(); } catch (Throwable $e) { json_response(['ok'=>false,'error'=>'DB not ready for cron','detail'=>$e->getMessage()], 500); }

$types = ['crypto','forex','stocks','arab','commodities','futures'];
$perType = max(6, min(30, (int)($_GET['per_type'] ?? 18)));
$results = [];
$totalUpserts = 0;
$now = time();

foreach ($types as $type) {
  $sql = "SELECT symbol, type, meta FROM markets WHERE status='active' AND type" . ($type === 'commodities' ? " IN ('commodities','metals')" : "=?") . " ORDER BY sort_order ASC, id ASC LIMIT " . (int)$perType;
  $st = $type === 'commodities'
    ? $pdo->query($sql)
    : (function() use ($pdo, $sql, $type) { $s = $pdo->prepare($sql); $s->execute([$type]); return $s; })();
  $rows = $st ? ($st->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
  $symbols = [];
  $metaBySymbol = [];
  foreach ($rows as $row) {
    $sym = strtoupper(trim((string)($row['symbol'] ?? '')));
    if ($sym === '') continue;
    $symbols[] = $sym;
    $metaBySymbol[$sym] = market_meta($row['meta'] ?? null);
  }
  if (!$symbols) { $results[$type] = ['count'=>0,'upserts'=>0]; continue; }
  $opts = [
    'ttl' => 1,
    'yahoo_ttl' => 1,
    'massive_ttl' => 1,
    'direct_budget' => count($symbols),
    'direct_yahoo_budget' => count($symbols),
    'chart_budget' => in_array($type, ['arab','forex','commodities','futures'], true) ? max(8, count($symbols)) : 8,
  ];
  $live = [];
  try { $live = quote_bulk_live(array_values(array_unique($symbols)), $type, $metaBySymbol, $opts); } catch (Throwable $e) { $live = []; }
  $upserts = 0;
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
  }
  $results[$type] = ['count'=>count($symbols),'upserts'=>$upserts];
}

$payload = [
  'ok' => true,
  'warmed_at' => $now,
  'per_type' => $perType,
  'total_upserts' => $totalUpserts,
  'results' => $results,
  'hint' => 'Run every minute via cron using token=CRON_KEY'
];
try { tp_status_write('quotes_warm', $payload); } catch (Throwable $e) {}

json_response($payload);
