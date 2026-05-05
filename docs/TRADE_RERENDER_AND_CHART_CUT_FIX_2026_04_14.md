# Trade rerender + chart cut fix — 2026-04-14

## Fixed in this pass

### 1) Trade symbol switching now uses real hash navigation
Previously `vpApplyTradeSelection(...)` updated the hash via `history.replaceState(...)` and then forced a render.
That made trade selection fragile because route lifecycle hooks (`hashchange`, route warmup, trade cleanup) did not always run as a normal route transition.

Now selection writes the full `#/trade?...` hash through `location.hash` when the target trade selection actually changed.
This makes symbol/type/market switching deterministic on both desktop and mobile.

### 2) Stale-candle spike protection
The chart was able to create a huge synthetic candle when the last seeded candle was stale and the live quote drifted far away from it.
That produced the visible "cut" / "vertical spike" on the right side of the chart.

The fix adds two guards:
- when seeded candles are too stale or drift too far from live price, the chart anchors a flat live candle for the current bucket instead of drawing a giant bridge candle from the stale close
- when live quote drift is extreme during ongoing updates, the chart anchors the current bucket and reseeds instead of stretching a bad candle

### 3) Reduced trade-side background request pressure
Trade account summary refresh was polling too often for wallet/portfolio/pnl.
The trade summary loop is now:
- slower
- protected against overlap

That keeps live price fast while reducing redundant non-price requests.

## Files changed
- `assets/js/app.js`
- `app.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.js`

## Validation
- `node --check assets/js/app.js`
- `node --check app.js`
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`

All passed.
