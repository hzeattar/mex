<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function wallet_cache_key(int $userId, string $currency): string {
  return $userId . '|' . strtoupper(trim($currency ?: 'USDT'));
}

function wallet_cache_get(int $userId, string $currency): ?array {
  $key = wallet_cache_key($userId, $currency);
  $cache = $GLOBALS['__wallet_cache'] ?? [];
  return isset($cache[$key]) && is_array($cache[$key]) ? $cache[$key] : null;
}

function wallet_cache_store(int $userId, string $currency, array $row): array {
  $key = wallet_cache_key($userId, $currency);
  if (!isset($GLOBALS['__wallet_cache']) || !is_array($GLOBALS['__wallet_cache'])) {
    $GLOBALS['__wallet_cache'] = [];
  }
  $GLOBALS['__wallet_cache'][$key] = $row;
  return $row;
}

function wallet_cache_balance_set(int $userId, string $currency, float $balance): void {
  $key = wallet_cache_key($userId, $currency);
  if (!isset($GLOBALS['__wallet_cache'][$key]) || !is_array($GLOBALS['__wallet_cache'][$key])) return;
  $GLOBALS['__wallet_cache'][$key]['balance_cache'] = $balance;
  $GLOBALS['__wallet_cache'][$key]['updated_at'] = time();
}

function wallet_cache_balance_add(int $userId, string $currency, float $amount): void {
  $key = wallet_cache_key($userId, $currency);
  if (!isset($GLOBALS['__wallet_cache'][$key]) || !is_array($GLOBALS['__wallet_cache'][$key])) return;
  $current = $GLOBALS['__wallet_cache'][$key]['balance_cache'] ?? null;
  if (is_numeric($current)) {
    $GLOBALS['__wallet_cache'][$key]['balance_cache'] = (float)$current + $amount;
    $GLOBALS['__wallet_cache'][$key]['updated_at'] = time();
  }
}

function ensure_wallet(int $userId, string $currency = 'USDT'): array {
  $pdo = db();
  $drv = db_driver();

  if ($userId <= 0) {
    throw new RuntimeException('Failed to ensure wallet: invalid user');
  }

  $currency = strtoupper(trim($currency ?: 'USDT'));
  $cached = wallet_cache_get($userId, $currency);
  if ($cached) return $cached;
  $now = time();

  // Column-detection (support legacy DBs that used `asset` instead of `currency`)
  static $walletCols = null;
  if ($walletCols === null) {
    $walletCols = [
      'currency' => false,
      'asset' => false,
      'balance' => false,
      'balance_cache' => false,
      'available_cache' => false,
      'updated_at' => false,
    ];
    try {
      if ($drv === 'sqlite') {
        $rows = $pdo->query("PRAGMA table_info(wallets)")->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as $r) { $walletCols[(string)($r['name'] ?? '')] = true; }
      } else {
        $dbName = (string)env('DB_NAME','');
        if ($dbName !== '') {
          $st = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='wallets'");
          $st->execute([$dbName]);
          $rows = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
          foreach ($rows as $c) { $walletCols[(string)$c] = true; }
        } else {
          // Best-effort fallback
          $st = $pdo->query("SHOW COLUMNS FROM wallets");
          $rows = $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
          foreach ($rows as $r) { $walletCols[(string)($r['Field'] ?? '')] = true; }
        }
      }
    } catch (Throwable $e) {
      // If detection fails, assume the modern schema.
      $walletCols['currency'] = true;
      $walletCols['balance_cache'] = true;
      $walletCols['updated_at'] = true;
    }
  }

  $keyCol = $walletCols['currency'] ? 'currency' : ($walletCols['asset'] ? 'asset' : 'currency');

  // 1) fetch if exists
  $st = $pdo->prepare("SELECT * FROM wallets WHERE user_id=? AND {$keyCol}=? LIMIT 1");
  $st->execute([$userId, $currency]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if ($row) return wallet_cache_store($userId, $currency, $row);

  // 2) insert idempotent (sqlite/mysql)
  $cols = ['user_id'];
  $vals = [$userId];

  // store in all supported key columns if present
  if ($walletCols['currency']) { $cols[] = 'currency'; $vals[] = $currency; }
  if ($walletCols['asset'])    { $cols[] = 'asset';    $vals[] = $currency; }
  if (!$walletCols['currency'] && !$walletCols['asset']) { $cols[] = $keyCol; $vals[] = $currency; }

  if ($walletCols['balance'])        { $cols[] = 'balance';        $vals[] = 0; }
  if ($walletCols['balance_cache'])  { $cols[] = 'balance_cache';  $vals[] = 0; }
  if ($walletCols['available_cache']){ $cols[] = 'available_cache';$vals[] = 0; }
  if ($walletCols['updated_at'])     { $cols[] = 'updated_at';     $vals[] = $now; }

  $ph = implode(',', array_fill(0, count($cols), '?'));
  $colSql = implode(',', $cols);
  $sql = ($drv === 'sqlite')
    ? "INSERT OR IGNORE INTO wallets({$colSql}) VALUES({$ph})"
    : "INSERT IGNORE INTO wallets({$colSql}) VALUES({$ph})";
  $pdo->prepare($sql)->execute($vals);

  // 3) fetch again
  $st = $pdo->prepare("SELECT * FROM wallets WHERE user_id=? AND {$keyCol}=? LIMIT 1");
  $st->execute([$userId, $currency]);
  $row = $st->fetch(PDO::FETCH_ASSOC);

  if (!$row) throw new RuntimeException('Failed to ensure wallet');
  return wallet_cache_store($userId, $currency, $row);
}


function ledger_balance(int $user_id, string $currency): float {
  // PERF: use wallets.balance_cache (maintained by ledger_add) instead of summing the full ledger each time.
  $pdo = db();
  $w = ensure_wallet($user_id, $currency);
  $wid = (int)($w['id'] ?? 0);

  $cached = $w['balance_cache'] ?? null;
  if ($cached !== null && is_numeric($cached)) {
    $val = (float)$cached;
    // Fast-path for non-zero cache.
    if (abs($val) > 1e-12) return $val;

    // If cache is 0, it might be real 0 OR legacy wallets created before caching.
    // Cheap check: if there are no ledger rows, it's truly 0.
    try {
      $st = $pdo->prepare('SELECT 1 FROM ledger_entries WHERE wallet_id=? LIMIT 1');
      $st->execute([$wid]);
      $has = (int)($st->fetchColumn() ?: 0);
      if ($has === 0) return 0.0;
    } catch (Throwable $e) {
      // fall through to recompute
    }
  }

  // Fallback: recompute once and store cache.
  $stmt = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE wallet_id=?');
  $stmt->execute([$wid]);
  $sum = (float)($stmt->fetchColumn() ?: 0);

  try {
    $upd = $pdo->prepare('UPDATE wallets SET balance_cache=?, updated_at=? WHERE id=?');
    $upd->execute([$sum, time(), $wid]);
    wallet_cache_balance_set($user_id, $currency, $sum);
  } catch (Throwable $e) {
    // ignore cache write failures
  }

  return $sum;
}

function wallet_balance(int $user_id, string $currency): float {
  // alias لأكواد قديمة
  return ledger_balance($user_id, $currency);
}

function holds_total_active(int $user_id, string $currency): float {
  $pdo = db();
  $w = ensure_wallet($user_id, $currency);
  $now = time();
  $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM holds WHERE wallet_id=? AND status='active' AND (expires_at IS NULL OR expires_at>?)");
  $stmt->execute([$w['id'], $now]);
  return (float)$stmt->fetchColumn();
}

function wallet_available(int $user_id, string $currency): array {
  $bal = ledger_balance($user_id, $currency);
  $hold = holds_total_active($user_id, $currency);
  return ['balance'=>$bal, 'holds'=>$hold, 'available'=>$bal - $hold];
}

/**
 * ✅ Backward-compatible ledger_add
 * Supports BOTH signatures:
 * 1) NEW: ledger_add($userId, $currency, $amount, $type, $refType=null, $refId=null, $meta=[])
 * 2) OLD: ledger_add($userId, $walletIdOrWalletArr, $currency, $amount, $type, $refType=null, $refId=null, $meta=[], $createdAt=null)
 */
function ledger_add(int $user_id, ...$args): int {
  $currency = null;
  $amount = null;
  $type = null;
  $ref_type = null;
  $ref_id = null;
  $meta = [];
  $created_at = null;

  if (count($args) < 3) {
    throw new InvalidArgumentException('ledger_add: not enough arguments');
  }

  // Detect OLD signature: first arg is wallet id (int) OR wallet array
  if (is_int($args[0]) || is_array($args[0])) {
    // OLD: [walletId|walletArr, currency, amount, type, ref_type?, ref_id?, meta?, created_at?]
    $currency = $args[1] ?? null;
    $amount   = $args[2] ?? null;
    $type     = $args[3] ?? null;
    $ref_type = $args[4] ?? null;
    $ref_id   = $args[5] ?? null;
    $meta     = $args[6] ?? [];
    $created_at = $args[7] ?? null;
  } else {
    // NEW: [currency, amount, type, ref_type?, ref_id?, meta?, created_at?]
    $currency = $args[0] ?? null;
    $amount   = $args[1] ?? null;
    $type     = $args[2] ?? null;
    $ref_type = $args[3] ?? null;
    $ref_id   = $args[4] ?? null;
    $meta     = $args[5] ?? [];
    $created_at = $args[6] ?? null;
  }

  $currency = is_string($currency) ? strtoupper(trim($currency)) : '';
  if ($currency === '') throw new InvalidArgumentException('ledger_add: bad currency');

  $amount = (float)$amount;
  $type = is_string($type) ? $type : 'generic';
  $ref_type = $ref_type !== null ? (string)$ref_type : null;
  $ref_id = $ref_id !== null ? (string)$ref_id : null;

  // meta can come as json-string or array
  if (is_string($meta) && $meta !== '') {
    $d = json_decode($meta, true);
    $meta = is_array($d) ? $d : [];
  }
  if (!is_array($meta)) $meta = [];

  $created_at = is_int($created_at) ? $created_at : time();

  $pdo = db();
  $w = ensure_wallet($user_id, $currency);

  $metadata = null;
  if (!empty($meta)) {
    $metadata = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }

  $stmt = $pdo->prepare('INSERT INTO ledger_entries(user_id,wallet_id,currency,amount,type,ref_type,ref_id,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  $stmt->execute([$user_id, $w['id'], $currency, $amount, $type, $ref_type, $ref_id, $metadata, $created_at]);
  $id = (int)$pdo->lastInsertId();

  // PERF: maintain wallets.balance_cache incrementally (no SUM scan).
  try {
    $pdo->prepare('UPDATE wallets SET balance_cache = COALESCE(balance_cache,0) + ?, updated_at=? WHERE id=?')
        ->execute([$amount, time(), (int)$w['id']]);
    wallet_cache_balance_add($user_id, $currency, $amount);
  } catch (Throwable $e) {
    // If cache update fails, fall back to a one-time recompute.
    try {
      $stmt2 = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE wallet_id=?');
      $stmt2->execute([(int)$w['id']]);
      $sum = (float)($stmt2->fetchColumn() ?: 0);
      $pdo->prepare('UPDATE wallets SET balance_cache=?, updated_at=? WHERE id=?')
          ->execute([$sum, time(), (int)$w['id']]);
      wallet_cache_balance_set($user_id, $currency, $sum);
    } catch (Throwable $e2) {
      // ignore
    }
  }

  return $id;
}

// ===================== HOLDS (withdraw reserve) =====================
// Some endpoints (withdrawals + bot submit) reserve funds using holds.
// Earlier builds referenced hold_create/hold_release but didn't implement them.

function hold_create(int $user_id, string $currency, float $amount, string $reason = 'hold', ?int $expires_at = null): int {
  if ($user_id <= 0) throw new InvalidArgumentException('hold_create: invalid user');
  $currency = strtoupper(trim($currency ?: 'USDT'));
  $amount = (float)$amount;
  if (!($amount > 0)) throw new InvalidArgumentException('hold_create: invalid amount');

  $pdo = db();
  $w = ensure_wallet($user_id, $currency);

  // Ensure sufficient available balance
  $avail = wallet_available($user_id, $currency);
  if (($avail['available'] ?? 0) + 1e-9 < $amount) {
    throw new RuntimeException('Insufficient available balance');
  }

  $now = time();
  $stmt = $pdo->prepare('INSERT INTO holds(user_id,wallet_id,currency,amount,reason,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?, ?)');
  $stmt->execute([
    $user_id,
    (int)$w['id'],
    $currency,
    $amount,
    $reason,
    'active',
    $expires_at,
    $now,
    $now,
  ]);
  return (int)$pdo->lastInsertId();
}

function hold_release(int $hold_id, string $status = 'released'): void {
  $hold_id = (int)$hold_id;
  if ($hold_id <= 0) return;
  $status = strtolower(trim($status ?: 'released'));
  if (!in_array($status, ['released','expired','cancelled','canceled','failed'], true)) {
    $status = 'released';
  }
  $pdo = db();
  $pdo->prepare('UPDATE holds SET status=?, updated_at=? WHERE id=?')
      ->execute([$status, time(), $hold_id]);
}

function hold_expire_tick(): int {
  $pdo = db();
  $now = time();
  $st = $pdo->prepare("UPDATE holds SET status='expired', updated_at=? WHERE status='active' AND expires_at IS NOT NULL AND expires_at<=?");
  $st->execute([$now, $now]);
  return (int)$st->rowCount();
}
