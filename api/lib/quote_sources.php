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
            'massive', 'polygon' => 90,
            'eodhd', 'eodhd_rest', 'eodhd_intraday' => 88,
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
