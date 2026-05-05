#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -f api/data/candles_*.json || true
rm -f api/data/cache/*.json api/data/cache/*.lock || true
rm -f api/data/logs/*.log api/data/logs/*.log.* api/data/php_errors.log || true
rm -f admin/lead*.php || true

echo "v72 cleanup complete"
