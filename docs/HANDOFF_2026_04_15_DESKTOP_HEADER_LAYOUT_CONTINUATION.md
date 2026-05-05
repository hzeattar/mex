# VertexPluse — Desktop header + layout continuation pass (2026-04-15)

## What changed

### Desktop header
- Removed any remaining desktop brand/logo block influence inside the topbar shell with stronger CSS overrides.
- Rebuilt the desktop shell into a stable 2-column layout:
  - balance dropdown block
  - actions + account + language block
- Reduced balance font scale and forced ellipsis/nowrap on header text to stop overlap.
- Tightened action buttons, account capsule, and language trigger heights and spacing.
- Shortened header labels in JS:
  - `Notifications` -> `Alerts`
  - `Live account` / `Demo account` -> `Live` / `Demo` in the desktop shell

### Desktop page layout
- Home right rail narrowed further for a calmer desktop composition.
- Home cards tightened:
  - verify banner
  - equity card
  - promo card
  - side cards
  - pulse grid
- Portfolio / Wallet desktop side rails reduced and rebalanced.
- Trade desktop cards keep the prior stable behavior while tightening radii and quote text size.

## Files changed
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`

## Validation
- `node --check assets/js/multibank-theme.js` ✅
- `node --check multibank-theme.js` ✅
- `node --check assets/js/app.js` ✅
- `node --check app.js` ✅
- PHP lint on 166 PHP files ✅

## Focus of next pass
- Portfolio / Wallet / Account flow review
- Admin dense screens polish
- Final browser QA checklist and performance cleanup
