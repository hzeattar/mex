# Deposit/Withdraw Bot (External)

## What it does
- Receives a signed intent from the Mini App (deposit/withdraw + amount + user)
- Asks user to pick a payment method (from Admin Panel list)
- Asks for a proof screenshot/photo
- Sends the proof to backend (creates `deposits`/`withdrawals` row as `pending`)
- Admin approves from Admin panel

## Setup
1) Create a Telegram bot with BotFather and copy the token.
2) Set env vars:

- BOT_TOKEN=123:ABC...
- BACKEND_BASE=https://YOUR_DOMAIN (where /api lives)
- BOT_INTENT_SECRET=the same secret used in your Mini App / backend

3) Install and run:
```bash
cd bot
npm i
node index.js
```

## Backend requirements
- In `.env` on server:
  - PAY_BOT_USERNAME=YourBotUserName (without @)
  - BOT_INTENT_SECRET=...
  - BOT_TOKEN=... (optional, only needed for viewing proof in admin)

- Admin adds payment methods from:
  - /admin/payment_methods.php (enabled=1)
