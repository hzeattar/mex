# Markets single-tap fix + UI/UX hardening

## Fixed

### 1) Markets cards needed a double tap/click to open Trade
Root cause:
- `marketsPage()` was still using a direct `state.selectedSymbol = ...; location.hash = '#/trade';` path.
- The newer Trade route ownership logic expects full symbol/type/market route state.
- On some flows the first tap only primed state while Trade rebuilt from its own route state, so the user effectively needed a second tap.

Resolution:
- Replaced direct market-card navigation with `window.vpApplyTradeSelection(...)`.
- Added a robust fallback route with `#/trade?symbol=...&type=...&market=...`.
- Applied the same handler to:
  - full market row click
  - keyboard open (Enter / Space)
  - inline Trade CTA button

### 2) Markets UI interaction hardening
- Added `role="button"` and keyboard activation to market rows.
- Added `touch-action: manipulation` and disabled tap highlight for cleaner mobile interaction.
- Added `:focus-visible` state so desktop keyboard navigation is usable and visually clear.

## Files changed
- `app.js`
- `assets/js/app.js`
- `app.css`
- `assets/css/app.css`

## Validation
- `node --check app.js`
- `node --check assets/js/app.js`

Both passed.
