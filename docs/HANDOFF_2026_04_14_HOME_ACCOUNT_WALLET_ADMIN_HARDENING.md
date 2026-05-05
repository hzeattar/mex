# VertexPluse — Home / Account / Wallet / Admin hardening pass (2026-04-14)

## What was improved
- Batched initial priming for desktop Home to avoid several independent `refresh...then(render)` render storms.
- Batched initial priming for mobile Home for the same reason.
- Account page now uses a single priming path, recency-safe latest activity sorting, and a guarded auto-refresh loop while the page stays open.
- Wallet request-detail refresh loop now has overlap protection.
- News auto-refresh and Support auto-refresh now have overlap protection so repeated intervals do not stack rerenders or duplicate work.
- Admin table wrappers got light usability hardening for dense operational tables.

## Key files
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `admin/includes/auth.php`

## Validation
- JS syntax checked after patching.
- PHP lint checked for `admin/includes/auth.php`.
