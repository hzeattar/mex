# Home Signal Desk + Watchlist Live Fix — 2026-04-15

## What was fixed

### 1) Home Signal Desk cards were not visibly updating live
The home Signal Desk cards already had their own signal live loop, but to make the dashboard itself react reliably on the home route, the signal quote widget was also wired into the home live quote binding system.

Added home live markers to the mini quote widget:
- `data-home-live-symbol`
- `data-home-live-type`
- existing live price / change fields are now patched by the home live loop too

This means the home dashboard can now update the visible signal quote price/change directly from fresh quote pulls, instead of depending only on the signal-card loop.

### 2) Home Watchlist was static
The watchlist rows were rendered from the home market pool but had no live binding hooks.

Added per-row live binding markers:
- `data-home-watch-symbol`
- `data-home-watch-type`
- `data-home-watch-bid`
- `data-home-watch-ask`
- `data-home-watch-change`

And extended the home live collector / patcher to update:
- bid
- ask
- 24h change

without rerendering the whole page.

## Files changed
- `assets/js/multibank-theme.js`
- `multibank-theme.js`

## Validation
- `node --check assets/js/multibank-theme.js` ✅
- `node --check multibank-theme.js` ✅
