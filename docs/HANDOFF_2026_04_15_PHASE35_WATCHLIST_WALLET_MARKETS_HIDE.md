# Phase 35 — Desktop watchlist / wallet / markets-hide pass

Base: `phase34_desktop_profilemenu_runtime_hotfix`

## What changed

### 1) Trade desktop watchlist
- Reduced clipping of long prices in the symbol list.
- Converted rows to a more stable 2-column grid on desktop.
- Tightened price sizing and reserved width for the live price block.
- Replaced the old back-to-markets button with a refresh button so the trade screen remains self-contained.

### 2) Dedicated Markets access hidden from shell navigation
- Removed `Markets` from the desktop header navigation.
- Redirected dashboard market shortcut cards to the Trade screen instead of the Markets page.
- Kept the actual `#/markets` route intact so nothing breaks if it is opened directly.

### 3) Wallet / Payments desktop layout
- Re-stabilized the desktop wallet shell.
- Restored a proper 3-column funding layout on wide desktops.
- Added a safer 2-column fallback on medium desktops.
- Forced deposit / withdrawal review grids back to readable desktop columns.
- Prevented the right funding side card from collapsing the main flow.

## Files changed
- `assets/js/multibank-theme.js`
- `assets/css/multibank-theme.css`

## Validation
- `node --check assets/js/multibank-theme.js`
- `node --check assets/js/app.js`
- `php -l app.php`

## Notes
- Mobile-specific wallet / trade rules were left intact as much as possible.
- This pass is focused on desktop structure and preventing regression while keeping iPhone behavior stable.
