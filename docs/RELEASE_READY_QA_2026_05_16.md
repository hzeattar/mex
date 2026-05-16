# VertexPluse / MEX — Release-ready QA pass

Date: 2026-05-16
Base package: `mex_phase8_completion_bundle_2026_05_16.zip`
Output package: `mex_hosting_verified_release_2026_05_16.zip`

## Scope

This pass prepared a hosting-upload build from Phase 8 and verified the package for common deployment blockers:

- PHP syntax across the full project.
- Frontend source syntax.
- Clean frontend dependency install using `npm ci`.
- Production Vite build into `assets/dist`.
- Static include path scan for literal PHP includes/requires.
- PHP library include smoke test to catch redeclare errors.
- HTTP smoke test using PHP built-in server for `/`, `/api/ping.php`, and the Vite manifest.
- Release hygiene scan for secrets, runtime DB files, logs, and shipped `node_modules`.
- Runtime directory placeholders for `api/data/*` and `api/uploads/funding`.
- Direct upload access protection via `api/uploads/.htaccess`.

## Verification summary

Passed locally:

- PHP lint: passed for all PHP files.
- JS syntax check: passed for all `frontend/src/*.js` files.
- `npm ci`: passed.
- `npm run build`: passed.
- Static include scan: no missing literal includes.
- PHP lib include test: passed.
- HTTP smoke:
  - `/api/ping.php`: HTTP 200.
  - `/`: HTTP 200.
  - `/assets/dist/.vite/manifest.json`: HTTP 200.
- Production npm audit (`--omit=dev`): 0 known vulnerabilities.
- Secret scan: no common live-token patterns found.
- Final package excludes `frontend/node_modules`.
- Final package excludes runtime `.sqlite`, `.db`, and `.log` files.

## Environment note

The local QA environment has PHP 8.4 with PDO core but without `pdo_mysql`, `pdo_sqlite`, or PHP cURL extensions. Because of that, full database-backed smoke tests cannot be completed here. The code/package checks passed, but the following must be tested on the real hosting environment:

1. MySQL connection and schema upgrade/import.
2. Login/register.
3. Demo/Real account isolation.
4. Live market quote cron jobs.
5. Deposit proof upload.
6. Admin approve/reject/complete flows.
7. KYC flow.
8. Earn copy/contract subscribe, cancel, and PnL.

## Hosting checklist

Before upload:

1. Upload the package contents into the intended webroot, normally `public_html`.
2. Copy `.env.example` to `.env`.
3. Fill the real values:
   - `APP_URL`
   - `SITE_URL`
   - `APP_KEY`
   - `JWT_SECRET`
   - `CRON_KEY`
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - market provider keys as needed, especially `EODHD_API_KEY` if used.
4. Keep `APP_DEBUG=0` in production.
5. Keep `DB_DRIVER=mysql` in production.
6. Keep `DB_ALLOW_SQLITE_FALLBACK=0` in production.
7. Ensure these directories are writable by PHP:
   - `api/data`
   - `api/data/cache`
   - `api/data/locks`
   - `api/data/logs`
   - `api/data/status`
   - `api/uploads`
   - `api/uploads/funding`
8. Open `/api/ping.php` and confirm JSON response.
9. Run install/upgrade according to your deployment workflow.
10. Configure cron jobs with your `CRON_KEY`.

## Cron endpoints to verify on server

- `/api/cron/markets_sync.php?key=CRON_KEY`
- `/api/cron/quotes_tick.php?key=CRON_KEY`
- `/api/cron/market_ingest.php?key=CRON_KEY`
- `/api/cron/invest_tick.php?key=CRON_KEY`
- `/api/cron/risk_tick.php?key=CRON_KEY`

## Important deployment warning

The package is code-verified and build-verified. It still needs server QA because live MySQL, PHP extensions, cron, provider network access, and hosting permissions can only be verified on the real server.
