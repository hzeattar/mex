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

# ---------------------------------------------------------------------------
# Background market-quote warmer.
# Railway runs a single web container without a cron daemon, so stored market
# quotes would go stale and the markets list would fall back to seed prices for
# a large share of symbols. This loop refreshes ALL supported quotes (crypto,
# forex, stocks, commodities, futures, arab) roughly every minute by calling
# the CLI cron entrypoints, which read CRON_KEY from the environment.
# ---------------------------------------------------------------------------
(
  sleep 12
  while true; do
    php /app/api/cron/quotes_warm.php per_type=150 >/dev/null 2>&1 || true
    php /app/api/cron/quotes_tick.php crypto=1 >/dev/null 2>&1 || true
    sleep 55
  done
) &
echo "[start] background quote warmer started (pid $!)"

echo "[start] PHP-FPM started, nginx listening on ${PORT} with internal PHP-FPM upstream 127.0.0.1:9070"
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
