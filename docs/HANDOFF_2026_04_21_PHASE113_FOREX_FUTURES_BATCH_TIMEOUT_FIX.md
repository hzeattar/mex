Phase 113 focused on non-crypto request storms and provider timeout behavior.

What changed:
- Reduced non-crypto market chunk sizes to 2/2 to avoid multi-symbol upstream stalls.
- Increased single-symbol active quote timeouts for forex/stocks/arab/futures.
- Trade route non-crypto market hydration now focuses on first chunk only; no full cascade on entry.
- Home market warming no longer re-primes crypto on every quick route revisit.
- Forex EODHD bulk budget capped to 1 symbol per batch request; larger forex lists now rely on warmed cache/DB for the rest.
- Yahoo fast path now tries bulk quote cache before slower chart/live fallback for stocks/arab/futures.
- EODHD host HTTP timeout raised slightly for single active forex requests.
- Home market pool warming reduced to selected type + crypto + commodities instead of all families.

Files changed:
- assets/js/app.js
- assets/js/multibank-theme.js
- api/quotes.php
- api/lib/quotes.php
- api/lib/marketdata.php
