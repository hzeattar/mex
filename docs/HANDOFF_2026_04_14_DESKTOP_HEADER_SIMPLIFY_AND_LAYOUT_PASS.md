# Desktop header simplify + layout pass — 2026-04-14

## What changed
- Removed the desktop header page-title/site-title text stack to eliminate overlap and visual crowding.
- Kept only the desktop logo block on the left side of the shell header.
- Rebalanced desktop header columns so the balance dropdown and action area get more space.
- Tightened account/language row spacing and button sizing for cleaner desktop alignment.
- Preserved the single balance dropdown pattern introduced in the previous pass.
- Synced root/assets mirrors for `multibank-theme.js` and `multibank-theme.css`.

## Files changed
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css

## Validation
- node --check assets/js/multibank-theme.js ✅
- node --check multibank-theme.js ✅

## Intent
This pass specifically targets the remaining desktop header overlap and removes unnecessary header title text so the desktop shell feels cleaner and more premium.
