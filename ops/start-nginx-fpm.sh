#!/bin/sh
# MEX Group nginx + PHP-FPM startup script for Railway.
# Railway exposes the public PORT; PHP-FPM stays private on localhost.

: "${PORT:=9000}"
export PORT

EXTRA_LISTEN=""
if [ "$PORT" != "9000" ]; then
  EXTRA_LISTEN="    listen [::]:9000 ipv6only=off;"
fi
export EXTRA_LISTEN

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx /tmp
chown -R www-data:www-data api/data api/uploads 2>/dev/null || true
chmod -R 775 api/data api/uploads 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf 2>/dev/null || true

echo "[start] PORT=${PORT} - rendering nginx config"
envsubst '$PORT $EXTRA_LISTEN' < /app/ops/nginx.conf.template > /tmp/nginx.conf
cp /tmp/nginx.conf /etc/nginx/nginx.conf 2>/dev/null || true

echo "[start] validating nginx config"
nginx -t -c /tmp/nginx.conf 2>&1 || { echo "[start] FATAL: nginx config invalid"; exit 1; }
grep -n "listen " /tmp/nginx.conf || true

echo "[start] starting php-fpm on 127.0.0.1:9070"
php-fpm -F 2>&1 &
FPM_PID="$!"

sleep 2

if ! kill -0 "$FPM_PID" 2>/dev/null; then
  echo "[start] FATAL: php-fpm exited before nginx could start"
  exit 1
fi

echo "[start] PHP-FPM started, nginx listening on ${PORT} with internal PHP-FPM upstream 127.0.0.1:9070"

# --- In-container market-quote cache warmer --------------------------------
# Railway runs a single web container with no separate scheduler. Without a
# warmer, every watchlist request fell through to a slow synchronous provider
# fetch (5-9s) which saturated PHP-FPM and produced 503s on the home page.
# This detached loop keeps the market_quotes cache warm so the read endpoints
# serve instantly from cache. The cron scripts authenticate via CRON_KEY from
# the environment, hold their own flock (safe alongside any external cron), and
# self-limit execution time. Failures are isolated and never touch nginx/FPM.
# Disable by setting IN_CONTAINER_CRON=0.
if [ "${IN_CONTAINER_CRON:-1}" != "0" ]; then
  (
    # Authorize the local CLI cron runs without needing an external CRON_KEY.
    # This flag is only visible to processes spawned by this script (the trusted
    # in-container warmer); external HTTP requests cannot set it.
    export CRON_LOCAL_RUN=1
    # Keep the markets.php HTTP response cache warm (this is separate from the
    # market_quotes DB cache): the home/trade price lists then always have a
    # recent cached copy to serve instantly, refreshed via stale-while-revalidate.
    warm_http() {
      curl -fsS -m 8 "http://127.0.0.1:${PORT}$1" >/dev/null 2>&1 \
        || wget -q -T 8 -O /dev/null "http://127.0.0.1:${PORT}$1" 2>/dev/null \
        || nice -n 19 php -r '@file_get_contents("http://127.0.0.1:".getenv("PORT").$argv[1]);' "$1" >/dev/null 2>&1 \
        || true
    }
    # Warm the exact URLs the frontend requests (response cache is keyed by query).
    warm_markets_http() {
      warm_http "/api/markets.php?scope=home&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50"
      warm_http "/api/markets.php?type=crypto&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=50"
      warm_http "/api/markets.php?type=forex&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=30"
      warm_http "/api/markets.php?type=stocks&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=20"
      warm_http "/api/markets.php?type=commodities&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=20"
      warm_http "/api/markets.php?type=futures&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=20"
      warm_http "/api/markets.php?type=arab&scope=trade&supported=1&lite=1&with_quotes=1&no_rescue=1&limit=10"
    }
    sleep 20  # let php-fpm + DB settle before the first warm
    if [ "${FEED_WORKER_ENABLED:-0}" = "1" ]; then
      # A dedicated feed-worker service keeps the central quote cache warm and
      # is the single source of truth for upstream provider access. The web
      # container must NOT fetch upstream itself (double quota burn + rate
      # limits); it only refreshes the markets.php HTTP response caches, which
      # read from the central/DB cache and never hit providers (no_rescue=1).
      echo "[warm] feed-worker mode: HTTP response-cache warming only" >&2
      while true; do
        warm_markets_http
        sleep 45
      done
    fi
    # Legacy mode (no feed worker): warm one non-crypto asset class per cycle
    # (round-robin) so a single run never warms all six classes at once and
    # starves the web container. Crypto is refreshed every cycle via the light
    # quotes_tick. per_type caps how many symbols each warm fetches so the run
    # completes well within the timeout. Everything runs at the lowest CPU
    # priority (nice -n 19) so user requests always win the CPU.
    echo "[warm] diag quotes_tick: $(nice -n 19 timeout 30 php /app/api/cron/quotes_tick.php 2>&1 | head -c 300)" >&2
    echo "[warm] diag quotes_warm forex: $(nice -n 19 timeout 70 php /app/api/cron/quotes_warm.php types=forex per_type=24 2>&1 | head -c 300)" >&2
    set -- forex stocks arab commodities futures
    idx=1
    count=$#
    while true; do
      # Light crypto/simulated refresh every cycle.
      nice -n 19 timeout 30 php /app/api/cron/quotes_tick.php >/dev/null 2>&1 || true
      # One non-crypto class per cycle (warmed roughly every count*interval).
      nctype=$(eval "echo \${$idx}")
      nice -n 19 timeout 70 php /app/api/cron/quotes_warm.php "types=$nctype" "per_type=24" >/dev/null 2>&1 || true
      # Refresh the hottest markets.php response caches so the first organic
      # visitor each cycle is served instantly instead of being stuck on a
      # rebuild; markets.php keeps them live via stale-while-revalidate.
      warm_markets_http
      idx=$((idx + 1)); [ "$idx" -gt "$count" ] && idx=1
      sleep 75
    done
  ) &
  echo "[start] in-container quote-cache warmer started (pid $!), low-priority staggered"
fi

exec nginx -c /tmp/nginx.conf -g 'daemon off;'
