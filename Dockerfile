# MEX Trading Platform - PHP with built-in server

FROM php:8.2-cli

# Set working directory
WORKDIR /app

# Copy all files
COPY . /app/

# Create cache directory
RUN mkdir -p /app/data/cache && chmod 777 /app/data/cache

# Expose port (Railway sets $PORT)
ENV PORT=8080

# Start PHP built-in server
CMD ["sh", "-c", "php -S 0.0.0.0:$PORT -t ."]