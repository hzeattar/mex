Phase 107 focused on three regressions seen in the uploaded screen recording:

1) scroll jumps / full rerender feeling while navigating and changing trade symbols
2) fresh price appears, then older price replays on top of it for non-crypto
3) request storm from non-crypto markets/watchlists causing cancels, timeouts, and blank trade states

What changed
- assets/js/app.js
  - non-crypto UI quote authority now ranks eodhd/eodhd_rest/eodhd_intraday correctly
  - vpPickUiAuthorityQuote prefers newer trusted non-crypto quotes before older higher-rank leftovers
  - vpRememberLiveQuote now stores market-specific keys and rejects older/lower-rank replays
  - refreshMarkets no longer sends with_quotes=1 for non-crypto; it loads lite rows then hydrates with batched quotes.php
  - trade watch non-crypto visible-row refresh now uses batched quotes.php instead of markets.php?with_quotes=1
  - primePlatformMarketUniverse now prioritizes only the current route/preferred family first, then defers secondary families slowly in background
  - hashchange scroll reset now happens only when the top-level route changes, not when query params/symbol changes inside the same route
- assets/js/multibank-theme.js
  - trade watch quote fetcher no longer uses direct=1 for every non-crypto family
  - tab priming now limits initial hydration to active/preferred families instead of blasting all families immediately
- api/market_snapshot.php
  - live provider fetch is now limited to preferred/current priority pools; secondary pools use cached DB rows until later hydration

Expected impact
- less rerender/jump-to-top while staying inside the same page family
- lower chance of new quote -> old quote replay on forex/stocks/arab/commodities
- far fewer non-crypto request bursts during home/trade/markets boot
- better chance for forex and non-crypto trade pages to become usable because they are no longer starved by parallel category hydration
