<?php
/**
 * Prices API - Main endpoint for all price data
 * 
 * GET /api/prices.php?type=crypto
 * GET /api/prices.php?type=forex
 * GET /api/prices.php?type=stocks
 * GET /api/prices.php?type=commodities
 * GET /api/prices.php?type=arab
 * GET /api/prices.php?type=futures
 */

require_once __DIR__ . '/lib/unified_price_provider.php';

$type = price_normalize_type($_GET['type'] ?? 'crypto');
$symbols = isset($_GET['symbols']) ? explode(',', $_GET['symbols']) : [];

// Validate type
$allowedTypes = ['crypto', 'forex', 'stocks', 'commodities', 'arab', 'futures'];
if (!in_array($type, $allowedTypes)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'error' => 'Invalid type. Allowed: ' . implode(', ', $allowedTypes),
    ]);
    exit;
}

// Get prices
$prices = price_get($type, $symbols);

// Format for API response
$items = [];
foreach ($prices as $symbol => $data) {
    $formatted = price_format_for_api($data);
    $items[] = array_merge([
        'symbol' => $symbol,
        'type' => $type,
    ], $formatted);
}

// Sort by symbol
usort($items, function($a, $b) {
    return strcmp($a['symbol'], $b['symbol']);
});

// Response
header('Content-Type: application/json');
echo json_encode([
    'ok' => true,
    'type' => $type,
    'count' => count($items),
    'items' => $items,
    'updated' => time(),
    'source' => 'simulated',
]);