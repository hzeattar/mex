<?php
declare(strict_types=1);
/**
 * Crypto Price Provider
 * 
 * Source: Binance Futures API (free, no API key required)
 * 
 * Usage:
 *   require_once __DIR__ . '/crypto_provider.php';
 *   $prices = crypto_fetch_prices(['BTCUSDT', 'ETHUSDT']);
 */

require_once __DIR__ . '/common.php';

// Cache directory
function crypto_cache_dir(): string {
    $dir = dirname(__DIR__, 2) . '/data/cache';
    if (!is_dir($dir)) @mkdir($dir, 0777, true);
    return $dir;
}

// Get cached crypto prices
function crypto_cached_prices(string $key, int $ttl = 10): ?array {
    $file = crypto_cache_dir() . '/crypto_' . $key . '.json';
    if (!is_file($file)) return null;
    $age = time() - (int)@filemtime($file);
    if ($age < 0 || $age > $ttl) return null;
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return null;
    return json_decode($raw, true);
}

// Save crypto prices to cache
function crypto_save_prices(string $key, array $prices): void {
    $file = crypto_cache_dir() . '/crypto_' . $key . '.json';
    @file_put_contents($file, json_encode($prices), LOCK_EX);
}

// Fetch all tickers from Binance Futures
function crypto_fetch_binance_all(): array {
    $prices = [];
    $now = time();
    
    // Binance Futures 24hr tickers
    $url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($code !== 200 || !$response) {
        error_log('Binance API failed with code: ' . $code);
        return $prices;
    }
    
    $data = json_decode($response, true);
    if (!is_array($data)) {
        return $prices;
    }
    
    foreach ($data as $ticker) {
        $symbol = $ticker['symbol'] ?? '';
        
        // Only include USDT-margined perpetuals
        if (empty($symbol) || !str_ends_with($symbol, 'USDT')) {
            continue;
        }
        
        $lastPrice = floatval($ticker['lastPrice'] ?? 0);
        $priceChangePercent = floatval($ticker['priceChangePercent'] ?? 0);
        
        if ($lastPrice <= 0) continue;
        
        $prices[$symbol] = [
            'price' => $lastPrice,
            'change_pct' => $priceChangePercent,
            'high_24h' => floatval($ticker['highPrice'] ?? 0),
            'low_24h' => floatval($ticker['lowPrice'] ?? 0),
            'volume_24h' => floatval($ticker['volume'] ?? 0),
            'source' => 'binance',
            'updated_at' => $now,
        ];
    }
    
    return $prices;
}

// Fetch single symbol from Binance
function crypto_fetch_binance_symbol(string $symbol): ?array {
    $url = 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=' . rawurlencode($symbol);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($code !== 200 || !$response) {
        return null;
    }
    
    $ticker = json_decode($response, true);
    if (!is_array($ticker)) {
        return null;
    }
    
    $lastPrice = floatval($ticker['lastPrice'] ?? 0);
    if ($lastPrice <= 0) {
        return null;
    }
    
    return [
        'price' => $lastPrice,
        'change_pct' => floatval($ticker['priceChangePercent'] ?? 0),
        'high_24h' => floatval($ticker['highPrice'] ?? 0),
        'low_24h' => floatval($ticker['lowPrice'] ?? 0),
        'volume_24h' => floatval($ticker['volume'] ?? 0),
        'source' => 'binance',
        'updated_at' => time(),
    ];
}

// Get top cryptocurrencies by volume
function crypto_top_symbols(int $limit = 50): array {
    $all = crypto_fetch_binance_all();
    
    if (empty($all)) {
        return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];
    }
    
    // Sort by volume
    uasort($all, function($a, $b) {
        return ($b['volume_24h'] ?? 0) <=> ($a['volume_24h'] ?? 0);
    });
    
    return array_slice(array_keys($all), 0, $limit);
}

// Main function to get crypto prices
function crypto_fetch_prices(array $symbols = []): array {
    // If no symbols, return all from Binance
    if (empty($symbols)) {
        $cacheKey = 'all_usdt';
        
        // Check cache (10 second TTL for speed)
        $cached = crypto_cached_prices($cacheKey, 10);
        if ($cached !== null) {
            return $cached;
        }
        
        $prices = crypto_fetch_binance_all();
        
        if (!empty($prices)) {
            crypto_save_prices($cacheKey, $prices);
        }
        
        return $prices;
    }
    
    // Normalize symbols
    $normalizedSymbols = [];
    foreach ($symbols as $symbol) {
        $symbol = strtoupper(trim(preg_replace('/[^A-Z0-9]/', '', $symbol)));
        // Ensure USDT suffix
        if (!str_ends_with($symbol, 'USDT') && !str_ends_with($symbol, 'BUSD')) {
            $symbol .= 'USDT';
        }
        if (preg_match('/^[A-Z]{5,32}USDT?$/', $symbol)) {
            $normalizedSymbols[] = $symbol;
        }
    }
    $normalizedSymbols = array_values(array_unique($normalizedSymbols));
    
    if (empty($normalizedSymbols)) {
        return [];
    }
    
    // Build cache key
    $cacheKey = sha1(implode(',', $normalizedSymbols));
    
    // Check cache (10 second TTL)
    $cached = crypto_cached_prices($cacheKey, 10);
    if ($cached !== null) {
        return $cached;
    }
    
    $prices = [];
    
    // Fetch all from Binance and filter
    $allPrices = crypto_fetch_binance_all();
    
    foreach ($normalizedSymbols as $symbol) {
        if (isset($allPrices[$symbol])) {
            $prices[$symbol] = $allPrices[$symbol];
        }
    }
    
    // Cache and return
    if (!empty($prices)) {
        crypto_save_prices($cacheKey, $prices);
    }
    
    return $prices;
}

// Get single crypto price
function crypto_get_price(string $symbol): ?array {
    $prices = crypto_fetch_prices([$symbol]);
    return $prices[$symbol] ?? null;
}

// Update crypto prices in database
function crypto_update_database(array $symbols = []): int {
    $prices = crypto_fetch_prices($symbols);
    if (empty($prices)) return 0;
    
    $pdo = db();
    $updated = 0;
    $now = time();
    
    foreach ($prices as $symbol => $data) {
        $stmt = $pdo->prepare("
            INSERT INTO market_quotes (market, type, provider, price, change_pct, source, provider_ts, received_at)
            VALUES (:market, 'crypto', 'binance', :price, :change_pct, :source, :updated_at, :received_at)
            ON DUPLICATE KEY UPDATE
                price = VALUES(price),
                change_pct = VALUES(change_pct),
                source = VALUES(source),
                provider_ts = VALUES(provider_ts),
                received_at = VALUES(received_at)
        ");
        
        $stmt->execute([
            ':market' => $symbol,
            ':price' => $data['price'],
            ':change_pct' => $data['change_pct'],
            ':source' => $data['source'],
            ':updated_at' => $data['updated_at'],
            ':received_at' => $now,
        ]);
        
        if ($stmt->rowCount() > 0) {
            $updated++;
        }
    }
    
    return $updated;
}

// Fetch candles (OHLCV) from Binance
function crypto_fetch_candles(string $symbol, string $interval = '1h', int $limit = 100): array {
    // Map interval to Binance format
    $intervalMap = [
        '1m' => '1m', '5m' => '5m', '15m' => '15m',
        '30m' => '30m', '1h' => '1h', '4h' => '4h',
        '1d' => '1d', '1w' => '1w',
    ];
    
    $binanceInterval = $intervalMap[$interval] ?? '1h';
    
    $url = 'https://fapi.binance.com/fapi/v1/klines';
    $params = [
        'symbol' => $symbol,
        'interval' => $binanceInterval,
        'limit' => min($limit, 500),
    ];
    
    $url .= '?' . http_build_query($params);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($code !== 200 || !$response) {
        return [];
    }
    
    $data = json_decode($response, true);
    if (!is_array($data)) {
        return [];
    }
    
    $candles = [];
    foreach ($data as $kline) {
        $candles[] = [
            'time' => intdiv((int)($kline[0] ?? 0), 1000), // Convert to seconds
            'open' => floatval($kline[1] ?? 0),
            'high' => floatval($kline[2] ?? 0),
            'low' => floatval($kline[3] ?? 0),
            'close' => floatval($kline[4] ?? 0),
            'volume' => floatval($kline[5] ?? 0),
        ];
    }
    
    return $candles;
}

// Get candles with caching
function crypto_get_candles(string $symbol, string $interval = '1h', int $limit = 100): array {
    $cacheKey = sha1($symbol . '_' . $interval . '_' . $limit);
    $cacheFile = crypto_cache_dir() . '/candles_' . $cacheKey . '.json';
    
    // Cache for 1 minute for intraday, 5 minutes for daily+
    $ttl = in_array($interval, ['1m', '5m', '15m', '30m']) ? 60 : 300;
    
    if (is_file($cacheFile)) {
        $age = time() - (int)@filemtime($cacheFile);
        if ($age >= 0 && $age < $ttl) {
            $cached = @file_get_contents($cacheFile);
            if ($cached !== false) {
                return json_decode($cached, true) ?? [];
            }
        }
    }
    
    $candles = crypto_fetch_candles($symbol, $interval, $limit);
    
    if (!empty($candles)) {
        @file_put_contents($cacheFile, json_encode($candles), LOCK_EX);
    }
    
    return $candles;
}