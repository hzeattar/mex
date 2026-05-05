# Phase 108 — single-authority first pass

This pass focuses on three classes of regressions observed in the uploaded screen recordings:

1. stale replay on non-crypto quotes (`new -> old -> old sticks`)
2. request storms from repeated `quotes.php` calls with mixed query ordering / repeated direct fetches
3. same-route full re-renders while the user is scrolling

## Files changed

- assets/js/app.js
- assets/js/multibank-theme.js
- api/market_snapshot.php
- api/lib/quotes.php
- api/quotes.php

## What changed

### Frontend
- canonicalized `quotes.php` request URLs before hitting the in-memory request cache so repeated batches reuse the same inflight/cached request even when symbol order changes
- increased non-crypto reuse window when moving from dashboard to trade
- disabled aggressive `direct=1` batching for forex/stocks/arab/futures waves to reduce timeout/cancel storms
- added scroll-aware render throttling so same-route refreshes are deferred while the user is actively scrolling
- changed non-crypto quote authority replacement rules to prefer trusted higher-rank providers over older stale/seed/cache values

### Backend
- `market_snapshot.php` no longer performs live non-crypto provider fetches; snapshot is now cache/bootstrap oriented
- normalized non-crypto provider writes to use fetch-time freshness in `updated_at` for API/UI arbitration
- strengthened `quote_upsert()` so trusted live providers can replace old cache/seed rows even when the provider timestamp lags

## Notes
- This is an architectural cleanup pass, not a complete price-engine rewrite.
- It should reduce rerender/scroll jumps and prevent many `new then old` replays, but the live host still needs OPcache clear and runtime verification after deployment.
