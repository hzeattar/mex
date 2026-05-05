# Architecture & code audit findings

This pass focused on stabilizing the Trade screen after the latest runtime regression and extending the development plan with another hardening step for initial quote freshness and chart-history protection.

## Key findings in this pass

1. **Trade runtime regression risk on first load**
   - The latest Trade initialization flow relied on seed/fallback quote freshness logic during startup.
   - The hosted screenshot showed a runtime failure around a seed freshness helper during `tradePage()` initialization.
   - The durable fix is to keep the seed freshness logic **declared early and hoisted safely** inside `tradePage()` and make all initial price usage pass through one freshness gate.

2. **Initial stale quote could still leak into chart anchoring**
   - Even after earlier fixes, `seedCandles()` could still use a cached quote or stale seed too early if it looked numerically valid.
   - This could temporarily distort the chart tail before the fresh quote arrived.

3. **Backend live-tail sync could still over-merge crypto on large drift**
   - `candles_sync_live_tail()` was still willing to merge the current live price into the last candle even with a large crypto drift.
   - This risked mutating history in a visually misleading way.

# Critical issues and root causes

## Fixed in this pass

### A. Trade startup regression / temporary-unavailable screen
**Root cause**
- Trade startup logic around quote freshness had become too fragile.
- The fix is to ensure the quote freshness helper exists at the top of Trade initialization and is used consistently for the first render path.

### B. Initial stale quote contaminating the chart
**Root cause**
- Trade seeded the header and chart from any available seed/cached quote, not only confirmed-fresh seed data.

### C. Crypto history deformation from live-tail sync
**Root cause**
- Backend candle tail sync still allowed large-drift crypto tail overwrites.

# Execution plan

This pass implemented:

1. Safe, early-declared seed freshness helpers in `tradePage()`.
2. Unified fresh-seed resolution for header, last-price ref, and chart sync.
3. Fresh-quote gating for QuoteCache usage during chart seeding.
4. Backend protection so large crypto drift no longer mutates history candles.
5. Full syntax review and full PHP lint sweep across the project.

# Implemented fixes

## 1) Trade seed freshness hardening
Updated:
- `app.js`
- `assets/js/app.js`

Added inside `tradePage()`:
- `tradeQuoteTsSec(...)`
- `seedQuotesFresh(...)`
- `resolveFreshTradeSeed()`
- `resolveFreshQuoteCacheQuote(...)`

These now ensure:
- no stale seed is accepted during first Trade render
- startup quote usage is centralized
- the Trade page does not rely on opportunistic seed data anymore

## 2) Header and last-price startup protection
Updated:
- `app.js`
- `assets/js/app.js`

Changed:
- `extraRef` now initializes from **fresh seed only**
- `lastPriceRef` initializes from **fresh seed only**
- `bootstrapTradeQuote()` now applies seed only if it is fresh

## 3) Chart seed protection
Updated:
- `app.js`
- `assets/js/app.js`

Changed in `seedCandles()`:
- QuoteCache input is accepted only if it passes freshness checks
- fallback seed is accepted only if it passes the same freshness checks
- otherwise the chart remains anchored to the latest candle close instead of a stale quote

## 4) Backend crypto-history protection
Updated:
- `api/trade/candles.php`

Changed in `candles_sync_live_tail()`:
- if the asset is crypto and live drift vs. last close is too large, the backend now returns cached candles unchanged instead of forcing a misleading tail merge

# UI/UX improvements for mobile

- Trade first-open behavior is more stable.
- The chart is less likely to show a false vertical cut on the first second of opening.
- Mobile startup now relies less on stale cached quote state.

# UI/UX improvements for desktop

- Trade startup is more deterministic.
- History integrity is better preserved when the live price catches up after initial load.
- First-paint flicker risk is lower because stale seed usage is gated more aggressively.

# Validation results

## JS syntax
- `app.js` ✅
- `assets/js/app.js` ✅
- `multibank-theme.js` ✅
- `assets/js/multibank-theme.js` ✅

## PHP lint
- Full sweep across **166 PHP files** ✅
- `api/trade/candles.php` ✅
- `app.php` ✅
- `index.php` ✅
- `admin/includes/auth.php` ✅

## Root/assets mirror sync
- `app.js` ↔ `assets/js/app.js` ✅
- `multibank-theme.js` ↔ `assets/js/multibank-theme.js` ✅

# Changed files list

Changed in this pass:
- `app.js`
- `assets/js/app.js`
- `api/trade/candles.php`
- `docs/FINAL_REVIEW_COMPREHENSIVE_2026_04_14.md`

# Final status and remaining notes

## Closed in this pass
- Trade first-load seed freshness regression
- stale first quote contaminating chart tail
- crypto live-tail history distortion risk

## Closed in earlier passes and preserved here
- symbol switching stability
- route ownership for Trade
- PERP/spot alignment hardening
- dashboard/account/wallet/support/news/admin hardening

## Remaining work from the broader development plan
1. **Live browser QA on hosting**
   - warm open / cold open for BTCUSDT, ETHUSDT, XAUUSD, SLV, futures/perp pairs
2. **Final performance profiling pass**
   - request cadence on Trade
   - mobile repaint / rerender profiling
3. **Dense Admin polish on real data**
   - high-row-count tables
   - filter ergonomics
4. **Optional deeper modular refactor later**
   - `tradePage()` is now much safer, but it is still large and can later benefit from extraction into smaller modules
