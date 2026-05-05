#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f api/data/candles_*xauusd* api/data/candles_*xagusd* api/data/candles_*usoil* api/data/candles_*eurusd* api/data/candles_*audusd* api/data/candles_*gbpusd*
echo 'Old chart caches removed.'
