VertexPluse Platform — Server Setup

1) Upload files:
   - Copy public/* to your domain root (index.html, assets/, api/, .htaccess)
   - Ensure /api/data is writable by PHP (chmod 775 or 777 if needed)

2) Environment variables (recommended):
   - TELEGRAM_BOT_TOKEN = your bot token (keep secret)
   - POLYGON_API_KEY     = your Polygon/Massive key (optional if still used)
   - EODHD_API_KEY       = your EODHD key

If you can't set env vars, and you're on Apache/cPanel, you can add to .htaccess:
  SetEnv TELEGRAM_BOT_TOKEN "..."
  SetEnv POLYGON_API_KEY "..."

3) Test endpoints:
   - /api/ping.php
   - Open in Telegram and run the app

Notes:
- This build provides a paper-trading engine (demo) + investment plans.
- When you are ready for LIVE trading, we can integrate a real broker/exchange (Binance Futures, Bybit, etc.)

4) TradingView webhook:
   - Enable 2FA in TradingView
   - Open Admin -> Signals and copy the webhook URL shown there
   - In TradingView alert, enable Webhook URL and paste that URL
   - Use the sample JSON shown in Admin -> Signals
