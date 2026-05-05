# Phase 104 — Warm quote reuse + markets fast path

## Goal
Reduce route-to-route price reload lag, avoid replaying older market rows after dashboard hydration, and cut provider pressure when opening Markets/Trade after Home.

## What changed

### Frontend
- Added persisted live-quote memory in `assets/js/app.js`
  - stores trusted latest quotes in localStorage
  - reloads them on boot and route changes
  - rehydrates `VPQuoteStore` and in-memory quote maps
- Relaxed non-crypto overlay age thresholds so Markets/Trade can reuse the latest already-loaded quote instead of showing an older DB/seed value first
- `refreshMarkets()` now prefers the already-primed drawer/global market pool for immediate render before network
- `vpFetchFreshMarketQuotes()` now remembers provider results into live-quote memory
- `fetchQuote()` now accepts warm remembered quotes for longer on non-crypto symbols before forcing another network roundtrip

### Backend
- `api/quotes.php`
  - persists successful provider results from the fast path into `market_quotes`
- `api/markets.php`
  - defaults to DB-backed warm quotes for non-crypto `with_quotes=1`
  - provider overlay/fallback is now opt-in via `live=1` or still active for crypto
  - short cache TTL restored for warm non-crypto market lists to avoid repeated identical fetch work
  - persists provider overlay rows when used
- `api/lib/quotes.php`
  - fixed EODHD branch condition to use `$assetType`

## Expected impact
- Dashboard-loaded prices should carry into Markets/Trade much more cleanly
- Less “old price then new price later” when navigating
- Fewer repeated non-crypto provider hits from `markets.php`
- Faster first render for market drawers/lists after Home warm-up

## Files changed
- `assets/js/app.js`
- `api/markets.php`
- `api/quotes.php`
- `api/lib/quotes.php`
