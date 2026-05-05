# Trade Architecture Cleanup — 2026-04-14

## Why this pass was necessary
The trade page was no longer failing in the obvious way, but it still carried structural fragility in three places:

1. **Route ownership** was split between `app.js` and multiple `multibank-theme.js` overrides.
2. **Chart requests** could still apply stale candle responses after market/TF switches.
3. **Crypto chart live anchoring** could still create synthetic jump candles when cached history lagged behind live quotes.

## What was changed

### 1) Unified trade route commit helper
Added `vpCommitTradeRoute(...)` in `assets/js/multibank-theme.js` and mirrored it to `multibank-theme.js`.

This helper now centralizes:
- symbol
- asset type
- trade market
- watch tab
- search
- ticket tab

It writes state + localStorage + hash in one place.

### 2) Cleaner trade market switching
Inside `tradePage()` in `app.js`:
- `switchMarket()` now commits route state immediately through `vpCommitTradeRoute(...)`
- TF changes also keep route ownership coherent

This reduces delayed state drift after spot/perp switches.

### 3) Stale-request guard for trade chart bootstrapping
Added per-page request sequence guards for:
- `seedCandles()`
- `bootstrapTradeQuote()`
- `loadMoreCandles()`

Old responses are ignored if:
- the page was cleaned up
- the market changed
- the timeframe changed
- a newer request already started

This is the main anti-race fix in this pass.

### 4) QuoteCache active-snapshot guard
The shared `QuoteCache` poller now snapshots the active symbol/type/market at tick start and refuses to publish late responses for an older active instrument.

This reduces cross-symbol/cross-market contamination during fast navigation.

### 5) Crypto chart anti-cut hardening
Two additional protections were added:
- front-end trade chart no longer synthesizes a bridging candle for crypto when drift is large; it prefers a flat live anchor + reseed
- backend `candles_sync_live_tail()` now uses a flat live anchor for crypto when cache gap/drift is large instead of bridging from an outdated close

## Files changed in this pass
- `assets/js/app.js`
- `app.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `api/trade/candles.php`

## Validation
- `node --check assets/js/app.js`
- `node --check app.js`
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `php -l api/trade/candles.php`

All passed in the local review environment.

## What remains after this pass
Still worth doing next on real hosting/browser QA:
- verify perp market toggle against live server data across several symbols
- verify crypto 1m/5m switching under repeated fast navigation
- optionally reduce layered `tradePage` overrides further into fewer composition helpers
