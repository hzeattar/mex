#!/bin/sh
set -eu

: "${PORT:=8080}"
export PORT

cd /app
mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx
chown -R www-data:www-data api/data api/uploads
chmod -R 775 api/data api/uploads

envsubst '$PORT' < /app/ops/nginx.conf.template > /etc/nginx/conf.d/default.conf

php-fpm -D
exec nginx -g 'daemon off;'
