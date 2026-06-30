<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';
require_once __DIR__ . '/lib/quote_cache_policy.php';

$type = vp_normalize_asset_type((string)($_GET['type'] ?? 'crypto'));
if ($type === '' || $type === 'all') $type = 'crypto';

$allowed = ['crypto', 'forex', 'stocks', 'commodities', 'arab', 'futures'];
if (!in_array($type, $allowed, true)) {
  json_response(['ok' => false, 'error' => 'Invalid type. Allowed: ' . implode(', ', $allowed)], 400);
}

$symbols = qa_parse_symbols((string)($_GET['symbols'] ?? ($_GET['symbol'] ?? '')));

if (!$symbols) {
  $pdo = db();
  $st = $pdo->prepare("SELECT symbol FROM markets WHERE status='active' AND type=? ORDER BY sort_order ASC, symbol ASC LIMIT 200");
  $st->execute([$type]);
  $symbols = array_map('strtoupper', array_map('strval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []));
}

$payload = qa_quote_payload($type, $symbols, [
  'allow_live' => ($type === 'crypto') || count($symbols) <= 12,
  'allow_crypto_seed' => true,
  'allow_noncrypto_seed' => false,
  'direct_budget' => min(12, max(1, count($symbols))),
  'direct_yahoo_budget' => 0,
  'chart_budget' => min(6, max(1, count($symbols))),
]);

$payload['type'] = $type;
$payload['count'] = count($payload['items'] ?? []);
$payload['updated'] = time();
$payload['source'] = 'quote_authority';

json_response($payload);
