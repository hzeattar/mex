<?php
/**
 * V3 Single Price API
 * GET /api/price?symbol=BTCUSDT
 */
require_once __DIR__ . '/config.php';

$symbol = sanitize_symbol($_GET['symbol'] ?? '');

if (!$symbol) {
    json_response(['ok' => false, 'error' => 'Invalid symbol']);
}

try {
    $stmt = $pdo->prepare("
        SELECT symbol, name, type, price, change_pct, updated_at, source
        FROM markets
        WHERE symbol = ? AND status = 'active'
        LIMIT 1
    ");
    $stmt->execute([$symbol]);
    $market = $stmt->fetch();

    if (!$market) {
        json_response(['ok' => false, 'error' => 'Market not found'], 404);
    }

    $market['price'] = round_price($market['price']);
    $market['change_pct'] = round_pct($market['change_pct']);
    $market['updated_at'] = (int)$market['updated_at'];

    json_response([
        'ok' => true,
        'item' => $market,
        'ts' => time()
    ]);

} catch (PDOException $e) {
    json_response(['ok' => false, 'error' => 'Database error']);
}
