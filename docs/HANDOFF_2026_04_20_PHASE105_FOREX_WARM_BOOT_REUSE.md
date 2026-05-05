# Phase 105 — Forex EODHD Fix + Warm Quote Reuse

## What changed
- Fixed EODHD preference for forex in server quote authority.
- Added EODHD realtime->intraday fallback when realtime quote is unavailable.
- Persisted recent live quotes in browser storage and restore them on boot.
- Reused warm market caches across dashboard -> market -> trade transitions.
- Increased non-crypto warm quote windows to avoid flashing older seed/stale values during navigation.
- Trusted EODHD sources in UI authority selection.

## Files changed
- assets/js/app.js
- api/lib/marketdata.php
- api/lib/quotes.php
- api/markets.php
