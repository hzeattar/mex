<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/quote_authority.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$symbolsRaw = (string)($_GET['symbols'] ?? ($_GET['symbol'] ?? ''));
$type = vp_normalize_asset_type((string)($_GET['type'] ?? ''));
$mode = 'default';
if ((int)($_GET['fresh'] ?? $_GET['force_fresh'] ?? 0) === 1) {
    $mode = 'fresh';
} elseif ((int)($_GET['direct'] ?? 0) === 1) {
    $mode = 'direct';
} elseif ((int)($_GET['visible'] ?? 0) === 1) {
    $mode = 'visible';
} elseif ((int)($_GET['cache_only'] ?? 0) === 1) {
    $mode = 'cache_only';
}

$symbols = [];
if ($symbolsRaw !== '') {
    foreach (preg_split('/\s*,\s*/', $symbolsRaw) as $symbol) {
        $symbol = strtoupper(trim((string)$symbol));
        if ($symbol !== '' && preg_match('/^[A-Z0-9:._\-]{1,32}$/', $symbol)) {
            $symbols[] = $symbol;
        }
    }
}
$symbols = array_values(array_unique($symbols));
if (!$symbols) {
    json_response(['ok' => false, 'error' => 'No symbols provided'], 400);
}
if ($type === '' || $type === 'all') {
    json_response(['ok' => false, 'error' => 'A normalized type is required for quotes_v2'], 400);
}

if (count($symbols) === 1) {
    $result = vp_quote_authority_get($symbols[0], $type, ['mode' => $mode]);
    $item = is_array($result['item'] ?? null) ? [$result['item']] : [];
    json_response([
        'ok' => (bool)($result['ok'] ?? false),
        'type' => $type,
        'items' => $item,
        'meta' => $result['meta'] ?? ['mode' => $mode, 'read_only' => true],
    ]);
}

json_response(vp_quote_authority_batch($symbols, $type, ['mode' => $mode]));
