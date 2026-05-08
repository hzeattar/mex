<?php
declare(strict_types=1);

/**
 * Trade mode helpers.
 * We separate demo vs real without heavy schema changes by prefixing symbols in DB.
 * DB symbols:
 *   demo: SYMBOL
 *   real: @R@SYMBOL
 */

function trade_mode_from_request(array $body = null): string {
  $m = '';
  if ($body !== null && isset($body['mode'])) $m = (string)$body['mode'];
  if ($m === '' && isset($_GET['mode'])) $m = (string)$_GET['mode'];
  $m = strtolower(trim($m));
  return $m === 'real' ? 'real' : 'demo';
}

function trade_db_symbol(string $symbol, string $mode): string {
  $symbol = strtoupper(trim($symbol));
  return ($mode === 'real') ? '@R@' . $symbol : $symbol;
}

function trade_ui_symbol(string $dbSymbol): string {
  $dbSymbol = strtoupper(trim($dbSymbol));
  if (str_starts_with($dbSymbol, '@R@')) return substr($dbSymbol, 3);
  return $dbSymbol;
}

function trade_is_real_db_symbol(string $dbSymbol): bool {
  return str_starts_with(strtoupper(trim($dbSymbol)), '@R@');
}


function trade_forced_mode(PDO $pdo, int $userId): ?string {
  if ($userId <= 0) return null;
  try {
    $st = $pdo->prepare('SELECT force_mode FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $mode = strtolower((string)($st->fetchColumn() ?: ''));
    return in_array($mode, ['demo','real'], true) ? $mode : null;
  } catch (Throwable $e) {
    return null;
  }
}

function trade_mode_for_user(PDO $pdo, int $userId, array $body = null): string {
  return trade_forced_mode($pdo, $userId) ?: trade_mode_from_request($body);
}
