<?php
require_once __DIR__ . '/../lib/common.php';
header('Content-Type: application/json; charset=utf-8');

function envv($k,$d=''){ $v=getenv($k); return ($v===false||$v==='')?$d:$v; }
function json_ok($a=[]){ echo json_encode(array_merge(['ok'=>true],$a)); exit; }
function json_err($m,$c=400){ http_response_code($c); echo json_encode(['ok'=>false,'error'=>$m]); exit; }

$secret = $_SERVER['HTTP_X_ADMIN_KEY'] ?? ($_GET['key'] ?? '');
if ($secret === '' || $secret !== envv('BOT_ADMIN_SECRET','master')) json_err('Unauthorized', 401);

$db = db();
$action = strtolower($_GET['action'] ?? 'list');

if ($action === 'list') {
  $rows = $db->query("SELECT id,name,details,is_active,sort,created_at FROM payment_methods ORDER BY sort,id")->fetchAll(PDO::FETCH_ASSOC);
  json_ok(['items'=>$rows]);
}

if ($action === 'upsert') {
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $id = (int)($body['id'] ?? 0);
  $name = trim((string)($body['name'] ?? ''));
  $details = trim((string)($body['details'] ?? ''));
  $isActive = (int)($body['is_active'] ?? 1);
  $sort = (int)($body['sort'] ?? 0);

  if ($name==='' || $details==='') json_err('name/details required');

  if ($id>0) {
    $st = $db->prepare("UPDATE payment_methods SET name=?, details=?, is_active=?, sort=? WHERE id=?");
    $st->execute([$name,$details,$isActive,$sort,$id]);
    json_ok(['id'=>$id]);
  } else {
    $st = $db->prepare("INSERT INTO payment_methods(name,details,is_active,sort,created_at) VALUES(?,?,?,?,?)");
    $st->execute([$name,$details,$isActive,$sort,time()]);
    json_ok(['id'=>(int)$db->lastInsertId()]);
  }
}

if ($action === 'delete') {
  $id = (int)($_GET['id'] ?? 0);
  if($id<=0) json_err('id required');
  $st = $db->prepare("DELETE FROM payment_methods WHERE id=?");
  $st->execute([$id]);
  json_ok();
}

json_err('Unknown action');
