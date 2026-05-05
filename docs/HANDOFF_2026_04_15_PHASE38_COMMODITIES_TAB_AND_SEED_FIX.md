# Phase 38 — Commodities tab + seed fallback fix

## What changed

### 1) `api/markets.php`
- Treated database rows with type `metals` as `commodities` when requesting commodities.
- When filtering `type=commodities`, query now includes both `commodities` and `metals`.
- Signal counts for commodities now include both `commodities` and `metals` market types.
- Output item type is normalized through `vp_normalize_asset_type(...)` before serialization.
- `type=all` commodities detection now also recognizes legacy `metals` rows.

### 2) `assets/js/multibank-theme.js`
- Desktop trade watchlist now always shows the full core family tabs, including `Commodities`.
- Added a small static commodities seed universe so the commodities tab never renders empty while live hydration is warming.
- If commodities API fetch returns empty temporarily, the UI injects the seed universe and keeps the tab usable.
- Existing live hydration remains active, so real quotes still replace seed values when available.

## Why this fixes the reported issue
- Some installs carry legacy DB rows as `metals` instead of `commodities`, which made the commodities API return empty.
- The desktop watchlist also hid tabs when the local universe did not currently contain that type.
- This pass fixes both the backend normalization and the desktop watchlist tab visibility.

## Files changed
- `api/markets.php`
- `assets/js/multibank-theme.js`

## Validation
- `node --check assets/js/multibank-theme.js`
- `php -l api/markets.php`
