<?php
declare(strict_types=1);
/**
 * Unified Price Provider - Simplified for Railway
 * 
 * All prices are simulated with realistic seed values.
 * In production, replace with real API calls.
 */

// Seed prices for all asset types
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
            'DOTUSDT' => 7.20,
            'LINKUSDT' => 14.50,
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
function price_simulate(array $symbols, string $type): array {
    $seeds = price_seeds($type);
    $prices = [];
    $now = time();
    
    foreach ($symbols as $symbol) {
        $seed = $seeds[$symbol] ?? 100.0;
        
        // Small random variation (-2% to +2%)
        $variation = (mt_rand(-200, 200) / 10000);
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

// Get prices for an asset type
function price_get(string $type, array $symbols = []): array {
    $type = price_normalize_type($type);
    $seeds = price_seeds($type);
    
    if (empty($symbols)) {
        $symbols = array_keys($seeds);
    }
    
    return price_simulate($symbols, $type);
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