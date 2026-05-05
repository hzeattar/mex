# Phase 103 — Staged request pipeline + boot loader

## Goal
Reduce quote/request storms and make first-open behavior stable:
- cached snapshot first
- progressive background hydration
- fewer parallel hot requests
- keep latest quote persisted for instant fallback

## Changes

### Frontend
- Added global hot-request scheduler in `assets/js/app.js`
  - hot lane limit: 2 concurrent
  - normal lane limit: 6 concurrent
  - applies to `quotes.php`, `markets.php`, `market_snapshot.php`, `trade/stream.php`, `trade/candles.php`
- Added staged boot loader overlay with progress bar
- Reworked `primePlatformMarketUniverse()`
  - start from cached `market_snapshot.php`
  - hydrate live prices by type sequentially
  - wave delay between groups
- Reworked `vpFetchFreshMarketQuotes()`
  - use `quotes.php` in controlled chunks
  - avoid repeatedly calling `markets.php?with_quotes=1` for whole categories during priming
- Reduced duplicate warm jobs in `warmRouteData()` for `home/trade/markets`

### Backend
- `api/market_snapshot.php`
  - now returns cached market + cached DB quotes by default
  - direct provider hits only when `direct=1`
  - cache TTL relaxed for boot snapshot
- `api/lib/quotes.php`
  - read-path quote persistence default changed to enabled (`READ_ENDPOINTS_PERSIST_QUOTES=1` fallback)

## Expected result
- first screen should appear faster with cached prices
- live prices should hydrate progressively instead of flooding the server
- fewer canceled/timeout requests in DevTools
- active trade symbol remains prioritized by scheduler

## Deployment
1. upload files
2. clear OPcache
3. hard refresh browser / mobile webview
4. verify first-open behavior:
   - initial snapshot request
   - controlled quote batches
   - no large parallel storm of `quotes.php?fresh=1` across all types at once

## Notes
This pass focuses on request orchestration and boot behavior.
It does **not** claim final provider perfection for every symbol family without server-side live verification.
