Phase 117 – non-crypto single-symbol stabilization

What changed
- Frontend no longer forces /quotes.php?fresh=1 for non-crypto single-symbol trade polling.
- fetchQuote() now uses cached/warm non-crypto quote path first and keeps fresh=1 only for crypto.
- QuoteCache trade tick now refreshes non-crypto via warm /quotes.php?symbol=... path, with a wider gate.
- Backend api/quotes.php now ignores fresh=1 for non-crypto unless direct=1, so stale rows can be reused while the fast-path refresh logic updates the quote without provider stampede.

Goal
- Stop repeated canceled/pending single-symbol requests for forex/stocks/futures/arab.
- Keep commodities stable too by removing the aggressive fresh path.
