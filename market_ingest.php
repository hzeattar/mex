<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quotes.php';
require_once __DIR__ . '/api/lib/tick_ingest.php';
require_once __DIR__ . '/api/lib/tick_store.php';

function cron_input_token_mi(): string {
  $web = trim((string)($_GET['token'] ?? $_GET['key'] ?? ''));
  if ($web !== '') return $web;
  if (PHP_SAPI === 'cli') {
    global $argv;
    foreach ((array)($argv ?? []) as $idx => $arg) {
      if ((int)$idx === 0) continue;
      $arg = trim((string)$arg);
      if ($arg === '') continue;
      if (str_starts_with($arg, 'token=')) return trim(substr($arg, 6));
      if (str_starts_with($arg, '--token=')) return trim(substr($arg, 8));
      if (str_starts_with($arg, 'key=')) return trim(substr($arg, 4));
      if (str_starts_with($arg, '--key=')) return trim(substr($arg, 6));
      return $arg;
    }
    $envTok = trim((string)(getenv('CRON_KEY') ?: ''));
    if ($envTok !== '') return $envTok;
  }
  return '';
}

if (!hash_equals((string)env('CRON_KEY', ''), cron_input_token_mi())) {
  http_response_code(403);
  echo 'forbidden';
  exit;
}

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$rows = $pdo->query("
  SELECT m.symbol, m.type, COALESCE(q.market,'spot') AS q_market,
         q.price AS q_price, q.change_pct AS q_change, q.updated_at AS q_updated, q.source AS q_source
  FROM markets m
  LEFT JOIN market_quotes q
    ON q.symbol = m.symbol
   AND q.type = (CASE WHEN m.type='metals' THEN 'commodities' ELSE m.type END)
   AND COALESCE(q.market,'spot') = 'spot'
  WHERE m.status='active'
")->fetchAll(PDO::FETCH_ASSOC) ?: [];

$inserted = 0;
$skipped = 0;
foreach ($rows as $row) {
  $quote = [
    'price' => (float)($row['q_price'] ?? 0),
    'change_pct' => (float)($row['q_change'] ?? 0),
    'updated_at' => (int)($row['q_updated'] ?? 0),
    'source' => (string)($row['q_source'] ?? ''),
    'market' => (string)($row['q_market'] ?? 'spot'),
  ];
  $tick = tick_build_from_quote_row($row, $quote);
  if (!$tick) { $skipped++; continue; }
  if (tick_store_insert($tick)) $inserted++; else $skipped++;
}

$keep = (int)env('MARKET_TICKS_KEEP_SEC', (string)(14 * 86400));
$keep = max(3600, min(90 * 86400, $keep));
$cut = time() - $keep;
try { $pdo->prepare('DELETE FROM market_ticks WHERE ts < ?')->execute([$cut]); } catch (Throwable $e) {}

$payload = ['ok' => true, 'inserted' => $inserted, 'skipped' => $skipped, 'ts' => time()];
try { tp_status_write('market_ingest', $payload); } catch (Throwable $e) {}
try { tp_log('cron','INFO','market_ingest', $payload); } catch (Throwable $e) {}
echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
