# PHASE109 — market_quotes authority cleanup

This pass fixes the strongest database-backed causes of stale replay and non-crypto instability.

## Root causes found in the uploaded DB
- `market_quotes` used a unique key on `symbol` only.
- Non-crypto seed fallback rows with `updated_at = 0` were stored in `market_quotes`.
- Market joins loaded those rows directly into Home/Markets/Snapshot.
- Forex rows were effectively absent from `market_quotes`.
- Some symbols had quote types drifting away from the authoritative `markets.type`.

## What changed in code
- `quote_get(symbol, type)` now supports type-aware reads.
- `quote_upsert()` now arbitrates against the existing row of the same `(symbol,type)`.
- `markets.php` and `market_snapshot.php` join `market_quotes` by `(symbol,type)` and only rows with `updated_at > 0`.
- Trade/quotes paths now request cached quote rows by symbol+type where possible.
- Forex quote flow prefers EODHD more strictly and avoids Yahoo/Massive replay when EODHD is the selected provider.

## Required DB action
Run:
`db/PHASE109_MARKET_QUOTES_AUTHORITY_MYSQL.sql`

Without the DB patch, the old unique key on `symbol` can still cause cross-type overwrites.
