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
 * 
 * GET /api/prices.php?type=crypto&symbols=BTCUSDT,ETHUSDT
 */

require_once __DIR__ . '/lib/unified_price_provider.php';

$type = price_normalize_type($_GET['type'] ?? 'crypto');
$symbols = isset($_GET['symbols']) ? explode(',', $_GET['symbols']) : [];
$single = $_GET['single'] ?? null;

// Validate type
$allowedTypes = ['crypto', 'forex', 'stocks', 'commodities', 'arab', 'futures'];
if (!in_array($type, $allowedTypes)) {
    http_response_code(400);
    json_response([
        'ok' => false,
        'error' => 'Invalid type. Allowed: ' . implode(', ', $allowedTypes),
    ]);
}

// Get prices
$prices = empty($symbols) 
    ? price_get($type) 
    : price_get($type, $symbols);

// Format for API response
$items = [];
$source = 'unknown';

foreach ($prices as $symbol => $data) {
    $formatted = price_format_for_api($data);
    $items[] = array_merge([
        'symbol' => $symbol,
        'type' => $type,
    ], $formatted);
    
    if ($source === 'unknown' && !empty($data['source'])) {
        $source = $data['source'];
    }
}

// Sort by symbol
usort($items, function($a, $b) {
    return strcmp($a['symbol'], $b['symbol']);
});

// Response
json_response([
    'ok' => true,
    'type' => $type,
    'count' => count($items),
    'items' => $items,
    'updated' => time(),
    'source' => $source,
]);