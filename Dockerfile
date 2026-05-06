FROM php:8.2-cli

WORKDIR /app

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      libfreetype6-dev \
      libcurl4-openssl-dev \
      libjpeg62-turbo-dev \
      libonig-dev \
      libpng-dev \
      libzip-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"$(nproc)" curl gd mbstring mysqli pdo_mysql zip; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

COPY . /app

RUN set -eux; \
    mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads; \
    chmod -R 775 api/data api/uploads

ENV PORT=8080

CMD ["sh", "-lc", "mkdir -p api/data/cache api/data/locks api/data/logs api/data/status api/uploads && chmod -R 775 api/data api/uploads && php -S 0.0.0.0:${PORT:-8080} -t . railway-router.php"]
