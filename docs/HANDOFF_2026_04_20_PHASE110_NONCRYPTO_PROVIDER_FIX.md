# Phase110 non-crypto provider fix

- Forex now prefers EODHD only when the provider strategy explicitly allows it.
- Stocks, Arab, and Futures are pushed back to Yahoo-first for quotes/candles.
- Fixed `quote_fetch_external()` bug where undefined variables broke the EODHD branch silently.
- `quotes_tick()` now keys previous quotes by `symbol|type` instead of `symbol` only.
- Trade/chart candles now follow the same provider authority helpers as quotes.
- Front-end same-route hash changes no longer force a full render path as aggressively.
