# Sprint 1 — Starter Execution Plan

## Goal
Start the rebuild without replacing the entire runtime immediately.

## Scope
- Add the new Tick Layer skeleton
- Add the new Quote Authority Layer skeleton
- Keep current runtime working while introducing the new structure beside it
- Do not wire the whole frontend orchestrator yet in Sprint 1

## Files added in Sprint 1 scaffold
### Backend
- `api/lib/tick_store.php`
- `api/lib/tick_ingest.php`
- `api/lib/tick_stream.php`
- `api/lib/tick_validate.php`
- `api/lib/quote_authority.php`
- `api/lib/quote_sources.php`
- `api/lib/quote_cache_policy.php`
- `api/lib/quote_store.php`
- `api/lib/quote_batch.php`
- `api/lib/quote_freshness.php`

### Frontend
- `assets/js/live/live-orchestrator.js`
- `assets/js/live/live-store.js`
- `assets/js/live/live-scheduler.js`
- `assets/js/live/live-selectors.js`
- `assets/js/live/live-adapters.js`

## What should happen next
1. Implement validated tick writes only
2. Create one quote authority API surface
3. Convert `api/quotes.php` to call the new authority layer
4. Add smoke tests for quote authority consistency
5. Only after that migrate `markets.php` and `market_snapshot.php`
