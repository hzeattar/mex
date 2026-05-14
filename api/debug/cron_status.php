<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/common.php';

$key = (string)($_GET['key'] ?? $_GET['token'] ?? '');
$allowed = array_values(array_filter([
  (string)env('DEBUG_KEY',''),
  (string)env('CRON_KEY',''),
  (string)env('INSTALL_KEY',''),
], fn($v)=>$v!==''));
if ($key === '' || !in_array($key, $allowed, true)) {
  json_response(['ok'=>false,'error'=>'Forbidden'], 403);
}

$out = [
  'ok' => true,
  'now' => time(),
  'iso' => date('c'),
  'status' => [
    'quotes_tick' => tp_status_read('quotes_tick'),
    'market_ingest' => tp_status_read('market_ingest'),
    'cache_reset' => tp_status_read('cache_reset'),
  ],
  'market_ticks_count' => 0,
  'market_ticks_summary' => [],
  'latest_quotes' => [],
];

try {
  $pdo = db();
  $out['db_ok'] = true;

  try {
    $out['market_ticks_count'] = (int)($pdo->query("SELECT COUNT(*) FROM market_ticks")->fetchColumn() ?: 0);
    $stmt = $pdo->query("SELECT symbol, MAX(ts) AS last_ts, COUNT(*) AS cnt FROM market_ticks GROUP BY symbol ORDER BY last_ts DESC LIMIT 10");
    $out['market_ticks_summary'] = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
  } catch (Throwable $e) {
    $out['market_ticks_error'] = $e->getMessage();
  }

  try {
    $stmt = $pdo->query("SELECT symbol, type, price, change_pct, source, updated_at FROM market_quotes ORDER BY updated_at DESC LIMIT 10");
    $out['latest_quotes'] = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
  } catch (Throwable $e) {
    $out['latest_quotes_error'] = $e->getMessage();
  }
} catch (Throwable $e) {
  $out['ok'] = false;
  $out['db_ok'] = false;
  $out['error'] = $e->getMessage();
}

json_response($out);