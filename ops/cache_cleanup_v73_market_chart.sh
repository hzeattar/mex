#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f api/data/candles_spot_xauusd_* api/data/candles_spot_xagusd_* api/data/candles_spot_usoil_*
rm -f api/data/candles_spot_aapl_* api/data/candles_spot_tsla_*
rm -f api/data/candles_spot_*_massive:* api/data/candles_spot_*_yahoo:* || true
rm -f api/data/cache/cndl_refresh_* || true
printf 'v73 cleanup done\n'
