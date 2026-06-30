# Chart and market data review — 2026-06-30

Read-only review branch: `charts`.
Backup branch: `backup-main-chart-20260630`.

## Scope
- Review chart data flow for crypto, forex, stocks, commodities, futures, and Arab stocks.
- Keep Twelve Data as the preferred non-crypto feed.
- Keep Binance as the direct crypto feed.
- Avoid destructive cache deletion or database cleanup without a separate approval.

## Current findings
- The Vite trade page already uses `lightweight-charts` and updates live crypto candles through Binance kline WebSocket.
- Non-crypto active quotes are intentionally fed through the server cache and `quote_focus.php` polling.
- The main candles endpoint already rejects weak sources for non-crypto when `CANDLES_REQUIRE_TWELVEDATA_NONCRYPTO=1`.
- The backend already disables Yahoo for quote/chart authority paths and prefers Twelve Data for non-crypto symbols.
- Existing candle finalization already removes synthetic gap candles, clips extreme outlier wicks, and smooths micro-noise for short non-crypto timeframes.

## Safe next changes to apply
1. Remove the visible bid/ask-style buy/sell price widgets from the order ticket and keep one live price only.
2. Add a stricter frontend candle sanitizer before `setData`/`update` so old bad candles cannot render as spiky leftovers.
3. Expand Twelve Data symbol aliases for commodities, futures, and Arab stocks through metadata-first mapping.
4. Add a read-only audit endpoint/report for market mapping, quote freshness, and chart source quality.

## Deferred because they are destructive
- Deleting old candle cache files.
- Purging `market_candles` rows.
- Replacing DB market definitions in bulk.

Those need approval after reviewing a dry-run report.
