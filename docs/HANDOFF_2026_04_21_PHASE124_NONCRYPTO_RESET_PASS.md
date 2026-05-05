Phase124 non-crypto reset pass.

What changed:
- app.js non-crypto quote flow no longer uses aggressive live quote path for trade polling.
- QuoteCache for non-crypto now prefers cached/stale server path and much slower refresh cadence.
- fetchQuote() for non-crypto now prefers cached server path, and only triggers background fresh refresh rarely.
- Trade page should stop issuing repeated fresh=1 / symbol requests for forex/stocks/arab/futures.
- Goal: single authority behavior for non-crypto quotes with background refresh, not direct refresh storm.
