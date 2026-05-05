<?php
declare(strict_types=1);

// Backward-compatible endpoint (some pages may call /fx_rate.php)
// Internally delegates to /api/fx_rate.php style implementation.

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/fx.php';

require_method('GET');

$to = strtoupper(trim((string)($_GET['to'] ?? '')));
$to = preg_replace('/[^A-Z]/', '', $to);
if (!preg_match('/^[A-Z]{3}$/', $to)) {
  json_response(['ok'=>true,'from'=>'USD','to'=>'','rate'=>0,'updated_at'=>time(),'note'=>'invalid_currency']);
}

$fx = fx_usd_to($to);
$rate = (float)($fx['rate'] ?? 0);

json_response([
  'ok' => true,
  'from' => 'USD',
  'to' => $to,
  'rate' => $rate,
  'updated_at' => (int)($fx['updated_at'] ?? time()),
  'source' => (string)($fx['source'] ?? 'none'),
  'note' => $rate > 0 ? null : 'rate_unavailable',
]);
