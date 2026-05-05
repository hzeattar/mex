# Desktop logo + layout restore pass — 2026-04-15

## What was fixed
- Restored a visible desktop logo in the top header using a compact dedicated brand block.
- Rebuilt the desktop topbar into three stable columns:
  - compact logo block
  - single balance dropdown block
  - actions + account + language block
- Removed the no-brand desktop shell path that hid the logo entirely.
- Reduced desktop header overlap by tightening widths, min-heights, paddings, and text overflow handling.
- Added stronger desktop-only layout rules for:
  - Home
  - Portfolio
  - Wallet
  - Trade
  - Invest
  - KYC / Support / News
- Kept mobile safe by scoping the new visual changes to desktop breakpoints only.

## Files changed
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css

## Validation
- node --check assets/js/multibank-theme.js
- node --check multibank-theme.js
- node --check assets/js/app.js
- node --check app.js
- php -l app.php

All passed.
