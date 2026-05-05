# API

> Auth in the mini app is cookie-based (set by `/api/verify.php`).
> For programmatic API calls, you can use Bearer tokens (issued by verify) if you extend the UI.

## Auth
### POST /api/verify.php
Body:
```json
{ "initData": "..." }
```
Response:
- sets `auth` cookie
- returns `{ ok: true, user, token }`

## Wallet
- GET /api/wallet/balances.php
- GET /api/wallet/ledger.php?page=1&per=25

## Deposits
- POST /api/deposits/create.php (requires `Idempotency-Key` header)
- GET /api/deposits/list.php
- POST /api/webhooks/payments/dummy.php (requires `X-Webhook-Secret`)

## Withdrawals
- POST /api/withdrawals/create.php (requires `Idempotency-Key`)
- GET /api/withdrawals/list.php

## Trading (demo)
- Existing endpoints under `/api/trade/*` still work.
