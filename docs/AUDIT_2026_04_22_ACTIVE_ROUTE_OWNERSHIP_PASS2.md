# VertexPluse Audit Pass 2 — Active Route Ownership / Snapshot Staleness Guard

## What this pass addressed
This pass focused on the next confirmed conflict after the `#/markets` route fix:

1. Multiple runtime paths were still allowed to mutate `state.markets` while the active screen was already hydrating and painting prices.
2. `market_snapshot.php` could still replay non-crypto quote rows with a staleness window that was too relaxed for the current UI cadence.
3. Background priming could still trigger active rerenders outside the Home route.

## Changes applied

### 1) Markets page becomes the active owner of `state.markets`
File: `assets/js/app.js`

Applied to:
- asset-type switch inside `marketsPage()`
- non-crypto hydration inside `startBatchHydration()`
- first-load fetch inside `marketsPage()`
- manual refresh button inside `marketsPage()`

Change:
- `refreshMarkets(...)` now runs with `applyToState:false` in those active markets-page ownership paths.
- The page merges the returned rows locally using `vpMergeMarketItemsByKeyLite(...)`, then writes once into `state.markets`.

Why:
- prevents a second implicit writer from racing the page owner
- reduces old/new/old repaint risk caused by overlapping internal merges

### 2) Background warm for Trade / Markets no longer mutates active market state
File: `assets/js/app.js`

Applied to `warmRouteData()`:
- `route === 'trade'`
- `route === 'markets'`

Change:
- route warm keeps warming caches, but now uses `applyToState:false`

Why:
- active screen stays in charge of the visible market pool
- background warm still helps later reads without repainting over current live rows

### 3) Global market priming rerenders only on Home
File: `assets/js/app.js`

Applied to `primePlatformMarketUniverse()`:
- added `allowActiveRender = routeName === 'home'`
- background prime updates data/cache, but requestRender() is suppressed outside Home

Why:
- Home benefits from background market pool refresh
- Trade / Markets should not be visually re-driven by off-screen priming

### 4) Snapshot cache and stale acceptance tightened
File: `api/market_snapshot.php`

Changes:
- route cache TTL:
  - trade: `1s` (was `2s`)
  - home: `2s`
  - others: `2s`
- quote usability windows tightened:
  - stocks/arab snapshot fallback reduced significantly
  - commodities/futures reduced more aggressively
  - forex reduced moderately

Why:
- snapshot is meant to seed and warm, not to compete with live page ownership
- lowers the chance of replaying slightly old DB-backed quote rows into an already-live UI

## Practical effect expected

### Should improve
- old -> new -> old flashes on non-crypto market boards
- market page repaint after a newer live row already arrived
- extra visual churn caused by background route warm and global prime

### Should not break
- local warm cache usage
- Home dashboard priming
- active page hydration and refresh controls
- trade page active symbol live updates

## Files changed in this pass
- `assets/js/app.js`
- `api/market_snapshot.php`

## Already present from previous pass
- `#/markets` no longer routes into `tradePage()`
- read-path quote persistence enabled
- small non-crypto direct/visible microcache enabled

## Next recommended audit target
If further old/new/old remains after this pass, the next highest-probability source is:

1. trade drawer live updates mutating `state.markets`
2. page-specific quote rows vs drawer cache rows sharing the same symbol pool
3. `market_snapshot` / `refreshMarkets` / drawer live tick overlap on the same symbol family while switching quickly between families

That next pass should instrument and isolate:
- trade drawer writer
- markets page writer
- trade active symbol writer
- home prime writer
