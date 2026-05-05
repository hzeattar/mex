# Phase 102 — EODHD provider rebuild on Phase 87 base

Base used:
- vertexpluse_phase87_trade_drawer_yahoo_cron_fix_2026_04_19 (1).zip

Goal:
- keep the current VertexPluse shell/UI
- stop using Massive as the active non-crypto authority
- push stocks + arab + forex to EODHD first
- let commodities/futures use EODHD when a valid EODHD symbol exists, otherwise fall back to Yahoo
- keep crypto on Binance
- align candles with the same source family used by quotes

Main code changes:
1. api/lib/marketdata.php
   - expanded `eodhd_symbol_for_market()`
   - improved Arab suffix handling (.SR / .DU / .AD / .EGX)
   - added forex/index aliases for common CFD-style symbols
   - added commodity/metal EODHD mapping for spot metals
   - added `eodhd_quote_from_intraday()` fallback
   - `eodhd_quote_realtime()` now falls back to intraday when real-time is unavailable

2. api/lib/quotes.php
   - `quote_bulk_live()` now prefers EODHD for arab / stocks / forex / commodities
   - Massive now remains only explicit opt-in fallback when `PRICE_PROVIDER=massive`
   - `quote_price_fresh()` now prefers EODHD first on the same families
   - `quote_fetch_external()` now prefers EODHD first on the same families
   - `quotes_tick()` now bulk-refreshes forex with EODHD too, not just stocks/arab/commodities
   - selected-batch direct refresh now uses provider-neutral direct fetch instead of Polygon-first logic

3. api/quotes.php
   - stale refresh collection now skips Massive when `PRICE_PROVIDER=eodhd`
   - EODHD request coverage expanded to forex / commodities / futures / arab / stocks

4. api/trade/candles.php
   - candles now try EODHD first for arab / stocks / forex / commodities / futures
   - Yahoo remains the broad fallback when EODHD cannot serve the symbol/timeframe

Notes:
- crypto path was not changed; it stays on Binance
- futures and many soft commodities may still use Yahoo if the installed EODHD plan/symbol mapping does not serve them cleanly
- this pass is focused on restoring live quotes + chart bootstrap on the Phase 87 base without changing the platform shell
