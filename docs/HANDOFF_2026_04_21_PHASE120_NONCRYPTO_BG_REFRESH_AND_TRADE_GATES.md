# Phase120 — Non-crypto background refresh + trade gate stabilization

## What changed

### Frontend (`assets/js/app.js`)
- Added `vpBackgroundFreshQuote()` for non-crypto single-symbol refreshes.
  - Immediate UI now prefers `/quotes.php?symbol=...&type=...` warm path.
  - Background refresh uses `/quotes.php?fresh=1&symbol=...&type=...` with a long gate.
- `fetchQuote()` for non-crypto now:
  - returns warm quote immediately when available
  - schedules background fresh refresh only when the warm quote is stale enough
- `QuoteCache.tick()` no longer retries the same cached path synchronously for non-crypto.
  - It now schedules a background fresh refresh instead of blocking the current tick.
- Slowed non-crypto trade polling intervals:
  - forex ~6200ms
  - stocks/arab/futures ~7000ms
  - commodities ~5200ms
- Persisted trade bootstrap/candle cooldown maps across rerenders using `window.__vpTrade*` maps.
  - This is intended to stop the same route from re-triggering heavy bootstrap fetches after rerenders.
- `fetchSignals()` hard-stops for non-crypto.

### Backend (`api/quotes.php`)
- `fresh=1` is no longer forcibly downgraded for **single-symbol non-crypto** requests.
  - Large non-crypto batches are still downgraded.
- Increased server-side non-crypto fresh cache TTL to reduce provider stampedes.
- Warm single-symbol fast path now only short-circuits when `fresh=0`.
- Warm single-symbol age tolerance increased slightly so the UI can render fast and let the background refresh update it.

## Goal of this pass
- Stop repeated `quotes.php?symbol=...` / `quotes.php?fresh=1&symbol=...` cancellation storms on trade for stocks / arab / forex / futures.
- Allow non-crypto to render immediately from warm quote while still refreshing in the background.
- Keep trade bootstrap/candle throttling alive across rerenders.

## Files changed
- `assets/js/app.js`
- `api/quotes.php`
