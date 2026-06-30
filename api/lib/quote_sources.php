<?php
declare(strict_types=1);

require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/asset_reference.php';
require_once __DIR__ . '/marketdata.php';

if (!function_exists('vp_quote_source_rank')) {
    function vp_quote_source_rank(?string $source): int
    {
        $src = strtolower(trim((string)$source));
        return match ($src) {
            'binance' => 100,
            'binance_ws' => 98,
            'twelvedata_ws' => 97,
            'twelvedata' => 96,
            'trade_stream', 'stream' => 90,
            'finnhub_ws' => 86,
            'provider_live' => 85,
            'finnhub' => 84,
            'eodhd', 'eodhd_rest', 'eodhd_intraday' => 82,
            'tiingo' => 80,
            'massive', 'polygon' => 78,
            'fcsapi' => 76,
            'provider_fallback' => 70,
            'yahoo', 'yahoo_chart_live' => 1,
            'fx_fallback', 'frankfurter', 'stooq' => 60,
            'cache', 'stale_cache' => 12,
            'seed', 'seed_fallback', 'seed_price', 'chart_seed', 'seed_candle', 'synthetic', 'aggs' => 4,
            default => ($src === '' ? 0 : 40),
        };
    }
}

if (!function_exists('vp_quote_source_is_trusted')) {
    function vp_quote_source_is_trusted(?string $source, string $assetType = ''): bool
    {
        if (function_exists('quote_source_is_liveish')) {
            return quote_source_is_liveish($source, $assetType);
        }
        return vp_quote_source_rank($source) >= 70;
    }
}

if (!function_exists('vp_quote_source_is_untrusted')) {
    function vp_quote_source_is_untrusted(?string $source): bool
    {
        if (function_exists('quote_source_is_untrusted')) {
            return quote_source_is_untrusted($source);
        }
        $src = strtolower(trim((string)$source));
        return $src === '' || in_array($src, [
            'seed','seed_fallback','seed_price','chart_seed','seed_candle',
            'synthetic','aggs','cache','stale_cache','unavailable','yahoo','yahoo_chart_live'
        ], true);
    }
}

if (!function_exists('vp_quote_candidate_score')) {
    function vp_quote_candidate_score(array $row, string $assetType = ''): array
    {
        $type = vp_normalize_asset_type((string)($row['type'] ?? $assetType));
        $source = strtolower(trim((string)($row['source'] ?? '')));
        $updatedAt = (int)($row['updated_at'] ?? 0);
        $asOf = (int)($row['as_of'] ?? 0);
        $ts = max($updatedAt, $asOf);
        $price = (float)($row['price'] ?? 0);
        $trusted = vp_quote_source_is_trusted($source, $type);
        $rank = vp_quote_source_rank($source);

        return [
            'type' => $type,
            'source' => $source,
            'ts' => $ts,
            'updated_at' => $updatedAt,
            'as_of' => $asOf,
            'price' => $price,
            'trusted' => $trusted,
            'rank' => $rank,
        ];
    }
}

// ──────────────────────────────────────────────────────────────
// TwelveData provider — Pro Plan: 610 credits/min, 500 WS credits/min
// Covers: forex, stocks, commodities, crypto, futures, arab, ETFs, indices
// Env: QUOTES_TWELVEDATA_KEY (required)
// ──────────────────────────────────────────────────────────────

if (!function_exists('twelvedata_enabled')) {
    function twelvedata_enabled(): bool {
        $key = trim((string)env('QUOTES_TWELVEDATA_KEY', ''));
        return $key !== '' && strtolower((string)env('TWELVEDATA_ENABLED', '1')) !== '0';
    }
}

if (!function_exists('twelvedata_symbol_for_market')) {
    /**
     * Convert internal symbol to TwelveData ticker format.
     * EURUSD → EUR/USD, XAUUSD → XAU/USD, AAPL → AAPL
     */
    function twelvedata_symbol_for_market(string $symbol, string $assetType, array $meta = []): ?string {
        $symbol = strtoupper(trim($symbol));
        $assetType = vp_normalize_asset_type($assetType);
        $providerType = vp_provider_asset_type($assetType);
        $metaEodhd = strtoupper(trim((string)($meta['eodhd_symbol'] ?? $meta['provider_symbol_eodhd'] ?? '')));
        $metaTv = strtoupper(trim((string)($meta['tv_symbol'] ?? '')));
        $looksLikeSaudiEquity = $assetType === 'arab'
            || (preg_match('/^[0-9]{3,6}$/', $symbol)
                && (($metaEodhd !== '' && str_ends_with($metaEodhd, '.SR')) || str_starts_with($metaTv, 'TADAWUL:')));

        // Check meta for explicit override
        $td = trim((string)($meta['twelvedata_ticker'] ?? ''));
        if ($td !== '') {
            return ($looksLikeSaudiEquity && preg_match('/^[0-9]{3,6}$/', $td)) ? null : $td;
        }

        if (function_exists('vp_asset_reference')) {
            $ref = vp_asset_reference($symbol, $assetType, $meta);
            $mapped = trim((string)($ref['twelvedata_ticker'] ?? ''));
            if ($mapped !== '') {
                return ($looksLikeSaudiEquity && preg_match('/^[0-9]{3,6}$/', $mapped)) ? null : $mapped;
            }
            if (empty($ref['trade_supported'])) return null;
        }
        if ($looksLikeSaudiEquity) return null;

        if ($providerType === 'forex') {
            // EURUSD → EUR/USD
            if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
                return $m[1] . '/' . $m[2];
            }
            return null;
        }

        if ($providerType === 'commodities') {
            // XAUUSD → XAU/USD, XAGUSD → XAG/USD
            if (preg_match('/^(XAU|XAG|XPT|XPD)(USD)$/', $symbol, $m)) {
                return $m[1] . '/' . $m[2];
            }
            // Spot energy / metals available on TwelveData commodities list
            if ($symbol === 'USOIL' || $symbol === 'WTI') {
                return 'WTI/USD';
            }
            if ($symbol === 'UKOIL' || $symbol === 'BRENT') {
                return 'XBR/USD';
            }
            // Soft commodities / industrial metals not reliably available on the current plan.
            if (in_array($symbol, ['COPPER','NGAS','NATGAS','NICKEL','ZINC','ALUMINIUM','LEAD','WHEAT','CORN','SOYBEAN','SUGAR','COTTON','COFFEE','COCOA','LUMBER'], true)) {
                return null;
            }
            return null;
        }

        if ($providerType === 'crypto') {
            // BTCUSDT → BTC/USDT
            if (preg_match('/^(BTC|ETH|BNB|SOL|XRP|ADA|DOGE|DOT|MATIC|AVAX|LINK|UNI|LTC|BCH|ETC|FIL|ATOM|NEAR|FTM|ALGO|VET|ICP|HBAR|SAND|MANA|AXS|THETA|XTZ|EGLD|AAVE|GRT)(USDT?)$/', $symbol, $m)) {
                return $m[1] . '/' . $m[2];
            }
            return null;
        }

        // Stocks, arab, futures, indices — use as-is
        if ($providerType === 'futures') {
            return null;
        }

        if (in_array($providerType, ['stocks', 'arab', 'indices'], true)) {
            if (preg_match('/^[A-Z0-9._\-]{1,20}$/', $symbol)) {
                return $symbol;
            }
        }

        return null;
    }
}

if (!function_exists('twelvedata_quote_many')) {
    function twelvedata_quote_row_from_payload(array $data): ?array {
        $price = (float)($data['close'] ?? $data['price'] ?? 0);
        if ($price <= 0) return null;
        $prevClose = (float)($data['previous_close'] ?? 0);
        $chgPctRaw = (float)($data['percent_change'] ?? 0);
        if ($prevClose > 0 && abs($chgPctRaw) < 0.0000001) {
            $chg = (float)($data['change'] ?? 0);
            $chgPctRaw = ($chg / $prevClose) * 100.0;
        }
        return [
            'price' => $price,
            'change_pct' => $chgPctRaw,
            'prev_close' => $prevClose,
            'source' => 'twelvedata',
        ];
    }

    function twelvedata_quote_single_direct(string $ticker, string $key, int $timeoutSec): ?array {
        $ticker = trim($ticker);
        if ($ticker === '') return null;
        $url = 'https://api.twelvedata.com/quote?' . http_build_query([
            'symbol' => $ticker,
            'apikey' => $key,
        ]);
        $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
        $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
            'connect_timeout' => max(1, min(3, $timeoutSec)),
            'timeout' => max(2, min(6, $timeoutSec + 2)),
            'retries' => 0,
        ];
        try {
            $j = http_get_json($url);
        } finally {
            if ($prevTimeout !== null) {
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
            } else {
                unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
            }
        }
        if (!is_array($j) || strtolower((string)($j['status'] ?? '')) === 'error') return null;
        return twelvedata_quote_row_from_payload($j);
    }

    /**
     * Fetch real-time quotes from TwelveData API.
     * Supports up to 10 symbols per request (batch).
     * Returns: [ticker => ['price'=>float,'change_pct'=>float,'source'=>'twelvedata'], ...]
     */
    function twelvedata_quote_many(array $tickers, int $timeoutSec = 3): array {
        if (!twelvedata_enabled()) return [];
        $key = trim((string)env('QUOTES_TWELVEDATA_KEY', ''));
        if ($key === '' || !$tickers) return [];

        $tickers = array_values(array_unique(array_filter($tickers)));
        if (!$tickers) return [];

        $out = [];

        // Large mixed commodity batches can fail the whole quote response even
        // when every ticker works in smaller groups. Keep batches deliberately
        // small so one provider-side edge case does not hide a full market list.
        $batchSize = max(1, min(30, (int)env('TWELVEDATA_QUOTE_BATCH_SIZE', '8')));
        $chunks = array_chunk($tickers, $batchSize);
        foreach ($chunks as $chunk) {
            try {
                $url = 'https://api.twelvedata.com/quote?' . http_build_query([
                    'symbol' => implode(',', $chunk),
                    'apikey' => $key,
                ]);

                $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
                    'connect_timeout' => max(1, min(3, $timeoutSec)),
                    'timeout' => max(2, min(6, $timeoutSec + 2)),
                    'retries' => 0,
                ];

                $j = http_get_json($url);

                if ($prevTimeout !== null) {
                    $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
                } else {
                    unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
                }

                if (!is_array($j)) {
                    if (PHP_SAPI === 'cli' && (int)env('TWELVEDATA_DEBUG_LOG', '0') === 1) {
                        error_log('[twelvedata] quote returned no JSON for ' . implode(',', $chunk));
                    }
                    continue;
                }
                if (strtolower((string)($j['status'] ?? '')) === 'error') {
                    if (PHP_SAPI === 'cli' && (int)env('TWELVEDATA_DEBUG_LOG', '0') === 1) {
                        error_log('[twelvedata] quote error for ' . implode(',', $chunk) . ': ' . (string)($j['message'] ?? $j['code'] ?? 'unknown'));
                    }
                    if (count($chunk) > 1) {
                        foreach ($chunk as $singleTicker) {
                            try {
                                $single = twelvedata_quote_single_direct((string)$singleTicker, $key, $timeoutSec);
                                if (is_array($single)) $out[(string)$singleTicker] = $single;
                            } catch (Throwable $singleError) {
                                continue;
                            }
                        }
                    }
                    continue;
                }

                // Batch response: { "EUR/USD": {...}, "XAU/USD": {...} } or single: {...}
                // Single symbol response has "symbol" key
                if (isset($j['symbol']) && isset($j['close'])) {
                    $ticker = $chunk[0] ?? '';
                    $row = twelvedata_quote_row_from_payload($j);
                    if (is_array($row)) $out[$ticker] = $row;
                    continue;
                }

                // Batch response
                foreach ($j as $ticker => $data) {
                    if (!is_array($data)) continue;
                    $row = twelvedata_quote_row_from_payload($data);
                    if (is_array($row)) $out[$ticker] = $row;
                }

                if (count($chunk) > 1) {
                    foreach ($chunk as $singleTicker) {
                        if (isset($out[(string)$singleTicker])) continue;
                        try {
                            $single = twelvedata_quote_single_direct((string)$singleTicker, $key, $timeoutSec);
                            if (is_array($single)) $out[(string)$singleTicker] = $single;
                        } catch (Throwable $singleError) {
                            continue;
                        }
                    }
                }
            } catch (Throwable $e) {
                continue;
            }
        }

        return $out;
    }
}

if (!function_exists('twelvedata_quote_many_cached')) {
    function twelvedata_quote_many_cached(array $tickers, int $ttl = 5): array {
        $ttl = max(1, min(60, $ttl));
        $dir = __DIR__ . '/../data/cache';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $cacheKey = 'td_' . md5(implode(',', $tickers));
        $cacheFile = $dir . '/' . $cacheKey . '.json';
        $now = time();

        if (is_file($cacheFile)) {
            $age = $now - (int)@filemtime($cacheFile);
            if ($age >= 0 && $age < $ttl) {
                $raw = @file_get_contents($cacheFile);
                $d = $raw ? json_decode($raw, true) : null;
                if (is_array($d)) return $d;
            }
        }

        $result = twelvedata_quote_many($tickers);
        if ($result) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $result;
    }
}

// ──────────────────────────────────────────────────────────────
// FCS API provider — free tier: covers forex, commodities
// Env: QUOTES_FCS_KEY (optional, works without key with limits)
// ──────────────────────────────────────────────────────────────

if (!function_exists('twelvedata_interval_for_tf')) {
    function twelvedata_interval_for_tf(string $tf): ?string {
        return match (strtolower(trim($tf))) {
            '1m' => '1min',
            '5m' => '5min',
            '15m' => '15min',
            '30m' => '30min',
            '1h' => '1h',
            '2h' => '2h',
            '4h' => '4h',
            '8h' => '8h',
            '1d' => '1day',
            '1w' => '1week',
            default => null,
        };
    }
}

if (!function_exists('twelvedata_rollup_candles')) {
    function twelvedata_rollup_candles(array $items, int $bucketSeconds, int $limit, int $end = 0): array {
        if ($bucketSeconds <= 0 || !$items) return [];
        $buckets = [];
        foreach ($items as $row) {
            if (!is_array($row)) continue;
            $time = (int)($row['time'] ?? 0);
            if ($time <= 0 || ($end > 0 && $time > $end)) continue;
            $open = (float)($row['open'] ?? 0);
            $high = (float)($row['high'] ?? 0);
            $low = (float)($row['low'] ?? 0);
            $close = (float)($row['close'] ?? 0);
            if (!($open > 0 && $high > 0 && $low > 0 && $close > 0)) continue;

            $bucket = (int)(floor($time / $bucketSeconds) * $bucketSeconds);
            if (!isset($buckets[$bucket])) {
                $buckets[$bucket] = [
                    'time' => $bucket,
                    'open' => $open,
                    'high' => $high,
                    'low' => $low,
                    'close' => $close,
                    'volume' => (float)($row['volume'] ?? 0),
                    'source' => 'twelvedata_time_series',
                    'provider_ts' => (int)($row['provider_ts'] ?? $time),
                    'quality' => 'real_rollup',
                ];
            } else {
                $buckets[$bucket]['high'] = max((float)$buckets[$bucket]['high'], $high);
                $buckets[$bucket]['low'] = min((float)$buckets[$bucket]['low'], $low);
                $buckets[$bucket]['close'] = $close;
                $buckets[$bucket]['volume'] += (float)($row['volume'] ?? 0);
                $buckets[$bucket]['provider_ts'] = max((int)$buckets[$bucket]['provider_ts'], (int)($row['provider_ts'] ?? $time));
            }
        }
        ksort($buckets);
        $out = array_values($buckets);
        if ($limit > 0 && count($out) > $limit) $out = array_slice($out, -$limit);
        return $out;
    }
}

if (!function_exists('twelvedata_time_series_candles')) {
    function twelvedata_time_series_candles(string $ticker, string $tf, int $limit, int $end = 0, int $timeoutSec = 4): array {
        if (!twelvedata_enabled()) return [];
        $key = trim((string)env('QUOTES_TWELVEDATA_KEY', ''));
        $ticker = trim($ticker);
        $interval = twelvedata_interval_for_tf($tf);
        if ($key === '' || $ticker === '' || $interval === null) return [];

        $maxOutput = max(10, min(5000, (int)env('TWELVEDATA_CANDLES_MAX_OUTPUTSIZE', '5000')));
        $outputSize = max(10, min($maxOutput, $limit));
        $params = [
            'symbol' => $ticker,
            'interval' => $interval,
            'outputsize' => (string)$outputSize,
            'format' => 'JSON',
            'timezone' => 'UTC',
            'apikey' => $key,
        ];
        if ($end > 0) {
            $params['end_date'] = gmdate('Y-m-d H:i:s', $end);
        }
        $url = 'https://api.twelvedata.com/time_series?' . http_build_query($params);

        $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
        $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
            'connect_timeout' => max(1, min(3, $timeoutSec)),
            'timeout' => max(2, min(8, $timeoutSec + 2)),
            'retries' => 0,
        ];
        try {
            $j = http_get_json($url);
        } catch (Throwable $e) {
            $j = null;
        }
        if ($prevTimeout !== null) {
            $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
        } else {
            unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
        }

        if (!is_array($j) || strtolower((string)($j['status'] ?? 'ok')) === 'error') return [];
        $rows = $j['values'] ?? [];
        if (!is_array($rows)) return [];

        $items = [];
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $dt = trim((string)($row['datetime'] ?? ''));
            if ($dt === '') continue;
            $ts = strtotime($dt . ' UTC');
            if ($ts === false || $ts <= 0) continue;
            if ($end > 0 && $ts > $end) continue;
            $open = (float)($row['open'] ?? 0);
            $high = (float)($row['high'] ?? 0);
            $low = (float)($row['low'] ?? 0);
            $close = (float)($row['close'] ?? 0);
            if (!($open > 0 && $high > 0 && $low > 0 && $close > 0)) continue;
            $items[] = [
                'time' => (int)$ts,
                'open' => $open,
                'high' => $high,
                'low' => $low,
                'close' => $close,
                'volume' => (float)($row['volume'] ?? 0),
                'source' => 'twelvedata_time_series',
                'provider_ts' => (int)$ts,
                'quality' => 'real',
            ];
        }

        usort($items, static fn($a, $b) => ((int)$a['time']) <=> ((int)$b['time']));
        if (count($items) > $limit) $items = array_slice($items, -$limit);
        return $items;
    }
}

if (!function_exists('twelvedata_time_series_candles_cached')) {
    function twelvedata_time_series_candles_cached(string $ticker, string $tf, int $limit, int $end = 0, int $ttl = 60): array {
        $ttl = max(5, min(3600, $ttl));
        $dir = __DIR__ . '/../data/cache';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $cacheKey = 'td_candles_' . md5(strtolower($ticker) . '|' . strtolower($tf) . '|' . $limit . '|' . $end);
        $cacheFile = $dir . '/' . $cacheKey . '.json';
        $now = time();

        if (is_file($cacheFile)) {
            $age = $now - (int)@filemtime($cacheFile);
            if ($age >= 0 && $age < $ttl) {
                $raw = @file_get_contents($cacheFile);
                $d = $raw ? json_decode($raw, true) : null;
                // Do not reuse an empty cached result: it may have been written
                // during an upstream outage or quota exhaustion and would shadow
                // fresh real candles until the TTL expires.
                if (is_array($d) && count($d) > 0) return $d;
            }
        }

        $result = twelvedata_time_series_candles($ticker, $tf, $limit, $end);
        if (!$result && strtolower(trim($tf)) === '3m') {
            $sourceLimit = max($limit * 3 + 12, 60);
            $sourceLimit = min(max(10, $sourceLimit), max(10, min(5000, (int)env('TWELVEDATA_CANDLES_MAX_OUTPUTSIZE', '5000'))));
            $source = twelvedata_time_series_candles($ticker, '1m', $sourceLimit, $end);
            $result = twelvedata_rollup_candles($source, 180, $limit, $end);
        }
        if ($result && count($result) > 0) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $result;
    }
}

if (!function_exists('fcsapi_enabled')) {
    function fcsapi_enabled(): bool {
        return strtolower((string)env('FCSAPI_ENABLED', '0')) === '1';
    }
}

if (!function_exists('fcsapi_symbol_for_market')) {
    function fcsapi_symbol_for_market(string $symbol, string $assetType, array $meta = []): ?string {
        $symbol = strtoupper(trim($symbol));
        $assetType = vp_normalize_asset_type($assetType);
        $providerType = vp_provider_asset_type($assetType);

        $fcs = trim((string)($meta['fcsapi_ticker'] ?? ''));
        if ($fcs !== '') return $fcs;

        if ($providerType === 'forex') {
            // EURUSD → EUR/USD
            if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
                return $m[1] . '/' . $m[2];
            }
            return null;
        }

        if ($providerType === 'commodities') {
            if (preg_match('/^(XAU|XAG|XPT|XPD)(USD)$/', $symbol, $m)) {
                return $m[1] . '/' . $m[2];
            }
            return null;
        }

        return null;
    }
}

if (!function_exists('fcsapi_quote_many')) {
    /**
     * Fetch quotes from FCS API.
     * Returns: [ticker => ['price'=>float,'change_pct'=>float,'source'=>'fcsapi'], ...]
     */
    function fcsapi_quote_many(array $tickers, int $timeoutSec = 3): array {
        if (!fcsapi_enabled() || !$tickers) return [];
        $key = trim((string)env('QUOTES_FCS_KEY', ''));

        $out = [];
        // FCS API supports comma-separated symbols
        $symList = implode(',', array_map(function($t) {
            return str_replace('/', '', $t); // EUR/USD → EURUSD for FCS
        }, $tickers));

        try {
            $url = "https://fcsapi.com/api-v3/forex/latest?symbol=" . rawurlencode($symList);
            if ($key !== '') $url .= "&access_key=" . rawurlencode($key);

            $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
            $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
                'connect_timeout' => max(1, min(3, $timeoutSec)),
                'timeout' => max(2, min(6, $timeoutSec + 2)),
                'retries' => 0,
            ];

            $j = http_get_json($url);

            if ($prevTimeout !== null) {
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
            } else {
                unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
            }

            if (!is_array($j) || ($j['status'] ?? '') !== 'true') return [];

            $responses = is_array($j['response'] ?? null) ? $j['response'] : [];
            if (isset($responses['s']) || isset($responses['price'])) {
                $responses = [$responses]; // single response
            }

            foreach ($responses as $idx => $item) {
                if (!is_array($item)) continue;
                $price = (float)($item['price'] ?? $item['c'] ?? 0);
                if ($price <= 0) continue;
                $chg = (float)($item['chg'] ?? $item['change'] ?? 0);
                $chgPct = (float)($item['chg_p'] ?? $item['change_p'] ?? 0);
                $ticker = $tickers[$idx] ?? null;
                if ($ticker) {
                    $out[$ticker] = [
                        'price' => $price,
                        'change_pct' => $chgPct,
                        'source' => 'fcsapi',
                    ];
                }
            }
        } catch (Throwable $e) {
            // ignore
        }

        return $out;
    }
}

if (!function_exists('fcsapi_quote_many_cached')) {
    function fcsapi_quote_many_cached(array $tickers, int $ttl = 10): array {
        $ttl = max(1, min(60, $ttl));
        $dir = __DIR__ . '/../data/cache';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $cacheKey = 'fcs_' . md5(implode(',', $tickers));
        $cacheFile = $dir . '/' . $cacheKey . '.json';
        $now = time();

        if (is_file($cacheFile)) {
            $age = $now - (int)@filemtime($cacheFile);
            if ($age >= 0 && $age < $ttl) {
                $raw = @file_get_contents($cacheFile);
                $d = $raw ? json_decode($raw, true) : null;
                if (is_array($d)) return $d;
            }
        }

        $result = fcsapi_quote_many($tickers);
        if ($result) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $result;
    }
}

// ──────────────────────────────────────────────────────────────
// Finnhub provider — free tier: 60 calls/min, WebSocket available
// Covers: forex (OANDA), stocks, commodities, crypto
// Env: FINNHUB_KEY (required)
// ──────────────────────────────────────────────────────────────

if (!function_exists('finnhub_enabled')) {
    function finnhub_enabled(): bool {
        $key = trim((string)env('FINNHUB_KEY', ''));
        return $key !== '' && strtolower((string)env('FINNHUB_ENABLED', '1')) !== '0';
    }
}

if (!function_exists('finnhub_symbol_for_market')) {
    function finnhub_symbol_for_market(string $symbol, string $assetType, array $meta = []): ?string {
        $symbol = strtoupper(trim($symbol));
        $assetType = vp_normalize_asset_type($assetType);
        $providerType = vp_provider_asset_type($assetType);

        $fh = trim((string)($meta['finnhub_ticker'] ?? ''));
        if ($fh !== '') return $fh;

        // Finnhub free tier supports US stocks, forex, and crypto
        if ($providerType === 'forex') {
            // Finnhub forex uses OANDA format: EURUSD → OANDA:EUR_USD
            if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
                return 'OANDA:' . $m[1] . '_' . $m[2];
            }
            return null;
        }

        if ($providerType === 'crypto') {
            // Finnhub crypto: BINANCE:BTCUSDT
            if (preg_match('/^([A-Z0-9]{2,10})(USDT?)$/', $symbol, $m)) {
                return 'BINANCE:' . $m[1] . $m[2];
            }
            return null;
        }

        // US stocks — use raw ticker
        if ($providerType === 'stocks') {
            if (preg_match('/^[A-Z0-9._\-]{1,30}$/', $symbol)) {
                return $symbol;
            }
        }

        return null;
    }
}

if (!function_exists('finnhub_quote_many')) {
    /**
     * Fetch real-time quotes from Finnhub REST API.
     * Finnhub quote endpoint: /quote?symbol=TICKER
     * Returns: { c: currentPrice, h: high, l: low, o: open, pc: prevClose, dp: changePct }
     * Returns: [ticker => ['price'=>float,'change_pct'=>float,'source'=>'finnhub'], ...]
     */
    function finnhub_quote_many(array $tickers, int $timeoutSec = 3): array {
        if (!finnhub_enabled() || !$tickers) return [];
        $key = trim((string)env('FINNHUB_KEY', ''));
        if ($key === '') return [];

        $tickers = array_values(array_unique(array_filter($tickers)));
        if (!$tickers) return [];

        $out = [];

        // Finnhub quote endpoint is per-symbol only (no batch), but very fast
        foreach ($tickers as $ticker) {
            try {
                $url = "https://finnhub.io/api/v1/quote?symbol=" . rawurlencode($ticker) . "&token=" . rawurlencode($key);

                $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
                    'connect_timeout' => max(1, min(3, $timeoutSec)),
                    'timeout' => max(2, min(6, $timeoutSec + 2)),
                    'retries' => 0,
                ];

                $j = http_get_json($url);

                if ($prevTimeout !== null) {
                    $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
                } else {
                    unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
                }

                if (!is_array($j)) continue;

                $price = (float)($j['c'] ?? 0);
                if ($price <= 0) continue;
                $chgPct = (float)($j['dp'] ?? 0);

                $out[$ticker] = [
                    'price' => $price,
                    'change_pct' => $chgPct,
                    'source' => 'finnhub',
                ];
            } catch (Throwable $e) {
                continue;
            }
        }

        return $out;
    }
}

if (!function_exists('finnhub_quote_many_cached')) {
    function finnhub_quote_many_cached(array $tickers, int $ttl = 5): array {
        $ttl = max(1, min(60, $ttl));
        $dir = __DIR__ . '/../data/cache';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $cacheKey = 'fh_' . md5(implode(',', $tickers));
        $cacheFile = $dir . '/' . $cacheKey . '.json';
        $now = time();

        if (is_file($cacheFile)) {
            $age = $now - (int)@filemtime($cacheFile);
            if ($age >= 0 && $age < $ttl) {
                $raw = @file_get_contents($cacheFile);
                $d = $raw ? json_decode($raw, true) : null;
                if (is_array($d)) return $d;
            }
        }

        $result = finnhub_quote_many($tickers);
        if ($result) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $result;
    }
}

// ──────────────────────────────────────────────────────────────
// Tiingo provider — free tier: REST API for forex, stocks, crypto
// Covers: forex, stocks, commodities (metals), crypto
// Env: TIINGO_KEY (required)
// ──────────────────────────────────────────────────────────────

if (!function_exists('tiingo_enabled')) {
    function tiingo_enabled(): bool {
        $key = trim((string)env('TIINGO_KEY', ''));
        return $key !== '' && strtolower((string)env('TIINGO_ENABLED', '1')) !== '0';
    }
}

if (!function_exists('tiingo_symbol_for_market')) {
    function tiingo_symbol_for_market(string $symbol, string $assetType, array $meta = []): ?string {
        $symbol = strtoupper(trim($symbol));
        $assetType = vp_normalize_asset_type($assetType);
        $providerType = vp_provider_asset_type($assetType);

        $tg = trim((string)($meta['tiingo_ticker'] ?? ''));
        if ($tg !== '') return $tg;

        if ($providerType === 'forex') {
            // EURUSD → eurusd (Tiingo forex uses lowercase pair)
            if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
                return strtolower($m[1] . $m[2]);
            }
            return null;
        }

        if ($providerType === 'commodities') {
            // Spot metals not directly available on Tiingo free tier
            return null;
        }

        // Stocks, arab — use as-is (Tiingo supports standard tickers)
        if (in_array($providerType, ['stocks', 'arab'], true)) {
            // For arab stocks, Tiingo may not support .SR suffix
            // Only use Tiingo for US stocks
            if ($providerType === 'arab') return null;
            if (preg_match('/^[A-Z0-9._\-]{1,20}$/', $symbol)) {
                return $symbol;
            }
        }

        return null;
    }
}

if (!function_exists('tiingo_quote_many')) {
    /**
     * Fetch real-time quotes from Tiingo REST API.
     * Forex: https://api.tiingo.com/tiingo/fx/top?tickers=eurusd&token=KEY
     * Stocks: https://api.tiingo.com/iex/?tickers=AAPL&token=KEY
     * Returns: [ticker => ['price'=>float,'change_pct'=>float,'source'=>'tiingo'], ...]
     */
    function tiingo_quote_many(array $tickers, string $assetType = 'forex', int $timeoutSec = 3): array {
        if (!tiingo_enabled() || !$tickers) return [];
        $key = trim((string)env('TIINGO_KEY', ''));
        if ($key === '') return [];

        $tickers = array_values(array_unique(array_filter($tickers)));
        if (!$tickers) return [];

        $assetType = vp_normalize_asset_type($assetType);
        $providerType = vp_provider_asset_type($assetType);
        $out = [];

        if ($providerType === 'forex') {
            // Tiingo FX endpoint: /tiingo/fx/top?tickers=eurusd,gbpusd&token=KEY
            try {
                $symList = implode(',', array_map('strtolower', $tickers));
                $url = "https://api.tiingo.com/tiingo/fx/top?tickers=" . rawurlencode($symList) . "&token=" . rawurlencode($key);

                $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
                    'connect_timeout' => max(1, min(3, $timeoutSec)),
                    'timeout' => max(2, min(6, $timeoutSec + 2)),
                    'retries' => 0,
                ];

                $j = http_get_json($url);

                if ($prevTimeout !== null) {
                    $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
                } else {
                    unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
                }

                if (!is_array($j)) return [];

                foreach ($j as $item) {
                    if (!is_array($item)) continue;
                    $mid = (float)($item['midPrice'] ?? 0);
                    $bid = (float)($item['bidPrice'] ?? 0);
                    $ask = (float)($item['askPrice'] ?? 0);
                    $price = $mid > 0 ? $mid : ($bid > 0 && $ask > 0 ? ($bid + $ask) / 2 : 0);
                    if ($price <= 0) continue;
                    $ticker = strtolower(trim((string)($item['ticker'] ?? '')));
                    if ($ticker === '') continue;
                    $out[$ticker] = [
                        'price' => $price,
                        'change_pct' => 0.0,
                        'source' => 'tiingo',
                    ];
                }
            } catch (Throwable $e) {
                // ignore
            }
            return $out;
        }

        if ($providerType === 'stocks') {
            // Tiingo IEX endpoint: /iex/?tickers=AAPL,MSFT&token=KEY
            try {
                $symList = implode(',', array_map('strtoupper', $tickers));
                $url = "https://api.tiingo.com/iex/?tickers=" . rawurlencode($symList) . "&token=" . rawurlencode($key);

                $prevTimeout = $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] ?? null;
                $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = [
                    'connect_timeout' => max(1, min(3, $timeoutSec)),
                    'timeout' => max(2, min(6, $timeoutSec + 2)),
                    'retries' => 0,
                ];

                $j = http_get_json($url);

                if ($prevTimeout !== null) {
                    $GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE'] = $prevTimeout;
                } else {
                    unset($GLOBALS['HTTP_GET_JSON_TIMEOUT_OVERRIDE']);
                }

                if (!is_array($j)) return [];

                foreach ($j as $item) {
                    if (!is_array($item)) continue;
                    $price = (float)($item['last'] ?? $item['tngoLast'] ?? $item['prevClose'] ?? 0);
                    if ($price <= 0) continue;
                    $prevClose = (float)($item['prevClose'] ?? 0);
                    $chgPct = $prevClose > 0 ? ((($price - $prevClose) / $prevClose) * 100.0) : 0.0;
                    $ticker = strtoupper(trim((string)($item['ticker'] ?? '')));
                    if ($ticker === '') continue;
                    $out[$ticker] = [
                        'price' => $price,
                        'change_pct' => $chgPct,
                        'source' => 'tiingo',
                    ];
                }
            } catch (Throwable $e) {
                // ignore
            }
            return $out;
        }

        return $out;
    }
}

if (!function_exists('tiingo_quote_many_cached')) {
    function tiingo_quote_many_cached(array $tickers, string $assetType = 'forex', int $ttl = 5): array {
        $ttl = max(1, min(60, $ttl));
        $dir = __DIR__ . '/../data/cache';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $cacheKey = 'tg_' . md5($assetType . '_' . implode(',', $tickers));
        $cacheFile = $dir . '/' . $cacheKey . '.json';
        $now = time();

        if (is_file($cacheFile)) {
            $age = $now - (int)@filemtime($cacheFile);
            if ($age >= 0 && $age < $ttl) {
                $raw = @file_get_contents($cacheFile);
                $d = $raw ? json_decode($raw, true) : null;
                if (is_array($d)) return $d;
            }
        }

        $result = tiingo_quote_many($tickers, $assetType);
        if ($result) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $result;
    }
}
