# Phase 112 — non-crypto poll guard + rerender reduction

## Main fixes
- Slowed non-crypto quote polling and widened shared stale-cache windows in `assets/js/app.js`
- Restricted `market_snapshot` usage to current/preferred market families instead of priming all pools on each route
- Stopped broad cross-market priming on `home`, `trade`, and `markets` routes
- Reduced non-crypto market-page quote chunk sizes and batch cadence
- Debounced list repainting on market price hydration to reduce excessive rerenders
- Lowered direct/chart budgets in `api/quotes.php` for non-crypto batches to reduce provider timeouts
- Added forex Yahoo intraday fallback in `api/trade/candles.php`
- Skipped aggs fallback for `stocks`, `arab`, `futures`, and EODHD-preferred forex to avoid long hanging candle requests after upstream fallback chains
- Reduced home market-pool priming to preferred type + crypto only in `assets/js/multibank-theme.js`

## Files changed
- assets/js/app.js
- assets/js/multibank-theme.js
- api/quotes.php
- api/trade/candles.php
