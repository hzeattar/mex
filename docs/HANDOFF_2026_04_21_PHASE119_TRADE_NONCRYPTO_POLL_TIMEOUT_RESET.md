Phase119 focuses on trade-page non-crypto stabilization.

Changes:
- QuoteCache non-crypto trade poll speed reduced from forced 2200ms to preferred per-asset pacing.
- QuoteCache non-crypto request timeouts increased to avoid browser-side canceled requests on shared hosting.
- bootstrapTradeQuote now has a per-symbol/type/market cooldown to avoid duplicate startup fetches.
- Trade signal panel no longer fetches symbol-specific signals for non-crypto pages, removing one heavy pending/canceled source.

Files changed:
- assets/js/app.js
