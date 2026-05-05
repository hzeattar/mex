# VertexPluse — Flow Review Continuation (2026-04-15)

## What changed

### Desktop header / shell
- tightened desktop header spacing again
- simplified balance trigger copy
- moved the secondary helper text into a compact "All balances" chip on the right rail
- reduced balance card visual weight and tightened action/account widths

### Portfolio
- added a compact toolbar under the section header
- shows active tab label, total rows for the active dataset, and match count when search is active
- added quick actions to jump to Trade and Wallet funding

### Wallet history
- added a selected-request summary bar above the history toolbar
- shows currently pinned request kind, id, status and timestamp
- added actions to open detail again or clear the current selection

### Account
- added an operations strip before the main settings grid
- surfaces Support / News / Alerts / Funding counts in a quick operational summary

## Files changed
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css
- docs/HANDOFF_2026_04_15_FLOW_REVIEW_CONTINUATION.md

## Validation
- node --check assets/js/multibank-theme.js
- node --check multibank-theme.js
- php -l admin/includes/auth.php

All checks passed in the container.
