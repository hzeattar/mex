<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

function user_notifications_ensure_schema(?PDO $pdo = null): void {
  static $done = [];
  $pdo = $pdo ?: db();
  $driver = db_driver();
  $key = spl_object_id($pdo) . ':' . $driver;
  if (isset($done[$key])) return;

  if ($driver === 'mysql') {
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      kind VARCHAR(40) NOT NULL DEFAULT 'info',
      ref_type VARCHAR(40) NOT NULL DEFAULT '',
      ref_id VARCHAR(64) NOT NULL DEFAULT '',
      title VARCHAR(190) NOT NULL DEFAULT '',
      message TEXT NULL,
      url TEXT NULL,
      read_at INT NOT NULL DEFAULT 0,
      created_at INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_user_created (user_id, created_at),
      KEY idx_user_read (user_id, read_at),
      KEY idx_ref (ref_type, ref_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } else {
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'info',
      ref_type TEXT NOT NULL DEFAULT '',
      ref_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      message TEXT NULL,
      url TEXT NULL,
      read_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications(user_id, created_at)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, read_at)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_notifications_ref ON user_notifications(ref_type, ref_id)");
  }

  $done[$key] = true;
}

function user_notification_locale(int $userId, ?PDO $pdo = null): string {
  $pdo = $pdo ?: db();
  try {
    $st = $pdo->prepare('SELECT locale FROM users WHERE id=? LIMIT 1');
    $st->execute([$userId]);
    $locale = strtolower((string)($st->fetchColumn() ?: 'en'));
    return in_array($locale, ['en', 'ar', 'ru'], true) ? $locale : 'en';
  } catch (Throwable $e) {
    return 'en';
  }
}

function user_notify(int $userId, string $kind, string $title, string $message = '', string $url = '#/wallet?action=history', string $refType = '', string $refId = '', ?int $createdAt = null): void {
  if ($userId <= 0 || trim($title) === '') return;
  $pdo = db();
  try {
    user_notifications_ensure_schema($pdo);
    $st = $pdo->prepare('INSERT INTO user_notifications(user_id,kind,ref_type,ref_id,title,message,url,read_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    $st->execute([
      $userId,
      substr(trim($kind) ?: 'info', 0, 40),
      substr(trim($refType), 0, 40),
      substr(trim($refId), 0, 64),
      substr(trim($title), 0, 190),
      trim($message),
      trim($url) ?: '#/wallet?action=history',
      0,
      $createdAt ?: time(),
    ]);
  } catch (Throwable $e) {
    error_log('[user_notifications] insert failed: ' . $e->getMessage());
  }
}

function user_notify_funding_status(int $userId, string $flow, float $amount, string $currency, string $status, int $refId = 0): void {
  $flow = strtolower(trim($flow));
  $status = strtolower(trim($status));
  $currency = strtoupper(trim($currency ?: 'USDT'));
  $locale = user_notification_locale($userId);
  $amountText = number_format($amount, 2, '.', '');

  $labels = [
    'en' => [
      'deposit.pending' => 'Deposit request received',
      'deposit.requested' => 'Deposit request received',
      'deposit.confirmed' => 'Deposit confirmed',
      'deposit.failed' => 'Deposit failed',
      'deposit.cancelled' => 'Deposit cancelled',
      'withdrawal.requested' => 'Withdrawal request received',
      'withdrawal.pending' => 'Withdrawal request received',
      'withdrawal.approved' => 'Withdrawal approved',
      'withdrawal.rejected' => 'Withdrawal rejected',
      'withdrawal.completed' => 'Withdrawal completed',
    ],
    'ar' => [
      'deposit.pending' => "\u{062A}\u{0645} \u{0627}\u{0633}\u{062A}\u{0644}\u{0627}\u{0645} \u{0637}\u{0644}\u{0628} \u{0627}\u{0644}\u{0625}\u{064A}\u{062F}\u{0627}\u{0639}",
      'deposit.requested' => "\u{062A}\u{0645} \u{0627}\u{0633}\u{062A}\u{0644}\u{0627}\u{0645} \u{0637}\u{0644}\u{0628} \u{0627}\u{0644}\u{0625}\u{064A}\u{062F}\u{0627}\u{0639}",
      'deposit.confirmed' => "\u{062A}\u{0645} \u{062A}\u{0623}\u{0643}\u{064A}\u{062F} \u{0627}\u{0644}\u{0625}\u{064A}\u{062F}\u{0627}\u{0639}",
      'deposit.failed' => "\u{0641}\u{0634}\u{0644} \u{0637}\u{0644}\u{0628} \u{0627}\u{0644}\u{0625}\u{064A}\u{062F}\u{0627}\u{0639}",
      'deposit.cancelled' => "\u{062A}\u{0645} \u{0625}\u{0644}\u{063A}\u{0627}\u{0621} \u{0627}\u{0644}\u{0625}\u{064A}\u{062F}\u{0627}\u{0639}",
      'withdrawal.requested' => "\u{062A}\u{0645} \u{0627}\u{0633}\u{062A}\u{0644}\u{0627}\u{0645} \u{0637}\u{0644}\u{0628} \u{0627}\u{0644}\u{0633}\u{062D}\u{0628}",
      'withdrawal.pending' => "\u{062A}\u{0645} \u{0627}\u{0633}\u{062A}\u{0644}\u{0627}\u{0645} \u{0637}\u{0644}\u{0628} \u{0627}\u{0644}\u{0633}\u{062D}\u{0628}",
      'withdrawal.approved' => "\u{062A}\u{0645}\u{062A} \u{0627}\u{0644}\u{0645}\u{0648}\u{0627}\u{0641}\u{0642}\u{0629} \u{0639}\u{0644}\u{0649} \u{0627}\u{0644}\u{0633}\u{062D}\u{0628}",
      'withdrawal.rejected' => "\u{062A}\u{0645} \u{0631}\u{0641}\u{0636} \u{0627}\u{0644}\u{0633}\u{062D}\u{0628}",
      'withdrawal.completed' => "\u{062A}\u{0645} \u{062A}\u{0646}\u{0641}\u{064A}\u{0630} \u{0627}\u{0644}\u{0633}\u{062D}\u{0628}",
    ],
    'ru' => [
      'deposit.pending' => 'Deposit request received',
      'deposit.requested' => 'Deposit request received',
      'deposit.confirmed' => 'Deposit confirmed',
      'deposit.failed' => 'Deposit failed',
      'deposit.cancelled' => 'Deposit cancelled',
      'withdrawal.requested' => 'Withdrawal request received',
      'withdrawal.pending' => 'Withdrawal request received',
      'withdrawal.approved' => 'Withdrawal approved',
      'withdrawal.rejected' => 'Withdrawal rejected',
      'withdrawal.completed' => 'Withdrawal completed',
    ],
  ];

  $refType = $flow === 'withdrawal' ? 'withdrawal' : 'deposit';
  $key = $refType . '.' . $status;
  $title = $labels[$locale][$key] ?? $labels['en'][$key] ?? ucfirst($refType) . ' updated';
  $message = $title . ': ' . $amountText . ' ' . $currency;
  user_notify($userId, $refType, $title, $message, '#/wallet?action=history', $refType, $refId > 0 ? (string)$refId : '');
}

// ─── Trade close notification ─────────────────────────────────────────────────
function user_notify_trade_close(int $userId, string $symbol, float $pnl, string $currency = 'USD', string $reason = 'manual', int $positionId = 0): void {
  $locale = user_notification_locale($userId);
  $pnlText = ($pnl >= 0 ? '+' : '') . number_format(abs($pnl), 2, '.', '') . ' ' . strtoupper($currency);
  $titles = [
    'en' => ['manual' => 'Trade closed', 'sl' => 'Stop Loss triggered', 'sl_hit' => 'Stop Loss triggered', 'tp' => 'Take Profit reached', 'tp_hit' => 'Take Profit reached', 'liquidation' => 'Position liquidated'],
    'ar' => ['manual' => 'تم إغلاق الصفقة', 'sl' => 'تفعّل وقف الخسارة', 'sl_hit' => 'تفعّل وقف الخسارة', 'tp' => 'تم الوصول لجني الأرباح', 'tp_hit' => 'تم الوصول لجني الأرباح', 'liquidation' => 'تم تصفية الصفقة'],
    'ru' => ['manual' => 'Позиция закрыта', 'sl' => 'Стоп-лосс сработал', 'sl_hit' => 'Стоп-лосс сработал', 'tp' => 'Тейк-профит достигнут', 'tp_hit' => 'Тейк-профит достигнут', 'liquidation' => 'Позиция ликвидирована'],
  ];
  $key = in_array($reason, ['sl', 'tp', 'liquidation', 'sl_hit', 'tp_hit', 'manual'], true) ? $reason : 'manual';
  $title = $titles[$locale][$key] ?? $titles['en'][$key] ?? 'Trade closed';
  $kind = match(true) {
    $reason === 'liquidation' => 'danger',
    in_array($reason, ['sl', 'sl_hit'], true) || $pnl < 0 => 'warning',
    default => 'success',
  };
  user_notify($userId, $kind, $title, $symbol . ': ' . $pnlText, '#/portfolio', 'position', $positionId > 0 ? (string)$positionId : '');
}

// ─── KYC status notification ──────────────────────────────────────────────────
function user_notify_kyc(int $userId, string $status, string $adminNote = ''): void {
  $locale = user_notification_locale($userId);
  $titles = ['en' => ['pending' => 'KYC submitted — under review', 'approved' => 'KYC approved ✓', 'rejected' => 'KYC requires action'], 'ar' => ['pending' => 'تم إرسال التحقق — قيد المراجعة', 'approved' => 'تمت الموافقة على التحقق ✓', 'rejected' => 'التحقق يحتاج تصحيح'], 'ru' => ['pending' => 'KYC отправлен — на рассмотрении', 'approved' => 'KYC одобрен ✓', 'rejected' => 'KYC требует действий']];
  $kinds = ['pending' => 'info', 'approved' => 'success', 'rejected' => 'warning'];
  $status = strtolower(trim($status));
  $title = $titles[$locale][$status] ?? $titles['en'][$status] ?? 'KYC updated';
  user_notify($userId, $kinds[$status] ?? 'info', $title, $adminNote ?: $title, '#/kyc', 'kyc', $status);
}

// ─── Margin warning notification ──────────────────────────────────────────────
function user_notify_margin_warning(int $userId, string $symbol, float $marginRatio, int $positionId = 0): void {
  $locale = user_notification_locale($userId);
  $pct = round($marginRatio * 100, 1);
  $titles = ['en' => 'Margin warning', 'ar' => 'تحذير الهامش', 'ru' => 'Предупреждение о марже'];
  $msgs   = ['en' => "{$symbol}: Margin at {$pct}% — position at risk of liquidation", 'ar' => "{$symbol}: الهامش عند {$pct}% — الصفقة قريبة من التصفية", 'ru' => "{$symbol}: Маржа {$pct}% — позиция под угрозой ликвидации"];
  user_notify($userId, 'warning', $titles[$locale] ?? $titles['en'], $msgs[$locale] ?? $msgs['en'], '#/portfolio', 'position', (string)$positionId);
}
