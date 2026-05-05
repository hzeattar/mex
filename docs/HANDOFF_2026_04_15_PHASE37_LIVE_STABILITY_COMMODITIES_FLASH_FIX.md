# VertexPluse Phase 37 — Live Stability + Commodities Recovery + Old Price Flash Fix

## Scope
This pass focused on three linked issues reported after phase 36:

1. **Commodities tab could become empty** on trade/mobile watchlists.
2. **Old prices flashed briefly** in market/watchlist views before being replaced by newer quotes.
3. **Request pressure / instability** still needed tightening to reduce visible flicker and repeated refresh feeling.

## What changed

### 1) `api/markets.php`
- Normalized the requested market type using `typeAlias` consistently in SQL filters and signal filters.
- Added **fallback commodities universe** when DB rows are missing or inconsistent.
- Added fallback commodities injection for:
  - `type=commodities`
  - `type=all` when no active commodities rows exist
- Switched the markets refresh lock filename to use normalized type alias.

### 2) `assets/js/app.js`
- Added a **small in-memory live quote memory layer** keyed by symbol/type.
- Any fresh quote now gets remembered and can override older market list rows.
- Added overlay logic so freshly remembered quotes win over stale cached market rows.
- Tightened warm-local cache rules:
  - crypto warm cache allowed longer
  - non-crypto warm cache now rejected quickly if too old
- Trade watchlist rows now prefer remembered fresh live quotes before rendering.
- Bulk market merge path now stores fresh quotes into the memory layer.
- Slowed overly aggressive polling slightly to reduce request pressure and visible flicker.

### 3) `assets/js/multibank-theme.js`
- Mobile/desktop themed watchlist now reads warm caches through the stricter cache helper when available.
- Watchlist row rendering now overlays remembered live prices instead of trusting older cached row prices.
- This reduces the “old price appears for a moment then disappears” behavior.

## Files changed
- `api/markets.php`
- `assets/js/app.js`
- `assets/js/multibank-theme.js`

## Expected outcome
- Commodities symbols should no longer appear empty when DB rows are absent or partially broken.
- Watchlists should stop regressing to an older price before the newer live quote arrives.
- Market/trade views should feel more stable with less flashing and fewer bursts of repeated requests.

## Validation commands run
- `node --check assets/js/app.js`
- `node --check assets/js/multibank-theme.js`
- `php -l api/markets.php`
- `php -l api/trade/candles.php`
- `php -l app.php`

## Post-deploy checks
Test after upload + hard refresh:
- Commodities tab in trade/watchlist
- AAPL on iPhone trade page
- ES_F / NQ_F / YM_F / CL_F / BZ_F
- Watchlist rows while leaving market page open for 30–60 seconds
- Verify old price no longer flashes before the live row settles
