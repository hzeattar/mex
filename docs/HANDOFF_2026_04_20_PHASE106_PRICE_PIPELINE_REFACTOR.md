# Phase 106 — Price Pipeline Refactor

Base: phase105_phase87_eodhd_forex_warm_reuse_2026_04_20

## Goals
- Stop multi-source quote storms across Home / Markets / Trade.
- Remove stale non-crypto batch replay from `quotes.php?fresh=1`.
- Make Markets page hydrate via batched `quotes.php` instead of `markets.php?with_quotes=1` loops.
- Prevent older DB/provider writes from overwriting newer quotes.
- Slow down repeated route priming / live loops to reduce rerenders.

## Files changed
- assets/js/app.js
- assets/js/multibank-theme.js
- api/quotes.php
- api/lib/quotes.php

## Key changes
1. `refreshMarkets()` now defaults to metadata-first (`with_quotes=false`) unless explicitly requested.
2. `vpFetchFreshMarketQuotes()` for non-crypto now overlays batched `quotes.php` results, not `markets.php?with_quotes=1`.
3. Markets page non-crypto hydration now uses staged quote chunks from `quotes.php` instead of reloading full markets-with-quotes.
4. Trade page removed the extra non-crypto polling loop and relies on the shared `QuoteCache` active-symbol loop.
5. Route priming window increased to avoid re-booting heavy price hydration on every navigation.
6. Home live timers slowed down and remembered-quote reuse windows widened.
7. `api/quotes.php` no longer serves stale shared non-crypto cache during `fresh=1` requests.
8. `quote_upsert()` now refuses to overwrite newer/trusted quotes with older/lower-authority writes.

## Expected outcome
- Fewer duplicate requests and fewer cancelled requests.
- No more “new quote appears then older quote replaces it” from stale batch replay.
- Better reuse of dashboard-loaded quotes when entering Markets / Trade.
- Lower rerender pressure on Trade and Home.
