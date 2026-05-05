<?php
/**
 * V3 Prices API
 * GET /api/prices?type=crypto|forex|stocks|futures|arab
 */
require_once __DIR__ . '/config.php';

$type = $_GET['type'] ?? 'crypto';
$allowedTypes = ['crypto', 'forex', 'stocks', 'futures', 'arab', 'indices', 'commodities'];

if (!in_array($type, $allowedTypes)) {
    json_response(['ok' => false, 'error' => 'Invalid type']);
}

try {
    $stmt = $pdo->prepare("
        SELECT symbol, name, type, price, change_pct, updated_at, source
        FROM markets
        WHERE type = ? AND status = 'active'
        ORDER BY sort_order ASC, symbol ASC
    ");
    $stmt->execute([$type]);
    $markets = $stmt->fetchAll();

    // Round prices for cleaner output
    foreach ($markets as &$m) {
        $m['price'] = round_price($m['price']);
        $m['change_pct'] = round_pct($m['change_pct']);
        $m['updated_at'] = (int)$m['updated_at'];
    }

    json_response([
        'ok' => true,
        'type' => $type,
        'count' => count($markets),
        'items' => $markets,
        'ts' => time()
    ]);

} catch (PDOException $e) {
    json_response(['ok' => false, 'error' => 'Database error']);
}
