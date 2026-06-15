<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
  fwrite(STDERR, "CLI only\n");
  exit(1);
}

require_once __DIR__ . '/../api/lib/common.php';
require_once __DIR__ . '/../api/lib/ledger.php';
require_once __DIR__ . '/../api/lib/feature_bootstrap.php';
require_once __DIR__ . '/../api/auth/_common.php';

const SHOWCASE_SEED = 'codex_showcase_seed_v1';
const SHOWCASE_SIGNAL_BASE = 987650000;

function showcase_option(string $name, ?string $default = null): ?string {
  static $opts = null;
  if ($opts === null) {
    $opts = getopt('', [
      'email::',
      'password::',
      'real-balance::',
      'demo-balance::',
      'reset::',
      'reset-password::',
      'dry-run::',
    ]);
    if (!is_array($opts)) $opts = [];
  }
  $value = $opts[$name] ?? null;
  if (is_array($value)) $value = end($value);
  if ($value === false || $value === null || $value === '') return $default;
  return (string)$value;
}

function showcase_bool(?string $value, bool $default = false): bool {
  if ($value === null || $value === '') return $default;
  $value = strtolower(trim($value));
  return in_array($value, ['1', 'true', 'yes', 'y', 'on'], true);
}

function showcase_json_out(array $payload, int $code = 0): void {
  while (ob_get_level() > 0) {
    @ob_end_clean();
  }
  echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
  exit($code);
}

function showcase_columns(PDO $pdo, string $table): array {
  static $cache = [];
  $key = spl_object_id($pdo) . ':' . $table;
  if (isset($cache[$key])) return $cache[$key];
  $driver = db_driver();
  $cols = [];
  if ($driver === 'mysql') {
    $rows = $pdo->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($rows as $row) {
      $field = strtolower((string)($row['Field'] ?? ''));
      if ($field !== '') $cols[$field] = true;
    }
  } else {
    $rows = $pdo->query("PRAGMA table_info({$table})")->fetchAll(PDO::FETCH_ASSOC) ?: [];
    foreach ($rows as $row) {
      $field = strtolower((string)($row['name'] ?? ''));
      if ($field !== '') $cols[$field] = true;
    }
  }
  $cache[$key] = $cols;
  return $cols;
}

function showcase_has_col(PDO $pdo, string $table, string $column): bool {
  $cols = showcase_columns($pdo, $table);
  return isset($cols[strtolower($column)]);
}

function showcase_insert(PDO $pdo, string $table, array $row): int {
  $cols = showcase_columns($pdo, $table);
  $clean = [];
  foreach ($row as $col => $value) {
    if (isset($cols[strtolower((string)$col)])) {
      $clean[(string)$col] = $value;
    }
  }
  if (!$clean) {
    throw new RuntimeException("No insertable columns for {$table}");
  }
  $names = array_keys($clean);
  $sqlCols = implode(',', array_map(static fn(string $col): string => "`{$col}`", $names));
  $ph = implode(',', array_fill(0, count($names), '?'));
  $pdo->prepare("INSERT INTO `{$table}` ({$sqlCols}) VALUES ({$ph})")->execute(array_values($clean));
  return (int)$pdo->lastInsertId();
}

function showcase_update_existing(PDO $pdo, string $table, string $pk, mixed $pkValue, array $data): void {
  $cols = showcase_columns($pdo, $table);
  $sets = [];
  $params = [];
  foreach ($data as $col => $value) {
    if ($col === $pk || !isset($cols[strtolower((string)$col)])) continue;
    $sets[] = "`{$col}`=?";
    $params[] = $value;
  }
  if (!$sets) return;
  $params[] = $pkValue;
  $pdo->prepare("UPDATE `{$table}` SET " . implode(',', $sets) . " WHERE `{$pk}`=?")->execute($params);
}

function showcase_upsert_plan(PDO $pdo, array $row): void {
  $id = (string)($row['id'] ?? '');
  if ($id === '') return;
  $st = $pdo->prepare('SELECT id FROM invest_plans WHERE id=? LIMIT 1');
  $st->execute([$id]);
  if ($st->fetchColumn()) {
    showcase_update_existing($pdo, 'invest_plans', 'id', $id, $row);
    return;
  }
  showcase_insert($pdo, 'invest_plans', $row);
}

function showcase_seed_meta(array $extra = []): array {
  return ['source' => SHOWCASE_SEED, 'seeded_at' => time()] + $extra;
}

function showcase_recompute_wallet(PDO $pdo, int $uid, string $currency): void {
  $currency = strtoupper($currency);
  $w = ensure_wallet($uid, $currency);
  $wid = (int)($w['id'] ?? 0);
  if ($wid <= 0) return;
  $st = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE wallet_id=?');
  $st->execute([$wid]);
  $sum = (float)($st->fetchColumn() ?: 0);
  try {
    $pdo->prepare('UPDATE wallets SET balance_cache=?, updated_at=? WHERE id=?')->execute([$sum, time(), $wid]);
    wallet_cache_balance_set($uid, $currency, $sum);
  } catch (Throwable $e) {}
}

function showcase_fetch_user(PDO $pdo, string $email): ?array {
  $st = $pdo->prepare('SELECT * FROM users WHERE email=? LIMIT 1');
  $st->execute([$email]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function showcase_ensure_user(PDO $pdo, string $email, string $password, bool $resetPassword): array {
  $now = now_ts();
  $row = showcase_fetch_user($pdo, $email);
  if ($row) {
    $updates = ['updated_at' => $now];
    if (showcase_has_col($pdo, 'users', 'account_status')) $updates['account_status'] = 'active';
    if ($resetPassword && showcase_has_col($pdo, 'users', 'password_hash')) {
      $updates['password_hash'] = password_hash($password, PASSWORD_BCRYPT);
    }
    showcase_update_existing($pdo, 'users', 'id', (int)$row['id'], $updates);
    $row = showcase_fetch_user($pdo, $email) ?: $row;
    auth_ensure_platform_user((int)$row['id'], ['email' => $email]);
    return ['row' => $row, 'created' => false, 'password_reset' => $resetPassword];
  }

  $display = 'Trader Mixgroup';
  $uid = showcase_insert($pdo, 'users', [
    'email' => $email,
    'password_hash' => password_hash($password, PASSWORD_BCRYPT),
    'first_name' => 'Trader',
    'last_name' => 'Mixgroup',
    'display_name' => $display,
    'locale' => 'ar',
    'account_status' => 'active',
    'login_provider' => 'web',
    'country_code' => 'AE',
    'country_name' => 'United Arab Emirates',
    'phone_dial_code' => '+971',
    'phone_number' => '501234567',
    'phone_e164' => '+971501234567',
    'birth_date' => '1990-01-15',
    'created_at' => $now,
    'updated_at' => $now,
    'last_login_at' => $now,
  ]);
  auth_ensure_platform_user($uid, ['email' => $email]);
  $row = showcase_fetch_user($pdo, $email);
  if (!$row) throw new RuntimeException('Failed to create showcase user');
  return ['row' => $row, 'created' => true, 'password_reset' => true];
}

function showcase_cleanup(PDO $pdo, int $uid, array $currencies): array {
  $counts = [];
  $exec = static function(string $key, PDOStatement $stmt, array $params) use (&$counts): void {
    $stmt->execute($params);
    $counts[$key] = ($counts[$key] ?? 0) + $stmt->rowCount();
  };

  if (schema_table_exists($pdo, 'investment_accruals', db_driver()) && schema_table_exists($pdo, 'investments', db_driver())) {
    $ids = [];
    $st = $pdo->prepare("SELECT id FROM investments WHERE user_id=? AND plan_id LIKE 'showcase_%'");
    $st->execute([$uid]);
    foreach (($st->fetchAll(PDO::FETCH_COLUMN) ?: []) as $id) {
      $ids[] = (int)$id;
    }
    if ($ids) {
      $ph = implode(',', array_fill(0, count($ids), '?'));
      $stmt = $pdo->prepare("DELETE FROM investment_accruals WHERE investment_id IN ({$ph})");
      $stmt->execute($ids);
      $counts['investment_accruals'] = $stmt->rowCount();
    }
  }

  $deleteSpecs = [
    ['ledger_entries', "user_id=? AND ref_type='showcase_seed'", [$uid]],
    ['holds', "user_id=? AND reason='showcase_seed'", [$uid]],
    ['deposits', "user_id=? AND external_ref LIKE 'SHOWCASE-%'", [$uid]],
    ['withdrawals', "user_id=? AND admin_note=?", [$uid, SHOWCASE_SEED]],
    ['orders', "user_id=? AND client_order_id LIKE 'showcase-%'", [$uid]],
    ['positions', "user_id=? AND source_signal_id>=? AND source_signal_id<?", [$uid, SHOWCASE_SIGNAL_BASE, SHOWCASE_SIGNAL_BASE + 10000]],
    ['investments', "user_id=? AND plan_id LIKE 'showcase_%'", [$uid]],
    ['trading_bot_subscriptions', "user_id=? AND signal_id>=? AND signal_id<?", [$uid, SHOWCASE_SIGNAL_BASE, SHOWCASE_SIGNAL_BASE + 10000]],
    ['trading_bot_commissions', "user_id=? AND signal_id>=? AND signal_id<?", [$uid, SHOWCASE_SIGNAL_BASE, SHOWCASE_SIGNAL_BASE + 10000]],
  ];

  foreach ($deleteSpecs as [$table, $where, $params]) {
    try {
      if (!schema_table_exists($pdo, (string)$table, db_driver())) continue;
      if ($table === 'orders' && !showcase_has_col($pdo, 'orders', 'client_order_id')) continue;
      if ($table === 'positions' && !showcase_has_col($pdo, 'positions', 'source_signal_id')) continue;
      if ($table === 'withdrawals' && !showcase_has_col($pdo, 'withdrawals', 'admin_note')) continue;
      $exec((string)$table, $pdo->prepare("DELETE FROM {$table} WHERE {$where}"), $params);
    } catch (Throwable $e) {
      $counts[(string)$table . '_error'] = $e->getMessage();
    }
  }

  foreach ($currencies as $currency) {
    showcase_recompute_wallet($pdo, $uid, (string)$currency);
  }
  return $counts;
}

function showcase_ledger(PDO $pdo, int $uid, string $currency, float $amount, string $type, string $refId, int $createdAt, array $meta = []): int {
  return ledger_add($uid, strtoupper($currency), $amount, $type, 'showcase_seed', $refId, showcase_seed_meta($meta), $createdAt);
}

function showcase_deposit(PDO $pdo, int $uid, string $currency, string $provider, string $methodCode, float $amount, string $status, int $createdAt, ?int $confirmedAt): int {
  $ref = 'SHOWCASE-DEP-' . strtoupper(substr(sha1($provider . $methodCode . $amount . $createdAt), 0, 10));
  return showcase_insert($pdo, 'deposits', [
    'user_id' => $uid,
    'provider' => $provider,
    'method_code' => $methodCode,
    'currency' => strtoupper($currency),
    'amount' => $amount,
    'status' => $status,
    'external_ref' => $ref,
    'details_json' => json_encode(showcase_seed_meta([
      'method_code' => $methodCode,
      'showcase_ref' => $ref,
      'network' => str_contains($methodCode, 'trc20') ? 'TRC20' : null,
    ]), JSON_UNESCAPED_SLASHES),
    'admin_note' => SHOWCASE_SEED,
    'created_at' => $createdAt,
    'updated_at' => $confirmedAt ?: ($createdAt + 3600),
    'confirmed_at' => $confirmedAt,
  ]);
}

function showcase_withdrawal(PDO $pdo, int $uid, string $currency, string $method, float $amount, string $status, int $createdAt, ?int $completedAt, ?int $holdId = null): int {
  return showcase_insert($pdo, 'withdrawals', [
    'user_id' => $uid,
    'method' => $method,
    'currency' => strtoupper($currency),
    'amount' => $amount,
    'status' => $status,
    'destination_enc' => base64_encode(json_encode(['source' => SHOWCASE_SEED, 'method' => $method], JSON_UNESCAPED_SLASHES)),
    'details_json' => json_encode(showcase_seed_meta(['method' => $method]), JSON_UNESCAPED_SLASHES),
    'hold_id' => $holdId,
    'risk_score' => $status === 'requested' ? 22 : 8,
    'admin_note' => SHOWCASE_SEED,
    'created_at' => $createdAt,
    'updated_at' => $completedAt ?: ($createdAt + 1800),
    'completed_at' => $completedAt,
  ]);
}

function showcase_hold(PDO $pdo, int $uid, string $currency, float $amount, int $createdAt): int {
  $w = ensure_wallet($uid, strtoupper($currency));
  return showcase_insert($pdo, 'holds', [
    'user_id' => $uid,
    'wallet_id' => (int)($w['id'] ?? 0),
    'currency' => strtoupper($currency),
    'amount' => $amount,
    'reason' => 'showcase_seed',
    'status' => 'active',
    'expires_at' => time() + 86400 * 14,
    'created_at' => $createdAt,
    'updated_at' => $createdAt,
  ]);
}

function showcase_position(PDO $pdo, int $uid, string $symbol, string $assetType, string $marketType, string $side, float $qty, float $entry, int $leverage, float $margin, ?float $tp, ?float $sl, int $openedAt, string $status = 'open', ?int $closedAt = null, int $signalOffset = 1, bool $copy = false): int {
  $liq = null;
  if ($marketType === 'perp' && function_exists('perp_calc_liquidation_price')) {
    try { $liq = perp_calc_liquidation_price($entry, $qty, $side, $leverage); } catch (Throwable $e) { $liq = null; }
  }
  return showcase_insert($pdo, 'positions', [
    'user_id' => $uid,
    'symbol' => $symbol,
    'asset_type' => $assetType,
    'market_type' => $marketType,
    'side' => $side,
    'qty' => $qty,
    'entry_price' => $entry,
    'leverage' => $leverage,
    'margin_mode' => $marketType === 'perp' ? 'isolated' : 'cash',
    'margin_initial' => $margin,
    'fees_paid' => round($margin * 0.001, 8),
    'liquidation_price' => $liq,
    'tp_price' => $tp,
    'sl_price' => $sl,
    'unrealized_pnl_usd' => 0,
    'source_signal_id' => SHOWCASE_SIGNAL_BASE + $signalOffset,
    'copy_subscription_id' => $copy ? (SHOWCASE_SIGNAL_BASE + $signalOffset) : null,
    'copy_profit_share_pct' => $copy ? 12.5 : 0,
    'copied_from_admin' => $copy ? 1 : 0,
    'opened_at' => $openedAt,
    'updated_at' => $closedAt ?: time(),
    'closed_at' => $closedAt,
    'status' => $status,
  ]);
}

function showcase_order(PDO $pdo, array $row, array $meta = []): int {
  $row['meta'] = json_encode(showcase_seed_meta($meta), JSON_UNESCAPED_SLASHES);
  return showcase_insert($pdo, 'orders', $row);
}

function showcase_open_trade(PDO $pdo, int $uid, string $currency, string $mode, string $symbol, string $asset, string $market, string $side, float $qty, float $entry, int $lev, float $margin, ?float $tp, ?float $sl, int $openedAt, int $signalOffset, bool $copy = false): array {
  $storedSymbol = $mode === 'real' ? '@R@' . $symbol : $symbol;
  $pid = showcase_position($pdo, $uid, $storedSymbol, $asset, $market, $side, $qty, $entry, $lev, $margin, $tp, $sl, $openedAt, 'open', null, $signalOffset, $copy);
  $fee = round(max($margin, $qty * $entry) * 0.0008, 8);
  $oid = showcase_order($pdo, [
    'user_id' => $uid,
    'symbol' => $storedSymbol,
    'asset_type' => $asset,
    'market_type' => $market,
    'side' => $side,
    'order_type' => 'MARKET',
    'qty' => $qty,
    'limit_price' => null,
    'fill_price' => $entry,
    'usd_amount' => $margin,
    'tp_price' => $tp,
    'sl_price' => $sl,
    'leverage' => $lev,
    'reduce_only' => 0,
    'client_order_id' => 'showcase-' . $mode . '-open-' . strtolower($symbol) . '-' . $signalOffset,
    'position_id' => $pid,
    'fee_paid' => $fee,
    'status' => 'filled',
    'created_at' => $openedAt,
    'updated_at' => $openedAt,
  ], ['mode' => $mode, 'symbol' => $symbol, 'position_id' => $pid, 'copy' => $copy]);
  showcase_ledger($pdo, $uid, $currency, -$margin, 'trade_open', 'OPEN-' . $oid, $openedAt, ['mode' => $mode, 'symbol' => $symbol, 'asset_type' => $asset]);
  if ($fee > 0) showcase_ledger($pdo, $uid, $currency, -$fee, 'trade_fee', 'FEE-' . $oid, $openedAt + 3, ['mode' => $mode, 'symbol' => $symbol]);
  return ['position_id' => $pid, 'order_id' => $oid];
}

function showcase_closed_trade(PDO $pdo, int $uid, string $currency, string $mode, string $symbol, string $asset, string $market, string $side, float $qty, float $entry, float $exit, int $lev, float $margin, float $pnl, int $openedAt, int $closedAt, string $reason, int $signalOffset): array {
  $storedSymbol = $mode === 'real' ? '@R@' . $symbol : $symbol;
  $pid = showcase_position($pdo, $uid, $storedSymbol, $asset, $market, $side, $qty, $entry, $lev, $margin, null, null, $openedAt, 'closed', $closedAt, $signalOffset, false);
  $feeOpen = round(max($margin, $qty * $entry) * 0.0008, 8);
  $feeClose = round(max($margin, $qty * $exit) * 0.0008, 8);
  $openId = showcase_order($pdo, [
    'user_id' => $uid,
    'symbol' => $storedSymbol,
    'asset_type' => $asset,
    'market_type' => $market,
    'side' => $side,
    'order_type' => 'MARKET',
    'qty' => $qty,
    'limit_price' => null,
    'fill_price' => $entry,
    'usd_amount' => $margin,
    'leverage' => $lev,
    'reduce_only' => 0,
    'client_order_id' => 'showcase-' . $mode . '-open-closed-' . strtolower($symbol) . '-' . $signalOffset,
    'position_id' => $pid,
    'pnl_usd' => $pnl,
    'close_reason' => $reason,
    'closed_at' => $closedAt,
    'fee_paid' => $feeOpen,
    'status' => 'closed',
    'created_at' => $openedAt,
    'updated_at' => $closedAt,
  ], ['mode' => $mode, 'symbol' => $symbol, 'position_id' => $pid]);
  $closeId = showcase_order($pdo, [
    'user_id' => $uid,
    'symbol' => $storedSymbol,
    'asset_type' => $asset,
    'market_type' => $market,
    'side' => 'CLOSE',
    'order_type' => 'CLOSE',
    'qty' => $qty,
    'limit_price' => $exit,
    'fill_price' => $entry,
    'usd_amount' => $margin,
    'leverage' => $lev,
    'reduce_only' => 1,
    'client_order_id' => 'showcase-' . $mode . '-close-' . strtolower($symbol) . '-' . $signalOffset,
    'position_id' => $pid,
    'pnl_usd' => $pnl,
    'close_reason' => $reason,
    'closed_at' => $closedAt,
    'fee_paid' => $feeClose,
    'status' => 'closed',
    'created_at' => $closedAt,
    'updated_at' => $closedAt,
  ], ['mode' => $mode, 'symbol' => $symbol, 'position_id' => $pid, 'exit_price' => $exit]);
  showcase_ledger($pdo, $uid, $currency, -$margin, 'trade_open', 'OPEN-' . $openId, $openedAt, ['mode' => $mode, 'symbol' => $symbol]);
  showcase_ledger($pdo, $uid, $currency, -$feeOpen, 'trade_fee', 'FEE-' . $openId, $openedAt + 3, ['mode' => $mode, 'symbol' => $symbol]);
  showcase_ledger($pdo, $uid, $currency, $margin + $pnl, 'trade_close', 'CLOSE-' . $closeId, $closedAt, ['mode' => $mode, 'symbol' => $symbol, 'pnl' => $pnl]);
  showcase_ledger($pdo, $uid, $currency, -$feeClose, 'trade_fee', 'FEE-' . $closeId, $closedAt + 3, ['mode' => $mode, 'symbol' => $symbol]);
  return ['position_id' => $pid, 'open_order_id' => $openId, 'close_order_id' => $closeId];
}

function showcase_pending_order(PDO $pdo, int $uid, string $mode, string $symbol, string $asset, string $market, string $side, float $qty, float $limit, int $lev, int $createdAt): int {
  $storedSymbol = $mode === 'real' ? '@R@' . $symbol : $symbol;
  return showcase_order($pdo, [
    'user_id' => $uid,
    'symbol' => $storedSymbol,
    'asset_type' => $asset,
    'market_type' => $market,
    'side' => $side,
    'order_type' => 'LIMIT',
    'qty' => $qty,
    'limit_price' => $limit,
    'fill_price' => null,
    'usd_amount' => round($qty * $limit / max(1, $lev), 8),
    'leverage' => $lev,
    'reduce_only' => 0,
    'client_order_id' => 'showcase-' . $mode . '-pending-' . strtolower($symbol),
    'position_id' => null,
    'fee_paid' => 0,
    'status' => 'open',
    'created_at' => $createdAt,
    'updated_at' => $createdAt,
  ], ['mode' => $mode, 'symbol' => $symbol, 'pending' => true]);
}

try {
  $email = strtolower(trim((string)showcase_option('email', 'trader@mixgroup.com')));
  $password = (string)showcase_option('password', 'Trader@2026');
  $targetReal = max(0.0, (float)showcase_option('real-balance', '250000'));
  $targetDemo = max(0.0, (float)showcase_option('demo-balance', '100000'));
  $reset = showcase_bool(showcase_option('reset', '1'), true);
  $resetPassword = showcase_bool(showcase_option('reset-password', '0'), false);
  $dryRun = showcase_bool(showcase_option('dry-run', '0'), false);

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    throw new InvalidArgumentException('Invalid email');
  }

  $pdo = db();
  $driver = db_driver();
  schema_install($pdo, $driver);
  schema_upgrade($pdo, $driver);
  schema_seed_defaults($pdo, $driver);
  vp_feature_bootstrap($pdo, $driver);

  $realCur = strtoupper((string)env('REAL_CURRENCY', 'USDT'));
  $demoCur = strtoupper((string)env('DEMO_CURRENCY', 'USDT_DEMO'));
  $userInfo = showcase_ensure_user($pdo, $email, $password, $resetPassword);
  $uid = (int)($userInfo['row']['id'] ?? 0);
  if ($uid <= 0) throw new RuntimeException('User id not found');

  if ($dryRun) {
    showcase_json_out([
      'ok' => true,
      'dry_run' => true,
      'user_id' => $uid,
      'email' => $email,
      'driver' => $driver,
      'real_currency' => $realCur,
      'demo_currency' => $demoCur,
    ]);
  }

  $summary = [
    'cleanup' => [],
    'deposits' => 0,
    'withdrawals' => 0,
    'holds' => 0,
    'orders' => 0,
    'positions' => 0,
    'investments' => 0,
    'ledger_entries' => 0,
    'plans' => 0,
  ];

  if ($reset) {
    $summary['cleanup'] = showcase_cleanup($pdo, $uid, [$realCur, $demoCur]);
  }

  $now = time();

  $plans = [
    [
      'id' => 'showcase_growth_90',
      'name' => 'Showcase Growth 90',
      'name_en' => 'Showcase Growth 90',
      'name_ar' => 'Showcase Growth 90',
      'name_ru' => 'Showcase Growth 90',
      'term_days' => 90,
      'roi_percent' => 18,
      'min_amount' => 500,
      'max_amount' => 50000,
      'risk' => 'balanced',
      'payout_schedule' => 'monthly',
      'early_exit_allowed' => 1,
      'early_exit_penalty_percent' => 2,
      'sort_order' => 9901,
      'status' => 'inactive',
      'product_kind' => 'plan',
      'is_perpetual' => 0,
      'cycle_roi_percent' => 0,
      'created_at' => $now,
      'updated_at' => $now,
    ],
    [
      'id' => 'showcase_contract_vip',
      'name' => 'Showcase VIP Contract',
      'name_en' => 'Showcase VIP Contract',
      'name_ar' => 'Showcase VIP Contract',
      'name_ru' => 'Showcase VIP Contract',
      'term_days' => 30,
      'roi_percent' => 12,
      'min_amount' => 1000,
      'max_amount' => 100000,
      'risk' => 'advanced',
      'payout_schedule' => 'end',
      'early_exit_allowed' => 0,
      'early_exit_penalty_percent' => 0,
      'sort_order' => 9902,
      'status' => 'inactive',
      'product_kind' => 'contract',
      'is_perpetual' => 0,
      'cycle_roi_percent' => 0,
      'created_at' => $now,
      'updated_at' => $now,
    ],
  ];
  foreach ($plans as $plan) {
    showcase_upsert_plan($pdo, $plan);
    $summary['plans']++;
  }

  $depositRows = [
    [$realCur, 'stripe', 'visa_mastercard', 50000.00, 'confirmed', $now - 86400 * 18, $now - 86400 * 18 + 2200],
    [$realCur, 'crypto', 'usdt_trc20', 75000.00, 'confirmed', $now - 86400 * 12, $now - 86400 * 12 + 1800],
    [$realCur, 'bank', 'bank_wire', 42000.00, 'confirmed', $now - 86400 * 7, $now - 86400 * 7 + 3600],
    [$realCur, 'bank', 'bank_wire', 18000.00, 'pending', $now - 86400, null],
    [$realCur, 'stripe', 'visa_mastercard', 2500.00, 'failed', $now - 86400 * 5, null],
  ];
  foreach ($depositRows as [$cur, $provider, $method, $amount, $status, $created, $confirmed]) {
    $depId = showcase_deposit($pdo, $uid, $cur, $provider, $method, (float)$amount, $status, (int)$created, $confirmed ? (int)$confirmed : null);
    $summary['deposits']++;
    if ($status === 'confirmed') {
      showcase_ledger($pdo, $uid, $cur, (float)$amount, 'deposit', 'DEP-' . $depId, (int)($confirmed ?: $created), ['provider' => $provider, 'method' => $method]);
      $summary['ledger_entries']++;
      $bonus = round((float)$amount * 0.10, 2);
      if ($bonus > 0) {
        showcase_ledger($pdo, $uid, $cur, $bonus, 'deposit_bonus', 'BONUS-' . $depId, (int)($confirmed ?: $created) + 30, ['deposit_id' => $depId, 'bonus_pct' => 10]);
        $summary['ledger_entries']++;
      }
    }
  }

  $holdId = showcase_hold($pdo, $uid, $realCur, 3500.00, $now - 3600 * 8);
  $summary['holds']++;
  $withdrawRows = [
    [$realCur, 'bank_wire', 12000.00, 'completed', $now - 86400 * 4, $now - 86400 * 4 + 5400, null],
    [$realCur, 'usdt_trc20', 3500.00, 'requested', $now - 3600 * 8, null, $holdId],
    [$realCur, 'visa_mastercard', 900.00, 'rejected', $now - 86400 * 9, null, null],
  ];
  foreach ($withdrawRows as [$cur, $method, $amount, $status, $created, $completed, $rowHoldId]) {
    $wdId = showcase_withdrawal($pdo, $uid, $cur, $method, (float)$amount, $status, (int)$created, $completed ? (int)$completed : null, $rowHoldId ? (int)$rowHoldId : null);
    $summary['withdrawals']++;
    if ($status === 'completed') {
      showcase_ledger($pdo, $uid, $cur, -(float)$amount, 'withdrawal', 'WD-' . $wdId, (int)($completed ?: $created), ['method' => $method]);
      $summary['ledger_entries']++;
    }
  }

  $openTrades = [
    [$realCur, 'real', 'BTCUSDT', 'crypto', 'spot', 'BUY', 0.42, 94350.00, 1, 39627.00, 109800.00, 88000.00, $now - 86400 * 6, 11, false],
    [$realCur, 'real', 'AAPL', 'stocks', 'spot', 'BUY', 38.0, 191.25, 1, 7267.50, 226.00, 178.00, $now - 86400 * 5, 12, false],
    [$realCur, 'real', 'EURUSD', 'forex', 'spot', 'SELL', 26000.0, 1.0890, 1, 28314.00, 1.0610, 1.1030, $now - 86400 * 3, 13, true],
    [$demoCur, 'demo', 'ETHUSDT', 'crypto', 'perp', 'BUY', 5.0, 3420.00, 5, 3420.00, 3900.00, 3180.00, $now - 86400 * 2, 21, false],
    [$demoCur, 'demo', 'TSLA', 'stocks', 'spot', 'SELL', 20.0, 184.30, 1, 3686.00, 165.00, 196.00, $now - 3600 * 18, 22, false],
  ];
  foreach ($openTrades as $trade) {
    showcase_open_trade($pdo, $uid, ...$trade);
    $summary['orders']++;
    $summary['positions']++;
    $summary['ledger_entries'] += 2;
  }

  $closedTrades = [
    [$realCur, 'real', 'XAUUSD', 'commodities', 'spot', 'BUY', 8.0, 2320.00, 2388.00, 1, 18560.00, 544.00, $now - 86400 * 21, $now - 86400 * 17, 'take_profit', 31],
    [$realCur, 'real', 'MSFT', 'stocks', 'spot', 'SELL', 16.0, 428.00, 410.50, 1, 6848.00, 280.00, $now - 86400 * 16, $now - 86400 * 11, 'manual', 32],
    [$realCur, 'real', 'BTCUSDT', 'crypto', 'perp', 'BUY', 0.18, 88000.00, 91050.00, 4, 3960.00, 549.00, $now - 86400 * 10, $now - 86400 * 8, 'take_profit', 33],
    [$realCur, 'real', 'GBPUSD', 'forex', 'spot', 'BUY', 18000.0, 1.2740, 1.2630, 1, 22932.00, -198.00, $now - 86400 * 8, $now - 86400 * 6, 'stop_loss', 34],
    [$demoCur, 'demo', 'BTCUSDT', 'crypto', 'spot', 'SELL', 0.25, 101400.00, 98500.00, 1, 25350.00, 725.00, $now - 86400 * 9, $now - 86400 * 7, 'take_profit', 41],
    [$demoCur, 'demo', 'NVDA', 'stocks', 'spot', 'BUY', 45.0, 122.00, 118.50, 1, 5490.00, -157.50, $now - 86400 * 5, $now - 86400 * 3, 'manual', 42],
  ];
  foreach ($closedTrades as $trade) {
    showcase_closed_trade($pdo, $uid, ...$trade);
    $summary['orders'] += 2;
    $summary['positions']++;
    $summary['ledger_entries'] += 4;
  }

  showcase_pending_order($pdo, $uid, 'real', 'BTCUSDT', 'crypto', 'spot', 'BUY', 0.12, 101500.00, 1, $now - 3600 * 5);
  showcase_pending_order($pdo, $uid, 'real', 'AAPL', 'stocks', 'spot', 'SELL', 12.0, 231.00, 1, $now - 3600 * 4);
  showcase_pending_order($pdo, $uid, 'demo', 'ETHUSDT', 'crypto', 'perp', 'SELL', 2.4, 3880.00, 5, $now - 3600 * 3);
  $summary['orders'] += 3;

  $inv1Debit = showcase_ledger($pdo, $uid, $realCur, -10000.00, 'invest_subscribe', 'INV-showcase_growth_90', $now - 86400 * 14, ['plan_id' => 'showcase_growth_90']);
  $inv1 = showcase_insert($pdo, 'investments', [
    'user_id' => $uid,
    'plan_id' => 'showcase_growth_90',
    'amount' => 10000.00,
    'expected_return' => 11800.00,
    'debit_ledger_id' => $inv1Debit,
    'payout_schedule' => 'monthly',
    'last_accrual_at' => $now - 86400 * 2,
    'paid_total' => 480.00,
    'status' => 'active',
    'product_kind' => 'plan',
    'is_perpetual' => 0,
    'cycle_roi_percent' => 0,
    'start_at' => $now - 86400 * 14,
    'end_at' => $now + 86400 * 76,
    'created_at' => $now - 86400 * 14,
  ]);
  $acc1 = showcase_ledger($pdo, $uid, $realCur, 480.00, 'invest_accrual', 'INV-ACC-' . $inv1, $now - 86400 * 2, ['investment_id' => $inv1]);
  showcase_insert($pdo, 'investment_accruals', [
    'investment_id' => $inv1,
    'user_id' => $uid,
    'amount' => 480.00,
    'ledger_id' => $acc1,
    'run_at' => $now - 86400 * 2,
    'created_at' => $now - 86400 * 2,
  ]);
  $summary['investments']++;
  $summary['ledger_entries'] += 2;

  $inv2Debit = showcase_ledger($pdo, $uid, $realCur, -20000.00, 'contract_subscribe', 'INV-showcase_contract_vip', $now - 86400 * 40, ['plan_id' => 'showcase_contract_vip']);
  $inv2Payout = showcase_ledger($pdo, $uid, $realCur, 24000.00, 'invest_payout', 'INV-PAYOUT-showcase_contract_vip', $now - 86400 * 10, ['plan_id' => 'showcase_contract_vip']);
  showcase_insert($pdo, 'investments', [
    'user_id' => $uid,
    'plan_id' => 'showcase_contract_vip',
    'amount' => 20000.00,
    'expected_return' => 24000.00,
    'debit_ledger_id' => $inv2Debit,
    'payout_ledger_id' => $inv2Payout,
    'payout_schedule' => 'end',
    'last_accrual_at' => $now - 86400 * 10,
    'paid_total' => 24000.00,
    'status' => 'completed',
    'product_kind' => 'contract',
    'is_perpetual' => 0,
    'cycle_roi_percent' => 0,
    'start_at' => $now - 86400 * 40,
    'end_at' => $now - 86400 * 10,
    'created_at' => $now - 86400 * 40,
  ]);
  $summary['investments']++;
  $summary['ledger_entries'] += 2;

  showcase_insert($pdo, 'trading_bot_subscriptions', [
    'user_id' => $uid,
    'signal_id' => SHOWCASE_SIGNAL_BASE + 13,
    'mode' => 'real',
    'currency' => $realCur,
    'reserved_amount' => 5000.00,
    'hold_id' => null,
    'lock_until' => $now + 86400 * 3,
    'profit_share_pct' => 12.5,
    'leverage' => 1,
    'status' => 'copied',
    'copied_position_id' => null,
    'entry_price_snapshot' => 1.0890,
    'created_at' => $now - 86400 * 3,
    'updated_at' => $now - 86400 * 3,
  ]);

  foreach ([[$realCur, $targetReal], [$demoCur, $targetDemo]] as [$currency, $target]) {
    $current = wallet_available($uid, (string)$currency);
    $available = (float)($current['available'] ?? 0);
    if ($available < (float)$target) {
      $topUp = round((float)$target - $available, 8);
      showcase_ledger($pdo, $uid, (string)$currency, $topUp, 'showcase_balance_topup', 'TOPUP-' . $currency, $now, ['target_available' => (float)$target]);
      $summary['ledger_entries']++;
    }
    showcase_recompute_wallet($pdo, $uid, (string)$currency);
  }

  $realWallet = wallet_available($uid, $realCur);
  $demoWallet = wallet_available($uid, $demoCur);

  showcase_json_out([
    'ok' => true,
    'seed' => SHOWCASE_SEED,
    'driver' => $driver,
    'email' => $email,
    'user_id' => $uid,
    'user_created' => (bool)($userInfo['created'] ?? false),
    'password_reset' => (bool)($userInfo['password_reset'] ?? false),
    'currencies' => ['real' => $realCur, 'demo' => $demoCur],
    'wallet' => [
      'real' => $realWallet,
      'demo' => $demoWallet,
    ],
    'summary' => $summary,
  ]);
} catch (Throwable $e) {
  showcase_json_out([
    'ok' => false,
    'error' => $e->getMessage(),
    'type' => get_class($e),
  ], 1);
}
