<?php
require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/schema.php';

$pdo = db();
try{
  $st = $pdo->prepare("SELECT kind, code, provider, currency, label, instructions, enabled FROM payment_methods WHERE enabled=1 ORDER BY id DESC");
  $st->execute();
  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
}catch(Exception $e){
  $rows = [];
}
$out = [];
foreach($rows as $r){
  $out[] = [
    'kind'=> (string)($r['kind']??''),
    'code'=> (string)($r['code']??''),
    'provider'=> (string)($r['provider']??''),
    'currency'=> (string)($r['currency']??''),
    'label'=> (string)($r['label']??$r['code']??''),
    'instructions'=> (string)($r['instructions']??''),
  ];
}
json_response(['ok'=>true,'methods'=>$out]);
