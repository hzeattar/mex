# Phase118 — Stocks/Arab warm-refresh fix + signals fastpath

## What changed

### 1) Non-crypto list hydration no longer forces `fresh=1`
Updated these UI paths to use cached/warm `/quotes.php?type=...&symbols=...` for non-crypto, while keeping `fresh=1` only for crypto:
- trade watch tabs
- home live bindings
- signal live binding fallback
- trade drawer live hydration

This reduces canceled/pending storms for:
- stocks
- arab
- futures
- forex

### 2) Single-symbol warm path no longer blocks refresh for too long
`api/quotes.php` was returning the DB warm quote too aggressively for single non-crypto symbols.
Now it only short-circuits for a very small age window:
- stocks / arab: 5s
- forex / futures / commodities: 3s

After that, the request falls through to provider refresh logic again.

### 3) Signals load faster
- Added client-side cache for `fetchSignals()` in `assets/js/app.js`
- Reduced signal quote enrichment timeout
- `refreshTradingBotSignals()` now probes signal endpoints in parallel instead of sequentially
- Increased dashboard signal cache TTL to avoid reloading the same desk repeatedly

## Files changed
- `assets/js/app.js`
- `assets/js/multibank-theme.js`
- `api/quotes.php`

## Validation
- `node --check assets/js/app.js`
- `node --check assets/js/multibank-theme.js`
- `php -l api/quotes.php`
