<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/quote_authority.php';

$key = (string)($_GET['key'] ?? '');
$expected = (string)env('CRON_KEY', '');
if ($expected === '' || !hash_equals($expected, $key)) {
    json_response(['ok' => false, 'error' => 'Unauthorized'], 403);
}

$symbol = strtoupper(trim((string)($_GET['symbol'] ?? '')));
$type = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
$mode = strtolower(trim((string)($_GET['mode'] ?? 'default')));
if ($symbol === '' || $type === '' || $type === 'all') {
    json_response(['ok' => false, 'error' => 'symbol and type are required'], 400);
}

json_response(vp_quote_authority_get($symbol, $type, ['mode' => $mode]));
