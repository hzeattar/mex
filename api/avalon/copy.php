<?php
// Avalon Copy Trading API - نسخ متداول
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

$uid = require_auth();
$pdo = db();

try {
  $body = read_json_body();
  $trader_id = (int)($body['trader_id'] ?? 0);
  $amount = (float)($body['amount'] ?? 0);
  $mode = strtolower(trim($body['mode'] ?? 'real'));
  
  if ($trader_id <= 0 || $amount <= 0) {
    json_response(['ok' => false, 'error' => 'Invalid trader or amount'], 400);
  }
  
  // التحقق من المتداول
  $st = $pdo->prepare("SELECT * FROM avalon_traders WHERE id = ? AND is_active = 1");
  $st->execute([$trader_id]);
  $trader = $st->fetch(PDO::FETCH_ASSOC);
  
  if (!$trader) {
    json_response(['ok' => false, 'error' => 'Trader not found'], 404);
  }
  
  // التحقق من الحدود
  if ($amount < $trader['min_copy_amount'] || $amount > $trader['max_copy_amount']) {
    json_response(['ok' => false, 'error' => 
      "Amount must be between {$trader['min_copy_amount']} and {$trader['max_copy_amount']}"
    ], 400);
  }
  
  // التحقق من الرصيد في الوضع الحقيقي
  if ($mode === 'real') {
    $wallet = wallet_available($uid, 'USDT');
    if ($wallet < $amount) {
      json_response(['ok' => false, 'error' => 'Insufficient balance'], 400);
    }
  }
  
  // التحقق من عدم وجود نسخة سابقة
  $st = $pdo->prepare("SELECT id FROM avalon_copy_relations 
                         WHERE user_id = ? AND trader_id = ? AND is_active = 1");
  $st->execute([$uid, $trader_id]);
  if ($st->fetch()) {
    json_response(['ok' => false, 'error' => 'Already copying this trader'], 409);
  }
  
  // إنشاء علاقة النسخ
  $st = $pdo->prepare("INSERT INTO avalon_copy_relations 
    (user_id, trader_id, amount, started_at) 
    VALUES (?, ?, ?, NOW())");
  $st->execute([$uid, $trader_id, $amount]);
  
  // تحديث عدد المتابعين
  $pdo->prepare("UPDATE avalon_traders 
                  SET followers_count = followers_count + 1 
                  WHERE id = ?")->execute([$trader_id]);
  
  // نسخ الإشارات النشطة الحالية
  $st = $pdo->prepare("SELECT * FROM avalon_signals 
                         WHERE trader_id = ? AND status = 'active'");
  $st->execute([$trader_id]);
  $signals = $st->fetchAll(PDO::FETCH_ASSOC);
  
  foreach ($signals as $signal) {
    // حساب حجم الصفقة بناءً على النسبة
    $position_size = ($amount * 0.1) / $signal['entry_price']; // 10% من المبلغ لكل صفقة
    
    $st = $pdo->prepare("INSERT INTO avalon_copy_trades 
      (copy_relation_id, signal_id, user_id, symbol, side, 
       entry_price, size, leverage, invested_amount, opened_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $st->execute([
      $pdo->lastInsertId(),
      $signal['id'],
      $uid,
      $signal['symbol'],
      $signal['side'],
      $signal['entry_price'],
      $position_size,
      min($signal['leverage'], $trader['leverage_max']),
      $amount * 0.1
    ]);
  }
  
  json_response(['ok' => true, 'message' => 'Now copying ' . $trader['display_name']]);
  
} catch (Exception $e) {
  json_response(['ok' => false, 'error' => $e->getMessage()]);
}
