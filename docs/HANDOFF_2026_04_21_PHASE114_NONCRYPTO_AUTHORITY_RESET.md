Phase 114 - Non-crypto authority reset

What changed:
- Restored a simpler non-crypto provider chain closer to the stable Phase87 behavior.
- Forex list hydration now always has Yahoo fallback in bulk requests; EODHD is kept for single-symbol/direct paths instead of large list batches.
- Single-symbol non-crypto refresh in api/quotes.php now uses quote_price_fresh() instead of quote_fetch_external() only.
- Read-path quote persistence default is now ON so page-to-page warm quotes populate market_quotes more reliably.
- Restored the older candles authority file for a more stable Yahoo/EODHD fallback chain on forex/stocks/arab/futures.

Files changed:
- api/lib/quotes.php
- api/quotes.php
- api/trade/candles.php

Important:
- If stale seed rows remain problematic, re-run the earlier Phase109 DB patch before testing this zip.
