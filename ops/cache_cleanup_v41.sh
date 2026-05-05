#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
rm -f api/data/cache/quotes_api_*.json || true
rm -f api/data/cache/markets_*.json || true
rm -f api/data/cache/y_quote_*.json || true
rm -f api/data/candles_*_xauusd_* api/data/candles_*_xagusd_* api/data/candles_*_usoil_* api/data/candles_*_eurusd_* api/data/candles_*_aapl_* || true
find api/data/cache -maxdepth 1 -type f \( -name 'm_fx_*' -o -name 'm_snap_*' -o -name 'p_last_*' \) -delete || true
echo "Cache cleanup done."
