# Railway Cron Services

Railway config-as-code is per service, so keep `railway.json` for the web service.
Create three extra Railway services from the same GitHub repo and set each service's Config File path to:

- `/ops/railway-cron-quotes-tick.json`
- `/ops/railway-cron-market-ingest.json`
- `/ops/railway-cron-cache-reset.json`

All services must share the same database environment variables and `CRON_KEY`.
The Dockerfile uses `WORKDIR /app`, so cron start commands are relative, for example `php api/cron/quotes_tick.php`.