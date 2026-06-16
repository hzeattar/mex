# MEX Trading Platform — Data Feeds & Real-time Architecture

This document is the hand-off guide for the backend developer maintaining the real-time price feed pipeline.

---

## 1. What Was Added

### New Files

| File | Purpose |
|------|---------|
| `api/ws/aggregator.php` | Server-side WebSocket daemon. Connects to Binance (crypto), Finnhub (forex/stocks) and Twelve Data (all markets) and writes prices to the central cache. |
| `api/ws/yahoo_fallback.php` | Free no-key REST fallback worker. Polls Yahoo Finance for stocks, commodities, futures and forex proxies. |
| `api/trade/candles_twelvedata.php` | Historical OHLCV endpoint powered by Twelve Data Time Series API. |
| `api/health.php` | Health-monitoring endpoint: cache freshness, aggregator status, DB, API keys. |
| `api/lib/redis.php` | Redis connection + pub/sub helpers. |

### Modified Files

| File | Change |
|------|--------|
| `api/lib/quote_central.php` | Writes now also publish to Redis (`quotes:{type}` + `quotes:all`) when `REDIS_URL` is configured. |
| `sse.php` | When Redis is available, subscribes to price channels for instant pushes; otherwise falls back to cache polling. |
| `frontend/src/views/trade.js` | Removed client-side Finnhub, Tiingo and Twelve Data WebSocket connections. Only Binance WS + Binance Kline WS remain in the browser. |
| `start-nginx-fpm.sh` | Starts the aggregator and Yahoo fallback workers when their environment flags are enabled. |

---

## 2. Required Railway Environment Variables

```env
# Core workers
WS_AGGREGATOR_ENABLED=1
YAHOO_FALLBACK_ENABLED=1
YAHOO_FALLBACK_INTERVAL=10

# Optional but strongly recommended for performance
REDIS_URL=redis://default:PASSWORD@HOST:PORT

# Optional data sources
FINNHUB_KEY=YOUR_FINNHUB_KEY
QUOTES_TWELVEDATA_KEY=YOUR_TWELVEDATA_KEY
```

> If `REDIS_URL` is missing, the system still works but SSE falls back to polling every 1–2 seconds.

---

## 3. How the Feed Pipeline Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Binance WS     │────▶│                  │     │                 │
│  (crypto, free) │     │  api/ws/         │     │  Central cache  │
├─────────────────┤     │  aggregator.php  │────▶│  (file + DB)    │
│  Finnhub WS     │     │                  │     │                 │
│  (forex/stocks) │────▶│  writes prices   │     │  + Redis pub/sub│
├─────────────────┤     │                  │     │        │        │
│  Twelve Data WS │────▶│                  │     │        ▼        │
│  (all markets)  │     │                  │     │   SSE / quotes  │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Yahoo Finance  │────▶│ api/ws/          │
│  REST fallback  │     │ yahoo_fallback.php│
│  (free, no key) │     │ polls every 10s  │
└─────────────────┘     └──────────────────┘
```

### Source priority (highest first)
1. Binance WebSocket — crypto only, free, real-time.
2. Finnhub WebSocket — forex + stocks, needs `FINNHUB_KEY`, free tier = 250 symbols.
3. Twelve Data WebSocket — all markets, needs `QUOTES_TWELVEDATA_KEY` + credits.
4. Yahoo Finance REST — fallback for everything else, free, no key, slower/less reliable.

---

## 4. Worker Details

### `api/ws/aggregator.php`

- Pure PHP RFC 6455 WebSocket client (no external libraries).
- Auto-reconnect on disconnect.
- Writes to file cache + DB + Redis (if configured).
- Logs to `api/data/logs/aggregator.log`.
- Runtime limit controlled by `WS_AGGREGATOR_MAX_RUNTIME` (default 3600s).

### `api/ws/yahoo_fallback.php`

- Polls Yahoo Finance REST API in chunks of 30 symbols.
- Covers stocks, commodities, futures and forex proxies.
- Interval controlled by `YAHOO_FALLBACK_INTERVAL` (default 10s).
- Logs to `api/data/logs/yahoo_fallback.log`.

### `start-nginx-fpm.sh`

Starts the workers in the background when enabled:

```sh
if [ "${WS_AGGREGATOR_ENABLED}" = "1" ]; then
  php /app/api/ws/aggregator.php >> /app/api/data/logs/aggregator.log 2>&1 &
fi

if [ "${YAHOO_FALLBACK_ENABLED}" = "1" ]; then
  php /app/api/ws/yahoo_fallback.php >> /app/api/data/logs/yahoo_fallback.log 2>&1 &
fi
```

---

## 5. Important Data Quality Notes

### Yahoo Finance Limitations
- **Stocks**: delayed ~15 minutes. Not true real-time.
- **Commodities**: mapped to futures contracts (e.g. `GC=F` for gold). Contracts roll over monthly, which can cause price jumps or gaps.
- **Forex**: uses `EURUSD=X` style symbols. Coverage and update frequency are limited.
- **Reliability**: Yahoo occasionally blocks or rate-limits requests without warning.

### Finnhub Limitations (Free Tier)
- WebSocket: 250 symbols max.
- REST: 60 calls/minute.
- Real-time US stocks; forex is broker-dependent.

### Binance Limitations
- Crypto only.
- 100 streams max per combined WebSocket connection (code currently uses first 100).

---

## 6. Quick Health Check

Open:
```
https://YOUR_DOMAIN/api/health.php
```

Expected healthy response:
```json
{
  "status": "ok",
  "checks": {
    "cache": { "freshness_pct": 90, "fresh": 120, "stale": 10 },
    "aggregator": { "likely_running": true },
    "database": { "connected": true }
  }
}
```

If `status` is `warning` or `error`, inspect the logs and env vars.

---

## 7. Debugging a Stuck/Frozen Price

If a user reports the price is slow or frozen, check in this order:

1. **Environment variables** are set in Railway:
   - `WS_AGGREGATOR_ENABLED=1`
   - `YAHOO_FALLBACK_ENABLED=1`

2. **Health endpoint** returns `ok` with high `freshness_pct`.

3. **Worker logs**:
   - `api/data/logs/aggregator.log`
   - `api/data/logs/yahoo_fallback.log`

4. **Is the process running?** In Railway shell:
   ```sh
   ps aux | grep aggregator.php
   ps aux | grep yahoo_fallback.php
   ```

5. **Did the paid credit run out?** If `QUOTES_TWELVEDATA_KEY` credits are exhausted, disable reliance on Twelve Data and ensure Yahoo fallback + Finnhub are active.

---

## 8. Redis Pub/Sub (Optional but Recommended)

When `REDIS_URL` is configured:
- `quote_central_write()` publishes each price update to:
  - `quotes:{type}` (e.g. `quotes:crypto`)
  - `quotes:all`
- `sse.php` subscribes to these channels and pushes updates instantly instead of polling.

Redis instance: Railway Redis plugin (~$5/month) or any Redis-compatible service.

---

## 9. Client-Side Changes

Removed from `frontend/src/views/trade.js`:
- `startFinnhubWs()` / `stopFinnhubWs()`
- `startTiingoWs()` / `stopTiingoWs()`
- `startTwelveDataWs()` / `stopTwelveDataWs()`

Kept:
- `startBinanceWs()` — free crypto price updates.
- `startBinanceKlineWs()` — free crypto chart candles.

Non-crypto prices now come from server-fed central cache via `quote_focus.php` polling (1s nginx micro-cache) or Redis-powered SSE.

---

## 10. Contact / Next Steps

For further improvements consider:
- Subscribing to Twelve Data Pro ($229/month) for unified real-time non-crypto data.
- Enabling Redis for sub-second SSE latency.
- Adding market-status indicators and price alerts (pending in roadmap).

---

*Generated for project hand-off.*
