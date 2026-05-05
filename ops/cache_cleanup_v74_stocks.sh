#!/bin/bash
set -e
cd "$(dirname "$0")/.."
rm -f api/data/candles_spot_aapl_* api/data/candles_spot_tsla_* api/data/candles_spot_*_massive:*.json || true
