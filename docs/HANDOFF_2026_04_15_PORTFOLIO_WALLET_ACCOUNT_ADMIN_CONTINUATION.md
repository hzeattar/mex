# VertexPluse — Portfolio / Wallet / Account / Admin continuation pass

## What changed

### Wallet history
- Added keyword search for funding history on desktop and mobile shells.
- Search matches request id, method, provider, currency, status, amount, and admin note.
- Keeps the currently opened request pinned to the top when it is part of the filtered result set.

### Desktop shell + internal pages
- Tightened the desktop top bar layout with stronger two-column balancing.
- Reduced the visual weight of the balance block and action row.
- Improved spacing for Home, Portfolio, Wallet, and Account desktop layouts.
- Reduced side rail widths and refined stat strips for cleaner rhythm.

### Account
- Refined desktop section cards and hero spacing for cleaner profile/settings/activity reading.

### Admin
- Added small dense-screen polish for sticky table headers, toolbar buttons, and stats card consistency.

## Validation
- node --check assets/js/multibank-theme.js
- node --check multibank-theme.js
- php -l admin/includes/auth.php

## Files changed
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css
- admin/includes/auth.php
