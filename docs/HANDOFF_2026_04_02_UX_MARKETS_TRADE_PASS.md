# VertexPluse — UX / Markets / Trade Pass (2026-04-02)

This package is based on the clean build where the hamburger menu was already stable.

## What was changed

### Safe UX upgrades
- Added **Account** as the fifth mobile bottom-nav item.
- Improved **Support** page with:
  - quick stats strip
  - shortcut actions
  - richer visual layout
- Improved **Wallet / Funding** flow:
  - quick amount chips for deposit and withdrawal
  - auto-jump to the next step when only one deposit method exists
- Improved compact utility header behavior for:
  - Notifications
  - Support
  - Wallet

### Trade page
- Added **Demo / Real** toggle inside the Trade compact header.
- Restored safer trade header composition without touching the stable hamburger-menu fix.
- Allowed **perp** selection to stay active outside crypto when chosen, so leverage can appear for non-crypto perp flows too.
- Unified chart behavior closer to crypto by auto-enabling **TradingView** on Trade and hiding the extra bottom chart controls when TV is active.

### Markets / symbols
- Removed market-count badges from the symbols drawer tabs.
- Increased visible market rows:
  - Markets board shows more rows
  - Symbols drawer shows more rows
- Changed default ordering toward larger / more liquid instruments first:
  - main Markets board defaults to `rank_desc`
  - symbols drawer defaults to `volume`
- Added market metadata output from the API for safer frontend sorting:
  - `sort_order`
  - `volume`
  - `market_cap`

## Files changed
- `app.js`
- `assets/js/app.js`
- `multibank-theme.js`
- `assets/js/multibank-theme.js`
- `multibank-theme.css`
- `assets/css/multibank-theme.css`
- `api/markets.php`

## Validation performed
- `node --check app.js`
- `node --check assets/js/app.js`
- `node --check multibank-theme.js`
- `node --check assets/js/multibank-theme.js`
- `php -l api/markets.php`
- `php -l app.php`
- `php -l login.php`
- `php -l logout.php`

## Post-upload checklist
1. Hard refresh the site.
2. Test hamburger menu from Home and Trade.
3. Test Trade page:
   - Demo / Real toggle
   - Symbol drawer
   - Perp on Forex / Stocks / Commodities
   - leverage visibility in non-crypto perp
   - chart appears in TradingView style
4. Test Wallet:
   - Deposit opens simpler flow
   - quick amount chips work
5. Test Support and Notifications headers on mobile.
6. Test Markets sorting / filters / search / switching between market families.

## Important note
The code paths were stabilized and syntax-checked, but this package was not live-tested on your server after upload. Any remaining visual edge-case should now be much smaller and easier to isolate because the hamburger-menu fix was intentionally left structurally untouched.
