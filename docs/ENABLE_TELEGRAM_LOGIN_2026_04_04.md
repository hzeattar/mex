# Enable Telegram Login — VertexPluse

## What already exists in the code
- Public pages already render the Telegram Login Widget when a bot username is available:
  - `/login.php`
  - `/register.php`
  - `/index.php`
- The login callback endpoint already exists:
  - `/api/auth/telegram_login.php`
- The app accepts Telegram as a login provider and writes/updates:
  - `users`
  - `user_identities`
  - session login state

## Required server values
Set these in `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_BOT_USERNAME=YourBotUsername
MINIAPP_BOT_USERNAME=YourBotUsername
BOT_USERNAME=YourBotUsername
CLIENT_BOT_USERNAME=YourBotUsername
```

## Required admin value
You can also store the bot username from:
- `Admin -> Site Settings -> Telegram login bot username (without @)`

This helps the public pages show the widget even if you prefer storing the display username in settings.

## Telegram-side setup
1. Open `@BotFather`
2. Run `/setdomain`
3. Choose the same bot used for login
4. Set the domain to your production domain:
   - `vertexpluse.com`

## What to test
1. Open `/login.php`
2. Confirm the Telegram button appears
3. Click the widget and approve Telegram login
4. Confirm redirect into `/app.php#/home`
5. Confirm the user row updates with `login_provider = telegram`
6. Confirm a new Telegram-only user is created automatically if no linked account exists yet

## If the button does not appear
- Check `.env` values above
- Check the admin setting `bot.username`
- Confirm the BotFather `/setdomain` matches the exact production domain
- Confirm outbound HTTPS to `telegram.org` is allowed from the browser/network

## If the widget appears but login fails
- Re-check `TELEGRAM_BOT_TOKEN`
- Confirm the bot username and token belong to the same bot
- Confirm the server time is correct (Telegram auth uses `auth_date` validation)
- Re-open `/api/auth/telegram_login.php` errors in server logs
