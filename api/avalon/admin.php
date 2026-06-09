<?php
// Avalon Admin API - للتحكم من الأدمن
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

// التحقق من صلاحيات الأدمن
$uid = require_auth();
if (!is_admin($uid)) {
  json_response(['ok' => false, 'error' => 'Admin access required'], 403);
}

$pdo = db();
$action = $_GET['action'] ?? '';

try {
  switch ($action) {
    case 'create_trader':
      $body = read_json_body();
      
      $st = $pdo->prepare("INSERT INTO avalon_traders 
        (trader_code, display_name, avatar_url, strategy, strategy_desc, risk_level,
         win_rate, total_return, monthly_return, max_drawdown, sharpe_ratio,
         followers_count, min_copy_amount, max_copy_amount, leverage_max,
         markets, assets, is_featured, is_ai, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      
      $st->execute([
        $body['trader_code'],
        $body['display_name'],
        $body['avatar_url'] ?? '/assets/img/avatars/default_trader.png',
        $body['strategy'],
        $body['strategy_desc'] ?? '',
        $body['risk_level'] ?? 'medium',
        $body['win_rate'] ?? 70,
        $body['total_return'] ?? 100,
        $body['monthly_return'] ?? 10,
        $body['max_drawdown'] ?? 15,
        $body['sharpe_ratio'] ?? 2.0,
        $body['followers_count'] ?? 0,
        $body['min_copy_amount'] ?? 500,
        $body['max_copy_amount'] ?? 50000,
        $body['leverage_max'] ?? 10,
        $body['markets'] ?? 'crypto',
        $body['assets'] ?? 'BTC,ETH',
        $body['is_featured'] ? 1 : 0,
        $body['is_ai'] ? 1 : 1,
        $uid
      ]);
      
      json_response(['ok' => true, 'trader_id' => $pdo->lastInsertId()]);
      break;
      
    case 'update_trader':
      $body = read_json_body();
      $trader_id = (int)$body['trader_id'];
      
      $allowed = ['display_name', 'avatar_url', 'strategy', 'risk_level',
                  'win_rate', 'total_return', 'monthly_return', 'followers_count',
                  'min_copy_amount', 'max_copy_amount', 'leverage_max',
                  'is_active', 'is_featured'];
      
      $sets = [];
      $vals = [];
      foreach ($allowed as $field) {
        if (isset($body[$field])) {
          $sets[] = "$field = ?";
          $vals[] = $body[$field];
        }
      }
      
      if (empty($sets)) {
        json_response(['ok' => false, 'error' => 'No fields to update'], 400);
      }
      
      $vals[] = $trader_id;
      $sql = "UPDATE avalon_traders SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
      $pdo->prepare($sql)->execute($vals);
      
      json_response(['ok' => true]);
      break;
      
    case 'create_signal':
      $body = read_json_body();
      
      $st = $pdo->prepare("INSERT INTO avalon_signals 
        (trader_id, symbol, side, type, entry_price, target_price, stop_loss,
         size, leverage, confidence, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), ?)");
      
      $st->execute([
        $body['trader_id'],
        $body['symbol'],
        $body['side'],
        $body['type'] ?? 'market',
        $body['entry_price'],
        $body['target_price'],
        $body['stop_loss'],
        $body['size'] ?? 0.1,
        $body['leverage'] ?? 10,
        $body['confidence'] ?? 80,
        $body['duration_hours'] ?? 24,
        $uid
      ]);
      
      // تحديث last_trade_at للمتداول
      $pdo->prepare("UPDATE avalon_traders SET last_trade_at = NOW() WHERE id = ?")
         ->execute([$body['trader_id']]);
      
      json_response(['ok' => true, 'signal_id' => $pdo->lastInsertId()]);
      break;
      
    case 'close_signal':
      $body = read_json_body();
      
      $pdo->prepare("UPDATE avalon_signals 
                      SET status = 'closed', 
                          closed_at = NOW(),
                          close_reason = ?,
                          current_price = ?,
                          pnl_percent = ((? - entry_price) / entry_price * 100) * (side = 'BUY' ? 1 : -1)
                      WHERE id = ?")-
003eexecute([
        $body['close_reason'] ?? 'manual',
        $body['exit_price'],
        $body['exit_price'],
        $body['signal_id']
      ]);
      
      json_response(['ok' => true]);
      break;
      
    case 'update_stats':
      // تحديث إحصائيات المتداول
      $body = read_json_body();
      $trader_id = (int)$body['trader_id'];
      
      $pdo->prepare("UPDATE avalon_traders SET
                      win_rate = ?,
                      total_return = ?,
                      monthly_return = ?,
                      followers_count = ?,
                      active_copies = ?,
                      updated_at = NOW()
                      WHERE id = ?")->execute([
        $body['win_rate'],
        $body['total_return'],
        $body['monthly_return'],
        $body['followers_count'],
        $body['active_copies'],
        $trader_id
      ]);
      
      json_response(['ok' => true]);
      break;
      
    case 'list_traders':
      $st = $pdo->query("SELECT * FROM avalon_traders ORDER BY is_featured DESC, followers_count DESC");
      json_response(['ok' => true, 'traders' => $st->fetchAll(PDO::FETCH_ASSOC)]);
      break;
      
    case 'list_signals':
      $st = $pdo->query("SELECT s.*, t.display_name as trader_name 
                           FROM avalon_signals s
                           JOIN avalon_traders t ON s.trader_id = t.id
                           ORDER BY s.opened_at DESC");
      json_response(['ok' => true, 'signals' => $st->fetchAll(PDO::FETCH_ASSOC)]);
      break;
      
    default:
      json_response(['ok' => false, 'error' => 'Unknown action'], 400);
  }
  
} catch (Exception $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()]);
}
