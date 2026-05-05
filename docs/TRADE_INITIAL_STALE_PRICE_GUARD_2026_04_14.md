Architecture & code audit findings

Issue fixed in this pass:
- On first Trade entry, a stale seed price or stale initial quote could render briefly before the true live quote arrived.
- That transient old price was leaking into the chart path and producing a vertical cut/spike, especially on crypto.

Critical issues and root causes

1. Stale seed adoption on first render
- `tradePage()` initialized `lastPriceRef` directly from `seedMeta/mk.price` even when that seed was not fresh.
- `bootstrapTradeQuote()` also pushed that seed into the header before live validation.

2. Initial chart sync trusted provisional price sources too early
- `seedCandles()` could reuse `QuoteCache.get()` or `lastPriceRef` before a validated live quote existed.
- For crypto, that let an old seed briefly anchor the chart.

3. Backend live-tail sync could stamp an outlier crypto price into history
- `candles_sync_live_tail()` updated/anchored the last candle even when the quote drift versus the recent close was too large.

Execution plan

- Add freshness guards for first accepted quote on Trade.
- Stop using stale seed prices as chart anchors.
- Keep candle history intact when a suspicious crypto live-tail drift appears.

Implemented fixes

Frontend (`assets/js/app.js`, mirrored to `app.js`):
- Added `tradeQuoteTs()` to normalize quote timestamps.
- Added `isFreshTradeQuote()` for first-quote acceptance.
- Added `seedQuoteIsFresh()` so old market seeds do not drive the first rendered price.
- `lastPriceRef` now starts from seed only when that seed is fresh enough.
- `bootstrapTradeQuote()` no longer paints stale seed quotes into the header.
- `acceptLiveQuote()` now rejects the first quote if it is old or if it diverges too much from the freshly seeded chart.
- `seedCandles()` now prefers:
  - confirmed live quote,
  - then fresh cached quote close enough to the candle seed,
  - then candle close itself.
- For crypto warm start, stale provisional prices no longer get to anchor the chart.

Backend (`api/trade/candles.php`):
- In `candles_sync_live_tail()`:
  - if crypto gap/drift is too large, the function now preserves history instead of appending or mutating a distorted live-tail candle.
  - current/previous bucket candle mutation is skipped for crypto when drift is above the guard threshold.

UI/UX improvements for mobile
- First load of Trade is less likely to flash an old crypto price before the true live one.
- Crypto chart history remains visually stable during warm start.

UI/UX improvements for desktop
- Same warm-start protection now applies to desktop Trade.
- The first loaded chart respects history and avoids transient vertical cuts from stale initial prices.

Validation results
- `node --check assets/js/app.js` ✅
- `node --check app.js` ✅
- `php -l api/trade/candles.php` ✅

Changed files list
- `assets/js/app.js`
- `app.js`
- `api/trade/candles.php`

Final status and remaining notes
- This pass specifically targets the old-price-on-entry problem and its chart side effect.
- It does not remove real live movement; it only blocks stale/provisional warm-start data from deforming the chart.
- Final verification should be done on the live host by opening Trade cold on BTC/ETH and checking that the first visible price does not briefly regress before stabilizing.
