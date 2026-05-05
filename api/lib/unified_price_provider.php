<?php
declare(strict_types=1);
/**
 * Unified Price Provider
 * 
 * Simple interface to get prices for any asset type.
 * 
 * Usage:
 *   require_once __DIR__ . '/unified_price_provider.php';
 *   
 *   // Get crypto prices
 *   $prices = price_get('crypto', ['BTCUSDT', 'ETHUSDT']);
 *   
 *   // Get forex prices
 *   $prices = price_get('forex', ['EURUSD', 'GBPUSD']);
 *   
 *   // Get all prices for a type
 *   $prices = price_get('crypto'); // returns all
 */

require_once __DIR__ . '/crypto_provider.php';

// Seed prices for simulation (when API unavailable)
function price_seeds(string $type): array {
    $seeds = [
        'crypto' => [
            'BTCUSDT' => 67500.00,
            'ETHUSDT' => 3450.00,
            'BNBUSDT' => 580.00,
            'SOLUSDT' => 145.00,
            'XRPUSDT' => 0.62,
            'ADAUSDT' => 0.45,
            'DOGEUSDT' => 0.12,
            'AVAXUSDT' => 35.00,
        ],
        'forex' => [
            'EURUSD' => 1.0850,
            'GBPUSD' => 1.2650,
            'USDJPY' => 149.50,
            'USDCHF' => 0.9010,
            'AUDUSD' => 0.6550,
            'USDCAD' => 1.3650,
            'NZDUSD' => 0.6020,
            'EURGBP' => 0.8580,
        ],
        'stocks' => [
            'AAPL' => 178.00,
            'GOOGL' => 140.00,
            'MSFT' => 335.00,
            'AMZN' => 178.00,
            'NVDA' => 720.00,
            'META' => 500.00,
            'TSLA' => 175.00,
        ],
        'commodities' => [
            'XAUUSD' => 2350.00,
            'XAGUSD' => 27.00,
            'USOIL' => 78.00,
            'UKOIL' => 82.00,
            'NGAS' => 2.10,
        ],
        'futures' => [
            'ES' => 4500.00,
            'NQ' => 15000.00,
            'RTY' => 2000.00,
            'CL' => 78.00,
            'GC' => 2350.00,
        ],
        'arab' => [
            '1120' => 78.00,
            '2222' => 30.00,
            '1010' => 180.00,
        ],
    ];
    
    return $seeds[$type] ?? [];
}

// Simulate prices with random walk
function price_simulate(array $symbols, array $seeds): array {
    $prices = [];
    $now = time();
    
    foreach ($symbols as $symbol) {
        $seed = $seeds[$symbol] ?? ($type === 'crypto' ? 100.00 : ($type === 'forex' ? 1.00 : 100.00));
        
        // Small random variation
        $variation = (mt_rand(-200, 200) / 10000); // -2% to +2%
        $price = $seed * (1 + $variation);
        $changePct = $variation * 100;
        
        $prices[$symbol] = [
            'price' => round($price, $type === 'forex' ? 5 : 2),
            'change_pct' => round($changePct, 4),
            'source' => 'simulated',
            'updated_at' => $now,
        ];
    }
    
    return $prices;
}

// Normalize asset type
function price_normalize_type(string $type): string {
    $type = strtolower(trim($type));
    $map = [
        'cryptocurrency' => 'crypto',
        'forex' => 'forex',
        'fx' => 'forex',
        'stock' => 'stocks',
        'index' => 'stocks',
        'commodity' => 'commodities',
        'future' => 'futures',
        'arab' => 'arab',
        'tadawul' => 'arab',
    ];
    return $map[$type] ?? $type;
}

// Get prices for an asset type and optional symbols
function price_get(string $type, array $symbols = []): array {
    $type = price_normalize_type($type);
    
    // Route to appropriate provider
    switch ($type) {
        case 'crypto':
            return empty($symbols) 
                ? crypto_fetch_prices([]) 
                : crypto_fetch_prices($symbols);
        
        case 'forex':
        case 'stocks':
        case 'commodities':
        case 'arab':
        case 'futures':
            $seeds = price_seeds($type);
            if (empty($symbols)) {
                $symbols = array_keys($seeds);
            }
            return price_simulate($symbols, $seeds);
        
        default:
            return [];
    }
}

// Get single price
function price_get_one(string $type, string $symbol): ?array {
    $prices = price_get($type, [$symbol]);
    return $prices[$symbol] ?? null;
}

// Format price for API response
function price_format_for_api(array $price): array {
    return [
        'price' => is_numeric($price['price']) ? round(floatval($price['price']), 8) : 0,
        'change_pct' => is_numeric($price['change_pct'] ?? 0) ? round(floatval($price['change_pct']), 4) : 0,
        'source' => $price['source'] ?? 'unknown',
        'updated_at' => $price['updated_at'] ?? time(),
    ];
}

// Get multiple types at once
function price_get_multi(array $types): array {
    $result = [];
    foreach ($types as $type) {
        $result[$type] = price_get($type);
    }
    return $result;
}