require_trade_allowed($uid);
<?php
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/telegram.php';

$db = db();
$u = require_user($db);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$orderId = (int)($body['order_id'] ?? 0);
if (!$orderId) json_out(['ok'=>false,'error'=>'order_id required'], 400);

$stmt = $db->prepare('SELECT id, status FROM orders WHERE id=? AND user_id=?');
$stmt->execute([$orderId, $u['id']]);
$o = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$o) json_out(['ok'=>false,'error'=>'Order not found'], 404);
if ($o['status'] !== 'open') json_out(['ok'=>false,'error'=>'Only open orders can be canceled'], 400);

$stmt = $db->prepare("UPDATE orders SET status='canceled' WHERE id=? AND user_id=?");
$stmt->execute([$orderId, $u['id']]);

json_out(['ok'=>true]);
