# MEX Group — RTL / i18n / Public Pages Fix Report

Date: 2026-06-07

## Scope
This pass focused on the urgent issues from the audit: Arabic RTL direction, broken Arabic translations, hardcoded UI strings in core JS views, fake pricing/ROI fallbacks, and richer public-facing pages.

## Implemented

### RTL and language direction
- Enabled Arabic RTL detection in shared site helpers.
- Made public PHP pages use dynamic `lang` and `dir` values.
- Made `app.php`, `app-v2.php`, and `legacy-app.php` use dynamic language and direction.
- Updated legacy/root i18n code and frontend i18n code so Arabic applies `dir="rtl"` and body `.rtl`.
- Removed the forced runtime `document.documentElement.dir = 'ltr'` behavior from active i18n code.

### Arabic translations
- Cleaned the critical Arabic keys in `ar.json` and `assets/i18n/ar.json`.
- Added/updated translations for trade, errors, chart, wallet, KYC, alerts, shell, account, portfolio, levels, contracts and app labels.
- Kept allowed technical/brand terms such as MEX Group, USDT, KYC, PnL, Binance and TradingView.

### JS hardcoded UI strings
- `trade.js`: market tabs, order ticket labels, mobile ticket labels and confirm-order modal now use `t()`.
- `Shell.js`: account switcher, navigation, license/KYC/support labels now use `t()`.
- `portfolio.js`: portfolio metrics and position fields now use `t()`; English `confirm()`/`alert()` were replaced by translated modal/toast helpers.
- `account.js`: account balances, account mode, level and support labels now use `t()`.

### Fake pricing / unsafe fallbacks
- Removed fake contracts ROI fallback from `home.js` (`1.8%`, `8.5%`, `18%`).
- Removed hardcoded Platinum/VIP level injections from `home.js` (`50,000` / `100,000` USDT).
- Empty contracts now show a safe “contracts are being updated / no contracts available” state.
- Empty levels now show a safe “levels not configured yet” state instead of fabricated financial thresholds.

### Public website upgrades
- Added a real public `/markets.php` browser page while preserving the existing JSON markets API when API query parameters are present.
- Rebuilt `features.php`, `about.php`, `contact.php`, and `legal.php` into richer localized public pages with Arabic RTL support.
- Improved public header/footer translations and language-aware navigation.
- Added public page CSS polish for the new markets page and RTL layout.

## Build and QA
- PHP lint passed for the edited PHP entry points.
- JSON validation passed for updated translation files.
- Frontend production build succeeded via Vite.
- Active runtime no longer forces Arabic pages into LTR.
- Fake ROI/level fallback checks passed in `frontend/src/views/home.js` and generated `assets/dist/js/home-*.js`.

## Notes
- Some old root-level Vite chunk files from earlier builds still exist in the project root, but the active app shell loads `assets/dist/.vite/manifest.json` and the rebuilt `assets/dist` files.
- Brand/legal/technical terms remain in Latin script where appropriate: MEX Group, USDT, KYC, PnL, Binance Futures, TradingView.

## Main changed files
- `includes/shared/site-helpers.php`
- `site-helpers.php`
- `index.php`
- `features.php`
- `markets.php`
- `about.php`
- `contact.php`
- `legal.php`
- `login.php`
- `register.php`
- `app.php`
- `app-v2.php`
- `legacy-app.php`
- `i18n.js`
- `app.js`
- `assets/js/app.js`
- `ar.json`
- `en.json`
- `assets/i18n/ar.json`
- `assets/i18n/en.json`
- `frontend/src/utils/i18n.js`
- `frontend/src/views/trade.js`
- `frontend/src/views/home.js`
- `frontend/src/views/portfolio.js`
- `frontend/src/views/account.js`
- `frontend/src/components/layout/Shell.js`
- `includes/public_markets_page.php`
- `assets/css/public-site.css`
- rebuilt `assets/dist/*`
