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
    rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default

COPY . /app

RUN set -eux; \
    if [ -f php.ini ]; then cp php.ini /usr/local/etc/php/conf.d/vertexpluse.ini; fi; \
    mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads /run/nginx; \
    chmod -R 775 api/data api/uploads; \
    chmod +x ops/start-nginx-fpm.sh

ENV PORT=8080

CMD ["sh", "/app/ops/start-nginx-fpm.sh"]
