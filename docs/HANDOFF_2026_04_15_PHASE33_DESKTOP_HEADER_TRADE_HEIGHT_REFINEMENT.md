# Phase 33 — desktop header / trade height / live cache refinement

## Base used
- `vertexpluse_phase32_desktop_logo_layout_restore_2026_04_15.zip`

## What changed

### Desktop header
- Rebuilt the desktop topbar into a true trading-style structure:
  - left: logo
  - center: primary navigation (Markets / Trade / Portfolio / Earn)
  - right: compact balance dropdown + Deposit CTA + notifications icon + profile dropdown
- Added a richer profile dropdown with:
  - account shortcut
  - payments shortcut
  - KYC shortcut
  - support shortcut
  - language menu
  - logout action
- Tightened spacing so the header uses horizontal space more efficiently on desktop.

### Trade page (desktop)
- Added a new `mb-trade-v33` refinement layer.
- Reduced desktop chart height so the chart fits the viewport more naturally instead of dominating the screen.
- Tightened watchlist and order panel spacing.
- Kept sticky side panels while reducing visual bulk.

### Dashboard / Portfolio / Earn / Payments
- Refined desktop grid proportions to be more balanced.
- Made right-side dashboard widgets feel more like a stable sidebar.
- Reduced portfolio stat strip sprawl and improved table rhythm.
- Improved invest grid density on desktop.
- Improved funding layout spacing and sticky right-side summary behavior.

### Price consistency
- Added `updateMarketCachesFromLiveQuote()` in `assets/js/app.js`.
- Every fresh quote from `QuoteCache` now also updates the in-memory market state and cached market lists in localStorage.
- This helps keep prices more consistent across:
  - market list
  - trade page
  - watchlist
  - dashboard cards that depend on cached market snapshots
- Also emits a `vp:quote` browser event for any future live UI bindings.

## Files changed
- `assets/js/app.js`
- `app.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`

## Validation
- `node --check assets/js/app.js`
- `node --check app.js`
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `php -l app.php`

All passed.
