# Security

## Secrets
- No secrets are committed in code.
- Configure secrets in `.env`.
- **Rotate any password/token you pasted in chat** (treat it as compromised).

## Telegram Mini App initData verification
- `/api/lib/telegram.php` implements the official HMAC check:
  - secret_key = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN)
  - compare `hash` against computed value from sorted pairs
- Freshness check: `auth_date` must not be older than `TG_INITDATA_MAX_AGE`.

## Idempotency
- `Idempotency-Key` header is **required** for:
  - `/api/deposits/create.php`
  - `/api/withdrawals/create.php`
- Responses are cached by key+scope to prevent duplicate credits/debits.

## Ledger integrity
- No "update balance" operations exist for users.
- `wallets.balance_cache` is derived from ledger and updated only via `ledger_add()`.

## Webhooks
- Dummy provider webhook requires:
  - header `X-Webhook-Secret` == `PAYMENT_WEBHOOK_SECRET`
- Bot webhook requires:
  - secret query parameter `token`
  - secret header `X-Telegram-Bot-Api-Secret-Token`

## Feature flags
- `demo_mode` enabled by default.
- `real_payouts` disabled by default.
- Bot / UI flows enforce flags before allowing real withdrawals.
