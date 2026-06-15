FROM composer:2 AS composer-bin

FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build

FROM php:8.2-fpm

WORKDIR /app

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      gettext-base \
      nginx \
      libfreetype6-dev \
      libcurl4-openssl-dev \
      libjpeg62-turbo-dev \
      libonig-dev \
      libpng-dev \
      libzip-dev; \
    update-ca-certificates; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"$(nproc)" curl gd mbstring mysqli pdo_mysql zip; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/* \
      /etc/nginx/sites-enabled/default \
      /etc/nginx/conf.d/default.conf

COPY --from=composer-bin /usr/bin/composer /usr/bin/composer

COPY . /app
COPY --from=frontend-build /assets/dist /app/assets/dist

RUN set -eux; \
    if [ -f composer.json ]; then composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader; fi; \
    if [ -f php.ini ]; then cp php.ini /usr/local/etc/php/conf.d/mexgroup.ini; fi; \
    if [ -f ops/php-fpm-pool.conf ]; then cp ops/php-fpm-pool.conf /usr/local/etc/php-fpm.d/zz-mexgroup.conf; fi; \
    mkdir -p api/data/cache api/data/central api/data/locks api/data/logs api/data/status api/uploads /run/nginx /var/log/nginx; \
    chown -R www-data:www-data api/data api/uploads; \
    chmod -R 775 api/data api/uploads; \
    chmod +x ops/start-nginx-fpm.sh

ENV PORT=9000
ENV BUILD_REV=20260615g
ENV WORKER_MODE=web

EXPOSE 9000

# If WORKER_MODE=feed, run the price feed worker daemon instead of nginx.
# Otherwise, run the standard nginx + php-fpm web server.
CMD ["sh", "-c", "if [ \"$WORKER_MODE\" = 'feed' ]; then echo '[feed-worker] Starting prices_feed_worker daemon...'; exec php -d error_reporting=E_ALL -d display_errors=1 /app/api/cron/prices_feed_worker.php --daemon; else exec sh /app/ops/start-nginx-fpm.sh; fi"]
