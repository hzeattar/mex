# Phase 143 — Sprint 1 progress

This pass does **not** replace the live runtime yet.
It adds the first rebuild building blocks beside the legacy paths.

## Added
- Read-only quote authority helpers:
  - `api/lib/quote_authority.php`
  - `api/lib/quote_sources.php`
  - `api/lib/quote_cache_policy.php`
  - `api/lib/quote_store.php`
  - `api/lib/quote_batch.php`
  - `api/lib/quote_freshness.php`
- New thin probe endpoints:
  - `api/quotes_v2.php`
  - `api/debug/quote_authority_probe.php`
- Tick layer v2 scaffold with validation:
  - `api/lib/tick_validate.php`
  - `api/lib/tick_store.php`
  - `api/lib/tick_ingest.php`
  - `api/lib/tick_stream.php`
- DB schema draft:
  - `database_market_ticks_v2_phase143.sql`

## Important current behavior
- `api/quotes_v2.php` is read-only and does **not** persist quote rows.
- Legacy `api/quotes.php` is still the active runtime endpoint.
- `market_ticks_v2` is a parallel table design, not yet wired into `trade/stream.php`.

## Why this pass is safe
- No existing endpoint behavior was replaced.
- New files are additive.
- The next step can switch callers endpoint-by-endpoint.

- Added home-live throttling pass: demo PnL caching, lighter home route warm-up on mobile, batch-only non-crypto home updates, and reduced duplicate account refresh pressure.
- Polished dashboard account switcher spacing and verification modal density for mobile.
