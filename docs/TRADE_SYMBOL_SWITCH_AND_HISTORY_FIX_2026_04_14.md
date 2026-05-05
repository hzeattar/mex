# Trade symbol switch and history correctness hotfix — 2026-04-14

## Fixed

### 1) Trade symbol did not actually change on desktop/mobile
Root cause:
- Trade route state was being re-read from the hash on every render.
- Internal symbol selection inside the trade watchlist and mobile symbols drawer updated only `state.selectedSymbol` and then called `render()`.
- Because the hash still contained the old `symbol`, the next trade render restored the previous symbol again.

Applied fix:
- Added `vpApplyTradeSelection(...)` as a single route/state sync helper.
- Updated:
  - trade watchlist row selection
  - mobile symbols drawer selection
  - trade watchlist callback in `app.js`
  - `setSymbolAndGo(...)`
- Selection now updates:
  - `state.selectedSymbol`
  - `state.selectedAssetType`
  - `tradeSymbol / marketType / tradeMarket` in localStorage
  - `#/trade?symbol=...&type=...&market=...`
- Then it triggers a single forced render for the active trade route.

### 2) Trade history / deal log looked old
Root cause:
- Trade log cards were rendered in backend order with no strict client-side time sort.
- The trade deals list also defaulted to an empty symbol filter, which could show stale unrelated history instead of the currently open instrument.

Applied fix:
- `tradeOrdersToCards(...)` now sorts by the newest meaningful timestamp first.
- Trade deals filter input now defaults to the currently selected symbol.
- The right-side `My Trades` lists are also sorted by newest timestamp for:
  - positions
  - orders
  - history

### 3) Excessive full rerender feeling when trying to switch symbol
Root cause:
- Clicking a symbol triggered a render without first synchronizing the route owner.
- That caused a re-render back into the old symbol state.

Applied fix:
- Symbol changes now go through one state+route sync path before rendering.
- This removes the "re-render but nothing changed" behavior that felt like repeated refresh.

## Files changed
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/js/app.js`
- `app.js`

## Validation
- `node --check assets/js/multibank-theme.js` ✅
- `node --check multibank-theme.js` ✅
- `node --check assets/js/app.js` ✅
- `node --check app.js` ✅
