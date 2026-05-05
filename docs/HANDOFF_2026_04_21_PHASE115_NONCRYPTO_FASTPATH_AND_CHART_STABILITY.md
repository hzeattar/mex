# Phase 115 — Non-crypto fast-path + chart stability

## Focus
- Stop non-crypto list hydration from hammering `fresh=1` on every batch.
- Prefer warm/cached quotes for non-crypto lists.
- Keep direct fresh refresh for the active single symbol.
- Fix type-aware quote seeding in candles.
- Reduce iPhone chart disappearance caused by visualViewport scroll resize churn.

## Files changed
- assets/js/app.js
- api/trade/candles.php
- api/quotes.php

## Key changes
1. `fetchQuote()` for non-crypto now tries warm cached `quotes.php` first, then direct fresh single-symbol refresh.
2. `fetchQuoteChunk()` for non-crypto now uses cached/stale-tolerant `quotes.php` path instead of `fresh=1` batched pressure.
3. Trade chart resize no longer listens to `visualViewport.scroll`, only resize/orientation changes.
4. Non-crypto chart cache fast-path is more permissive, so cached candles appear faster.
5. `candles.php` quote seed path is now type-aware via `quote_get($symbol, $type)`.
6. `api/quotes.php` persists successful non-crypto live rows from read-path batches back into `market_quotes`.
