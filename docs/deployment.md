# Deployment (Hostinger hPanel)

## Requirements
- PHP 8.2+
- PDO + pdo_mysql (recommended) **or** PDO + pdo_sqlite (demo/dev)
- curl extension (for bot API calls)

## Checklist
1. Create subdomain and point it to a folder (DocumentRoot).
2. Upload project files into the subdomain folder.
3. Create MySQL database + user via hPanel.
4. Copy `.env.example` -> `.env` and fill values.
5. Run installer once:
   - `/api/install.php?key=INSTALL_KEY`
6. Set up the bot webhook:
   - URL: `/bot/webhook.php?token=BOT_PATH_TOKEN`
   - Secret header: `X-Telegram-Bot-Api-Secret-Token: BOT_WEBHOOK_SECRET`

## Production notes
- Force HTTPS.
- Enable PHP 8.2+ (8.3 preferred if available).
- Disable display_errors.
- Protect `/api/install.php` by keeping `INSTALL_KEY` long, and delete/rename it after install.
- Add Cloudflare or Hostinger WAF if available.
