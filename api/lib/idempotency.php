<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

/**
 * Idempotency-Key support for money-moving endpoints.
 * Client must send header: Idempotency-Key
 */
function idem_key(): string {
  return trim($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '');
}

function idem_require(string $scope): array {
  $key = idem_key();
  if ($key === '') {
    json_response(['ok'=>false,'error'=>'Missing Idempotency-Key'], 400);
  }
  $uid = require_auth();
  $body = file_get_contents('php://input') ?: '';
  $reqHash = hash('sha256', $scope . ':' . $body);
  $pdo = db();
  $now = time();
  $expires = $now + 60*60*24;

  // Look for existing record
  $stmt = $pdo->prepare('SELECT response_body, request_hash FROM idempotency_keys WHERE user_id=? AND idem_key=? AND scope=?');
  $stmt->execute([$uid, $key, $scope]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    if ($row['request_hash'] !== $reqHash) {
      json_response(['ok'=>false,'error'=>'Idempotency-Key reuse with different payload'], 409);
    }
    if ($row['response_body']) {
      header('Content-Type: application/json; charset=utf-8');
      http_response_code(200);
      echo $row['response_body'];
      exit;
    }
    // If reserved but no response yet, treat as conflict
    json_response(['ok'=>false,'error'=>'Request in progress'], 409);
  }

  // Reserve key
  $ins = $pdo->prepare('INSERT INTO idempotency_keys(user_id, idem_key, scope, request_hash, response_body, created_at, expires_at) VALUES (?,?,?,?,?,?,?)');
  $ins->execute([$uid, $key, $scope, $reqHash, null, $now, $expires]);
  return ['user_id'=>$uid, 'key'=>$key, 'scope'=>$scope, 'request_hash'=>$reqHash];
}

function idem_store_response(int $uid, string $key, string $scope, array $response): void {
  $pdo = db();
  $json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $stmt = $pdo->prepare('UPDATE idempotency_keys SET response_body=? WHERE user_id=? AND idem_key=? AND scope=?');
  $stmt->execute([$json, $uid, $key, $scope]);
}
