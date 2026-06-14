<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/quotes.php';
require_once __DIR__ . '/ledger.php';
require_once __DIR__ . '/risk.php';
require_once __DIR__ . '/trade_mode.php';
require_once __DIR__ . '/affiliates.php';
require_once __DIR__ . '/quote_snapshot.php';

class TradeCloseException extends RuntimeException {
  public int $httpStatus;
  public string $publicCode;
  public array $context;

  public function __construct(string $message, int $httpStatus = 500, string $publicCode = 'close_failed', array $context = []) {
    parent::__construct($message);
    $this->httpStatus = $httpStatus;
    $this->publicCode = $publicCode;
    $this->context = $context;
  }
}

function trade_close_strip_symbol_prefix(string $symbol): string {
  if (str_starts_with($symbol, '@R@') || str_starts_with($symbol, '@D@')) return substr($symbol, 3);
  return $symbol;
}

function trade_close_already_closed_response(PDO $pdo, int $uid, int $positionId): ?array {
  $st = $pdo->prepare("SELECT id,pnl_usd,limit_price,fill_price,closed_at FROM orders WHERE user_id=? AND position_id=? AND status='closed' ORDER BY id DESC LIMIT 1");
  $st->execute([$uid, $positionId]);
  $o = $st->fetch(PDO::FETCH_ASSOC);
  if (!$o) return null;

  $pnlUsd = (float)($o['pnl_usd'] ?? 0);
  $exitPx = (float)($o['limit_price'] ?? 0);
  if (!($exitPx > 0)) $exitPx = (float)($o['fill_price'] ?? 0);
  $closedAt = (int)($o['closed_at'] ?? 0);

  return [
    'ok' => true,
    'exit_price' => $exitPx,
    'pnl_usd' => $pnlUsd,
    'closed_qty' => 0,
    'remaining_qty' => 0,
    'order_id' => (int)($o['id'] ?? 0) ?: null,
    'closed' => [
      'position_id' => $positionId,
      'close_price' => $exitPx,
      'pnl_usd' => $pnlUsd,
      'roe_pct' => null,
      'remaining_qty' => 0,
      'order_id' => (int)($o['id'] ?? 0) ?: null,
      'closed_at' => $closedAt > 0 ? $closedAt : null,
    ],
    'note' => 'already_closed',
  ];
}

function trade_close_cache_max_age(string $assetType): int {
  $assetType = function_exists('vp_normalize_asset_type') ? vp_normalize_asset_type($assetType) : strtolower($assetType);
  $default = 90;
  try {
    if (function_exists('vp_provider_asset_type') && vp_provider_asset_type($assetType) !== 'crypto' && function_exists('quote_live_provider_max_age')) {
      $default = quote_live_provider_max_age($assetType);
    }
  } catch (Throwable $e) {
    $default = 90;
  }
  $age = (int)env('CLOSE_QUOTE_MAX_AGE', (string)$default);
  return max(10, min(1800, $age));
}

function trade_close_quote_asset_type(string $symbol, string $assetType): string {
  $symbol = strtoupper(trim($symbol));
  $type = function_exists('vp_normalize_asset_type') ? vp_normalize_asset_type($assetType) : strtolower(trim($assetType));
  if ($type === '') $type = 'crypto';

  // Crypto perpetual positions may be stored as futures/perp while their quote source is Binance crypto.
  if (($type === 'futures' || $type === 'perp') && preg_match('/^[A-Z0-9]{2,24}USDT$/', $symbol)) {
    return 'crypto';
  }

  return $type;
}

function trade_close_cached_price(string $symbol, string $assetType, string $marketType): ?array {
  $symbol = strtoupper(trim($symbol));
  if ($symbol === '') return null;
  $assetType = function_exists('vp_normalize_asset_type') ? vp_normalize_asset_type($assetType) : strtolower($assetType);
  $marketType = strtolower(trim($marketType ?: 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';

  try {
    $q = quote_get($symbol, $assetType, $marketType);
  } catch (Throwable $e) {
    $q = null;
  }
  if (!is_array($q)) return null;

  $source = strtolower(trim((string)($q['source'] ?? $q['provider'] ?? '')));
  if (function_exists('quote_source_is_untrusted') && quote_source_is_untrusted($source)) return null;
  if (function_exists('quote_source_blocked_for_symbol') && quote_source_blocked_for_symbol($symbol, $assetType, $source)) return null;

  $price = 0.0;
  if ($marketType === 'perp') {
    $price = (float)($q['mark_price'] ?? 0);
    if (!($price > 0)) $price = (float)($q['price'] ?? 0);
  } else {
    $price = (float)($q['price'] ?? 0);
  }
  if (!($price > 0)) return null;

  $now = time();
  $ts = function_exists('quote_row_provider_ts') ? quote_row_provider_ts($q, 0) : (int)($q['updated_at'] ?? 0);
  if ($ts <= 0) $ts = (int)($q['updated_at'] ?? 0);
  $age = $ts > 0 ? max(0, $now - $ts) : 999999;
  if ($age > trade_close_cache_max_age($assetType)) return null;

  return [
    'price' => $price,
    'source' => $source !== '' ? $source : 'cache',
    'age_sec' => $age,
    'cached' => true,
  ];
}

function trade_close_resolve_price(string $symbol, string $assetType, string $marketType, string $mode = 'demo', string $positionSide = 'BUY', float $clientPrice = 0.0): array {
  $symbol = strtoupper(trim($symbol));
  $marketType = strtolower(trim($marketType ?: 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';
  $quoteAssetType = trade_close_quote_asset_type($symbol, $assetType);
  $mode = strtolower(trim($mode)) === 'real' ? 'real' : 'demo';
  $positionSide = strtoupper(trim($positionSide));
  $closeSide = $positionSide === 'SELL' ? 'BUY' : 'SELL';

  $snapshot = qs_snapshot($symbol, $quoteAssetType, $marketType, ['mode' => 'execution']);
  if (!empty($snapshot['execution_allowed'])) {
    return trade_close_snapshot_result($snapshot, $closeSide);
  }
  if ($mode === 'real') {
    $refreshed = trade_close_try_refresh_execution_snapshot($symbol, $assetType, $quoteAssetType, $marketType, $closeSide);
    if ($refreshed) return $refreshed;
    throw new TradeCloseException('Live executable price unavailable. Please wait for the quote to refresh.', 409, 'price_not_executable', [
      'symbol' => $symbol,
      'asset_type' => $assetType,
      'quote_asset_type' => $quoteAssetType,
      'market_type' => $marketType,
      'quote' => qs_public_item($snapshot),
    ]);
  }
  if ((float)($snapshot['price'] ?? 0) > 0) {
    return [
      'price' => (float)($snapshot['price'] ?? 0),
      'source' => (string)($snapshot['source'] ?? 'display_snapshot'),
      'age_sec' => isset($snapshot['age_sec']) ? (int)$snapshot['age_sec'] : 0,
      'cached' => true,
      'snapshot' => qs_meta($snapshot),
    ];
  }

  $cached = trade_close_cached_price($symbol, $quoteAssetType, $marketType);
  if ($cached && (float)$cached['price'] > 0) return $cached;

  if ($marketType === 'perp') {
    $spotCached = trade_close_cached_price($symbol, $quoteAssetType, 'spot');
    if ($spotCached && (float)$spotCached['price'] > 0) {
      $spotCached['source'] = trim((string)($spotCached['source'] ?? 'cache')) . '_spot_fallback';
      return $spotCached;
    }
  }

  $attempts = [[$marketType, $quoteAssetType]];
  if ($marketType !== 'spot') $attempts[] = ['spot', $quoteAssetType];
  if ($quoteAssetType !== $assetType) $attempts[] = [$marketType, $assetType ?: 'crypto'];

  $errors = [];
  foreach ($attempts as [$attemptMarket, $attemptAsset]) {
    try {
      $live = (float)quote_price($symbol, $attemptMarket ?: 'spot', $attemptAsset ?: 'crypto');
      if ($live > 0) {
        $fallbackSnapshot = qs_snapshot_from_row($symbol, $attemptAsset ?: 'crypto', $attemptMarket ?: 'spot', [
          'symbol' => $symbol,
          'type' => $attemptAsset ?: 'crypto',
          'market' => $attemptMarket ?: 'spot',
          'price' => $live,
          'change_pct' => 0,
          'updated_at' => time(),
          'source' => 'demo_live_fallback',
        ], ['mode' => 'display']);
        return [
          'price' => $live,
          'source' => $attemptMarket === $marketType ? 'live' : 'live_' . $attemptMarket . '_fallback',
          'age_sec' => 0,
          'cached' => false,
          'snapshot' => qs_meta($fallbackSnapshot),
        ];
      }
    } catch (Throwable $e) {
      $errors[] = $attemptMarket . '/' . $attemptAsset . ': ' . $e->getMessage();
    }
  }

  try {
    $bulk = quote_bulk_live([$symbol], $quoteAssetType ?: 'crypto', [], ['ttl' => 1, 'persist' => true]);
    $row = is_array($bulk[$symbol] ?? null) ? $bulk[$symbol] : null;
    $bulkPrice = (float)($row['price'] ?? 0);
    if ($bulkPrice > 0) {
      return [
        'price' => $bulkPrice,
        'source' => (string)($row['source'] ?? 'bulk_live'),
        'age_sec' => 0,
        'cached' => false,
        'snapshot' => qs_meta(qs_snapshot_from_row($symbol, $quoteAssetType ?: 'crypto', $marketType, $row, ['mode' => 'display'])),
      ];
    }
  } catch (Throwable $e) {
    $errors[] = 'bulk/' . $quoteAssetType . ': ' . $e->getMessage();
  }

  if ($errors) {
    try {
      tp_log('trade', 'WARN', 'close_price_unavailable', [
        'symbol' => $symbol,
        'asset_type' => $assetType,
        'quote_asset_type' => $quoteAssetType,
        'market_type' => $marketType,
        'errors' => $errors,
      ]);
    } catch (Throwable $ignored) {}
    error_log('[trade_close] price unavailable for ' . $symbol . ': ' . implode(' | ', $errors));
  }

  // Last resort: use client-supplied price for demo mode (safe — no real funds at risk)
  if ($clientPrice > 0 && $mode !== 'real') {
    return [
      'price' => $clientPrice,
      'source' => 'client_fallback',
      'age_sec' => 0,
      'cached' => false,
    ];
  }

  throw new TradeCloseException('Price unavailable. Please wait for the live quote to refresh.', 409, 'price_unavailable', [
    'symbol' => $symbol,
    'asset_type' => $assetType,
    'quote_asset_type' => $quoteAssetType,
    'market_type' => $marketType,
  ]);
}

function trade_close_snapshot_result(array $snapshot, string $closeSide): array {
  return [
    'price' => qs_execution_price($snapshot, $closeSide),
    'source' => (string)($snapshot['source'] ?? 'quote_snapshot'),
    'age_sec' => (int)($snapshot['age_sec'] ?? 0),
    'cached' => false,
    'snapshot' => qs_meta($snapshot),
  ];
}

function trade_close_try_refresh_execution_snapshot(string $symbol, string $assetType, string $quoteAssetType, string $marketType, string $closeSide): ?array {
  $attempts = [[$marketType, $quoteAssetType]];
  if ($marketType !== 'spot') $attempts[] = ['spot', $quoteAssetType];
  if ($quoteAssetType !== $assetType) $attempts[] = [$marketType, $assetType ?: 'crypto'];

  foreach ($attempts as [$attemptMarket, $attemptAsset]) {
    try {
      $live = (float)quote_price($symbol, $attemptMarket ?: 'spot', $attemptAsset ?: 'crypto');
      if ($live <= 0) continue;
      $snapshot = qs_snapshot($symbol, $quoteAssetType, $marketType, ['mode' => 'execution']);
      if (!empty($snapshot['execution_allowed'])) return trade_close_snapshot_result($snapshot, $closeSide);
    } catch (Throwable $e) {}
  }

  try {
    quote_bulk_live([$symbol], $quoteAssetType ?: 'crypto', [], ['ttl' => 1, 'persist' => true]);
    $snapshot = qs_snapshot($symbol, $quoteAssetType, $marketType, ['mode' => 'execution']);
    if (!empty($snapshot['execution_allowed'])) return trade_close_snapshot_result($snapshot, $closeSide);
  } catch (Throwable $e) {}

  return null;
}

function trade_close_position(PDO $pdo, int $uid, int $positionId, array $opts = []): array {
  if ($positionId <= 0) {
    throw new TradeCloseException('Invalid position id', 422, 'invalid_position_id');
  }

  $stmt = $pdo->prepare('SELECT * FROM positions WHERE id=? AND user_id=? LIMIT 1');
  $stmt->execute([$positionId, $uid]);
  $prePos = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$prePos) {
    $already = trade_close_already_closed_response($pdo, $uid, $positionId);
    if ($already) return $already;
    throw new TradeCloseException('Position not found', 404, 'position_not_found');
  }

  $symbolDb = (string)$prePos['symbol'];
  $symbolUi = strtoupper(trade_close_strip_symbol_prefix($symbolDb));
  $assetType = (string)($prePos['asset_type'] ?? 'crypto');
  $marketType = strtolower((string)($prePos['market_type'] ?? 'spot'));
  if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';
  $preMode = str_starts_with($symbolDb, '@R@') ? 'real' : 'demo';
  $preSide = strtoupper((string)($prePos['side'] ?? 'BUY'));

  $clientPrice = (float)($opts['client_price'] ?? 0);
  $priceInfo = trade_close_resolve_price($symbolUi, $assetType, $marketType, $preMode, $preSide, $clientPrice);
  $mark = (float)$priceInfo['price'];

  $qtyClose = (float)($opts['qty'] ?? 0);
  $closeReason = strtolower(trim((string)($opts['reason'] ?? 'manual')));
  if ($closeReason === '' || !preg_match('/^[a-z0-9_]{1,16}$/', $closeReason)) $closeReason = 'manual';

  $pdo->beginTransaction();
  try {
    if (db_driver() === 'mysql') {
      $stmt = $pdo->prepare('SELECT * FROM positions WHERE id=? AND user_id=? FOR UPDATE');
    } else {
      $stmt = $pdo->prepare('SELECT * FROM positions WHERE id=? AND user_id=?');
    }
    $stmt->execute([$positionId, $uid]);
    $pos = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$pos) {
      $pdo->commit();
      $already = trade_close_already_closed_response($pdo, $uid, $positionId);
      if ($already) return $already;
      throw new TradeCloseException('Position not found', 404, 'position_not_found');
    }

    $symbolDb = (string)$pos['symbol'];
    $symbolUi = strtoupper(trade_close_strip_symbol_prefix($symbolDb));
    $mode = str_starts_with($symbolDb, '@R@') ? 'real' : 'demo';
    $assetType = (string)($pos['asset_type'] ?? 'crypto');
    $marketType = strtolower((string)($pos['market_type'] ?? 'spot'));
    if (!in_array($marketType, ['spot','perp'], true)) $marketType = 'spot';
    $side = strtoupper((string)$pos['side']);
    $qty = (float)$pos['qty'];
    $entry = (float)$pos['entry_price'];
    $leverage = (int)($pos['leverage'] ?? 1);
    $marginInitial = (float)($pos['margin_initial'] ?? 0);

    if ($qty <= 0) throw new TradeCloseException('Invalid position', 422, 'invalid_position');
    if ($qtyClose <= 0) $qtyClose = $qty;
    if ($qtyClose - 1e-12 > $qty) throw new TradeCloseException('Close qty exceeds position', 422, 'qty_exceeds_position');

    if ($side === 'BUY') {
      $pnl = ($mark - $entry) * $qtyClose;
    } elseif ($side === 'SELL') {
      $pnl = ($entry - $mark) * $qtyClose;
    } else {
      $side = 'BUY';
      $pnl = ($mark - $entry) * $qtyClose;
    }

    $ratio = $qty > 0 ? ($qtyClose / $qty) : 1.0;
    $openCostTotal = ($marginInitial > 0) ? $marginInitial : ($qty * $entry);
    $openCost = $openCostTotal * $ratio;
    $exitNotional = $qtyClose * $mark;
    $closeFeeRate = trade_fee_rate($marketType, 'MARKET');
    $closeFee = trade_calc_fee($exitNotional, $closeFeeRate);
    $maxLoss = -$openCost;
    if ($pnl < $maxLoss) $pnl = $maxLoss;

    $copySharePct = (float)($pos['copy_profit_share_pct'] ?? 0);
    $copyCommission = ((int)($pos['copied_from_admin'] ?? 0) === 1 && $pnl > 0 && $copySharePct > 0) ? ($pnl * ($copySharePct / 100.0)) : 0.0;
    if ($copyCommission > $pnl) $copyCommission = $pnl;
    $credit = $openCost + $pnl - $copyCommission;

    $demoCur = (string)env('DEMO_CURRENCY', 'USDT_DEMO');
    $realCur = (string)env('REAL_CURRENCY', 'USDT');
    $walletCur = ($mode === 'real') ? $realCur : $demoCur;
    $closedAt = now_ts();

    $w = ensure_wallet($uid, $walletCur);
    $wid = (int)($w['id'] ?? 0);
    if ($wid <= 0) throw new RuntimeException('Bad wallet');
    if (db_driver() === 'mysql') {
      $pdo->prepare('SELECT id FROM wallets WHERE id=? FOR UPDATE')->execute([$wid]);
    }

    ledger_add($uid, $wid, $walletCur, $credit, 'trade_close', 'position', (string)$positionId, [
      'symbol' => $symbolUi,
      'asset_type' => $assetType,
      'side' => $side,
      'qty' => $qtyClose,
      'entry' => $entry,
      'exit' => $mark,
      'pnl' => $pnl,
      'reason' => $closeReason,
      'price_source' => $priceInfo['source'] ?? '',
      'quote_snapshot' => is_array($priceInfo['snapshot'] ?? null) ? $priceInfo['snapshot'] : null,
    ]);

    if ($closeFee > 0) {
      ledger_add($uid, $wid, $walletCur, -$closeFee, 'trade_fee', 'position', (string)$positionId, [
        'symbol' => $symbolUi,
        'market_type' => $marketType,
        'order_type' => 'MARKET',
        'notional' => $exitNotional,
        'fee_rate' => $closeFeeRate,
        'fee' => $closeFee,
      ]);
    }

    if ($copyCommission > 0) {
      $pdo->prepare('INSERT INTO trading_bot_commissions(user_id,subscription_id,signal_id,position_id,pnl_gross,share_pct,amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
          ->execute([$uid, (int)($pos['copy_subscription_id'] ?? 0) ?: null, (int)($pos['source_signal_id'] ?? 0) ?: null, $positionId, $pnl, $copySharePct, $copyCommission, 'pending', $closedAt]);
    }

    $pnlUsd = $pnl - $closeFee;
    $orderMeta = [];
    try {
      $metaSt = $pdo->prepare("SELECT meta FROM orders WHERE user_id=? AND position_id=? AND side <> 'CLOSE' ORDER BY id DESC LIMIT 1");
      $metaSt->execute([$uid, $positionId]);
      $rawMeta = trim((string)($metaSt->fetchColumn() ?: ''));
      if ($rawMeta !== '') {
        $decoded = json_decode($rawMeta, true);
        if (is_array($decoded)) $orderMeta = $decoded;
      }
    } catch (Throwable $ignoredMeta) {}
    $orderMeta['close_reason'] = $closeReason;
    $orderMeta['close_quote_snapshot'] = is_array($priceInfo['snapshot'] ?? null) ? $priceInfo['snapshot'] : null;
    $orderMetaJson = json_encode($orderMeta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $updO = $pdo->prepare("UPDATE orders
      SET status='closed',
          pnl_usd=?,
          close_reason=?,
          closed_at=?,
          fee_paid=COALESCE(fee_paid,0)+?,
          limit_price=CASE WHEN limit_price IS NULL OR limit_price=0 THEN ? ELSE limit_price END,
          meta=?,
          updated_at=?
      WHERE user_id=? AND position_id=? AND side <> 'CLOSE'");
    $updO->execute([$pnlUsd, $closeReason, $closedAt, $closeFee, $mark, $orderMetaJson, $closedAt, $uid, $positionId]);

    if ($updO->rowCount() === 0) {
      $meta = json_encode(['source' => 'trade_close', 'reason' => $closeReason, 'close_quote_snapshot' => is_array($priceInfo['snapshot'] ?? null) ? $priceInfo['snapshot'] : null], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      $o = $pdo->prepare('INSERT INTO orders(user_id,symbol,asset_type,market_type,side,order_type,qty,limit_price,fill_price,usd_amount,tp_price,sl_price,leverage,reduce_only,client_order_id,position_id,pnl_usd,close_reason,closed_at,fee_paid,meta,updated_at,status,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      $o->execute([$uid,$symbolDb,$assetType,$marketType,$side,'MARKET',$qtyClose,$mark,$mark,null,null,null,$leverage,1,null,$positionId,$pnlUsd,$closeReason,$closedAt,$closeFee,$meta,$closedAt,'closed',$closedAt]);
    }

    if ($qtyClose + 1e-12 >= $qty) {
      $newQty = 0.0;
      $pdo->prepare('DELETE FROM positions WHERE id=? AND user_id=?')->execute([$positionId, $uid]);
    } else {
      $newQty = $qty - $qtyClose;
      $newMargin = ($marginInitial > 0) ? ($marginInitial - $openCost) : null;
      $liq = ($marketType === 'perp') ? perp_calc_liquidation_price($entry, $newQty, $side, $leverage) : null;
      $pdo->prepare('UPDATE positions SET qty=?, margin_initial=?, liquidation_price=?, updated_at=? WHERE id=? AND user_id=?')
          ->execute([$newQty, $newMargin, $liq, now_ts(), $positionId, $uid]);
    }

    $pdo->commit();

    try {
      aff_notify_manager_for_user($uid, 'trade_closed', [
        'id' => $positionId,
        'symbol' => $symbolUi,
        'pnl' => number_format($pnlUsd, 2, '.', ''),
        'mode' => $mode,
        'mkt' => $marketType,
        'reason' => $closeReason,
      ]);
    } catch (Throwable $e2) {}

    return [
      'ok' => true,
      'exit_price' => $mark,
      'pnl_usd' => $pnlUsd,
      'closed_qty' => $qtyClose,
      'remaining_qty' => $newQty,
      'order_id' => null,
      'copy_commission_usd' => $copyCommission,
      'price_source' => $priceInfo['source'] ?? null,
      'closed' => [
        'position_id' => $positionId,
        'close_price' => $mark,
        'pnl_usd' => $pnlUsd,
        'roe_pct' => null,
        'remaining_qty' => $newQty,
        'order_id' => null,
        'closed_at' => $closedAt,
      ],
    ];
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($e instanceof TradeCloseException) throw $e;
    throw new TradeCloseException($e->getMessage() ?: 'Close failed', 500, 'close_failed');
  }
}
