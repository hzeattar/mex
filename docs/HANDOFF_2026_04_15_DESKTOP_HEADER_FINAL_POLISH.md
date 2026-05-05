# Desktop header final polish — 2026-04-15

## What changed
- Removed the desktop brand block from the top header layout to stop repeated overlap with the balance card.
- Rebuilt the desktop top header into a two-zone layout:
  - primary balance dropdown
  - action / account / language cluster
- Tightened button heights, identity row spacing, and balance typography.
- Reduced right rail width slightly on Home and tightened desktop gaps for a cleaner rhythm.

## Files changed
- assets/js/multibank-theme.js
- multibank-theme.js
- assets/css/multibank-theme.css
- multibank-theme.css

## Validation
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- assets/root sync verified for JS and CSS
