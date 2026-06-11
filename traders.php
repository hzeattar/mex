<?php
// Avalon Copy Trading API - قائمة متداولي Avalon
require_once __DIR__ . '/api/lib/common.php';
header('Content-Type: application/json; charset=utf-8');

$uid = require_auth();
$pdo = db();

try {
  $mode = isset($_GET['mode']) ? strtolower(trim($_GET['mode'])) : 'real';
  $mode = in_array($mode, ['real', 'demo']) ? $mode : 'real';
  
  $featured = isset($_GET['featured']) ? (int)$_GET['featured'] : 0;
  $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
  
  // جلب المتداولين النشطين
  $sql = "SELECT 
    id, trader_code, display_name, avatar_url,
    win_rate, total_return, monthly_return, max_drawdown, sharpe_ratio,
    followers_count, active_copies, total_trades,
    strategy, strategy_desc, risk_level,
    markets, assets,
    min_copy_amount, max_copy_amount, leverage_max,
    is_featured, is_ai,
    started_at, last_trade_at,
    DATEDIFF(NOW(), started_at) as active_days
  FROM avalon_traders 
  WHERE is_active = 1";
  
  if ($featured) {
    $sql .= " AND is_featured = 1";
  }
  
  $sql .= " ORDER BY is_featured DESC, followers_count DESC, total_return DESC 
            LIMIT ?";
  
  $st = $pdo->prepare($sql);
  $st->execute([$limit]);
  $traders = $st->fetchAll(PDO::FETCH_ASSOC);
  
  // جلب الإشارات النشطة لكل متداول
  foreach ($traders as &$trader) {
    $st2 = $pdo->prepare("SELECT 
      id, symbol, side, type,
      entry_price, target_price, stop_loss, current_price,
      size, leverage, confidence,
      pnl_percent, pnl_usd,
      opened_at, expires_at,
      copy_count
    FROM avalon_signals 
    WHERE trader_id = ? AND status = 'active'
    ORDER BY opened_at DESC
    LIMIT 5");
    $st2->execute([$trader['id']]);
    $trader['active_signals'] = $st2->fetchAll(PDO::FETCH_ASSOC);
    
    // هل المستخدم ينسخ هذا المتداول؟
    $st3 = $pdo->prepare("SELECT id, amount, is_active FROM avalon_copy_relations 
                            WHERE user_id = ? AND trader_id = ?");
    $st3->execute([$uid, $trader['id']]);
    $copy = $st3->fetch(PDO::FETCH_ASSOC);
    $trader['user_copy'] = $copy ?: null;
  }
  
  json_response(['ok' => true, 'traders' => $traders, 'mode' => $mode]);
  
} catch (Exception $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()]);
}
