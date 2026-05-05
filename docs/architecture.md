# Architecture (Shared Hosting)

## Components
### 1) Telegram Mini App (UI)
- Lives in project root (`/`).
- Static app shell and pages.
- Calls backend over HTTPS.
- Auth: sends Telegram `initData` to `/api/verify.php`.

### 2) Backend API (Plain PHP)
- Lives in `/api`.
- Handles:
  - Telegram login verification (HMAC) + timestamp freshness.
  - Wallets, ledger entries, holds.
  - Deposits + withdrawals (idempotent).
  - Demo trading engine (orders/positions).
  - Investments (subscribe flow; accrual job can be added later).
- No hardcoded secrets; everything from `.env`.

### 3) Admin Panel
- Lives in `/admin`.
- Simple session login (email + password from `.env`).
- Finance/risk actions:
  - Confirm/fail deposits.
  - Approve/reject/complete withdrawals.
  - Toggle feature flags.
  - Ledger explorer.

### 4) Telegram Bot Webhook (PHP)
- Lives in `/bot/webhook.php`.
- Secure webhook:
  - Secret path token: `?token=BOT_PATH_TOKEN`
  - Secret header: `X-Telegram-Bot-Api-Secret-Token == BOT_WEBHOOK_SECRET`
- Flows:
  - `/start`, `/balance`, `/deposit`, `/withdraw`.

## Data model (high level)
- `wallets`: per-user wallets (currency + cached balance for speed).
- `ledger_entries`: immutable movements (signed amounts).
- `holds`: reserved funds (prevents double spend).
- `deposits`: lifecycle: created → pending → confirmed/failed → credited.
- `withdrawals`: requested → approved/rejected → completed.
- `feature_flags`: kill-switch and rollout.

## Money movement rule
All balance changes must be produced via **ledger entries** inside a DB transaction.

