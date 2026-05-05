# VertexPluse — Desktop Header Pro Rebuild + Layout Pass (2026-04-14)

## What changed

### Desktop header
- Removed the desktop brand block from the header layout to eliminate persistent overlap with the balance card.
- Rebuilt the header into a cleaner two-column desktop structure:
  - balance dropdown block
  - actions/account/language block
- Simplified the balance trigger content:
  - primary available balance
  - active account label + account number
  - secondary helper note
  - dropdown arrow only
- Reduced button heights and spacing so the header reads as one compact premium control bar.

### Desktop home layout
- Tightened the desktop home grid and side rail width.
- Reduced card radius/padding slightly for a denser, cleaner professional layout.
- Tightened verify/equity/side cards to better match the new header density.

## Files changed
- `assets/js/multibank-theme.js`
- `multibank-theme.js`
- `assets/css/multibank-theme.css`
- `multibank-theme.css`

## Validation
- `node --check assets/js/multibank-theme.js`
- `node --check multibank-theme.js`
- `node --check assets/js/app.js`
- `node --check app.js`

All passed.
