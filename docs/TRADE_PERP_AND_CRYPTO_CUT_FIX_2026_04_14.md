# Trade perp + crypto chart cut fix — 2026-04-14

## Fixed now

### 1) Perpetual / perp market defaults
- Fixed Trade defaults so `futures` opens with `market=perp` instead of falling back to `spot`.
- Fixed related JS defaults in the theme trade/watch drawer so futures rows resolve as perp consistently.
- Fixed Trade market switching so it also updates the active QuoteCache market and refreshes the live quote after the toggle.

### 2) Crypto chart cutting / vertical spikes
- Hardened trade candle seeding so stale cached crypto candles do not create synthetic jump candles when the cached history is too old.
- Hardened live quote acceptance to ignore abrupt crypto outlier jumps in very short windows.
- Hardened live candle upsert so stale crypto gaps do not append fake vertical anchor candles before reseed.

### 3) Backend candle cache freshness
- `api/trade/candles.php` no longer trusts cache freshness by file mtime alone.
- It now checks the timestamp of the last candle itself.
- If the crypto candle cache is too old, fast-path cache return is skipped and a fresh upstream refill is attempted.

### 4) Futures market quote priming
- `api/markets.php` now treats cloned `futures` rows consistently in the quote warmup stage, instead of routing them through the old non-crypto preparation path.

## Files changed
- `assets/js/app.js`
- `app.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `api/trade/candles.php`
- `api/markets.php`
