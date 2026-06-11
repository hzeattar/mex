<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function tick_stream_recent(string $symbol, int $fromTs, int $toTs): array {
  $pdo = db();
  $symbol = strtoupper(trim($symbol));
  $cols = ['ts','price','COALESCE(volume,0) AS volume'];
  if (function_exists('schema_column_exists') && schema_column_exists($pdo, 'market_ticks', 'source', db_driver())) {
    $cols[] = 'source';
  } else {
    $cols[] = "'' AS source";
  }
  $sql = "SELECT " . implode(',', $cols) . " FROM market_ticks WHERE symbol=? AND ts>=? AND ts<=? ORDER BY ts ASC";
  $st = $pdo->prepare($sql);
  $st->execute([$symbol, $fromTs, $toTs]);
  return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}
