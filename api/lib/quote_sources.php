<?php
declare(strict_types=1);

require_once __DIR__ . '/market_resolver.php';
require_once __DIR__ . '/quotes.php';

if (!function_exists('vp_quote_source_rank')) {
    function vp_quote_source_rank(?string $source): int
    {
        $src = strtolower(trim((string)$source));
        return match ($src) {
            'binance' => 100,
            'trade_stream', 'stream' => 96,
            'provider_live' => 92,
            'finnhub' => 89,
            'tiingo' => 87,
            'twelvedata' => 86,
            'massive', 'polygon' => 90,
            'eodhd', 'eodhd_rest', 'eodhd_intraday' => 88,
            'fcsapi' => 82,
            'provider_fallback' => 84,
            'yahoo', 'yahoo_chart_live' => 72,
            'fx_fallback', 'frankfurter', 'stooq' => 66,
            'cache', 'stale_cache' => 12,
            'seed', 'seed_fallback', 'seed_price', 'chart_seed', 'seed_candle', 'synthetic', 'aggs' => 4,
            default => ($src === '' ? 0 : 40),
        };
    }
}

if (!function_exists('vp_quote_source_is_trusted')) {
    function vp_quote_source_is_trusted(?string $source, string $assetType = ''): bool
    {
        return quote_source_is_liveish($source, $assetType);
    }
}

if (!function_exists('vp_quote_source_is_untrusted')) {
    function vp_quote_source_is_untrusted(?string $source): bool
    {
        return quote_source_is_untrusted($source);
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
// TwelveData provider — free tier: 8 credits/min, 800/day
// Covers: forex, stocks, commodities, crypto, ETFs, indices
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

        // Check meta for explicit override
        $td = trim((string)($meta['twelvedata_ticker'] ?? ''));
        if ($td !== '') return $td;

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
            // USOIL → crude oil
            if ($symbol === 'USOIL' || $symbol === 'UKOIL') {
                return $symbol === 'USOIL' ? 'CL/USD' : 'BZ/USD';
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

        // Stocks, arab, futures — use as-is
        if (in_array($providerType, ['stocks', 'arab', 'futures', 'indices'], true)) {
            if (preg_match('/^[A-Z0-9._\-]{1,20}$/', $symbol)) {
                return $symbol;
            }
        }

        return null;
    }
}

if (!function_exists('twelvedata_quote_many')) {
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

        // TwelveData batch endpoint supports max 30 symbols per request
        $chunks = array_chunk($tickers, 30);
        foreach ($chunks as $chunk) {
            try {
                $symList = implode(',', array_map('rawurlencode', $chunk));
                $url = "https://api.twelvedata.com/quote?symbol={$symList}&apikey=" . rawurlencode($key);

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

                // Batch response: { "EUR/USD": {...}, "XAU/USD": {...} } or single: {...}
                // Single symbol response has "symbol" key
                if (isset($j['symbol']) && isset($j['close'])) {
                    $ticker = $chunk[0] ?? '';
                    $price = (float)($j['close'] ?? 0);
                    $chg = (float)($j['change'] ?? 0);
                    $prevClose = (float)($j['previous_close'] ?? 0);
                    $chgPct = $prevClose > 0 ? (($chg / $prevClose) * 100.0) : (float)($j['percent_change'] ?? 0);
                    if ($price > 0) {
                        $out[$ticker] = [
                            'price' => $price,
                            'change_pct' => $chgPct,
                            'source' => 'twelvedata',
                        ];
                    }
                    continue;
                }

                // Batch response
                foreach ($j as $ticker => $data) {
                    if (!is_array($data)) continue;
                    $price = (float)($data['close'] ?? 0);
                    if ($price <= 0) continue;
                    $chg = (float)($data['change'] ?? 0);
                    $prevClose = (float)($data['previous_close'] ?? 0);
                    $chgPct = $prevClose > 0 ? (($chg / $prevClose) * 100.0) : (float)($data['percent_change'] ?? 0);
                    $out[$ticker] = [
                        'price' => $price,
                        'change_pct' => $chgPct,
                        'source' => 'twelvedata',
                    ];
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

if (!function_exists('fcsapi_enabled')) {
    function fcsapi_enabled(): bool {
        return strtolower((string)env('FCSAPI_ENABLED', '1')) !== '0';
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

        if ($providerType === 'forex') {
            // EURUSD → OANDA:EUR_USD
            if (preg_match('/^([A-Z]{3})([A-Z]{3})$/', $symbol, $m)) {
                return 'OANDA:' . $m[1] . '_' . $m[2];
            }
            return null;
        }

        if ($providerType === 'commodities') {
            // XAUUSD → OANDA:XAU_USD
            if (preg_match('/^(XAU|XAG|XPT|XPD)(USD)$/', $symbol, $m)) {
                return 'OANDA:' . $m[1] . '_' . $m[2];
            }
            return null;
        }

        // Stocks, arab — use raw ticker
        if (in_array($providerType, ['stocks', 'arab'], true)) {
            // Strip exchange suffix for Finnhub: 2222.SR → just 2222.SR (Finnhub supports .SR)
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
