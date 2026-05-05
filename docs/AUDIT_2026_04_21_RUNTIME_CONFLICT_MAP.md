# Audit 2026-04-21 — Runtime conflict map + first stabilization pass

## Scope executed
Reviewed runtime ownership and conflict points in:
- `app.php`
- `assets/js/app.js`
- `assets/js/multibank-theme.js`
- `api/quotes.php`
- `api/lib/quotes.php`
- `api/market_snapshot.php`
- `api/trade/candles.php`
- `.env`
- `.env.example`

## Baseline findings

### 1) Dual frontend runtime layer is real
`app.php` loads both runtime bundles:
- `assets/js/app.js`
- `assets/js/multibank-theme.js`

### 2) `#/markets` had conflicting ownership
Before this pass:
- `routeNameFromHash()` in `assets/js/app.js` treated `#/markets` as **trade**
- `route()` in `assets/js/app.js` rendered **tradePage()** for `#/markets`
- `route()` in `assets/js/multibank-theme.js` rendered **marketsPage()** for `#/markets`

This means the same hash had two meanings at runtime: trade/drawer behavior in the base layer and markets behavior in the themed layer.

### 3) Timer / request pressure is high
Static count:
- `assets/js/app.js`: 17 `setInterval(...)`
- `assets/js/multibank-theme.js`: 15 `setInterval(...)`

Both bundles also issue quote calls using:
- cached `/quotes.php?type=...&symbols=...`
- `fresh=1`
- `direct=1`
- `visible=1`

### 4) Env was weakening the warm-authority model
The shipped env had:
- `READ_ENDPOINTS_PERSIST_QUOTES=0`
- `QUOTES_API_DIRECT_CACHE_TTL_NONCRYPTO=0`
- `QUOTES_API_VISIBLE_CACHE_TTL_NONCRYPTO=0`

That reduced warm quote reuse and made repeated non-crypto direct/visible calls more likely.

## First stabilization changes applied

### A) Unified `#/markets` route ownership in base runtime
Updated `assets/js/app.js`:
- `routeNameFromHash('#/markets')` now returns `markets`
- `route()` now renders `marketsPage()` for `#/markets`
- removed the base behavior that forced `#/markets` into trade drawer mode

### B) Re-enabled read-path quote persistence
Updated `.env` and `.env.example`:
- `READ_ENDPOINTS_PERSIST_QUOTES=1`

### C) Enabled short non-crypto microcache guard
Updated `.env` and `.env.example`:
- `QUOTES_API_DIRECT_CACHE_TTL_NONCRYPTO=1`
- `QUOTES_API_VISIBLE_CACHE_TTL_NONCRYPTO=1`

## Why this pass is safe
This pass does not replace the price architecture. It only:
1. removes a route ownership contradiction
2. restores intended warm quote persistence
3. adds a minimal 1-second microcache guard for repeated non-crypto direct/visible requests

## Recommended next audit wave
1. Exact request/timer map per route: home / trade / markets / trade drawer
2. All writers into `state.markets`, `VPQuoteStore`, trade live quote store, and remembered quote cache
3. `api/quotes.php` precedence validation for cached vs provider vs stale fallback
4. Chart tail verification on forex / commodities / stocks / arab stocks
5. Cron overlap review for `quotes_tick.php`, `quotes_warm.php`, `market_ingest.php`, `markets_sync.php`

## Validation completed
Executed:
- `node --check assets/js/app.js`
- `php -l api/quotes.php`
- `php -l api/market_snapshot.php`
- `php -l api/trade/candles.php`
- `php -l app.php`
