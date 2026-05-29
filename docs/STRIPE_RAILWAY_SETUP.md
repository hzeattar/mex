# Stripe Checkout on Railway

VertexPluse uses Stripe Checkout for card deposits. Keep all Stripe secrets in Railway service variables only.

## Railway variables

Add these variables to the `mex` service, not the MySQL service:

```env
STRIPE_ENABLED=1
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
```

Use test keys first. Rotate keys before launch if any value was shared outside Railway.

## Stripe webhook

Create a webhook endpoint in Stripe Dashboard:

```text
https://mex-production.up.railway.app/api/webhooks/payments/stripe.php
```

Subscribe to Checkout payment/session events. The webhook confirms the pending deposit and writes the ledger credit only after Stripe reports the payment as paid.

## Client flow

- Card payment uses `POST /api/deposits/stripe_checkout.php`.
- The user is redirected to Stripe Checkout.
- The webhook confirms the deposit.
- Manual deposit methods still use the proof-upload flow.

## Seed

After production MySQL health is green, run the guarded platform seed once:

```text
https://mex-production.up.railway.app/scripts/seed_platform_v2.php?token=<CRON_KEY>
```

Then change/rotate `CRON_KEY` or restrict access again.
