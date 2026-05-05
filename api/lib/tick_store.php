<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function tick_store_columns(): array {
  static $cols = null;
  if ($cols !== null) return $cols;
  $pdo = db();
  $drv = db_driver();
  $has = static function(string $col) use ($pdo, $drv): bool {
    return function_exists('schema_column_exists') ? schema_column_exists($pdo, 'market_ticks', $col, $drv) : false;
  };
  $cols = [
    'type' => $has('type'),
    'market' => $has('market'),
    'source' => $has('source'),
    'as_of' => $has('as_of'),
  ];
  return $cols;
}

function tick_store_insert(array $tick): bool {
  $pdo = db();
  $cols = ['symbol','price','volume','ts'];
  $vals = [
    strtoupper((string)$tick['symbol']),
    (float)$tick['price'],
    (float)($tick['volume'] ?? 0),
    (int)$tick['ts'],
  ];
  $flags = tick_store_columns();
  if (!empty($flags['type'])) { $cols[] = 'type'; $vals[] = strtolower((string)$tick['type']); }
  if (!empty($flags['market'])) { $cols[] = 'market'; $vals[] = strtolower((string)$tick['market']); }
  if (!empty($flags['source'])) { $cols[] = 'source'; $vals[] = strtolower((string)$tick['source']); }
  if (!empty($flags['as_of'])) { $cols[] = 'as_of'; $vals[] = (int)$tick['ts']; }
  $ph = implode(',', array_fill(0, count($cols), '?'));
  $sql = 'INSERT INTO market_ticks(' . implode(',', $cols) . ') VALUES(' . $ph . ')';
  try {
    $pdo->prepare($sql)->execute($vals);
    return true;
  } catch (Throwable $e) {
    return false;
  }
}
